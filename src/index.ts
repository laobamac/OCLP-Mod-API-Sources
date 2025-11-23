// src/index.ts
import { Hono } from 'hono';
import { createHash } from 'node:crypto';

const app = new Hono();

// ============ 配置区（和 PHP 一模一样）============
const SECRET_TOKEN = 'oclpmod';
const DOWNLOAD_BASE_URL = 'https://down.chengdu.simplehac.cn/d/SHOSS/macOS/DMG/';

// 读取同目录下的 aeskey.txt（EdgeOne 支持相对路径读取文件）
const AES_KEY = await Deno.readTextFile(`${Deno.cwd()}/DMG/data/aeskey.txt`).then(t => t.trim());

// 你的路径：/dmgDownload
app.get('/dmgDownload', async (c) => {
  const url = new URL(c.req.url);
  const params = url.searchParams;

  const origin = params.get('origin');
  const sign = params.get('sign');
  const t = params.get('t');

  // 调试信息（上线后可以注释掉）
  const debug: any = {
    received_params: { origin, sign, t },
    server_info: { time: Math.floor(Date.now() / 1000) }
  };

  try {
    // 1. 参数校验
    if (!origin || !sign || !t) {
      throw new Error('{"error":"Missing required parameters"}');
    }

    const expireTime = parseInt(t);
    if (isNaN(expireTime)) {
      throw new Error('{"error":"Invalid timestamp"}');
    }

    // 2. 签名校验 —— 完全和 PHP 一样：不 decode，保留 + 号！
    const signData = `${SECRET_TOKEN}${origin}${expireTime}${AES_KEY}`;
    const expectedSign = createHash('md5').update(signData).digest('hex');

    debug.sign_calculation = { sign_data: signData, expected_sign: expectedSign };

    if (sign !== expectedSign) {
      debug.error = 'Signature mismatch';
      throw new Error(JSON.stringify(debug, null, 2));
    }

    // 3. 过期校验
    if (Date.now() / 1000 > expireTime) {
      throw new Error('{"error":"Link expired"}');
    }

    // 4. 成功 → 302 重定向（和原 PHP 完全一样）
    const downloadUrl = `${DOWNLOAD_BASE_URL}${origin}`;
    return c.redirect(downloadUrl, 302);

  } catch (e: any) {
    // 所有错误都返回 403 + 原样错误体
    c.status(403);
    return c.text(e.message, 403, { 'Content-Type': 'application/json' });
  }
});

// EdgeOne 必须默认导出 fetch
export default app;
