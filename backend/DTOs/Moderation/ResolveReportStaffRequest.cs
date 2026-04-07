namespace backend.DTOs.Moderation;

public class ResolveReportStaffRequest
{
    /// <summary>resolved | dismissed | pending_admin_lock | lock_approved | lock_rejected</summary>
    public string Status { get; set; } = "resolved";
    public string? ResolutionNote { get; set; }
}
