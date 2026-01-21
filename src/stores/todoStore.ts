import { create } from "zustand";
import { invoke } from "@tauri-apps/api/core";
import type { CreateTodoInput, Todo, UpdateTodoInput } from "../types/todo";

interface TodoState {
  todos: Todo[];
  loading: boolean;
  error: string | null;
  loadTodos: () => Promise<void>;
  addTodo: (input: CreateTodoInput) => Promise<void>;
  updateTodo: (input: UpdateTodoInput) => Promise<void>;
  deleteTodo: (id: string) => Promise<void>;
}

export const useTodoStore = create<TodoState>((set, get) => ({
  todos: [],
  loading: false,
  error: null,
  loadTodos: async () => {
    set({ loading: true, error: null });
    try {
      const todos = await invoke<Todo[]>("list_todos");
      set({ todos });
    } catch (err) {
      set({ error: String(err) });
    } finally {
      set({ loading: false });
    }
  },
  addTodo: async (input) => {
    set({ loading: true, error: null });
    try {
      const created = await invoke<Todo>("create_todo", { input });
      set({ todos: [created, ...get().todos] });
    } catch (err) {
      set({ error: String(err) });
    } finally {
      set({ loading: false });
    }
  },
  updateTodo: async (input) => {
    set({ loading: true, error: null });
    try {
      const updated = await invoke<Todo>("update_todo", { input });
      set({
        todos: get().todos.map((todo) =>
          todo.id === updated.id ? updated : todo,
        ),
      });
    } catch (err) {
      set({ error: String(err) });
    } finally {
      set({ loading: false });
    }
  },
  deleteTodo: async (id) => {
    set({ loading: true, error: null });
    try {
      await invoke<void>("delete_todo", { id });

      const currentTodos = get().todos;
      const idsToDelete = new Set<string>();
      const queue: string[] = [id];

      while (queue.length > 0) {
        const current = queue.pop();
        if (!current) continue;
        if (idsToDelete.has(current)) continue;
        idsToDelete.add(current);
        for (const t of currentTodos) {
          if (t.parent_id === current) queue.push(t.id);
        }
      }

      set({
        todos: currentTodos.filter((todo) => !idsToDelete.has(todo.id)),
      });
    } catch (err) {
      set({ error: String(err) });
    } finally {
      set({ loading: false });
    }
  },
}));
