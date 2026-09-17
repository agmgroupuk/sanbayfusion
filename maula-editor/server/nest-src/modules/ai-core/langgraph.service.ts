import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { LoggerService } from '../../common/services/logger.service';
import OpenAI from 'openai';

export interface FileOperation {
  type: 'create' | 'edit' | 'delete' | 'read';
  path: string;
  content?: string;
}

export interface GraphConfig {
  maxIterations?: number;
  systemPrompt?: string;
  projectContext?: string;
  tools?: Array<{
    name: string;
    description: string;
    parameters: Record<string, any>;
    execute: (args: any) => Promise<any>;
  }>;
  temperature?: number;
}

export interface AgentResult {
  output: string;
  fileOperations: FileOperation[];
  terminalCommands: string[];
  iterations: number;
  toolCalls?: Array<{ name: string; args: any; result: any }>;
  success?: boolean;
}

/**
 * Production LangGraphService — iterative agent loop using OpenAI tool-calling.
 * Replaces the prior stub; no LangChain runtime dependency.
 */
@Injectable()
export class LangGraphService {
  private openai: OpenAI | null = null;
  private chatModel = 'gpt-4o-mini';

  constructor(
    private readonly configService: ConfigService,
    private readonly logger: LoggerService,
  ) {
    this.logger.setContext('LangGraphService');
    const apiKey = this.configService.get<string>('OPENAI_API_KEY') || process.env.OPENAI_API_KEY;
    if (apiKey) {
      this.openai = new OpenAI({ apiKey });
      this.chatModel = this.configService.get<string>('OPENAI_CHAT_MODEL') || this.chatModel;
    } else {
      this.logger.warn('OPENAI_API_KEY not set — LangGraphService disabled');
    }
  }

  isAvailable(): boolean {
    return this.openai !== null;
  }

  async runAgent(input: string, config: GraphConfig = {}): Promise<AgentResult> {
    if (!this.openai) {
      return {
        output: 'OPENAI_API_KEY not configured.',
        fileOperations: [],
        terminalCommands: [],
        iterations: 0,
        success: false,
      };
    }
    const maxIterations = config.maxIterations ?? 8;
    const tools = config.tools || [];
    const fileOperations: FileOperation[] = [];
    const terminalCommands: string[] = [];
    const toolCalls: AgentResult['toolCalls'] = [];

    let systemPrompt =
      config.systemPrompt ||
      'You are an autonomous coding agent. Use the provided tools to accomplish the task. ' +
        'When the task is complete, respond with a final answer (no tool calls).';
    if (config.projectContext) {
      systemPrompt += `\n\nProject context:\n${config.projectContext}`;
    }

    const messages: any[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: input },
    ];

    const oaTools = tools.length
      ? tools.map((t) => ({
          type: 'function' as const,
          function: { name: t.name, description: t.description, parameters: t.parameters },
        }))
      : undefined;

    try {
      for (let i = 0; i < maxIterations; i++) {
        const completion = await this.openai.chat.completions.create({
          model: this.chatModel,
          messages,
          tools: oaTools,
          temperature: config.temperature ?? 0.2,
        });
        const msg = completion.choices[0]?.message;
        if (!msg) break;
        messages.push(msg);

        if (msg.tool_calls?.length) {
          for (const call of msg.tool_calls) {
            const tool = tools.find((t) => t.name === call.function.name);
            let result: any;
            let parsed: any = {};
            try {
              parsed = JSON.parse(call.function.arguments || '{}');
              result = tool ? await tool.execute(parsed) : { error: `Tool ${call.function.name} not found` };
            } catch (e: any) {
              result = { error: e.message };
            }
            toolCalls!.push({ name: call.function.name, args: parsed, result });
            if (['create', 'edit', 'delete', 'read'].includes(call.function.name) && parsed.path) {
              fileOperations.push({
                type: call.function.name as FileOperation['type'],
                path: parsed.path,
                content: parsed.content,
              });
            }
            if (call.function.name === 'run' || call.function.name === 'shell') {
              if (typeof parsed.command === 'string') terminalCommands.push(parsed.command);
            }
            messages.push({ role: 'tool', tool_call_id: call.id, content: JSON.stringify(result) });
          }
          continue;
        }

        return {
          output: msg.content || '',
          fileOperations,
          terminalCommands,
          toolCalls,
          iterations: i + 1,
          success: true,
        };
      }
      return {
        output: '[max iterations reached without final answer]',
        fileOperations,
        terminalCommands,
        toolCalls,
        iterations: maxIterations,
        success: true,
      };
    } catch (e: any) {
      this.logger.error(`runAgent failed: ${e.message}`);
      return {
        output: `Error: ${e.message}`,
        fileOperations,
        terminalCommands,
        toolCalls,
        iterations: 0,
        success: false,
      };
    }
  }

  async runMultiAgentWorkflow(input: string, projectContext?: string): Promise<AgentResult> {
    return this.runAgent(input, { projectContext });
  }
}
