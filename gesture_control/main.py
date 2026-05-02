import cv2
import mediapipe as mp
from mediapipe.tasks import python
from mediapipe.tasks.python import vision
import os
import urllib.request
from classifier import classify_gesture
from smoother import GestureSmoother
from actions import ActionDispatcher

HAND_CONNECTIONS = [
    (0, 1), (1, 2), (2, 3), (3, 4),
    (0, 5), (5, 6), (6, 7), (7, 8),
    (5, 9), (9, 10), (10, 11), (11, 12),
    (9, 13), (13, 14), (14, 15), (15, 16),
    (13, 17), (0, 17), (17, 18), (18, 19), (19, 20)
]

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
    """Draw zone dividers and tint the current zone."""
    y_33 = int(height * 0.33)
    y_66 = int(height * 0.66)
    
    cv2.line(frame, (0, y_33), (width, y_33), (255, 255, 255), 1)
    cv2.line(frame, (0, y_66), (width, y_66), (255, 255, 255), 1)

    overlay = frame.copy()
    if current_zone == "TOP":
        cv2.rectangle(overlay, (0, 0), (width, y_33), (255, 0, 0), -1)      # Blue tint
    elif current_zone == "BOTTOM":
        cv2.rectangle(overlay, (0, y_66), (width, height), (0, 165, 255), -1) # Orange tint
    elif current_zone == "MIDDLE":
        cv2.rectangle(overlay, (0, y_33), (width, y_66), (128, 128, 128), -1) # Gray tint
        
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

    smoother = GestureSmoother(buffer_size=5)
    dispatcher = ActionDispatcher()
    cap = cv2.VideoCapture(0)
    prev_wrist_x = None

    with vision.HandLandmarker.create_from_options(options) as landmarker:
        while cap.isOpened():
            success, image = cap.read()
            if not success:
                continue

            # Convert BGR to RGB for MediaPipe
            image_rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
            mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=image_rgb)
            
            # Process un-mirrored frame for straightforward X logic
            results = landmarker.detect(mp_image)
            
            # Flip image for a natural mirror preview
            image = cv2.flip(image, 1)
            h, w, _ = image.shape
            
            raw_gesture = "NONE"
            confirmed_gesture = "NONE"
            current_zone = "NONE"
            
            if results.hand_landmarks and len(results.hand_landmarks) > 0:
                hand_landmarks = results.hand_landmarks[0]
                
                # Invert X manually so we can draw it perfectly aligned on the mirrored image
                for landmark in hand_landmarks:
                    landmark.x = 1.0 - landmark.x
                
                draw_landmarks_custom(image, hand_landmarks, w, h)
                
                # Restore original un-mirrored X coordinates for classification
                for landmark in hand_landmarks:
                    landmark.x = 1.0 - landmark.x
                    
                raw_gesture, current_wrist_x = classify_gesture(hand_landmarks, prev_wrist_x, w)
                prev_wrist_x = current_wrist_x
                
                if raw_gesture == "OPEN_HAND":
                    confirmed_gesture = "OPEN_HAND"
                    smoother.reset()
                else:
                    confirmed_gesture = smoother.push(raw_gesture)
                
                wrist_y = hand_landmarks[0].y
                if wrist_y < 0.33:
                    current_zone = "TOP"
                elif wrist_y > 0.66:
                    current_zone = "BOTTOM"
                else:
                    current_zone = "MIDDLE"
                
                dispatcher.dispatch(confirmed_gesture, wrist_y)
            else:
                prev_wrist_x = None
                smoother.reset()

            image_resized = cv2.resize(image, (400, 300))
            draw_zones(image_resized, 400, 300, current_zone)
            
            cv2.putText(image_resized, f"Gesture: {confirmed_gesture}", (10, 30), 
                        cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 255, 0), 2)
            cv2.putText(image_resized, f"Zone: {current_zone}", (10, 60), 
                        cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 255, 0), 2)

            cv2.imshow('Gesture Control Preview', image_resized)
            
            if cv2.waitKey(1) & 0xFF == ord('q'):
                break

    cap.release()
    cv2.destroyAllWindows()

if __name__ == '__main__':
    main()
