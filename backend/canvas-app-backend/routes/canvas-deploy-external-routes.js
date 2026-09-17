/**
 * CANVAS EXTERNAL DEPLOYMENT ROUTES
 * Deploy canvas projects to Vercel, Netlify, Railway, and Cloudflare Pages.
 *
 * POST /api/canvas/deploy-external      — deploy to an external platform
 * POST /api/canvas/deploy-external/fix   — AI auto-fix build errors
 */

import express from 'express';
import { body, validationResult } from 'express-validator';
import OpenAI from 'openai';
import {
  smartRequest,
} from '../lib/smart-ai-router.js';

const router = express.Router();

// ============================================
// PLATFORM DEPLOYERS
// ============================================

/**
 * Deploy to Vercel via their REST API
 * https://vercel.com/docs/rest-api/endpoints/deployments/create-a-new-deployment
 */
async function deployToVercel({ token, teamId, projectName, files, framework, buildCommand, outputDir, envVars }) {
  // Build file array for Vercel (they want {file, data} pairs)
  const vercelFiles = Object.entries(files).map(([filePath, content]) => ({
    file: filePath.startsWith('/') ? filePath.slice(1) : filePath,
    data: content,
  }));

  const body = {
    name: projectName.toLowerCase().replace(/[^a-z0-9-]/g, '-'),
    files: vercelFiles,
    projectSettings: {
      framework: framework === 'static' ? null : framework,
      buildCommand: buildCommand || null,
      outputDirectory: outputDir || null,
    },
    target: 'production',
  };

  if (envVars && Object.keys(envVars).length > 0) {
    body.env = envVars;
  }

  const url = teamId
    ? `https://api.vercel.com/v13/deployments?teamId=${teamId}`
    : 'https://api.vercel.com/v13/deployments';

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  const data = await response.json();

  if (!response.ok) {
    return {
      success: false,
      error: data.error?.message || `Vercel deployment failed (${response.status})`,
      errorType: 'build',
      buildLogs: data.error?.errors?.map(e => e.message) || [data.error?.message || 'Unknown error'],
    };
  }

  return {
    success: true,
    url: `https://${data.url}`,
    deploymentId: data.id,
    platform: 'vercel',
  };
}

/**
 * Deploy to Netlify via their REST API
 * https://docs.netlify.com/api/get-started/#deploy-with-the-api
 */
async function deployToNetlify({ token, projectName, files }) {
  // Step 1: Create or find site
  let siteId;
  const siteName = projectName.toLowerCase().replace(/[^a-z0-9-]/g, '-');

  // Try to find existing site
  const sitesRes = await fetch(`https://api.netlify.com/api/v1/sites?name=${siteName}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const sites = await sitesRes.json();
  const existingSite = Array.isArray(sites) ? sites.find(s => s.name === siteName) : null;

  if (existingSite) {
    siteId = existingSite.id;
  } else {
    // Create new site
    const createRes = await fetch('https://api.netlify.com/api/v1/sites', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name: siteName }),
    });
    const newSite = await createRes.json();
    if (!createRes.ok) {
      return {
        success: false,
        error: newSite.message || `Failed to create Netlify site (${createRes.status})`,
        errorType: 'auth',
      };
    }
    siteId = newSite.id;
  }

  // Step 2: Deploy files using the file digest method
  // For simple deploys, we use the zip deploy approach
  const { createHash } = await import('crypto');

  // Build file hash map
  const fileHashes = {};
  const fileContents = {};
  for (const [filePath, content] of Object.entries(files)) {
    const cleanPath = filePath.startsWith('/') ? filePath.slice(1) : filePath;
    const hash = createHash('sha1').update(content).digest('hex');
    fileHashes[`/${cleanPath}`] = hash;
    fileContents[hash] = content;
  }

  // Create deploy with file digests
  const deployRes = await fetch(`https://api.netlify.com/api/v1/sites/${siteId}/deploys`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      files: fileHashes,
    }),
  });

  const deploy = await deployRes.json();
  if (!deployRes.ok) {
    return {
      success: false,
      error: deploy.message || `Netlify deploy failed (${deployRes.status})`,
      errorType: 'build',
    };
  }

  // Step 3: Upload required files
  const requiredHashes = deploy.required || [];
  for (const hash of requiredHashes) {
    const content = fileContents[hash];
    if (content) {
      await fetch(`https://api.netlify.com/api/v1/deploys/${deploy.id}/files/${hash}`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/octet-stream',
        },
        body: content,
      });
    }
  }

  return {
    success: true,
    url: deploy.ssl_url || deploy.url || `https://${siteName}.netlify.app`,
    deploymentId: deploy.id,
    platform: 'netlify',
  };
}

/**
 * Deploy to Cloudflare Pages via REST API
 */
async function deployToCloudflare({ token, teamId, projectName, files }) {
  const projName = projectName.toLowerCase().replace(/[^a-z0-9-]/g, '-');

  // Create project if it doesn't exist (will 409 if exists, which is fine)
  await fetch(`https://api.cloudflare.com/client/v4/accounts/${teamId}/pages/projects`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: projName,
      production_branch: 'main',
    }),
  });

  // Build FormData with files for direct upload
  const { FormData, Blob } = await import('node:buffer');
  const formData = new FormData();

  for (const [filePath, content] of Object.entries(files)) {
    const cleanPath = filePath.startsWith('/') ? filePath.slice(1) : filePath;
    formData.append(cleanPath, new Blob([content]), cleanPath);
  }

  const deployRes = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${teamId}/pages/projects/${projName}/deployments`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    },
  );

  const data = await deployRes.json();

  if (!deployRes.ok || !data.success) {
    return {
      success: false,
      error: data.errors?.[0]?.message || `Cloudflare deployment failed (${deployRes.status})`,
      errorType: 'build',
      buildLogs: data.errors?.map(e => e.message) || [],
    };
  }

  return {
    success: true,
    url: data.result?.url || `https://${projName}.pages.dev`,
    deploymentId: data.result?.id,
    platform: 'cloudflare',
  };
}

/**
 * Deploy to Railway via GraphQL API
 */
async function deployToRailway({ token, projectName, files }) {
  // Railway uses a GraphQL API — create a project and deploy via Nixpacks
  // For static sites, we create a simple Dockerfile-based deployment

  // Step 1: Create project
  const gqlRes = await fetch('https://backboard.railway.app/graphql/v2', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      query: `mutation { projectCreate(input: { name: "${projectName}" }) { id } }`,
    }),
  });

  const gqlData = await gqlRes.json();

  if (gqlData.errors) {
    return {
      success: false,
      error: gqlData.errors[0]?.message || 'Railway project creation failed',
      errorType: 'auth',
    };
  }

  // Railway's full deploy flow requires their CLI or GitHub integration
  // Return the project link for now
  const projectId = gqlData.data?.projectCreate?.id;
  return {
    success: true,
    url: `https://railway.app/project/${projectId}`,
    deploymentId: projectId,
    platform: 'railway',
    message: 'Project created on Railway. Connect your repo or use Railway CLI to deploy files.',
  };
}

// ============================================
// DEPLOY EXTERNAL ENDPOINT
// ============================================

router.post('/', [
  body('platform').isIn(['vercel', 'netlify', 'railway', 'cloudflare']).withMessage('Invalid platform'),
  body('token').isString().notEmpty().withMessage('API token required'),
  body('projectName').isString().notEmpty().withMessage('Project name required'),
  body('files').isObject().withMessage('Files object required'),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors.array(),
      });
    }

    const { platform, token, teamId, projectName, framework, buildCommand, outputDir, envVars, nodeVersion, files } = req.body;

    console.log(`[Deploy External] Platform: ${platform} | Project: ${projectName} | Files: ${Object.keys(files).length}`);

    let result;

    switch (platform) {
      case 'vercel':
        result = await deployToVercel({ token, teamId, projectName, files, framework, buildCommand, outputDir, envVars });
        break;
      case 'netlify':
        result = await deployToNetlify({ token, projectName, files });
        break;
      case 'cloudflare':
        result = await deployToCloudflare({ token, teamId, projectName, files });
        break;
      case 'railway':
        result = await deployToRailway({ token, projectName, files });
        break;
      default:
        return res.status(400).json({ success: false, error: `Unsupported platform: ${platform}` });
    }

    if (!result.success) {
      console.error(`[Deploy External] Failed: ${result.error}`);
      return res.status(422).json(result);
    }

    console.log(`[Deploy External] Success: ${result.url}`);
    res.json(result);
  } catch (error) {
    console.error('[Deploy External] Error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Deployment failed unexpectedly',
      errorType: 'network',
    });
  }
});

// ============================================
// AI BUILD FIX ENDPOINT
// ============================================

router.post('/fix', [
  body('error').isString().withMessage('Error message required'),
  body('files').isObject().withMessage('Files object required'),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, error: 'Validation failed' });
    }

    const { error, buildLogs, files } = req.body;

    console.log(`[Deploy Fix] Build error: ${error.substring(0, 100)}...`);

    const fixPrompt = `You are a build error fixer. The user's web project failed to deploy with this error:

ERROR: ${error}

BUILD LOGS:
${(buildLogs || []).join('\n')}

The project files are:
${Object.entries(files).map(([path, content]) => `--- ${path} ---\n${String(content).substring(0, 2000)}`).join('\n\n')}

Fix the build errors. Return a JSON object with:
{
  "fixedFiles": { "/path/to/file": "corrected content..." },
  "explanation": "What was wrong and what you fixed"
}

Only include files that need changes. Return ONLY the JSON, no markdown fences.`;

    const result = await smartRequest(
      async (activeProvider, activeModel) => {
        const client = new OpenAI({
          apiKey: activeProvider === 'mistral' ? process.env.MISTRAL_API_KEY
                : activeProvider === 'xai' ? process.env.XAI_API_KEY
                : process.env.OPENAI_API_KEY,
          ...(activeProvider === 'mistral' ? { baseURL: 'https://api.mistral.ai/v1' } : {}),
          ...(activeProvider === 'xai' ? { baseURL: 'https://api.x.ai/v1' } : {}),
        });
        const completion = await client.chat.completions.create({
          model: activeModel,
          max_tokens: 8000,
          messages: [{ role: 'user', content: fixPrompt }],
        });
        return completion.choices[0]?.message?.content || '';
      },
      {
        provider: 'mistral',
        model: 'mistral-large-latest',
        message: fixPrompt,
        maxRetries: 2,
      }
    );

    if (!result.success) {
      return res.status(503).json({ success: false, error: 'AI service unavailable for build fix' });
    }

    // Parse JSON response
    let parsed;
    try {
      let jsonStr = result.result.trim();
      if (jsonStr.startsWith('```json')) {
        jsonStr = jsonStr.replace(/^```json\s*/, '').replace(/\s*```$/, '');
      } else if (jsonStr.startsWith('```')) {
        jsonStr = jsonStr.replace(/^```\s*/, '').replace(/\s*```$/, '');
      }
      parsed = JSON.parse(jsonStr);
    } catch {
      return res.status(500).json({ success: false, error: 'Failed to parse AI fix response' });
    }

    res.json({
      success: true,
      fixedFiles: parsed.fixedFiles || {},
      explanation: parsed.explanation || 'Build errors fixed.',
    });
  } catch (error) {
    console.error('[Deploy Fix] Error:', error);
    res.status(500).json({ success: false, error: 'Build fix failed' });
  }
});

export default router;
