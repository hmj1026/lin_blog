/**
 * Storage 遷移腳本
 * 
 * 將本地儲存的檔案遷移到雲端 Storage（R2/S3/GCS）
 * 
 * 使用方式:
 *   node scripts/migrate-storage.js --dry-run    # 預覽模式
 *   node scripts/migrate-storage.js              # 執行遷移
 * 
 * Docker 環境:
 *   docker exec blog_app node scripts/migrate-storage.js --dry-run
 *   docker exec blog_app node scripts/migrate-storage.js
 * 
 * 環境變數:
 *   需要設定 STORAGE_PROVIDER, STORAGE_BUCKET, STORAGE_ENDPOINT 等
 *   以及 STORAGE_ACCESS_KEY_ID, STORAGE_SECRET_ACCESS_KEY
 */

const { PrismaClient } = require("@prisma/client");
const fs = require("fs");
const path = require("path");
const { S3Client, PutObjectCommand, HeadObjectCommand } = require("@aws-sdk/client-s3");

const prisma = new PrismaClient();

// 解析命令列參數
const args = process.argv.slice(2);
const isDryRun = args.includes("--dry-run");
const isForce = args.includes("--force");

// 本地 storage 根目錄
const LOCAL_STORAGE_ROOT = process.env.STORAGE_LOCAL_ROOT_DIR || path.join(process.cwd(), "storage");

/**
 * 初始化 S3/R2 Client
 */
function createS3Client() {
  const { 
    STORAGE_ENDPOINT, 
    STORAGE_ACCESS_KEY_ID, 
    STORAGE_SECRET_ACCESS_KEY,
    STORAGE_REGION 
  } = process.env;

  if (!STORAGE_ACCESS_KEY_ID || !STORAGE_SECRET_ACCESS_KEY) {
    throw new Error("缺少 STORAGE_ACCESS_KEY_ID 或 STORAGE_SECRET_ACCESS_KEY");
  }

  const config = {
    region: STORAGE_REGION || "auto",
    credentials: {
      accessKeyId: STORAGE_ACCESS_KEY_ID,
      secretAccessKey: STORAGE_SECRET_ACCESS_KEY,
    },
  };

  if (STORAGE_ENDPOINT) {
    config.endpoint = STORAGE_ENDPOINT;
    config.forcePathStyle = true;
  }

  return new S3Client(config);
}

/**
 * 檢查物件是否已存在於 R2
 */
async function objectExists(s3Client, bucket, key) {
  try {
    await s3Client.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
    return true;
  } catch (error) {
    if (error.name === "NotFound" || error.$metadata?.httpStatusCode === 404) {
      return false;
    }
    throw error;
  }
}

/**
 * 上傳檔案到 R2
 */
async function uploadToR2(s3Client, bucket, key, filePath, mimeType) {
  const fileContent = fs.readFileSync(filePath);
  
  await s3Client.send(new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    Body: fileContent,
    ContentType: mimeType,
  }));

  return fileContent.length;
}

/**
 * 主程式
 */
async function main() {
  console.log("🚀 Storage 遷移腳本");
  console.log("==================");
  
  if (isDryRun) {
    console.log("📋 預覽模式 (--dry-run)，不會實際遷移\n");
  }

  const targetProvider = process.env.STORAGE_PROVIDER;
  const bucket = process.env.STORAGE_BUCKET;

  if (!targetProvider || targetProvider === "local" || targetProvider === "memory") {
    console.error("❌ 目標 STORAGE_PROVIDER 必須是 s3, r2, 或 gcs");
    console.log(`   目前設定: ${targetProvider || "(未設定)"}`);
    process.exit(1);
  }

  if (!bucket) {
    console.error("❌ 缺少 STORAGE_BUCKET 設定");
    process.exit(1);
  }

  console.log(`📦 目標: ${targetProvider.toUpperCase()} (${bucket})\n`);

  // 查詢所有 Upload 記錄
  const uploads = await prisma.upload.findMany({
    where: { deletedAt: null },
    orderBy: { createdAt: "asc" },
  });

  console.log(`📁 找到 ${uploads.length} 個檔案記錄\n`);

  if (uploads.length === 0) {
    console.log("✅ 沒有需要遷移的檔案");
    return;
  }

  const s3Client = createS3Client();
  
  let successCount = 0;
  let skipCount = 0;
  let errorCount = 0;

  for (const upload of uploads) {
    const localPath = path.join(LOCAL_STORAGE_ROOT, upload.storageKey);
    const displayName = upload.originalName || upload.storageKey;

    process.stdout.write(`  ${displayName} ... `);

    // 檢查本地檔案是否存在
    if (!fs.existsSync(localPath)) {
      // 可能已經在雲端了
      try {
        const exists = await objectExists(s3Client, bucket, upload.storageKey);
        if (exists) {
          console.log("⏭️  已在雲端");
          skipCount++;
          continue;
        }
      } catch {
        // 忽略檢查錯誤
      }
      console.log("⚠️  本地檔案不存在");
      errorCount++;
      continue;
    }

    // 檢查是否已存在於雲端
    if (!isForce) {
      try {
        const exists = await objectExists(s3Client, bucket, upload.storageKey);
        if (exists) {
          console.log("⏭️  已存在");
          skipCount++;
          continue;
        }
      } catch {
        // 忽略檢查錯誤，繼續上傳
      }
    }

    if (isDryRun) {
      const stats = fs.statSync(localPath);
      console.log(`📤 將上傳 (${(stats.size / 1024).toFixed(1)} KB)`);
      successCount++;
      continue;
    }

    // 實際上傳
    try {
      const size = await uploadToR2(s3Client, bucket, upload.storageKey, localPath, upload.mimeType);
      console.log(`✅ 已上傳 (${(size / 1024).toFixed(1)} KB)`);
      successCount++;
    } catch (error) {
      console.log(`❌ 失敗: ${error.message}`);
      errorCount++;
    }
  }

  console.log("\n==================");
  console.log(`📊 結果統計:`);
  console.log(`   ✅ 成功: ${successCount}`);
  console.log(`   ⏭️  跳過: ${skipCount}`);
  console.log(`   ❌ 失敗: ${errorCount}`);

  if (isDryRun && successCount > 0) {
    console.log("\n💡 提示: 移除 --dry-run 參數以執行實際遷移");
  }
}

main()
  .catch((e) => {
    console.error("❌ 遷移失敗:", e.message);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
