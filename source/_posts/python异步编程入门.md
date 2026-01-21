---
title: Python异步编程入门
date: 2026-01-16
tags:
  - Python
  - 异步编程
  - asyncio
categories:
  - 教程
---

# Python异步编程入门

异步编程是现代Python开发中的重要技能，特别适合处理I/O密集型任务。本文将快速介绍Python的`asyncio`模块。

## 什么是异步编程？

异步编程允许程序在等待I/O操作（如网络请求、文件读写）时执行其他任务，而不是阻塞等待。这大大提高了程序的并发性能。

## 基础语法

### async/await

```python
import asyncio

async def fetch_data():
    print("开始获取数据...")
    await asyncio.sleep(2)  # 模拟网络请求
    print("数据获取完成")
    return "数据内容"

async def main():
    result = await fetch_data()
    print(result)

# 运行异步函数
asyncio.run(main())
```

### 并发执行

```python
import asyncio

async def task(name, delay):
    print(f"任务 {name} 开始")
    await asyncio.sleep(delay)
    print(f"任务 {name} 完成")

async def main():
    # 并发执行多个任务
    await asyncio.gather(
        task("A", 2),
        task("B", 1),
        task("C", 3)
    )

asyncio.run(main())
```

## 实际应用

### 异步HTTP请求

```python
import aiohttp
import asyncio

async def fetch_url(session, url):
    async with session.get(url) as response:
        return await response.text()

async def main():
    async with aiohttp.ClientSession() as session:
        urls = ["http://example.com"] * 10
        results = await asyncio.gather(
            *[fetch_url(session, url) for url in urls]
        )
    return results

asyncio.run(main())
```

## 总结

- `async def` 定义异步函数
- `await` 等待异步操作完成
- `asyncio.gather()` 并发执行多个任务
- 适合I/O密集型应用，不适合CPU密集型任务

异步编程让Python在处理大量并发连接时更加高效！
