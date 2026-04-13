"use client";

import { useEffect, useState } from "react";
import { apiKeyWarning, clearApiKey, hasApiKey, loadApiKey, saveApiKey } from "@/lib/ai/key-vault";

interface Props {
  onChange?: (hasKey: boolean) => void;
}

export default function ApiKeyInput({ onChange }: Props) {
  const [stored, setStored] = useState(false);
  const [input, setInput] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);

  useEffect(() => {
    hasApiKey().then((v) => {
      setStored(v);
      onChange?.(v);
    });
  }, [onChange]);

  async function onSave() {
    setError(null);
    setMessage(null);
    try {
      await saveApiKey(input.trim());
      setStored(true);
      setInput("");
      setMessage("키가 암호화되어 저장되었습니다.");
      onChange?.(true);
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function onClear() {
    await clearApiKey();
    setStored(false);
    setMessage("키가 삭제되었습니다.");
    onChange?.(false);
  }

  async function onTest() {
    setError(null);
    setMessage(null);
    const key = await loadApiKey();
    if (!key) {
      setError("저장된 키를 찾을 수 없습니다.");
      return;
    }
    setMessage(`키 길이 ${key.length}자, 접두사 확인 완료.`);
  }

  return (
    <section className="space-y-3 rounded border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
      <h2 className="text-lg font-medium">Anthropic API 키</h2>
      <p className="text-xs text-neutral-500">
        키는 브라우저의 IndexedDB에 WebCrypto(AES-GCM)로 암호화되어 저장되며,
        이 앱의 스크립트만 복호화할 수 있습니다. 키는 어떤 서버로도 전송되지
        않습니다.
      </p>
      {stored ? (
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-2 rounded bg-emerald-50 px-2 py-1 text-xs text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300">
            저장됨
          </span>
          <button
            onClick={onTest}
            className="rounded border border-neutral-300 px-2 py-1 text-xs hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-800"
          >
            로컬에서 복호화 테스트
          </button>
          <button
            onClick={onClear}
            className="rounded border border-red-300 px-2 py-1 text-xs text-red-700 hover:bg-red-50 dark:border-red-900 dark:text-red-300 dark:hover:bg-red-950/30"
          >
            삭제
          </button>
        </div>
      ) : (
        <div className="flex gap-2">
          <input
            type="password"
            placeholder="sk-ant-…"
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              setWarning(apiKeyWarning(e.target.value));
            }}
            className="flex-1 rounded border border-neutral-300 bg-white px-3 py-2 font-mono text-sm dark:border-neutral-700 dark:bg-neutral-950"
          />
          <button
            onClick={onSave}
            disabled={input.trim().length === 0}
            className="rounded bg-neutral-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-neutral-100 dark:text-neutral-900"
          >
            저장
          </button>
        </div>
      )}
      {message && <p className="text-xs text-emerald-600">{message}</p>}
      {warning && !stored && <p className="text-xs text-amber-600">{warning}</p>}
      {error && <p className="text-xs text-red-600">{error}</p>}
    </section>
  );
}
