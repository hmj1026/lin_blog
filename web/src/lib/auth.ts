/* eslint-disable @typescript-eslint/no-explicit-any */
import NextAuth from "next-auth";
import { getServerSession } from "next-auth/next";
import Credentials from "next-auth/providers/credentials";
import { prisma } from "./db";
import bcrypt from "bcryptjs";
import { authEnv } from "@/env.auth";

/**
 * NextAuth 的設定選項
 * 包含 Providers, Callbacks, Pages 等設定
 */
export const authOptions = {
  providers: [
    Credentials({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      authorize: async (credentials) => {
        if (!credentials?.email || !credentials?.password) return null;
        const user = await prisma.user.findUnique({ where: { email: credentials.email }, include: { role: true } });
        if (!user || !user.password) return null;
        if (user.deletedAt) return null;
        if (user.role.deletedAt) return null;
        const match = await bcrypt.compare(credentials.password, user.password);
        if (!match) return null;
        return {
          id: user.id,
          email: user.email,
          name: user.name,
          roleId: user.roleId,
          roleKey: user.role.key,
          roleName: user.role.name,
        };
      },
    }),
  ],
  session: { strategy: "jwt" as const },
  secret: authEnv.NEXTAUTH_SECRET,
  callbacks: {
    async jwt({ token, user }: { token: any; user: any }) {
      if (user) {
        const typed = user as { roleId?: string; roleKey?: string; roleName?: string };
        token.roleId = typed.roleId;
        token.roleKey = typed.roleKey;
        token.roleName = typed.roleName;
      }
      return token;
    },
    async session({ session, token }: { session: any; token: any }) {
      if (session.user && token.sub) {
        // 重新從資料庫查詢用戶的最新角色資訊，確保權限變更能即時生效
        const user = await prisma.user.findUnique({
          where: { id: token.sub },
          include: { role: true },
        });

        // 如果用戶或角色已被刪除，清空 session user
        if (!user || user.deletedAt || !user.role || user.role.deletedAt) {
          session.user = undefined;
          return session;
        }

        // 使用資料庫中的最新角色資訊
        session.user.id = user.id;
        session.user.roleId = user.roleId;
        session.user.roleKey = user.role.key;
        session.user.roleName = user.role.name;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
};

export const { handlers } = (NextAuth as any)(authOptions);

/**
 * 應用程式的 Session 型別定義
 * 擴充了 NextAuth 的 Session 型別，加入自定義欄位
 */
export type AppSession = {
  user?: {
    id?: string;
    email?: string | null;
    name?: string | null;
    roleId?: string;
    roleKey?: string;
    roleName?: string;
  };
} | null;

/**
 * 取得目前的 Server Session
 * 
 * @returns 回傳目前的 Session 物件，若未登入則為 null
 */
export async function getSession(): Promise<AppSession> {
  return getServerSession(authOptions as any);
}
