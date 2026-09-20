'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Header,
  Footer,
  QuoteModal,
  CostGuideModal,
} from '@/components/common';
import {
  EButton,
  EBadge,
  ECard,
  EStarRating,
} from '@/components/EComponents';
import type { RooferProvider } from '@/data/mockRoofers';
import {
  fetchProviderBySlug,
  syncProviderReviews,
  generateAiSummary,
  type ScrapedReviewItemDto,
} from '@/lib/api';
import {
  MapPin,
  Phone,
  Globe,
  ShieldCheck,
  Award,
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  ArrowLeft,
  Share2,
  Heart,
  ChevronRight,
  Sparkles,
  ExternalLink,
  CreditCard,
  RefreshCw,
  Home,
  Check,
  DownloadCloud,
  MessageSquare,
  Star,
} from 'lucide-react';

// Helper to render AI summary markdown neatly
function renderFormattedAiSummary(text: string) {
  if (!text) return null;

  const lines = text.split('\n');
  const elements: React.ReactNode[] = [];

  let key = 0;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    if (line.startsWith('### ') || line.startsWith('#### ')) {
      const cleanHeader = line.replace(/^#{3,4}\s+/, '').replace(/\*\*/g, '');
      elements.push(
        <h4 key={key++} className="text-sm font-bold text-amber-950 pt-2 flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-orange-500" />
          <span>{cleanHeader}</span>
        </h4>
      );
    } else if (line.startsWith('- ') || line.startsWith('* ')) {
      const bulletContent = line.replace(/^[-*]\s+/, '');
      elements.push(
        <div key={key++} className="flex items-start gap-2 pl-2 text-xs sm:text-sm text-gray-700">
          <span className="text-orange-500 font-bold mt-0.5">•</span>
          <span dangerouslySetInnerHTML={{
            __html: bulletContent
              .replace(/\*\*(.*?)\*\*/g, '<strong class="font-bold text-gray-950">$1</strong>')
              .replace(/\*(.*?)\*/g, '<em class="italic text-gray-800">$1</em>')
          }} />
        </div>
      );
    } else if (/^\d+\.\s+/.test(line)) {
      const numContent = line.replace(/^\d+\.\s+/, '');
      elements.push(
        <div key={key++} className="flex items-start gap-2 pl-2 text-xs sm:text-sm text-gray-700">
          <span className="text-orange-600 font-bold mt-0.5 shrink-0">
            {line.match(/^\d+\./)?.[0]}
          </span>
          <span dangerouslySetInnerHTML={{
            __html: numContent
              .replace(/\*\*(.*?)\*\*/g, '<strong class="font-bold text-gray-950">$1</strong>')
              .replace(/\*(.*?)\*/g, '<em class="italic text-gray-800">$1</em>')
          }} />
        </div>
      );
    } else if (line.startsWith('---') || line.startsWith('===')) {
      elements.push(<hr key={key++} className="border-amber-200/50 my-2" />);
    } else {
      elements.push(
        <p
          key={key++}
          className="text-xs sm:text-sm text-gray-700 leading-relaxed"
          dangerouslySetInnerHTML={{
            __html: line
              .replace(/\*\*(.*?)\*\*/g, '<strong class="font-bold text-gray-950">$1</strong>')
              .replace(/\*(.*?)\*/g, '<em class="italic text-gray-800">$1</em>')
          }}
        />
      );
    }
  }

  return <div className="space-y-2">{elements}</div>;
}

export default function ContractorProfilePage() {
  const params = useParams();
  const router = useRouter();
  const rawSlug = params?.slug;
  const slug = typeof rawSlug === 'string' ? rawSlug : Array.isArray(rawSlug) ? rawSlug[0] : '';

  const [provider, setProvider] = useState<RooferProvider | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [imgError, setImgError] = useState(false);

  // Live Reviews Sync State
  const [isSyncingReviews, setIsSyncingReviews] = useState(false);
  const [syncStatus, setSyncStatus] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [scrapedReviews, setScrapedReviews] = useState<ScrapedReviewItemDto[]>([]);

  // AI Review Summary State
  const [isGeneratingAiSummary, setIsGeneratingAiSummary] = useState(false);
  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const [aiSummaryUpdatedAt, setAiSummaryUpdatedAt] = useState<string | null>(null);
  const [aiSummaryStatus, setAiSummaryStatus] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Modals
  const [quoteModalOpen, setQuoteModalOpen] = useState(false);
  const [costGuideOpen, setCostGuideOpen] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [isSaved, setIsSaved] = useState(false);

  // Active Tab
  const [activeTab, setActiveTab] = useState<'overview' | 'reviews' | 'credentials' | 'services'>('overview');

  useEffect(() => {
    if (!slug) return;
    setIsLoading(true);
    setError(null);

    fetchProviderBySlug(slug)
      .then((data) => {
        setProvider(data);
        // Load any previously saved review comments from DB
        if (data.scrapedReviews && data.scrapedReviews.length > 0) {
          setScrapedReviews(data.scrapedReviews as ScrapedReviewItemDto[]);
        }
      })
      .catch((err) => {
        console.error('Failed to fetch provider profile:', err);
        setError(err.message || 'Contractor profile not found.');
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [slug]);

  const handleShare = () => {
    if (typeof window !== 'undefined') {
      navigator.clipboard.writeText(window.location.href);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };


  // Trigger AI Review Analysis via Mistral (chunked 20 reviews at a time)
  const handleGenerateAiSummary = async () => {
    if (!slug) return;
    try {
      setIsGeneratingAiSummary(true);
      setAiSummaryStatus(null);

      const result = await generateAiSummary(slug);
      setAiSummary(result.summary);
      if (result.provider?.aiSummaryUpdatedAt) {
        setAiSummaryUpdatedAt(result.provider.aiSummaryUpdatedAt);
      }
      setAiSummaryStatus({
        message: 'AI Review Analysis generated and saved successfully!',
        type: 'success',
      });
    } catch (err: any) {
      setAiSummaryStatus({
        message: err.message || 'Failed to generate AI analysis',
        type: 'error',
      });
    } finally {
      setIsGeneratingAiSummary(false);
    }
  };

  const handleSyncReviews = async () => {
    if (!slug || isSyncingReviews) return;
    setIsSyncingReviews(true);
    setSyncStatus(null);
    try {
      const res = await syncProviderReviews(slug);
      if (res.provider) {
        setProvider(res.provider);
      }
      if (res.scrapedSummary?.allReviews) {
        setScrapedReviews(res.scrapedSummary.allReviews);
      }
      setSyncStatus({
        message: `Reviews updated live! Rating: ${res.provider.compositeRating} ★ across ${res.provider.totalReviews} verified reviews.`,
        type: 'success',
      });
      setTimeout(() => setSyncStatus(null), 8000);
    } catch (err: any) {
      console.error('Failed to sync reviews:', err);
      setSyncStatus({
        message: err.message || 'Could not fetch live reviews at this moment. Please try again.',
        type: 'error',
      });
    } finally {
      setIsSyncingReviews(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F9FAFB] text-gray-950 flex flex-col font-sans selection:bg-primary selection:text-white">
      {/* 1. Universal Header */}
      <Header onOpenQuoteModal={() => setQuoteModalOpen(true)} savedCount={isSaved ? 1 : 0} />

      {/* 2. Breadcrumbs Header Bar */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between text-xs text-gray-500">
          <div className="flex items-center gap-1.5 flex-wrap">
            <Link href="/" className="hover:text-primary transition-colors flex items-center gap-1">
              <Home className="w-3.5 h-3.5" />
              <span>Home</span>
            </Link>
            <ChevronRight className="w-3 h-3 text-gray-300" />
            <Link href="/#listings" className="hover:text-primary transition-colors">
              Roofing Contractors
            </Link>
            <ChevronRight className="w-3 h-3 text-gray-300" />
            <span className="text-gray-700 font-medium">New York, NY</span>
            {provider && (
              <>
                <ChevronRight className="w-3 h-3 text-gray-300" />
                <span className="text-gray-950 font-bold truncate max-w-xs">{provider.name}</span>
              </>
            )}
          </div>

          <Link
            href="/"
            className="hidden sm:inline-flex items-center gap-1 text-primary hover:text-primary-dark font-semibold transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to all contractors</span>
          </Link>
        </div>
      </div>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 w-full flex-1 space-y-6">
        {isLoading ? (
          /* Loading Skeleton */
          <div className="space-y-6 animate-pulse">
            <div className="bg-white rounded-2xl border border-gray-200 p-6 sm:p-8 space-y-4">
              <div className="flex flex-col md:flex-row gap-6 items-start">
                <div className="w-32 h-32 bg-gray-200 rounded-2xl shrink-0" />
                <div className="flex-1 space-y-3 w-full">
                  <div className="h-7 bg-gray-200 rounded w-1/3" />
                  <div className="h-4 bg-gray-100 rounded w-1/2" />
                  <div className="h-4 bg-gray-100 rounded w-1/4" />
                </div>
              </div>
            </div>
            <div className="h-64 bg-white rounded-2xl border border-gray-200" />
          </div>
        ) : error || !provider ? (
          /* Error State */
          <div className="bg-white rounded-2xl border border-red-200 p-12 text-center space-y-4">
            <div className="w-14 h-14 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto">
              <AlertCircle className="w-7 h-7" />
            </div>
            <h2 className="text-xl font-bold text-gray-900">Contractor Profile Not Found</h2>
            <p className="text-sm text-gray-500 max-w-md mx-auto">
              {error || `We couldn't find a contractor matching "${slug}".`}
            </p>
            <div className="pt-2 flex justify-center gap-3">
              <Link href="/">
                <EButton variant="outline" size="md">
                  Browse All Contractors
                </EButton>
              </Link>
              <EButton
                variant="primary"
                size="md"
                onClick={() => router.refresh()}
                iconLeft={<RefreshCw className="w-3.5 h-3.5" />}
              >
                Retry
              </EButton>
            </div>
          </div>
        ) : (
          /* 100% Dynamic Contractor Profile */
          <>
            {/* Top Hero Card */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-xs p-6 sm:p-8 relative overflow-hidden">
              {/* Subtle brand glow behind logo */}
              <div className="absolute top-0 right-0 w-80 h-80 bg-primary/5 rounded-full blur-3xl pointer-events-none" />

              <div className="flex flex-col lg:flex-row gap-6 lg:gap-8 items-start justify-between relative z-10">
                {/* Left: Logo + Info */}
                <div className="flex flex-col sm:flex-row gap-5 sm:gap-6 items-start">
                  {/* Provider Logo / Presigned R2 Image */}
                  <div className="relative w-28 h-28 sm:w-32 sm:h-32 rounded-2xl overflow-hidden bg-gray-50 border border-gray-200 shadow-sm shrink-0 flex items-center justify-center">
                    {provider.imageUrl && !imgError ? (
                      <img
                        src={provider.imageUrl}
                        alt={provider.name}
                        onError={() => setImgError(true)}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-primary/10 to-primary/20 flex items-center justify-center text-primary-dark font-black text-2xl">
                        {provider.logoText || provider.name.substring(0, 2).toUpperCase()}
                      </div>
                    )}
                    <div className="absolute top-2 left-2">
                      <EBadge variant="verified">Verified</EBadge>
                    </div>
                  </div>

                  {/* Company Details */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <EBadge variant="popularChip">{provider.badge || 'VERIFIED EXPERT'}</EBadge>
                      <span className="text-xs text-primary-dark font-bold bg-primary-light px-2.5 py-0.5 rounded-full border border-primary-border">
                        {provider.topPickCategory || 'Top Rated Choice'}
                      </span>
                    </div>

                    <h1 className="text-2xl sm:text-3xl font-black text-gray-950 tracking-tight">
                      {provider.name}
                    </h1>

                    <p className="text-sm font-medium text-gray-600">
                      {provider.tagline}
                    </p>

                    {/* Metadata chips */}
                    <div className="flex flex-wrap items-center gap-3 pt-1 text-xs text-gray-500">
                      <span className="inline-flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-gray-400" />
                        <span>{provider.address}</span>
                      </span>
                      <span className="text-gray-300">&bull;</span>
                      <span className="inline-flex items-center gap-1 text-gray-700 font-medium">
                        <Calendar className="w-3.5 h-3.5 text-primary" />
                        <span>{provider.yearsInBusiness} Years in Business (Since {provider.sinceYear})</span>
                      </span>
                      <span className="text-gray-300">&bull;</span>
                      <span className="text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md font-semibold text-[11px]">
                        License: {provider.licenseNumber}
                      </span>
                    </div>

                    {/* Star Rating Overview & Quick Sync */}
                    <div className="flex flex-wrap items-center gap-3 pt-2">
                      <EStarRating
                        rating={provider.compositeRating}
                        totalReviews={provider.totalReviews}
                        size="md"
                      />
                      <span className="text-xs text-gray-500">
                        Across Google, Yelp &amp; Facebook
                      </span>
                      <button
                        onClick={handleSyncReviews}
                        disabled={isSyncingReviews}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-lg border border-primary/30 text-primary-dark hover:bg-primary/5 active:scale-95 transition-all cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                        title="Fetch latest reviews and ratings from Google, Yelp & Facebook"
                      >
                        <RefreshCw className={`w-3 h-3 text-primary ${isSyncingReviews ? 'animate-spin' : ''}`} />
                        <span>{isSyncingReviews ? 'Fetching...' : 'Fetch Reviews'}</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Right: Fast Actions & Direct Contact Box */}
                <div className="w-full lg:w-72 shrink-0 bg-gray-50/80 border border-gray-200 rounded-xl p-4 sm:p-5 space-y-3">
                  <div className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                    Direct Contractor Contact
                  </div>

                  <EButton
                    variant="primary"
                    size="lg"
                    className="w-full py-3 text-sm font-bold shadow-md shadow-primary/20"
                    onClick={() => setQuoteModalOpen(true)}
                  >
                    Request Free Estimate
                  </EButton>

                  <a
                    href={`tel:${provider.phone}`}
                    className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-gray-900 font-bold text-xs transition-colors shadow-2xs"
                  >
                    <Phone className="w-3.5 h-3.5 text-primary" />
                    <span>Call: {provider.displayPhone || provider.phone}</span>
                  </a>

                  {provider.website && provider.website !== '#' && (
                    <a
                      href={provider.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full flex items-center justify-center gap-1.5 text-xs text-gray-600 hover:text-primary font-medium py-1 transition-colors"
                    >
                      <Globe className="w-3.5 h-3.5" />
                      <span>Official Website</span>
                      <ExternalLink className="w-3 h-3 text-gray-400" />
                    </a>
                  )}

                  <div className="flex items-center justify-between pt-2 border-t border-gray-200/80 text-xs">
                    <button
                      onClick={handleShare}
                      className="inline-flex items-center gap-1 text-gray-500 hover:text-gray-900 transition-colors cursor-pointer"
                    >
                      {copiedLink ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                          <span className="text-emerald-600 font-bold">Link Copied!</span>
                        </>
                      ) : (
                        <>
                          <Share2 className="w-3.5 h-3.5" />
                          <span>Share Profile</span>
                        </>
                      )}
                    </button>

                    <button
                      onClick={() => setIsSaved(!isSaved)}
                      className={`inline-flex items-center gap-1 transition-colors cursor-pointer font-medium ${
                        isSaved ? 'text-primary font-bold' : 'text-gray-500 hover:text-gray-900'
                      }`}
                    >
                      <Heart className={`w-3.5 h-3.5 ${isSaved ? 'fill-primary text-primary' : ''}`} />
                      <span>{isSaved ? 'Saved' : 'Save'}</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* 4 Trust Highlights Badges */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-6 mt-6 border-t border-gray-100">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-gray-900">NYC DOB Licensed</div>
                    <div className="text-[11px] text-gray-500">Verified Credentials</div>
                  </div>
                </div>

                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                    <Award className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-gray-900">Fully Insured &amp; Bonded</div>
                    <div className="text-[11px] text-gray-500">$2M+ Liability Coverage</div>
                  </div>
                </div>

                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-gray-900">Workmanship Warranty</div>
                    <div className="text-[11px] text-gray-500">Written Guarantee</div>
                  </div>
                </div>

                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
                    <Clock className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-gray-900">
                      {provider.emergencyService ? '24/7 Emergency Service' : 'Standard Response'}
                    </div>
                    <div className="text-[11px] text-gray-500">Fast NYC Dispatch</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Navigation Tabs Bar */}
            <div className="flex border-b border-gray-200 space-x-6 text-sm font-bold">
              <button
                onClick={() => setActiveTab('overview')}
                className={`pb-3 transition-colors cursor-pointer border-b-2 -mb-px ${
                  activeTab === 'overview'
                    ? 'border-primary text-primary-dark'
                    : 'border-transparent text-gray-500 hover:text-gray-900'
                }`}
              >
                Overview &amp; Services
              </button>
              <button
                onClick={() => setActiveTab('reviews')}
                className={`pb-3 transition-colors cursor-pointer border-b-2 -mb-px ${
                  activeTab === 'reviews'
                    ? 'border-primary text-primary-dark'
                    : 'border-transparent text-gray-500 hover:text-gray-900'
                }`}
              >
                Ratings &amp; Authenticity ({provider.totalReviews})
              </button>
              <button
                onClick={() => setActiveTab('credentials')}
                className={`pb-3 transition-colors cursor-pointer border-b-2 -mb-px ${
                  activeTab === 'credentials'
                    ? 'border-primary text-primary-dark'
                    : 'border-transparent text-gray-500 hover:text-gray-900'
                }`}
              >
                Credentials &amp; Insurance
              </button>
            </div>

            {/* Tab Contents */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Left Column (8 cols): Main Tab Info */}
              <div className="lg:col-span-8 space-y-6">
                {activeTab === 'overview' && (
                  <>
                    {/* About Section */}
                    <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-3">
                      <h2 className="text-lg font-bold text-gray-950">About {provider.name}</h2>
                      <p className="text-xs sm:text-sm text-gray-600 leading-relaxed whitespace-pre-line">
                        {provider.description}
                      </p>
                    </div>

                    {/* Services Offered Grid */}
                    <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-4">
                      <div className="flex items-center justify-between">
                        <h2 className="text-lg font-bold text-gray-950">Specialized Services</h2>
                        <span className="text-xs text-gray-500">{provider.services.length} services available</span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {provider.services.map((service) => (
                          <div
                            key={service}
                            className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 bg-gray-50/50 hover:bg-gray-50 hover:border-gray-200 transition-colors"
                          >
                            <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center text-primary-dark shrink-0">
                              <CheckCircle2 className="w-4 h-4" />
                            </div>
                            <span className="text-xs font-bold text-gray-900">{service}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Typical Pricing & Cost Guide Widget */}
                    <div className="bg-gradient-to-r from-primary-light/40 to-white rounded-2xl border border-primary-border p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
                      <div className="space-y-1">
                        <div className="text-xs font-bold text-primary-dark uppercase tracking-wider flex items-center gap-1">
                          <Sparkles className="w-3.5 h-3.5" />
                          <span>Typical NYC Project Range</span>
                        </div>
                        <div className="text-xl font-black text-gray-950">
                          {provider.typicalPriceRange || '$4,500 – $18,000'}
                        </div>
                        <div className="text-xs text-gray-500">
                          Cost varies depending on square footage, pitch, and materials (modified bitumen, asphalt shingles, EPDM).
                        </div>
                      </div>

                      <EButton
                        variant="outline"
                        size="md"
                        onClick={() => setCostGuideOpen(true)}
                        className="shrink-0 bg-white"
                      >
                        View NYC Cost Guide
                      </EButton>
                    </div>
                  </>
                )}

                {activeTab === 'reviews' && (
                  <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-6">
                    {/* Header with Title, Rating & Action Button */}
                    <div className="flex items-center justify-between flex-wrap gap-4 border-b border-gray-100 pb-4">
                      <div>
                        <h2 className="text-lg font-bold text-gray-950">Verified Platform Reviews</h2>
                        <p className="text-xs text-gray-500">
                          Independent review metrics directly verified across Google, Yelp, and Facebook.
                        </p>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <div className="text-2xl font-black text-primary-dark">
                            {provider.compositeRating} <span className="text-sm font-normal text-gray-400">/ 5.0</span>
                          </div>
                          <div className="text-[10px] text-gray-400 font-medium">
                            {provider.totalReviews} total ratings
                          </div>
                        </div>

                        {/* Fetch Reviews Button */}
                        <EButton
                          variant="primary"
                          size="sm"
                          onClick={handleSyncReviews}
                          disabled={isSyncingReviews}
                          iconLeft={
                            isSyncingReviews ? (
                              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <DownloadCloud className="w-3.5 h-3.5" />
                            )
                          }
                          className="font-bold text-xs"
                        >
                          {isSyncingReviews ? 'Syncing Live...' : 'Fetch Live Reviews'}
                        </EButton>
                      </div>
                    </div>

                    {/* Live Sync Status Banner */}
                    {syncStatus && (
                      <div
                        className={`p-3.5 rounded-xl text-xs flex items-center gap-2.5 transition-all ${
                          syncStatus.type === 'success'
                            ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
                            : 'bg-amber-50 border border-amber-200 text-amber-800'
                        }`}
                      >
                        {syncStatus.type === 'success' ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        ) : (
                          <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                        )}
                        <span className="font-medium">{syncStatus.message}</span>
                      </div>
                    )}

                    {/* 3 Platform Summary Cards */}
                    {/* AI Review Analysis Box (Light Orange Box with Refresh Button) */}
                    <div className="rounded-2xl border border-orange-200/90 bg-gradient-to-br from-amber-50/90 via-orange-50/60 to-amber-100/40 p-5 sm:p-6 shadow-sm space-y-4">
                      {/* Header */}
                      <div className="flex items-center justify-between flex-wrap gap-3 pb-3 border-b border-amber-200/60">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-orange-500/15 border border-orange-500/25 flex items-center justify-center text-orange-600 shrink-0 shadow-sm">
                            <Sparkles className="w-5 h-5 text-orange-600" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="text-base sm:text-lg font-black text-gray-950 tracking-tight">
                                AI Review Analysis
                              </h3>
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-orange-500/15 text-orange-700 border border-orange-300/60">
                                Mistral AI
                              </span>
                            </div>
                            <p className="text-xs text-amber-900/70 font-medium">
                              Progressive multi-batch analysis synthesized from verified customer feedback
                            </p>
                          </div>
                        </div>

                        {/* Refresh Button */}
                        <div className="flex items-center gap-2">
                          {aiSummaryUpdatedAt && (
                            <span className="text-[11px] text-amber-800/70 font-medium hidden sm:inline">
                              Last updated: {new Date(aiSummaryUpdatedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                            </span>
                          )}
                          <button
                            type="button"
                            onClick={handleGenerateAiSummary}
                            disabled={isGeneratingAiSummary}
                            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold text-orange-700 bg-white/90 hover:bg-white border border-orange-300 hover:border-orange-400 shadow-xs hover:shadow transition-all disabled:opacity-50 cursor-pointer"
                          >
                            <RefreshCw className={`w-3.5 h-3.5 ${isGeneratingAiSummary ? 'animate-spin text-orange-600' : 'text-orange-600'}`} />
                            <span>{isGeneratingAiSummary ? 'Analyzing...' : 'Refresh'}</span>
                          </button>
                        </div>
                      </div>

                      {/* Status / Feedback Banner */}
                      {aiSummaryStatus && (
                        <div className={`p-2.5 rounded-xl text-xs font-medium flex items-center gap-2 ${
                          aiSummaryStatus.type === 'success'
                            ? 'bg-emerald-100/70 text-emerald-800 border border-emerald-300/60'
                            : 'bg-red-100/70 text-red-800 border border-red-300/60'
                        }`}>
                          {aiSummaryStatus.type === 'success' ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                          ) : (
                            <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                          )}
                          <span>{aiSummaryStatus.message}</span>
                        </div>
                      )}

                      {/* Body Content */}
                      {isGeneratingAiSummary ? (
                        <div className="py-8 text-center space-y-3">
                          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-orange-500/10 text-orange-600 animate-bounce">
                            <Sparkles className="w-6 h-6" />
                          </div>
                          <div className="space-y-1">
                            <div className="text-sm font-bold text-gray-900">
                              Analyzing customer comments in chunks of 20...
                            </div>
                            <p className="text-xs text-amber-800/80 max-w-md mx-auto">
                              Mistral AI is evaluating craftsmanship, pricing fairness, punctuality, and overall customer satisfaction.
                            </p>
                          </div>
                        </div>
                      ) : aiSummary ? (
                        <div className="bg-white/75 rounded-xl border border-amber-200/60 p-4 sm:p-5 text-gray-800 space-y-3">
                          {renderFormattedAiSummary(aiSummary)}
                        </div>
                      ) : (
                        <div className="py-5 px-4 rounded-xl bg-white/60 border border-amber-200/60 text-center space-y-2.5">
                          <p className="text-xs sm:text-sm text-gray-700 font-medium">
                            No AI review summary has been generated for this contractor yet.
                          </p>
                          <button
                            type="button"
                            onClick={handleGenerateAiSummary}
                            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-orange-600 hover:bg-orange-700 shadow-sm transition-colors cursor-pointer"
                          >
                            <Sparkles className="w-4 h-4" />
                            <span>Generate AI Review Analysis</span>
                          </button>
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      {/* Google */}
                      <div className="p-4 rounded-xl border border-blue-100 bg-blue-50/30 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-blue-700">Google Reviews</span>
                          <span className="text-xs font-bold text-gray-900">{provider.reviews.google.rating} ★</span>
                        </div>
                        <div className="text-xl font-black text-gray-950">{provider.reviews.google.count}</div>
                        <div className="text-[11px] text-gray-500">Verified client reviews</div>
                      </div>

                      {/* Yelp */}
                      <div className="p-4 rounded-xl border border-red-100 bg-red-50/30 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-red-700">Yelp Rating</span>
                          <span className="text-xs font-bold text-gray-900">{provider.reviews.yelp.rating} ★</span>
                        </div>
                        <div className="text-xl font-black text-gray-950">{provider.reviews.yelp.count}</div>
                        <div className="text-[11px] text-gray-500">Consumer feedback</div>
                      </div>

                      {/* Facebook */}
                      <div className="p-4 rounded-xl border border-indigo-100 bg-indigo-50/30 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-indigo-700">Facebook</span>
                          <span className="text-xs font-bold text-gray-900">{provider.reviews.facebook.rating} ★</span>
                        </div>
                        <div className="text-xl font-black text-gray-950">{provider.reviews.facebook.count}</div>
                        <div className="text-[11px] text-gray-500">Community recommendations</div>
                      </div>
                    </div>

                    {/* Featured Quote */}
                    {provider.featuredQuote && (
                      <div className="p-4 rounded-xl bg-gray-50 border border-gray-200/80 space-y-1">
                        <div className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                          Featured Customer Feedback
                        </div>
                        <blockquote className="text-xs sm:text-sm text-gray-700 italic">
                          "{provider.featuredQuote}"
                        </blockquote>
                      </div>
                    )}

                    {/* Scraped Live Reviews Feed */}
                    <div className="space-y-4 pt-2">
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                          <MessageSquare className="w-4 h-4 text-primary" />
                          <span>Latest Customer Reviews &amp; Testimonials</span>
                        </h3>
                        {scrapedReviews.length > 0 && (
                          <span className="text-xs font-semibold text-primary-dark bg-primary-light px-2.5 py-0.5 rounded-full border border-primary-border">
                            {scrapedReviews.length} Reviews Fetched
                          </span>
                        )}
                      </div>

                      {scrapedReviews.length > 0 ? (
                        <div className="space-y-3">
                          {scrapedReviews.map((rev, idx) => (
                            <div
                              key={idx}
                              className="p-4 rounded-xl border border-gray-100 bg-gray-50/60 hover:bg-gray-50 transition-colors space-y-2.5"
                            >
                              <div className="flex items-center justify-between flex-wrap gap-2">
                                <div className="flex items-center gap-2.5">
                                  {rev.authorAvatarUrl ? (
                                    <img
                                      src={rev.authorAvatarUrl}
                                      alt={rev.authorName}
                                      className="w-8 h-8 rounded-full object-cover border border-gray-200"
                                      onError={(e) => {
                                        e.currentTarget.style.display = 'none';
                                      }}
                                    />
                                  ) : (
                                    <div className="w-8 h-8 rounded-full bg-primary/10 text-primary-dark font-bold text-xs flex items-center justify-center">
                                      {rev.authorName.substring(0, 2).toUpperCase()}
                                    </div>
                                  )}
                                  <div>
                                    <div className="text-xs font-bold text-gray-900">{rev.authorName}</div>
                                    {rev.reviewDate && (
                                      <div className="text-[10px] text-gray-400">{rev.reviewDate}</div>
                                    )}
                                  </div>
                                </div>

                                <div className="flex items-center gap-2">
                                  <div className="flex items-center text-amber-500 text-xs">
                                    {Array.from({ length: 5 }).map((_, s) => (
                                      <Star
                                        key={s}
                                        className={`w-3.5 h-3.5 ${
                                          s < Math.floor(rev.rating)
                                            ? 'fill-amber-400 text-amber-400'
                                            : 'text-gray-200'
                                        }`}
                                      />
                                    ))}
                                    <span className="ml-1 font-bold text-gray-700">{rev.rating}</span>
                                  </div>

                                  <span
                                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                                      rev.platform === 'GOOGLE'
                                        ? 'bg-blue-50 text-blue-700 border border-blue-200'
                                        : rev.platform === 'YELP'
                                        ? 'bg-red-50 text-red-700 border border-red-200'
                                        : 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                                    }`}
                                  >
                                    {rev.platform}
                                  </span>
                                </div>
                              </div>

                              <p className="text-xs text-gray-600 leading-relaxed">{rev.comment}</p>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="p-8 rounded-xl border border-dashed border-gray-200 text-center space-y-3 bg-gray-50/40">
                          <div className="w-10 h-10 rounded-full bg-primary/10 text-primary mx-auto flex items-center justify-center">
                            <DownloadCloud className="w-5 h-5" />
                          </div>
                          <div className="space-y-1">
                            <div className="text-xs font-bold text-gray-800">
                              No live review comments cached yet
                            </div>
                            <div className="text-[11px] text-gray-500 max-w-sm mx-auto">
                              Click the <strong>"Fetch Live Reviews"</strong> button above to scrape and display the latest individual customer comments from Google, Yelp &amp; Facebook.
                            </div>
                          </div>
                          <div className="pt-1">
                            <EButton
                              variant="outline"
                              size="sm"
                              onClick={handleSyncReviews}
                              disabled={isSyncingReviews}
                              iconLeft={<RefreshCw className={`w-3.5 h-3.5 ${isSyncingReviews ? 'animate-spin' : ''}`} />}
                              className="text-xs"
                            >
                              {isSyncingReviews ? 'Fetching Reviews...' : 'Fetch Live Reviews Now'}
                            </EButton>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {activeTab === 'credentials' && (
                  <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-4">
                    <h2 className="text-lg font-bold text-gray-950">Licenses, Insurance &amp; Guarantees</h2>
                    <div className="divide-y divide-gray-100 text-xs">
                      <div className="py-3 flex items-center justify-between">
                        <span className="text-gray-500">New York Department of Buildings License</span>
                        <span className="font-mono font-bold text-gray-900">{provider.licenseNumber}</span>
                      </div>
                      <div className="py-3 flex items-center justify-between">
                        <span className="text-gray-500">General Liability Insurance</span>
                        <span className="font-bold text-emerald-600 flex items-center gap-1">
                          <Check className="w-3.5 h-3.5" /> Verified Active ($2M+)
                        </span>
                      </div>
                      <div className="py-3 flex items-center justify-between">
                        <span className="text-gray-500">Surety Bond Status</span>
                        <span className="font-bold text-emerald-600 flex items-center gap-1">
                          <Check className="w-3.5 h-3.5" /> Bonded in NY State
                        </span>
                      </div>
                      <div className="py-3 flex items-center justify-between">
                        <span className="text-gray-500">Workmanship Warranty</span>
                        <span className="font-bold text-gray-900">5 – 25 Year Guaranteed Coverage</span>
                      </div>
                      <div className="py-3 flex items-center justify-between">
                        <span className="text-gray-500">Operating Since</span>
                        <span className="font-bold text-gray-900">{provider.sinceYear} ({provider.yearsInBusiness} years)</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Right Column (4 cols): Sticky Quick Quote & Area Coverage */}
              <div className="lg:col-span-4 space-y-6">
                {/* Free Estimate Request Box */}
                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 space-y-4">
                  <div className="space-y-1">
                    <div className="inline-flex items-center gap-1.5 text-[11px] font-bold text-primary-dark bg-primary-light px-2.5 py-0.5 rounded-full">
                      <Sparkles className="w-3 h-3" />
                      <span>NO OBLIGATION ESTIMATE</span>
                    </div>
                    <h3 className="text-base font-bold text-gray-950">
                      Get a Free Quote from {provider.name}
                    </h3>
                    <p className="text-xs text-gray-500">
                      Connect directly with their team for inspection &amp; transparent upfront pricing.
                    </p>
                  </div>

                  <EButton
                    variant="primary"
                    size="lg"
                    className="w-full py-3 font-bold text-xs shadow-md shadow-primary/20"
                    onClick={() => setQuoteModalOpen(true)}
                  >
                    Request Free Estimate
                  </EButton>

                  <div className="text-[11px] text-gray-400 text-center">
                    Average response time: Under 1 hour
                  </div>
                </div>

                {/* Service Area Card */}
                <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-3">
                  <h3 className="text-sm font-bold text-gray-950">Service Area Coverage</h3>
                  <div className="flex items-start gap-2.5 text-xs text-gray-600">
                    <MapPin className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                    <div>
                      <div className="font-bold text-gray-900">{provider.borough} &amp; Greater New York</div>
                      <div className="text-gray-500 pt-0.5">{provider.servesArea}</div>
                    </div>
                  </div>
                </div>

                {/* Financing Available banner */}
                <div className="p-4 rounded-xl border border-gray-200 bg-gradient-to-r from-gray-50 to-white flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center text-primary-dark shrink-0">
                    <CreditCard className="w-4 h-4" />
                  </div>
                  <div className="text-xs">
                    <div className="font-bold text-gray-900">Flexible Financing Available</div>
                    <div className="text-gray-500">0% APR promotional options available upon request</div>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </main>

      {/* Footer */}
      <Footer />

      {/* Quote Modal */}
      <QuoteModal
        isOpen={quoteModalOpen}
        onClose={() => setQuoteModalOpen(false)}
        selectedProvider={provider}
      />

      {/* Cost Guide Modal */}
      <CostGuideModal
        isOpen={costGuideOpen}
        onClose={() => setCostGuideOpen(false)}
      />
    </div>
  );
}
