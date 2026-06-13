import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

async function verifyAdmin() {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }

  const admin = createAdminClient() as any;
  const { data: profile } = await admin
    .from("profiles")
    .select("sethji")
    .eq("id", user.id)
    .single();

  if (!profile?.sethji) {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }

  return { userId: user.id };
}

export async function GET() {
  const auth = await verifyAdmin();
  if ("error" in auth && auth.error) return auth.error;

  const admin = createAdminClient() as any;

  const { data: applications, error } = await admin
    .from("teacher_applications")
    .select(`
      *,
      profile:profiles(username, avatar_url, full_name, university_name)
    `)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, applications });
}

export async function PATCH(request: Request) {
  const auth = await verifyAdmin();
  if ("error" in auth && auth.error) return auth.error;

  const admin = createAdminClient() as any;
  try {
    const body = await request.json();
    const { application_id, action } = body;

    if (!application_id || !["approved", "rejected"].includes(action)) {
      return NextResponse.json({ error: "Application ID and action (approved/rejected) are required." }, { status: 400 });
    }

    // 1. Fetch application details
    const { data: application, error: fetchErr } = await admin
      .from("teacher_applications")
      .select("*")
      .eq("id", application_id)
      .single();

    if (fetchErr || !application) {
      return NextResponse.json({ error: "Application not found." }, { status: 404 });
    }

    if (action === "approved") {
      // 2a. Update application status & profile teacher role status in transaction-like queries
      const { error: appErr } = await admin
        .from("teacher_applications")
        .update({ status: "approved", updated_at: new Date().toISOString() })
        .eq("id", application_id);

      if (appErr) throw appErr;

      const { error: profErr } = await admin
        .from("profiles")
        .update({ is_teacher: true })
        .eq("id", application.user_id);

      if (profErr) throw profErr;

      // 3a. Send success notification
      await admin
        .from("notifications")
        .insert({
          recipient_id: application.user_id,
          title: "Teacher Profile Verified",
          content: "Your request to become a verified teacher has been accepted! You can now access quiz-creation dashboards.",
          is_broadcast: false,
          is_read: false
        });

    } else {
      // 2b. Update application status to rejected
      const { error: appErr } = await admin
        .from("teacher_applications")
        .update({ status: "rejected", updated_at: new Date().toISOString() })
        .eq("id", application_id);

      if (appErr) throw appErr;

      const { error: profErr } = await admin
        .from("profiles")
        .update({ is_teacher: false })
        .eq("id", application.user_id);

      if (profErr) throw profErr;

      // 3b. Send rejection notification
      await admin
        .from("notifications")
        .insert({
          recipient_id: application.user_id,
          title: "Teacher Verification Declined",
          content: "Your teacher verification request has been declined. Please double check your verification ID card image and apply again.",
          is_broadcast: false,
          is_read: false
        });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
