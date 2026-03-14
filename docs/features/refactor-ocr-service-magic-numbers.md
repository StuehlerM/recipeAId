# Refactor: Extract OCR Service Magic Numbers to Named Constants

## Problem

The OCR preprocessing pipeline in `ocr-service/main.py` contains numerous magic numbers scattered across functions. These make the code harder to understand, tune, and maintain:

- Canny edge thresholds: `50, 150` (lines ~156, ~239)
- Minimum contour area ratio: `0.20` (line ~171)
- Y-coordinate grouping threshold: `0.5` (line ~317)
- Adaptive threshold block size divisor: `40` (line ~295)
- Minimum block size: `11` (line ~295)
- Median filter kernel: `3` (line ~223)
- Hough line parameters: `rho=1, theta=pi/180, threshold=80, minLineLength=50, maxLineGap=10` (lines ~240-242)

By contrast, the ingredient-parser service already defines its constants cleanly at module level (`KNOWN_UNITS`, `MAX_INGREDIENTS`, `MAX_NAME_LENGTH`, `MAX_VALUE`).

## Affected Files

- `ocr-service/main.py` — preprocessing functions

## Proposed Solution

Extract all magic numbers to module-level constants with descriptive names:

```python
# Canny edge detection
CANNY_LOW_THRESHOLD = 50
CANNY_HIGH_THRESHOLD = 150

# Perspective correction
MIN_CONTOUR_AREA_RATIO = 0.20

# Line grouping
Y_GROUPING_THRESHOLD_RATIO = 0.5

# Adaptive thresholding
ADAPTIVE_BLOCK_SIZE_DIVISOR = 40
ADAPTIVE_MIN_BLOCK_SIZE = 11

# Denoising
MEDIAN_KERNEL_SIZE = 3

# Hough line detection
HOUGH_RHO = 1
HOUGH_THETA_DIVISOR = 180  # pi / HOUGH_THETA_DIVISOR
HOUGH_THRESHOLD = 80
HOUGH_MIN_LINE_LENGTH = 50
HOUGH_MAX_LINE_GAP = 10
```

## Acceptance Criteria

- No magic numbers remain in preprocessing functions
- All constants have descriptive names at module level
- No functional changes — preprocessing behavior identical
- All 36 OCR unit tests pass
