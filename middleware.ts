import { NextResponse, type NextRequest } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";

// ----------------------------------------------------------------------------
// In-memory sliding-window rate limiter for /api/* routes.
// SCOPE: this only guards the app's actual API routes (currently just the
// /api/profiles read). Writes — messages, projects, fires, join_requests —
// go straight from the browser to Supabase and never pass through here, so
// they're throttled in the database instead (throttle_* triggers in
// schema.sql). Don't add per-write limits here expecting them to fire.
// NOTE: per-instance memory. On multi-instance serverless this is best-effort;
// swap for a shared store (Upstash Redis) if the read limit must be exact.
// ----------------------------------------------------------------------------
type Bucket = { count: number; windowStart: number };
const RATE_LIMIT_WINDOW_MS = 60_000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 60; // 60 req/min per identity per route group

const buckets = new Map<string, Bucket>();

// Per-route-group overrides for the /api limiter. Empty today — every stricter
// limit lives in the DB throttle triggers (see comment above).
const ROUTE_OVERRIDES: Record<string, number> = {};

// Periodically sweep stale buckets so the Map doesn't grow unbounded on
// long-lived server instances.
setInterval(() => {
  const now = Date.now();
  for (const [key, bucket] of buckets) {
    if (now - bucket.windowStart > RATE_LIMIT_WINDOW_MS * 5) buckets.delete(key);
  }
}, RATE_LIMIT_WINDOW_MS * 5).unref?.();

const PUBLIC_PATHS = ["/", "/projekty", "/login", "/signup", "/auth/callback", "/forgot-password", "/reset-password"];
const PUBLIC_PREFIXES = ["/project/", "/user/", "/_next", "/favicon", "/api/auth"];

function isPublicPath(pathname: string): boolean {
  if (PUBLIC_PATHS.includes(pathname)) return true;
  return PUBLIC_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

export async function middleware(request: NextRequest) {
  const response = NextResponse.next({ request: { headers: request.headers } });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          response.cookies.set({ name, value, ...options });
        },
        remove(name: string, options: CookieOptions) {
          response.cookies.set({ name, value: "", ...options });
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  // ---- API rate limiting -----------------------------------------------
  if (pathname.startsWith("/api/")) {
    const identity = user?.id ?? request.headers.get("x-forwarded-for") ?? "anonymous";
    const routeGroup = Object.keys(ROUTE_OVERRIDES).find((prefix) => pathname.startsWith(prefix)) ?? "default";
    const max = ROUTE_OVERRIDES[routeGroup] ?? RATE_LIMIT_MAX_REQUESTS;

    const key = `${identity}:${routeGroup}`;
    const now = Date.now();
    const bucket = buckets.get(key);
    let allowed = true;
    let remaining = max;

    if (!bucket || now - bucket.windowStart > RATE_LIMIT_WINDOW_MS) {
      buckets.set(key, { count: 1, windowStart: now });
      remaining = max - 1;
    } else {
      bucket.count += 1;
      remaining = max - bucket.count;
      if (bucket.count > max) allowed = false;
    }

    if (!allowed) {
      return NextResponse.json(
        { error: "Za dużo żądań. Zwolnij trochę." },
        { status: 429, headers: { "Retry-After": "60" } }
      );
    }

    response.headers.set("X-RateLimit-Remaining", String(Math.max(remaining, 0)));

    // API routes still need an authenticated user unless explicitly public —
    // /api/auth (session plumbing) is reachable while logged out. The people
    // directory (/api/profiles) now requires login, matching /students.
    const isPublicApi = pathname.startsWith("/api/auth");
    if (!user && !isPublicApi) {
      return NextResponse.json({ error: "Musisz być zalogowany." }, { status: 401 });
    }

    return response;
  }

  // ---- Recovery/confirmation code safety net --------------------------------
  // Supabase falls back to the Site URL (our root "/") when a requested
  // redirectTo isn't matched by the Redirect URLs allowlist — which happens
  // with query-laden targets like /auth/callback?next=/reset-password. That
  // drops the code on "/?code=..." where nothing exchanges it. Forward any
  // stray code to /auth/callback, which knows how to turn it into a session.
  // Default next to /reset-password (the only email flow in use — email
  // confirmation is off), while respecting an explicit next if one survived.
  if (pathname === "/" && request.nextUrl.searchParams.has("code")) {
    const url = request.nextUrl.clone();
    url.pathname = "/auth/callback";
    if (!url.searchParams.has("next")) url.searchParams.set("next", "/reset-password");
    return NextResponse.redirect(url);
  }

  // ---- Profile self-heal ----------------------------------------------------
  // Signup normally creates the profile row via the handle_new_user trigger,
  // but that trigger is deliberately non-blocking — if it ever fails (or the
  // account predates the schema), the user has auth but no profile and every
  // FK into profiles breaks. ensure_profile() recreates the row idempotently.
  // Cookie-guarded so the extra RPC runs at most once an hour per browser,
  // not on every request.
  if (user && !request.cookies.get("bt_profile_ok")) {
    await supabase.rpc("ensure_profile").then(
      () => {},
      () => {} // best-effort: never block navigation on the heal call
    );
    response.cookies.set({
      name: "bt_profile_ok",
      value: "1",
      maxAge: 3600,
      path: "/",
      sameSite: "lax",
      httpOnly: true,
    });
  }

  // ---- Page auth routing --------------------------------------------------
  if (!user && !isPublicPath(pathname)) {
    const redirectUrl = new URL("/login", request.url);
    redirectUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(redirectUrl);
  }

  if (user && (pathname === "/login" || pathname === "/signup")) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  if (pathname.startsWith("/admin") && user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("is_admin")
      .eq("id", user.id)
      .single();

    if (!profile?.is_admin) {
      return NextResponse.redirect(new URL("/", request.url));
    }
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
