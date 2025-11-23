// src/index.ts
import { createHash } from "node:crypto";

// ========= 配置区（和你的 PHP 完全一致）=========
const SECRET_TOKEN = "oclpmod";
const DOWNLOAD_BASE_URL =
  "https://down.chengdu.simplehac.cn/d/SHOSS/macOS/DMG/";

// 读取 aeskey.txt（EdgeOne 支持相对路径）
const AES_KEY = await Deno.readTextFile("./data/aeskey.txt").then(t => t.trim());

// 主函数
export default async function (request: Request): Promise<Response> {
  const url = new URL(request.url);
  
  // 只处理 /dmgDownload 这个路径
  if (!url.pathname.endsWith("/dmgDownload")) {
    return new Response("Not Found", { status: 404 });
  }

  const origin = url.searchParams.get("origin");
  const sign = url.searchParams.get("sign");
  const t = url.searchParams.get("t");

  // 调试信息（上线后可以删掉）
  const debug: any = {
    received_params: { origin, sign, t },
    server_time: Math.floor(Date.now() / 1000),
  };

  try {
    // 1. 参数缺失
    if (!origin || !sign || !t) {
      throw new Error('{"error":"Missing required parameters"}');
    }

    const expireTime = parseInt(t);
    if (isNaN(expireTime)) {
      throw new Error('{"error":"Invalid timestamp"}');
    }

    // 2. 签名校验（关键：不 decode origin，保留 + 号，和 PHP 完全一致！）
    const signData = `${SECRET_TOKEN}${origin}${expireTime}${AES_KEY}`;
    const expectedSign = createHash("md5").update(signData).digest("hex");

    if (sign !== expectedSign) {
      debug.error = "Signature mismatch";
      debug.sign_calculation = { signData, expectedSign };
      throw new Error(JSON.stringify(debug, null, 2));
    }

    // 3. 过期校验
    if (Date.now() / 1000 > expireTime) {
      throw new Error('{"error":"Link expired"}');
    }

    // 4. 成功 → 302 重定向
    const downloadUrl = DOWNLOAD_BASE_URL + origin;
    return Response.redirect(downloadUrl, 302);

  } catch (e: any) {
    return new Response(e.message, {
      status: 403,
      headers: { "Content-Type": "application/json; charset=utf-8" },
    });
  }
}
