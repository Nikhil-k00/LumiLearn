"use client";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { ChevronRight, ChevronLeft } from "lucide-react";

const AVATARS = ["🚀","🐉","🦄","🤖","🧙","🧚","🦁","👾","🐬","🦕","🦸","🦊"];
const THEMES  = ["Space","Fantasy","Ocean","Jungle","Dinosaur","Fairy Tale"];
const CHARS   = ["Pikachu","Elsa","Spider-Man","Moana","Minecraft Steve","Peppa Pig","Bluey","Harry Potter"];
const READING_LEVELS = [
  { value: "beginner",   label: "Beginner",   emoji: "🌱", desc: "Just starting out" },
  { value: "emerging",   label: "Emerging",   emoji: "🌿", desc: "Learning the basics" },
  { value: "developing", label: "Developing", emoji: "🌳", desc: "Getting better!" },
  { value: "fluent",     label: "Fluent",     emoji: "🌟", desc: "Reading well" },
];

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

  return (
    <div className="min-h-screen bg-page flex flex-col items-center justify-center px-4 py-10">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-white rounded-card shadow-card border border-lavender-accent/20 p-8">

        {/* Step indicator */}
        <div className="flex gap-2 mb-6 justify-center">
          {[1,2,3].map((s) => (
            <div key={s} className={`h-2 rounded-full transition-all ${s === step ? "w-8 bg-lavender-accent" : "w-4 bg-lavender-pastel"}`} />
          ))}
        </div>

        <AnimatePresence mode="wait">
          {/* ── Step 1 ─────────────────────────────────────────────── */}
          {step === 1 && (
            <motion.div key="s1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
              className="flex flex-col gap-4">
              <h2 className="text-xl font-bold text-indigo-900 text-center">👋 Tell us about you!</h2>

              {/* Avatar picker */}
              <div>
                <p className="text-base text-indigo-700 font-medium mb-2">Pick your avatar</p>
                <div className="grid grid-cols-6 gap-2">
                  {AVATARS.map((a) => (
                    <button key={a} onClick={() => setAvatarId(a)}
                      className={`text-3xl rounded-xl p-1 border-2 transition-all
                        ${avatarId === a ? "border-lavender-accent bg-lavender-pastel" : "border-transparent hover:border-lavender-accent/40"}`}>
                      {a}
                    </button>
                  ))}
                </div>
              </div>

              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name"
                className="w-full px-4 py-3 rounded-xl border-2 border-lavender-accent/40 text-[16px] focus:outline-none focus:border-lavender-accent min-h-0 text-indigo-900 placeholder:text-indigo-300" />
              <div className="flex gap-3">
                <input value={age} onChange={(e) => setAge(e.target.value)} placeholder="Age" type="number" min={4} max={14}
                  className="w-1/2 px-4 py-3 rounded-xl border-2 border-lavender-accent/40 text-[16px] focus:outline-none focus:border-lavender-accent min-h-0 text-indigo-900 placeholder:text-indigo-300" />
                <input value={grade} onChange={(e) => setGrade(e.target.value)} placeholder="Grade" type="number" min={1} max={9}
                  className="w-1/2 px-4 py-3 rounded-xl border-2 border-lavender-accent/40 text-[16px] focus:outline-none focus:border-lavender-accent min-h-0 text-indigo-900 placeholder:text-indigo-300" />
              </div>
              <input value={parentEmail} onChange={(e) => setParentEmail(e.target.value)} placeholder="Parent email" type="email"
                className="w-full px-4 py-3 rounded-xl border-2 border-lavender-accent/40 text-[16px] focus:outline-none focus:border-lavender-accent min-h-0 text-indigo-900 placeholder:text-indigo-300" />
              <input value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Create password" type="password"
                className="w-full px-4 py-3 rounded-xl border-2 border-lavender-accent/40 text-[16px] focus:outline-none focus:border-lavender-accent min-h-0 text-indigo-900 placeholder:text-indigo-300" />
            </motion.div>
          )}

          {/* ── Step 2 ─────────────────────────────────────────────── */}
          {step === 2 && (
            <motion.div key="s2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
              className="flex flex-col gap-5">
              <h2 className="text-xl font-bold text-indigo-900 text-center">🌟 What do you love?</h2>
              <div>
                <p className="text-base text-indigo-700 font-medium mb-2">Favourite character</p>
                <div className="flex flex-wrap gap-2">
                  {CHARS.map((c) => (
                    <button key={c} onClick={() => setFavChar(c)}
                      className={`px-3 py-2 rounded-xl text-base border-2 transition-all
                        ${favoriteCharacter === c ? "bg-sunshine-pastel border-sunshine-accent font-semibold" : "bg-white border-lavender-accent/30 hover:bg-lavender-pastel"}`}>
                      {c}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-base text-indigo-700 font-medium mb-2">Favourite theme</p>
                <div className="flex flex-wrap gap-2">
                  {THEMES.map((t) => (
                    <button key={t} onClick={() => setFavTheme(t)}
                      className={`px-3 py-2 rounded-xl text-base border-2 transition-all
                        ${favoriteTheme === t ? "bg-sky-pastel border-sky-accent font-semibold" : "bg-white border-sky-accent/30 hover:bg-sky-pastel"}`}>
                      {t}
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {/* ── Step 3 ─────────────────────────────────────────────── */}
          {step === 3 && (
            <motion.div key="s3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
              className="flex flex-col gap-4">
              <h2 className="text-xl font-bold text-indigo-900 text-center">📚 How is your reading?</h2>
              <p className="text-base text-indigo-500 text-center">Don&apos;t worry — this just helps us start at the right level!</p>
              {READING_LEVELS.map((l) => (
                <button key={l.value} onClick={() => setReadingLevel(l.value)}
                  className={`flex items-center gap-4 p-4 rounded-card border-2 text-left transition-all
                    ${readingLevel === l.value ? "bg-lavender-pastel border-lavender-accent" : "bg-white border-lavender-accent/30 hover:bg-lavender-pastel"}`}>
                  <span className="text-3xl">{l.emoji}</span>
                  <div>
                    <p className="font-bold text-indigo-900">{l.label}</p>
                    <p className="text-base text-indigo-500">{l.desc}</p>
                  </div>
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {error && <p className="error-text text-base text-center mt-4">{error}</p>}

        {/* Navigation */}
        <div className="flex gap-3 mt-6">
          {step > 1 && (
            <button onClick={() => setStep((s) => s - 1)}
              className="flex items-center gap-1 px-4 py-3 rounded-button bg-lavender-pastel border border-lavender-accent text-indigo-800">
              <ChevronLeft size={18} /> Back
            </button>
          )}
          {step < 3 ? (
            <button onClick={next}
              className="flex-1 flex items-center justify-center gap-1 py-3 rounded-button bg-lavender-accent text-white font-bold text-lg">
              Next <ChevronRight size={18} />
            </button>
          ) : (
            <button onClick={submit} disabled={loading}
              className="flex-1 py-3 rounded-button bg-mint-accent text-white font-bold text-lg shadow-btn-mint disabled:opacity-60">
              {loading ? "Creating account..." : "Start Adventure! 🚀"}
            </button>
          )}
        </div>
      </motion.div>
    </div>
  );
}
