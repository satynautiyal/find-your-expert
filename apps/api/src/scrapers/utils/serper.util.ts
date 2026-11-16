import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

export interface SerperOrganicItem {
  title?: string;
  link?: string;
  snippet?: string;
  date?: string;
  rating?: number;
  ratingCount?: number;
  position?: number;
  sitelinks?: Array<{ title?: string; link?: string; snippet?: string }>;
}

export interface SerperSearchResponse {
  organic?: SerperOrganicItem[];
  knowledgeGraph?: {
    title?: string;
    website?: string;
    rating?: number;
    ratingCount?: number;
    description?: string;
  };
}

export interface SerperMapsPlace {
  position?: number;
  title?: string;
  address?: string;
  website?: string;
  phoneNumber?: string;
  rating?: number;
  ratingCount?: number;
  cid?: string;
  fid?: string;
  placeId?: string;
}

export interface SerperMapsResponse {
  places?: SerperMapsPlace[];
}

export interface SerperReviewItem {
  id?: string;
  rating?: number;
  date?: string;
  isoDate?: string;
  snippet?: string;
  text?: string;
  response?: {
    date?: string;
    isoDate?: string;
    snippet?: string;
    text?: string;
  };
  user?: {
    name?: string;
    thumbnail?: string;
    link?: string;
    reviews?: number;
    photos?: number;
  };
  media?: Array<
    | string
    | {
        type?: string;
        imageUrl?: string;
        url?: string;
        link?: string;
        src?: string;
        thumbnail?: string;
      }
  >;
  images?: Array<string | { imageUrl?: string; url?: string; thumbnail?: string }>;
  photos?: Array<string | { imageUrl?: string; url?: string; thumbnail?: string }>;
}

export interface SerperReviewsResponse {
  reviews?: SerperReviewItem[];
  nextPageToken?: string;
  topics?: Array<{ name?: string; reviews?: number }>;
}

export class SerperUtil {
  static resolveApiKey(): string {
    if (!process.env.SERPER_API_KEY) {
      const candidates = [
        path.resolve(process.cwd(), '.env'),
        path.resolve(process.cwd(), 'apps/api/.env'),
        path.resolve(process.cwd(), '../web/.env'),
        path.resolve(process.cwd(), 'apps/web/.env'),
      ];
      for (const envPath of candidates) {
        if (fs.existsSync(envPath)) {
          dotenv.config({ path: envPath });
        }
      }
    }
    return (process.env.SERPER_API_KEY || '').replace(/^['"]|['"]$/g, '').trim();
  }

  static hasApiKey(): boolean {
    return Boolean(this.resolveApiKey());
  }

  /**
   * Lightweight Google organic search via Serper.dev (https://google.serper.dev/search).
   * Strictly used only where direct scraping is blocked (Yelp DataDome / HomeAdvisor PerimeterX / Google Limited View).
   */
  static async searchGoogle(
    query: string,
    options?: { num?: number; page?: number }
  ): Promise<SerperSearchResponse> {
    const apiKey = this.resolveApiKey();
    if (!apiKey) {
      throw new Error('SERPER_API_KEY is not configured');
    }

    const res = await fetch('https://google.serper.dev/search', {
      method: 'POST',
      headers: {
        'X-API-KEY': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        q: query,
        gl: 'us',
        hl: 'en',
        num: options?.num ?? 10,
        ...(options?.page && options.page > 1 ? { page: options.page } : {}),
      }),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      throw new Error(`Serper search HTTP ${res.status}: ${errText.slice(0, 120)}`);
    }

    return (await res.json()) as SerperSearchResponse;
  }

  /**
   * Resolve Google Maps place identifiers (cid / fid / placeId) + rating + official website via Serper Maps.
   */
  static async searchMaps(query: string): Promise<SerperMapsResponse> {
    const apiKey = this.resolveApiKey();
    if (!apiKey) {
      throw new Error('SERPER_API_KEY is not configured');
    }

    const res = await fetch('https://google.serper.dev/maps', {
      method: 'POST',
      headers: {
        'X-API-KEY': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        q: query,
        gl: 'us',
        hl: 'en',
      }),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      throw new Error(`Serper maps HTTP ${res.status}: ${errText.slice(0, 120)}`);
    }

    return (await res.json()) as SerperMapsResponse;
  }

  /**
   * Fetch paginated Google Business reviews + customer-shared media URLs via Serper Reviews API
   * when Google Maps logged-out "Limited view" restricts direct browser access to 5 preview reviews.
   */
  static async fetchReviewsPage(params: {
    cid?: string;
    fid?: string;
    placeId?: string;
    nextPageToken?: string;
    sortBy?: 'mostRelevant' | 'newest' | 'highestRating' | 'lowestRating';
  }): Promise<SerperReviewsResponse> {
    const apiKey = this.resolveApiKey();
    if (!apiKey) {
      throw new Error('SERPER_API_KEY is not configured');
    }

    const payload: Record<string, any> = {
      gl: 'us',
      hl: 'en',
    };
    if (params.cid) payload.cid = params.cid;
    if (params.fid) payload.fid = params.fid;
    if (params.placeId) payload.placeId = params.placeId;
    if (params.nextPageToken) payload.nextPageToken = params.nextPageToken;
    if (params.sortBy) payload.sortBy = params.sortBy;

    const res = await fetch('https://google.serper.dev/reviews', {
      method: 'POST',
      headers: {
        'X-API-KEY': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      throw new Error(`Serper reviews HTTP ${res.status}: ${errText.slice(0, 120)}`);
    }

    return (await res.json()) as SerperReviewsResponse;
  }
}
