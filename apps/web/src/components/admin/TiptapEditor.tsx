'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Link from '@tiptap/extension-link';
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
} from 'lucide-react';
import { useState, useRef } from 'react';
import { uploadImageToStorage } from '@/lib/blogs-api';

interface TiptapEditorProps {
  content: string;
  onChange: (html: string) => void;
  placeholder?: string;
}

export default function TiptapEditor({
  content,
  onChange,
  placeholder = 'Write your article, guides, and cost tips here...',
}: TiptapEditorProps) {
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const inlineImageInputRef = useRef<HTMLInputElement>(null);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [2, 3, 4],
        },
      }),
      Underline,
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-primary underline font-semibold hover:text-primary-dark',
        },
      }),
      Image.configure({
        HTMLAttributes: {
          class: 'rounded-xl max-w-full my-4 border border-gray-200 shadow-sm mx-auto',
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
          'prose prose-slate max-w-none focus:outline-none min-h-[380px] p-6 text-sm sm:text-base leading-relaxed text-gray-800',
      },
    },
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
  });

  if (!editor) {
    return (
      <div className="min-h-[380px] bg-white rounded-xl border border-gray-200 flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Helper for Link
  const setLink = () => {
    const previousUrl = editor.getAttributes('link').href;
    const url = window.prompt('Enter link URL (e.g. https://example.com):', previousUrl || 'https://');

    // cancelled
    if (url === null) return;

    // empty
    if (url.trim() === '' || url === 'https://') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }

    // update link
    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
  };

  // Helper for Image upload
  const handleInlineImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsUploadingImage(true);
      const publicUrl = await uploadImageToStorage(file, 'blog-inline-images');
      editor.chain().focus().setImage({ src: publicUrl, alt: file.name }).run();
    } catch (err: any) {
      alert(`Image upload failed: ${err.message}`);
    } finally {
      setIsUploadingImage(false);
      if (inlineImageInputRef.current) inlineImageInputRef.current.value = '';
    }
  };

  // Insert Pro Tip Callout Box
  const insertCallout = () => {
    editor
      .chain()
      .focus()
      .insertContent(
        '<blockquote><p><strong>💡 Pro Tip:</strong> Enter your NYC roofing or cost advice tip here...</p></blockquote><p></p>'
      )
      .run();
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-xs overflow-hidden focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary transition-all">
      {/* Top Toolbar */}
      <div className="flex flex-wrap items-center gap-1 bg-gray-50 border-b border-gray-200 p-2.5 text-gray-700 select-none">
        
        {/* Undo / Redo */}
        <button
          type="button"
          onClick={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().undo()}
          title="Undo (Ctrl+Z)"
          className="p-1.5 hover:bg-gray-200 rounded text-gray-600 disabled:opacity-30 disabled:hover:bg-transparent"
        >
          <Undo className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().redo().run()}
          disabled={!editor.can().redo()}
          title="Redo (Ctrl+Y)"
          className="p-1.5 hover:bg-gray-200 rounded text-gray-600 disabled:opacity-30 disabled:hover:bg-transparent"
        >
          <Redo className="w-4 h-4" />
        </button>

        <div className="h-4 w-px bg-gray-300 mx-1" />

        {/* Headings */}
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          className={`px-2 py-1 rounded text-xs font-bold transition-colors ${
            editor.isActive('heading', { level: 2 })
              ? 'bg-primary text-white shadow-xs'
              : 'hover:bg-gray-200 text-gray-700'
          }`}
          title="Heading 2 (H2)"
        >
          H2
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          className={`px-2 py-1 rounded text-xs font-bold transition-colors ${
            editor.isActive('heading', { level: 3 })
              ? 'bg-primary text-white shadow-xs'
              : 'hover:bg-gray-200 text-gray-700'
          }`}
          title="Heading 3 (H3)"
        >
          H3
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().setParagraph().run()}
          className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
            editor.isActive('paragraph') && !editor.isActive('heading')
              ? 'bg-gray-200 text-gray-900 font-bold'
              : 'hover:bg-gray-200 text-gray-700'
          }`}
          title="Normal Text"
        >
          Paragraph
        </button>

        <div className="h-4 w-px bg-gray-300 mx-1" />

        {/* Bold, Italic, Underline, Strike */}
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={`p-1.5 rounded transition-colors ${
            editor.isActive('bold')
              ? 'bg-primary text-white shadow-xs'
              : 'hover:bg-gray-200 text-gray-700'
          }`}
          title="Bold (Ctrl+B)"
        >
          <Bold className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={`p-1.5 rounded transition-colors ${
            editor.isActive('italic')
              ? 'bg-primary text-white shadow-xs'
              : 'hover:bg-gray-200 text-gray-700'
          }`}
          title="Italic (Ctrl+I)"
        >
          <Italic className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          className={`p-1.5 rounded transition-colors ${
            editor.isActive('underline')
              ? 'bg-primary text-white shadow-xs'
              : 'hover:bg-gray-200 text-gray-700'
          }`}
          title="Underline (Ctrl+U)"
        >
          <UnderlineIcon className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleStrike().run()}
          className={`p-1.5 rounded transition-colors ${
            editor.isActive('strike')
              ? 'bg-primary text-white shadow-xs'
              : 'hover:bg-gray-200 text-gray-700'
          }`}
          title="Strikethrough"
        >
          <Strikethrough className="w-4 h-4" />
        </button>

        <div className="h-4 w-px bg-gray-300 mx-1" />

        {/* Lists */}
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={`p-1.5 rounded transition-colors ${
            editor.isActive('bulletList')
              ? 'bg-primary text-white shadow-xs'
              : 'hover:bg-gray-200 text-gray-700'
          }`}
          title="Bullet List"
        >
          <List className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          className={`p-1.5 rounded transition-colors ${
            editor.isActive('orderedList')
              ? 'bg-primary text-white shadow-xs'
              : 'hover:bg-gray-200 text-gray-700'
          }`}
          title="Numbered List"
        >
          <ListOrdered className="w-4 h-4" />
        </button>

        {/* Blockquote & Divider */}
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          className={`p-1.5 rounded transition-colors ${
            editor.isActive('blockquote')
              ? 'bg-primary text-white shadow-xs'
              : 'hover:bg-gray-200 text-gray-700'
          }`}
          title="Quote Block"
        >
          <Quote className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().setHorizontalRule().run()}
          className="p-1.5 hover:bg-gray-200 rounded text-gray-700"
          title="Horizontal Divider Line"
        >
          <Minus className="w-4 h-4" />
        </button>

        <div className="h-4 w-px bg-gray-300 mx-1" />

        {/* Links */}
        <button
          type="button"
          onClick={setLink}
          className={`p-1.5 rounded transition-colors ${
            editor.isActive('link')
              ? 'bg-primary text-white shadow-xs'
              : 'hover:bg-gray-200 text-gray-700'
          }`}
          title="Add or Edit Link"
        >
          <LinkIcon className="w-4 h-4" />
        </button>
        {editor.isActive('link') && (
          <button
            type="button"
            onClick={() => editor.chain().focus().unsetLink().run()}
            className="p-1.5 hover:bg-gray-200 rounded text-rose-600"
            title="Remove Link"
          >
            <Unlink className="w-4 h-4" />
          </button>
        )}

        {/* Image Upload */}
        <button
          type="button"
          onClick={() => inlineImageInputRef.current?.click()}
          disabled={isUploadingImage}
          className="p-1.5 hover:bg-gray-200 rounded text-gray-700 flex items-center gap-1 text-xs font-semibold"
          title="Insert Image (Upload to Cloudflare R2)"
        >
          <ImageIcon className="w-4 h-4 text-primary" />
          <span className="hidden sm:inline">Image</span>
        </button>
        <input
          ref={inlineImageInputRef}
          type="file"
          accept="image/*"
          onChange={handleInlineImageUpload}
          className="hidden"
        />

        {/* Pro Tip Callout Box */}
        <button
          type="button"
          onClick={insertCallout}
          className="px-2.5 py-1 bg-amber-100 hover:bg-amber-200 text-amber-900 rounded text-xs font-bold flex items-center gap-1 transition-colors"
          title="Insert Pro Tip Box"
        >
          <Sparkles className="w-3.5 h-3.5 text-amber-700" />
          <span>+ Pro Tip</span>
        </button>

        {/* Clear formatting */}
        <button
          type="button"
          onClick={() => editor.chain().focus().unsetAllMarks().clearNodes().run()}
          className="p-1.5 hover:bg-gray-200 rounded text-gray-400 hover:text-gray-700 ml-auto"
          title="Clear Formatting"
        >
          <RemoveFormatting className="w-4 h-4" />
        </button>
      </div>

      {isUploadingImage && (
        <div className="bg-primary/10 text-primary-dark text-xs font-semibold px-4 py-2 border-b border-primary/20 flex items-center gap-2 animate-pulse">
          <Upload className="w-3.5 h-3.5 animate-bounce" />
          <span>Uploading and optimizing image to Cloudflare R2...</span>
        </div>
      )}

      {/* Editor Content Area */}
      <EditorContent editor={editor} />
    </div>
  );
}
