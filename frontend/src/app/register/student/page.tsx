"use client";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { ChevronRight, ChevronLeft } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { PageContainer } from "@/components/ui/PageContainer";
import { Surface } from "@/components/ui/Surface";

const AVATARS = ["🚀","🐉","🦄","🤖","🧙","🧚","🦁","👾","🐬","🦕","🦸","🦊"];
const THEMES  = ["Space","Fantasy","Ocean","Jungle","Dinosaur","Fairy Tale"];
const CHARS   = ["Pikachu","Elsa","Spider-Man","Moana","Minecraft Steve","Peppa Pig","Bluey","Harry Potter"];
const READING_LEVELS = [
  { value: "beginner",   label: "Beginner",   emoji: "🌱", desc: "Just starting out" },
  { value: "emerging",   label: "Emerging",   emoji: "🌿", desc: "Learning the basics" },
  { value: "developing", label: "Developing", emoji: "🌳", desc: "Getting better!" },
  { value: "fluent",     label: "Fluent",     emoji: "🌟", desc: "Reading well" },
];

const INPUT_CLASS =
  "min-h-12 w-full rounded-control border border-border-strong/70 bg-white px-4 py-3 " +
  "text-base tracking-normal text-ink placeholder:text-subtle/70 transition-colors " +
  "focus:border-focus focus:outline-none focus:ring-2 focus:ring-focus/20";

const OPTION_CLASS =
  "rounded-control border px-3 py-2 text-sm font-medium tracking-normal transition-colors " +
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2";

export default function RegisterStudentPage() {
  const { registerStudent } = useAuth();
  const router              = useRouter();
  const [step,  setStep]    = useState(1);
  const [error, setError]   = useState("");
  const [loading, setLoading] = useState(false);

  // Step 1
  const [name,        setName]        = useState("");
  const [age,         setAge]         = useState("");
  const [grade,       setGrade]       = useState("");
  const [parentEmail, setParentEmail] = useState("");
  const [password,    setPassword]    = useState("");
  const [avatarId,    setAvatarId]    = useState(AVATARS[0]);

  // Step 2
  const [favoriteCharacter, setFavChar]  = useState("");
  const [favoriteTheme,     setFavTheme] = useState(THEMES[0]);

  // Step 3
  const [readingLevel, setReadingLevel] = useState("beginner");

  const next = () => {
    if (step === 1) {
      if (!name || !age || !parentEmail || !password) { setError("Please fill all fields"); return; }
    }
    setError("");
    setStep((s) => s + 1);
  };

  const submit = async () => {
    setLoading(true);
    setError("");
    try {
      await registerStudent({
        name, age: Number(age), grade: Number(grade), parentEmail, password,
        avatarId, favoriteCharacter, favoriteTheme, readingLevel,
      });
      router.push("/dashboard/student");
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { message?: string }; status?: number } };
      const serverMsg = axiosErr?.response?.data?.message;
      const status    = axiosErr?.response?.status;
      if (status === 409) {
        setError("An account with this name and parent email already exists. Please log in.");
      } else {
        setError(serverMsg ?? "Registration failed — please try again");
      }
      setLoading(false);
    }
  };

  const steps = [
    { number: 1, label: "About you" },
    { number: 2, label: "Your favorites" },
    { number: 3, label: "Reading" },
  ];

  return (
    <div className="min-h-screen bg-surface-warm text-ink">
      <PageContainer className="flex min-h-screen flex-col">
        <header className="flex items-center justify-between border-b border-border-subtle/80 py-4 sm:py-5">
          <Link href="/login" className="inline-flex items-center gap-3 rounded-control focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2">
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-lavender-pastel text-xl shadow-panel" aria-hidden="true">
              ✦
            </span>
            <span className="text-xl font-bold tracking-tight text-indigo-950">LumiLearn</span>
          </Link>
          <Link href="/login" className="rounded-control text-sm font-semibold text-indigo-700 underline decoration-indigo-300 underline-offset-4 hover:text-indigo-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2">
            Back to sign in
          </Link>
        </header>

        <div className="grid flex-1 items-center gap-8 py-8 sm:py-10 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] lg:gap-14 lg:py-12">
          <section className="mx-auto w-full max-w-xl" aria-labelledby="registration-heading">
            <p className="mb-3 text-xs font-bold uppercase tracking-[0.16em] text-indigo-700">
              Your learning adventure starts here
            </p>
            <h1 id="registration-heading" className="text-4xl font-bold leading-heading tracking-tight text-indigo-950 sm:text-5xl">
              Let&apos;s make it yours.
            </h1>
            <p className="mt-5 max-w-lg text-base leading-relaxed tracking-normal text-muted sm:text-lg">
              A few quick details help us create a reading and learning space just for you.
            </p>
            <div className="mt-7 hidden items-center gap-3 rounded-panel border border-mint-accent/25 bg-mint-pastel/50 px-4 py-3 text-sm font-medium leading-relaxed text-indigo-900 sm:flex">
              <span className="text-xl" aria-hidden="true">🌱</span>
              <span>Your choices help personalize your LumiLearn experience.</span>
            </div>
          </section>

          <section className="mx-auto w-full max-w-2xl" aria-label="Student registration">
            <Surface padding="lg" className="mx-auto w-full max-w-2xl">
              <nav aria-label="Registration progress">
                <ol className="grid grid-cols-3 gap-2">
                  {steps.map(({ number, label }) => {
                    const isCurrent = number === step;
                    const isComplete = number < step;
                    return (
                      <li key={number}>
                        <div
                          aria-current={isCurrent ? "step" : undefined}
                          className={`flex min-h-10 items-center justify-center gap-2 rounded-control px-2 text-center text-xs font-semibold tracking-normal sm:text-sm ${
                            isCurrent
                            ? "bg-blue-700 text-white"
                              : isComplete
                                ? "bg-mint-pastel text-indigo-900"
                                : "bg-surface-soft text-muted"
                          }`}
                        >
                          <span aria-hidden="true">{isComplete ? "✓" : number}</span>
                          <span>{label}</span>
                        </div>
                      </li>
                    );
                  })}
                </ol>
              </nav>

              <AnimatePresence mode="wait">
                {step === 1 && (
                  <motion.div
                    key="s1"
                    initial={{ opacity: 0, x: 12 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -12 }}
                    transition={{ duration: 0.18 }}
                    className="mt-7 flex flex-col gap-5"
                  >
                    <div>
                      <p className="text-xl font-bold tracking-tight text-indigo-950">👋 Tell us about you!</p>
                      <p className="mt-1 text-sm leading-relaxed text-muted">
                        Fields marked <span className="font-bold text-indigo-700">*</span> are needed to get started.
                      </p>
                    </div>

                    <fieldset>
                      <legend className="mb-2 text-sm font-semibold tracking-normal text-indigo-900">Pick your avatar</legend>
                      <div className="grid grid-cols-6 gap-2">
                        {AVATARS.map((avatar) => (
                          <button
                            key={avatar}
                            type="button"
                            onClick={() => setAvatarId(avatar)}
                            aria-label={`Choose ${avatar} avatar`}
                            aria-pressed={avatarId === avatar}
                            className={`flex min-h-11 items-center justify-center rounded-control border-2 text-2xl transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2 ${
                              avatarId === avatar
                                ? "border-lavender-accent bg-lavender-pastel"
                                : "border-border-subtle bg-white hover:border-lavender-accent/50"
                            }`}
                          >
                            {avatar}
                          </button>
                        ))}
                      </div>
                    </fieldset>

                    <div>
                      <label htmlFor="register-name" className="mb-1.5 block text-sm font-semibold tracking-normal text-indigo-900">
                        Your name <span className="text-indigo-700" aria-hidden="true">*</span>
                      </label>
                      <input id="register-name" name="name" autoComplete="given-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Alex" className={INPUT_CLASS} aria-required="true" />
                    </div>

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <div>
                        <label htmlFor="register-age" className="mb-1.5 block text-sm font-semibold tracking-normal text-indigo-900">
                          Age <span className="text-indigo-700" aria-hidden="true">*</span>
                        </label>
                        <input id="register-age" name="age" autoComplete="off" value={age} onChange={(e) => setAge(e.target.value)} placeholder="Age (4–14)" type="number" min={4} max={14} className={INPUT_CLASS} aria-required="true" />
                      </div>
                      <div>
                        <label htmlFor="register-grade" className="mb-1.5 block text-sm font-semibold tracking-normal text-indigo-900">
                          Grade <span className="text-xs font-normal text-muted">(optional)</span>
                        </label>
                        <input id="register-grade" name="grade" autoComplete="off" value={grade} onChange={(e) => setGrade(e.target.value)} placeholder="Grade" type="number" min={1} max={9} className={INPUT_CLASS} />
                      </div>
                    </div>

                    <div>
                      <label htmlFor="register-email" className="mb-1.5 block text-sm font-semibold tracking-normal text-indigo-900">
                        Parent email <span className="text-indigo-700" aria-hidden="true">*</span>
                      </label>
                      <input id="register-email" name="email" autoComplete="email" value={parentEmail} onChange={(e) => setParentEmail(e.target.value)} placeholder="parent@email.com" type="email" className={INPUT_CLASS} aria-required="true" />
                    </div>

                    <div>
                      <label htmlFor="register-password" className="mb-1.5 block text-sm font-semibold tracking-normal text-indigo-900">
                        Create password <span className="text-indigo-700" aria-hidden="true">*</span>
                      </label>
                      <input id="register-password" name="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Create password" type="password" className={INPUT_CLASS} aria-required="true" />
                    </div>
                  </motion.div>
                )}

                {step === 2 && (
                  <motion.div
                    key="s2"
                    initial={{ opacity: 0, x: 12 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -12 }}
                    transition={{ duration: 0.18 }}
                    className="mt-7 flex flex-col gap-6"
                  >
                    <div>
                      <p className="text-xl font-bold tracking-tight text-indigo-950">🌟 What do you love?</p>
                      <p className="mt-1 text-sm leading-relaxed text-muted">Choose favorites to make your learning space feel like yours.</p>
                    </div>
                    <fieldset>
                      <legend className="mb-2 text-sm font-semibold tracking-normal text-indigo-900">Favourite character</legend>
                      <div className="flex flex-wrap gap-2">
                        {CHARS.map((character) => (
                          <button
                            key={character}
                            type="button"
                            onClick={() => setFavChar(character)}
                            aria-pressed={favoriteCharacter === character}
                            className={`${OPTION_CLASS} ${
                              favoriteCharacter === character
                                ? "border-sunshine-accent bg-sunshine-pastel text-indigo-950"
                                : "border-border-subtle bg-white text-indigo-900 hover:bg-surface-soft"
                            }`}
                          >
                            {character}
                          </button>
                        ))}
                      </div>
                    </fieldset>
                    <fieldset>
                      <legend className="mb-2 text-sm font-semibold tracking-normal text-indigo-900">Favourite theme</legend>
                      <div className="flex flex-wrap gap-2">
                        {THEMES.map((theme) => (
                          <button
                            key={theme}
                            type="button"
                            onClick={() => setFavTheme(theme)}
                            aria-pressed={favoriteTheme === theme}
                            className={`${OPTION_CLASS} ${
                              favoriteTheme === theme
                                ? "border-sky-accent bg-sky-pastel text-indigo-950"
                                : "border-border-subtle bg-white text-indigo-900 hover:bg-surface-soft"
                            }`}
                          >
                            {theme}
                          </button>
                        ))}
                      </div>
                    </fieldset>
                  </motion.div>
                )}

                {step === 3 && (
                  <motion.div
                    key="s3"
                    initial={{ opacity: 0, x: 12 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -12 }}
                    transition={{ duration: 0.18 }}
                    className="mt-7 flex flex-col gap-4"
                  >
                    <div>
                      <p className="text-xl font-bold tracking-tight text-indigo-950">📚 How is your reading?</p>
                      <p className="mt-1 text-sm leading-relaxed text-muted">
                        Don&apos;t worry — this just helps us start at the right level.
                      </p>
                    </div>
                    <fieldset className="flex flex-col gap-3">
                      <legend className="sr-only">Choose a reading level</legend>
                      {READING_LEVELS.map((level) => (
                        <button
                          key={level.value}
                          type="button"
                          onClick={() => setReadingLevel(level.value)}
                          aria-pressed={readingLevel === level.value}
                          className={`flex min-h-16 items-center gap-4 rounded-panel border p-4 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2 ${
                            readingLevel === level.value
                              ? "border-lavender-accent bg-lavender-pastel"
                              : "border-border-subtle bg-white hover:bg-surface-soft"
                          }`}
                        >
                          <span className="text-3xl" aria-hidden="true">{level.emoji}</span>
                          <span>
                            <span className="block font-bold text-indigo-950">{level.label}</span>
                            <span className="block text-sm text-muted">{level.desc}</span>
                          </span>
                        </button>
                      ))}
                    </fieldset>
                  </motion.div>
                )}
              </AnimatePresence>

              {error && (
                <p id="registration-error" role="alert" aria-live="assertive" className="mt-4 rounded-control border border-peach-accent/60 bg-peach-pastel px-3 py-2 text-center text-sm tracking-normal text-error-text">
                  {error}
                </p>
              )}

              <div className="mt-6 flex gap-3">
                {step > 1 && (
                  <Button
                    variant="secondary"
                    onClick={() => {
                      setError("");
                      setStep((s) => s - 1);
                    }}
                  >
                    <ChevronLeft size={18} aria-hidden="true" /> Back
                  </Button>
                )}
                {step < 3 ? (
                  <Button className="flex-1" onClick={next}>
                    Next <ChevronRight size={18} aria-hidden="true" />
                  </Button>
                ) : (
                  <Button className="flex-1" onClick={submit} disabled={loading}>
                    {loading ? "Creating account..." : "Start Adventure! 🚀"}
                  </Button>
                )}
              </div>

              <p className="mt-5 text-center text-sm tracking-normal text-muted">
                Already have an account?{" "}
                <Link href="/login" className="font-bold text-indigo-700 underline decoration-indigo-300 underline-offset-4 hover:text-indigo-900 focus-visible:rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus">
                  Sign in
                </Link>
              </p>
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
