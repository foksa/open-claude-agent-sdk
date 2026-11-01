/**
 * Runtime constants and classes the official SDK exports. Defined here so
 * the package has no runtime dependency on `@anthropic-ai/claude-agent-sdk`;
 * each is typed against the official declaration so drift fails typecheck,
 * and tests/unit/constants.test.ts checks the values match exactly.
 */

type Official = typeof import('@anthropic-ai/claude-agent-sdk');

/**
 * Version of @anthropic-ai/claude-agent-sdk this package mirrors. Sent to the
 * CLI as CLAUDE_AGENT_SDK_VERSION, as the official SDK does, so the CLI sees
 * an SDK host of the protocol version we implement. Kept equal to the pinned
 * devDependency (tests/unit/index.test.ts).
 */
export const COMPATIBLE_SDK_VERSION = '0.3.316';

/** Thrown when a query is aborted via its AbortController. */
export class AbortError extends Error {}

export const EXIT_REASONS: Official['EXIT_REASONS'] = [
  'clear',
  'resume',
  'logout',
  'prompt_input_exit',
  'other',
];

export const HOOK_EVENTS: Official['HOOK_EVENTS'] = [
  'PreToolUse',
  'PostToolUse',
  'PostToolUseFailure',
  'PostToolBatch',
  'Notification',
  'UserPromptSubmit',
  'UserPromptExpansion',
  'SessionStart',
  'SessionEnd',
  'Stop',
  'StopFailure',
  'SubagentStart',
  'SubagentStop',
  'PreCompact',
  'PostCompact',
  'PreModelSwitch',
  'PostModelSwitch',
  'PermissionRequest',
  'PermissionDenied',
  'Setup',
  'TeammateIdle',
  'TaskCreated',
  'TaskCompleted',
  'Elicitation',
  'ElicitationResult',
  'ConfigChange',
  'WorktreeCreate',
  'WorktreeRemove',
  'InstructionsLoaded',
  'CwdChanged',
  'FileChanged',
  'DirectoryAdded',
  'MessageDisplay',
];

export const SYSTEM_PROMPT_DYNAMIC_BOUNDARY: Official['SYSTEM_PROMPT_DYNAMIC_BOUNDARY'] =
  '__SYSTEM_PROMPT_DYNAMIC_BOUNDARY__';

export const ORG_POLICY_LIMIT_PREFIXES: Official['ORG_POLICY_LIMIT_PREFIXES'] = [
  'This service is disabled for your org',
];

export const USAGE_LIMIT_ERROR_PREFIXES: Official['USAGE_LIMIT_ERROR_PREFIXES'] = [
  "You've hit your",
  "You've reached your",
  "You're out of usage credits",
  'Your org is out of usage · add funds to continue',
  'Your org is out of usage · contact your admin',
  "Your seat type doesn't include usage credits",
  "Your seat type doesn't include usage",
  'Your usage allocation has been disabled by your admin',
  "Your group's usage limit is set to $0",
  'Fable 5 requires usage credits',
  "You're out of extra usage",
  "Your seat type doesn't include extra usage",
];

export const USAGE_TRANSITION_PREFIXES: Official['USAGE_TRANSITION_PREFIXES'] = [
  "You're now using usage credits",
  "You're now using your usage allocation",
  'Now using your usage allocation',
  'Now using usage credits',
  'Now using credits',
  "You're now using extra usage",
  'Now using extra usage',
];

export const USAGE_WARNING_PREFIXES: Official['USAGE_WARNING_PREFIXES'] = [
  "You've used",
  "You're close to",
];

/** v0.3.301: public built-in tool names, as permission rules spell them. */
export const BUILTIN_TOOL_NAMES: Official['BUILTIN_TOOL_NAMES'] = [
  'Agent',
  'Artifact',
  'AskUserQuestion',
  'Bash',
  'ClaudeDesign',
  'CronCreate',
  'CronDelete',
  'CronList',
  'Edit',
  'EndConversation',
  'EnterPlanMode',
  'EnterWorktree',
  'ExitPlanMode',
  'ExitWorktree',
  'Glob',
  'Grep',
  'ListAgents',
  'ListMcpResourcesTool',
  'LSP',
  'Monitor',
  'NotebookEdit',
  'OfferChromeSetup',
  'PowerShell',
  'Projects',
  'propose_skills',
  'ProposeGoal',
  'PushNotification',
  'Read',
  'ReadMcpResourceDirTool',
  'ReadMcpResourceTool',
  'ReadNotifications',
  'RemoteTrigger',
  'ReportFindings',
  'ScheduleWakeup',
  'SendFeedback',
  'SendMessage',
  'SendUserFile',
  'SendUserMessage',
  'ShareOnboardingGuide',
  'ShowOnboardingRolePicker',
  'Skill',
  'SubagentHandback',
  'TaskCreate',
  'TaskGet',
  'TaskList',
  'TaskStop',
  'TaskUpdate',
  'TodoWrite',
  'ToolSearch',
  'WaitForMcpServers',
  'WebFetch',
  'WebSearch',
  'Workflow',
  'Write',
];

/** v0.3.301: former tool names still accepted, mapped to the current name. */
export const LEGACY_TOOL_NAME_ALIASES: Official['LEGACY_TOOL_NAME_ALIASES'] = {
  Task: 'Agent',
  KillShell: 'TaskStop',
  KillBash: 'TaskStop',
  ListPeers: 'ListAgents',
  Brief: 'SendUserMessage',
  ListMcpResources: 'ListMcpResourcesTool',
  ReadMcpResource: 'ReadMcpResourceTool',
  ReadMcpResourceDir: 'ReadMcpResourceDirTool',
};
