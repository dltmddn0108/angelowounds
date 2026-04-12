"use client";

import type { CostEstimate } from "@/lib/ai/cost";

interface Props {
  estimate: CostEstimate;
  model: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function CostPreview({
  estimate,
  model,
  onConfirm,
  onCancel,
}: Props) {
  return (
    <section className="space-y-4 rounded border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
      <header>
        <h3 className="text-lg font-medium">스캔 비용 프리뷰</h3>
        <p className="text-xs text-neutral-500">
          실제 Claude 호출 전에 확인하세요. 토큰 수는 휴리스틱 추정이며 ±20%
          차이가 있을 수 있습니다.
        </p>
      </header>
      <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
        <dt className="text-neutral-500">모델</dt>
        <dd className="font-mono">{model}</dd>
        <dt className="text-neutral-500">노트 수</dt>
        <dd>{estimate.notes}</dd>
        <dt className="text-neutral-500">배치 수</dt>
        <dd>{estimate.batches}</dd>
        <dt className="text-neutral-500">입력 토큰 (추정)</dt>
        <dd>{estimate.estimatedInputTokens.toLocaleString()}</dd>
        <dt className="text-neutral-500">캐시 읽기 토큰 (추정)</dt>
        <dd>{estimate.estimatedCachedReadTokens.toLocaleString()}</dd>
        <dt className="text-neutral-500">출력 토큰 (추정)</dt>
        <dd>{estimate.estimatedOutputTokens.toLocaleString()}</dd>
        <dt className="text-neutral-500">예상 비용</dt>
        <dd className={`font-mono ${estimate.estimatedUsd > 1.0 ? "font-semibold text-amber-600 dark:text-amber-400" : ""}`}>
          ${estimate.estimatedUsd.toFixed(4)} USD
        </dd>
        <dt className="text-neutral-500">예상 시간</dt>
        <dd>~{estimate.estimatedSeconds}s</dd>
      </dl>
      <p className="text-xs text-neutral-400 dark:text-neutral-500">
        프롬프트 캐싱이 적용되면 실제 비용은 위 추정치보다 낮을 수 있습니다.
      </p>
      <div className="flex gap-2">
        <button
          onClick={onConfirm}
          className="rounded bg-neutral-900 px-3 py-2 text-sm font-medium text-white dark:bg-neutral-100 dark:text-neutral-900"
        >
          이 비용으로 진행
        </button>
        <button
          onClick={onCancel}
          className="rounded border border-neutral-300 px-3 py-2 text-sm hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-800"
        >
          취소
        </button>
      </div>
    </section>
  );
}
