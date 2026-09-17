import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { LoggerService } from '../../common/services/logger.service';
import { VectorStoreService, SearchResult } from './vector-store.service';
import { EmbeddingsService } from './embeddings.service';
import OpenAI from 'openai';

export interface RAGContext {
  sources: SearchResult[];
  query: string;
  enhancedQuery?: string;
}

export interface RAGResponse {
  answer: string;
  context: RAGContext;
  citations: Citation[];
  confidence: number;
}

export interface Citation {
  content: string;
  source: string;
  relevance: number;
}

export interface RAGConfig {
  collectionName: string;
  topK?: number;
  minScore?: number;
  reranking?: boolean;
  maxContextLength?: number;
  includeMetadata?: boolean;
  queryExpansion?: boolean;
}

/**
 * Production RagService — retrieves from VectorStore + answers via OpenAI.
 */
@Injectable()
export class RagService {
  private openai: OpenAI | null = null;
  private chatModel = 'gpt-4o-mini';

  private readonly DEFAULT_RAG_SYSTEM_PROMPT =
    'You are an AI assistant with access to a knowledge base. Answer using only the provided context. ' +
    'Cite each fact with [n] referencing the source index. If the context lacks an answer, say so plainly.';

  constructor(
    private readonly configService: ConfigService,
    private readonly logger: LoggerService,
    private readonly vectorStore: VectorStoreService,
    private readonly embeddings: EmbeddingsService,
  ) {
    this.logger.setContext('RagService');
    const apiKey = this.configService.get<string>('OPENAI_API_KEY') || process.env.OPENAI_API_KEY;
    if (apiKey) {
      this.openai = new OpenAI({ apiKey });
      this.chatModel = this.configService.get<string>('OPENAI_CHAT_MODEL') || this.chatModel;
    } else {
      this.logger.warn('OPENAI_API_KEY not set — RAG will retrieve context but not generate answers');
    }
  }

  private buildContext(results: SearchResult[], maxLen = 8000): { text: string; citations: Citation[] } {
    const citations: Citation[] = [];
    let text = '';
    for (let i = 0; i < results.length; i++) {
      const r = results[i];
      const source = (r.document.metadata?.source as string) || (r.document.metadata?.path as string) || `doc-${r.document.id}`;
      const piece = `[${i + 1}] (${source})\n${r.document.content}\n\n`;
      if (text.length + piece.length > maxLen) break;
      text += piece;
      citations.push({ content: r.document.content.slice(0, 240), source, relevance: r.score });
    }
    return { text, citations };
  }

  async query(
    question: string,
    config: RAGConfig,
    systemPrompt?: string,
    conversationHistory?: Array<{ role: string; content: string }>,
  ): Promise<RAGResponse> {
    const topK = config.topK ?? 5;
    const minScore = config.minScore ?? 0;
    const maxLen = config.maxContextLength ?? 8000;

    const queries = config.queryExpansion ? await this.expandQuery(question) : [question];
    const all: SearchResult[] = [];
    for (const q of queries) {
      const r = await this.vectorStore.search(config.collectionName, q, topK);
      all.push(...r);
    }
    // dedupe by document id, sort by score
    const seen = new Set<string>();
    const unique = all
      .filter(r => r.score >= minScore)
      .sort((a, b) => b.score - a.score)
      .filter(r => seen.has(r.document.id) ? false : (seen.add(r.document.id), true))
      .slice(0, topK);

    const { text: ctx, citations } = this.buildContext(unique, maxLen);

    if (!this.openai || unique.length === 0) {
      return {
        answer: unique.length === 0 ? 'No relevant context found.' : 'OpenAI not configured.',
        context: { sources: unique, query: question },
        citations,
        confidence: 0,
      };
    }

    const messages: any[] = [
      { role: 'system', content: systemPrompt || this.DEFAULT_RAG_SYSTEM_PROMPT },
      ...(conversationHistory || []),
      { role: 'user', content: `Context:\n${ctx}\n\nQuestion: ${question}` },
    ];
    try {
      const completion = await this.openai.chat.completions.create({
        model: this.chatModel,
        messages,
        temperature: 0.2,
      });
      const answer = completion.choices[0]?.message?.content || '';
      const avgScore = unique.reduce((s, r) => s + r.score, 0) / Math.max(1, unique.length);
      return { answer, context: { sources: unique, query: question }, citations, confidence: Math.min(1, avgScore) };
    } catch (e: any) {
      this.logger.error(`RAG query failed: ${e.message}`);
      return { answer: `Error: ${e.message}`, context: { sources: unique, query: question }, citations, confidence: 0 };
    }
  }

  async queryWithStreaming(
    question: string,
    config: RAGConfig,
    onToken: (token: string) => void,
    systemPrompt?: string,
    conversationHistory?: Array<{ role: string; content: string }>,
  ): Promise<RAGResponse> {
    if (!this.openai) {
      const r = await this.query(question, config, systemPrompt, conversationHistory);
      onToken(r.answer);
      return r;
    }
    const topK = config.topK ?? 5;
    const sources = await this.vectorStore.search(config.collectionName, question, topK);
    const { text: ctx, citations } = this.buildContext(sources, config.maxContextLength ?? 8000);

    const messages: any[] = [
      { role: 'system', content: systemPrompt || this.DEFAULT_RAG_SYSTEM_PROMPT },
      ...(conversationHistory || []),
      { role: 'user', content: `Context:\n${ctx}\n\nQuestion: ${question}` },
    ];
    let answer = '';
    try {
      const stream = await this.openai.chat.completions.create({
        model: this.chatModel,
        messages,
        temperature: 0.2,
        stream: true,
      });
      for await (const chunk of stream as any) {
        const tok = chunk.choices?.[0]?.delta?.content || '';
        if (tok) { answer += tok; onToken(tok); }
      }
    } catch (e: any) {
      this.logger.error(`RAG stream failed: ${e.message}`);
      answer = answer || `Error: ${e.message}`;
      onToken(answer);
    }
    const avgScore = sources.reduce((s, r) => s + r.score, 0) / Math.max(1, sources.length);
    return { answer, context: { sources, query: question }, citations, confidence: Math.min(1, avgScore || 0) };
  }

  async ingestDocuments(
    documents: Array<{ content: string; metadata?: Record<string, any> }>,
    collectionName: string,
  ): Promise<{ count: number; collectionName: string }> {
    const docs = documents.map((d, i) => ({
      id: (d.metadata?.id as string) || `${collectionName}-${Date.now()}-${i}`,
      content: d.content,
      metadata: d.metadata || {},
    }));
    try {
      await this.vectorStore.addDocuments(collectionName, docs);
      return { count: docs.length, collectionName };
    } catch (e: any) {
      this.logger.error(`ingest failed: ${e.message}`);
      return { count: 0, collectionName };
    }
  }

  async expandQuery(query: string): Promise<string[]> {
    if (!this.openai) return [query];
    try {
      const completion = await this.openai.chat.completions.create({
        model: this.chatModel,
        messages: [
          { role: 'system', content: 'Generate 3 alternative phrasings of the user query for retrieval. Return as a JSON array of strings only.' },
          { role: 'user', content: query },
        ],
        temperature: 0.3,
        response_format: { type: 'json_object' as const },
      });
      const txt = completion.choices[0]?.message?.content || '{}';
      const obj = JSON.parse(txt);
      const arr = Array.isArray(obj) ? obj : (obj.queries || obj.expansions || obj.results || []);
      return [query, ...arr.filter((x: unknown) => typeof x === 'string')].slice(0, 4);
    } catch {
      return [query];
    }
  }

  async getCollectionStats(collectionName: string): Promise<{ documentCount: number; collectionName: string; dimensions: number }> {
    const stats = this.vectorStore.getCollectionStats(collectionName);
    return {
      documentCount: stats?.count ?? 0,
      collectionName,
      dimensions: stats?.dimensions ?? this.embeddings.getDimensions(),
    };
  }
}
