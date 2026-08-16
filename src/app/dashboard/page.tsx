import Link from "next/link";
import { Images, Sparkles } from "lucide-react";
import { createClient } from "@/lib/supabase/server";

export default async function DashboardPage() {
  const supabase = await createClient();
  const [{ count: galleryCount }, { count: highlightCount }] =
    await Promise.all([
      supabase
        .from("gallery_items")
        .select("*", { count: "exact", head: true })
        .eq("is_active", true),
      supabase
        .from("site_highlights")
        .select("*", { count: "exact", head: true })
        .eq("is_active", true),
    ]);

  const cards = [
    {
      href: "/dashboard/gallery",
      title: "Gallery",
      desc: "Upload photos & videos for the public Gallery section.",
      count: galleryCount ?? 0,
      label: "active items",
      icon: Images,
    },
    {
      href: "/dashboard/highlight",
      title: "Highlight",
      desc: "Optional banner above Our Story (hidden when empty).",
      count: highlightCount ?? 0,
      label: "active highlight",
      icon: Sparkles,
    },
  ];

  return (
    <div>
      <h2 className="mb-2 text-2xl font-bold">Overview</h2>
      <p className="mb-8 text-muted">
        Manage content that appears on the Jugadu Cafe public website.
      </p>
      <div className="grid gap-4 sm:grid-cols-2">
        {cards.map(({ href, title, desc, count, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className="rounded-2xl border border-border bg-surface p-6 transition hover:border-primary/50"
          >
            <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-primary/15 text-primary">
              <Icon className="h-5 w-5" />
            </div>
            <h3 className="text-lg font-semibold">{title}</h3>
            <p className="mt-1 text-sm text-muted">{desc}</p>
            <p className="mt-4 text-2xl font-bold text-primary">{count}</p>
            <p className="text-xs text-muted">{label}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
