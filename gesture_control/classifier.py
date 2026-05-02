def is_finger_extended(landmarks, tip_idx, pip_idx):
    return landmarks[tip_idx].y < landmarks[pip_idx].y

def classify_gesture(landmarks, wrist_prev_x, wrist_curr_x):
    index_up  = is_finger_extended(landmarks, 8, 6)
    middle_up = is_finger_extended(landmarks, 12, 10)
    ring_up   = is_finger_extended(landmarks, 16, 14)
    pinky_up  = is_finger_extended(landmarks, 20, 18)

    # FIST — all fingers curled down
    if not index_up and not middle_up and not ring_up and not pinky_up:
        return "FIST"

    # OPEN_HAND — all fingers extended
    if index_up and middle_up and ring_up and pinky_up:
        if wrist_prev_x is not None and wrist_curr_x is not None:
            x_velocity = wrist_curr_x - wrist_prev_x
            if x_velocity > 0.04:
                return "SWIPE_RIGHT"
            if x_velocity < -0.04:
                return "SWIPE_LEFT"
        return "OPEN_HAND"

    return "NONE"
