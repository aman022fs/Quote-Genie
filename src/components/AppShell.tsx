import { Link, useLocation } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { Home, Files, LayoutGrid, User, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

const TABS = [
  { to: "/dashboard", label: "Home", icon: Home, match: ["/dashboard"] },
  { to: "/quotations", label: "Quotations", icon: Files, match: ["/quotations"] },
  { to: "/templates", label: "Templates", icon: LayoutGrid, match: ["/templates"] },
  { to: "/settings", label: "Profile", icon: User, match: ["/settings", "/clients", "/rate-card"] },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();

  // Full-screen flows hide the bottom nav so the user has one clear action.
  const hideNav =
    pathname.startsWith("/onboarding") ||
    /^\/quotations\/(new|[^/]+)$/.test(pathname) ||
    /^\/templates\/[^/]+$/.test(pathname);

  return (
    <div className="relative min-h-dvh bg-background">
      <div className={cn("mx-auto min-h-dvh w-full max-w-[520px]", !hideNav && "pb-nav")}>
        {children}
      </div>
      {!hideNav && <BottomNav pathname={pathname} />}
    </div>
  );
}

function BottomNav({ pathname }: { pathname: string }) {
  const isCentral = pathname === "/quotations/new";
  return (
    <nav aria-label="Primary" className="fixed inset-x-0 bottom-0 z-40 pb-safe">
      <div className="mx-auto max-w-[520px] px-4 pb-3 pt-2">
        <div className="relative flex items-end justify-between rounded-[28px] border border-border/70 bg-card/85 px-2 py-2 shadow-[0_10px_30px_-15px_oklch(0.2_0.02_260/0.25)] backdrop-blur-xl ring-soft">
          {TABS.slice(0, 2).map((t) => (
            <TabItem key={t.to} tab={t} active={isActive(pathname, t.match)} />
          ))}

          <Link
            to="/quotations/new"
            aria-label="Create quotation"
            className={cn(
              "-mt-6 flex size-14 shrink-0 items-center justify-center rounded-full text-brand-foreground transition-transform active:scale-95",
              "bg-[color:var(--brand)] shadow-[0_14px_28px_-10px_oklch(0.66_0.10_245/0.55)] ring-4 ring-background",
              isCentral && "scale-105",
            )}
          >
            <Plus className="size-6" strokeWidth={2.5} />
          </Link>

          {TABS.slice(2).map((t) => (
            <TabItem key={t.to} tab={t} active={isActive(pathname, t.match)} />
          ))}
        </div>
      </div>
    </nav>
  );
}

function TabItem({ tab, active }: { tab: (typeof TABS)[number]; active: boolean }) {
  const Icon = tab.icon;
  return (
    <Link
      to={tab.to}
      className={cn(
        "flex min-w-[64px] flex-col items-center gap-1 rounded-2xl px-3 py-2 text-[10px] font-medium transition-colors",
        active ? "text-foreground" : "text-muted-foreground",
      )}
    >
      <Icon
        className={cn("size-5 transition-transform", active && "scale-110")}
        strokeWidth={active ? 2.4 : 1.8}
      />
      <span className={active ? "opacity-100" : "opacity-70"}>{tab.label}</span>
    </Link>
  );
}

function isActive(pathname: string, patterns: readonly string[]) {
  return patterns.some((p) => pathname === p || pathname.startsWith(p + "/"));
}
