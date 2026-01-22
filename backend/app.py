from flask import Flask, jsonify, request
from flask_cors import CORS
from werkzeug.exceptions import RequestEntityTooLarge
from config import Config
from models import db
from routes import register_routes
#
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

# 错误处理器：确保 API 路由返回 JSON 格式的错误
@app.errorhandler(RequestEntityTooLarge)
def handle_file_too_large(e):
    """处理文件大小超限错误"""
    if request.path.startswith('/api/'):
        return jsonify({
            'errno': 1,
            'errmsg': f'文件大小超过限制（最大 {app.config.get("MAX_CONTENT_LENGTH", 0) // 1024 // 1024}MB）'
        }), 413
    return e

@app.errorhandler(413)
def handle_413(e):
    """处理 413 错误（请求实体过大）"""
    if request.path.startswith('/api/'):
        return jsonify({
            'errno': 1,
            'errmsg': '文件大小超过限制，请选择较小的文件'
        }), 413
    return e

@app.errorhandler(404)
def handle_404(e):
    """处理 404 错误"""
    if request.path.startswith('/api/'):
        return jsonify({
            'errno': 1,
            'errmsg': 'API 接口不存在'
        }), 404
    return e

@app.errorhandler(500)
def handle_500(e):
    """处理 500 错误"""
    if request.path.startswith('/api/'):
        import traceback
        error_detail = traceback.format_exc() if app.config.get('DEBUG') else None
        return jsonify({
            'errno': 1,
            'errmsg': '服务器内部错误',
            'detail': error_detail
        }), 500
    return e

#
# 初始化数据库
with app.app_context():
    db.create_all()

# 注册所有路由
register_routes(app)

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=False)