import "server-only";
import { z } from "zod";

const envSchema = z.object({
  // 環境識別
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  APP_ENV: z.enum(["local", "staging", "production"]).default("local"),
  
  // 資料庫與認證
  DATABASE_URL: z.string().url(),
  NEXTAUTH_SECRET: z.string().min(1),
  
  // 外部服務
  FIGMA_TOKEN: z.string().optional(),
  UPLOADTHING_TOKEN: z.string().optional(),

  // Storage
  STORAGE_PROVIDER: z.enum(["local", "memory", "s3", "r2", "gcs"]).default("local"),
  STORAGE_LOCAL_ROOT_DIR: z.string().optional(),
  STORAGE_BUCKET: z.string().optional(),
  STORAGE_REGION: z.string().optional(),
  STORAGE_ENDPOINT: z.string().optional(),
  STORAGE_ACCESS_KEY_ID: z.string().optional(),
  STORAGE_SECRET_ACCESS_KEY: z.string().optional(),
  GCS_PROJECT_ID: z.string().optional(),
  GCS_CLIENT_EMAIL: z.string().optional(),
  GCS_PRIVATE_KEY: z.string().optional(),
  /** 單檔上傳大小上限（MB），預設 10MB */
  UPLOAD_MAX_FILE_SIZE_MB: z.coerce.number().positive().default(10),
  /** 是否啟用圖片上傳壓縮（預設 true） */
  UPLOAD_IMAGE_COMPRESSION: z.coerce.boolean().default(true),
  /** 圖片最大寬度（預設 1920） */
  UPLOAD_IMAGE_MAX_WIDTH: z.coerce.number().positive().default(1920),
  /** 圖片壓縮品質 0-100（預設 85） */
  UPLOAD_IMAGE_QUALITY: z.coerce.number().min(1).max(100).default(85),
  
  // 前端可見變數
  NEXT_PUBLIC_APP_ENV: z.enum(["local", "staging", "production"]).default("local"),
  NEXT_PUBLIC_SITE_URL: z.string().url().optional(),
  NEXT_PUBLIC_UPLOAD_BASE_URL: z.string().url().optional(),

  // Analytics
  NEXT_PUBLIC_GA_ID: z.string().optional(),
  NEXT_PUBLIC_GTM_ID: z.string().optional(),
  NEXT_PUBLIC_FB_PIXEL_ID: z.string().optional(),
});

export const env = envSchema.parse({
  NODE_ENV: process.env.NODE_ENV,
  APP_ENV: process.env.APP_ENV,
  DATABASE_URL: process.env.DATABASE_URL,
  NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET,
  FIGMA_TOKEN: process.env.FIGMA_TOKEN,
  UPLOADTHING_TOKEN: process.env.UPLOADTHING_TOKEN,
  // Storage
  STORAGE_PROVIDER: process.env.STORAGE_PROVIDER,
  STORAGE_LOCAL_ROOT_DIR: process.env.STORAGE_LOCAL_ROOT_DIR,
  STORAGE_BUCKET: process.env.STORAGE_BUCKET,
  STORAGE_REGION: process.env.STORAGE_REGION,
  STORAGE_ENDPOINT: process.env.STORAGE_ENDPOINT,
  STORAGE_ACCESS_KEY_ID: process.env.STORAGE_ACCESS_KEY_ID,
  STORAGE_SECRET_ACCESS_KEY: process.env.STORAGE_SECRET_ACCESS_KEY,
  GCS_PROJECT_ID: process.env.GCS_PROJECT_ID,
  GCS_CLIENT_EMAIL: process.env.GCS_CLIENT_EMAIL,
  GCS_PRIVATE_KEY: process.env.GCS_PRIVATE_KEY,
  UPLOAD_MAX_FILE_SIZE_MB: process.env.UPLOAD_MAX_FILE_SIZE_MB,
  UPLOAD_IMAGE_COMPRESSION: process.env.UPLOAD_IMAGE_COMPRESSION,
  UPLOAD_IMAGE_MAX_WIDTH: process.env.UPLOAD_IMAGE_MAX_WIDTH,
  UPLOAD_IMAGE_QUALITY: process.env.UPLOAD_IMAGE_QUALITY,
  // Frontend
  NEXT_PUBLIC_APP_ENV: process.env.NEXT_PUBLIC_APP_ENV,
  NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
  NEXT_PUBLIC_UPLOAD_BASE_URL: process.env.NEXT_PUBLIC_UPLOAD_BASE_URL,
  NEXT_PUBLIC_GA_ID: process.env.NEXT_PUBLIC_GA_ID,
  NEXT_PUBLIC_GTM_ID: process.env.NEXT_PUBLIC_GTM_ID,
  NEXT_PUBLIC_FB_PIXEL_ID: process.env.NEXT_PUBLIC_FB_PIXEL_ID,
});

// 環境判斷 helpers
export const isDev = env.APP_ENV !== "production";
export const isProd = env.APP_ENV === "production";
export const isLocal = env.APP_ENV === "local";
export const isTest = env.NODE_ENV === "test";
