"use client";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { useDashboardData } from "@/hooks/useDashboardData";
import api from "@/lib/api";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import {
  Chart as ChartJS,
  CategoryScale, LinearScale, PointElement, LineElement,
  Title, Tooltip, Legend, Filler,
} from "chart.js";
import { Line } from "react-chartjs-2";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler);

const CHART_OPTIONS = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: { legend: { display: false } },
  scales: {
    y: { min: 0, max: 100, grid: { color: "#EDE9FE" }, ticks: { color: "#7C3AED", font: { size: 12 } } },
    x: { grid: { display: false }, ticks: { color: "#7C3AED", font: { size: 12 } } },
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
}

export default function ParentZonePage() {
  const { user, loading: authLoading } = useAuth();
  const router   = useRouter();
  const { data: dashboardData, loading: dashboardLoading } = useDashboardData(user?.id);
  const [summary,    setSummary]    = useState<StudentSummary | null>(null);
  const [analytics,  setAnalytics]  = useState<AnalyticsData | null>(null);
  const [loading,    setLoading]    = useState(true);

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
    });

    // Fetch analytics — backend mounts analytics at /api/analytics/:id
    api.get(`/api/analytics/${user.id}`).then((ana) => {
      if (ana.data) setAnalytics(ana.data);
    }).catch((err) => {
      console.error("Failed to fetch analytics:", err);
    }).finally(() => {
      setLoading(false);
    });
  }, [dashboardData, dashboardLoading, user, authLoading]);

  if (loading || authLoading) return (
    <div className="min-h-screen bg-page flex items-center justify-center">
      <div className="text-5xl animate-bounce-soft">📊</div>
    </div>
  );

  return (
    <div className="min-h-screen bg-page px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">

        {/* Header */}
        <div className="flex items-center gap-4">
          <Link href="/dashboard/student" className="p-2 rounded-full bg-lavender-pastel border border-lavender-accent hover:bg-lavender-accent hover:text-white transition-colors">
            <ArrowLeft size={20} className="text-indigo-700" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-indigo-900">👪 Parent Zone</h1>
            <p className="text-base text-indigo-500">Monitor progress and analytics for {summary?.name}</p>
          </div>
        </div>

        {!summary ? (
          <div className="bg-white rounded-card p-8 shadow-card text-center border border-lavender-accent/20">
            <p className="text-xl text-indigo-600 font-semibold">No data available yet.</p>
          </div>
        ) : (
          <>
            {/* Student summary */}
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-card shadow-card border border-lavender-accent/20 p-4 sm:p-6">
              <h2 className="text-lg font-bold text-indigo-900 mb-4">📊 Overall Progress</h2>
              <div className="grid grid-cols-1 gap-3 mb-4 sm:grid-cols-3 sm:gap-4">
                {[
                  { label: "Phonics",  score: summary.phonicsScore, color: "bg-sky-pastel"      },
                  { label: "Reading",  score: summary.readingScore,  color: "bg-mint-pastel"     },
                  { label: "Memory",   score: summary.memoryScore,   color: "bg-lavender-pastel" },
                ].map((s) => (
                  <div key={s.label} className={`flex h-24 flex-col items-center justify-center rounded-xl p-3 text-center ${s.color}`}>
                    <p className="text-xs leading-5 text-indigo-500 font-semibold uppercase">{s.label}</p>
                    <p className="flex items-baseline justify-center whitespace-nowrap text-2xl leading-tight font-bold text-indigo-900">
                      {s.score}<span className="text-[13px] text-indigo-400">/100</span>
                    </p>
                  </div>
                ))}
              </div>
              <div className="flex gap-4 text-base text-indigo-600">
                <span>🔥 {summary.streak} day streak</span>
              </div>
            </motion.div>

            {/* Charts */}
            {analytics && analytics.labels.length > 0 && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}
                className="bg-white rounded-card shadow-card border border-lavender-accent/20 p-4 sm:p-6">
                <h2 className="text-lg font-bold text-indigo-900 mb-4">📈 7-Day Progress</h2>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {[
                    { label: "Phonics",  data: analytics.phonics,  color: "#7DD3FC" },
                    { label: "Reading",  data: analytics.reading,  color: "#6EE7B7" },
                    { label: "Memory",   data: analytics.memory,   color: "#C4B5FD" },
                  ].map((c) => (
                    <div key={c.label} className="min-w-0 rounded-xl bg-page/70 p-3 sm:p-4">
                      <p className="text-base font-semibold text-indigo-700 mb-2">{c.label} Score</p>
                      <div className="relative h-56 w-full">
                        <Line
                          options={CHART_OPTIONS}
                          data={{
                            labels: analytics.labels,
                            datasets: [{
                              data: c.data,
                              borderColor: c.color,
                              backgroundColor: c.color + "33",
                              fill: true,
                              tension: 0.4,
                              pointRadius: 4,
                            }],
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Weak areas */}
            {summary.weakAreas.length > 0 && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}
                className="bg-sunshine-pastel rounded-card border border-sunshine-accent p-5 shadow-card">
                <h2 className="text-lg font-bold text-indigo-900 mb-3">💡 Areas to Practice at Home</h2>
                <div className="flex flex-col gap-2">
                  {summary.weakAreas.slice(0, 3).map((area, i) => (
                    <div key={i} className="flex items-start gap-3 bg-white/70 rounded-xl p-3">
                      <span className="text-xl mt-0.5">📌</span>
                      <p className="text-base text-indigo-800">{area}</p>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
