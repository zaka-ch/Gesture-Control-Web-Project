import cv2
import mediapipe as mp
from mediapipe.tasks import python
from mediapipe.tasks.python import vision
import os
import urllib.request
import threading
import time
import pyautogui
from collections import deque

from classifier import classify_gesture
from smoother import GestureSmoother
from actions import ActionDispatcher

SCROLL_SENSITIVITY = 800

HAND_CONNECTIONS = [
    (0, 1), (1, 2), (2, 3), (3, 4),
    (0, 5), (5, 6), (6, 7), (7, 8),
    (5, 9), (9, 10), (10, 11), (11, 12),
    (9, 13), (13, 14), (14, 15), (15, 16),
    (13, 17), (0, 17), (17, 18), (18, 19), (19, 20)
]

def draw_landmarks_custom(image, landmarks, width, height):
    points = []
    for lm in landmarks:
        x = int(lm.x * width)
        y = int(lm.y * height)
        points.append((x, y))
        cv2.circle(image, (x, y), 3, (0, 0, 255), -1)
        
    for p1, p2 in HAND_CONNECTIONS:
        cv2.line(image, points[p1], points[p2], (0, 255, 0), 2)

class SharedState:
    def __init__(self):
        self.lock = threading.Lock()
        self.frame_to_show = None
        self.running = True
        self.confirmed_gesture = "NONE"
        self.raw_y = None
        self.new_frame = False

shared_state = SharedState()

def camera_thread_func(options):
    cap = cv2.VideoCapture(0)
    cap.set(cv2.CAP_PROP_FRAME_WIDTH, 320)
    cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 240)
    
    fist_smoother  = GestureSmoother(buffer_size=5)
    swipe_smoother = GestureSmoother(buffer_size=4)
    peace_smoother = GestureSmoother(buffer_size=4)
    prev_wrist_x = None

    with vision.HandLandmarker.create_from_options(options) as landmarker:
        while True:
            with shared_state.lock:
                if not shared_state.running:
                    break
                    
            success, image = cap.read()
            if not success:
                continue

            image_rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
            mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=image_rgb)
            results = landmarker.detect(mp_image)
            
            image = cv2.flip(image, 1)
            h, w, _ = image.shape
            
            raw_gesture = "NONE"
            confirmed_gesture = "NONE"
            raw_y = None
            
            if results.hand_landmarks and len(results.hand_landmarks) > 0:
                hand_landmarks = results.hand_landmarks[0]
                
                # Invert X for correct drawing
                for landmark in hand_landmarks:
                    landmark.x = 1.0 - landmark.x
                
                draw_landmarks_custom(image, hand_landmarks, w, h)
                
                # Revert X for classification
                for landmark in hand_landmarks:
                    landmark.x = 1.0 - landmark.x
                    
                curr_wrist_x = hand_landmarks[0].x
                raw_gesture = classify_gesture(hand_landmarks, prev_wrist_x, curr_wrist_x)
                prev_wrist_x = curr_wrist_x
                
                # Use landmark[5] (index finger base) for magic scroll mapping
                raw_y = hand_landmarks[5].y

                if raw_gesture == "OPEN_HAND":
                    confirmed_gesture = "OPEN_HAND"
                    fist_smoother.reset()
                    swipe_smoother.reset()
                    peace_smoother.reset()
                elif raw_gesture in ("SWIPE_RIGHT", "SWIPE_LEFT"):
                    confirmed_gesture = swipe_smoother.push(raw_gesture)
                    fist_smoother.reset()
                    peace_smoother.reset()
                    if confirmed_gesture in ("SWIPE_RIGHT", "SWIPE_LEFT"):
                        swipe_smoother.reset()
                elif raw_gesture == "FIST":
                    confirmed_gesture = fist_smoother.push(raw_gesture)
                    swipe_smoother.reset()
                    peace_smoother.reset()
                    if confirmed_gesture == "FIST":
                        fist_smoother.reset()
                elif raw_gesture == "PEACE":
                    confirmed_gesture = peace_smoother.push(raw_gesture)
                    fist_smoother.reset()
                    swipe_smoother.reset()
                    if confirmed_gesture == "PEACE":
                        peace_smoother.reset()
                else:
                    confirmed_gesture = "NONE"
                    fist_smoother.reset()
                    swipe_smoother.reset()
                    peace_smoother.reset()
            else:
                prev_wrist_x = None
                fist_smoother.reset()
                swipe_smoother.reset()
                peace_smoother.reset()

            image_resized = cv2.resize(image, (400, 300))
            
            with shared_state.lock:
                shared_state.frame_to_show = image_resized
                shared_state.confirmed_gesture = confirmed_gesture
                shared_state.raw_y = raw_y
                shared_state.new_frame = True

    cap.release()

def main():
    model_path = 'hand_landmarker.task'
    if not os.path.exists(model_path):
        print("Downloading MediaPipe hand tracking model...")
        urllib.request.urlretrieve(
            'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task',
            model_path
        )

    base_options = python.BaseOptions(model_asset_path=model_path)
    options = vision.HandLandmarkerOptions(
        base_options=base_options,
        num_hands=1,
        min_hand_detection_confidence=0.7,
        min_hand_presence_confidence=0.5,
        min_tracking_confidence=0.5
    )

    dispatcher = ActionDispatcher()
    
    cam_thread = threading.Thread(target=camera_thread_func, args=(options,))
    cam_thread.start()

    raw_y_history = deque(maxlen=5)
    previous_smooth_y = None
    
    try:
        while True:
            with shared_state.lock:
                if not shared_state.new_frame:
                    frame_ready = False
                else:
                    frame = shared_state.frame_to_show
                    confirmed_gesture = shared_state.confirmed_gesture
                    raw_y = shared_state.raw_y
                    shared_state.new_frame = False
                    frame_ready = True
                    
            if not frame_ready:
                time.sleep(0.01)
                continue

            # Route FIST, SWIPE, PEACE to the action dispatcher
            gesture_for_dispatcher = confirmed_gesture
            if gesture_for_dispatcher == "OPEN_HAND":
                gesture_for_dispatcher = "NONE" # Block old scroll logic in actions.py
                
            # We pass 0 for wrist_y as the old zone logic is ignored anyway
            dispatcher.dispatch(gesture_for_dispatcher, 0)
            
            control_active = dispatcher.control_active

            # Magic Scroll Implementation
            if not control_active or confirmed_gesture != "OPEN_HAND" or raw_y is None:
                raw_y_history.clear()
                previous_smooth_y = None
            else:
                raw_y_history.append(raw_y)
                if len(raw_y_history) == 5:
                    smooth_y = (raw_y_history[4] * 0.5) + (raw_y_history[3] * 0.25) + \
                               (raw_y_history[2] * 0.15) + (raw_y_history[1] * 0.07) + \
                               (raw_y_history[0] * 0.03)
                               
                    if previous_smooth_y is not None:
                        dy = smooth_y - previous_smooth_y
                        
                        # Deadzone to ignore micro-tremors
                        if abs(dy) < 0.003:
                            dy = 0
                            
                        scroll_amount = int(-dy * SCROLL_SENSITIVITY)
                        
                        if scroll_amount != 0:
                            pyautogui.scroll(scroll_amount)
                            
                    previous_smooth_y = smooth_y

            frame_copy = frame.copy()
            status_text = "ACTIVE " if control_active else "PAUSED "
            status_color = (0, 255, 0) if control_active else (0, 0, 255)
            
            cv2.putText(frame_copy, status_text, (10, 30), 
                        cv2.FONT_HERSHEY_SIMPLEX, 0.6, status_color, 2)
            cv2.putText(frame_copy, f"Gesture: {confirmed_gesture}", (10, 60), 
                        cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 255, 0), 2)

            cv2.imshow('Gesture Control Preview', frame_copy)
            
            if cv2.waitKey(1) & 0xFF == ord('q'):
                break
    finally:
        with shared_state.lock:
            shared_state.running = False
        cam_thread.join()
        cv2.destroyAllWindows()

if __name__ == '__main__':
    main()
