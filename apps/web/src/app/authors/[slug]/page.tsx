import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Header, Footer } from '@/components/common';
import { findEditorialAuthorBySlug, type AuthorProfileEntry } from '@/data/authors';
import { fetchBlogs } from '@/lib/blogs-api';
import {
  SITE_BASE_URL,
  buildBreadcrumbJsonLd,
  toCleanSlug,
} from '@/lib/seo-urls';
import type { BlogPost } from '@repo/types';
import { ArrowRight, BookOpen, CheckCircle2, User } from 'lucide-react';

interface AuthorPageProps {
  params: Promise<{ slug: string }>;
}

async function resolveAuthorAndArticles(rawSlug: string): Promise<{
  author: AuthorProfileEntry;
  articles: BlogPost[];
} | null> {
  const cleanSlug = toCleanSlug(rawSlug);
  let allBlogs: BlogPost[] = [];

  try {
    const res = await fetchBlogs({ limit: 200 });
    allBlogs = res.blogs || [];
  } catch {
    allBlogs = [];
  }

  const registered = findEditorialAuthorBySlug(cleanSlug);
  const matchingPosts = allBlogs.filter((post) => {
    const postAuthorSlug = toCleanSlug(post.authorName || 'prosvetted-editorial-team');
    if (cleanSlug === 'prosvetted-editorial-team') {
      return (
        postAuthorSlug === cleanSlug ||
        postAuthorSlug === 'prosvetted' ||
        postAuthorSlug === 'findyourexperts' ||
        !post.authorName
      );
    }
    return postAuthorSlug === cleanSlug;
  });

  if (registered) {
    return { author: registered, articles: matchingPosts };
  }

  if (matchingPosts.length > 0) {
    const displayName = matchingPosts[0].authorName || rawSlug;
    return {
      author: {
        slug: cleanSlug,
        name: displayName,
        role: 'Contributing Home Improvement Writer',
        bio: `${displayName} contributes home improvement guides, local remodeling cost breakdowns, and contractor hiring research on ProsVetted.`,
        expertise: ['Home Improvement Guides', 'Local Cost Research'],
      },
      articles: matchingPosts,
    };
  }

  return null;
}

export async function generateMetadata({
  params,
}: AuthorPageProps): Promise<Metadata> {
  const { slug } = await params;
  const resolved = await resolveAuthorAndArticles(slug);

  if (!resolved) {
    return {
      title: 'Author Not Found | ProsVetted',
      robots: { index: false, follow: false },
    };
  }

  const canonicalUrl = `${SITE_BASE_URL}/authors/${resolved.author.slug}`;
  return {
    title: `${resolved.author.name} — Author & Researcher | ProsVetted`,
    description: resolved.author.bio,
    alternates: { canonical: canonicalUrl },
    robots: { index: true, follow: true },
  };
}

export default async function AuthorProfilePage({ params }: AuthorPageProps) {
  const { slug } = await params;
  const resolved = await resolveAuthorAndArticles(slug);

  if (!resolved) {
    notFound();
  }

  const { author, articles } = resolved;
  const breadcrumbs = [
    { label: 'Home', href: '/' },
    { label: 'About Us', href: '/about' },
    { label: author.name, href: `/authors/${author.slug}` },
  ];

  const personJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: author.name,
    jobTitle: author.role,
    description: author.bio,
    url: `${SITE_BASE_URL}/authors/${author.slug}`,
    worksFor: {
      '@type': 'Organization',
      name: 'ProsVetted',
      url: SITE_BASE_URL,
    },
  };

  return (
    <div className="min-h-screen bg-[#F9FAFB] text-gray-950 flex flex-col">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(buildBreadcrumbJsonLd(breadcrumbs)),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(personJsonLd) }}
      />

      <Header />

      <section className="bg-[#FAFBF9] border-b border-gray-200/80 py-10 sm:py-14">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-5">
          <nav
            aria-label="Breadcrumb"
            className="flex items-center gap-1.5 text-xs text-gray-500 font-medium"
          >
            <Link href="/" className="hover:text-[#0F3E35]">Home</Link>
            <span className="text-gray-300">/</span>
            <Link href="/about" className="hover:text-[#0F3E35]">About Us</Link>
            <span className="text-gray-300">/</span>
            <span className="text-[#0F3E35] font-bold">{author.name}</span>
          </nav>

          <div className="bg-white rounded-2xl border border-gray-200/90 p-6 sm:p-8 shadow-2xs flex flex-col sm:flex-row gap-5 items-start">
            <div className="w-16 h-16 rounded-2xl bg-[#0F3E35] text-white flex items-center justify-center shrink-0">
              <User className="w-8 h-8" />
            </div>

            <div className="space-y-2.5 flex-1">
              <div className="inline-flex items-center gap-1.5 text-xs font-bold text-[#0B3B2C] bg-[#EBF7F2] px-2.5 py-0.5 rounded-full">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>{author.role}</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-gray-950 tracking-tight">
                {author.name}
              </h1>
              <p className="text-xs sm:text-sm text-gray-600 leading-relaxed">
                {author.bio}
              </p>

              <div className="flex flex-wrap gap-1.5 pt-1">
                {author.expertise.map((topic) => (
                  <span
                    key={topic}
                    className="text-[11px] font-semibold bg-gray-100 text-gray-700 px-2.5 py-1 rounded-lg"
                  >
                    {topic}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 w-full flex-1 space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg sm:text-xl font-bold text-gray-950 flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-[#0F3E35]" />
            <span>Guides &amp; Research by {author.name}</span>
          </h2>
          <Link href="/editorial-policy" className="text-xs font-bold text-[#0F3E35] hover:underline">
            Editorial Policy &rarr;
          </Link>
        </div>

        {articles.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center space-y-2">
            <p className="text-sm text-gray-600">
              Explore our latest guides and city contractor directories:
            </p>
            <div className="pt-2 flex justify-center gap-3">
              <Link
                href="/blog"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#0F3E35] text-white text-xs font-bold"
              >
                <span>Browse All Guides</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {articles.map((post) => (
              <Link
                key={post.id}
                href={`/blog/${post.slug}`}
                className="bg-white rounded-2xl border border-gray-200/90 hover:border-[#0F3E35]/40 p-5 shadow-2xs transition-all flex flex-col justify-between gap-3 group"
              >
                <div className="space-y-1.5">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[#DA5F2F]">
                    {post.category || 'Guide'}
                  </span>
                  <h3 className="text-base font-bold text-gray-950 group-hover:text-[#0F3E35] leading-snug">
                    {post.title}
                  </h3>
                  {post.excerpt && (
                    <p className="text-xs text-gray-600 line-clamp-2">
                      {post.excerpt}
                    </p>
                  )}
                </div>
                <span className="inline-flex items-center gap-1 text-xs font-bold text-[#0F3E35]">
                  <span>Read Article</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </span>
              </Link>
            ))}
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
