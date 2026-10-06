'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Plus,
  Search,
  FileText,
  Eye,
  Edit,
  Trash2,
  ExternalLink,
  Clock,
  Sparkles,
  CheckCircle,
  AlertCircle,
  Calendar,
} from 'lucide-react';
import type { BlogPost } from '@repo/types';
import { fetchAdminBlogs, deleteAdminBlog } from '@/lib/blogs-api';

export default function AdminBlogsPage() {
  const [blogs, setBlogs] = useState<BlogPost[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PUBLISHED' | 'DRAFT'>('ALL');
  const [error, setError] = useState('');
  const [actionSuccess, setActionSuccess] = useState('');

  const loadBlogs = async () => {
    try {
      setIsLoading(true);
      setError('');
      const data = await fetchAdminBlogs({
        search: search || undefined,
        status: statusFilter === 'ALL' ? undefined : statusFilter,
      });
      setBlogs(data.blogs || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load blog posts');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadBlogs();
  }, [statusFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadBlogs();
  };

  const handleDelete = async (id: string, title: string) => {
    if (confirm(`Are you sure you want to delete "${title}"?`)) {
      try {
        await deleteAdminBlog(id);
        setActionSuccess('Blog deleted successfully');
        setBlogs(blogs.filter((b) => b.id !== id));
        setTimeout(() => setActionSuccess(''), 3000);
      } catch (err: any) {
        setError(err.message || 'Failed to delete blog');
      }
    }
  };

  const totalPublished = blogs.filter((b) => b.status === 'PUBLISHED').length;
  const totalDrafts = blogs.filter((b) => b.status === 'DRAFT').length;

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Admin Nav Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-20 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/" className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-primary text-white flex items-center justify-center font-bold text-sm">
                F
              </div>
              <span className="font-black text-gray-900 tracking-tight">FindYourExperts</span>
            </Link>
            <span className="text-gray-300">/</span>
            <div className="flex items-center gap-1.5 bg-primary/10 text-primary-dark font-bold text-xs px-2.5 py-1 rounded-full">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Blog CMS Admin</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/blog"
              target="_blank"
              className="flex items-center gap-1 text-xs font-semibold text-gray-600 hover:text-gray-900 bg-gray-100 hover:bg-gray-200 px-3 py-1.5 rounded-lg transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>View Public Blog</span>
            </Link>

            <Link
              href="/admin/blogs/new"
              className="flex items-center gap-1.5 text-xs font-bold text-white bg-primary hover:bg-primary-dark px-4 py-2 rounded-lg transition-colors shadow-xs"
            >
              <Plus className="w-4 h-4" />
              <span>Write New Post</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-6">
        
        {/* Page Title & Stats */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-gray-900 tracking-tight">
              Article & Content Management
            </h1>
            <p className="text-xs text-gray-500 mt-1">
              Create, edit, optimize for Google SEO, and publish articles for your audience.
            </p>
          </div>

          <div className="flex items-center gap-3 text-xs font-bold">
            <div className="bg-white border border-gray-200 px-3.5 py-2 rounded-xl shadow-xs">
              <span className="text-gray-400 font-normal">Total: </span>
              <span className="text-gray-900">{blogs.length}</span>
            </div>
            <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-3.5 py-2 rounded-xl shadow-xs">
              <span>Published: {totalPublished}</span>
            </div>
            <div className="bg-amber-50 border border-amber-200 text-amber-800 px-3.5 py-2 rounded-xl shadow-xs">
              <span>Drafts: {totalDrafts}</span>
            </div>
          </div>
        </div>

        {/* Notifications */}
        {actionSuccess && (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-3 rounded-xl text-xs font-semibold flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-600" />
            <span>{actionSuccess}</span>
          </div>
        )}
        {error && (
          <div className="bg-rose-50 border border-rose-200 text-rose-800 px-4 py-3 rounded-xl text-xs font-semibold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600" />
            <span>{error}</span>
          </div>
        )}

        {/* Filters & Search Toolbar */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-xs flex flex-wrap items-center justify-between gap-4">
          
          {/* Status Tabs */}
          <div className="flex items-center gap-1.5 bg-gray-100 p-1 rounded-lg text-xs font-bold">
            {(['ALL', 'PUBLISHED', 'DRAFT'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setStatusFilter(tab)}
                className={`px-3 py-1.5 rounded-md transition-all ${
                  statusFilter === tab
                    ? 'bg-white text-gray-900 shadow-xs'
                    : 'text-gray-500 hover:text-gray-900'
                }`}
              >
                {tab === 'ALL' ? 'All Posts' : tab === 'PUBLISHED' ? 'Published' : 'Drafts'}
              </button>
            ))}
          </div>

          {/* Search Bar */}
          <form onSubmit={handleSearchSubmit} className="flex items-center gap-2 flex-1 max-w-md">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search articles by title or keyword..."
                className="w-full pl-9 pr-3 py-2 text-xs border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-primary text-gray-800"
              />
            </div>
            <button
              type="submit"
              className="bg-gray-900 hover:bg-black text-white text-xs font-bold px-3.5 py-2 rounded-lg transition-colors"
            >
              Search
            </button>
          </form>
        </div>

        {/* Blogs Table */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-xs overflow-hidden">
          {isLoading ? (
            <div className="py-20 text-center space-y-3">
              <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-xs font-semibold text-gray-500">Loading blog posts from database...</p>
            </div>
          ) : blogs.length === 0 ? (
            <div className="py-20 text-center space-y-4">
              <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto text-gray-400">
                <FileText className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm font-bold text-gray-800">No blog posts found</p>
                <p className="text-xs text-gray-500 mt-0.5">
                  {search ? 'Try adjusting your search criteria' : 'Create your very first blog post now!'}
                </p>
              </div>
              <Link
                href="/admin/blogs/new"
                className="inline-flex items-center gap-1.5 text-xs font-bold text-white bg-primary hover:bg-primary-dark px-4 py-2 rounded-lg transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>Write First Post</span>
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200 text-gray-500 font-bold uppercase tracking-wider text-[11px]">
                    <th className="py-3.5 px-4">Article</th>
                    <th className="py-3.5 px-4">Category</th>
                    <th className="py-3.5 px-4">Author</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-4">Date</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {blogs.map((blog) => (
                    <tr key={blog.id} className="hover:bg-gray-50/80 transition-colors">
                      {/* Title & Cover */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          {blog.coverImageUrl ? (
                            <img
                              src={blog.coverImageUrl}
                              alt={blog.title}
                              className="w-12 h-12 rounded-lg object-cover border border-gray-200 shrink-0"
                            />
                          ) : (
                            <div className="w-12 h-12 rounded-lg bg-gray-100 border border-gray-200 flex items-center justify-center text-gray-400 shrink-0">
                              <FileText className="w-5 h-5" />
                            </div>
                          )}
                          <div className="space-y-0.5">
                            <Link
                              href={`/admin/blogs/${blog.id}`}
                              className="font-bold text-gray-950 hover:text-primary transition-colors line-clamp-1 text-sm"
                            >
                              {blog.title}
                            </Link>
                            <div className="flex items-center gap-2 text-gray-400 text-[11px]">
                              <span>/blog/{blog.slug}</span>
                              {blog.isFeatured && (
                                <span className="text-amber-600 bg-amber-50 px-1.5 py-0.2 rounded font-bold">
                                  ⭐ Featured
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Category */}
                      <td className="py-3.5 px-4">
                        <span className="font-semibold text-gray-700 bg-gray-100 px-2.5 py-1 rounded-full">
                          {blog.category}
                        </span>
                      </td>

                      {/* Author */}
                      <td className="py-3.5 px-4">
                        <span className="font-medium text-gray-800">{blog.authorName}</span>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                            blog.status === 'PUBLISHED'
                              ? 'bg-emerald-100 text-emerald-800'
                              : blog.status === 'DRAFT'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          {blog.status}
                        </span>
                      </td>

                      {/* Date */}
                      <td className="py-3.5 px-4 text-gray-500">
                        <div className="flex items-center gap-1 text-[11px]">
                          <Calendar className="w-3.5 h-3.5 text-gray-400" />
                          <span>
                            {new Date(blog.publishedAt || blog.createdAt).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                            })}
                          </span>
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {blog.status === 'PUBLISHED' && (
                            <a
                              href={`/blog/${blog.slug}`}
                              target="_blank"
                              rel="noreferrer"
                              title="Live Public View"
                              className="p-1.5 hover:bg-gray-100 text-gray-500 hover:text-gray-900 rounded-lg transition-colors"
                            >
                              <Eye className="w-4 h-4" />
                            </a>
                          )}
                          <Link
                            href={`/admin/blogs/${blog.id}`}
                            title="Edit Post"
                            className="p-1.5 hover:bg-primary/10 text-gray-500 hover:text-primary rounded-lg transition-colors"
                          >
                            <Edit className="w-4 h-4" />
                          </Link>
                          <button
                            onClick={() => handleDelete(blog.id, blog.title)}
                            title="Delete Post"
                            className="p-1.5 hover:bg-rose-50 text-gray-400 hover:text-rose-600 rounded-lg transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
