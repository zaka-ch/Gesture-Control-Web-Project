import cv2
import mediapipe as mp
from mediapipe.tasks import python
from mediapipe.tasks.python import vision
import os
import urllib.request
import time
import pyautogui
from classifier import classify_gesture
from smoother import GestureSmoother

pyautogui.FAILSAFE = False

HAND_CONNECTIONS = [
    (0, 1), (1, 2), (2, 3), (3, 4),
    (0, 5), (5, 6), (6, 7), (7, 8),
    (5, 9), (9, 10), (10, 11), (11, 12),
    (9, 13), (13, 14), (14, 15), (15, 16),
    (13, 17), (0, 17), (17, 18), (18, 19), (19, 20)
]

def is_finger_extended(landmarks, tip_idx, pip_idx):
    return landmarks[tip_idx].y < landmarks[pip_idx].y

def detect_peace(landmarks):
    """PEACE: index + middle extended, ring + pinky curled."""
    index_up  = is_finger_extended(landmarks, 8, 6)
    middle_up = is_finger_extended(landmarks, 12, 10)
    ring_up   = is_finger_extended(landmarks, 16, 14)
    pinky_up  = is_finger_extended(landmarks, 20, 18)
    return index_up and middle_up and (not ring_up) and (not pinky_up)

def draw_landmarks_custom(image, landmarks, width, height):
    """Draws points and lines manually since mp.solutions is deprecated."""
    points = []
    for lm in landmarks:
        x = int(lm.x * width)
        y = int(lm.y * height)
        points.append((x, y))
        cv2.circle(image, (x, y), 3, (0, 0, 255), -1)
    for p1, p2 in HAND_CONNECTIONS:
        cv2.line(image, points[p1], points[p2], (0, 255, 0), 2)

def draw_zones(frame, width, height, current_zone):
    """Draw 2-zone divider and tint."""
    y_mid = int(height * 0.50)
    cv2.line(frame, (0, y_mid), (width, y_mid), (255, 255, 255), 1)

    overlay = frame.copy()
    if current_zone == "TOP":
        cv2.rectangle(overlay, (0, 0), (width, y_mid), (255, 0, 0), -1)       # Blue tint
    elif current_zone == "BOTTOM":
        cv2.rectangle(overlay, (0, y_mid), (width, height), (0, 165, 255), -1) # Orange tint
    cv2.addWeighted(overlay, 0.2, frame, 0.8, 0, frame)

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

    fist_smoother  = GestureSmoother(buffer_size=5)
    swipe_smoother = GestureSmoother(buffer_size=4)
    peace_smoother = GestureSmoother(buffer_size=4)

    # Throttle timestamps
    last_fist_time   = 0
    last_peace_time  = 0
    last_swipe_time  = 0
    last_scroll_time = 0

    # Control toggle — starts paused, PEACE gesture activates
    control_active = False

    cap = cv2.VideoCapture(0)
    prev_wrist_x = None

    with vision.HandLandmarker.create_from_options(options) as landmarker:
        while cap.isOpened():
            success, image = cap.read()
            if not success:
                continue

            image_rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
            mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=image_rgb)
            results = landmarker.detect(mp_image)

            # Flip for natural mirror preview
            image = cv2.flip(image, 1)
            h, w, _ = image.shape

            confirmed_gesture = "NONE"
            current_zone      = "NONE"
            now = time.time()

            if results.hand_landmarks and len(results.hand_landmarks) > 0:
                hand_landmarks = results.hand_landmarks[0]

                # Flip X for drawing on mirrored image
                for lm in hand_landmarks:
                    lm.x = 1.0 - lm.x
                draw_landmarks_custom(image, hand_landmarks, w, h)
                # Restore raw X for classification
                for lm in hand_landmarks:
                    lm.x = 1.0 - lm.x

                # --- Zone (2 zones, landmark[5] as reference) ---
                hand_y = hand_landmarks[5].y
                current_zone = "TOP" if hand_y < 0.50 else "BOTTOM"

                # --- Classify base gesture ---
                curr_wrist_x = hand_landmarks[0].x
                raw_gesture  = classify_gesture(hand_landmarks, prev_wrist_x, curr_wrist_x)
                prev_wrist_x = curr_wrist_x

                # --- PEACE detection (overrides raw_gesture if true) ---
                is_peace = detect_peace(hand_landmarks)

                # --- Smooth & dispatch ---
                if is_peace:
                    # Peace toggles control_active — always works regardless of state
                    conf_peace = peace_smoother.push("PEACE")
                    fist_smoother.reset()
                    swipe_smoother.reset()
                    confirmed_gesture = "PEACE"
                    if conf_peace == "PEACE" and now - last_peace_time > 2.0:
                        control_active = not control_active
                        last_peace_time = now
                        peace_smoother.reset()

                elif raw_gesture == "OPEN_HAND":
                    confirmed_gesture = "OPEN_HAND"
                    fist_smoother.reset()
                    swipe_smoother.reset()
                    peace_smoother.reset()
                    # Scroll only when active
                    if control_active and now - last_scroll_time > 0.06:
                        if current_zone == "TOP":
                            pyautogui.scroll(12)
                        else:
                            pyautogui.scroll(-12)
                        last_scroll_time = now

                elif raw_gesture == "FIST":
                    conf_fist = fist_smoother.push("FIST")
                    swipe_smoother.reset()
                    peace_smoother.reset()
                    confirmed_gesture = "FIST"
                    if control_active and conf_fist == "FIST" and now - last_fist_time > 1.0:
                        pyautogui.press('space')
                        last_fist_time = now
                        fist_smoother.reset()

                elif raw_gesture in ("SWIPE_RIGHT", "SWIPE_LEFT"):
                    conf_swipe = swipe_smoother.push(raw_gesture)
                    fist_smoother.reset()
                    peace_smoother.reset()
                    confirmed_gesture = raw_gesture
                    if control_active and conf_swipe in ("SWIPE_RIGHT", "SWIPE_LEFT") and now - last_swipe_time > 1.2:
                        key = 'right' if conf_swipe == "SWIPE_RIGHT" else 'left'
                        pyautogui.press(key)
                        last_swipe_time = now
                        swipe_smoother.reset()

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

            # --- Draw preview ---
            image_resized = cv2.resize(image, (400, 300))
            draw_zones(image_resized, 400, 300, current_zone)

            cv2.putText(image_resized, f"Gesture: {confirmed_gesture}", (10, 30),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 255, 0), 2)
            cv2.putText(image_resized, f"Zone: {current_zone}", (10, 60),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 255, 0), 2)
            # Status indicator
            if control_active:
                cv2.putText(image_resized, "ACTIVE", (10, 285),
                            cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 255, 0), 2)
            else:
                cv2.putText(image_resized, "PAUSED", (10, 285),
                            cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 0, 255), 2)

            cv2.imshow('Gesture Control Preview', image_resized)

            if cv2.waitKey(1) & 0xFF == ord('q'):
                break

    cap.release()
    cv2.destroyAllWindows()

if __name__ == '__main__':
    main()
