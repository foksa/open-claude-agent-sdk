/**
 * Type re-exports from official Claude Agent SDK
 *
 * This ensures 100% type compatibility with the official SDK while
 * providing our own lightweight implementation.
 *
 * For Baby Steps 1-4, we implement one-shot queries only.
 * Control protocol types (SDKControlRequest, SDKControlResponse) will be
 * added in Baby Step 5 when implementing bidirectional communication.
 */

// ============================================================================
// CORE TYPES (5 items) - MUST HAVE
// ============================================================================

/**
 * Union of all SDK message types
 */
export type {
  SDKMessage,
} from '@anthropic-ai/claude-agent-sdk';

/**
 * Query configuration options
 */
export type {
  Options,
} from '@anthropic-ai/claude-agent-sdk';

/**
 * Permission modes for controlling tool execution
 */
export type {
  PermissionMode,
} from '@anthropic-ai/claude-agent-sdk';

/**
 * Query interface (AsyncGenerator with control methods)
 *
 * NOTE: For Baby Steps 1-4, control methods (interrupt, setPermissionMode, etc.)
 * are not yet implemented. Use with permissionMode: 'bypassPermissions' or 'plan'.
 */
export type {
  Query,
  OutputFormat,
  JsonSchemaOutputFormat,
} from '@anthropic-ai/claude-agent-sdk';

// ============================================================================
// MESSAGE TYPES (16 items) - For consuming output
// ============================================================================

export type {
  SDKAssistantMessage,
  SDKUserMessage,
  SDKSystemMessage,
  SDKResultMessage,
  SDKResultSuccess,
  SDKResultError,
  SDKStatusMessage,
  SDKPartialAssistantMessage,
  SDKUserMessageReplay,
  SDKCompactBoundaryMessage,
  SDKHookStartedMessage,
  SDKHookProgressMessage,
  SDKHookResponseMessage,
  SDKToolProgressMessage,
  SDKAuthStatusMessage,
  SDKTaskNotificationMessage,
  SDKFilesPersistedEvent,
  SDKToolUseSummaryMessage,
} from '@anthropic-ai/claude-agent-sdk';

// ============================================================================
// PERMISSION & CALLBACK TYPES
// ============================================================================

export type {
  CanUseTool,
  PermissionResult,
  PermissionBehavior,
  PermissionUpdate,
  PermissionUpdateDestination,
} from '@anthropic-ai/claude-agent-sdk';

// ============================================================================
// HOOK TYPES
// ============================================================================

export type {
  HookCallback,
  HookCallbackMatcher,
  HookEvent,
  HookInput,
  HookJSONOutput,
  PreToolUseHookInput,
  PostToolUseHookInput,
  PostToolUseFailureHookInput,
  NotificationHookInput,
  UserPromptSubmitHookInput,
  SessionStartHookInput,
  SessionEndHookInput,
  StopHookInput,
  SubagentStartHookInput,
  SubagentStopHookInput,
  PreCompactHookInput,
  PermissionRequestHookInput,
  SetupHookInput,
} from '@anthropic-ai/claude-agent-sdk';

// ============================================================================
// MCP TYPES
// ============================================================================

export type {
  McpServerConfig,
  McpStdioServerConfig,
  McpSSEServerConfig,
  McpHttpServerConfig,
  McpSdkServerConfig,
  McpSdkServerConfigWithInstance,
  McpServerConfigForProcessTransport,
  McpServerStatus,
  McpSetServersResult,
  SdkMcpToolDefinition,
} from '@anthropic-ai/claude-agent-sdk';

/**
 * Re-export MCP utilities (these will be replaced in future steps)
 */
export {
  createSdkMcpServer,
  tool,
} from '@anthropic-ai/claude-agent-sdk';

// ============================================================================
// MODEL & USAGE TYPES
// ============================================================================

export type {
  ModelInfo,
  ModelUsage,
  AccountInfo,
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
  SandboxSettings,
  SandboxNetworkConfig,
  SandboxIgnoreViolations,
  SettingSource,
  ConfigScope,
} from '@anthropic-ai/claude-agent-sdk';

// ============================================================================
// OUTPUT FORMAT TYPES
// ============================================================================

export type {
  OutputFormat,
  OutputFormatType,
  JsonSchemaOutputFormat,
} from '@anthropic-ai/claude-agent-sdk';

// ============================================================================
// MISC TYPES
// ============================================================================

export type {
  SlashCommand,
  RewindFilesResult,
  ExitReason,
  ApiKeySource,
  SdkBeta,
} from '@anthropic-ai/claude-agent-sdk';

// ============================================================================
// ADVANCED TYPES (for completeness)
// ============================================================================

export type {
  SpawnedProcess,
  SpawnOptions,
  Transport,
} from '@anthropic-ai/claude-agent-sdk';
