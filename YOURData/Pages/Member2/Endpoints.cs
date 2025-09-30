using Microsoft.EntityFrameworkCore;
using YOURData.Models;

namespace YOURData.Pages.Gpt.Member;

public static partial class Extension
{
  public static void MapGptEndpoints(this WebApplication app)
  {
    app.MapGet("/members/list", async (AppDbContext db) =>
    {
      var users = await db.Users
          .AsNoTracking()
          .Select(u => new
          {
            id = u.Id,
            email = u.Email,
            pictureUrl = u.PictureUrl
          })
          .ToListAsync();

      return Results.Json(users);
    });
  } 
}
