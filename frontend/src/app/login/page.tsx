"use client";
import { useState } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { Volume2 } from "lucide-react";
import { useTTS } from "@/hooks/useTTS";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { PageContainer } from "@/components/ui/PageContainer";
import { Surface } from "@/components/ui/Surface";

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
    "min-h-12 w-full rounded-control border border-border-strong/70 bg-white px-4 py-3 " +
    "text-base tracking-normal text-ink placeholder:text-subtle/70 transition-colors " +
    "focus:border-focus focus:outline-none focus:ring-2 focus:ring-focus/20";

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
    <div className="min-h-screen overflow-hidden bg-surface-warm text-ink">
      <PageContainer className="flex min-h-screen flex-col">
        <header className="flex items-center justify-between border-b border-border-subtle/80 py-4 sm:py-5">
          <Link href="/login" className="inline-flex items-center gap-3 rounded-control focus-visible:outline-none">
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-lavender-pastel text-xl shadow-panel" aria-hidden="true">
              ✦
            </span>
            <span className="text-xl font-bold tracking-tight text-indigo-950">LumiLearn</span>
          </Link>
          <span className="hidden text-sm font-medium tracking-normal text-muted sm:block">
            Learn, play, grow.
          </span>
        </header>

        <div className="grid flex-1 items-center gap-8 py-8 sm:py-10 lg:grid-cols-[minmax(0,1.1fr)_minmax(380px,0.9fr)] lg:gap-14 lg:py-12">
          <section className="mx-auto w-full max-w-2xl" aria-labelledby="welcome-heading">
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="flex flex-col"
            >
              <p className="mb-3 text-xs font-bold uppercase tracking-[0.16em] text-indigo-700">
                A brighter way to practice
              </p>
              <h1 id="welcome-heading" className="max-w-xl text-4xl font-bold leading-heading tracking-tight text-indigo-950 sm:text-5xl">
                Small steps.
                <span className="block text-indigo-700">Wonderful progress.</span>
              </h1>
              <p className="mt-5 max-w-lg text-base leading-relaxed tracking-normal text-muted sm:text-lg">
                An adventure in reading, spelling &amp; memory — made just for you!
              </p>

              <div className="my-6 w-full max-w-xl self-center sm:my-8" role="img" aria-label="An open storybook surrounded by a pencil, a star, and playful learning symbols">
                <svg viewBox="0 0 600 410" className="h-auto w-full" xmlns="http://www.w3.org/2000/svg">
                  <defs>
                    <linearGradient id="book-cover" x1="0" y1="0" x2="1" y2="1">
                      <stop offset="0" stopColor="#60A5FA" />
                      <stop offset="1" stopColor="#1D4ED8" />
                    </linearGradient>
                    <linearGradient id="left-page" x1="0" y1="0" x2="0.8" y2="1">
                      <stop offset="0" stopColor="#FFFFFF" />
                      <stop offset="1" stopColor="#EEF4FF" />
                    </linearGradient>
                    <linearGradient id="right-page" x1="1" y1="0" x2="0.1" y2="1">
                      <stop offset="0" stopColor="#FFFFFF" />
                      <stop offset="1" stopColor="#EFF6FF" />
                    </linearGradient>
                    <linearGradient id="pencil" x1="0" y1="0" x2="1" y2="1">
                      <stop offset="0" stopColor="#FFD17A" />
                      <stop offset="1" stopColor="#F4A94F" />
                    </linearGradient>
                    <filter id="clay-shadow" x="-30%" y="-30%" width="160%" height="180%">
                      <feDropShadow dx="0" dy="14" stdDeviation="12" floodColor="#1E40AF" floodOpacity="0.18" />
                    </filter>
                  </defs>

                  <ellipse cx="300" cy="350" rx="205" ry="26" fill="#BFDBFE" opacity="0.45" />
                  <circle cx="300" cy="195" r="150" fill="#DBEAFE" />
                  <circle cx="300" cy="195" r="122" fill="#E4F7EE" opacity="0.9" />

                  <g filter="url(#clay-shadow)">
                    <path d="M128 170 Q205 134 292 180 L292 315 Q210 275 128 310 Z" fill="url(#book-cover)" />
                    <path d="M308 180 Q395 134 472 170 L472 310 Q390 275 308 315 Z" fill="#1E40AF" />
                    <path d="M137 154 Q214 119 296 165 L296 294 Q213 258 137 291 Z" fill="url(#left-page)" />
                    <path d="M304 165 Q386 119 463 154 L463 291 Q386 258 304 294 Z" fill="url(#right-page)" />
                    <path d="M296 165 Q300 161 304 165 L304 294 Q300 291 296 294 Z" fill="#7DD3FC" />
                    <path d="M155 178 Q218 151 278 181" fill="none" stroke="#93C5FD" strokeWidth="5" strokeLinecap="round" />
                    <path d="M155 200 Q214 175 278 203" fill="none" stroke="#BFDBFE" strokeWidth="5" strokeLinecap="round" />
                    <path d="M155 222 Q214 199 278 226" fill="none" stroke="#BFDBFE" strokeWidth="5" strokeLinecap="round" />
                    <path d="M322 181 Q382 151 445 178" fill="none" stroke="#93C5FD" strokeWidth="5" strokeLinecap="round" />
                    <path d="M322 203 Q386 175 445 200" fill="none" stroke="#BFDBFE" strokeWidth="5" strokeLinecap="round" />
                    <path d="M322 226 Q386 199 445 222" fill="none" stroke="#BFDBFE" strokeWidth="5" strokeLinecap="round" />
                    <circle cx="215" cy="248" r="15" fill="#A7E8CB" />
                    <path d="M365 252 C365 239 383 231 393 244 C403 231 421 239 421 252 C421 267 393 280 393 280 C393 280 365 267 365 252Z" fill="#F6A9A9" />
                  </g>

                  <g filter="url(#clay-shadow)" transform="rotate(-24 116 220)">
                    <rect x="91" y="162" width="27" height="132" rx="13" fill="url(#pencil)" />
                    <path d="M91 175 Q104 158 118 175 L118 191 L91 191 Z" fill="#F39C8D" />
                    <path d="M91 282 L104.5 309 L118 282 Z" fill="#E9BD8D" />
                    <path d="M101 301 L104.5 309 L108 301 Z" fill="#58516D" />
                  </g>

                  <g filter="url(#clay-shadow)">
                    <path d="M467 87 L480 112 L508 116 L488 135 L493 162 L467 149 L443 162 L447 135 L427 116 L455 112 Z" fill="#FFD66E" />
                    <circle cx="120" cy="112" r="23" fill="#A7E8CB" />
                    <path d="M113 110 Q120 103 127 110" fill="none" stroke="#277A62" strokeWidth="4" strokeLinecap="round" />
                    <circle cx="120" cy="118" r="3" fill="#277A62" />
                    <path d="M514 244 Q535 225 552 245 Q566 263 548 279 L536 293 L525 278 Q505 271 514 244Z" fill="#FFB9A8" />
                    <circle cx="530" cy="252" r="3" fill="#8D4B58" />
                    <circle cx="544" cy="252" r="3" fill="#8D4B58" />
                    <path d="M530 261 Q537 267 544 261" fill="none" stroke="#8D4B58" strokeWidth="3" strokeLinecap="round" />
                  </g>
                </svg>
              </div>

              <ul className="flex flex-wrap gap-x-6 gap-y-3 text-sm font-semibold tracking-normal text-indigo-800" aria-label="Learning activities">
                <li className="inline-flex items-center gap-2"><span aria-hidden="true">🔤</span> Phonics games</li>
                <li className="inline-flex items-center gap-2"><span aria-hidden="true">🧠</span> Memory challenges</li>
                <li className="inline-flex items-center gap-2"><span aria-hidden="true">📖</span> Word quests</li>
                <li className="inline-flex items-center gap-2"><span aria-hidden="true">🏆</span> Earn badges</li>
              </ul>
            </motion.div>
          </section>

          <section className="mx-auto w-full max-w-md lg:justify-self-end" aria-labelledby="login-heading">
            <Surface className="p-5 sm:p-8">
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.08 }}
                className="flex flex-col gap-6"
              >
                <div>
                  <p className="mb-2 text-xs font-bold uppercase tracking-[0.14em] text-indigo-700">Your learning space</p>
                  <h2 id="login-heading" className="text-2xl font-bold leading-heading tracking-tight text-indigo-950">
                    Welcome back!
                  </h2>
                  <p className="mt-2 text-sm leading-relaxed tracking-normal text-muted">
                    Sign in to continue your adventure.
                  </p>
                </div>

                <div className="flex flex-col gap-4">
                  <div>
                    <div className="mb-1.5 flex items-center gap-2">
                      <label htmlFor="login-name" className="text-sm font-semibold tracking-normal text-indigo-900">Your name</label>
                      <button type="button" onClick={() => speak("Type your first name")}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-sky-pastel text-sky-700 transition-colors hover:bg-sky-accent/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
                        aria-label="Hear name field instructions">
                        <Volume2 size={15} aria-hidden="true" />
                      </button>
                    </div>
                    <input id="login-name" name="name" autoComplete="given-name" value={name} onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. Alex" className={inputCls} />
                  </div>
                  <div>
                    <label htmlFor="login-email" className="mb-1.5 block text-sm font-semibold tracking-normal text-indigo-900">Parent email</label>
                    <input id="login-email" name="email" autoComplete="email" value={parentEmail} onChange={(e) => setParentEmail(e.target.value)}
                      placeholder="parent@email.com" type="email" className={inputCls} />
                  </div>
                  <div>
                    <label htmlFor="login-password" className="mb-1.5 block text-sm font-semibold tracking-normal text-indigo-900">Password</label>
                    <input id="login-password" name="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)}
                      type="password" placeholder="••••••" className={inputCls} />
                  </div>
                </div>

                {error && (
                  <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
                    role="alert"
                    className="rounded-control border border-peach-accent/60 bg-peach-pastel px-3 py-2 text-center text-sm tracking-normal text-error-text">
                    {error}
                  </motion.p>
                )}

                <Button onClick={handleLogin} disabled={loading} className="w-full">
                  {loading ? (
                    <span className="inline-flex items-center justify-center gap-2">
                      <motion.span animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }} aria-hidden="true">
                        ⏳
                      </motion.span>
                      Logging in...
                    </span>
                  ) : "Let's Go! 🚀"}
                </Button>

                <p className="text-center text-sm tracking-normal text-muted">
                  New here?{" "}
                  <Link href="/register/student" className="font-bold text-indigo-700 underline decoration-indigo-300 underline-offset-4 hover:text-indigo-900">
                    Create account
                  </Link>
                </p>
              </motion.div>
            </Surface>
          </section>
        </div>

        <footer className="border-t border-border-subtle/80 py-4 text-center text-xs tracking-normal text-subtle">
          Practice reading, spelling, and memory at your own pace.
        </footer>
      </PageContainer>
    </div>
  );
}
