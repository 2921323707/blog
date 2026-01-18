from flask import Blueprint, request, jsonify
from datetime import datetime

bp = Blueprint('rag_bot', __name__)


@bp.route('/ai/mascot/chat', methods=['POST'])
def mascot_chat():
    """看板娘聊天（MVP：先返回固定内容，后续再接入向量检索/LLM）"""
    try:
        if not request.is_json:
            return jsonify({'errno': 1, 'errmsg': '请求必须是 JSON 格式'}), 400

        data = request.json or {}
        question = (data.get('question') or '').strip()
        if not question:
            return jsonify({'errno': 1, 'errmsg': 'question 不能为空'}), 400

        now = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        answer = (
            f"（MVP 演示）我收到了你的问题：{question}\n"
            f"当前时间：{now}\n"
            "下一步我们会把这里替换成：向量检索（RAG）+ 引用来源。"
        )

        return jsonify({
            'errno': 0,
            'data': {
                'answer': answer,
                'citations': []
            }
        })
    except Exception as e:
        return jsonify({'errno': 1, 'errmsg': f'AI 服务异常: {str(e)}'}), 500

