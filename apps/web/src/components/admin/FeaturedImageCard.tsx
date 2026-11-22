'use client';

import { useRef, useState, useEffect } from 'react';
import { Upload, Trash2, Image as ImageIcon, Link2, Check, X } from 'lucide-react';
import SafeImage from '@/components/common/SafeImage';

export interface FeaturedImageCardProps {
  imageUrl: string;
  imageAlt: string;
  category?: string;
  title?: string;
  isUploading: boolean;
  variant?: 'canvas' | 'sidebar';
  onUploadFile: (file: File) => void;
  onChangeUrl: (url: string) => void;
  onChangeAlt: (alt: string) => void;
  onRemove: () => void;
}

/**
 * DRY Featured / Cover Image manager shared across:
 * 1. Main Editor Canvas (above the article title)
 * 2. Right Sidebar -> Post Settings tab
 * 3. Right Sidebar -> SEO Rank tab
 */
export default function FeaturedImageCard({
  imageUrl,
  imageAlt,
  category,
  title,
  isUploading,
  variant = 'sidebar',
  onUploadFile,
  onChangeUrl,
  onChangeAlt,
  onRemove,
}: FeaturedImageCardProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [urlDraft, setUrlDraft] = useState(imageUrl);

  useEffect(() => {
    setUrlDraft(imageUrl);
  }, [imageUrl]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    onUploadFile(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleApplyUrl = () => {
    onChangeUrl(urlDraft.trim());
    setShowUrlInput(false);
  };

  const isCanvas = variant === 'canvas';

  return (
    <div
      className={
        isCanvas
          ? 'rounded-2xl border border-gray-200 bg-slate-50/70 overflow-hidden shadow-[0_2px_12px_-4px_rgba(15,23,42,0.06)]'
          : 'space-y-2.5 text-xs'
      }
    >
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
      />

      {imageUrl ? (
        <div className={isCanvas ? '' : 'space-y-2.5'}>
          {isCanvas && (
            <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 bg-white border-b border-gray-200 text-xs">
              <span className="inline-flex items-center gap-1.5 font-bold text-slate-800">
                <ImageIcon className="w-4 h-4 text-[#007cba]" />
                <span>Featured Cover Image</span>
              </span>

              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#007cba] hover:bg-[#006ba1] text-white font-bold transition-colors cursor-pointer disabled:opacity-50"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>{isUploading ? 'Uploading...' : 'Replace Cover Image'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setUrlDraft(imageUrl);
                    setShowUrlInput((prev) => !prev);
                  }}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white hover:bg-gray-100 border border-gray-300 text-gray-700 font-semibold transition-colors cursor-pointer"
                >
                  <Link2 className="w-3.5 h-3.5" />
                  <span>Edit URL</span>
                </button>

                <button
                  type="button"
                  onClick={onRemove}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold transition-colors cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Remove</span>
                </button>
              </div>
            </div>
          )}

          <div
            className={
              isCanvas
                ? 'relative bg-gray-100'
                : 'relative rounded-xl overflow-hidden border border-gray-200 bg-gray-50'
            }
          >
            <SafeImage
              src={imageUrl}
              alt={imageAlt || title || 'Featured Cover'}
              fallbackCategory={category}
              fallbackTitle={title}
              fallbackIcon="image"
              className={
                isCanvas
                  ? 'w-full max-h-[320px] object-cover'
                  : 'w-full h-36 object-cover'
              }
            />
          </div>

          {!isCanvas && (
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-1.5 bg-[#007cba] hover:bg-[#006ba1] text-white rounded-lg text-xs font-bold transition-colors cursor-pointer disabled:opacity-50"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>{isUploading ? 'Uploading...' : 'Replace Image'}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setUrlDraft(imageUrl);
                  setShowUrlInput((prev) => !prev);
                }}
                className="inline-flex items-center justify-center gap-1 px-2.5 py-1.5 bg-white hover:bg-gray-100 text-gray-700 border border-gray-300 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                title="Edit image URL"
              >
                <Link2 className="w-3.5 h-3.5" />
                <span>URL</span>
              </button>

              <button
                type="button"
                onClick={onRemove}
                className="inline-flex items-center justify-center gap-1 px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-xs font-bold transition-colors cursor-pointer"
                title="Remove featured image"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {showUrlInput && (
            <div
              className={`flex items-center gap-1.5 ${
                isCanvas ? 'px-4 py-2.5 bg-blue-50/60 border-t border-blue-200' : ''
              }`}
            >
              <input
                type="text"
                value={urlDraft}
                onChange={(e) => setUrlDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleApplyUrl();
                  }
                }}
                placeholder="Paste cover image URL (https://...)"
                className="flex-1 min-w-0 px-2.5 py-1.5 text-xs text-gray-800 bg-white border border-gray-300 rounded-lg outline-none focus:border-[#007cba]"
              />
              <button
                type="button"
                onClick={handleApplyUrl}
                className="px-2.5 py-1.5 rounded-lg bg-[#007cba] text-white text-xs font-bold cursor-pointer"
              >
                <Check className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setShowUrlInput(false)}
                className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-200 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          <div
            className={
              isCanvas
                ? 'flex items-center gap-2 px-4 py-2 bg-white border-t border-gray-200'
                : ''
            }
          >
            {isCanvas && (
              <span className="text-[11px] font-bold text-slate-500 shrink-0">
                Cover Alt Text:
              </span>
            )}
            <input
              type="text"
              value={imageAlt}
              onChange={(e) => onChangeAlt(e.target.value)}
              placeholder="Featured image Alt text (for Google SEO & accessibility)..."
              className="w-full px-3 py-1.5 text-xs text-gray-800 bg-white border border-gray-200 rounded-lg outline-none focus:border-[#007cba]"
            />
          </div>
        </div>
      ) : (
        <div
          className={
            isCanvas
              ? 'flex flex-wrap items-center justify-between gap-3 px-4 py-3 bg-slate-50/80'
              : 'space-y-2'
          }
        >
          {isCanvas ? (
            <>
              <div className="flex items-center gap-2 text-xs text-slate-600">
                <ImageIcon className="w-4 h-4 text-[#007cba]" />
                <span className="font-semibold text-slate-800">
                  No Featured Cover Image set
                </span>
                <span className="hidden sm:inline text-slate-400">
                  (Shown at the top of the article & blog cards)
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#007cba] hover:bg-[#006ba1] text-white text-xs font-bold transition-colors cursor-pointer disabled:opacity-50"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>{isUploading ? 'Uploading...' : 'Upload Cover Image'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowUrlInput((prev) => !prev)}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white hover:bg-gray-100 border border-gray-300 text-gray-700 text-xs font-semibold transition-colors cursor-pointer"
                >
                  <Link2 className="w-3.5 h-3.5" />
                  <span>Paste URL</span>
                </button>
              </div>
            </>
          ) : (
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-gray-300 hover:border-[#007cba] rounded-xl p-4 text-center cursor-pointer transition-colors bg-gray-50/50 hover:bg-blue-50/30"
            >
              <ImageIcon className="w-6 h-6 text-gray-400 mx-auto mb-1" />
              <span className="text-xs font-bold text-[#007cba] block">
                {isUploading ? 'Uploading to Cloudflare R2...' : 'Upload Featured Image'}
              </span>
              <span className="text-[10px] text-gray-400">
                JPG, PNG or WebP (max 10 MB)
              </span>
            </div>
          )}

          {(!isCanvas || showUrlInput) && (
            <div className={isCanvas ? 'w-full flex items-center gap-1.5 pt-2 border-t border-gray-200' : ''}>
              <input
                type="text"
                value={urlDraft}
                onChange={(e) => {
                  setUrlDraft(e.target.value);
                  if (!isCanvas) onChangeUrl(e.target.value);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && isCanvas) {
                    e.preventDefault();
                    handleApplyUrl();
                  }
                }}
                placeholder="Or paste cover image URL directly..."
                className="w-full px-3 py-1.5 text-xs text-gray-800 bg-white border border-gray-200 rounded-lg outline-none focus:border-[#007cba]"
              />
              {isCanvas && (
                <button
                  type="button"
                  onClick={handleApplyUrl}
                  className="px-3 py-1.5 rounded-lg bg-[#007cba] text-white text-xs font-bold shrink-0 cursor-pointer"
                >
                  Apply
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
