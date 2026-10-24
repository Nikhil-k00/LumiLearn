"use client";

import Link from "next/link";
import { RefreshCw, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { PageContainer } from "@/components/ui/PageContainer";
import { Surface } from "@/components/ui/Surface";

interface ErrorBoundaryProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function ErrorBoundary({ reset }: ErrorBoundaryProps) {
  return (
    <div className="flex min-h-[70vh] flex-1 items-center bg-surface-warm py-10 text-ink sm:py-16">
      <PageContainer width="content">
        <Surface
          padding="lg"
          className="mx-auto max-w-2xl text-center sm:p-10"
          aria-labelledby="error-title"
        >
          <div
            className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-peach-pastel text-indigo-800 sm:h-24 sm:w-24"
            aria-hidden="true"
          >
            <Sparkles className="h-10 w-10 sm:h-12 sm:w-12" strokeWidth={1.8} />
          </div>

          <p className="mt-6 text-sm font-bold uppercase tracking-[0.14em] text-indigo-700">
            LumiLearn
          </p>
          <h1
            id="error-title"
            className="mt-3 text-2xl font-bold leading-tight tracking-tight text-indigo-950 sm:text-3xl"
          >
            Oops! Something went wrong
          </h1>
          <p className="mx-auto mt-3 max-w-md text-base leading-relaxed text-muted sm:text-lg">
            Something unexpected happened. You can try again, or go back to the welcome page.
          </p>

          <div className="mt-7 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center">
            <Button
              size="lg"
              onClick={reset}
              className="min-h-12 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2"
            >
              <RefreshCw size={18} aria-hidden="true" />
              Try again
            </Button>
            <Link
              href="/login"
              className="inline-flex min-h-12 items-center justify-center rounded-control border border-border-strong bg-surface px-6 py-3 text-base font-semibold text-indigo-900 transition-colors hover:bg-surface-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2 motion-reduce:transition-none"
            >
              Back to LumiLearn
            </Link>
          </div>
        </Surface>
      </PageContainer>
    </div>
  );
}
