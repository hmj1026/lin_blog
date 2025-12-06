import { jsonOk } from "@/lib/api-utils";
import { analyticsUseCases } from "@/modules/analytics";
import { postsUseCases } from "@/modules/posts";

export const dynamic = "force-dynamic";

function getIp(headers: Headers) {
  const xff = headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0]!.trim();
  const realIp = headers.get("x-real-ip");
  if (realIp) return realIp.trim();
  return "unknown";
}

type Body = { slug?: string; source?: "frontend" | "preview" };

export async function POST(request: Request) {
  let body: Body = {};
  try {
    body = (await request.json()) as Body;
  } catch {
    // ignore
  }

  const slug = body.slug?.trim();
  if (!slug) return jsonOk({ ignored: true });
  if (body.source === "preview") return jsonOk({ ignored: true });

  const post = await postsUseCases.getPostBySlug(slug);
  if (!post || post.deletedAt || post.status !== "PUBLISHED") return jsonOk({ ignored: true });

  const ip = getIp(request.headers);
  const ua = request.headers.get("user-agent") ?? "";
  const referer = request.headers.get("referer") ?? undefined;
  const acceptLanguage = request.headers.get("accept-language") ?? undefined;

  const result = await analyticsUseCases.recordPostView({
    post: { id: post.id, slug: post.slug, deletedAt: post.deletedAt, status: post.status },
    source: body.source,
    ip,
    userAgent: ua,
    referer,
    acceptLanguage,
  });

  if ("ignored" in result) return jsonOk({ ignored: true });
  return jsonOk({ ok: true });
}
