import os
from datetime import datetime

from flask import Blueprint, jsonify, request

from .rag_store import load_rag_config, reindex_posts, retrieve, upsert_post

bp = Blueprint('rag_bot', __name__)


@bp.route('/ai/mascot/chat', methods=['POST'])
def mascot_chat():
    """看板娘聊天（RAG：向量检索 + 引用来源）"""
    try:
        if not request.is_json:
            return jsonify({'errno': 1, 'errmsg': '请求必须是 JSON 格式'}), 400

        data = request.json or {}
        question = (data.get('question') or '').strip()
        if not question:
            return jsonify({'errno': 1, 'errmsg': 'question 不能为空'}), 400

        cfg = load_rag_config()
        # 只取最匹配的一条，保证“引用来源”与回答一致
        top_k = 1

        # 检索
        hits = retrieve(cfg, question, k=top_k)
        if not hits:
            now = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
            answer = f"我没在你的博客文章里检索到相关内容（时间：{now}）。你可以换个问法，或先调用 /api/ai/mascot/reindex 重建索引。"
            return jsonify({'errno': 0, 'data': {'answer': answer, 'citations': []}})

        # 只保留 Top1 引用
        h = hits[0]
        url = (h.get("url") or "").strip()
        citations = [{
            "id": 1,
            "title": h.get("title") or "",
            "url": url,
            "snippet": h.get("snippet") or "",
            "source": h.get("source") or "",
        }] if url else []

        numbered_context = []
        if url:
            numbered_context.append(f"[1] {h.get('title') or ''}\nURL: {url}\n内容片段：{h.get('content') or ''}")

        # 生成回答（DeepSeek / OpenAI，均为 OpenAI SDK 调用方式）
        from openai import OpenAI

        if cfg.chat_provider == "deepseek":
            if not cfg.deepseek_api_key:
                return jsonify({
                    'errno': 1,
                    'errmsg': '未配置 DEEPSEEK_API_KEY。请在 backend/.env 中设置 DEEPSEEK_API_KEY=xxx'
                }), 500
            client = OpenAI(api_key=cfg.deepseek_api_key, base_url=cfg.chat_base_url)
        else:
            if not cfg.openai_api_key:
                return jsonify({
                    'errno': 1,
                    'errmsg': 'RAG_CHAT_PROVIDER=openai 但未配置 OPENAI_API_KEY。'
                }), 500
            client = OpenAI(api_key=cfg.openai_api_key)
        system = cfg.chat_system_prompt
        user = (
            f"问题：{question}\n\n"
            f"引用资料（可引用编号）：\n\n" + "\n\n".join(numbered_context)
        )

        resp = client.chat.completions.create(
            model=cfg.chat_model,
            messages=[
                {"role": "system", "content": system},
                {"role": "user", "content": user},
            ],
            temperature=0.2,
        )
        answer = (resp.choices[0].message.content or "").strip()

        return jsonify({
            'errno': 0,
            'data': {
                'answer': answer or '（没有返回内容）',
                'citations': citations
            }
        })
    except Exception as e:
        return jsonify({'errno': 1, 'errmsg': f'AI 服务异常: {str(e)}'}), 500


@bp.route('/ai/mascot/reindex', methods=['POST'])
def mascot_reindex():
    """重建向量索引（从 source/_posts 全量入库到 Chroma）"""
    try:
        cfg = load_rag_config()
        info = reindex_posts(cfg)
        return jsonify({'errno': 0, 'data': info})
    except Exception as e:
        return jsonify({'errno': 1, 'errmsg': f'建库失败: {str(e)}'}), 500


@bp.route('/ai/mascot/index_post', methods=['POST'])
def mascot_index_post():
    """增量入库单篇文章（供后台/管理端调用）"""
    try:
        if not request.is_json:
            return jsonify({'errno': 1, 'errmsg': '请求必须是 JSON 格式'}), 400
        data = request.json or {}
        post_path = (data.get("post_path") or "").strip()
        if not post_path:
            return jsonify({'errno': 1, 'errmsg': 'post_path 不能为空'}), 400
        info = upsert_post(post_path)
        return jsonify({'errno': 0, 'data': info})
    except Exception as e:
        return jsonify({'errno': 1, 'errmsg': f'增量入库失败: {str(e)}'}), 500

