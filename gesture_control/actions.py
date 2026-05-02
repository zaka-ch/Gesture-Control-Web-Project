import pyautogui
import time

pyautogui.FAILSAFE = False

class ActionDispatcher:
    def __init__(self):
        self.last_fist_time = 0
        self.last_swipe_time = 0
        self.last_scroll_time = 0

    def dispatch(self, gesture, wrist_y):
        now = time.time()

        # Bug 1 fix: use normalized wrist_y with corrected thresholds
        is_top_zone    = wrist_y < 0.35
        is_bottom_zone = wrist_y > 0.65

        # Bug 3 fix: scroll(12) every 60ms
        if gesture == "OPEN_HAND":
            if now - self.last_scroll_time > 0.06:
                if is_top_zone:
                    pyautogui.scroll(12)
                    self.last_scroll_time = now
                elif is_bottom_zone:
                    pyautogui.scroll(-12)
                    self.last_scroll_time = now

        # Bug 4 fix: use pyautogui.press, throttle 1.0s
        elif gesture == "FIST":
            if now - self.last_fist_time > 1.0:
                pyautogui.press('space')
                self.last_fist_time = now

        # Bug 5 fix: use pyautogui.press, throttle 1.2s
        elif gesture == "SWIPE_RIGHT":
            if now - self.last_swipe_time > 1.2:
                pyautogui.press('right')
                self.last_swipe_time = now

        elif gesture == "SWIPE_LEFT":
            if now - self.last_swipe_time > 1.2:
                pyautogui.press('left')
                self.last_swipe_time = now
