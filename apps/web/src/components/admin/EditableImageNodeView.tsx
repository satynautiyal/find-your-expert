'use client';

import { useState, useRef, useEffect } from 'react';
import { NodeViewWrapper, type ReactNodeViewProps } from '@tiptap/react';
import {
  Upload,
  Trash2,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Link2,
  Check,
  X,
  ImageOff,
  Image as ImageIcon,
} from 'lucide-react';
import { uploadImageToStorage } from '@/lib/blogs-api';
import { getMediaUrl } from '@/lib/media-url';

export type ImageWidthOption = '50%' | '75%' | '100%';
export type ImageAlignOption = 'left' | 'center' | 'right';

const WIDTH_OPTIONS: ImageWidthOption[] = ['50%', '75%', '100%'];
const ALIGN_OPTIONS: Array<{
  id: ImageAlignOption;
  icon: typeof AlignLeft;
  label: string;
}> = [
  { id: 'left', icon: AlignLeft, label: 'Align left' },
  { id: 'center', icon: AlignCenter, label: 'Align center' },
  { id: 'right', icon: AlignRight, label: 'Align right' },
];

/**
 * Interactive Tiptap NodeView for inline blog images.
 * Renders persistent, unmistakable Replace / URL / Width / Align / Alt / Delete controls
 * directly on every image inside the editor (including broken/expired pasted URLs).
 */
export default function EditableImageNodeView({
  node,
  updateAttributes,
  deleteNode,
  selected,
}: ReactNodeViewProps) {
  const rawSrc = (node.attrs.src as string) || '';
  const alt = (node.attrs.alt as string) || '';
  const width = ((node.attrs.width as ImageWidthOption) || '100%') as ImageWidthOption;
  const align = ((node.attrs.align as ImageAlignOption) || 'center') as ImageAlignOption;

  const resolvedSrc = getMediaUrl(rawSrc);

  const [isUploading, setIsUploading] = useState(false);
  const [hasLoadError, setHasLoadError] = useState(false);
  const [isEditingUrl, setIsEditingUrl] = useState(false);
  const [urlDraft, setUrlDraft] = useState(rawSrc);
  const [uploadError, setUploadError] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setHasLoadError(false);
    setUrlDraft(rawSrc);
  }, [rawSrc]);

  const stopEditorEvents = (e: React.SyntheticEvent) => {
    e.stopPropagation();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsUploading(true);
      setUploadError('');
      const uploadedUrl = await uploadImageToStorage(file, 'blog-inline-images');
      const fallbackAlt = file.name
        .replace(/\.[^.]+$/, '')
        .replace(/[-_]+/g, ' ')
        .trim();

      updateAttributes({
        src: uploadedUrl,
        alt: alt || fallbackAlt,
      });
      setHasLoadError(false);
      setIsEditingUrl(false);
    } catch (err: any) {
      setUploadError(err.message || 'Failed to upload image');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleApplyUrl = () => {
    const trimmed = urlDraft.trim();
    if (!trimmed) return;
    updateAttributes({ src: trimmed });
    setHasLoadError(false);
    setIsEditingUrl(false);
  };

  const alignmentMarginClass =
    align === 'left'
      ? 'mr-auto ml-0'
      : align === 'right'
        ? 'ml-auto mr-0'
        : 'mx-auto';

  return (
    <NodeViewWrapper
      className="my-6 select-none"
      data-drag-handle
    >
      <div
        contentEditable={false}
        style={{ width, maxWidth: '100%' }}
        className={`${alignmentMarginClass} rounded-xl border bg-white transition-all overflow-hidden ${
          selected
            ? 'border-[#007cba] ring-2 ring-[#007cba]/25 shadow-[0_10px_28px_-6px_rgba(0,124,186,0.22)]'
            : 'border-gray-200 hover:border-gray-300 shadow-[0_4px_16px_-4px_rgba(15,23,42,0.08)]'
        }`}
      >
        {/* Always-Visible Top Image Control Bar */}
        <div
          onMouseDown={stopEditorEvents}
          className="flex flex-wrap items-center gap-1.5 px-3 py-2 bg-slate-50 border-b border-gray-200 text-xs"
        >
          <span className="inline-flex items-center gap-1 font-bold text-slate-700 mr-1">
            <ImageIcon className="w-3.5 h-3.5 text-[#007cba]" />
            <span>Image</span>
          </span>

          {/* 1. Replace via File Upload */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#007cba] hover:bg-[#006ba1] text-white font-bold transition-colors cursor-pointer disabled:opacity-50"
            title="Upload a new image from your computer"
          >
            <Upload className="w-3 h-3" />
            <span>{isUploading ? 'Uploading...' : 'Replace Image'}</span>
          </button>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="hidden"
          />

          {/* 2. Toggle Direct URL Input */}
          <button
            type="button"
            onClick={() => {
              setUrlDraft(rawSrc);
              setIsEditingUrl((prev) => !prev);
            }}
            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border font-semibold transition-colors cursor-pointer ${
              isEditingUrl
                ? 'bg-blue-50 border-[#007cba] text-[#007cba]'
                : 'bg-white hover:bg-gray-100 border-gray-300 text-gray-700'
            }`}
            title="Paste or change image URL"
          >
            <Link2 className="w-3 h-3" />
            <span>Edit URL</span>
          </button>

          {/* 3. Width Selector (50% | 75% | 100%) */}
          <div className="inline-flex items-center bg-white border border-gray-300 rounded-lg p-0.5">
            {WIDTH_OPTIONS.map((opt) => {
              const active = width === opt;
              return (
                <button
                  key={opt}
                  type="button"
                  onClick={() => updateAttributes({ width: opt })}
                  className={`px-2 py-0.5 rounded-md text-[11px] font-bold transition-colors cursor-pointer ${
                    active
                      ? 'bg-[#007cba] text-white'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                  title={`Resize image width to ${opt}`}
                >
                  {opt}
                </button>
              );
            })}
          </div>

          {/* 4. Alignment Selector (Left | Center | Right) */}
          <div className="inline-flex items-center bg-white border border-gray-300 rounded-lg p-0.5">
            {ALIGN_OPTIONS.map(({ id, icon: Icon, label }) => {
              const active = align === id;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => updateAttributes({ align: id })}
                  className={`p-1 rounded-md transition-colors cursor-pointer ${
                    active
                      ? 'bg-[#007cba] text-white'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                  title={label}
                >
                  <Icon className="w-3.5 h-3.5" />
                </button>
              );
            })}
          </div>

          {/* 5. Delete Image */}
          <button
            type="button"
            onClick={() => deleteNode()}
            className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold ml-auto cursor-pointer"
            title="Remove this image from article"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Remove</span>
          </button>
        </div>

        {/* Inline URL Editor Drawer (when "Edit URL" is active) */}
        {isEditingUrl && (
          <div
            onMouseDown={stopEditorEvents}
            onKeyDown={stopEditorEvents}
            className="flex items-center gap-1.5 px-3 py-2 bg-blue-50/60 border-b border-blue-200 text-xs"
          >
            <input
              type="text"
              value={urlDraft}
              onChange={(e) => setUrlDraft(e.target.value)}
              onKeyDown={(e) => {
                e.stopPropagation();
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleApplyUrl();
                } else if (e.key === 'Escape') {
                  setIsEditingUrl(false);
                }
              }}
              placeholder="Paste image URL (https://...)"
              className="flex-1 min-w-0 bg-white border border-gray-300 rounded-lg px-2.5 py-1.5 text-xs text-gray-900 outline-none focus:border-[#007cba]"
              autoFocus
            />
            <button
              type="button"
              onClick={handleApplyUrl}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[#007cba] hover:bg-[#006ba1] text-white font-bold cursor-pointer"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Apply</span>
            </button>
            <button
              type="button"
              onClick={() => setIsEditingUrl(false)}
              className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-200 cursor-pointer"
              title="Cancel"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {uploadError && (
          <div className="px-3 py-1.5 bg-rose-50 border-b border-rose-200 text-[11px] font-semibold text-rose-700">
            {uploadError}
          </div>
        )}

        {/* Image Preview OR Broken-URL Recovery Card */}
        <div className="bg-gray-50/60 flex items-center justify-center">
          {!resolvedSrc || hasLoadError ? (
            <div
              onMouseDown={stopEditorEvents}
              className="w-full py-10 px-6 text-center space-y-3 bg-amber-50/40"
            >
              <ImageOff className="w-8 h-8 text-amber-500 mx-auto" />
              <div className="space-y-1">
                <p className="text-xs font-bold text-gray-900">
                  Image preview unavailable (expired or external blocked URL)
                </p>
                {alt && (
                  <p className="text-[11px] text-gray-600">
                    Caption / Alt: <span className="font-semibold">{alt}</span>
                  </p>
                )}
              </div>
              <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[#007cba] hover:bg-[#006ba1] text-white text-xs font-bold cursor-pointer"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>{isUploading ? 'Uploading...' : 'Upload Replacement Image'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsEditingUrl(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white hover:bg-gray-100 border border-gray-300 text-gray-700 text-xs font-semibold cursor-pointer"
                >
                  <Link2 className="w-3.5 h-3.5" />
                  <span>Paste Image URL</span>
                </button>
              </div>
            </div>
          ) : (
            <img
              src={resolvedSrc}
              alt={alt}
              onError={() => setHasLoadError(true)}
              className="!m-0 !rounded-none w-full h-auto block object-contain max-h-[620px]"
              draggable={false}
            />
          )}
        </div>

        {/* Bottom SEO Alt Text Bar */}
        <div
          onMouseDown={stopEditorEvents}
          onKeyDown={stopEditorEvents}
          className="flex items-center gap-2 px-3 py-2 bg-slate-50/90 border-t border-gray-200 text-xs"
        >
          <span className="text-[11px] font-bold text-slate-500 shrink-0">
            Alt Text:
          </span>
          <input
            type="text"
            value={alt}
            onChange={(e) => updateAttributes({ alt: e.target.value })}
            onKeyDown={stopEditorEvents}
            placeholder="Describe this image for SEO & accessibility..."
            className="flex-1 min-w-0 bg-white border border-gray-200 focus:border-[#007cba] rounded-md px-2.5 py-1 text-xs text-gray-800 placeholder:text-gray-400 outline-none"
          />
        </div>
      </div>
    </NodeViewWrapper>
  );
}
