# SSL 证书配置说明

## 证书文件

- `dodoko.pem` - SSL 证书文件
- `dodoko.key` - SSL 私钥文件

## 在 Nginx 中使用

### 1. 修改 nginx.conf

找到以下配置行并修改为你的实际路径：

```nginx
ssl_certificate /path/to/your/blog/ssl/dodoko.pem;
ssl_certificate_key /path/to/your/blog/ssl/dodoko.key;
```

### 2. 路径示例

**Linux 服务器（假设项目在 /home/user/blog）：**
```nginx
ssl_certificate /home/user/blog/ssl/dodoko.pem;
ssl_certificate_key /home/user/blog/ssl/dodoko.key;
```

**Linux 服务器（假设项目在 /var/www/blog）：**
```nginx
ssl_certificate /var/www/blog/ssl/dodoko.pem;
ssl_certificate_key /var/www/blog/ssl/dodoko.key;
```

**Windows 本地（使用正斜杠）：**
```nginx
ssl_certificate C:/Users/29213/Desktop/blog/ssl/dodoko.pem;
ssl_certificate_key C:/Users/29213/Desktop/blog/ssl/dodoko.key;
```

### 3. 设置文件权限（Linux）

```bash
# 私钥文件权限（仅所有者可读）
chmod 600 dodoko.key

# 证书文件权限（所有者可读写，其他人只读）
chmod 644 dodoko.pem
```

### 4. 验证证书

```bash
# 查看证书信息
openssl x509 -in dodoko.pem -text -noout

# 检查证书有效期
openssl x509 -in dodoko.pem -noout -dates

# 验证证书和私钥是否匹配
openssl x509 -noout -modulus -in dodoko.pem | openssl md5
openssl rsa -noout -modulus -in dodoko.key | openssl md5
# 两个 MD5 值应该相同
```

## 安全建议

1. **私钥安全**：私钥文件 (`dodoko.key`) 应该：
   - 权限设置为 600（仅所有者可读）
   - 不要提交到版本控制系统
   - 定期备份到安全位置

2. **证书更新**：如果证书过期，需要：
   - 获取新证书
   - 更新 `dodoko.pem` 文件
   - 重启 Nginx：`sudo systemctl reload nginx`

3. **HTTPS 强制**：配置已启用 HTTP 到 HTTPS 的自动重定向

## 测试 HTTPS

配置完成后，测试 HTTPS 是否正常工作：

```bash
# 测试配置语法
sudo nginx -t

# 重载配置
sudo systemctl reload nginx

# 测试 HTTPS 连接
curl -I https://dodokolu.online

# 或使用浏览器访问
# https://dodokolu.online
```

## 故障排查

### 证书路径错误
- 错误：`SSL_CTX_use_certificate_file() failed`
- 解决：检查证书文件路径是否正确，使用绝对路径

### 权限问题
- 错误：`SSL_CTX_use_PrivateKey_file() failed`
- 解决：检查文件权限，确保 Nginx 用户有读取权限

### 证书过期
- 错误：浏览器显示证书过期警告
- 解决：检查证书有效期，更新证书文件

### 证书和私钥不匹配
- 错误：`SSL_CTX_use_PrivateKey_file() failed`
- 解决：使用上面的验证命令检查证书和私钥是否匹配
