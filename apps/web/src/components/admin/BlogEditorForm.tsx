'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
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
} from 'lucide-react';
import type { BlogPost, CreateBlogPostInput, UpdateBlogPostInput } from '@repo/types';
import {
  createAdminBlog,
  updateAdminBlog,
  uploadImageToStorage,
} from '@/lib/blogs-api';
import TiptapEditor from './TiptapEditor';

interface BlogEditorFormProps {
  initialData?: BlogPost;
  isEditMode?: boolean;
}

const POPULAR_CATEGORIES = [
  'Roofing Tips',
  'Cost Guides',
  'Hiring Advice',
  'NYC Regulations',
  'Home Maintenance',
  'Commercial Roofing',
];

export default function BlogEditorForm({ initialData, isEditMode = false }: BlogEditorFormProps) {
  const router = useRouter();

  // Form State
  const [title, setTitle] = useState(initialData?.title || '');
  const [slug, setSlug] = useState(initialData?.slug || '');
  const [manualSlug, setManualSlug] = useState(false);
  const [excerpt, setExcerpt] = useState(initialData?.excerpt || '');
  const [content, setContent] = useState(
    initialData?.content ||
      '<h2>Introduction</h2><p>Write your expert roofing advice and project guide here...</p>'
  );
  const [coverImageUrl, setCoverImageUrl] = useState(initialData?.coverImageUrl || '');
  const [coverImageAlt, setCoverImageAlt] = useState(initialData?.coverImageAlt || '');
  const [authorName, setAuthorName] = useState(initialData?.authorName || 'FindYourExperts Editorial');
  const [authorRole, setAuthorRole] = useState(initialData?.authorRole || 'Senior Building Specialist');
  const [category, setCategory] = useState(initialData?.category || 'Roofing Tips');
  const [customCategory, setCustomCategory] = useState('');
  const [tags, setTags] = useState<string[]>(initialData?.tags || ['Roofing', 'NYC']);
  const [tagInput, setTagInput] = useState('');
  const [isFeatured, setIsFeatured] = useState(initialData?.isFeatured || false);
  const [status, setStatus] = useState<'DRAFT' | 'PUBLISHED' | 'ARCHIVED'>(
    initialData?.status || 'DRAFT'
  );

  // SEO State
  const [metaTitle, setMetaTitle] = useState(initialData?.metaTitle || '');
  const [metaDescription, setMetaDescription] = useState(initialData?.metaDescription || '');
  const [focusKeyword, setFocusKeyword] = useState(initialData?.focusKeyword || '');
  const [serpPreviewMode, setSerpPreviewMode] = useState<'desktop' | 'mobile'>('desktop');

  // UI state
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [activeTab, setActiveTab] = useState<'content' | 'seo' | 'preview'>('content');

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto slugify when title changes (unless user typed a manual slug)
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

  // Set default meta tags based on title and excerpt if left empty
  const activeMetaTitle = metaTitle || title || 'Untitled Blog Post';
  const activeMetaDescription =
    metaDescription ||
    excerpt ||
    'Read expert roofing tips, cost estimates, and maintenance advice from FindYourExperts NYC.';

  // Word count & Reading time
  const plainText = content.replace(/<[^>]+>/g, ' ').trim();
  const wordCount = plainText ? plainText.split(/\s+/).filter(Boolean).length : 0;
  const readingTimeMin = Math.max(1, Math.ceil(wordCount / 200));

  // Handle Cover Image Upload
  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsUploadingImage(true);
      setErrorMsg('');
      const url = await uploadImageToStorage(file, 'blog-covers');
      setCoverImageUrl(url);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to upload cover image');
    } finally {
      setIsUploadingImage(false);
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

    const effectiveStatus = targetStatus || status;

    const payload: CreateBlogPostInput | UpdateBlogPostInput = {
      title,
      slug: slug || undefined,
      excerpt: excerpt || undefined,
      content: content || '<p>Write your article here...</p>',
      coverImageUrl: coverImageUrl || undefined,
      coverImageAlt: coverImageAlt || undefined,
      authorName: authorName || 'FindYourExperts Editorial',
      authorRole: authorRole || 'Senior Building Specialist',
      category: customCategory.trim() || category,
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
          ? '🎉 Blog post published live successfully!'
          : '💾 Draft saved successfully!'
      );

      setTimeout(() => {
        if (!isEditMode && savedPost?.id) {
          router.push(`/admin/blogs/${savedPost.id}`);
        }
      }, 1200);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to save blog post');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-24 font-sans">
      {/* Top Sticky Header */}
      <div className="sticky top-0 z-30 bg-white border-b border-gray-200 px-4 sm:px-8 py-3.5 shadow-xs">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push('/admin/blogs')}
              className="flex items-center gap-1.5 text-xs font-bold text-gray-600 hover:text-gray-900 bg-gray-100 hover:bg-gray-200 px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Posts</span>
            </button>
            <div className="hidden sm:flex items-center gap-2">
              <span
                className={`text-xs font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full ${
                  status === 'PUBLISHED'
                    ? 'bg-emerald-100 text-emerald-800'
                    : status === 'DRAFT'
                    ? 'bg-amber-100 text-amber-800'
                    : 'bg-gray-100 text-gray-800'
                }`}
              >
                {status}
              </span>
              <div className="text-xs text-gray-400 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                <span>
                  {readingTimeMin} min read ({wordCount} words)
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            {saveSuccessMsg && (
              <span className="text-xs font-semibold text-emerald-600 flex items-center gap-1 animate-fade-in">
                <CheckCircle className="w-4 h-4" />
                {saveSuccessMsg}
              </span>
            )}
            {errorMsg && (
              <span className="text-xs font-semibold text-rose-600 flex items-center gap-1">
                <AlertCircle className="w-4 h-4" />
                {errorMsg}
              </span>
            )}

            {isEditMode && initialData?.slug && status === 'PUBLISHED' && (
              <a
                href={`/blog/${initialData.slug}`}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1 text-xs font-semibold text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 px-3 py-2 rounded-lg transition-colors"
              >
                <Eye className="w-3.5 h-3.5 text-gray-500" />
                <span>Live View</span>
              </a>
            )}

            <button
              onClick={() => handleSave('DRAFT')}
              disabled={isSaving}
              className="flex items-center gap-1.5 text-xs font-bold text-gray-800 bg-gray-100 hover:bg-gray-200 px-4 py-2 rounded-lg transition-colors disabled:opacity-50 cursor-pointer"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Save Draft</span>
            </button>

            <button
              onClick={() => handleSave('PUBLISHED')}
              disabled={isSaving}
              className="flex items-center gap-1.5 text-xs font-bold text-white bg-primary hover:bg-primary-dark shadow-xs px-5 py-2 rounded-lg transition-colors disabled:opacity-50 cursor-pointer"
            >
              <Globe className="w-3.5 h-3.5" />
              <span>{status === 'PUBLISHED' ? 'Update Live' : 'Publish Live'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Form Container */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left 2 Cols: Title, Rich Content & SEO Tabs */}
          <div className="lg:col-span-2 space-y-6">
            {/* Title & Slug Box */}
            <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-xs space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                  Article Title <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. NYC Flat Roof Replacement Cost Guide 2026"
                  className="w-full px-4 py-3 text-lg font-bold text-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all placeholder:text-gray-300 placeholder:font-normal"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1 flex items-center justify-between">
                  <span>URL Slug (Web Address)</span>
                  <span className="text-[11px] text-gray-400">Auto-generated from title</span>
                </label>
                <div className="flex items-center rounded-lg border border-gray-200 bg-gray-50 px-3 py-1.5 text-xs text-gray-600 font-mono">
                  <span className="text-gray-400 select-none">findyourexperts.com/blog/</span>
                  <input
                    type="text"
                    value={slug}
                    onChange={(e) => {
                      setManualSlug(true);
                      setSlug(e.target.value);
                    }}
                    placeholder="url-slug"
                    className="flex-1 bg-transparent border-none outline-none font-mono text-gray-900 px-1 font-semibold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                  Short Excerpt / Summary
                </label>
                <textarea
                  value={excerpt}
                  onChange={(e) => setExcerpt(e.target.value)}
                  rows={2}
                  placeholder="A 2-3 sentence overview that appears in search results and post cards..."
                  className="w-full px-3.5 py-2.5 text-xs text-gray-800 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                />
              </div>
            </div>

            {/* Navigation Tabs (Content vs SEO vs Live SERP) */}
            <div className="flex items-center gap-2 border-b border-gray-200 pb-2">
              <button
                type="button"
                onClick={() => setActiveTab('content')}
                className={`flex items-center gap-1.5 text-xs font-bold px-4 py-2 rounded-lg transition-colors cursor-pointer ${
                  activeTab === 'content'
                    ? 'bg-primary text-white shadow-xs'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Tiptap Editor</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('seo')}
                className={`flex items-center gap-1.5 text-xs font-bold px-4 py-2 rounded-lg transition-colors cursor-pointer ${
                  activeTab === 'seo'
                    ? 'bg-primary text-white shadow-xs'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>SEO & Google Preview</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('preview')}
                className={`flex items-center gap-1.5 text-xs font-bold px-4 py-2 rounded-lg transition-colors cursor-pointer ${
                  activeTab === 'preview'
                    ? 'bg-primary text-white shadow-xs'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                <Eye className="w-3.5 h-3.5" />
                <span>Live Reader Preview</span>
              </button>
            </div>

            {/* Tab 1: Rock-Solid Tiptap Editor */}
            {activeTab === 'content' && (
              <TiptapEditor
                content={content}
                onChange={(html) => setContent(html)}
                placeholder="Write your article, guides, and cost tips here..."
              />
            )}

            {/* Tab 2: SEO Settings & Google SERP Preview */}
            {activeTab === 'seo' && (
              <div className="space-y-6">
                <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-xs space-y-5">
                  <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                    <div>
                      <h3 className="text-sm font-black text-gray-900">
                        Search Engine Optimization (SEO)
                      </h3>
                      <p className="text-xs text-gray-500">
                        Fine-tune how Google and social platforms display your article
                      </p>
                    </div>
                    <span className="text-xs font-bold text-primary bg-primary/10 px-2.5 py-1 rounded-full">
                      Built-in Yoast Alternative
                    </span>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">
                      Focus Keyword (Optional)
                    </label>
                    <input
                      type="text"
                      value={focusKeyword}
                      onChange={(e) => setFocusKeyword(e.target.value)}
                      placeholder="e.g. NYC flat roof repair cost"
                      className="w-full px-3.5 py-2 text-xs text-gray-800 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary outline-none"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-bold text-gray-700">SEO Meta Title</label>
                      <span
                        className={`text-[11px] font-semibold ${
                          activeMetaTitle.length <= 60 ? 'text-emerald-600' : 'text-rose-500'
                        }`}
                      >
                        {activeMetaTitle.length} / 60 characters
                      </span>
                    </div>
                    <input
                      type="text"
                      value={metaTitle}
                      onChange={(e) => setMetaTitle(e.target.value)}
                      placeholder={title || 'Leave blank to use article title'}
                      className="w-full px-3.5 py-2 text-xs text-gray-800 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary outline-none"
                    />
                    <div className="w-full bg-gray-100 h-1 rounded-full mt-1.5 overflow-hidden">
                      <div
                        className={`h-full transition-all ${
                          activeMetaTitle.length <= 60 ? 'bg-emerald-500' : 'bg-rose-500'
                        }`}
                        style={{ width: `${Math.min(100, (activeMetaTitle.length / 60) * 100)}%` }}
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-bold text-gray-700">SEO Meta Description</label>
                      <span
                        className={`text-[11px] font-semibold ${
                          activeMetaDescription.length <= 160
                            ? 'text-emerald-600'
                            : 'text-rose-500'
                        }`}
                      >
                        {activeMetaDescription.length} / 160 characters
                      </span>
                    </div>
                    <textarea
                      value={metaDescription}
                      onChange={(e) => setMetaDescription(e.target.value)}
                      rows={3}
                      placeholder={excerpt || 'Leave blank to use article excerpt'}
                      className="w-full px-3.5 py-2 text-xs text-gray-800 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary outline-none"
                    />
                    <div className="w-full bg-gray-100 h-1 rounded-full mt-1.5 overflow-hidden">
                      <div
                        className={`h-full transition-all ${
                          activeMetaDescription.length <= 160 ? 'bg-emerald-500' : 'bg-rose-500'
                        }`}
                        style={{
                          width: `${Math.min(100, (activeMetaDescription.length / 160) * 100)}%`,
                        }}
                      />
                    </div>
                  </div>
                </div>

                {/* Live Google SERP Box */}
                <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-xs space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-gray-800 uppercase tracking-wider flex items-center gap-1.5">
                      <Globe className="w-4 h-4 text-primary" />
                      <span>Live Google Search Snippet Preview</span>
                    </h4>
                    <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-lg text-xs">
                      <button
                        type="button"
                        onClick={() => setSerpPreviewMode('desktop')}
                        className={`px-2.5 py-0.5 rounded font-semibold cursor-pointer ${
                          serpPreviewMode === 'desktop'
                            ? 'bg-white text-gray-900 shadow-xs'
                            : 'text-gray-500'
                        }`}
                      >
                        Desktop
                      </button>
                      <button
                        type="button"
                        onClick={() => setSerpPreviewMode('mobile')}
                        className={`px-2.5 py-0.5 rounded font-semibold cursor-pointer ${
                          serpPreviewMode === 'mobile'
                            ? 'bg-white text-gray-900 shadow-xs'
                            : 'text-gray-500'
                        }`}
                      >
                        Mobile
                      </button>
                    </div>
                  </div>

                  <div
                    className={`p-4 bg-white border border-gray-200 rounded-lg ${
                      serpPreviewMode === 'mobile' ? 'max-w-sm mx-auto' : ''
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1 text-[11px] text-gray-600">
                      <div className="w-4 h-4 rounded-full bg-primary text-white text-[9px] font-black flex items-center justify-center">
                        F
                      </div>
                      <span className="font-semibold text-gray-800">FindYourExperts</span>
                      <span className="text-gray-400">
                        https://findyourexperts.com › blog › {slug || 'post'}
                      </span>
                    </div>
                    <div className="text-blue-700 hover:underline font-medium text-base leading-snug cursor-pointer line-clamp-1">
                      {activeMetaTitle}
                    </div>
                    <div className="text-xs text-gray-600 mt-1 leading-relaxed line-clamp-2">
                      <span className="text-gray-400">
                        {new Date().toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}{' '}
                        —{' '}
                      </span>
                      {activeMetaDescription}
                    </div>
                  </div>
                </div>

                {/* Social Card Preview */}
                <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-xs space-y-3">
                  <h4 className="text-xs font-bold text-gray-800 uppercase tracking-wider flex items-center gap-1.5">
                    <Share2 className="w-4 h-4 text-primary" />
                    <span>Social Media Card (WhatsApp / X / LinkedIn)</span>
                  </h4>
                  <div className="max-w-md border border-gray-200 rounded-xl overflow-hidden bg-gray-50 shadow-xs">
                    {coverImageUrl ? (
                      <img
                        src={coverImageUrl}
                        alt="Cover Preview"
                        className="w-full h-44 object-cover"
                      />
                    ) : (
                      <div className="w-full h-44 bg-gray-200 flex items-center justify-center text-gray-400 text-xs font-semibold">
                        No Cover Image Selected
                      </div>
                    )}
                    <div className="p-3.5 bg-white space-y-1">
                      <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">
                        findyourexperts.com
                      </span>
                      <p className="text-xs font-bold text-gray-900 line-clamp-1">
                        {activeMetaTitle}
                      </p>
                      <p className="text-[11px] text-gray-500 line-clamp-2">
                        {activeMetaDescription}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Tab 3: Reader Preview */}
            {activeTab === 'preview' && (
              <div className="bg-white rounded-xl border border-gray-200 p-8 shadow-xs space-y-6">
                {coverImageUrl && (
                  <img
                    src={coverImageUrl}
                    alt={title}
                    className="w-full max-h-80 object-cover rounded-xl"
                  />
                )}
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-primary bg-primary/10 px-3 py-1 rounded-full">
                    {category}
                  </span>
                  <span className="text-xs text-gray-400">•</span>
                  <span className="text-xs text-gray-500">{readingTimeMin} min read</span>
                </div>
                <h1 className="text-2xl sm:text-3xl font-black text-gray-950">
                  {title || 'Untitled Article'}
                </h1>
                <div className="flex items-center gap-3 py-3 border-y border-gray-100">
                  <div className="w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs">
                    {authorName[0]}
                  </div>
                  <div>
                    <div className="text-xs font-bold text-gray-900">{authorName}</div>
                    <div className="text-[11px] text-gray-500">{authorRole}</div>
                  </div>
                </div>
                <div
                  className="prose prose-slate max-w-none text-gray-800 text-sm leading-relaxed"
                  dangerouslySetInnerHTML={{ __html: content }}
                />
              </div>
            )}
          </div>

          {/* Right Col: Meta Settings (Cover, Categories, Tags, Author) */}
          <div className="space-y-6">
            {/* Cover Image Uploader */}
            <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-xs space-y-3.5">
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center justify-between">
                <span>Featured Cover Image</span>
                {coverImageUrl && (
                  <button
                    type="button"
                    onClick={() => setCoverImageUrl('')}
                    className="text-rose-500 hover:text-rose-700 text-[11px] font-semibold flex items-center gap-0.5 cursor-pointer"
                  >
                    <Trash2 className="w-3 h-3" />
                    Remove
                  </button>
                )}
              </label>

              {coverImageUrl ? (
                <div className="relative group rounded-lg overflow-hidden border border-gray-200">
                  <img
                    src={coverImageUrl}
                    alt="Cover Preview"
                    className="w-full h-44 object-cover"
                  />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="bg-white text-gray-900 text-xs font-bold px-3 py-1.5 rounded-lg shadow-sm cursor-pointer"
                    >
                      Change Image
                    </button>
                  </div>
                </div>
              ) : (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed border-gray-300 hover:border-primary rounded-xl p-6 text-center cursor-pointer transition-colors ${
                    isUploadingImage ? 'opacity-50 pointer-events-none' : ''
                  }`}
                >
                  <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-xs font-bold text-gray-700">Click to upload cover image</p>
                  <p className="text-[11px] text-gray-400 mt-0.5">PNG, JPG, WebP up to 5MB</p>
                </div>
              )}

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleCoverUpload}
                className="hidden"
              />

              {isUploadingImage && (
                <div className="text-xs text-primary font-semibold text-center animate-pulse">
                  Uploading image to Cloudflare R2...
                </div>
              )}

              <div>
                <label className="block text-[11px] font-medium text-gray-500 mb-1">
                  Image Alt Text (for SEO)
                </label>
                <input
                  type="text"
                  value={coverImageAlt}
                  onChange={(e) => setCoverImageAlt(e.target.value)}
                  placeholder="Describe image for search engines..."
                  className="w-full px-3 py-1.5 text-xs text-gray-800 border border-gray-300 rounded-lg outline-none"
                />
              </div>
            </div>

            {/* Category Box */}
            <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-xs space-y-3.5">
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider">
                Category
              </label>

              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3 py-2 text-xs font-semibold text-gray-800 border border-gray-300 rounded-lg outline-none bg-white cursor-pointer"
              >
                {POPULAR_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
                <option value="Custom">+ Add Custom Category</option>
              </select>

              {category === 'Custom' && (
                <input
                  type="text"
                  value={customCategory}
                  onChange={(e) => setCustomCategory(e.target.value)}
                  placeholder="Enter new category name..."
                  className="w-full px-3 py-1.5 text-xs text-gray-800 border border-gray-300 rounded-lg outline-none"
                />
              )}
            </div>

            {/* Tags Box */}
            <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-xs space-y-3">
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider">
                Tags & Keywords
              </label>
              <input
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={handleAddTag}
                placeholder="Type tag & press Enter..."
                className="w-full px-3 py-2 text-xs text-gray-800 border border-gray-300 rounded-lg outline-none"
              />
              <div className="flex flex-wrap gap-1.5">
                {tags.map((t) => (
                  <span
                    key={t}
                    className="inline-flex items-center gap-1 text-[11px] font-semibold bg-gray-100 text-gray-700 px-2.5 py-1 rounded-full"
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

            {/* Author Settings */}
            <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-xs space-y-3">
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider">
                Author Attribution
              </label>
              <div>
                <label className="block text-[11px] text-gray-500 mb-1">Author Name</label>
                <input
                  type="text"
                  value={authorName}
                  onChange={(e) => setAuthorName(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs text-gray-800 border border-gray-300 rounded-lg outline-none"
                />
              </div>
              <div>
                <label className="block text-[11px] text-gray-500 mb-1">Author Role</label>
                <input
                  type="text"
                  value={authorRole}
                  onChange={(e) => setAuthorRole(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs text-gray-800 border border-gray-300 rounded-lg outline-none"
                />
              </div>
            </div>

            {/* Featured Post Toggle */}
            <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-xs flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-gray-800 block">Featured Post</span>
                <span className="text-[11px] text-gray-500">Show in hero section on /blog</span>
              </div>
              <input
                type="checkbox"
                checked={isFeatured}
                onChange={(e) => setIsFeatured(e.target.checked)}
                className="w-4 h-4 text-primary rounded focus:ring-primary cursor-pointer"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
