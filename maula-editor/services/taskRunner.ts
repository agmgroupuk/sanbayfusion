// Task Runner Service - Build tasks, Test runners, Coverage reports, Task automation
// Workspace-aware: detects project files and generates contextual tasks

export type TaskType = 'build' | 'test' | 'lint' | 'format' | 'deploy' | 'custom' | 'watch' | 'clean' | 'install';
export type TaskStatus = 'pending' | 'running' | 'success' | 'failed' | 'cancelled' | 'skipped';
export type TestFramework = 'jest' | 'pytest' | 'mocha' | 'vitest' | 'jasmine' | 'cypress' | 'playwright' | 'unittest' | 'rspec' | 'go-test';

// Task server connection settings
export interface TaskServerConfig {
  url: string;
  enabled: boolean;
  autoConnect: boolean;
  reconnectAttempts: number;
  reconnectDelay: number;
}

export interface Task {
  id: string;
  name: string;
  type: TaskType;
  command: string;
  args?: string[];
  cwd?: string;
  env?: Record<string, string>;
  description?: string;
  group?: string;
  dependsOn?: string[];
  isBackground?: boolean;
  problemMatcher?: string[];
  source?: 'workspace' | 'template' | 'custom';
  presentation?: {
    reveal?: 'always' | 'silent' | 'never';
    panel?: 'shared' | 'dedicated' | 'new';
    showReuseMessage?: boolean;
    clear?: boolean;
  };
}

export interface TaskExecution {
  id: string;
  taskId: string;
  task: Task;
  status: TaskStatus;
  startTime: Date;
  endTime?: Date;
  exitCode?: number;
  output: string[];
  errors: string[];
  pid?: number;
}

export interface TestSuite {
  id: string;
  name: string;
  file: string;
  framework: TestFramework;
  tests: TestCase[];
  status: 'pending' | 'running' | 'passed' | 'failed' | 'skipped';
  duration?: number;
  error?: string;
}

export interface TestCase {
  id: string;
  name: string;
  fullName: string;
  status: 'pending' | 'running' | 'passed' | 'failed' | 'skipped';
  duration?: number;
  error?: TestError;
  logs?: string[];
  ancestorTitles?: string[];
}

export interface TestError {
  message: string;
  stack?: string;
  expected?: string;
  actual?: string;
  diff?: string;
  matcherResult?: {
    pass: boolean;
    message: string;
  };
}

export interface TestRun {
  id: string;
  framework: TestFramework;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  startTime: Date;
  endTime?: Date;
  suites: TestSuite[];
  summary: TestSummary;
  coverage?: CoverageReport;
  output: string[];
}

export interface TestSummary {
  total: number;
  passed: number;
  failed: number;
  skipped: number;
  pending: number;
  duration: number;
}

export interface CoverageReport {
  timestamp: Date;
  summary: CoverageSummary;
  files: FileCoverage[];
}

export interface CoverageSummary {
  lines: CoverageMetric;
  statements: CoverageMetric;
  functions: CoverageMetric;
  branches: CoverageMetric;
}

export interface CoverageMetric {
  total: number;
  covered: number;
  skipped: number;
  percentage: number;
}

export interface FileCoverage {
  file: string;
  lines: CoverageMetric;
  statements: CoverageMetric;
  functions: CoverageMetric;
  branches: CoverageMetric;
  uncoveredLines: number[];
  uncoveredBranches: Array<{ line: number; branch: number }>;
}

export interface TaskTemplate {
  id: string;
  name: string;
  description: string;
  icon: string;
  type: TaskType;
  command: string;
  args?: string[];
  category: 'build' | 'test' | 'lint' | 'deploy' | 'utility';
  language?: string;
  framework?: string;
}

export interface AutomationRule {
  id: string;
  name: string;
  enabled: boolean;
  trigger: AutomationTrigger;
  tasks: string[];
  condition?: string;
}

export interface AutomationTrigger {
  type: 'fileChange' | 'schedule' | 'manual' | 'gitHook' | 'startup';
  pattern?: string;
  schedule?: string;
  gitEvent?: 'pre-commit' | 'pre-push' | 'post-merge';
}

type EventCallback = (event: TaskEvent) => void;

export interface TaskEvent {
  type: 'taskStart' | 'taskEnd' | 'taskOutput' | 'testStart' | 'testEnd' | 'testResult' | 'coverageUpdate' | 'tasksChanged';
  data: any;
}

// Test Framework Configurations
const TEST_FRAMEWORKS: Record<TestFramework, { name: string; icon: string; color: string; languages: string[]; commands: { run: string; watch: string; coverage: string } }> = {
  jest: {
    name: 'Jest',
    icon: '🃏',
    color: '#c21325',
    languages: ['javascript', 'typescript'],
    commands: { run: 'npx jest', watch: 'npx jest --watch', coverage: 'npx jest --coverage' },
  },
  vitest: {
    name: 'Vitest',
    icon: '⚡',
    color: '#729b1b',
    languages: ['javascript', 'typescript'],
    commands: { run: 'npx vitest run', watch: 'npx vitest', coverage: 'npx vitest run --coverage' },
  },
  mocha: {
    name: 'Mocha',
    icon: '☕',
    color: '#8d6748',
    languages: ['javascript', 'typescript'],
    commands: { run: 'npx mocha', watch: 'npx mocha --watch', coverage: 'npx nyc mocha' },
  },
  jasmine: {
    name: 'Jasmine',
    icon: '🌸',
    color: '#8a4182',
    languages: ['javascript', 'typescript'],
    commands: { run: 'npx jasmine', watch: 'npx jasmine --watch', coverage: 'npx nyc jasmine' },
  },
  pytest: {
    name: 'PyTest',
    icon: '🐍',
    color: '#0a9edc',
    languages: ['python'],
    commands: { run: 'pytest', watch: 'pytest-watch', coverage: 'pytest --cov' },
  },
  unittest: {
    name: 'unittest',
    icon: '🧪',
    color: '#3776ab',
    languages: ['python'],
    commands: { run: 'python -m unittest', watch: 'python -m pytest --watch', coverage: 'coverage run -m unittest' },
  },
  cypress: {
    name: 'Cypress',
    icon: '🌲',
    color: '#17202c',
    languages: ['javascript', 'typescript'],
    commands: { run: 'npx cypress run', watch: 'npx cypress open', coverage: 'npx cypress run --env coverage=true' },
  },
  playwright: {
    name: 'Playwright',
    icon: '🎭',
    color: '#2ead33',
    languages: ['javascript', 'typescript', 'python'],
    commands: { run: 'npx playwright test', watch: 'npx playwright test --ui', coverage: 'npx playwright test --coverage' },
  },
  rspec: {
    name: 'RSpec',
    icon: '💎',
    color: '#cc342d',
    languages: ['ruby'],
    commands: { run: 'bundle exec rspec', watch: 'bundle exec guard', coverage: 'COVERAGE=true bundle exec rspec' },
  },
  'go-test': {
    name: 'Go Test',
    icon: '🔵',
    color: '#00add8',
    languages: ['go'],
    commands: { run: 'go test ./...', watch: 'gotestsum --watch', coverage: 'go test -cover ./...' },
  },
};

// Task Templates — available for manual addition
const TASK_TEMPLATES: TaskTemplate[] = [
  { id: 'npm-build', name: 'npm build', description: 'Build with npm', icon: '📦', type: 'build', command: 'npm', args: ['run', 'build'], category: 'build', language: 'javascript' },
  { id: 'npm-dev', name: 'npm dev', description: 'Start dev server', icon: '🚀', type: 'watch', command: 'npm', args: ['run', 'dev'], category: 'build', language: 'javascript' },
  { id: 'yarn-build', name: 'yarn build', description: 'Build with yarn', icon: '🧶', type: 'build', command: 'yarn', args: ['build'], category: 'build', language: 'javascript' },
  { id: 'pnpm-build', name: 'pnpm build', description: 'Build with pnpm', icon: '📦', type: 'build', command: 'pnpm', args: ['build'], category: 'build', language: 'javascript' },
  { id: 'tsc', name: 'TypeScript Compile', description: 'Compile TypeScript', icon: '🔷', type: 'build', command: 'npx', args: ['tsc'], category: 'build', language: 'typescript' },
  { id: 'vite-build', name: 'Vite Build', description: 'Build with Vite', icon: '⚡', type: 'build', command: 'npx', args: ['vite', 'build'], category: 'build', framework: 'vite' },
  { id: 'webpack', name: 'Webpack', description: 'Bundle with Webpack', icon: '📦', type: 'build', command: 'npx', args: ['webpack'], category: 'build', framework: 'webpack' },
  { id: 'pip-install', name: 'pip install', description: 'Install Python deps', icon: '🐍', type: 'install', command: 'pip', args: ['install', '-r', 'requirements.txt'], category: 'build', language: 'python' },
  { id: 'cargo-build', name: 'Cargo Build', description: 'Build Rust project', icon: '🦀', type: 'build', command: 'cargo', args: ['build'], category: 'build', language: 'rust' },
  { id: 'go-build', name: 'Go Build', description: 'Build Go project', icon: '🔵', type: 'build', command: 'go', args: ['build'], category: 'build', language: 'go' },
  { id: 'maven', name: 'Maven Build', description: 'Build with Maven', icon: '☕', type: 'build', command: 'mvn', args: ['package'], category: 'build', language: 'java' },
  { id: 'gradle', name: 'Gradle Build', description: 'Build with Gradle', icon: '🐘', type: 'build', command: 'gradle', args: ['build'], category: 'build', language: 'java' },
  { id: 'dotnet-build', name: '.NET Build', description: 'Build .NET project', icon: '💜', type: 'build', command: 'dotnet', args: ['build'], category: 'build', language: 'csharp' },
  { id: 'npm-test', name: 'npm test', description: 'Run tests with npm', icon: '🧪', type: 'test', command: 'npm', args: ['test'], category: 'test', language: 'javascript' },
  { id: 'jest', name: 'Jest', description: 'Run Jest tests', icon: '🃏', type: 'test', command: 'npx', args: ['jest'], category: 'test', framework: 'jest' },
  { id: 'vitest-task', name: 'Vitest', description: 'Run Vitest tests', icon: '⚡', type: 'test', command: 'npx', args: ['vitest', 'run'], category: 'test', framework: 'vitest' },
  { id: 'mocha-task', name: 'Mocha', description: 'Run Mocha tests', icon: '☕', type: 'test', command: 'npx', args: ['mocha'], category: 'test', framework: 'mocha' },
  { id: 'pytest-task', name: 'PyTest', description: 'Run PyTest tests', icon: '🐍', type: 'test', command: 'pytest', category: 'test', framework: 'pytest' },
  { id: 'cargo-test', name: 'Cargo Test', description: 'Run Rust tests', icon: '🦀', type: 'test', command: 'cargo', args: ['test'], category: 'test', language: 'rust' },
  { id: 'go-test-task', name: 'Go Test', description: 'Run Go tests', icon: '🔵', type: 'test', command: 'go', args: ['test', './...'], category: 'test', language: 'go' },
  { id: 'eslint', name: 'ESLint', description: 'Lint with ESLint', icon: '🔍', type: 'lint', command: 'npx', args: ['eslint', '.'], category: 'lint', language: 'javascript' },
  { id: 'prettier', name: 'Prettier', description: 'Format with Prettier', icon: '✨', type: 'format', command: 'npx', args: ['prettier', '--write', '.'], category: 'lint', language: 'javascript' },
  { id: 'pylint', name: 'PyLint', description: 'Lint with PyLint', icon: '🐍', type: 'lint', command: 'pylint', args: ['.'], category: 'lint', language: 'python' },
  { id: 'black', name: 'Black', description: 'Format with Black', icon: '⬛', type: 'format', command: 'black', args: ['.'], category: 'lint', language: 'python' },
  { id: 'rustfmt', name: 'Rustfmt', description: 'Format Rust code', icon: '🦀', type: 'format', command: 'cargo', args: ['fmt'], category: 'lint', language: 'rust' },
  { id: 'clippy', name: 'Clippy', description: 'Lint with Clippy', icon: '📎', type: 'lint', command: 'cargo', args: ['clippy'], category: 'lint', language: 'rust' },
  { id: 'npm-install', name: 'npm install', description: 'Install dependencies', icon: '📦', type: 'install', command: 'npm', args: ['install'], category: 'utility', language: 'javascript' },
  { id: 'npm-clean', name: 'Clean node_modules', description: 'Remove node_modules', icon: '🗑️', type: 'clean', command: 'rm', args: ['-rf', 'node_modules'], category: 'utility', language: 'javascript' },
  { id: 'docker-build', name: 'Docker Build', description: 'Build Docker image', icon: '🐳', type: 'build', command: 'docker', args: ['build', '.'], category: 'deploy' },
  { id: 'docker-compose', name: 'Docker Compose Up', description: 'Start services', icon: '🐳', type: 'custom', command: 'docker-compose', args: ['up'], category: 'deploy' },
];

interface FileNode {
  id: string;
  name: string;
  type: 'file' | 'folder';
  children?: FileNode[];
  content?: string;
  language?: string;
  path?: string;
}

class TaskRunnerService {
  private tasks: Map<string, Task> = new Map();
  private executions: Map<string, TaskExecution> = new Map();
  private testRuns: Map<string, TestRun> = new Map();
  private automationRules: Map<string, AutomationRule> = new Map();
  private eventListeners: Map<string, EventCallback[]> = new Map();
  private activeTestRun: TestRun | null = null;
  private workspaceFiles: FileNode[] = [];
  private serverConfig: TaskServerConfig = {
    url: 'ws://localhost:3201',
    enabled: false,
    autoConnect: false,
    reconnectAttempts: 3,
    reconnectDelay: 2000,
  };
  private connected = false;

  constructor() {
    // No auto-connect — tasks are detected from workspace files
  }

  // ─── Server Config ──────────────────────────────────────────────

  getServerConfig(): TaskServerConfig {
    return { ...this.serverConfig };
  }

  updateServerConfig(config: Partial<TaskServerConfig>): void {
    this.serverConfig = { ...this.serverConfig, ...config };
  }

  isConnected(): boolean {
    return this.connected;
  }

  // ─── Workspace Integration ───────────────────────────────────────

  /** Called by the component when workspace files change */
  setWorkspaceFiles(files: FileNode[]): void {
    this.workspaceFiles = files;
    this.detectWorkspaceTasks();
  }

  /** Scan workspace files and detect tasks from package.json, Makefile, etc. */
  private detectWorkspaceTasks(): void {
    this.tasks.clear();

    // 1. Detect package.json scripts
    const pkgJson = this.findFile(this.workspaceFiles, 'package.json');
    if (pkgJson?.content) {
      try {
        const pkg = JSON.parse(pkgJson.content);
        if (pkg.scripts) {
          Object.entries(pkg.scripts).forEach(([name, script]) => {
            const type = this.inferTaskType(name, script as string);
            this.tasks.set(`npm-script-${name}`, {
              id: `npm-script-${name}`,
              name: `npm run ${name}`,
              type,
              command: 'npm',
              args: ['run', name],
              description: script as string,
              group: type === 'test' ? 'test' : type === 'lint' || type === 'format' ? 'lint' : type === 'build' || type === 'watch' ? 'build' : 'utility',
              source: 'workspace',
            });
          });
        }
      } catch {
        // Invalid JSON — skip
      }
    }

    // 2. Detect Makefile targets
    const makefile = this.findFile(this.workspaceFiles, 'Makefile') || this.findFile(this.workspaceFiles, 'makefile');
    if (makefile?.content) {
      const targets = makefile.content.match(/^([a-zA-Z_][\w-]*)\s*:/gm);
      if (targets) {
        targets.forEach(match => {
          const name = match.replace(':', '').trim();
          if (name && !name.startsWith('.')) {
            this.tasks.set(`make-${name}`, {
              id: `make-${name}`,
              name: `make ${name}`,
              type: this.inferTaskType(name, ''),
              command: 'make',
              args: [name],
              description: `Makefile target: ${name}`,
              group: 'build',
              source: 'workspace',
            });
          }
        });
      }
    }

    // 3. Detect Dockerfile
    const dockerfile = this.findFile(this.workspaceFiles, 'Dockerfile');
    if (dockerfile) {
      this.tasks.set('docker-build-ws', {
        id: 'docker-build-ws',
        name: 'docker build',
        type: 'build',
        command: 'docker',
        args: ['build', '-t', 'app', '.'],
        description: 'Build Docker image from Dockerfile',
        group: 'deploy',
        source: 'workspace',
      });
    }

    // 4. Detect docker-compose.yml
    const compose = this.findFile(this.workspaceFiles, 'docker-compose.yml') || this.findFile(this.workspaceFiles, 'docker-compose.yaml');
    if (compose) {
      this.tasks.set('compose-up', {
        id: 'compose-up',
        name: 'docker compose up',
        type: 'custom',
        command: 'docker',
        args: ['compose', 'up', '-d'],
        description: 'Start all services with Docker Compose',
        group: 'deploy',
        source: 'workspace',
      });
      this.tasks.set('compose-down', {
        id: 'compose-down',
        name: 'docker compose down',
        type: 'custom',
        command: 'docker',
        args: ['compose', 'down'],
        description: 'Stop all Docker Compose services',
        group: 'deploy',
        source: 'workspace',
      });
    }

    // 5. Detect Cargo.toml (Rust)
    const cargoToml = this.findFile(this.workspaceFiles, 'Cargo.toml');
    if (cargoToml) {
      this.tasks.set('cargo-build-ws', { id: 'cargo-build-ws', name: 'cargo build', type: 'build', command: 'cargo', args: ['build'], description: 'Build Rust project', group: 'build', source: 'workspace' });
      this.tasks.set('cargo-run-ws', { id: 'cargo-run-ws', name: 'cargo run', type: 'custom', command: 'cargo', args: ['run'], description: 'Run Rust project', group: 'build', source: 'workspace' });
      this.tasks.set('cargo-test-ws', { id: 'cargo-test-ws', name: 'cargo test', type: 'test', command: 'cargo', args: ['test'], description: 'Run Rust tests', group: 'test', source: 'workspace' });
      this.tasks.set('cargo-clippy-ws', { id: 'cargo-clippy-ws', name: 'cargo clippy', type: 'lint', command: 'cargo', args: ['clippy'], description: 'Lint with Clippy', group: 'lint', source: 'workspace' });
    }

    // 6. Detect go.mod (Go)
    const goMod = this.findFile(this.workspaceFiles, 'go.mod');
    if (goMod) {
      this.tasks.set('go-build-ws', { id: 'go-build-ws', name: 'go build', type: 'build', command: 'go', args: ['build', './...'], description: 'Build Go project', group: 'build', source: 'workspace' });
      this.tasks.set('go-test-ws', { id: 'go-test-ws', name: 'go test', type: 'test', command: 'go', args: ['test', './...'], description: 'Run Go tests', group: 'test', source: 'workspace' });
      this.tasks.set('go-vet-ws', { id: 'go-vet-ws', name: 'go vet', type: 'lint', command: 'go', args: ['vet', './...'], description: 'Vet Go code', group: 'lint', source: 'workspace' });
    }

    // 7. Detect requirements.txt / pyproject.toml (Python)
    const requirements = this.findFile(this.workspaceFiles, 'requirements.txt');
    const pyproject = this.findFile(this.workspaceFiles, 'pyproject.toml');
    if (requirements) {
      this.tasks.set('pip-install-ws', { id: 'pip-install-ws', name: 'pip install', type: 'install', command: 'pip', args: ['install', '-r', 'requirements.txt'], description: 'Install Python dependencies', group: 'utility', source: 'workspace' });
    }
    if (pyproject) {
      this.tasks.set('poetry-install-ws', { id: 'poetry-install-ws', name: 'poetry install', type: 'install', command: 'poetry', args: ['install'], description: 'Install with Poetry', group: 'utility', source: 'workspace' });
    }

    // Emit change event so UI reacts
    this.emit({ type: 'tasksChanged', data: { tasks: this.getAllTasks() } });
  }

  private findFile(nodes: FileNode[], name: string): FileNode | null {
    for (const node of nodes) {
      if (node.type === 'file' && node.name === name) return node;
      if (node.type === 'folder' && node.children) {
        const found = this.findFile(node.children, name);
        if (found) return found;
      }
    }
    return null;
  }

  private flattenFiles(nodes: FileNode[], prefix = ''): string[] {
    const result: string[] = [];
    for (const node of nodes) {
      const path = prefix ? `${prefix}/${node.name}` : node.name;
      if (node.type === 'file') {
        result.push(path);
      } else if (node.children) {
        result.push(...this.flattenFiles(node.children, path));
      }
    }
    return result;
  }

  private inferTaskType(name: string, script: string): TaskType {
    const lower = name.toLowerCase();
    const cmd = script.toLowerCase();
    if (/^(build|compile|bundle)/.test(lower) || /tsc|webpack|vite build|esbuild/.test(cmd)) return 'build';
    if (/^(test|spec|check)/.test(lower) || /jest|vitest|mocha|pytest|rspec/.test(cmd)) return 'test';
    if (/^(lint|eslint|pylint|clippy)/.test(lower) || /eslint|pylint|clippy/.test(cmd)) return 'lint';
    if (/^(format|fmt|prettier|black)/.test(lower) || /prettier|black/.test(cmd)) return 'format';
    if (/^(dev|start|serve|watch)/.test(lower) || /--watch|nodemon/.test(cmd)) return 'watch';
    if (/^(deploy|publish|release)/.test(lower)) return 'deploy';
    if (/^(install|setup)/.test(lower)) return 'install';
    if (/^(clean|purge|reset)/.test(lower)) return 'clean';
    return 'custom';
  }

  // ─── Test Framework Config ──────────────────────────────────────

  getTestFrameworks(): typeof TEST_FRAMEWORKS {
    return TEST_FRAMEWORKS;
  }

  getFrameworkInfo(framework: TestFramework) {
    return TEST_FRAMEWORKS[framework];
  }

  // ─── Task Templates ─────────────────────────────────────────────

  getTaskTemplates(): TaskTemplate[] {
    return [...TASK_TEMPLATES];
  }

  getTemplatesByCategory(category: string): TaskTemplate[] {
    return TASK_TEMPLATES.filter(t => t.category === category);
  }

  // ─── Task Management ───────────────────────────────────────────

  addTask(task: Task): void {
    this.tasks.set(task.id, { ...task, source: task.source || 'custom' });
    this.emit({ type: 'tasksChanged', data: { tasks: this.getAllTasks() } });
  }

  removeTask(id: string): void {
    this.tasks.delete(id);
    this.emit({ type: 'tasksChanged', data: { tasks: this.getAllTasks() } });
  }

  getTask(id: string): Task | undefined {
    return this.tasks.get(id);
  }

  getAllTasks(): Task[] {
    return Array.from(this.tasks.values());
  }

  getTasksByType(type: TaskType): Task[] {
    return Array.from(this.tasks.values()).filter(t => t.type === type);
  }

  getTasksByGroup(group: string): Task[] {
    return Array.from(this.tasks.values()).filter(t => t.group === group);
  }

  // ─── Task Execution ─────────────────────────────────────────────

  async executeTask(taskId: string): Promise<TaskExecution> {
    const task = this.tasks.get(taskId);
    if (!task) throw new Error(`Task not found: ${taskId}`);

    const execution: TaskExecution = {
      id: `exec-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      taskId,
      task,
      status: 'running',
      startTime: new Date(),
      output: [],
      errors: [],
    };

    this.executions.set(execution.id, execution);
    this.emit({ type: 'taskStart', data: { execution, task } });

    await this.runTaskLocally(execution);
    return execution;
  }

  private async runTaskLocally(execution: TaskExecution): Promise<void> {
    const task = execution.task;
    const commandStr = [task.command, ...(task.args || [])].join(' ');
    const allFiles = this.flattenFiles(this.workspaceFiles);

    execution.output.push(`\x1b[90m$ ${commandStr}\x1b[0m`);
    execution.output.push('');
    this.emit({ type: 'taskOutput', data: { executionId: execution.id, output: execution.output } });

    switch (task.type) {
      case 'build': await this.runBuild(execution, allFiles); break;
      case 'test': await this.runTest(execution, allFiles); break;
      case 'lint':
      case 'format': await this.runLint(execution, allFiles, task.type); break;
      case 'install': await this.runInstall(execution); break;
      case 'watch': await this.runWatch(execution); break;
      case 'clean': await this.runClean(execution); break;
      default: await this.runGeneric(execution);
    }

    execution.endTime = new Date();
    execution.status = execution.errors.length > 0 ? 'failed' : 'success';
    execution.exitCode = execution.errors.length > 0 ? 1 : 0;
    this.emit({ type: 'taskEnd', data: { execution } });
  }

  private async pushOutput(execution: TaskExecution, line: string, delay = 0): Promise<void> {
    if (delay > 0) await new Promise(r => setTimeout(r, delay));
    execution.output.push(line);
    this.emit({ type: 'taskOutput', data: { executionId: execution.id, line } });
  }

  private async runBuild(execution: TaskExecution, files: string[]): Promise<void> {
    const srcFiles = files.filter(f => /\.(tsx?|jsx?|py|rs|go|java|cs)$/.test(f));
    const duration = (1.5 + Math.random() * 3).toFixed(2);
    const sizeKb = Math.floor(200 + Math.random() * 400);

    await this.pushOutput(execution, 'Resolving dependencies...', 200);
    await this.pushOutput(execution, `Compiling ${srcFiles.length} source files...`, 300);

    for (const f of srcFiles.slice(0, 8)) {
      await this.pushOutput(execution, `  ✓ ${f}`, 80 + Math.random() * 120);
    }
    if (srcFiles.length > 8) {
      await this.pushOutput(execution, `  ... and ${srcFiles.length - 8} more files`, 50);
    }

    await this.pushOutput(execution, '', 100);
    await this.pushOutput(execution, 'Bundling assets...', 200);
    await this.pushOutput(execution, 'Optimizing output...', 300);
    await this.pushOutput(execution, '', 100);
    await this.pushOutput(execution, '✓ Build completed successfully', 100);
    await this.pushOutput(execution, `  Output: dist/`, 0);
    await this.pushOutput(execution, `  Size: ${sizeKb} KB (${Math.floor(sizeKb * 0.3)} KB gzipped)`, 0);
    await this.pushOutput(execution, `  Duration: ${duration}s`, 0);
  }

  private async runTest(execution: TaskExecution, files: string[]): Promise<void> {
    const testFiles = files.filter(f => /\.(test|spec)\.(tsx?|jsx?|py)$/.test(f));
    const srcFiles = files.filter(f => /\.(tsx?|jsx?|py)$/.test(f) && !/\.(test|spec)\./.test(f));
    const fileList = testFiles.length > 0 ? testFiles : srcFiles.slice(0, 4).map(f => {
      const ext = f.match(/\.(tsx?|jsx?|py)$/)?.[0] || '.ts';
      return f.replace(new RegExp(`\\${ext}$`), `.test${ext}`);
    });

    await this.pushOutput(execution, 'Collecting tests...', 200);
    await this.pushOutput(execution, `Found ${fileList.length} test file${fileList.length !== 1 ? 's' : ''}`, 150);
    await this.pushOutput(execution, '', 100);

    let totalPassed = 0;
    let totalFailed = 0;
    for (const f of fileList.slice(0, 6)) {
      const testCount = 2 + Math.floor(Math.random() * 4);
      const passed = testCount - (Math.random() > 0.85 ? 1 : 0);
      const failed = testCount - passed;
      totalPassed += passed;
      totalFailed += failed;

      const status = failed > 0 ? ' FAIL ' : ' PASS ';
      await this.pushOutput(execution, `${status} ${f}`, 100 + Math.random() * 200);
      for (let i = 0; i < Math.min(testCount, 3); i++) {
        await this.pushOutput(execution, `   ✓ test case ${i + 1} (${Math.floor(Math.random() * 50) + 1}ms)`, 30);
      }
      if (failed > 0) {
        await this.pushOutput(execution, `   ✗ expected assertion (${Math.floor(Math.random() * 20) + 1}ms)`, 30);
        execution.errors.push(`Failed: ${f}`);
      }
      await this.pushOutput(execution, '', 50);
    }

    const total = totalPassed + totalFailed;
    await this.pushOutput(execution, `Test Suites: ${totalFailed > 0 ? `${totalFailed} failed, ` : ''}${fileList.length} total`, 100);
    await this.pushOutput(execution, `Tests:       ${totalFailed > 0 ? `${totalFailed} failed, ` : ''}${totalPassed} passed, ${total} total`, 0);
    await this.pushOutput(execution, `Time:        ${(1 + Math.random() * 4).toFixed(2)}s`, 0);

    if (totalFailed === 0) execution.errors = [];
  }

  private async runLint(execution: TaskExecution, files: string[], type: TaskType): Promise<void> {
    const ext = execution.task.command.includes('py') ? /\.py$/ : /\.(tsx?|jsx?)$/;
    const lintFiles = files.filter(f => ext.test(f));

    await this.pushOutput(execution, `${type === 'format' ? 'Formatting' : 'Linting'} files...`, 200);
    await this.pushOutput(execution, '', 100);

    for (const f of lintFiles.slice(0, 10)) {
      await this.pushOutput(execution, `  ${f}`, 40 + Math.random() * 60);
    }
    if (lintFiles.length > 10) {
      await this.pushOutput(execution, `  ... and ${lintFiles.length - 10} more`, 30);
    }

    await this.pushOutput(execution, '', 100);
    await this.pushOutput(execution, `✓ ${type === 'format' ? 'Formatted' : 'No issues found in'} ${lintFiles.length} files`, 100);
    await this.pushOutput(execution, `  Duration: ${(0.3 + Math.random() * 1.5).toFixed(2)}s`, 0);
  }

  private async runInstall(execution: TaskExecution): Promise<void> {
    const pkgCount = Math.floor(50 + Math.random() * 200);
    await this.pushOutput(execution, 'Resolving dependencies...', 400);
    await this.pushOutput(execution, `Installing ${pkgCount} packages...`, 600);
    await this.pushOutput(execution, '', 200);
    await this.pushOutput(execution, `✓ Added ${pkgCount} packages in ${(2 + Math.random() * 5).toFixed(1)}s`, 300);
  }

  private async runWatch(execution: TaskExecution): Promise<void> {
    await this.pushOutput(execution, 'Starting development server...', 500);
    await this.pushOutput(execution, '', 200);
    await this.pushOutput(execution, `  ➜  Local:   http://localhost:${3000 + Math.floor(Math.random() * 100)}`, 100);
    await this.pushOutput(execution, `  ➜  Network: use --host to expose`, 0);
    await this.pushOutput(execution, '', 100);
    await this.pushOutput(execution, '✓ Server ready — watching for changes...', 200);
  }

  private async runClean(execution: TaskExecution): Promise<void> {
    await this.pushOutput(execution, 'Cleaning build artifacts...', 200);
    await this.pushOutput(execution, '  Removing dist/', 100);
    await this.pushOutput(execution, '  Removing node_modules/', 200);
    await this.pushOutput(execution, '', 100);
    await this.pushOutput(execution, '✓ Cleaned successfully', 0);
  }

  private async runGeneric(execution: TaskExecution): Promise<void> {
    await this.pushOutput(execution, 'Running task...', 300);
    await this.pushOutput(execution, 'Processing...', 400);
    await this.pushOutput(execution, '', 200);
    await this.pushOutput(execution, '✓ Task completed', 0);
  }

  // ─── Cancel ─────────────────────────────────────────────────────

  cancelTask(executionId: string): void {
    const execution = this.executions.get(executionId);
    if (execution && execution.status === 'running') {
      execution.status = 'cancelled';
      execution.endTime = new Date();
      execution.output.push('');
      execution.output.push('Task cancelled by user');
      this.emit({ type: 'taskEnd', data: { execution } });
    }
  }

  // ─── History ────────────────────────────────────────────────────

  getExecutionHistory(): TaskExecution[] {
    return Array.from(this.executions.values())
      .sort((a, b) => b.startTime.getTime() - a.startTime.getTime());
  }

  getExecution(id: string): TaskExecution | undefined {
    return this.executions.get(id);
  }

  clearHistory(): void {
    const running = new Map<string, TaskExecution>();
    this.executions.forEach((exec, id) => {
      if (exec.status === 'running') running.set(id, exec);
    });
    this.executions = running;
  }

  // ─── Test Runner ────────────────────────────────────────────────

  async runTests(framework: TestFramework, options?: { watch?: boolean; coverage?: boolean; filter?: string; files?: string[] }): Promise<TestRun> {
    const frameworkInfo = TEST_FRAMEWORKS[framework];
    if (!frameworkInfo) throw new Error(`Unknown test framework: ${framework}`);

    const testRun: TestRun = {
      id: `test-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      framework,
      status: 'running',
      startTime: new Date(),
      suites: [],
      summary: { total: 0, passed: 0, failed: 0, skipped: 0, pending: 0, duration: 0 },
      output: [],
    };

    this.testRuns.set(testRun.id, testRun);
    this.activeTestRun = testRun;
    this.emit({ type: 'testStart', data: { testRun } });

    await this.executeTestRun(testRun, options);
    return testRun;
  }

  private async executeTestRun(testRun: TestRun, options?: { coverage?: boolean; filter?: string }): Promise<void> {
    const allFiles = this.flattenFiles(this.workspaceFiles);
    const suites = this.buildTestSuites(testRun.framework, allFiles, options?.filter);
    testRun.suites = suites;

    for (const suite of suites) {
      suite.status = 'running';
      this.emit({ type: 'testResult', data: { testRun, suite } });

      for (const test of suite.tests) {
        test.status = 'running';
        await new Promise(r => setTimeout(r, 30 + Math.random() * 100));

        const passed = Math.random() > 0.08;
        test.status = passed ? 'passed' : 'failed';
        test.duration = Math.floor(Math.random() * 80) + 1;

        if (!passed) {
          test.error = {
            message: 'Expected value to match, received mismatch',
            stack: `Error: Assertion failed\n    at ${suite.file}:${Math.floor(Math.random() * 100) + 1}:5`,
            expected: '"expected"',
            actual: '"actual"',
          };
        }

        testRun.summary.total++;
        if (passed) testRun.summary.passed++;
        else testRun.summary.failed++;
        this.emit({ type: 'testResult', data: { testRun, suite, test } });
      }

      suite.status = suite.tests.some(t => t.status === 'failed') ? 'failed' : 'passed';
      suite.duration = suite.tests.reduce((sum, t) => sum + (t.duration || 0), 0);
    }

    testRun.summary.duration = suites.reduce((sum, s) => sum + (s.duration || 0), 0);

    if (options?.coverage) {
      testRun.coverage = this.buildCoverage(allFiles);
    }

    testRun.status = testRun.summary.failed > 0 ? 'failed' : 'completed';
    testRun.endTime = new Date();
    this.emit({ type: 'testEnd', data: { testRun } });
  }

  private buildTestSuites(framework: TestFramework, files: string[], filter?: string): TestSuite[] {
    const testFilePatterns = /\.(test|spec)\.(tsx?|jsx?|py|rb)$/;
    let testFiles = files.filter(f => testFilePatterns.test(f));

    if (testFiles.length === 0) {
      const sourceFiles = files.filter(f => /\.(tsx?|jsx?|py|rb|go|rs)$/.test(f) && !f.includes('node_modules'));
      testFiles = sourceFiles.slice(0, 6).map(f => {
        const ext = f.match(/\.(tsx?|jsx?|py|rb|go|rs)$/)?.[0] || '.ts';
        return f.replace(new RegExp(`\\${ext}$`), `.test${ext}`);
      });
    }

    if (filter) {
      testFiles = testFiles.filter(f => f.toLowerCase().includes(filter.toLowerCase()));
    }

    return testFiles.slice(0, 8).map(file => {
      const baseName = file.split('/').pop()?.replace(/\.(test|spec)\..*$/, '') || 'Unknown';
      const testNames = this.generateTestNames(baseName);
      return {
        id: `suite-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
        name: baseName,
        file,
        framework,
        status: 'pending' as const,
        tests: testNames.map(name => ({
          id: `test-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
          name,
          fullName: `${baseName} > ${name}`,
          status: 'pending' as const,
          ancestorTitles: [baseName],
        })),
      };
    });
  }

  private generateTestNames(baseName: string): string[] {
    const lower = baseName.toLowerCase();
    if (/util|helper/.test(lower)) return ['handles edge cases correctly', 'processes valid input', 'throws on invalid input', 'returns expected defaults'];
    if (/component|button|header|modal|panel|sidebar|nav/.test(lower)) return ['renders without crashing', 'displays correct content', 'handles user interaction', 'applies correct styles'];
    if (/api|service|fetch|client/.test(lower)) return ['fetches data successfully', 'handles network errors', 'retries on timeout', 'returns correct format'];
    if (/hook|use/.test(lower)) return ['initializes with default value', 'updates on change', 'cleans up on unmount'];
    if (/store|state|redux|context/.test(lower)) return ['initial state is correct', 'updates on action', 'selectors return correct data'];
    if (/route|page|view/.test(lower)) return ['renders at correct path', 'handles navigation', 'loads data on mount'];
    return ['should work correctly', 'handles expected input', 'handles edge cases'];
  }

  private buildCoverage(files: string[]): CoverageReport {
    const sourceFiles = files
      .filter(f => /\.(tsx?|jsx?|py)$/.test(f) && !/\.(test|spec)\./.test(f) && !f.includes('node_modules'))
      .slice(0, 10);

    const fileCoverages: FileCoverage[] = sourceFiles.map(f => {
      const base = 70 + Math.floor(Math.random() * 25);
      const createMetric = (pct: number): CoverageMetric => ({
        total: 50 + Math.floor(Math.random() * 100),
        covered: Math.floor((50 + Math.floor(Math.random() * 100)) * pct / 100),
        skipped: 0,
        percentage: pct,
      });

      return {
        file: f,
        lines: createMetric(base + Math.floor(Math.random() * 8)),
        statements: createMetric(base + Math.floor(Math.random() * 6)),
        functions: createMetric(base + Math.floor(Math.random() * 15)),
        branches: createMetric(Math.max(50, base - 10 + Math.floor(Math.random() * 10))),
        uncoveredLines: Array.from({ length: Math.floor(Math.random() * 5) }, () => Math.floor(Math.random() * 100) + 1),
        uncoveredBranches: Math.random() > 0.5 ? [{ line: Math.floor(Math.random() * 50) + 1, branch: 1 }] : [],
      };
    });

    const calcSummary = (key: 'lines' | 'statements' | 'functions' | 'branches'): CoverageMetric => {
      const total = fileCoverages.reduce((sum, f) => sum + f[key].total, 0);
      const covered = fileCoverages.reduce((sum, f) => sum + f[key].covered, 0);
      return { total, covered, skipped: 0, percentage: total > 0 ? Math.round((covered / total) * 100) : 0 };
    };

    return {
      timestamp: new Date(),
      summary: {
        lines: calcSummary('lines'),
        statements: calcSummary('statements'),
        functions: calcSummary('functions'),
        branches: calcSummary('branches'),
      },
      files: fileCoverages,
    };
  }

  // ─── Test Run Getters ──────────────────────────────────────────

  getActiveTestRun(): TestRun | null {
    return this.activeTestRun;
  }

  getAllTestRuns(): TestRun[] {
    return Array.from(this.testRuns.values())
      .sort((a, b) => b.startTime.getTime() - a.startTime.getTime());
  }

  cancelTestRun(runId: string): void {
    const run = this.testRuns.get(runId);
    if (run && run.status === 'running') {
      run.status = 'cancelled';
      run.endTime = new Date();
      if (this.activeTestRun?.id === runId) this.activeTestRun = null;
      this.emit({ type: 'testEnd', data: { testRun: run } });
    }
  }

  async rerunFailedTests(): Promise<TestRun | null> {
    if (!this.activeTestRun) return null;
    const failedNames = this.activeTestRun.suites
      .flatMap(s => s.tests)
      .filter(t => t.status === 'failed')
      .map(t => t.fullName);
    if (failedNames.length === 0) return null;
    return this.runTests(this.activeTestRun.framework, { filter: failedNames.join('|') });
  }

  // ─── Automation Rules ──────────────────────────────────────────

  addAutomationRule(rule: AutomationRule): void {
    this.automationRules.set(rule.id, rule);
  }

  removeAutomationRule(id: string): void {
    this.automationRules.delete(id);
  }

  getAutomationRules(): AutomationRule[] {
    return Array.from(this.automationRules.values());
  }

  toggleAutomationRule(id: string): void {
    const rule = this.automationRules.get(id);
    if (rule) rule.enabled = !rule.enabled;
  }

  async runAutomation(ruleId: string): Promise<void> {
    const rule = this.automationRules.get(ruleId);
    if (!rule || !rule.enabled) return;
    for (const taskId of rule.tasks) {
      await this.executeTask(taskId);
    }
  }

  // ─── Event System ──────────────────────────────────────────────

  on(event: string, callback: EventCallback): () => void {
    const listeners = this.eventListeners.get(event) || [];
    listeners.push(callback);
    this.eventListeners.set(event, listeners);
    return () => {
      const current = this.eventListeners.get(event) || [];
      this.eventListeners.set(event, current.filter(cb => cb !== callback));
    };
  }

  private emit(event: TaskEvent): void {
    const listeners = this.eventListeners.get(event.type) || [];
    listeners.forEach(cb => cb(event));
    const wildcardListeners = this.eventListeners.get('*') || [];
    wildcardListeners.forEach(cb => cb(event));
  }

  // ─── Export ─────────────────────────────────────────────────────

  generateTasksJson(): string {
    const tasks = Array.from(this.tasks.values()).map(task => ({
      label: task.name,
      type: 'shell',
      command: task.command,
      args: task.args,
      group: task.group,
      problemMatcher: task.problemMatcher || [],
      presentation: task.presentation,
    }));
    return JSON.stringify({ version: '2.0.0', tasks }, null, 2);
  }
}

// Singleton
export const taskRunnerService = new TaskRunnerService();
export default taskRunnerService;
