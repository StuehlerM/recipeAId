/**
 * Unit tests for imageConversion utility (Issue #17 — split useOcrCapture).
 *
 * Run: cd frontend && npm test -- src/utils/imageConversion.test.ts
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { toJpeg } from "./imageConversion";

// ---------------------------------------------------------------------------
// Browser API mocks
// ---------------------------------------------------------------------------

const mockRevokeObjectURL = vi.fn();
const mockCreateObjectURL = vi.fn(() => "blob:mock-url");

Object.defineProperty(globalThis, "URL", {
  value: {
    createObjectURL: mockCreateObjectURL,
    revokeObjectURL: mockRevokeObjectURL,
  },
  writable: true,
});

function makeFakeFile(name = "photo.heic", type = "image/heic"): File {
  return new File(["fake-image-bytes"], name, { type });
}

function setupImageMock(width: number, height: number) {
  const img: Partial<HTMLImageElement> & { onload: (() => void) | null; onerror: (() => void) | null } = {
    onload: null,
    onerror: null,
    width,
    height,
    src: "",
  };

  vi.spyOn(globalThis, "Image").mockImplementation(() => {
    setTimeout(() => img.onload?.(), 0);
    return img as HTMLImageElement;
  });

  return img;
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

  vi.spyOn(document, "createElement").mockImplementation((tag: string) => {
    if (tag === "canvas") {
      return {
        width: 0,
        height: 0,
        getContext: mockGetContext,
        toBlob: mockToBlob,
      } as unknown as HTMLCanvasElement;
    }
    return document.createElement(tag);
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

  it("toJpeg_withSmallImage_returnsJpegBlob", async () => {
    // Arrange: image fits within MAX_DIMENSION
    setupImageMock(800, 600);
    setupCanvasMock();
    const file = makeFakeFile();

    // Act
    const result = await toJpeg(file);

    // Assert: result is a Blob (or File) with JPEG mime type
    expect(result).toBeInstanceOf(Blob);
    expect((result as Blob).type).toBe("image/jpeg");
  });

  it("toJpeg_withSmallImage_preservesOriginalDimensions", async () => {
    // Arrange: 800×600 is below 2048 limit
    setupImageMock(800, 600);
    const { mockGetContext } = setupCanvasMock();
    const file = makeFakeFile();

    // Act
    await toJpeg(file);

    // Assert: drawImage was called (canvas was used without rescaling)
    const ctx = mockGetContext.mock.results[0].value as { drawImage: ReturnType<typeof vi.fn> };
    expect(ctx.drawImage).toHaveBeenCalled();
  });

  it("toJpeg_withImageLargerThanMaxDimension_downscalesToFit", async () => {
    // Arrange: 4096×3072 is larger than the 2048 limit
    setupImageMock(4096, 3072);
    let capturedWidth = 0;
    let capturedHeight = 0;

    const mockToBlob = vi.fn((cb: BlobCallback) => cb(new Blob(["jpeg"], { type: "image/jpeg" })));
    vi.spyOn(document, "createElement").mockImplementation((tag: string) => {
      if (tag === "canvas") {
        const canvas = {
          get width() { return capturedWidth; },
          set width(v) { capturedWidth = v; },
          get height() { return capturedHeight; },
          set height(v) { capturedHeight = v; },
          getContext: vi.fn(() => ({ drawImage: vi.fn() })),
          toBlob: mockToBlob,
        };
        return canvas as unknown as HTMLCanvasElement;
      }
      return document.createElement(tag);
    });

    const file = makeFakeFile();

    // Act
    await toJpeg(file);

    // Assert: longest side is at most 2048
    expect(Math.max(capturedWidth, capturedHeight)).toBeLessThanOrEqual(2048);
    // Aspect ratio preserved: 4096×3072 at scale 0.5 → 2048×1536
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
    // Arrange: 1200×900 image with maxDimension=600
    setupImageMock(1200, 900);
    let capturedWidth = 0;
    let capturedHeight = 0;

    vi.spyOn(document, "createElement").mockImplementation((tag: string) => {
      if (tag === "canvas") {
        const canvas = {
          get width() { return capturedWidth; },
          set width(v) { capturedWidth = v; },
          get height() { return capturedHeight; },
          set height(v) { capturedHeight = v; },
          getContext: vi.fn(() => ({ drawImage: vi.fn() })),
          toBlob: vi.fn((cb: BlobCallback) => cb(new Blob(["jpeg"], { type: "image/jpeg" }))),
        };
        return canvas as unknown as HTMLCanvasElement;
      }
      return document.createElement(tag);
    });

    const file = makeFakeFile();

    // Act
    await toJpeg(file, 600);

    // Assert: longest side scaled to 600
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
