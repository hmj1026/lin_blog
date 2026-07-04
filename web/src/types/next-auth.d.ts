import type { DefaultJWT } from "next-auth/jwt";

declare module "next-auth" {
  interface User {
    roleId?: string;
    roleKey?: string;
    roleName?: string;
    permissions?: string[];
  }
  interface Session {
    user?: {
      email?: string | null;
      name?: string | null;
      roleId?: string;
      roleKey?: string;
      roleName?: string;
      permissions?: string[];
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT extends DefaultJWT {
    roleId?: string;
    roleKey?: string;
    roleName?: string;
    permissions?: string[];
    permissionsVersion?: number;
    invalid?: boolean;
  }
}
