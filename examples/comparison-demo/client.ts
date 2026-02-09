/**
 * Frontend client for SDK comparison demo
 */

let ws: WebSocket | null = null;

// DOM elements
const statusEl = document.getElementById('status') as HTMLDivElement;
const promptInput = document.getElementById('prompt') as HTMLInputElement;
const sendBtn = document.getElementById('send') as HTMLButtonElement;
const continueBtn = document.getElementById('continue-btn') as HTMLButtonElement;
const officialOutput = document.getElementById('official-output') as HTMLDivElement;
const openOutput = document.getElementById('open-output') as HTMLDivElement;

// Track session IDs for multi-turn
let liteSessionId: string | null = null;
let officialSessionId: string | null = null;

// Connect to WebSocket
function connect() {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const wsUrl = `${protocol}//${window.location.host}`;

  ws = new WebSocket(wsUrl);

  ws.onopen = () => {
    statusEl.textContent = '✓ Connected';
    statusEl.className = 'status connected';
    promptInput.disabled = false;
    sendBtn.disabled = false;
    console.log('WebSocket connected');
  };

  ws.onerror = (error) => {
    console.error('WebSocket error:', error);
    statusEl.textContent = '✗ Connection error';
    statusEl.className = 'status error';
  };

  ws.onclose = () => {
    statusEl.textContent = '○ Disconnected';
    statusEl.className = 'status';
    promptInput.disabled = true;
    sendBtn.disabled = true;
    console.log('WebSocket closed');

    // Try to reconnect after 2 seconds
    setTimeout(connect, 2000);
  };

  ws.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      handleMessage(data);
    } catch (e) {
      console.error('Failed to parse message:', e);
    }
  };
}

// Handle incoming messages
function handleMessage(data: { sdk: 'official' | 'open'; message: any; error?: string }) {
  const outputDiv = data.sdk === 'official' ? officialOutput : openOutput;

  if (data.error) {
    appendMessage(outputDiv, {
      type: 'error',
      content: data.error,
    });
    return;
  }

  if (data.message) {
    appendMessage(outputDiv, data.message);

    // Track session IDs for multi-turn
    if (data.message.type === 'system' && data.message.session_id) {
      if (data.sdk === 'open') {
        liteSessionId = data.message.session_id;
      } else {
        officialSessionId = data.message.session_id;
      }
    }

    // Enable continue button after first result
    if (data.message.type === 'result') {
      continueBtn.disabled = false;
    }
  }
}

// Append message to output
function appendMessage(container: HTMLDivElement, message: any) {
  const messageDiv = document.createElement('div');
  messageDiv.className = `message message-${message.type}`;

  const typeDiv = document.createElement('div');
  typeDiv.className = 'message-type';
  typeDiv.textContent = message.type + (message.subtype ? ` (${message.subtype})` : '');

  const contentDiv = document.createElement('div');
  contentDiv.className = 'message-content';

  // Format content based on message type
  let content = '';
  if (message.type === 'system') {
    content = `Model: ${message.model || 'N/A'}\nCWD: ${message.cwd || 'N/A'}`;
  } else if (message.type === 'assistant') {
    content = formatAssistantMessage(message.message);
  } else if (message.type === 'result') {
    content = formatResultMessage(message);
  } else if (message.type === 'error') {
    content = message.content || 'Unknown error';
  } else {
    content = JSON.stringify(message, null, 2);
  }

  contentDiv.textContent = content;
  messageDiv.appendChild(typeDiv);
  messageDiv.appendChild(contentDiv);
  container.appendChild(messageDiv);

  // Auto-scroll to bottom
  container.scrollTop = container.scrollHeight;
}

// Format assistant message
function formatAssistantMessage(message: any): string {
  if (!message) return 'N/A';

  const parts: string[] = [];

  if (message.content && Array.isArray(message.content)) {
    for (const block of message.content) {
      if (block.type === 'text') {
        parts.push(block.text);
      } else if (block.type === 'tool_use') {
        parts.push(`[Tool: ${block.name}]`);
      }
    }
  }

  return parts.join('\n') || JSON.stringify(message, null, 2);
}

// Format result message
function formatResultMessage(message: any): string {
  const parts: string[] = [];

  if (message.subtype) {
    parts.push(`Status: ${message.subtype}`);
  }

  if (message.result) {
    parts.push(`Result: ${message.result}`);
  }

  if (message.num_turns !== undefined) {
    parts.push(`Turns: ${message.num_turns}`);
  }

  if (message.total_cost_usd !== undefined) {
    parts.push(`Cost: $${message.total_cost_usd.toFixed(4)}`);
  }

  if (message.duration_ms !== undefined) {
    parts.push(`Duration: ${(message.duration_ms / 1000).toFixed(2)}s`);
  }

  if (message.errors && message.errors.length > 0) {
    parts.push(`Errors:\n${message.errors.join('\n')}`);
  }

  return parts.join('\n');
}

// Send prompt to both SDKs
function sendPrompt() {
  const prompt = promptInput.value.trim();
  if (!prompt || !ws || ws.readyState !== WebSocket.OPEN) {
    return;
  }

  // Clear input
  promptInput.value = '';

  // Disable send button temporarily
  sendBtn.disabled = true;
  setTimeout(() => {
    sendBtn.disabled = false;
    promptInput.focus();
  }, 500);

  // Send to both SDKs
  ws.send(
    JSON.stringify({
      prompt,
      sdk: 'official',
    })
  );

  ws.send(
    JSON.stringify({
      prompt,
      sdk: 'open',
    })
  );

  console.log('Sent prompt to both SDKs:', prompt);
}

// Continue conversation
function continueConversation() {
  const prompt = promptInput.value.trim();
  if (!prompt || !ws || ws.readyState !== WebSocket.OPEN) {
    return;
  }

  // Clear input
  promptInput.value = '';

  // Disable buttons temporarily
  sendBtn.disabled = true;
  continueBtn.disabled = true;
  setTimeout(() => {
    sendBtn.disabled = false;
    promptInput.focus();
  }, 500);

  // Send continuation to both SDKs
  if (liteSessionId) {
    ws.send(
      JSON.stringify({
        prompt,
        sdk: 'open',
        continue: true,
        sessionId: liteSessionId,
      })
    );
  }

  if (officialSessionId) {
    ws.send(
      JSON.stringify({
        prompt,
        sdk: 'official',
        continue: true,
        sessionId: officialSessionId,
      })
    );
  }

  console.log('Continuing conversation with prompt:', prompt);
}

// Clear output for a specific SDK
(window as any).clearOutput = (sdk: 'official' | 'open') => {
  const container = sdk === 'official' ? officialOutput : openOutput;
  container.innerHTML = '';

  // Reset session IDs
  if (sdk === 'open') {
    liteSessionId = null;
  } else {
    officialSessionId = null;
  }

  continueBtn.disabled = true;
};

// Event listeners
sendBtn.addEventListener('click', sendPrompt);
continueBtn.addEventListener('click', continueConversation);
promptInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') {
    sendPrompt();
  }
});

// Connect on load
connect();
