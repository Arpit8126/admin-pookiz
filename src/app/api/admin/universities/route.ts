import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

// ────────────────────── Verify Admin ──────────────────────

async function verifyAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }

  const admin = createAdminClient();
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

// ────────────────────── GET ──────────────────────

export async function GET(request: NextRequest) {
  const auth = await verifyAdmin();
  if ("error" in auth && auth.error) return auth.error;

  const admin = createAdminClient();

  try {
    // 1. Fetch universities
    const { data: universities, error: uError } = await admin
      .from("universities")
      .select("*")
      .order("name", { ascending: true });

    if (uError) throw uError;

    // 2. Fetch applications
    const { data: applications, error: aError } = await admin
      .from("university_applications")
      .select("*")
      .order("created_at", { ascending: false });

    if (aError) throw aError;

    return NextResponse.json({ universities, applications }, { status: 200 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
  }
}

// ────────────────────── POST ──────────────────────

export async function POST(request: NextRequest) {
  const auth = await verifyAdmin();
  if ("error" in auth && auth.error) return auth.error;

  const admin = createAdminClient();

  try {
    const body = await request.json();
    const { action } = body;

    if (action === "add_university") {
      const { name, domain, logo_url } = body;

      if (!name?.trim() || !domain?.trim()) {
        return NextResponse.json({ error: "Name and domain are required" }, { status: 400 });
      }

      // Check if domain exists
      const { data: existingDomain } = await admin
        .from("universities")
        .select("id")
        .eq("domain", domain.trim().toLowerCase())
        .maybeSingle();

      if (existingDomain) {
        return NextResponse.json({ error: "A university with this email domain already exists." }, { status: 400 });
      }

      const { data: university, error } = await admin
        .from("universities")
        .insert({
          name: name.trim(),
          domain: domain.trim().toLowerCase(),
          logo_url: logo_url || "/pookiz-logo.png",
        })
        .select()
        .single();

      if (error) throw error;

      return NextResponse.json({ success: true, university }, { status: 201 });
    } 
    
    if (action === "respond_application") {
      const { id, status } = body;

      if (!id || !["approved", "rejected"].includes(status)) {
        return NextResponse.json({ error: "Invalid parameters" }, { status: 400 });
      }

      // Fetch the application
      const { data: application, error: fetchErr } = await admin
        .from("university_applications")
        .select("*")
        .eq("id", id)
        .single();

      if (fetchErr || !application) {
        return NextResponse.json({ error: "Application not found" }, { status: 404 });
      }

      if (status === "approved") {
        // Create the university
        const { error: uniCreateErr } = await admin
          .from("universities")
          .insert({
            name: application.name,
            domain: application.domain,
            logo_url: "/pookiz-logo.png", // default logo
          });

        if (uniCreateErr && !uniCreateErr.message.includes("duplicate key")) {
          // If it fails for something other than already exists, throw
          throw uniCreateErr;
        }
      }

      // Update status
      const { error: updateErr } = await admin
        .from("university_applications")
        .update({ status })
        .eq("id", id);

      if (updateErr) throw updateErr;

      return NextResponse.json({ success: true, status });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
  }
}

// ────────────────────── DELETE ──────────────────────

export async function DELETE(request: NextRequest) {
  const auth = await verifyAdmin();
  if ("error" in auth && auth.error) return auth.error;

  const admin = createAdminClient();

  try {
    const body = await request.json();
    const { id } = body;

    if (!id) {
      return NextResponse.json({ error: "University ID is required" }, { status: 400 });
    }

    // Fetch the university record
    const { data: university, error: uniErr } = await admin
      .from("universities")
      .select("id, name, domain")
      .eq("id", id)
      .single();

    if (uniErr || !university) {
      return NextResponse.json({ error: "University not found" }, { status: 404 });
    }

    // Fetch all profiles linked to this university (via university_id FK)
    // Skip global admins to avoid accidentally removing admin accounts
    const { data: profiles, error: profErr } = await admin
      .from("profiles")
      .select("id, username, sethji")
      .eq("university_id", id)
      .eq("sethji", false);

    if (profErr) throw profErr;

    // Delete each matched auth user — this cascades to their profiles, messages, friendships, etc.
    const deleteErrors: string[] = [];
    if (profiles && profiles.length > 0) {
      for (const profile of profiles) {
        const { error: deleteErr } = await admin.auth.admin.deleteUser(profile.id);
        if (deleteErr) {
          deleteErrors.push(`Failed to delete user @${profile.username}: ${deleteErr.message}`);
        }
      }
    }

    // Delete the university record
    const { error: delUniErr } = await admin
      .from("universities")
      .delete()
      .eq("id", id);

    if (delUniErr) throw delUniErr;

    return NextResponse.json({
      success: true,
      deletedUsers: profiles?.length ?? 0,
      errors: deleteErrors.length > 0 ? deleteErrors : undefined,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
  }
}
