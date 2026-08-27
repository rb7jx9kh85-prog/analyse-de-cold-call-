"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const items = [
  { href: "/analyze", label: "Analyze" },
  { href: "/calls", label: "Calls" },
  { href: "/history", label: "History" },
];

export function SiteNav() {
  const pathname = usePathname();

  return (
    <nav className="flex flex-wrap items-center gap-x-6 gap-y-2 border-b border-hair py-4">
      {items.map((item) => {
        const active = pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`text-[10px] uppercase tracking-label transition-colors duration-100 md:text-[11px] ${
              active ? "text-ink" : "text-mute hover:text-ink"
            }`}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
