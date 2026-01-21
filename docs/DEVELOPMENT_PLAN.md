# 番茄todo - 开源智能任务管理应用 (macOS 专版)

## 项目概述

一款**免费开源**的智能 ToDo 桌面应用,用户可自行接入 API Key 使用 AI 功能。

**项目定位:**

* 🆓 **完全免费** - 开源项目,MIT 许可证
* 🔑 **自带 Key** - 用户配置自己的阿里云百炼 API Key
* 📦 **GitHub 开源** - 欢迎社区贡献

**核心特性:**

* 📝 标准 ToDo 功能 (CRUD、分类、优先级)
* 🤖 AI 能力: 任务智能拆解、自动分类、优先级建议、自然语言输入
* ✨ **简洁易用** - 极简设计,零学习成本
* ☁️ 支持阿里云百炼 API (Qwen 系列模型)
* 🔐 API Key 本地安全存储
* 🍎 **macOS 专属** - 针对 Apple Silicon (M1/M2/M3/M4) 优化

## 界面设计原则

### 设计理念

* **极简主义** - 去除一切不必要的元素,只保留核心功能
* **即时可用** - 打开即用,无需教程
* **一键 AI** - AI 功能触手可及,不打断工作流

### 主界面布局

```
┌─────────────────────────────────────────────┐
│  📝 番茄todo                    [⚙️]  │  <- 顶栏: 标题 + 设置按钮
├─────────────────────────────────────────────┤
│  ┌──────────────────────────────────────┐  │
│  │ ➕ 输入任务... (AI自动解析)    [✨]  │  │  <- 输入框 + AI按钮
│  └──────────────────────────────────────┘  │
├─────────────────────────────────────────────┤
│  全部(5)  今天(2)  已完成(3)               │  <- 简单筛选Tab
├─────────────────────────────────────────────┤
│                                             │
│  ○ 完成项目报告            🔴 明天   [✨]  │  <- 任务项: 
│     └ ○ 整理数据                              │     状态/标题/优先级/
│     └ ○ 写摘要                              │     截止日期/AI拆解
│     └ ○ 制作 PPT                            │
│                                             │
│  ● 买生活用品              🟡 后天       │
│                                             │
│  ○ 学习 Rust                🟢 本周       │
│                                             │
└─────────────────────────────────────────────┘
```

### 核心交互

1. **添加任务** - 回车即添加,支持自然语言 ("明天 开会" → 自动解析截止日期)
2. **AI 拆解** - 点击 [✨] 按钮将复杂任务拆解为子任务
3. **完成任务** - 点击圆圈切换状态
4. **编辑/删除** - 右键菜单或悬停显示

### 设置页 (简约)

```
┌───────────────────────────────┐
│  设置                           │
├───────────────────────────────┤
│  AI 配置                         │
│  ┌─────────────────────────┐   │
│  │ API Key: sk-xxx...     │   │
│  └─────────────────────────┘   │
│  模型: [qwen-turbo ▼]         │
│                               │
├───────────────────────────────┤
│  外观                           │
│  主题: [浅色 ▼]               │
│                               │
├───────────────────────────────┤
│  关于                           │
│  版本: 1.0.0                    │
│  [GitHub] [API Key 指南]      │
└───────────────────────────────┘
```

### 视觉风格

* **配色**: 主色调简洁,仅用颜色区分优先级 (🔴高 🟡中 🟢低)
* **字体**: 系统默认字体,舒适阅读
* **动画**: 微妙过渡,不抢焦点
* **间距**: 充足留白,避免拥挤

## 技术选型

### 前端

* **UI 框架**: React 18 + TypeScript - 生态成熟、类型安全
* **状态管理**: Zustand - 轻量简洁
* **UI 组件库**: shadcn/ui + Tailwind CSS - 现代设计
* **构建工具**: Vite - 快速开发体验

### 后端 (Rust)

* **框架**: Tauri 2.x - 使用 macOS 原生 WKWebView
* **数据库**: SQLite + sqlx - 本地异步存储
* **AI 调用**: reqwest + serde - 调用百炼 API
* **安全存储**: macOS Keychain (keyring) - API Key 存入系统钥匙串; `tauri-plugin-store` 仅保存非敏感设置(如模型)

### macOS 专属优化

* **构建目标**: aarch64-apple-darwin (Apple Silicon 原生)
* **WebView**: WKWebView (macOS 系统内置)
* **安装包**: DMG 格式
* **最低系统要求**: macOS 11.0+ (Big Sur)

### 阿里云百炼模型

* **qwen-turbo** (默认) - 快速、低成本,适合日常使用
* **qwen-plus** - 平衡性能与成本
* **qwen-max** - 复杂任务分析
* **deepseek-r1** - 强推理能力 (限时免费,以官方可用性/价格为准)

## 项目结构

```
ai-todo/
├── src/                          # React 前端代码
│   ├── components/               # UI 组件
│   │   ├── TodoList/
│   │   ├── TodoItem/
│   │   ├── AIAssistant/
│   │   └── Settings/
│   ├── hooks/                    # 自定义 Hooks
│   ├── stores/                   # Zustand stores
│   ├── types/                    # TypeScript 类型定义
│   ├── lib/                      # 工具函数
│   └── App.tsx
├── src-tauri/                    # Tauri Rust 后端
│   ├── src/
│   │   ├── main.rs               # 入口
│   │   ├── lib.rs                # 库入口
│   │   ├── commands/             # Tauri 命令
│   │   │   ├── mod.rs
│   │   │   ├── todo.rs           # ToDo CRUD 命令
│   │   │   └── ai.rs             # 百炼 API 调用命令
│   │   ├── db/                   # 数据库模块
│   │   │   ├── mod.rs
│   │   │   └── schema.rs
│   │   ├── ai/                   # 百炼 API 模块
│   │   │   ├── mod.rs
│   │   │   ├── client.rs         # HTTP 客户端封装
│   │   │   └── prompts.rs        # Prompt 模板
│   │   └── models/               # 数据模型
│   ├── migrations/               # SQLite 迁移文件
│   ├── capabilities/             # Tauri 权限配置
│   ├── Cargo.toml
│   └── tauri.conf.json
├── package.json
├── vite.config.ts
└── tsconfig.json
```

## 数据模型设计

### SQLite Schema

```sql
-- 任务表
CREATE TABLE todos (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    status TEXT NOT NULL DEFAULT 'pending',  -- pending, in_progress, completed
    priority INTEGER DEFAULT 2,               -- 1:高, 2:中, 3:低
    category TEXT,
    due_date INTEGER,                         -- Unix timestamp
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    parent_id TEXT,                           -- 父任务ID (用于子任务)
    ai_generated BOOLEAN DEFAULT FALSE,       -- 是否AI生成
    FOREIGN KEY (parent_id) REFERENCES todos(id)
);

-- 分类表
CREATE TABLE categories (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    color TEXT,
    icon TEXT
);

-- AI 会话历史 (用于上下文)
CREATE TABLE ai_sessions (
    id TEXT PRIMARY KEY,
    todo_id TEXT,
    prompt TEXT NOT NULL,
    response TEXT,
    created_at INTEGER NOT NULL,
    FOREIGN KEY (todo_id) REFERENCES todos(id)
);
```

## 核心功能实现

### Phase 1: 基础框架搭建 (2-3天)

**目标:** 完成项目脚手架和基础 ToDo 功能

1. **项目初始化**
    * 使用 `create-tauri-app` 创建项目 (React + TypeScript + Vite)
    * 配置 Tailwind CSS 和 shadcn/ui
    * 设置 ESLint、Prettier

2. **数据库集成**
    * 添加 `sqlx` 依赖 (features: sqlite, runtime-tokio-rustls)
    * 实现数据库初始化和迁移
    * 创建 Todo CRUD 命令

3. **基础 UI**
    * TodoList 组件
    * TodoItem 组件 (含状态切换、编辑、删除)
    * 添加任务表单

### Phase 2: ToDo 功能完善 (2-3天)

**目标:** 简洁易用的任务管理

1. **任务管理增强**
    * 简单分类 (工作/生活/学习/其他)
    * 优先级设置 (红/黄/绿 三级)
    * 截止日期
    * 子任务支持 (AI 拆解生成)

2. **用户体验**
    * 快捷键: Enter 添加, Esc 取消
    * 简单筛选: 全部/今天/已完成
    * 暗色模式

3. **数据持久化**
    * 自动保存 (无感知)

### Phase 3: 百炼 API 集成 (2-3天)

**目标:** 集成阿里云百炼 API，实现 AI 功能

1. **百炼 API 客户端**

```rust
// src-tauri/src/ai/client.rs
use reqwest::Client;
use serde::{Deserialize, Serialize};

const DASHSCOPE_API_URL: &str = "https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions";

#[derive(Serialize)]
pub struct ChatRequest {
    pub model: String,
    pub messages: Vec<Message>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub stream: Option<bool>,
}

#[derive(Serialize, Deserialize)]
pub struct Message {
    pub role: String,
    pub content: String,
}

pub struct DashScopeClient {
    client: Client,
    api_key: String,
}

impl DashScopeClient {
    pub fn new(api_key: String) -> Self {
        Self {
            client: Client::new(),
            api_key,
        }
    }

    pub async fn chat(&self, model: &str, messages: Vec<Message>) -> Result<String, reqwest::Error> {
        let request = ChatRequest {
            model: model.to_string(),
            messages,
            stream: Some(false),
        };

        let response = self.client
            .post(DASHSCOPE_API_URL)
            .header("Authorization", format!("Bearer {}", self.api_key))
            .header("Content-Type", "application/json")
            .json(&request)
            .send()
            .await?
            .json::<serde_json::Value>()
            .await?;

        Ok(response["choices"][0]["message"]["content"].as_str().unwrap_or_default().to_string())
    }
}
```

2. **API Key 安全存储**
    * 使用 `tauri-plugin-store` 加密存储
    * 首次启动引导用户配置 API Key
    * 支持在设置中修改

3. **AI 功能实现**
    * **任务智能拆解**: 将复杂任务分解为可执行子任务
    * **自动分类**: 根据任务内容建议分类
    * **优先级建议**: 基于截止日期和内容分析
    * **自然语言输入**: 从自然语言解析任务信息

### Phase 4: AI 交互优化 (2天)

**目标:** 流畅的 AI 交互体验

1. **流式输出 (SSE)**

```rust
// 流式请求示例
pub async fn chat_stream(&self, model: &str, messages: Vec<Message>) -> Result<impl Stream<Item = String>, Error> {
    let request = ChatRequest {
        model: model.to_string(),
        messages,
        stream: Some(true),
    };

    let response = self.client
        .post(DASHSCOPE_API_URL)
        .header("Authorization", format!("Bearer {}", self.api_key))
        .json(&request)
        .send()
        .await?;

    // 解析 SSE 流
    Ok(response.bytes_stream().map(|chunk| {
        // 解析 data: {...} 格式
        parse_sse_chunk(chunk)
    }))
}
```

2. **Prompt 工程**

```rust
// src-tauri/src/ai/prompts.rs
pub const TASK_BREAKDOWN_PROMPT: &str = r#"你是一个任务规划助手。将用户的任务分解为具体、可执行的子任务。

规则:
1. 每个子任务应该是一个清晰的行动项
2. 子任务数量控制在3-7个
3. 按逻辑顺序排列
4. 输出JSON格式: [{"title": "子任务标题", "priority": 1-3}]

用户任务: {task}"#;

pub const AUTO_CATEGORIZE_PROMPT: &str = r#"根据任务内容,从以下分类中选择最合适的一个:
["工作", "学习", "生活", "健康", "财务", "娱乐", "其他"]

只输出分类名称,不要其他内容。

任务: {task}"#;

pub const PARSE_NATURAL_LANGUAGE_PROMPT: &str = r#"从用户输入中提取任务信息,输出JSON:
{"title": "任务标题", "due_date": "YYYY-MM-DD或null", "priority": 1-3, "category": "分类"}

用户输入: {input}"#;
```

3. **错误处理与重试**
    * API 调用失败自动重试 (3次)
    * 网络错误友好提示
    * API Key 无效提示用户重新配置

### Phase 5: 优化与打包 (2天)

**目标:** 生产级质量

1. **性能优化**
    * 请求并发控制
    * 响应缓存 (相同任务不重复请求)
    * 超时处理

2. **macOS 打包**
    * 配置 `tauri.conf.json` (identifier, icons)
    * Apple Silicon 原生构建 (aarch64-apple-darwin)
    * DMG 打包
    * (可选) 代码签名 + 公证

3. **用户体验**
    * 首次启动 API Key 配置引导
    * 模型选择设置
    * 用量统计显示
    * 错误处理和提示

## 关键代码示例

### Rust 百炼 API 命令

```rust
// src-tauri/src/commands/ai.rs
use crate::ai::{DashScopeClient, Message, TASK_BREAKDOWN_PROMPT};
use tauri::State;
use std::sync::Arc;
use tokio::sync::RwLock;

pub struct AppState {
    pub ai_client: Arc<RwLock<Option<DashScopeClient>>>,
    pub model: String,  // 默认模型: qwen-turbo
}

#[derive(serde::Serialize, serde::Deserialize)]
pub struct SubTask {
    pub title: String,
    pub priority: u8,
}

#[tauri::command]
pub async fn set_api_key(
    state: State<'_, AppState>,
    api_key: String,
) -> Result<(), String> {
    let client = DashScopeClient::new(api_key);
    *state.ai_client.write().await = Some(client);
    Ok(())
}

#[tauri::command]
pub async fn breakdown_task(
    state: State<'_, AppState>,
    task: String,
) -> Result<Vec<SubTask>, String> {
    let client_guard = state.ai_client.read().await;
    let client = client_guard.as_ref().ok_or("请先配置 API Key")?;

    let prompt = TASK_BREAKDOWN_PROMPT.replace("{task}", &task);
    let messages = vec![
        Message { role: "system".to_string(), content: "你是一个任务规划助手".to_string() },
        Message { role: "user".to_string(), content: prompt },
    ];

    let response = client.chat(&state.model, messages).await.map_err(|e| e.to_string())?;

    // 解析 JSON 响应
    serde_json::from_str(&response).map_err(|e| format!("解析失败: {}", e))
}

#[tauri::command]
pub async fn auto_categorize(
    state: State<'_, AppState>,
    task: String,
) -> Result<String, String> {
    let client_guard = state.ai_client.read().await;
    let client = client_guard.as_ref().ok_or("请先配置 API Key")?;

    let prompt = AUTO_CATEGORIZE_PROMPT.replace("{task}", &task);
    let messages = vec![
        Message { role: "user".to_string(), content: prompt },
    ];

    client.chat(&state.model, messages).await.map_err(|e| e.to_string())
}
```

### 前端 AI Hook

```typescript
// src/hooks/useAI.ts
import { invoke } from '@tauri-apps/api/core';
import { useState } from 'react';

interface SubTask {
  title: string;
  priority: number;
}

export function useAI() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const setApiKey = async (apiKey: string) => {
    try {
      await invoke('set_api_key', { apiKey });
    } catch (e) {
      setError(String(e));
      throw e;
    }
  };

  const breakdownTask = async (task: string): Promise<SubTask[]> => {
    setIsLoading(true);
    setError(null);
    try {
      return await invoke('breakdown_task', { task });
    } catch (e) {
      setError(String(e));
      throw e;
    } finally {
      setIsLoading(false);
    }
  };

  const autoCategorize = async (task: string): Promise<string> => {
    return await invoke('auto_categorize', { task });
  };

  const parseNaturalLanguage = async (input: string) => {
    return await invoke('parse_natural_language', { input });
  };

  return { 
    setApiKey, 
    breakdownTask, 
    autoCategorize,
    parseNaturalLanguage,
    isLoading, 
    error 
  };
}
```

## 依赖清单

### Rust (src-tauri/Cargo.toml)

```toml
[dependencies]
tauri = { version = "2", features = ["tray-icon", "devtools"] }
tauri-plugin-shell = "2"
tauri-plugin-store = "2"         # 非敏感配置存储 (例如模型)
keyring = "2"                    # macOS Keychain 存储 API Key
serde = { version = "1", features = ["derive"] }
serde_json = "1"
tokio = { version = "1", features = ["full"] }
sqlx = { version = "0.8", features = ["runtime-tokio", "sqlite"] }
uuid = { version = "1", features = ["v4", "serde"] }
chrono = { version = "0.4", features = ["serde"] }
log = "0.4"
env_logger = "0.11"

# HTTP 客户端 (调用百炼 API)
reqwest = { version = "0.12", features = ["json", "stream"] }
futures = "0.3"                   # 流式响应处理

[build-dependencies]
tauri-build = { version = "2", features = [] }
```

### Node.js (package.json)

```json
{
  "dependencies": {
    "@tauri-apps/api": "^2",
    "@tauri-apps/plugin-shell": "^2",
    "react": "^18",
    "react-dom": "^18",
    "zustand": "^4",
    "@radix-ui/react-icons": "^1",
    "class-variance-authority": "^0.7",
    "clsx": "^2",
    "tailwind-merge": "^2",
    "date-fns": "^3"
  },
  "devDependencies": {
    "@tauri-apps/cli": "^2",
    "@types/react": "^18",
    "@types/react-dom": "^18",
    "typescript": "^5",
    "vite": "^5",
    "@vitejs/plugin-react": "^4",
    "tailwindcss": "^3",
    "autoprefixer": "^10",
    "postcss": "^8"
  }
}
```

## 开发里程碑

| 阶段 | 时间 | 交付物 |
|------|------|--------|
| Phase 1 | Day 1-3 | 可运行的基础 ToDo 应用 |
| Phase 2 | Day 4-6 | 完整功能的任务管理 |
| Phase 3 | Day 7-9 | 百炼 API 集成完成 |
| Phase 4 | Day 10-11 | AI 交互优化 |
| Phase 5 | Day 12-13 | 打包发布 |

**总计: 约 2 周**

## 风险与对策

| 风险 | 影响 | 对策 |
|------|------|------|
| API 调用失败 | AI 功能不可用 | 自动重试、3次后提示用户、离线降级方案 |
| API Key 泄露 | 安全风险 | 使用 tauri-plugin-store 加密存储、不在日志中打印 |
| AI 输出质量不稳定 | 功能不可用 | 完善 Prompt、JSON 输出验证、重试机制 |
| 网络延迟高 | 用户体验差 | 流式输出、加载动画、响应缓存 |
| API 费用超支 | 成本失控 | 默认使用低价模型、用量统计显示、设置预警 |

## GitHub 开源设置

### 仓库结构

```
ai-todo/
├── .github/
│   ├── workflows/
│   │   └── release.yml        # macOS 自动构建发布
│   ├── ISSUE_TEMPLATE/
│   └── PULL_REQUEST_TEMPLATE.md
├── docs/
│   ├── README_CN.md          # 中文文档
│   └── API_KEY_GUIDE.md      # API Key 配置指南
├── README.md
├── LICENSE                    # MIT License
└── CHANGELOG.md
```

### README.md 内容要点

```markdown
# 番茄todo 📝✨

> 免费开源的智能任务管理应用 - macOS 专版

## 特性

- 🍎 **macOS 专属** - 针对 Apple Silicon (M1/M2/M3/M4) 优化
- ✅ 完全免费,永久开源
- 🤖 AI 智能任务拆解/分类
- 🔑 用户自带百炼 API Key,数据完全本地

## 系统要求

- macOS 11.0 (Big Sur) 或更高版本
- Apple Silicon 芯片 (M1/M2/M3/M4)

## 快速开始

1. 下载 DMG: [Releases](releases)
2. 获取百炼 API Key: [API Key 配置指南](docs/API_KEY_GUIDE.md)
3. 在应用设置中输入 API Key
4. 开始使用!

## License

MIT
```

### GitHub Actions - macOS 发布

```yaml
# .github/workflows/release.yml
name: Release

on:
  push:
    tags: ['v*']

jobs:
  release:
    permissions:
      contents: write
    runs-on: macos-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - uses: dtolnay/rust-toolchain@stable
        with:
          targets: aarch64-apple-darwin
      - name: Install dependencies
        run: npm ci
      - uses: tauri-apps/tauri-action@v0
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        with:
          tagName: v__VERSION__
          releaseName: '番茄todo v__VERSION__'
          releaseBody: 'macOS (Apple Silicon) 版本'
          releaseDraft: true
          prerelease: false
          args: --target aarch64-apple-darwin
```

## 后续扩展

* 📅 日历视图集成
* 🔄 iCloud 同步 (macOS 原生)
* 📱 iOS 版本 (Tauri 2.x 支持)
* 🗣️ 语音输入 (macOS 语音识别)
* 🔌 支持更多 AI 提供商 (OpenAI, Claude 等)
* 💻 Intel Mac 支持 (x86_64-apple-darwin)
