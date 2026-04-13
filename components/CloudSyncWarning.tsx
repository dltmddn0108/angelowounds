"use client";

import { useSessionStore } from "@/lib/store/session";

export default function CloudSyncWarning() {
  const cloud = useSessionStore((s) => s.settings.cloudSynced);
  const setSettings = useSessionStore((s) => s.setSettings);
  const saveSettings = useSessionStore((s) => s.saveSettings);

  async function answer(value: "yes" | "no") {
    setSettings({ cloudSynced: value });
    await saveSettings();
  }

  if (cloud !== "unknown") return null;
  return (
    <section className="space-y-3 rounded border border-amber-400 bg-amber-50 p-4 text-amber-900 dark:border-amber-500/40 dark:bg-amber-950/30 dark:text-amber-200">
      <h3 className="font-medium">잠깐, 이 보관함은 클라우드와 동기화되나요?</h3>
      <p className="text-sm">
        브라우저는 실제 디스크 경로를 알 수 없어서 자동으로 감지할 수 없습니다.
        iCloud Drive, OneDrive, Dropbox, Google Drive, Obsidian Sync 등을 쓰고
        계시다면, 쓰기 중 동기화 충돌을 피하기 위해 스캔과 편집 적용이 끝날
        때까지 동기화 클라이언트를 일시정지하는 것을 권장합니다.
      </p>
      <div className="flex gap-2">
        <button
          onClick={() => answer("yes")}
          className="rounded border border-amber-500 px-3 py-1 text-sm hover:bg-amber-100 dark:hover:bg-amber-900/30"
        >
          네, 동기화하고 있어요 (주의함)
        </button>
        <button
          onClick={() => answer("no")}
          className="rounded border border-neutral-400 px-3 py-1 text-sm hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-800"
        >
          아니요, 로컬 전용이에요
        </button>
      </div>
    </section>
  );
}
