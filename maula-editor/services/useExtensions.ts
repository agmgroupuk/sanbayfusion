import { memoryStorage } from './memoryStorage';
/**
 * useExtensions Hook
 * 
 * React hook for managing extensions in components.
 * Provides:
 * - Extension installation/uninstallation
 * - Realtime status updates
 * - Event subscription
 * - Notification handling
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { extensionHost, connectStoreToExtensions } from './extensionHost';
import { extensionEvents, extensionManager, builtInExtensions } from './extensions';
import { useStore } from '../store/useStore';

export interface ExtensionInfo {
  id: string;
  name: string;
  description: string;
  version: string;
  author: string;
  icon: string;
  category: string;
  downloads: number;
  rating: number;
  verified: boolean;
  tags: string[];
  permissions: string[];
  installed: boolean;
  enabled: boolean;
  status: 'inactive' | 'activating' | 'active' | 'error' | 'disposed';
  main?: string;
  changelog?: string;
  repository?: string;
  license?: string;
  lastUpdated?: string;
}

export interface Notification {
  id: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  extensionId?: string;
  timestamp: number;
}

/**
 * Curated marketplace extensions -- real-world VS Code extensions
 * with accurate metadata, descriptions, and version info.
 */
export const MARKETPLACE_EXTENSIONS: ExtensionInfo[] = [
  {
    id: 'prettier',
    name: 'Prettier - Code Formatter',
    description: 'Code formatter using Prettier. Automatically formats JavaScript, TypeScript, JSON, HTML, CSS, Markdown, YAML, and more. Enforces a consistent style by parsing your code and re-printing it with its own rules.',
    version: '11.0.0',
    author: 'Prettier',
    icon: '\u2728',
    category: 'Formatters',
    downloads: 48500000,
    rating: 4.8,
    verified: true,
    tags: ['formatter', 'beautify', 'code style', 'javascript', 'typescript'],
    permissions: ['editor:format', 'editor:edit'],
    installed: false,
    enabled: false,
    status: 'inactive',
    repository: 'https://github.com/prettier/prettier-vscode',
    license: 'MIT',
    lastUpdated: '2025-01-15'
  },
  {
    id: 'eslint',
    name: 'ESLint',
    description: 'Integrates ESLint into VS Code. Find and fix problems in your JavaScript/TypeScript code. Supports auto-fix on save, inline diagnostics, and workspace-level configuration.',
    version: '3.0.10',
    author: 'Microsoft',
    icon: '\ud83d\udd0d',
    category: 'Linters',
    downloads: 34000000,
    rating: 4.7,
    verified: true,
    tags: ['linter', 'javascript', 'typescript', 'diagnostics'],
    permissions: ['editor:diagnostics', 'editor:read', 'editor:edit'],
    installed: false,
    enabled: false,
    status: 'inactive',
    repository: 'https://github.com/microsoft/vscode-eslint',
    license: 'MIT',
    lastUpdated: '2025-02-01'
  },
  {
    id: 'git-lens',
    name: 'GitLens \u2014 Git supercharged',
    description: 'Supercharge Git within VS Code. Visualize code authorship via inline blame annotations, navigate and explore Git repositories, gain insights through rich visualizations and powerful comparison commands.',
    version: '16.0.2',
    author: 'GitKraken',
    icon: '\ud83d\udd00',
    category: 'SCM',
    downloads: 31000000,
    rating: 4.9,
    verified: true,
    tags: ['git', 'blame', 'history', 'diff', 'annotations'],
    permissions: ['git:read', 'editor:decorate'],
    installed: false,
    enabled: false,
    status: 'inactive',
    repository: 'https://github.com/gitkraken/vscode-gitlens',
    license: 'MIT',
    lastUpdated: '2025-01-28'
  },
  {
    id: 'auto-rename-tag',
    name: 'Auto Rename Tag',
    description: 'Automatically rename paired HTML/XML tags when you edit one. Works with JSX, TSX, Vue, Svelte, and other template syntaxes.',
    version: '0.1.10',
    author: 'Jun Han',
    icon: '\ud83c\udff7\ufe0f',
    category: 'Languages',
    downloads: 16500000,
    rating: 4.5,
    verified: true,
    tags: ['html', 'xml', 'jsx', 'tsx', 'vue'],
    permissions: ['editor:edit'],
    installed: false,
    enabled: false,
    status: 'inactive',
    repository: 'https://github.com/formulahendry/vscode-auto-rename-tag',
    license: 'MIT',
    lastUpdated: '2024-10-12'
  },
  {
    id: 'bracket-pair',
    name: 'Bracket Pair Colorization Toggler',
    description: 'Toggle the native bracket pair colorization feature in VS Code. Colorizes matching brackets with distinct colors for each nesting level for improved readability.',
    version: '2.0.3',
    author: 'CoenraadS',
    icon: '\ud83c\udf08',
    category: 'Visual',
    downloads: 13000000,
    rating: 4.6,
    verified: true,
    tags: ['brackets', 'colors', 'visual', 'readability'],
    permissions: ['editor:decorate'],
    installed: false,
    enabled: false,
    status: 'inactive',
    license: 'MIT',
    lastUpdated: '2024-08-20'
  },
  {
    id: 'live-server',
    name: 'Live Server',
    description: 'Launch a development local server with live reload for static and dynamic pages. Features hot-reload, custom browser, HTTPS, CORS, and multi-root workspace support.',
    version: '5.7.9',
    author: 'Ritwick Dey',
    icon: '\ud83d\udce1',
    category: 'Tools',
    downloads: 45000000,
    rating: 4.7,
    verified: true,
    tags: ['server', 'live-reload', 'preview', 'web', 'http'],
    permissions: ['terminal:execute', 'network:serve'],
    installed: false,
    enabled: false,
    status: 'inactive',
    repository: 'https://github.com/ritwickdey/vscode-live-server',
    license: 'MIT',
    lastUpdated: '2024-09-15'
  },
  {
    id: 'path-intellisense',
    name: 'Path Intellisense',
    description: 'Autocompletes filenames in import/require statements. Supports relative and absolute paths, custom mappings, and all file types.',
    version: '2.9.0',
    author: 'Christian Kohler',
    icon: '\ud83d\udcc1',
    category: 'Languages',
    downloads: 12500000,
    rating: 4.4,
    verified: true,
    tags: ['autocomplete', 'path', 'import', 'intellisense'],
    permissions: ['files:list', 'editor:complete'],
    installed: false,
    enabled: false,
    status: 'inactive',
    repository: 'https://github.com/ChristianKohler/PathIntellisense',
    license: 'MIT',
    lastUpdated: '2024-11-20'
  },
  {
    id: 'github-copilot',
    name: 'GitHub Copilot',
    description: 'Your AI pair programmer. Provides autocomplete-style suggestions from an AI model as you code. Supports all major languages with context-aware completions, chat, and code explanations.',
    version: '1.250.0',
    author: 'GitHub',
    icon: '\ud83e\udd16',
    category: 'AI',
    downloads: 22000000,
    rating: 4.8,
    verified: true,
    tags: ['ai', 'copilot', 'autocomplete', 'machine-learning', 'code-generation'],
    permissions: ['editor:complete', 'editor:edit', 'network:api'],
    installed: false,
    enabled: false,
    status: 'inactive',
    repository: 'https://github.com/features/copilot',
    license: 'Proprietary',
    lastUpdated: '2025-02-10'
  },
  {
    id: 'docker',
    name: 'Docker',
    description: 'Build, manage, and deploy containerized applications from VS Code. Includes Dockerfile and docker-compose.yml editing, container management, image exploration, and registry integration.',
    version: '1.29.0',
    author: 'Microsoft',
    icon: '\ud83d\udc33',
    category: 'Tools',
    downloads: 27000000,
    rating: 4.6,
    verified: true,
    tags: ['docker', 'containers', 'devops', 'compose', 'kubernetes'],
    permissions: ['terminal:execute', 'files:read'],
    installed: false,
    enabled: false,
    status: 'inactive',
    repository: 'https://github.com/microsoft/vscode-docker',
    license: 'MIT',
    lastUpdated: '2025-01-22'
  },
  {
    id: 'python',
    name: 'Python',
    description: 'Rich support for Python. IntelliSense (Pylance), linting, debugging, code navigation, formatting, refactoring, variable explorer, test explorer, and more.',
    version: '2025.2.0',
    author: 'Microsoft',
    icon: '\ud83d\udc0d',
    category: 'Languages',
    downloads: 110000000,
    rating: 4.7,
    verified: true,
    tags: ['python', 'intellisense', 'debug', 'linting', 'jupyter'],
    permissions: ['editor:complete', 'terminal:execute', 'debug:launch'],
    installed: false,
    enabled: false,
    status: 'inactive',
    repository: 'https://github.com/microsoft/vscode-python',
    license: 'MIT',
    lastUpdated: '2025-02-08'
  },
  {
    id: 'tailwind',
    name: 'Tailwind CSS IntelliSense',
    description: 'Intelligent Tailwind CSS tooling. Autocomplete, syntax highlighting, linting, class sorting, and hover previews for Tailwind CSS v3 and v4.',
    version: '0.14.0',
    author: 'Tailwind Labs',
    icon: '\ud83d\udca8',
    category: 'Languages',
    downloads: 12000000,
    rating: 4.8,
    verified: true,
    tags: ['tailwind', 'css', 'autocomplete', 'intellisense', 'design'],
    permissions: ['editor:complete', 'editor:hover'],
    installed: false,
    enabled: false,
    status: 'inactive',
    repository: 'https://github.com/tailwindlabs/tailwindcss-intellisense',
    license: 'MIT',
    lastUpdated: '2025-01-30'
  },
  {
    id: 'import-cost',
    name: 'Import Cost',
    description: 'Display the size of imported packages inline in the editor. Helps you understand the cost of each dependency and optimize bundle size.',
    version: '3.3.0',
    author: 'Wix',
    icon: '\ud83d\udce6',
    category: 'Tools',
    downloads: 4500000,
    rating: 4.3,
    verified: true,
    tags: ['import', 'bundle', 'size', 'performance', 'webpack'],
    permissions: ['editor:decorate'],
    installed: false,
    enabled: false,
    status: 'inactive',
    repository: 'https://github.com/AriPerkkio/import-cost',
    license: 'MIT',
    lastUpdated: '2024-07-10'
  },
  {
    id: 'error-lens',
    name: 'Error Lens',
    description: 'Improve highlighting of errors, warnings, and other diagnostics. Shows problems inline with the code, right at the line where they occur.',
    version: '3.20.0',
    author: 'Alexander',
    icon: '\ud83d\udd34',
    category: 'Linters',
    downloads: 7500000,
    rating: 4.7,
    verified: true,
    tags: ['errors', 'diagnostics', 'inline', 'warnings', 'problems'],
    permissions: ['editor:diagnostics', 'editor:decorate'],
    installed: false,
    enabled: false,
    status: 'inactive',
    repository: 'https://github.com/usernamehw/vscode-error-lens',
    license: 'MIT',
    lastUpdated: '2025-01-05'
  },
  {
    id: 'todo-tree',
    name: 'Todo Tree',
    description: 'Show TODO, FIXME, HACK, and other comment tags in a tree view. Quickly navigate through all your annotation comments across the entire workspace.',
    version: '0.0.230',
    author: 'Gruntfuggly',
    icon: '\ud83d\udccb',
    category: 'Tools',
    downloads: 7000000,
    rating: 4.8,
    verified: true,
    tags: ['todo', 'comments', 'tasks', 'annotations', 'navigation'],
    permissions: ['editor:read', 'files:search'],
    installed: false,
    enabled: false,
    status: 'inactive',
    repository: 'https://github.com/Gruntfuggly/todo-tree',
    license: 'MIT',
    lastUpdated: '2024-12-18'
  },
  {
    id: 'bookmarks',
    name: 'Bookmarks',
    description: 'Mark lines and jump to them. Navigate your code with ease using labeled bookmarks, persistent across sessions, with sidebar navigation and keyboard shortcuts.',
    version: '13.5.0',
    author: 'Alessandro Fragnani',
    icon: '\ud83d\udd16',
    category: 'Tools',
    downloads: 5200000,
    rating: 4.6,
    verified: true,
    tags: ['bookmarks', 'navigation', 'marks', 'productivity'],
    permissions: ['editor:decorate', 'storage:write'],
    installed: false,
    enabled: false,
    status: 'inactive',
    repository: 'https://github.com/alefragnani/vscode-bookmarks',
    license: 'MIT',
    lastUpdated: '2024-11-02'
  },
  {
    id: 'thunder-client',
    name: 'Thunder Client',
    description: 'Lightweight REST API client for VS Code. Send HTTP requests, test APIs, manage collections, and view responses with a clean GUI. No external dependencies required.',
    version: '2.28.0',
    author: 'Thunder Client',
    icon: '\u26a1',
    category: 'API',
    downloads: 9800000,
    rating: 4.9,
    verified: true,
    tags: ['rest', 'api', 'http', 'client', 'graphql'],
    permissions: ['network:api', 'storage:write'],
    installed: false,
    enabled: false,
    status: 'inactive',
    repository: 'https://github.com/rangav/thunder-client-support',
    license: 'Freemium',
    lastUpdated: '2025-02-05'
  },
  {
    id: 'material-icon-theme',
    name: 'Material Icon Theme',
    description: 'Material Design icons for Visual Studio Code. Provides file and folder icons based on Material Design with extensive customization options.',
    version: '5.16.0',
    author: 'Philipp Kief',
    icon: '\ud83c\udfa8',
    category: 'Themes',
    downloads: 22000000,
    rating: 4.9,
    verified: true,
    tags: ['icons', 'theme', 'material', 'design', 'files'],
    permissions: ['ui:icons'],
    installed: false,
    enabled: false,
    status: 'inactive',
    repository: 'https://github.com/PKief/vscode-material-icon-theme',
    license: 'MIT',
    lastUpdated: '2025-01-12'
  },
  {
    id: 'rest-client',
    name: 'REST Client',
    description: 'Send HTTP requests and view responses directly in VS Code. Supports cURL, RFC 2616, environment variables, GraphQL, and authentication methods.',
    version: '0.26.0',
    author: 'Huachao Mao',
    icon: '\ud83c\udf10',
    category: 'API',
    downloads: 6800000,
    rating: 4.5,
    verified: true,
    tags: ['rest', 'http', 'api', 'curl', 'graphql'],
    permissions: ['network:api', 'editor:read'],
    installed: false,
    enabled: false,
    status: 'inactive',
    repository: 'https://github.com/Huachao/vscode-restclient',
    license: 'MIT',
    lastUpdated: '2024-09-28'
  },
  {
    id: 'code-runner',
    name: 'Code Runner',
    description: 'Run code snippets or files in 50+ languages: C, C++, Java, Python, JavaScript, TypeScript, Go, Rust, PHP, Ruby, Swift, Kotlin, and more.',
    version: '0.12.2',
    author: 'Jun Han',
    icon: '\u25b6\ufe0f',
    category: 'Tools',
    downloads: 18000000,
    rating: 4.6,
    verified: true,
    tags: ['runner', 'execute', 'multi-language', 'script'],
    permissions: ['terminal:execute', 'editor:read'],
    installed: false,
    enabled: false,
    status: 'inactive',
    repository: 'https://github.com/formulahendry/vscode-code-runner',
    license: 'MIT',
    lastUpdated: '2024-11-15'
  },
  {
    id: 'remote-ssh',
    name: 'Remote - SSH',
    description: "Open any folder on a remote machine using SSH and take advantage of VS Code's full feature set. Edit, debug, and run code remotely.",
    version: '0.116.0',
    author: 'Microsoft',
    icon: '\ud83d\udd17',
    category: 'Tools',
    downloads: 19000000,
    rating: 4.5,
    verified: true,
    tags: ['remote', 'ssh', 'development', 'cloud', 'server'],
    permissions: ['terminal:execute', 'network:ssh'],
    installed: false,
    enabled: false,
    status: 'inactive',
    repository: 'https://github.com/microsoft/vscode-remote-release',
    license: 'Proprietary',
    lastUpdated: '2025-02-01'
  }
];

export function useExtensions() {
  const [extensions, setExtensions] = useState<ExtensionInfo[]>(MARKETPLACE_EXTENSIONS);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isInitialized, setIsInitialized] = useState(false);
  const notificationIdRef = useRef(0);

  // Initialize extension system
  useEffect(() => {
    if (isInitialized) return;

    // Connect store to extension host
    connectStoreToExtensions(useStore);

    // Load installed extensions from storage
    const installed = memoryStorage.getItem('installedExtensions');
    if (installed) {
      try {
        const installedIds = JSON.parse(installed) as string[];
        setExtensions(prev => prev.map(ext => ({
          ...ext,
          installed: installedIds.includes(ext.id),
          enabled: installedIds.includes(ext.id)
        })));

        // Auto-activate installed extensions
        installedIds.forEach(id => {
          const ext = MARKETPLACE_EXTENSIONS.find(e => e.id === id);
          if (ext) {
            extensionHost.activateExtension({
              id: ext.id,
              name: ext.name,
              version: ext.version,
              main: ext.main || '',
              permissions: ext.permissions
            });
          }
        });
      } catch {
        memoryStorage.removeItem('installedExtensions');
      }
    }

    // Listen for extension events
    extensionEvents.on('extension:activated', ({ extensionId }: any) => {
      setExtensions(prev => prev.map(ext =>
        ext.id === extensionId ? { ...ext, status: 'active' as const } : ext
      ));
    });

    extensionEvents.on('extension:deactivated', ({ extensionId }: any) => {
      setExtensions(prev => prev.map(ext =>
        ext.id === extensionId ? { ...ext, status: 'inactive' as const } : ext
      ));
    });

    extensionEvents.on('extension:error', ({ extensionId, error }: any) => {
      setExtensions(prev => prev.map(ext =>
        ext.id === extensionId ? { ...ext, status: 'error' as const } : ext
      ));
      addNotification('Extension ' + extensionId + ' error: ' + error, 'error', extensionId);
    });

    extensionEvents.on('ui:notification', (message: string, type: string) => {
      addNotification(message, type as any);
    });

    setIsInitialized(true);

    return () => {
      extensionEvents.off('extension:activated', () => {});
      extensionEvents.off('extension:deactivated', () => {});
      extensionEvents.off('extension:error', () => {});
      extensionEvents.off('ui:notification', () => {});
    };
  }, [isInitialized]);

  // Add notification
  const addNotification = useCallback((message: string, type: Notification['type'] = 'info', extensionId?: string) => {
    const notification: Notification = {
      id: 'notif-' + (++notificationIdRef.current),
      message,
      type,
      extensionId,
      timestamp: Date.now()
    };
    setNotifications(prev => [...prev, notification]);

    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== notification.id));
    }, 5000);
  }, []);

  // Install extension -- accepts either a string ID or a full ExtensionInfo object
  const installExtension = useCallback(async (extensionOrId: string | ExtensionInfo) => {
    const extensionId = typeof extensionOrId === 'string' ? extensionOrId : extensionOrId.id;
    const ext = extensions.find(e => e.id === extensionId);
    if (!ext) return false;

    setExtensions(prev => prev.map(e =>
      e.id === extensionId ? { ...e, status: 'activating' as const } : e
    ));

    try {
      await extensionHost.activateExtension({
        id: ext.id,
        name: ext.name,
        version: ext.version,
        main: ext.main || '',
        permissions: ext.permissions
      });

      setExtensions(prev => prev.map(e =>
        e.id === extensionId ? { ...e, installed: true, enabled: true, status: 'active' as const } : e
      ));

      const installed = extensions.filter(e => e.installed || e.id === extensionId).map(e => e.id);
      memoryStorage.setItem('installedExtensions', JSON.stringify(installed));

      addNotification(ext.name + ' installed successfully', 'success', extensionId);
      return true;
    } catch (error: any) {
      setExtensions(prev => prev.map(e =>
        e.id === extensionId ? { ...e, status: 'error' as const } : e
      ));
      addNotification('Failed to install ' + ext.name + ': ' + error.message, 'error', extensionId);
      return false;
    }
  }, [extensions, addNotification]);

  // Uninstall extension
  const uninstallExtension = useCallback(async (extensionId: string) => {
    const ext = extensions.find(e => e.id === extensionId);
    if (!ext) return false;

    try {
      await extensionHost.deactivateExtension(extensionId);

      setExtensions(prev => prev.map(e =>
        e.id === extensionId ? { ...e, installed: false, enabled: false, status: 'inactive' as const } : e
      ));

      const installed = extensions.filter(e => e.installed && e.id !== extensionId).map(e => e.id);
      memoryStorage.setItem('installedExtensions', JSON.stringify(installed));

      addNotification(ext.name + ' uninstalled', 'info', extensionId);
      return true;
    } catch (error: any) {
      addNotification('Failed to uninstall ' + ext.name + ': ' + error.message, 'error', extensionId);
      return false;
    }
  }, [extensions, addNotification]);

  // Toggle extension enabled/disabled
  const toggleExtension = useCallback(async (extensionId: string) => {
    const ext = extensions.find(e => e.id === extensionId);
    if (!ext || !ext.installed) return;

    if (ext.enabled) {
      await extensionHost.deactivateExtension(extensionId);
      setExtensions(prev => prev.map(e =>
        e.id === extensionId ? { ...e, enabled: false, status: 'inactive' as const } : e
      ));
    } else {
      await extensionHost.activateExtension({
        id: ext.id,
        name: ext.name,
        version: ext.version,
        main: ext.main || '',
        permissions: ext.permissions
      });
      setExtensions(prev => prev.map(e =>
        e.id === extensionId ? { ...e, enabled: true, status: 'active' as const } : e
      ));
    }
  }, [extensions]);

  // Reload extension
  const reloadExtension = useCallback(async (extensionId: string) => {
    const ext = extensions.find(e => e.id === extensionId);
    if (!ext) return;

    addNotification('Reloading ' + ext.name + '...', 'info', extensionId);

    const success = await extensionHost.reloadExtension({
      id: ext.id,
      name: ext.name,
      version: ext.version,
      main: ext.main || '',
      permissions: ext.permissions
    });

    if (success) {
      addNotification(ext.name + ' reloaded', 'success', extensionId);
    } else {
      addNotification('Failed to reload ' + ext.name, 'error', extensionId);
    }
  }, [extensions, addNotification]);

  // Execute extension command
  const executeCommand = useCallback((extensionId: string, commandId: string, args?: any) => {
    extensionHost.executeCommand(extensionId, commandId, args);
  }, []);

  // Dismiss notification
  const dismissNotification = useCallback((notificationId: string) => {
    setNotifications(prev => prev.filter(n => n.id !== notificationId));
  }, []);

  // Clear all notifications
  const clearNotifications = useCallback(() => {
    setNotifications([]);
  }, []);

  const installedExtensions = extensions.filter(e => e.installed);
  const activeExtensions = extensions.filter(e => e.status === 'active');

  return {
    extensions,
    installedExtensions,
    activeExtensions,
    notifications,
    installExtension,
    uninstallExtension,
    toggleExtension,
    reloadExtension,
    executeCommand,
    addNotification,
    dismissNotification,
    clearNotifications
  };
}

export default useExtensions;
