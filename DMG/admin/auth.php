<?php
session_start();

// 配置管理员密码
$ADMIN_PASSWORD = '123456';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    if (!empty($_POST['password']) && $_POST['password'] === $ADMIN_PASSWORD) {
        $_SESSION['authenticated'] = true;
        header('Location: index.php');
        exit;
    } else {
        $error = 'Invalid password';
    }
}

if (isset($_SESSION['authenticated']) && $_SESSION['authenticated']) {
    header('Location: index.php');
    exit;
}
?>
<!DOCTYPE html>
<html>
<head>
    <title>Login</title>
    <link rel="stylesheet" href="style.css">
</head>
<body>
    <div class="login-container">
        <h1>DMG Manager Login</h1>
        <?php if (isset($error)): ?>
            <div class="error"><?= htmlspecialchars($error) ?></div>
        <?php endif; ?>
        <form method="POST">
            <input type="password" name="password" placeholder="Password" required>
            <button type="submit">Login</button>
        </form>
    </div>
</body>
</html>