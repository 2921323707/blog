from flask import Blueprint, send_from_directory
from pathlib import Path

bp = Blueprint('images', __name__)

# 项目根目录路径
BASE_DIR = Path(__file__).parent.parent.parent
IMAGES_DIR = BASE_DIR / "source" / "img"
COVERS_DIR = IMAGES_DIR / "covers"
CONTENT_IMAGES_DIR = IMAGES_DIR / "content"

# 导出 IMAGES_DIR 供其他模块使用
__all__ = ['IMAGES_DIR', 'COVERS_DIR', 'CONTENT_IMAGES_DIR']

@bp.route('/img/<path:filename>')
def serve_image(filename):
    """提供图片访问
    支持从不同子目录提供图片：
    - /img/covers/xxx -> 封面图片
    - /img/content/xxx -> 内容图片
    - /img/xxx -> 根目录图片（向后兼容）
    """
    # 检查是否包含子目录路径
    if filename.startswith('covers/'):
        # 封面图片
        actual_filename = filename.replace('covers/', '', 1)
        return send_from_directory(str(COVERS_DIR), actual_filename)
    elif filename.startswith('content/'):
        # 内容图片
        actual_filename = filename.replace('content/', '', 1)
        return send_from_directory(str(CONTENT_IMAGES_DIR), actual_filename)
    else:
        # 根目录图片（向后兼容）
        return send_from_directory(str(IMAGES_DIR), filename)
