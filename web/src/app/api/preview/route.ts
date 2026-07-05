import { draftMode } from "next/headers";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { sessionHasPermission } from "@/lib/rbac";

// 啟用草稿預覽：僅 posts:write 權限者可用。啟用後 Next 為此瀏覽器設定 draft bypass
// cookie，使該使用者的 /blog/[slug] 請求繞過 ISR 快取、看到草稿；一般訪客不受影響。
export async function GET(request: Request) {
  const slug = new URL(request.url).searchParams.get("slug");
  const session = await getSession();
  if (!session?.user || !sessionHasPermission(session, "posts:write")) {
    redirect("/login");
  }
  (await draftMode()).enable();
  redirect(slug ? `/blog/${encodeURIComponent(slug)}` : "/blog");
}
