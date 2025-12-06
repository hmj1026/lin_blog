import { PrismaClient } from "@prisma/client";

async function main() {
  const prisma = new PrismaClient();
  const users = await prisma.user.findMany({
    select: { email: true, role: true, password: true },
  });
  console.log(users.map((u) => ({ ...u, pw_len: u.password.length })));
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
