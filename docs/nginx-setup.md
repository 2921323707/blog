# Windows 服务器 Nginx 配置

## 安装

1. **下载 Nginx for Windows**
   - 访问：https://nginx.org/en/download.html
   - 下载 **Stable version** 的 `nginx/Windows-1.28.1`（当前稳定版）
   - 解压到 `C:\nginx`

2. **创建日志目录**
   ```cmd
   mkdir C:\Users\29213\Desktop\blog\logs
   ```

## 配置

配置文件 `nginx.conf` 已配置：
- SSL 证书：`ssl/`（相对路径）
- 日志路径：`logs/`（相对路径）
- 域名：`dodokolu.online`

## 启动

```cmd
# 切换到 Nginx 目录
cd C:\nginx

# 测试配置
nginx.exe -t -p C:\Users\29213\Desktop\blog -c C:\Users\29213\Desktop\blog\nginx.conf

# 启动 Nginx
nginx.exe -p C:\Users\29213\Desktop\blog -c C:\Users\29213\Desktop\blog\nginx.conf

# 停止
nginx.exe -s stop

# 重载配置
nginx.exe -s reload
```

## 启动应用服务

```cmd
# Flask 后端
cd C:\Users\29213\Desktop\blog\backend
python run.py

# 前端开发服务器（开发模式）
cd C:\Users\29213\Desktop\blog
npm run dev
```

## 路径修改

如果项目路径不同，修改 `nginx.conf` 中的路径：
- SSL 证书路径（约第99-100行）
- 日志路径（约第114-115行）
