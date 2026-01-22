"""
又拍云存储 REST API 封装
实现对云存储的 CRUD 操作
参考文档: https://help.upyun.com/knowledge-base/rest_api/
"""

import os
import hashlib
import requests
from datetime import datetime
from urllib.parse import quote
from flask import Blueprint, request, jsonify, current_app, send_file
from pathlib import Path
from werkzeug.utils import secure_filename

bp = Blueprint('cloud_storage', __name__, url_prefix='/api/cloud')

# 又拍云配置
UPYUN_BUCKET = os.environ.get('UPYUN_BUCKET', '')
UPYUN_OPERATOR = os.environ.get('UPYUN_OPERATOR', '')
UPYUN_PASSWORD = os.environ.get('UPYUN_PASSWORD', '')
UPYUN_API_ENDPOINT = os.environ.get('UPYUN_API_ENDPOINT', 'v0.api.upyun.com')
UPYUN_PROTOCOL = os.environ.get('UPYUN_PROTOCOL', 'http')

# 允许的图片类型
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'bmp', 'ico'}

def allowed_file(filename):
    """检查文件扩展名是否允许"""
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def generate_signature(method, path, date, content_length, password):
    """
    生成又拍云 API 签名
    签名算法: MD5(METHOD&PATH&DATE&CONTENT-LENGTH&PASSWORD_MD5)
    """
    # 先对密码进行 MD5 加密
    password_md5 = hashlib.md5(password.encode('utf-8')).hexdigest()
    
    # 拼接签名字符串
    sign_str = f"{method}&{path}&{date}&{content_length}&{password_md5}"
    
    # 计算签名
    signature = hashlib.md5(sign_str.encode('utf-8')).hexdigest()
    
    return signature

def generate_auth_header(method, path, content_length=0):
    """
    生成 Authorization 请求头
    格式: UPYUN operator:signature
    """
    # 生成 GMT 格式日期
    date = datetime.utcnow().strftime('%a, %d %b %Y %H:%M:%S GMT')
    
    # 生成签名
    signature = generate_signature(method, path, date, str(content_length), UPYUN_PASSWORD)
    
    # 组合 Authorization 头
    auth_header = f"UPYUN {UPYUN_OPERATOR}:{signature}"
    
    return auth_header, date

def get_file_url(path):
    """获取文件的访问 URL"""
    return f"{UPYUN_PROTOCOL}://{UPYUN_BUCKET}.{UPYUN_API_ENDPOINT}/{path}"

def get_api_url(path):
    """获取 API 请求 URL"""
    return f"{UPYUN_PROTOCOL}://{UPYUN_API_ENDPOINT}/{UPYUN_BUCKET}/{path}"

def check_config():
    """检查又拍云配置是否完整"""
    if not UPYUN_BUCKET:
        raise ValueError('未配置又拍云 Bucket 名称，请设置环境变量 UPYUN_BUCKET')
    if not UPYUN_OPERATOR:
        raise ValueError('未配置又拍云操作员名称，请设置环境变量 UPYUN_OPERATOR')
    if not UPYUN_PASSWORD:
        raise ValueError('未配置又拍云操作员密码，请设置环境变量 UPYUN_PASSWORD')


# ==================== 文件上传相关 ====================

@bp.route('/upload', methods=['POST'])
def upload_file():
    """
    上传文件到又拍云存储
    
    支持参数:
    - file: 文件对象 (必选)
    - path: 存储路径，例如: images/test.jpg (可选，默认使用原始文件名)
    - content_type: 文件类型 (可选)
    - content_secret: 文件密钥，用于保护文件 (可选)
    """
    try:
        # 检查配置
        check_config()
        
        # 检查是否有文件
        if 'file' not in request.files:
            return jsonify({'errno': 1, 'errmsg': '没有文件'}), 400
        
        file = request.files['file']
        if file.filename == '':
            return jsonify({'errno': 1, 'errmsg': '文件名为空'}), 400
        
        # 获取存储路径
        path = request.form.get('path', file.filename).strip()
        if not path:
            return jsonify({'errno': 1, 'errmsg': '存储路径不能为空'}), 400
        
        # 安全处理文件名
        safe_path = secure_filename(path)
        if not safe_path:
            # 如果 secure_filename 返回空（例如中文文件名），使用时间戳
            ext = Path(file.filename).suffix if '.' in file.filename else ''
            safe_path = f"upload_{datetime.now().strftime('%Y%m%d_%H%M%S_%f')}{ext}"
        
        # 读取文件内容
        file_content = file.read()
        content_length = len(file_content)
        
        # 生成请求头
        auth_header, date = generate_auth_header('PUT', f'/{UPYUN_BUCKET}/{safe_path}', content_length)
        
        # 构建请求头
        headers = {
            'Authorization': auth_header,
            'Date': date,
            'Content-Length': str(content_length)
        }
        
        # 可选参数
        content_type = request.form.get('content_type')
        if content_type:
            headers['Content-Type'] = content_type
        
        content_secret = request.form.get('content_secret')
        if content_secret:
            headers['Content-Secret'] = content_secret
        
        # 发送 PUT 请求上传文件
        url = get_api_url(safe_path)
        response = requests.put(url, data=file_content, headers=headers)
        
        if response.status_code in [200, 201]:
            # 获取图片信息（如果是图片）
            result = {
                'errno': 0,
                'data': {
                    'path': safe_path,
                    'url': get_file_url(safe_path),
                    'size': content_length,
                    'message': '上传成功'
                }
            }
            
            # 如果返回头中有图片信息，添加到响应
            if 'x-upyun-width' in response.headers:
                result['data']['width'] = int(response.headers.get('x-upyun-width'))
                result['data']['height'] = int(response.headers.get('x-upyun-height'))
                result['data']['file_type'] = response.headers.get('x-upyun-file-type')
            
            return jsonify(result)
        else:
            return jsonify({
                'errno': 1,
                'errmsg': f'上传失败，HTTP {response.status_code}: {response.text}'
            }), response.status_code
    
    except ValueError as e:
        return jsonify({'errno': 1, 'errmsg': str(e)}), 500
    except Exception as e:
        import traceback
        error_detail = traceback.format_exc()
        current_app.logger.error(f'上传文件错误: {error_detail}')
        return jsonify({
            'errno': 1,
            'errmsg': f'上传失败: {str(e)}',
            'detail': error_detail if current_app.config.get('DEBUG') else None
        }), 500


@bp.route('/upload/multipart', methods=['POST'])
def upload_multipart_initiate():
    """
    初始化并行式断点续传任务
    
    支持参数:
    - path: 存储路径 (必选)
    - file_size: 文件大小，单位 Byte (必选)
    - part_size: 分块大小，1M整数倍，默认1M，最大50M (可选)
    - content_type: 文件类型 (可选)
    """
    try:
        check_config()
        
        path = request.json.get('path', '').strip()
        file_size = request.json.get('file_size')
        
        if not path:
            return jsonify({'errno': 1, 'errmsg': '存储路径不能为空'}), 400
        if not file_size:
            return jsonify({'errno': 1, 'errmsg': '文件大小不能为空'}), 400
        
        # 安全处理路径
        safe_path = secure_filename(path)
        
        # 生成请求头
        auth_header, date = generate_auth_header('PUT', f'/{UPYUN_BUCKET}/{safe_path}', 0)
        
        headers = {
            'Authorization': auth_header,
            'Date': date,
            'Content-Length': '0',
            'X-Upyun-Multi-Disorder': 'true',
            'X-Upyun-Multi-Stage': 'initiate',
            'X-Upyun-Multi-Length': str(file_size)
        }
        
        # 可选参数
        content_type = request.json.get('content_type')
        if content_type:
            headers['X-Upyun-Multi-Type'] = content_type
        
        part_size = request.json.get('part_size')
        if part_size:
            headers['X-Upyun-Multi-Part-Size'] = str(part_size)
        
        # 发送初始化请求
        url = get_api_url(safe_path)
        response = requests.put(url, headers=headers)
        
        if response.status_code == 204:
            uuid = response.headers.get('X-Upyun-Multi-Uuid')
            return jsonify({
                'errno': 0,
                'data': {
                    'uuid': uuid,
                    'path': safe_path,
                    'message': '初始化成功'
                }
            })
        else:
            return jsonify({
                'errno': 1,
                'errmsg': f'初始化失败，HTTP {response.status_code}: {response.text}'
            }), response.status_code
    
    except ValueError as e:
        return jsonify({'errno': 1, 'errmsg': str(e)}), 500
    except Exception as e:
        import traceback
        error_detail = traceback.format_exc()
        current_app.logger.error(f'初始化断点续传错误: {error_detail}')
        return jsonify({
            'errno': 1,
            'errmsg': f'初始化失败: {str(e)}',
            'detail': error_detail if current_app.config.get('DEBUG') else None
        }), 500


@bp.route('/upload/multipart/part', methods=['POST'])
def upload_multipart_part():
    """
    上传分块（并行式断点续传）
    
    支持参数:
    - path: 存储路径 (必选)
    - uuid: 任务标识 (必选)
    - part_id: 分块序号，从 0 开始 (必选)
    - part_data: 分块数据 (必选)
    """
    try:
        check_config()
        
        path = request.json.get('path', '').strip()
        uuid = request.json.get('uuid', '').strip()
        part_id = request.json.get('part_id')
        part_data = request.json.get('part_data')
        
        if not path or not uuid or part_id is None or not part_data:
            return jsonify({'errno': 1, 'errmsg': '参数不完整'}), 400
        
        # 安全处理路径
        safe_path = secure_filename(path)
        
        # 解码分块数据（假设是 base64 编码）
        import base64
        part_content = base64.b64decode(part_data)
        content_length = len(part_content)
        
        # 生成请求头
        auth_header, date = generate_auth_header('PUT', f'/{UPYUN_BUCKET}/{safe_path}', content_length)
        
        headers = {
            'Authorization': auth_header,
            'Date': date,
            'Content-Length': str(content_length),
            'X-Upyun-Multi-Stage': 'upload',
            'X-Upyun-Multi-Uuid': uuid,
            'X-Upyun-Part-Id': str(part_id)
        }
        
        # 发送分块上传请求
        url = get_api_url(safe_path)
        response = requests.put(url, data=part_content, headers=headers)
        
        if response.status_code == 204:
            return jsonify({
                'errno': 0,
                'data': {
                    'part_id': part_id,
                    'uuid': uuid,
                    'message': '分块上传成功'
                }
            })
        else:
            return jsonify({
                'errno': 1,
                'errmsg': f'分块上传失败，HTTP {response.status_code}: {response.text}'
            }), response.status_code
    
    except ValueError as e:
        return jsonify({'errno': 1, 'errmsg': str(e)}), 500
    except Exception as e:
        import traceback
        error_detail = traceback.format_exc()
        current_app.logger.error(f'上传分块错误: {error_detail}')
        return jsonify({
            'errno': 1,
            'errmsg': f'分块上传失败: {str(e)}',
            'detail': error_detail if current_app.config.get('DEBUG') else None
        }), 500


@bp.route('/upload/multipart/complete', methods=['POST'])
def upload_multipart_complete():
    """
    完成并行式断点续传任务
    
    支持参数:
    - path: 存储路径 (必选)
    - uuid: 任务标识 (必选)
    """
    try:
        check_config()
        
        path = request.json.get('path', '').strip()
        uuid = request.json.get('uuid', '').strip()
        
        if not path or not uuid:
            return jsonify({'errno': 1, 'errmsg': '参数不完整'}), 400
        
        # 安全处理路径
        safe_path = secure_filename(path)
        
        # 生成请求头
        auth_header, date = generate_auth_header('PUT', f'/{UPYUN_BUCKET}/{safe_path}', 0)
        
        headers = {
            'Authorization': auth_header,
            'Date': date,
            'Content-Length': '0',
            'X-Upyun-Multi-Stage': 'complete',
            'X-Upyun-Multi-Uuid': uuid
        }
        
        # 发送完成请求
        url = get_api_url(safe_path)
        response = requests.put(url, headers=headers)
        
        if response.status_code in [204, 201]:
            result = {
                'errno': 0,
                'data': {
                    'path': safe_path,
                    'url': get_file_url(safe_path),
                    'uuid': uuid,
                    'message': '上传完成'
                }
            }
            
            # 添加文件信息
            if 'X-Upyun-Multi-Length' in response.headers:
                result['data']['size'] = int(response.headers.get('X-Upyun-Multi-Length'))
            if 'X-Upyun-Multi-Type' in response.headers:
                result['data']['content_type'] = response.headers.get('X-Upyun-Multi-Type')
            
            return jsonify(result)
        else:
            return jsonify({
                'errno': 1,
                'errmsg': f'完成上传失败，HTTP {response.status_code}: {response.text}'
            }), response.status_code
    
    except ValueError as e:
        return jsonify({'errno': 1, 'errmsg': str(e)}), 500
    except Exception as e:
        import traceback
        error_detail = traceback.format_exc()
        current_app.logger.error(f'完成断点续传错误: {error_detail}')
        return jsonify({
            'errno': 1,
            'errmsg': f'完成上传失败: {str(e)}',
            'detail': error_detail if current_app.config.get('DEBUG') else None
        }), 500


# ==================== 文件下载相关 ====================

@bp.route('/download', methods=['GET'])
def download_file():
    """
    从又拍云下载文件
    
    支持参数:
    - path: 文件路径 (必选)
    - save_path: 本地保存路径 (可选，不指定则返回文件流)
    """
    try:
        check_config()
        
        path = request.args.get('path', '').strip()
        if not path:
            return jsonify({'errno': 1, 'errmsg': '文件路径不能为空'}), 400
        
        # 安全处理路径
        safe_path = secure_filename(path)
        
        # 生成请求头
        auth_header, date = generate_auth_header('GET', f'/{UPYUN_BUCKET}/{safe_path}', 0)
        
        headers = {
            'Authorization': auth_header,
            'Date': date
        }
        
        # 发送 GET 请求下载文件
        url = get_api_url(safe_path)
        response = requests.get(url, headers=headers, stream=True)
        
        if response.status_code == 200:
            # 获取文件名
            filename = Path(safe_path).name
            
            # 如果指定了保存路径，保存到本地
            save_path = request.args.get('save_path')
            if save_path:
                save_path = Path(save_path)
                save_path.parent.mkdir(parents=True, exist_ok=True)
                with open(save_path, 'wb') as f:
                    for chunk in response.iter_content(chunk_size=8192):
                        f.write(chunk)
                
                return jsonify({
                    'errno': 0,
                    'data': {
                        'path': str(save_path),
                        'message': '下载成功'
                    }
                })
            else:
                # 直接返回文件流
                from io import BytesIO
                file_obj = BytesIO(response.content)
                return send_file(
                    file_obj,
                    as_attachment=True,
                    download_name=filename
                )
        else:
            return jsonify({
                'errno': 1,
                'errmsg': f'下载失败，HTTP {response.status_code}: {response.text}'
            }), response.status_code
    
    except ValueError as e:
        return jsonify({'errno': 1, 'errmsg': str(e)}), 500
    except Exception as e:
        import traceback
        error_detail = traceback.format_exc()
        current_app.logger.error(f'下载文件错误: {error_detail}')
        return jsonify({
            'errno': 1,
            'errmsg': f'下载失败: {str(e)}',
            'detail': error_detail if current_app.config.get('DEBUG') else None
        }), 500


# ==================== 文件删除相关 ====================

@bp.route('/delete', methods=['DELETE'])
def delete_file():
    """
    从又拍云删除文件
    
    支持参数:
    - path: 文件路径 (必选)
    """
    try:
        check_config()
        
        path = request.args.get('path', '').strip()
        if not path:
            return jsonify({'errno': 1, 'errmsg': '文件路径不能为空'}), 400
        
        # 安全处理路径
        safe_path = secure_filename(path)
        
        # 生成请求头
        auth_header, date = generate_auth_header('DELETE', f'/{UPYUN_BUCKET}/{safe_path}', 0)
        
        headers = {
            'Authorization': auth_header,
            'Date': date
        }
        
        # 发送 DELETE 请求删除文件
        url = get_api_url(safe_path)
        response = requests.delete(url, headers=headers)
        
        if response.status_code == 200:
            return jsonify({
                'errno': 0,
                'data': {
                    'path': safe_path,
                    'message': '删除成功'
                }
            })
        else:
            return jsonify({
                'errno': 1,
                'errmsg': f'删除失败，HTTP {response.status_code}: {response.text}'
            }), response.status_code
    
    except ValueError as e:
        return jsonify({'errno': 1, 'errmsg': str(e)}), 500
    except Exception as e:
        import traceback
        error_detail = traceback.format_exc()
        current_app.logger.error(f'删除文件错误: {error_detail}')
        return jsonify({
            'errno': 1,
            'errmsg': f'删除失败: {str(e)}',
            'detail': error_detail if current_app.config.get('DEBUG') else None
        }), 500


# ==================== 文件信息相关 ====================

@bp.route('/info', methods=['GET'])
def get_file_info():
    """
    获取文件信息
    
    支持参数:
    - path: 文件路径 (必选)
    """
    try:
        check_config()
        
        path = request.args.get('path', '').strip()
        if not path:
            return jsonify({'errno': 1, 'errmsg': '文件路径不能为空'}), 400
        
        # 安全处理路径
        safe_path = secure_filename(path)
        
        # 生成请求头
        auth_header, date = generate_auth_header('HEAD', f'/{UPYUN_BUCKET}/{safe_path}', 0)
        
        headers = {
            'Authorization': auth_header,
            'Date': date
        }
        
        # 发送 HEAD 请求获取文件信息
        url = get_api_url(safe_path)
        response = requests.head(url, headers=headers)
        
        if response.status_code == 200:
            result = {
                'errno': 0,
                'data': {
                    'path': safe_path,
                    'file_type': response.headers.get('x-upyun-file-type'),
                    'size': int(response.headers.get('x-upyun-file-size', 0)),
                    'date': response.headers.get('x-upyun-file-date'),
                    'content_md5': response.headers.get('Content-Md5')
                }
            }
            return jsonify(result)
        else:
            return jsonify({
                'errno': 1,
                'errmsg': f'获取文件信息失败，HTTP {response.status_code}: {response.text}'
            }), response.status_code
    
    except ValueError as e:
        return jsonify({'errno': 1, 'errmsg': str(e)}), 500
    except Exception as e:
        import traceback
        error_detail = traceback.format_exc()
        current_app.logger.error(f'获取文件信息错误: {error_detail}')
        return jsonify({
            'errno': 1,
            'errmsg': f'获取文件信息失败: {str(e)}',
            'detail': error_detail if current_app.config.get('DEBUG') else None
        }), 500


# ==================== 目录操作相关 ====================

@bp.route('/folder/create', methods=['POST'])
def create_folder():
    """
    创建目录
    
    支持参数:
    - path: 目录路径 (必选)
    """
    try:
        check_config()
        
        path = request.json.get('path', '').strip()
        if not path:
            return jsonify({'errno': 1, 'errmsg': '目录路径不能为空'}), 400
        
        # 安全处理路径
        safe_path = secure_filename(path)
        
        # 生成请求头
        auth_header, date = generate_auth_header('POST', f'/{UPYUN_BUCKET}/{safe_path}', 0)
        
        headers = {
            'Authorization': auth_header,
            'Date': date,
            'folder': 'true'
        }
        
        # 发送 POST 请求创建目录
        url = get_api_url(safe_path)
        response = requests.post(url, headers=headers)
        
        if response.status_code == 200:
            return jsonify({
                'errno': 0,
                'data': {
                    'path': safe_path,
                    'message': '目录创建成功'
                }
            })
        else:
            return jsonify({
                'errno': 1,
                'errmsg': f'创建目录失败，HTTP {response.status_code}: {response.text}'
            }), response.status_code
    
    except ValueError as e:
        return jsonify({'errno': 1, 'errmsg': str(e)}), 500
    except Exception as e:
        import traceback
        error_detail = traceback.format_exc()
        current_app.logger.error(f'创建目录错误: {error_detail}')
        return jsonify({
            'errno': 1,
            'errmsg': f'创建目录失败: {str(e)}',
            'detail': error_detail if current_app.config.get('DEBUG') else None
        }), 500


@bp.route('/folder/delete', methods=['DELETE'])
def delete_folder():
    """
    删除目录（只能删除空目录）
    
    支持参数:
    - path: 目录路径 (必选)
    """
    try:
        check_config()
        
        path = request.args.get('path', '').strip()
        if not path:
            return jsonify({'errno': 1, 'errmsg': '目录路径不能为空'}), 400
        
        # 安全处理路径
        safe_path = secure_filename(path)
        
        # 生成请求头
        auth_header, date = generate_auth_header('DELETE', f'/{UPYUN_BUCKET}/{safe_path}', 0)
        
        headers = {
            'Authorization': auth_header,
            'Date': date
        }
        
        # 发送 DELETE 请求删除目录
        url = get_api_url(safe_path)
        response = requests.delete(url, headers=headers)
        
        if response.status_code == 200:
            return jsonify({
                'errno': 0,
                'data': {
                    'path': safe_path,
                    'message': '目录删除成功'
                }
            })
        else:
            return jsonify({
                'errno': 1,
                'errmsg': f'删除目录失败，HTTP {response.status_code}: {response.text}'
            }), response.status_code
    
    except ValueError as e:
        return jsonify({'errno': 1, 'errmsg': str(e)}), 500
    except Exception as e:
        import traceback
        error_detail = traceback.format_exc()
        current_app.logger.error(f'删除目录错误: {error_detail}')
        return jsonify({
            'errno': 1,
            'errmsg': f'删除目录失败: {str(e)}',
            'detail': error_detail if current_app.config.get('DEBUG') else None
        }), 500


@bp.route('/folder/list', methods=['GET'])
def list_folder():
    """
    获取目录文件列表
    
    支持参数:
    - path: 目录路径 (可选，默认为根目录)
    - limit: 获取文件数量，默认100，最大10000 (可选)
    - order: 排序方式，asc 或 desc (可选)
    - iter: 分页开始位置 (可选)
    """
    try:
        check_config()
        
        path = request.args.get('path', '').strip()
        limit = request.args.get('limit', '100')
        order = request.args.get('order', 'asc')
        iter_param = request.args.get('iter', '')
        
        # 安全处理路径
        safe_path = secure_filename(path) if path else ''
        
        # 生成请求头
        auth_header, date = generate_auth_header('GET', f'/{UPYUN_BUCKET}/{safe_path}', 0)
        
        headers = {
            'Authorization': auth_header,
            'Date': date,
            'Accept': 'application/json'
        }
        
        # 添加可选参数
        if limit:
            headers['x-list-limit'] = limit
        if order:
            headers['x-list-order'] = order
        if iter_param:
            headers['x-list-iter'] = iter_param
        
        # 发送 GET 请求获取目录列表
        url = get_api_url(safe_path)
        response = requests.get(url, headers=headers)
        
        if response.status_code == 200:
            data = response.json()
            return jsonify({
                'errno': 0,
                'data': {
                    'path': safe_path,
                    'files': data.get('files', []),
                    'iter': data.get('iter', '')
                }
            })
        else:
            return jsonify({
                'errno': 1,
                'errmsg': f'获取目录列表失败，HTTP {response.status_code}: {response.text}'
            }), response.status_code
    
    except ValueError as e:
        return jsonify({'errno': 1, 'errmsg': str(e)}), 500
    except Exception as e:
        import traceback
        error_detail = traceback.format_exc()
        current_app.logger.error(f'获取目录列表错误: {error_detail}')
        return jsonify({
            'errno': 1,
            'errmsg': f'获取目录列表失败: {str(e)}',
            'detail': error_detail if current_app.config.get('DEBUG') else None
        }), 500


# ==================== 文件复制/移动相关 ====================

@bp.route('/copy', methods=['PUT'])
def copy_file():
    """
    复制文件
    
    支持参数:
    - source: 源文件路径 (必选)
    - dest: 目标文件路径 (必选)
    """
    try:
        check_config()
        
        source = request.json.get('source', '').strip()
        dest = request.json.get('dest', '').strip()
        
        if not source or not dest:
            return jsonify({'errno': 1, 'errmsg': '源文件路径和目标路径不能为空'}), 400
        
        # 安全处理路径
        safe_source = secure_filename(source)
        safe_dest = secure_filename(dest)
        
        # 生成请求头
        auth_header, date = generate_auth_header('PUT', f'/{UPYUN_BUCKET}/{safe_dest}', 0)
        
        headers = {
            'Authorization': auth_header,
            'Date': date,
            'Content-Length': '0',
            'X-Upyun-Copy-Source': f'/{UPYUN_BUCKET}/{safe_source}'
        }
        
        # 发送 PUT 请求复制文件
        url = get_api_url(safe_dest)
        response = requests.put(url, headers=headers)
        
        if response.status_code == 200:
            return jsonify({
                'errno': 0,
                'data': {
                    'source': safe_source,
                    'dest': safe_dest,
                    'message': '文件复制成功'
                }
            })
        else:
            return jsonify({
                'errno': 1,
                'errmsg': f'复制文件失败，HTTP {response.status_code}: {response.text}'
            }), response.status_code
    
    except ValueError as e:
        return jsonify({'errno': 1, 'errmsg': str(e)}), 500
    except Exception as e:
        import traceback
        error_detail = traceback.format_exc()
        current_app.logger.error(f'复制文件错误: {error_detail}')
        return jsonify({
            'errno': 1,
            'errmsg': f'复制文件失败: {str(e)}',
            'detail': error_detail if current_app.config.get('DEBUG') else None
        }), 500


@bp.route('/move', methods=['PUT'])
def move_file():
    """
    移动文件
    
    支持参数:
    - source: 源文件路径 (必选)
    - dest: 目标文件路径 (必选)
    """
    try:
        check_config()
        
        source = request.json.get('source', '').strip()
        dest = request.json.get('dest', '').strip()
        
        if not source or not dest:
            return jsonify({'errno': 1, 'errmsg': '源文件路径和目标路径不能为空'}), 400
        
        # 安全处理路径
        safe_source = secure_filename(source)
        safe_dest = secure_filename(dest)
        
        # 生成请求头
        auth_header, date = generate_auth_header('PUT', f'/{UPYUN_BUCKET}/{safe_dest}', 0)
        
        headers = {
            'Authorization': auth_header,
            'Date': date,
            'Content-Length': '0',
            'X-Upyun-Move-Source': f'/{UPYUN_BUCKET}/{safe_source}'
        }
        
        # 发送 PUT 请求移动文件
        url = get_api_url(safe_dest)
        response = requests.put(url, headers=headers)
        
        if response.status_code == 200:
            return jsonify({
                'errno': 0,
                'data': {
                    'source': safe_source,
                    'dest': safe_dest,
                    'message': '文件移动成功'
                }
            })
        else:
            return jsonify({
                'errno': 1,
                'errmsg': f'移动文件失败，HTTP {response.status_code}: {response.text}'
            }), response.status_code
    
    except ValueError as e:
        return jsonify({'errno': 1, 'errmsg': str(e)}), 500
    except Exception as e:
        import traceback
        error_detail = traceback.format_exc()
        current_app.logger.error(f'移动文件错误: {error_detail}')
        return jsonify({
            'errno': 1,
            'errmsg': f'移动文件失败: {str(e)}',
            'detail': error_detail if current_app.config.get('DEBUG') else None
        }), 500


# ==================== Metadata 操作相关 ====================

@bp.route('/metadata', methods=['PATCH'])
def update_metadata():
    """
    修改文件元信息
    
    支持参数:
    - path: 文件路径 (必选)
    - option: 处理方式，merge(合并) / replace(替换) / delete(删除) (可选，默认 merge)
    - update_last_modified: 是否更新文件的 Last-Modified，true/false (可选)
    - 以及其他以 x-upyun-meta- 开头的元信息参数
    """
    try:
        check_config()
        
        path = request.json.get('path', '').strip()
        if not path:
            return jsonify({'errno': 1, 'errmsg': '文件路径不能为空'}), 400
        
        # 安全处理路径
        safe_path = secure_filename(path)
        
        # 构建查询参数
        params = {}
        option = request.json.get('option', 'merge')
        params['metadata'] = option
        
        update_last_modified = request.json.get('update_last_modified')
        if update_last_modified:
            params['update_last_modified'] = update_last_modified
        
        # 生成请求头
        auth_header, date = generate_auth_header('PATCH', f'/{UPYUN_BUCKET}/{safe_path}', 0)
        
        headers = {
            'Authorization': auth_header,
            'Date': date
        }
        
        # 添加元信息到请求头
        for key, value in request.json.items():
            if key.startswith('x-upyun-meta-'):
                headers[key] = value
        
        # 发送 PATCH 请求修改元信息
        url = get_api_url(safe_path)
        response = requests.patch(url, headers=headers, params=params)
        
        if response.status_code == 200:
            return jsonify({
                'errno': 0,
                'data': {
                    'path': safe_path,
                    'option': option,
                    'message': '元信息修改成功'
                }
            })
        else:
            return jsonify({
                'errno': 1,
                'errmsg': f'修改元信息失败，HTTP {response.status_code}: {response.text}'
            }), response.status_code
    
    except ValueError as e:
        return jsonify({'errno': 1, 'errmsg': str(e)}), 500
    except Exception as e:
        import traceback
        error_detail = traceback.format_exc()
        current_app.logger.error(f'修改元信息错误: {error_detail}')
        return jsonify({
            'errno': 1,
            'errmsg': f'修改元信息失败: {str(e)}',
            'detail': error_detail if current_app.config.get('DEBUG') else None
        }), 500


# ==================== 服务使用量相关 ====================

@bp.route('/usage', methods=['GET'])
def get_usage():
    """
    获取服务使用量
    """
    try:
        check_config()
        
        # 生成请求头
        auth_header, date = generate_auth_header('GET', f'/{UPYUN_BUCKET}/?usage', 0)
        
        headers = {
            'Authorization': auth_header,
            'Date': date
        }
        
        # 发送 GET 请求获取使用量
        url = f"{UPYUN_PROTOCOL}://{UPYUN_API_ENDPOINT}/{UPYUN_BUCKET}/?usage"
        response = requests.get(url, headers=headers)
        
        if response.status_code == 200:
            usage_bytes = int(response.text.strip())
            usage_mb = usage_bytes / 1024 / 1024
            usage_gb = usage_mb / 1024
            
            return jsonify({
                'errno': 0,
                'data': {
                    'bytes': usage_bytes,
                    'mb': round(usage_mb, 2),
                    'gb': round(usage_gb, 2)
                }
            })
        else:
            return jsonify({
                'errno': 1,
                'errmsg': f'获取使用量失败，HTTP {response.status_code}: {response.text}'
            }), response.status_code
    
    except ValueError as e:
        return jsonify({'errno': 1, 'errmsg': str(e)}), 500
    except Exception as e:
        import traceback
        error_detail = traceback.format_exc()
        current_app.logger.error(f'获取使用量错误: {error_detail}')
        return jsonify({
            'errno': 1,
            'errmsg': f'获取使用量失败: {str(e)}',
            'detail': error_detail if current_app.config.get('DEBUG') else None
        }), 500
