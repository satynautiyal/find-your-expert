export type PostStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';

export interface BlogPost {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  content: string;
  coverImageUrl: string | null;
  coverImageAlt: string | null;
  authorName: string;
  authorAvatar: string | null;
  authorRole: string | null;
  category: string;
  tags: string[];
  readingTimeMin: number;
  wordCount: number;
  status: PostStatus;
  isFeatured: boolean;
  viewCount: number;
  publishedAt: string | null | Date;
  metaTitle: string | null;
  metaDescription: string | null;
  canonicalUrl: string | null;
  ogImageUrl: string | null;
  focusKeyword: string | null;
  createdAt: string | Date;
  updatedAt: string | Date;
}

export interface CreateBlogPostInput {
  title: string;
  slug?: string;
  excerpt?: string;
  content: string;
  coverImageUrl?: string;
  coverImageAlt?: string;
  authorName?: string;
  authorAvatar?: string;
  authorRole?: string;
  category?: string;
  tags?: string[];
  status?: PostStatus;
  isFeatured?: boolean;
  publishedAt?: string | Date | null;
  metaTitle?: string;
  metaDescription?: string;
  canonicalUrl?: string;
  ogImageUrl?: string;
  focusKeyword?: string;
}

export interface UpdateBlogPostInput extends Partial<CreateBlogPostInput> {}

export interface GetBlogsQueryInput {
  page?: number;
  limit?: number;
  category?: string;
  tag?: string;
  search?: string;
  status?: PostStatus;
  isFeatured?: boolean;
  sortBy?: 'publishedAt' | 'createdAt' | 'viewCount';
  sortOrder?: 'asc' | 'desc';
}

export interface BlogCategoryCount {
  category: string;
  count: number;
}

export interface PaginatedBlogsResponse {
  blogs: BlogPost[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
