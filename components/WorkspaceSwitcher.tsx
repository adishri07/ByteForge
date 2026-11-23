"use client";
// Brand (workspace) switcher in the top bar: shows the current brand, lets you switch.
// New brands are created by uploading a guideline (Guidelines page).
// Owner: Member 5
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

type Ws = { id: string; name: string };

export default function WorkspaceSwitcher() {
  const pathname = usePathname();
  const [list, setList] = useState<Ws[]>([]);
  const [current, setCurrent] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/workspaces")
      .then((r) => r.json())
      .then((d) => {
        setList(d.workspaces ?? []);
        setCurrent(d.current ?? null);
      })
      .catch(() => {});
  }, [pathname]);

  // close when clicking outside
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, []);

  const currentName = list.find((w) => w.id === current)?.name ?? "Brand";
  // stay on list pages; draft/approval detail pages belong to one brand, so go to its list
  const next = pathname.startsWith("/drafts/") ? "/my-drafts" : pathname.startsWith("/approvals/") ? "/approvals" : pathname.startsWith("/guidelines/") ? "/brand" : pathname;

  return (
    <div ref={ref} className="relative text-xs">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="flex max-w-[220px] items-center gap-1 rounded-full border border-slate-200 bg-white px-3 py-1.5 font-semibold text-slate-800 hover:border-indigo-300"
      >
        <span aria-hidden>🏷️</span>
        <span className="truncate">{currentName}</span>
        <span aria-hidden>▾</span>
      </button>
      {open && (
        <div role="listbox" className="absolute right-0 z-20 mt-1 w-64 rounded-xl border border-slate-200 bg-white p-1 shadow-lg">
          <p className="px-3 py-1 text-[11px] uppercase tracking-wide text-slate-500">Switch brand</p>
          {list.map((w) => (
            <a
              key={w.id}
              role="option"
              aria-selected={w.id === current}
              href={`/api/workspace/select?id=${w.id}&next=${encodeURIComponent(next)}`}
              className={`block truncate rounded-lg px-3 py-2 text-sm ${w.id === current ? "bg-indigo-50 font-semibold text-indigo-800" : "text-slate-700 hover:bg-slate-50"}`}
            >
              {w.name}
            </a>
          ))}
          <Link href="/guidelines" onClick={() => setOpen(false)} className="mt-1 block rounded-lg border-t border-slate-100 px-3 py-2 text-sm font-semibold text-indigo-700 hover:bg-indigo-50">
            + Add a brand (upload guideline)
          </Link>
        </div>
      )}
    </div>
  );
}
