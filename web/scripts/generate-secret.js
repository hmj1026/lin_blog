#!/usr/bin/env node
/**
 * 產生安全的 Secret Key（類似 Laravel key:generate）
 * 
 * 使用方式：
 *   node scripts/generate-secret.js
 *   node scripts/generate-secret.js --length=64
 *   node scripts/generate-secret.js --env  # 直接輸出 .env 格式
 */

const crypto = require('crypto');

// 解析命令列參數
const args = process.argv.slice(2);
const options = {
  length: 32,
  env: false,
};

args.forEach(arg => {
  if (arg.startsWith('--length=')) {
    options.length = parseInt(arg.split('=')[1], 10);
  }
  if (arg === '--env') {
    options.env = true;
  }
});

// 產生隨機 secret
const secret = crypto.randomBytes(options.length).toString('base64');

if (options.env) {
  console.log(`NEXTAUTH_SECRET="${secret}"`);
} else {
  console.log('\n✨ Generated Secret Key:\n');
  console.log(`   ${secret}`);
  console.log('\n📋 Copy to .env file:\n');
  console.log(`   NEXTAUTH_SECRET="${secret}"`);
  console.log('');
}
