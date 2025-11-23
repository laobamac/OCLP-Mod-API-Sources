// 文件名: /_functions/dmgDownload.js
// 这样可以通过 https://您的域名/dmgDownload 访问

const CONFIG = {
    SECRET_TOKEN: 'oclpmod',
    AES_KEY: process.env.AES_KEY || '',
    DOWNLOAD_BASE_URL: 'https://down.chengdu.simplehac.cn/d/SHOSS/macOS/DMG/'
};

export async function onRequest(context) {
    const { request } = context;
    
    const headers = {
        'Content-Type': 'application/json'
    };

    try {
        const url = new URL(request.url);
        const searchParams = url.searchParams;
        const encoded_filename = searchParams.get('origin');
        const signature = searchParams.get('sign');
        const expireTime = parseInt(searchParams.get('t'));

        if (!encoded_filename || !signature || !expireTime) {
            throw new Error('{"error":"Missing required parameters"}');
        }

        // 签名计算
        const signData = CONFIG.SECRET_TOKEN + encoded_filename + expireTime + CONFIG.AES_KEY;
        const expectedSign = await md5(signData);

        if (signature !== expectedSign) {
            throw new Error('{"error":"Signature mismatch"}');
        }

        const currentTime = Math.floor(Date.now() / 1000);
        if (currentTime > expireTime) {
            throw new Error('{"error":"Link expired"}');
        }

        const downloadUrl = CONFIG.DOWNLOAD_BASE_URL + encoded_filename;
        
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

async function md5(data) {
    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(data);
    const hashBuffer = await crypto.subtle.digest('MD5', dataBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}
