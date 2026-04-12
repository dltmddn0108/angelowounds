/**
 * Cross-page session state: the picked vault handle, parsed notes,
 * candidates, and persisted settings. This is deliberately kept out of
 * the Zustand review store so it doesn't need `"use client"` for tests.
 */

"use client";

import { create } from "zustand";
import { get, set, del } from "idb-keyval";
import type { ParsedNote } from "../vault/types";
import type { CandidateSet } from "../ai/candidates";

const SETTINGS_KEY = "oal:settings";
const CHECKPOINT_KEY = "oal:checkpoint";

export interface Settings {
  model: string;
  batchSize: number;
  topK: number;
  maxLinksPerNote: number;
  confidenceFloor: number;
  seeAlsoHeader: string;
  ignoreGlobs: string[];
  cloudSynced: "unknown" | "yes" | "no";
}

export const DEFAULT_SETTINGS: Settings = {
  model: "claude-sonnet-4-5-20250514",
  batchSize: 8,
  topK: 20,
  maxLinksPerNote: 5,
  confidenceFloor: 0.5,
  seeAlsoHeader: "See also",
  ignoreGlobs: [],
  cloudSynced: "unknown",
};

export interface ScanCheckpoint {
  /** The batch index that was last fully completed (0-based). */
  completedBatch: number;
  /** Timestamp for display. */
  savedAt: string;
}

interface SessionState {
  vault: FileSystemDirectoryHandle | null;
  vaultName: string;
  parsed: ParsedNote[];
  candidates: CandidateSet[];
  settings: Settings;
  checkpoint: ScanCheckpoint | null;

  setVault(handle: FileSystemDirectoryHandle | null): void;
  setParsed(parsed: ParsedNote[]): void;
  setCandidates(c: CandidateSet[]): void;
  setSettings(patch: Partial<Settings>): void;
  loadSettings(): Promise<void>;
  saveSettings(): Promise<void>;
  saveCheckpoint(completedBatch: number): Promise<void>;
  loadCheckpoint(): Promise<ScanCheckpoint | null>;
  clearCheckpoint(): Promise<void>;
}

export const useSessionStore = create<SessionState>((setState, getState) => ({
  vault: null,
  vaultName: "",
  parsed: [],
  candidates: [],
  settings: DEFAULT_SETTINGS,
  checkpoint: null,

  setVault(handle) {
    setState({ vault: handle, vaultName: handle?.name ?? "" });
  },
  setParsed(parsed) {
    setState({ parsed });
  },
  setCandidates(candidates) {
    setState({ candidates });
  },
  setSettings(patch) {
    setState({ settings: { ...getState().settings, ...patch } });
  },
  async loadSettings() {
    const stored = await get<Settings>(SETTINGS_KEY);
    if (stored) setState({ settings: { ...DEFAULT_SETTINGS, ...stored } });
  },
  async saveSettings() {
    await set(SETTINGS_KEY, getState().settings);
  },
  async saveCheckpoint(completedBatch: number) {
    const cp: ScanCheckpoint = {
      completedBatch,
      savedAt: new Date().toISOString(),
    };
    await set(CHECKPOINT_KEY, cp);
    setState({ checkpoint: cp });
  },
  async loadCheckpoint() {
    const cp = await get<ScanCheckpoint>(CHECKPOINT_KEY);
    setState({ checkpoint: cp ?? null });
    return cp ?? null;
  },
  async clearCheckpoint() {
    await del(CHECKPOINT_KEY);
    setState({ checkpoint: null });
  },
}));
