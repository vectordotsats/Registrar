import { createClient } from "@supabase/supabase-js";
import { createClient as createServerClient } from "@/lib/supabase-server";
import { NextResponse } from "next/server";

// PUT — update user profile or reset password
export async function PUT(request: Request) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("users")
    .select("role, business_id")
    .eq("id", user.id)
    .single();

  const body = await request.json();
  const { action } = body;

  // Action: update own profile (name)
  if (action === "update_profile") {
    const { name } = body;
    if (!name?.trim()) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    await supabase
      .from("users")
      .update({ name: name.trim() })
      .eq("id", user.id);

    // Also update auth metadata
    const adminClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );
    await adminClient.auth.admin.updateUserById(user.id, {
      user_metadata: { name: name.trim() },
    });

    return NextResponse.json({ success: true });
  }

  // Action: update business name (admin only)
  if (action === "update_business") {
    if (profile?.role !== "admin") {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    const { businessName } = body;
    if (!businessName?.trim()) {
      return NextResponse.json({ error: "Business name is required" }, { status: 400 });
    }

    const adminClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    await adminClient
      .from("businesses")
      .update({ name: businessName.trim() })
      .eq("id", profile.business_id);

    return NextResponse.json({ success: true });
  }

  // Action: change own password
  if (action === "change_password") {
    const { newPassword } = body;
    if (!newPassword || newPassword.length < 6) {
      return NextResponse.json({ error: "Password must be at least 6 characters" }, { status: 400 });
    }

    const adminClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const { error } = await adminClient.auth.admin.updateUserById(user.id, {
      password: newPassword,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  }

  // Action: reset staff password (admin only)
  if (action === "reset_staff_password") {
    if (profile?.role !== "admin") {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    const { staffUserId, newPassword } = body;
    if (!staffUserId || !newPassword || newPassword.length < 6) {
      return NextResponse.json({ error: "Staff ID and password (min 6 chars) required" }, { status: 400 });
    }

    // Verify the staff belongs to the same business
    const { data: staffProfile } = await supabase
      .from("users")
      .select("business_id")
      .eq("id", staffUserId)
      .single();

    if (staffProfile?.business_id !== profile.business_id) {
      return NextResponse.json({ error: "Cannot reset password for users outside your business" }, { status: 403 });
    }

    const adminClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const { error } = await adminClient.auth.admin.updateUserById(staffUserId, {
      password: newPassword,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  }

  // Action: update staff name (admin only)
  if (action === "update_staff_name") {
    if (profile?.role !== "admin") {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    const { staffUserId, name } = body;
    if (!staffUserId || !name?.trim()) {
      return NextResponse.json({ error: "Staff ID and name required" }, { status: 400 });
    }

    await supabase
      .from("users")
      .update({ name: name.trim() })
      .eq("id", staffUserId);

    const adminClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );
    await adminClient.auth.admin.updateUserById(staffUserId, {
      user_metadata: { name: name.trim() },
    });

    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}