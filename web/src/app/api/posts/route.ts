import { jsonOk, jsonError, handleApiError, requirePermission } from "@/lib/api-utils";
import { postApiSchema, parsePostApiInput } from "@/lib/validations/post.schema";
import { postsUseCases } from "@/modules/posts";

export async function GET() {
  const posts = await postsUseCases.listPublishedPosts();
  return jsonOk(posts);
}

export async function POST(request: Request) {
  const authError = await requirePermission("posts:write");
  if (authError) return authError;

  try {
    const raw = await request.json();
    const parsed = postApiSchema.safeParse(raw);
    if (!parsed.success) {
      return jsonError(parsed.error.errors[0]?.message ?? "輸入驗證失敗");
    }
    const post = await postsUseCases.createPost(parsePostApiInput(parsed.data));
    return jsonOk(post, { status: 201 });
  } catch (error: unknown) {
    return handleApiError(error);
  }
}

