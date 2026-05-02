class GestureSmoother:
    def __init__(self, buffer_size=5):
        self.buffer_size = buffer_size
        self.buffer = []

    def push(self, gesture):
        """
        Pushes a new gesture into the rolling buffer.
        Returns the gesture only if all frames in the buffer agree,
        otherwise returns "NONE".
        """
        self.buffer.append(gesture)
        if len(self.buffer) > self.buffer_size:
            self.buffer.pop(0)

        # Confirm only if buffer is full and all gestures match
        if len(self.buffer) == self.buffer_size and all(g == self.buffer[-1] for g in self.buffer):
            return self.buffer[-1]
            
        return "NONE"

    def reset(self):
        """Clears the buffer."""
        self.buffer = []
