from flask import Blueprint, send_from_directory
from pathlib import Path

bp = Blueprint('frontend', __name__)

# 前端文件目录路径（使用 resolve() 确保绝对路径，避免从 backend 启动时 cwd 影响）
BASE_DIR = Path(__file__).resolve().parent.parent.parent
FRONTEND_DIR = BASE_DIR / "service_fronted"
PRIVATE_DIR = FRONTEND_DIR / "private" / "dist"

@bp.route('/admin.html')
def admin_page():
    """提供编辑器页面"""
    admin_path = FRONTEND_DIR / "html" / "admin.html"
    if admin_path.exists():
        return send_from_directory(str(FRONTEND_DIR / "html"), "admin.html")
    return "编辑器页面未找到", 404


@bp.route('/private')
@bp.route('/private/')
def private_page():
    """私站 Vue SPA：返回 index.html"""
    index_path = PRIVATE_DIR / "index.html"
    if index_path.exists():
        return send_from_directory(str(PRIVATE_DIR), "index.html")
    return "私站未构建，请先在 service_fronted/private 下执行 npm install && npm run build", 404


@bp.route('/private/<path:filename>')
def private_static(filename):
    """私站静态资源（JS/CSS 等）"""
    return send_from_directory(str(PRIVATE_DIR), filename)


@bp.route('/static/css/<path:filename>')
def serve_css(filename):
    """提供 CSS 文件"""
    return send_from_directory(str(FRONTEND_DIR / "css"), filename)

@bp.route('/static/js/<path:filename>')
def serve_js(filename):
    """提供 JS 文件"""
    return send_from_directory(str(FRONTEND_DIR / "js"), filename)
