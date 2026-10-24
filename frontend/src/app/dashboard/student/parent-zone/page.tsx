"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { useDashboardData } from "@/hooks/useDashboardData";
import api from "@/lib/api";
import Link from "next/link";
import { ArrowLeft, ChartNoAxesCombined, Flame, LoaderCircle } from "lucide-react";
import {
  Chart as ChartJS,
  CategoryScale, LinearScale, PointElement, LineElement,
  Title, Tooltip, Legend, Filler,
} from "chart.js";
import { Line } from "react-chartjs-2";
import { PageContainer } from "@/components/ui/PageContainer";
import { Surface } from "@/components/ui/Surface";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler);

const CHART_OPTIONS = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: false },
    tooltip: { enabled: true },
  },
  scales: {
    y: {
      min: 0,
      max: 100,
      grid: { color: "#DBEAFE" },
      ticks: { color: "#475569", font: { size: 12 }, stepSize: 25 },
      title: { display: true, text: "Score out of 100", color: "#475569", font: { size: 12, weight: "bold" as const } },
    },
    x: {
      grid: { display: false },
      ticks: { color: "#475569", font: { size: 12 }, maxRotation: 0, autoSkip: true },
    },
  },
};

interface AnalyticsData {
  labels: string[];
  phonics: number[];
  reading: number[];
  memory: number[];
}

interface StudentSummary {
  name: string;
  phonicsScore: number;
  readingScore: number;
  memoryScore: number;
  weakAreas: string[];
  streak: number;
  hasProfile: boolean;
}

export default function ParentZonePage() {
  const { user, loading: authLoading } = useAuth();
  const router   = useRouter();
  const { data: dashboardData, loading: dashboardLoading, error: dashboardError } = useDashboardData(user?.id);
  const [summary,    setSummary]    = useState<StudentSummary | null>(null);
  const [analytics,  setAnalytics]  = useState<AnalyticsData | null>(null);
  const [loading,    setLoading]    = useState(true);
  const [analyticsState, setAnalyticsState] = useState<"loading" | "ready" | "empty" | "unavailable">("loading");

  useEffect(() => {
    if (authLoading) return;
    if (!user) { router.push("/login"); return; }
    if (user.role !== "student") { router.push("/login"); return; }
  }, [user, router, authLoading]);

  useEffect(() => {
    // Wait until auth is resolved
    if (authLoading) return;
    if (!user) return;

    // Dashboard data is still loading — keep spinner
    if (dashboardLoading) {
      setLoading(true);
      return;
    }

    // Dashboard data finished loading but came back empty
    if (!dashboardData) {
      setLoading(false);
      return;
    }

    // Build summary from dashboard data
    const { student, profile } = dashboardData;
    setSummary({
      name: student.name,
      phonicsScore: profile?.phonicsScore ?? 0,
      readingScore:  profile?.readingScore  ?? 0,
      memoryScore:   profile?.memoryScore   ?? 0,
      weakAreas:    profile?.weakAreas      ?? [],
      streak: student.streak,
      hasProfile: profile !== null,
    });

    // Fetch analytics — backend mounts analytics at /api/analytics/:id
    setAnalyticsState("loading");
    api.get(`/api/analytics/${user.id}`).then((ana) => {
      if (ana.data) {
        setAnalytics(ana.data);
        setAnalyticsState(ana.data.labels?.length ? "ready" : "empty");
      } else {
        setAnalyticsState("unavailable");
      }
    }).catch((err) => {
      console.error("Failed to fetch analytics:", err);
      setAnalyticsState("unavailable");
    }).finally(() => {
      setLoading(false);
    });
  }, [dashboardData, dashboardLoading, user, authLoading]);

  if (loading || authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface-warm px-4">
        <div className="flex flex-col items-center gap-4" role="status" aria-live="polite">
          <LoaderCircle className="h-10 w-10 animate-spin text-indigo-700 motion-reduce:animate-none" aria-hidden="true" />
          <p className="text-base font-semibold text-indigo-950">Loading your progress overview...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface-warm text-ink">
      <header className="border-b border-border-subtle/80 bg-surface/90">
        <PageContainer className="flex min-h-16 items-center gap-3 py-3">
          <Link
            href="/dashboard/student"
            aria-label="Back to student dashboard"
            className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-control border border-border-subtle bg-surface-soft text-indigo-800 transition-colors hover:bg-lavender-pastel focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2"
          >
            <ArrowLeft size={20} aria-hidden="true" />
          </Link>
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-lavender-pastel text-2xl" aria-hidden="true">👪</span>
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-indigo-700">Family overview</p>
            <h1 className="text-xl font-bold leading-tight tracking-tight text-indigo-950 sm:text-2xl">Parent Zone</h1>
          </div>
        </PageContainer>
      </header>

      <PageContainer className="py-6 sm:py-8">
        <div className="mb-6">
          <p className="text-sm font-semibold text-indigo-700">Learning progress</p>
          <h2 className="mt-1 text-2xl font-bold tracking-tight text-indigo-950 sm:text-3xl">
            {summary ? `A closer look at ${summary.name}'s progress` : "Your learner’s progress"}
          </h2>
          <p className="mt-2 text-base leading-relaxed text-muted">
            Review recent scores and learning activity at a glance.
          </p>
        </div>

        {!summary ? (
          <Surface padding="lg" className="mx-auto max-w-2xl text-center">
            <span className="text-5xl" aria-hidden="true">🌤️</span>
            <h2 className="mt-4 text-xl font-bold text-indigo-950">Progress data is unavailable</h2>
            <p className="mt-2 text-base leading-relaxed text-muted" role={dashboardError ? "alert" : undefined}>
              {dashboardError ?? "No student progress data is available yet."}
            </p>
          </Surface>
        ) : (
          <div className="flex flex-col gap-6 sm:gap-8">
            {!summary.hasProfile && (
              <div className="rounded-control border border-sky-accent/60 bg-sky-pastel px-4 py-3 text-sm leading-relaxed text-indigo-950" role="status">
                A learning profile is not available yet. Score cards show the existing starting value of 0 out of 100.
              </div>
            )}

            <Surface padding="md" className="sm:p-6">
              <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.14em] text-indigo-700">At a glance</p>
                  <h2 className="mt-1 text-xl font-bold tracking-tight text-indigo-950">Overall progress</h2>
                </div>
                <span className="text-sm text-muted">Scores out of 100</span>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
                {[
                  { label: "Phonics", score: summary.phonicsScore, color: "bg-sky-pastel", border: "border-sky-accent/60" },
                  { label: "Reading", score: summary.readingScore, color: "bg-mint-pastel", border: "border-mint-accent/60" },
                  { label: "Memory", score: summary.memoryScore, color: "bg-lavender-pastel", border: "border-lavender-accent/60" },
                ].map((item) => (
                  <div key={item.label} className={`flex min-h-28 items-center gap-4 rounded-panel border ${item.border} ${item.color} p-4 sm:min-h-32 sm:p-5`}>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-indigo-900">{item.label}</p>
                      <p className="mt-2 flex items-baseline gap-1">
                        <span className="text-3xl font-bold leading-none tabular-nums text-indigo-950">{item.score}</span>
                        <span className="text-sm font-medium text-indigo-800">/ 100</span>
                      </p>
                    </div>
                    <span className="text-3xl" aria-hidden="true">
                      {item.label === "Phonics" ? "🔤" : item.label === "Reading" ? "📖" : "🧠"}
                    </span>
                  </div>
                ))}
              </div>

              <div className="mt-4 flex items-center gap-2 rounded-control border border-sunshine-accent/60 bg-sunshine-pastel/70 px-4 py-3 text-sm font-semibold text-indigo-950">
                <Flame size={18} className="shrink-0 text-amber-800" aria-hidden="true" />
                <span>{summary.streak} day streak</span>
              </div>
            </Surface>

            <Surface padding="md" className="sm:p-6">
              <div className="mb-5 flex items-start gap-3">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-control bg-lavender-pastel text-indigo-800" aria-hidden="true">
                  <ChartNoAxesCombined size={21} />
                </span>
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.14em] text-indigo-700">Recent learning data</p>
                  <h2 className="mt-1 text-xl font-bold tracking-tight text-indigo-950">7-day progress</h2>
                  <p className="mt-1 text-sm leading-relaxed text-muted">Daily scores recorded for each learning area.</p>
                </div>
              </div>

              {analyticsState === "loading" && (
                <div className="flex min-h-48 flex-col items-center justify-center gap-3 rounded-panel bg-surface-soft px-4 text-center" role="status" aria-live="polite">
                  <LoaderCircle className="h-8 w-8 animate-spin text-indigo-700 motion-reduce:animate-none" aria-hidden="true" />
                  <p className="text-sm font-semibold text-indigo-900">Loading seven-day analytics...</p>
                </div>
              )}

              {analyticsState === "empty" && (
                <div className="flex min-h-48 flex-col items-center justify-center rounded-panel bg-surface-soft px-5 py-8 text-center">
                  <span className="text-4xl" aria-hidden="true">📅</span>
                  <p className="mt-3 text-base font-semibold text-indigo-950">No analytics recorded yet</p>
                  <p className="mt-1 max-w-lg text-sm leading-relaxed text-muted">Seven-day charts will appear when daily learning scores are available.</p>
                </div>
              )}

              {analyticsState === "unavailable" && (
                <div className="flex min-h-48 flex-col items-center justify-center rounded-panel border border-peach-accent/60 bg-peach-pastel/70 px-5 py-8 text-center">
                  <span className="text-4xl" aria-hidden="true">🌦️</span>
                  <p className="mt-3 text-base font-semibold text-indigo-950">Seven-day analytics are unavailable</p>
                  <p className="mt-1 max-w-lg text-sm leading-relaxed text-indigo-900" role="status">
                    The progress summary is shown above, but chart data could not be loaded right now.
                  </p>
                </div>
              )}

              {analyticsState === "ready" && analytics && (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {[
                    { label: "Phonics", data: analytics.phonics, color: "#0284C7" },
                    { label: "Reading", data: analytics.reading, color: "#2563EB" },
                    { label: "Memory", data: analytics.memory, color: "#1D4ED8" },
                  ].map((chart) => (
                    <section key={chart.label} className="min-w-0 rounded-panel border border-border-subtle bg-surface-soft/70 p-3 sm:p-4" aria-label={`${chart.label} progress chart`}>
                      <h3 className="mb-3 text-base font-bold text-indigo-950">{chart.label} score</h3>
                      <div className="relative h-60 w-full sm:h-64">
                        <Line
                          role="img"
                          aria-label={`${chart.label} scores over the last seven days`}
                          options={CHART_OPTIONS}
                          data={{
                            labels: analytics.labels,
                            datasets: [{
                              label: `${chart.label} score`,
                              data: chart.data,
                              borderColor: chart.color,
                              backgroundColor: chart.color + "26",
                              fill: true,
                              tension: 0.35,
                              pointRadius: 4,
                              pointHoverRadius: 6,
                            }],
                          }}
                        />
                      </div>
                    </section>
                  ))}
                </div>
              )}
            </Surface>

            {summary.weakAreas.length > 0 && (
              <Surface padding="md" className="border-sunshine-accent/70 bg-sunshine-pastel/70 sm:p-6">
                <div className="mb-4">
                  <p className="text-xs font-bold uppercase tracking-[0.14em] text-amber-900">From the learning profile</p>
                  <h2 className="mt-1 text-xl font-bold tracking-tight text-indigo-950">Areas to practice at home</h2>
                  <p className="mt-1 text-sm leading-relaxed text-indigo-900">These are recorded weak areas, not additional recommendations.</p>
                </div>
                <ul className="grid gap-3 md:grid-cols-2">
                  {summary.weakAreas.slice(0, 3).map((area, index) => (
                    <li key={`${area}-${index}`} className="flex items-start gap-3 rounded-control border border-sunshine-accent/40 bg-surface/80 p-4">
                      <span className="mt-0.5 text-xl" aria-hidden="true">📌</span>
                      <p className="text-base leading-relaxed text-indigo-950">{area}</p>
                    </li>
                  ))}
                </ul>
              </Surface>
            )}
          </div>
        )}
      </PageContainer>
    </div>
  );
}
