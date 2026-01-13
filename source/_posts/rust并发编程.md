---
title: Rust并发编程：安全高效的多线程编程
date: 2026-01-17
tags:
  - Rust
  - 并发编程
  - 多线程
categories:
  - 教程
---

# Rust并发编程：安全高效的多线程编程

Rust 的并发编程模型是语言的一大亮点。通过所有权系统和类型系统，Rust 可以在编译时防止数据竞争，让并发编程更加安全。

## 为什么 Rust 的并发编程更安全？

传统语言（如 C++）的并发编程容易出现：
- **数据竞争**：多个线程同时访问同一数据
- **死锁**：线程相互等待导致程序卡死
- **竞态条件**：程序行为依赖于不可控的执行顺序

Rust 通过以下方式解决这些问题：
- **所有权系统**：确保数据只能有一个可变引用
- **类型系统**：`Send` 和 `Sync` trait 保证线程安全
- **编译时检查**：在编译期就发现并发问题

## 创建线程

### 使用 `thread::spawn`

```rust
use std::thread;
use std::time::Duration;

fn main() {
    let handle = thread::spawn(|| {
        for i in 1..10 {
            println!("线程中的数字: {}", i);
            thread::sleep(Duration::from_millis(1));
        }
    });

    for i in 1..5 {
        println!("主线程中的数字: {}", i);
        thread::sleep(Duration::from_millis(1));
    }

    handle.join().unwrap();  // 等待线程完成
}
```

### 使用 `move` 闭包

```rust
use std::thread;

fn main() {
    let v = vec![1, 2, 3];

    let handle = thread::spawn(move || {
        println!("向量: {:?}", v);
    });

    // println!("{:?}", v);  // 错误！v 已被移动到线程中

    handle.join().unwrap();
}
```

## 消息传递（Message Passing）

Rust 推荐使用消息传递来实现线程间通信，而不是共享内存。

### 通道（Channel）

```rust
use std::sync::mpsc;
use std::thread;

fn main() {
    let (tx, rx) = mpsc::channel();

    thread::spawn(move || {
        let val = String::from("hi");
        tx.send(val).unwrap();
        // println!("val is {}", val);  // 错误！val 已被发送
    });

    let received = rx.recv().unwrap();
    println!("收到: {}", received);
}
```

### 多个发送者

```rust
use std::sync::mpsc;
use std::thread;

fn main() {
    let (tx, rx) = mpsc::channel();
    let tx1 = tx.clone();

    thread::spawn(move || {
        let vals = vec![
            String::from("hi"),
            String::from("from"),
            String::from("the"),
            String::from("thread"),
        ];

        for val in vals {
            tx.send(val).unwrap();
            thread::sleep(Duration::from_millis(1));
        }
    });

    thread::spawn(move || {
        let vals = vec![
            String::from("more"),
            String::from("messages"),
            String::from("for"),
            String::from("you"),
        ];

        for val in vals {
            tx1.send(val).unwrap();
            thread::sleep(Duration::from_millis(1));
        }
    });

    for received in rx {
        println!("收到: {}", received);
    }
}
```

## 共享状态（Shared State）

虽然 Rust 推荐消息传递，但有时也需要共享状态。

### 互斥锁（Mutex）

```rust
use std::sync::Mutex;

fn main() {
    let m = Mutex::new(5);

    {
        let mut num = m.lock().unwrap();
        *num = 6;
    }  // 锁在这里自动释放

    println!("m = {:?}", m);
}
```

### 多线程共享 Mutex

```rust
use std::sync::{Arc, Mutex};
use std::thread;

fn main() {
    let counter = Arc::new(Mutex::new(0));
    let mut handles = vec![];

    for _ in 0..10 {
        let counter = Arc::clone(&counter);
        let handle = thread::spawn(move || {
            let mut num = counter.lock().unwrap();
            *num += 1;
        });
        handles.push(handle);
    }

    for handle in handles {
        handle.join().unwrap();
    }

    println!("结果: {}", *counter.lock().unwrap());
}
```

**关键点：**
- `Arc<T>`：原子引用计数，允许多个所有者
- `Mutex<T>`：互斥锁，提供内部可变性
- 两者结合使用可以在多线程间共享可变数据

## Send 和 Sync Trait

Rust 的并发安全基于两个 trait：

### Send

`Send` 标记 trait 表示类型的所有权可以在线程间传递。

```rust
// 实现了 Send 的类型可以安全地跨线程传递
// 大多数类型都是 Send 的
// 但 Rc<T> 不是 Send 的（使用 Arc<T> 代替）
```

### Sync

`Sync` 标记 trait 表示类型可以安全地在多个线程中共享引用。

```rust
// 实现了 Sync 的类型可以安全地跨线程共享引用
// &T 是 Send 的，当且仅当 T 是 Sync 的
// Mutex<T> 是 Sync 的
```

## 实际应用示例

### 线程池

```rust
use std::sync::mpsc;
use std::thread;

pub struct ThreadPool {
    workers: Vec<Worker>,
    sender: mpsc::Sender<Job>,
}

type Job = Box<dyn FnOnce() + Send + 'static>;

impl ThreadPool {
    pub fn new(size: usize) -> ThreadPool {
        assert!(size > 0);

        let (sender, receiver) = mpsc::channel();
        let receiver = Arc::new(Mutex::new(receiver));

        let mut workers = Vec::with_capacity(size);

        for id in 0..size {
            workers.push(Worker::new(id, Arc::clone(&receiver)));
        }

        ThreadPool { workers, sender }
    }

    pub fn execute<F>(&self, f: F)
    where
        F: FnOnce() + Send + 'static,
    {
        let job = Box::new(f);
        self.sender.send(job).unwrap();
    }
}

struct Worker {
    id: usize,
    thread: thread::JoinHandle<()>,
}

impl Worker {
    fn new(id: usize, receiver: Arc<Mutex<mpsc::Receiver<Job>>>) -> Worker {
        let thread = thread::spawn(move || loop {
            let job = receiver.lock().unwrap().recv().unwrap();
            println!("Worker {} 执行任务", id);
            job();
        });

        Worker { id, thread }
    }
}
```

### 并行计算

```rust
use std::sync::{Arc, Mutex};
use std::thread;

fn parallel_sum(numbers: Vec<i32>, num_threads: usize) -> i32 {
    let chunk_size = numbers.len() / num_threads;
    let sum = Arc::new(Mutex::new(0));
    let mut handles = vec![];

    for i in 0..num_threads {
        let start = i * chunk_size;
        let end = if i == num_threads - 1 {
            numbers.len()
        } else {
            (i + 1) * chunk_size
        };

        let numbers = Arc::new(numbers[start..end].to_vec());
        let sum = Arc::clone(&sum);

        let handle = thread::spawn(move || {
            let local_sum: i32 = numbers.iter().sum();
            let mut total = sum.lock().unwrap();
            *total += local_sum;
        });

        handles.push(handle);
    }

    for handle in handles {
        handle.join().unwrap();
    }

    *sum.lock().unwrap()
}

fn main() {
    let numbers: Vec<i32> = (1..=1000).collect();
    let result = parallel_sum(numbers, 4);
    println!("总和: {}", result);
}
```

## 最佳实践

### 1. 优先使用消息传递

```rust
// 推荐：使用通道
let (tx, rx) = mpsc::channel();
thread::spawn(move || {
    tx.send(data).unwrap();
});

// 避免：过度使用共享状态
// let data = Arc::new(Mutex::new(value));
```

### 2. 合理使用锁

```rust
// 好的做法：尽快释放锁
{
    let mut data = lock.lock().unwrap();
    *data += 1;
}  // 锁在这里释放

// 避免：长时间持有锁
let mut data = lock.lock().unwrap();
// ... 大量计算 ...
*data += 1;  // 锁持有时间过长
```

### 3. 使用 `Arc` 而不是 `Rc`

```rust
// 多线程环境使用 Arc
use std::sync::Arc;

// 单线程环境使用 Rc
use std::rc::Rc;
```

## 常见错误和解决方案

### 错误 1：尝试在多线程中使用 `Rc`

```rust
// 错误
let data = Rc::new(5);
let data_clone = Rc::clone(&data);
thread::spawn(move || {
    println!("{}", data_clone);
});

// 正确：使用 Arc
let data = Arc::new(5);
let data_clone = Arc::clone(&data);
thread::spawn(move || {
    println!("{}", data_clone);
});
```

### 错误 2：忘记使用 `move` 闭包

```rust
let data = vec![1, 2, 3];

// 错误：可能无法编译
thread::spawn(|| {
    println!("{:?}", data);
});

// 正确：使用 move
thread::spawn(move || {
    println!("{:?}", data);
});
```

## 总结

Rust 的并发编程模型提供了：

- **编译时安全**：防止数据竞争
- **零成本抽象**：运行时性能优秀
- **灵活的工具**：消息传递和共享状态

通过理解 `Send`、`Sync`、`Arc`、`Mutex` 等概念，你可以编写出既安全又高效的并发程序。

## 进一步学习

- `async/await` 异步编程
- `tokio` 异步运行时
- `rayon` 数据并行库
- `crossbeam` 无锁数据结构

---

*并发编程，Rust 让你更安全！🦀*
