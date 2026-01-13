from flask import Blueprint, send_from_directory
from pathlib import Path

bp = Blueprint('images', __name__)

# 项目根目录路径
BASE_DIR = Path(__file__).parent.parent.parent
IMAGES_DIR = BASE_DIR / "source" / "img"

# 导出 IMAGES_DIR 供其他模块使用
__all__ = ['IMAGES_DIR']

@bp.route('/img/<path:filename>')
def serve_image(filename):
    """提供图片访问"""
    return send_from_directory(str(IMAGES_DIR), filename)
