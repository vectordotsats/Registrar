import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const { name, email, password, businessName } = await request.json();

  if (!name || !email || !password || !businessName) {
    return NextResponse.json({ error: "All fields are required" }, { status: 400 });
  }

  if (password.length < 6) {
    return NextResponse.json({ error: "Password must be at least 6 characters" }, { status: 400 });
  }

  const adminClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  // 1. Create the business first
  const { data: business, error: bizError } = await adminClient
    .from("businesses")
    .insert({ name: businessName.trim() })
    .select()
    .single();

  if (bizError || !business) {
    return NextResponse.json({ error: bizError?.message || "Failed to create business" }, { status: 400 });
  }

  // 2. Create the auth user with business_id in metadata
  const { data: newUser, error: userError } = await adminClient.auth.admin.createUser({
    email: email.trim().toLowerCase(),
    password,
    email_confirm: true,
    user_metadata: {
      name: name.trim(),
      role: "admin",
      business_id: business.id,
    },
  });

  if (userError) {
    // Clean up the business if user creation fails
    await adminClient.from("businesses").delete().eq("id", business.id);
    return NextResponse.json({ error: userError.message }, { status: 400 });
  }

  // 3. Update the business with the creator's ID
  await adminClient
    .from("businesses")
    .update({ created_by: newUser.user.id })
    .eq("id", business.id);

  return NextResponse.json({ success: true });
}