import os
from datetime import datetime

from flask import Blueprint, jsonify, request

from .rag_store import load_rag_config, reindex_posts, retrieve

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
        top_k = int(data.get("top_k") or 5)

        # 检索
        hits = retrieve(cfg, question, k=top_k)
        if not hits:
            now = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
            answer = f"我没在你的博客文章里检索到相关内容（时间：{now}）。你可以换个问法，或先调用 /api/ai/mascot/reindex 重建索引。"
            return jsonify({'errno': 0, 'data': {'answer': answer, 'citations': []}})

        # 组织引用（去重：按 url 聚合）
        citations = []
        seen = set()
        numbered_context = []
        for h in hits:
            url = (h.get("url") or "").strip()
            if not url or url in seen:
                continue
            seen.add(url)
            idx = len(citations) + 1
            citations.append({
                "id": idx,
                "title": h.get("title") or "",
                "url": url,
                "snippet": h.get("snippet") or "",
                "source": h.get("source") or "",
            })
            numbered_context.append(f"[{idx}] {h.get('title') or ''}\nURL: {url}\n内容片段：{h.get('content') or ''}")

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
        system = (
            "你是博客 AI 助手。你必须基于给定的“引用资料”回答问题，"
            "并在关键结论处用 [编号] 标注引用来源。"
            "如果资料不足，请明确说明不足，不要编造。"
        )
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

