"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import ApiKeyInput from "@/components/ApiKeyInput";
import { isFileSystemAccessSupported } from "@/lib/vault/fs-access";
import { hasApiKey } from "@/lib/ai/key-vault";

export default function LandingPage() {
  const [supported, setSupported] = useState<boolean | null>(null);
  const [keyStored, setKeyStored] = useState(false);

  useEffect(() => {
    setSupported(isFileSystemAccessSupported());
    hasApiKey().then(setKeyStored);
  }, []);

  return (
    <main className="space-y-8">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold">Obsidian Auto-Linker</h1>
        <p className="text-neutral-600 dark:text-neutral-400">
          의미적으로 연관된 노트 사이에 <code>[[wikilink]]</code>를 제안하고,
          승인한 것만 보관함에 안전하게 기록합니다. 파일은 브라우저를 떠나지
          않습니다.
        </p>
      </header>

      {supported === false && (
        <section className="rounded border border-amber-400 bg-amber-50 p-4 text-amber-900 dark:border-amber-500/40 dark:bg-amber-950/30 dark:text-amber-200">
          <h2 className="font-medium">이 브라우저는 아직 지원되지 않습니다</h2>
          <p className="mt-1 text-sm">
            Obsidian Auto-Linker는 File System Access API가 있어야 보관함을
            안전하게 읽고 쓸 수 있습니다. 현재는 Chrome, Edge, Brave 등
            Chromium 계열 브라우저에서만 동작합니다.
          </p>
        </section>
      )}

      <ApiKeyInput onChange={setKeyStored} />

      <section className="space-y-3">
        <h2 className="text-xl font-medium">다음 단계</h2>
        <ol className="list-decimal space-y-1 pl-6 text-sm text-neutral-700 dark:text-neutral-300">
          <li>Anthropic API 키 입력 (위에서 완료)</li>
          <li>보관함 폴더 선택 및 스캔</li>
          <li>Claude가 제안하는 링크 검토 및 수락</li>
          <li>승인된 편집을 보관함에 기록 (원본은 <code>.auto-linker-backup/</code>로 자동 백업)</li>
        </ol>
        <div className="pt-2">
          <Link
            href="/vault"
            className={`inline-flex items-center rounded bg-neutral-900 px-4 py-2 text-sm font-medium text-white transition dark:bg-neutral-100 dark:text-neutral-900 ${
              keyStored && supported ? "" : "pointer-events-none opacity-50"
            }`}
          >
            보관함 연결하기 →
          </Link>
        </div>
      </section>
    </main>
  );
}
