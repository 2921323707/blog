# 代理 Lolicon API，避免前端 CORS 无法直连
from flask import Blueprint, jsonify
import requests

bp = Blueprint('setu', __name__)
LOLICON_API = 'https://api.lolicon.app/setu/v2'

# Banner 盒子约 16:10 横版，只选宽>=高的横图，避免竖图被裁切不完整
MIN_RATIO = 1.0   # 宽/高 >= 1 即横图或方图
NUM_REQUEST = 8   # 一次请求多张，从中筛横图


def _pick_landscape(items):
    """从返回列表中优先选横图（宽>=高），否则选比例最接近横的"""
    if not items:
        return None
    landscape = [x for x in items if (x.get('width') or 0) >= (x.get('height') or 1)]
    if landscape:
        return landscape[0]
    # 没有横图时选宽高比最大的（最接近横图）
    items_with_ratio = [(x, (x.get('width') or 1) / (x.get('height') or 1)) for x in items]
    items_with_ratio.sort(key=lambda t: t[1], reverse=True)
    return items_with_ratio[0][0] if items_with_ratio else None


@bp.route('/setu')
def get_setu():
    """代理请求 Lolicon，只返回与盒子比例匹配的横屏图（萌娘/少女 tag）"""
    try:
        params = {
            'size': 'regular',
            'r18': 0,
            'tag': '少女',
            'num': NUM_REQUEST,
        }
        r = requests.get(LOLICON_API, params=params, timeout=12)
        r.raise_for_status()
        data = r.json()
        items = (data or {}).get('data') or []
        chosen = _pick_landscape(items)
        if not chosen:
            return jsonify({'error': 'no image'}), 502
        url = chosen.get('urls', {}).get('regular')
        if url:
            return jsonify({'url': url})
        return jsonify({'error': 'no url'}), 502
    except Exception as e:
        return jsonify({'error': str(e)}), 502
