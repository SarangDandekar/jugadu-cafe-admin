import Link from "next/link";
import { Images, Sparkles, BookOpen, Eye, Users, CalendarDays } from "lucide-react";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type ViewStats = {
  total_visits: number;
  unique_viewers: number;
  visits_today: number;
};

function parseViewStats(raw: unknown): ViewStats {
  const empty = { total_visits: 0, unique_viewers: 0, visits_today: 0 };
  const data = typeof raw === "string" ? JSON.parse(raw) : raw;
  if (!data || typeof data !== "object") return empty;
  const row = data as Record<string, unknown>;
  return {
    total_visits: Number(row.total_visits) || 0,
    unique_viewers: Number(row.unique_viewers) || 0,
    visits_today: Number(row.visits_today) || 0,
  };
}

export default async function DashboardPage() {
  const supabase = await createClient();
  const [
    { count: galleryCount },
    { count: highlightCount },
    { count: storyCount },
    { data: statsData },
  ] = await Promise.all([
    supabase
      .from("gallery_items")
      .select("*", { count: "exact", head: true })
      .eq("is_active", true),
    supabase
      .from("highlight_items")
      .select("*", { count: "exact", head: true })
      .eq("is_active", true),
    supabase
      .from("site_story_media")
      .select("*", { count: "exact", head: true })
      .eq("is_active", true),
    supabase.rpc("site_view_stats"),
  ]);

  const stats = parseViewStats(statsData);

  const viewerCards = [
    {
      title: "Unique viewers",
      value: stats.unique_viewers,
      label: "people who opened the public site",
      icon: Users,
    },
    {
      title: "Total visits",
      value: stats.total_visits,
      label: "page visits recorded",
      icon: Eye,
    },
    {
      title: "Today",
      value: stats.visits_today,
      label: "visits today (India time)",
      icon: CalendarDays,
    },
  ];

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
      title: "Highlights",
      desc: "Text strip plus photo/video slider above Our Story.",
      count: highlightCount ?? 0,
      label: "slider items",
      icon: Sparkles,
    },
    {
      href: "/dashboard/story",
      title: "Our Story",
      desc: "Replace the Our Story video on the public homepage.",
      count: storyCount ?? 0,
      label: "custom media",
      icon: BookOpen,
    },
  ];

  return (
    <div>
      <h2 className="mb-2 text-2xl font-bold">Overview</h2>
      <p className="mb-8 text-muted">
        Manage content that appears on the Jugadu Cafe public website.
      </p>

      <h3 className="mb-3 text-sm font-medium tracking-wide text-muted uppercase">
        Public website viewers
      </h3>
      <div className="mb-10 grid gap-4 sm:grid-cols-3">
        {viewerCards.map(({ title, value, label, icon: Icon }) => (
          <div
            key={title}
            className="rounded-2xl border border-border bg-surface p-6"
          >
            <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-primary/15 text-primary">
              <Icon className="h-5 w-5" />
            </div>
            <h3 className="text-lg font-semibold">{title}</h3>
            <p className="mt-4 text-3xl font-bold text-primary">{value}</p>
            <p className="mt-1 text-xs text-muted">{label}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
