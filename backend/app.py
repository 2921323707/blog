from flask import Flask
from flask_cors import CORS
from config import Config
from models import db
from routes import register_routes

app = Flask(__name__)
app.config.from_object(Config)
db.init_app(app)

# 配置CORS以支持CDN访问
CORS(app, resources={
    r"/api/*": {
        "origins": "*",  # 允许所有来源，支持CDN访问
        "methods": ["GET", "POST", "OPTIONS", "PUT", "DELETE"],
        "allow_headers": ["Content-Type", "Authorization"]
    }
})
#
# 初始化数据库
with app.app_context():
    db.create_all()

# 注册所有路由
register_routes(app)

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
p