# Simple Chat App

> **Ported from [claude-agent-sdk-demos](https://github.com/anthropics/claude-agent-sdk-demos)**
> This demo uses **open-claude-agent-sdk** instead of the official SDK.

A demo chat application using the Claude Agent SDK with a React frontend and Express backend.

![Architecture Diagram](diagram.png)

## Getting Started

### Prerequisites

- Node.js 18+
- Claude Agent SDK credentials (set `ANTHROPIC_API_KEY` environment variable)

### Installation

```bash
# From open-claude-agent-sdk root
cd examples/simple-chatapp
npm install
```

### Running

```bash
# From examples/simple-chatapp directory
npm run dev
```

This starts both:
- **Backend** (Express + WebSocket) on http://localhost:3001
- **Frontend** (Vite + React) on http://localhost:5173

Open http://localhost:5173 in your browser.

## Production Considerations

This is an example app for demonstration purposes. For production use, consider:

1. **Isolate the Agent SDK** - Move the SDK into a separate container/service. This provides better security isolation since the agent has access to tools like Bash, file system operations, and web requests.

2. **Persistent storage** - Replace the in-memory `ChatStore` with a database. Currently all chats are lost on server restart.

3. **Transcript syncing** - For Agent Sessions to be persisted across server restarts, you'll need to persist and restore the SDK's conversation transcripts. The SDK maintains internal state for multi-turn conversations that must be synced with your storage.

4. **Authentication** - Add user authentication and authorization. Currently anyone can access any chat.

## Demo

See demo at [official repo](https://github.com/anthropics/claude-agent-sdk-demos/tree/main/simple-chatapp)