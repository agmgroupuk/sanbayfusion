/**
 * Canvas Studio Deployment Service (Standalone Canvas Studio)
 * 
 * Handles deploying projects to Maula.ai, Vercel, Railway, Netlify, and Cloudflare Pages.
 * Credentials and deploy history are stored in the database via /api/canvas/deploy.
 * NO localStorage — 100% server-side persistence with AES-256-GCM encryption.
 */

import {
  DeploymentPlatform,
  DeploymentCredentials,
  DeploymentConfig,
  DeploymentResult,
  DeploymentStatus,
} from '../types';

// ==================== CREDENTIALS MANAGEMENT (DB-backed) ====================

const DEPLOY_API = '/api/canvas/deploy';
const SOURCE = 'standalone';

/** Get all saved deployment credentials (tokens are masked by backend) */
export async function getCredentials(): Promise<DeploymentCredentials[]> {
  try {
    const res = await fetch(`${DEPLOY_API}/credentials`, { credentials: 'include' });
    if (!res.ok) return [];
    const data = await res.json();
    return data.success ? data.credentials : [];
  } catch {
    return [];
  }
}

/** Save a deployment credential */
export async function saveCredential(cred: DeploymentCredentials): Promise<void> {
  await fetch(`${DEPLOY_API}/credentials`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({
      platform: cred.platform,
      label: cred.label || 'default',
      token: cred.token,
      teamId: cred.teamId,
    }),
  });
}

/** Remove a deployment credential */
export async function removeCredential(platform: DeploymentPlatform, label?: string): Promise<void> {
  const url = label
    ? `${DEPLOY_API}/credentials/${platform}?label=${encodeURIComponent(label)}`
    : `${DEPLOY_API}/credentials/${platform}`;
  await fetch(url, { method: 'DELETE', credentials: 'include' });
}

/** Get credential for a specific platform (returns decrypted token for deploy) */
export async function getCredentialForPlatform(platform: DeploymentPlatform): Promise<DeploymentCredentials | null> {
  try {
    const res = await fetch(`${DEPLOY_API}/credentials/${platform}/token`, { credentials: 'include' });
    if (!res.ok) return null;
    const data = await res.json();
    if (data.success) {
      return { platform, token: data.token, teamId: data.teamId } as DeploymentCredentials;
    }
    return null;
  } catch {
    return null;
  }
}

/** Check if user has credentials for a platform */
export async function hasCredentials(platform: DeploymentPlatform): Promise<boolean> {
  const cred = await getCredentialForPlatform(platform);
  return cred !== null;
}

// ==================== DEPLOYMENT HISTORY (DB-backed) ====================

export interface DeploymentHistoryEntry {
  id: string;
  platform: DeploymentPlatform;
  projectName: string;
  url?: string;
  status: 'success' | 'failed';
  timestamp: number;
  error?: string;
}

export async function getDeploymentHistory(): Promise<DeploymentHistoryEntry[]> {
  try {
    const res = await fetch(`${DEPLOY_API}/history?source=${SOURCE}`, {
      credentials: 'include',
      headers: { 'X-Canvas-Source': SOURCE },
    });
    if (!res.ok) return [];
    const data = await res.json();
    if (data.success && data.history) {
      return data.history.map((h: any) => ({
        id: h.id,
        platform: h.platform,
        projectName: h.projectName,
        url: h.url,
        status: h.status,
        timestamp: new Date(h.createdAt).getTime(),
        error: h.error,
      }));
    }
    return [];
  } catch {
    return [];
  }
}

export async function addDeploymentHistory(entry: DeploymentHistoryEntry): Promise<void> {
  await fetch(`${DEPLOY_API}/history`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Canvas-Source': SOURCE },
    credentials: 'include',
    body: JSON.stringify({
      platform: entry.platform,
      projectName: entry.projectName,
      url: entry.url,
      status: entry.status,
      error: entry.error,
      source: SOURCE,
    }),
  }).catch(() => { /* fire-and-forget */ });
}

// ==================== PLATFORM METADATA ====================

export interface PlatformInfo {
  id: DeploymentPlatform;
  name: string;
  icon: string;
  color: string;
  tokenUrl: string;
  tokenGuide: string;
  features: string[];
  requiresTeamId: boolean;
}

export const PLATFORMS: PlatformInfo[] = [
  {
    id: 'maula',
    name: 'Maula.ai',
    icon: '🚀',
    color: '#8B5CF6',
    tokenUrl: '',
    tokenGuide: 'No token needed — deploy instantly with your Maula account!',
    features: ['Instant Deploy', 'Free SSL', 'Global CDN', 'Custom Subdomain', 'Shareable Link'],
    requiresTeamId: false,
  },
  {
    id: 'vercel',
    name: 'Vercel',
    icon: '▲',
    color: '#000000',
    tokenUrl: 'https://vercel.com/account/tokens',
    tokenGuide: 'Go to Vercel → Settings → Tokens → Create Token',
    features: ['Automatic SSL', 'Edge Network', 'Instant Deploys', 'Preview URLs'],
    requiresTeamId: false,
  },
  {
    id: 'netlify',
    name: 'Netlify',
    icon: '◆',
    color: '#00C7B7',
    tokenUrl: 'https://app.netlify.com/user/applications#personal-access-tokens',
    tokenGuide: 'Go to Netlify → User Settings → Applications → Personal Access Tokens',
    features: ['Automatic SSL', 'CDN', 'Form Handling', 'Split Testing'],
    requiresTeamId: false,
  },
  {
    id: 'railway',
    name: 'Railway',
    icon: '🚂',
    color: '#0B0D0E',
    tokenUrl: 'https://railway.app/account/tokens',
    tokenGuide: 'Go to Railway → Account → Tokens → Create Token',
    features: ['Auto Deploy', 'Databases', 'Background Jobs', 'Cron Jobs'],
    requiresTeamId: false,
  },
  {
    id: 'cloudflare',
    name: 'Cloudflare Pages',
    icon: '☁️',
    color: '#F38020',
    tokenUrl: 'https://dash.cloudflare.com/profile/api-tokens',
    tokenGuide: 'Go to Cloudflare → My Profile → API Tokens → Create Token',
    features: ['Edge Network', 'Workers', 'KV Storage', 'Fast Builds'],
    requiresTeamId: true,
  },
];

export function getPlatformInfo(platform: DeploymentPlatform): PlatformInfo {
  return PLATFORMS.find(p => p.id === platform)!;
}

// ==================== DEPLOYMENT API ====================

type StatusCallback = (status: DeploymentStatus) => void;

/**
 * Deploy to Maula.ai hosting (S3 + subdomain)
 * No token needed — uses the backend Express API directly
 */
export async function deployToMaula(
  config: DeploymentConfig,
  files: Record<string, string>,
  onStatus?: StatusCallback,
): Promise<DeploymentResult> {
  onStatus?.({
    state: 'preparing',
    platform: 'maula',
    progress: 10,
    message: 'Preparing project for Maula.ai...',
    logs: ['🚀 Deploying to Maula.ai...'],
  });

  try {
    // Clean file paths
    const cleanFiles: Record<string, string> = {};
    for (const [path, content] of Object.entries(files)) {
      const cleanPath = path.startsWith('/') ? path.slice(1) : path;
      if (cleanPath && content) {
        cleanFiles[cleanPath] = content;
      }
    }

    onStatus?.({
      state: 'uploading',
      platform: 'maula',
      progress: 30,
      message: `Uploading ${Object.keys(cleanFiles).length} files...`,
      logs: ['🚀 Deploying to Maula.ai...', `📦 Uploading ${Object.keys(cleanFiles).length} files...`],
    });

    const response = await fetch('/api/canvas/deploy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        projectName: config.projectName,
        files: cleanFiles,
        type: 'html',
      }),
    });

    onStatus?.({
      state: 'deploying',
      platform: 'maula',
      progress: 70,
      message: 'Publishing to CDN...',
      logs: ['🚀 Deploying to Maula.ai...', `📦 Uploading ${Object.keys(cleanFiles).length} files...`, '🌐 Publishing to CDN...'],
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      const err = data.error || 'Deployment failed';
      onStatus?.({
        state: 'error',
        platform: 'maula',
        message: err,
        logs: [err],
        error: err,
      });
      addDeploymentHistory({
        id: `deploy_${Date.now()}`,
        platform: 'maula',
        projectName: config.projectName,
        status: 'failed',
        error: err,
        timestamp: Date.now(),
      });
      return { success: false, platform: 'maula', error: err, errorType: 'build', timestamp: Date.now() };
    }

    const url = data.url;
    onStatus?.({
      state: 'ready',
      platform: 'maula',
      progress: 100,
      message: '✅ Live on Maula.ai!',
      logs: [
        '🚀 Deploying to Maula.ai...',
        `📦 Uploaded ${data.filesUploaded || Object.keys(cleanFiles).length} files`,
        '🌐 Published to CDN',
        `✅ Live at ${url}`,
      ],
      url,
    });

    addDeploymentHistory({
      id: data.deploymentId || `deploy_${Date.now()}`,
      platform: 'maula',
      projectName: config.projectName,
      url,
      status: 'success',
      timestamp: Date.now(),
    });

    return {
      success: true,
      platform: 'maula',
      url,
      deploymentId: data.deploymentId,
      buildLogs: [`Deployed ${data.filesUploaded || Object.keys(cleanFiles).length} files to ${url}`],
      timestamp: Date.now(),
    };
  } catch (err: any) {
    const error = err.message || 'Network error';
    onStatus?.({
      state: 'error',
      platform: 'maula',
      message: error,
      logs: [error],
      error,
    });
    addDeploymentHistory({
      id: `deploy_${Date.now()}`,
      platform: 'maula',
      projectName: config.projectName,
      status: 'failed',
      error,
      timestamp: Date.now(),
    });
    return { success: false, platform: 'maula', error, errorType: 'network', timestamp: Date.now() };
  }
}

/**
 * Deploy the current project to a platform
 */
export async function deployProject(
  config: DeploymentConfig,
  files: Record<string, string>,
  onStatus?: StatusCallback,
): Promise<DeploymentResult> {
  // Maula hosting — no token needed, use dedicated function
  if (config.platform === 'maula') {
    return deployToMaula(config, files, onStatus);
  }

  const credential = await getCredentialForPlatform(config.platform);

  if (!credential) {
    return {
      success: false,
      platform: config.platform,
      error: `No ${getPlatformInfo(config.platform).name} credentials found. Please add your API token in the Deploy panel.`,
      errorType: 'auth',
      timestamp: Date.now(),
    };
  }

  // Update status: preparing
  onStatus?.({
    state: 'preparing',
    platform: config.platform,
    progress: 10,
    message: `Preparing project for ${getPlatformInfo(config.platform).name}...`,
    logs: ['Preparing deployment bundle...'],
  });

  try {
    // Call our backend deploy API
    onStatus?.({
      state: 'uploading',
      platform: config.platform,
      progress: 30,
      message: 'Uploading files...',
      logs: ['Preparing deployment bundle...', `Uploading ${Object.keys(files).length} files...`],
    });

    const response = await fetch('/api/canvas/deploy-external', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        platform: config.platform,
        token: credential.token,
        teamId: credential.teamId,
        projectName: config.projectName,
        framework: config.framework || 'static',
        buildCommand: config.buildCommand,
        outputDir: config.outputDir,
        envVars: config.envVars,
        nodeVersion: config.nodeVersion,
        files,
      }),
    });

    onStatus?.({
      state: 'building',
      platform: config.platform,
      progress: 60,
      message: 'Building project...',
      logs: ['Preparing deployment bundle...', `Uploading ${Object.keys(files).length} files...`, 'Build started...'],
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      const result: DeploymentResult = {
        success: false,
        platform: config.platform,
        error: data.error || 'Deployment failed',
        errorType: data.errorType || 'build',
        buildLogs: data.buildLogs,
        timestamp: Date.now(),
      };

      onStatus?.({
        state: 'error',
        platform: config.platform,
        message: result.error || 'Deployment failed',
        logs: data.buildLogs || [result.error || 'Unknown error'],
        error: result.error,
      });

      addDeploymentHistory({
        id: `deploy_${Date.now()}`,
        platform: config.platform,
        projectName: config.projectName,
        status: 'failed',
        error: result.error,
        timestamp: Date.now(),
      });

      return result;
    }

    // Success!
    const result: DeploymentResult = {
      success: true,
      platform: config.platform,
      url: data.url,
      deploymentId: data.deploymentId,
      buildLogs: data.buildLogs,
      timestamp: Date.now(),
    };

    onStatus?.({
      state: 'ready',
      platform: config.platform,
      progress: 100,
      message: 'Deployed successfully!',
      logs: [...(data.buildLogs || []), '✅ Deployment complete!'],
      url: data.url,
    });

    addDeploymentHistory({
      id: data.deploymentId || `deploy_${Date.now()}`,
      platform: config.platform,
      projectName: config.projectName,
      url: data.url,
      status: 'success',
      timestamp: Date.now(),
    });

    return result;
  } catch (err: any) {
    const error = err.message || 'Network error during deployment';

    onStatus?.({
      state: 'error',
      platform: config.platform,
      message: error,
      logs: [error],
      error,
    });

    addDeploymentHistory({
      id: `deploy_${Date.now()}`,
      platform: config.platform,
      projectName: config.projectName,
      status: 'failed',
      error,
      timestamp: Date.now(),
    });

    return {
      success: false,
      platform: config.platform,
      error,
      errorType: 'network',
      timestamp: Date.now(),
    };
  }
}

/**
 * Auto-fix build errors by sending them to the AI agent
 */
export async function requestBuildFix(
  error: string,
  buildLogs: string[],
  files: Record<string, string>,
): Promise<{ fixedFiles: Record<string, string>; explanation: string } | null> {
  try {
    const response = await fetch('/api/canvas/deploy-external/fix', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        error,
        buildLogs,
        files,
      }),
    });

    const data = await response.json();
    if (data.success && data.fixedFiles) {
      return {
        fixedFiles: data.fixedFiles,
        explanation: data.explanation || 'Build errors fixed.',
      };
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Get all files needed for deployment, including generated config files
 */
export function prepareDeploymentFiles(
  files: Record<string, string>,
  config: DeploymentConfig,
): Record<string, string> {
  const deployFiles: Record<string, string> = {};

  // Copy all project files
  for (const [path, content] of Object.entries(files)) {
    // Remove leading slash for deployment
    const cleanPath = path.startsWith('/') ? path.slice(1) : path;
    deployFiles[cleanPath] = content;
  }

  // Generate package.json if not present
  if (!deployFiles['package.json']) {
    const pkg: Record<string, unknown> = {
      name: config.projectName.toLowerCase().replace(/[^a-z0-9-]/g, '-'),
      version: '1.0.0',
      description: `Built with Maula.AI Canvas Studio`,
      private: true,
    };

    if (config.framework === 'static') {
      // No build step needed
      pkg.scripts = {
        start: 'npx serve .',
      };
    } else if (config.framework === 'vite') {
      pkg.scripts = {
        dev: 'vite',
        build: 'vite build',
        preview: 'vite preview',
      };
      pkg.devDependencies = {
        vite: '^5.4.0',
      };
    }

    deployFiles['package.json'] = JSON.stringify(pkg, null, 2);
  }

  // Platform-specific config files
  if (config.platform === 'vercel' && !deployFiles['vercel.json']) {
    const vercelConfig: Record<string, unknown> = {
      framework: config.framework === 'static' ? null : undefined,
      buildCommand: config.buildCommand || (config.framework === 'static' ? undefined : 'npm run build'),
      outputDirectory: config.outputDir || (config.framework === 'static' ? '.' : 'dist'),
    };
    // Remove undefined values
    Object.keys(vercelConfig).forEach(k => vercelConfig[k] === undefined && delete vercelConfig[k]);
    deployFiles['vercel.json'] = JSON.stringify(vercelConfig, null, 2);
  }

  if (config.platform === 'netlify' && !deployFiles['netlify.toml']) {
    const toml = config.framework === 'static'
      ? `[build]\n  publish = "."\n`
      : `[build]\n  command = "${config.buildCommand || 'npm run build'}"\n  publish = "${config.outputDir || 'dist'}"\n`;
    deployFiles['netlify.toml'] = toml;
  }

  return deployFiles;
}

// ==================== ONE-TIME MIGRATION ====================

/** Migration no-op — localStorage is no longer used for credentials or history */
export async function migrateLocalStorageDeploy(): Promise<void> {
  // NO localStorage — credentials and history are DB-only.
  // This function is kept for backward compatibility but does nothing.
}

// ==================== EXPORTS ====================

const deploymentService = {
  // Credentials
  getCredentials,
  saveCredential,
  removeCredential,
  getCredentialForPlatform,
  hasCredentials,
  // Deployment
  deployProject,
  deployToMaula,
  requestBuildFix,
  prepareDeploymentFiles,
  // History
  getDeploymentHistory,
  addDeploymentHistory,
  // Migration
  migrateLocalStorageDeploy,
  // Platform info
  PLATFORMS,
  getPlatformInfo,
};

export default deploymentService;
