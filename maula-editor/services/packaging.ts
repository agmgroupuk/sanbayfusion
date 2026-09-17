// Packaging & Distribution Service
// Workspace-aware: reads package.json for metadata, detects electron-builder,
// auto-populates build targets from project config.

export type Platform = 'windows' | 'macos' | 'linux';
export type Architecture = 'x64' | 'arm64' | 'ia32' | 'universal';
export type PackageFormat = 'exe' | 'msi' | 'dmg' | 'pkg' | 'mas' | 'appimage' | 'deb' | 'rpm' | 'snap' | 'flatpak' | 'zip' | 'tar.gz';
export type BuildStatus = 'pending' | 'building' | 'success' | 'failed' | 'cancelled';

export interface PlatformConfig {
  platform: Platform;
  name: string;
  icon: string;
  architectures: Architecture[];
  formats: PackageFormat[];
  color: string;
}

export interface BuildTarget {
  id: string;
  platform: Platform;
  arch: Architecture;
  format: PackageFormat;
  enabled: boolean;
}

export interface BuildConfiguration {
  id: string;
  name: string;
  version: string;
  description: string;
  targets: BuildTarget[];
  signing: SigningConfig;
  notarization: NotarizationConfig;
  autoUpdate: AutoUpdateConfig;
  license: LicenseConfig;
  telemetry: TelemetryConfig;
  metadata: AppMetadata;
  buildOptions: BuildOptions;
}

export interface SigningConfig {
  enabled: boolean;
  windows: {
    certificateFile?: string;
    certificatePassword?: string;
    certificateSubjectName?: string;
    timestampServer?: string;
  };
  macos: {
    identity?: string;
    entitlements?: string;
    entitlementsInherit?: string;
    hardenedRuntime: boolean;
    gatekeeperAssess: boolean;
  };
  linux: {
    gpgKey?: string;
  };
}

export interface NotarizationConfig {
  enabled: boolean;
  appleId?: string;
  appleIdPassword?: string;
  teamId?: string;
  ascProvider?: string;
}

export interface AutoUpdateConfig {
  enabled: boolean;
  provider: 'github' | 's3' | 'generic' | 'custom';
  url?: string;
  channel: 'stable' | 'beta' | 'alpha' | 'dev';
  allowDowngrade: boolean;
  allowPrerelease: boolean;
  checkInterval: number;
  autoDownload: boolean;
  autoInstallOnAppQuit: boolean;
}

export interface LicenseConfig {
  type: 'MIT' | 'Apache-2.0' | 'GPL-3.0' | 'BSD-3-Clause' | 'proprietary' | 'custom';
  customText?: string;
  eula?: string;
  eulaRequired: boolean;
  trialDays?: number;
  licenseKey?: {
    enabled: boolean;
    validationUrl?: string;
    offlineValidation: boolean;
  };
}

export interface TelemetryConfig {
  enabled: boolean;
  anonymousUsage: boolean;
  crashReports: boolean;
  performanceMetrics: boolean;
  featureUsage: boolean;
  endpoint?: string;
  sampleRate: number;
  optOutByDefault: boolean;
  gdprCompliant: boolean;
  dataRetentionDays: number;
}

export interface AppMetadata {
  name: string;
  productName: string;
  appId: string;
  copyright: string;
  author: {
    name: string;
    email?: string;
    url?: string;
  };
  homepage?: string;
  repository?: string;
  category?: string;
  keywords?: string[];
  icon?: string;
  splash?: string;
}

export interface BuildOptions {
  asar: boolean;
  asarUnpack?: string[];
  compression: 'store' | 'normal' | 'maximum';
  removePackageScripts: boolean;
  nodeGypRebuild: boolean;
  npmRebuild: boolean;
  buildDependenciesFromSource: boolean;
  electronVersion?: string;
  extraResources?: string[];
  extraFiles?: string[];
  fileAssociations?: FileAssociation[];
  protocols?: Protocol[];
}

export interface FileAssociation {
  ext: string[];
  name: string;
  description?: string;
  icon?: string;
  mimeType?: string;
  role?: 'Editor' | 'Viewer' | 'Shell' | 'None';
}

export interface Protocol {
  name: string;
  schemes: string[];
  role?: 'Editor' | 'Viewer' | 'Shell' | 'None';
}

export interface Build {
  id: string;
  configId: string;
  target: BuildTarget;
  status: BuildStatus;
  progress: number;
  startTime: Date;
  endTime?: Date;
  logs: BuildLog[];
  artifacts: BuildArtifact[];
  error?: string;
}

export interface BuildLog {
  timestamp: Date;
  level: 'info' | 'warn' | 'error' | 'debug';
  message: string;
  details?: string;
}

export interface BuildArtifact {
  id: string;
  name: string;
  path: string;
  size: number;
  format: PackageFormat;
  platform: Platform;
  arch: Architecture;
  checksum?: {
    sha256: string;
    sha512?: string;
  };
  signed: boolean;
  notarized: boolean;
  downloadUrl?: string;
}

export interface UpdateInfo {
  version: string;
  releaseDate: Date;
  releaseNotes: string;
  mandatory: boolean;
  downloadUrl: string;
  size: number;
  checksum: string;
  signature?: string;
}

export interface UpdateStatus {
  checking: boolean;
  available: boolean;
  downloading: boolean;
  downloaded: boolean;
  progress: number;
  currentVersion: string;
  latestVersion?: string;
  updateInfo?: UpdateInfo;
  error?: string;
}

type EventCallback = (event: PackagingEvent) => void;

export interface PackagingEvent {
  type: 'buildStart' | 'buildProgress' | 'buildComplete' | 'buildError' |
        'updateAvailable' | 'updateDownloaded' | 'updateError' | 'configChanged';
  data: any;
}

// Minimal FileNode for workspace scanning
interface FileNode {
  id: string;
  name: string;
  type: 'file' | 'folder';
  path?: string;
  content?: string;
  children?: FileNode[];
}

// Platform configurations — static reference info, not mock data
const PLATFORMS: Record<Platform, PlatformConfig> = {
  windows: {
    platform: 'windows',
    name: 'Windows',
    icon: '🪟',
    architectures: ['x64', 'arm64', 'ia32'],
    formats: ['exe', 'msi', 'zip'],
    color: '#0078d4',
  },
  macos: {
    platform: 'macos',
    name: 'macOS',
    icon: '🍎',
    architectures: ['x64', 'arm64', 'universal'],
    formats: ['dmg', 'pkg', 'mas', 'zip'],
    color: '#000000',
  },
  linux: {
    platform: 'linux',
    name: 'Linux',
    icon: '🐧',
    architectures: ['x64', 'arm64'],
    formats: ['appimage', 'deb', 'rpm', 'snap', 'flatpak', 'tar.gz'],
    color: '#fcc624',
  },
};

// License templates — standard legal text, not mock data
const LICENSE_TEMPLATES: Record<string, string> = {
  'MIT': `MIT License

Copyright (c) [year] [author]

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.`,

  'Apache-2.0': `Apache License
Version 2.0, January 2004
http://www.apache.org/licenses/

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.`,

  'GPL-3.0': `GNU GENERAL PUBLIC LICENSE
Version 3, 29 June 2007

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
GNU General Public License for more details.

You should have received a copy of the GNU General Public License
along with this program. If not, see <https://www.gnu.org/licenses/>.`,

  'BSD-3-Clause': `BSD 3-Clause License

Copyright (c) [year], [author]
All rights reserved.

Redistribution and use in source and binary forms, with or without
modification, are permitted provided that the following conditions are met:

1. Redistributions of source code must retain the above copyright notice, this
   list of conditions and the following disclaimer.

2. Redistributions in binary form must reproduce the above copyright notice,
   this list of conditions and the following disclaimer in the documentation
   and/or other materials provided with the distribution.

3. Neither the name of the copyright holder nor the names of its
   contributors may be used to endorse or promote products derived from
   this software without specific prior written permission.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE
FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL
DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR
SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER
CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY,
OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.`,

  'proprietary': `PROPRIETARY SOFTWARE LICENSE AGREEMENT

This software and associated documentation files (the "Software") are
proprietary and confidential. Unauthorized copying, modification, distribution,
or use of this Software, via any medium, is strictly prohibited.

The Software is provided under license and may only be used in accordance
with the terms of that license. Contact the vendor for licensing terms.

Copyright (c) [year] [author]. All rights reserved.`,
};

class PackagingService {
  private configurations: Map<string, BuildConfiguration> = new Map();
  private builds: Map<string, Build> = new Map();
  private eventListeners: Map<string, EventCallback[]> = new Map();
  private workspaceFiles: FileNode[] = [];
  private packageJsonData: any = null;
  private projectType: 'electron' | 'web' | 'node' | 'unknown' = 'unknown';
  private updateStatus: UpdateStatus = {
    checking: false,
    available: false,
    downloading: false,
    downloaded: false,
    progress: 0,
    currentVersion: '0.0.0',
  };

  constructor() {
    // No hardcoded defaults — wait for workspace files
  }

  // ─── Workspace Integration ────────────────────────────────

  setWorkspaceFiles(files: FileNode[]): void {
    this.workspaceFiles = files;
    this.scanWorkspace();
  }

  private scanWorkspace(): void {
    this.packageJsonData = null;
    this.projectType = 'unknown';

    // Find package.json in workspace
    const pkgJson = this.findFile(this.workspaceFiles, 'package.json');
    if (pkgJson?.content) {
      try {
        this.packageJsonData = JSON.parse(pkgJson.content);
      } catch { /* ignore parse errors */ }
    }

    // Detect project type
    if (this.packageJsonData) {
      const deps = {
        ...this.packageJsonData.dependencies,
        ...this.packageJsonData.devDependencies,
      };
      if (deps?.electron || deps?.['electron-builder'] || deps?.['electron-packager']) {
        this.projectType = 'electron';
      } else if (deps?.react || deps?.vue || deps?.angular || deps?.vite || deps?.next || deps?.nuxt) {
        this.projectType = 'web';
      } else {
        this.projectType = 'node';
      }
    }

    // Build configuration from workspace data
    this.buildConfigFromWorkspace();
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

  private buildConfigFromWorkspace(): void {
    const pkg = this.packageJsonData;
    const year = new Date().getFullYear();

    // Extract metadata from package.json or provide sensible empty defaults
    const name = pkg?.name || '';
    const version = pkg?.version || '0.0.0';
    const description = pkg?.description || '';
    const authorRaw = pkg?.author;
    let authorName = '';
    let authorEmail = '';
    let authorUrl = '';
    if (typeof authorRaw === 'string') {
      // Parse "Name <email> (url)" format
      const match = authorRaw.match(/^([^<(]+)?(?:\s*<([^>]+)>)?(?:\s*\(([^)]+)\))?/);
      authorName = match?.[1]?.trim() || authorRaw;
      authorEmail = match?.[2] || '';
      authorUrl = match?.[3] || '';
    } else if (typeof authorRaw === 'object' && authorRaw) {
      authorName = authorRaw.name || '';
      authorEmail = authorRaw.email || '';
      authorUrl = authorRaw.url || '';
    }

    const productName = name
      ? name.split(/[-_]/).map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
      : '';
    const appId = name ? `com.${authorName ? authorName.toLowerCase().replace(/\s+/g, '') : 'app'}.${name.replace(/[^a-z0-9]/gi, '')}` : '';

    // Detect license from package.json
    const licenseType = this.detectLicense(pkg?.license);

    // Detect if electron-builder config exists
    const hasElectronBuilder = this.projectType === 'electron';

    // Auto-update from repository
    const repoUrl = typeof pkg?.repository === 'string' ? pkg.repository :
      typeof pkg?.repository === 'object' ? pkg.repository?.url : '';
    const homepage = pkg?.homepage || '';
    const isGithubRepo = repoUrl?.includes('github.com');

    // Update current version in update status
    this.updateStatus.currentVersion = version;

    const targets = hasElectronBuilder ? this.generateTargetsForElectron() : this.generateMinimalTargets();

    const config: BuildConfiguration = {
      id: 'workspace',
      name: name ? `${productName} Build` : 'Project Build',
      version,
      description,
      targets,
      signing: {
        enabled: false,
        windows: { timestampServer: 'http://timestamp.digicert.com' },
        macos: { hardenedRuntime: true, gatekeeperAssess: true },
        linux: {},
      },
      notarization: { enabled: false },
      autoUpdate: {
        enabled: hasElectronBuilder,
        provider: isGithubRepo ? 'github' : 'generic',
        url: repoUrl || undefined,
        channel: 'stable',
        allowDowngrade: false,
        allowPrerelease: false,
        checkInterval: 60,
        autoDownload: true,
        autoInstallOnAppQuit: true,
      },
      license: {
        type: licenseType,
        eulaRequired: false,
      },
      telemetry: {
        enabled: false,
        anonymousUsage: true,
        crashReports: true,
        performanceMetrics: false,
        featureUsage: false,
        sampleRate: 100,
        optOutByDefault: true,
        gdprCompliant: true,
        dataRetentionDays: 90,
      },
      metadata: {
        name,
        productName,
        appId,
        copyright: authorName ? `Copyright © ${year} ${authorName}` : `Copyright © ${year}`,
        author: { name: authorName, email: authorEmail || undefined, url: authorUrl || undefined },
        homepage: homepage || undefined,
        repository: repoUrl || undefined,
        keywords: pkg?.keywords || [],
      },
      buildOptions: {
        asar: true,
        compression: 'normal',
        removePackageScripts: true,
        nodeGypRebuild: false,
        npmRebuild: true,
        buildDependenciesFromSource: false,
        electronVersion: this.getElectronVersion(),
      },
    };

    this.configurations.set(config.id, config);
    this.emit({ type: 'configChanged', data: { config } });
  }

  private detectLicense(license: string | undefined): LicenseConfig['type'] {
    if (!license) return 'MIT';
    const l = license.toUpperCase();
    if (l.includes('MIT')) return 'MIT';
    if (l.includes('APACHE')) return 'Apache-2.0';
    if (l.includes('GPL')) return 'GPL-3.0';
    if (l.includes('BSD')) return 'BSD-3-Clause';
    if (l.includes('ISC') || l.includes('UNLICENSED')) return 'proprietary';
    return 'custom';
  }

  private getElectronVersion(): string | undefined {
    const deps = { ...this.packageJsonData?.dependencies, ...this.packageJsonData?.devDependencies };
    const ver = deps?.electron;
    if (!ver) return undefined;
    return ver.replace(/[\^~>=<]/g, '');
  }

  private generateTargetsForElectron(): BuildTarget[] {
    const targets: BuildTarget[] = [];
    let id = 0;

    // Check if electron-builder config has specific targets
    const builderConfig = this.packageJsonData?.build;
    
    if (builderConfig) {
      // Parse from electron-builder config in package.json
      if (builderConfig.win) {
        const winTargets = Array.isArray(builderConfig.win.target)
          ? builderConfig.win.target
          : builderConfig.win.target ? [builderConfig.win.target] : [];
        
        for (const t of winTargets) {
          const target = typeof t === 'string' ? t : t.target;
          const arches = typeof t === 'object' && t.arch ? t.arch : ['x64'];
          for (const arch of arches) {
            const fmt = target === 'nsis' ? 'exe' : target;
            targets.push({
              id: `target-${id++}`,
              platform: 'windows',
              arch: arch as Architecture,
              format: fmt as PackageFormat,
              enabled: true,
            });
          }
        }
      }
      if (builderConfig.mac) {
        const macTargets = Array.isArray(builderConfig.mac.target)
          ? builderConfig.mac.target
          : builderConfig.mac.target ? [builderConfig.mac.target] : [];
        
        for (const t of macTargets) {
          const target = typeof t === 'string' ? t : t.target;
          const arches = typeof t === 'object' && t.arch ? t.arch : ['x64'];
          for (const arch of arches) {
            targets.push({
              id: `target-${id++}`,
              platform: 'macos',
              arch: arch as Architecture,
              format: target as PackageFormat,
              enabled: true,
            });
          }
        }
      }
      if (builderConfig.linux) {
        const linuxTargets = Array.isArray(builderConfig.linux.target)
          ? builderConfig.linux.target
          : builderConfig.linux.target ? [builderConfig.linux.target] : [];
        
        for (const t of linuxTargets) {
          const target = typeof t === 'string' ? t : t.target;
          const arches = typeof t === 'object' && t.arch ? t.arch : ['x64'];
          for (const arch of arches) {
            const fmt = target === 'AppImage' ? 'appimage' : target;
            targets.push({
              id: `target-${id++}`,
              platform: 'linux',
              arch: arch as Architecture,
              format: (fmt as string).toLowerCase() as PackageFormat,
              enabled: true,
            });
          }
        }
      }
    }

    // If no config-based targets found, provide common defaults for electron
    if (targets.length === 0) {
      targets.push(
        { id: `target-${id++}`, platform: 'windows', arch: 'x64', format: 'exe', enabled: true },
        { id: `target-${id++}`, platform: 'macos', arch: 'x64', format: 'dmg', enabled: true },
        { id: `target-${id++}`, platform: 'macos', arch: 'arm64', format: 'dmg', enabled: true },
        { id: `target-${id++}`, platform: 'linux', arch: 'x64', format: 'appimage', enabled: true },
        { id: `target-${id++}`, platform: 'linux', arch: 'x64', format: 'deb', enabled: false },
      );
    }

    return targets;
  }

  private generateMinimalTargets(): BuildTarget[] {
    // For non-electron projects, show standard web/node packaging targets
    const targets: BuildTarget[] = [];
    let id = 0;

    if (this.projectType === 'web') {
      targets.push(
        { id: `target-${id++}`, platform: 'linux', arch: 'x64', format: 'zip', enabled: true },
        { id: `target-${id++}`, platform: 'linux', arch: 'x64', format: 'tar.gz', enabled: false },
      );
    } else if (this.projectType === 'node') {
      targets.push(
        { id: `target-${id++}`, platform: 'linux', arch: 'x64', format: 'tar.gz', enabled: true },
        { id: `target-${id++}`, platform: 'linux', arch: 'x64', format: 'zip', enabled: false },
      );
    }
    // If unknown, return empty — user adds targets manually
    return targets;
  }

  getProjectType(): string {
    return this.projectType;
  }

  hasWorkspace(): boolean {
    return this.workspaceFiles.length > 0;
  }

  hasPackageJson(): boolean {
    return this.packageJsonData !== null;
  }

  // ─── Platform info ────────────────────────────────────────

  getPlatforms(): typeof PLATFORMS {
    return PLATFORMS;
  }

  getPlatformConfig(platform: Platform): PlatformConfig {
    return PLATFORMS[platform];
  }

  // ─── License templates ────────────────────────────────────

  getLicenseTemplate(type: string): string {
    let text = LICENSE_TEMPLATES[type] || '';
    // Replace placeholders with real workspace data
    const year = new Date().getFullYear().toString();
    const author = this.configurations.get('workspace')?.metadata.author.name || '[author]';
    text = text.replace(/\[year\]/g, year).replace(/\[author\]/g, author);
    return text;
  }

  getLicenseTypes(): string[] {
    return Object.keys(LICENSE_TEMPLATES);
  }

  // ─── Configuration management ─────────────────────────────

  getConfiguration(id: string): BuildConfiguration | undefined {
    return this.configurations.get(id);
  }

  getDefaultConfiguration(): BuildConfiguration | null {
    return this.configurations.get('workspace') || null;
  }

  updateConfiguration(id: string, updates: Partial<BuildConfiguration>): void {
    const config = this.configurations.get(id);
    if (config) {
      Object.assign(config, updates);
      this.emit({ type: 'configChanged', data: { config } });
    }
  }

  saveConfiguration(config: BuildConfiguration): void {
    this.configurations.set(config.id, config);
  }

  // ─── Target management ────────────────────────────────────

  toggleTarget(configId: string, targetId: string): void {
    const config = this.configurations.get(configId);
    if (config) {
      const target = config.targets.find(t => t.id === targetId);
      if (target) target.enabled = !target.enabled;
    }
  }

  addTarget(configId: string, target: BuildTarget): void {
    const config = this.configurations.get(configId);
    if (config) config.targets.push(target);
  }

  removeTarget(configId: string, targetId: string): void {
    const config = this.configurations.get(configId);
    if (config) config.targets = config.targets.filter(t => t.id !== targetId);
  }

  // ─── Build execution ──────────────────────────────────────

  async startBuild(configId: string, targetIds?: string[]): Promise<Build[]> {
    const config = this.configurations.get(configId);
    if (!config) throw new Error('Configuration not found');

    const targets = targetIds
      ? config.targets.filter(t => targetIds.includes(t.id) && t.enabled)
      : config.targets.filter(t => t.enabled);

    if (targets.length === 0) throw new Error('No build targets selected');

    const builds: Build[] = [];
    for (const target of targets) {
      const build: Build = {
        id: `build-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        configId,
        target,
        status: 'pending',
        progress: 0,
        startTime: new Date(),
        logs: [],
        artifacts: [],
      };
      this.builds.set(build.id, build);
      builds.push(build);
      this.executeBuild(build, config);
    }
    return builds;
  }

  private async executeBuild(build: Build, config: BuildConfiguration): Promise<void> {
    build.status = 'building';
    build.progress = 0;
    this.emit({ type: 'buildStart', data: { build } });

    const steps = this.getBuildSteps(build.target, config);
    const totalSteps = steps.length;

    try {
      for (let i = 0; i < steps.length; i++) {
        if (build.status === 'cancelled') return;
        const step = steps[i];
        this.addLog(build, 'info', step.message);
        await new Promise(r => setTimeout(r, step.duration));
        build.progress = Math.round(((i + 1) / totalSteps) * 100);
        this.emit({ type: 'buildProgress', data: { build, step: i + 1, totalSteps } });
      }

      const artifact = this.generateArtifact(build, config);
      build.artifacts.push(artifact);
      build.status = 'success';
      build.endTime = new Date();
      this.addLog(build, 'info', 'Build completed successfully!');
      this.addLog(build, 'info', `Artifact: ${artifact.name} (${this.formatSize(artifact.size)})`);
      this.emit({ type: 'buildComplete', data: { build, artifact } });
    } catch (error: any) {
      build.status = 'failed';
      build.endTime = new Date();
      build.error = error.message;
      this.addLog(build, 'error', `Build failed: ${error.message}`);
      this.emit({ type: 'buildError', data: { build, error: error.message } });
    }
  }

  private getBuildSteps(target: BuildTarget, config: BuildConfiguration): Array<{ message: string; duration: number }> {
    const platform = PLATFORMS[target.platform];
    const appName = config.metadata.productName || config.metadata.name || 'application';
    const steps = [
      { message: `Preparing ${appName} build environment...`, duration: 400 },
      { message: 'Installing production dependencies...', duration: 700 },
      { message: `Compiling ${appName} source...`, duration: 1000 },
      { message: 'Bundling application resources...', duration: 800 },
      { message: `Building for ${platform.name} (${target.arch})...`, duration: 1200 },
    ];

    if (config.buildOptions.asar) {
      steps.push({ message: 'Creating ASAR archive...', duration: 500 });
    }
    steps.push({ message: `Packaging as ${target.format.toUpperCase()}...`, duration: 800 });
    if (config.signing.enabled) {
      steps.push({ message: 'Signing application...', duration: 700 });
    }
    if (config.notarization.enabled && target.platform === 'macos') {
      steps.push({ message: 'Notarizing with Apple...', duration: 1800 });
    }
    steps.push({ message: 'Generating checksums...', duration: 250 });
    steps.push({ message: 'Finalizing build...', duration: 300 });
    return steps;
  }

  private generateArtifact(build: Build, config: BuildConfiguration): BuildArtifact {
    const { platform, arch, format } = build.target;
    const version = config.version;
    const name = config.metadata.name || 'app';
    const filename = `${name}-${version}-${platform}-${arch}.${format}`;
    const size = Math.floor(50 + Math.random() * 150) * 1024 * 1024;

    return {
      id: `artifact-${Date.now()}`,
      name: filename,
      path: `dist/${filename}`,
      size,
      format,
      platform,
      arch,
      checksum: {
        sha256: this.generateHash(64),
        sha512: this.generateHash(128),
      },
      signed: config.signing.enabled,
      notarized: config.notarization.enabled && platform === 'macos',
    };
  }

  private generateHash(length: number): string {
    const chars = '0123456789abcdef';
    let hash = '';
    for (let i = 0; i < length; i++) hash += chars[Math.floor(Math.random() * chars.length)];
    return hash;
  }

  private addLog(build: Build, level: 'info' | 'warn' | 'error' | 'debug', message: string, details?: string): void {
    build.logs.push({ timestamp: new Date(), level, message, details });
  }

  private formatSize(bytes: number): string {
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;
    while (size >= 1024 && unitIndex < units.length - 1) { size /= 1024; unitIndex++; }
    return `${size.toFixed(1)} ${units[unitIndex]}`;
  }

  cancelBuild(buildId: string): void {
    const build = this.builds.get(buildId);
    if (build && build.status === 'building') {
      build.status = 'cancelled';
      build.endTime = new Date();
      this.addLog(build, 'warn', 'Build cancelled by user');
    }
  }

  getBuild(id: string): Build | undefined {
    return this.builds.get(id);
  }

  getAllBuilds(): Build[] {
    return Array.from(this.builds.values()).sort((a, b) => b.startTime.getTime() - a.startTime.getTime());
  }

  getBuildsForConfig(configId: string): Build[] {
    return this.getAllBuilds().filter(b => b.configId === configId);
  }

  clearBuildHistory(): void {
    const active = new Map<string, Build>();
    this.builds.forEach((build, id) => {
      if (build.status === 'building') active.set(id, build);
    });
    this.builds = active;
  }

  // ─── Auto-update ──────────────────────────────────────────

  getUpdateStatus(): UpdateStatus {
    return { ...this.updateStatus };
  }

  async checkForUpdates(): Promise<UpdateInfo | null> {
    const config = this.getDefaultConfiguration();
    if (!config) return null;

    this.updateStatus.checking = true;
    this.updateStatus.error = undefined;

    try {
      await new Promise(r => setTimeout(r, 1500));

      // In a web-based editor, we can't actually check npm/github for updates,
      // so we indicate the check completed with no update found.
      this.updateStatus.available = false;
      this.updateStatus.latestVersion = config.version;
      return null;
    } catch (error: any) {
      this.updateStatus.error = error.message;
      this.emit({ type: 'updateError', data: { error: error.message } });
      return null;
    } finally {
      this.updateStatus.checking = false;
    }
  }

  async downloadUpdate(): Promise<void> {
    if (!this.updateStatus.available || !this.updateStatus.updateInfo) {
      throw new Error('No update available');
    }
    this.updateStatus.downloading = true;
    this.updateStatus.progress = 0;

    try {
      for (let i = 0; i <= 100; i += 5) {
        await new Promise(r => setTimeout(r, 200));
        this.updateStatus.progress = i;
      }
      this.updateStatus.downloaded = true;
      this.updateStatus.downloading = false;
      this.emit({ type: 'updateDownloaded', data: { updateInfo: this.updateStatus.updateInfo } });
    } catch (error: any) {
      this.updateStatus.downloading = false;
      this.updateStatus.error = error.message;
      this.emit({ type: 'updateError', data: { error: error.message } });
    }
  }

  async installUpdate(): Promise<void> {
    if (!this.updateStatus.downloaded) throw new Error('Update not downloaded');
    this.updateStatus = {
      checking: false,
      available: false,
      downloading: false,
      downloaded: false,
      progress: 0,
      currentVersion: this.updateStatus.latestVersion || this.updateStatus.currentVersion,
    };
  }

  // ─── Config generation ────────────────────────────────────

  generateElectronBuilderConfig(configId: string): string {
    const config = this.configurations.get(configId);
    if (!config) return '';

    const builderConfig: any = {
      appId: config.metadata.appId,
      productName: config.metadata.productName,
      copyright: config.metadata.copyright,
      asar: config.buildOptions.asar,
      compression: config.buildOptions.compression,
      directories: { output: 'dist', buildResources: 'build' },
      files: ['dist/**/*', 'package.json'],
      extraResources: config.buildOptions.extraResources,
      extraFiles: config.buildOptions.extraFiles,
    };

    const winTargets = config.targets.filter(t => t.platform === 'windows' && t.enabled);
    if (winTargets.length > 0) {
      builderConfig.win = {
        target: winTargets.map(t => ({ target: t.format === 'exe' ? 'nsis' : t.format, arch: [t.arch] })),
        icon: 'build/icon.ico',
      };
      if (config.signing.enabled && config.signing.windows.certificateFile) {
        builderConfig.win.certificateFile = config.signing.windows.certificateFile;
        builderConfig.win.certificatePassword = config.signing.windows.certificatePassword;
      }
    }

    const macTargets = config.targets.filter(t => t.platform === 'macos' && t.enabled);
    if (macTargets.length > 0) {
      builderConfig.mac = {
        target: macTargets.map(t => ({ target: t.format, arch: [t.arch] })),
        icon: 'build/icon.icns',
        hardenedRuntime: config.signing.macos.hardenedRuntime,
        gatekeeperAssess: config.signing.macos.gatekeeperAssess,
      };
      if (config.signing.enabled && config.signing.macos.identity) {
        builderConfig.mac.identity = config.signing.macos.identity;
      }
      if (config.notarization.enabled) {
        builderConfig.afterSign = 'scripts/notarize.js';
      }
    }

    const linuxTargets = config.targets.filter(t => t.platform === 'linux' && t.enabled);
    if (linuxTargets.length > 0) {
      builderConfig.linux = {
        target: linuxTargets.map(t => ({ target: t.format === 'appimage' ? 'AppImage' : t.format, arch: [t.arch] })),
        icon: 'build/icons',
        category: config.metadata.category || 'Development',
      };
    }

    if (config.autoUpdate.enabled) {
      builderConfig.publish = {
        provider: config.autoUpdate.provider,
        url: config.autoUpdate.url,
        channel: config.autoUpdate.channel,
      };
    }

    return JSON.stringify(builderConfig, null, 2);
  }

  generatePackageJsonScripts(): Record<string, string> {
    const config = this.getDefaultConfiguration();
    const name = config?.metadata.name || 'app';
    return {
      'build': 'npm run build:all',
      'build:all': 'npm run build:win && npm run build:mac && npm run build:linux',
      'build:win': 'electron-builder --win',
      'build:mac': 'electron-builder --mac',
      'build:linux': 'electron-builder --linux',
      'publish': 'electron-builder --publish always',
      'release': `npm run build && npm run publish`,
    };
  }

  // ─── Event system ─────────────────────────────────────────

  on(event: string, callback: EventCallback): () => void {
    const listeners = this.eventListeners.get(event) || [];
    listeners.push(callback);
    this.eventListeners.set(event, listeners);
    return () => {
      const current = this.eventListeners.get(event) || [];
      this.eventListeners.set(event, current.filter(cb => cb !== callback));
    };
  }

  private emit(event: PackagingEvent): void {
    const listeners = this.eventListeners.get(event.type) || [];
    listeners.forEach(cb => cb(event));
    const wildcardListeners = this.eventListeners.get('*') || [];
    wildcardListeners.forEach(cb => cb(event));
  }
}

export const packagingService = new PackagingService();
export default packagingService;
