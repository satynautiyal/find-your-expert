'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import BlogEditorForm from '@/components/admin/BlogEditorForm';
import { fetchAdminBlogById } from '@/lib/blogs-api';
import type { BlogPost } from '@repo/types';

export default function EditAdminBlogPage() {
  const params = useParams();
  const id = params?.id as string;

  const [blog, setBlog] = useState<BlogPost | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!id) return;
    fetchAdminBlogById(id)
      .then((data) => setBlog(data))
      .catch((err) => setError(err.message || 'Failed to load post for editing'))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs font-semibold text-gray-500">Loading editor...</p>
        </div>
      </div>
    );
  }

  if (error || !blog) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-xl border border-gray-200 text-center space-y-4 max-w-md">
          <p className="text-sm font-bold text-rose-600">{error || 'Article not found'}</p>
          <a
            href="/admin/blogs"
            className="inline-block bg-gray-900 text-white text-xs font-bold px-4 py-2 rounded-lg"
          >
            Back to Posts
          </a>
        </div>
      </div>
    );
  }

  return <BlogEditorForm initialData={blog} isEditMode={true} />;
}
