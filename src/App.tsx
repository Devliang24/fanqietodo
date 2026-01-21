import { useEffect, useMemo, useRef, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Store } from "@tauri-apps/plugin-store";
import "./App.css";
import { useTodoStore } from "./stores/todoStore";
import type { Todo } from "./types/todo";
import { Settings } from "./components/Settings";

function formatDueDate(dueDate?: number | null) {
  if (!dueDate) return "无截止";
  const date = new Date(dueDate * 1000);
  return `${date.getMonth() + 1}月${date.getDate()}日`;
}

function priorityLabel(priority: number) {
  if (priority <= 1) return { label: "🔴 高", color: "bg-red-500" };
  if (priority === 2) return { label: "🟡 中", color: "bg-yellow-400" };
  return { label: "🟢 低", color: "bg-green-500" };
}

function parseDateToTimestamp(dateValue: string) {
  if (!dateValue) return undefined;
  const [year, month, day] = dateValue.split("-").map((v) => Number(v));
  if (!year || !month || !day) return undefined;
  return Math.floor(new Date(year, month - 1, day).getTime() / 1000);
}
function timestampToDateInput(timestamp?: number | null) {
  if (!timestamp) return "";
  const date = new Date(timestamp * 1000);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function isToday(timestamp?: number | null) {
  if (!timestamp) return false;
  const date = new Date(timestamp * 1000);
  const now = new Date();
  return (
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate()
  );
}

type FilterKey = "all" | "today" | "completed";

function parseLocalInput(input: string) {
  let title = input.trim();
  let priority: number | undefined;
  let dueDate = "";

  if (title.includes("高")) priority = 1;
  if (title.includes("低")) priority = 3;
  if (title.includes("中")) priority = priority ?? 2;

  const now = new Date();
  if (title.includes("今天")) {
    dueDate = timestampToDateInput(Math.floor(now.getTime() / 1000));
    title = title.replace("今天", "").trim();
  } else if (title.includes("明天")) {
    const tomorrow = new Date(now);
    tomorrow.setDate(now.getDate() + 1);
    dueDate = timestampToDateInput(Math.floor(tomorrow.getTime() / 1000));
    title = title.replace("明天", "").trim();
  } else if (title.includes("后天")) {
    const after = new Date(now);
    after.setDate(now.getDate() + 2);
    dueDate = timestampToDateInput(Math.floor(after.getTime() / 1000));
    title = title.replace("后天", "").trim();
  }

  return { title: title.trim() || input.trim(), priority, dueDate };
}

function App() {
  const [title, setTitle] = useState("");
  const [priority, setPriority] = useState(2);
  const [dueDate, setDueDate] = useState("");
  const [filter, setFilter] = useState<FilterKey>("all");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [aiReady, setAiReady] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiLoadingId, setAiLoadingId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editPriority, setEditPriority] = useState(2);
  const [editDueDate, setEditDueDate] = useState("");
  const storeRef = useRef<Store | null>(null);
  const { todos, loading, error, loadTodos, addTodo, updateTodo, deleteTodo } =
    useTodoStore();

  useEffect(() => {
    loadTodos();
  }, [loadTodos]);

  useEffect(() => {
    let mounted = true;
    const loadConfig = async () => {
      try {
        if (!storeRef.current) {
          storeRef.current = await Store.load("settings.json");
        }

        const savedModel = await storeRef.current.get<string>("model");
        const model = savedModel ? String(savedModel) : "qwen-turbo";

        // legacy migration: if apiKey was stored previously, move it to Keychain and remove it from store
        const legacyKey = await storeRef.current.get<string>("apiKey");
        if (legacyKey) {
          await invoke("set_ai_config", { apiKey: String(legacyKey), model });
          await storeRef.current.delete("apiKey");
          await storeRef.current.save();
        } else {
          await invoke("set_ai_config", { model });
        }

        const status = await invoke<{ has_api_key: boolean }>("get_ai_status");
        if (mounted) {
          setAiReady(Boolean(status.has_api_key));
        }
      } catch (err) {
        if (mounted) {
          setAiError(String(err));
        }
      }
    };

    loadConfig();
    return () => {
      mounted = false;
    };
  }, []);

  const stats = useMemo(() => {
    const total = todos.length;
    const completed = todos.filter((t) => t.status === "completed").length;
    const today = todos.filter((t) => isToday(t.due_date)).length;
    return { total, completed, today };
  }, [todos]);

  const topLevelTodos = todos.filter((todo) => !todo.parent_id);
  const filteredTodos = topLevelTodos.filter((todo) => {
    if (filter === "completed") return todo.status === "completed";
    if (filter === "today") return isToday(todo.due_date);
    return true;
  });

  const handleAdd = async () => {
    const trimmed = title.trim();
    if (!trimmed) return;
    let finalTitle = trimmed;
    let finalPriority = priority;
    let finalDueDate = dueDate;

    if (aiReady) {
      try {
        const result = await invoke<{
          title: string;
          priority?: number | null;
          due_date?: number | null;
        }>("parse_natural_language", { input: trimmed });
        finalTitle = result.title || finalTitle;
        if (result.priority) finalPriority = result.priority;
        if (result.due_date) {
          finalDueDate = timestampToDateInput(result.due_date);
        }
      } catch (err) {
        const parsed = parseLocalInput(trimmed);
        finalTitle = parsed.title;
        if (parsed.priority) finalPriority = parsed.priority;
        if (parsed.dueDate) finalDueDate = parsed.dueDate;
      }
    } else {
      const parsed = parseLocalInput(trimmed);
      finalTitle = parsed.title;
      if (parsed.priority) finalPriority = parsed.priority;
      if (parsed.dueDate) finalDueDate = parsed.dueDate;
    }

    await addTodo({
      title: finalTitle,
      priority: finalPriority,
      due_date: parseDateToTimestamp(finalDueDate),
    });
    setTitle("");
    setPriority(2);
    setDueDate("");
  };

  const toggleStatus = async (todo: Todo) => {
    await updateTodo({
      id: todo.id,
      status: todo.status === "completed" ? "pending" : "completed",
    });
  };

  const refreshAiConfig = async () => {
    try {
      if (!storeRef.current) {
        storeRef.current = await Store.load("settings.json");
      }

      const savedModel = await storeRef.current.get<string>("model");
      const model = savedModel ? String(savedModel) : "qwen-turbo";

      const legacyKey = await storeRef.current.get<string>("apiKey");
      if (legacyKey) {
        await invoke("set_ai_config", { apiKey: String(legacyKey), model });
        await storeRef.current.delete("apiKey");
        await storeRef.current.save();
      } else {
        await invoke("set_ai_config", { model });
      }

      const status = await invoke<{ has_api_key: boolean }>("get_ai_status");
      setAiReady(Boolean(status.has_api_key));
    } catch (err) {
      setAiError(String(err));
    }
  };

  const startEdit = (todo: Todo) => {
    setEditingId(todo.id);
    setEditTitle(todo.title);
    setEditPriority(todo.priority);
    setEditDueDate(timestampToDateInput(todo.due_date));
  };

  const saveEdit = async () => {
    if (!editingId) return;
    const trimmed = editTitle.trim() || "未命名任务";
    await updateTodo({
      id: editingId,
      title: trimmed,
      priority: editPriority,
      due_date: parseDateToTimestamp(editDueDate),
    });
    setEditingId(null);
  };

  const cancelEdit = () => {
    setEditingId(null);
  };

  const handleAiParse = async () => {
    const trimmed = title.trim();
    if (!trimmed) return;
    setAiError(null);
    if (!aiReady) {
      const parsed = parseLocalInput(trimmed);
      setTitle(parsed.title);
      if (parsed.priority) setPriority(parsed.priority);
      if (parsed.dueDate) setDueDate(parsed.dueDate);
      return;
    }
    try {
      const result = await invoke<{
        title: string;
        priority?: number | null;
        due_date?: number | null;
      }>("parse_natural_language", { input: trimmed });
      setTitle(result.title || trimmed);
      if (result.priority) setPriority(result.priority);
      if (result.due_date) setDueDate(timestampToDateInput(result.due_date));
    } catch (err) {
      setAiError(String(err));
    }
  };

  const handleBreakdown = async (todo: Todo) => {
    setAiError(null);
    if (!aiReady) {
      setSettingsOpen(true);
      setAiError("请先在设置中配置 API Key");
      return;
    }
    try {
      setAiLoadingId(todo.id);
      const subtasks = await invoke<
        { title: string; priority?: number | null }[]
      >("breakdown_task", { task: todo.title });
      for (const sub of subtasks) {
        await addTodo({
          title: sub.title,
          priority: sub.priority ?? 2,
          parent_id: todo.id,
          ai_generated: true,
        });
      }
    } catch (err) {
      setAiError(String(err));
    } finally {
      setAiLoadingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="mx-auto flex w-full max-w-3xl items-center justify-between px-6 py-6">
        <div className="flex items-center gap-2 text-lg font-semibold">
          <span>🍅</span>
          <span>番茄todo</span>
        </div>
        <button
          className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-600 shadow-sm hover:border-slate-300"
          onClick={() => setSettingsOpen(true)}
        >
          设置
        </button>
      </header>

      <main className="mx-auto w-full max-w-3xl px-6 pb-16">
        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <span className="text-xl">➕</span>
            <input
              className="w-full border-none bg-transparent text-base placeholder:text-slate-400 focus:outline-none"
              placeholder="输入任务...（支持自然语言）"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  handleAdd();
                }
              }}
            />
            <button
              className="rounded-lg bg-amber-100 px-3 py-1.5 text-sm text-amber-800 hover:bg-amber-200"
              onClick={handleAiParse}
            >
              ✨ AI
            </button>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-slate-500">
            <div className="flex items-center gap-2">
              <span className="text-slate-400">优先级</span>
              <div className="flex items-center gap-1 rounded-full bg-slate-50 p-1">
                <button
                  className={`rounded-full px-2 py-0.5 text-xs ${
                    priority === 1
                      ? "bg-red-100 text-red-700"
                      : "text-slate-500"
                  }`}
                  onClick={() => setPriority(1)}
                >
                  🔴 高
                </button>
                <button
                  className={`rounded-full px-2 py-0.5 text-xs ${
                    priority === 2
                      ? "bg-yellow-100 text-yellow-700"
                      : "text-slate-500"
                  }`}
                  onClick={() => setPriority(2)}
                >
                  🟡 中
                </button>
                <button
                  className={`rounded-full px-2 py-0.5 text-xs ${
                    priority === 3
                      ? "bg-green-100 text-green-700"
                      : "text-slate-500"
                  }`}
                  onClick={() => setPriority(3)}
                >
                  🟢 低
                </button>
              </div>
            </div>
            <label className="flex items-center gap-2">
              <span className="text-slate-400">截止日期</span>
              <input
                type="date"
                value={dueDate}
                onChange={(event) => setDueDate(event.target.value)}
                className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-sm text-slate-600"
              />
            </label>
          </div>
        </section>

        <section className="mt-6 flex items-center gap-4 text-sm text-slate-500">
          <button
            className={`rounded-full px-3 py-1 ${
              filter === "all"
                ? "bg-slate-100 text-slate-700"
                : "text-slate-500"
            }`}
            onClick={() => setFilter("all")}
          >
            全部 {stats.total}
          </button>
          <button
            className={`rounded-full px-3 py-1 ${
              filter === "today"
                ? "bg-slate-100 text-slate-700"
                : "text-slate-500"
            }`}
            onClick={() => setFilter("today")}
          >
            今天 {stats.today}
          </button>
          <button
            className={`rounded-full px-3 py-1 ${
              filter === "completed"
                ? "bg-slate-100 text-slate-700"
                : "text-slate-500"
            }`}
            onClick={() => setFilter("completed")}
          >
            已完成 {stats.completed}
          </button>
        </section>
        <section className="mt-4 space-y-3">
          {loading && (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-4 text-sm text-slate-500">
              正在加载任务...
            </div>
          )}
          {error && (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-600">
              {error}
            </div>
          )}
          {aiError && (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-700">
              {aiError}
            </div>
          )}
          {!loading && filteredTodos.length === 0 && (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-4 text-sm text-slate-500">
              还没有任务，输入上方任务开始。
            </div>
          )}
          {filteredTodos.map((todo) => {
            const priority = priorityLabel(todo.priority);
            const children = todos.filter((t) => t.parent_id === todo.id);
            return (
              <div
                key={todo.id}
                className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <button
                      className="h-4 w-4 rounded-full border border-slate-300"
                      onClick={() => toggleStatus(todo)}
                      aria-label="toggle todo"
                    />
                    <div>
                      {editingId === todo.id ? (
                        <div className="space-y-3">
                          <input
                            value={editTitle}
                            onChange={(event) => setEditTitle(event.target.value)}
                            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none"
                          />
                          <div className="flex flex-wrap items-center gap-3 text-sm text-slate-500">
                            <div className="flex items-center gap-2">
                              <span className="text-slate-400">优先级</span>
                              <div className="flex items-center gap-1 rounded-full bg-slate-50 p-1">
                                <button
                                  className={`rounded-full px-2 py-0.5 text-xs ${
                                    editPriority === 1
                                      ? "bg-red-100 text-red-700"
                                      : "text-slate-500"
                                  }`}
                                  onClick={() => setEditPriority(1)}
                                >
                                  🔴 高
                                </button>
                                <button
                                  className={`rounded-full px-2 py-0.5 text-xs ${
                                    editPriority === 2
                                      ? "bg-yellow-100 text-yellow-700"
                                      : "text-slate-500"
                                  }`}
                                  onClick={() => setEditPriority(2)}
                                >
                                  🟡 中
                                </button>
                                <button
                                  className={`rounded-full px-2 py-0.5 text-xs ${
                                    editPriority === 3
                                      ? "bg-green-100 text-green-700"
                                      : "text-slate-500"
                                  }`}
                                  onClick={() => setEditPriority(3)}
                                >
                                  🟢 低
                                </button>
                              </div>
                            </div>
                            <label className="flex items-center gap-2">
                              <span className="text-slate-400">截止日期</span>
                              <input
                                type="date"
                                value={editDueDate}
                                onChange={(event) =>
                                  setEditDueDate(event.target.value)
                                }
                                className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-sm text-slate-600"
                              />
                            </label>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              className="rounded-lg bg-slate-900 px-3 py-1.5 text-sm text-white hover:bg-slate-800"
                              onClick={saveEdit}
                            >
                              保存
                            </button>
                            <button
                              className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50"
                              onClick={cancelEdit}
                            >
                              取消
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div
                            className={`text-base font-medium ${
                              todo.status === "completed"
                                ? "line-through text-slate-400"
                                : ""
                            }`}
                          >
                            {todo.title}
                          </div>
                          <div className="mt-2 flex items-center gap-2 text-sm text-slate-500">
                            <span
                              className={`h-2 w-2 rounded-full ${priority.color}`}
                            />
                            {formatDueDate(todo.due_date)}
                          </div>
                          {children.length > 0 && (
                            <div className="mt-3 space-y-2 text-sm text-slate-500">
                              {children.map((child) => (
                                <div
                                  key={child.id}
                                  className="group flex items-center gap-2 pl-4"
                                >
                                  <button
                                    className={`flex h-4 w-4 items-center justify-center rounded-full border text-[10px] ${
                                      child.status === "completed"
                                        ? "border-emerald-400 bg-emerald-50 text-emerald-600"
                                        : "border-slate-300 text-transparent hover:border-slate-400"
                                    }`}
                                    onClick={() => toggleStatus(child)}
                                    aria-label="toggle subtask"
                                  >
                                    ✓
                                  </button>

                                  {editingId === child.id ? (
                                    <div className="flex w-full items-center gap-2">
                                      <input
                                        value={editTitle}
                                        onChange={(event) =>
                                          setEditTitle(event.target.value)
                                        }
                                        className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-700 focus:border-slate-400 focus:outline-none"
                                      />
                                      <button
                                        className="rounded-lg bg-slate-900 px-2.5 py-1.5 text-xs text-white hover:bg-slate-800"
                                        onClick={saveEdit}
                                      >
                                        保存
                                      </button>
                                      <button
                                        className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs text-slate-600 hover:bg-slate-50"
                                        onClick={cancelEdit}
                                      >
                                        取消
                                      </button>
                                    </div>
                                  ) : (
                                    <>
                                      <div
                                        className={`flex-1 ${
                                          child.status === "completed"
                                            ? "line-through text-slate-400"
                                            : "text-slate-600"
                                        }`}
                                      >
                                        {child.title}
                                      </div>
                                      <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                                        <button
                                          className="rounded-md border border-slate-200 px-2 py-1 text-xs text-slate-600 hover:bg-slate-50"
                                          onClick={() => startEdit(child)}
                                        >
                                          编辑
                                        </button>
                                        <button
                                          className="rounded-md border border-slate-200 bg-white px-2 py-1 text-xs text-slate-600 hover:bg-slate-50"
                                          onClick={() => deleteTodo(child.id)}
                                        >
                                          删除
                                        </button>
                                      </div>
                                    </>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-slate-400">
                      {priority.label}
                    </span>
                    {editingId !== todo.id && (
                      <button
                        className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50"
                        onClick={() => startEdit(todo)}
                      >
                        编辑
                      </button>
                    )}
                    <button
                      className="rounded-lg bg-amber-50 px-3 py-1.5 text-sm text-amber-700 hover:bg-amber-100"
                      onClick={() => handleBreakdown(todo)}
                      disabled={aiLoadingId === todo.id}
                    >
                      {aiLoadingId === todo.id ? "拆解中..." : "✨ 拆解"}
                    </button>
                    <button
                      className="rounded-lg bg-slate-100 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-200"
                      onClick={() => deleteTodo(todo.id)}
                    >
                      删除
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </section>
      </main>
      <Settings
        isOpen={settingsOpen}
        onClose={() => {
          setSettingsOpen(false);
          refreshAiConfig();
        }}
      />
    </div>
  );
}

export default App;
