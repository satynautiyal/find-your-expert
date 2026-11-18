import { Injectable, Logger } from '@nestjs/common';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as https from 'https';
import * as path from 'path';

export type AiSupportedReviewPlatform = 'GOOGLE' | 'HOUZZ' | 'YELP' | 'HOMEADVISOR';

export type AiReviewTagSentiment = 'positive' | 'neutral' | 'caution';

export type AiReviewTagCategory =
  | 'craftsmanship'
  | 'punctuality'
  | 'pricing'
  | 'communication'
  | 'cleanliness'
  | 'specialty'
  | 'trust';

export interface AiReviewTagItem {
  label: string;
  keyword: string;
  mentionCount: number;
  sentiment: AiReviewTagSentiment;
  category: AiReviewTagCategory;
}

export interface AiReviewAnalysisPayload {
  verdictHeadline: string;
  summary: string;
  tags: AiReviewTagItem[];
  analyzedCount: number;
  maxWindowSize: number;
  platformsIncluded: Partial<Record<AiSupportedReviewPlatform, number>>;
  averageRating: number;
  generatedAt: string;
  version: number;
}

export interface ReviewToAnalyze {
  comment: string;
  rating?: number;
  authorName?: string;
  platform?: string;
  reviewDate?: string | null;
  createdAt?: Date | string | null;
  updatedAt?: Date | string | null;
}

export interface ProjectDescriptionRewriteInput {
  businessName: string;
  category?: string;
  services?: string[];
  boroughOrCity?: string;
  title: string;
  rawDescription?: string | null;
  location?: string | null;
  projectYear?: number | null;
  costRange?: string | null;
  photoCount?: number;
  photoCaptions?: string[];
}

export interface BusinessDescriptionRewriteInput {
  businessName: string;
  category?: string;
  services?: string[];
  boroughOrCity?: string;
  serviceAreas?: string[];
  sinceYear?: number | null;
  isLicensed?: boolean;
  isInsured?: boolean;
  hasWarranty?: boolean;
  rawWebsiteAbout?: string | null;
  fallbackBio?: string | null;
}

export interface TeamMemberBioRewriteInput {
  businessName: string;
  memberName: string;
  role?: string | null;
  credentials?: string | null;
  rawBio: string;
}

function resolveOpenRouterApiKey(): string {
  if (!process.env.OPENROUTER_API_KEY) {
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
  return (process.env.OPENROUTER_API_KEY || '').replace(/^['"]|['"]$/g, '').trim();
}

@Injectable()
export class AiReviewSummaryService {
  private readonly logger = new Logger(AiReviewSummaryService.name);

  // Mistral Models on OpenRouter (fast map model + higher-reasoning synthesis model + fallbacks)
  private readonly primaryModel = 'mistralai/ministral-3b-2512';
  private readonly synthesisModel = 'mistralai/mistral-small-3.2-24b-instruct';
  private readonly fallbackModels = [
    'mistralai/mistral-small-3.2-24b-instruct',
    'mistralai/mistral-nemo',
    'mistralai/ministral-3b-2512',
  ];

  public static readonly MAX_REVIEW_WINDOW = 500;
  private static readonly MAP_BATCH_SIZE = 100;
  private static readonly MAP_CONCURRENCY = 3;
  private static readonly SUPPORTED_PLATFORMS = new Set<AiSupportedReviewPlatform>([
    'GOOGLE',
    'HOUZZ',
    'YELP',
    'HOMEADVISOR',
  ]);

  /**
   * Helper to call OpenRouter Chat Completions API with fallback support
   */
  private async callOpenRouter(
    prompt: string,
    systemPrompt: string,
    options?: {
      model?: string;
      temperature?: number;
      maxTokens?: number;
    }
  ): Promise<string> {
    const apiKey = resolveOpenRouterApiKey();
    if (!apiKey) {
      throw new Error('OPENROUTER_API_KEY is not defined in .env');
    }

    const preferredModel = options?.model || this.primaryModel;
    const temperature = options?.temperature ?? 0.3;
    const maxTokens = options?.maxTokens ?? 1200;
    const modelsToTry = [
      preferredModel,
      ...this.fallbackModels.filter((m) => m !== preferredModel),
    ];

    for (const currentModel of modelsToTry) {
      try {
        const result = await new Promise<string>((resolve, reject) => {
          const payload = JSON.stringify({
            model: currentModel,
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: prompt },
            ],
            temperature,
            max_tokens: maxTokens,
          });

          const req = https.request(
            'https://openrouter.ai/api/v1/chat/completions',
            {
              method: 'POST',
              headers: {
                Authorization: `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
                'HTTP-Referer': 'https://prosvetted.com',
                'X-Title': 'Prosvetted AI Editorial',
              },
            },
            (res) => {
              let data = '';
              res.on('data', (chunk) => (data += chunk));
              res.on('end', () => {
                try {
                  const json = JSON.parse(data);
                  if (res.statusCode === 200 && json.choices?.[0]?.message?.content) {
                    resolve(json.choices[0].message.content.trim());
                  } else {
                    reject(
                      new Error(
                        `OpenRouter Error (${res.statusCode}): ${JSON.stringify(
                          json.error || json
                        )}`
                      )
                    );
                  }
                } catch (e: any) {
                  reject(new Error(`Failed to parse OpenRouter response: ${e.message}`));
                }
              });
            }
          );

          req.on('error', (err) => reject(err));
          req.setTimeout(30000, () => {
            req.destroy(new Error('OpenRouter request timed out after 30s'));
          });
          req.write(payload);
          req.end();
        });

        return result;
      } catch (err: any) {
        this.logger.warn(
          `⚠️ [AI OpenRouter] Model "${currentModel}" failed: ${err.message}. Trying fallback...`
        );
      }
    }

    throw new Error('All OpenRouter Mistral models failed.');
  }

  /**
   * Rewrites / paraphrases a contractor project description into 100% SEO-original,
   * natural editorial prose with zero verbatim Houzz phrasing and zero invented facts.
   */
  async rewriteProjectDescription(input: ProjectDescriptionRewriteInput): Promise<string> {
    const cleanRaw = (input.rawDescription || '')
      .replace(/houzz/gi, '')
      .replace(/\s+/g, ' ')
      .trim();

    const verifiedCaptions = (input.photoCaptions || [])
      .map((c) => c.replace(/houzz/gi, '').trim())
      .filter((c) => c.length >= 4 && c.toLowerCase() !== input.title.toLowerCase())
      .slice(0, 6);

    const verifiedFacts = [
      `Contractor: ${input.businessName}`,
      input.category ? `Primary Trade: ${input.category}` : '',
      input.services?.length ? `Specialties: ${input.services.slice(0, 6).join(', ')}` : '',
      `Project Title: ${input.title}`,
      input.location || input.boroughOrCity
        ? `Location: ${input.location || input.boroughOrCity}`
        : '',
      input.projectYear ? `Completed Year: ${input.projectYear}` : '',
      input.costRange ? `Reported Budget Range: ${input.costRange}` : '',
      input.photoCount ? `Documented Gallery Size: ${input.photoCount} photos` : '',
      verifiedCaptions.length > 0
        ? `Visual Highlights from Captions: ${verifiedCaptions.join('; ')}`
        : '',
    ]
      .filter(Boolean)
      .join('\n');

    const systemPrompt = [
      'You are a senior architectural & residential construction portfolio editor writing original first-party project descriptions for an NYC contractor directory.',
      'CRITICAL SEO & ORIGINALITY RULES:',
      '1. Write 100% original wording and fresh sentence structures so search engine crawlers detect ZERO duplicate-content overlap with external directories.',
      '2. NEVER copy 4+ consecutive words from any source notes, and NEVER mention Houzz, Yelp, HomeAdvisor, third-party websites, or "this photo gallery".',
      '3. Stay strictly faithful to the verified project facts provided. Do NOT invent fake square footage, unverified brand names, awards, or fictional architectural claims.',
      '4. Avoid robotic AI cliches ("nestled in", "testament to", "seamless blend", "elevate", "boasts", "delve"). Write crisp, grounded, human-sounding trade prose.',
      '5. Output ONLY 2 to 3 concise sentences (38 to 70 words total) of plain paragraph text — no quotes, no headings, no bullet points, no markdown.',
    ].join('\n');

    const userPrompt = cleanRaw
      ? `Rewrite and completely reword the following raw project notes into a fresh, natural 2-3 sentence portfolio summary using entirely different phrasing and syntax while keeping every real project detail accurate:

=== VERIFIED PROJECT METADATA ===
${verifiedFacts}

=== RAW SOURCE NOTES (REWORD COMPLETELY — DO NOT REUSE PHRASING) ===
${cleanRaw}

Output ONLY the final rewritten 2-3 sentence plain-text description:`
      : `Write a natural, grounded, 100% original 2-sentence portfolio project description based strictly on these verified project details (do not invent unverified measurements or materials beyond what the title, trade, and captions clearly indicate):

=== VERIFIED PROJECT METADATA ===
${verifiedFacts}

Output ONLY the final 2-sentence plain-text description:`;

    const rawResponse = await this.callOpenRouter(userPrompt, systemPrompt, {
      temperature: 0.55,
      maxTokens: 220,
    });

    return rawResponse
      .replace(/^["'“”]+|["'“”]+$/g, '')
      .replace(/\*\*/g, '')
      .replace(/^#+\s+.*$/gm, '')
      .replace(/\bhouzz\b/gi, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Rewrites a contractor's "About" business overview (prioritizing raw About copy scraped
   * from their official website) into 100% original, SEO-safe editorial prose with zero
   * verbatim overlap with Houzz, Yelp, or external directories.
   */
  async rewriteBusinessDescription(input: BusinessDescriptionRewriteInput): Promise<string> {
    const cleanSiteAbout = (input.rawWebsiteAbout || '')
      .replace(/\b(houzz|yelp|homeadvisor|angi|angie'?s list)\b/gi, '')
      .replace(/\s+/g, ' ')
      .trim();
    const cleanFallback = (input.fallbackBio || '')
      .replace(/\b(houzz|yelp|homeadvisor|angi|angie'?s list)\b/gi, '')
      .replace(/\s+/g, ' ')
      .trim();

    const sourceNotes = cleanSiteAbout.length >= 35 ? cleanSiteAbout : cleanFallback;

    const verifiedFacts = [
      `Business Name: ${input.businessName}`,
      input.category ? `Primary Trade: ${input.category}` : '',
      input.services?.length ? `Core Specialties: ${input.services.slice(0, 8).join(', ')}` : '',
      input.boroughOrCity ? `Base Location: ${input.boroughOrCity}` : '',
      input.serviceAreas?.length
        ? `Areas Served: ${input.serviceAreas.slice(0, 6).join(', ')}`
        : '',
      input.sinceYear && input.sinceYear > 1900 && input.sinceYear <= new Date().getFullYear()
        ? `Established Year: ${input.sinceYear}`
        : '',
      input.isLicensed ? 'Credential: Licensed contractor' : '',
      input.isInsured ? 'Credential: Insured' : '',
      input.hasWarranty ? 'Guarantee: Workmanship warranty available' : '',
    ]
      .filter(Boolean)
      .join('\n');

    const systemPrompt = [
      'You are an editorial company-profile writer for an authoritative NYC residential & commercial contractor directory.',
      'CRITICAL SEO & ORIGINALITY RULES:',
      '1. Write 100% original, freshly structured third-person prose ("<Business> specializes in...", "Based in...") so search crawlers detect ZERO duplicate content against Houzz, Yelp, or company websites.',
      '2. NEVER copy 4+ consecutive words from the source notes, NEVER use first-person ("we", "our", "us", "I"), and NEVER mention Houzz, Yelp, HomeAdvisor, or external directories.',
      '3. Stay strictly accurate to the verified facts and source notes. Do NOT invent fake license numbers, unverified awards, or fictional years in business.',
      '4. Avoid generic AI filler ("nestled in", "testament to", "look no further", "premier", "unparalleled", "seamless", "elevate", "delve"). Sound crisp, factual, and trustworthy.',
      '5. Output ONLY 3 to 4 clean sentences (55 to 95 words total) as a single plain-text paragraph — no headings, no bullet points, no quotes, no markdown.',
    ].join('\n');

    const userPrompt = sourceNotes
      ? `Completely reword and synthesize the contractor's raw company background below into a fresh, third-person 3-4 sentence "About" company overview using 100% new sentence structures and vocabulary while keeping all factual specialties and history accurate:

=== VERIFIED COMPANY FACTS ===
${verifiedFacts}

=== RAW COMPANY BACKGROUND (REWORD COMPLETELY — ZERO VERBATIM PHRASES, THIRD-PERSON ONLY) ===
${sourceNotes.slice(0, 1400)}

Output ONLY the final 3-4 sentence plain-text company description:`
      : `Write a crisp, factual, 100% original third-person 3-sentence "About" company overview based strictly on these verified contractor details:

=== VERIFIED COMPANY FACTS ===
${verifiedFacts}

Output ONLY the final 3-sentence plain-text company description:`;

    const rawResponse = await this.callOpenRouter(userPrompt, systemPrompt, {
      temperature: 0.5,
      maxTokens: 260,
    });

    return rawResponse
      .replace(/^["'“”]+|["'“”]+$/g, '')
      .replace(/\*\*/g, '')
      .replace(/^#+\s+.*$/gm, '')
      .replace(/\b(houzz|yelp|homeadvisor)\b/gi, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Rewrites a scraped team member's bio into a concise, 100% original third-person
   * 1-2 sentence summary (18-40 words) with zero verbatim copy.
   */
  async rewriteTeamMemberBio(input: TeamMemberBioRewriteInput): Promise<string> {
    const cleanBio = (input.rawBio || '')
      .replace(/\b(houzz|yelp|homeadvisor)\b/gi, '')
      .replace(/\s+/g, ' ')
      .trim();
    if (cleanBio.length < 20) return '';

    const systemPrompt = [
      'You are an editorial profile writer summarizing contractor team member bios in crisp third-person prose.',
      '1. Completely reword the raw bio using fresh phrasing (zero 4+ word overlap, third-person only — never "I" or "my").',
      '2. Stay strictly faithful to real facts (role, experience, credentials, specialty). Do NOT invent degrees, years, or awards.',
      '3. Output ONLY 1 to 2 concise sentences (16 to 38 words total) of plain text — no quotes, no markdown, no filler cliches.',
    ].join('\n');

    const userPrompt = `Team Member: ${input.memberName}${input.role ? ` (${input.role})` : ''}${
      input.credentials ? `, ${input.credentials}` : ''
    } at ${input.businessName}
Raw Bio Notes: ${cleanBio.slice(0, 700)}

Output ONLY the rewritten 1-2 sentence third-person bio:`;

    const rawResponse = await this.callOpenRouter(userPrompt, systemPrompt, {
      temperature: 0.45,
      maxTokens: 130,
    });

    return rawResponse
      .replace(/^["'“”]+|["'“”]+$/g, '')
      .replace(/\*\*/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Strips contractor owner replies & platform metadata footers so ONLY authentic
   * homeowner review text is analyzed by AI and counted for tags.
   */
  public cleanCustomerReviewText(rawComment?: string | null, businessName = ''): string {
    let text = String(rawComment || '').trim();
    if (text.length < 8) return '';
    if (text === 'Great roofing service, highly recommended!') return '';
    if (/^Average rating:/i.test(text)) return '';
    if (/^[A-Za-z0-9+/]{24,}$/.test(text)) return '';
    if (/\b\d+\s+Photos\b/i.test(text) && /\bMon\s*-/i.test(text)) return '';
    if (/^\d+\s+[A-Za-z0-9\s.,#-]+NY\s+\d{5}$/i.test(text)) return '';

    text = text
      .replace(/\nPrice assessment[\s\S]*$/i, '')
      .replace(/\nServices\n[^\n]+$/i, '')
      .trim();

    if (businessName) {
      const escapedBiz = businessName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const replyRegex = new RegExp(
        `([A-Z][a-z]+\\s+\\d{1,2},\\s+\\d{4})?\\s*Comment\\s+from\\s+(?:${escapedBiz}|the\\s+Owner|Business)\\s*:[\\s\\S]+$`,
        'i'
      );
      text = text.replace(replyRegex, '').trim();
    } else {
      text = text
        .replace(
          /([A-Z][a-z]+\s+\d{1,2},\s+\d{4})?\s*Comment\s+from\s+(?:the\s+Owner|Business)\s*:[\s\S]+$/i,
          ''
        )
        .trim();
    }

    text = text.replace(/\s+/g, ' ').trim();
    return text.length >= 8 ? text : '';
  }

  /**
   * Normalizes cross-platform reviewDate strings (Google, Houzz, Yelp, HomeAdvisor)
   * into an epoch millisecond timestamp so we genuinely pick the 500 MOST RECENT reviews.
   */
  public parseReviewRecencyMs(
    reviewDate?: string | null,
    anchorDate?: Date | string | null
  ): number {
    const anchorMs = (() => {
      if (anchorDate instanceof Date && !Number.isNaN(anchorDate.getTime())) {
        return anchorDate.getTime();
      }
      if (typeof anchorDate === 'string' && anchorDate.trim()) {
        const parsedAnchor = Date.parse(anchorDate);
        if (!Number.isNaN(parsedAnchor)) return parsedAnchor;
      }
      return Date.now();
    })();

    const raw = String(reviewDate || '')
      .replace(/^(?:edited|reviewed|updated|posted)\s+/i, '')
      .trim();

    if (!raw) return anchorMs;

    const lower = raw.toLowerCase();
    if (lower === 'just now' || lower === 'today' || lower.includes('hour') || lower.includes('minute')) {
      return anchorMs;
    }
    if (lower === 'yesterday') {
      return anchorMs - 24 * 60 * 60 * 1000;
    }

    // Relative strings: "a week ago", "2 weeks ago", "3 months ago", "a year ago", etc.
    const relMatch = lower.match(
      /\b(a|an|one|\d+)\s*(day|week|month|year)s?\s*ago\b/i
    );
    if (relMatch) {
      const qtyRaw = relMatch[1].toLowerCase();
      const qty = qtyRaw === 'a' || qtyRaw === 'an' || qtyRaw === 'one' ? 1 : Number(qtyRaw) || 1;
      const unit = relMatch[2].toLowerCase();
      const dayMs = 24 * 60 * 60 * 1000;
      const unitMs =
        unit === 'day'
          ? dayMs
          : unit === 'week'
          ? 7 * dayMs
          : unit === 'month'
          ? 30.44 * dayMs
          : 365.25 * dayMs;
      return Math.round(anchorMs - qty * unitMs);
    }

    // Direct calendar date parse: "2026-03-15", "Oct 14, 2025", "09/18/2025"
    const directMs = Date.parse(raw);
    if (!Number.isNaN(directMs) && directMs > 946684800000) {
      return directMs;
    }

    // Bare 4-digit year fallback (e.g. "2025")
    const yearOnly = raw.match(/\b(20\d{2})\b/);
    if (yearOnly) {
      return Date.UTC(Number(yearOnly[1]), 5, 15);
    }

    return anchorMs;
  }

  /**
   * Filters strictly to Google, Houzz, Yelp & HomeAdvisor, strips owner replies,
   * sorts newest-first by normalized review recency, and takes at most 500 reviews (no minimum).
   */
  public selectMostRecentCleanReviews(
    reviews: ReviewToAnalyze[],
    businessName: string,
    maxReviews = AiReviewSummaryService.MAX_REVIEW_WINDOW
  ): Array<{
    platform: AiSupportedReviewPlatform;
    rating: number;
    cleanComment: string;
    reviewDate?: string;
    recencyMs: number;
  }> {
    const cappedLimit = Math.min(
      AiReviewSummaryService.MAX_REVIEW_WINDOW,
      Math.max(1, Number(maxReviews) || AiReviewSummaryService.MAX_REVIEW_WINDOW)
    );

    const prepared: Array<{
      platform: AiSupportedReviewPlatform;
      rating: number;
      cleanComment: string;
      reviewDate?: string;
      recencyMs: number;
      origIdx: number;
    }> = [];

    for (let i = 0; i < (reviews || []).length; i++) {
      const r = reviews[i];
      const normPlat = String(r.platform || 'GOOGLE')
        .trim()
        .toUpperCase() as AiSupportedReviewPlatform;

      if (!AiReviewSummaryService.SUPPORTED_PLATFORMS.has(normPlat)) {
        continue;
      }

      const cleanComment = this.cleanCustomerReviewText(r.comment, businessName);
      if (!cleanComment) continue;

      const rating = Math.min(5, Math.max(1, Math.round(Number(r.rating) || 5)));
      const anchor = r.updatedAt || r.createdAt || null;
      const recencyMs = this.parseReviewRecencyMs(r.reviewDate, anchor);

      prepared.push({
        platform: normPlat,
        rating,
        cleanComment,
        reviewDate: r.reviewDate ? String(r.reviewDate).trim() : undefined,
        recencyMs,
        origIdx: i,
      });
    }

    prepared.sort((a, b) =>
      b.recencyMs !== a.recencyMs ? b.recencyMs - a.recencyMs : a.origIdx - b.origIdx
    );

    return prepared.slice(0, cappedLimit).map(({ origIdx, ...item }) => item);
  }

  private extractJsonObject(rawText: string): Record<string, any> | null {
    if (!rawText) return null;
    const stripped = rawText
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/\s*```$/i, '')
      .trim();

    const firstBrace = stripped.indexOf('{');
    const lastBrace = stripped.lastIndexOf('}');
    if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) {
      return null;
    }

    const candidate = stripped.slice(firstBrace, lastBrace + 1);
    try {
      return JSON.parse(candidate);
    } catch {
      // Repair trailing commas before } or ]
      const repaired = candidate.replace(/,\s*([}\]])/g, '$1');
      try {
        return JSON.parse(repaired);
      } catch {
        return null;
      }
    }
  }

  private sanitizeProseSummary(raw: string): string {
    return String(raw || '')
      .replace(/^["'“”]+|["'“”]+$/g, '')
      .replace(/\*\*/g, '')
      .replace(/^#+\s+.*$/gm, '')
      .replace(/^\s*[-*•]\s+/gm, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Deterministically verifies every AI candidate tag against the actual selected reviews,
   * selects the single best real search keyword (so 1-click tag search in ReviewsModal
   * ALWAYS finds real matching reviews), and supplements with verified lexical themes if needed.
   */
  private verifyAndRankTags(
    aiTagsRaw: any[],
    selectedReviews: Array<{ cleanComment: string; rating: number }>
  ): AiReviewTagItem[] {
    const total = selectedReviews.length;
    if (total === 0) return [];

    const lowerComments = selectedReviews.map((r) => r.cleanComment.toLowerCase());
    const minMatchesRequired = total >= 12 ? 2 : 1;
    const targetMaxTags = total <= 2 ? 3 : total <= 5 ? 5 : 7;

    const validCategories = new Set<AiReviewTagCategory>([
      'craftsmanship',
      'punctuality',
      'pricing',
      'communication',
      'cleanliness',
      'specialty',
      'trust',
    ]);
    const validSentiments = new Set<AiReviewTagSentiment>(['positive', 'neutral', 'caution']);

    const evaluateCandidate = (
      label: string,
      terms: string[],
      sentiment: AiReviewTagSentiment,
      category: AiReviewTagCategory
    ): AiReviewTagItem | null => {
      const cleanTerms = Array.from(
        new Set(
          terms
            .map((t) => String(t || '').toLowerCase().trim())
            .filter((t) => t.length >= 3 && t.length <= 28)
        )
      );
      if (cleanTerms.length === 0) return null;

      let unionCount = 0;
      for (const comment of lowerComments) {
        if (cleanTerms.some((term) => comment.includes(term))) {
          unionCount++;
        }
      }
      if (unionCount < minMatchesRequired) return null;

      // Pick the single search token that directly matches the highest number of reviews
      // so clicking this tag in ReviewsModal (`comment.includes(search)`) always shows real results!
      let bestSearchKeyword = cleanTerms[0];
      let bestKeywordHits = 0;
      for (const term of cleanTerms) {
        let hits = 0;
        for (const comment of lowerComments) {
          if (comment.includes(term)) hits++;
        }
        if (hits > bestKeywordHits) {
          bestKeywordHits = hits;
          bestSearchKeyword = term;
        }
      }

      if (bestKeywordHits < 1) return null;

      const cleanLabel = String(label || '')
        .replace(/[^\w\s&/-]/g, '')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 28);
      if (cleanLabel.length < 3) return null;

      return {
        label: cleanLabel,
        keyword: bestSearchKeyword,
        mentionCount: unionCount,
        sentiment,
        category,
      };
    };

    const verified: AiReviewTagItem[] = [];
    const seenLabels = new Set<string>();
    const seenKeywords = new Set<string>();

    for (const raw of Array.isArray(aiTagsRaw) ? aiTagsRaw : []) {
      if (!raw || typeof raw !== 'object') continue;
      const rawCat = String(raw.category || 'craftsmanship').toLowerCase() as AiReviewTagCategory;
      const category: AiReviewTagCategory = validCategories.has(rawCat)
        ? rawCat
        : 'craftsmanship';
      const rawSent = String(raw.sentiment || 'positive').toLowerCase() as AiReviewTagSentiment;
      const sentiment: AiReviewTagSentiment = validSentiments.has(rawSent)
        ? rawSent
        : 'positive';

      const candidateTerms: string[] = [
        raw.keyword,
        ...(Array.isArray(raw.synonyms) ? raw.synonyms : []),
      ].filter((x): x is string => typeof x === 'string');

      // Also derive meaningful words (>=4 chars) from label as backup matching roots
      const labelWords = String(raw.label || '')
        .toLowerCase()
        .split(/[\s&/-]+/)
        .filter((w) => w.length >= 4 && !['very', 'good', 'great', 'best', 'with', 'high'].includes(w));
      candidateTerms.push(...labelWords);

      const evaluated = evaluateCandidate(raw.label, candidateTerms, sentiment, category);
      if (!evaluated) continue;

      const normLabel = evaluated.label.toLowerCase();
      if (seenLabels.has(normLabel) || seenKeywords.has(evaluated.keyword)) continue;

      seenLabels.add(normLabel);
      seenKeywords.add(evaluated.keyword);
      verified.push(evaluated);
    }

    // Curated contractor lexicon fallback so strong real themes are never missed
    const fallbackLexicon: Array<{
      label: string;
      terms: string[];
      category: AiReviewTagCategory;
      sentiment: AiReviewTagSentiment;
    }> = [
      {
        label: 'Quality Workmanship',
        terms: ['craftsmanship', 'workmanship', 'quality', 'meticulous', 'detail', 'flawless'],
        category: 'craftsmanship',
        sentiment: 'positive',
      },
      {
        label: 'Punctual & On-Time',
        terms: ['on time', 'punctual', 'schedule', 'prompt', 'timely', 'quickly'],
        category: 'punctuality',
        sentiment: 'positive',
      },
      {
        label: 'Clear Communication',
        terms: ['communicat', 'responsive', 'explained', 'informed', 'questions', 'updates'],
        category: 'communication',
        sentiment: 'positive',
      },
      {
        label: 'Spotless Cleanup',
        terms: ['clean', 'spotless', 'neat', 'debris', 'tidy', 'swept'],
        category: 'cleanliness',
        sentiment: 'positive',
      },
      {
        label: 'Fair & Honest Pricing',
        terms: ['price', 'pricing', 'reasonable', 'fair', 'estimate', 'quote', 'budget', 'affordable'],
        category: 'pricing',
        sentiment: 'positive',
      },
      {
        label: 'Professional Crew',
        terms: ['professional', 'courteous', 'polite', 'respectful', 'crew', 'team'],
        category: 'trust',
        sentiment: 'positive',
      },
      {
        label: 'Leak & Repair Experts',
        terms: ['leak', 'repair', 'roof', 'flat roof', 'shingle', 'flashing'],
        category: 'specialty',
        sentiment: 'positive',
      },
      {
        label: 'Custom Design Fit',
        terms: ['cabinet', 'custom', 'kitchen', 'design', 'install', 'finish'],
        category: 'specialty',
        sentiment: 'positive',
      },
    ];

    if (verified.length < targetMaxTags) {
      const extras: AiReviewTagItem[] = [];
      for (const item of fallbackLexicon) {
        const evaluated = evaluateCandidate(
          item.label,
          item.terms,
          item.sentiment,
          item.category
        );
        if (!evaluated) continue;
        if (
          seenLabels.has(evaluated.label.toLowerCase()) ||
          seenKeywords.has(evaluated.keyword)
        ) {
          continue;
        }
        extras.push(evaluated);
      }
      extras.sort((a, b) => b.mentionCount - a.mentionCount);
      for (const ex of extras) {
        if (verified.length >= targetMaxTags) break;
        seenLabels.add(ex.label.toLowerCase());
        seenKeywords.add(ex.keyword);
        verified.push(ex);
      }
    }

    verified.sort((a, b) => b.mentionCount - a.mentionCount);
    return verified.slice(0, targetMaxTags);
  }

  /**
   *Bounded-concurrency async mapper for parallel 100-review Map batches.
   */
  private async mapWithConcurrency<T, R>(
    items: T[],
    concurrency: number,
    worker: (item: T, index: number) => Promise<R>
  ): Promise<R[]> {
    const results: R[] = new Array(items.length);
    let cursor = 0;

    const runLane = async () => {
      while (true) {
        const idx = cursor++;
        if (idx >= items.length) return;
        results[idx] = await worker(items[idx], idx);
      }
    };

    const lanes = Array.from(
      { length: Math.min(concurrency, items.length) },
      () => runLane()
    );
    await Promise.all(lanes);
    return results;
  }

  /**
   * Analyzes up to 500 most recent verified customer reviews across Google, Houzz, Yelp & HomeAdvisor.
   * No minimum review cutoff (1..500); returns null ONLY when 0 clean text reviews exist.
   * Outputs a short, crisp, confidence-building AI summary + verified clickable highlight tags.
   */
  async analyzeContractorReviews(input: {
    businessName: string;
    category?: string;
    services?: string[];
    reviews: ReviewToAnalyze[];
    maxReviews?: number;
  }): Promise<AiReviewAnalysisPayload | null> {
    const selected = this.selectMostRecentCleanReviews(
      input.reviews || [],
      input.businessName,
      input.maxReviews ?? AiReviewSummaryService.MAX_REVIEW_WINDOW
    );

    if (selected.length === 0) {
      this.logger.log(
        `ℹ️ [AI Review Analysis] Skipping "${input.businessName}" — 0 clean text reviews across Google/Houzz/Yelp/HomeAdvisor.`
      );
      return null;
    }

    const platformsIncluded: Partial<Record<AiSupportedReviewPlatform, number>> = {};
    let ratingSum = 0;
    for (const r of selected) {
      platformsIncluded[r.platform] = (platformsIncluded[r.platform] || 0) + 1;
      ratingSum += r.rating;
    }
    const averageRating = Math.round((ratingSum / selected.length) * 10) / 10;

    const platformBreakdownStr = Object.entries(platformsIncluded)
      .map(([plat, cnt]) => `${plat}: ${cnt}`)
      .join(', ');

    const platformShortCode = (p: AiSupportedReviewPlatform) =>
      p === 'GOOGLE' ? 'G' : p === 'HOUZZ' ? 'HZ' : p === 'YELP' ? 'Y' : 'HA';

    const formatCompactReviewLine = (
      r: { platform: AiSupportedReviewPlatform; rating: number; cleanComment: string },
      idx: number
    ) => {
      const clipped =
        r.cleanComment.length > 420
          ? `${r.cleanComment.slice(0, 417).trim()}...`
          : r.cleanComment;
      return `[#${idx + 1}|${platformShortCode(r.platform)}|${r.rating}★] ${clipped}`;
    };

    this.logger.log(
      `🤖 [AI Review Analysis] Analyzing ${selected.length} most recent review(s) (${platformBreakdownStr}) for "${input.businessName}"...`
    );

    const isSmallSample = selected.length <= 5;
    const sentenceRule = isSmallSample
      ? `Write 2 to 3 crisp, grounded sentences (38 to 62 words total) strictly reflecting these ${selected.length} review(s) without exaggerating volume.`
      : `Write 3 to 4 crisp, high-confidence sentences (60 to 88 words total) — NOT too long, NOT too short — so a homeowner immediately feels informed and confident without reading all ${selected.length} reviews.`;

    const synthesisSystemPrompt = [
      'You are a senior homeowner-trust & contractor review analyst for a vetted NYC home-improvement directory.',
      'CRITICAL OUTPUT RULES:',
      '1. Output ONLY valid JSON matching the exact schema requested — no markdown code fences, no commentary.',
      '2. Stay 100% faithful to real facts present in the customer reviews. NEVER invent unmentioned services, prices, warranties, or fake claims.',
      '3. NEVER use robotic AI cliches ("testament to", "look no further", "unparalleled", "seamless blend", "elevate", "boasts", "delve"). Write clear, natural, human-sounding editorial prose.',
      '4. Never mention "Google", "Yelp", "Houzz", or "HomeAdvisor" by name inside the summary prose (platform badges are already shown in the UI).',
      '5. Focus on what builds genuine customer confidence: workmanship quality, crew punctuality & communication, worksite cleanliness, pricing/estimate honesty, and specific project types homeowners praise.',
    ].join('\n');

    const jsonSchemaPrompt = `{
  "verdictHeadline": "Crisp 8-14 word confidence headline summarizing why homeowners trust ${input.businessName}",
  "summary": "${sentenceRule} Single plain-text paragraph, zero bullet points, zero quotes.",
  "tags": [
    {
      "label": "2-3 word Title Case badge (e.g. Spotless Cleanup, Transparent Pricing, Master Craftsmanship)",
      "keyword": "single lowercase root word actually appearing in the reviews (e.g. clean, price, roof, cabinet, time)",
      "synonyms": ["2 to 4 lowercase related words from the reviews"],
      "sentiment": "positive | neutral | caution",
      "category": "craftsmanship | punctuality | pricing | communication | cleanliness | specialty | trust"
    }
  ]
}
Provide ${isSmallSample ? '3 to 5' : '6 to 8'} distinct, high-signal tags grounded in the reviews.`;

    let parsedJson: Record<string, any> | null = null;

    try {
      if (selected.length <= AiReviewSummaryService.MAP_BATCH_SIZE) {
        // Fast 1-pass analysis for 1..100 reviews
        const reviewsBlock = selected.map(formatCompactReviewLine).join('\n');
        const userPrompt = [
          `Contractor: ${input.businessName}`,
          input.category ? `Primary Trade: ${input.category}` : '',
          input.services?.length ? `Known Services: ${input.services.slice(0, 8).join(', ')}` : '',
          `Analyzed Sample: ${selected.length} most recent verified review(s) (Average: ${averageRating}★)`,
          '',
          '=== RECENT VERIFIED HOMEOWNER REVIEWS ===',
          reviewsBlock,
          '',
          'Return ONLY a JSON object with this exact structure:',
          jsonSchemaPrompt,
        ]
          .filter(Boolean)
          .join('\n');

        const rawOut = await this.callOpenRouter(userPrompt, synthesisSystemPrompt, {
          model: this.synthesisModel,
          temperature: 0.25,
          maxTokens: 850,
        });
        parsedJson = this.extractJsonObject(rawOut);
      } else {
        // Parallel Map-Reduce for 101..500 reviews (batches of 100, concurrency 3)
        const chunks: (typeof selected)[] = [];
        for (
          let i = 0;
          i < selected.length;
          i += AiReviewSummaryService.MAP_BATCH_SIZE
        ) {
          chunks.push(selected.slice(i, i + AiReviewSummaryService.MAP_BATCH_SIZE));
        }

        const mapSystemPrompt =
          'You extract concise, factual homeowner sentiment digests from contractor review batches. Stay strictly grounded in the text. Be brief and concrete.';

        const batchDigests = await this.mapWithConcurrency(
          chunks,
          AiReviewSummaryService.MAP_CONCURRENCY,
          async (chunk, batchIdx) => {
            const chunkAvg =
              Math.round(
                (chunk.reduce((acc, r) => acc + r.rating, 0) / chunk.length) * 10
              ) / 10;
            const lines = chunk
              .map((r, idx) =>
                formatCompactReviewLine(
                  r,
                  batchIdx * AiReviewSummaryService.MAP_BATCH_SIZE + idx
                )
              )
              .join('\n');

            const mapPrompt = `Analyze Batch ${batchIdx + 1}/${chunks.length} (${chunk.length} reviews, avg ${chunkAvg}★) for "${input.businessName}".
=== REVIEWS ===
${lines}

Summarize in 5 ultra-concise lines (under 140 words total):
- Top Workmanship & Project Types Praised:
- Crew Punctuality, Cleanliness & Communication:
- Pricing, Estimates & Timeline Feedback:
- Recurring Caveats/Complaints (or "None recurring"):
- Top 8 Frequent Keywords/Themes (with exact words used by customers):`;

            return this.callOpenRouter(mapPrompt, mapSystemPrompt, {
              model: this.primaryModel,
              temperature: 0.2,
              maxTokens: 320,
            });
          }
        );

        const reduceUserPrompt = [
          `Contractor: ${input.businessName}`,
          input.category ? `Primary Trade: ${input.category}` : '',
          input.services?.length ? `Known Services: ${input.services.slice(0, 8).join(', ')}` : '',
          `Total Recent Reviews Analyzed: ${selected.length} (Composite Sample Rating: ${averageRating}★ across ${platformBreakdownStr})`,
          '',
          '=== CONSOLIDATED EVIDENCE FROM ALL REVIEW BATCHES ===',
          batchDigests
            .map((d, idx) => `--- Batch ${idx + 1} (${chunks[idx].length} reviews) ---\n${d}`)
            .join('\n\n'),
          '',
          'Synthesize all batches into ONE crisp, confidence-building homeowner summary and top tags. Return ONLY valid JSON matching this structure:',
          jsonSchemaPrompt,
        ]
          .filter(Boolean)
          .join('\n');

        const rawReduce = await this.callOpenRouter(
          reduceUserPrompt,
          synthesisSystemPrompt,
          {
            model: this.synthesisModel,
            temperature: 0.25,
            maxTokens: 900,
          }
        );
        parsedJson = this.extractJsonObject(rawReduce);
      }
    } catch (err: any) {
      this.logger.warn(
        `⚠️ [AI Review Analysis] LLM call failed for "${input.businessName}": ${err.message}. Using deterministic fallback synthesis.`
      );
    }

    const verifiedTags = this.verifyAndRankTags(parsedJson?.tags || [], selected);

    let cleanSummary = this.sanitizeProseSummary(parsedJson?.summary || '');
    let cleanHeadline = this.sanitizeProseSummary(parsedJson?.verdictHeadline || '');

    // Graceful deterministic fallback if LLM output was empty or unparseable
    if (cleanSummary.length < 35) {
      const topTagLabels = verifiedTags
        .slice(0, 3)
        .map((t) => t.label.toLowerCase());
      const strengthsPhrase =
        topTagLabels.length >= 2
          ? `${topTagLabels.slice(0, -1).join(', ')} and ${topTagLabels[topTagLabels.length - 1]}`
          : topTagLabels[0] || 'dependable workmanship and responsive service';

      cleanSummary =
        selected.length === 1
          ? `Early verified homeowner feedback for ${input.businessName} reflects a ${averageRating.toFixed(1)}-star experience highlighting ${strengthsPhrase}. Customers note attentive execution and straightforward communication from start to finish.`
          : `Across ${selected.length} recent verified reviews averaging ${averageRating.toFixed(1)} stars, homeowners consistently commend ${input.businessName} for ${strengthsPhrase}. Reviewers highlight attentive project execution, reliable scheduling, and straightforward communication from initial estimate through final cleanup.`;
    }

    if (cleanHeadline.length < 12) {
      const leadStrength = verifiedTags[0]?.label || 'Quality Workmanship';
      const secondStrength = verifiedTags[1]?.label || 'Reliable Service';
      cleanHeadline = `Rated ${averageRating.toFixed(1)}★ by homeowners for ${leadStrength.toLowerCase()} and ${secondStrength.toLowerCase()}`;
    }

    return {
      verdictHeadline: cleanHeadline,
      summary: cleanSummary,
      tags: verifiedTags,
      analyzedCount: selected.length,
      maxWindowSize: AiReviewSummaryService.MAX_REVIEW_WINDOW,
      platformsIncluded,
      averageRating,
      generatedAt: new Date().toISOString(),
      version: 2,
    };
  }

  /**
   * Backwards-compatible wrapper returning the crisp plain-text summary string.
   */
  async generateProgressiveSummary(
    businessName: string,
    reviews: ReviewToAnalyze[]
  ): Promise<string> {
    const analysis = await this.analyzeContractorReviews({
      businessName,
      reviews,
    });
    return analysis?.summary || '';
  }
}
