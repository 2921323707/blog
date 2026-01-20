import os
from datetime import datetime

from flask import Blueprint, jsonify, request

from .rag_store import load_rag_config, reindex_posts, retrieve, upsert_post, get_citation_detail

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
        top_k = max(1, int(cfg.retrieve_k))
        cand_k = max(top_k, int(cfg.retrieve_candidate_k))

        # 检索
        hits = retrieve(
            cfg,
            question,
            k=top_k,
            candidate_k=cand_k,
            max_distance=cfg.retrieve_max_distance,
            per_post_max=cfg.retrieve_per_post_max,
        )
        if not hits:
            now = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
            answer = f"我没在你的博客文章里检索到相关内容（时间：{now}）。你可以换个问法，或先调用API 重建索引。"
            return jsonify({'errno': 0, 'data': {'answer': answer, 'citations': []}})

        citations = []
        numbered_context = []
        total_ctx = 0
        idx = 0
        for h in hits:
            url = (h.get("url") or "").strip()
            post_id = (h.get("post_id") or "").strip()
            chunk = h.get("chunk")

            content = (h.get("content") or "").strip()
            if cfg.max_chunk_chars and len(content) > cfg.max_chunk_chars:
                content = content[: cfg.max_chunk_chars].rstrip() + "…"

            next_id = idx + 1
            block = f"[{next_id}] {h.get('title') or ''}\nURL: {url}\n内容：{content}"
            if cfg.max_context_chars and (total_ctx + len(block)) > cfg.max_context_chars:
                break

            idx = next_id
            citations.append({
                "id": idx,
                "title": h.get("title") or "",
                "url": url,
                "post_id": post_id,
                "chunk": chunk,
                "distance": h.get("distance"),
            })
            numbered_context.append(block)
            total_ctx += len(block)

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


@bp.route('/ai/mascot/debug_retrieve', methods=['POST'])
def mascot_debug_retrieve():
    """调试检索：返回命中的 chunks、距离等信息（不走大模型）"""
    try:
        if not request.is_json:
            return jsonify({'errno': 1, 'errmsg': '请求必须是 JSON 格式'}), 400
        data = request.json or {}
        query = (data.get('query') or '').strip()
        if not query:
            return jsonify({'errno': 1, 'errmsg': 'query 不能为空'}), 400
        cfg = load_rag_config()
        k = int(data.get("k") or cfg.retrieve_k)
        cand_k = int(data.get("candidate_k") or cfg.retrieve_candidate_k)
        hits = retrieve(
            cfg,
            query,
            k=max(1, k),
            candidate_k=max(1, cand_k),
            max_distance=cfg.retrieve_max_distance,
            per_post_max=cfg.retrieve_per_post_max,
        )
        # 只返回必要字段，避免一次下发过大
        slim = [{
            "title": h.get("title"),
            "url": h.get("url"),
            "post_id": h.get("post_id"),
            "chunk": h.get("chunk"),
            "distance": h.get("distance"),
            "snippet": h.get("snippet"),
        } for h in hits]
        return jsonify({'errno': 0, 'data': {'query': query, 'hits': slim}})
    except Exception as e:
        return jsonify({'errno': 1, 'errmsg': f'调试检索失败: {str(e)}'}), 500


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


@bp.route('/ai/mascot/citation_detail', methods=['GET'])
def mascot_citation_detail():
    """按需获取引用详情（snippet）"""
    try:
        post_id = (request.args.get("post_id") or "").strip()
        chunk = request.args.get("chunk")
        if not post_id or chunk is None:
            return jsonify({'errno': 1, 'errmsg': 'post_id / chunk 不能为空'}), 400
        info = get_citation_detail(post_id, int(chunk))
        return jsonify({'errno': 0, 'data': info})
    except Exception as e:
        return jsonify({'errno': 1, 'errmsg': f'获取引用详情失败: {str(e)}'}), 500

