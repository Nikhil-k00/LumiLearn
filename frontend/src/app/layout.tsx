import type { Metadata } from "next";
import { Lexend } from "next/font/google";
import "./globals.css";
import { AccessibilityProvider } from "@/contexts/AccessibilityContext";
import { AuthProvider } from "@/contexts/AuthContext";

// ─── Google Fonts ──────────────────────────────────────────────────────────

const lexend = Lexend({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-lexend",
  display: "swap",
});

// ─── Metadata ─────────────────────────────────────────────────────────────

export const metadata: Metadata = {
  title: "LumiLearn — Learn, Play, Grow",
  description:
    "Adaptive gamified learning platform for children with dyslexia. " +
    "Every game directly addresses phonological awareness, reading fluency, " +
    "and working memory through play.",
  keywords: ["dyslexia", "learning", "children", "phonics", "reading", "games", "AI"],
  themeColor: "#F8F7FF",
  viewport: {
    width: "device-width",
    initialScale: 1,
    maximumScale: 5, // allow user zoom — accessibility requirement
  },
};

// ─── App Shell (pure structural component, no client logic) ────────────────

function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div
      id="app-shell"
      className="min-h-screen bg-page flex flex-col"
      style={{ backgroundColor: "#F8F7FF" }}
    >
      {/* Skip-to-content link for screen readers */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50
                   focus:px-4 focus:py-2 focus:rounded-button focus:bg-lavender-pastel
                   focus:text-indigo-900 focus:font-semibold focus:shadow-card"
      >
        Skip to main content
      </a>

      <main
        id="main-content"
        className="flex-1 flex flex-col"
        tabIndex={-1}
      >
        {children}
      </main>
    </div>
  );
}

// ─── Root Layout ───────────────────────────────────────────────────────────

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={lexend.variable} suppressHydrationWarning>
      <body className={`font-lexend antialiased`}>
        <AccessibilityProvider>
          <AuthProvider>
            <AppShell>{children}</AppShell>
          </AuthProvider>
        </AccessibilityProvider>
      </body>
    </html>
  );
}
