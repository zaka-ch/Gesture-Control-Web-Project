def is_finger_extended(landmarks, tip_idx, pip_idx):
    """Returns True if the finger tip is above (lower y) the PIP joint."""
    return landmarks[tip_idx].y < landmarks[pip_idx].y

def classify_gesture(landmarks, prev_wrist_x=None, frame_width=640):
    """
    Classifies a hand gesture from MediaPipe landmarks.
    
    Args:
        landmarks: List of 21 landmark objects from MediaPipe.
        prev_wrist_x: Float, previous normalized wrist X coordinate.
        frame_width: Int, width of the video frame in pixels.
        
    Returns:
        Tuple of (gesture_name, current_wrist_x)
    """
    if not landmarks or len(landmarks) < 21:
        return "NONE", None

    index_extended = is_finger_extended(landmarks, 8, 6)
    middle_extended = is_finger_extended(landmarks, 12, 10)
    ring_extended = is_finger_extended(landmarks, 16, 14)
    pinky_extended = is_finger_extended(landmarks, 20, 18)

    current_wrist_x = landmarks[0].x

    # FIST: all 4 fingertips below their PIP joints
    if not index_extended and not middle_extended and not ring_extended and not pinky_extended:
        return "FIST", current_wrist_x

    # OPEN_HAND: all 4 fingers extended
    if index_extended and middle_extended and ring_extended and pinky_extended:
        if prev_wrist_x is not None:
            # We process the un-mirrored image in MediaPipe.
            # In un-mirrored raw camera feed, moving physical hand RIGHT means X decreases.
            # So dx = current_x - prev_x is NEGATIVE.
            # We flip the sign as requested so physical RIGHT gives POSITIVE velocity.
            dx = current_wrist_x - prev_wrist_x
            x_velocity = -dx * frame_width 
            
            if x_velocity > 25:
                return "SWIPE_RIGHT", current_wrist_x
            elif x_velocity < -25:
                return "SWIPE_LEFT", current_wrist_x
                
        return "OPEN_HAND", current_wrist_x

    return "NONE", current_wrist_x
