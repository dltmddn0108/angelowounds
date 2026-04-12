/**
 * File System Access API helpers.
 *
 * MVP supports Chromium-based browsers only (Chrome, Edge, Brave).
 * Firefox and Safari will see a "not supported" banner on the landing page.
 */

import { get, set, del } from "idb-keyval";

const HANDLE_KEY = "oal:vault-handle";

export function isFileSystemAccessSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof (window as unknown as { showDirectoryPicker?: unknown })
      .showDirectoryPicker === "function"
  );
}

export async function pickVaultDirectory(): Promise<FileSystemDirectoryHandle> {
  // @ts-expect-error -- showDirectoryPicker types live in wicg-file-system-access
  const handle: FileSystemDirectoryHandle = await window.showDirectoryPicker({
    mode: "readwrite",
  });
  await set(HANDLE_KEY, handle);
  return handle;
}

export async function loadCachedDirectory(): Promise<FileSystemDirectoryHandle | null> {
  const handle = await get<FileSystemDirectoryHandle>(HANDLE_KEY);
  return handle ?? null;
}

export async function forgetCachedDirectory(): Promise<void> {
  await del(HANDLE_KEY);
}

/**
 * Check permission state. Must be called from a user gesture if we need to
 * prompt (otherwise the browser will silently deny).
 */
export async function ensureReadWrite(
  handle: FileSystemDirectoryHandle,
): Promise<boolean> {
  // @ts-expect-error -- permission APIs from wicg-file-system-access
  const current: PermissionState = await handle.queryPermission({
    mode: "readwrite",
  });
  if (current === "granted") return true;
  // @ts-expect-error -- same as above
  const requested: PermissionState = await handle.requestPermission({
    mode: "readwrite",
  });
  return requested === "granted";
}

/** Read a markdown file by vault-relative path. */
export async function readNoteBytes(
  root: FileSystemDirectoryHandle,
  relativePath: string,
): Promise<string> {
  const fileHandle = await resolveFileHandle(root, relativePath, false);
  const file = await fileHandle.getFile();
  return file.text();
}

/** Write a markdown file by vault-relative path. Creates parents as needed. */
export async function writeNoteBytes(
  root: FileSystemDirectoryHandle,
  relativePath: string,
  content: string,
): Promise<void> {
  const fileHandle = await resolveFileHandle(root, relativePath, true);
  const writable = await fileHandle.createWritable();
  await writable.write(content);
  await writable.close();
}

async function resolveFileHandle(
  root: FileSystemDirectoryHandle,
  relativePath: string,
  create: boolean,
): Promise<FileSystemFileHandle> {
  const parts = relativePath.split("/").filter(Boolean);
  let dir = root;
  for (let i = 0; i < parts.length - 1; i++) {
    dir = await dir.getDirectoryHandle(parts[i], { create });
  }
  const fileName = parts[parts.length - 1];
  return dir.getFileHandle(fileName, { create });
}

/**
 * Walk the vault and return every markdown file path relative to the root.
 * Respects a set of folder names that should never be traversed.
 */
export async function walkMarkdown(
  root: FileSystemDirectoryHandle,
  opts: { skipDirs?: Set<string> } = {},
): Promise<{ path: string; file: File }[]> {
  const skip =
    opts.skipDirs ??
    new Set([".obsidian", ".trash", ".git", "node_modules", ".auto-linker-backup"]);
  const results: { path: string; file: File }[] = [];
  await walk(root, "", skip, results);
  return results;
}

async function walk(
  dir: FileSystemDirectoryHandle,
  prefix: string,
  skip: Set<string>,
  out: { path: string; file: File }[],
): Promise<void> {
  // @ts-expect-error -- async iteration of directory entries
  for await (const [name, handle] of dir.entries()) {
    if (handle.kind === "directory") {
      if (skip.has(name)) continue;
      await walk(
        handle as FileSystemDirectoryHandle,
        prefix ? `${prefix}/${name}` : name,
        skip,
        out,
      );
    } else if (handle.kind === "file" && name.toLowerCase().endsWith(".md")) {
      const file = await (handle as FileSystemFileHandle).getFile();
      out.push({ path: prefix ? `${prefix}/${name}` : name, file });
    }
  }
}

/**
 * Create (or reuse) a timestamped backup folder for this session.
 * Returns the directory handle.
 */
export async function openBackupDir(
  root: FileSystemDirectoryHandle,
  timestamp: string,
): Promise<FileSystemDirectoryHandle> {
  const backupRoot = await root.getDirectoryHandle(".auto-linker-backup", {
    create: true,
  });
  return backupRoot.getDirectoryHandle(timestamp, { create: true });
}

export async function writeBackup(
  backupDir: FileSystemDirectoryHandle,
  relativePath: string,
  content: string,
): Promise<void> {
  // Flatten nested paths into the backup dir using a safe delimiter so we
  // don't have to recreate the vault's directory tree inside the backup.
  const safeName = relativePath.replace(/\//g, "__") + ".bak";
  const fileHandle = await backupDir.getFileHandle(safeName, { create: true });
  const writable = await fileHandle.createWritable();
  await writable.write(content);
  await writable.close();
}
