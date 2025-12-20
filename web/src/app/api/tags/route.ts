import { handleApiError, jsonOk, jsonError, requirePermission } from "@/lib/api-utils";
import { tagSchema } from "@/lib/validations/tag.schema";
import { postsUseCases } from "@/modules/posts";

export async function GET() {
  const tags = await postsUseCases.listActiveTags();
  return jsonOk(tags);
}

export async function POST(request: Request) {
  const authError = await requirePermission("tags:manage");
  if (authError) return authError;

  try {
    const raw = await request.json();
    const parsed = tagSchema.safeParse(raw);
    if (!parsed.success) {
      return jsonError(parsed.error.errors[0]?.message ?? "輸入驗證失敗");
    }
    const tag = await postsUseCases.createTag(parsed.data);
    return jsonOk(tag, { status: 201 });
  } catch (error: unknown) {
    return handleApiError(error);
  }
}

