"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Newspaper, Coins, CalendarDays } from "lucide-react";

const TABS = [
  { href: "/", icon: Newspaper, label: "15/07" },
  { href: "/events", icon: CalendarDays, label: "Events" },
  { href: "/accounts", icon: Coins, label: "Accounts" },
];

export default function BottomTabBar() {
  const pathname = usePathname();

  return (
    <div className="safe-bottom fixed bottom-0 left-0 right-0 z-20 bg-[#1c1c1e] border-t border-white/10">
      <div className="max-w-2xl mx-auto grid grid-cols-3">
        {TABS.map((t) => {
          const active = pathname === t.href;
          return (
            <Link
              key={t.href}
              href={t.href}
              className={`flex flex-col items-center gap-1 py-2.5 ${active ? "text-red-400" : "text-gray-400"}`}
            >
              <t.icon size={20} />
              <span className="text-xs">{t.label}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
