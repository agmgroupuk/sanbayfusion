/**
 * CUSTOM TOOL BUILDER SERVICE
 * Allows users to create, validate, and publish custom tools
 */

import {
  ToolBuilderProject,
  ToolCodeSnippet,
  ToolTestCase,
  ToolDefinition,
  ToolInput,
  ToolOutput,
  ToolMetadata
} from './types'

export interface BuilderValidationResult {
  valid: boolean
  errors: string[]
  warnings: string[]
  suggestions: string[]
}

export interface BuilderTestResult {
  testCaseId: string
  testName: string
  passed: boolean
  expectedOutput: any
  actualOutput?: any
  executionTime: number
  error?: string
}

export class ToolBuilder {
  /**
   * Create new tool project
   */
  static createProject(
    userId: string,
    name: string,
    description: string,
    category: string
  ): ToolBuilderProject {
    const projectId = `project_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    return {
      id: projectId,
      userId,
      name,
      description,
      status: 'draft',
      createdAt: new Date(),
      updatedAt: new Date(),
      toolDefinition: {
        id: `tool_${projectId}`,
        metadata: {
          id: `tool_${projectId}`,
          name,
          slug: name.toLowerCase().replace(/\s+/g, '-'),
          description,
          category: category as any,
          tags: [],
          icon: '🔧',
          currentVersion: '0.1.0',
          allVersions: [
            {
              versionId: 'v0.1.0',
              version: '0.1.0',
              releaseDate: new Date(),
              description: 'Initial release',
              changelog: '',
              isStable: false,
              downloads: 0,
              rating: 0
            }
          ],
          author: {
            id: userId,
            name: '',
            avatar: '',
            verified: false
          },
          createdAt: new Date(),
          updatedAt: new Date(),
          downloads: 0,
          stars: 0,
          uses: 0
        },
        config: {
          inputs: [],
          outputs: [],
          settings: [],
          requirements: []
        },
        hooks: [],
        dependencies: [],
        codeUrl: '',
        mainFunction: 'execute',
        published: false,
        verified: false,
        featured: false,
        requiredPermissions: [],
        sandboxed: true,
        riskLevel: 'low'
      },
      codeSnippets: [],
      testCases: []
    }
  }

  /**
   * Add code snippet
   */
  static addCodeSnippet(
    project: ToolBuilderProject,
    language: string,
    code: string,
    description?: string
  ): ToolBuilderProject {
    const snippet: ToolCodeSnippet = {
      id: `snippet_${Date.now()}`,
      language,
      code,
      description
    }

    project.codeSnippets.push(snippet)
    project.updatedAt = new Date()

    return project
  }

  /**
   * Add input parameter
   */
  static addInput(
    project: ToolBuilderProject,
    input: ToolInput
  ): ToolBuilderProject {
    project.toolDefinition.config.inputs.push(input)
    project.updatedAt = new Date()

    return project
  }

  /**
   * Add output parameter
   */
  static addOutput(
    project: ToolBuilderProject,
    output: ToolOutput
  ): ToolBuilderProject {
    project.toolDefinition.config.outputs.push(output)
    project.updatedAt = new Date()

    return project
  }

  /**
   * Add test case
   */
  static addTestCase(
    project: ToolBuilderProject,
    name: string,
    inputs: Record<string, any>,
    expectedOutputs: Record<string, any>
  ): ToolBuilderProject {
    const testCase: ToolTestCase = {
      id: `test_${Date.now()}`,
      name,
      inputs,
      expectedOutputs
    }

    project.testCases.push(testCase)
    project.updatedAt = new Date()

    return project
  }

  /**
   * Run test case
   */
  static async runTestCase(
    project: ToolBuilderProject,
    testCaseId: string,
    executorFn: (inputs: any) => Promise<any>
  ): Promise<BuilderTestResult> {
    const testCase = project.testCases.find(t => t.id === testCaseId)

    if (!testCase) {
      return {
        testCaseId,
        testName: '',
        passed: false,
        expectedOutput: null,
        executionTime: 0,
        error: 'Test case not found'
      }
    }

    const startTime = Date.now()

    try {
      const actualOutput = await executorFn(testCase.inputs)
      const executionTime = Date.now() - startTime

      const passed = this.compareOutputs(actualOutput, testCase.expectedOutputs)

      return {
        testCaseId,
        testName: testCase.name,
        passed,
        expectedOutput: testCase.expectedOutputs,
        actualOutput,
        executionTime
      }
    } catch (error) {
      return {
        testCaseId,
        testName: testCase.name,
        passed: false,
        expectedOutput: testCase.expectedOutputs,
        executionTime: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  /**
   * Run all test cases
   */
  static async runAllTests(
    project: ToolBuilderProject,
    executorFn: (inputs: any) => Promise<any>
  ): Promise<BuilderTestResult[]> {
    const results: BuilderTestResult[] = []

    for (const testCase of project.testCases) {
      const result = await this.runTestCase(project, testCase.id, executorFn)
      results.push(result)
    }

    return results
  }

  /**
   * Validate tool definition
   */
  static validate(project: ToolBuilderProject): BuilderValidationResult {
    const errors: string[] = []
    const warnings: string[] = []
    const suggestions: string[] = []

    const def = project.toolDefinition

    // Validate metadata
    if (!def.metadata.name || def.metadata.name.trim() === '') {
      errors.push('Tool name is required')
    }

    if (!def.metadata.description || def.metadata.description.trim() === '') {
      errors.push('Tool description is required')
    }

    if (def.metadata.author.name === '') {
      errors.push('Author name is required')
    }

    // Validate config
    if (def.config.inputs.length === 0) {
      warnings.push('Tool has no inputs - consider adding input parameters')
    }

    if (def.config.outputs.length === 0) {
      errors.push('Tool must have at least one output')
    }

    // Validate code
    if (project.codeSnippets.length === 0) {
      errors.push('Tool code is required')
    }

    // Validate tests
    if (project.testCases.length === 0) {
      warnings.push('No test cases defined - add tests to verify tool behavior')
    }

    // Input validation checks
    def.config.inputs.forEach((input, index) => {
      if (!input.name || input.name.trim() === '') {
        errors.push(`Input ${index} has no name`)
      }

      if (input.validation?.pattern && !this.isValidRegex(input.validation.pattern)) {
        errors.push(`Input ${index} has invalid regex pattern`)
      }
    })

    // Duplicate input names
    const inputNames = def.config.inputs.map(i => i.name)
    const duplicateNames = inputNames.filter((name, index) => inputNames.indexOf(name) !== index)
    if (duplicateNames.length > 0) {
      errors.push(`Duplicate input names: ${duplicateNames.join(', ')}`)
    }

    // Suggestions
    if (def.metadata.tags.length === 0) {
      suggestions.push('Add tags to improve discoverability')
    }

    if (!def.metadata.homepage && !def.metadata.repository) {
      suggestions.push('Consider adding homepage or repository link')
    }

    if (def.metadata.longDescription === undefined || def.metadata.longDescription === '') {
      suggestions.push('Add detailed description for better documentation')
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      suggestions
    }
  }

  /**
   * Publish tool (after validation)
   */
  static async publishTool(
    project: ToolBuilderProject,
    version: string = '1.0.0'
  ): Promise<{ success: boolean; toolId?: string; error?: string }> {
    // Validate first
    const validation = this.validate(project)
    if (!validation.valid) {
      return {
        success: false,
        error: `Validation failed: ${validation.errors.join(', ')}`
      }
    }

    try {
      // Update version in metadata
      project.toolDefinition.metadata.currentVersion = version
      project.toolDefinition.published = true
      project.status = 'published'
      project.publishedAt = new Date()
      project.updatedAt = new Date()

      // Add version to history
      project.toolDefinition.metadata.allVersions.push({
        versionId: `v${version}`,
        version,
        releaseDate: new Date(),
        description: `Version ${version}`,
        changelog: '',
        isStable: !version.includes('-'),
        downloads: 0,
        rating: 0
      })

      // In real implementation, would save to backend
      return {
        success: true,
        toolId: project.toolDefinition.id
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to publish'
      }
    }
  }

  /**
   * Export tool definition
   */
  static exportDefinition(project: ToolBuilderProject): string {
    return JSON.stringify(project.toolDefinition, null, 2)
  }

  /**
   * Import tool definition
   */
  static importDefinition(
    userId: string,
    json: string
  ): { success: boolean; project?: ToolBuilderProject; error?: string } {
    try {
      const toolDef = JSON.parse(json)

      const project = this.createProject(
        userId,
        toolDef.metadata.name,
        toolDef.metadata.description,
        toolDef.metadata.category
      )

      project.toolDefinition = toolDef
      project.updatedAt = new Date()

      return { success: true, project }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Invalid JSON format'
      }
    }
  }

  /**
   * Generate code template
   */
  static generateCodeTemplate(
    toolName: string,
    inputs: ToolInput[],
    outputs: ToolOutput[]
  ): string {
    const inputParams = inputs.map(i => `  ${i.name}: ${i.type}`).join(',\n')
    const outputType = outputs.map(o => `  ${o.name}: ${o.type}`).join(',\n')

    return `/**
 * ${toolName} Tool
 * Auto-generated template
 */

export interface Input {
${inputParams}
}

export interface Output {
${outputType}
}

/**
 * Main execution function
 * @param input - Input parameters
 * @returns Output result
 */
export async function execute(input: Input): Promise<Output> {
  // TODO: Implement your tool logic here
  
  // Example:
  return {
${outputs.map(o => `    ${o.name}: null`).join(',\n')}
  }
}

/**
 * Initialize hook - called before tool execution
 */
export async function onInit(context: any): Promise<void> {
  // Optional: Setup resources
}

/**
 * Cleanup hook - called after tool execution
 */
export async function onDestroy(context: any): Promise<void> {
  // Optional: Cleanup resources
}
`
  }

  /**
   * Helper: Compare outputs
   */
  private static compareOutputs(actual: any, expected: any): boolean {
    return JSON.stringify(actual) === JSON.stringify(expected)
  }

  /**
   * Helper: Validate regex
   */
  private static isValidRegex(pattern: string): boolean {
    try {
      new RegExp(pattern)
      return true
    } catch {
      return false
    }
  }

  /**
   * Get code snippets by language
   */
  static getCodeByLanguage(
    project: ToolBuilderProject,
    language: string
  ): ToolCodeSnippet | undefined {
    return project.codeSnippets.find(s => s.language === language)
  }

  /**
   * Update tool metadata
   */
  static updateMetadata(
    project: ToolBuilderProject,
    updates: Partial<ToolMetadata>
  ): ToolBuilderProject {
    project.toolDefinition.metadata = {
      ...project.toolDefinition.metadata,
      ...updates,
      updatedAt: new Date()
    }

    project.updatedAt = new Date()
    return project
  }

  /**
   * Calculate complexity score
   */
  static calculateComplexity(project: ToolBuilderProject): {
    score: number // 1-10
    inputs: number
    outputs: number
    tests: number
    code: number
    description: string
  } {
    const def = project.toolDefinition
    const inputCount = def.config.inputs.length
    const outputCount = def.config.outputs.length
    const testCount = project.testCases.length
    const codeLength = project.codeSnippets.reduce((sum, s) => sum + s.code.length, 0)

    // Calculate score (1-10)
    let score = 1
    if (inputCount > 0) score += 1
    if (outputCount > 0) score += 1
    if (testCount > 2) score += 2
    if (codeLength > 500) score += 2
    if (def.dependencies.length > 0) score += 1
    if (def.requiredPermissions.length > 0) score += 1

    score = Math.min(10, score)

    return {
      score,
      inputs: inputCount,
      outputs: outputCount,
      tests: testCount,
      code: codeLength,
      description:
        score <= 3
          ? 'Basic - Simple tool with minimal functionality'
          : score <= 6
            ? 'Intermediate - Moderate complexity with good structure'
            : 'Advanced - Complex tool with comprehensive features'
    }
  }

  /**
   * Get SDK code for developers
   */
  static getSDKTemplate(): string {
    return `/**
 * Tool Builder SDK
 * Use this to build your tool
 */

import { ToolBuilder } from '@/lib/marketplace/tool-builder'

// Create a new project
const project = ToolBuilder.createProject(
  'user123',
  'My Awesome Tool',
  'Does something awesome',
  'utility'
)

// Add inputs
ToolBuilder.addInput(project, {
  id: 'input1',
  name: 'text',
  type: 'string',
  description: 'Input text',
  required: true
})

// Add outputs
ToolBuilder.addOutput(project, {
  id: 'output1',
  name: 'result',
  type: 'string',
  description: 'Processed result'
})

// Add code
ToolBuilder.addCodeSnippet(project, 'typescript', \`
export async function execute(input) {
  return { result: input.text.toUpperCase() }
}
\`)

// Add test
ToolBuilder.addTestCase(project, 'Basic Test', 
  { text: 'hello' },
  { result: 'HELLO' }
)

// Validate
const validation = ToolBuilder.validate(project)
console.log('Valid:', validation.valid)

// Publish
const result = await ToolBuilder.publishTool(project, '1.0.0')
if (result.success) {
  console.log('Published:', result.toolId)
}
`
  }
}

export default ToolBuilder
