import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: ["/", "/project/", "/user/", "/students"],
      disallow: ["/admin", "/settings", "/messages", "/notifications", "/api/", "/login", "/signup"],
    },
    sitemap: `${process.env.NEXT_PUBLIC_SITE_URL ?? "https://zrobmycos.app"}/sitemap.xml`,
  };
}
