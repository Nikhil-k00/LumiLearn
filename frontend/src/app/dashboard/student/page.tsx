"use client";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { useTTS } from "@/hooks/useTTS";
import { useDashboardData } from "@/hooks/useDashboardData";
import { Volume2, Flame, LogOut, Zap } from "lucide-react";
import api from "@/lib/api";
import Link from "next/link";
import { getLevelFromXP, getXPForNextLevel } from "@/lib/gamification";

interface DashboardData {
  student: {
    name: string; age: number; avatarId: string;
    xp: number; coins: number; level: number; streak: number;
  };
  profile: {
    phonicsScore: number; readingScore: number; memoryScore: number;
    weakAreas: string[]; currentMission?: string;
  } | null;
  recentAchievements: { name: string; emoji: string }[];
}

const GAMES = [
  {
    href: "/games/phonics-adventure",
    emoji: "🔤",
    title: "Phonics Adventure",
    desc: "Master letter sounds & beat b/d confusion!",
    color: "from-sky-pastel to-sky-accent/20",
    border: "border-sky-accent/40",
    badge: "Phonics",
    badgeColor: "bg-sky-pastel text-sky-700",
  },
  {
    href: "/games/word-quest",
    emoji: "📖",
    title: "Word Quest",
    desc: "Read stories, match words, build sentences!",
    color: "from-mint-pastel to-mint-accent/20",
    border: "border-mint-accent/40",
    badge: "Reading",
    badgeColor: "bg-mint-pastel text-green-700",
  },
  {
    href: "/games/memory-challenge",
    emoji: "🧠",
    title: "Memory Challenge",
    desc: "Sound sequences, rhymes & memory power!",
    color: "from-lavender-pastel to-lavender-accent/20",
    border: "border-lavender-accent/40",
    badge: "Memory",
    badgeColor: "bg-lavender-pastel text-violet-700",
  },
];

const STAT_COLORS = [
  { key: "phonicsScore", label: "Phonics", emoji: "🔤", ring: "#7DD3FC", bg: "bg-sky-pastel" },
  { key: "readingScore", label: "Reading", emoji: "📖", ring: "#6EE7B7", bg: "bg-mint-pastel" },
  { key: "memoryScore", label: "Memory", emoji: "🧠", ring: "#C4B5FD", bg: "bg-lavender-pastel" },
];

/* Animated background stars */
const BG_STARS = Array.from({ length: 18 }, (_, i) => ({
  x: `${(i * 37 + 5) % 100}%`,
  y: `${(i * 53 + 8) % 100}%`,
  delay: i * 0.15,
  emoji: ["⭐", "✨", "🌟", "💫"][i % 4],
  size: i % 3 === 0 ? "text-2xl" : "text-base",
}));

export default function StudentDashboard() {
  const { user, logout, loading: authLoading } = useAuth();
  const { speak } = useTTS();
  const router = useRouter();
  const { data, loading } = useDashboardData(user?.id);

  // Auth guard — redirect unauthenticated users to login
  if (!authLoading && !user) {
    router.replace("/login");
    return null;
  }

  if (loading || authLoading) return (
    <div className="min-h-screen bg-page flex items-center justify-center">
      <motion.div animate={{ scale: [1, 1.2, 1], rotate: [0, 10, -10, 0] }}
        transition={{ duration: 1.5, repeat: Infinity }} className="text-7xl">🌟</motion.div>
    </div>
  );
  if (!data) return null;

  const { student, profile, recentAchievements } = data;
  const level = getLevelFromXP(student.xp);
  const nextXP = getXPForNextLevel(level);
  const xpPct = Math.min(100, Math.round((student.xp / nextXP) * 100));
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  return (
    <div className="min-h-screen bg-page relative overflow-hidden">

      {/* ── Animated background ──────────────────────────────────────── */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {BG_STARS.map((s, i) => (
          <motion.div
            key={i}
            className={`absolute ${s.size} opacity-20 select-none`}
            style={{ left: s.x, top: s.y }}
            animate={{ y: [0, -16, 0], opacity: [0.15, 0.3, 0.15] }}
            transition={{ duration: 4 + i * 0.3, delay: s.delay, repeat: Infinity, ease: "easeInOut" }}
          >
            {s.emoji}
          </motion.div>
        ))}
      </div>

      {/* ── TOP NAV BAR ──────────────────────────────────────────────── */}
      <nav className="relative z-10 bg-white/80 backdrop-blur-sm border-b border-lavender-accent/20
                      px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-2xl">🌟</span>
          <span className="text-[18px] font-bold text-indigo-900 tracking-tight">LumiLearn</span>
        </div>
        {/* Stats strip */}
        <div className="hidden md:flex items-center gap-5">
          <span className="flex items-center gap-1.5 text-[14px] text-orange-600 font-semibold">
            <Flame size={16} className="text-orange-500" /> {student.streak} day streak
          </span>
          <span className="flex items-center gap-1.5 text-[14px] text-violet-700 font-semibold">
            <Zap size={16} className="text-lavender-accent" /> Level {level}
          </span>
          <span className="text-[14px] text-amber-600 font-semibold">🪙 {student.coins} coins</span>
        </div>
        <div className="flex items-center gap-4">
          <Link href="/dashboard/student/parent-zone"
            className="flex items-center gap-1.5 text-[13px] font-semibold text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-full hover:bg-indigo-100 transition-colors">
            👪 Parent Zone
          </Link>
          <button onClick={logout}
            className="flex items-center gap-1.5 text-[13px] text-indigo-400 hover:text-indigo-700 transition-colors">
            <LogOut size={15} /> Sign out
          </button>
        </div>
      </nav>

      {/* ── MAIN CONTENT ─────────────────────────────────────────────── */}
      <div className="relative z-10 max-w-[1280px] mx-auto px-6 py-8">

        {/* ── TOP ROW: Hero card + Stats ───────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">

          {/* Hero welcome card — spans 2 cols */}
          <motion.div
            initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}
            className="lg:col-span-2 bg-gradient-to-br from-lavender-pastel via-sky-pastel to-mint-pastel
                       rounded-card shadow-card border border-lavender-accent/20 p-6 flex items-center gap-6"
          >
            {/* Avatar */}
            <motion.div
              animate={{ scale: [1, 1.05, 1] }}
              transition={{ duration: 3, repeat: Infinity }}
              className="w-20 h-20 rounded-full bg-white/70 border-3 border-lavender-accent/50
                         flex items-center justify-center text-5xl shadow-card flex-shrink-0"
            >
              {student.avatarId}
            </motion.div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-[26px] font-bold text-indigo-900 leading-tight">
                  {greeting}, {student.name}! 👋
                </h1>
                <button onClick={() => speak(`${greeting} ${student.name}! Ready for your adventure today?`)}
                  className="p-1.5 rounded-full bg-white/70 border border-lavender-accent/40 flex-shrink-0"
                  style={{ minHeight: "unset", minWidth: "unset" }}>
                  <Volume2 size={13} className="text-indigo-500" />
                </button>
              </div>
              <p className="text-[15px] text-indigo-600 mt-0.5">
                {profile?.currentMission
                  ? `Today's mission: ${profile.currentMission}`
                  : "Ready for today's adventure? Pick a game below!"}
              </p>

              {/* XP bar */}
              <div className="mt-4">
                <div className="flex justify-between text-[12px] text-indigo-500 mb-1">
                  <span className="font-semibold">Level {level} → {level + 1}</span>
                  <span>{student.xp} / {nextXP} XP</span>
                </div>
                <div className="h-3 bg-white/50 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }} animate={{ width: `${xpPct}%` }}
                    transition={{ duration: 1.2, ease: "easeOut" }}
                    className="h-full bg-gradient-to-r from-lavender-accent to-sky-accent rounded-full"
                  />
                </div>
              </div>
            </div>
          </motion.div>

          {/* Score cards column */}
          <div className="flex flex-col gap-3">
            {STAT_COLORS.map((s, i) => {
              const score = profile ? (profile as any)[s.key] ?? 0 : 0;
              return (
                <motion.div
                  key={s.key}
                  initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 + i * 0.08 }}
                  className={`${s.bg} rounded-card shadow-card border border-white/60 px-5 py-3
                              flex items-center gap-4`}
                >
                  <span className="text-3xl">{s.emoji}</span>
                  <div className="flex-1">
                    <p className="text-[11px] font-semibold text-indigo-500 uppercase tracking-wide">{s.label}</p>
                    <div className="flex items-end gap-1">
                      <span className="text-[24px] font-bold text-indigo-900">{score}</span>
                      <span className="text-[12px] text-indigo-400 mb-0.5">/100</span>
                    </div>
                  </div>
                  {/* Mini progress arc */}
                  <div className="relative w-10 h-10">
                    <svg viewBox="0 0 40 40" className="rotate-[-90deg]">
                      <circle cx="20" cy="20" r="16" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="4" />
                      <motion.circle
                        cx="20" cy="20" r="16" fill="none"
                        stroke={s.ring} strokeWidth="4" strokeLinecap="round"
                        strokeDasharray={`${100.5}`}
                        initial={{ strokeDashoffset: 100.5 }}
                        animate={{ strokeDashoffset: 100.5 - (score / 100) * 100.5 }}
                        transition={{ duration: 1.2, ease: "easeOut", delay: 0.2 + i * 0.1 }}
                      />
                    </svg>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* ── MIDDLE ROW: Game cards ───────────────────────────────── */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <h2 className="text-[20px] font-bold text-indigo-900">🎮 Choose Your Adventure</h2>
            <button onClick={() => speak("Choose a game to play!")}
              className="p-1.5 rounded-full bg-lavender-pastel border border-lavender-accent/40"
              style={{ minHeight: "unset", minWidth: "unset" }}>
              <Volume2 size={12} className="text-lavender-accent" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {GAMES.map((g, i) => (
              <motion.div
                key={g.href}
                initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 + i * 0.1 }}
                whileHover={{ y: -4, transition: { duration: 0.2 } }}
              >
                <Link href={g.href}
                  className={`flex flex-col gap-4 p-6 rounded-card border-2 ${g.border}
                              bg-gradient-to-br ${g.color} shadow-card hover:shadow-card-hover
                              transition-shadow group block h-full`}>
                  {/* Top row */}
                  <div className="flex items-start justify-between">
                    <motion.span
                      className="text-5xl leading-none"
                      animate={{ rotate: [0, 5, -5, 0] }}
                      transition={{ duration: 3, repeat: Infinity, delay: i * 0.5 }}
                    >
                      {g.emoji}
                    </motion.span>
                    <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full ${g.badgeColor}`}>
                      {g.badge}
                    </span>
                  </div>
                  {/* Content */}
                  <div className="flex-1">
                    <h3 className="text-[18px] font-bold text-indigo-900">{g.title}</h3>
                    <p className="text-[14px] text-indigo-600 mt-1 leading-snug">{g.desc}</p>
                  </div>
                  {/* Play button */}
                  <div className="flex items-center justify-between mt-1">
                    <div className="flex items-center gap-1.5">
                      <button onClick={(e) => { e.preventDefault(); speak(g.desc); }}
                        className="p-1.5 rounded-full bg-white/70"
                        style={{ minHeight: "unset", minWidth: "unset" }}>
                        <Volume2 size={12} className="text-indigo-400" />
                      </button>
                    </div>
                    <span className="flex items-center gap-1.5 text-[14px] font-bold text-indigo-700
                                     group-hover:gap-2.5 transition-all">
                      Play now <span className="text-xl">▶️</span>
                    </span>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>

        {/* ── BOTTOM ROW: Achievements + Mission ──────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* Today's mission */}
          <motion.div
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
            className="bg-sunshine-pastel rounded-card border-2 border-sunshine-accent/60 p-6 shadow-card"
          >
            <div className="flex items-center gap-3 mb-3">
              <motion.span
                animate={{ scale: [1, 1.15, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="text-3xl"
              >🎯</motion.span>
              <h3 className="text-[16px] font-bold text-amber-800">Today&apos;s Mission</h3>
              {profile?.currentMission && (
                <button onClick={() => speak(profile.currentMission!)}
                  className="ml-auto p-1.5 rounded-full bg-white/70"
                  style={{ minHeight: "unset", minWidth: "unset" }}>
                  <Volume2 size={13} className="text-amber-600" />
                </button>
              )}
            </div>
            <p className="text-[15px] text-indigo-800 font-medium leading-relaxed">
              {profile?.currentMission || "Complete a game to unlock your personalised mission! 🚀"}
            </p>
            <div className="flex gap-3 mt-4">
              <div className="flex-1 bg-white/60 rounded-xl px-4 py-3 text-center">
                <p className="text-[11px] text-amber-600 font-semibold uppercase">Streak</p>
                <p className="text-[22px] font-bold text-indigo-900">🔥 {student.streak}</p>
              </div>
              <div className="flex-1 bg-white/60 rounded-xl px-4 py-3 text-center">
                <p className="text-[11px] text-amber-600 font-semibold uppercase">Coins</p>
                <p className="text-[22px] font-bold text-indigo-900">🪙 {student.coins}</p>
              </div>
              <div className="flex-1 bg-white/60 rounded-xl px-4 py-3 text-center">
                <p className="text-[11px] text-amber-600 font-semibold uppercase">Level</p>
                <p className="text-[22px] font-bold text-indigo-900">⭐ {level}</p>
              </div>
            </div>
          </motion.div>

          {/* Achievements */}
          <motion.div
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}
            className="bg-white rounded-card border border-lavender-accent/20 p-6 shadow-card"
          >
            <h3 className="text-[16px] font-bold text-indigo-900 mb-4">🏅 Recent Badges</h3>
            {recentAchievements.length > 0 ? (
              <div className="grid grid-cols-3 gap-3">
                {recentAchievements.slice(0, 6).map((a, i) => (
                  <motion.div
                    key={i}
                    initial={{ scale: 0 }} animate={{ scale: 1 }}
                    transition={{ delay: 0.5 + i * 0.07, type: "spring" }}
                    className="flex flex-col items-center gap-1 bg-sunshine-pastel rounded-xl p-3
                               border border-sunshine-accent/40"
                  >
                    <span className="text-3xl">{a.emoji}</span>
                    <p className="text-[11px] font-semibold text-indigo-700 text-center leading-tight">{a.name}</p>
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-32 gap-3 text-center">
                <span className="text-5xl opacity-40">🏅</span>
                <p className="text-[14px] text-indigo-400">Play a game to earn your first badge!</p>
              </div>
            )}
          </motion.div>
        </div>
      </div>
    </div>
  );
}
