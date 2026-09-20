import { Injectable, Logger } from '@nestjs/common';
import * as https from 'https';

export interface ReviewToAnalyze {
  comment: string;
  rating?: number;
  authorName?: string;
  platform?: string;
  reviewDate?: string;
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
    model = this.primaryModel
  ): Promise<string> {
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      throw new Error('OPENROUTER_API_KEY is not defined in .env');
    }

    const modelsToTry = [model, ...this.fallbackModels.filter((m) => m !== model)];

    for (const currentModel of modelsToTry) {
      try {
        const result = await new Promise<string>((resolve, reject) => {
          const payload = JSON.stringify({
            model: currentModel,
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: prompt },
            ],
            temperature: 0.3,
            max_tokens: 1200,
          });

          const req = https.request(
            'https://openrouter.ai/api/v1/chat/completions',
            {
              method: 'POST',
              headers: {
                Authorization: `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
                'HTTP-Referer': 'https://findyourexperts.com',
                'X-Title': 'FindYourExperts AI Summary',
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

        this.logger.log(`🤖 [AI Review Summary] Generated successfully with model "${currentModel}"`);
        return result;
      } catch (err: any) {
        this.logger.warn(
          `⚠️ [AI Review Summary] Model "${currentModel}" failed: ${err.message}. Trying fallback...`
        );
      }
    }

    throw new Error('All OpenRouter Mistral models failed to generate review summary.');
  }

  /**
   * Generates progressive chunked summary (20 reviews per batch)
   * Progressive logic:
   *  - Batch 1 (1-20 reviews): Initial comprehensive summary
   *  - Batch 2 (21-40 reviews): Feeds previous summary + new reviews to refine
   *  - Batch N: Continues consolidating into a single refined final summary
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
5. **Best Suited For**: Specific roofing and exterior tasks customers recommend them for.`;

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
