//
//  dmgDownload.js
//  
//
//  Created by laobamac on 2025/11/23.
//

export default {
  async fetch(request, env) {
    try {
      // 配置 - 你需要设置这些环境变量
      const CONFIG = {
        SECRET_TOKEN: 'oclpmod',
        AES_KEY: env.AES_KEY || '', // 在EdgeOne环境中设置这个环境变量
        DOWNLOAD_BASE_URL: 'https://down.chengdu.simplehac.cn/d/SHOSS/macOS/DMG/'
      };

      const url = new URL(request.url);
      const params = url.searchParams;

      // 验证必要参数
      if (!params.has('origin') || !params.has('sign') || !params.has('t')) {
        throw new Error('{"error":"Missing required parameters"}');
      }

      // 获取原始参数（特别注意：不要对origin进行decode！）
      const encoded_filename = params.get('origin'); // 保留原始编码，包括+号
      const signature = params.get('sign');
      const expireTime = parseInt(params.get('t'));

      // 调试信息
      const debug = {
        received_params: {
          origin: encoded_filename,
          sign: signature,
          t: expireTime
        },
        server_info: {
          aes_key: CONFIG.AES_KEY ? '***' : 'NOT_SET',
          time: Math.floor(Date.now() / 1000)
        }
      };

      // 关键修改：直接使用原始origin参数计算签名（保留+号）
      const signData = CONFIG.SECRET_TOKEN + encoded_filename + expireTime + CONFIG.AES_KEY;
      const expectedSign = await md5(signData);

      debug.sign_calculation = {
        sign_data: signData,
        expected_sign: expectedSign
      };

      if (signature !== expectedSign) {
        debug.error = 'Signature mismatch';
        throw new Error(JSON.stringify(debug, null, 2));
      }

      const currentTime = Math.floor(Date.now() / 1000);
      if (currentTime > expireTime) {
        throw new Error('{"error":"Link expired"}');
      }

      // 构建下载URL（直接使用原始编码的filename）
      const downloadUrl = CONFIG.DOWNLOAD_BASE_URL + encoded_filename;
      
      return Response.redirect(downloadUrl, 302);

    } catch (error) {
      return new Response(error.message, {
        status: 403,
        headers: {
          'Content-Type': 'application/json'
        }
      });
    }
  }
}

// MD5计算函数
async function md5(data) {
  const encoder = new TextEncoder();
  const dataBuffer = encoder.encode(data);
  const hashBuffer = await crypto.subtle.digest('MD5', dataBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}
