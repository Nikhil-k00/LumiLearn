"use client";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { useTTS } from "@/hooks/useTTS";
import { useDashboardData, type ProfileData } from "@/hooks/useDashboardData";
import { Volume2, Flame, LogOut, Zap, RefreshCw } from "lucide-react";
import Link from "next/link";
import { getLevelFromXP, getXPForNextLevel } from "@/lib/gamification";
import { Button } from "@/components/ui/Button";
import { PageContainer } from "@/components/ui/PageContainer";
import { Surface } from "@/components/ui/Surface";

const GAMES = [
  {
    href: "/games/phonics-adventure",
    emoji: "🔤",
    title: "Phonics Adventure",
    desc: "Master letter sounds & beat b/d confusion!",
    badge: "Phonics",
    badgeClass: "bg-sky-pastel text-sky-700",
    accentClass: "border-sky-accent/40 bg-sky-pastel/50",
  },
  {
    href: "/games/word-quest",
    emoji: "📖",
    title: "Word Quest",
    desc: "Read stories, match words, build sentences!",
    badge: "Reading",
    badgeClass: "bg-mint-pastel text-green-800",
    accentClass: "border-mint-accent/40 bg-mint-pastel/50",
  },
  {
    href: "/games/memory-challenge",
    emoji: "🧠",
    title: "Memory Challenge",
    desc: "Sound sequences, rhymes & memory power!",
    badge: "Memory",
    badgeClass: "bg-lavender-pastel text-violet-800",
    accentClass: "border-lavender-accent/50 bg-lavender-pastel/60",
  },
];

const STAT_COLORS: Array<{
  key: keyof Pick<ProfileData, "phonicsScore" | "readingScore" | "memoryScore">;
  label: string;
  emoji: string;
  ring: string;
  bg: string;
}> = [
  { key: "phonicsScore", label: "Phonics", emoji: "🔤", ring: "#7DD3FC", bg: "bg-sky-pastel" },
  { key: "readingScore", label: "Reading", emoji: "📖", ring: "#6EE7B7", bg: "bg-mint-pastel" },
  { key: "memoryScore", label: "Memory", emoji: "🧠", ring: "#60A5FA", bg: "bg-lavender-pastel" },
];

export default function StudentDashboard() {
  const { user, logout, loading: authLoading } = useAuth();
  const { speak } = useTTS();
  const router = useRouter();
  const { data, loading, error, refetch } = useDashboardData(user?.id);
  const [greeting, setGreeting] = useState("Hello");

  useEffect(() => {
    const hour = new Date().getHours();
    setGreeting(hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening");
  }, []);

  // Auth guard — redirect unauthenticated users to login
  if (!authLoading && !user) {
    router.replace("/login");
    return null;
  }

  if (loading || authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface-warm px-4">
        <div className="flex flex-col items-center gap-4" role="status" aria-live="polite">
          <span className="text-6xl" aria-hidden="true">🌟</span>
          <p className="text-base font-semibold text-indigo-900">Getting your learning space ready...</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-surface-warm text-ink">
        <PageContainer className="flex min-h-screen flex-col">
          <header className="flex items-center gap-3 border-b border-border-subtle/80 py-4 sm:py-5">
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-lavender-pastel text-xl shadow-panel" aria-hidden="true">✦</span>
            <span className="text-xl font-bold tracking-tight text-indigo-950">LumiLearn</span>
          </header>
          <section className="flex flex-1 items-center justify-center py-12" aria-labelledby="dashboard-error-title">
            <Surface className="w-full max-w-xl text-center" padding="lg">
              <span className="text-5xl" aria-hidden="true">🌤️</span>
              <h1 id="dashboard-error-title" className="mt-4 text-2xl font-bold tracking-tight text-indigo-950">
                We couldn&apos;t load your learning space
              </h1>
              <p className="mt-2 text-base leading-relaxed text-muted" role="alert">
                {error ?? "Your dashboard data is not available right now. Please try again."}
              </p>
              <Button className="mt-6" onClick={() => void refetch()}>
                <RefreshCw size={18} aria-hidden="true" /> Try again
              </Button>
            </Surface>
          </section>
        </PageContainer>
      </div>
    );
  }

  const { student, profile, recentAchievements } = data;
  const level = getLevelFromXP(student.xp);
  const nextXP = getXPForNextLevel(level);
  const xpPct = Math.min(100, Math.round((student.xp / nextXP) * 100));

  return (
    <div className="min-h-screen bg-surface-warm text-ink">
      <header className="border-b border-border-subtle/80 bg-surface/90">
        <PageContainer className="flex min-h-16 flex-wrap items-center justify-between gap-x-5 gap-y-3 py-3">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-lavender-pastel text-xl shadow-panel" aria-hidden="true">✦</span>
            <span className="text-xl font-bold tracking-tight text-indigo-950">LumiLearn</span>
          </div>

          <div className="hidden items-center gap-5 md:flex" aria-label="Your rewards">
            <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-amber-800">
              <Flame size={17} aria-hidden="true" className="text-orange-600" /> {student.streak} day streak
            </span>
            <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-indigo-800">
              <Zap size={17} aria-hidden="true" className="text-indigo-700" /> Level {level}
            </span>
            <span className="text-sm font-semibold text-amber-800">🪙 {student.coins} coins</span>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <Link
              href="/dashboard/student/parent-zone"
              className="inline-flex min-h-10 items-center gap-1.5 rounded-control bg-surface-soft px-3 text-sm font-semibold text-indigo-800 transition-colors hover:bg-lavender-pastel focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2"
            >
              <span aria-hidden="true">👪</span><span>Parent Zone</span>
            </Link>
            <button
              type="button"
              onClick={logout}
              className="inline-flex min-h-10 items-center gap-1.5 rounded-control px-2 text-sm font-semibold text-muted transition-colors hover:bg-surface-soft hover:text-indigo-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2 sm:px-3"
            >
              <LogOut size={16} aria-hidden="true" /><span>Sign out</span>
            </button>
          </div>
        </PageContainer>
      </header>

      <PageContainer className="py-7 sm:py-9">
        {error && (
          <div className="mb-5 flex flex-col items-start justify-between gap-3 rounded-panel border border-peach-accent/60 bg-peach-pastel px-4 py-3 sm:flex-row sm:items-center">
            <p className="text-sm font-medium leading-relaxed text-error-text" role="alert">
              Your latest dashboard refresh did not finish. Showing the information already loaded.
            </p>
            <Button variant="secondary" size="sm" onClick={() => void refetch()}>
              <RefreshCw size={16} aria-hidden="true" /> Refresh
            </Button>
          </div>
        )}

        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="grid gap-5 lg:grid-cols-[minmax(0,1.35fr)_minmax(260px,0.65fr)]"
          aria-labelledby="welcome-heading"
        >
          <Surface
            padding="lg"
            className="flex flex-col gap-5 bg-gradient-to-br from-lavender-pastel/70 via-surface to-mint-pastel/50 sm:flex-row sm:items-center sm:gap-6"
          >
            <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full border-2 border-white bg-surface text-5xl shadow-panel sm:h-24 sm:w-24" aria-hidden="true">
              {student.avatarId}
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 id="welcome-heading" className="text-3xl font-bold leading-heading tracking-tight text-indigo-950 sm:text-4xl">
                  {greeting}, {student.name}!
                </h1>
                <button
                  type="button"
                  onClick={() => speak(`${greeting} ${student.name}! Ready for your adventure today?`)}
                  aria-label="Hear your welcome"
                  className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-lavender-accent/50 bg-white text-indigo-700 transition-colors hover:bg-lavender-pastel focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2"
                >
                  <Volume2 size={18} aria-hidden="true" />
                </button>
              </div>
              <p className="mt-2 text-base leading-relaxed text-muted">
                Ready for today&apos;s adventure? Choose a game to play and keep growing.
              </p>

              <div className="mt-5">
                <div className="mb-2 flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-sm text-indigo-900">
                  <span className="font-semibold">Level {level} <span aria-hidden="true">→</span> {level + 1}</span>
                  <span>{student.xp} / {nextXP} XP</span>
                </div>
                <div
                  className="h-3 overflow-hidden rounded-full bg-white/80"
                  role="progressbar"
                  aria-label="Progress to next level"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={xpPct}
                >
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${xpPct}%` }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                    className="h-full rounded-full bg-indigo-700"
                  />
                </div>
              </div>
            </div>
          </Surface>

          <Surface padding="md" className="flex flex-col justify-center bg-sunshine-pastel/70">
            <div className="mb-3 flex items-center gap-2">
              <span className="text-2xl" aria-hidden="true">🏆</span>
              <h2 className="text-lg font-bold tracking-tight text-indigo-950">Your rewards</h2>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="rounded-control bg-white/80 px-2 py-3">
                <p className="text-xs font-semibold text-muted">Streak</p>
                <p className="mt-1 flex items-center justify-center gap-1 whitespace-nowrap text-base font-bold text-indigo-950">
                  <span aria-hidden="true">🔥</span>{student.streak}
                </p>
              </div>
              <div className="rounded-control bg-white/80 px-2 py-3">
                <p className="text-xs font-semibold text-muted">Coins</p>
                <p className="mt-1 flex items-center justify-center gap-1 whitespace-nowrap text-base font-bold text-indigo-950">
                  <span aria-hidden="true">🪙</span>{student.coins}
                </p>
              </div>
              <div className="rounded-control bg-white/80 px-2 py-3">
                <p className="text-xs font-semibold text-muted">Level</p>
                <p className="mt-1 flex items-center justify-center gap-1 whitespace-nowrap text-base font-bold text-indigo-950">
                  <span aria-hidden="true">⭐</span>{level}
                </p>
              </div>
            </div>
          </Surface>
        </motion.section>

        <section className="mt-8 sm:mt-10" aria-labelledby="progress-heading">
          <div className="mb-4 flex items-end justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-indigo-700">Your learning journey</p>
              <h2 id="progress-heading" className="mt-1 text-2xl font-bold tracking-tight text-indigo-950">Skills in progress</h2>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
            {STAT_COLORS.map((stat, index) => {
              const score = profile?.[stat.key] ?? 0;
              const boundedScore = Math.max(0, Math.min(100, score));
              const circumference = 100.5;
              return (
                <motion.div
                  key={stat.key}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.05 * index, duration: 0.3 }}
                >
                  <Surface padding="md" className={`flex h-full min-h-24 items-center gap-4 ${stat.bg}`}>
                    <span className="text-3xl" aria-hidden="true">{stat.emoji}</span>
                    <div className="min-w-0 flex-1">
                      <h3 className="text-sm font-semibold text-indigo-900">{stat.label}</h3>
                      <p className="mt-1 flex items-baseline gap-1">
                        <span className="text-3xl font-bold leading-none text-indigo-950">{score}</span>
                        <span className="text-sm text-muted">/ 100</span>
                      </p>
                    </div>
                    <div
                      className="h-11 w-11 shrink-0"
                      role="img"
                      aria-label={`${stat.label} score ${score} out of 100`}
                    >
                      <svg viewBox="0 0 40 40" className="-rotate-90" aria-hidden="true">
                        <circle cx="20" cy="20" r="16" fill="none" stroke="rgba(255,255,255,0.8)" strokeWidth="4" />
                        <circle
                          cx="20"
                          cy="20"
                          r="16"
                          fill="none"
                          stroke={stat.ring}
                          strokeWidth="4"
                          strokeLinecap="round"
                          strokeDasharray={circumference}
                          strokeDashoffset={circumference - (boundedScore / 100) * circumference}
                        />
                      </svg>
                    </div>
                  </Surface>
                </motion.div>
              );
            })}
          </div>
        </section>

        <section className="mt-8 sm:mt-10" aria-labelledby="games-heading">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-indigo-700">Pick up where you like</p>
              <h2 id="games-heading" className="mt-1 text-2xl font-bold tracking-tight text-indigo-950">Choose your adventure</h2>
            </div>
            <button
              type="button"
              onClick={() => speak("Choose a game to play!")}
              aria-label="Hear game instructions"
              className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-lavender-accent/50 bg-lavender-pastel text-indigo-800 transition-colors hover:bg-lavender-accent/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2"
            >
              <Volume2 size={18} aria-hidden="true" />
            </button>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {GAMES.map((game, index) => (
              <motion.article
                key={game.href}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.06 * index, duration: 0.3 }}
                className="h-full"
              >
                <Surface padding="none" className={`flex h-full flex-col ${game.accentClass}`}>
                  <Link
                    href={game.href}
                    className="group flex min-h-44 flex-1 flex-col rounded-panel p-5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-inset sm:p-6"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <span className="text-5xl leading-none" aria-hidden="true">{game.emoji}</span>
                      <span className={`rounded-full px-3 py-1 text-xs font-bold ${game.badgeClass}`}>{game.badge}</span>
                    </div>
                    <div className="mt-5 flex-1">
                      <h3 className="text-xl font-bold tracking-tight text-indigo-950">{game.title}</h3>
                      <p className="mt-2 text-sm leading-relaxed text-muted">{game.desc}</p>
                    </div>
                    <span className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-indigo-800 transition-transform group-hover:translate-x-1">
                      Play now <span aria-hidden="true">→</span>
                    </span>
                  </Link>
                  <div className="flex justify-end px-5 pb-4 sm:px-6">
                    <button
                      type="button"
                      onClick={() => speak(game.desc)}
                      aria-label={`Hear ${game.title} description`}
                      className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/80 text-indigo-800 transition-colors hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2"
                    >
                      <Volume2 size={17} aria-hidden="true" />
                    </button>
                  </div>
                </Surface>
              </motion.article>
            ))}
          </div>
        </section>

        <section className="mt-8 sm:mt-10" aria-labelledby="badges-heading">
          <Surface padding="lg">
            <div className="mb-4 flex items-center gap-3">
              <span className="text-3xl" aria-hidden="true">🏅</span>
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-indigo-700">Little wins add up</p>
                <h2 id="badges-heading" className="mt-1 text-xl font-bold tracking-tight text-indigo-950">Recent badges</h2>
              </div>
            </div>
            {recentAchievements.length > 0 ? (
              <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
                {recentAchievements.slice(0, 6).map((achievement, index) => (
                  <motion.li
                    key={`${achievement.name}-${index}`}
                    initial={{ opacity: 0, scale: 0.96 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.04 * index, duration: 0.25 }}
                    className="flex min-h-28 flex-col items-center justify-center gap-2 rounded-panel border border-sunshine-accent/50 bg-sunshine-pastel/70 p-3 text-center"
                  >
                    <span className="text-3xl" aria-hidden="true">{achievement.emoji}</span>
                    <span className="text-sm font-semibold leading-snug text-indigo-900">{achievement.name}</span>
                  </motion.li>
                ))}
              </ul>
            ) : (
              <div className="flex flex-col items-center justify-center gap-2 rounded-panel bg-surface-soft px-4 py-6 text-center">
                <span className="text-4xl opacity-70" aria-hidden="true">✨</span>
                <p className="text-sm font-medium leading-relaxed text-muted">Play a game to earn your first badge!</p>
              </div>
            )}
          </Surface>
        </section>
      </PageContainer>
    </div>
  );
}
