//
//  dmgDownload.js
//  
//
//  Created by laobamac on 2025/11/23.
//

const CONFIG = {
    SECRET_TOKEN: 'oclpmod',
    DOWNLOAD_BASE_URL: 'https://down.chengdu.simplehac.cn/d/SHOSS/macOS/DMG/'
};

export async function onRequest(context) {
    const { request } = context;
    
    try {
        // 获取 AES_KEY 从环境变量
        const AES_KEY = context.env.AES_KEY || '';
        
        const url = new URL(request.url);
        const searchParams = url.searchParams;
        
        // 获取参数（特别注意：不要对origin进行decode！）
        const encoded_filename = searchParams.get('origin');
        const signature = searchParams.get('sign');
        const expireTime = parseInt(searchParams.get('t'));

        // 验证必要参数
        if (!encoded_filename || !signature || !expireTime) {
            throw new Error('{"error":"Missing required parameters"}');
        }

        // 调试信息
        const debug = {
            received_params: {
                origin: encoded_filename,
                sign: signature,
                t: expireTime
            },
            server_info: {
                aes_key: AES_KEY ? '***' : 'empty',
                time: Math.floor(Date.now() / 1000)
            }
        };

        // 关键：直接使用原始encoded_filename计算签名（保留+号等编码字符）
        const signData = CONFIG.SECRET_TOKEN + encoded_filename + expireTime + AES_KEY;
        const expectedSign = await md5(signData);

        debug.sign_calculation = {
            sign_data: CONFIG.SECRET_TOKEN + '[...origin...]' + expireTime + '[...aes_key...]',
            expected_sign: expectedSign
        };

        // 签名验证
        if (signature !== expectedSign) {
            debug.error = 'Signature mismatch';
            return new Response(JSON.stringify(debug, null, 2), {
                status: 403,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // 过期时间验证
        const currentTime = Math.floor(Date.now() / 1000);
        if (currentTime > expireTime) {
            throw new Error('{"error":"Link expired"}');
        }

        // 构建下载URL（直接使用原始编码的filename）
        const downloadUrl = CONFIG.DOWNLOAD_BASE_URL + encoded_filename;
        
        // 重定向到下载地址
        return Response.redirect(downloadUrl, 302);

    } catch (error) {
        const errorMessage = error.message;
        let statusCode = 403;
        
        // 尝试解析JSON错误信息
        try {
            const errorObj = JSON.parse(errorMessage);
            return new Response(errorMessage, {
                status: statusCode,
                headers: { 'Content-Type': 'application/json' }
            });
        } catch (e) {
            // 如果不是JSON，返回原始错误
            return new Response(JSON.stringify({ error: errorMessage }), {
                status: statusCode,
                headers: { 'Content-Type': 'application/json' }
            });
        }
    }
}

// MD5 计算函数
async function md5(data) {
    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(data);
    const hashBuffer = await crypto.subtle.digest('MD5', dataBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}
