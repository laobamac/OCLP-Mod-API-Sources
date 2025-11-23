const CONFIG = {
    SECRET_TOKEN: 'oclpmod',
    AES_KEY: process.env.AES_KEY || '', // 在EdgeOne环境中设置此环境变量
    DOWNLOAD_BASE_URL: 'https://down.chengdu.simplehac.cn/d/SHOSS/macOS/DMG/'
};

export async function onRequest(context) {
    const { request } = context;
    
    // 设置响应头
    const headers = {
        'Content-Type': 'application/json'
    };

    try {
        // 获取查询参数
        const url = new URL(request.url);
        const searchParams = url.searchParams;
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
                aes_key: CONFIG.AES_KEY ? '***' : 'NOT_SET',
                time: Math.floor(Date.now() / 1000)
            }
        };

        // 关键：直接使用原始origin参数计算签名（保留+号）
        const signData = CONFIG.SECRET_TOKEN + encoded_filename + expireTime + CONFIG.AES_KEY;
        const expectedSign = await md5(signData);

        debug.sign_calculation = {
            sign_data: signData,
            expected_sign: expectedSign
        };

        // 验证签名
        if (signature !== expectedSign) {
            debug.error = 'Signature mismatch';
            return new Response(JSON.stringify(debug, null, 2), {
                status: 403,
                headers
            });
        }

        // 验证过期时间
        const currentTime = Math.floor(Date.now() / 1000);
        if (currentTime > expireTime) {
            throw new Error('{"error":"Link expired"}');
        }

        // 构建下载URL（直接使用原始编码的filename）
        const downloadUrl = CONFIG.DOWNLOAD_BASE_URL + encoded_filename;
        
        // 重定向到下载URL
        return new Response(null, {
            status: 302,
            headers: {
                'Location': downloadUrl
            }
        });

    } catch (error) {
        return new Response(error.message, {
            status: 403,
            headers
        });
    }
}

// MD5计算函数（与PHP的md5()函数兼容）
async function md5(data) {
    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(data);
    const hashBuffer = await crypto.subtle.digest('MD5', dataBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}
