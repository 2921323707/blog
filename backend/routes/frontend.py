from flask import Blueprint, send_from_directory
from pathlib import Path

bp = Blueprint('frontend', __name__)

# 前端文件目录路径
BASE_DIR = Path(__file__).parent.parent.parent
FRONTEND_DIR = BASE_DIR / "service_fronted"

@bp.route('/admin.html')
def admin_page():
    """提供编辑器页面"""
    admin_path = FRONTEND_DIR / "html" / "admin.html"
    if admin_path.exists():
        return send_from_directory(str(FRONTEND_DIR / "html"), "admin.html")
    return "编辑器页面未找到", 404

@bp.route('/static/css/<path:filename>')
def serve_css(filename):
    """提供 CSS 文件"""
    return send_from_directory(str(FRONTEND_DIR / "css"), filename)

@bp.route('/static/js/<path:filename>')
def serve_js(filename):
    """提供 JS 文件"""
    return send_from_directory(str(FRONTEND_DIR / "js"), filename)
