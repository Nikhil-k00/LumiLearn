import Link from "next/link";
import { ArrowLeft, Compass } from "lucide-react";
import { PageContainer } from "@/components/ui/PageContainer";
import { Surface } from "@/components/ui/Surface";

export default function NotFound() {
  return (
    <div className="flex min-h-[70vh] flex-1 items-center bg-surface-warm py-10 text-ink sm:py-16">
      <PageContainer width="content">
        <Surface
          padding="lg"
          className="mx-auto max-w-2xl text-center sm:p-10"
          aria-labelledby="not-found-title"
        >
          <div
            className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-lavender-pastel text-indigo-800 sm:h-24 sm:w-24"
            aria-hidden="true"
          >
            <Compass className="h-10 w-10 sm:h-12 sm:w-12" strokeWidth={1.8} />
          </div>

          <p className="mt-6 text-sm font-bold uppercase tracking-[0.14em] text-indigo-700">
            LumiLearn
          </p>
          <p className="mt-2 text-5xl font-bold tracking-tight text-indigo-700 sm:text-6xl" aria-hidden="true">
            404
          </p>
          <h1
            id="not-found-title"
            className="mt-3 text-2xl font-bold leading-tight tracking-tight text-indigo-950 sm:text-3xl"
          >
            Page not found
          </h1>
          <p className="mx-auto mt-3 max-w-md text-base leading-relaxed text-muted sm:text-lg">
            This page seems to have wandered off. Let’s head back and find your next learning adventure.
          </p>

          <Link
            href="/login"
            className="mt-7 inline-flex min-h-12 items-center justify-center gap-2 rounded-control bg-indigo-700 px-6 py-3 text-base font-semibold text-white shadow-btn transition-colors hover:bg-indigo-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2 motion-reduce:transition-none"
          >
            <ArrowLeft size={18} aria-hidden="true" />
            Back to LumiLearn
          </Link>
        </Surface>
      </PageContainer>
    </div>
  );
}
