using Microsoft.EntityFrameworkCore;

namespace YOURData.Models;

public class AppUser
{
  public Guid Id { get; set; }
  public string? Email { get; set; }
  public string? Name { get; set; }
  public string PictureUrl { get; set; } = string.Empty;
}

public class AppDbContext : DbContext
{
  public AppDbContext(DbContextOptions<AppDbContext> options) : base(options)
  {
  }

  public DbSet<AppUser> Users { get; set; }
}

public static class AppDbContextService
{
  public static IServiceProvider InitData<TDbContext, TUser>(this IServiceProvider service)
    where TDbContext : AppDbContext
    where TUser : AppUser
  {
    using (var scope = service.CreateScope())
    using (var db = scope.ServiceProvider.GetRequiredService<TDbContext>())
    {
      if (db.Users.Any()) return service;

      var items = new AppUser[] {
        new AppUser{ Email="alex@example.com", Name="Alex", PictureUrl="/$dev/admin/dist/assets/img/k1.jpg" },
        new AppUser{ Email="bella@example.com", Name="Bella", PictureUrl="/$dev/admin/dist/assets/img/k2.jpg" },
        new AppUser{ Email="chalie@example.com", Name="Chalie", PictureUrl="/$dev/admin/dist/assets/img/bg1.jpg" },
      };
      db.Users.AddRange(items);
      db.SaveChanges();
    }
    return service;
  }
}
