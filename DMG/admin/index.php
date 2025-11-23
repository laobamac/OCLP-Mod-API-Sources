<?php
$dataFile = __DIR__.'/../data/dmgs.json';
$dmgList = json_decode(file_get_contents($dataFile), true) ?: [];

if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['action'])) {
    switch ($_POST['action']) {
        case 'add':
            $dmgList[] = [
                'title' => $_POST['title'],
                'version' => $_POST['version'],
                'build' => $_POST['build'],
                'size' => $_POST['size'],
                'releaseDate' => $_POST['releaseDate'],
                'downloadUrl' => $_POST['downloadUrl']
            ];
            break;
        case 'edit':
            if (isset($_POST['index'])) {
                $index = (int)$_POST['index'];
                if (isset($dmgList[$index])) {
                    $dmgList[$index] = [
                        'title' => $_POST['title'],
                        'version' => $_POST['version'],
                        'build' => $_POST['build'],
                        'size' => $_POST['size'],
                        'releaseDate' => $_POST['releaseDate'],
                        'downloadUrl' => $_POST['downloadUrl']
                    ];
                }
            }
            break;
        case 'delete':
            if (isset($_POST['index'])) {
                array_splice($dmgList, (int)$_POST['index'], 1);
            }
            break;
        case 'sort':
            $sortBy = $_POST['by'] ?? 'version';
            usort($dmgList, function($a, $b) use ($sortBy) {
                return $sortBy === 'build'
                    ? version_compare($a['build'], $b['build'])
                    : version_compare($a['version'], $b['version']);
            });
            break;
    }

    file_put_contents($dataFile, json_encode($dmgList, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
    header('Location: index.php');
    exit;
}
?>
<!DOCTYPE html>
<html>
<head>
    <title>DMG镜像管理</title>
    <meta charset="UTF-8">
    <style>
        body{font-family:'Microsoft YaHei',sans-serif;line-height:1.6;margin:0;padding:20px;background:#f5f5f5}
        .container{max-width:1200px;margin:0 auto;background:white;padding:20px;border-radius:5px;box-shadow:0 0 10px rgba(0,0,0,.1)}
        h1{color:#333;margin-top:0;text-align:center}
        table{width:100%;border-collapse:collapse;margin-top:20px}
        th,td{padding:10px;text-align:left;border-bottom:1px solid #ddd}
        th{background:#f2f2f2;font-weight:bold}
        button,input[type=submit]{background:#4CAF50;color:white;border:none;padding:8px 12px;cursor:pointer;border-radius:3px;margin:2px}
        button.delete{background:#f44336}
        button.copy{background:#2196F3}
        button:hover{opacity:.8}
        .actions{margin-bottom:20px;text-align:center}
        .form-popup{position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);background:white;padding:20px;border-radius:5px;box-shadow:0 0 20px rgba(0,0,0,.2);z-index:100;width:400px}
        .form-group{margin-bottom:15px}
        .form-group label{display:block;margin-bottom:5px;font-weight:bold}
        .form-group input{width:100%;padding:8px;box-sizing:border-box;border:1px solid #ddd;border-radius:3px}
        .close-btn{float:right;cursor:pointer;font-size:20px}
    </style>
</head>
<body>
<div class="container">
    <h1>DMG镜像管理系统</h1>
    <div class="actions">
        <button onclick="showAddForm()">添加新镜像</button>
        <form method="POST" style="display:inline">
            <input type="hidden" name="action" value="sort">
            <input type="hidden" name="by" value="version">
            <button type="submit">按系统版本排序</button>
        </form>
        <form method="POST" style="display:inline">
            <input type="hidden" name="action" value="sort">
            <input type="hidden" name="by" value="build">
            <button type="submit">按构建版本排序</button>
        </form>
    </div>

    <div id="editForm" class="form-popup" style="display:none">
        <span class="close-btn" onclick="hideForm()">×</span>
        <form method="POST">
            <h2 id="formTitle">添加新镜像</h2>
            <input type="hidden" name="action" id="formAction" value="add">
            <input type="hidden" name="index" id="formIndex">
            <div class="form-group"><label>镜像名称:</label><input type="text" name="title" required></div>
            <div class="form-group"><label>系统版本:</label><input type="text" name="version" required placeholder="例如：13.0"></div>
            <div class="form-group"><label>构建版本:</label><input type="text" name="build" required placeholder="例如：22A380"></div>
            <div class="form-group"><label>文件大小:</label><input type="text" name="size" required placeholder="例如：12.5 GB"></div>
            <div class="form-group"><label>发布日期:</label><input type="date" name="releaseDate" required></div>
            <div class="form-group"><label>下载地址:</label><input type="text" name="downloadUrl" required placeholder="完整URL地址"></div>
            <button type="submit">保存</button>
            <button type="button" onclick="hideForm()">取消</button>
        </form>
    </div>

    <table>
        <thead>
            <tr>
                <th>镜像名称</th>
                <th>系统版本</th>
                <th>构建版本</th>
                <th>文件大小</th>
                <th>发布日期</th>
                <th>操作</th>
            </tr>
        </thead>
        <tbody>
            <?php foreach ($dmgList as $index => $dmg): ?>
            <tr>
                <td><?= htmlspecialchars($dmg['title']) ?></td>
                <td><?= htmlspecialchars($dmg['version']) ?></td>
                <td><?= htmlspecialchars($dmg['build']) ?></td>
                <td><?= htmlspecialchars($dmg['size']) ?></td>
                <td><?= htmlspecialchars($dmg['releaseDate']) ?></td>
                <td class="actions">
                    <button onclick="editItem(<?= $index ?>)">编辑</button>
                    <form method="POST" style="display:inline">
                        <input type="hidden" name="action" value="delete">
                        <input type="hidden" name="index" value="<?= $index ?>">
                        <button type="submit" class="delete">删除</button>
                    </form>
                    <button class="copy" onclick="copyUrl('<?= htmlspecialchars($dmg['downloadUrl']) ?>')">复制链接</button>
                </td>
            </tr>
            <?php endforeach; ?>
        </tbody>
    </table>
</div>

<script>
function showAddForm(){document.getElementById('formTitle').textContent='添加新镜像';document.getElementById('formAction').value='add';document.getElementById('formIndex').value='';document.getElementById('editForm').style.display='block'}
function editItem(index){
    const dmg=<?= json_encode($dmgList) ?>[index];
    document.getElementById('formTitle').textContent='编辑镜像';
    document.getElementById('formAction').value='edit';
    document.getElementById('formIndex').value=index;
    const form=document.querySelector('#editForm form');
    form.elements['title'].value=dmg.title;
    form.elements['version'].value=dmg.version;
    form.elements['build'].value=dmg.build;
    form.elements['size'].value=dmg.size;
    form.elements['releaseDate'].value=dmg.releaseDate;
    form.elements['downloadUrl'].value=dmg.downloadUrl;
    document.getElementById('editForm').style.display='block'
}
function hideForm(){document.getElementById('editForm').style.display='none'}
function copyUrl(url){navigator.clipboard.writeText(url).then(()=>{alert('下载链接已复制到剪贴板')}).catch(err=>{console.error('复制失败:',err);prompt('请手动复制以下链接',url)})}
</script>
</body>
</html>