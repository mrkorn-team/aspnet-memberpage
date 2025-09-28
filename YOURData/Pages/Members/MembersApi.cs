using Microsoft.EntityFrameworkCore;
using SixLabors.ImageSharp;
using SixLabors.ImageSharp.Formats.Jpeg;
using SixLabors.ImageSharp.Processing;
using YOURData.Models;

//using Microsoft.EntityFrameworkCore;

public static partial class MembersApi
{
  public static void MapMembersApi(this WebApplication app)
  {
    // API endpoint to get all users
    app.MapGet("/api/members", async (AppDbContext db) =>
    {
      var users = await db.Users
        .Select(u => new { u.Id, u.Name, u.Picture })
        .ToListAsync();
      return Results.Ok(users);  // returns an array of user objects
    });
  }
}

public static partial class MembersApi
{
  public static void MapMembersApi_v3(this WebApplication app)
  {
    app.MapGet("/api/members", async (AppDbContext db, int page = 1, int pageSize = 10) =>
    {
      var users = await db.Users
        .OrderBy(u => u.Name)
        .Skip((page - 1) * pageSize)
        .Take(pageSize)
        .Select(u => new { u.Id, u.Name, u.Picture })
        .ToListAsync();

      var totalCount = await db.Users.CountAsync();
      return Results.Ok(new { users, totalCount });
    });
  }

  public static void MapMembersApi_v2(this WebApplication app)
  {
    // GET /api/users?pageIndex=1&pageSize=5
    app.MapGet("/api/users", async (AppDbContext db, int pageIndex = 1, int pageSize = 5) =>
    {
      var totalCount = await db.Users.CountAsync();
      var totalPages = (int)Math.Ceiling(totalCount / (double)pageSize);

      var users = await db.Users
          .OrderBy(u => u.Name)
          .Skip((pageIndex - 1) * pageSize)
          .Take(pageSize)
          .Select(u => new { u.Id, u.Name, u.Picture })
          .ToListAsync();

      return Results.Json(new { users, totalPages });
    });

    // POST /api/users/update
    app.MapPost("/api/users/update", async (HttpRequest request, AppDbContext db, IWebHostEnvironment env) =>
    {
      var form = await request.ReadFormAsync();
      var userId = Guid.Parse(form["id"]);
      var username = form["username"];
      var file = form.Files["picture"];

      var user = await db.Users.FindAsync(userId);
      if (user == null)
        return Results.NotFound();

      string oldPicturePath = null;

      // Handle picture upload
      if (file != null && file.Length > 0)
      {
        if (file.Length > 5 * 1024 * 1024)
          return Results.BadRequest("File too large.");

        var appDataFolder = Path.Combine(env.WebRootPath, "appdata", "member", "picture");
        if (!Directory.Exists(appDataFolder))
          Directory.CreateDirectory(appDataFolder);

        oldPicturePath = Path.Combine(appDataFolder, Path.GetFileName(user.Picture ?? ""));

        var newFileName = $"{Guid.NewGuid()}.jpg";
        var newFilePath = Path.Combine(appDataFolder, newFileName);

        using var imgStream = file.OpenReadStream();
        using var img = SixLabors.ImageSharp.Image.Load(imgStream);
        img.Mutate(x => x.Resize(new SixLabors.ImageSharp.Processing.ResizeOptions
        {
          Size = new SixLabors.ImageSharp.Size(160, 160),
          Mode = SixLabors.ImageSharp.Processing.ResizeMode.Crop
        }));
        await img.SaveAsJpegAsync(newFilePath, new SixLabors.ImageSharp.Formats.Jpeg.JpegEncoder
        {
          Quality = 75
        });

        user.Picture = $"/appdata/member/picture/{newFileName}";

        // Delete old picture
        if (!string.IsNullOrEmpty(oldPicturePath) && File.Exists(oldPicturePath))
          File.Delete(oldPicturePath);
      }

      user.Name = username;
      await db.SaveChangesAsync();

      return Results.Json(new { success = true, user = new { user.Id, user.Name, user.Picture } });
    });
  }

  // ... after app.UseStaticFiles(); and after app is built
  public static void MapMembersApi_v1(this WebApplication app)
  {
    app.MapGet("/api/users", async (int pageIndex, int pageSize, AppDbContext db) =>
    {
      if (pageIndex < 1)
        pageIndex = 1;
      if (pageSize < 1)
        pageSize = 5;

      var totalUsers = await db.Users.CountAsync();
      var totalPages = (int)Math.Ceiling(totalUsers / (double)pageSize);

      var users = await db.Users
          .OrderBy(u => u.Name)
          .Skip((pageIndex - 1) * pageSize)
          .Take(pageSize)
          .Select(u => new
          {
            u.Id,
            u.Name,
            u.Picture
          })
          .ToListAsync();

      return Results.Json(new { users, totalPages });
    });

    app.MapPost("/api/users/update", async (HttpRequest request, AppDbContext db, IWebHostEnvironment env) =>
    {
      // Accept multipart/form-data with fields: id, username, (optional) file
      if (!request.HasFormContentType)
        return Results.BadRequest(new { error = "Invalid content type" });

      var form = await request.ReadFormAsync();

      if (!Guid.TryParse(form["id"], out var id))
        return Results.BadRequest(new { error = "Missing id" });

      var username = form["username"].ToString() ?? string.Empty;
      if (string.IsNullOrWhiteSpace(username))
        return Results.BadRequest(new { error = "Username required" });

      var user = await db.Users.FindAsync(id);
      if (user == null)
        return Results.NotFound(new { error = "User not found" });

      // handle file if present
      var file = form.Files.FirstOrDefault(); // optional
      string wwwRoot = env.WebRootPath ?? Path.Combine(Directory.GetCurrentDirectory(), "wwwroot");
      string folder = Path.Combine(wwwRoot, "appdata", "member", "picture");
      Directory.CreateDirectory(folder);

      string oldFileName = null;
      if (!string.IsNullOrWhiteSpace(user.Picture))
      {
        // Try to extract file name from URL (/appdata/member/picture/{guid}.jpg)
        try
        {
          oldFileName = Path.GetFileName(new Uri(user.Picture, UriKind.RelativeOrAbsolute).ToString());
        }
        catch
        {
          oldFileName = Path.GetFileName(user.Picture);
        }
      }

      if (file != null)
      {
        // Validate size <= 5MB
        const long MAX_SIZE = 5L * 1024 * 1024;
        if (file.Length > MAX_SIZE)
          return Results.BadRequest(new { error = "File too large (max 5 MB)" });

        // New file name
        var newGuid = Guid.NewGuid();
        var newFileName = newGuid + ".jpg";
        var newFilePath = Path.Combine(folder, newFileName);

        // Read and resize to 160x160 and save jpeg compressed
        using (var stream = file.OpenReadStream())
        using (var image = Image.Load(stream))
        {
          // Resize while keeping aspect ratio, pad or crop to 160x160
          image.Mutate(x => x.Resize(new ResizeOptions
          {
            Size = new Size(160, 160),
            Mode = ResizeMode.Crop
          }));

          var encoder = new JpegEncoder { Quality = 75 }; // compress quality
          await image.SaveAsJpegAsync(newFilePath, encoder);
        }

        // Delete old file if exists and not same name
        if (!string.IsNullOrEmpty(oldFileName))
        {
          var oldPath = Path.Combine(folder, oldFileName);
          if (System.IO.File.Exists(oldPath))
          {
            try
            { System.IO.File.Delete(oldPath); }
            catch { /* ignore */ }
          }
        }

        // Update db PictureUrl (relative path)
        user.Picture = "/appdata/member/picture/" + newFileName;
      }

      user.Name = username;
      db.Users.Update(user);
      await db.SaveChangesAsync();

      return Results.Json(new { success = true, user = new { user.Id, user.Name, user.Picture } });
    });

  }
}
