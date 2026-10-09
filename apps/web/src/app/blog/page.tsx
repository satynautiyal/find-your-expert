import type { Metadata } from 'next';
import Link from 'next/link';
import {
  Search,
  Clock,
  ArrowRight,
  BookOpen,
  Sparkles,
  Calendar,
  Share2,
  CheckCircle2,
} from 'lucide-react';
import Header from '@/components/common/Header';
import Footer from '@/components/common/Footer';
import SafeImage from '@/components/common/SafeImage';
import { fetchBlogs, fetchFeaturedBlog, fetchBlogCategories } from '@/lib/blogs-api';
import type { BlogPost } from '@repo/types';

export const metadata: Metadata = {
  title: 'Roofing Guides, Cost Breakdowns & Expert Advice | FindYourExperts',
  description:
    'Comprehensive guides, cost calculators, and contractor hiring advice for New York City property owners. Learn from certified building experts.',
  openGraph: {
    title: 'Roofing Guides & Cost Breakdowns | FindYourExperts',
    description:
      'Expert advice and transparent pricing breakdown for roofing, gutters, and siding projects in NYC.',
    url: 'https://findyourexperts.com/blog',
    type: 'website',
  },
};

export default async function BlogIndexPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; search?: string; page?: string }>;
}) {
  const resolvedParams = await searchParams;
  const currentCategory = resolvedParams?.category || 'All';
  const currentSearch = resolvedParams?.search || '';
  const currentPage = resolvedParams?.page ? parseInt(resolvedParams.page, 10) : 1;

  // Fetch data in parallel
  const [blogsData, featuredPost, categoriesData] = await Promise.all([
    fetchBlogs({
      category: currentCategory === 'All' ? undefined : currentCategory,
      search: currentSearch || undefined,
      page: currentPage,
      limit: 9,
    }).catch(() => ({ blogs: [], total: 0, page: 1, limit: 9, totalPages: 1 })),
    fetchFeaturedBlog(),
    fetchBlogCategories(),
  ]);

  const blogs = blogsData.blogs || [];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      {/* Header */}
      <Header />

      {/* Hero Section */}
      <section className="bg-gradient-to-b from-slate-900 via-gray-900 to-slate-900 text-white py-14 sm:py-20 relative overflow-hidden">
        {/* Background Glow */}
        <div className="absolute -top-24 -left-24 w-96 h-96 bg-primary/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-1/2 -right-24 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="max-w-3xl space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/20 border border-primary/40 text-primary-light text-xs font-bold uppercase tracking-wider">
              <BookOpen className="w-3.5 h-3.5" />
              <span>FindYourExperts Knowledge Hub</span>
            </div>
            <h1 className="text-3xl sm:text-5xl font-black tracking-tight leading-tight">
              Roofing Guides, Real Costs & Contractor Advice
            </h1>
            <p className="text-slate-300 text-sm sm:text-base leading-relaxed">
              Transparent price guides, NYC Department of Buildings regulations, and maintenance checklists to help you make informed decisions for your home.
            </p>
          </div>

          {/* Search Bar in Hero */}
          <form
            action="/blog"
            method="GET"
            className="mt-8 flex items-center bg-white rounded-xl shadow-lg overflow-hidden max-w-xl p-1.5"
          >
            <div className="flex-1 flex items-center px-3 gap-2">
              <Search className="w-4 h-4 text-gray-400" />
              <input
                type="text"
                name="search"
                defaultValue={currentSearch}
                placeholder="Search guides (e.g. flat roof cost, leak repair)..."
                className="w-full text-xs text-gray-900 placeholder:text-gray-400 outline-none"
              />
            </div>
            <button
              type="submit"
              className="bg-primary hover:bg-primary-dark text-white text-xs font-bold px-5 py-2.5 rounded-lg transition-colors"
            >
              Search
            </button>
          </form>
        </div>
      </section>

      {/* Featured Post Banner (Only shown if on page 1 without active search) */}
      {!currentSearch && currentCategory === 'All' && featuredPost && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-8 relative z-20">
          <div className="bg-white rounded-2xl border border-gray-200/80 shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden group">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-0">
              {/* Image */}
              <div className="lg:col-span-7 relative h-64 sm:h-80 lg:h-auto overflow-hidden bg-gray-100">
                <SafeImage
                  src={featuredPost.coverImageUrl}
                  alt={featuredPost.title}
                  fallbackCategory={featuredPost.category}
                  fallbackTitle={featuredPost.title}
                  fallbackIcon="image"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute top-4 left-4">
                  <span className="bg-primary text-white text-[11px] font-black uppercase tracking-wider px-3 py-1 rounded-full shadow-xs flex items-center gap-1">
                    <Sparkles className="w-3 h-3" />
                    Featured Guide
                  </span>
                </div>
              </div>

              {/* Text info */}
              <div className="lg:col-span-5 p-6 sm:p-8 flex flex-col justify-between space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-xs text-gray-500 font-semibold">
                    <span className="text-primary-dark font-bold bg-primary/10 px-2.5 py-0.5 rounded-md">
                      {featuredPost.category}
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      {featuredPost.readingTimeMin} min read
                    </span>
                  </div>

                  <Link href={`/blog/${featuredPost.slug}`}>
                    <h2 className="text-xl sm:text-2xl font-black text-gray-950 group-hover:text-primary transition-colors leading-snug">
                      {featuredPost.title}
                    </h2>
                  </Link>

                  <p className="text-gray-600 text-xs sm:text-sm leading-relaxed line-clamp-3">
                    {featuredPost.excerpt}
                  </p>
                </div>

                <div className="pt-4 border-t border-gray-100 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs">
                      {featuredPost.authorName[0]}
                    </div>
                    <div>
                      <div className="text-xs font-bold text-gray-900">{featuredPost.authorName}</div>
                      <div className="text-[11px] text-gray-400">{featuredPost.authorRole}</div>
                    </div>
                  </div>

                  <Link
                    href={`/blog/${featuredPost.slug}`}
                    className="inline-flex items-center gap-1 text-xs font-bold text-primary group-hover:translate-x-1 transition-transform"
                  >
                    <span>Read Article</span>
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Main Listing Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 flex-1 w-full space-y-8">
        
        {/* Category Pills & Total Counter */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-gray-200 pb-4">
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/blog"
              className={`text-xs font-bold px-3.5 py-1.5 rounded-full transition-colors ${
                currentCategory === 'All'
                  ? 'bg-primary text-white shadow-xs'
                  : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
              }`}
            >
              All Topics
            </Link>
            {categoriesData.map((cat: { category: string; count: number }) => (
              <Link
                key={cat.category}
                href={`/blog?category=${encodeURIComponent(cat.category)}`}
                className={`text-xs font-bold px-3.5 py-1.5 rounded-full transition-colors flex items-center gap-1.5 ${
                  currentCategory === cat.category
                    ? 'bg-primary text-white shadow-xs'
                    : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
                }`}
              >
                <span>{cat.category}</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                  currentCategory === cat.category ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-500'
                }`}>
                  {cat.count}
                </span>
              </Link>
            ))}
          </div>

          <div className="text-xs text-gray-500 font-semibold">
            Showing <strong className="text-gray-900">{blogs.length}</strong> of{' '}
            <strong className="text-gray-900">{blogsData.total}</strong> guides
          </div>
        </div>

        {/* Blog Post Grid */}
        {blogs.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center space-y-3">
            <BookOpen className="w-10 h-10 text-gray-300 mx-auto" />
            <h3 className="text-base font-bold text-gray-800">No articles found</h3>
            <p className="text-xs text-gray-500">
              Try clearing filters or search term to see all guides.
            </p>
            <Link
              href="/blog"
              className="inline-block text-xs font-bold text-primary hover:underline mt-2"
            >
              Reset Filters
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {blogs.map((post: BlogPost) => (
              <article
                key={post.id}
                className="bg-white rounded-xl border border-gray-200 shadow-xs hover:shadow-lg transition-all duration-200 overflow-hidden flex flex-col group"
              >
                {/* Image */}
                <Link href={`/blog/${post.slug}`} className="block relative h-48 bg-gray-100 overflow-hidden">
                  <SafeImage
                    src={post.coverImageUrl}
                    alt={post.coverImageAlt || post.title}
                    fallbackCategory={post.category}
                    fallbackTitle={post.title}
                    fallbackIcon="image"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <span className="absolute top-3 left-3 bg-white/90 backdrop-blur-xs text-gray-800 text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-md shadow-xs">
                    {post.category}
                  </span>
                </Link>

                {/* Body */}
                <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-[11px] text-gray-400 font-semibold">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {new Date(post.publishedAt || post.createdAt).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {post.readingTimeMin} min read
                      </span>
                    </div>

                    <Link href={`/blog/${post.slug}`}>
                      <h3 className="font-bold text-gray-950 group-hover:text-primary transition-colors text-base leading-snug line-clamp-2">
                        {post.title}
                      </h3>
                    </Link>

                    <p className="text-xs text-gray-600 leading-relaxed line-clamp-2">
                      {post.excerpt}
                    </p>
                  </div>

                  {/* Footer */}
                  <div className="pt-3 border-t border-gray-100 flex items-center justify-between text-xs">
                    <span className="font-semibold text-gray-800 truncate max-w-[150px]">
                      {post.authorName}
                    </span>
                    <Link
                      href={`/blog/${post.slug}`}
                      className="font-bold text-primary group-hover:translate-x-0.5 transition-transform flex items-center gap-1"
                    >
                      <span>Read</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}

        {/* Lead Gen Banner */}
        <div className="bg-gradient-to-r from-gray-900 via-slate-900 to-gray-900 rounded-2xl p-8 sm:p-10 text-white flex flex-col sm:flex-row items-center justify-between gap-6 shadow-xl">
          <div className="space-y-2 max-w-xl text-center sm:text-left">
            <span className="text-primary-light text-xs font-bold uppercase tracking-wider">
              Ready to start your project?
            </span>
            <h3 className="text-2xl font-black">
              Compare Verified NYC Roofing Quotes
            </h3>
            <p className="text-slate-300 text-xs sm:text-sm">
              Get 3-4 transparent bids from top-rated, licensed brownstone and flat roof specialists in minutes.
            </p>
          </div>
          <Link
            href="/"
            className="bg-primary hover:bg-primary-dark text-white font-black text-xs sm:text-sm px-6 py-3.5 rounded-xl shadow-lg transition-transform hover:scale-105 shrink-0"
          >
            Get Free Quotes &rarr;
          </Link>
        </div>

      </main>

      {/* Footer */}
      <Footer />
    </div>
  );
}
