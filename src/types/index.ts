/**
 * Type re-exports from official Claude Agent SDK
 *
 * Ensures 100% type compatibility with the official SDK while
 * providing our own lightweight implementation.
 */

// ============================================================================
// CORE TYPES (5 items) - MUST HAVE
// ============================================================================

/**
 * Union of all SDK message types
 */
/**
 * Query configuration options
 */
/**
 * Permission modes for controlling tool execution
 */
/** Query interface (AsyncGenerator with control methods) */
export type {
  Options,
  PermissionMode,
  Query,
  SDKMessage,
} from '@anthropic-ai/claude-agent-sdk';

// ============================================================================
// MESSAGE TYPES (17 items) - For consuming output
// ============================================================================

export type {
  SDKAssistantMessage,
  SDKAuthStatusMessage,
  SDKCompactBoundaryMessage,
  SDKFilesPersistedEvent,
  SDKHookProgressMessage,
  SDKHookResponseMessage,
  SDKHookStartedMessage,
  SDKPartialAssistantMessage,
  SDKResultError,
  SDKResultMessage,
  SDKResultSuccess,
  SDKStatusMessage,
  SDKSystemMessage,
  SDKTaskNotificationMessage,
  SDKTaskProgressMessage,
  SDKTaskStartedMessage,
  SDKToolProgressMessage,
  SDKToolUseSummaryMessage,
  SDKUserMessage,
  SDKUserMessageReplay,
} from '@anthropic-ai/claude-agent-sdk';

/**
 * Rate limit event — emitted when the API rate-limits a request.
 * (Referenced in SDKMessage union but not individually exported by official SDK)
 */
export type SDKRateLimitEvent = {
  type: 'rate_limit_event';
  session_id: string;
};

/**
 * Prompt suggestion — emitted after a turn when promptSuggestions is enabled.
 * Arrives after the `result` message; consumers must keep iterating to receive it.
 * (Referenced in SDKMessage union but not individually exported by official SDK)
 */
export type SDKPromptSuggestionMessage = {
  type: 'prompt_suggestion';
  suggestion: string;
  session_id: string;
};

// ============================================================================
// PERMISSION & CALLBACK TYPES
// ============================================================================

export type {
  CanUseTool,
  PermissionBehavior,
  PermissionResult,
  PermissionRuleValue,
  PermissionUpdate,
  PermissionUpdateDestination,
} from '@anthropic-ai/claude-agent-sdk';

// ============================================================================
// HOOK TYPES
// ============================================================================

export type {
  AsyncHookJSONOutput,
  BaseHookInput,
  ConfigChangeHookInput,
  HookCallback,
  HookCallbackMatcher,
  HookEvent,
  HookInput,
  HookJSONOutput,
  NotificationHookInput,
  NotificationHookSpecificOutput,
  PermissionRequestHookInput,
  PermissionRequestHookSpecificOutput,
  PostToolUseFailureHookInput,
  PostToolUseFailureHookSpecificOutput,
  PostToolUseHookInput,
  PostToolUseHookSpecificOutput,
  PreCompactHookInput,
  PreToolUseHookInput,
  PreToolUseHookSpecificOutput,
  SessionEndHookInput,
  SessionStartHookInput,
  SessionStartHookSpecificOutput,
  SetupHookInput,
  SetupHookSpecificOutput,
  StopHookInput,
  SubagentStartHookInput,
  SubagentStartHookSpecificOutput,
  SubagentStopHookInput,
  SyncHookJSONOutput,
  TaskCompletedHookInput,
  TeammateIdleHookInput,
  UserPromptSubmitHookInput,
  UserPromptSubmitHookSpecificOutput,
  WorktreeCreateHookInput,
  WorktreeRemoveHookInput,
} from '@anthropic-ai/claude-agent-sdk';

// ============================================================================
// MCP TYPES
// ============================================================================

export type {
  McpClaudeAIProxyServerConfig,
  McpHttpServerConfig,
  McpSdkServerConfig,
  McpSdkServerConfigWithInstance,
  McpServerConfig,
  McpServerConfigForProcessTransport,
  McpServerStatus,
  McpServerStatusConfig,
  McpSetServersResult,
  McpSSEServerConfig,
  McpStdioServerConfig,
  SdkMcpToolDefinition,
} from '@anthropic-ai/claude-agent-sdk';

/**
 * MCP utilities — re-exported from our own implementation (src/mcp.ts)
 */
export { createSdkMcpServer, tool } from '../mcp.ts';

// ============================================================================
// MODEL & USAGE TYPES
// ============================================================================

export type {
  AccountInfo,
  ModelInfo,
  ModelUsage,
  NonNullableUsage,
} from '@anthropic-ai/claude-agent-sdk';

// ============================================================================
// AGENT & PLUGIN TYPES
// ============================================================================

export type {
  AgentDefinition,
  AgentMcpServerSpec,
  SdkPluginConfig,
} from '@anthropic-ai/claude-agent-sdk';

// ============================================================================
// SANDBOX & SETTINGS TYPES
// ============================================================================

export type {
  ConfigScope,
  SandboxIgnoreViolations,
  SandboxNetworkConfig,
  SandboxSettings,
  SettingSource,
} from '@anthropic-ai/claude-agent-sdk';

// ============================================================================
// OUTPUT FORMAT TYPES
// ============================================================================

export type {
  JsonSchemaOutputFormat,
  OutputFormat,
  OutputFormatType,
} from '@anthropic-ai/claude-agent-sdk';

// ============================================================================
// SESSION TYPES
// ============================================================================

export type {
  GetSessionMessagesOptions,
  ListSessionsOptions,
  SDKSessionInfo,
  SessionMessage,
} from '@anthropic-ai/claude-agent-sdk';

// ============================================================================
// MISC TYPES
// ============================================================================

export type {
  ApiKeySource,
  ExitReason,
  RewindFilesResult,
  SDKPermissionDenial,
  SdkBeta,
  SlashCommand,
  ThinkingAdaptive,
  ThinkingConfig,
  ThinkingDisabled,
  ThinkingEnabled,
} from '@anthropic-ai/claude-agent-sdk';

export { EXIT_REASONS, HOOK_EVENTS } from '@anthropic-ai/claude-agent-sdk';

/**
 * Control protocol initialization response
 * (Not exported from official SDK, so we define it here)
 * Uses inline import() types to reference already-exported types
 */
export type SDKControlInitializeResponse = {
  commands: import('@anthropic-ai/claude-agent-sdk').SlashCommand[];
  output_style: string;
  available_output_styles: string[];
  models: import('@anthropic-ai/claude-agent-sdk').ModelInfo[];
  account: import('@anthropic-ai/claude-agent-sdk').AccountInfo;
};

// ============================================================================
// OPEN SDK EXTENSIONS (beyond official SDK)
// ============================================================================

/**
 * Extended Query type with convenience methods not in the official SDK.
 * Use this type instead of Query to access extra methods like
 * availableOutputStyles() and currentOutputStyle().
 */
export type ExtendedQuery = import('@anthropic-ai/claude-agent-sdk').Query & {
  availableOutputStyles(): Promise<string[]>;
  currentOutputStyle(): Promise<string>;
};

/**
 * Basic session info returned by listSessions().
 */
export interface SessionInfo {
  sessionId: string;
  displayName: string;
  createdAt: Date;
  lastModifiedAt: Date;
  messageCount: number;
}

/**
 * Rich session metadata returned by getSessionMetadata().
 */
export interface SessionMetadata extends SessionInfo {
  firstPrompt?: string;
  slug?: string;
  customTitle?: string;
  model?: string;
  gitBranch?: string;
  totalCost?: number;
  isAgent?: boolean;
  agentName?: string;
}

// ============================================================================
// ADVANCED TYPES (for completeness)
// ============================================================================

export type {
  SpawnedProcess,
  SpawnOptions,
  Transport,
} from '@anthropic-ai/claude-agent-sdk';
