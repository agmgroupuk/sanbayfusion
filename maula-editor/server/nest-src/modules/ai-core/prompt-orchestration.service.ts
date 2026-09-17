import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { LoggerService } from '../../common/services/logger.service';
import OpenAI from 'openai';

export interface CustomPromptTemplate {
  id: string;
  name: string;
  description: string;
  systemPrompt: string;
  userTemplate: string;
  variables: string[];
  category: PromptCategory;
  version: number;
  metadata?: Record<string, any>;
}

export type PromptCategory =
  | 'code-generation'
  | 'code-review'
  | 'documentation'
  | 'debugging'
  | 'testing'
  | 'refactoring'
  | 'explanation'
  | 'conversation'
  | 'custom';

export interface PromptExecutionResult {
  output: string;
  templateId: string;
  variables: Record<string, any>;
  tokenUsage?: { prompt: number; completion: number; total: number };
  latencyMs: number;
}

export interface ChainConfig {
  steps: ChainStep[];
  parallel?: boolean;
  stopOnError?: boolean;
}

export interface ChainStep {
  name: string;
  templateId?: string;
  customPrompt?: string;
  systemPrompt?: string;
  inputMapping?: Record<string, string>;
  outputKey?: string;
  condition?: (input: any) => boolean;
}

/**
 * Production PromptOrchestrationService — template registry + chained execution
 * via OpenAI chat completions.
 */
@Injectable()
export class PromptOrchestrationService implements OnModuleInit {
  private templates: Map<string, CustomPromptTemplate> = new Map();
  private openai: OpenAI | null = null;
  private chatModel = 'gpt-4o-mini';

  constructor(
    private readonly configService: ConfigService,
    private readonly logger: LoggerService,
  ) {
    this.logger.setContext('PromptOrchestrationService');
  }

  async onModuleInit() {
    const apiKey = this.configService.get<string>('OPENAI_API_KEY') || process.env.OPENAI_API_KEY;
    if (apiKey) {
      this.openai = new OpenAI({ apiKey });
      this.chatModel = this.configService.get<string>('OPENAI_CHAT_MODEL') || this.chatModel;
      this.logger.log(`PromptOrchestrationService ready model=${this.chatModel}`);
    } else {
      this.logger.warn('OPENAI_API_KEY not set');
    }
  }

  private fillTemplate(tpl: string, vars: Record<string, any>): string {
    return tpl.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, k) => {
      const v = vars[k];
      if (v === undefined || v === null) return '';
      return typeof v === 'string' ? v : JSON.stringify(v);
    });
  }

  private async run(systemPrompt: string, userPrompt: string): Promise<{ output: string; usage?: any }> {
    if (!this.openai) {
      return { output: 'OPENAI_API_KEY not configured', usage: undefined };
    }
    const completion = await this.openai.chat.completions.create({
      model: this.chatModel,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.3,
    });
    return {
      output: completion.choices[0]?.message?.content || '',
      usage: completion.usage,
    };
  }

  async executeTemplate(
    templateId: string,
    variables: Record<string, any>,
  ): Promise<PromptExecutionResult> {
    const start = Date.now();
    const tpl = this.templates.get(templateId);
    if (!tpl) {
      return { output: `Template ${templateId} not found`, templateId, variables, latencyMs: Date.now() - start };
    }
    const userPrompt = this.fillTemplate(tpl.userTemplate, variables);
    try {
      const { output, usage } = await this.run(tpl.systemPrompt, userPrompt);
      return {
        output,
        templateId,
        variables,
        tokenUsage: usage
          ? { prompt: usage.prompt_tokens, completion: usage.completion_tokens, total: usage.total_tokens }
          : undefined,
        latencyMs: Date.now() - start,
      };
    } catch (e: any) {
      this.logger.error(`executeTemplate failed: ${e.message}`);
      return { output: `Error: ${e.message}`, templateId, variables, latencyMs: Date.now() - start };
    }
  }

  async executeChain(
    config: ChainConfig,
    initialInput: Record<string, any>,
  ): Promise<Record<string, any>> {
    const ctx: Record<string, any> = { ...initialInput };

    const runStep = async (step: ChainStep) => {
      if (step.condition && !step.condition(ctx)) return;
      const stepVars: Record<string, any> = { ...ctx };
      if (step.inputMapping) {
        for (const [target, src] of Object.entries(step.inputMapping)) {
          stepVars[target] = ctx[src];
        }
      }
      let output: string;
      try {
        if (step.templateId) {
          const r = await this.executeTemplate(step.templateId, stepVars);
          output = r.output;
        } else if (step.customPrompt) {
          const userPrompt = this.fillTemplate(step.customPrompt, stepVars);
          const r = await this.run(step.systemPrompt || 'You are a helpful AI.', userPrompt);
          output = r.output;
        } else {
          output = '';
        }
      } catch (e: any) {
        if (config.stopOnError) throw e;
        output = `Error: ${e.message}`;
      }
      ctx[step.outputKey || step.name] = output;
    };

    if (config.parallel) {
      await Promise.all(config.steps.map(runStep));
    } else {
      for (const s of config.steps) {
        try {
          await runStep(s);
        } catch (e) {
          if (config.stopOnError) throw e;
        }
      }
    }
    return ctx;
  }

  registerTemplate(template: CustomPromptTemplate): void {
    this.templates.set(template.id, template);
  }

  getTemplate(id: string): CustomPromptTemplate | undefined {
    return this.templates.get(id);
  }

  listTemplates(category?: PromptCategory): CustomPromptTemplate[] {
    const all = Array.from(this.templates.values());
    return category ? all.filter((t) => t.category === category) : all;
  }

  isAvailable(): boolean {
    return this.openai !== null;
  }
}
