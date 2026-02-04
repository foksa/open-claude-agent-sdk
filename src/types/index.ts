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
/**
 * Query configuration options
 */
/**
 * Permission modes for controlling tool execution
 */
/**
 * Query interface (AsyncGenerator with control methods)
 *
 * NOTE: For Baby Steps 1-4, control methods (interrupt, setPermissionMode, etc.)
 * are not yet implemented. Use with permissionMode: 'bypassPermissions' or 'plan'.
 */
export type {
  Options,
  PermissionMode,
  Query,
  SDKMessage,
} from '@anthropic-ai/claude-agent-sdk';

// ============================================================================
// MESSAGE TYPES (16 items) - For consuming output
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
  PermissionResult,
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
  NotificationHookInput,
  PermissionRequestHookInput,
  PostToolUseFailureHookInput,
  PostToolUseHookInput,
  PreCompactHookInput,
  PreToolUseHookInput,
  SessionEndHookInput,
  SessionStartHookInput,
  SetupHookInput,
  StopHookInput,
  SubagentStartHookInput,
  SubagentStopHookInput,
  UserPromptSubmitHookInput,
} from '@anthropic-ai/claude-agent-sdk';

// ============================================================================
// MCP TYPES
// ============================================================================

export type {
  McpHttpServerConfig,
  McpSdkServerConfig,
  McpSdkServerConfigWithInstance,
  McpServerConfig,
  McpServerConfigForProcessTransport,
  McpServerStatus,
  McpSetServersResult,
  McpSSEServerConfig,
  McpStdioServerConfig,
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
  AccountInfo,
  ModelInfo,
  ModelUsage,
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
// MISC TYPES
// ============================================================================

export type {
  ApiKeySource,
  ExitReason,
  RewindFilesResult,
  SdkBeta,
  SlashCommand,
} from '@anthropic-ai/claude-agent-sdk';

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
// ADVANCED TYPES (for completeness)
// ============================================================================

export type {
  SpawnedProcess,
  SpawnOptions,
  Transport,
} from '@anthropic-ai/claude-agent-sdk';
