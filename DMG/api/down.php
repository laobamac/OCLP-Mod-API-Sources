<?php
// 配置
$CONFIG = [
    'SECRET_TOKEN' => 'oclpmod',
    'AES_KEY' => trim(file_get_contents(__DIR__.'/../data/aeskey.txt')),
    'DOWNLOAD_BASE_URL' => 'https://down.chengdu.simplehac.cn/d/SHOSS/macOS/DMG/'
];

header("Content-Type: application/json");

try {
    // 验证必要参数
    if (!isset($_GET['origin'], $_GET['sign'], $_GET['t'])) {
        throw new Exception('{"error":"Missing required parameters"}');
    }

    // 获取原始参数（特别注意：不要对origin进行urldecode！）
    $encoded_filename = $_GET['origin']; // 保留原始编码，包括+号
    $signature = $_GET['sign'];
    $expireTime = (int)$_GET['t'];

    // 调试信息（生产环境可移除）
    $debug = [
        'received_params' => [
            'origin' => $encoded_filename,
            'sign' => $signature,
            't' => $expireTime
        ],
        'server_info' => [
            'aes_key' => $CONFIG['AES_KEY'],
            'time' => time()
        ]
    ];

    // 关键修改：直接使用原始origin参数计算签名（保留+号）
    $signData = $CONFIG['SECRET_TOKEN'].$encoded_filename.$expireTime.$CONFIG['AES_KEY'];
    $expectedSign = md5($signData);

    $debug['sign_calculation'] = [
        'sign_data' => $signData,
        'expected_sign' => $expectedSign
    ];

    if ($signature !== $expectedSign) {
        $debug['error'] = 'Signature mismatch';
        throw new Exception(json_encode($debug, JSON_PRETTY_PRINT));
    }

    if (time() > $expireTime) {
        throw new Exception('{"error":"Link expired"}');
    }

    // 构建下载URL（直接使用原始编码的filename）
    $downloadUrl = $CONFIG['DOWNLOAD_BASE_URL'].$encoded_filename;
    header("Location: ".$downloadUrl);
    exit;

} catch (Exception $e) {
    http_response_code(403);
    die($e->getMessage());
}