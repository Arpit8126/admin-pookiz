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

// ────────────────────── POST ──────────────────────

export async function POST(request: NextRequest) {
  const auth = await verifyAdmin();
  if ("error" in auth && auth.error) return auth.error;

  const admin = createAdminClient();

  try {
    const body = await request.json();
    const { email, username, password } = body as {
      email?: string;
      username?: string;
      password?: string;
    };

    if (!email || !username || !password) {
      return NextResponse.json({ error: "All fields (email, username, password) are required" }, { status: 400 });
    }

    const trimmedEmail = email.trim().toLowerCase();
    const trimmedUsername = username.trim().toLowerCase();

    // 1. Validate email domain exists in universities table
    const emailDomain = trimmedEmail.split("@")[1];
    if (!emailDomain) {
      return NextResponse.json({ error: "Invalid email format" }, { status: 400 });
    }

    const { data: matchedUniversity, error: uniErr } = await admin
      .from("universities")
      .select("id")
      .eq("domain", emailDomain)
      .maybeSingle();

    if (uniErr || !matchedUniversity) {
      return NextResponse.json({ 
        error: `Domain "@${emailDomain}" is not a registered university. You can only create test IDs for active university domains.` 
      }, { status: 400 });
    }

    // 2. Validate username length and character constraint
    if (trimmedUsername.length < 3) {
      return NextResponse.json({ error: "Username must be at least 3 characters long" }, { status: 400 });
    }

    // 3. Real-time check if username is unique in profiles
    const { data: existingProfile, error: profileErr } = await admin
      .from("profiles")
      .select("id")
      .eq("username", trimmedUsername)
      .maybeSingle();

    if (profileErr) throw profileErr;
    if (existingProfile) {
      return NextResponse.json({ error: "Username is already taken" }, { status: 400 });
    }

    // 4. Create testing user using Admin API (which bypasses confirmation email)
    const { data: authUser, error: authCreateErr } = await admin.auth.admin.createUser({
      email: trimmedEmail,
      password: password,
      email_confirm: true, // Mark email as verified immediately
      user_metadata: {
        username: trimmedUsername,
        is_testing_user: true, // Metadata parsed by our DB trigger
      },
    });

    if (authCreateErr) {
      return NextResponse.json({ error: authCreateErr.message }, { status: 400 });
    }

    return NextResponse.json({ success: true, user: authUser.user }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
  }
}
