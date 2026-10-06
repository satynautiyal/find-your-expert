'use client';

import { useEditor, EditorContent, Editor } from '@tiptap/react';
import type { ChainedCommands } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import Placeholder from '@tiptap/extension-placeholder';
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  Heading2,
  Heading3,
  Heading4,
  List,
  ListOrdered,
  Quote,
  Minus,
  Link as LinkIcon,
  Unlink,
  Image as ImageIcon,
  Upload,
  Undo,
  Redo,
  Sparkles,
  Code,
  RemoveFormatting,
  Plus,
  ChevronDown,
  AlignLeft,
  FileText,
  HelpCircle,
} from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { uploadImageToStorage } from '@/lib/blogs-api';

interface TiptapEditorProps {
  content: string;
  onChange: (html: string) => void;
  placeholder?: string;
  onEditorReady?: (editor: Editor) => void;
}

export default function TiptapEditor({
  content,
  onChange,
  placeholder = 'Type / to choose a block or start writing your article...',
  onEditorReady,
}: TiptapEditorProps) {
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [, setSelectionTick] = useState(0);
  const [isBlockMenuOpen, setIsBlockMenuOpen] = useState(false);
  const [isInserterOpen, setIsInserterOpen] = useState(false);
  const inlineImageInputRef = useRef<HTMLInputElement>(null);
  const blockMenuRef = useRef<HTMLDivElement>(null);
  const inserterRef = useRef<HTMLDivElement>(null);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (blockMenuRef.current && !blockMenuRef.current.contains(e.target as Node)) {
        setIsBlockMenuOpen(false);
      }
      if (inserterRef.current && !inserterRef.current.contains(e.target as Node)) {
        setIsInserterOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [2, 3, 4],
        },
        link: {
          openOnClick: false,
          HTMLAttributes: {
            class: 'text-[#007cba] underline font-semibold hover:text-[#006ba1]',
          },
        },
      }),
      Image.configure({
        HTMLAttributes: {
          class: 'rounded-xl max-w-full my-6 border border-gray-200 shadow-sm mx-auto',
        },
      }),
      Placeholder.configure({
        placeholder,
      }),
    ],
    content: content || '',
    editorProps: {
      attributes: {
        class:
          'tiptap-content focus:outline-none min-h-[520px] py-4 text-base sm:text-lg leading-relaxed text-gray-800',
      },
    },
    onTransaction: () => {
      setSelectionTick((tick) => tick + 1);
    },
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
  });

  // Expose editor instance
  useEffect(() => {
    if (editor && onEditorReady) {
      onEditorReady(editor);
    }
  }, [editor, onEditorReady]);

  // Sync external content changes if editor is not focused
  useEffect(() => {
    if (editor && content !== editor.getHTML() && !editor.isFocused) {
      editor.commands.setContent(content || '', { emitUpdate: false });
    }
  }, [content, editor]);

  if (!editor) {
    return (
      <div className="min-h-[400px] flex items-center justify-center py-20">
        <div className="w-7 h-7 border-2 border-[#007cba] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Helper for applying block formatting
  const applyBlockFormat = (apply: (chain: ChainedCommands) => ChainedCommands) => {
    setIsBlockMenuOpen(false);
    setIsInserterOpen(false);
    const { from, to, empty, $from, $to } = editor.state.selection;
    let chain = editor.chain().focus();

    if (!empty && $from.sameParent($to) && $from.parent.isTextblock) {
      const atStart = $from.parentOffset === 0;
      const atEnd = $to.parentOffset === $to.parent.content.size;
      if (!atEnd) chain = chain.setTextSelection(to).splitBlock();
      if (!atStart) chain = chain.setTextSelection(from).splitBlock();
    }

    apply(chain).run();
  };

  // Helper for Link
  const setLink = () => {
    const previousUrl = editor.getAttributes('link').href;
    const url = window.prompt('Enter link URL (e.g. https://example.com):', previousUrl || 'https://');

    if (url === null) return;

    if (url.trim() === '' || url === 'https://') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }

    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
  };

  // Helper for Image upload to Cloudflare R2
  const handleInlineImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsUploadingImage(true);
      const publicUrl = await uploadImageToStorage(file, 'blog-inline-images');
      const altText = file.name.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' ').trim();
      editor.chain().focus().setImage({ src: publicUrl, alt: altText }).run();
    } catch (err: any) {
      alert(`Image upload failed: ${err.message}`);
    } finally {
      setIsUploadingImage(false);
      if (inlineImageInputRef.current) inlineImageInputRef.current.value = '';
    }
  };

  // Insert Pro Tip Callout Box
  const insertCallout = () => {
    setIsInserterOpen(false);
    editor
      .chain()
      .focus()
      .insertContent(
        '<blockquote><p><strong>💡 Pro Tip:</strong> </p></blockquote><p></p>'
      )
      .run();
  };

  // Determine current active block label
  const getCurrentBlockLabel = () => {
    if (editor.isActive('heading', { level: 2 })) return 'Heading 2';
    if (editor.isActive('heading', { level: 3 })) return 'Heading 3';
    if (editor.isActive('heading', { level: 4 })) return 'Heading 4';
    if (editor.isActive('bulletList')) return 'Bullet List';
    if (editor.isActive('orderedList')) return 'Numbered List';
    if (editor.isActive('blockquote')) return 'Quote';
    if (editor.isActive('codeBlock')) return 'Code Block';
    return 'Paragraph';
  };

  return (
    <div className="relative">
      {/* WordPress Gutenberg Floating Block Toolbar */}
      <div className="sticky top-14 z-20 bg-white/95 backdrop-blur-xs border border-gray-200/80 shadow-sm rounded-lg px-2 py-1.5 mb-6 flex flex-wrap items-center gap-1 text-gray-700 select-none">
        
        {/* Block Type Switcher Dropdown */}
        <div className="relative" ref={blockMenuRef}>
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => setIsBlockMenuOpen(!isBlockMenuOpen)}
            className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold text-gray-800 bg-gray-100 hover:bg-gray-200 rounded transition-colors cursor-pointer"
            title="Transform Block"
          >
            <span className="w-4 h-4 flex items-center justify-center font-bold text-gray-600">
              {editor.isActive('heading') ? 'H' : editor.isActive('bulletList') || editor.isActive('orderedList') ? '≡' : editor.isActive('blockquote') ? '❝' : '¶'}
            </span>
            <span>{getCurrentBlockLabel()}</span>
            <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
          </button>

          {isBlockMenuOpen && (
            <div className="absolute left-0 top-full mt-1 w-48 bg-white border border-gray-200 rounded-lg shadow-xl py-1 z-30 animate-in fade-in zoom-in-95 duration-100">
              <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-gray-400">
                Transform to:
              </div>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => applyBlockFormat((c) => c.setParagraph())}
                className={`w-full px-3 py-1.5 text-xs text-left flex items-center gap-2 hover:bg-gray-50 cursor-pointer ${
                  editor.isActive('paragraph') && !editor.isActive('heading') ? 'font-bold text-[#007cba] bg-blue-50/50' : 'text-gray-700'
                }`}
              >
                <span className="font-serif font-bold text-sm w-4">¶</span>
                <span>Paragraph</span>
              </button>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => applyBlockFormat((c) => c.toggleHeading({ level: 2 }))}
                className={`w-full px-3 py-1.5 text-xs text-left flex items-center gap-2 hover:bg-gray-50 cursor-pointer ${
                  editor.isActive('heading', { level: 2 }) ? 'font-bold text-[#007cba] bg-blue-50/50' : 'text-gray-700'
                }`}
              >
                <span className="font-bold text-xs w-4">H2</span>
                <span>Heading 2</span>
              </button>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => applyBlockFormat((c) => c.toggleHeading({ level: 3 }))}
                className={`w-full px-3 py-1.5 text-xs text-left flex items-center gap-2 hover:bg-gray-50 cursor-pointer ${
                  editor.isActive('heading', { level: 3 }) ? 'font-bold text-[#007cba] bg-blue-50/50' : 'text-gray-700'
                }`}
              >
                <span className="font-bold text-xs w-4">H3</span>
                <span>Heading 3</span>
              </button>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => applyBlockFormat((c) => c.toggleHeading({ level: 4 }))}
                className={`w-full px-3 py-1.5 text-xs text-left flex items-center gap-2 hover:bg-gray-50 cursor-pointer ${
                  editor.isActive('heading', { level: 4 }) ? 'font-bold text-[#007cba] bg-blue-50/50' : 'text-gray-700'
                }`}
              >
                <span className="font-bold text-xs w-4">H4</span>
                <span>Heading 4</span>
              </button>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => applyBlockFormat((c) => c.toggleBulletList())}
                className={`w-full px-3 py-1.5 text-xs text-left flex items-center gap-2 hover:bg-gray-50 cursor-pointer ${
                  editor.isActive('bulletList') ? 'font-bold text-[#007cba] bg-blue-50/50' : 'text-gray-700'
                }`}
              >
                <List className="w-3.5 h-3.5" />
                <span>Bullet List</span>
              </button>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => applyBlockFormat((c) => c.toggleOrderedList())}
                className={`w-full px-3 py-1.5 text-xs text-left flex items-center gap-2 hover:bg-gray-50 cursor-pointer ${
                  editor.isActive('orderedList') ? 'font-bold text-[#007cba] bg-blue-50/50' : 'text-gray-700'
                }`}
              >
                <ListOrdered className="w-3.5 h-3.5" />
                <span>Numbered List</span>
              </button>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => applyBlockFormat((c) => c.toggleBlockquote())}
                className={`w-full px-3 py-1.5 text-xs text-left flex items-center gap-2 hover:bg-gray-50 cursor-pointer ${
                  editor.isActive('blockquote') ? 'font-bold text-[#007cba] bg-blue-50/50' : 'text-gray-700'
                }`}
              >
                <Quote className="w-3.5 h-3.5" />
                <span>Quote</span>
              </button>
            </div>
          )}
        </div>

        <div className="h-4 w-px bg-gray-200 mx-1" />

        {/* Inline Formatting: Bold, Italic, Link, Strike, Code */}
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={`p-1.5 rounded transition-colors cursor-pointer ${
            editor.isActive('bold') ? 'bg-[#007cba] text-white shadow-xs' : 'hover:bg-gray-100 text-gray-700'
          }`}
          title="Bold (Ctrl+B)"
        >
          <Bold className="w-4 h-4" />
        </button>

        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={`p-1.5 rounded transition-colors cursor-pointer ${
            editor.isActive('italic') ? 'bg-[#007cba] text-white shadow-xs' : 'hover:bg-gray-100 text-gray-700'
          }`}
          title="Italic (Ctrl+I)"
        >
          <Italic className="w-4 h-4" />
        </button>

        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={setLink}
          className={`p-1.5 rounded transition-colors cursor-pointer ${
            editor.isActive('link') ? 'bg-[#007cba] text-white shadow-xs' : 'hover:bg-gray-100 text-gray-700'
          }`}
          title="Link (Ctrl+K)"
        >
          <LinkIcon className="w-4 h-4" />
        </button>
        {editor.isActive('link') && (
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => editor.chain().focus().unsetLink().run()}
            className="p-1.5 hover:bg-gray-100 rounded text-rose-600 cursor-pointer"
            title="Remove Link"
          >
            <Unlink className="w-4 h-4" />
          </button>
        )}

        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => editor.chain().focus().toggleStrike().run()}
          className={`p-1.5 rounded transition-colors cursor-pointer ${
            editor.isActive('strike') ? 'bg-[#007cba] text-white shadow-xs' : 'hover:bg-gray-100 text-gray-700'
          }`}
          title="Strikethrough"
        >
          <Strikethrough className="w-4 h-4" />
        </button>

        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => editor.chain().focus().toggleCode().run()}
          className={`p-1.5 rounded transition-colors cursor-pointer ${
            editor.isActive('code') ? 'bg-[#007cba] text-white shadow-xs' : 'hover:bg-gray-100 text-gray-700'
          }`}
          title="Inline Code"
        >
          <Code className="w-4 h-4" />
        </button>

        <div className="h-4 w-px bg-gray-200 mx-1" />

        {/* Quick Inserter: Image, Pro Tip, Divider */}
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => inlineImageInputRef.current?.click()}
          disabled={isUploadingImage}
          className="p-1.5 hover:bg-gray-100 rounded text-gray-700 flex items-center gap-1 text-xs font-semibold cursor-pointer"
          title="Insert Image (Cloudflare R2)"
        >
          <ImageIcon className="w-4 h-4 text-[#007cba]" />
          <span className="hidden sm:inline">Image</span>
        </button>
        <input
          ref={inlineImageInputRef}
          type="file"
          accept="image/*"
          onChange={handleInlineImageUpload}
          className="hidden"
        />

        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={insertCallout}
          className="px-2 py-1 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200/60 rounded text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
          title="Insert Pro Tip Box"
        >
          <Sparkles className="w-3.5 h-3.5 text-amber-600" />
          <span>+ Pro Tip</span>
        </button>

        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => editor.chain().focus().setHorizontalRule().run()}
          className="p-1.5 hover:bg-gray-100 rounded text-gray-700 cursor-pointer"
          title="Insert Divider Line"
        >
          <Minus className="w-4 h-4" />
        </button>

        {/* Clear formatting */}
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => editor.chain().focus().unsetAllMarks().clearNodes().run()}
          className="p-1.5 hover:bg-gray-100 rounded text-gray-400 hover:text-gray-700 ml-auto cursor-pointer"
          title="Clear Formatting"
        >
          <RemoveFormatting className="w-4 h-4" />
        </button>
      </div>

      {isUploadingImage && (
        <div className="bg-blue-50 text-[#007cba] text-xs font-semibold px-4 py-2 rounded-lg border border-blue-100 flex items-center gap-2 mb-4 animate-pulse">
          <Upload className="w-3.5 h-3.5 animate-bounce" />
          <span>Uploading image to Cloudflare R2...</span>
        </div>
      )}

      {/* Editor Main Content Canvas */}
      <EditorContent editor={editor} />
    </div>
  );
}
