import os
import re
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

import requests
import yaml
from dotenv import load_dotenv

# 关闭 Chroma 匿名遥测：云端常见因依赖不一致导致 telemetry 报错刷屏
# 必须在 import chromadb 之前设置
os.environ.setdefault("ANONYMIZED_TELEMETRY", "False")

import chromadb
from chromadb.utils import embedding_functions

from .prompt import get_system_prompt


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

    # 切分/检索参数（通过环境变量可调）
    chunk_size: int
    chunk_overlap: int
    posts_recursive: bool
    include_title_in_chunks: bool

    retrieve_k: int
    retrieve_candidate_k: int
    retrieve_max_distance: Optional[float]
    retrieve_per_post_max: int
    max_context_chars: int
    max_chunk_chars: int

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
    chat_system_prompt: str


class ZhipuEmbeddingFunction:
    """
    智谱 Embedding（Open BigModel）
    文档： https://docs.bigmodel.cn/api-reference/模型-api/文本嵌入
    - input 支持 string / string[]；embedding-3 数组最大 64 条
    - dimensions 建议 1024/2048（不要用 2）
    """

    def __init__(
        self,
        api_key: Optional[str] = None,
        model: str = "embedding-3",
        dimensions: int = 1024,
        base_url: str = "https://open.bigmodel.cn/api/paas/v4/embeddings",
        timeout_seconds: int = 30,
        api_key_env_var: str = "ZHIPU_API_KEY",
    ) -> None:
        self.api_key_env_var = (api_key_env_var or "ZHIPU_API_KEY").strip()
        self.api_key = (api_key or os.getenv(self.api_key_env_var) or "").strip()
        self.model = (model or "embedding-3").strip()
        self.dimensions = int(dimensions)
        self.base_url = (base_url or "").strip() or "https://open.bigmodel.cn/api/paas/v4/embeddings"
        self.timeout_seconds = int(timeout_seconds)

        if not self.api_key:
            raise ValueError(f"未配置 {self.api_key_env_var}")
        if self.dimensions not in (256, 512, 1024, 2048):
            raise ValueError("zhipu embedding-3 的 dimensions 仅支持 256/512/1024/2048")

    @staticmethod
    def name() -> str:
        # 供 Chroma(>=1.x) 序列化/反序列化 embedding function 用
        return "zhipu_embedding_function"

    def default_space(self) -> str:
        return "cosine"

    def supported_spaces(self) -> List[str]:
        return ["cosine", "l2", "ip"]

    @staticmethod
    def build_from_config(config: Dict[str, Any]) -> "ZhipuEmbeddingFunction":
        # 注意：不建议把 api_key 持久化到磁盘；默认仅保存 env var 名称
        return ZhipuEmbeddingFunction(
            api_key=None,
            model=str(config.get("model") or "embedding-3"),
            dimensions=int(config.get("dimensions") or 1024),
            base_url=str(config.get("base_url") or "https://open.bigmodel.cn/api/paas/v4/embeddings"),
            timeout_seconds=int(config.get("timeout_seconds") or 30),
            api_key_env_var=str(config.get("api_key_env_var") or "ZHIPU_API_KEY"),
        )

    def get_config(self) -> Dict[str, Any]:
        # 避免泄露 key：只保存 env var 名称
        return {
            "api_key_env_var": self.api_key_env_var,
            "model": self.model,
            "dimensions": self.dimensions,
            "base_url": self.base_url,
            "timeout_seconds": self.timeout_seconds,
        }

    def embed_query(self, input: Any) -> List[List[float]]:
        # Chroma(>=1.x) query 路径会调用 embed_query
        return self.__call__(input)

    def __call__(self, input: Any) -> List[List[float]]:
        # 兼容 Chroma OneOrMany：可能传入 str 或 List[str]
        if input is None:
            return []
        if isinstance(input, str):
            texts = [input]
        elif isinstance(input, (list, tuple)):
            texts = [str(x or "") for x in input]
        else:
            texts = [str(input)]
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
    blog_root = Path(__file__).parent.parent.parent.parent  # backend/routes/rag_bot -> blog root
    # 允许使用 blog_root/.env 以及 backend/.env
    load_dotenv(dotenv_path=blog_root / ".env")
    load_dotenv(dotenv_path=blog_root / "backend" / ".env")
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
    # 默认系统提示词从 prompt.py 读取；允许用环境变量覆盖（便于线上快速调参）
    chat_system_prompt = (os.getenv("RAG_CHAT_SYSTEM_PROMPT") or "").strip() or get_system_prompt()

    # 切分/检索参数
    chunk_size = int(os.getenv("RAG_CHUNK_SIZE") or 900)
    chunk_overlap = int(os.getenv("RAG_CHUNK_OVERLAP") or 120)
    posts_recursive = str(os.getenv("RAG_POSTS_RECURSIVE") or "1").strip().lower() not in ("0", "false", "no")
    include_title_in_chunks = str(os.getenv("RAG_INCLUDE_TITLE_IN_CHUNKS") or "1").strip().lower() not in ("0", "false", "no")

    retrieve_k = int(os.getenv("RAG_TOP_K") or 5)
    retrieve_candidate_k = int(os.getenv("RAG_CANDIDATE_K") or max(12, retrieve_k))
    max_dist_raw = (os.getenv("RAG_MAX_DISTANCE") or "").strip()
    retrieve_max_distance = float(max_dist_raw) if max_dist_raw else None
    retrieve_per_post_max = int(os.getenv("RAG_PER_POST_MAX") or 2)
    max_context_chars = int(os.getenv("RAG_MAX_CONTEXT_CHARS") or 6000)
    max_chunk_chars = int(os.getenv("RAG_MAX_CHUNK_CHARS") or 1400)

    return RagConfig(
        blog_root=blog_root,
        posts_dir=posts_dir,
        persist_dir=persist_dir,
        collection_name="hexo_posts",
        site_url=site_url,
        permalink=permalink,
        embed_provider=embed_provider,
        local_embed_model=local_embed_model,
        chunk_size=chunk_size,
        chunk_overlap=chunk_overlap,
        posts_recursive=posts_recursive,
        include_title_in_chunks=include_title_in_chunks,
        retrieve_k=retrieve_k,
        retrieve_candidate_k=retrieve_candidate_k,
        retrieve_max_distance=retrieve_max_distance,
        retrieve_per_post_max=retrieve_per_post_max,
        max_context_chars=max_context_chars,
        max_chunk_chars=max_chunk_chars,
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
        chat_system_prompt=chat_system_prompt,
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
    try:
        col = client.get_or_create_collection(
            name=cfg.collection_name,
            embedding_function=ef,
            metadata={"hnsw:space": "cosine"},
        )
    except ValueError as e:
        # Chroma(>=1.x)：如果 collection 已存在且 embedding_function 与持久化配置不一致，会直接报冲突
        # 对 blog 场景来说，索引可从 posts 目录重建，因此这里选择自动重置，避免服务直接不可用。
        msg = str(e)
        if "Embedding function conflict" in msg:
            try:
                client.delete_collection(cfg.collection_name)
            except Exception:
                pass
            col = client.get_or_create_collection(
                name=cfg.collection_name,
                embedding_function=ef,
                metadata={"hnsw:space": "cosine"},
            )
        else:
            raise
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

    # 兼容 _posts 子目录
    md_files = sorted(cfg.posts_dir.rglob("*.md") if cfg.posts_recursive else cfg.posts_dir.glob("*.md"))
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
        # 用相对路径保证唯一（支持 _posts 子目录）
        try:
            post_id = str(md_path.relative_to(cfg.posts_dir).with_suffix("")).replace("\\", "/")
        except Exception:
            post_id = md_path.stem  # 兜底

        tags = meta.get("tags")
        if isinstance(tags, (list, tuple)):
            tags_str = ", ".join([str(x).strip() for x in tags if str(x or "").strip()])
        else:
            tags_str = str(tags or "").strip()
        categories = meta.get("categories")
        if isinstance(categories, (list, tuple)):
            categories_str = ", ".join([str(x).strip() for x in categories if str(x or "").strip()])
        else:
            categories_str = str(categories or "").strip()

        chunks = _chunk_text(body, chunk_size=cfg.chunk_size, overlap=cfg.chunk_overlap)
        for i, chunk in enumerate(chunks):
            chunk_id = f"{post_id}:::{i}"
            doc = chunk
            # 将标题/标签/分类注入每个 chunk 的文档内容里（提升按标题/标签提问时的召回）
            if cfg.include_title_in_chunks:
                header_lines = [f"标题：{title}"]
                if tags_str:
                    header_lines.append(f"标签：{tags_str}")
                if categories_str:
                    header_lines.append(f"分类：{categories_str}")
                doc = "\n".join(header_lines) + "\n\n" + chunk
            ids.append(chunk_id)
            docs.append(doc)
            metas.append(
                {
                    "title": title,
                    "url": url,
                    "date": date_str,
                    "source": str(md_path.relative_to(cfg.blog_root)).replace("\\", "/"),
                    "post_id": post_id,
                    "chunk": i,
                    "tags": tags_str,
                    "categories": categories_str,
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


def upsert_post(post_path: str) -> Dict[str, Any]:
    """
    增量入库：只对单篇文章做 embedding 并写入向量库。
    - 先按 post_id 删除旧 chunks（同一文章更新时覆盖）
    - 再 add 新 chunks
    """
    cfg = load_rag_config()
    p = Path(post_path)
    if not p.exists():
        raise RuntimeError(f"文章文件不存在：{p}")
    if p.suffix.lower() != ".md":
        raise RuntimeError(f"仅支持 Markdown：{p}")

    _, col = _get_collection(cfg)

    raw = p.read_text(encoding="utf-8", errors="ignore")
    meta, body = _parse_front_matter(raw)

    title = str(meta.get("title") or p.stem).strip()
    url = _build_post_url(cfg.site_url, cfg.permalink, meta, p)
    dt = _parse_date(meta.get("date"))
    date_str = dt.strftime("%Y-%m-%d %H:%M:%S") if dt else str(meta.get("date") or "")
    try:
        post_id = str(p.relative_to(cfg.posts_dir).with_suffix("")).replace("\\", "/")
    except Exception:
        post_id = p.stem
    try:
        source = str(p.relative_to(cfg.blog_root)).replace("\\", "/")
    except Exception:
        source = str(p).replace("\\", "/")

    # 删除旧数据（同一 post_id）
    try:
        # Chroma where 语法要求显式操作符，避免云端版本差异导致解析失败
        col.delete(where={"post_id": {"$eq": post_id}})
    except Exception:
        # 不阻断（不同版本/权限可能不支持 where delete）
        pass

    tags = meta.get("tags")
    if isinstance(tags, (list, tuple)):
        tags_str = ", ".join([str(x).strip() for x in tags if str(x or "").strip()])
    else:
        tags_str = str(tags or "").strip()
    categories = meta.get("categories")
    if isinstance(categories, (list, tuple)):
        categories_str = ", ".join([str(x).strip() for x in categories if str(x or "").strip()])
    else:
        categories_str = str(categories or "").strip()

    chunks = _chunk_text(body, chunk_size=cfg.chunk_size, overlap=cfg.chunk_overlap)
    ids: List[str] = []
    docs: List[str] = []
    metas: List[Dict[str, Any]] = []

    for i, chunk in enumerate(chunks):
        ids.append(f"{post_id}:::{i}")
        doc = chunk
        if cfg.include_title_in_chunks:
            header_lines = [f"标题：{title}"]
            if tags_str:
                header_lines.append(f"标签：{tags_str}")
            if categories_str:
                header_lines.append(f"分类：{categories_str}")
            doc = "\n".join(header_lines) + "\n\n" + chunk
        docs.append(doc)
        metas.append(
            {
                "title": title,
                "url": url,
                "date": date_str,
                "source": source,
                "post_id": post_id,
                "chunk": i,
                "tags": tags_str,
                "categories": categories_str,
            }
        )

    if ids:
        col.add(ids=ids, documents=docs, metadatas=metas)

    return {
        "post_id": post_id,
        "title": title,
        "url": url,
        "chunks": len(ids),
        "collection": cfg.collection_name,
        "persist_dir": str(cfg.persist_dir),
    }


def retrieve(
    cfg: RagConfig,
    query: str,
    k: Optional[int] = None,
    *,
    candidate_k: Optional[int] = None,
    max_distance: Optional[float] = None,
    per_post_max: Optional[int] = None,
) -> List[Dict[str, Any]]:
    _, col = _get_collection(cfg)
    k_final = max(1, int(k if k is not None else cfg.retrieve_k))
    cand = max(k_final, int(candidate_k if candidate_k is not None else cfg.retrieve_candidate_k))
    res = col.query(query_texts=[query], n_results=max(1, cand))
    docs = (res.get("documents") or [[]])[0]
    metas = (res.get("metadatas") or [[]])[0]
    dists = (res.get("distances") or [[]])[0]

    max_d = max_distance if max_distance is not None else cfg.retrieve_max_distance
    per_post = max(1, int(per_post_max if per_post_max is not None else cfg.retrieve_per_post_max))

    out_all: List[Dict[str, Any]] = []
    for doc, meta, dist in zip(docs, metas, dists):
        m = meta or {}
        out_all.append(
            {
                "title": m.get("title") or "",
                "url": m.get("url") or "",
                "date": m.get("date") or "",
                "source": m.get("source") or "",
                "post_id": m.get("post_id") or "",
                "chunk": m.get("chunk"),
                "tags": m.get("tags") or "",
                "categories": m.get("categories") or "",
                "snippet": (doc or "")[:280],
                "distance": dist,
                "content": doc or "",
            }
        )

    # 过滤：相似度阈值（Chroma cosine 距离通常越小越相关）
    if max_d is not None:
        out_all = [x for x in out_all if (x.get("distance") is not None and float(x["distance"]) <= float(max_d))]

    # 去重/分散：同一文章最多取 per_post 条
    picked: List[Dict[str, Any]] = []
    per_post_cnt: Dict[str, int] = {}
    for x in out_all:
        pid = str(x.get("post_id") or "")
        if pid:
            if per_post_cnt.get(pid, 0) >= per_post:
                continue
            per_post_cnt[pid] = per_post_cnt.get(pid, 0) + 1
        picked.append(x)
        if len(picked) >= k_final:
            break

    return picked


def get_citation_detail(post_id: str, chunk: int) -> Dict[str, Any]:
    """
    按需获取引用详情（避免首次 chat 就下发 snippet）。
    """
    cfg = load_rag_config()
    if not post_id:
        raise RuntimeError("post_id 不能为空")
    try:
        chunk_i = int(chunk)
    except Exception:
        raise RuntimeError("chunk 必须是整数")

    _, col = _get_collection(cfg)
    # Chroma where 语法：多条件用 $and 组合
    res = col.get(
        where={
            "$and": [
                {"post_id": {"$eq": post_id}},
                {"chunk": {"$eq": chunk_i}},
            ]
        }
    )
    docs = res.get("documents") or []
    metas = res.get("metadatas") or []

    doc = docs[0] if docs else ""
    meta = metas[0] if metas else {}
    meta = meta or {}

    return {
        "post_id": post_id,
        "chunk": chunk_i,
        "title": meta.get("title") or "",
        "url": meta.get("url") or "",
        "snippet": (doc or "")[:600],
    }

