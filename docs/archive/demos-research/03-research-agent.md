# Demo Analysis: research-agent

**Source:** https://github.com/anthropics/claude-agent-sdk-demos/tree/main/research-agent
**Language:** Python (not TypeScript!)
**Purpose:** Multi-agent research system with parallel subagents
**Architecture:** Lead agent coordinates specialized researcher/analyst/writer subagents

---

## What It Does

Sophisticated multi-agent system that:
1. **Breaks down** research requests into 2-4 subtopics
2. **Spawns parallel researchers** to search web for each subtopic
3. **Coordinates data analysis** to extract metrics and generate charts
4. **Synthesizes** findings into comprehensive PDF reports

**Key Features:**
- Parallel subagent execution
- Detailed activity tracking
- Slash commands for different research types
- PDF report generation with charts

---

## Architecture

```
Lead Agent (Coordinator)
    │
    ├─> Task: Spawn Researcher #1 (parallel)
    │       └─> WebSearch, Write findings
    │
    ├─> Task: Spawn Researcher #2 (parallel)
    │       └─> WebSearch, Write findings
    │
    ├─> Task: Spawn Researcher #3 (parallel)
    │       └─> WebSearch, Write findings
    │
    ├─> Task: Spawn Data Analyst
    │       └─> Read notes, Glob files, Bash (matplotlib), Write charts
    │
    └─> Task: Spawn Report Writer
            └─> Skill (PDF), Read all files, Bash (pandoc), Write report
```

---

## Agent Definitions

From README:

| Agent | Tools | Purpose |
|-------|-------|---------|
| **Lead Agent** | `Task` | Coordinates research, delegates to subagents |
| **Researcher** | `WebSearch`, `Write` | Gathers information from web |
| **Data Analyst** | `Glob`, `Read`, `Bash`, `Write` | Extracts metrics, generates charts |
| **Report Writer** | `Skill`, `Write`, `Glob`, `Read`, `Bash` | Creates PDF reports |

---

## Slash Commands

```python
/research <topic>               # Focused research
/competitive-analysis <company> # Company analysis
/market-trends <industry>      # Industry trends
/fact-check <claim>            # Verify claims
/summarize                     # Summarize findings
```

**Implementation:** Custom command system (not SDK feature)

---

## Python SDK Usage (Inferred)

**Note:** This is Python SDK, not TypeScript. API may differ slightly.

### Agents Configuration

```python
# Hypothetical Python SDK usage (inferred from demo behavior)
query = sdk.query({
    "prompt": "Research quantum computing",
    "options": {
        "agents": [
            {
                "id": "researcher",
                "system_prompt": "You are a research specialist...",
                "allowed_tools": ["WebSearch", "Write"]
            },
            {
                "id": "data_analyst",
                "system_prompt": "You are a data analyst...",
                "allowed_tools": ["Glob", "Read", "Bash", "Write"]
            },
            {
                "id": "report_writer",
                "system_prompt": "You are a report writer...",
                "allowed_tools": ["Skill", "Write", "Glob", "Read", "Bash"]
            }
        ]
    }
})
```

### Task Tool Usage

Lead agent spawns subagents:
```python
# Lead agent uses Task tool
Task({
    "agent_id": "researcher",
    "prompt": "Research quantum computing algorithms"
})
```

---

## Subagent Tracking with Hooks

From README:

> "The system tracks all tool calls using SDK hooks."

**Tracked data:**
- **Who:** Agent ID (RESEARCHER-1, DATA-ANALYST-1, etc.)
- **What:** Tool name (WebSearch, Write, Bash)
- **When:** Timestamp
- **Input/Output:** Parameters and results

### Hook Implementation (Inferred)

```python
# PostToolUse hook for tracking
hooks = {
    "PostToolUse": [
        lambda input: log_tool_call(
            agent_id=input.agent_id,
            tool_name=input.tool_name,
            timestamp=now(),
            input=input.tool_input,
            output=input.tool_result
        )
    ]
}
```

**Output:** `logs/session_YYYYMMDD_HHMMSS/tool_calls.jsonl`

---

## Output Structure

```
files/
├── research_notes/     # Markdown files from researchers
│   ├── quantum_algorithms.md
│   ├── quantum_hardware.md
│   └── quantum_applications.md
├── data/              # Data summaries from analyst
│   └── metrics_summary.json
├── charts/            # PNG visualizations from analyst
│   ├── market_size.png
│   └── adoption_trends.png
└── reports/           # Final PDF reports from writer
    └── quantum_computing_report.pdf

logs/
└── session_YYYYMMDD_HHMMSS/
    ├── transcript.txt      # Human-readable conversation
    └── tool_calls.jsonl    # Structured tool usage log
```

---

## TypeScript SDK Equivalents

### agents Option

**Python SDK:**
```python
options: {
    "agents": [ ... ]
}
```

**TypeScript SDK (official):**
```typescript
options: {
  agents: [
    {
      id: 'researcher',
      systemPrompt: '...',
      allowedTools: ['WebSearch', 'Write']
    }
  ]
}
```

**In Lite SDK:** ❌ Not implemented - Phase 2 feature

---

### Task Tool

**Usage:**
```typescript
// Lead agent spawns subagent
Task({
  agent_id: 'researcher',
  prompt: 'Research quantum algorithms'
})
```

**In Lite SDK:** ✅ Pass-through to CLI (CLI handles Task tool execution)

**Note:** While CLI supports Task tool, we don't manage subagent lifecycle - CLI does.

---

## Lite SDK Compatibility

### What Would Work ✅

1. **Task tool** - ✅ Pass-through (CLI handles)
2. **WebSearch, Write, Read tools** - ✅ Pass-through
3. **Bash tool** - ✅ Pass-through
4. **PostToolUse hook** - ⚠️ Code exists (untested)

### What's Missing ❌

1. **agents option** - ❌ Not implemented
   - Need to pass to CLI (check if supported)
   - Or let CLI handle via Task tool
   - Priority: Phase 2

2. **Subagent tracking** - ❌ Not implemented
   - Need agent_id in hook inputs
   - Need to route by agent
   - Priority: Phase 2

3. **Skill tool** - ❌ Unclear if CLI supports
   - Used by Report Writer for PDF generation
   - May be custom implementation

---

## Key Differences: Python vs TypeScript

| Feature | Python SDK | TypeScript SDK | Lite SDK |
|---------|------------|----------------|----------|
| Language | Python | TypeScript/JavaScript | TypeScript |
| Agent config | agents option | agents option | ❌ Phase 2 |
| Task tool | ✅ | ✅ | ✅ Pass-through |
| Slash commands | Custom | Not shown | ❌ Custom |
| PDF generation | Skill tool | Skill tool? | ❌ Unknown |

---

## Implementation Complexity

### Phase 2: Basic Subagent Support

**Goal:** Allow agents option, let CLI handle execution

```typescript
// In buildCliArgs():
if (options.agents) {
  args.push('--agents', JSON.stringify(options.agents));
}
```

**Effort:** 2-3 days
- Research if CLI supports --agents flag
- Add to spawn.ts
- Test with Task tool
- Verify subagent messages come through

### Phase 3: Subagent Lifecycle Management

**Goal:** Track and manage subagents programmatically

**Requires:**
- Agent ID in message types
- Subagent start/stop hooks
- Agent status tracking
- Agent-specific tool routing

**Effort:** 5-7 days

---

## Testing Strategy

### Cannot Test Yet

This demo requires:
1. ❌ agents option (Phase 2)
2. ⚠️ PostToolUse hook (needs testing)
3. ✅ Task tool (CLI handles, should work)

**Recommendation:** Wait until Phase 2 to attempt porting this demo.

---

## Alternative: Single-Agent Research

Could implement simpler version without subagents:

```typescript
// Single agent doing all research
query({
  prompt: 'Research quantum computing and create a report',
  options: {
    allowedTools: [
      'WebSearch', 'WebFetch',  // Research
      'Write', 'Read', 'Glob',  // File operations
      'Bash'                    // Chart generation
    ]
  }
})
```

**Trade-offs:**
- ❌ No parallel research
- ❌ No specialized agents
- ✅ Works with current Lite SDK
- ✅ Simpler architecture

---

## Key Learnings

### 1. Multi-Agent is Advanced Feature

Requires:
- Agent definitions (agents option)
- Task tool coordination
- Subagent tracking
- Complex hook routing

**Not essential for most use cases.**

### 2. Task Tool is Powerful

Single tool enables entire multi-agent architecture:
```
Lead Agent → Task tool → Spawn subagent → Task tool → Spawn sub-subagent
```

**CLI handles all complexity.**

### 3. Hooks Enable Observability

Without PostToolUse hook:
- No visibility into subagent actions
- Can't track which agent did what
- Can't generate activity logs

**Hooks are essential for production multi-agent systems.**

### 4. Python SDK Exists

Shows Anthropic has multi-language SDK strategy.

**For Lite SDK:** Focus on TypeScript first, Python later if needed.

---

## Recommendations

### Short-term (Phase 0.5-1)

**Don't prioritize this demo.**

Reasons:
1. Requires Phase 2 features (agents option)
2. Complex multi-agent coordination
3. Python-based (different API)
4. Only 1 of 7 demos uses this pattern

**Focus on:** hello-world and simple-chatapp (JavaScript/TypeScript)

### Medium-term (Phase 2)

**Add basic agents support:**
1. Check if CLI supports --agents flag
2. Add agents option to Options type
3. Pass through to CLI
4. Test with Task tool

**Don't implement subagent lifecycle management yet.**

### Long-term (Phase 3)

**If user demand exists:**
1. Subagent tracking
2. Agent-specific hooks
3. Programmatic agent management
4. Activity logging

---

## Next Steps

1. ✅ **Document for future reference** (this file)
2. ⏭️ **Skip for now** - Focus on TypeScript demos
3. 📋 **Add to Phase 2 roadmap** - agents option support
4. 🔍 **Research CLI support** - Does `claude --help` show --agents?

---

## Reference

- **Source:** `/tmp/claude-agent-sdk-demos/research-agent/`
- **README:** `README.md` (detailed multi-agent architecture)
- **Language:** Python (agent.py)
- **Claude CLI Docs:** Check for --agents flag support

**Status:** ❌ Not compatible yet - Requires Phase 2 features

**Priority:** MEDIUM (useful but not essential for most use cases)
