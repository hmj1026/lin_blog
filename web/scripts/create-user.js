/**
 * 安全的使用者建立 CLI
 * 密碼從環境變數 ADMIN_PASSWORD 讀取，不接受命令列參數
 * 
 * 使用方式:
 * ADMIN_PASSWORD=your_password docker exec blog_app \
 *   node scripts/create-user.js --email=admin@example.com --name="Admin" --role=ADMIN
 */

const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

function parseArgs() {
  const args = {};
  process.argv.slice(2).forEach((arg) => {
    const match = arg.match(/^--(\w+)=(.+)$/);
    if (match) {
      args[match[1]] = match[2];
    }
  });
  return args;
}

function validateEmail(email) {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
}

async function main() {
  const args = parseArgs();
  const { email, name, role } = args;

  // 驗證必要參數
  if (!email) {
    console.error("❌ 錯誤: 請提供 --email 參數");
    console.log("\n使用方式:");
    console.log("ADMIN_PASSWORD=密碼 node scripts/create-user.js --email=user@example.com --name=\"使用者名稱\" --role=ADMIN");
    console.log("\n可用角色: ADMIN, EDITOR, READER");
    process.exit(1);
  }

  if (!validateEmail(email)) {
    console.error("❌ 錯誤: Email 格式不正確");
    process.exit(1);
  }

  // 從環境變數讀取密碼（安全）
  const password = process.env.ADMIN_PASSWORD;
  if (!password) {
    console.error("❌ 錯誤: 請設定環境變數 ADMIN_PASSWORD");
    console.log("\n使用方式:");
    console.log("ADMIN_PASSWORD=密碼 node scripts/create-user.js --email=user@example.com");
    process.exit(1);
  }

  if (password.length < 6) {
    console.error("❌ 錯誤: 密碼長度至少 6 個字元");
    process.exit(1);
  }

  // 檢查角色是否存在
  const roleKey = role || "ADMIN";
  const roleRecord = await prisma.role.findUnique({
    where: { key: roleKey },
  });

  if (!roleRecord) {
    console.error(`❌ 錯誤: 角色 "${roleKey}" 不存在`);
    const roles = await prisma.role.findMany({ where: { deletedAt: null } });
    console.log("可用角色:", roles.map((r) => r.key).join(", "));
    process.exit(1);
  }

  // 檢查 email 是否已存在
  const existingUser = await prisma.user.findUnique({
    where: { email },
  });

  if (existingUser) {
    console.error(`❌ 錯誤: Email "${email}" 已被使用`);
    process.exit(1);
  }

  // 建立使用者
  const hashedPassword = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
    data: {
      email,
      name: name || null,
      password: hashedPassword,
      roleId: roleRecord.id,
    },
  });

  console.log("✅ 使用者建立成功！");
  console.log(`   ID: ${user.id}`);
  console.log(`   Email: ${user.email}`);
  console.log(`   Name: ${user.name || "(未設定)"}`);
  console.log(`   Role: ${roleKey}`);
}

main()
  .catch((e) => {
    console.error("❌ 建立失敗:", e.message);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
