import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { LoggerService } from '../../common/services/logger.service';
import OpenAI from 'openai';

export interface EmbeddingResult {
  text: string;
  embedding: number[];
  metadata?: Record<string, any>;
}

export interface BatchEmbeddingResult {
  embeddings: EmbeddingResult[];
  model: string;
  dimensions: number;
  totalTokens: number;
}

/**
 * Production EmbeddingsService — OpenAI text-embedding-3-small (1536 dims)
 */
@Injectable()
export class EmbeddingsService implements OnModuleInit {
  private client: OpenAI | null = null;
  private model = 'text-embedding-3-small';
  private embeddingDimensions = 1536;
  private maxBatchSize = 100;
  private maxTokensPerBatch = 8000;

  constructor(
    private readonly configService: ConfigService,
    private readonly logger: LoggerService,
  ) {
    this.logger.setContext('EmbeddingsService');
  }

  async onModuleInit() {
    const apiKey = this.configService.get<string>('OPENAI_API_KEY') || process.env.OPENAI_API_KEY;
    if (!apiKey) {
      this.logger.warn('OPENAI_API_KEY not configured — embeddings will return zero vectors');
      return;
    }
    this.client = new OpenAI({ apiKey });
    this.model = this.configService.get<string>('OPENAI_EMBEDDING_MODEL') || this.model;
    this.logger.log(`EmbeddingsService initialized with model=${this.model}`);
  }

  private zeroVector(): number[] {
    return new Array(this.embeddingDimensions).fill(0);
  }

  async embedText(text: string, metadata?: Record<string, any>): Promise<EmbeddingResult> {
    if (!this.client) return { text, embedding: this.zeroVector(), metadata };
    try {
      const res = await this.client.embeddings.create({ model: this.model, input: text });
      return { text, embedding: res.data[0].embedding, metadata };
    } catch (e: any) {
      this.logger.error(`embedText failed: ${e.message}`);
      return { text, embedding: this.zeroVector(), metadata };
    }
  }

  async embedBatch(
    texts: string[],
    metadata?: Array<Record<string, any> | undefined>,
  ): Promise<BatchEmbeddingResult> {
    if (!this.client) {
      return {
        embeddings: texts.map((text, i) => ({ text, embedding: this.zeroVector(), metadata: metadata?.[i] })),
        model: this.model,
        dimensions: this.embeddingDimensions,
        totalTokens: 0,
      };
    }
    const results: EmbeddingResult[] = [];
    let totalTokens = 0;
    for (let i = 0; i < texts.length; i += this.maxBatchSize) {
      const chunk = texts.slice(i, i + this.maxBatchSize);
      try {
        const res = await this.client.embeddings.create({ model: this.model, input: chunk });
        totalTokens += res.usage?.total_tokens || 0;
        for (let j = 0; j < chunk.length; j++) {
          results.push({ text: chunk[j], embedding: res.data[j].embedding, metadata: metadata?.[i + j] });
        }
      } catch (e: any) {
        this.logger.error(`embedBatch failed at offset ${i}: ${e.message}`);
        for (let j = 0; j < chunk.length; j++) {
          results.push({ text: chunk[j], embedding: this.zeroVector(), metadata: metadata?.[i + j] });
        }
      }
    }
    return { embeddings: results, model: this.model, dimensions: this.embeddingDimensions, totalTokens };
  }

  async embedDocuments(documents: Array<{ content: string; metadata?: Record<string, any> }>): Promise<BatchEmbeddingResult> {
    return this.embedBatch(documents.map(d => d.content), documents.map(d => d.metadata));
  }

  async embedTexts(texts: string[], metadata?: Array<Record<string, any> | undefined>): Promise<BatchEmbeddingResult> {
    return this.embedBatch(texts, metadata);
  }

  getDimensions(): number { return this.embeddingDimensions; }
  getMaxBatchSize(): number { return this.maxBatchSize; }

  cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) return 0;
    let dot = 0, na = 0, nb = 0;
    for (let i = 0; i < a.length; i++) { dot += a[i] * b[i]; na += a[i] * a[i]; nb += b[i] * b[i]; }
    const denom = Math.sqrt(na) * Math.sqrt(nb);
    return denom ? dot / denom : 0;
  }

  euclideanDistance(a: number[], b: number[]): number {
    if (a.length !== b.length) return Infinity;
    let s = 0;
    for (let i = 0; i < a.length; i++) s += (a[i] - b[i]) ** 2;
    return Math.sqrt(s);
  }

  async computeSimilarity(a: number[], b: number[]): Promise<number> {
    return this.cosineSimilarity(a, b);
  }

  async findMostSimilar(
    queryEmbedding: number[],
    embeddings: EmbeddingResult[],
    topK = 5,
  ): Promise<Array<EmbeddingResult & { similarity: number }>> {
    return embeddings
      .map(e => ({ ...e, similarity: this.cosineSimilarity(queryEmbedding, e.embedding) }))
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, topK);
  }

  isInitialized(): boolean { return this.client !== null; }
}
