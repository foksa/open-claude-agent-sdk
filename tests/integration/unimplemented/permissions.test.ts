/**
 * Todo tests for unimplemented permission features
 *
 * Implemented permission tests are in:
 *   - tests/integration/permissions.test.ts (canUseTool callback)
 *   - tests/integration/permission-modes.test.ts (permission modes, allowedTools, disallowedTools, eval order, setPermissionMode)
 *
 * These tests document permission features that aren't fully implemented yet.
 */

import { runWithSDK, testWithBothSDKsTodo } from '../comparison-utils.ts';

// =============================================================================
// UNIMPLEMENTED: Permission suggestions
// =============================================================================

testWithBothSDKsTodo('canUseTool receives permission suggestions', async (sdk) => {
  let receivedSuggestions = false;

  await runWithSDK(sdk, 'Write "test" to /tmp/suggestions-test.txt', {
    maxTurns: 3,
    permissionMode: 'default',
    canUseTool: async (_toolName, input, context) => {
      if (context.suggestions && context.suggestions.length > 0) {
        receivedSuggestions = true;
      }
      return { behavior: 'allow', updatedInput: input };
    },
  });

  console.log(`   [${sdk}] Received suggestions: ${receivedSuggestions}`);
});

// =============================================================================
// UNIMPLEMENTED: Permission updates from canUseTool
// =============================================================================

testWithBothSDKsTodo('canUseTool can return updatedPermissions', async (sdk) => {
  await runWithSDK(sdk, 'Write "test" to /tmp/perm-update-test.txt', {
    maxTurns: 3,
    permissionMode: 'default',
    canUseTool: async (_toolName, input, _context) => {
      return {
        behavior: 'allow',
        updatedInput: input,
        updatedPermissions: [
          {
            type: 'addRules',
            rules: [{ toolName: 'Write', ruleContent: '/tmp/*' }],
            behavior: 'allow',
            destination: 'session',
          },
        ],
      };
    },
  });

  console.log(`   [${sdk}] Permission update applied`);
});

// =============================================================================
// UNIMPLEMENTED: permissionPromptToolName option
// =============================================================================

testWithBothSDKsTodo('permissionPromptToolName routes prompts to MCP tool', async (sdk) => {
  await runWithSDK(sdk, 'Write "test" to /tmp/mcp-perm-test.txt', {
    maxTurns: 3,
    permissionMode: 'default',
    permissionPromptToolName: 'my-permission-handler',
  });

  console.log(`   [${sdk}] permissionPromptToolName test`);
});
