<?php
/**
 * OCLP-Mod项目API接口
 * 安全、高效的JSON数据获取接口
 */

// ==================== 安全配置 ====================
header('Content-Type: application/json; charset=utf-8');

// 限制请求方法只允许GET
if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    echo json_encode([
        'status' => 'error',
        'message' => '只允许GET请求方法',
        'timestamp' => time()
    ]);
    exit;
}

// 设置安全头
header('X-Content-Type-Options: nosniff');
header('X-Frame-Options: DENY');
header('X-XSS-Protection: 1; mode=block');
header('Strict-Transport-Security: max-age=31536000; includeSubDomains');

// 禁用错误信息输出到客户端（生产环境）
ini_set('display_errors', 0);
ini_set('log_errors', 1);

// ==================== 路径配置 ====================
define('ROOT_DIR', dirname(dirname(__FILE__)));
define('KDK_MANIFEST_PATH', ROOT_DIR . '/KdkSupportPkg/manifest.json');
define('METALLIB_MANIFEST_PATH', ROOT_DIR . '/MetallibSupportPkg/manifest.json');

// 允许的API端点
$allowedEndpoints = [
    'getKdkSources',
    'getMetallibSources'
];

// ==================== 核心函数 ====================

/**
 * 安全获取请求路径
 */
function getRequestPath() {
    $path = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
    $path = trim($path, '/');
    $segments = explode('/', $path);
    
    // 获取最后一个段作为端点
    return end($segments);
}

/**
 * 验证文件路径安全性
 */
function isSafePath($filePath, $baseDir) {
    $realBase = realpath($baseDir);
    $realPath = realpath($filePath);
    
    if ($realPath === false) {
        return false;
    }
    
    // 检查文件是否在基础目录内
    return strpos($realPath, $realBase) === 0;
}

/**
 * 读取并验证JSON文件
 */
function readJsonFile($filePath) {
    // 检查文件是否存在
    if (!file_exists($filePath)) {
        return [
            'success' => false,
            'error' => '文件不存在',
            'data' => null
        ];
    }
    
    // 检查文件是否可读
    if (!is_readable($filePath)) {
        return [
            'success' => false,
            'error' => '文件不可读',
            'data' => null
        ];
    }
    
    // 检查文件大小（限制为10MB）
    if (filesize($filePath) > 10 * 1024 * 1024) {
        return [
            'success' => false,
            'error' => '文件过大',
            'data' => null
        ];
    }
    
    // 读取文件内容
    $content = file_get_contents($filePath);
    if ($content === false) {
        return [
            'success' => false,
            'error' => '读取文件失败',
            'data' => null
        ];
    }
    
    // 解码JSON
    $data = json_decode($content, true);
    if (json_last_error() !== JSON_ERROR_NONE) {
        return [
            'success' => false,
            'error' => 'JSON解析错误: ' . json_last_error_msg(),
            'data' => null
        ];
    }
    
    return [
        'success' => true,
        'error' => null,
        'data' => $data
    ];
}

/**
 * 记录安全日志
 */
function logSecurityEvent($event, $details = []) {
    $logEntry = sprintf(
        "[%s] %s - IP: %s - UserAgent: %s - Details: %s\n",
        date('Y-m-d H:i:s'),
        $event,
        $_SERVER['REMOTE_ADDR'] ?? 'unknown',
        $_SERVER['HTTP_USER_AGENT'] ?? 'unknown',
        json_encode($details)
    );
    
    // 写入安全日志文件（请确保logs目录存在且有写权限）
    $logFile = ROOT_DIR . '/logs/api_security.log';
    if (is_dir(dirname($logFile)) {
        file_put_contents($logFile, $logEntry, FILE_APPEND | LOCK_EX);
    }
}

// ==================== 主程序逻辑 ====================

try {
    // 获取请求的端点
    $endpoint = getRequestPath();
    
    // 验证端点是否允许
    if (!in_array($endpoint, $allowedEndpoints)) {
        http_response_code(404);
        echo json_encode([
            'status' => 'error',
            'message' => 'API端点不存在',
            'endpoint' => $endpoint,
            'timestamp' => time()
        ]);
        logSecurityEvent('INVALID_ENDPOINT', ['endpoint' => $endpoint]);
        exit;
    }
    
    // 根据端点处理请求
    switch ($endpoint) {
        case 'getKdkSources':
            $filePath = KDK_MANIFEST_PATH;
            $logEvent = 'KDK_MANIFEST_ACCESS';
            break;
            
        case 'getMetallibSources':
            $filePath = METALLIB_MANIFEST_PATH;
            $logEvent = 'METALLIB_MANIFEST_ACCESS';
            break;
            
        default:
            $filePath = null;
            $logEvent = 'UNKNOWN_ENDPOINT';
    }
    
    // 验证文件路径安全性
    if ($filePath && !isSafePath($filePath, ROOT_DIR)) {
        http_response_code(403);
        echo json_encode([
            'status' => 'error',
            'message' => '访问被拒绝：路径安全性验证失败',
            'timestamp' => time()
        ]);
        logSecurityEvent('PATH_TRAVERSAL_ATTEMPT', [
            'endpoint' => $endpoint,
            'requested_path' => $filePath
        ]);
        exit;
    }
    
    // 读取JSON文件
    $result = readJsonFile($filePath);
    
    if (!$result['success']) {
        http_response_code(500);
        echo json_encode([
            'status' => 'error',
            'message' => '无法读取清单文件: ' . $result['error'],
            'timestamp' => time()
        ]);
        logSecurityEvent('FILE_READ_ERROR', [
            'endpoint' => $endpoint,
            'error' => $result['error']
        ]);
        exit;
    }
    
    // 成功响应
    http_response_code(200);
    echo json_encode([
        'status' => 'success',
        'data' => $result['data'],
        'timestamp' => time(),
        'endpoint' => $endpoint
    ], JSON_UNESCAPED_SLASHES | JSON_PRETTY_PRINT);
    
    // 记录成功的访问
    logSecurityEvent($logEvent, [
        'endpoint' => $endpoint,
        'status' => 'success'
    ]);
    
} catch (Exception $e) {
    // 全局异常处理
    http_response_code(500);
    echo json_encode([
        'status' => 'error',
        'message' => '服务器内部错误',
        'timestamp' => time()
    ]);
    
    logSecurityEvent('UNHANDLED_EXCEPTION', [
        'error' => $e->getMessage(),
        'file' => $e->getFile(),
        'line' => $e->getLine()
    ]);
    
    // 在生产环境中，不要暴露具体错误信息
    error_log("API Error: " . $e->getMessage());
}
?>
