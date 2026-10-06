import { CreateBlogDto } from './create-blog.dto';

// Type-safe partial update DTO
export class UpdateBlogDto implements Partial<CreateBlogDto> {
  title?: string;
  slug?: string;
  excerpt?: string;
  content?: string;
  coverImageUrl?: string;
  coverImageAlt?: string;
  authorName?: string;
  authorAvatar?: string;
  authorRole?: string;
  category?: string;
  tags?: string[];
  status?: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
  isFeatured?: boolean;
  publishedAt?: string | Date;
  metaTitle?: string;
  metaDescription?: string;
  canonicalUrl?: string;
  ogImageUrl?: string;
  focusKeyword?: string;
}
