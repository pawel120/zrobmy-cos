import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/types/database";

export const dynamic = "force-dynamic";

interface ProfilesQuery {
  q: string | null;          // free-text search over username/display_name/bio
  faculty: string | null;
  skill: string | null;      // matches skills_have OR skills_want
  sort: "hype" | "recent";
  page: number;
  pageSize: number;
}

function parseQuery(searchParams: URLSearchParams): ProfilesQuery {
  const page = Math.max(1, Number(searchParams.get("page") ?? "1") || 1);
  const pageSizeRaw = Number(searchParams.get("pageSize") ?? "20") || 20;
  const pageSize = Math.min(Math.max(pageSizeRaw, 1), 50);
  const sort = searchParams.get("sort") === "recent" ? "recent" : "hype";

  return {
    q: searchParams.get("q")?.trim() || null,
    faculty: searchParams.get("faculty")?.trim() || null,
    skill: searchParams.get("skill")?.trim() || null,
    sort,
    page,
    pageSize,
  };
}

export interface ProfilesResponse {
  profiles: Profile[];
  page: number;
  pageSize: number;
  hasMore: boolean;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const query = parseQuery(searchParams);

  const supabase = createClient();

  let builder = supabase
    .from("profiles")
    .select("*", { count: "exact" })
    .eq("is_shadowbanned", false);

  if (query.q) {
    const escaped = query.q.replace(/[%_]/g, (c) => `\\${c}`);
    builder = builder.or(
      `username.ilike.%${escaped}%,display_name.ilike.%${escaped}%,bio.ilike.%${escaped}%`
    );
  }

  if (query.faculty) {
    builder = builder.eq("faculty", query.faculty);
  }

  if (query.skill) {
    builder = builder.or(
      `skills_have.cs.{${query.skill}},skills_want.cs.{${query.skill}}`
    );
  }

  builder =
    query.sort === "recent"
      ? builder.order("created_at", { ascending: false })
      : builder.order("hype_score", { ascending: false });

  const from = (query.page - 1) * query.pageSize;
  const to = from + query.pageSize - 1;
  builder = builder.range(from, to);

  const { data, error, count } = await builder;

  if (error) {
    return NextResponse.json({ error: "Nie udało się pobrać profili." }, { status: 500 });
  }

  const profiles = (data ?? []) as Profile[];
  const hasMore = count !== null ? from + profiles.length < count : profiles.length === query.pageSize;

  const body: ProfilesResponse = {
    profiles,
    page: query.page,
    pageSize: query.pageSize,
    hasMore,
  };

  return NextResponse.json(body, {
    headers: { "Cache-Control": "private, max-age=15, stale-while-revalidate=30" },
  });
}
