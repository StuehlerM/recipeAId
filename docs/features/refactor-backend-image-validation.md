# Refactor: Deduplicate Backend Image Validation

## Problem

`RecipesController` duplicates image validation logic in two places:

1. **`PutImage`** (direct upload endpoint) — validates content type starts with `image/` and file size <= 10 MB
2. **`FromImage`** (OCR upload endpoint) — identical validation

The magic number `10 * 1024 * 1024` and the content-type check appear twice. The error message for invalid image slots (`"Invalid slot. Must be one of: title, ingredients, instructions."`) also appears in both `GetImage` and `PutImage`.

## Affected Files

- `backend/src/RecipeAId.Api/Controllers/RecipesController.cs` — duplicated validation in `PutImage` and `FromImage`

## Proposed Solution

Extract a small private helper method in the controller:

```csharp
private const long MaxImageSizeBytes = 10 * 1024 * 1024;
private static readonly string[] ValidSlots = ["title", "ingredients", "instructions"];

private IActionResult? ValidateImage(IFormFile image)
{
    if (!image.ContentType.StartsWith("image/", StringComparison.OrdinalIgnoreCase))
        return Problem(statusCode: 400, detail: "File must be an image.");
    if (image.Length > MaxImageSizeBytes)
        return Problem(statusCode: 400, detail: "Image must be under 10 MB.");
    return null;
}
```

## Acceptance Criteria

- Image size limit defined as a named constant (not inline `10 * 1024 * 1024`)
- Content-type check and size check extracted to shared method
- Valid slot names defined once
- No behavioral changes
- All backend unit tests pass
