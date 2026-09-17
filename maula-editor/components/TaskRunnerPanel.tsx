import { createLogger } from '../services/logger';
const log = createLogger('TaskRunnerPanel');
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '../store/useStore';
import taskRunnerService, {
  Task,
  TaskExecution,
  TaskTemplate,
  TestRun,
  TestSuite,
  TestCase,
  TestFramework,
  CoverageReport,
  AutomationRule,
} from '../services/taskRunner';

type TabType = 'tasks' | 'tests' | 'coverage' | 'automation' | 'history';

export const TaskRunnerPanel: React.FC = () => {
  const { theme, files } = useStore();
  const isDark = theme !== 'light' && theme !== 'high-contrast-light';

  const [activeTab, setActiveTab] = useState<TabType>('tasks');
  const [tasks, setTasks] = useState<Task[]>([]);
  const [templates] = useState<TaskTemplate[]>(taskRunnerService.getTaskTemplates());
  const [executions, setExecutions] = useState<TaskExecution[]>([]);
  const [activeExecution, setActiveExecution] = useState<TaskExecution | null>(null);
  const [testRun, setTestRun] = useState<TestRun | null>(null);
  const [coverage, setCoverage] = useState<CoverageReport | null>(null);
  const [automationRules, setAutomationRules] = useState<AutomationRule[]>(taskRunnerService.getAutomationRules());
  const [selectedFramework, setSelectedFramework] = useState<TestFramework>('jest');
  const [showTemplates, setShowTemplates] = useState(false);
  const [taskFilter, setTaskFilter] = useState('');
  const [testFilter, setTestFilter] = useState('');
  const [expandedSuites, setExpandedSuites] = useState<Set<string>>(new Set());
  const [runWithCoverage, setRunWithCoverage] = useState(false);
  const outputRef = useRef<HTMLDivElement>(null);

  const frameworks = taskRunnerService.getTestFrameworks();

  // Feed workspace files to task runner for detection
  useEffect(() => {
    taskRunnerService.setWorkspaceFiles(files);
  }, [files]);

  useEffect(() => {
    // Set initial tasks
    setTasks(taskRunnerService.getAllTasks());

    const unsubscribe = taskRunnerService.on('*', (event) => {
      switch (event.type) {
        case 'tasksChanged':
          setTasks([...taskRunnerService.getAllTasks()]);
          break;
        case 'taskStart':
        case 'taskEnd':
          setExecutions([...taskRunnerService.getExecutionHistory()]);
          setActiveExecution(event.data.execution);
          break;
        case 'taskOutput':
          setActiveExecution(prev => prev ? { ...prev } : null);
          break;
        case 'testStart':
        case 'testEnd':
        case 'testResult':
          setTestRun(event.data.testRun ? { ...event.data.testRun } : null);
          if (event.data.testRun?.coverage) {
            setCoverage(event.data.testRun.coverage);
          }
          break;
      }
    });

    return () => { unsubscribe(); };
  }, []);

  useEffect(() => {
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
  }, [activeExecution?.output.length]);

  const tabs: { id: TabType; label: string; icon: string }[] = [
    { id: 'tasks', label: 'Tasks', icon: '📋' },
    { id: 'tests', label: 'Tests', icon: '🧪' },
    { id: 'coverage', label: 'Coverage', icon: '📊' },
    { id: 'automation', label: 'Automation', icon: '⚙️' },
    { id: 'history', label: 'History', icon: '📜' },
  ];

  const handleRunTask = async (taskId: string) => {
    try {
      await taskRunnerService.executeTask(taskId);
    } catch (error) {
      log.error('Task execution failed:', error);
    }
  };

  const handleCancelTask = (executionId: string) => {
    taskRunnerService.cancelTask(executionId);
  };

  const handleRunTests = async () => {
    try {
      await taskRunnerService.runTests(selectedFramework, {
        coverage: runWithCoverage,
        filter: testFilter || undefined,
      });
    } catch (error) {
      log.error('Test run failed:', error);
    }
  };

  const handleCancelTests = () => {
    if (testRun) taskRunnerService.cancelTestRun(testRun.id);
  };

  const handleRerunFailed = async () => {
    await taskRunnerService.rerunFailedTests();
  };

  const toggleSuiteExpand = (suiteId: string) => {
    const newExpanded = new Set(expandedSuites);
    if (newExpanded.has(suiteId)) newExpanded.delete(suiteId);
    else newExpanded.add(suiteId);
    setExpandedSuites(newExpanded);
  };

  const filteredTasks = tasks.filter(task =>
    task.name.toLowerCase().includes(taskFilter.toLowerCase()) ||
    task.type.toLowerCase().includes(taskFilter.toLowerCase())
  );

  const tasksByGroup = filteredTasks.reduce((acc, task) => {
    const group = task.group || 'other';
    if (!acc[group]) acc[group] = [];
    acc[group].push(task);
    return acc;
  }, {} as Record<string, Task[]>);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'running': return <span className="animate-spin">⏳</span>;
      case 'success':
      case 'passed':
      case 'completed': return <span className="text-green-400">✓</span>;
      case 'failed': return <span className="text-red-400">✗</span>;
      case 'cancelled': return <span className="text-yellow-400">⊘</span>;
      case 'skipped': return <span className="text-gray-400">○</span>;
      default: return <span className="text-gray-500">○</span>;
    }
  };

  const getCoverageColor = (percentage: number): string => {
    if (percentage >= 80) return 'text-green-400';
    if (percentage >= 60) return 'text-yellow-400';
    return 'text-red-400';
  };

  const getCoverageBarColor = (percentage: number): string => {
    if (percentage >= 80) return 'bg-green-500';
    if (percentage >= 60) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const renderTestCase = (test: TestCase, depth: number = 0) => (
    <div
      key={test.id}
      className={`flex items-center gap-2 py-1 px-2 text-xs ${isDark ? 'hover:bg-[#2a2d2e]' : 'hover:bg-gray-100'} ${test.status === 'failed' ? (isDark ? 'bg-red-900/20' : 'bg-red-50') : ''
        }`}
      style={{ paddingLeft: `${16 + depth * 16}px` }}
    >
      {getStatusIcon(test.status)}
      <span className={test.status === 'failed' ? 'text-red-400' : isDark ? 'text-gray-300' : 'text-gray-700'}>
        {test.name}
      </span>
      {test.duration !== undefined && (
        <span className="text-gray-500 ml-auto">{test.duration}ms</span>
      )}
    </div>
  );

  const renderTestSuite = (suite: TestSuite) => {
    const isExpanded = expandedSuites.has(suite.id);
    const passedCount = suite.tests.filter(t => t.status === 'passed').length;
    const failedCount = suite.tests.filter(t => t.status === 'failed').length;

    return (
      <div key={suite.id} className={`border-b ${isDark ? 'border-[#3c3c3c]' : 'border-gray-200'}`}>
        <div
          className={`flex items-center gap-2 py-2 px-2 cursor-pointer ${isDark ? 'hover:bg-[#2a2d2e]' : 'hover:bg-gray-100'} ${suite.status === 'failed' ? (isDark ? 'bg-red-900/10' : 'bg-red-50') : ''
            }`}
          onClick={() => toggleSuiteExpand(suite.id)}
        >
          <span className="text-gray-400 text-xs">
            {isExpanded ? '▼' : '▶'}
          </span>
          {getStatusIcon(suite.status)}
          <span className={`text-sm font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>{suite.name}</span>
          <span className="text-xs ml-auto">
            {passedCount > 0 && <span className="text-green-400 mr-2">{passedCount} passed</span>}
            {failedCount > 0 && <span className="text-red-400">{failedCount} failed</span>}
          </span>
          {suite.duration !== undefined && (
            <span className="text-gray-500 text-xs">{suite.duration}ms</span>
          )}
        </div>
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              {suite.tests.map(test => renderTestCase(test, 1))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  };

  const renderCoverageBar = (percentage: number, label: string) => (
    <div className="mb-3">
      <div className="flex justify-between text-xs mb-1">
        <span className={isDark ? 'text-gray-400' : 'text-gray-600'}>{label}</span>
        <span className={getCoverageColor(percentage)}>{percentage}%</span>
      </div>
      <div className={`h-2 rounded-full overflow-hidden ${isDark ? 'bg-[#3c3c3c]' : 'bg-gray-200'}`}>
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 0.5 }}
          className={`h-full ${getCoverageBarColor(percentage)}`}
        />
      </div>
    </div>
  );

  const taskTypeIcon = (type: string) => {
    switch (type) {
      case 'build': return '🔨';
      case 'test': return '🧪';
      case 'lint': return '🔍';
      case 'watch': return '👁️';
      case 'deploy': return '🚀';
      case 'install': return '📦';
      case 'clean': return '🗑️';
      case 'format': return '✨';
      default: return '⚡';
    }
  };

  return (
    <div className={`h-full flex flex-col ${isDark ? 'bg-[#1e1e1e] text-white' : 'bg-white text-gray-900'}`}>
      {/* Header */}
      <div className={`flex items-center gap-2 px-3 py-2 border-b ${isDark ? 'bg-[#252526] border-[#3c3c3c]' : 'bg-gray-50 border-gray-200'}`}>
        <span className="text-lg">🚀</span>
        <span className="font-medium text-sm">Task Runner</span>
        {tasks.length > 0 && (
          <span className={`text-[10px] px-1.5 py-0.5 rounded ${isDark ? 'bg-blue-600/20 text-blue-400' : 'bg-blue-100 text-blue-600'}`}>
            {tasks.length} detected
          </span>
        )}
        {activeExecution?.status === 'running' && (
          <span className="ml-auto flex items-center gap-1 text-xs text-blue-400">
            <span className="animate-spin">⏳</span>
            Running...
          </span>
        )}
      </div>

      {/* Tabs — scrollable */}
      <div className={`flex overflow-x-auto debug-tabs-scroll border-b ${isDark ? 'border-[#3c3c3c] bg-[#252526]' : 'border-gray-200 bg-gray-50'}`}>
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-1 px-3 py-1.5 text-xs font-medium whitespace-nowrap shrink-0 transition-colors ${activeTab === tab.id
                ? isDark ? 'text-white border-b-2 border-blue-500 bg-[#1e1e1e]' : 'text-blue-600 border-b-2 border-blue-500 bg-white'
                : isDark ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-gray-900'
              }`}
          >
            <span>{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-hidden flex flex-col">
        {/* Tasks Tab */}
        {activeTab === 'tasks' && (
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Task Search & Actions */}
            <div className={`p-2 border-b flex gap-2 ${isDark ? 'border-[#3c3c3c]' : 'border-gray-200'}`}>
              <input
                type="text"
                value={taskFilter}
                onChange={(e) => setTaskFilter(e.target.value)}
                placeholder="Filter tasks..."
                className={`flex-1 text-xs px-2 py-1 rounded outline-none focus:ring-1 focus:ring-blue-500 ${isDark ? 'bg-[#3c3c3c] text-white' : 'bg-gray-100 text-gray-900'}`}
              />
              <button
                onClick={() => setShowTemplates(!showTemplates)}
                className="px-2 py-1 bg-blue-600 hover:bg-blue-700 rounded text-xs text-white"
              >
                + Add Task
              </button>
            </div>

            {/* Task Templates Dropdown */}
            <AnimatePresence>
              {showTemplates && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className={`overflow-hidden border-b ${isDark ? 'bg-[#252526] border-[#3c3c3c]' : 'bg-gray-50 border-gray-200'}`}
                >
                  <div className="p-2 max-h-48 overflow-auto">
                    <div className={`text-xs mb-2 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Quick Add Templates</div>
                    <div className="grid grid-cols-2 gap-1">
                      {templates.slice(0, 12).map(template => (
                        <button
                          key={template.id}
                          onClick={() => {
                            taskRunnerService.addTask({
                              id: `${template.id}-${Date.now()}`,
                              name: template.name,
                              type: template.type,
                              command: template.command,
                              args: template.args,
                              description: template.description,
                              group: template.category,
                              source: 'template',
                            });
                            setShowTemplates(false);
                          }}
                          className={`flex items-center gap-2 p-1.5 rounded text-xs text-left ${isDark ? 'bg-[#3c3c3c] hover:bg-[#4c4c4c]' : 'bg-gray-100 hover:bg-gray-200'}`}
                        >
                          <span>{template.icon}</span>
                          <span className="truncate">{template.name}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Task List */}
            <div className="flex-1 overflow-auto">
              {Object.keys(tasksByGroup).length === 0 ? (
                <div className={`p-6 text-center text-sm ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                  <p className="text-2xl mb-2">📋</p>
                  <p className="font-medium mb-1">No tasks detected</p>
                  <p className="text-xs">Open a project with package.json, Makefile, or Cargo.toml to auto-detect tasks, or use "+ Add Task" above.</p>
                </div>
              ) : (
                Object.entries(tasksByGroup).map(([group, groupTasks]) => (
                  <div key={group}>
                    <div className={`flex items-center gap-2 px-2 py-1.5 text-xs font-medium sticky top-0 ${isDark ? 'bg-[#2d2d2d] text-gray-300' : 'bg-gray-100 text-gray-700'}`}>
                      <span className="capitalize">{group}</span>
                      <span className={isDark ? 'text-gray-600' : 'text-gray-400'}>({groupTasks.length})</span>
                    </div>
                    {groupTasks.map(task => (
                      <div
                        key={task.id}
                        className={`flex items-center gap-2 px-2 py-1.5 group ${isDark ? 'hover:bg-[#2a2d2e]' : 'hover:bg-gray-50'}`}
                      >
                        <span className="text-gray-500">{taskTypeIcon(task.type)}</span>
                        <div className="flex-1 min-w-0">
                          <div className={`text-sm truncate ${isDark ? 'text-white' : 'text-gray-900'}`}>{task.name}</div>
                          {task.description && (
                            <div className={`text-xs truncate ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>{task.description}</div>
                          )}
                        </div>
                        {task.source === 'workspace' && (
                          <span className={`text-[9px] px-1 py-0.5 rounded ${isDark ? 'bg-green-900/30 text-green-400' : 'bg-green-100 text-green-600'}`}>ws</span>
                        )}
                        <button
                          onClick={() => handleRunTask(task.id)}
                          className={`opacity-0 group-hover:opacity-100 p-1 rounded text-green-400 text-xs ${isDark ? 'hover:bg-green-600/20' : 'hover:bg-green-100'}`}
                          title="Run task"
                        >
                          ▶
                        </button>
                      </div>
                    ))}
                  </div>
                ))
              )}
            </div>

            {/* Task Output */}
            {activeExecution && (
              <div className={`h-48 border-t flex flex-col ${isDark ? 'border-[#3c3c3c]' : 'border-gray-200'}`}>
                <div className={`flex items-center justify-between px-2 py-1 border-b ${isDark ? 'bg-[#252526] border-[#3c3c3c]' : 'bg-gray-50 border-gray-200'}`}>
                  <div className="flex items-center gap-2 text-xs">
                    {getStatusIcon(activeExecution.status)}
                    <span className={isDark ? 'text-white' : 'text-gray-900'}>{activeExecution.task.name}</span>
                  </div>
                  {activeExecution.status === 'running' && (
                    <button
                      onClick={() => handleCancelTask(activeExecution.id)}
                      className="text-red-400 hover:text-red-300 text-xs"
                    >
                      Cancel
                    </button>
                  )}
                </div>
                <div
                  ref={outputRef}
                  className={`flex-1 overflow-auto p-2 font-mono text-xs ${isDark ? 'bg-[#1e1e1e]' : 'bg-gray-50'}`}
                >
                  {activeExecution.output.map((line, i) => (
                    <div key={i} className={
                      line.includes('✓') ? 'text-green-400'
                        : line.includes('✗') || line.includes('FAIL') ? 'text-red-400'
                          : isDark ? 'text-gray-300' : 'text-gray-700'
                    }>
                      {line}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tests Tab */}
        {activeTab === 'tests' && (
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className={`p-2 border-b space-y-2 ${isDark ? 'border-[#3c3c3c]' : 'border-gray-200'}`}>
              <div className="flex gap-2">
                <select
                  value={selectedFramework}
                  onChange={(e) => setSelectedFramework(e.target.value as TestFramework)}
                  className={`flex-1 text-xs px-2 py-1.5 rounded outline-none ${isDark ? 'bg-[#3c3c3c] text-white' : 'bg-gray-100 text-gray-900'}`}
                >
                  {Object.entries(frameworks).map(([key, fw]) => (
                    <option key={key} value={key}>
                      {fw.icon} {fw.name}
                    </option>
                  ))}
                </select>
                <button
                  onClick={handleRunTests}
                  disabled={testRun?.status === 'running'}
                  className="px-3 py-1.5 bg-green-600 hover:bg-green-700 disabled:opacity-50 rounded text-xs font-medium flex items-center gap-1 text-white"
                >
                  {testRun?.status === 'running' ? (
                    <><span className="animate-spin">⏳</span> Running...</>
                  ) : (
                    <>▶ Run Tests</>
                  )}
                </button>
                {testRun?.status === 'running' && (
                  <button
                    onClick={handleCancelTests}
                    className="px-2 py-1.5 bg-red-600 hover:bg-red-700 rounded text-xs text-white"
                  >
                    Stop
                  </button>
                )}
              </div>
              <div className="flex gap-2 items-center">
                <input
                  type="text"
                  value={testFilter}
                  onChange={(e) => setTestFilter(e.target.value)}
                  placeholder="Filter tests..."
                  className={`flex-1 text-xs px-2 py-1 rounded outline-none ${isDark ? 'bg-[#3c3c3c] text-white' : 'bg-gray-100 text-gray-900'}`}
                />
                <label className={`flex items-center gap-1 text-xs cursor-pointer ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                  <input
                    type="checkbox"
                    checked={runWithCoverage}
                    onChange={(e) => setRunWithCoverage(e.target.checked)}
                    className="w-3 h-3"
                  />
                  Coverage
                </label>
                {testRun && testRun.summary.failed > 0 && (
                  <button
                    onClick={handleRerunFailed}
                    className="px-2 py-1 bg-yellow-600 hover:bg-yellow-700 rounded text-xs text-white"
                  >
                    Rerun Failed
                  </button>
                )}
              </div>
            </div>

            {/* Test Summary */}
            {testRun && (
              <div className={`px-2 py-2 border-b ${isDark ? 'bg-[#252526] border-[#3c3c3c]' : 'bg-gray-50 border-gray-200'}`}>
                <div className="flex items-center gap-4 text-xs">
                  <span className={isDark ? 'text-gray-400' : 'text-gray-600'}>
                    Tests: <span className={isDark ? 'text-white' : 'text-gray-900'}>{testRun.summary.total}</span>
                  </span>
                  <span className="text-green-400">✓ {testRun.summary.passed}</span>
                  {testRun.summary.failed > 0 && (
                    <span className="text-red-400">✗ {testRun.summary.failed}</span>
                  )}
                  {testRun.summary.skipped > 0 && (
                    <span className="text-gray-400">○ {testRun.summary.skipped}</span>
                  )}
                  <span className="text-gray-500 ml-auto">{testRun.summary.duration}ms</span>
                </div>
                {testRun.summary.total > 0 && (
                  <div className={`mt-2 h-1.5 rounded-full overflow-hidden flex ${isDark ? 'bg-[#3c3c3c]' : 'bg-gray-200'}`}>
                    <div className="bg-green-500 transition-all" style={{ width: `${(testRun.summary.passed / testRun.summary.total) * 100}%` }} />
                    <div className="bg-red-500 transition-all" style={{ width: `${(testRun.summary.failed / testRun.summary.total) * 100}%` }} />
                    <div className="bg-gray-500 transition-all" style={{ width: `${(testRun.summary.skipped / testRun.summary.total) * 100}%` }} />
                  </div>
                )}
              </div>
            )}

            {/* Test Results */}
            <div className="flex-1 overflow-auto">
              {testRun ? (
                testRun.suites.length > 0 ? (
                  testRun.suites.map(suite => renderTestSuite(suite))
                ) : (
                  <div className={`p-4 text-center text-sm ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                    No test files found in workspace
                  </div>
                )
              ) : (
                <div className={`p-4 text-center text-sm ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                  Select a test framework and click "Run Tests" to start
                </div>
              )}
            </div>
          </div>
        )}

        {/* Coverage Tab */}
        {activeTab === 'coverage' && (
          <div className="flex-1 overflow-auto p-3">
            {coverage ? (
              <>
                <div className="mb-4">
                  <h3 className={`text-sm font-medium mb-3 ${isDark ? 'text-white' : 'text-gray-900'}`}>Coverage Summary</h3>
                  {renderCoverageBar(coverage.summary.lines.percentage, 'Lines')}
                  {renderCoverageBar(coverage.summary.statements.percentage, 'Statements')}
                  {renderCoverageBar(coverage.summary.functions.percentage, 'Functions')}
                  {renderCoverageBar(coverage.summary.branches.percentage, 'Branches')}
                </div>
                <div>
                  <h3 className={`text-sm font-medium mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>File Coverage</h3>
                  <div className="space-y-1">
                    {coverage.files.map(file => (
                      <div
                        key={file.file}
                        className={`flex items-center gap-2 p-2 rounded text-xs ${isDark ? 'bg-[#252526]' : 'bg-gray-50'}`}
                      >
                        <span className="text-[#4fc1ff] flex-1 truncate">{file.file}</span>
                        <span className={getCoverageColor(file.lines.percentage)}>
                          {file.lines.percentage}%
                        </span>
                        <div className={`w-16 h-1.5 rounded-full overflow-hidden ${isDark ? 'bg-[#3c3c3c]' : 'bg-gray-200'}`}>
                          <div
                            className={`h-full ${getCoverageBarColor(file.lines.percentage)}`}
                            style={{ width: `${file.lines.percentage}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            ) : (
              <div className={`text-center text-sm py-8 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                <p className="text-2xl mb-2">📊</p>
                <p>No coverage data available</p>
                <p className="text-xs mt-2">Run tests with coverage enabled to see results</p>
              </div>
            )}
          </div>
        )}

        {/* Automation Tab */}
        {activeTab === 'automation' && (
          <div className="flex-1 overflow-auto">
            <div className={`p-2 border-b ${isDark ? 'border-[#3c3c3c]' : 'border-gray-200'}`}>
              <button
                onClick={() => {
                  const rule: AutomationRule = {
                    id: `rule-${Date.now()}`,
                    name: 'New Rule',
                    enabled: true,
                    trigger: { type: 'fileChange', pattern: '**/*.{ts,tsx}' },
                    tasks: [],
                  };
                  taskRunnerService.addAutomationRule(rule);
                  setAutomationRules([...taskRunnerService.getAutomationRules()]);
                }}
                className={`w-full px-3 py-2 rounded text-xs flex items-center justify-center gap-2 ${isDark ? 'bg-[#3c3c3c] hover:bg-[#4c4c4c]' : 'bg-gray-100 hover:bg-gray-200'}`}
              >
                <span>+</span>
                <span>Add Automation Rule</span>
              </button>
            </div>

            {automationRules.length > 0 ? (
              <div className="p-2 space-y-2">
                {automationRules.map(rule => (
                  <div
                    key={rule.id}
                    className={`p-3 rounded border ${rule.enabled
                        ? isDark ? 'bg-[#252526] border-green-500/30' : 'bg-white border-green-300'
                        : isDark ? 'bg-[#252526] border-[#3c3c3c]' : 'bg-white border-gray-200'
                      }`}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <input
                        type="checkbox"
                        checked={rule.enabled}
                        onChange={() => {
                          taskRunnerService.toggleAutomationRule(rule.id);
                          setAutomationRules([...taskRunnerService.getAutomationRules()]);
                        }}
                        className="w-4 h-4"
                      />
                      <span className={`text-sm font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>{rule.name}</span>
                      <button
                        onClick={() => {
                          taskRunnerService.removeAutomationRule(rule.id);
                          setAutomationRules([...taskRunnerService.getAutomationRules()]);
                        }}
                        className="ml-auto text-gray-500 hover:text-red-400 text-xs"
                      >
                        ✕
                      </button>
                    </div>
                    <div className="text-xs">
                      <span className={isDark ? 'text-gray-400' : 'text-gray-500'}>Trigger: </span>
                      <span className="text-blue-400">{rule.trigger.type}</span>
                      {rule.trigger.pattern && (
                        <span className="text-gray-500 ml-1">({rule.trigger.pattern})</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className={`p-4 text-center text-sm ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                <p>No automation rules defined</p>
                <p className="text-xs mt-2">Add rules to automate tasks on file changes, git hooks, etc.</p>
              </div>
            )}

            {/* Quick Templates */}
            <div className={`p-2 border-t mt-4 ${isDark ? 'border-[#3c3c3c]' : 'border-gray-200'}`}>
              <div className={`text-xs mb-2 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Quick Templates</div>
              <div className="space-y-1">
                {[
                  { name: 'Lint on Save', trigger: { type: 'fileChange' as const, pattern: '**/*.{ts,tsx,js,jsx}' }, tasks: ['eslint'] },
                  { name: 'Test on Change', trigger: { type: 'fileChange' as const, pattern: '**/*.test.{ts,tsx}' }, tasks: ['jest'] },
                  { name: 'Format Pre-Commit', trigger: { type: 'gitHook' as const, gitEvent: 'pre-commit' as const }, tasks: ['prettier'] },
                  { name: 'Build on Push', trigger: { type: 'gitHook' as const, gitEvent: 'pre-push' as const }, tasks: ['npm-build'] },
                ].map((template, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      const rule: AutomationRule = {
                        id: `rule-${Date.now()}`,
                        name: template.name,
                        enabled: true,
                        trigger: template.trigger,
                        tasks: template.tasks,
                      };
                      taskRunnerService.addAutomationRule(rule);
                      setAutomationRules([...taskRunnerService.getAutomationRules()]);
                    }}
                    className={`w-full flex items-center gap-2 p-2 rounded text-xs text-left ${isDark ? 'bg-[#3c3c3c] hover:bg-[#4c4c4c]' : 'bg-gray-100 hover:bg-gray-200'}`}
                  >
                    <span className="text-blue-400">+</span>
                    <span className={isDark ? 'text-white' : 'text-gray-900'}>{template.name}</span>
                    <span className="text-gray-500 ml-auto">{template.trigger.type}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* History Tab */}
        {activeTab === 'history' && (
          <div className="flex-1 overflow-auto">
            <div className={`p-2 border-b flex justify-between items-center ${isDark ? 'border-[#3c3c3c]' : 'border-gray-200'}`}>
              <span className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                {executions.length} execution{executions.length !== 1 ? 's' : ''}
              </span>
              <button
                onClick={() => {
                  taskRunnerService.clearHistory();
                  setExecutions([...taskRunnerService.getExecutionHistory()]);
                }}
                className="text-xs text-gray-500 hover:text-red-400"
              >
                Clear History
              </button>
            </div>
            {executions.length > 0 ? (
              <div>
                {executions.map(exec => (
                  <div
                    key={exec.id}
                    onClick={() => setActiveExecution(exec)}
                    className={`flex items-center gap-2 px-2 py-2 cursor-pointer border-b ${activeExecution?.id === exec.id
                        ? isDark ? 'bg-[#094771]' : 'bg-blue-50'
                        : isDark ? 'hover:bg-[#2a2d2e]' : 'hover:bg-gray-50'
                      } ${isDark ? 'border-[#3c3c3c]' : 'border-gray-200'}`}
                  >
                    {getStatusIcon(exec.status)}
                    <div className="flex-1 min-w-0">
                      <div className={`text-sm truncate ${isDark ? 'text-white' : 'text-gray-900'}`}>{exec.task.name}</div>
                      <div className="text-xs text-gray-500">
                        {exec.startTime.toLocaleTimeString()}
                        {exec.endTime && ` • ${((exec.endTime.getTime() - exec.startTime.getTime()) / 1000).toFixed(1)}s`}
                      </div>
                    </div>
                    {exec.exitCode !== undefined && (
                      <span className={`text-xs ${exec.exitCode === 0 ? 'text-green-400' : 'text-red-400'}`}>
                        exit {exec.exitCode}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className={`p-4 text-center text-sm ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                No task execution history
              </div>
            )}
          </div>
        )}
      </div>

      {/* Status Bar */}
      <div className={`flex items-center justify-between px-3 py-1 border-t text-xs ${isDark ? 'bg-[#252526] border-[#3c3c3c] text-gray-400' : 'bg-gray-50 border-gray-200 text-gray-500'}`}>
        <div className="flex items-center gap-3">
          <span>Tasks: {tasks.length}</span>
          {testRun && (
            <span>
              Tests: {testRun.summary.passed}/{testRun.summary.total}
            </span>
          )}
          {coverage && (
            <span className={getCoverageColor(coverage.summary.lines.percentage)}>
              Coverage: {coverage.summary.lines.percentage}%
            </span>
          )}
        </div>
        <div className="text-gray-500">
          {selectedFramework && frameworks[selectedFramework]?.icon} {frameworks[selectedFramework]?.name}
        </div>
      </div>
    </div>
  );
};

export default TaskRunnerPanel;
