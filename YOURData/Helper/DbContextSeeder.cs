using Microsoft.EntityFrameworkCore;

public static class DbContextSeeder
{
  public static IServiceProvider RenewDatabase<TDbContext>(this IServiceProvider services)
    where TDbContext : DbContext
  {
    using (var scope = services.CreateScope())
    using (var db = scope.ServiceProvider.GetRequiredService<TDbContext>())
    {
      db.Database.EnsureDeleted();
      db.Database.EnsureCreated();
    }
    return services;
  }
}
