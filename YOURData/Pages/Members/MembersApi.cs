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
        .Select(u => new { u.Id, u.Name, u.PictureUrl })
        .ToListAsync();
      return Results.Ok(users);  // returns an array of user objects
    });
  }
}
