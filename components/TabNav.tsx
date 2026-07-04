"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Footprints, Moon, Sunrise } from "lucide-react";

const TABS = [
  { href: "/walk", label: "WALK", Icon: Footprints },
  { href: "/sleep", label: "SLEEP", Icon: Moon },
  { href: "/briefing", label: "BRIEFING", Icon: Sunrise },
] as const;

export default function TabNav() {
  const pathname = usePathname();
  return (
    <nav className="fixed bottom-0 inset-x-0 z-40 h-14 bg-card border-t border-nominal/60 grid grid-cols-3">
      {TABS.map(({ href, label, Icon }) => {
        const active = pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            className={`flex flex-col items-center justify-center gap-0.5 text-[10px] tracking-widest ${
              active
                ? "text-accent border-t-2 border-accent -mt-px"
                : "text-nominal hover:text-text"
            }`}
          >
            <Icon size={18} strokeWidth={1.5} />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
