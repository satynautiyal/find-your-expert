export interface ExpertCategory {
  id: string;
  name: string;
  slug: string;
  description?: string;
  icon?: string;
}

export interface ExpertProfile {
  id: string;
  userId: string;
  title: string;
  bio: string;
  hourlyRate: number;
  experienceYears: number;
  rating: number;
  reviewCount: number;
  skills: string[];
  category: ExpertCategory;
  isAvailable: boolean;
}
