import { createClient } from "@supabase/supabase-js";
import { createClient as createServerClient } from "@/lib/supabase-server";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
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

  if (profile?.role !== "admin") {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }

  const businessId = profile?.business_id;
  const { username, password } = await request.json();
  const name = username;

  if (!username || !password) {
    return NextResponse.json({ error: "Username and password are required" }, { status: 400 });
  }

  if (password.length < 6) {
    return NextResponse.json({ error: "Password must be at least 6 characters" }, { status: 400 });
  }

  if (username.length < 3) {
    return NextResponse.json({ error: "Username must be at least 3 characters" }, { status: 400 });
  }

  // Check if username already exists
  const { data: existing } = await supabase
    .from("users")
    .select("id")
    .eq("username", username.trim().toLowerCase())
    .limit(1);

  if (existing && existing.length > 0) {
    return NextResponse.json({ error: "Username already taken" }, { status: 400 });
  }

  // Generate internal email for Supabase auth (user never sees this)
  const internalEmail = `${username.trim().toLowerCase()}.${businessId}@registrar.internal`;

  const adminClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
    email: internalEmail,
    password,
    email_confirm: true,
    user_metadata: { name: name.trim(), role: "staff", business_id: businessId, username: username.trim().toLowerCase() },
  });

  if (createError) {
    return NextResponse.json({ error: createError.message }, { status: 400 });
  }

  // Set the username AND role on the users table.
  // Don't rely on the DB trigger for role — write it explicitly so staff
  // can never be mistaken for an admin.
  await adminClient
    .from("users")
    .update({ username: username.trim().toLowerCase(), role: "staff" })
    .eq("id", newUser.user.id);

  // Add to staff_members for the sales dropdown
  await supabase.from("staff_members").insert({ name: name.trim(), business_id: businessId });

  return NextResponse.json({ success: true, user_id: newUser.user.id });
}

export async function DELETE(request: Request) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }

  const { staff_id, auth_user_id } = await request.json();

  if (staff_id) {
    await supabase.from("staff_members").delete().eq("id", staff_id);
  }

  if (auth_user_id) {
    const adminClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );
    await adminClient.auth.admin.deleteUser(auth_user_id);
  }

  return NextResponse.json({ success: true });
}