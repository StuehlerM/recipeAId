/**
 * Unit tests for imageConversion utility (Issue #17 — split useOcrCapture).
 *
 * Run: cd frontend && npm test -- src/utils/imageConversion.test.ts
 */
import { describe, it, expect, vi, beforeEach, afterEach, afterAll } from "vitest";
import { toJpeg } from "./imageConversion";

// ---------------------------------------------------------------------------
// Browser API mocks
// ---------------------------------------------------------------------------

const mockRevokeObjectURL = vi.fn();
const mockCreateObjectURL = vi.fn(() => "blob:mock-url");

// Save original so we can restore it after all tests in this suite.
const OriginalURL = globalThis.URL;

Object.defineProperty(globalThis, "URL", {
  value: {
    ...OriginalURL,
    createObjectURL: mockCreateObjectURL,
    revokeObjectURL: mockRevokeObjectURL,
  },
  writable: true,
  configurable: true,
});

afterAll(() => {
  globalThis.URL = OriginalURL;
});

function makeFakeFile(name = "photo.heic", type = "image/heic"): File {
  return new File(["fake-image-bytes"], name, { type });
}

let _restoreImage: () => void = () => {};

function setupImageMock(width: number, height: number) {
  const img: Partial<HTMLImageElement> & { onload: (() => void) | null; onerror: (() => void) | null } = {
    onload: null,
    onerror: null,
    width,
    height,
    src: "",
  };

  const OriginalImage = globalThis.Image;
  globalThis.Image = vi.fn().mockImplementation(function() {
    setTimeout(() => img.onload?.(), 0);
    return img;
  }) as unknown as typeof Image;
  _restoreImage = () => { globalThis.Image = OriginalImage; };
}

function setupCanvasMock(opts: { failGetContext?: boolean; failToBlob?: boolean } = {}) {
  const mockToBlob = vi.fn((cb: BlobCallback) => {
    if (opts.failToBlob) {
      cb(null);
    } else {
      cb(new Blob(["jpeg"], { type: "image/jpeg" }));
    }
  });

  const mockGetContext = vi.fn(() => {
    if (opts.failGetContext) return null;
    return { drawImage: vi.fn() } as unknown as CanvasRenderingContext2D;
  });

  const originalCreateElement = document.createElement.bind(document);
  vi.spyOn(document, "createElement").mockImplementation((tag: string) => {
    if (tag === "canvas") {
      return {
        width: 0,
        height: 0,
        getContext: mockGetContext,
        toBlob: mockToBlob,
      } as unknown as HTMLCanvasElement;
    }
    return originalCreateElement(tag);
  });

  return { mockToBlob, mockGetContext };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("toJpeg", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    mockCreateObjectURL.mockReturnValue("blob:mock-url");
    mockRevokeObjectURL.mockReset();
  });

  afterEach(() => {
    _restoreImage();
    _restoreImage = () => {};
  });

  it("toJpeg_withSmallImage_returnsJpegBlob", async () => {
    // Arrange: image fits within MAX_DIMENSION
    setupImageMock(800, 600);
    setupCanvasMock();
    const file = makeFakeFile();

    // Act
    const result = await toJpeg(file);

    // Assert: result is a Blob with JPEG mime type
    expect(result).toBeInstanceOf(Blob);
    expect(result.type).toBe("image/jpeg");
  });

  it("toJpeg_withSmallImage_callsDrawImage", async () => {
    // Arrange: 800x600 is below 2048 limit
    setupImageMock(800, 600);
    const { mockGetContext } = setupCanvasMock();
    const file = makeFakeFile();

    // Act
    await toJpeg(file);

    // Assert: drawImage was called (canvas was used)
    const ctx = mockGetContext.mock.results[0].value as { drawImage: ReturnType<typeof vi.fn> };
    expect(ctx.drawImage).toHaveBeenCalled();
  });

  it("toJpeg_withImageLargerThanMaxDimension_downscalesToFit", async () => {
    // Arrange: 4096x3072 is larger than the 2048 limit
    setupImageMock(4096, 3072);
    let capturedWidth = 0;
    let capturedHeight = 0;

    const originalCreateElement = document.createElement.bind(document);
    vi.spyOn(document, "createElement").mockImplementation((tag: string) => {
      if (tag === "canvas") {
        const canvas = {
          get width() { return capturedWidth; },
          set width(v: number) { capturedWidth = v; },
          get height() { return capturedHeight; },
          set height(v: number) { capturedHeight = v; },
          getContext: vi.fn(() => ({ drawImage: vi.fn() })),
          toBlob: vi.fn((cb: BlobCallback) => cb(new Blob(["jpeg"], { type: "image/jpeg" }))),
        };
        return canvas as unknown as HTMLCanvasElement;
      }
      return originalCreateElement(tag);
    });

    const file = makeFakeFile();

    // Act
    await toJpeg(file);

    // Assert: longest side at most 2048; aspect ratio preserved (4096x3072 -> 2048x1536)
    expect(Math.max(capturedWidth, capturedHeight)).toBeLessThanOrEqual(2048);
    expect(capturedWidth).toBe(2048);
    expect(capturedHeight).toBe(1536);
  });

  it("toJpeg_withCanvasContextUnavailable_rejects", async () => {
    // Arrange: getContext returns null (e.g., old browser)
    setupImageMock(800, 600);
    setupCanvasMock({ failGetContext: true });
    const file = makeFakeFile();

    // Act & Assert
    await expect(toJpeg(file)).rejects.toThrow("Canvas not supported");
  });

  it("toJpeg_withBlobConversionFailure_rejects", async () => {
    // Arrange: toBlob calls callback with null
    setupImageMock(800, 600);
    setupCanvasMock({ failToBlob: true });
    const file = makeFakeFile();

    // Act & Assert
    await expect(toJpeg(file)).rejects.toThrow("JPEG conversion failed");
  });

  it("toJpeg_withCustomMaxDimension_respectsOverride", async () => {
    // Arrange: 1200x900 image with maxDimension=600
    setupImageMock(1200, 900);
    let capturedWidth = 0;
    let capturedHeight = 0;

    const originalCreateElement = document.createElement.bind(document);
    vi.spyOn(document, "createElement").mockImplementation((tag: string) => {
      if (tag === "canvas") {
        const canvas = {
          get width() { return capturedWidth; },
          set width(v: number) { capturedWidth = v; },
          get height() { return capturedHeight; },
          set height(v: number) { capturedHeight = v; },
          getContext: vi.fn(() => ({ drawImage: vi.fn() })),
          toBlob: vi.fn((cb: BlobCallback) => cb(new Blob(["jpeg"], { type: "image/jpeg" }))),
        };
        return canvas as unknown as HTMLCanvasElement;
      }
      return originalCreateElement(tag);
    });

    const file = makeFakeFile();

    // Act
    await toJpeg(file, 600);

    // Assert: longest side scaled to 600; aspect ratio preserved (1200x900 -> 600x450)
    expect(capturedWidth).toBe(600);
    expect(capturedHeight).toBe(450);
  });

  it("toJpeg_revokesObjectUrl_afterImageLoad", async () => {
    // Arrange
    setupImageMock(800, 600);
    setupCanvasMock();
    const file = makeFakeFile();

    // Act
    await toJpeg(file);

    // Assert: URL is revoked to avoid memory leak
    expect(mockRevokeObjectURL).toHaveBeenCalledWith("blob:mock-url");
  });
});
