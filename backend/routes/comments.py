from flask import Blueprint, request, jsonify
from models import db, Comment
from datetime import datetime
import uuid

bp = Blueprint('comments', __name__)

@bp.route('/comments', methods=['GET'])
def get_comments():
    """获取评论列表"""
    try:
        url = request.args.get('url')
        if not url:
            return jsonify({'errno': 1, 'errmsg': '缺少 url 参数'}), 400
        
        comments = Comment.query.filter_by(url=url).order_by(Comment.created.desc()).all()
        return jsonify({
            'errno': 0,
            'data': [comment.to_dict() for comment in comments]
        })
    except Exception as e:
        return jsonify({'errno': 1, 'errmsg': f'获取评论失败: {str(e)}'}), 500

@bp.route('/comments', methods=['POST'])
def add_comment():
    """添加评论"""
    try:
        if not request.is_json:
            return jsonify({'errno': 1, 'errmsg': '请求必须是 JSON 格式'}), 400
        
        data = request.json
        url = data.get('url', '').strip()
        nick = data.get('nick', '').strip()
        comment = data.get('comment', '').strip()
        
        if not url:
            return jsonify({'errno': 1, 'errmsg': 'url 不能为空'}), 400
        if not nick:
            return jsonify({'errno': 1, 'errmsg': '昵称不能为空'}), 400
        if not comment:
            return jsonify({'errno': 1, 'errmsg': '评论内容不能为空'}), 400
        
        new_comment = Comment(
            id=str(uuid.uuid4()),
            url=url,
            nick=nick,
            mail=data.get('mail', '').strip() or None,
            link=data.get('link', '').strip() or None,
            comment=comment,
            ua=request.headers.get('User-Agent', ''),
            ip=request.remote_addr,
            pid=data.get('pid') or None
        )
        
        db.session.add(new_comment)
        db.session.commit()
        
        return jsonify({
            'errno': 0,
            'data': new_comment.to_dict()
        })
    except Exception as e:
        db.session.rollback()
        return jsonify({'errno': 1, 'errmsg': f'添加评论失败: {str(e)}'}), 500

@bp.route('/comments/<comment_id>', methods=['DELETE'])
def delete_comment(comment_id):
    """删除评论"""
    try:
        comment = Comment.query.get(comment_id)
        if not comment:
            return jsonify({'errno': 1, 'errmsg': '评论不存在'}), 404
        
        db.session.delete(comment)
        db.session.commit()
        
        return jsonify({'errno': 0, 'data': {'message': '删除成功'}})
    except Exception as e:
        db.session.rollback()
        return jsonify({'errno': 1, 'errmsg': f'删除评论失败: {str(e)}'}), 500
