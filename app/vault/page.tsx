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
  const setItems = useReviewStore((s) => s.setItems);

  const [stage, setStage] = useState<Stage>("idle");
  const [error, setError] = useState<string | null>(null);
  const [scanTotal, setScanTotal] = useState(0);
  const [scanDone, setScanDone] = useState(0);
  const [scanDetail, setScanDetail] = useState("");
  const [estimate, setEstimate] = useState<CostEstimate | null>(null);
  const [localParsed, setLocalParsed] = useState<ParsedNote[]>([]);
  const [localCandidates, setLocalCandidates] = useState<ReturnType<typeof findCandidates>>([]);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

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
      const result = await runSuggestionPipeline(localParsed, localCandidates, {
        apiKey,
        model: settings.model,
        batchSize: settings.batchSize,
        topK: settings.topK,
        maxLinksPerNote: settings.maxLinksPerNote,
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
