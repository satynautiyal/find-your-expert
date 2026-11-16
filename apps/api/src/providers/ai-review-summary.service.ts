import { Injectable, Logger } from '@nestjs/common';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as https from 'https';
import * as path from 'path';

export interface ReviewToAnalyze {
  comment: string;
  rating?: number;
  authorName?: string;
  platform?: string;
  reviewDate?: string;
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

  // Mistral Smallest Models on OpenRouter (cost-effective, fast & high accuracy)
  private readonly primaryModel = 'mistralai/ministral-3b-2512';
  private readonly fallbackModels = [
    'mistralai/mistral-nemo',
    'mistralai/mistral-small-3.2-24b-instruct',
  ];

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
   * Generates progressive chunked summary (20 reviews per batch)
   */
  async generateProgressiveSummary(
    businessName: string,
    reviews: ReviewToAnalyze[]
  ): Promise<string> {
    const validReviews = reviews.filter((r) => r.comment && r.comment.trim().length >= 5);

    if (validReviews.length === 0) {
      return `No detailed customer reviews are currently available to generate an AI summary for ${businessName}. Sync reviews from Google or Yelp to enable analysis.`;
    }

    const CHUNK_SIZE = 20;
    const chunks: ReviewToAnalyze[][] = [];
    for (let i = 0; i < validReviews.length; i += CHUNK_SIZE) {
      chunks.push(validReviews.slice(i, i + CHUNK_SIZE));
    }

    this.logger.log(
      `📊 [AI Review Summary] Analyzing ${validReviews.length} reviews in ${chunks.length} batch(es) for "${businessName}"...`
    );

    const systemPrompt =
      'You are a professional home improvement & contractor review analyst. Provide clear, objective, beautifully structured summaries for prospective customers to quickly evaluate contractor quality, reliability, pricing, and strengths.';

    let currentSummary = '';

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      const reviewsText = chunk
        .map(
          (r, idx) =>
            `[Review #${idx + 1}] (${r.platform || 'General'} - ${r.rating || 5}★) ${
              r.authorName ? 'Author: ' + r.authorName : ''
            }\nComment: "${r.comment.trim()}"`
        )
        .join('\n\n');

      if (i === 0) {
        this.logger.log(`🔄 Processing Batch 1/${chunks.length} (${chunk.length} reviews)...`);
        const prompt = `Here are ${chunk.length} customer reviews for contractor "${businessName}":

${reviewsText}

Please generate an engaging, structured review breakdown covering:
1. **Overall Verdict & Trust**: 2-3 sentences summarizing contractor reputation and customer satisfaction.
2. **Key Strengths**: Highlight craftsmanship, punctuality, speed of response, and cleanup.
3. **Pricing & Transparency**: Value for money, estimate accuracy, fair costs.
4. **Areas of Caution / Notes**: Any recurring complaints or things to verify (if none, highlight consistently positive feedback).
5. **Best Suited For**: Specific project types and services customers recommend them for.`;

        currentSummary = await this.callOpenRouter(prompt, systemPrompt);
      } else {
        this.logger.log(
          `🔄 Processing Batch ${i + 1}/${chunks.length} (${chunk.length} reviews) with progressive refinement...`
        );
        const prompt = `Here is the EXISTING consolidated summary for contractor "${businessName}":
=== CURRENT SUMMARY ===
${currentSummary}
=======================

Here is a NEW batch of ${chunk.length} additional customer reviews:
=== NEW REVIEWS BATCH ===
${reviewsText}
=========================

Task: Synthesize and refine the summary by combining new reviews into the existing findings.
Maintain the structured format:
1. **Overall Verdict & Trust**
2. **Key Strengths**
3. **Pricing & Transparency**
4. **Areas of Caution / Notes**
5. **Best Suited For**

Output the updated, consolidated final summary.`;

        currentSummary = await this.callOpenRouter(prompt, systemPrompt);
      }
    }

    return currentSummary;
  }
}
