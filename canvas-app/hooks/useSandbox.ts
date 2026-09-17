/**
 * useSandbox — Sandbox lifecycle management hook
 * Manages isolated container environments via sandboxService
 */
import { useState, useCallback } from 'react';
import sandboxService from '../services/sandboxService';

export interface SandboxInfo {
  id: string;
  projectId: string;
  status: 'creating' | 'running' | 'stopped' | 'destroyed';
  port: number;
  url: string;
  memory: number;
  cpu: number;
  storageUsed: number;
  lastActivity: number;
  expiresAt: number;
}

export function useSandbox() {
  const [sandbox, setSandbox] = useState<SandboxInfo | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createSandbox = useCallback(async (projectId: string, template = 'vite-react') => {
    setIsCreating(true);
    setError(null);
    try {
      const data = await sandboxService.create(projectId, template);
      setSandbox(data.sandbox);
      return data.sandbox;
    } catch (e: any) {
      setError(e.message);
      return null;
    } finally {
      setIsCreating(false);
    }
  }, []);

  const destroySandbox = useCallback(async (sandboxId: string) => {
    try {
      await sandboxService.destroy(sandboxId);
      setSandbox(null);
    } catch (e: any) {
      setError(e.message);
    }
  }, []);

  const execInSandbox = useCallback(async (sandboxId: string, command: string) => {
    try {
      return await sandboxService.exec(sandboxId, command);
    } catch (e: any) {
      setError(e.message);
      return null;
    }
  }, []);

  const getSandboxStatus = useCallback(async (sandboxId: string) => {
    try {
      const data = await sandboxService.getStatus(sandboxId);
      setSandbox(data.sandbox);
      return data.sandbox;
    } catch (e: any) {
      setError(e.message);
      return null;
    }
  }, []);

  return {
    sandbox,
    isCreating,
    error,
    isRunning: sandbox?.status === 'running',
    createSandbox,
    destroySandbox,
    execInSandbox,
    getSandboxStatus,
  };
}
