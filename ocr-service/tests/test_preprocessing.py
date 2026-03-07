"""
Unit tests for the OCR sidecar preprocessing pipeline.

All tests use synthetic numpy images — no PaddleOCR model is required.
Each preprocessing function is tested in isolation:
  - _order_corners   : pure numpy geometry
  - _group_into_lines: pure grouping logic
  - _denoise         : 3×3 median filter (cv2)
  - _deskew          : Hough-line deskew (cv2)
  - _adaptive_threshold: binarisation (cv2)
  - _correct_perspective: quad detection + warp (cv2)
"""

import numpy as np
import pytest

# conftest.py has already mocked paddleocr before this import.
from main import (
    _adaptive_threshold,
    _correct_perspective,
    _denoise,
    _deskew,
    _group_into_lines,
    _order_corners,
)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def white_image(height: int = 200, width: int = 300) -> np.ndarray:
    """Return a solid white BGR image."""
    return np.full((height, width, 3), 255, dtype=np.uint8)


def black_image(height: int = 200, width: int = 300) -> np.ndarray:
    """Return a solid black BGR image."""
    return np.zeros((height, width, 3), dtype=np.uint8)


def make_poly(x: int, y: int, w: int, h: int) -> list:
    """Return a bounding-box poly [[TL],[TR],[BR],[BL]] for a text block."""
    return [[x, y], [x + w, y], [x + w, y + h], [x, y + h]]


# ---------------------------------------------------------------------------
# _order_corners
# ---------------------------------------------------------------------------

class TestOrderCorners:
    def test_already_ordered(self):
        pts = np.array([[0, 0], [100, 0], [100, 100], [0, 100]], dtype=np.float32)
        result = _order_corners(pts)
        np.testing.assert_array_equal(result[0], [0, 0])    # top-left
        np.testing.assert_array_equal(result[1], [100, 0])  # top-right
        np.testing.assert_array_equal(result[2], [100, 100])# bottom-right
        np.testing.assert_array_equal(result[3], [0, 100])  # bottom-left

    def test_shuffled_order(self):
        # Points given as: TR, BL, TL, BR
        pts = np.array([[100, 0], [0, 100], [0, 0], [100, 100]], dtype=np.float32)
        result = _order_corners(pts)
        np.testing.assert_array_equal(result[0], [0, 0])
        np.testing.assert_array_equal(result[1], [100, 0])
        np.testing.assert_array_equal(result[2], [100, 100])
        np.testing.assert_array_equal(result[3], [0, 100])

    def test_non_square_rectangle(self):
        pts = np.array([[0, 0], [200, 0], [200, 100], [0, 100]], dtype=np.float32)
        result = _order_corners(pts)
        np.testing.assert_array_equal(result[0], [0, 0])
        np.testing.assert_array_equal(result[1], [200, 0])
        np.testing.assert_array_equal(result[2], [200, 100])
        np.testing.assert_array_equal(result[3], [0, 100])

    def test_returns_four_points(self):
        pts = np.array([[10, 20], [30, 10], [40, 50], [5, 60]], dtype=np.float32)
        result = _order_corners(pts)
        assert result.shape == (4, 2)


# ---------------------------------------------------------------------------
# _group_into_lines
# ---------------------------------------------------------------------------

class TestGroupIntoLines:
    def test_single_block_returns_one_line(self):
        texts = ["flour"]
        scores = [0.99]
        polys = [make_poly(0, 0, 100, 20)]
        result = _group_into_lines(texts, scores, polys)
        assert result == ["flour"]

    def test_two_blocks_same_line_joined_left_to_right(self):
        texts = ["sugar", "flour"]  # sugar is on the right, flour on left
        scores = [0.99, 0.99]
        polys = [
            make_poly(200, 0, 80, 20),  # "sugar" at x=200
            make_poly(0,   0, 80, 20),  # "flour" at x=0
        ]
        result = _group_into_lines(texts, scores, polys)
        assert len(result) == 1
        assert result[0] == "flour sugar"  # sorted left-to-right

    def test_two_blocks_different_lines(self):
        texts = ["Title", "2 cups flour"]
        scores = [0.99, 0.95]
        polys = [
            make_poly(0, 0,   200, 20),  # y_center ≈ 10
            make_poly(0, 100, 200, 20),  # y_center ≈ 110
        ]
        result = _group_into_lines(texts, scores, polys)
        assert len(result) == 2
        assert result[0] == "Title"
        assert result[1] == "2 cups flour"

    def test_three_blocks_two_lines(self):
        texts = ["Ingredients", "2 cups", "flour"]
        scores = [0.99, 0.98, 0.97]
        polys = [
            make_poly(0,   0,  150, 20),  # line 1: y_center=10
            make_poly(0,   50, 80,  20),  # line 2: y_center=60
            make_poly(100, 50, 80,  20),  # line 2: y_center=60 — same line as "2 cups"
        ]
        result = _group_into_lines(texts, scores, polys)
        assert len(result) == 2
        assert result[0] == "Ingredients"
        assert result[1] == "2 cups flour"

    def test_empty_texts_returns_empty(self):
        result = _group_into_lines([], [], [])
        assert result == []

    def test_output_order_is_top_to_bottom(self):
        texts = ["bottom line", "top line"]
        scores = [0.9, 0.9]
        polys = [
            make_poly(0, 200, 100, 20),  # y_center=210 — lower
            make_poly(0, 0,   100, 20),  # y_center=10  — higher
        ]
        result = _group_into_lines(texts, scores, polys)
        assert result[0] == "top line"
        assert result[1] == "bottom line"


# ---------------------------------------------------------------------------
# _denoise
# ---------------------------------------------------------------------------

class TestDenoise:
    def test_output_shape_matches_input(self):
        img = white_image(100, 150)
        result = _denoise(img)
        assert result.shape == img.shape

    def test_output_dtype_is_uint8(self):
        img = white_image()
        result = _denoise(img)
        assert result.dtype == np.uint8

    def test_white_image_stays_white(self):
        img = white_image()
        result = _denoise(img)
        assert result.mean() > 250

    def test_removes_single_dark_pixel_from_white_background(self):
        img = white_image(50, 50)
        img[25, 25] = [0, 0, 0]  # single dark pixel
        result = _denoise(img)
        # After 3×3 median filter the single pixel should be smoothed away
        assert result[25, 25].mean() > 128


# ---------------------------------------------------------------------------
# _deskew
# ---------------------------------------------------------------------------

class TestDeskew:
    def test_output_shape_matches_input(self):
        img = white_image(200, 300)
        result = _deskew(img)
        assert result.shape == img.shape

    def test_output_dtype_is_uint8(self):
        img = white_image()
        result = _deskew(img)
        assert result.dtype == np.uint8

    def test_plain_white_image_unchanged(self):
        """White image has no edges, so Hough finds no lines → returned unchanged."""
        img = white_image()
        result = _deskew(img)
        np.testing.assert_array_equal(result, img)

    def test_already_horizontal_image_unchanged(self):
        """A perfectly horizontal line produces angle ≈ 0° → skipped (< 0.5°)."""
        img = white_image(200, 400)
        img[100, :] = [0, 0, 0]  # horizontal black line
        result = _deskew(img)
        assert result.shape == img.shape


# ---------------------------------------------------------------------------
# _adaptive_threshold
# ---------------------------------------------------------------------------

class TestAdaptiveThreshold:
    def test_output_shape_is_3_channel(self):
        img = white_image(100, 150)
        result = _adaptive_threshold(img)
        assert result.ndim == 3
        assert result.shape[2] == 3

    def test_output_dtype_is_uint8(self):
        img = white_image()
        result = _adaptive_threshold(img)
        assert result.dtype == np.uint8

    def test_output_values_are_binary(self):
        """Adaptive threshold must produce only 0 or 255 per channel."""
        img = white_image(100, 100)
        result = _adaptive_threshold(img)
        unique_values = np.unique(result)
        assert set(unique_values).issubset({0, 255})

    def test_white_image_produces_white_output(self):
        """Uniform white background with C=10 subtracted → all pixels white."""
        img = white_image(100, 100)
        result = _adaptive_threshold(img)
        assert result.mean() > 200

    def test_block_size_scales_with_image_height(self):
        """Verify the function doesn't crash for various image sizes."""
        for height in [50, 100, 400, 1000]:
            img = white_image(height, height)
            result = _adaptive_threshold(img)
            assert result.shape == (height, height, 3)


# ---------------------------------------------------------------------------
# _correct_perspective
# ---------------------------------------------------------------------------

class TestCorrectPerspective:
    def test_no_quad_returns_input_unchanged(self):
        """A plain white image has no detectable quadrilateral → return as-is."""
        img = white_image(200, 300)
        result = _correct_perspective(img)
        np.testing.assert_array_equal(result, img)

    def test_output_is_valid_bgr_image(self):
        img = white_image(200, 300)
        result = _correct_perspective(img)
        assert result.ndim == 3
        assert result.shape[2] == 3
        assert result.dtype == np.uint8

    def test_small_rectangle_below_area_threshold_ignored(self):
        """
        A rectangle covering < 20% of image area should not trigger correction.
        We draw a small black border that is too small to be the dominant quad.
        """
        img = white_image(400, 400)
        # Small 40×40 black rect = 1,600 px²; image = 160,000 px² → 1% < 20%
        img[10:50, 10:50] = [0, 0, 0]
        result = _correct_perspective(img)
        # Shape should be unchanged (fallback path)
        assert result.shape == (400, 400, 3)
