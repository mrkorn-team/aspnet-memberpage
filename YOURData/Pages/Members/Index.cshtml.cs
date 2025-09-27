using Microsoft.AspNetCore.Mvc.RazorPages;
using Microsoft.EntityFrameworkCore;
using YOURData.Models;

namespace YOURData.Pages.Members;

public class IndexModel : PageModel
{
  private readonly AppDbContext _db;

  public IndexModel(AppDbContext db)
  {
    _db = db;
  }

  public void OnGet() { }
}

// test tortoisegit
// recommit again 2
// feature-edit-page-1
// master change 1
// master change 2