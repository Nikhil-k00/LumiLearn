"use client";
import { useState } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { Volume2 } from "lucide-react";
import { useTTS } from "@/hooks/useTTS";
import Link from "next/link";

/* Floating decorative orbs for the hero side */
const ORBS = [
  { emoji: "🔤", x: "10%",  y: "15%", delay: 0,    size: "text-5xl" },
  { emoji: "📖", x: "75%",  y: "10%", delay: 0.4,  size: "text-4xl" },
  { emoji: "🧠", x: "20%",  y: "70%", delay: 0.8,  size: "text-4xl" },
  { emoji: "⭐", x: "80%",  y: "60%", delay: 0.2,  size: "text-3xl" },
  { emoji: "🚀", x: "55%",  y: "80%", delay: 0.6,  size: "text-5xl" },
  { emoji: "🎮", x: "5%",   y: "45%", delay: 1.0,  size: "text-3xl" },
  { emoji: "🌟", x: "88%",  y: "35%", delay: 0.3,  size: "text-4xl" },
  { emoji: "🏆", x: "40%",  y: "5%",  delay: 0.7,  size: "text-3xl" },
];

export default function LoginPage() {
  const { login }  = useAuth();
  const { speak }  = useTTS();
  const router     = useRouter();
  const [name,     setName]     = useState("");
  const [parentEmail, setParentEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error,    setError]    = useState("");
  const [loading,  setLoading]  = useState(false);

  const inputCls =
    "w-full px-4 py-3 rounded-xl border-2 border-lavender-accent/30 text-[15px] " +
    "focus:outline-none focus:border-lavender-accent bg-white/80 text-indigo-900 " +
    "placeholder:text-indigo-300 transition-colors min-h-0";

  const handleLogin = async () => {
    setError("");
    if (!password) { setError("Please enter your password"); return; }
    setLoading(true);
    try {
      if (!name || !parentEmail) { setError("Please fill all fields"); setLoading(false); return; }
      await login({ name, parentEmail, password });
      router.push("/dashboard/student");
    } catch {
      setError("Incorrect details — please try again");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex overflow-hidden">

      {/* ── LEFT HERO PANEL ──────────────────────────────────────────── */}
      <div className="hidden lg:flex flex-1 relative bg-gradient-to-br from-lavender-pastel via-sky-pastel to-mint-pastel
                      flex-col items-center justify-center overflow-hidden">

        {/* Animated floating orbs */}
        {ORBS.map((o, i) => (
          <motion.div
            key={i}
            className={`absolute ${o.size} select-none`}
            style={{ left: o.x, top: o.y }}
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1, y: [0, -12, 0] }}
            transition={{
              opacity: { delay: o.delay, duration: 0.5 }, 
              scale:   { delay: o.delay, duration: 0.5 },
              y: { delay: o.delay + 0.5, duration: 3 + i * 0.4, repeat: Infinity, ease: "easeInOut" },
            }}
          >
            {o.emoji}
          </motion.div>
        ))}

        {/* Center hero content */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.7 }}
          className="relative z-10 flex flex-col items-center gap-6 text-center px-12"
        >
          <motion.div
            animate={{ rotate: [0, 5, -5, 0], scale: [1, 1.05, 1] }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            className="text-[96px] leading-none"
          >
            🌟
          </motion.div>
          <h1 className="text-[42px] font-bold text-indigo-900 leading-tight tracking-tight">
            LumiLearn
          </h1>
          <p className="text-[18px] text-indigo-600 max-w-xs leading-relaxed">
            An adventure in reading, spelling & memory — made just for you!
          </p>

          {/* Feature pills */}
          <div className="flex flex-wrap gap-3 justify-center mt-2">
            {["🔤 Phonics Games", "🧠 Memory Challenges", "📖 Word Quests", "🏆 Earn Badges"].map((f) => (
              <motion.span
                key={f}
                whileHover={{ scale: 1.05 }}
                className="px-4 py-2 bg-white/60 backdrop-blur-sm rounded-full text-[14px]
                           font-semibold text-indigo-700 border border-lavender-accent/30 shadow-card"
              >
                {f}
              </motion.span>
            ))}
          </div>
        </motion.div>
      </div>

      {/* ── RIGHT FORM PANEL ─────────────────────────────────────────── */}
      <div className="flex-1 lg:max-w-[480px] flex flex-col items-center justify-center
                      bg-white px-8 py-10 overflow-y-auto">

        {/* Mobile logo (hidden on lg) */}
        <div className="flex flex-col items-center gap-1 mb-6 lg:hidden">
          <span className="text-5xl">🌟</span>
          <h1 className="text-[26px] font-bold text-indigo-900">DysLex AI</h1>
        </div>

        <motion.div
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-sm flex flex-col gap-5"
        >
          <div className="mb-1">
            <h2 className="text-[24px] font-bold text-indigo-900">Welcome back! 👋</h2>
            <p className="text-[14px] text-indigo-500 mt-0.5">Sign in to continue your adventure</p>
          </div>

          {/* Removed Role tabs */}

          {/* Fields */}
          <div className="flex flex-col gap-3">
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <label className="text-[13px] font-semibold text-indigo-700">Your name</label>
                <button onClick={() => speak("Type your first name")}
                  className="p-1 rounded-full bg-sky-pastel border border-sky-accent/50"
                  style={{ minHeight: "unset", minWidth: "unset" }}>
                  <Volume2 size={10} className="text-sky-700" />
                </button>
              </div>
              <input value={name} onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Alex" className={inputCls} />
            </div>
            <div>
              <label className="text-[13px] font-semibold text-indigo-700 block mb-1.5">Parent email</label>
              <input value={parentEmail} onChange={(e) => setParentEmail(e.target.value)}
                placeholder="parent@email.com" type="email" className={inputCls} />
            </div>
            <div>
              <label className="text-[13px] font-semibold text-indigo-700 block mb-1.5">Password</label>
              <input value={password} onChange={(e) => setPassword(e.target.value)}
                type="password" placeholder="••••••" className={inputCls} />
            </div>
          </div>

          {error && (
            <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
              className="text-[13px] text-center bg-peach-pastel text-orange-700 rounded-xl px-3 py-2 border border-peach-accent/40">
              {error}
            </motion.p>
          )}

          <motion.button
            whileTap={{ scale: 0.97 }} whileHover={{ scale: 1.01 }}
            onClick={handleLogin} disabled={loading}
            className="w-full py-3.5 rounded-button bg-lavender-accent text-white font-bold text-[16px]
                       shadow-btn disabled:opacity-60 transition-all"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <motion.span animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }}>
                  ⏳
                </motion.span>
                Logging in...
              </span>
            ) : "Let's Go! 🚀"}
          </motion.button>

          <p className="text-center text-[13px] text-indigo-400">
            New here?{" "}
            <Link href="/register/student"
              className="text-lavender-accent font-semibold hover:underline">
              Create account
            </Link>
          </p>
        </motion.div>
      </div>
    </div>
  );
}
