# Fanqie Todo (番茄todo)

<div align="center">

![Fanqie Todo](https://img.shields.io/badge/Fanqie%20Todo-AI%20ToDo%20App-red?style=for-the-badge)
![Tauri](https://img.shields.io/badge/Tauri-2.x-24C8DB?style=flat-square&logo=tauri)
![React](https://img.shields.io/badge/React-19-61dafb?style=flat-square&logo=react)
![Rust](https://img.shields.io/badge/Rust-stable-000000?style=flat-square&logo=rust)
![SQLite](https://img.shields.io/badge/SQLite-Local%20First-003B57?style=flat-square&logo=sqlite)
![macOS](https://img.shields.io/badge/macOS-Apple%20Silicon-000000?style=flat-square&logo=apple)

**AI‑Powered macOS ToDo — Natural Language Parsing / Task Breakdown / Subtasks**
</div>

---

## ✨ Features
- **📝 Task Management** — Create, edit, complete, delete tasks with priority & due date
- **🧩 Subtasks** — Independent toggle/edit/delete, AI breakdown generates subtasks
- **🤖 AI Assistant** — Natural language parsing & intelligent breakdown (DashScope/Qwen)
- **🔍 Filters** — All / Today / Completed
- **🔐 Secure Storage** — API key stored in macOS Keychain
- **💾 Local‑First** — SQLite local database, no backend server

## 🏗️ Technical Architecture
```
┌─────────────────────────────────────────────────────────────────┐
│ Frontend (React + Vite)                                         │
│ ┌───────────┐ ┌────────────┐ ┌────────────┐ ┌──────────────────┐ │
│ │ Zustand   │ │ Tailwind   │ │ UI States  │ │ App Components   │ │
│ └───────────┘ └────────────┘ └────────────┘ └──────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                         │ Tauri Commands
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│ Backend (Rust + Tauri)                                          │
│ ┌───────────┐ ┌────────────┐ ┌────────────┐ ┌──────────────────┐ │
│ │ SQLx      │ │ Keychain   │ │ DashScope  │ │ Tauri Commands   │ │
│ └───────────┘ └────────────┘ └────────────┘ └──────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                         ▼
                    ┌──────────┐
                    │ SQLite   │
                    │ Database │
                    └──────────┘
```

### Core Tech Stack
| Layer | Technology |
|-------|------------|
| Desktop Framework | Tauri 2.x |
| Frontend Framework | React 19 + Vite |
| State Management | Zustand |
| Styling | Tailwind CSS |
| Backend | Rust |
| Database | SQLite + SQLx |
| AI | Alibaba Cloud DashScope (Qwen) |
| Secure Storage | macOS Keychain (keyring) |

## 🚀 Quick Start
### Prerequisites
- macOS (Apple Silicon recommended)
- Node.js >= 18
- Rust toolchain (stable)
- Xcode Command Line Tools (`xcode-select --install`)

### Installation
1. **Clone the repository**
```bash
git clone https://github.com/Devliang24/fanqietodo.git
cd fanqietodo
```

2. **Install dependencies**
```bash
npm install
```

3. **Run in development**
```bash
npm run tauri dev
```

4. **Build DMG (Release)**
```bash
npm run tauri -- build --ci
```
DMG output: `src-tauri/target/release/bundle/dmg/番茄todo_*.dmg`

## 📁 Project Structure
```
fanqie-todo/
├── src/                          # React frontend
│   ├── App.tsx                   # Main UI
│   ├── components/               # UI components (Settings)
│   ├── stores/                   # Zustand store
│   └── types/                    # Type definitions
├── src-tauri/                    # Rust backend (Tauri)
│   ├── src/
│   │   ├── commands/             # Tauri commands
│   │   ├── ai/                   # AI integration
│   │   ├── db/                   # SQLite init + migrations
│   │   └── secure_storage.rs     # Keychain storage
│   ├── migrations/               # SQLx migrations
│   ├── icons/                    # App icons
│   └── tauri.conf.json           # Tauri config
├── docs/                         # Documentation
└── README.md
```

## 🔧 Configuration
### AI Key & Model
- Configure the API key in **Settings** (stored in **macOS Keychain**)
- Model preference is stored in `settings.json` (non‑sensitive)

### Database
- SQLite file is stored in Tauri `app_data_dir` as `fanqie-todo.db`
- Migrations live in `src-tauri/migrations/` and run automatically on startup

## 📖 Usage Guide (Detailed)
### 1) Create a Task
1. Type a task in the input box.
2. Optionally set **Priority** and **Due Date**.
3. Press **Enter** to add.

### 2) Edit a Task
1. Click **Edit** on the task card.
2. Update title / priority / due date.
3. Click **Save**.

### 3) Complete a Task
1. Click the circle checkbox on the left of a task.
2. Completed tasks are struck through and show in **Completed** filter.

### 4) Delete a Task
1. Click **Delete** on a task card.
2. All subtasks under it are removed automatically.

### 5) AI Parse (Natural Language)
1. Enter a natural language input (e.g. “Tomorrow finish report, high priority”).
2. Click **✨ AI** to auto‑fill title / priority / due date.

### 6) AI Breakdown (Subtasks)
1. Click **✨ Breakdown** on a task.
2. Subtasks appear under the parent task.

### 7) Manage Subtasks
1. Subtasks can be **toggled**, **edited**, or **deleted** independently.
2. Hover a subtask to reveal actions.

### 8) Filters
- **All**: All top‑level tasks
- **Today**: Due today
- **Completed**: Completed tasks only

### 9) Settings & API Key
- Open **Settings** to configure DashScope API Key and model.
- API Key is stored in **macOS Keychain** (never in plain text).

## 🛠️ Development Guide
### Database Migrations
Add SQL files to `src-tauri/migrations/`. They auto‑apply on app start.

### Common Commands
```bash
npm run tauri dev           # development
npm run tauri -- build --ci # DMG bundle
```

### Icon Regeneration
Place a square PNG (1024x1024) at `src-tauri/icons/icon.png` and run:
```bash
npm run tauri -- icon src-tauri/icons/icon.png
```

## 🧪 Running Tests
No automated tests yet (contributions welcome).

## 📝 Tauri Commands
Main commands invoked from the frontend:
- `create_todo`, `list_todos`, `update_todo`, `delete_todo`, `get_todo_by_id`
- `parse_natural_language`, `breakdown_task`
- `get_ai_status`, `set_ai_config`, `clear_ai_api_key`

## ❓ FAQ
**Q1: DMG build fails on my Mac. What should I do?**  
Run the CI‑friendly bundle command:
```bash
npm run tauri -- build --ci
```
If it still fails, ensure **Xcode Command Line Tools** are installed.

**Q2: Where is my data stored?**  
The SQLite database is saved in Tauri’s `app_data_dir` as `fanqie-todo.db`.

**Q3: Is my API Key secure?**  
Yes. It is stored in **macOS Keychain**, not in the local settings file.

**Q4: AI features are not working.**  
Open **Settings**, configure your DashScope API Key and select a model.

**Q5: How do I reset the app data?**  
Quit the app and delete the `fanqie-todo.db` file in the app data directory.

## 🤝 Contributing
1. Fork the repo
2. Create a branch (`git checkout -b feature/awesome`)
3. Commit changes (`git commit -m "Add awesome"`)
4. Push (`git push origin feature/awesome`)
5. Open a PR

## 📄 License
No license declared yet (TBD).

## 🙏 Acknowledgments
- [Tauri](https://tauri.app/) — desktop framework
- [React](https://react.dev/) — UI library
- [Rust](https://www.rust-lang.org/) — backend language
- [SQLite](https://www.sqlite.org/) — lightweight database
- [Tailwind CSS](https://tailwindcss.com/) — styling
- [Zustand](https://zustand-demo.pmnd.rs/) — state management
- [DashScope](https://dashscope.aliyun.com/) — AI model service

## 📞 Contact
- GitHub: [@Devliang24](https://github.com/Devliang24)
- Repository: https://github.com/Devliang24/fanqietodo

---
<div align="center">
**If this project helps you, please ⭐ Star it!**
</div>
