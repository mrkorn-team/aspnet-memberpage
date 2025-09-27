using Microsoft.EntityFrameworkCore;

namespace YOURData.Models;

public class AppUser
{
  public Guid Id { get; set; }
  public string? Name { get; set; }
  public string Picture { get; set; } = string.Empty;
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
      var items = new AppUser[] {
        new AppUser{ Name="Alex", Picture="/$dev/admin/dist/assets/img/k1.jpg" },
        new AppUser{ Name="Bella", Picture="/$dev/admin/dist/assets/img/k2.jpg" },
        new AppUser{ Name="Chalie", Picture="/$dev/admin/dist/assets/img/bg1.jpg" },
      };
      db.Users.AddRange(items);
      db.SaveChanges();
    }
    return service;
  }
}
