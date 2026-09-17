import { NextRequest, NextResponse } from 'next/server';

/**
 * Canvas Studio Deploy API
 * 
 * Deploys user projects to Vercel, Netlify, Railway, or Cloudflare Pages
 * using the user's own API tokens (passed from frontend).
 * 
 * POST /api/canvas/deploy
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      platform,
      token,
      teamId,
      projectName,
      framework,
      buildCommand,
      outputDir,
      envVars,
      files,
    } = body;

    if (!platform || !token || !files || !projectName) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: platform, token, projectName, files' },
        { status: 400 }
      );
    }

    switch (platform) {
      case 'vercel':
        return await deployToVercel({ token, teamId, projectName, framework, files, envVars });
      case 'netlify':
        return await deployToNetlify({ token, projectName, files });
      case 'railway':
        return await deployToRailway({ token, projectName, framework, files, buildCommand, envVars });
      case 'cloudflare':
        return await deployToCloudflare({ token, teamId, projectName, files });
      default:
        return NextResponse.json(
          { success: false, error: `Unsupported platform: ${platform}` },
          { status: 400 }
        );
    }
  } catch (error: any) {
    console.error('[Deploy API] Error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Deployment failed', errorType: 'network' },
      { status: 500 }
    );
  }
}

// ==================== VERCEL DEPLOYMENT ====================

interface VercelDeployParams {
  token: string;
  teamId?: string;
  projectName: string;
  framework?: string;
  files: Record<string, string>;
  envVars?: Record<string, string>;
}

async function deployToVercel(params: VercelDeployParams) {
  const { token, teamId, projectName, framework, files, envVars } = params;
  const buildLogs: string[] = [];

  try {
    buildLogs.push(`Deploying to Vercel as "${projectName}"...`);

    // Convert files to Vercel's format
    const vercelFiles = Object.entries(files).map(([path, content]) => ({
      file: path.startsWith('/') ? path.slice(1) : path,
      data: content,
    }));

    buildLogs.push(`Uploading ${vercelFiles.length} files...`);

    // Create deployment via Vercel API v13
    const deployBody: Record<string, unknown> = {
      name: projectName.toLowerCase().replace(/[^a-z0-9-]/g, '-'),
      files: vercelFiles,
      projectSettings: {
        framework: framework === 'static' ? null : framework === 'vite' ? 'vite' : framework === 'nextjs' ? 'nextjs' : null,
        buildCommand: framework === 'static' ? '' : undefined,
        outputDirectory: framework === 'static' ? '.' : undefined,
      },
    };

    if (teamId) {
      deployBody.teamId = teamId;
    }

    // Add env vars if provided
    if (envVars && Object.keys(envVars).length > 0) {
      deployBody.env = envVars;
    }

    const deployUrl = teamId
      ? `https://api.vercel.com/v13/deployments?teamId=${teamId}`
      : 'https://api.vercel.com/v13/deployments';

    const response = await fetch(deployUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(deployBody),
    });

    const data = await response.json();

    if (!response.ok) {
      const errorMsg = data.error?.message || data.message || JSON.stringify(data);
      buildLogs.push(`❌ Vercel error: ${errorMsg}`);
      
      return NextResponse.json({
        success: false,
        error: errorMsg,
        errorType: response.status === 401 || response.status === 403 ? 'auth' : 'build',
        buildLogs,
      });
    }

    const deploymentUrl = `https://${data.url}`;
    buildLogs.push(`✅ Deployment created: ${deploymentUrl}`);
    buildLogs.push(`Deployment ID: ${data.id}`);
    buildLogs.push(`Status: ${data.readyState || 'QUEUED'}`);

    return NextResponse.json({
      success: true,
      url: deploymentUrl,
      deploymentId: data.id,
      buildLogs,
    });
  } catch (error: any) {
    buildLogs.push(`❌ Error: ${error.message}`);
    return NextResponse.json({
      success: false,
      error: error.message,
      errorType: 'network',
      buildLogs,
    });
  }
}

// ==================== NETLIFY DEPLOYMENT ====================

interface NetlifyDeployParams {
  token: string;
  projectName: string;
  files: Record<string, string>;
}

async function deployToNetlify(params: NetlifyDeployParams) {
  const { token, projectName, files } = params;
  const buildLogs: string[] = [];

  try {
    buildLogs.push(`Deploying to Netlify as "${projectName}"...`);

    // Step 1: Create or find the site
    const siteName = projectName.toLowerCase().replace(/[^a-z0-9-]/g, '-');
    
    // Try to find existing site
    let siteId: string | null = null;
    const sitesRes = await fetch(`https://api.netlify.com/api/v1/sites?name=${siteName}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    
    if (sitesRes.ok) {
      const sites = await sitesRes.json();
      const existingSite = sites.find((s: any) => s.name === siteName);
      if (existingSite) {
        siteId = existingSite.id;
        buildLogs.push(`Found existing site: ${existingSite.url}`);
      }
    }

    // Create site if not found
    if (!siteId) {
      const createRes = await fetch('https://api.netlify.com/api/v1/sites', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: siteName }),
      });

      if (!createRes.ok) {
        const err = await createRes.json();
        const errorMsg = err.message || 'Failed to create Netlify site';
        buildLogs.push(`❌ ${errorMsg}`);
        return NextResponse.json({
          success: false,
          error: errorMsg,
          errorType: createRes.status === 401 ? 'auth' : 'config',
          buildLogs,
        });
      }

      const site = await createRes.json();
      siteId = site.id;
      buildLogs.push(`Created new site: ${site.url}`);
    }

    // Step 2: Compute SHA1 hashes for all files
    const fileHashes: Record<string, string> = {};
    const fileContents: Record<string, string> = {};
    
    for (const [path, content] of Object.entries(files)) {
      const cleanPath = '/' + (path.startsWith('/') ? path.slice(1) : path);
      // Simple hash using TextEncoder
      const encoder = new TextEncoder();
      const data = encoder.encode(content);
      const hashBuffer = await crypto.subtle.digest('SHA-1', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const hash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
      fileHashes[cleanPath] = hash;
      fileContents[cleanPath] = content;
    }

    buildLogs.push(`Uploading ${Object.keys(fileHashes).length} files...`);

    // Step 3: Create deploy with file hashes
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

    if (!deployRes.ok) {
      const err = await deployRes.json();
      buildLogs.push(`❌ Deploy creation failed: ${err.message || 'Unknown error'}`);
      return NextResponse.json({
        success: false,
        error: err.message || 'Failed to create deploy',
        errorType: 'build',
        buildLogs,
      });
    }

    const deploy = await deployRes.json();
    const requiredFiles = deploy.required || [];

    // Step 4: Upload required files
    for (const hash of requiredFiles) {
      const filePath = Object.keys(fileHashes).find(p => fileHashes[p] === hash);
      if (filePath && fileContents[filePath]) {
        const uploadRes = await fetch(
          `https://api.netlify.com/api/v1/deploys/${deploy.id}/files${filePath}`,
          {
            method: 'PUT',
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/octet-stream',
            },
            body: fileContents[filePath],
          }
        );

        if (!uploadRes.ok) {
          buildLogs.push(`⚠️ Failed to upload: ${filePath}`);
        }
      }
    }

    const deployUrl = deploy.ssl_url || deploy.url || `https://${siteName}.netlify.app`;
    buildLogs.push(`✅ Deployed to: ${deployUrl}`);

    return NextResponse.json({
      success: true,
      url: deployUrl,
      deploymentId: deploy.id,
      buildLogs,
    });
  } catch (error: any) {
    buildLogs.push(`❌ Error: ${error.message}`);
    return NextResponse.json({
      success: false,
      error: error.message,
      errorType: 'network',
      buildLogs,
    });
  }
}

// ==================== RAILWAY DEPLOYMENT ====================

interface RailwayDeployParams {
  token: string;
  projectName: string;
  framework?: string;
  files: Record<string, string>;
  buildCommand?: string;
  envVars?: Record<string, string>;
}

async function deployToRailway(params: RailwayDeployParams) {
  const { token, projectName, files } = params;
  const buildLogs: string[] = [];

  try {
    buildLogs.push(`Deploying to Railway as "${projectName}"...`);

    // Railway uses GraphQL API
    const graphqlUrl = 'https://backboard.railway.app/graphql/v2';
    const headers = {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    };

    // Step 1: Create a project (or use existing)
    const createProjectQuery = `
      mutation {
        projectCreate(input: { name: "${projectName.replace(/"/g, '')}" }) {
          id
          name
        }
      }
    `;

    const projectRes = await fetch(graphqlUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify({ query: createProjectQuery }),
    });

    const projectData = await projectRes.json();
    
    if (projectData.errors) {
      const errorMsg = projectData.errors[0]?.message || 'Failed to create Railway project';
      buildLogs.push(`❌ Railway error: ${errorMsg}`);
      return NextResponse.json({
        success: false,
        error: errorMsg,
        errorType: errorMsg.includes('auth') || errorMsg.includes('token') ? 'auth' : 'config',
        buildLogs,
      });
    }

    const project = projectData.data?.projectCreate;
    if (!project) {
      buildLogs.push('❌ Failed to create Railway project');
      return NextResponse.json({
        success: false,
        error: 'Failed to create Railway project',
        errorType: 'config',
        buildLogs,
      });
    }

    buildLogs.push(`Created project: ${project.name} (${project.id})`);

    // Step 2: Create a service with Nixpacks (static site)
    const createServiceQuery = `
      mutation {
        serviceCreate(input: { 
          projectId: "${project.id}",
          name: "${projectName.replace(/"/g, '')}",
          source: { image: "nginx:alpine" }
        }) {
          id
          name
        }
      }
    `;

    const serviceRes = await fetch(graphqlUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify({ query: createServiceQuery }),
    });

    const serviceData = await serviceRes.json();
    
    if (serviceData.errors) {
      buildLogs.push(`⚠️ Service creation: ${serviceData.errors[0]?.message}`);
    }

    const deployUrl = `https://${projectName.toLowerCase().replace(/[^a-z0-9-]/g, '-')}.up.railway.app`;
    buildLogs.push(`✅ Railway project created!`);
    buildLogs.push(`Project URL: https://railway.app/project/${project.id}`);
    buildLogs.push(`Note: Upload your files via the Railway dashboard or connect a GitHub repo for automatic deploys.`);

    return NextResponse.json({
      success: true,
      url: `https://railway.app/project/${project.id}`,
      deploymentId: project.id,
      buildLogs,
    });
  } catch (error: any) {
    buildLogs.push(`❌ Error: ${error.message}`);
    return NextResponse.json({
      success: false,
      error: error.message,
      errorType: 'network',
      buildLogs,
    });
  }
}

// ==================== CLOUDFLARE PAGES DEPLOYMENT ====================

interface CloudflareDeployParams {
  token: string;
  teamId?: string;
  projectName: string;
  files: Record<string, string>;
}

async function deployToCloudflare(params: CloudflareDeployParams) {
  const { token, teamId, projectName, files } = params;
  const buildLogs: string[] = [];

  try {
    if (!teamId) {
      return NextResponse.json({
        success: false,
        error: 'Cloudflare requires an Account ID. Add it in the credentials panel.',
        errorType: 'config',
        buildLogs: ['❌ Missing Account ID'],
      });
    }

    buildLogs.push(`Deploying to Cloudflare Pages as "${projectName}"...`);

    const safeName = projectName.toLowerCase().replace(/[^a-z0-9-]/g, '-');

    // Step 1: Create project if it doesn't exist
    const createRes = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${teamId}/pages/projects`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: safeName,
          production_branch: 'main',
        }),
      }
    );

    // Ignore error if project already exists
    if (createRes.ok) {
      buildLogs.push('Created Cloudflare Pages project');
    }

    // Step 2: Direct upload deployment
    const formData = new FormData();
    
    // Add manifest
    const manifest: Record<string, string> = {};
    for (const [path, content] of Object.entries(files)) {
      const cleanPath = path.startsWith('/') ? path.slice(1) : path;
      // Create a hash for the manifest
      const encoder = new TextEncoder();
      const data = encoder.encode(content);
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const hash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
      manifest[`/${cleanPath}`] = hash;
    }
    
    formData.append('manifest', JSON.stringify(manifest));
    
    // Add files as blobs
    for (const [path, content] of Object.entries(files)) {
      const cleanPath = path.startsWith('/') ? path.slice(1) : path;
      formData.append(cleanPath, new Blob([content], { type: 'application/octet-stream' }), cleanPath);
    }

    buildLogs.push(`Uploading ${Object.keys(files).length} files...`);

    const deployRes = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${teamId}/pages/projects/${safeName}/deployments`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      }
    );

    const deployData = await deployRes.json();

    if (!deployRes.ok || !deployData.success) {
      const errorMsg = deployData.errors?.[0]?.message || 'Cloudflare deployment failed';
      buildLogs.push(`❌ ${errorMsg}`);
      return NextResponse.json({
        success: false,
        error: errorMsg,
        errorType: deployRes.status === 401 || deployRes.status === 403 ? 'auth' : 'build',
        buildLogs,
      });
    }

    const deployment = deployData.result;
    const deployUrl = deployment?.url || `https://${safeName}.pages.dev`;
    buildLogs.push(`✅ Deployed to: ${deployUrl}`);

    return NextResponse.json({
      success: true,
      url: deployUrl,
      deploymentId: deployment?.id,
      buildLogs,
    });
  } catch (error: any) {
    buildLogs.push(`❌ Error: ${error.message}`);
    return NextResponse.json({
      success: false,
      error: error.message,
      errorType: 'network',
      buildLogs,
    });
  }
}
