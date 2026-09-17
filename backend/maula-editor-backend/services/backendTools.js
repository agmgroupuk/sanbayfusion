import { createLogger } from '../lib/logger.js';
const log = createLogger('backendTools');
/**
 * BACKEND TOOLS — AI Backend & API Tool Definitions + Executor
 * ═══════════════════════════════════════════════════════════════════════════════
 * 11 Anthropic-format tool definitions + unified executor.
 *
 * Architecture:
 *   1. BACKEND_TOOL_DEFINITIONS — LLM-readable tool schemas (input_schema)
 *   2. executeBackendTool()     — Routes to backendEngine, returns generated files
 *   3. isBackendTool()          — Helper for canvas.js routing
 *
 * Follows identical pattern to imageTools.js / videoTools.js / archiveTools.js:
 *   Backend defines tools → LLM decides → Backend executes
 *
 * KEY DIFFERENCE: Backend tools are CODE GENERATORS. They produce file contents
 * that the LLM should then write via the existing write_file canvas tool.
 * sideEffects carry generated file info for the frontend to display.
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import {
  apiDesign,
  fileHandling,
  authSecurity,
  rateLimiting,
  webhooks,
  backgroundJobs,
  businessLogic,
  dataLayer,
  testing,
  observability,
  devops,
  getBackendCapabilities,
} from './backendEngine.js';


// ═══════════════════════════════════════════════════════════════════════════════
// TOOL DEFINITIONS — Anthropic function-calling format
// ═══════════════════════════════════════════════════════════════════════════════

export const BACKEND_TOOL_DEFINITIONS = [

  // ─── 1. API DESIGN & BUILD ─────────────────────────────────────────────────
  {
    name: 'backend_api',
    description: `Design and scaffold REST APIs with full CRUD, versioning, OpenAPI specs, and request validation.

Actions:
- scaffold: Generate complete API scaffold (route + validation + DTOs) for a resource
- crud: Generate CRUD controller with pagination, filtering, sorting
- version: Generate versioned API router (v1, v2, etc.)
- openapi: Generate OpenAPI 3.0 spec + Swagger UI setup
- validate: Generate request validation middleware (zod, joi, yup, ajv)

USE THIS WHEN the user says: "create an API", "scaffold REST endpoints", "add CRUD for users", "set up Swagger", "generate OpenAPI spec", "add request validation", "version the API", "create routes for products", "build the users endpoint"`,
    input_schema: {
      type: 'object',
      properties: {
        action: {
          type: 'string',
          enum: ['scaffold', 'crud', 'version', 'openapi', 'validate'],
          description: 'Which API design action to perform',
        },
        resourceName: {
          type: 'string',
          description: 'Resource name, e.g. "users", "products", "orders"',
        },
        fields: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              type: { type: 'string', enum: ['string', 'number', 'boolean', 'date', 'text', 'json', 'float', 'integer'] },
              required: { type: 'boolean' },
              unique: { type: 'boolean' },
              default: { type: 'string' },
            },
          },
          description: 'Field definitions for the resource',
        },
        methods: {
          type: 'array',
          items: { type: 'string', enum: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'] },
          description: 'HTTP methods to support (default: GET, POST, PUT, DELETE)',
        },
        version: {
          type: 'string',
          description: 'API version string, e.g. "v1", "v2"',
        },
        authentication: {
          type: 'boolean',
          description: 'Whether to add auth middleware (default: true)',
        },
        pagination: {
          type: 'boolean',
          description: 'Whether to include pagination (default: true)',
        },
        filtering: {
          type: 'boolean',
          description: 'Whether to include filtering (default: true)',
        },
        sorting: {
          type: 'boolean',
          description: 'Whether to include sorting (default: true)',
        },
        validationLibrary: {
          type: 'string',
          enum: ['zod', 'joi', 'yup', 'ajv'],
          description: 'Validation library to use (default: zod)',
        },
      },
      required: ['action'],
    },
  },

  // ─── 2. FILE & FORM HANDLING ───────────────────────────────────────────────
  {
    name: 'backend_upload',
    description: `Generate file upload routes, streaming handlers, chunked upload flows, and signed-URL integrations.

Actions:
- upload_route: Standard multer-based file upload with validation and error handling
- streaming: Zero-buffering stream upload (no memory overhead)
- chunked: Chunked upload flow (init → upload chunks → merge)
- signed_url: S3 pre-signed URL upload/download endpoints
- temp_storage: Temporary file storage service with auto-cleanup

USE THIS WHEN the user says: "add file upload", "handle file uploads", "upload to S3", "chunked upload", "streaming upload", "signed URL", "temp files", "multipart form", "file validation"`,
    input_schema: {
      type: 'object',
      properties: {
        action: {
          type: 'string',
          enum: ['upload_route', 'streaming', 'chunked', 'signed_url', 'temp_storage'],
          description: 'Which file handling action to perform',
        },
        maxFileSize: {
          type: 'string',
          description: 'Max file size, e.g. "10mb", "100mb", "1gb" (default: 50mb)',
        },
        allowedTypes: {
          type: 'array',
          items: { type: 'string' },
          description: 'Allowed MIME types, e.g. ["image/*", "application/pdf"]',
        },
        maxFiles: {
          type: 'number',
          description: 'Max files per upload (default: 10)',
        },
        storageType: {
          type: 'string',
          enum: ['local', 's3', 'gcs'],
          description: 'Storage backend (default: s3)',
        },
        signedUrlExpiry: {
          type: 'number',
          description: 'Signed URL expiry in seconds (default: 900)',
        },
      },
      required: ['action'],
    },
  },

  // ─── 3. AUTH & SECURITY ────────────────────────────────────────────────────
  {
    name: 'backend_auth',
    description: `Generate authentication and security middleware: JWT, OAuth, API keys, RBAC, sessions, CSRF.

Actions:
- jwt: Full JWT auth system — issue, verify, refresh tokens, auth middleware
- oauth: OAuth flow for Google or GitHub (redirect → callback → profile)
- apikey: API key generation, hashing, and verification middleware
- rbac: Role-based access control with roles and permissions middleware
- session: Session management with create, get, destroy, auto-cleanup
- csrf: CSRF protection with double-submit cookie pattern

USE THIS WHEN the user says: "add authentication", "JWT tokens", "OAuth login", "Google login", "GitHub auth", "API keys", "role-based access", "RBAC", "permissions", "sessions", "CSRF protection", "secure the API"`,
    input_schema: {
      type: 'object',
      properties: {
        action: {
          type: 'string',
          enum: ['jwt', 'oauth', 'apikey', 'rbac', 'session', 'csrf'],
          description: 'Which auth/security action to perform',
        },
        jwtExpiry: {
          type: 'string',
          description: 'JWT access token expiry, e.g. "24h", "1h", "30m" (default: 24h)',
        },
        refreshExpiry: {
          type: 'string',
          description: 'JWT refresh token expiry, e.g. "7d", "30d" (default: 7d)',
        },
        oauthProvider: {
          type: 'string',
          enum: ['google', 'github'],
          description: 'OAuth provider (default: google)',
        },
        roles: {
          type: 'array',
          items: { type: 'string' },
          description: 'Roles for RBAC, e.g. ["user", "admin", "moderator"]',
        },
      },
      required: ['action'],
    },
  },

  // ─── 4. RATE LIMITING & ABUSE CONTROL ──────────────────────────────────────
  {
    name: 'backend_ratelimit',
    description: `Generate rate limiting and abuse control middleware: IP limits, user limits, token bucket, ban/allow lists.

Actions:
- ip_limit: IP-based rate limiter (general + auth + AI endpoint tiers)
- user_limit: User-based rate limiter with X-RateLimit headers
- token_bucket: Token bucket algorithm with configurable capacity and refill
- ban_list: IP ban/allow list middleware with timed bans

USE THIS WHEN the user says: "rate limit", "throttle requests", "limit API calls", "IP banning", "token bucket", "burst control", "cooldown", "abuse protection", "DDoS protection", "block IPs"`,
    input_schema: {
      type: 'object',
      properties: {
        action: {
          type: 'string',
          enum: ['ip_limit', 'user_limit', 'token_bucket', 'ban_list'],
          description: 'Which rate limiting action to perform',
        },
        windowMs: {
          type: 'number',
          description: 'Rate limit window in milliseconds (default: 60000 = 1 min)',
        },
        maxRequests: {
          type: 'number',
          description: 'Max requests per window (default: 100)',
        },
        burstLimit: {
          type: 'number',
          description: 'Token bucket capacity for burst (default: 20)',
        },
        banDurationMs: {
          type: 'number',
          description: 'Ban duration in ms (default: 3600000 = 1 hour)',
        },
      },
      required: ['action'],
    },
  },

  // ─── 5. WEBHOOKS & INTEGRATIONS ────────────────────────────────────────────
  {
    name: 'backend_webhook',
    description: `Generate webhook receivers, retry logic, API clients, and integration helpers.

Actions:
- receiver: Webhook receiver endpoint with signature verification (Stripe, GitHub, generic)
- retry: Retry with exponential backoff + idempotency guard
- consume_api: Third-party API client with auth, retry, and logging interceptors

USE THIS WHEN the user says: "webhook endpoint", "receive webhooks", "Stripe webhook", "GitHub webhook", "retry logic", "exponential backoff", "idempotency", "API client", "consume external API", "third-party integration"`,
    input_schema: {
      type: 'object',
      properties: {
        action: {
          type: 'string',
          enum: ['receiver', 'retry', 'consume_api'],
          description: 'Which webhook/integration action to perform',
        },
        provider: {
          type: 'string',
          enum: ['stripe', 'github', 'generic'],
          description: 'Webhook provider for signature verification (default: stripe)',
        },
        retryAttempts: {
          type: 'number',
          description: 'Max retry attempts (default: 3)',
        },
        retryDelayMs: {
          type: 'number',
          description: 'Base retry delay in ms (default: 1000)',
        },
        events: {
          type: 'array',
          items: { type: 'string' },
          description: 'Webhook event types to handle, e.g. ["checkout.session.completed"]',
        },
      },
      required: ['action'],
    },
  },

  // ─── 6. BACKGROUND JOBS & WORKERS ──────────────────────────────────────────
  {
    name: 'backend_jobs',
    description: `Generate background job queues, schedulers, and worker infrastructure.

Actions:
- queue: Job queue (in-memory or BullMQ/Redis) with concurrency, retry, dead-letter
- cron: Interval-based cron scheduler (no external deps)

USE THIS WHEN the user says: "background job", "job queue", "worker", "async task", "BullMQ", "delayed job", "cron job", "scheduled task", "email queue", "process in background", "task scheduler"`,
    input_schema: {
      type: 'object',
      properties: {
        action: {
          type: 'string',
          enum: ['queue', 'cron'],
          description: 'Which background job action to perform',
        },
        queueName: {
          type: 'string',
          description: 'Name of the queue (default: "default")',
        },
        jobType: {
          type: 'string',
          description: 'Default job type to handle, e.g. "email", "report" (default: "email")',
        },
        concurrency: {
          type: 'number',
          description: 'How many jobs to process simultaneously (default: 5)',
        },
        retryAttempts: {
          type: 'number',
          description: 'Max retry attempts per job (default: 3)',
        },
        useRedis: {
          type: 'boolean',
          description: 'Use BullMQ+Redis instead of in-memory queue (default: false)',
        },
      },
      required: ['action'],
    },
  },

  // ─── 7. BUSINESS LOGIC LAYER ───────────────────────────────────────────────
  {
    name: 'backend_logic',
    description: `Generate business logic constructs: workflows, state machines, feature flags.

Actions:
- workflow: Workflow orchestrator with sequential steps, conditions, rollback
- state_machine: State machine with transitions, guards, and history
- feature_flags: Feature flag system with percentage rollout and middleware

USE THIS WHEN the user says: "workflow", "business logic", "state machine", "order flow", "feature flag", "feature toggle", "A/B test", "rollout percentage", "step-by-step process", "approval flow", "pipeline"`,
    input_schema: {
      type: 'object',
      properties: {
        action: {
          type: 'string',
          enum: ['workflow', 'state_machine', 'feature_flags'],
          description: 'Which business logic action to perform',
        },
        workflowName: {
          type: 'string',
          description: 'Name of the workflow (default: "order_processing")',
        },
        states: {
          type: 'array',
          items: { type: 'string' },
          description: 'States for state machine, e.g. ["draft", "pending", "active", "completed"]',
        },
        transitions: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              from: { type: 'string' },
              to: { type: 'string' },
              action: { type: 'string' },
            },
          },
          description: 'State transitions, e.g. [{ from: "draft", to: "pending", action: "submit" }]',
        },
        flags: {
          type: 'object',
          description: 'Feature flags config, e.g. { "dark_mode": { enabled: true, percentage: 100 } }',
        },
        steps: {
          type: 'array',
          items: { type: 'string' },
          description: 'Workflow step names, e.g. ["validate", "process", "notify"]',
        },
      },
      required: ['action'],
    },
  },

  // ─── 8. DATA LAYER INTEGRATION ─────────────────────────────────────────────
  {
    name: 'backend_data',
    description: `Generate data layer code: ORM models, pagination, filtering, soft deletes, transactions.

Actions:
- model: Generate Prisma model schema with fields and constraints
- pagination: Generate offset + cursor pagination with filter/sort utilities
- soft_delete: Generate Prisma soft delete extension (softDelete, restore, findManyActive)
- transaction: Generate transaction helpers + saga pattern for compensating transactions

USE THIS WHEN the user says: "database model", "Prisma model", "schema", "pagination", "cursor pagination", "soft delete", "transaction", "saga pattern", "data layer", "ORM", "filter and sort", "db query helpers"`,
    input_schema: {
      type: 'object',
      properties: {
        action: {
          type: 'string',
          enum: ['model', 'pagination', 'soft_delete', 'transaction'],
          description: 'Which data layer action to perform',
        },
        modelName: {
          type: 'string',
          description: 'Name of the model, e.g. "User", "Product", "Order"',
        },
        fields: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              type: { type: 'string', enum: ['string', 'text', 'number', 'integer', 'float', 'boolean', 'date', 'datetime', 'json', 'decimal', 'bigint'] },
              required: { type: 'boolean' },
              unique: { type: 'boolean' },
              default: { type: 'string' },
            },
          },
          description: 'Model field definitions',
        },
        orm: {
          type: 'string',
          enum: ['prisma', 'drizzle', 'raw'],
          description: 'ORM to use (default: prisma)',
        },
        pageSize: {
          type: 'number',
          description: 'Default page size for pagination (default: 20)',
        },
      },
      required: ['action'],
    },
  },

  // ─── 9. TESTING & QUALITY ──────────────────────────────────────────────────
  {
    name: 'backend_test',
    description: `Generate test scaffolds, seed data, and load test scripts.

Actions:
- unit: Generate unit test scaffold (Jest) for a target module
- api: Generate API integration tests with supertest
- seed: Generate seed data generator for database
- load: Generate load test script (zero deps) with RPS, latency percentiles

USE THIS WHEN the user says: "write tests", "unit test", "API test", "integration test", "seed data", "test data", "load test", "stress test", "benchmark", "performance test", "test scaffold"`,
    input_schema: {
      type: 'object',
      properties: {
        action: {
          type: 'string',
          enum: ['unit', 'api', 'seed', 'load'],
          description: 'Which testing action to perform',
        },
        testTarget: {
          type: 'string',
          description: 'Module/function/endpoint to test, e.g. "auth", "users", "payments"',
        },
        framework: {
          type: 'string',
          enum: ['jest', 'vitest'],
          description: 'Test framework (default: jest)',
        },
        seedCount: {
          type: 'number',
          description: 'Number of seed records to generate (default: 50)',
        },
        endpoints: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              method: { type: 'string', enum: ['GET', 'POST', 'PUT', 'DELETE'] },
              path: { type: 'string' },
              expectedStatus: { type: 'number' },
              auth: { type: 'boolean' },
              body: { type: 'object' },
            },
          },
          description: 'Endpoints to generate API tests for',
        },
      },
      required: ['action'],
    },
  },

  // ─── 10. OBSERVABILITY & OPS ───────────────────────────────────────────────
  {
    name: 'backend_observe',
    description: `Generate observability infrastructure: logging, error handling, health checks, metrics, audit trails.

Actions:
- logger: Structured JSON logger with request logging middleware
- error_middleware: Global error handler with AppError class, async wrapper, 404 handler
- health: Health/readiness/liveness endpoints with DB + memory checks
- metrics: In-memory metrics collector (counters, histograms, gauges) with request middleware
- audit: Audit trail logger with query API and auto-middleware for mutations

USE THIS WHEN the user says: "logging", "structured logs", "error handling", "error middleware", "health check", "liveness", "readiness", "metrics", "Prometheus", "audit trail", "audit log", "request logging", "monitoring"`,
    input_schema: {
      type: 'object',
      properties: {
        action: {
          type: 'string',
          enum: ['logger', 'error_middleware', 'health', 'metrics', 'audit'],
          description: 'Which observability action to perform',
        },
        logLevel: {
          type: 'string',
          enum: ['error', 'warn', 'info', 'debug', 'trace'],
          description: 'Minimum log level (default: info)',
        },
        serviceName: {
          type: 'string',
          description: 'Service name for log entries (default: "api")',
        },
      },
      required: ['action'],
    },
  },

  // ─── 11. DEVOPS-FRIENDLY OUTPUT ────────────────────────────────────────────
  {
    name: 'backend_devops',
    description: `Generate DevOps infrastructure: env configs, Docker, CI/CD scripts, graceful shutdown.

Actions:
- env_config: Generate .env.example + environment validation + config getters
- docker: Generate Dockerfile (multi-stage), .dockerignore, docker-compose.yml with PostgreSQL
- ci_scripts: Generate GitHub Actions CI/CD pipeline (test + deploy)
- graceful_shutdown: Generate graceful shutdown handler with SIGTERM/SIGINT, handler chain, force timeout

USE THIS WHEN the user says: "Docker", "Dockerfile", "docker-compose", "CI/CD", "GitHub Actions", "deploy pipeline", "env vars", "environment config", ".env", "graceful shutdown", "SIGTERM", "DevOps", "infrastructure"`,
    input_schema: {
      type: 'object',
      properties: {
        action: {
          type: 'string',
          enum: ['env_config', 'docker', 'ci_scripts', 'graceful_shutdown'],
          description: 'Which DevOps action to perform',
        },
        serviceName: {
          type: 'string',
          description: 'Service name for Docker/CI (default: "api")',
        },
        port: {
          type: 'number',
          description: 'Port number (default: 3000)',
        },
        nodeVersion: {
          type: 'string',
          description: 'Node.js version for Docker/CI (default: "20")',
        },
        packageManager: {
          type: 'string',
          enum: ['npm', 'yarn', 'pnpm'],
          description: 'Package manager (default: "npm")',
        },
        ciProvider: {
          type: 'string',
          enum: ['github', 'gitlab'],
          description: 'CI/CD provider (default: "github")',
        },
        envVars: {
          type: 'object',
          description: 'Additional environment variables to include in .env.example',
        },
      },
      required: ['action'],
    },
  },

];


// ═══════════════════════════════════════════════════════════════════════════════
// EXECUTOR — Routes tool calls to backendEngine functions
// ═══════════════════════════════════════════════════════════════════════════════

export async function executeBackendTool(toolName, input, ctx = {}) {
  try {
    log.info(`[BackendTools] Executing ${toolName}`, JSON.stringify(input).slice(0, 200));

    let result;

    switch (toolName) {
      case 'backend_api':
        result = await apiDesign(input);
        break;

      case 'backend_upload':
        result = await fileHandling(input);
        break;

      case 'backend_auth':
        result = await authSecurity(input);
        break;

      case 'backend_ratelimit':
        result = await rateLimiting(input);
        break;

      case 'backend_webhook':
        result = await webhooks(input);
        break;

      case 'backend_jobs':
        result = await backgroundJobs(input);
        break;

      case 'backend_logic':
        result = await businessLogic(input);
        break;

      case 'backend_data':
        result = await dataLayer(input);
        break;

      case 'backend_test':
        result = await testing(input);
        break;

      case 'backend_observe':
        result = await observability(input);
        break;

      case 'backend_devops':
        result = await devops(input);
        break;

      default:
        return { result: JSON.stringify({ error: `Unknown backend tool: ${toolName}` }) };
    }

    // ── Build side effects for frontend SSE ──

    const sideEffects = {};

    if (result && result.files && result.files.length > 0) {
      sideEffects.type = 'backend_generated';
      sideEffects.operation = result.operation || toolName.replace('backend_', '');
      sideEffects.action = result.action || input.action;
      sideEffects.fileCount = result.files.length;
      sideEffects.files = result.files.map(f => ({
        path: f.path,
        description: f.description,
        size: f.content?.length || 0,
      }));
      sideEffects.message = result.message;

      // Include full file contents in result for LLM to write via write_file
      result.instruction = 'Use the write_file tool to save each generated file to the project. The file paths and contents are in the "files" array below.';
    }

    if (result && result.error) {
      sideEffects.type = 'backend_error';
      sideEffects.error = result.error;
    }

    return {
      result: JSON.stringify(result, null, 2),
      sideEffects: Object.keys(sideEffects).length > 0 ? sideEffects : undefined,
    };
  } catch (err) {
    log.error(`[BackendTools] ${toolName} error:`, err.message);
    return {
      result: JSON.stringify({ error: err.message, tool: toolName }),
    };
  }
}

/**
 * Check if a tool name is a backend tool.
 */
export function isBackendTool(name) {
  return name.startsWith('backend_');
}

export default { BACKEND_TOOL_DEFINITIONS, executeBackendTool, isBackendTool };
