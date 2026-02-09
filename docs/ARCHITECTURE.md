# Architecture

This SDK is a thin, API-compatible wrapper around the local Claude CLI. It focuses on protocol glue and minimal in-process state while delegating model behavior to the CLI.

## Goals
- Match the official SDK API and types.
- Keep the package small and fast to install.
- Preserve streaming and multi-turn behavior.
- Allow injection for testing and alternate runtimes.

## High-Level Dataflow
1. `query()` creates a `QueryImpl`.
2. `QueryImpl` spawns the local CLI process via `ProcessFactory`.
3. CLI stdout emits NDJSON lines.
4. `MessageRouter` parses lines and routes:
   - `control_request` -> `ControlProtocolHandler` (internal handling)
   - `control_response` -> `QueryImpl` (pending request resolution)
   - normal SDK messages -> `MessageQueue`
5. Consumers iterate `QueryImpl` as an `AsyncIterator`.
6. Control methods (`setModel`, `interrupt`, etc.) send control requests over stdin.

## Core Components
- `src/api/query.ts`: public `query()` API.
- `src/api/QueryImpl.ts`: orchestration, lifecycle, and control methods.
- `src/api/MessageRouter.ts`: NDJSON parsing and message routing.
- `src/api/MessageQueue.ts`: AsyncIterator queue.
- `src/core/control.ts`: control protocol handler + request builders.
- `src/core/argBuilder.ts`: CLI argument construction from options.
- `src/core/spawn.ts`: CLI detection and process spawning.
- `src/core/mcpBridge.ts`: in-process MCP server bridge.
- `src/mcp.ts`: SDK-level MCP utilities (`createSdkMcpServer`, `tool`).

## Control Protocol
The SDK uses a bidirectional control protocol over stdio:
- Outbound: `QueryImpl` sends `control_request` messages.
- Inbound: `ControlProtocolHandler` handles `control_request` from CLI (hooks, permissions, MCP).
- Responses: CLI sends `control_response`, routed to pending promises by request ID.

Initialization occurs with a `control_request` of subtype `initialize`, including optional hooks, MCP server names, and system prompt configuration.

## MCP Integration
MCP servers can be passed as in-process instances. The SDK:
- Creates a bridge (`McpServerBridge`) for each SDK MCP server.
- Routes incoming CLI MCP requests to the server instance.
- Resolves responses back through the control protocol.

## Lifecycle
- Creation: `QueryImpl.create()` spawns CLI, installs router, sends init, and starts reading.
- Streaming: messages are emitted via `MessageQueue` and AsyncIterator semantics.
- Closing: `close()` stops routing, kills the process, completes the queue, and rejects pending control requests.

## Error Handling
- CLI exit or process errors complete the queue and reject pending control promises.
- NDJSON parse errors are logged but do not currently fail the stream.
- Aborted queries short-circuit without spawning the process.

## Testing & Extensibility
- `ProcessFactory` allows injecting mock processes for unit tests.
- CLI args are constructed via `argBuilder` for parity with the official SDK.
- New control requests should be added to `ControlRequests` and handled in `ControlProtocolHandler` as needed.
