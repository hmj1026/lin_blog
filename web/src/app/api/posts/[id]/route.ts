import { handleApiError, jsonOk, jsonError, requirePermission } from "@/lib/api-utils";
import { postApiSchema, parsePostApiInput } from "@/lib/validations/post.schema";
import { postsUseCases } from "@/modules/posts";
import { getSession } from "@/lib/auth";

type Context = { params: Promise<{ id: string }> };

export const dynamic = "force-dynamic";

export async function GET(_req: Request, context: Context) {
  const { id } = await context.params;
  const post = await postsUseCases.getPostById(id);
  if (!post) return jsonOk(null, { status: 404 });
  return jsonOk(post);
}

export async function PUT(request: Request, context: Context) {
  const authError = await requirePermission("posts:write");
  if (authError) return authError;

  try {
    const session = await getSession();
    const { id } = await context.params;
    const raw = await request.json();
    const parsed = postApiSchema.safeParse(raw);
    if (!parsed.success) {
      return jsonError(parsed.error.errors[0]?.message ?? "輸入驗證失敗");
    }

    const updated = await postsUseCases.updatePostWithVersion(id, parsePostApiInput(parsed.data), session?.user?.id ?? null);
    return jsonOk(updated);
  } catch (error: unknown) {
    return handleApiError(error);
  }
}

export async function DELETE(_req: Request, context: Context) {
  const authError = await requirePermission("posts:write");
  if (authError) return authError;

  try {
    const { id } = await context.params;
    await postsUseCases.removePost(id);
    return jsonOk({ ok: true });
  } catch (error: unknown) {
    return handleApiError(error);
  }
}
