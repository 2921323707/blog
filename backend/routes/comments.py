from flask import Blueprint, request, jsonify
from models import db, Comment
import uuid

bp = Blueprint('comments', __name__)

@bp.route('/comments', methods=['GET'])
def get_comments():
    """获取评论列表"""
    url = request.args.get('url')
    if not url:
        return jsonify({'errno': 1, 'errmsg': '缺少url参数'}), 400
    
    comments = Comment.query.filter_by(url=url).order_by(Comment.created.asc()).all()
    result = [c.to_dict() for c in comments]
    return jsonify({'errno': 0, 'data': result})

@bp.route('/comments', methods=['POST'])
def create_comment():
    """创建评论"""
    data = request.json
    required = ['url', 'nick', 'comment']
    if not all(k in data for k in required):
        return jsonify({'errno': 1, 'errmsg': '缺少必需参数'}), 400
    
    comment = Comment(
        id=str(uuid.uuid4()),
        url=data['url'],
        nick=data['nick'],
        mail=data.get('mail', ''),
        link=data.get('link', ''),
        comment=data['comment'],
        ua=request.headers.get('User-Agent', ''),
        ip=request.remote_addr,
        pid=data.get('pid')
    )
    
    db.session.add(comment)
    db.session.commit()
    return jsonify({'errno': 0, 'data': comment.to_dict()})

@bp.route('/comments/count', methods=['POST'])
def get_comments_count():
    """获取评论数量"""
    data = request.json
    urls = data.get('urls', [])
    include_reply = data.get('includeReply', False)
    
    result = []
    for url in urls:
        query = Comment.query.filter_by(url=url)
        if not include_reply:
            query = query.filter_by(pid=None)
        count = query.count()
        result.append({'url': url, 'count': count})
    
    return jsonify({'errno': 0, 'data': result})

@bp.route('/comments/recent', methods=['GET'])
def get_recent_comments():
    """获取最近评论"""
    page_size = request.args.get('pageSize', 10, type=int)
    include_reply = request.args.get('includeReply', 'true').lower() == 'true'
    
    query = Comment.query
    if not include_reply:
        query = query.filter_by(pid=None)
    comments = query.order_by(Comment.created.desc()).limit(page_size).all()
    
    result = [c.to_dict() for c in comments]
    return jsonify({'errno': 0, 'data': result})
