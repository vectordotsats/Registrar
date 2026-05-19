import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

// POST — look up the internal email for a username
export async function POST(request: Request) {
  const { username } = await request.json();

  if (!username) {
    return NextResponse.json({ error: "Username is required" }, { status: 400 });
  }

  const adminClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  // Find the user by username
  const { data: userRecord } = await adminClient
    .from("users")
    .select("email")
    .eq("username", username.trim().toLowerCase())
    .limit(1)
    .single();

  if (!userRecord) {
    return NextResponse.json({ error: "Username not found" }, { status: 404 });
  }

  // Return the internal email so the client can sign in
  return NextResponse.json({ email: userRecord.email });
}