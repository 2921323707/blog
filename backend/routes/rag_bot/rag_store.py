import os
import re
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

import requests
import yaml
from dotenv import load_dotenv

import chromadb
from chromadb.utils import embedding_functions


@dataclass(frozen=True)
class RagConfig:
    blog_root: Path
    posts_dir: Path
    persist_dir: Path
    collection_name: str
    site_url: str
    permalink: str
    embed_provider: str  # zhipu | openai | local（不推荐）
    local_embed_model: str

    # 智谱 Embedding
    zhipu_api_key: str
    zhipu_embed_model: str
    zhipu_embed_dimensions: int
    zhipu_embed_base_url: str

    openai_api_key: str
    openai_embed_model: str
    openai_embed_base_url: str
    chat_provider: str  # deepseek | openai
    chat_base_url: str
    deepseek_api_key: str
    chat_model: str


class ZhipuEmbeddingFunction:
    """
    智谱 Embedding（Open BigModel）
    文档： https://docs.bigmodel.cn/api-reference/模型-api/文本嵌入
    - input 支持 string / string[]；embedding-3 数组最大 64 条
    - dimensions 建议 1024/2048（不要用 2）
    """

    def __init__(
        self,
        api_key: str,
        model: str = "embedding-3",
        dimensions: int = 1024,
        base_url: str = "https://open.bigmodel.cn/api/paas/v4/embeddings",
        timeout_seconds: int = 30,
    ) -> None:
        self.api_key = (api_key or "").strip()
        self.model = (model or "embedding-3").strip()
        self.dimensions = int(dimensions)
        self.base_url = (base_url or "").strip() or "https://open.bigmodel.cn/api/paas/v4/embeddings"
        self.timeout_seconds = int(timeout_seconds)

        if not self.api_key:
            raise ValueError("未配置 ZHIPU_API_KEY")
        if self.dimensions not in (256, 512, 1024, 2048):
            raise ValueError("zhipu embedding-3 的 dimensions 仅支持 256/512/1024/2048")

    def __call__(self, input: List[str]) -> List[List[float]]:
        texts = [str(x or "") for x in input]
        if not texts:
            return []

        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }

        batch_size = 64
        out: List[List[float]] = []
        for start in range(0, len(texts), batch_size):
            batch = texts[start : start + batch_size]
            payload: Dict[str, Any] = {
                "model": self.model,
                "input": batch if len(batch) > 1 else batch[0],
                "dimensions": self.dimensions,
            }

            resp = requests.post(self.base_url, json=payload, headers=headers, timeout=self.timeout_seconds)
            if resp.status_code != 200:
                raise RuntimeError(f"智谱 embeddings 请求失败（HTTP {resp.status_code}）：{resp.text[:400]}")

            data = resp.json()
            items = data.get("data") or []
            items = sorted(items, key=lambda x: int(x.get("index", 0)))
            embeds = [it.get("embedding") for it in items]
            if len(embeds) != len(batch):
                raise RuntimeError(f"智谱 embeddings 返回条数异常：期望 {len(batch)}，实际 {len(embeds)}")
            out.extend(embeds)

        return out


def _parse_front_matter(md: str) -> Tuple[Dict[str, Any], str]:
    """
    解析 Hexo markdown 的 front-matter。
    返回: (meta, body)
    """
    if not md.startswith("---"):
        return {}, md
    parts = md.split("---", 2)
    if len(parts) < 3:
        return {}, md
    raw = parts[1].strip()
    body = parts[2].lstrip("\r\n")
    try:
        meta = yaml.safe_load(raw) or {}
        if not isinstance(meta, dict):
            meta = {}
    except Exception:
        meta = {}
    return meta, body


def _parse_date(value: Any) -> Optional[datetime]:
    if not value:
        return None
    if isinstance(value, datetime):
        return value
    s = str(value).strip()
    if not s:
        return None
    # Hexo 常见格式：YYYY-MM-DD 或 YYYY-MM-DD HH:mm:ss
    for fmt in ("%Y-%m-%d %H:%M:%S", "%Y-%m-%d"):
        try:
            return datetime.strptime(s, fmt)
        except Exception:
            pass
    # 最后尝试 ISO
    try:
        return datetime.fromisoformat(s)
    except Exception:
        return None


def _normalize_url_join(site_url: str, path: str) -> str:
    site = (site_url or "").rstrip("/")
    p = (path or "").strip()
    if not p.startswith("/"):
        p = "/" + p
    return site + p


def _build_post_url(site_url: str, permalink: str, meta: Dict[str, Any], md_path: Path) -> str:
    # front-matter 里如果设置了 permalink，优先使用
    pm = (meta.get("permalink") or "").strip()
    if pm:
        # 可能是完整 URL，也可能是相对路径
        if re.match(r"^https?://", pm, re.I):
            return pm
        return _normalize_url_join(site_url, pm)

    dt = _parse_date(meta.get("date"))
    if not dt:
        dt = datetime.fromtimestamp(md_path.stat().st_mtime)

    title_token = md_path.stem  # Hexo 默认 new_post_name: :title.md
    # 根据 _config.yml: permalink: :year/:month/:day/:title/
    tpl = (permalink or ":year/:month/:day/:title/").strip()
    rel = tpl
    rel = rel.replace(":year", f"{dt.year:04d}")
    rel = rel.replace(":month", f"{dt.month:02d}")
    rel = rel.replace(":day", f"{dt.day:02d}")
    rel = rel.replace(":title", title_token)
    rel = rel.strip("/")
    return _normalize_url_join(site_url, "/" + rel + "/")


def _chunk_text(text: str, chunk_size: int = 900, overlap: int = 120) -> List[str]:
    """
    简单切块：尽量按段落拼接，超过 chunk_size 就切。
    """
    t = (text or "").strip()
    if not t:
        return []
    paras = [p.strip() for p in re.split(r"\n\s*\n", t) if p.strip()]
    chunks: List[str] = []
    buf = ""
    for p in paras:
        candidate = (buf + "\n\n" + p).strip() if buf else p
        if len(candidate) <= chunk_size:
            buf = candidate
            continue
        # buf 放不下了，先落盘
        if buf:
            chunks.append(buf)
        # 单段太长：按字符硬切
        if len(p) > chunk_size:
            start = 0
            while start < len(p):
                end = min(len(p), start + chunk_size)
                piece = p[start:end].strip()
                if piece:
                    chunks.append(piece)
                # 维持 overlap（避免死循环）
                start = end - overlap if overlap > 0 else end
                if start < 0:
                    start = 0
                if start >= end:
                    start = end
            buf = ""
        else:
            buf = p
    if buf:
        chunks.append(buf)

    # 轻微 overlap：把前一块尾部拼到后一块头部（字符级别）
    if overlap > 0 and len(chunks) >= 2:
        overlapped: List[str] = []
        prev_tail = ""
        for c in chunks:
            head = (prev_tail + c).strip() if prev_tail else c
            overlapped.append(head)
            prev_tail = c[-overlap:]
        return overlapped

    return chunks


def load_rag_config() -> RagConfig:
    load_dotenv()  # 允许使用 backend/.env

    blog_root = Path(__file__).parent.parent.parent.parent  # backend/routes/rag_bot -> blog root
    posts_dir = blog_root / "source" / "_posts"
    persist_dir = blog_root / "backend" / ".rag" / "chroma"
    persist_dir.mkdir(parents=True, exist_ok=True)

    hexo_cfg_path = blog_root / "_config.yml"
    site_url = ""
    permalink = ""
    if hexo_cfg_path.exists():
        try:
            cfg = yaml.safe_load(hexo_cfg_path.read_text(encoding="utf-8")) or {}
            if isinstance(cfg, dict):
                site_url = str(cfg.get("url") or "").strip()
                permalink = str(cfg.get("permalink") or "").strip()
        except Exception:
            pass

    embed_provider = (os.getenv("RAG_EMBED_PROVIDER") or "zhipu").strip().lower()
    if embed_provider not in ("zhipu", "openai", "local"):
        embed_provider = "zhipu"

    # 本地中文向量：默认 bge-small-zh，体积/效果比较均衡
    local_embed_model = (os.getenv("RAG_LOCAL_EMBED_MODEL") or "BAAI/bge-small-zh-v1.5").strip()

    # 智谱 embedding
    zhipu_api_key = (os.getenv("ZHIPU_API_KEY") or "").strip()
    zhipu_embed_model = (os.getenv("RAG_ZHIPU_EMBED_MODEL") or "embedding-3").strip()
    zhipu_embed_dimensions = int(os.getenv("RAG_ZHIPU_EMBED_DIM") or 1024)
    zhipu_embed_base_url = (os.getenv("RAG_ZHIPU_EMBED_URL") or "https://open.bigmodel.cn/api/paas/v4/embeddings").strip()

    openai_api_key = (os.getenv("OPENAI_API_KEY") or "").strip()
    openai_embed_model = (os.getenv("RAG_EMBED_MODEL") or "text-embedding-3-small").strip()
    openai_embed_base_url = (os.getenv("RAG_EMBED_BASE_URL") or "").strip()

    chat_provider = (os.getenv("RAG_CHAT_PROVIDER") or ("deepseek" if os.getenv("DEEPSEEK_API_KEY") else "openai")).strip().lower()
    if chat_provider not in ("deepseek", "openai"):
        chat_provider = "deepseek"

    chat_base_url = (os.getenv("RAG_CHAT_BASE_URL") or "https://api.deepseek.com").strip()
    deepseek_api_key = (os.getenv("DEEPSEEK_API_KEY") or "").strip()
    chat_model = (os.getenv("RAG_CHAT_MODEL") or ("deepseek-chat" if chat_provider == "deepseek" else "gpt-4o-mini")).strip()

    return RagConfig(
        blog_root=blog_root,
        posts_dir=posts_dir,
        persist_dir=persist_dir,
        collection_name="hexo_posts",
        site_url=site_url,
        permalink=permalink,
        embed_provider=embed_provider,
        local_embed_model=local_embed_model,
        zhipu_api_key=zhipu_api_key,
        zhipu_embed_model=zhipu_embed_model,
        zhipu_embed_dimensions=zhipu_embed_dimensions,
        zhipu_embed_base_url=zhipu_embed_base_url,
        openai_api_key=openai_api_key,
        openai_embed_model=openai_embed_model,
        openai_embed_base_url=openai_embed_base_url,
        chat_provider=chat_provider,
        chat_base_url=chat_base_url,
        deepseek_api_key=deepseek_api_key,
        chat_model=chat_model,
    )


def _get_collection(cfg: RagConfig):
    client = chromadb.PersistentClient(path=str(cfg.persist_dir))
    if cfg.embed_provider == "zhipu":
        ef = ZhipuEmbeddingFunction(
            api_key=cfg.zhipu_api_key,
            model=cfg.zhipu_embed_model,
            dimensions=cfg.zhipu_embed_dimensions,
            base_url=cfg.zhipu_embed_base_url,
        )
    elif cfg.embed_provider == "openai":
        if not cfg.openai_api_key:
            raise RuntimeError("RAG_EMBED_PROVIDER=openai 但未配置 OPENAI_API_KEY")
        ef = embedding_functions.OpenAIEmbeddingFunction(
            api_key=cfg.openai_api_key,
            model_name=cfg.openai_embed_model,
            api_base=cfg.openai_embed_base_url or None,
        )
    else:
        # 本地 embedding：2C2G 不推荐，且需要额外安装 torch/sentence-transformers
        try:
            ef = embedding_functions.SentenceTransformerEmbeddingFunction(
                model_name=cfg.local_embed_model
            )
        except Exception as e:
            raise RuntimeError(
                "当前选择了本地 embedding（RAG_EMBED_PROVIDER=local），但未安装本地向量依赖。"
                "在 2C2G 机器上建议改用远程 embedding：设置 RAG_EMBED_PROVIDER=zhipu 并配置 ZHIPU_API_KEY。"
                f" 原因：{e}"
            )
    col = client.get_or_create_collection(
        name=cfg.collection_name,
        embedding_function=ef,
        metadata={"hnsw:space": "cosine"},
    )
    return client, col


def reindex_posts(cfg: RagConfig) -> Dict[str, Any]:
    if not cfg.posts_dir.exists():
        raise RuntimeError(f"未找到文章目录：{cfg.posts_dir}")

    client, _ = _get_collection(cfg)
    # 重建：删掉旧 collection 再建
    try:
        client.delete_collection(cfg.collection_name)
    except Exception:
        pass
    client, col = _get_collection(cfg)

    md_files = sorted(cfg.posts_dir.glob("*.md"))
    total_chunks = 0

    ids: List[str] = []
    docs: List[str] = []
    metas: List[Dict[str, Any]] = []

    for md_path in md_files:
        raw = md_path.read_text(encoding="utf-8", errors="ignore")
        meta, body = _parse_front_matter(raw)

        title = str(meta.get("title") or md_path.stem).strip()
        url = _build_post_url(cfg.site_url, cfg.permalink, meta, md_path)
        dt = _parse_date(meta.get("date"))
        date_str = dt.strftime("%Y-%m-%d %H:%M:%S") if dt else str(meta.get("date") or "")

        chunks = _chunk_text(body)
        for i, chunk in enumerate(chunks):
            chunk_id = f"{md_path.stem}:::{i}"
            ids.append(chunk_id)
            docs.append(chunk)
            metas.append(
                {
                    "title": title,
                    "url": url,
                    "date": date_str,
                    "source": str(md_path.relative_to(cfg.blog_root)).replace("\\", "/"),
                    "chunk": i,
                }
            )
        total_chunks += len(chunks)

    if ids:
        # 批量写入
        col.add(ids=ids, documents=docs, metadatas=metas)

    return {
        "posts": len(md_files),
        "chunks": total_chunks,
        "persist_dir": str(cfg.persist_dir),
        "collection": cfg.collection_name,
    }


def retrieve(cfg: RagConfig, query: str, k: int = 5) -> List[Dict[str, Any]]:
    _, col = _get_collection(cfg)
    res = col.query(query_texts=[query], n_results=max(1, int(k)))
    docs = (res.get("documents") or [[]])[0]
    metas = (res.get("metadatas") or [[]])[0]
    dists = (res.get("distances") or [[]])[0]

    out: List[Dict[str, Any]] = []
    for doc, meta, dist in zip(docs, metas, dists):
        m = meta or {}
        out.append(
            {
                "title": m.get("title") or "",
                "url": m.get("url") or "",
                "date": m.get("date") or "",
                "source": m.get("source") or "",
                "chunk": m.get("chunk"),
                "snippet": (doc or "")[:280],
                "distance": dist,
                "content": doc or "",
            }
        )
    return out

