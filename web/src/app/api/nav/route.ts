import { jsonOk } from "@/lib/api-utils";
import { postsUseCases } from "@/modules/posts";
import { siteSettingsUseCases } from "@/modules/site-settings";

export const dynamic = "force-dynamic";

export async function GET() {
  const [settings, categories] = await Promise.all([
    siteSettingsUseCases.getDefault(),
    postsUseCases.listActiveCategories({ showInNav: true }),
  ]);

  return jsonOk({
    showBlogLink: settings?.showBlogLink ?? true,
    categories: categories.map((c) => ({ slug: c.slug, name: c.name })),
  });
}
