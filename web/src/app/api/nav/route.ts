import { jsonOk } from "@/lib/api-utils";
import { postsQueries, siteSettingsQueries } from "@/lib/server-queries";

export const dynamic = "force-dynamic";

export async function GET() {
  const [settings, categories] = await Promise.all([
    siteSettingsQueries.getDefault(),
    postsQueries.listActiveCategories({ showInNav: true }),
  ]);

  return jsonOk({
    showBlogLink: settings?.showBlogLink ?? true,
    showAbout: settings?.showAbout ?? false,
    categories: categories.map((c) => ({ slug: c.slug, name: c.name })),
  });
}
