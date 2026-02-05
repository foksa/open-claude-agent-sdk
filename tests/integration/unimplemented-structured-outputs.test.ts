/**
 * Tests for structured outputs NOT YET implemented in lite SDK
 *
 * These tests document the expected behavior based on official SDK documentation.
 * They are marked as .todo until the features are implemented.
 *
 * Official documentation: docs/official-agent-sdk-docs/structured-outputs.md
 *
 * Unimplemented features:
 * - outputFormat option with JSON schema
 * - structured_output field in result message
 * - Error handling for structured output failures
 * - Support for Zod schema conversion (z.toJSONSchema)
 */

import { describe, expect } from 'bun:test';
import { runWithSDK, testWithBothSDKsTodo } from './comparison-utils.ts';

// =============================================================================
// Basic Structured Outputs
// =============================================================================

describe('Structured outputs - Basic', () => {
  /**
   * From docs:
   * - Pass outputFormat: { type: 'json_schema', schema: {...} }
   * - Result message includes structured_output field with validated data
   */
  testWithBothSDKsTodo('should return structured_output matching JSON schema', async (sdk) => {
    const schema = {
      type: 'object',
      properties: {
        company_name: { type: 'string' },
        founded_year: { type: 'number' },
        headquarters: { type: 'string' },
      },
      required: ['company_name'],
    };

    const messages = await runWithSDK(
      sdk,
      'Research Anthropic and provide key company information',
      {
        maxTurns: 10,
        permissionMode: 'bypassPermissions',
        allowDangerouslySkipPermissions: true,
        outputFormat: {
          type: 'json_schema',
          schema: schema,
        },
      }
    );

    const result = messages.find((m) => m.type === 'result');
    expect(result).toBeTruthy();

    // Structured output should be in the result
    expect(result?.structured_output).toBeTruthy();
    expect(typeof result?.structured_output?.company_name).toBe('string');
  });

  testWithBothSDKsTodo('should validate output against schema', async (sdk) => {
    const schema = {
      type: 'object',
      properties: {
        name: { type: 'string' },
        version: { type: 'string' },
        dependencies_count: { type: 'number' },
      },
      required: ['name', 'version', 'dependencies_count'],
    };

    const messages = await runWithSDK(sdk, 'Read package.json and extract project info', {
      maxTurns: 10,
      permissionMode: 'bypassPermissions',
      allowDangerouslySkipPermissions: true,
      outputFormat: {
        type: 'json_schema',
        schema: schema,
      },
    });

    const result = messages.find((m) => m.type === 'result');
    expect(result?.structured_output).toBeTruthy();

    // All required fields should be present
    expect(result?.structured_output?.name).toBeTruthy();
    expect(result?.structured_output?.version).toBeTruthy();
    expect(typeof result?.structured_output?.dependencies_count).toBe('number');
  });
});

// =============================================================================
// Complex Schemas
// =============================================================================

describe('Structured outputs - Complex schemas', () => {
  /**
   * From docs:
   * - Supports nested objects and arrays
   * - Supports enum, const, required
   * - Supports $ref definitions
   */
  testWithBothSDKsTodo('should support nested objects', async (sdk) => {
    const schema = {
      type: 'object',
      properties: {
        project: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            metadata: {
              type: 'object',
              properties: {
                author: { type: 'string' },
                license: { type: 'string' },
              },
            },
          },
        },
      },
      required: ['project'],
    };

    const messages = await runWithSDK(sdk, 'Analyze the package.json file', {
      maxTurns: 10,
      permissionMode: 'bypassPermissions',
      allowDangerouslySkipPermissions: true,
      outputFormat: { type: 'json_schema', schema },
    });

    const result = messages.find((m) => m.type === 'result');
    expect(result?.structured_output?.project).toBeTruthy();
    expect(typeof result?.structured_output?.project?.name).toBe('string');
  });

  testWithBothSDKsTodo('should support arrays', async (sdk) => {
    const schema = {
      type: 'object',
      properties: {
        todos: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              text: { type: 'string' },
              file: { type: 'string' },
              line: { type: 'number' },
            },
            required: ['text', 'file', 'line'],
          },
        },
        total_count: { type: 'number' },
      },
      required: ['todos', 'total_count'],
    };

    const messages = await runWithSDK(sdk, 'Find all TODO comments in the codebase', {
      maxTurns: 15,
      permissionMode: 'bypassPermissions',
      allowDangerouslySkipPermissions: true,
      outputFormat: { type: 'json_schema', schema },
    });

    const result = messages.find((m) => m.type === 'result');
    expect(result?.structured_output?.todos).toBeTruthy();
    expect(Array.isArray(result?.structured_output?.todos)).toBe(true);
    expect(typeof result?.structured_output?.total_count).toBe('number');
  });

  testWithBothSDKsTodo('should support enum constraints', async (sdk) => {
    const schema = {
      type: 'object',
      properties: {
        feature_name: { type: 'string' },
        steps: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              step_number: { type: 'number' },
              description: { type: 'string' },
              estimated_complexity: {
                type: 'string',
                enum: ['low', 'medium', 'high'],
              },
            },
            required: ['step_number', 'description', 'estimated_complexity'],
          },
        },
      },
      required: ['feature_name', 'steps'],
    };

    const messages = await runWithSDK(sdk, 'Plan how to add a dark mode feature to a React app', {
      maxTurns: 10,
      permissionMode: 'bypassPermissions',
      allowDangerouslySkipPermissions: true,
      outputFormat: { type: 'json_schema', schema },
    });

    const result = messages.find((m) => m.type === 'result');
    expect(result?.structured_output?.steps).toBeTruthy();

    // All complexity values should be from enum
    for (const step of result?.structured_output?.steps || []) {
      expect(['low', 'medium', 'high']).toContain(step.estimated_complexity);
    }
  });

  testWithBothSDKsTodo('should support optional fields', async (sdk) => {
    const schema = {
      type: 'object',
      properties: {
        name: { type: 'string' },
        description: { type: 'string' }, // Optional
        website: { type: 'string' }, // Optional
      },
      required: ['name'],
    };

    const messages = await runWithSDK(sdk, 'Tell me about Anthropic', {
      maxTurns: 5,
      permissionMode: 'bypassPermissions',
      allowDangerouslySkipPermissions: true,
      outputFormat: { type: 'json_schema', schema },
    });

    const result = messages.find((m) => m.type === 'result');
    expect(result?.structured_output?.name).toBeTruthy();
    // Optional fields may or may not be present
  });
});

// =============================================================================
// Tool Usage with Structured Outputs
// =============================================================================

describe('Structured outputs - With tool usage', () => {
  /**
   * From docs:
   * - Agent can use any tools needed to complete task
   * - Still returns validated JSON at the end
   */
  testWithBothSDKsTodo('should work after multi-step tool usage', async (sdk) => {
    const schema = {
      type: 'object',
      properties: {
        todos: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              text: { type: 'string' },
              file: { type: 'string' },
              line: { type: 'number' },
              author: { type: 'string' },
              date: { type: 'string' },
            },
            required: ['text', 'file', 'line'],
          },
        },
        total_count: { type: 'number' },
      },
      required: ['todos', 'total_count'],
    };

    // Agent needs to use Grep to find TODOs, Bash for git blame
    const messages = await runWithSDK(
      sdk,
      'Find all TODO comments in this codebase and identify who added them using git blame',
      {
        maxTurns: 20,
        permissionMode: 'bypassPermissions',
        allowDangerouslySkipPermissions: true,
        outputFormat: { type: 'json_schema', schema },
      }
    );

    const result = messages.find((m) => m.type === 'result');
    expect(result?.structured_output).toBeTruthy();
    expect(Array.isArray(result?.structured_output?.todos)).toBe(true);
    expect(typeof result?.structured_output?.total_count).toBe('number');
  });

  testWithBothSDKsTodo('should work with web search', async (sdk) => {
    const schema = {
      type: 'object',
      properties: {
        name: { type: 'string' },
        prep_time_minutes: { type: 'number' },
        cook_time_minutes: { type: 'number' },
        ingredients: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              item: { type: 'string' },
              amount: { type: 'number' },
              unit: { type: 'string' },
            },
            required: ['item'],
          },
        },
        steps: {
          type: 'array',
          items: { type: 'string' },
        },
      },
      required: ['name', 'ingredients', 'steps'],
    };

    const messages = await runWithSDK(sdk, 'Search for a chocolate chip cookie recipe', {
      maxTurns: 15,
      permissionMode: 'bypassPermissions',
      allowDangerouslySkipPermissions: true,
      outputFormat: { type: 'json_schema', schema },
    });

    const result = messages.find((m) => m.type === 'result');
    expect(result?.structured_output?.name).toBeTruthy();
    expect(Array.isArray(result?.structured_output?.ingredients)).toBe(true);
    expect(Array.isArray(result?.structured_output?.steps)).toBe(true);
  });
});

// =============================================================================
// Error Handling
// =============================================================================

describe('Structured outputs - Error handling', () => {
  /**
   * From docs:
   * - result.subtype indicates success or error
   * - 'error_max_structured_output_retries' when validation repeatedly fails
   */
  testWithBothSDKsTodo('should indicate success in subtype', async (sdk) => {
    const schema = {
      type: 'object',
      properties: {
        answer: { type: 'string' },
      },
      required: ['answer'],
    };

    const messages = await runWithSDK(sdk, 'Say hello', {
      maxTurns: 5,
      permissionMode: 'bypassPermissions',
      allowDangerouslySkipPermissions: true,
      outputFormat: { type: 'json_schema', schema },
    });

    const result = messages.find((m) => m.type === 'result');
    expect(result?.subtype).toBe('success');
    expect(result?.structured_output).toBeTruthy();
  });

  testWithBothSDKsTodo('should set error subtype on validation failure', async (sdk) => {
    // Create a schema that's very hard to satisfy
    const impossibleSchema = {
      type: 'object',
      properties: {
        exact_value: { type: 'number', const: 42.123456789 },
        impossible_string: { type: 'string', minLength: 1000000 },
      },
      required: ['exact_value', 'impossible_string'],
    };

    const messages = await runWithSDK(sdk, 'Hello', {
      maxTurns: 3, // Limit retries
      permissionMode: 'bypassPermissions',
      allowDangerouslySkipPermissions: true,
      outputFormat: { type: 'json_schema', schema: impossibleSchema },
    });

    const result = messages.find((m) => m.type === 'result');
    // When agent can't produce valid output, subtype indicates error
    if (result?.subtype === 'error_max_structured_output_retries') {
      expect(result?.structured_output).toBeFalsy();
    }
  });

  testWithBothSDKsTodo('should handle schema with deeply nested objects', async (sdk) => {
    const schema = {
      type: 'object',
      properties: {
        level1: {
          type: 'object',
          properties: {
            level2: {
              type: 'object',
              properties: {
                level3: {
                  type: 'object',
                  properties: {
                    value: { type: 'string' },
                  },
                  required: ['value'],
                },
              },
              required: ['level3'],
            },
          },
          required: ['level2'],
        },
      },
      required: ['level1'],
    };

    const messages = await runWithSDK(sdk, 'Say hello', {
      maxTurns: 5,
      permissionMode: 'bypassPermissions',
      allowDangerouslySkipPermissions: true,
      outputFormat: { type: 'json_schema', schema },
    });

    const result = messages.find((m) => m.type === 'result');
    expect(result?.structured_output?.level1?.level2?.level3?.value).toBeTruthy();
  });
});

// =============================================================================
// Configuration
// =============================================================================

describe('Structured outputs - Configuration', () => {
  /**
   * From docs:
   * - outputFormat: { type: 'json_schema', schema: {...} }
   */
  testWithBothSDKsTodo('should accept outputFormat in options', async (sdk) => {
    const schema = {
      type: 'object',
      properties: {
        response: { type: 'string' },
      },
      required: ['response'],
    };

    // This tests the option is accepted without error
    const messages = await runWithSDK(sdk, 'Hello', {
      maxTurns: 3,
      permissionMode: 'bypassPermissions',
      allowDangerouslySkipPermissions: true,
      outputFormat: {
        type: 'json_schema',
        schema: schema,
      },
    });

    // Should complete without error
    expect(messages.length).toBeGreaterThan(0);
    const result = messages.find((m) => m.type === 'result');
    expect(result).toBeTruthy();
  });

  testWithBothSDKsTodo('should work without outputFormat (default behavior)', async (sdk) => {
    const messages = await runWithSDK(sdk, 'Hello', {
      maxTurns: 3,
      permissionMode: 'bypassPermissions',
      allowDangerouslySkipPermissions: true,
      // No outputFormat - should return free-form text
    });

    const result = messages.find((m) => m.type === 'result');
    expect(result).toBeTruthy();
    // structured_output should not be present without outputFormat
    expect(result?.structured_output).toBeFalsy();
  });
});

// =============================================================================
// Type Safety with Zod (Documentation Reference)
// =============================================================================

describe('Structured outputs - Zod integration patterns', () => {
  /**
   * From docs:
   * - Use z.toJSONSchema() to convert Zod schema to JSON Schema
   * - Use safeParse() for runtime validation
   *
   * Note: These tests document the pattern; actual Zod integration
   * requires importing Zod and using z.toJSONSchema()
   */
  testWithBothSDKsTodo('should work with Zod-generated JSON schema', async (sdk) => {
    // Example of schema that would be generated by Zod:
    // const FeaturePlan = z.object({
    //   feature_name: z.string(),
    //   summary: z.string(),
    //   steps: z.array(z.object({
    //     step_number: z.number(),
    //     description: z.string(),
    //     estimated_complexity: z.enum(['low', 'medium', 'high'])
    //   })),
    //   risks: z.array(z.string())
    // });
    // const schema = z.toJSONSchema(FeaturePlan);

    // Equivalent JSON Schema:
    const schema = {
      type: 'object',
      properties: {
        feature_name: { type: 'string' },
        summary: { type: 'string' },
        steps: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              step_number: { type: 'number' },
              description: { type: 'string' },
              estimated_complexity: { type: 'string', enum: ['low', 'medium', 'high'] },
            },
            required: ['step_number', 'description', 'estimated_complexity'],
          },
        },
        risks: { type: 'array', items: { type: 'string' } },
      },
      required: ['feature_name', 'summary', 'steps', 'risks'],
    };

    const messages = await runWithSDK(sdk, 'Plan how to add caching to this SDK', {
      maxTurns: 10,
      permissionMode: 'bypassPermissions',
      allowDangerouslySkipPermissions: true,
      outputFormat: { type: 'json_schema', schema },
    });

    const result = messages.find((m) => m.type === 'result');
    expect(result?.structured_output).toBeTruthy();

    // In real usage, you'd use Zod's safeParse for type-safe validation:
    // const parsed = FeaturePlan.safeParse(result.structured_output);
    // if (parsed.success) {
    //   const plan: FeaturePlan = parsed.data;
    //   // plan is now fully typed
    // }
  });
});
