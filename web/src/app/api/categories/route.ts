import { handleApiError, jsonOk, jsonError, requirePermission } from "@/lib/api-utils";
import { categorySchema } from "@/lib/validations/category.schema";
import { postsUseCases } from "@/modules/posts";

export async function GET() {
  const categories = await postsUseCases.listActiveCategories();
  return jsonOk(categories);
}

export async function POST(request: Request) {
  const authError = await requirePermission("categories:manage");
  if (authError) return authError;

  try {
    const raw = await request.json();
    const parsed = categorySchema.safeParse(raw);
    if (!parsed.success) {
      return jsonError(parsed.error.errors[0]?.message ?? "輸入驗證失敗");
    }
    const category = await postsUseCases.createCategory(parsed.data);
    return jsonOk(category, { status: 201 });
  } catch (error: unknown) {
    return handleApiError(error);
  }
}

