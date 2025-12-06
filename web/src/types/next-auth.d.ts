declare module "next-auth" {
  interface User {
    roleId?: string;
    roleKey?: string;
    roleName?: string;
  }
  interface Session {
    user?: {
      email?: string | null;
      name?: string | null;
      roleId?: string;
      roleKey?: string;
      roleName?: string;
    };
  }
}
