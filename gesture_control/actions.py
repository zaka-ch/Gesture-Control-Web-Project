import pyautogui
from pynput.keyboard import Controller, Key
import time

# Disable failsafe to prevent crashes when mouse hits corners
pyautogui.FAILSAFE = False

keyboard = Controller()

class ActionDispatcher:
    def __init__(self):
        self.last_fist_time = 0
        self.last_swipe_time = 0
        self.last_scroll_time = 0

    def dispatch(self, gesture, wrist_y):
        """
        Executes actions based on confirmed gestures and wrist zones.
        """
        now = time.time()
        
        # ZONE logic for scrolling
        # TOP zone: wrist Y < 33%
        # MIDDLE zone: 33% <= wrist Y <= 66%
        # BOTTOM zone: wrist Y > 66%
        is_top_zone = wrist_y < 0.33
        is_bottom_zone = wrist_y > 0.66
        
        # 1. Continuous Scroll Actions (No throttle, but rate-limited to 80ms)
        if gesture == "OPEN_HAND":
            if now - self.last_scroll_time > 0.08:
                if is_top_zone:
                    pyautogui.scroll(3)  # Scroll up
                    self.last_scroll_time = now
                elif is_bottom_zone:
                    pyautogui.scroll(-3) # Scroll down
                    self.last_scroll_time = now

        # 2. Throttled Gestures
        if gesture == "FIST":
            # 1 second throttle
            if now - self.last_fist_time > 1.0:
                keyboard.press(Key.space)
                keyboard.release(Key.space)
                self.last_fist_time = now

        elif gesture == "SWIPE_RIGHT":
            # 1.2 second throttle
            if now - self.last_swipe_time > 1.2:
                keyboard.press(Key.right)
                keyboard.release(Key.right)
                self.last_swipe_time = now

        elif gesture == "SWIPE_LEFT":
            # 1.2 second throttle
            if now - self.last_swipe_time > 1.2:
                keyboard.press(Key.left)
                keyboard.release(Key.left)
                self.last_swipe_time = now
