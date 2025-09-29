#nullable enable
using SixLabors.ImageSharp;
using SixLabors.ImageSharp.Formats.Jpeg;
using SixLabors.ImageSharp.PixelFormats;
using SixLabors.ImageSharp.Processing;

public sealed record ImageProcessResult(bool Success, string? RelativePath, string? ErrorMessage);

public static class ImageHelper
{
  /// <summary>
  /// Processes an uploaded image:
  /// - Validates size and type
  /// - Ensures height >= targetHeight
  /// - Optional center-crop when ratio > maxRatio
  /// - Resize to targetHeight keeping ratio
  /// - Flatten transparency onto white
  /// - Encode to JPEG and iterate to fit targetMaxBytes (quality floor 30)
  /// - Save to wwwroot/appdata/member/photo/{guid}.jpg
  /// - Delete old file (if provided)
  /// </summary>
  public static async Task<ImageProcessResult> ProcessAndSaveAsync(
      IFormFile file,
      string? existingRelativePath,
      string webRootPath,
      int targetHeight = 160,
      float maxRatio = 6f,
      int targetMaxBytes = 100_000,
      long maxUploadBytes = 5_242_880 // 5MB
  )
  {
    if (file is null)
      return new ImageProcessResult(false, null, "No file provided.");
    if (file.Length <= 0)
      return new ImageProcessResult(false, null, "Empty file.");

    if (file.Length > maxUploadBytes)
    {
      return new ImageProcessResult(false, null, "File too large. Maximum allowed upload: 5 MB.");
    }

    // Quick MIME check
    if (string.IsNullOrWhiteSpace(file.ContentType) || !file.ContentType.StartsWith("image/", StringComparison.OrdinalIgnoreCase))
      return new ImageProcessResult(false, null, "File must be an image.");

    // Prepare target dir
    var relativeDir = "/appdata/member/photo";
    var absoluteDir = Path.Combine(webRootPath, "appdata", "member", "photo");
    Directory.CreateDirectory(absoluteDir);

    // Load image into ImageSharp
    try
    {
      using var inputStream = file.OpenReadStream();
      using Image<Rgba32> image = await Image.LoadAsync<Rgba32>(inputStream);

      if (image.Height < targetHeight)
      {
        return new ImageProcessResult(false, null, $"Image height must be at least {targetHeight}px.");
      }

      // If extremely wide: enforce max ratio by cropping centered
      var currentRatio = (double)image.Width / image.Height;
      if (currentRatio > maxRatio)
      {
        var targetWidth = (int)Math.Round(image.Height * maxRatio);
        var cropX = (image.Width - targetWidth) / 2;
        var cropRect = new Rectangle(cropX, 0, targetWidth, image.Height);
        image.Mutate(x => x.Crop(cropRect));
      }

      // Resize to targetHeight maintaining ratio
      var resizeWidth = (int)Math.Round(image.Width * (targetHeight / (double)image.Height));
      var resizeOptions = new ResizeOptions
      {
        Mode = ResizeMode.Max,
        Size = new Size(resizeWidth, targetHeight),
        Sampler = KnownResamplers.Bicubic
      };

      image.Mutate(x => x.Resize(resizeOptions));

      // Flatten onto white background to remove transparency
      using var flattened = new Image<Rgba32>(image.Width, image.Height);
      flattened.Mutate(ctx => ctx.DrawImage(image, new Point(0, 0), 1f));

      // Encode to JPEG with iterative compression to approach targetMaxBytes
      int quality = 80;
      byte[] jpegBytes;
      var encoder = new JpegEncoder() { Quality = quality };

      // Helper local function to encode current image into byte[]
      byte[] EncodeToJpegBytes(int q)
      {
        using var ms = new MemoryStream();
        var enc = new JpegEncoder { Quality = q };
        flattened.Save(ms, enc);
        return ms.ToArray();
      }

      jpegBytes = EncodeToJpegBytes(quality);

      if (jpegBytes.Length > targetMaxBytes)
      {
        // compute scaled quality using linear proportion, ensure floor of 30 quality
        // newQuality = max(30, (int)(quality * (targetMaxBytes / currentSize)))
        // iterate to refine (cap iterations)
        for (int attempt = 0; attempt < 6 && jpegBytes.Length > targetMaxBytes; attempt++)
        {
          double factor = (double)targetMaxBytes / jpegBytes.Length;
          int newQuality = Math.Max(30, (int)Math.Round(quality * factor));
          if (newQuality >= quality)
          {
            // If computed quality is not lower, decrement by 10 to force progress
            newQuality = Math.Max(30, quality - 10);
          }

          quality = newQuality;
          jpegBytes = EncodeToJpegBytes(quality);

          // small safety: if quality reached floor and still too large, break
          if (quality <= 30)
            break;
        }
      }

      if (jpegBytes.Length > targetMaxBytes)
      {
        return new ImageProcessResult(false, null, $"Unable to compress image below {targetMaxBytes / 1024} KB.");
      }

      // Save to disk with a new GUID filename
      var newFileName = $"{Guid.NewGuid():N}.jpg";
      var absolutePath = Path.Combine(absoluteDir, newFileName);
      await File.WriteAllBytesAsync(absolutePath, jpegBytes);

      // Safe delete of old file (if exists and within the same folder)
      if (!string.IsNullOrWhiteSpace(existingRelativePath))
      {
        try
        {
          // normalized relative path: remove leading slash
          var candidate = existingRelativePath.StartsWith('/') ? existingRelativePath[1..] : existingRelativePath;
          var oldAbs = Path.GetFullPath(Path.Combine(webRootPath, candidate.Replace('/', Path.DirectorySeparatorChar)));

          // ensure we don't accidentally delete outside photo folder
          var allowedPrefix = Path.GetFullPath(absoluteDir) + Path.DirectorySeparatorChar;
          if (oldAbs.StartsWith(allowedPrefix, StringComparison.OrdinalIgnoreCase) && File.Exists(oldAbs))
          {
            File.Delete(oldAbs);
          }
        }
        catch
        {
          // swallow any IO exceptions deleting old file (do not fail save)
        }
      }

      // Form relative path (use forward slashes for URL)
      var relativePath = $"{relativeDir}/{newFileName}";

      return new ImageProcessResult(true, relativePath, null);
    }
    catch (UnknownImageFormatException)
    {
      return new ImageProcessResult(false, null, "Unknown or unsupported image format.");
    }
    catch (Exception ex)
    {
      // do not leak internal stack traces in production; give generic error
      return new ImageProcessResult(false, null, "Image processing failed: " + ex.Message);
    }
  }
}
