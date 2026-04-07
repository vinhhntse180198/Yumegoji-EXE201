using System.IO;
using System.Linq;
using System.Text;
using DocumentFormat.OpenXml;
using DocumentFormat.OpenXml.Packaging;
using DocumentFormat.OpenXml.Wordprocessing;
using UglyToad.PdfPig;

namespace backend.Services.Learning;

/// <summary>Trích văn bản thuần từ PDF / DOCX / PPTX (server-side).</summary>
public static class LessonDocumentTextExtractor
{
    /// <summary>Tránh OOM / treo với slide deck rất lớn hoặc XML lồng sâu.</summary>
    private const int PptxMaxSlides = 500;

    private const int PptxMaxTotalChars = 400_000;

    public static string Extract(Stream stream, string fileName, out string? errorMessage)
    {
        errorMessage = null;
        if (stream == null || !stream.CanRead)
        {
            errorMessage = "Luồng tệp không đọc được.";
            return "";
        }

        var ext = Path.GetExtension(fileName).ToLowerInvariant();
        try
        {
            if (ext == ".pdf")
                return ExtractPdf(stream);
            if (ext == ".docx")
                return ExtractDocx(stream);
            if (ext == ".pptx")
                return ExtractPptx(stream);
            if (ext == ".doc")
            {
                errorMessage =
                    "Định dạng .doc (Word cũ) chưa hỗ trợ. Vui lòng lưu tệp thành .docx hoặc xuất PDF.";
                return "";
            }

            errorMessage = "Chỉ hỗ trợ .pdf, .docx và .pptx.";
            return "";
        }
        catch (OutOfMemoryException)
        {
            errorMessage =
                "Hết bộ nhớ khi đọc tệp (thường gặp với .pptx rất nặng). Thử: tách file nhỏ hơn, xuất PDF, hoặc dán text vào ô bên cạnh.";
            return "";
        }
        catch (Exception ex)
        {
            errorMessage = $"Không đọc được tệp: {ex.Message}";
            return "";
        }
    }

    private static string ExtractPdf(Stream stream)
    {
        stream.Position = 0;
        using var document = PdfDocument.Open(stream);
        var sb = new StringBuilder();
        foreach (var page in document.GetPages())
            sb.AppendLine(page.Text);
        return NormalizeWhitespace(sb.ToString());
    }

    private static string ExtractDocx(Stream stream)
    {
        stream.Position = 0;
        using var doc = WordprocessingDocument.Open(stream, false);
        var body = doc.MainDocumentPart?.Document?.Body;
        if (body == null) return "";
        var texts = body.Descendants<Text>().Select(t => t.Text);
        return NormalizeWhitespace(string.Join("\n", texts));
    }

    /// <summary>
    /// Thu thập chữ từ shape/slide: &lt;a:t&gt; (DrawingML) và &lt;w:t&gt; (Wordprocessing trong khung nhúng).
    /// </summary>
    private static void AppendPptxShapeText(OpenXmlElement? root, StringBuilder sb)
    {
        if (root == null) return;
        const string drawingMainNs = "http://schemas.openxmlformats.org/drawingml/2006/main";
        const string wordProcNs = "http://schemas.openxmlformats.org/wordprocessingml/2006/main";
        foreach (var el in root.Descendants())
        {
            if (el.LocalName != "t")
                continue;
            if (el.NamespaceUri != drawingMainNs && el.NamespaceUri != wordProcNs)
                continue;
            var inner = el.InnerText?.Trim();
            if (!string.IsNullOrWhiteSpace(inner))
                sb.AppendLine(inner);
        }
    }

    private static string ExtractPptx(Stream stream)
    {
        stream.Position = 0;
        using var doc = PresentationDocument.Open(stream, false);
        var presentationPart = doc.PresentationPart;
        if (presentationPart == null) return "";
        var sb = new StringBuilder();
        var slideIndex = 0;

        var slideIdList = presentationPart.Presentation?.SlideIdList
            ?.Elements<DocumentFormat.OpenXml.Presentation.SlideId>();
        if (slideIdList != null)
        {
            foreach (var slideId in slideIdList)
            {
                var relId = slideId.RelationshipId?.Value;
                if (string.IsNullOrEmpty(relId))
                    continue;
                if (presentationPart.GetPartById(relId) is not SlidePart slidePart)
                    continue;

                if (++slideIndex > PptxMaxSlides || sb.Length >= PptxMaxTotalChars)
                    break;

                sb.AppendLine($"--- Slide {slideIndex} ---");
                AppendPptxShapeText(slidePart.Slide, sb);
                if (sb.Length >= PptxMaxTotalChars)
                    break;

                if (slidePart.NotesSlidePart?.NotesSlide != null)
                {
                    sb.AppendLine($"--- Ghi chú slide {slideIndex} ---");
                    AppendPptxShapeText(slidePart.NotesSlidePart.NotesSlide, sb);
                    if (sb.Length >= PptxMaxTotalChars)
                        break;
                }

                foreach (var chartPart in slidePart.GetPartsOfType<ChartPart>())
                {
                    if (chartPart.ChartSpace != null)
                        AppendPptxShapeText(chartPart.ChartSpace, sb);
                    if (sb.Length >= PptxMaxTotalChars)
                        break;
                }
            }
        }

        // Fallback: thứ tự trong package (ít gặp khi SlideIdList lỗi / rỗng)
        if (slideIndex == 0)
        {
            foreach (var slidePart in presentationPart.SlideParts)
            {
                if (++slideIndex > PptxMaxSlides || sb.Length >= PptxMaxTotalChars)
                    break;
                sb.AppendLine($"--- Slide {slideIndex} ---");
                AppendPptxShapeText(slidePart.Slide, sb);
                if (sb.Length >= PptxMaxTotalChars)
                    break;
                if (slidePart.NotesSlidePart?.NotesSlide != null)
                {
                    sb.AppendLine($"--- Ghi chú slide {slideIndex} ---");
                    AppendPptxShapeText(slidePart.NotesSlidePart.NotesSlide, sb);
                    if (sb.Length >= PptxMaxTotalChars)
                        break;
                }

                foreach (var chartPart in slidePart.GetPartsOfType<ChartPart>())
                {
                    if (chartPart.ChartSpace != null)
                        AppendPptxShapeText(chartPart.ChartSpace, sb);
                    if (sb.Length >= PptxMaxTotalChars)
                        break;
                }
            }
        }

        var raw = sb.Length > PptxMaxTotalChars ? sb.ToString(0, PptxMaxTotalChars) : sb.ToString();
        return NormalizeWhitespace(raw);
    }

    private static string NormalizeWhitespace(string s)
    {
        if (string.IsNullOrWhiteSpace(s)) return "";
        var lines = s.Split('\n', '\r')
            .Select(l => l.Trim())
            .Where(l => l.Length > 0);
        return string.Join("\n", lines);
    }
}
