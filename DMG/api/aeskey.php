<?php
header("Content-Type: text/plain");
header("Access-Control-Allow-Origin: *");

if (!isset($_GET['token']) || $_GET['token'] !== 'oclpmod') {
    http_response_code(401);
    die('Invalid token');
}

echo trim(file_get_contents(__DIR__.'/../../data/aeskey.txt'));