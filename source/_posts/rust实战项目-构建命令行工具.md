---
title: Rust实战项目：构建一个命令行工具
date: 2026-01-19
tags:
  - Rust
  - 实战项目
  - 命令行工具
categories:
  - 教程
---

# Rust实战项目：构建一个命令行工具

本文将带你使用 Rust 构建一个完整的命令行工具——文件搜索工具。通过这个项目，你将学习到 Rust 的实际应用，包括参数解析、文件操作、错误处理等。

## 项目概述

我们将构建一个名为 `rfsearch` 的命令行工具，功能包括：

- 在指定目录中搜索文件
- 支持按文件名模式匹配
- 支持递归搜索子目录
- 支持大小写敏感/不敏感搜索
- 显示匹配文件的详细信息

## 项目设置

### 创建项目

```bash
cargo new rfsearch --bin
cd rfsearch
```

### 添加依赖

编辑 `Cargo.toml`：

```toml
[package]
name = "rfsearch"
version = "0.1.0"
edition = "2021"

[dependencies]
clap = { version = "4.0", features = ["derive"] }
regex = "1.10"
colored = "2.0"
```

## 实现代码

### 1. 参数解析（使用 clap）

```rust
use clap::Parser;

#[derive(Parser, Debug)]
#[command(name = "rfsearch")]
#[command(about = "一个强大的文件搜索工具", long_about = None)]
struct Args {
    /// 要搜索的模式
    pattern: String,

    /// 搜索的目录
    #[arg(short, long, default_value = ".")]
    directory: String,

    /// 是否递归搜索子目录
    #[arg(short, long)]
    recursive: bool,

    /// 是否忽略大小写
    #[arg(short = 'i', long)]
    ignore_case: bool,

    /// 显示详细信息
    #[arg(short, long)]
    verbose: bool,
}
```

### 2. 文件搜索核心逻辑

```rust
use std::fs;
use std::path::{Path, PathBuf};
use regex::Regex;
use colored::*;

struct SearchConfig {
    pattern: Regex,
    recursive: bool,
    verbose: bool,
}

impl SearchConfig {
    fn new(pattern: String, ignore_case: bool, recursive: bool, verbose: bool) -> Result<Self, regex::Error> {
        let pattern_str = if ignore_case {
            format!("(?i){}", pattern)
        } else {
            pattern
        };
        
        let regex = Regex::new(&pattern_str)?;
        
        Ok(SearchConfig {
            pattern: regex,
            recursive,
            verbose,
        })
    }
}

fn search_files(config: &SearchConfig, dir: &Path) -> Result<Vec<PathBuf>, std::io::Error> {
    let mut results = Vec::new();
    
    if config.verbose {
        println!("搜索目录: {}", dir.display().to_string().cyan());
    }
    
    let entries = fs::read_dir(dir)?;
    
    for entry in entries {
        let entry = entry?;
        let path = entry.path();
        
        // 检查文件名是否匹配
        if let Some(file_name) = path.file_name() {
            let file_name_str = file_name.to_string_lossy();
            
            if config.pattern.is_match(&file_name_str) {
                results.push(path.clone());
                
                if config.verbose {
                    let file_type = if path.is_dir() {
                        "目录".yellow()
                    } else {
                        "文件".green()
                    };
                    
                    println!("  {} {} ({})", 
                        "✓".green(), 
                        path.display().to_string().bright_white(),
                        file_type
                    );
                } else {
                    println!("{}", path.display().to_string().bright_white());
                }
            }
        }
        
        // 递归搜索子目录
        if config.recursive && path.is_dir() {
            match search_files(config, &path) {
                Ok(mut sub_results) => {
                    results.append(&mut sub_results);
                },
                Err(e) => {
                    if config.verbose {
                        eprintln!("  警告: 无法读取目录 {}: {}", 
                            path.display().to_string().yellow(),
                            e.to_string().red()
                        );
                    }
                },
            }
        }
    }
    
    Ok(results)
}
```

### 3. 主函数

```rust
use std::path::Path;

fn main() {
    let args = Args::parse();
    
    // 创建搜索配置
    let config = match SearchConfig::new(
        args.pattern,
        args.ignore_case,
        args.recursive,
        args.verbose,
    ) {
        Ok(config) => config,
        Err(e) => {
            eprintln!("{} 无效的正则表达式: {}", "错误:".red().bold(), e);
            std::process::exit(1);
        },
    };
    
    // 验证目录是否存在
    let search_dir = Path::new(&args.directory);
    if !search_dir.exists() {
        eprintln!("{} 目录不存在: {}", 
            "错误:".red().bold(), 
            args.directory
        );
        std::process::exit(1);
    }
    
    if !search_dir.is_dir() {
        eprintln!("{} 不是一个目录: {}", 
            "错误:".red().bold(), 
            args.directory
        );
        std::process::exit(1);
    }
    
    // 执行搜索
    println!("{} 搜索模式: {}", 
        "信息:".blue().bold(), 
        args.pattern.bright_cyan()
    );
    println!("{} 搜索目录: {}", 
        "信息:".blue().bold(), 
        search_dir.display().to_string().bright_cyan()
    );
    println!();
    
    match search_files(&config, search_dir) {
        Ok(results) => {
            println!();
            if results.is_empty() {
                println!("{} 未找到匹配的文件", "结果:".yellow().bold());
            } else {
                println!("{} 找到 {} 个匹配项", 
                    "结果:".green().bold(), 
                    results.len().to_string().bright_green()
                );
            }
        },
        Err(e) => {
            eprintln!("{} 搜索失败: {}", "错误:".red().bold(), e);
            std::process::exit(1);
        },
    }
}
```

## 完整代码

`src/main.rs` 完整内容：

```rust
use clap::Parser;
use colored::*;
use regex::Regex;
use std::fs;
use std::path::{Path, PathBuf};

#[derive(Parser, Debug)]
#[command(name = "rfsearch")]
#[command(about = "一个强大的文件搜索工具", long_about = None)]
struct Args {
    /// 要搜索的模式
    pattern: String,

    /// 搜索的目录
    #[arg(short, long, default_value = ".")]
    directory: String,

    /// 是否递归搜索子目录
    #[arg(short, long)]
    recursive: bool,

    /// 是否忽略大小写
    #[arg(short = 'i', long)]
    ignore_case: bool,

    /// 显示详细信息
    #[arg(short, long)]
    verbose: bool,
}

struct SearchConfig {
    pattern: Regex,
    recursive: bool,
    verbose: bool,
}

impl SearchConfig {
    fn new(
        pattern: String,
        ignore_case: bool,
        recursive: bool,
        verbose: bool,
    ) -> Result<Self, regex::Error> {
        let pattern_str = if ignore_case {
            format!("(?i){}", pattern)
        } else {
            pattern
        };

        let regex = Regex::new(&pattern_str)?;

        Ok(SearchConfig {
            pattern: regex,
            recursive,
            verbose,
        })
    }
}

fn search_files(config: &SearchConfig, dir: &Path) -> Result<Vec<PathBuf>, std::io::Error> {
    let mut results = Vec::new();

    if config.verbose {
        println!("搜索目录: {}", dir.display().to_string().cyan());
    }

    let entries = fs::read_dir(dir)?;

    for entry in entries {
        let entry = entry?;
        let path = entry.path();

        if let Some(file_name) = path.file_name() {
            let file_name_str = file_name.to_string_lossy();

            if config.pattern.is_match(&file_name_str) {
                results.push(path.clone());

                if config.verbose {
                    let file_type = if path.is_dir() {
                        "目录".yellow()
                    } else {
                        "文件".green()
                    };

                    println!(
                        "  {} {} ({})",
                        "✓".green(),
                        path.display().to_string().bright_white(),
                        file_type
                    );
                } else {
                    println!("{}", path.display().to_string().bright_white());
                }
            }
        }

        if config.recursive && path.is_dir() {
            match search_files(config, &path) {
                Ok(mut sub_results) => {
                    results.append(&mut sub_results);
                }
                Err(e) => {
                    if config.verbose {
                        eprintln!(
                            "  警告: 无法读取目录 {}: {}",
                            path.display().to_string().yellow(),
                            e.to_string().red()
                        );
                    }
                }
            }
        }
    }

    Ok(results)
}

fn main() {
    let args = Args::parse();

    let config = match SearchConfig::new(
        args.pattern.clone(),
        args.ignore_case,
        args.recursive,
        args.verbose,
    ) {
        Ok(config) => config,
        Err(e) => {
            eprintln!("{} 无效的正则表达式: {}", "错误:".red().bold(), e);
            std::process::exit(1);
        }
    };

    let search_dir = Path::new(&args.directory);
    if !search_dir.exists() {
        eprintln!("{} 目录不存在: {}", "错误:".red().bold(), args.directory);
        std::process::exit(1);
    }

    if !search_dir.is_dir() {
        eprintln!("{} 不是一个目录: {}", "错误:".red().bold(), args.directory);
        std::process::exit(1);
    }

    println!(
        "{} 搜索模式: {}",
        "信息:".blue().bold(),
        args.pattern.bright_cyan()
    );
    println!(
        "{} 搜索目录: {}",
        "信息:".blue().bold(),
        search_dir.display().to_string().bright_cyan()
    );
    println!();

    match search_files(&config, search_dir) {
        Ok(results) => {
            println!();
            if results.is_empty() {
                println!("{} 未找到匹配的文件", "结果:".yellow().bold());
            } else {
                println!(
                    "{} 找到 {} 个匹配项",
                    "结果:".green().bold(),
                    results.len().to_string().bright_green()
                );
            }
        }
        Err(e) => {
            eprintln!("{} 搜索失败: {}", "错误:".red().bold(), e);
            std::process::exit(1);
        }
    }
}
```

## 构建和运行

### 构建项目

```bash
cargo build --release
```

### 运行示例

```bash
# 基本搜索
cargo run -- "*.rs"

# 递归搜索
cargo run -- "test" -r

# 忽略大小写
cargo run -- "README" -i

# 详细模式
cargo run -- "config" -r -v

# 指定目录
cargo run -- "*.toml" -d ./examples -r
```

## 功能扩展建议

### 1. 添加文件内容搜索

```rust
fn search_in_file(path: &Path, pattern: &Regex) -> Result<bool, std::io::Error> {
    let content = fs::read_to_string(path)?;
    Ok(pattern.is_match(&content))
}
```

### 2. 添加文件大小过滤

```rust
#[derive(Parser)]
struct Args {
    // ... 现有字段
    
    /// 最小文件大小（字节）
    #[arg(long)]
    min_size: Option<u64>,
    
    /// 最大文件大小（字节）
    #[arg(long)]
    max_size: Option<u64>,
}
```

### 3. 添加文件类型过滤

```rust
#[derive(Parser)]
struct Args {
    // ... 现有字段
    
    /// 只搜索文件（不包括目录）
    #[arg(long)]
    files_only: bool,
    
    /// 只搜索目录
    #[arg(long)]
    dirs_only: bool,
}
```

### 4. 添加 JSON 输出格式

```rust
use serde_json;

fn output_json(results: &[PathBuf]) {
    let json = serde_json::json!({
        "count": results.len(),
        "files": results.iter().map(|p| p.to_string_lossy()).collect::<Vec<_>>()
    });
    println!("{}", serde_json::to_string_pretty(&json).unwrap());
}
```

## 测试

创建 `tests/integration_test.rs`：

```rust
#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;
    use std::path::Path;

    #[test]
    fn test_basic_search() {
        let config = SearchConfig::new(
            "test".to_string(),
            false,
            false,
            false,
        ).unwrap();
        
        let results = search_files(&config, Path::new(".")).unwrap();
        // 添加断言
    }
}
```

运行测试：

```bash
cargo test
```

## 项目结构总结

```
rfsearch/
├── Cargo.toml
├── src/
│   └── main.rs
└── README.md
```

## 学到的知识点

通过这个项目，我们实践了：

1. **命令行参数解析**：使用 `clap` 库
2. **文件系统操作**：使用 `std::fs` 模块
3. **正则表达式**：使用 `regex` 库进行模式匹配
4. **错误处理**：使用 `Result` 类型处理可能的错误
5. **路径处理**：使用 `std::path` 模块
6. **输出格式化**：使用 `colored` 库美化输出
7. **递归算法**：实现目录递归搜索

## 总结

这个项目展示了如何使用 Rust 构建一个实用的命令行工具。Rust 的类型系统和所有权系统确保了代码的安全性和性能，同时丰富的生态系统（如 `clap`、`regex`）让开发变得更加高效。

继续扩展这个项目，添加更多功能，你将更深入地理解 Rust 的实际应用！

---

*动手实践，掌握 Rust！🦀*
