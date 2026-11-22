import { Header, Footer } from '@/components/common';

export default function BlogDetailLoading() {
  return (
    <div className="min-h-screen bg-white flex flex-col">
      <Header />
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 flex-1 w-full space-y-6">
        <div className="h-4 w-56 rounded skeleton-shimmer" />
        <div className="space-y-3">
          <div className="h-10 w-11/12 rounded-xl skeleton-shimmer" />
          <div className="h-10 w-3/4 rounded-xl skeleton-shimmer" />
        </div>
        <div className="h-14 w-full rounded-xl skeleton-shimmer" />
        <div className="h-72 sm:h-96 w-full rounded-2xl skeleton-shimmer" />
        <div className="space-y-3 pt-2">
          <div className="h-4 w-full rounded skeleton-shimmer" />
          <div className="h-4 w-11/12 rounded skeleton-shimmer" />
          <div className="h-4 w-4/5 rounded skeleton-shimmer" />
          <div className="h-4 w-full rounded skeleton-shimmer" />
        </div>
      </main>
      <Footer />
    </div>
  );
}
