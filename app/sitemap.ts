import type { MetadataRoute } from "next";
import { createClient } from "@/lib/supabase/server";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://zrobmycos.app";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const supabase = createClient();

  const [{ data: projects }, { data: profiles }] = await Promise.all([
    supabase.from("projects").select("id, updated_at").eq("is_shadowbanned", false).limit(5000),
    supabase.from("profiles").select("id, updated_at").eq("is_shadowbanned", false).limit(5000),
  ]);

  const staticEntries: MetadataRoute.Sitemap = [
    { url: SITE_URL, changeFrequency: "hourly", priority: 1 },
    { url: `${SITE_URL}/students`, changeFrequency: "daily", priority: 0.6 },
  ];

  const projectEntries: MetadataRoute.Sitemap = (projects ?? []).map((p) => ({
    url: `${SITE_URL}/project/${p.id}`,
    lastModified: p.updated_at,
    changeFrequency: "daily",
    priority: 0.8,
  }));

  const profileEntries: MetadataRoute.Sitemap = (profiles ?? []).map((p) => ({
    url: `${SITE_URL}/user/${p.id}`,
    lastModified: p.updated_at,
    changeFrequency: "weekly",
    priority: 0.5,
  }));

  return [...staticEntries, ...projectEntries, ...profileEntries];
}
