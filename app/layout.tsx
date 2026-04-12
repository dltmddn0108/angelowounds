import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Obsidian Auto-Linker",
  description:
    "Suggest and write [[wikilink]] backlinks into your Obsidian vault using Claude. Your notes never leave your browser.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <body className="antialiased">
        <div className="mx-auto max-w-5xl px-6 py-10">{children}</div>
        <footer className="border-t border-neutral-200 py-6 text-center text-xs text-neutral-400 dark:border-neutral-800 dark:text-neutral-600">
          Obsidian Auto-Linker &middot; Your notes never leave your browser
        </footer>
      </body>
    </html>
  );
}
