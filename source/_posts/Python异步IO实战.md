---
title: Python异步IO实战
date: 2026-01-15
tags:
  - Python
  - 异步编程
  - asyncio
categories:
  - 教程
---

# Python异步IO实战

异步IO是Python处理高并发场景的利器，本文将展示几个实际应用场景。

## 异步文件操作

```python
import aiofiles
import asyncio

async def read_file_async(filepath):
    async with aiofiles.open(filepath, 'r') as f:
        content = await f.read()
    return content

async def write_file_async(filepath, content):
    async with aiofiles.open(filepath, 'w') as f:
        await f.write(content)

async def main():
    content = await read_file_async('data.txt')
    await write_file_async('output.txt', content.upper())

asyncio.run(main())
```

## 异步数据库操作

```python
import asyncpg
import asyncio

async def fetch_users():
    conn = await asyncpg.connect(
        'postgresql://user:password@localhost/db'
    )
    users = await conn.fetch('SELECT * FROM users')
    await conn.close()
    return users

async def main():
    users = await fetch_users()
    for user in users:
        print(user['name'])

asyncio.run(main())
```

## 异步任务队列

```python
import asyncio

async def worker(name, queue):
    while True:
        task = await queue.get()
        if task is None:
            break
        print(f"{name} 处理任务: {task}")
        await asyncio.sleep(1)
        queue.task_done()

async def main():
    queue = asyncio.Queue()
    
    # 添加任务
    for i in range(10):
        await queue.put(f"任务-{i}")
    
    # 启动工作协程
    workers = [
        asyncio.create_task(worker(f"Worker-{i}", queue))
        for i in range(3)
    ]
    
    # 等待所有任务完成
    await queue.join()
    
    # 停止工作协程
    for _ in workers:
        await queue.put(None)
    await asyncio.gather(*workers)

asyncio.run(main())
```

## 性能对比

同步版本可能需要10秒，异步版本只需2秒，性能提升5倍！

## 总结

异步IO适合：
- ✅ 网络请求
- ✅ 文件I/O
- ✅ 数据库操作
- ❌ CPU密集型任务（使用多进程）

掌握异步编程，让你的Python应用更高效！
