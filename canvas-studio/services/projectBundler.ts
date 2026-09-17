/**
 * Canvas Studio Project Bundler
 * 
 * Transforms canvas projects into deployable multi-page project structures.
 * Handles HTML extraction, CSS/JS separation, multi-page routing,
 * and generates proper package.json, config files for various frameworks.
 */

import {
  ProjectPage,
  ProjectAsset,
  MultiPageProject,
  ProjectBuildResult,
  BuildError,
} from '../types';

// ==================== HTML PARSING UTILITIES ====================

/**
 * Extract pages from a multi-page HTML structure
 * Supports: multiple HTML files, or single HTML with section-based pages
 */
export function extractPages(files: Record<string, string>): ProjectPage[] {
  const pages: ProjectPage[] = [];
  
  for (const [path, content] of Object.entries(files)) {
    if (path.endsWith('.html') || path.endsWith('.htm')) {
      const title = extractTitle(content) || pathToTitle(path);
      const pagePath = htmlFileToRoute(path);
      
      pages.push({
        path: pagePath,
        title,
        fileName: path.startsWith('/') ? path.slice(1) : path,
        content,
      });
    }
  }
  
  // If no HTML files found, create default index
  if (pages.length === 0) {
    pages.push({
      path: '/',
      title: 'Home',
      fileName: 'index.html',
      content: files['/index.html'] || files[Object.keys(files)[0]] || '',
    });
  }
  
  return pages;
}

/**
 * Extract CSS and JS assets from files
 */
export function extractAssets(files: Record<string, string>): ProjectAsset[] {
  const assets: ProjectAsset[] = [];
  
  for (const [path, content] of Object.entries(files)) {
    const cleanPath = path.startsWith('/') ? path.slice(1) : path;
    
    if (path.endsWith('.css') || path.endsWith('.scss') || path.endsWith('.sass')) {
      assets.push({ path: cleanPath, content, type: 'css' });
    } else if (path.endsWith('.js') || path.endsWith('.jsx') || path.endsWith('.ts') || path.endsWith('.tsx')) {
      assets.push({ path: cleanPath, content, type: 'js' });
    } else if (path.endsWith('.json') && !path.includes('package.json')) {
      assets.push({ path: cleanPath, content, type: 'json' });
    } else if (!path.endsWith('.html') && !path.endsWith('.htm')) {
      assets.push({ path: cleanPath, content, type: 'other' });
    }
  }
  
  return assets;
}

/**
 * Extract the <title> from HTML content
 */
function extractTitle(html: string): string | null {
  const match = html.match(/<title[^>]*>(.*?)<\/title>/i);
  return match ? match[1].trim() : null;
}

/**
 * Convert file path to a readable title
 */
function pathToTitle(path: string): string {
  const name = path.split('/').pop()?.replace(/\.(html|htm)$/i, '') || 'Page';
  return name.charAt(0).toUpperCase() + name.slice(1).replace(/[-_]/g, ' ');
}

/**
 * Convert HTML file path to a route path
 */
function htmlFileToRoute(filePath: string): string {
  let route = filePath
    .replace(/^\//, '')
    .replace(/\.(html|htm)$/i, '')
    .replace(/index$/, '');
  
  if (!route || route === '') return '/';
  return '/' + route;
}

// ==================== PROJECT BUNDLING ====================

/**
 * Bundle project files into a deployable multi-page project
 */
export function bundleProject(
  files: Record<string, string>,
  projectName: string,
  framework: MultiPageProject['framework'] = 'static',
): MultiPageProject {
  const pages = extractPages(files);
  const assets = extractAssets(files);
  
  const project: MultiPageProject = {
    name: projectName,
    framework,
    pages,
    assets,
    entryFile: 'index.html',
  };
  
  // Generate package.json based on framework
  project.packageJson = generatePackageJson(projectName, framework, files);
  
  // Generate config files based on framework
  project.configFiles = generateConfigFiles(framework, pages);
  
  return project;
}

/**
 * Convert a bundled project back to a flat file map for deployment
 */
export function projectToFiles(project: MultiPageProject): Record<string, string> {
  const files: Record<string, string> = {};
  
  // Add HTML pages
  for (const page of project.pages) {
    files[page.fileName] = page.content;
  }
  
  // Add assets
  for (const asset of project.assets) {
    files[asset.path] = asset.content;
  }
  
  // Add package.json
  if (project.packageJson) {
    files['package.json'] = JSON.stringify(project.packageJson, null, 2);
  }
  
  // Add config files
  if (project.configFiles) {
    for (const [path, content] of Object.entries(project.configFiles)) {
      files[path] = content;
    }
  }
  
  return files;
}

// ==================== MULTI-PAGE NAVIGATION ====================

/**
 * Inject navigation between pages into HTML files
 */
export function injectNavigation(
  pages: ProjectPage[],
  activePagePath: string,
): string {
  if (pages.length <= 1) return '';
  
  const links = pages.map(p => {
    const isActive = p.path === activePagePath;
    return `<a href="${p.fileName}" class="nav-link ${isActive ? 'active' : ''}" style="color: ${isActive ? '#06b6d4' : '#9ca3af'}; text-decoration: none; padding: 8px 16px; font-size: 14px; transition: color 0.2s;">${p.title}</a>`;
  }).join('\n          ');
  
  return `
    <nav style="display: flex; align-items: center; gap: 4px; padding: 12px 24px; background: #111; border-bottom: 1px solid #1f2937;">
      <span style="color: #06b6d4; font-weight: bold; margin-right: 16px; font-size: 14px;">📄 Pages</span>
      ${links}
    </nav>`;
}

/**
 * Add navigation bar to all pages in the project
 */
export function addNavigationToPages(pages: ProjectPage[]): ProjectPage[] {
  if (pages.length <= 1) return pages;
  
  return pages.map(page => {
    const nav = injectNavigation(pages, page.path);
    let content = page.content;
    
    // Insert navigation after <body> tag
    const bodyMatch = content.match(/<body[^>]*>/i);
    if (bodyMatch) {
      const insertPos = content.indexOf(bodyMatch[0]) + bodyMatch[0].length;
      content = content.slice(0, insertPos) + '\n' + nav + '\n' + content.slice(insertPos);
    }
    
    return { ...page, content };
  });
}

// ==================== PACKAGE.JSON GENERATION ====================

function generatePackageJson(
  name: string,
  framework: MultiPageProject['framework'],
  files: Record<string, string>,
): Record<string, unknown> {
  const safeName = name.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-');
  
  const base: Record<string, unknown> = {
    name: safeName,
    version: '1.0.0',
    description: `${name} - Built with sanbayfusion.com Canvas Studio`,
    private: true,
  };
  
  switch (framework) {
    case 'static':
      base.scripts = { start: 'npx serve .' };
      break;
      
    case 'vite':
      base.scripts = {
        dev: 'vite',
        build: 'vite build',
        preview: 'vite preview',
      };
      base.devDependencies = {
        vite: '^5.4.0',
      };
      // Check if TypeScript is used
      if (Object.keys(files).some(f => f.endsWith('.ts') || f.endsWith('.tsx'))) {
        (base.devDependencies as Record<string, string>).typescript = '~5.6.0';
      }
      break;
      
    case 'react':
      base.scripts = {
        dev: 'vite',
        build: 'vite build',
        preview: 'vite preview',
      };
      base.dependencies = {
        react: '^18.3.0',
        'react-dom': '^18.3.0',
      };
      base.devDependencies = {
        vite: '^5.4.0',
        '@vitejs/plugin-react': '^4.3.0',
      };
      break;
      
    case 'vue':
      base.scripts = {
        dev: 'vite',
        build: 'vite build',
        preview: 'vite preview',
      };
      base.dependencies = {
        vue: '^3.5.0',
      };
      base.devDependencies = {
        vite: '^5.4.0',
        '@vitejs/plugin-vue': '^5.1.0',
      };
      break;

    case 'nextjs':
      base.scripts = {
        dev: 'next dev',
        build: 'next build',
        start: 'next start',
      };
      base.dependencies = {
        next: '^14.2.0',
        react: '^18.3.0',
        'react-dom': '^18.3.0',
      };
      break;

    case 'astro':
      base.scripts = {
        dev: 'astro dev',
        build: 'astro build',
        preview: 'astro preview',
      };
      base.dependencies = {
        astro: '^4.0.0',
      };
      break;
  }
  
  return base;
}

// ==================== CONFIG FILE GENERATION ====================

function generateConfigFiles(
  framework: MultiPageProject['framework'],
  pages: ProjectPage[],
): Record<string, string> {
  const configs: Record<string, string> = {};
  
  switch (framework) {
    case 'vite': {
      // Multi-page Vite config
      const inputs = pages.map(p => `    '${p.path === '/' ? 'main' : p.path.slice(1)}': '${p.fileName}'`).join(',\n');
      configs['vite.config.js'] = `
import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
${inputs}
      }
    }
  }
});
`.trim();
      break;
    }
      
    case 'react': {
      configs['vite.config.js'] = `
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
});
`.trim();
      break;
    }
  }
  
  return configs;
}

// ==================== BUILD VALIDATION ====================

/**
 * Validate project files for common build errors
 */
export function validateProject(files: Record<string, string>): BuildError[] {
  const errors: BuildError[] = [];
  
  for (const [path, content] of Object.entries(files)) {
    // Check for malformed HTML
    if (path.endsWith('.html')) {
      if (!content.includes('<html') && !content.includes('<!DOCTYPE') && content.length > 50) {
        errors.push({
          file: path,
          message: 'HTML file missing <!DOCTYPE html> or <html> tag',
          severity: 'warning',
          fixable: true,
          suggestedFix: `Add <!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"></head><body>${content}</body></html>`,
        });
      }
      
      // Check for unclosed tags
      const openTags = (content.match(/<[a-z][a-z0-9]*[^>]*(?<!\/)\s*>/gi) || []).length;
      const closeTags = (content.match(/<\/[a-z][a-z0-9]*>/gi) || []).length;
      if (Math.abs(openTags - closeTags) > 5) {
        errors.push({
          file: path,
          message: `Potentially unclosed HTML tags (${openTags} open, ${closeTags} close)`,
          severity: 'warning',
          fixable: false,
        });
      }
    }
    
    // Check for broken imports in JS
    if (path.endsWith('.js') || path.endsWith('.ts')) {
      const imports = content.match(/import\s+.*?\s+from\s+['"](.+?)['"]/g) || [];
      for (const imp of imports) {
        const moduleMatch = imp.match(/from\s+['"](.+?)['"]/);
        if (moduleMatch) {
          const modulePath = moduleMatch[1];
          // Check relative imports
          if (modulePath.startsWith('./') || modulePath.startsWith('../')) {
            const resolvedPath = resolvePath(path, modulePath);
            if (!files[resolvedPath] && !files[resolvedPath + '.js'] && !files[resolvedPath + '.ts']) {
              errors.push({
                file: path,
                message: `Import not found: ${modulePath}`,
                severity: 'error',
                fixable: false,
              });
            }
          }
        }
      }
    }
  }
  
  return errors;
}

function resolvePath(from: string, relativePath: string): string {
  const fromDir = from.split('/').slice(0, -1).join('/');
  const parts = [...fromDir.split('/'), ...relativePath.split('/')];
  const resolved: string[] = [];
  
  for (const part of parts) {
    if (part === '.' || part === '') continue;
    if (part === '..') {
      resolved.pop();
    } else {
      resolved.push(part);
    }
  }
  
  return '/' + resolved.join('/');
}

// ==================== FRAMEWORK DETECTION ====================

/**
 * Auto-detect the framework being used based on file contents
 */
export function detectFramework(files: Record<string, string>): MultiPageProject['framework'] {
  const fileNames = Object.keys(files);
  const allContent = Object.values(files).join('\n');
  
  // Check for React
  if (allContent.includes('import React') || allContent.includes('from "react"') || allContent.includes("from 'react'") ||
      fileNames.some(f => f.endsWith('.jsx') || f.endsWith('.tsx'))) {
    // Check if it's Next.js
    if (allContent.includes('next/') || fileNames.some(f => f.includes('next.config'))) {
      return 'nextjs';
    }
    return 'react';
  }
  
  // Check for Vue
  if (allContent.includes('from "vue"') || allContent.includes("from 'vue'") ||
      fileNames.some(f => f.endsWith('.vue'))) {
    return 'vue';
  }
  
  // Check for Astro
  if (fileNames.some(f => f.endsWith('.astro')) || allContent.includes('from "astro"')) {
    return 'astro';
  }
  
  // Check for Vite
  if (fileNames.some(f => f.includes('vite.config'))) {
    return 'vite';
  }
  
  // Default: static HTML
  return 'static';
}

// ==================== EXPORTS ====================

const projectBundler = {
  extractPages,
  extractAssets,
  bundleProject,
  projectToFiles,
  injectNavigation,
  addNavigationToPages,
  validateProject,
  detectFramework,
};

export default projectBundler;
