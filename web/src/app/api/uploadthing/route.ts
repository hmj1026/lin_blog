import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json({ message: "尚未連接上傳供應商，請配置 UPLOADTHING_TOKEN 後實作" }, { status: 501 });
}
