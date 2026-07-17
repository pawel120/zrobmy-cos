import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

// Landing-page gate: anonymous visitors apply with an artifact URL. The
// applications table has no anon RLS policy on purpose — every insert goes
// through this handler so we can validate and keep the table write-locked.
export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Nieprawidłowe dane." }, { status: 400 });
  }

  const { artifactUrl, pitch, email, website } = (body ?? {}) as Record<string, unknown>;

  // Honeypot — real users never fill this hidden field.
  if (typeof website === "string" && website.length > 0) {
    return NextResponse.json({ ok: true });
  }

  if (typeof artifactUrl !== "string" || typeof pitch !== "string" || typeof email !== "string") {
    return NextResponse.json({ error: "Nieprawidłowe dane." }, { status: 400 });
  }

  const trimmedUrl = artifactUrl.trim();
  const trimmedPitch = pitch.trim();
  const trimmedEmail = email.trim().toLowerCase();

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(trimmedUrl.match(/^https?:\/\//) ? trimmedUrl : `https://${trimmedUrl}`);
  } catch {
    return NextResponse.json(
      { error: "To nie wygląda na link. Wklej URL do czegoś, co działa." },
      { status: 400 }
    );
  }
  if (!parsedUrl.hostname.includes(".")) {
    return NextResponse.json(
      { error: "To nie wygląda na link. Wklej URL do czegoś, co działa." },
      { status: 400 }
    );
  }

  if (trimmedPitch.length < 3 || trimmedPitch.length > 280) {
    return NextResponse.json(
      { error: "Opisz w jednym zdaniu, co to robi (max 280 znaków)." },
      { status: 400 }
    );
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail) || trimmedEmail.length > 254) {
    return NextResponse.json({ error: "Podaj poprawny e-mail." }, { status: 400 });
  }

  const supabase = createAdminClient();

  const { data: existing } = await supabase
    .from("applications")
    .select("id")
    .eq("email", trimmedEmail)
    .eq("status", "pending")
    .limit(1)
    .maybeSingle();

  if (existing) {
    return NextResponse.json(
      { error: "Twoja aplikacja już czeka na review. Odezwiemy się." },
      { status: 409 }
    );
  }

  const { error } = await supabase.from("applications").insert({
    artifact_url: parsedUrl.toString(),
    pitch: trimmedPitch,
    email: trimmedEmail,
  });

  if (error) {
    return NextResponse.json(
      { error: "Nie udało się wysłać aplikacji. Spróbuj ponownie." },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}
