import { Header, Footer } from '@/components/common';

export default function BlogIndexLoading() {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Header />
      <section className="bg-slate-900 py-14 sm:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-4">
          <div className="h-6 w-44 rounded-full bg-slate-800 animate-pulse" />
          <div className="h-12 w-full max-w-2xl rounded-xl bg-slate-800 animate-pulse" />
          <div className="h-5 w-full max-w-xl rounded-lg bg-slate-800 animate-pulse" />
          <div className="h-12 w-full max-w-xl rounded-xl bg-slate-800 animate-pulse mt-4" />
        </div>
      </section>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 flex-1 w-full space-y-8">
        <div className="h-72 w-full rounded-2xl skeleton-shimmer" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((n) => (
            <div
              key={n}
              className="bg-white rounded-2xl border border-gray-200 overflow-hidden p-4 space-y-3"
            >
              <div className="h-44 w-full rounded-xl skeleton-shimmer" />
              <div className="h-4 w-24 rounded skeleton-shimmer" />
              <div className="h-6 w-11/12 rounded skeleton-shimmer" />
              <div className="h-4 w-4/5 rounded skeleton-shimmer" />
            </div>
          ))}
        </div>
      </main>
      <Footer />
    </div>
  );
}
