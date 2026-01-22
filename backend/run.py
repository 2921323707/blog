from app import app

if __name__ == '__main__':
    # 关闭自动重载：加载本地 embedding（torch）时容易触发文件变化导致连接重置
    app.run(host='0.0.0.0', port=5000, debug=False, use_reloader=False)
