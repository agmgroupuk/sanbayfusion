/**
 * useBuild — Build pipeline hook
 * Wraps buildStore + buildService for real backend builds
 */
import { useCallback } from 'react';
import { useBuildStore } from '../stores/buildStore';
import { buildService } from '../services/buildService';

export function useBuild() {
  const store = useBuildStore();

  const triggerBuild = useCallback(async (projectId: string) => {
    const buildId = store.startBuild(projectId, 'manual');
    store.addBuildLog('▶ Starting build...');
    store.updateBuildStatus(buildId, 'building');

    try {
      const { build } = await buildService.startBuild({ projectId, files: {} });
      store.addBuildLog(`Build ${build.id} started on server`);

      // Subscribe to real-time build logs via SSE
      await new Promise<void>((resolve) => {
        buildService.subscribeLogs(
          build.id,
          (event) => {
            switch (event.type) {
              case 'stage-start':
                store.updateBuildStep(buildId, event.stage || '', { status: 'running', startedAt: Date.now() });
                store.addBuildLog(`▶ ${event.name || event.stage}...`);
                break;
              case 'stage-complete':
                store.updateBuildStep(buildId, event.stage || '', {
                  status: 'success',
                  completedAt: Date.now(),
                  logs: [`✓ ${event.name || event.stage} (${event.duration}ms)`],
                });
                store.addBuildLog(`✓ ${event.name || event.stage} (${event.duration}ms)`);
                break;
              case 'stage-error':
                store.updateBuildStep(buildId, event.stage || '', { status: 'failed', completedAt: Date.now() });
                store.addBuildLog(`✗ ${event.name || event.stage} failed: ${event.message || ''}`);
                break;
              case 'log':
                if (event.message) store.addBuildLog(event.message);
                break;
              case 'complete':
                store.completeBuild(buildId);
                store.addBuildLog('🎉 Build successful!');
                resolve();
                break;
              case 'error':
                store.addBuildLog(`✗ Build failed: ${event.message || 'unknown error'}`);
                resolve();
                break;
              case 'cancelled':
                store.addBuildLog('⊘ Build cancelled');
                resolve();
                break;
            }
          },
          () => resolve(),
        );
      });
    } catch (err: any) {
      store.addBuildLog(`✗ Build failed: ${err.message}`);
    }

    return buildId;
  }, [store]);

  return {
    builds: store.builds,
    currentBuild: store.currentBuild,
    isBuilding: store.isBuilding,
    buildLogs: store.buildLogs,
    buildConfig: store.buildConfig,
    lastSuccessfulBuild: store.lastSuccessfulBuild,
    autoRebuild: store.autoRebuild,
    triggerBuild,
    cancelBuild: store.cancelBuild,
    setBuildConfig: store.setBuildConfig,
    setAutoRebuild: store.setAutoRebuild,
    clearBuilds: store.clearBuilds,
    clearBuildLogs: store.clearBuildLogs,
  };
}
