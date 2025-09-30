#nullable enable
using Microsoft.EntityFrameworkCore;
using SixLabors.ImageSharp;
using YOURData.Models;

public static partial class Extension
{
  public static void MapEndpoints(this WebApplication app)
  {
    // API endpoint to get all users
    app.MapGet("/api/member/list", async (AppDbContext db) =>
    {
      var users = await db.Users
        .Select(u => new { id = u.Id, email = u.Email, pictureUrl = u.PictureUrl })
        .ToListAsync();
      return Results.Ok(users);  // returns an array of user objects
    });

    // In Program.cs after builder and app creation and DbContext registered:
    app.MapPost("/api/member/edit", async (HttpRequest request, AppDbContext db, IWebHostEnvironment env) =>
    {
      if (!request.HasFormContentType)
        return Results.BadRequest(new { error = "Invalid content type; expected multipart/form-data." });

      var form = await request.ReadFormAsync();

      var idValue = form["Id"].ToString();
      if (string.IsNullOrWhiteSpace(idValue) || !int.TryParse(idValue, out var id))
      {
        return Results.BadRequest(new { error = "Missing or invalid Id." });
      }

      var email = form["Email"].ToString().Trim();
      if (string.IsNullOrWhiteSpace(email))
      {
        return Results.BadRequest(new { error = "Email is required." });
      }

      var user = await db.Set<AppUser>().FindAsync(id);
      if (user is null)
      {
        return Results.NotFound(new { error = "User not found." });
      }

      // Save old relative path to allow deletion in ImageHelper
      var oldRelative = user.PictureUrl;

      IFormFile? uploadedFile = form.Files.GetFile("Picture");

      if (uploadedFile is not null && uploadedFile.Length > 0)
      {
        var result = await ImageHelper.ProcessAndSaveAsync(uploadedFile, oldRelative, env.WebRootPath);
        if (!result.Success)
        {
          return Results.BadRequest(new { error = result.ErrorMessage });
        }

        // update picture url to returned relative path
        user.PictureUrl = result.RelativePath ?? user.PictureUrl;
      }

      user.Email = email;
      try
      {
        await db.SaveChangesAsync();
      }
      catch (DbUpdateException dbEx)
      {
        var requiredRfc7807 = false;
        if (requiredRfc7807)
        {
          return Results.Problem(
              title: "Failed to save user",
              detail: dbEx.Message,
              statusCode: StatusCodes.Status500InternalServerError
          );
        }

        return Results.Json(
             new { error = "Failed to save user.", detail = dbEx.Message },
             statusCode: StatusCodes.Status500InternalServerError
         );
      }

      return Results.Json(new { email = user.Email, pictureUrl = user.PictureUrl });
    });

  }
}
