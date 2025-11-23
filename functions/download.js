
//
//  download.js
//  
//
//  Created by laobamac on 2025/11/23.
//

const CONFIG = {
    SECRET_TOKEN: 'oclpmod',
    DOWNLOAD_BASE_URL: 'https://down.chengdu.simplehac.cn/d/SHOSS/macOS/DMG/'
};

// 从环境变量获取 AES_KEY（推荐方式）
const AES_KEY = process.env.AES_KEY || '';

export async function onRequest(context) {
    const { request } = context;
    
    // 只处理 GET 请求
    if (request.method !== 'GET') {
        return new Response(JSON.stringify({ error: 'Method not allowed' }), {
            status: 405,
            headers: { 'Content-Type': 'application/json' }
        });
    }

    try {
        const url = new URL(request.url);
        const searchParams = url.searchParams;
        
        // 获取参数（保持原始编码）
        const encoded_filename = searchParams.get('origin');
        const signature = searchParams.get('sign');
        const expireTime = parseInt(searchParams.get('t'));

        // 验证必要参数
        if (!encoded_filename || !signature || !expireTime) {
            return new Response(JSON.stringify({ error: 'Missing required parameters' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // 调试信息
        const debug = {
            received_params: {
                origin: encoded_filename,
                sign: signature,
                t: expireTime
            },
            server_info: {
                time: Math.floor(Date.now() / 1000)
            }
        };

        // 计算签名（保持原始编码）
        const signData = CONFIG.SECRET_TOKEN + encoded_filename + expireTime + AES_KEY;
        const expectedSign = await md5(signData);

        debug.sign_calculation = {
            sign_data_length: signData.length,
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
            return new Response(JSON.stringify({ error: 'Link expired' }), {
                status: 403,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // 构建下载URL并重定向
        const downloadUrl = CONFIG.DOWNLOAD_BASE_URL + encoded_filename;
        return Response.redirect(downloadUrl, 302);

    } catch (error) {
        return new Response(JSON.stringify({
            error: 'Internal server error',
            details: error.message
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
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
