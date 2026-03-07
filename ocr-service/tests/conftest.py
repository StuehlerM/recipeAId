"""
Patch heavy dependencies before any tests import main.py.

PaddleOCR initialises a model at import time (`ocr = PaddleOCR(...)`), which
would try to download ~50 MB of weights on first run and requires the full
PaddlePaddle runtime.  Replacing the `paddleocr` module in sys.modules before
any test file imports `main` gives us a lightweight MagicMock instead, so all
unit tests run without the model and in under a second.

Everything in main.py that is NOT PaddleOCR (cv2, numpy, PIL, FastAPI) is the
real library — the tests exercise the real preprocessing and grouping logic.
"""

import sys
from unittest.mock import MagicMock

# Only inject the mock when paddleocr is not already a real import.
# This keeps the door open for integration tests that deliberately install
# the full package and want to run against the real model.
if "paddleocr" not in sys.modules or not hasattr(sys.modules["paddleocr"], "PaddleOCR"):
    sys.modules["paddleocr"] = MagicMock()
