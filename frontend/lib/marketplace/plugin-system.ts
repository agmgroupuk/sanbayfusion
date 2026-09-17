/**
 * PLUGIN SYSTEM - Extensible architecture for tools
 * Supports hooks, filters, and tool composition
 */

import { Plugin, PluginHookPayload, ExecutionContext, ToolDependency } from './types'

export type HookHandler = (payload: PluginHookPayload) => Promise<any>
export type FilterHandler = (value: any, ...args: any[]) => Promise<any>

export interface PluginRegistry {
  plugins: Map<string, LoadedPlugin>
  hooks: Map<string, HookHandler[]>
  filters: Map<string, FilterHandler[]>
}

export interface LoadedPlugin {
  plugin: Plugin
  module: any
  enabled: boolean
  loadedAt: Date
}

/**
 * Plugin Manager - Core system for plugin management
 */
export class PluginManager {
  private registry: PluginRegistry = {
    plugins: new Map(),
    hooks: new Map(),
    filters: new Map()
  }

  private dependencyGraph: Map<string, Set<string>> = new Map()
  private executionOrder: string[] = []

  /**
   * Register a plugin
   */
  async registerPlugin(plugin: Plugin): Promise<{ success: boolean; error?: string }> {
    try {
      // Validate plugin
      const validation = this.validatePlugin(plugin)
      if (!validation.valid) {
        return { success: false, error: validation.error }
      }

      // Check dependencies
      const depCheck = await this.checkDependencies(plugin)
      if (!depCheck.valid) {
        return { success: false, error: depCheck.error }
      }

      // Load plugin module
      let module: any = {}
      if (plugin.mainFile) {
        try {
          // Dynamic import would go here in real implementation
          module = await this.loadModule(plugin.mainFile)
        } catch (error) {
          return {
            success: false,
            error: `Failed to load module: ${error}`
          }
        }
      }

      // Register hooks
      Object.entries(plugin.hooks).forEach(([hookName, handlers]) => {
        if (!this.registry.hooks.has(hookName)) {
          this.registry.hooks.set(hookName, [])
        }

        handlers.forEach(handlerName => {
          if (module[handlerName]) {
            this.registry.hooks.get(hookName)!.push(module[handlerName])
          }
        })
      })

      // Register filters
      Object.entries(plugin.filters).forEach(([filterName, handlers]) => {
        if (!this.registry.filters.has(filterName)) {
          this.registry.filters.set(filterName, [])
        }

        handlers.forEach(handlerName => {
          if (module[handlerName]) {
            this.registry.filters.get(filterName)!.push(module[handlerName])
          }
        })
      })

      // Store plugin
      this.registry.plugins.set(plugin.id, {
        plugin,
        module,
        enabled: plugin.enabled,
        loadedAt: new Date()
      })

      // Recalculate execution order
      this.calculateExecutionOrder()

      return { success: true }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  /**
   * Unregister plugin
   */
  unregisterPlugin(pluginId: string): { success: boolean; error?: string } {
    try {
      const loaded = this.registry.plugins.get(pluginId)
      if (!loaded) {
        return { success: false, error: 'Plugin not found' }
      }

      const plugin = loaded.plugin

      // Remove hooks
      Object.entries(plugin.hooks).forEach(([hookName, handlers]) => {
        const hookHandlers = this.registry.hooks.get(hookName)
        if (hookHandlers) {
          // Remove handlers from this plugin
          // In real implementation, would track handler ownership
        }
      })

      // Remove filters
      Object.entries(plugin.filters).forEach(([filterName, handlers]) => {
        const filterHandlers = this.registry.filters.get(filterName)
        if (filterHandlers) {
          // Remove handlers from this plugin
        }
      })

      // Remove from registry
      this.registry.plugins.delete(pluginId)
      this.dependencyGraph.delete(pluginId)

      // Recalculate execution order
      this.calculateExecutionOrder()

      return { success: true }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  /**
   * Enable plugin
   */
  enablePlugin(pluginId: string): { success: boolean; error?: string } {
    const loaded = this.registry.plugins.get(pluginId)
    if (!loaded) {
      return { success: false, error: 'Plugin not found' }
    }

    loaded.enabled = true
    loaded.plugin.enabled = true

    return { success: true }
  }

  /**
   * Disable plugin
   */
  disablePlugin(pluginId: string): { success: boolean; error?: string } {
    const loaded = this.registry.plugins.get(pluginId)
    if (!loaded) {
      return { success: false, error: 'Plugin not found' }
    }

    loaded.enabled = false
    loaded.plugin.enabled = false

    return { success: true }
  }

  /**
   * Execute hook
   */
  async executeHook(
    hookName: string,
    data: Record<string, any>,
    context: ExecutionContext
  ): Promise<any> {
    const handlers = this.registry.hooks.get(hookName) || []

    let result = data

    for (const handler of handlers) {
      try {
        result = await handler({
          hookName,
          data: result,
          context
        })
      } catch (error) {
        console.error(`Hook ${hookName} error:`, error)
      }
    }

    return result
  }

  /**
   * Execute filter
   */
  async executeFilter(
    filterName: string,
    value: any,
    ...args: any[]
  ): Promise<any> {
    const handlers = this.registry.filters.get(filterName) || []

    let result = value

    for (const handler of handlers) {
      try {
        result = await handler(result, ...args)
      } catch (error) {
        console.error(`Filter ${filterName} error:`, error)
      }
    }

    return result
  }

  /**
   * Compose multiple tools
   */
  composeTools(
    toolIds: string[],
    mapping: Record<string, string>
  ): {
    composedId: string
    toolChain: string[]
    mapping: Record<string, string>
  } {
    const composedId = `composed_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    return {
      composedId,
      toolChain: toolIds,
      mapping
    }
  }

  /**
   * Get plugin info
   */
  getPluginInfo(pluginId: string): LoadedPlugin | null {
    return this.registry.plugins.get(pluginId) || null
  }

  /**
   * Get all plugins
   */
  getAllPlugins(): LoadedPlugin[] {
    return Array.from(this.registry.plugins.values())
  }

  /**
   * Get enabled plugins
   */
  getEnabledPlugins(): LoadedPlugin[] {
    return this.getAllPlugins().filter(p => p.enabled)
  }

  /**
   * Get plugin execution order
   */
  getExecutionOrder(): string[] {
    return this.executionOrder
  }

  // ========================================================================
  // PRIVATE METHODS
  // ========================================================================

  private validatePlugin(plugin: Plugin): { valid: boolean; error?: string } {
    if (!plugin.id || plugin.id.trim() === '') {
      return { valid: false, error: 'Plugin ID is required' }
    }

    if (!plugin.name || plugin.name.trim() === '') {
      return { valid: false, error: 'Plugin name is required' }
    }

    if (!plugin.version || plugin.version.trim() === '') {
      return { valid: false, error: 'Plugin version is required' }
    }

    return { valid: true }
  }

  private async checkDependencies(
    plugin: Plugin
  ): Promise<{ valid: boolean; error?: string }> {
    // Plugin dependencies can be added via configuration
    // For now, this is a placeholder for future dependency checking
    return { valid: true }
  }

  private versionSatisfies(installed: string, required: string): boolean {
    // Simple version check (in real implementation, use semver library)
    return installed >= required
  }

  private calculateExecutionOrder(): void {
    const order: string[] = []
    const visited = new Set<string>()
    const visiting = new Set<string>()

    const visit = (pluginId: string) => {
      if (visited.has(pluginId)) return
      if (visiting.has(pluginId)) return // Circular dependency

      visiting.add(pluginId)

      const dependents = this.dependencyGraph.get(pluginId) || new Set()
      dependents.forEach(dependent => visit(dependent))

      visiting.delete(pluginId)
      visited.add(pluginId)
      order.push(pluginId)
    }

    this.registry.plugins.forEach((_, pluginId) => {
      visit(pluginId)
    })

    this.executionOrder = order
  }

  private async loadModule(mainFile: string): Promise<any> {
    // In real implementation, would dynamically load from URL/file
    return {}
  }
}

/**
 * Hook System - Used by tools to hook into execution
 */
export class HookSystem {
  private hooks: Map<string, HookHandler[]> = new Map()

  /**
   * Register hook listener
   */
  addHookListener(hookName: string, handler: HookHandler): void {
    if (!this.hooks.has(hookName)) {
      this.hooks.set(hookName, [])
    }
    this.hooks.get(hookName)!.push(handler)
  }

  /**
   * Remove hook listener
   */
  removeHookListener(hookName: string, handler: HookHandler): void {
    const handlers = this.hooks.get(hookName)
    if (!handlers) return

    const index = handlers.indexOf(handler)
    if (index > -1) {
      handlers.splice(index, 1)
    }
  }

  /**
   * Trigger hook
   */
  async triggerHook(
    hookName: string,
    data: Record<string, any>,
    context: ExecutionContext
  ): Promise<any> {
    const handlers = this.hooks.get(hookName) || []

    let result = data

    for (const handler of handlers) {
      try {
        result = await handler({
          hookName,
          data: result,
          context
        })
      } catch (error) {
        console.error(`Hook ${hookName} error:`, error)
      }
    }

    return result
  }

  /**
   * Get all hooks
   */
  getAllHooks(): string[] {
    return Array.from(this.hooks.keys())
  }

  /**
   * Get hook handlers count
   */
  getHandlerCount(hookName: string): number {
    return this.hooks.get(hookName)?.length || 0
  }
}

/**
 * Filter System - Used by tools to filter data
 */
export class FilterSystem {
  private filters: Map<string, FilterHandler[]> = new Map()

  /**
   * Add filter
   */
  addFilter(filterName: string, handler: FilterHandler): void {
    if (!this.filters.has(filterName)) {
      this.filters.set(filterName, [])
    }
    this.filters.get(filterName)!.push(handler)
  }

  /**
   * Remove filter
   */
  removeFilter(filterName: string, handler: FilterHandler): void {
    const handlers = this.filters.get(filterName)
    if (!handlers) return

    const index = handlers.indexOf(handler)
    if (index > -1) {
      handlers.splice(index, 1)
    }
  }

  /**
   * Apply filter
   */
  async applyFilter(filterName: string, value: any, ...args: any[]): Promise<any> {
    const handlers = this.filters.get(filterName) || []

    let result = value

    for (const handler of handlers) {
      try {
        result = await handler(result, ...args)
      } catch (error) {
        console.error(`Filter ${filterName} error:`, error)
      }
    }

    return result
  }

  /**
   * Get all filters
   */
  getAllFilters(): string[] {
    return Array.from(this.filters.keys())
  }
}

export default {
  PluginManager,
  HookSystem,
  FilterSystem
}
