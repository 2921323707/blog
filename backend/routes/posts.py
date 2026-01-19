from flask import Blueprint, request, jsonify, current_app
from pathlib import Path
from datetime import datetime
import os
import re
import subprocess
import threading
from werkzeug.utils import secure_filename

from .rag_bot.rag_store import upsert_post

bp = Blueprint('posts', __name__)

# 项目根目录路径
BASE_DIR = Path(__file__).parent.parent.parent
POSTS_DIR = BASE_DIR / "source" / "_posts"
IMAGES_DIR = BASE_DIR / "source" / "img"
COVERS_DIR = IMAGES_DIR / "covers"  # 封面图片目录
CONTENT_IMAGES_DIR = IMAGES_DIR / "content"  # 内容图片目录
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'}

def allowed_file(filename):
    """检查文件扩展名是否允许"""
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def generate_front_matter(title, date, tags, categories, cover=None):
    """生成 Hexo front-matter"""
    front_matter = "---\n"
    front_matter += f"title: {title}\n"
    front_matter += f"date: {date}\n"
    
    if cover:
        front_matter += f"cover: {cover}\n"
    
    if tags:
        front_matter += "tags:\n"
        for tag in tags:
            front_matter += f"  - {tag}\n"
    
    if categories:
        front_matter += "categories:\n"
        for cat in categories:
            front_matter += f"  - {cat}\n"
    
    front_matter += "---"
    return front_matter

def process_images_in_markdown(content):
    """处理 markdown 中的图片
    支持 base64 图片自动转换和上传
    """
    # 匹配 base64 图片: ![alt](data:image/...;base64,...)
    base64_pattern = r'!\[([^\]]*)\]\(data:image/([^;]+);base64,([^\)]+)\)'
    
    def replace_base64(match):
        alt_text = match.group(1)
        image_type = match.group(2)
        base64_data = match.group(3)
        
        # 这里可以添加 base64 转文件的功能
        # 暂时保留原样，或者可以保存为文件
        # 为了简化，先返回原格式
        return match.group(0)
    
    # 暂时不处理 base64，直接返回
    # content = re.sub(base64_pattern, replace_base64, content)
    
    return content

@bp.route('/posts/submit', methods=['POST'])
def submit_post():
    """提交文章"""
    try:
        if not request.is_json:
            return jsonify({'errno': 1, 'errmsg': '请求必须是 JSON 格式'}), 400
        
        data = request.json
        if not data:
            return jsonify({'errno': 1, 'errmsg': '请求数据为空'}), 400
        title = data.get('title', '').strip()
        content = data.get('content', '').strip()
        tags = data.get('tags', []) or []
        categories = data.get('categories', []) or []
        cover = data.get('cover', '').strip() or None
        date = data.get('date', datetime.now().strftime('%Y-%m-%d'))
        
        # 确保 tags 和 categories 是列表类型
        if not isinstance(tags, list):
            tags = [tags] if tags else []
        if not isinstance(categories, list):
            categories = [categories] if categories else []
        
        # 过滤空值
        tags = [t for t in tags if t and str(t).strip()]
        categories = [c for c in categories if c and str(c).strip()]
        
        if not title:
            return jsonify({'errno': 1, 'errmsg': '标题不能为空'}), 400
        
        if not content:
            return jsonify({'errno': 1, 'errmsg': '内容不能为空'}), 400
        
        # 处理 markdown 中的图片引用
        # 如果内容中有 base64 图片，需要先处理
        content = process_images_in_markdown(content)
        
        # 生成 front-matter
        front_matter = generate_front_matter(title, date, tags, categories, cover)
        
        # 生成完整的文章内容
        post_content = front_matter + "\n\n" + content
        
        # 保存文章文件 - 使用安全的文件名
        safe_title = secure_filename(title)
        if not safe_title:
            safe_title = f"post_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
        filename = f"{safe_title}.md"
        filepath = POSTS_DIR / filename
        
        # 确保目录存在
        POSTS_DIR.mkdir(parents=True, exist_ok=True)
        
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(post_content)
        
        # 自动生成静态文件（可选，失败不影响文章保存）
        generate_warning = None
        original_dir = None
        try:
            original_dir = os.getcwd()
            # Windows 上需要使用 shell=True，并且使用完整命令
            import platform
            if platform.system() == 'Windows':
                # Windows 上使用 cmd /c
                cmd = 'npx hexo generate'
            else:
                cmd = ['npx', 'hexo', 'generate']
            
            result = subprocess.run(
                cmd, 
                check=False, 
                capture_output=True, 
                text=True,
                shell=(platform.system() == 'Windows'),
                timeout=60,
                cwd=str(BASE_DIR)
            )
            
            if result.returncode != 0:
                error_msg = result.stderr if result.stderr else result.stdout
                generate_warning = f'生成静态文件失败: {error_msg[:200] if error_msg else "未知错误"}'
        except subprocess.TimeoutExpired:
            generate_warning = '生成静态文件超时（超过60秒）'
        except Exception as e:
            generate_warning = f'生成静态文件失败: {str(e)[:200]}'
        finally:
            if original_dir:
                try:
                    os.chdir(original_dir)
                except:
                    pass
        
        response_data = {
            'errno': 0, 
            'data': {
                'filename': filename,
                'message': '文章提交成功' + ('并已生成静态文件' if not generate_warning else '')
            }
        }
        if generate_warning:
            response_data['warning'] = generate_warning

        # 增量入库：单篇文章 embedding + 写入 Chroma（后台线程，不阻塞提交）
        def _index_job(path_str: str):
            try:
                upsert_post(path_str)
            except Exception as e:
                # 不影响发文；仅打印日志便于排查
                print(f"RAG 增量入库失败: {e}")

        try:
            threading.Thread(target=_index_job, args=(str(filepath),), daemon=True).start()
            response_data['data']['rag_index'] = 'queued'
        except Exception as e:
            response_data['data']['rag_index'] = f'failed_to_queue: {str(e)[:120]}'
        
        return jsonify(response_data)
        
    except Exception as e:
        import traceback
        error_detail = traceback.format_exc()
        print(f"提交文章错误: {error_detail}")  # 打印到控制台便于调试
        return jsonify({
            'errno': 1, 
            'errmsg': f'提交失败: {str(e)}',
            'detail': error_detail if current_app.config.get('DEBUG') else None
        }), 500

@bp.route('/posts/list', methods=['GET'])
def list_posts():
    """获取文章列表"""
    try:
        posts = []
        if POSTS_DIR.exists():
            for file in POSTS_DIR.glob('*.md'):
                with open(file, 'r', encoding='utf-8') as f:
                    content = f.read()
                    # 简单解析 front-matter
                    if content.startswith('---'):
                        parts = content.split('---', 2)
                        if len(parts) >= 3:
                            front_matter = parts[1]
                            # 提取标题
                            title_match = re.search(r'title:\s*(.+)', front_matter)
                            title = title_match.group(1).strip() if title_match else file.stem
                            
                            # 提取日期
                            date_match = re.search(r'date:\s*(.+)', front_matter)
                            date = date_match.group(1).strip() if date_match else ''
                            
                            posts.append({
                                'filename': file.name,
                                'title': title,
                                'date': date,
                                'size': file.stat().st_size
                            })
        
        posts.sort(key=lambda x: x['date'], reverse=True)
        return jsonify({'errno': 0, 'data': posts})
    except Exception as e:
        return jsonify({'errno': 1, 'errmsg': f'获取列表失败: {str(e)}'}), 500

@bp.route('/posts/upload-image', methods=['POST'])
def upload_image():
    """上传图片
    支持通过 type 参数区分封面图片和内容图片：
    - type=cover: 上传到 /img/covers/ 目录
    - type=content 或未指定: 上传到 /img/content/ 目录
    """
    if 'file' not in request.files:
        return jsonify({'errno': 1, 'errmsg': '没有文件'}), 400
    
    file = request.files['file']
    if file.filename == '':
        return jsonify({'errno': 1, 'errmsg': '文件名为空'}), 400
    
    # 获取图片类型（cover 或 content）
    image_type = request.form.get('type', 'content').lower()
    if image_type not in ['cover', 'content']:
        image_type = 'content'
    
    if file and allowed_file(file.filename):
        filename = secure_filename(file.filename)
        # 添加时间戳避免重名
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        name, ext = os.path.splitext(filename)
        filename = f"{name}_{timestamp}{ext}"
        
        # 根据类型选择存储目录
        if image_type == 'cover':
            target_dir = COVERS_DIR
            image_url = f"/img/covers/{filename}"
        else:
            target_dir = CONTENT_IMAGES_DIR
            image_url = f"/img/content/{filename}"
        
        # 确保目录存在
        target_dir.mkdir(parents=True, exist_ok=True)
        filepath = target_dir / filename
        file.save(str(filepath))
        
        # 返回相对路径
        return jsonify({'errno': 0, 'data': {'url': image_url, 'filename': filename}})
    
    return jsonify({'errno': 1, 'errmsg': '不支持的文件类型'}), 400
