'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Editor } from '@tiptap/react';
import {
  ArrowLeft,
  Save,
  Globe,
  Upload,
  Eye,
  CheckCircle,
  AlertCircle,
  Clock,
  FileText,
  Sparkles,
  Trash2,
  Share2,
  Settings,
  X,
  Plus,
  Undo,
  Redo,
  Info,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  Laptop,
  Tablet,
  Smartphone,
  Check,
  Tag,
  Folder,
  Image as ImageIcon,
  ShieldCheck,
  Calendar,
  Search,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Link2,
  Compass,
} from 'lucide-react';
import type { BlogPost, CreateBlogPostInput, UpdateBlogPostInput } from '@repo/types';
import {
  createAdminBlog,
  updateAdminBlog,
  uploadImageToStorage,
  fetchBlogCategories,
} from '@/lib/blogs-api';
import TiptapEditor from './TiptapEditor';

interface BlogEditorFormProps {
  initialData?: BlogPost;
  isEditMode?: boolean;
}

export default function BlogEditorForm({ initialData, isEditMode = false }: BlogEditorFormProps) {
  const router = useRouter();

  // Document Core State
  const [title, setTitle] = useState(initialData?.title || '');
  const [slug, setSlug] = useState(initialData?.slug || '');
  const [manualSlug, setManualSlug] = useState(false);
  const [excerpt, setExcerpt] = useState(initialData?.excerpt || '');
  const [content, setContent] = useState(initialData?.content || '');
  const [coverImageUrl, setCoverImageUrl] = useState(initialData?.coverImageUrl || '');
  const [coverImageAlt, setCoverImageAlt] = useState(initialData?.coverImageAlt || '');
  const [authorName, setAuthorName] = useState(initialData?.authorName || '');
  const [authorRole, setAuthorRole] = useState(initialData?.authorRole || '');
  const [category, setCategory] = useState(initialData?.category || '');
  const [customCategory, setCustomCategory] = useState('');
  const [availableCategories, setAvailableCategories] = useState<string[]>([]);
  const [tags, setTags] = useState<string[]>(initialData?.tags || []);
  const [tagInput, setTagInput] = useState('');
  const [isFeatured, setIsFeatured] = useState(initialData?.isFeatured || false);
  const [status, setStatus] = useState<'DRAFT' | 'PUBLISHED' | 'ARCHIVED'>(
    initialData?.status || 'DRAFT'
  );

  // Advanced SEO & Social State
  const [metaTitle, setMetaTitle] = useState(initialData?.metaTitle || '');
  const [metaDescription, setMetaDescription] = useState(initialData?.metaDescription || '');
  const [focusKeyword, setFocusKeyword] = useState(initialData?.focusKeyword || '');
  const [canonicalUrl, setCanonicalUrl] = useState(initialData?.canonicalUrl || '');
  const [ogImageUrl, setOgImageUrl] = useState(initialData?.ogImageUrl || '');
  const [serpPreviewMode, setSerpPreviewMode] = useState<'google' | 'social'>('google');

  // UI Control State
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [sidebarTab, setSidebarTab] = useState<'post' | 'seo'>('post');
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [previewDevice, setPreviewDevice] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  const [isDocInfoOpen, setIsDocInfoOpen] = useState(false);
  const [isInserterOpen, setIsInserterOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingCover, setIsUploadingCover] = useState(false);
  const [isUploadingOg, setIsUploadingOg] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Accordion Sections State (Post Tab)
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    status: true,
    permalink: true,
    categories: true,
    tags: true,
    featuredImage: true,
    excerpt: true,
  });

  const toggleSection = (sec: string) => {
    setOpenSections((prev) => ({ ...prev, [sec]: !prev[sec] }));
  };

  // Editor reference for top bar actions
  const [editorInstance, setEditorInstance] = useState<Editor | null>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);
  const ogInputRef = useRef<HTMLInputElement>(null);
  const docInfoRef = useRef<HTMLDivElement>(null);
  const inserterRef = useRef<HTMLDivElement>(null);

  // Load real categories from the database (no hardcoded list)
  useEffect(() => {
    fetchBlogCategories().then((cats) => {
      const names = cats.map((c) => c.category).filter(Boolean);
      if (initialData?.category && !names.includes(initialData.category)) {
        names.unshift(initialData.category);
      }
      setAvailableCategories(names);
    });
  }, [initialData?.category]);

  // Close popovers on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (docInfoRef.current && !docInfoRef.current.contains(e.target as Node)) {
        setIsDocInfoOpen(false);
      }
      if (inserterRef.current && !inserterRef.current.contains(e.target as Node)) {
        setIsInserterOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Auto slugify when title changes
  useEffect(() => {
    if (!manualSlug && !isEditMode && title) {
      const generated = title
        .toLowerCase()
        .trim()
        .replace(/\s+/g, '-')
        .replace(/[^\w\-]+/g, '')
        .replace(/\-\-+/g, '-');
      setSlug(generated);
    }
  }, [title, manualSlug, isEditMode]);

  // Document word count & stats
  const plainText = content.replace(/<[^>]+>/g, ' ').trim();
  const wordCount = plainText ? plainText.split(/\s+/).filter(Boolean).length : 0;
  const characterCount = plainText.length;
  const readingTimeMin = Math.max(1, Math.ceil(wordCount / 200));
  const headingsCount = (content.match(/<h[1-6]/gi) || []).length;
  const paragraphsCount = (content.match(/<p/gi) || []).length;

  // Active meta values (fall back to the post's own title/excerpt only — no fake defaults)
  const activeMetaTitle = (metaTitle || title).trim();
  const activeMetaDescription = (metaDescription || excerpt).trim();

  // ═════════════════════════════════════════════════════════════════════
  // RANKMATH / YOAST REAL-TIME SEO AUDIT ENGINE
  // ═════════════════════════════════════════════════════════════════════
  const seoAudit = useMemo(() => {
    const normalizedKw = focusKeyword.trim().toLowerCase();
    const plainWords = plainText.toLowerCase().split(/\s+/).filter(Boolean);
    const totalWords = plainWords.length;

    // Keyword Occurrences & Density
    let keywordCount = 0;
    if (normalizedKw) {
      const escaped = normalizedKw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(`\\b${escaped}\\b`, 'gi');
      keywordCount = (plainText.match(regex) || []).length;
    }
    const keywordDensity =
      totalWords > 0 && normalizedKw ? ((keywordCount / totalWords) * 100).toFixed(1) : '0.0';

    // First 10% Intro words check
    const introWordSlice = plainWords.slice(0, Math.max(40, Math.ceil(totalWords * 0.15))).join(' ');
    const inIntro = normalizedKw ? introWordSlice.includes(normalizedKw) : false;

    // Headings Check
    const headingsMatch = content.match(/<h[2-4][^>]*>(.*?)<\/h[2-4]>/gi) || [];
    const headingsText = headingsMatch.map((h) => h.replace(/<[^>]+>/g, '').toLowerCase()).join(' ');
    const inHeadings = normalizedKw ? headingsText.includes(normalizedKw) : false;

    // Links Check
    const linkCount = (content.match(/<a\s+[^>]*href=/gi) || []).length;

    // Individual Checklist Rules
    const checks = {
      keywordInTitle: normalizedKw ? activeMetaTitle.toLowerCase().includes(normalizedKw) : false,
      keywordInDesc: normalizedKw ? activeMetaDescription.toLowerCase().includes(normalizedKw) : false,
      keywordInSlug: normalizedKw
        ? (slug || '').toLowerCase().includes(normalizedKw.replace(/\s+/g, '-'))
        : false,
      keywordInIntro: inIntro,
      keywordInHeadings: inHeadings,
      wordCount: totalWords >= 600,
      wordCountModerate: totalWords >= 300,
      keywordDensity: parseFloat(keywordDensity) >= 0.6 && parseFloat(keywordDensity) <= 2.8,
      titleLength: activeMetaTitle.length >= 35 && activeMetaTitle.length <= 60,
      descLength: activeMetaDescription.length >= 70 && activeMetaDescription.length <= 160,
      hasFeaturedImage: Boolean(coverImageUrl),
      hasImageAlt: Boolean(coverImageUrl && coverImageAlt),
      hasHeadings: headingsMatch.length >= 2,
      hasLinks: linkCount > 0,
      slugLength: (slug || '').length > 0 && (slug || '').length <= 75,
    };

    // Calculate Dynamic SEO Score out of 100
    let calculatedScore = 0;
    if (normalizedKw) {
      if (checks.keywordInTitle) calculatedScore += 18;
      if (checks.keywordInDesc) calculatedScore += 14;
      if (checks.keywordInSlug) calculatedScore += 10;
      if (checks.keywordInIntro) calculatedScore += 10;
      if (checks.keywordInHeadings) calculatedScore += 10;
      if (checks.keywordDensity) calculatedScore += 10;
    }

    if (checks.wordCount) calculatedScore += 12;
    else if (checks.wordCountModerate) calculatedScore += 6;

    if (checks.titleLength) calculatedScore += 5;
    if (checks.descLength) calculatedScore += 5;
    if (checks.hasFeaturedImage && checks.hasImageAlt) calculatedScore += 6;
    else if (checks.hasFeaturedImage) calculatedScore += 3;
    if (checks.hasHeadings) calculatedScore += 5;
    if (checks.hasLinks) calculatedScore += 5;

    const finalScore = Math.min(100, Math.max(0, calculatedScore));

    return {
      score: finalScore,
      keywordCount,
      keywordDensity,
      linkCount,
      checks,
    };
  }, [focusKeyword, plainText, activeMetaTitle, activeMetaDescription, slug, content, coverImageUrl, coverImageAlt]);

  // Handle Cover Image Upload
  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsUploadingCover(true);
      setErrorMsg('');
      const url = await uploadImageToStorage(file, 'blog-covers');
      setCoverImageUrl(url);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to upload featured image');
    } finally {
      setIsUploadingCover(false);
      if (coverInputRef.current) coverInputRef.current.value = '';
    }
  };

  // Handle Social (OG) Image Upload
  const handleOgUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsUploadingOg(true);
      setErrorMsg('');
      const url = await uploadImageToStorage(file, 'blog-og');
      setOgImageUrl(url);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to upload social image');
    } finally {
      setIsUploadingOg(false);
      if (ogInputRef.current) ogInputRef.current.value = '';
    }
  };

  // Handle Tag Addition
  const handleAddTag = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      const val = tagInput.trim().replace(/^#/, '');
      if (val && !tags.includes(val)) {
        setTags([...tags, val]);
        setTagInput('');
      }
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter((t) => t !== tagToRemove));
  };

  // Save / Publish
  const handleSave = async (targetStatus?: 'DRAFT' | 'PUBLISHED') => {
    if (!title.trim()) {
      setErrorMsg('Please enter an article title');
      return;
    }
    if (!plainText) {
      setErrorMsg('Please write some content before saving');
      return;
    }

    const effectiveStatus = targetStatus || status;

    // Empty optional fields are sent as undefined so the API applies its own defaults
    const payload: CreateBlogPostInput | UpdateBlogPostInput = {
      title: title.trim(),
      slug: slug || undefined,
      excerpt: excerpt || undefined,
      content,
      coverImageUrl: coverImageUrl || undefined,
      coverImageAlt: coverImageAlt || undefined,
      authorName: authorName.trim() || undefined,
      authorRole: authorRole.trim() || undefined,
      category: customCategory.trim() || category || undefined,
      tags,
      status: effectiveStatus,
      isFeatured,
      publishedAt:
        effectiveStatus === 'PUBLISHED'
          ? initialData?.publishedAt || new Date().toISOString()
          : null,
      metaTitle: metaTitle || undefined,
      metaDescription: metaDescription || undefined,
      focusKeyword: focusKeyword || undefined,
      canonicalUrl: canonicalUrl || undefined,
      ogImageUrl: ogImageUrl || undefined,
    };

    try {
      setIsSaving(true);
      setErrorMsg('');
      setSaveSuccessMsg('');

      let savedPost: BlogPost;
      if (isEditMode && initialData) {
        savedPost = await updateAdminBlog(initialData.id, payload);
      } else {
        savedPost = await createAdminBlog(payload as CreateBlogPostInput);
      }

      setStatus(effectiveStatus);
      setSaveSuccessMsg(
        effectiveStatus === 'PUBLISHED'
          ? '🎉 Published live!'
          : '💾 Saved draft!'
      );

      setTimeout(() => {
        setSaveSuccessMsg('');
        if (!isEditMode && savedPost?.id) {
          router.push(`/admin/blogs/${savedPost.id}`);
        }
      }, 1500);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to save blog post');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col font-sans selection:bg-[#fed7aa] selection:text-gray-900">
      
      {/* WordPress Gutenberg Top Navigation Bar */}
      <header className="sticky top-0 z-40 h-14 bg-white border-b border-gray-200 px-3 sm:px-4 flex items-center justify-between select-none">
        
        {/* Left Section: Back, Inserter (+), Undo, Redo, Info */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          <button
            type="button"
            onClick={() => router.push('/admin/blogs')}
            className="p-1.5 text-gray-700 hover:text-gray-950 hover:bg-gray-100 rounded-md transition-colors cursor-pointer"
            title="Back to all posts"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>

          {/* Quick Block Inserter (+) Button */}
          <div className="relative" ref={inserterRef}>
            <button
              type="button"
              onClick={() => setIsInserterOpen(!isInserterOpen)}
              className={`p-1.5 rounded-md transition-colors cursor-pointer ${
                isInserterOpen
                  ? 'bg-black text-white'
                  : 'bg-black/90 hover:bg-black text-white shadow-xs'
              }`}
              title="Add block"
            >
              <Plus className="w-4 h-4" />
            </button>

            {isInserterOpen && (
              <div className="absolute left-0 top-full mt-2 w-64 bg-white border border-gray-200 rounded-xl shadow-2xl p-3 z-50 animate-in fade-in zoom-in-95">
                <div className="text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-2 px-1">
                  Add a Block
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      editorInstance?.chain().focus().setParagraph().run();
                      setIsInserterOpen(false);
                    }}
                    className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-100 text-left text-xs font-semibold text-gray-800 cursor-pointer"
                  >
                    <span className="font-serif font-bold text-sm w-4">¶</span>
                    <span>Paragraph</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      editorInstance?.chain().focus().toggleHeading({ level: 2 }).run();
                      setIsInserterOpen(false);
                    }}
                    className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-100 text-left text-xs font-semibold text-gray-800 cursor-pointer"
                  >
                    <span className="font-bold text-xs w-4">H2</span>
                    <span>Heading 2</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      editorInstance?.chain().focus().toggleHeading({ level: 3 }).run();
                      setIsInserterOpen(false);
                    }}
                    className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-100 text-left text-xs font-semibold text-gray-800 cursor-pointer"
                  >
                    <span className="font-bold text-xs w-4">H3</span>
                    <span>Heading 3</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      editorInstance?.chain().focus().toggleBulletList().run();
                      setIsInserterOpen(false);
                    }}
                    className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-100 text-left text-xs font-semibold text-gray-800 cursor-pointer"
                  >
                    <span className="font-bold text-xs w-4">•</span>
                    <span>Bullet List</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      editorInstance?.chain().focus().toggleOrderedList().run();
                      setIsInserterOpen(false);
                    }}
                    className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-100 text-left text-xs font-semibold text-gray-800 cursor-pointer"
                  >
                    <span className="font-bold text-xs w-4">1.</span>
                    <span>Numbered</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      editorInstance?.chain().focus().toggleBlockquote().run();
                      setIsInserterOpen(false);
                    }}
                    className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-100 text-left text-xs font-semibold text-gray-800 cursor-pointer"
                  >
                    <span className="font-serif font-bold text-xs w-4">❝</span>
                    <span>Quote</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      editorInstance?.chain().focus().insertContent(
                        '<blockquote><p><strong>💡 Pro Tip:</strong> </p></blockquote><p></p>'
                      ).run();
                      setIsInserterOpen(false);
                    }}
                    className="flex items-center gap-2 p-2 rounded-lg bg-amber-50 hover:bg-amber-100 text-left text-xs font-bold text-amber-900 col-span-2 cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                    <span>Pro Tip Callout Box</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="h-4 w-px bg-gray-200 mx-1 hidden sm:block" />

          {/* Undo / Redo */}
          <button
            type="button"
            onClick={() => editorInstance?.chain().focus().undo().run()}
            disabled={!editorInstance?.can().undo()}
            className="p-1.5 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md disabled:opacity-30 disabled:hover:bg-transparent transition-colors cursor-pointer"
            title="Undo (Ctrl+Z)"
          >
            <Undo className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => editorInstance?.chain().focus().redo().run()}
            disabled={!editorInstance?.can().redo()}
            className="p-1.5 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md disabled:opacity-30 disabled:hover:bg-transparent transition-colors cursor-pointer"
            title="Redo (Ctrl+Y)"
          >
            <Redo className="w-4 h-4" />
          </button>

          {/* Document Outline & Word Count Stats */}
          <div className="relative hidden sm:block" ref={docInfoRef}>
            <button
              type="button"
              onClick={() => setIsDocInfoOpen(!isDocInfoOpen)}
              className="p-1.5 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors cursor-pointer"
              title="Details & Outline"
            >
              <Info className="w-4 h-4" />
            </button>

            {isDocInfoOpen && (
              <div className="absolute left-0 top-full mt-2 w-60 bg-white border border-gray-200 rounded-xl shadow-xl p-4 z-50 animate-in fade-in">
                <div className="text-xs font-bold text-gray-900 mb-3 border-b border-gray-100 pb-2">
                  Document Statistics
                </div>
                <div className="space-y-2 text-xs text-gray-600">
                  <div className="flex justify-between">
                    <span>Words</span>
                    <span className="font-bold text-gray-900">{wordCount}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Characters</span>
                    <span className="font-bold text-gray-900">{characterCount}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Reading Time</span>
                    <span className="font-bold text-gray-900">{readingTimeMin} min</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Headings</span>
                    <span className="font-bold text-gray-900">{headingsCount}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Paragraphs</span>
                    <span className="font-bold text-gray-900">{paragraphsCount}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Center Section: Live SEO Score Pill & Status Messages */}
        <div className="flex items-center gap-2">
          {/* Quick Real-Time SEO Score Badge in Header */}
          <button
            type="button"
            onClick={() => {
              setIsSidebarOpen(true);
              setSidebarTab('seo');
            }}
            className={`hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border transition-colors cursor-pointer ${
              seoAudit.score >= 80
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
                : seoAudit.score >= 50
                ? 'bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100'
                : 'bg-rose-50 text-rose-800 border-rose-200 hover:bg-rose-100'
            }`}
            title="Click to view full SEO Audit"
          >
            <span
              className={`w-2 h-2 rounded-full ${
                seoAudit.score >= 80
                  ? 'bg-emerald-500'
                  : seoAudit.score >= 50
                  ? 'bg-amber-500'
                  : 'bg-rose-500'
              }`}
            />
            <span>SEO: {seoAudit.score}/100</span>
          </button>

          {saveSuccessMsg && (
            <span className="text-xs font-semibold text-emerald-600 flex items-center gap-1 animate-fade-in">
              <CheckCircle className="w-3.5 h-3.5" />
              {saveSuccessMsg}
            </span>
          )}
          {errorMsg && (
            <span className="text-xs font-semibold text-rose-600 flex items-center gap-1 animate-fade-in">
              <AlertCircle className="w-3.5 h-3.5" />
              {errorMsg}
            </span>
          )}
          {isSaving && (
            <span className="text-xs font-semibold text-gray-400 flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-[#007cba] animate-ping" />
              Saving...
            </span>
          )}
        </div>

        {/* Right Section: Save Draft, Preview, Publish, Settings Gear */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => handleSave('DRAFT')}
            disabled={isSaving}
            className="px-3 py-1.5 text-xs font-semibold text-gray-700 hover:text-gray-950 hover:bg-gray-100 rounded-md transition-colors disabled:opacity-50 cursor-pointer"
          >
            Save draft
          </button>

          <button
            type="button"
            onClick={() => setIsPreviewOpen(true)}
            className="px-3 py-1.5 text-xs font-semibold text-gray-700 hover:text-gray-950 hover:bg-gray-100 rounded-md transition-colors flex items-center gap-1 cursor-pointer"
          >
            <Eye className="w-3.5 h-3.5 text-gray-500" />
            <span className="hidden sm:inline">Preview</span>
          </button>

          {/* WordPress Blue Publish Button */}
          <button
            type="button"
            onClick={() => handleSave('PUBLISHED')}
            disabled={isSaving}
            className="px-4 py-1.5 text-xs font-bold text-white bg-[#007cba] hover:bg-[#006ba1] rounded-md transition-colors shadow-xs disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
          >
            <Globe className="w-3.5 h-3.5" />
            <span>{status === 'PUBLISHED' ? 'Update' : 'Publish'}</span>
          </button>

          <div className="h-4 w-px bg-gray-200 mx-0.5" />

          {/* Toggle Right Inspector Sidebar [⚙] */}
          <button
            type="button"
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className={`p-2 rounded-md transition-colors cursor-pointer ${
              isSidebarOpen
                ? 'bg-gray-900 text-white'
                : 'text-gray-600 hover:text-gray-950 hover:bg-gray-100'
            }`}
            title="Toggle Settings Sidebar"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Main Workspace: Left Gutenberg Canvas + Right Collapsible Inspector */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* Left/Center Clean Document Canvas */}
        <main className="flex-1 overflow-y-auto bg-white px-4 sm:px-12 py-10 flex justify-center">
          <div className="w-full max-w-3xl space-y-4">
            
            {/* Seamless Gutenberg Title Input */}
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Add title"
              className="w-full text-3xl sm:text-5xl font-black text-gray-950 placeholder:text-gray-300 border-none outline-none bg-transparent tracking-tight leading-tight py-2"
            />

            {/* Gutenberg Tiptap Document Editor */}
            <TiptapEditor
              content={content}
              onChange={(html) => setContent(html)}
              placeholder="Start writing or type / to choose a block..."
              onEditorReady={(editor) => setEditorInstance(editor)}
            />
          </div>
        </main>

        {/* Right Collapsible Inspector Sidebar (WordPress Gutenberg Style - Slideover on Mobile) */}
        {isSidebarOpen && (
          <aside className="fixed sm:sticky inset-y-0 right-0 top-14 z-50 w-full sm:w-96 border-l border-gray-200 bg-white flex flex-col flex-shrink-0 h-[calc(100vh-56px)] overflow-hidden select-none animate-in slide-in-from-right-10 duration-150 shadow-2xl sm:shadow-none">
            
            {/* Sidebar Tabs: Post | SEO Score | Block */}
            <div className="flex items-center justify-between border-b border-gray-200 px-3 pt-2 bg-gray-50/80">
              <div className="flex gap-1">
                <button
                  type="button"
                  onClick={() => setSidebarTab('post')}
                  className={`px-3 py-2 text-xs font-bold transition-all border-b-2 cursor-pointer ${
                    sidebarTab === 'post'
                      ? 'border-[#007cba] text-[#007cba]'
                      : 'border-transparent text-gray-500 hover:text-gray-900'
                  }`}
                >
                  Post
                </button>

                {/* SEO RankMath-Style Tab with Live Score Badge */}
                <button
                  type="button"
                  onClick={() => setSidebarTab('seo')}
                  className={`px-3 py-2 text-xs font-bold transition-all border-b-2 flex items-center gap-1.5 cursor-pointer ${
                    sidebarTab === 'seo'
                      ? 'border-[#007cba] text-[#007cba]'
                      : 'border-transparent text-gray-500 hover:text-gray-900'
                  }`}
                >
                  <span>SEO</span>
                  <span
                    className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                      seoAudit.score >= 80
                        ? 'bg-emerald-100 text-emerald-800'
                        : seoAudit.score >= 50
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-rose-100 text-rose-800'
                    }`}
                  >
                    {seoAudit.score}/100
                  </span>
                </button>
              </div>

              <button
                type="button"
                onClick={() => setIsSidebarOpen(false)}
                className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-200 rounded-lg cursor-pointer"
                title="Close settings"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Sidebar Content (Scrollable Accordions) */}
            <div className="flex-1 overflow-y-auto divide-y divide-gray-100">
              
              {/* TAB 1: POST SETTINGS */}
              {sidebarTab === 'post' && (
                <>
                  {/* 1. Status & Visibility */}
                  <div className="p-4 space-y-3">
                    <button
                      type="button"
                      onClick={() => toggleSection('status')}
                      className="w-full flex items-center justify-between text-xs font-bold text-gray-900 cursor-pointer"
                    >
                      <span>Status & visibility</span>
                      {openSections.status ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
                    </button>

                    {openSections.status && (
                      <div className="space-y-3 pt-2 text-xs">
                        <div className="flex items-center justify-between text-gray-600">
                          <span>Status</span>
                          <select
                            value={status}
                            onChange={(e) => setStatus(e.target.value as any)}
                            className="px-2.5 py-1.5 bg-gray-50 border border-gray-200 rounded-lg font-semibold text-gray-800 outline-none text-base sm:text-xs"
                          >
                            <option value="DRAFT">Draft</option>
                            <option value="PUBLISHED">Published</option>
                            <option value="ARCHIVED">Archived</option>
                          </select>
                        </div>

                        <div className="flex items-center gap-2 pt-1">
                          <input
                            type="checkbox"
                            id="stickTop"
                            checked={isFeatured}
                            onChange={(e) => setIsFeatured(e.target.checked)}
                            className="w-4 h-4 text-[#007cba] rounded border-gray-300 cursor-pointer"
                          />
                          <label htmlFor="stickTop" className="text-gray-700 font-medium cursor-pointer">
                            Stick to the top of the blog (Featured)
                          </label>
                        </div>

                        <div className="pt-2 border-t border-gray-100 space-y-2">
                          <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                            Author Attribution
                          </label>
                          <input
                            type="text"
                            value={authorName}
                            onChange={(e) => setAuthorName(e.target.value)}
                            placeholder="Author name (default: FindYourExperts Editorial)"
                            className="w-full px-3 py-2 text-base sm:text-xs text-gray-800 border border-gray-200 rounded-lg outline-none focus:border-[#007cba]"
                          />
                          <input
                            type="text"
                            value={authorRole}
                            onChange={(e) => setAuthorRole(e.target.value)}
                            placeholder="Author role (e.g. Roofing Specialist)"
                            className="w-full px-3 py-2 text-base sm:text-xs text-gray-800 border border-gray-200 rounded-lg outline-none focus:border-[#007cba]"
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* 2. Permalink / Slug */}
                  <div className="p-4 space-y-3">
                    <button
                      type="button"
                      onClick={() => toggleSection('permalink')}
                      className="w-full flex items-center justify-between text-xs font-bold text-gray-900 cursor-pointer"
                    >
                      <span>Permalink</span>
                      {openSections.permalink ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
                    </button>

                    {openSections.permalink && (
                      <div className="space-y-2 pt-1 text-xs">
                        <label className="block text-[11px] text-gray-500">URL Slug</label>
                        <input
                          type="text"
                          value={slug}
                          onChange={(e) => {
                            setManualSlug(true);
                            setSlug(e.target.value);
                          }}
                          placeholder="article-url-slug"
                          className="w-full px-3 py-2 text-base sm:text-xs text-gray-800 border border-gray-200 rounded-lg outline-none focus:border-[#007cba]"
                        />
                        <div className="text-[11px] text-gray-400 break-all">
                          Preview: <span className="text-[#007cba]">/blog/{slug || 'url-slug'}</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* 3. Categories */}
                  <div className="p-4 space-y-3">
                    <button
                      type="button"
                      onClick={() => toggleSection('categories')}
                      className="w-full flex items-center justify-between text-xs font-bold text-gray-900 cursor-pointer"
                    >
                      <span>Categories</span>
                      {openSections.categories ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
                    </button>

                    {openSections.categories && (
                      <div className="space-y-2 pt-1 text-xs">
                        <div className="space-y-1.5 max-h-36 overflow-y-auto">
                          {availableCategories.length === 0 && (
                            <p className="text-[11px] text-gray-400">
                              No categories yet — add one below.
                            </p>
                          )}
                          {availableCategories.map((cat) => (
                            <label key={cat} className="flex items-center gap-2 cursor-pointer text-gray-700">
                              <input
                                type="radio"
                                name="category"
                                checked={category === cat && !customCategory}
                                onChange={() => {
                                  setCategory(cat);
                                  setCustomCategory('');
                                }}
                                className="text-[#007cba] cursor-pointer"
                              />
                              <span>{cat}</span>
                            </label>
                          ))}
                        </div>
                        <input
                          type="text"
                          value={customCategory}
                          onChange={(e) => setCustomCategory(e.target.value)}
                          placeholder="+ Add new category"
                          className="w-full px-3 py-2 text-base sm:text-xs text-gray-800 border border-gray-200 rounded-lg outline-none focus:border-[#007cba] mt-2"
                        />
                      </div>
                    )}
                  </div>

                  {/* 4. Tags */}
                  <div className="p-4 space-y-3">
                    <button
                      type="button"
                      onClick={() => toggleSection('tags')}
                      className="w-full flex items-center justify-between text-xs font-bold text-gray-900 cursor-pointer"
                    >
                      <span>Tags</span>
                      {openSections.tags ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
                    </button>

                    {openSections.tags && (
                      <div className="space-y-2 pt-1 text-xs">
                        <input
                          type="text"
                          value={tagInput}
                          onChange={(e) => setTagInput(e.target.value)}
                          onKeyDown={handleAddTag}
                          placeholder="Add new tag (press Enter)..."
                          className="w-full px-3 py-2 text-base sm:text-xs text-gray-800 border border-gray-200 rounded-lg outline-none focus:border-[#007cba]"
                        />
                        <div className="flex flex-wrap gap-1 pt-1">
                          {tags.map((t) => (
                            <span
                              key={t}
                              className="inline-flex items-center gap-1 text-[11px] font-semibold bg-gray-100 text-gray-700 px-2 py-0.5 rounded-md"
                            >
                              #{t}
                              <button
                                type="button"
                                onClick={() => handleRemoveTag(t)}
                                className="hover:text-rose-500 font-bold cursor-pointer"
                              >
                                ×
                              </button>
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* 5. Featured Image */}
                  <div className="p-4 space-y-3">
                    <button
                      type="button"
                      onClick={() => toggleSection('featuredImage')}
                      className="w-full flex items-center justify-between text-xs font-bold text-gray-900 cursor-pointer"
                    >
                      <span>Featured image</span>
                      {openSections.featuredImage ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
                    </button>

                    {openSections.featuredImage && (
                      <div className="space-y-2.5 pt-1 text-xs">
                        {coverImageUrl ? (
                          <div className="relative group rounded-lg overflow-hidden border border-gray-200">
                            <img
                              src={coverImageUrl}
                              alt={coverImageAlt || 'Featured'}
                              className="w-full h-32 object-cover"
                            />
                            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                              <button
                                type="button"
                                onClick={() => coverInputRef.current?.click()}
                                className="px-2.5 py-1 bg-white text-gray-900 rounded text-xs font-bold shadow-xs cursor-pointer"
                              >
                                Replace
                              </button>
                              <button
                                type="button"
                                onClick={() => setCoverImageUrl('')}
                                className="p-1 bg-rose-600 text-white rounded cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div
                            onClick={() => coverInputRef.current?.click()}
                            className="border-2 border-dashed border-gray-200 hover:border-[#007cba] rounded-lg p-5 text-center cursor-pointer transition-colors"
                          >
                            <ImageIcon className="w-6 h-6 text-gray-400 mx-auto mb-1.5" />
                            <span className="text-xs font-semibold text-[#007cba] block">
                              Set featured image
                            </span>
                            <span className="text-[10px] text-gray-400">
                              Upload JPG, PNG or WebP
                            </span>
                          </div>
                        )}

                        <input
                          ref={coverInputRef}
                          type="file"
                          accept="image/*"
                          onChange={handleCoverUpload}
                          className="hidden"
                        />

                        {isUploadingCover && (
                          <div className="text-[11px] text-[#007cba] font-semibold flex items-center gap-1">
                            <Upload className="w-3 h-3 animate-bounce" />
                            <span>Uploading to Cloudflare R2...</span>
                          </div>
                        )}

                        {coverImageUrl && (
                          <input
                            type="text"
                            value={coverImageAlt}
                            onChange={(e) => setCoverImageAlt(e.target.value)}
                            placeholder="Alt text (alternative description)"
                            className="w-full px-3 py-2 text-base sm:text-xs text-gray-800 border border-gray-200 rounded-lg outline-none focus:border-[#007cba]"
                          />
                        )}
                      </div>
                    )}
                  </div>

                  {/* 6. Excerpt */}
                  <div className="p-4 space-y-3">
                    <button
                      type="button"
                      onClick={() => toggleSection('excerpt')}
                      className="w-full flex items-center justify-between text-xs font-bold text-gray-900 cursor-pointer"
                    >
                      <span>Excerpt</span>
                      {openSections.excerpt ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
                    </button>

                    {openSections.excerpt && (
                      <div className="space-y-2 pt-1 text-xs">
                        <textarea
                          value={excerpt}
                          onChange={(e) => setExcerpt(e.target.value)}
                          rows={3}
                          placeholder="Write an excerpt (optional summary)..."
                          className="w-full px-3 py-2 text-base sm:text-xs text-gray-800 border border-gray-200 rounded-lg outline-none focus:border-[#007cba] resize-none"
                        />
                      </div>
                    )}
                  </div>
                </>
              )}

              {/* TAB 2: RANKMATH / YOAST-STYLE SEO ANALYZER */}
              {sidebarTab === 'seo' && (
                <div className="p-4 space-y-5">
                  
                  {/* SEO Overall Score Card */}
                  <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white rounded-xl p-4 shadow-sm space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Compass className="w-4 h-4 text-[#007cba]" />
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
                          SEO Rank Score
                        </span>
                      </div>
                      <span
                        className={`text-xs font-black px-2 py-0.5 rounded-full ${
                          seoAudit.score >= 80
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                            : seoAudit.score >= 50
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                            : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                        }`}
                      >
                        {seoAudit.score >= 80
                          ? 'Rank Ready'
                          : seoAudit.score >= 50
                          ? 'Fair / Needs Work'
                          : 'Poor / Fix Issues'}
                      </span>
                    </div>

                    <div className="flex items-end justify-between pt-1">
                      <div className="text-3xl font-black tracking-tight">
                        {seoAudit.score} <span className="text-sm font-semibold text-slate-400">/ 100</span>
                      </div>
                      <span className="text-[11px] text-slate-400 font-medium">
                        {wordCount} words • {seoAudit.keywordCount} focus matches
                      </span>
                    </div>

                    {/* Score Bar */}
                    <div className="w-full bg-slate-700/60 h-2 rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all duration-300 ${
                          seoAudit.score >= 80
                            ? 'bg-emerald-400'
                            : seoAudit.score >= 50
                            ? 'bg-amber-400'
                            : 'bg-rose-400'
                        }`}
                        style={{ width: `${seoAudit.score}%` }}
                      />
                    </div>
                  </div>

                  {/* Focus Keyword Input */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center">
                      <label className="text-xs font-bold text-gray-800">Focus Keyword</label>
                      {focusKeyword && (
                        <span className="text-[11px] text-gray-500 font-medium">
                          Density: <strong className="text-gray-900">{seoAudit.keywordDensity}%</strong> ({seoAudit.keywordCount}x)
                        </span>
                      )}
                    </div>
                    <div className="relative">
                      <input
                        type="text"
                        value={focusKeyword}
                        onChange={(e) => setFocusKeyword(e.target.value)}
                        placeholder="e.g. NYC flat roof repair"
                        className="w-full pl-8 pr-3 py-2 text-base sm:text-xs text-gray-800 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-[#007cba]/20 focus:border-[#007cba]"
                      />
                      <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-2.5 sm:top-2" />
                    </div>
                    <p className="text-[10px] text-gray-400">
                      The primary search term you want this article to rank for on Google.
                    </p>
                  </div>

                  {/* Interactive SEO Checklist */}
                  <div className="space-y-3 pt-2">
                    <div className="text-xs font-bold text-gray-900 uppercase tracking-wider flex items-center justify-between border-b border-gray-100 pb-2">
                      <span>SEO Audit Checklist</span>
                    </div>

                    <div className="space-y-2 text-xs">
                      {/* Check 1: Keyword in Title */}
                      <div className="flex items-start gap-2">
                        {seoAudit.checks.keywordInTitle ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                        ) : (
                          <XCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                        )}
                        <span className={seoAudit.checks.keywordInTitle ? 'text-gray-700' : 'text-gray-500'}>
                          Focus Keyword in SEO Title
                        </span>
                      </div>

                      {/* Check 2: Keyword in Meta Description */}
                      <div className="flex items-start gap-2">
                        {seoAudit.checks.keywordInDesc ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                        ) : (
                          <XCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                        )}
                        <span className={seoAudit.checks.keywordInDesc ? 'text-gray-700' : 'text-gray-500'}>
                          Focus Keyword in Meta Description
                        </span>
                      </div>

                      {/* Check 3: Keyword in URL Slug */}
                      <div className="flex items-start gap-2">
                        {seoAudit.checks.keywordInSlug ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                        ) : (
                          <XCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                        )}
                        <span className={seoAudit.checks.keywordInSlug ? 'text-gray-700' : 'text-gray-500'}>
                          Focus Keyword in URL Slug
                        </span>
                      </div>

                      {/* Check 4: Keyword in First 10% */}
                      <div className="flex items-start gap-2">
                        {seoAudit.checks.keywordInIntro ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                        ) : (
                          <XCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                        )}
                        <span className={seoAudit.checks.keywordInIntro ? 'text-gray-700' : 'text-gray-500'}>
                          Focus Keyword in Introduction (first 10%)
                        </span>
                      </div>

                      {/* Check 5: Keyword in Headings */}
                      <div className="flex items-start gap-2">
                        {seoAudit.checks.keywordInHeadings ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                        ) : (
                          <XCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                        )}
                        <span className={seoAudit.checks.keywordInHeadings ? 'text-gray-700' : 'text-gray-500'}>
                          Focus Keyword in H2/H3 subheadings
                        </span>
                      </div>

                      {/* Check 6: Word Count */}
                      <div className="flex items-start gap-2">
                        {seoAudit.checks.wordCount ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                        ) : seoAudit.checks.wordCountModerate ? (
                          <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                        ) : (
                          <XCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                        )}
                        <span className={seoAudit.checks.wordCount ? 'text-gray-700' : 'text-gray-500'}>
                          Content Length ({wordCount} / min 600 words)
                        </span>
                      </div>

                      {/* Check 7: Keyword Density */}
                      <div className="flex items-start gap-2">
                        {seoAudit.checks.keywordDensity ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                        ) : (
                          <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                        )}
                        <span className={seoAudit.checks.keywordDensity ? 'text-gray-700' : 'text-gray-500'}>
                          Keyword Density ({seoAudit.keywordDensity}%, ideal 0.8% - 2.5%)
                        </span>
                      </div>

                      {/* Check 8: Featured Image & Alt */}
                      <div className="flex items-start gap-2">
                        {seoAudit.checks.hasImageAlt ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                        ) : (
                          <XCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                        )}
                        <span className={seoAudit.checks.hasImageAlt ? 'text-gray-700' : 'text-gray-500'}>
                          Featured image with descriptive Alt text
                        </span>
                      </div>

                      {/* Check 9: Internal / External Links */}
                      <div className="flex items-start gap-2">
                        {seoAudit.checks.hasLinks ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                        ) : (
                          <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                        )}
                        <span className={seoAudit.checks.hasLinks ? 'text-gray-700' : 'text-gray-500'}>
                          Internal or External Links ({seoAudit.linkCount} links)
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Meta Title & Description Inputs */}
                  <div className="space-y-3 pt-3 border-t border-gray-100">
                    <div>
                      <div className="flex justify-between text-[11px] mb-1">
                        <label className="font-bold text-gray-700">SEO Meta Title</label>
                        <span className={activeMetaTitle.length <= 60 ? 'text-emerald-600 font-semibold' : 'text-rose-500 font-semibold'}>
                          {activeMetaTitle.length} / 60
                        </span>
                      </div>
                      <input
                        type="text"
                        value={metaTitle}
                        onChange={(e) => setMetaTitle(e.target.value)}
                        placeholder={title || 'Leave blank to use article title'}
                        className="w-full px-3 py-2 text-base sm:text-xs text-gray-800 border border-gray-300 rounded-lg outline-none focus:border-[#007cba]"
                      />
                      <div className="w-full bg-gray-100 h-1 rounded-full mt-1 overflow-hidden">
                        <div
                          className={`h-full ${activeMetaTitle.length <= 60 ? 'bg-emerald-500' : 'bg-rose-500'}`}
                          style={{ width: `${Math.min(100, (activeMetaTitle.length / 60) * 100)}%` }}
                        />
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between text-[11px] mb-1">
                        <label className="font-bold text-gray-700">SEO Meta Description</label>
                        <span className={activeMetaDescription.length <= 160 ? 'text-emerald-600 font-semibold' : 'text-rose-500 font-semibold'}>
                          {activeMetaDescription.length} / 160
                        </span>
                      </div>
                      <textarea
                        value={metaDescription}
                        onChange={(e) => setMetaDescription(e.target.value)}
                        rows={3}
                        placeholder={excerpt || 'Meta description for Google...'}
                        className="w-full px-3 py-2 text-base sm:text-xs text-gray-800 border border-gray-300 rounded-lg outline-none focus:border-[#007cba] resize-none"
                      />
                      <div className="w-full bg-gray-100 h-1 rounded-full mt-1 overflow-hidden">
                        <div
                          className={`h-full ${activeMetaDescription.length <= 160 ? 'bg-emerald-500' : 'bg-rose-500'}`}
                          style={{ width: `${Math.min(100, (activeMetaDescription.length / 160) * 100)}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Live Google & Social Preview Card */}
                  <div className="space-y-2 pt-3 border-t border-gray-100">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-gray-900">SERP Snippet Preview</span>
                      <div className="flex items-center gap-1 bg-gray-100 p-0.5 rounded text-[11px]">
                        <button
                          type="button"
                          onClick={() => setSerpPreviewMode('google')}
                          className={`px-2 py-0.5 rounded font-semibold cursor-pointer ${
                            serpPreviewMode === 'google' ? 'bg-white shadow-xs text-gray-900' : 'text-gray-500'
                          }`}
                        >
                          Google
                        </button>
                        <button
                          type="button"
                          onClick={() => setSerpPreviewMode('social')}
                          className={`px-2 py-0.5 rounded font-semibold cursor-pointer ${
                            serpPreviewMode === 'social' ? 'bg-white shadow-xs text-gray-900' : 'text-gray-500'
                          }`}
                        >
                          Social Card
                        </button>
                      </div>
                    </div>

                    {serpPreviewMode === 'google' ? (
                      /* Google Search Snippet Preview */
                      <div className="p-3 bg-white border border-gray-200 rounded-lg shadow-xs space-y-1">
                        <div className="flex items-center gap-1.5 text-[11px] text-gray-600">
                          <div className="w-3.5 h-3.5 rounded-full bg-[#007cba] text-white text-[8px] font-black flex items-center justify-center">
                            F
                          </div>
                          <span className="text-gray-800 font-medium">FindYourExperts</span>
                          <span className="text-gray-400">› blog › {slug || 'article'}</span>
                        </div>
                        <h4 className="text-xs font-semibold text-[#1a0dab] line-clamp-1 hover:underline cursor-pointer">
                          {activeMetaTitle || <span className="text-gray-300">Add a title to preview</span>}
                        </h4>
                        <p className="text-[11px] text-gray-600 line-clamp-2 leading-relaxed">
                          {activeMetaDescription || <span className="text-gray-300">Add an excerpt or meta description to preview</span>}
                        </p>
                      </div>
                    ) : (
                      /* Social Card Preview (Facebook/Twitter) */
                      <div className="border border-gray-200 rounded-lg overflow-hidden shadow-xs bg-white">
                        <div className="h-28 bg-gray-100 flex items-center justify-center overflow-hidden">
                          {coverImageUrl || ogImageUrl ? (
                            <img
                              src={ogImageUrl || coverImageUrl}
                              alt="Social preview"
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <span className="text-xs text-gray-400">No share image set</span>
                          )}
                        </div>
                        <div className="p-2.5 space-y-1 bg-gray-50">
                          <div className="text-[10px] uppercase font-bold text-gray-400">FINDYOUREXPERTS.COM</div>
                          <div className="text-xs font-bold text-gray-900 line-clamp-1">{activeMetaTitle || <span className="text-gray-300">Add a title</span>}</div>
                          <div className="text-[11px] text-gray-500 line-clamp-2">{activeMetaDescription}</div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Advanced SEO: Canonical URL & Social OG Image */}
                  <div className="space-y-3 pt-3 border-t border-gray-100">
                    <div className="text-xs font-bold text-gray-900">Advanced Technical SEO</div>
                    <div>
                      <label className="block text-[11px] text-gray-600 mb-1">Custom Canonical URL</label>
                      <input
                        type="text"
                        value={canonicalUrl}
                        onChange={(e) => setCanonicalUrl(e.target.value)}
                        placeholder={`https://findyourexperts.com/blog/${slug || 'slug'}`}
                        className="w-full px-3 py-2 text-base sm:text-xs text-gray-800 border border-gray-300 rounded-lg outline-none focus:border-[#007cba]"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] text-gray-600 mb-1">Social Share Image (OG)</label>
                      <div className="flex gap-1.5">
                        <input
                          type="text"
                          value={ogImageUrl}
                          onChange={(e) => setOgImageUrl(e.target.value)}
                          placeholder="Leave blank to use Featured Image"
                          className="flex-1 min-w-0 px-3 py-2 text-base sm:text-xs text-gray-800 border border-gray-300 rounded-lg outline-none focus:border-[#007cba]"
                        />
                        <button
                          type="button"
                          onClick={() => ogInputRef.current?.click()}
                          disabled={isUploadingOg}
                          className="px-3 py-2 text-xs font-semibold text-[#007cba] border border-[#007cba]/40 hover:bg-blue-50 rounded-lg flex items-center gap-1 disabled:opacity-50 cursor-pointer shrink-0"
                          title="Upload social image (1200×630 recommended)"
                        >
                          <Upload className={`w-3.5 h-3.5 ${isUploadingOg ? 'animate-bounce' : ''}`} />
                          <span className="hidden sm:inline">{isUploadingOg ? '...' : 'Upload'}</span>
                        </button>
                        <input
                          ref={ogInputRef}
                          type="file"
                          accept="image/*"
                          onChange={handleOgUpload}
                          className="hidden"
                        />
                      </div>
                      <p className="text-[10px] text-gray-400 mt-1">Recommended size: 1200×630px</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </aside>
        )}
      </div>

      {/* WordPress Gutenberg Live Reader Preview Modal */}
      {isPreviewOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex flex-col animate-in fade-in duration-150">
          
          {/* Modal Header with Device Switcher */}
          <div className="h-14 bg-white border-b border-gray-200 px-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-xs font-bold uppercase tracking-wider text-gray-500">
                Live Preview
              </span>
              <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-lg">
                <button
                  type="button"
                  onClick={() => setPreviewDevice('desktop')}
                  className={`p-1.5 rounded cursor-pointer ${
                    previewDevice === 'desktop' ? 'bg-white shadow-xs text-gray-900' : 'text-gray-500'
                  }`}
                  title="Desktop Preview"
                >
                  <Laptop className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewDevice('tablet')}
                  className={`p-1.5 rounded cursor-pointer ${
                    previewDevice === 'tablet' ? 'bg-white shadow-xs text-gray-900' : 'text-gray-500'
                  }`}
                  title="Tablet Preview"
                >
                  <Tablet className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewDevice('mobile')}
                  className={`p-1.5 rounded cursor-pointer ${
                    previewDevice === 'mobile' ? 'bg-white shadow-xs text-gray-900' : 'text-gray-500'
                  }`}
                  title="Mobile Preview"
                >
                  <Smartphone className="w-4 h-4" />
                </button>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsPreviewOpen(false)}
              className="p-1.5 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-md cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Modal Body Canvas */}
          <div className="flex-1 overflow-y-auto bg-gray-100 p-4 sm:p-8 flex justify-center items-start">
            <div
              className={`bg-white rounded-2xl shadow-xl overflow-hidden transition-all duration-200 ${
                previewDevice === 'desktop'
                  ? 'w-full max-w-4xl p-8 sm:p-14'
                  : previewDevice === 'tablet'
                  ? 'w-full max-w-2xl p-6 sm:p-10'
                  : 'w-full max-w-sm p-5'
              }`}
            >
              {/* Category & Read Time */}
              <div className="flex items-center gap-2 text-xs font-semibold text-gray-500 mb-3">
                <span className="text-[#007cba] font-bold uppercase tracking-wider">
                  {customCategory || category}
                </span>
                <span>•</span>
                <span>{readingTimeMin} min read</span>
              </div>

              {/* Title */}
              <h1 className="text-2xl sm:text-4xl font-black text-gray-950 tracking-tight leading-tight mb-6">
                {title || <span className="text-gray-300">Add a title</span>}
              </h1>

              {/* Author Attribution */}
              <div className="flex items-center gap-3 py-3 border-y border-gray-100 mb-6">
                <div className="w-9 h-9 rounded-full bg-blue-50 text-[#007cba] font-bold flex items-center justify-center text-xs">
                  {(authorName || 'FindYourExperts Editorial')[0]}
                </div>
                <div>
                  <div className="text-xs font-bold text-gray-900">{authorName || 'FindYourExperts Editorial'}</div>
                  {authorRole && <div className="text-[11px] text-gray-500">{authorRole}</div>}
                </div>
              </div>

              {/* Cover Image */}
              {coverImageUrl && (
                <div className="mb-6 rounded-xl overflow-hidden border border-gray-200">
                  <img src={coverImageUrl} alt={coverImageAlt || title} className="w-full max-h-[400px] object-cover" />
                </div>
              )}

              {/* Excerpt */}
              {excerpt && (
                <div className="bg-slate-50 border-l-4 border-[#007cba] p-4 rounded-r-lg mb-6 text-sm font-medium text-slate-700 italic">
                  "{excerpt}"
                </div>
              )}

              {/* Rendered HTML Article Content */}
              <div
                className="prose prose-slate max-w-none text-gray-800 text-sm sm:text-base leading-relaxed"
                dangerouslySetInnerHTML={{ __html: content }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
