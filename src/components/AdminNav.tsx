"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Images, Sparkles, LayoutDashboard, LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

const links = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/dashboard/gallery", label: "Gallery", icon: Images },
  { href: "/dashboard/highlight", label: "Highlight", icon: Sparkles },
];

export function AdminNav({ email }: { email: string }) {
  const pathname = usePathname();
  const router = useRouter();

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.replace("/login");
    router.refresh();
  }

  return (
    <header className="border-b border-border bg-surface">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-4">
        <div>
          <p className="text-xs tracking-[0.18em] text-primary uppercase">
            Jugadu Cafe
          </p>
          <h1 className="text-lg font-semibold">Admin Panel</h1>
        </div>
        <nav className="flex flex-wrap items-center gap-1">
          {links.map(({ href, label, icon: Icon }) => {
            const active =
              href === "/dashboard"
                ? pathname === href
                : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition ${
                  active
                    ? "bg-primary/15 text-primary"
                    : "text-muted hover:bg-background hover:text-text"
                }`}
              >
                <Icon className="h-4 w-4" />
                {label}
              </Link>
            );
          })}
          <button
            type="button"
            onClick={signOut}
            className="ml-2 inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-muted hover:bg-background hover:text-danger"
          >
            <LogOut className="h-4 w-4" />
            Sign out
          </button>
        </nav>
      </div>
      <div className="border-t border-border/60 px-4 py-2 text-center text-xs text-muted sm:text-left">
        <span className="mx-auto block max-w-6xl px-0 sm:px-0">
          Signed in as {email}
        </span>
      </div>
    </header>
  );
}
