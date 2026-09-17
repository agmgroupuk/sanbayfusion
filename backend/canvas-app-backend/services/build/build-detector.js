/**
 * BUILD DETECTOR
 * Auto-detect project type, framework, and build configuration
 * from package.json, file structure, and config files
 */

const FRAMEWORK_DETECTORS = [
  {
    name: 'Next.js',
    id: 'nextjs',
    detect: (files, pkg) =>
      pkg?.dependencies?.next || files.some(f => f.path === 'next.config.js' || f.path === 'next.config.mjs' || f.path === 'next.config.ts'),
    buildCommand: 'next build',
    devCommand: 'next dev',
    outputDir: '.next',
    packageManager: 'npm',
  },
  {
    name: 'Vite + React',
    id: 'vite-react',
    detect: (files, pkg) =>
      pkg?.devDependencies?.vite && (pkg?.dependencies?.react || pkg?.devDependencies?.react),
    buildCommand: 'vite build',
    devCommand: 'vite',
    outputDir: 'dist',
    packageManager: 'npm',
  },
  {
    name: 'Vite',
    id: 'vite',
    detect: (files, pkg) =>
      pkg?.devDependencies?.vite || files.some(f => f.path === 'vite.config.ts' || f.path === 'vite.config.js'),
    buildCommand: 'vite build',
    devCommand: 'vite',
    outputDir: 'dist',
    packageManager: 'npm',
  },
  {
    name: 'Vue 3',
    id: 'vue',
    detect: (files, pkg) =>
      pkg?.dependencies?.vue && parseInt(pkg.dependencies.vue.replace(/[^0-9]/g, '')) >= 3,
    buildCommand: 'vite build',
    devCommand: 'vite',
    outputDir: 'dist',
    packageManager: 'npm',
  },
  {
    name: 'SvelteKit',
    id: 'sveltekit',
    detect: (files, pkg) =>
      pkg?.devDependencies?.['@sveltejs/kit'] || pkg?.dependencies?.['@sveltejs/kit'],
    buildCommand: 'vite build',
    devCommand: 'vite dev',
    outputDir: 'build',
    packageManager: 'npm',
  },
  {
    name: 'Angular',
    id: 'angular',
    detect: (files, pkg) =>
      pkg?.dependencies?.['@angular/core'] || files.some(f => f.path === 'angular.json'),
    buildCommand: 'ng build',
    devCommand: 'ng serve',
    outputDir: 'dist',
    packageManager: 'npm',
  },
  {
    name: 'Express.js',
    id: 'express',
    detect: (files, pkg) =>
      pkg?.dependencies?.express,
    buildCommand: null, // No build step
    devCommand: 'node server.js',
    outputDir: null,
    packageManager: 'npm',
  },
  {
    name: 'Fastify',
    id: 'fastify',
    detect: (files, pkg) =>
      pkg?.dependencies?.fastify,
    buildCommand: null,
    devCommand: 'node server.js',
    outputDir: null,
    packageManager: 'npm',
  },
  {
    name: 'Create React App',
    id: 'cra',
    detect: (files, pkg) =>
      pkg?.dependencies?.['react-scripts'],
    buildCommand: 'react-scripts build',
    devCommand: 'react-scripts start',
    outputDir: 'build',
    packageManager: 'npm',
  },
  {
    name: 'Remix',
    id: 'remix',
    detect: (files, pkg) =>
      pkg?.dependencies?.['@remix-run/react'],
    buildCommand: 'remix build',
    devCommand: 'remix dev',
    outputDir: 'build',
    packageManager: 'npm',
  },
  {
    name: 'Astro',
    id: 'astro',
    detect: (files, pkg) =>
      pkg?.dependencies?.astro || pkg?.devDependencies?.astro,
    buildCommand: 'astro build',
    devCommand: 'astro dev',
    outputDir: 'dist',
    packageManager: 'npm',
  },
  {
    name: 'Static HTML',
    id: 'static',
    detect: (files) =>
      files.some(f => f.path === 'index.html'),
    buildCommand: null,
    devCommand: 'npx serve .',
    outputDir: '.',
    packageManager: 'npm',
  },
  {
    name: 'Node.js',
    id: 'node',
    detect: (files) =>
      files.some(f => f.path === 'package.json'),
    buildCommand: null,
    devCommand: 'node index.js',
    outputDir: null,
    packageManager: 'npm',
  },
];

class BuildDetector {
  /**
   * Detect framework from project files
   * Returns the first matching framework detector
   */
  detect(files) {
    // Try to parse package.json
    const pkgFile = files.find(f => f.path === 'package.json');
    let pkg = null;
    if (pkgFile?.content) {
      try {
        pkg = JSON.parse(pkgFile.content);
      } catch {
        pkg = null;
      }
    }

    // Detect package manager
    const packageManager = this.detectPackageManager(files);

    // Run detectors in order (most specific first)
    for (const detector of FRAMEWORK_DETECTORS) {
      try {
        if (detector.detect(files, pkg)) {
          return {
            ...detector,
            packageManager: packageManager || detector.packageManager,
            buildCommand: pkg?.scripts?.build
              ? 'npm run build'
              : detector.buildCommand
                ? `npx ${detector.buildCommand}`
                : null,
            devCommand: pkg?.scripts?.dev
              ? 'npm run dev'
              : pkg?.scripts?.start
                ? 'npm start'
                : detector.devCommand,
          };
        }
      } catch {
        continue;
      }
    }

    // Fallback
    return {
      name: 'Unknown',
      id: 'unknown',
      buildCommand: pkg?.scripts?.build ? 'npm run build' : null,
      devCommand: pkg?.scripts?.start ? 'npm start' : 'node index.js',
      outputDir: 'dist',
      packageManager: 'npm',
    };
  }

  /**
   * Detect package manager from lockfiles
   */
  detectPackageManager(files) {
    const filePaths = files.map(f => f.path);
    if (filePaths.includes('bun.lockb')) return 'bun';
    if (filePaths.includes('pnpm-lock.yaml')) return 'pnpm';
    if (filePaths.includes('yarn.lock')) return 'yarn';
    if (filePaths.includes('package-lock.json')) return 'npm';
    return 'npm';
  }

  /**
   * Get install command for the detected package manager
   */
  getInstallCommand(packageManager) {
    const commands = {
      npm: 'npm install',
      yarn: 'yarn install',
      pnpm: 'pnpm install',
      bun: 'bun install',
    };
    return commands[packageManager] || 'npm install';
  }

  /**
   * Detect if project has TypeScript
   */
  hasTypeScript(files) {
    return files.some(f =>
      f.path === 'tsconfig.json' ||
      f.path.endsWith('.ts') ||
      f.path.endsWith('.tsx')
    );
  }

  /**
   * Detect if project has tests
   */
  hasTests(files, pkg) {
    return (
      pkg?.scripts?.test ||
      files.some(f =>
        f.path.includes('__tests__') ||
        f.path.includes('.test.') ||
        f.path.includes('.spec.') ||
        f.path === 'jest.config.js' ||
        f.path === 'vitest.config.ts'
      )
    );
  }

  /**
   * Get all detector info (for API response)
   */
  listDetectors() {
    return FRAMEWORK_DETECTORS.map(d => ({
      name: d.name,
      id: d.id,
      buildCommand: d.buildCommand,
      devCommand: d.devCommand,
      outputDir: d.outputDir,
    }));
  }
}

export { BuildDetector, FRAMEWORK_DETECTORS };
export default new BuildDetector();
