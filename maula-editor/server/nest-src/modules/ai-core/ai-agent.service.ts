import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { LoggerService } from '../../common/services/logger.service';
import OpenAI from 'openai';

export interface AgentAction {
  type: string;
  payload: Record<string, any>;
}

export interface AgentResult {
  success: boolean;
  message: string;
  actions: AgentAction[];
}

export interface AgentTool {
  name: string;
  description: string;
  parameters: Record<string, any>;
  execute: (args: Record<string, any>) => Promise<any>;
}

/**
 * Production AIAgentService — OpenAI chat with optional function-calling.
 */
@Injectable()
export class AIAgentService {
  private openai: OpenAI | null = null;
  private chatModel = 'gpt-4o-mini';
  private tools = new Map<string, AgentTool>();
  private conversations = new Map<string, Array<{ role: string; content: string }>>();

  constructor(
    private readonly configService: ConfigService,
    private readonly logger: LoggerService,
  ) {
    this.logger.setContext('AIAgentService');
    const apiKey = this.configService.get<string>('OPENAI_API_KEY') || process.env.OPENAI_API_KEY;
    if (apiKey) {
      this.openai = new OpenAI({ apiKey });
      this.chatModel = this.configService.get<string>('OPENAI_CHAT_MODEL') || this.chatModel;
    } else {
      this.logger.warn('OPENAI_API_KEY not set — AIAgentService disabled');
    }
  }

  registerTool(tool: AgentTool): void {
    this.tools.set(tool.name, tool);
  }

  async getAvailableTools(): Promise<string[]> {
    return Array.from(this.tools.keys());
  }

  private toOpenAiTools() {
    return Array.from(this.tools.values()).map((t) => ({
      type: 'function' as const,
      function: { name: t.name, description: t.description, parameters: t.parameters },
    }));
  }

  async executeTask(task: string, context?: Record<string, any>): Promise<AgentResult> {
    if (!this.openai) {
      return { success: false, message: 'OPENAI_API_KEY not configured', actions: [] };
    }
    const messages: any[] = [
      { role: 'system', content: 'You are an AI agent. Use available tools to complete the task. Be concise.' },
      ...((context?.priorMessages as any[]) || []),
      { role: 'user', content: task },
    ];
    const actions: AgentAction[] = [];
    const maxIterations = (context?.maxIterations as number) || 5;

    try {
      for (let iter = 0; iter < maxIterations; iter++) {
        const completion = await this.openai.chat.completions.create({
          model: this.chatModel,
          messages,
          tools: this.tools.size > 0 ? this.toOpenAiTools() : undefined,
          temperature: 0.2,
        });
        const msg = completion.choices[0]?.message;
        if (!msg) break;
        messages.push(msg);

        if (msg.tool_calls?.length) {
          for (const call of msg.tool_calls) {
            const tool = this.tools.get(call.function.name);
            let result: any;
            let args: any = {};
            try {
              args = JSON.parse(call.function.arguments || '{}');
              result = tool ? await tool.execute(args) : { error: `Tool ${call.function.name} not found` };
              actions.push({ type: call.function.name, payload: args });
            } catch (e: any) {
              result = { error: e.message };
            }
            messages.push({ role: 'tool', tool_call_id: call.id, content: JSON.stringify(result) });
          }
          continue;
        }

        return { success: true, message: msg.content || '', actions };
      }
      return { success: true, message: '[max iterations reached]', actions };
    } catch (e: any) {
      this.logger.error(`executeTask failed: ${e.message}`);
      return { success: false, message: e.message, actions };
    }
  }

  async processMessage(message: string, conversationId?: string): Promise<string> {
    if (!this.openai) return 'OPENAI_API_KEY not configured';
    const cid = conversationId || 'default';
    const history = this.conversations.get(cid) || [];
    const messages: any[] = [
      { role: 'system', content: 'You are a helpful AI assistant.' },
      ...history,
      { role: 'user', content: message },
    ];
    try {
      const completion = await this.openai.chat.completions.create({
        model: this.chatModel,
        messages,
        temperature: 0.5,
      });
      const reply = completion.choices[0]?.message?.content || '';
      history.push({ role: 'user', content: message }, { role: 'assistant', content: reply });
      this.conversations.set(cid, history.slice(-40));
      return reply;
    } catch (e: any) {
      this.logger.error(`processMessage failed: ${e.message}`);
      return `Error: ${e.message}`;
    }
  }

  resetConversation(conversationId: string): void {
    this.conversations.delete(conversationId);
  }
}
