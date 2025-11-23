<?php
header("Content-Type: application/json");
header("Access-Control-Allow-Origin: *");

// 验证Token
if (!isset($_GET['token']) || $_GET['token'] !== 'oclpmod') {
    http_response_code(401);
    die(json_encode(['error' => 'Invalid token']));
}

// 读取DMG列表
$dmgList = json_decode(file_get_contents(__DIR__.'/../data/dmgs.json'), true);
if (json_last_error() !== JSON_ERROR_NONE) {
    http_response_code(500);
    die(json_encode(['error' => 'Failed to load DMG list']));
}

echo json_encode(['dmgFiles' => $dmgList], JSON_UNESCAPED_UNICODE);