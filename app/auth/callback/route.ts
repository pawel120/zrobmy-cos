import { NextRequest, NextResponse } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  // Only allow same-origin relative paths as the post-auth redirect. A bare
  // "/foo" is fine; "//evil.com" and "https://evil.com" (protocol-relative or
  // absolute) would send the freshly-authenticated user off-site, so fall back
  // to "/".
  const nextParam = searchParams.get("next") || "/";
  const next = nextParam.startsWith("/") && !nextParam.startsWith("//") ? nextParam : "/";

  const supabase = createClient();

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  } else if (tokenHash && type) {
    // Falls back to the token_hash/type link format Supabase's default email
    // templates use. Unlike the PKCE `code` flow above, this doesn't require
    // the code_verifier from the browser that originated the request, so it
    // still works when the link is opened on a different device/browser than
    // the one that requested it (e.g. request on desktop, click on phone).
    const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`);
}
