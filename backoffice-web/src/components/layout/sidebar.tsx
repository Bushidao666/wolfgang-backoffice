"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/utils/cn";
import { navItems } from "@/components/layout/nav-items";

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="rounded-lg border bg-card p-4 shadow-sm md:sticky md:top-6 md:h-[calc(100vh-3rem)]">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <p className="text-sm font-semibold tracking-tight">Wolfgang</p>
          <p className="text-xs text-muted-foreground">Backoffice</p>
        </div>
      </div>

      <nav className="mt-6 space-y-1">
        {navItems.map((item) => {
          const active = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors hover:bg-accent hover:text-accent-foreground",
                active ? "bg-accent text-accent-foreground" : "text-muted-foreground",
              )}
            >
              <Icon className="h-4 w-4" />
              {item.title}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}

