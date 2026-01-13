---
title: Rust入门指南：从零开始学习系统编程语言
date: 2026-01-15
tags:
  - Rust
  - 编程语言
  - 入门教程
categories:
  - 教程
---

# Rust入门指南：从零开始学习系统编程语言

Rust 是一门现代的系统编程语言，由 Mozilla 开发，专注于安全性、并发性和性能。它提供了内存安全保证，同时不需要垃圾回收器。本文将带你从零开始学习 Rust。

## 为什么选择 Rust？

### 1. 内存安全
Rust 的所有权系统在编译时就能防止常见的内存错误，如空指针解引用、数据竞争等。

### 2. 零成本抽象
Rust 提供了高级语言的抽象能力，但性能与 C/C++ 相当。

### 3. 并发安全
Rust 的类型系统可以防止数据竞争，让并发编程更加安全。

### 4. 活跃的社区
Rust 拥有一个友好且活跃的社区，以及丰富的生态系统。

## 安装 Rust

### 在 Windows 上安装

使用 rustup（推荐方式）：

```bash
# 下载并运行 rustup-init.exe
# 或使用 PowerShell
Invoke-WebRequest https://win.rustup.rs/x86_64 -OutFile rustup-init.exe
.\rustup-init.exe
```

### 验证安装

```bash
rustc --version
cargo --version
```

## 第一个 Rust 程序

创建一个新项目：

```bash
cargo new hello_rust
cd hello_rust
```

查看 `src/main.rs`：

```rust
fn main() {
    println!("Hello, Rust!");
}
```

运行程序：

```bash
cargo run
```

## Rust 基础语法

### 变量和可变性

```rust
// 不可变变量（默认）
let x = 5;

// 可变变量
let mut y = 10;
y = 20;

// 常量
const MAX_POINTS: u32 = 100_000;
```

### 数据类型

```rust
// 整数类型
let a: i32 = 42;      // 有符号整数
let b: u32 = 42;      // 无符号整数

// 浮点数类型
let c: f64 = 3.14;

// 布尔类型
let d: bool = true;

// 字符类型（Unicode）
let e: char = '中';

// 字符串类型
let f: &str = "Hello";
let g: String = String::from("World");
```

### 函数

```rust
fn add(x: i32, y: i32) -> i32 {
    x + y  // 注意：没有分号，这是表达式
}

fn main() {
    let result = add(3, 5);
    println!("3 + 5 = {}", result);
}
```

### 控制流

```rust
// if 表达式
let number = 6;
if number % 4 == 0 {
    println!("number is divisible by 4");
} else if number % 3 == 0 {
    println!("number is divisible by 3");
} else {
    println!("number is not divisible by 4 or 3");
}

// 循环
let mut counter = 0;
loop {
    counter += 1;
    if counter == 10 {
        break;
    }
}

// while 循环
while counter < 5 {
    println!("{}", counter);
    counter += 1;
}

// for 循环
for i in 1..=5 {
    println!("{}", i);
}
```

## 所有权系统（Ownership）

Rust 的核心特性是所有权系统，它确保内存安全。

### 所有权规则

1. Rust 中的每一个值都有一个被称为其**所有者**（owner）的变量。
2. 值在任一时刻有且只有一个所有者。
3. 当所有者（变量）离开作用域，这个值将被丢弃。

```rust
let s1 = String::from("hello");
let s2 = s1;  // s1 的所有权被移动到 s2
// println!("{}", s1);  // 错误！s1 不再有效

// 克隆
let s3 = String::from("hello");
let s4 = s3.clone();  // 深拷贝
println!("{}", s3);  // 可以正常使用
```

### 引用和借用

```rust
fn calculate_length(s: &String) -> usize {
    s.len()
}  // s 离开作用域，但因为它是引用，不会丢弃值

let s = String::from("hello");
let len = calculate_length(&s);  // 借用
println!("{} 的长度是 {}", s, len);  // s 仍然有效
```

## 结构体

```rust
struct User {
    username: String,
    email: String,
    sign_in_count: u64,
    active: bool,
}

fn main() {
    let user1 = User {
        email: String::from("someone@example.com"),
        username: String::from("someusername123"),
        active: true,
        sign_in_count: 1,
    };
    
    println!("用户邮箱: {}", user1.email);
}
```

## 枚举和模式匹配

```rust
enum IpAddr {
    V4(String),
    V6(String),
}

enum Message {
    Quit,
    Move { x: i32, y: i32 },
    Write(String),
    ChangeColor(i32, i32, i32),
}

// 使用 match 进行模式匹配
fn handle_message(msg: Message) {
    match msg {
        Message::Quit => {
            println!("退出程序");
        },
        Message::Move { x, y } => {
            println!("移动到 ({}, {})", x, y);
        },
        Message::Write(text) => {
            println!("写入: {}", text);
        },
        Message::ChangeColor(r, g, b) => {
            println!("改变颜色为 RGB({}, {}, {})", r, g, b);
        },
    }
}
```

## 错误处理

```rust
use std::fs::File;
use std::io::ErrorKind;

fn main() {
    let f = File::open("hello.txt");
    
    let f = match f {
        Ok(file) => file,
        Err(error) => match error.kind() {
            ErrorKind::NotFound => {
                match File::create("hello.txt") {
                    Ok(fc) => fc,
                    Err(e) => panic!("创建文件时出错: {:?}", e),
                }
            },
            other_error => {
                panic!("打开文件时出错: {:?}", other_error)
            },
        },
    };
}
```

## 总结

本文介绍了 Rust 的基础知识，包括：

- Rust 的优势和特点
- 安装和配置
- 基本语法（变量、数据类型、函数、控制流）
- 所有权系统
- 结构体和枚举
- 错误处理

Rust 的学习曲线可能比较陡峭，但一旦掌握了所有权系统，你会发现它是一门非常强大且安全的语言。继续学习 Rust 的高级特性，如生命周期、trait、并发编程等，将帮助你编写更高效、更安全的代码。

## 下一步学习

- [Rust 所有权系统详解](./rust所有权系统详解.md)
- [Rust 并发编程](./rust并发编程.md)
- [Rust 错误处理最佳实践](./rust错误处理最佳实践.md)

---

*Happy Coding with Rust! 🦀*
