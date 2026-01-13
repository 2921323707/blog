from flask import Flask

app = Flask(__name__)

@app.route('/')
def hello():
    return "HTTPS服务已成功启动！"

if __name__ == '__main__':
    # 直接使用当前目录下的证书文件
    app.run(
        host='0.0.0.0',  # 允许外部访问
        port=443,        # HTTPS默认端口（需sudo权限）
        ssl_context=('dodoko.pem', 'dodoko.key')  # 证书+私钥路径
    )