import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { Resend } from "resend";

// POST — send OTP or verify OTP
export async function POST(request: Request) {
  const body = await request.json();
  const { action } = body;

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  // ---- SEND OTP ----
  if (action === "send") {
    const { email } = body;
    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    // Generate 6-digit code
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Save to database
    await supabase.from("otp_codes").insert({
      email: email.toLowerCase().trim(),
      code,
      expires_at: expiresAt.toISOString(),
    });

    // Send email via Resend
    if (!process.env.RESEND_API_KEY) {
      return NextResponse.json(
        { error: "Email service is not configured. Add RESEND_API_KEY to .env.local." },
        { status: 500 },
      );
    }
    const resend = new Resend(process.env.RESEND_API_KEY);

    try {
      const { error: sendError } = await resend.emails.send({
        from: "Registrar <onboarding@resend.dev>",
        to: email.toLowerCase().trim(),
        subject: "Your verification code",
        html: `
          <div style="font-family: sans-serif; max-width: 400px; margin: 0 auto; padding: 40px 20px;">
            <div style="text-align: center; margin-bottom: 30px;">
              <div style="width: 50px; height: 50px; background: #6C5CE7; border-radius: 14px; display: inline-flex; align-items: center; justify-content: center;">
                <span style="color: white; font-size: 22px; font-weight: bold;">R</span>
              </div>
            </div>
            <h2 style="text-align: center; color: #1a1a1a; margin-bottom: 10px;">Verify your email</h2>
            <p style="text-align: center; color: #6b7280; font-size: 14px; margin-bottom: 30px;">Enter this code to complete your registration</p>
            <div style="background: #f3f4f6; border-radius: 12px; padding: 20px; text-align: center; margin-bottom: 30px;">
              <span style="font-size: 32px; font-weight: 700; letter-spacing: 8px; color: #6C5CE7;">${code}</span>
            </div>
            <p style="text-align: center; color: #9ca3af; font-size: 12px;">This code expires in 10 minutes</p>
            <p style="text-align: center; color: #9ca3af; font-size: 12px; margin-top: 20px;">If you didn't request this, ignore this email.</p>
          </div>
        `,
      });

      if (sendError) {
        console.error("Resend error:", sendError);
        return NextResponse.json(
          { error: sendError.message || "Failed to send verification email" },
          { status: 500 },
        );
      }

      return NextResponse.json({ success: true });
    } catch (err) {
      console.error("Email send error:", err);
      return NextResponse.json({ error: "Failed to send verification email" }, { status: 500 });
    }
  }

  // ---- VERIFY OTP ----
  if (action === "verify") {
    const { email, code } = body;
    if (!email || !code) {
      return NextResponse.json({ error: "Email and code are required" }, { status: 400 });
    }

    // Find the most recent unused OTP for this email
    const { data: otpRecord } = await supabase
      .from("otp_codes")
      .select("*")
      .eq("email", email.toLowerCase().trim())
      .eq("code", code)
      .eq("used", false)
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (!otpRecord) {
      return NextResponse.json({ error: "Invalid or expired code" }, { status: 400 });
    }

    // Mark as used
    await supabase
      .from("otp_codes")
      .update({ used: true })
      .eq("id", otpRecord.id);

    return NextResponse.json({ success: true, verified: true });
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}