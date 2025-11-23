// worker.js 或 index.js（EdgeOne Pages 直接上传这个文件即可）

const CONFIG = {
  SECRET_TOKEN: 'oclpmod',
  // 注意：这里读取同目录下 ../data/aeskey.txt
  // EdgeOne Pages 是只读文件系统，无法动态读取，但你可以手动把内容填进来
  // 请替换成你的真实 AES_KEY（从原服务器 aeskey.txt 内容复制）
  AES_KEY: '你的aeskey内容直接填在这里', // ←←←←←←←←←←←←←←←←←←←←←←←←←←←←
  DOWNLOAD_BASE_URL: 'https://down.chengdu.simplehac.cn/d/SHOSS/macOS/DMG/'
};

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const pathname = url.pathname;

    // 只处理你的路径，例如 /dmgDownload
    if (!pathname.includes('dmgDownload')) {
      return new Response('Not Found', { status: 404 });
    }

    const origin = url.searchParams.get('origin');
    const sign = url.searchParams.get('sign');
    const t = url.searchParams.get('t');

    // 构造调试信息（和原PHP完全一致）
    const debug = {
      received_params: {
        origin,
        sign,
        t: t ? parseInt(t) : null
      },
      server_info: {
        aes_key: CONFIG.AES_KEY,
        time: Math.floor(Date.now() / 1000)
      }
    };

    try {
      // 验证必要参数
      if (!origin || !sign || !t) {
        throw new Error(JSON.stringify({ error: 'Missing required parameters' }));
      }

      const expireTime = parseInt(t);
      if (isNaN(expireTime)) {
        throw new Error(JSON.stringify({ error: 'Invalid timestamp' }));
      }

      // 关键：完全模仿 PHP 行为，origin 参数不进行任何 urldecode，保留 + 号！
      // URLSearchParams 的 get() 方法已经返回未 decode 的原始值（+ 保留），完美符合需求
      const encoded_filename = origin;

      // 计算签名：SECRET_TOKEN + encoded_filename + expireTime + AES_KEY
      const signData = CONFIG.SECRET_TOKEN + encoded_filename + expireTime + CONFIG.AES_KEY;
      
      // 使用 Crypto API 计算 MD5
      const encoder = new TextEncoder();
      const data = encoder.encode(signData);
      const hashBuffer = await crypto.subtle.digest('MD5', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const expectedSign = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

      debug.sign_calculation = {
        sign_data: signData,
        expected_sign: expectedSign
      };

      // 验证签名
      if (sign !== expectedSign) {
        debug.error = 'Signature mismatch';
        throw new Error(JSON.stringify(debug, null, 2));
      }

      // 验证是否过期
      if (Math.floor(Date.now() / 1000) > expireTime) {
        throw new Error(JSON.stringify({ error: 'Link expired' }));
      }

      // 正确：直接拼原始 encoded filename
      const downloadUrl = CONFIG.DOWNLOAD_BASE_URL + encoded_filename;

      // 302 重定向到真实下载地址
      return Response.redirect(downloadUrl, 302);

    } catch (e) {
      // 所有错误返回 403 + JSON
      return new Response(e.message, {
        status: 403,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }
};//
//  index.js
//  
//
//  Created by laobamac on 2025/11/23.
//

