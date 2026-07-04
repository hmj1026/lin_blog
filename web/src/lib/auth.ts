/* eslint-disable @typescript-eslint/no-explicit-any */
import NextAuth from "next-auth";
import { getServerSession } from "next-auth/next";
import Credentials from "next-auth/providers/credentials";
import { prisma } from "./db";
import bcrypt from "bcryptjs";
import { authEnv } from "@/env.auth";
import { securityAdminUseCases } from "@/modules/security-admin";

// 安全的 cache 包裝，當 React.cache 不可用時（如測試環境）提供 fallback
const safeCache = <T extends (...args: any[]) => any>(fn: T): T => {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { cache } = require("react");
    if (typeof cache === "function") {
      return cache(fn);
    }
  } catch {
    // React.cache 不可用，返回原函數
  }
  return fn;
};

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
        // 先讀全域權限版本，再讀使用者權限：確保 token 標記的版本 <= 權限快照對應的版本。
        // 若登入當下發生權限異動，最壞情況只是下一請求多刷新一次，
        // 不會出現「token 帶舊權限卻標記新版本而永不刷新」的時間差窗口。
        const permissionsVersion = await securityAdminUseCases.getPermissionsVersion();
        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
          include: { role: { include: { perms: true } } },
        });
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
          permissions: user.role.perms.map((p) => p.permissionKey),
          permissionsVersion,
        };
      },
    }),
  ],
  session: { strategy: "jwt" as const },
  secret: authEnv.NEXTAUTH_SECRET,
  callbacks: {
    async jwt({ token, user }: { token: any; user: any }) {
      if (user) {
        const typed = user as { roleId?: string; roleKey?: string; roleName?: string; permissions?: string[]; permissionsVersion?: number };
        token.roleId = typed.roleId;
        token.roleKey = typed.roleKey;
        token.roleName = typed.roleName;
        token.permissions = typed.permissions ?? [];
        // 使用 authorize 於「讀權限之前」擷取的版本；缺漏時才退回即時查詢。
        token.permissionsVersion = typed.permissionsVersion ?? (await securityAdminUseCases.getPermissionsVersion());
        token.invalid = false;
      } else {
        // 沒有 sub 的 token（例如舊版/異常 token）無法查詢使用者，直接標記失效而非讓 DB 查詢拋錯
        if (!token.sub) {
          token.invalid = true;
          token.permissions = [];
          return token;
        }
        // 版本比對：僅在全域權限版本變動時才重新查詢資料庫，避免每個請求都打 DB
        const current = await securityAdminUseCases.getPermissionsVersion();
        if (token.permissionsVersion !== current) {
          const snap = await securityAdminUseCases.getUserAuthSnapshot(token.sub as string);
          if (!snap) {
            token.invalid = true;
            token.permissions = [];
          } else {
            token.roleId = snap.roleId;
            token.roleKey = snap.roleKey;
            token.roleName = snap.roleName;
            token.permissions = snap.permissionKeys;
            token.invalid = false;
          }
          token.permissionsVersion = current;
        }
      }
      return token;
    },
    async session({ session, token }: { session: any; token: any }) {
      if (token.invalid || !token.sub) {
        session.user = undefined;
        return session;
      }
      if (session.user) {
        session.user.id = token.sub;
        session.user.roleId = token.roleId;
        session.user.roleKey = token.roleKey;
        session.user.roleName = token.roleName;
        session.user.permissions = token.permissions ?? [];
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
    permissions?: string[];
  };
} | null;

/**
 * 取得目前的 Server Session
 * 
 * 使用 React.cache() 包裝實現請求級去重，同一請求中多次調用只會執行一次實際查詢
 * 
 * @returns 回傳目前的 Session 物件，若未登入則為 null
 */
export const getSession = safeCache(async (): Promise<AppSession> => {
  return getServerSession(authOptions as any);
});
