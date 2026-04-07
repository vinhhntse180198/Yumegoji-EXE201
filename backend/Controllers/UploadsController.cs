using System;
using System.IO;
using System.Threading.Tasks;
using backend.Authorization;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace backend.Controllers;

public class UploadImageRequest
{
    public IFormFile File { get; set; } = null!;
}

[ApiController]
[Route("api/[controller]")]
[Authorize(Policy = AuthPolicies.Member)]
public class UploadsController : ControllerBase
{
    private readonly IWebHostEnvironment _env;

    public UploadsController(IWebHostEnvironment env)
    {
        _env = env;
    }

    /// <summary>Upload 1 ảnh, trả về URL tĩnh để dùng cho avatar / bài đăng.</summary>
    [HttpPost("image")]
    [RequestSizeLimit(5_000_000)]
    public async Task<IActionResult> UploadImage([FromForm] UploadImageRequest request)
    {
        var file = request.File;
        if (file == null || file.Length == 0)
            return BadRequest(new { message = "File không hợp lệ." });

        if (!file.ContentType.StartsWith("image/", StringComparison.OrdinalIgnoreCase))
            return BadRequest(new { message = "Chỉ cho phép upload hình ảnh." });

        var uploadsRoot = _env.WebRootPath;
        if (string.IsNullOrWhiteSpace(uploadsRoot))
        {
            uploadsRoot = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot");
        }

        var dir = Path.Combine(uploadsRoot, "uploads");
        if (!Directory.Exists(dir))
        {
            Directory.CreateDirectory(dir);
        }

        var safeName = Path.GetFileName(file.FileName);
        var ext = Path.GetExtension(safeName);
        var fileName = $"{Guid.NewGuid():N}{ext}";
        var fullPath = Path.Combine(dir, fileName);

        await using (var stream = System.IO.File.Create(fullPath))
        {
            await file.CopyToAsync(stream);
        }

        var url = $"/uploads/{fileName}";
        return Ok(new { url });
    }
}

