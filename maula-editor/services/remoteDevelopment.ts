// Remote Development Service
// SSH, WSL, Containers, Docker, Notebooks, and Database integration
// Workspace-aware: scans project files for Dockerfiles, docker-compose.yml, .devcontainer, .env

import type { FileNode } from '../types';
import { EDITOR_API_BASE } from './apiConfig';
import { createLogger } from './logger';
const log = createLogger('remoteDev');

export type RemoteConnectionType = 'ssh' | 'wsl' | 'container' | 'tunnel' | 'codespaces';

export interface SSHConfig {
  host: string;
  port: number;
  username: string;
  authMethod: 'password' | 'key' | 'agent';
  privateKeyPath?: string;
  passphrase?: string;
  jumpHost?: SSHConfig;
  forwardAgent: boolean;
  keepAliveInterval: number;
}

export interface WSLConfig {
  distribution: string;
  defaultUser?: string;
  mountPoint: string;
  networkingMode: 'nat' | 'mirrored';
  features: {
    systemd: boolean;
    gui: boolean;
    nested: boolean;
  };
}

export interface ContainerConfig {
  image: string;
  tag: string;
  name?: string;
  runtime: 'docker' | 'podman' | 'containerd';
  volumes: VolumeMount[];
  ports: PortMapping[];
  environment: Record<string, string>;
  network?: string;
  privileged: boolean;
  workDir: string;
  command?: string[];
  devcontainer?: DevContainerConfig;
}

export interface VolumeMount {
  source: string;
  target: string;
  readonly: boolean;
  type: 'bind' | 'volume' | 'tmpfs';
}

export interface PortMapping {
  hostPort: number;
  containerPort: number;
  protocol: 'tcp' | 'udp';
}

export interface DevContainerConfig {
  name: string;
  image?: string;
  build?: {
    dockerfile: string;
    context: string;
    args?: Record<string, string>;
  };
  features?: Record<string, any>;
  customizations?: {
    vscode?: {
      extensions?: string[];
      settings?: Record<string, any>;
    };
  };
  forwardPorts?: number[];
  postCreateCommand?: string;
  postStartCommand?: string;
  remoteUser?: string;
}

export interface RemoteConnection {
  id: string;
  type: RemoteConnectionType;
  name: string;
  status: 'disconnected' | 'connecting' | 'connected' | 'error';
  config: SSHConfig | WSLConfig | ContainerConfig;
  createdAt: Date;
  lastConnected?: Date;
  error?: string;
  stats?: ConnectionStats;
}

export interface ConnectionStats {
  latency: number;
  bytesIn: number;
  bytesOut: number;
  uptime: number;
  cpuUsage?: number;
  memoryUsage?: number;
  diskUsage?: number;
}

export interface DockerContainer {
  id: string;
  name: string;
  image: string;
  status: 'created' | 'running' | 'paused' | 'exited' | 'dead';
  state: string;
  ports: PortMapping[];
  created: Date;
  started?: Date;
  stats?: {
    cpuPercent: number;
    memoryUsage: number;
    memoryLimit: number;
    networkRx: number;
    networkTx: number;
  };
}

export interface DockerImage {
  id: string;
  repository: string;
  tag: string;
  created: Date;
  size: number;
  layers: number;
}

export interface DockerVolume {
  name: string;
  driver: string;
  mountpoint: string;
  created: Date;
  size?: number;
}

export interface DockerNetwork {
  id: string;
  name: string;
  driver: string;
  scope: string;
  ipam?: {
    subnet: string;
    gateway: string;
  };
  containers: string[];
}

export interface NotebookDocument {
  id: string;
  name: string;
  path: string;
  language: 'python' | 'r' | 'julia' | 'javascript' | 'typescript';
  cells: NotebookCell[];
  metadata: NotebookMetadata;
  dirty: boolean;
}

export interface NotebookCell {
  id: string;
  type: 'code' | 'markdown' | 'raw';
  source: string;
  outputs: CellOutput[];
  executionCount?: number;
  executionState?: 'idle' | 'running' | 'queued';
}

export interface CellOutput {
  type: 'stream' | 'execute_result' | 'display_data' | 'error';
  text?: string;
  data?: Record<string, string>;
  traceback?: string[];
}

export interface NotebookMetadata {
  kernelspec: KernelSpec;
}

export interface KernelSpec {
  name: string;
  displayName: string;
  language: string;
  interruptMode?: string;
}

export interface Kernel {
  id: string;
  name: string;
  spec: KernelSpec;
  status: 'idle' | 'busy' | 'starting' | 'restarting' | 'dead';
  executionCount: number;
  lastActivity: Date;
  connections: number;
}

export interface DatabaseConnection {
  id: string;
  name: string;
  type: 'postgresql' | 'mysql' | 'sqlite' | 'mongodb' | 'redis';
  host: string;
  port: number;
  database: string;
  username: string;
  password?: string;
  ssl: boolean;
  status: 'disconnected' | 'connecting' | 'connected' | 'error';
  tables?: DatabaseTable[];
  error?: string;
}

export interface DatabaseTable {
  name: string;
  type: 'table' | 'view';
  rowCount: number;
  columns: DatabaseColumn[];
  primaryKey?: string[];
  foreignKeys?: ForeignKey[];
  indexes?: DatabaseIndex[];
}

export interface DatabaseColumn {
  name: string;
  type: string;
  nullable: boolean;
  isPrimaryKey: boolean;
  isForeignKey: boolean;
  isUnique: boolean;
  defaultValue?: string;
}

export interface DatabaseIndex {
  name: string;
  columns: string[];
  unique: boolean;
}

export interface ForeignKey {
  name: string;
  columns: string[];
  referencedTable: string;
  referencedColumns: string[];
  onDelete: string;
  onUpdate: string;
}

export interface QueryResult {
  columns: string[];
  rows: any[][];
  rowCount: number;
  executionTime: number;
  error?: string;
}

// Workspace detection info
export interface WorkspaceDetection {
  hasDockerfile: boolean;
  hasDockerCompose: boolean;
  hasDevContainer: boolean;
  hasEnvFile: boolean;
  hasPrismaSchema: boolean;
  dockerfiles: string[];
  composeFiles: string[];
  envFiles: string[];
}

type EventCallback = (event: { type: string; data: any }) => void;

class RemoteDevelopmentService {
  private connections: Map<string, RemoteConnection> = new Map();
  private containers: DockerContainer[] = [];
  private images: DockerImage[] = [];
  private volumes: DockerVolume[] = [];
  private networks: DockerNetwork[] = [];
  private notebooks: Map<string, NotebookDocument> = new Map();
  private kernels: Map<string, Kernel> = new Map();
  private databaseConnections: Map<string, DatabaseConnection> = new Map();
  private listeners: Map<string, Set<EventCallback>> = new Map();
  private workspaceDetection: WorkspaceDetection = {
    hasDockerfile: false,
    hasDockerCompose: false,
    hasDevContainer: false,
    hasEnvFile: false,
    hasPrismaSchema: false,
    dockerfiles: [],
    composeFiles: [],
    envFiles: [],
  };

  constructor() {
    // No mock data — starts empty, populated by workspace scanning and user interaction
  }

  // Workspace awareness: scan project files for Docker/DB/env configs
  setWorkspaceFiles(files: FileNode[]): void {
    const detection: WorkspaceDetection = {
      hasDockerfile: false,
      hasDockerCompose: false,
      hasDevContainer: false,
      hasEnvFile: false,
      hasPrismaSchema: false,
      dockerfiles: [],
      composeFiles: [],
      envFiles: [],
    };

    const scanFiles = (nodes: FileNode[], parentPath = '') => {
      for (const node of nodes) {
        const fullPath = parentPath ? `${parentPath}/${node.name}` : node.name;

        if (node.type === 'file') {
          const lower = node.name.toLowerCase();

          if (lower === 'dockerfile' || lower.startsWith('dockerfile.')) {
            detection.hasDockerfile = true;
            detection.dockerfiles.push(fullPath);
          }
          if (lower === 'docker-compose.yml' || lower === 'docker-compose.yaml' || lower === 'compose.yml' || lower === 'compose.yaml') {
            detection.hasDockerCompose = true;
            detection.composeFiles.push(fullPath);
          }
          if (lower === 'devcontainer.json' || lower === '.devcontainer.json') {
            detection.hasDevContainer = true;
          }
          if (lower === '.env' || lower.startsWith('.env.')) {
            detection.hasEnvFile = true;
            detection.envFiles.push(fullPath);
          }
          if (lower === 'schema.prisma') {
            detection.hasPrismaSchema = true;
          }
        }

        if (node.type === 'directory' && node.children) {
          scanFiles(node.children, fullPath);
        }
      }
    };

    scanFiles(files);
    this.workspaceDetection = detection;
    this.emit('workspaceScanned', detection);
  }

  getWorkspaceDetection(): WorkspaceDetection {
    return { ...this.workspaceDetection };
  }

  // Connection Management
  createConnection(config: Omit<RemoteConnection, 'id' | 'status' | 'createdAt'>): RemoteConnection {
    const connection: RemoteConnection = {
      ...config,
      id: `conn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      status: 'disconnected',
      createdAt: new Date(),
    };

    this.connections.set(connection.id, connection);
    this.emit('connectionCreated', connection);
    return connection;
  }

  async connect(connectionId: string): Promise<void> {
    const connection = this.connections.get(connectionId);
    if (!connection) throw new Error('Connection not found');

    connection.status = 'connecting';
    this.emit('connectionStatusChanged', connection);

    // In production, this would attempt SSH/WSL/container connection via backend API
    await new Promise(resolve => setTimeout(resolve, 1200));

    connection.status = 'connected';
    connection.lastConnected = new Date();
    connection.stats = {
      latency: 0,
      bytesIn: 0,
      bytesOut: 0,
      uptime: 0,
    };
    this.emit('connectionStatusChanged', connection);
  }

  async disconnect(connectionId: string): Promise<void> {
    const connection = this.connections.get(connectionId);
    if (connection) {
      connection.status = 'disconnected';
      connection.stats = undefined;
      this.emit('connectionStatusChanged', connection);
    }
  }

  deleteConnection(connectionId: string): void {
    if (this.connections.has(connectionId)) {
      this.connections.delete(connectionId);
      this.emit('connectionDeleted', { id: connectionId });
    }
  }

  getConnections(): RemoteConnection[] {
    return Array.from(this.connections.values());
  }

  getConnection(id: string): RemoteConnection | undefined {
    return this.connections.get(id);
  }

  // Docker Operations — fetched from backend Docker API
  async listContainers(): Promise<DockerContainer[]> {
    try {
      const res = await fetch(`${EDITOR_API_BASE}/docker/containers`, { credentials: 'include' });
      const data = await res.json();
      if (data.success && data.containers) {
        this.containers = data.containers.map((c: any) => ({
          id: c.id,
          name: c.name,
          image: c.image,
          status: c.status === 'running' ? 'running' : c.status === 'paused' ? 'paused' : c.status === 'created' ? 'created' : 'exited',
          state: c.state,
          ports: (c.ports || []).map((p: any) => ({ hostPort: p.host, containerPort: p.container, protocol: p.protocol })),
          created: new Date(c.created),
        }));
      }
      if (data.error) log.warn('Docker:', data.error);
    } catch (err) {
      log.warn('Docker API unavailable:', err);
    }
    return [...this.containers];
  }

  async startContainer(containerId: string): Promise<void> {
    try {
      await fetch(`${EDITOR_API_BASE}/docker/containers/${containerId}/start`, { method: 'POST', credentials: 'include' });
    } catch (err) { log.warn('Start container failed:', err); }
    const container = this.containers.find(c => c.id === containerId);
    if (container) {
      container.status = 'running';
      container.started = new Date();
      this.emit('containerStatusChanged', container);
    }
  }

  async stopContainer(containerId: string): Promise<void> {
    try {
      await fetch(`${EDITOR_API_BASE}/docker/containers/${containerId}/stop`, { method: 'POST', credentials: 'include' });
    } catch (err) { log.warn('Stop container failed:', err); }
    const container = this.containers.find(c => c.id === containerId);
    if (container) {
      container.status = 'exited';
      this.emit('containerStatusChanged', container);
    }
  }

  async restartContainer(containerId: string): Promise<void> {
    try {
      await fetch(`${EDITOR_API_BASE}/docker/containers/${containerId}/restart`, { method: 'POST', credentials: 'include' });
    } catch (err) { log.warn('Restart container failed:', err); }
    const container = this.containers.find(c => c.id === containerId);
    if (container) {
      container.status = 'running';
      this.emit('containerStatusChanged', container);
    }
  }

  async removeContainer(containerId: string): Promise<void> {
    try {
      await fetch(`${EDITOR_API_BASE}/docker/containers/${containerId}`, { method: 'DELETE', credentials: 'include' });
    } catch (err) { log.warn('Remove container failed:', err); }
    const index = this.containers.findIndex(c => c.id === containerId);
    if (index !== -1) {
      this.containers.splice(index, 1);
      this.emit('containerRemoved', { id: containerId });
    }
  }

  async createContainer(config: ContainerConfig): Promise<DockerContainer> {
    const container: DockerContainer = {
      id: Math.random().toString(36).substr(2, 12),
      name: config.name || `container_${Date.now()}`,
      image: `${config.image}:${config.tag}`,
      status: 'created',
      state: 'created',
      ports: config.ports,
      created: new Date(),
    };

    this.containers.push(container);
    this.emit('containerCreated', container);
    return container;
  }

  async getContainerLogs(containerId: string, _tail: number = 100): Promise<string[]> {
    try {
      const res = await fetch(`${EDITOR_API_BASE}/docker/containers/${containerId}/logs?tail=${_tail}`, { credentials: 'include' });
      const data = await res.json();
      if (data.success && data.logs) return data.logs;
    } catch (err) { log.warn('Container logs failed:', err); }
    return [`No log stream available for container ${containerId}`];
  }

  async listImages(): Promise<DockerImage[]> {
    try {
      const res = await fetch(`${EDITOR_API_BASE}/docker/images`, { credentials: 'include' });
      const data = await res.json();
      if (data.success && data.images) {
        this.images = data.images.map((img: any) => ({
          id: img.id,
          repository: img.repository,
          tag: img.tag,
          created: new Date(img.created),
          size: img.size,
          layers: 0,
        }));
      }
    } catch (err) { log.warn('Docker images unavailable:', err); }
    return [...this.images];
  }

  async listVolumes(): Promise<DockerVolume[]> {
    try {
      const res = await fetch(`${EDITOR_API_BASE}/docker/volumes`, { credentials: 'include' });
      const data = await res.json();
      if (data.success && data.volumes) {
        this.volumes = data.volumes.map((v: any) => ({
          name: v.name,
          driver: v.driver,
          mountpoint: v.mountpoint,
          created: new Date(v.created),
        }));
      }
    } catch (err) { log.warn('Docker volumes unavailable:', err); }
    return [...this.volumes];
  }

  async listNetworks(): Promise<DockerNetwork[]> {
    try {
      const res = await fetch(`${EDITOR_API_BASE}/docker/networks`, { credentials: 'include' });
      const data = await res.json();
      if (data.success && data.networks) {
        this.networks = data.networks.map((n: any) => ({
          id: n.id,
          name: n.name,
          driver: n.driver,
          scope: n.scope,
          containers: [],
        }));
      }
    } catch (err) { log.warn('Docker networks unavailable:', err); }
    return [...this.networks];
  }

  // Notebook Operations
  async createNotebook(name: string, language: NotebookDocument['language']): Promise<NotebookDocument> {
    const notebook: NotebookDocument = {
      id: `nb_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name,
      path: `/notebooks/${name}.ipynb`,
      language,
      cells: [
        {
          id: `cell_${Date.now()}`,
          type: 'code',
          source: '',
          outputs: [],
          executionState: 'idle',
        },
      ],
      metadata: {
        kernelspec: {
          name: language,
          displayName: language.charAt(0).toUpperCase() + language.slice(1),
          language,
        },
      },
      dirty: false,
    };

    this.notebooks.set(notebook.id, notebook);
    this.emit('notebookCreated', notebook);
    return notebook;
  }

  async addCellToNotebook(notebookId: string, type: NotebookCell['type'] = 'code'): Promise<NotebookCell | null> {
    const notebook = this.notebooks.get(notebookId);
    if (!notebook) return null;

    const cell: NotebookCell = {
      id: `cell_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      type,
      source: '',
      outputs: [],
      executionState: type === 'code' ? 'idle' : undefined,
    };

    notebook.cells.push(cell);
    notebook.dirty = true;
    this.emit('notebookCellAdded', { notebookId, cell });
    return cell;
  }

  async executeCell(notebookId: string, cellId: string): Promise<CellOutput[]> {
    const notebook = this.notebooks.get(notebookId);
    if (!notebook) throw new Error('Notebook not found');

    const cell = notebook.cells.find(c => c.id === cellId);
    if (!cell || cell.type !== 'code') throw new Error('Code cell not found');

    cell.executionState = 'running';
    this.emit('cellExecutionStarted', { notebookId, cellId });

    // In production, this would send to a Jupyter kernel via WebSocket
    await new Promise(resolve => setTimeout(resolve, 800));

    cell.executionCount = (cell.executionCount || 0) + 1;
    cell.executionState = 'idle';

    const outputs: CellOutput[] = [{
      type: 'stream',
      text: `[Cell ${cell.executionCount}] Execution requires a connected kernel.\n`,
    }];

    cell.outputs = outputs;
    notebook.dirty = true;
    this.emit('cellExecutionCompleted', { notebookId, cellId, outputs });
    return outputs;
  }

  deleteNotebook(notebookId: string): void {
    this.notebooks.delete(notebookId);
    this.emit('notebookDeleted', { id: notebookId });
  }

  getNotebooks(): NotebookDocument[] {
    return Array.from(this.notebooks.values());
  }

  getKernels(): Kernel[] {
    return Array.from(this.kernels.values());
  }

  // Database Operations
  async createDatabaseConnection(config: Omit<DatabaseConnection, 'id' | 'status' | 'tables'>): Promise<DatabaseConnection> {
    const connection: DatabaseConnection = {
      ...config,
      id: `db_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      status: 'disconnected',
    };

    this.databaseConnections.set(connection.id, connection);
    this.emit('databaseConnectionCreated', connection);
    return connection;
  }

  async connectDatabase(connectionId: string): Promise<void> {
    const connection = this.databaseConnections.get(connectionId);
    if (!connection) throw new Error('Database connection not found');

    connection.status = 'connecting';
    this.emit('databaseStatusChanged', connection);

    // In production, connect via backend proxy to actual database
    await new Promise(resolve => setTimeout(resolve, 800));

    connection.status = 'connected';
    connection.tables = [];
    this.emit('databaseStatusChanged', connection);
  }

  async disconnectDatabase(connectionId: string): Promise<void> {
    const connection = this.databaseConnections.get(connectionId);
    if (connection) {
      connection.status = 'disconnected';
      connection.tables = undefined;
      this.emit('databaseStatusChanged', connection);
    }
  }

  deleteDatabaseConnection(connectionId: string): void {
    this.databaseConnections.delete(connectionId);
    this.emit('databaseConnectionDeleted', { id: connectionId });
  }

  async executeQuery(connectionId: string, _query: string): Promise<QueryResult> {
    const connection = this.databaseConnections.get(connectionId);
    if (!connection || connection.status !== 'connected') {
      throw new Error('Not connected to database');
    }

    const startTime = Date.now();
    await new Promise(resolve => setTimeout(resolve, 200));

    return {
      columns: [],
      rows: [],
      rowCount: 0,
      executionTime: Date.now() - startTime,
      error: 'Database query execution requires a backend connection. Configure your database in the connection settings.',
    };
  }

  getDatabaseConnections(): DatabaseConnection[] {
    return Array.from(this.databaseConnections.values());
  }

  // Event System
  on(event: string, callback: EventCallback): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);
    return () => this.listeners.get(event)?.delete(callback);
  }

  private emit(event: string, data: any): void {
    this.listeners.get(event)?.forEach(cb => cb({ type: event, data }));
    this.listeners.get('*')?.forEach(cb => cb({ type: event, data }));
  }
}

export const remoteDevelopmentService = new RemoteDevelopmentService();
export default remoteDevelopmentService;
