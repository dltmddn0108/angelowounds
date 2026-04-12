"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useSessionStore, DEFAULT_SETTINGS } from "@/lib/store/session";

const MODELS = ["claude-sonnet-4-5-20250514", "claude-haiku-4-5-20251001"];

export default function SettingsPage() {
  const settings = useSessionStore((s) => s.settings);
  const setSettings = useSessionStore((s) => s.setSettings);
  const loadSettings = useSessionStore((s) => s.loadSettings);
  const saveSettings = useSessionStore((s) => s.saveSettings);

  const [saved, setSaved] = useState(false);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  async function onSave() {
    await saveSettings();
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  }

  function onReset() {
    setSettings(DEFAULT_SETTINGS);
  }

  return (
    <main className="space-y-6">
      <header className="flex items-baseline justify-between">
        <h1 className="text-2xl font-semibold">설정</h1>
        <Link href="/" className="text-sm text-neutral-500 hover:underline">
          ← 홈
        </Link>
      </header>

      <section className="grid grid-cols-1 gap-4 rounded border border-neutral-200 bg-white p-4 text-sm dark:border-neutral-800 dark:bg-neutral-900 md:grid-cols-2">
        <label className="space-y-1">
          <div className="text-neutral-500">모델</div>
          <select
            className="w-full rounded border border-neutral-300 bg-white px-2 py-1 font-mono text-xs dark:border-neutral-700 dark:bg-neutral-950"
            value={settings.model}
            onChange={(e) => setSettings({ model: e.target.value })}
          >
            {MODELS.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </label>
        <label className="space-y-1">
          <div className="text-neutral-500">
            배치 크기 (소스 노트 / Claude 호출)
          </div>
          <input
            type="number"
            min={1}
            max={20}
            className="w-full rounded border border-neutral-300 bg-white px-2 py-1 font-mono text-xs dark:border-neutral-700 dark:bg-neutral-950"
            value={settings.batchSize}
            onChange={(e) => setSettings({ batchSize: Number(e.target.value) })}
          />
        </label>
        <label className="space-y-1">
          <div className="text-neutral-500">top-K 후보</div>
          <input
            type="number"
            min={5}
            max={50}
            className="w-full rounded border border-neutral-300 bg-white px-2 py-1 font-mono text-xs dark:border-neutral-700 dark:bg-neutral-950"
            value={settings.topK}
            onChange={(e) => setSettings({ topK: Number(e.target.value) })}
          />
        </label>
        <label className="space-y-1">
          <div className="text-neutral-500">노트당 신규 링크 최대</div>
          <input
            type="number"
            min={1}
            max={20}
            className="w-full rounded border border-neutral-300 bg-white px-2 py-1 font-mono text-xs dark:border-neutral-700 dark:bg-neutral-950"
            value={settings.maxLinksPerNote}
            onChange={(e) =>
              setSettings({ maxLinksPerNote: Number(e.target.value) })
            }
          />
        </label>
        <label className="space-y-1">
          <div className="text-neutral-500">신뢰도 기본 임계값</div>
          <input
            type="number"
            step={0.05}
            min={0}
            max={1}
            className="w-full rounded border border-neutral-300 bg-white px-2 py-1 font-mono text-xs dark:border-neutral-700 dark:bg-neutral-950"
            value={settings.confidenceFloor}
            onChange={(e) =>
              setSettings({ confidenceFloor: Number(e.target.value) })
            }
          />
        </label>
        <label className="space-y-1">
          <div className="text-neutral-500">See also 헤더 텍스트</div>
          <input
            type="text"
            className="w-full rounded border border-neutral-300 bg-white px-2 py-1 font-mono text-xs dark:border-neutral-700 dark:bg-neutral-950"
            value={settings.seeAlsoHeader}
            onChange={(e) => setSettings({ seeAlsoHeader: e.target.value })}
          />
        </label>
        <label className="col-span-full space-y-1">
          <div className="text-neutral-500">
            ignore 글롭 (한 줄에 하나)
          </div>
          <textarea
            rows={4}
            className="w-full rounded border border-neutral-300 bg-white px-2 py-1 font-mono text-xs dark:border-neutral-700 dark:bg-neutral-950"
            value={settings.ignoreGlobs.join("\n")}
            onChange={(e) =>
              setSettings({
                ignoreGlobs: e.target.value
                  .split("\n")
                  .map((l) => l.trim())
                  .filter(Boolean),
              })
            }
          />
        </label>
      </section>

      <div className="flex gap-2">
        <button
          onClick={onSave}
          className="rounded bg-neutral-900 px-3 py-2 text-sm font-medium text-white dark:bg-neutral-100 dark:text-neutral-900"
        >
          저장
        </button>
        <button
          onClick={onReset}
          className="rounded border border-neutral-300 px-3 py-2 text-sm hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-800"
        >
          기본값으로 초기화
        </button>
        {saved && <span className="self-center text-xs text-emerald-600">저장됨</span>}
      </div>
    </main>
  );
}
