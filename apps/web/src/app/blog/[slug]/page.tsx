import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  Clock,
  Calendar,
  User,
  ArrowLeft,
  Share2,
  Bookmark,
  CheckCircle,
  Tag,
  ArrowRight,
  ShieldCheck,
  Building,
} from 'lucide-react';
import Header from '@/components/common/Header';
import Footer from '@/components/common/Footer';
import { fetchBlogBySlug } from '@/lib/blogs-api';
import type { BlogPost } from '@repo/types';

interface PageProps {
  params: Promise<{ slug: string }>;
}

/**
 * Dynamic Next.js 15 SEO Metadata generator
 */
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  try {
    const { blog } = await fetchBlogBySlug(slug);
    if (!blog) return { title: 'Article Not Found | FindYourExperts' };

    const title = blog.metaTitle || `${blog.title} | FindYourExperts`;
    const description =
      blog.metaDescription ||
      blog.excerpt ||
      'Read in-depth roofing analysis, cost breakdowns, and contractor tips from FindYourExperts NYC.';
    const ogImage =
      blog.ogImageUrl ||
      blog.coverImageUrl ||
      'https://findyourexperts.com/og-default.jpg';

    return {
      title,
      description,
      alternates: {
        canonical: blog.canonicalUrl || `https://findyourexperts.com/blog/${blog.slug}`,
      },
      openGraph: {
        title,
        description,
        type: 'article',
        publishedTime: blog.publishedAt ? new Date(blog.publishedAt).toISOString() : undefined,
        authors: [blog.authorName],
        images: [
          {
            url: ogImage,
            width: 1200,
            height: 630,
            alt: blog.coverImageAlt || blog.title,
          },
        ],
      },
      twitter: {
        card: 'summary_large_image',
        title,
        description,
        images: [ogImage],
      },
    };
  } catch {
    return {
      title: 'Article | FindYourExperts',
    };
  }
}

export default async function BlogDetailPage({ params }: PageProps) {
  const { slug } = await params;

  let blogData: { blog: BlogPost; relatedPosts: BlogPost[] };
  try {
    blogData = await fetchBlogBySlug(slug);
  } catch {
    notFound();
  }

  const { blog, relatedPosts } = blogData;

  // Schema.org JSON-LD Article structured data for Google Rich Snippets
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: blog.title,
    description: blog.excerpt || blog.metaDescription,
    image: blog.coverImageUrl ? [blog.coverImageUrl] : [],
    datePublished: blog.publishedAt || blog.createdAt,
    dateModified: blog.updatedAt || blog.publishedAt,
    author: {
      '@type': 'Person',
      name: blog.authorName,
      jobTitle: blog.authorRole,
    },
    publisher: {
      '@type': 'Organization',
      name: 'FindYourExperts',
      logo: {
        '@type': 'ImageObject',
        url: 'https://findyourexperts.com/logo.png',
      },
    },
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': `https://findyourexperts.com/blog/${blog.slug}`,
    },
  };

  return (
    <div className="min-h-screen bg-white flex flex-col font-sans">
      {/* Google JSON-LD Article Schema */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* Header */}
      <Header onOpenQuoteModal={() => {}} savedCount={0} />

      {/* Main Article Container */}
      <main className="flex-1 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 w-full">
        {/* Back Link */}
        <div className="mb-6">
          <Link
            href="/blog"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-gray-500 hover:text-primary transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to All Guides</span>
          </Link>
        </div>

        {/* Category & Reading Metrics */}
        <div className="flex flex-wrap items-center gap-2.5 mb-4 text-xs">
          <span className="bg-primary/10 text-primary font-bold px-3 py-1 rounded-full uppercase tracking-wider text-[11px]">
            {blog.category}
          </span>
          <span className="text-gray-300">•</span>
          <div className="flex items-center gap-1 text-gray-500 font-medium">
            <Clock className="w-3.5 h-3.5" />
            <span>{blog.readingTimeMin} min read</span>
          </div>
          <span className="text-gray-300">•</span>
          <div className="flex items-center gap-1 text-gray-500 font-medium">
            <Calendar className="w-3.5 h-3.5" />
            <span>
              {new Date(blog.publishedAt || blog.createdAt).toLocaleDateString('en-US', {
                month: 'long',
                day: 'numeric',
                year: 'numeric',
              })}
            </span>
          </div>
        </div>

        {/* Main Title */}
        <h1 className="text-2xl sm:text-4xl font-black text-gray-950 tracking-tight leading-tight mb-6">
          {blog.title}
        </h1>

        {/* Author Bio Bar */}
        <div className="flex items-center justify-between py-4 border-y border-gray-100 mb-8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center text-sm border border-primary/20">
              {blog.authorName[0]}
            </div>
            <div>
              <div className="text-xs font-bold text-gray-900 flex items-center gap-1.5">
                <span>{blog.authorName}</span>
                <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-1.5 py-0.2 rounded-full flex items-center gap-0.5">
                  <ShieldCheck className="w-3 h-3" />
                  Verified Author
                </span>
              </div>
              <div className="text-[11px] text-gray-500">{blog.authorRole}</div>
            </div>
          </div>

          {/* Social Share Links */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-gray-400 hidden sm:inline">Share:</span>
            <a
              href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(blog.title)}&url=https://findyourexperts.com/blog/${blog.slug}`}
              target="_blank"
              rel="noreferrer"
              className="w-8 h-8 rounded-full bg-gray-100 hover:bg-black hover:text-white text-gray-600 flex items-center justify-center text-xs transition-colors"
              title="Share on X"
            >
              𝕏
            </a>
            <a
              href={`https://www.linkedin.com/sharing/share-offsite/?url=https://findyourexperts.com/blog/${blog.slug}`}
              target="_blank"
              rel="noreferrer"
              className="w-8 h-8 rounded-full bg-gray-100 hover:bg-blue-600 hover:text-white text-gray-600 flex items-center justify-center text-xs transition-colors"
              title="Share on LinkedIn"
            >
              in
            </a>
            <a
              href={`https://api.whatsapp.com/send?text=${encodeURIComponent(blog.title + ' - https://findyourexperts.com/blog/' + blog.slug)}`}
              target="_blank"
              rel="noreferrer"
              className="w-8 h-8 rounded-full bg-gray-100 hover:bg-emerald-600 hover:text-white text-gray-600 flex items-center justify-center text-xs transition-colors"
              title="Share on WhatsApp"
            >
              💬
            </a>
          </div>
        </div>

        {/* Featured Cover Image */}
        {blog.coverImageUrl && (
          <div className="mb-10 rounded-2xl overflow-hidden border border-gray-200 shadow-xs">
            <img
              src={blog.coverImageUrl}
              alt={blog.coverImageAlt || blog.title}
              className="w-full max-h-[480px] object-cover"
            />
          </div>
        )}

        {/* Lead In / Excerpt */}
        {blog.excerpt && (
          <div className="bg-slate-50 border-l-4 border-primary p-5 rounded-r-xl mb-8 text-sm sm:text-base font-medium text-slate-700 leading-relaxed italic">
            "{blog.excerpt}"
          </div>
        )}

        {/* Article Body Content (Rendered HTML) */}
        <article
          className="prose prose-slate max-w-none text-gray-800 text-sm sm:text-base leading-relaxed space-y-4 mb-12
            prose-headings:font-black prose-headings:tracking-tight prose-headings:text-gray-950
            prose-h2:text-2xl prose-h2:mt-8 prose-h2:mb-4
            prose-h3:text-lg prose-h3:mt-6 prose-h3:mb-2
            prose-p:leading-relaxed
            prose-ul:list-disc prose-ul:pl-5
            prose-ol:list-decimal prose-ol:pl-5
            prose-li:my-1.5
            prose-blockquote:border-l-4 prose-blockquote:border-primary prose-blockquote:bg-blue-50/50 prose-blockquote:p-4 prose-blockquote:rounded-r-lg prose-blockquote:italic
            prose-strong:text-gray-950 prose-strong:font-bold
            prose-a:text-primary prose-a:font-semibold hover:prose-a:underline"
          dangerouslySetInnerHTML={{ __html: blog.content }}
        />

        {/* Tags */}
        {blog.tags && blog.tags.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 pt-6 border-t border-gray-200 mb-10">
            <div className="flex items-center gap-1 text-xs font-bold text-gray-400 mr-2">
              <Tag className="w-3.5 h-3.5" />
              <span>Tags:</span>
            </div>
            {blog.tags.map((t: string) => (
              <span
                key={t}
                className="text-xs font-semibold bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-1 rounded-full transition-colors"
              >
                #{t}
              </span>
            ))}
          </div>
        )}

        {/* Author Bio Box */}
        <div className="bg-slate-50 rounded-2xl p-6 border border-gray-200 flex flex-col sm:flex-row items-center sm:items-start gap-4 mb-12">
          <div className="w-14 h-14 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-lg shrink-0 border border-primary/20">
            {blog.authorName[0]}
          </div>
          <div className="space-y-1.5 text-center sm:text-left">
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
              <h4 className="font-bold text-gray-950 text-sm">{blog.authorName}</h4>
              <span className="text-xs text-primary font-semibold">{blog.authorRole}</span>
            </div>
            <p className="text-xs text-gray-600 leading-relaxed">
              Published by the editorial team at FindYourExperts. All cost analyses and contractor guidelines are reviewed against current New York City Department of Buildings codes and market standards.
            </p>
          </div>
        </div>

        {/* Lead Gen Call to Action Box */}
        <div className="bg-gradient-to-br from-gray-950 via-slate-900 to-gray-900 rounded-2xl p-8 text-white shadow-xl flex flex-col sm:flex-row items-center justify-between gap-6 mb-16">
          <div className="space-y-2 text-center sm:text-left">
            <span className="text-primary-light text-xs font-bold uppercase tracking-wider">
              Looking for a top-rated roofer?
            </span>
            <h3 className="text-xl sm:text-2xl font-black">
              Get 3-4 Verified Quotes in Your NYC Borough
            </h3>
            <p className="text-slate-300 text-xs sm:text-sm max-w-md">
              Free, no-obligation estimates from licensed brownstone and flat roof contractors.
            </p>
          </div>
          <Link
            href="/"
            className="bg-primary hover:bg-primary-dark text-white font-black text-xs sm:text-sm px-6 py-3.5 rounded-xl shadow-lg transition-transform hover:scale-105 shrink-0"
          >
            Get Free Quotes &rarr;
          </Link>
        </div>

        {/* Related Articles Section */}
        {relatedPosts && relatedPosts.length > 0 && (
          <section className="space-y-6 pt-6 border-t border-gray-200">
            <h3 className="text-xl font-black text-gray-950">Related Guides</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              {relatedPosts.map((related) => (
                <Link
                  key={related.id}
                  href={`/blog/${related.slug}`}
                  className="bg-slate-50 hover:bg-white rounded-xl border border-gray-200 p-4 shadow-2xs hover:shadow-md transition-all group flex flex-col justify-between space-y-3"
                >
                  <div className="space-y-1.5">
                    <span className="text-[10px] font-bold text-primary uppercase tracking-wider">
                      {related.category}
                    </span>
                    <h4 className="text-xs font-bold text-gray-900 group-hover:text-primary transition-colors line-clamp-2 leading-snug">
                      {related.title}
                    </h4>
                  </div>
                  <div className="text-[11px] text-gray-400 flex items-center justify-between pt-2 border-t border-gray-100">
                    <span>{related.readingTimeMin} min read</span>
                    <ArrowRight className="w-3.5 h-3.5 text-primary group-hover:translate-x-1 transition-transform" />
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}
      </main>

      {/* Footer */}
      <Footer />
    </div>
  );
}
