"use client";
// Top bar on every page, with the demo role switcher.
// Owner: Member 5
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useClientRole } from "../lib/clientRole";
import WorkspaceSwitcher from "./WorkspaceSwitcher";

const LINKS = [
  { href: "/submit", label: "Check content" },
  { href: "/assistant", label: "Ask BrandProof" },
  { href: "/my-drafts", label: "My drafts" },
  { href: "/approvals", label: "Approvals" },
  { href: "/brand", label: "Brand rules" },
  { href: "/guidelines", label: "Guidelines" },
];

export default function NavBar() {
  const pathname = usePathname();
  const role = useClientRole();

  return (
    <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/95 backdrop-blur">
      <nav className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3" aria-label="Main">
        <Link href="/" className="text-lg font-extrabold text-indigo-700">
          Brand<span className="text-slate-900">Proof</span>
        </Link>
        <ul className="flex flex-wrap gap-4 text-sm">
          {LINKS.map((l) => (
            <li key={l.href}>
              <Link
                href={l.href}
                className={pathname.startsWith(l.href) ? "font-semibold text-indigo-700" : "text-slate-700 hover:text-indigo-700"}
              >
                {l.label}
              </Link>
            </li>
          ))}
        </ul>
        <div className="ml-auto flex flex-wrap items-center gap-2">
        <WorkspaceSwitcher />
        <div className="flex items-center gap-1 rounded-full bg-slate-100 p-1 text-xs">
          <span className="px-2 text-slate-600">Viewing as:</span>
          <a
            href={`/api/role?as=creator&next=${encodeURIComponent(pathname.startsWith("/approvals") ? "/submit" : pathname)}`}
            className={`rounded-full px-3 py-1 ${role === "creator" ? "bg-indigo-600 font-semibold text-white" : "text-slate-700"}`}
            aria-current={role === "creator"}
          >
            Creator
          </a>
          <a
            href={`/api/role?as=manager&next=${encodeURIComponent(/^\/(approvals|guidelines|brand)/.test(pathname) ? pathname : "/approvals")}`}
            className={`rounded-full px-3 py-1 ${role === "manager" ? "bg-indigo-600 font-semibold text-white" : "text-slate-700"}`}
            aria-current={role === "manager"}
          >
            Manager
          </a>
        </div>
        </div>
      </nav>
    </header>
  );
}
