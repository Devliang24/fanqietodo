import { useEffect, useRef, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Store } from "@tauri-apps/plugin-store";

interface SettingsProps {
  isOpen: boolean;
  onClose: () => void;
}

export function Settings({ isOpen, onClose }: SettingsProps) {
  const [apiKey, setApiKey] = useState("");
  const [model, setModel] = useState("qwen-turbo");
  const [hasKey, setHasKey] = useState(false);
  const [saving, setSaving] = useState(false);
  const storeRef = useRef<Store | null>(null);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      if (!storeRef.current) {
        storeRef.current = await Store.load("settings.json");
      }

      // model is non-sensitive: stored in plugin-store
      const savedModel = await storeRef.current.get<string>("model");
      if (mounted) {
        setModel(savedModel ? String(savedModel) : "qwen-turbo");
        setApiKey("");
      }

      // legacy migration: if apiKey was stored previously, move it to Keychain and remove it from store
      const legacyKey = await storeRef.current.get<string>("apiKey");
      if (legacyKey) {
        await invoke("set_ai_config", {
          apiKey: String(legacyKey),
          model: savedModel ? String(savedModel) : "qwen-turbo",
        });
        await storeRef.current.delete("apiKey");
        await storeRef.current.save();
      }

      const status = await invoke<{ has_api_key: boolean; model: string }>(
        "get_ai_status",
      );
      if (mounted) {
        setHasKey(Boolean(status.has_api_key));
        // If no model stored yet, use backend default/model
        if (!savedModel && status.model) setModel(status.model);
      }
    };

    if (isOpen) {
      load().catch((err) => {
        if (mounted) {
          console.error(err);
        }
      });
    }

    return () => {
      mounted = false;
    };
  }, [isOpen]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const trimmed = apiKey.trim();
      const payload: Record<string, unknown> = { model };
      if (trimmed) payload.apiKey = trimmed;

      await invoke("set_ai_config", payload);

      if (!storeRef.current) {
        storeRef.current = await Store.load("settings.json");
      }
      await storeRef.current.set("model", model);
      // never persist raw API key in the store
      await storeRef.current.delete("apiKey");
      await storeRef.current.save();

      const status = await invoke<{ has_api_key: boolean }>("get_ai_status");
      setHasKey(Boolean(status.has_api_key));

      alert("配置已保存");
      onClose();
    } catch (err) {
      alert(`保存失败: ${err}`);
    } finally {
      setSaving(false);
    }
  };

  const handleClearKey = async () => {
    setSaving(true);
    try {
      await invoke("clear_ai_api_key");
      if (!storeRef.current) {
        storeRef.current = await Store.load("settings.json");
      }
      await storeRef.current.delete("apiKey");
      await storeRef.current.save();
      setApiKey("");
      setHasKey(false);
      alert("API Key 已清除");
    } catch (err) {
      alert(`清除失败: ${err}`);
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="mb-4 text-xl font-semibold">设置</h2>
        <section className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700">
              API Key
            </label>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder={hasKey ? "已配置（留空则保持不变）" : "sk-xxx"}
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none"
            />
            <p className="mt-1 text-xs text-slate-400">
              API Key 将保存在 macOS Keychain（更安全），不会写入 settings.json
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">
              模型
            </label>
            <select
              value={model}
              onChange={(e) => setModel(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none"
            >
              <option value="qwen-turbo">qwen-turbo (推荐)</option>
              <option value="qwen-plus">qwen-plus</option>
              <option value="qwen-max">qwen-max</option>
              <option value="deepseek-r1">deepseek-r1</option>
            </select>
          </div>
        </section>
        <div className="mt-6 flex flex-wrap items-center gap-3">
          <button
            onClick={handleSave}
            disabled={saving}
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
          >
            {saving ? "保存中..." : "保存"}
          </button>
          <button
            onClick={handleClearKey}
            disabled={saving || !hasKey}
            className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-700 hover:bg-amber-100 disabled:opacity-50"
          >
            清除 API Key
          </button>
          <button
            onClick={onClose}
            className="rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50"
          >
            取消
          </button>
        </div>
      </div>
    </div>
  );
}
