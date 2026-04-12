/**
 * In-memory review session state.
 *
 * Each suggestion from Claude becomes a ReviewItem the user can accept,
 * reject, or edit. The store also tracks the undo log of accepted writes
 * so we can restore files on demand.
 */

"use client";

import { create } from "zustand";
import type { LinkSuggestion } from "../vault/types";

export type ReviewStatus = "pending" | "accepted" | "rejected";

export interface ReviewItem extends LinkSuggestion {
  id: string;
  status: ReviewStatus;
}

export interface UndoEntry {
  path: string;
  previous: string;
}

interface ReviewState {
  items: ReviewItem[];
  confidenceFloor: number;
  undoLog: UndoEntry[];

  setItems(items: LinkSuggestion[]): void;
  setStatus(id: string, status: ReviewStatus): void;
  setAllStatus(status: ReviewStatus): void;
  updateAnchor(id: string, anchor: string): void;
  setConfidenceFloor(v: number): void;
  recordUndo(entry: UndoEntry): void;
  clearUndo(): void;
  reset(): void;
}

function makeId(s: LinkSuggestion, i: number): string {
  return `${s.sourcePath}::${s.targetPath}::${i}`;
}

export const useReviewStore = create<ReviewState>((set) => ({
  items: [],
  confidenceFloor: 0.5,
  undoLog: [],
  setItems(items) {
    set({
      items: items.map((s, i) => ({
        ...s,
        id: makeId(s, i),
        status: "pending",
      })),
    });
  },
  setStatus(id, status) {
    set((st) => ({
      items: st.items.map((it) => (it.id === id ? { ...it, status } : it)),
    }));
  },
  setAllStatus(status) {
    set((st) => ({
      items: st.items.map((it) => ({ ...it, status })),
    }));
  },
  updateAnchor(id, anchor) {
    set((st) => ({
      items: st.items.map((it) =>
        it.id === id ? { ...it, anchorText: anchor } : it,
      ),
    }));
  },
  setConfidenceFloor(v) {
    set({ confidenceFloor: v });
  },
  recordUndo(entry) {
    set((st) => ({ undoLog: [...st.undoLog, entry] }));
  },
  clearUndo() {
    set({ undoLog: [] });
  },
  reset() {
    set({ items: [], undoLog: [] });
  },
}));
