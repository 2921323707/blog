from flask import Blueprint, jsonify
from pathlib import Path
from datetime import datetime
import subprocess
import os

bp = Blueprint('stats', __name__)

# 项目根目录路径
BASE_DIR = Path(__file__).parent.parent.parent

def get_last_update_time():
    """获取最后更新时间
    优先从 git 获取最后一次提交时间，如果失败则使用最新文章的修改时间
    """
    try:
        # 尝试从 git 获取最后一次提交时间
        result = subprocess.run(
            ['git', 'log', '-1', '--format=%ci'],
            cwd=str(BASE_DIR),
            capture_output=True,
            text=True,
            encoding='utf-8',  # 显式指定 utf-8
            errors='replace',  # 忽略解码错误
            timeout=5
        )
        if result.returncode == 0 and result.stdout.strip():
            # git 返回格式: 2024-01-17 12:00:00 +0800
            git_time_str = result.stdout.strip()
            # 解析时间字符串
            try:
                # 移除时区信息，只保留日期和时间
                time_part = git_time_str.split(' +')[0].split(' -')[0]
                dt = datetime.strptime(time_part, '%Y-%m-%d %H:%M:%S')
                return dt.isoformat()
            except:
                pass
    except (subprocess.TimeoutExpired, FileNotFoundError, Exception):
        pass
    
    # 如果 git 失败，尝试从最新文章获取修改时间
    try:
        posts_dir = BASE_DIR / "source" / "_posts"
        if posts_dir.exists():
            posts = list(posts_dir.glob('*.md'))
            if posts:
                # 获取最新修改的文件
                latest_post = max(posts, key=lambda p: p.stat().st_mtime)
                mtime = latest_post.stat().st_mtime
                dt = datetime.fromtimestamp(mtime)
                return dt.isoformat()
    except Exception:
        pass
    
    # 如果都失败，返回当前时间
    return datetime.now().isoformat()

@bp.route('/stats', methods=['GET'])
def get_stats():
    """获取网站统计信息"""
    try:
        last_update = get_last_update_time()
        
        return jsonify({
            'errno': 0,
            'data': {
                'last_update': last_update
            }
        })
    except Exception as e:
        return jsonify({
            'errno': 1,
            'errmsg': f'获取统计信息失败: {str(e)}'
        }), 500
