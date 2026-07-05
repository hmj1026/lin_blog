import { draftMode } from "next/headers";
import { redirect } from "next/navigation";

// 退出草稿預覽：清除 draft bypass cookie，回到一般 ISR 快取路徑。
export async function GET() {
  (await draftMode()).disable();
  redirect("/");
}
