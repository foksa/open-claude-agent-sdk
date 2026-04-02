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
  SDKAPIRetryMessage,
  SDKAssistantMessage,
  SDKAssistantMessageError,
  SDKAuthStatusMessage,
  SDKCompactBoundaryMessage,
  SDKControlInitializeResponse,
  SDKControlRequest,
  SDKControlResponse,
  SDKDeferredToolUse,
  SDKElicitationCompleteMessage,
  SDKFilesPersistedEvent,
  SDKHookProgressMessage,
  SDKHookResponseMessage,
  SDKHookStartedMessage,
  SDKLocalCommandOutputMessage,
  SDKPartialAssistantMessage,
  SDKPromptSuggestionMessage,
  SDKRateLimitEvent,
  SDKRateLimitInfo,
  SDKResultError,
  SDKResultMessage,
  SDKResultSuccess,
  SDKSessionStateChangedMessage,
  SDKStatus,
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

// ============================================================================
// PERMISSION & CALLBACK TYPES
// ============================================================================

export type {
  CanUseTool,
  PermissionBehavior,
  PermissionDecisionClassification,
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
  CwdChangedHookInput,
  CwdChangedHookSpecificOutput,
  ElicitationHookInput,
  ElicitationHookSpecificOutput,
  ElicitationResultHookInput,
  ElicitationResultHookSpecificOutput,
  FileChangedHookInput,
  FileChangedHookSpecificOutput,
  HookCallback,
  HookCallbackMatcher,
  HookEvent,
  HookInput,
  HookJSONOutput,
  HookPermissionDecision,
  InstructionsLoadedHookInput,
  NotificationHookInput,
  NotificationHookSpecificOutput,
  PermissionDeniedHookInput,
  PermissionDeniedHookSpecificOutput,
  PermissionRequestHookInput,
  PermissionRequestHookSpecificOutput,
  PostCompactHookInput,
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
  StopFailureHookInput,
  StopHookInput,
  SubagentStartHookInput,
  SubagentStartHookSpecificOutput,
  SubagentStopHookInput,
  SyncHookJSONOutput,
  TaskCompletedHookInput,
  TaskCreatedHookInput,
  TeammateIdleHookInput,
  UserPromptSubmitHookInput,
  UserPromptSubmitHookSpecificOutput,
  WorktreeCreateHookInput,
  WorktreeCreateHookSpecificOutput,
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
  AgentInfo,
  AgentMcpServerSpec,
  SdkPluginConfig,
} from '@anthropic-ai/claude-agent-sdk';

// ============================================================================
// SANDBOX & SETTINGS TYPES
// ============================================================================

export type {
  ConfigScope,
  SandboxFilesystemConfig,
  SandboxIgnoreViolations,
  SandboxNetworkConfig,
  SandboxSettings,
  SettingSource,
  Settings,
} from '@anthropic-ai/claude-agent-sdk';

// ============================================================================
// OUTPUT FORMAT TYPES
// ============================================================================

export type {
  BaseOutputFormat,
  JsonSchemaOutputFormat,
  OutputFormat,
  OutputFormatType,
} from '@anthropic-ai/claude-agent-sdk';

// ============================================================================
// SESSION TYPES
// ============================================================================

export type {
  ForkSessionOptions,
  ForkSessionResult,
  GetSessionInfoOptions,
  GetSessionMessagesOptions,
  GetSubagentMessagesOptions,
  ListSessionsOptions,
  ListSubagentsOptions,
  SDKSession,
  SDKSessionInfo,
  SDKSessionOptions,
  SessionMessage,
  SessionMutationOptions,
} from '@anthropic-ai/claude-agent-sdk';

// ============================================================================
// MISC TYPES
// ============================================================================

export type {
  ApiKeySource,
  EffortLevel,
  ElicitationRequest,
  ElicitationResult,
  ExitReason,
  FastModeState,
  OnElicitation,
  PromptRequest,
  PromptRequestOption,
  PromptResponse,
  RewindFilesResult,
  SDKControlGetContextUsageResponse,
  SDKControlReloadPluginsResponse,
  SDKPermissionDenial,
  SdkBeta,
  SlashCommand,
  ThinkingAdaptive,
  ThinkingConfig,
  ThinkingDisabled,
  ThinkingEnabled,
  ToolConfig,
} from '@anthropic-ai/claude-agent-sdk';

export { EXIT_REASONS, HOOK_EVENTS } from '@anthropic-ai/claude-agent-sdk';

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
