"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import VaultPicker from "@/components/VaultPicker";
import CloudSyncWarning from "@/components/CloudSyncWarning";
import ScanProgress from "@/components/ScanProgress";
import CostPreview from "@/components/CostPreview";
import { scanVault } from "@/lib/vault/scan";
import { parseNote } from "@/lib/vault/parser";
import { embedVault } from "@/lib/ai/embed";
import { findCandidates } from "@/lib/ai/candidates";
import { estimateCost, type CostEstimate } from "@/lib/ai/cost";
import { runSuggestionPipeline } from "@/lib/ai/suggest";
import { loadApiKey } from "@/lib/ai/key-vault";
import { useSessionStore } from "@/lib/store/session";
import { useReviewStore } from "@/lib/store/review";
import type { ParsedNote } from "@/lib/vault/types";

type Stage = "idle" | "scanning" | "parsing" | "embedding" | "searching" | "preview" | "suggesting" | "done" | "error";

export default function VaultPage() {
  const vault = useSessionStore((s) => s.vault);
  const settings = useSessionStore((s) => s.settings);
  const setParsed = useSessionStore((s) => s.setParsed);
  const setCandidates = useSessionStore((s) => s.setCandidates);
  const loadSettings = useSessionStore((s) => s.loadSettings);
  const saveCheckpoint = useSessionStore((s) => s.saveCheckpoint);
  const clearCheckpoint = useSessionStore((s) => s.clearCheckpoint);
  const loadCheckpoint = useSessionStore((s) => s.loadCheckpoint);
  const checkpoint = useSessionStore((s) => s.checkpoint);
  const setItems = useReviewStore((s) => s.setItems);

  const [stage, setStage] = useState<Stage>("idle");
  const [error, setError] = useState<string | null>(null);
  const [scanTotal, setScanTotal] = useState(0);
  const [scanDone, setScanDone] = useState(0);
  const [scanDetail, setScanDetail] = useState("");
  const [estimate, setEstimate] = useState<CostEstimate | null>(null);
  const [localParsed, setLocalParsed] = useState<ParsedNote[]>([]);
  const [localCandidates, setLocalCandidates] = useState<ReturnType<typeof findCandidates>>([]);
  const [resumeFromBatch, setResumeFromBatch] = useState<number | null>(null);

  useEffect(() => {
    loadSettings();
    loadCheckpoint();
  }, [loadSettings, loadCheckpoint]);

  async function runScan() {
    if (!vault) return;
    setError(null);
    try {
      setStage("scanning");
      setScanDetail("파일 수집");
      const { files } = await scanVault(vault, settings.ignoreGlobs);
      setScanTotal(files.length);
      setScanDone(0);

      setStage("parsing");
      const parsedList: ParsedNote[] = [];
      for (let i = 0; i < files.length; i++) {
        const { entry, source } = files[i];
        parsedList.push(parseNote(entry, source));
        setScanDone(i + 1);
        setScanDetail(entry.path);
      }
      setParsed(parsedList);
      setLocalParsed(parsedList);

      setStage("embedding");
      const embeddings = await embedVault(parsedList, {
        onProgress: (p) => {
          if (p.note) {
            setScanTotal(p.note.total);
            setScanDone(p.note.index);
            setScanDetail(p.note.path);
          } else if (p.modelLoad) {
            setScanDetail(`모델 로드: ${p.modelLoad.status}`);
          }
        },
      });

      setStage("searching");
      const parsedMap = new Map(parsedList.map((n) => [n.entry.path, n]));
      const cands = findCandidates(embeddings, parsedMap, { topK: settings.topK });
      setCandidates(cands);
      setLocalCandidates(cands);

      const est = estimateCost(parsedList, cands, {
        model: settings.model,
        batchSize: settings.batchSize,
        topK: settings.topK,
      });
      setEstimate(est);
      setStage("preview");
    } catch (e) {
      setError((e as Error).message);
      setStage("error");
    }
  }

  async function runSuggest() {
    if (!estimate) return;
    setError(null);
    try {
      setStage("suggesting");
      const apiKey = await loadApiKey();
      if (!apiKey) throw new Error("API 키가 없습니다. 홈 화면에서 입력하세요.");
      setScanTotal(estimate.batches);
      setScanDone(0);
      const startBatch = resumeFromBatch ?? 0;
      if (startBatch > 0) setScanDone(startBatch);
      const result = await runSuggestionPipeline(localParsed, localCandidates, {
        apiKey,
        model: settings.model,
        batchSize: settings.batchSize,
        topK: settings.topK,
        maxLinksPerNote: settings.maxLinksPerNote,
        resumeFromBatch: startBatch,
        onBatch: (info) => {
          setScanDone(info.index + 1);
          setScanDetail(
            info.cacheReadTokens !== undefined
              ? `cache read ${info.cacheReadTokens} tok`
              : "",
          );
        },
        onCheckpoint: (completedBatch) => {
          saveCheckpoint(completedBatch);
        },
      });
      await clearCheckpoint();
      setResumeFromBatch(null);
      setItems(
        result.suggestions.filter((s) => s.confidence >= settings.confidenceFloor),
      );
      setStage("done");
    } catch (e) {
      setError((e as Error).message);
      setStage("error");
    }
  }

  return (
    <main className="space-y-6">
      <header className="flex items-baseline justify-between">
        <h1 className="text-2xl font-semibold">보관함 스캔</h1>
        <div className="flex gap-3">
          <Link href="/settings" className="text-sm text-neutral-500 hover:underline">
            설정
          </Link>
          <Link href="/" className="text-sm text-neutral-500 hover:underline">
            ← 홈
          </Link>
        </div>
      </header>

      <VaultPicker />
      <CloudSyncWarning />

      {checkpoint && stage === "idle" && localCandidates.length > 0 && (
        <section className="space-y-3 rounded border border-amber-400 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-500/40 dark:bg-amber-950/30 dark:text-amber-200">
          <h3 className="font-medium">이전 스캔을 이어서 진행할 수 있습니다</h3>
          <p className="text-xs">
            마지막으로 완료된 배치: {checkpoint.completedBatch + 1}번 (저장 시각{" "}
            {new Date(checkpoint.savedAt).toLocaleString("ko-KR")})
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setResumeFromBatch(checkpoint.completedBatch + 1)}
              className="rounded border border-amber-500 px-3 py-1 text-xs hover:bg-amber-100 dark:hover:bg-amber-900/30"
            >
              여기서 이어서 시작
            </button>
            <button
              onClick={async () => {
                await clearCheckpoint();
                setResumeFromBatch(null);
              }}
              className="rounded border border-neutral-400 px-3 py-1 text-xs hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-800"
            >
              체크포인트 삭제
            </button>
          </div>
        </section>
      )}

      {vault && stage === "idle" && (
        <button
          onClick={runScan}
          className="rounded bg-neutral-900 px-4 py-2 text-sm font-medium text-white dark:bg-neutral-100 dark:text-neutral-900"
        >
          보관함 스캔 시작
        </button>
      )}

      {(stage === "scanning" || stage === "parsing" || stage === "embedding" || stage === "searching") && (
        <ScanProgress
          label={
            stage === "scanning"
              ? "파일 수집"
              : stage === "parsing"
              ? "파싱"
              : stage === "embedding"
              ? "임베딩"
              : "후보 검색"
          }
          current={scanDone}
          total={scanTotal}
          detail={scanDetail}
        />
      )}

      {stage === "preview" && estimate && (
        <CostPreview
          estimate={estimate}
          model={settings.model}
          onConfirm={runSuggest}
          onCancel={() => setStage("idle")}
        />
      )}

      {stage === "suggesting" && (
        <ScanProgress
          label="Claude 제안 생성"
          current={scanDone}
          total={scanTotal}
          detail={scanDetail}
        />
      )}

      {stage === "done" && (
        <div className="rounded border border-emerald-400 bg-emerald-50 p-4 text-sm text-emerald-900 dark:border-emerald-500/40 dark:bg-emerald-950/30 dark:text-emerald-200">
          제안 생성이 끝났습니다.{" "}
          <Link href="/review" className="font-medium underline">
            검토 페이지로 이동
          </Link>
        </div>
      )}

      {error && (
        <div className="rounded border border-red-400 bg-red-50 p-4 text-sm text-red-900 dark:border-red-500/40 dark:bg-red-950/30 dark:text-red-200">
          {error}
        </div>
      )}
    </main>
  );
}
