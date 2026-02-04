# Demo Analysis: resume-generator

**Source:** https://github.com/anthropics/claude-agent-sdk-demos/tree/main/resume-generator
**File:** `resume-generator.ts` (98 lines)
**Purpose:** Generate professional resumes using web research

---

## What It Does

Simple CLI tool that:
1. **Researches** a person using WebSearch (LinkedIn, GitHub, company pages)
2. **Generates** a JavaScript file using the `docx` library
3. **Creates** a professional 1-page `.docx` resume

**Key Feature:** Combines web research with code generation to produce Word documents.

---

## Architecture

```
Input (Person Name)
    │
    ├─> WebSearch → Research professional background
    │   ├─> LinkedIn
    │   ├─> GitHub
    │   ├─> Company pages
    │   └─> News articles
    │
    ├─> Write → Create generate_resume.js (docx code)
    │
    ├─> Bash → Execute: node generate_resume.js
    │
    └─> Output: resume.docx (1-page Word document)
```

---

## Code Structure

```typescript
import { query } from '@anthropic-ai/claude-agent-sdk';

const SYSTEM_PROMPT = `You are a professional resume writer. Research a person and create a 1-page .docx resume.

WORKFLOW:
1. WebSearch for the person's background (LinkedIn, GitHub, company pages)
2. Create a .docx file using the docx library

OUTPUT:
- Script: agent/custom_scripts/generate_resume.js
- Resume: agent/custom_scripts/resume.docx

PAGE FIT (must be exactly 1 page):
- 0.5 inch margins, Name 24pt, Headers 12pt, Body 10pt
- 2-3 bullet points per job, ~80-100 chars each
- Max 3 job roles, 2-line summary, 2-line skills`;

async function generateResume(personName: string) {
  const prompt = `Research "${personName}" and create a professional 1-page resume as a .docx file.`;

  const q = query({
    prompt,
    options: {
      maxTurns: 30,
      cwd: process.cwd(),
      model: 'sonnet',
      allowedTools: ['Skill', 'WebSearch', 'WebFetch', 'Bash', 'Write', 'Read', 'Glob'],
      settingSources: ['project'],  // Load skills from .claude/skills/
      systemPrompt: SYSTEM_PROMPT,
    },
  });

  for await (const msg of q) {
    // Process messages and log progress
  }
}
```

---

## APIs Used

### query() with String Prompt

```typescript
query({
  prompt: string,
  options: QueryOptions
})
```

**In our SDK:** ✅ Complete

### systemPrompt Option

```typescript
options: {
  systemPrompt: SYSTEM_PROMPT
}
```

**In our SDK:** ✅ Complete - See `tests/integration/system-prompt.test.ts`

### settingSources Option

```typescript
options: {
  settingSources: ['project']  // Load from .claude/skills/ and .claude/commands/
}
```

**In our SDK:** ✅ Complete - See `tests/integration/setting-sources.test.ts`

**Purpose:** Load project-specific skills and commands from `.claude/` directory

### allowedTools

```typescript
allowedTools: [
  'Skill',       // Execute custom skills
  'WebSearch',   // Research person online
  'WebFetch',    // Fetch specific pages
  'Bash',        // Execute node generate_resume.js
  'Write',       // Create generate_resume.js
  'Read',        // Read files if needed
  'Glob'         // Find files
]
```

**In our SDK:** ✅ Pass-through (CLI handles)

---

## Workflow Details

### Step 1: Web Research

Claude uses `WebSearch` to find:
- LinkedIn profile
- GitHub profile
- Company websites
- News articles
- Professional achievements

**Example search queries:**
```typescript
WebSearch({ query: "John Doe LinkedIn software engineer" })
WebSearch({ query: "John Doe GitHub" })
WebSearch({ query: "John Doe current role company" })
```

### Step 2: Generate Code

Claude creates `generate_resume.js`:
```javascript
const { Document, Packer, Paragraph, TextRun } = require('docx');
const fs = require('fs');

const doc = new Document({
  sections: [{
    properties: {
      page: {
        margin: { top: 720, right: 720, bottom: 720, left: 720 } // 0.5 inch
      }
    },
    children: [
      new Paragraph({
        children: [
          new TextRun({
            text: "John Doe",
            size: 48, // 24pt
            bold: true
          })
        ]
      }),
      // ... more content
    ]
  }]
});

Packer.toBuffer(doc).then(buffer => {
  fs.writeFileSync('resume.docx', buffer);
});
```

### Step 3: Execute

Claude runs:
```bash
node agent/custom_scripts/generate_resume.js
```

**Output:** `agent/custom_scripts/resume.docx`

---

## Resume Format

**Requirements from system prompt:**
- **Margins:** 0.5 inch all sides
- **Name:** 24pt, bold
- **Section Headers:** 12pt, bold
- **Body Text:** 10pt
- **Job Bullets:** 2-3 per role, ~80-100 chars each
- **Max Jobs:** 3 roles
- **Summary:** 2 lines
- **Skills:** 2 lines
- **Length:** Exactly 1 page

**Sections:**
1. Name + Contact
2. Professional Summary
3. Work Experience (3 most recent roles)
4. Education
5. Skills

---

## Lite SDK Compatibility

### What Works Now ✅

1. **query() with string** - ✅ Complete
2. **allowedTools pass-through** - ✅ Complete
3. **model option** - ✅ Complete
4. **cwd option** - ✅ Complete
5. **maxTurns option** - ✅ Complete

### What's Missing ❌

None - All features required by this demo are now implemented!

1. **systemPrompt option** - ✅ Complete
2. **settingSources option** - ✅ Complete

---

## Implementation Plan

### Phase 1: Add systemPrompt

**Step 1:** Check CLI support
```bash
claude --help | grep system-prompt
```

**Step 2:** Add to spawn.ts
```typescript
if (options.systemPrompt) {
  args.push('--system-prompt', options.systemPrompt);
}
```

**Effort:** 1-2 hours

### Phase 1: Add settingSources

**Step 1:** Read `.claude/` directory
```typescript
if (options.settingSources?.includes('project')) {
  const skillsDir = path.join(cwd, '.claude/skills');
  const commandsDir = path.join(cwd, '.claude/commands');

  // Read and inject into system prompt
  const skills = await loadSkills(skillsDir);
  const commands = await loadCommands(commandsDir);
}
```

**Step 2:** Pass to CLI
```typescript
// May need to inject via system prompt or separate flag
```

**Effort:** 2-3 days (research how CLI loads settings)

---

## Testing Plan

### Test 1: Basic Resume Generation

```typescript
test('resume-generator - basic functionality', async () => {
  for await (const msg of query({
    prompt: 'Generate a resume for a software engineer with 5 years experience',
    options: {
      systemPrompt: 'You are a resume writer. Create a 1-page resume.',
      allowedTools: ['WebSearch', 'Write', 'Bash'],
      permissionMode: 'bypassPermissions',
      allowDangerouslySkipPermissions: true,
      maxTurns: 10
    }
  })) {
    // Should use WebSearch
    // Should Write a script
    // Should Bash execute it
  }
});
```

### Test 2: settingSources Option

```typescript
test('resume-generator - settingSources loads skills', async () => {
  // Create .claude/skills/test-skill.md
  const skillContent = `# Test Skill\n\nTest content`;
  await fs.writeFile('.claude/skills/test-skill.md', skillContent);

  for await (const msg of query({
    prompt: 'Use the test skill',
    options: {
      settingSources: ['project'],
      maxTurns: 3
    }
  })) {
    // Should load and use test-skill
  }
});
```

---

## Porting Guide

### To Run with Lite SDK

```diff
- import { query } from '@anthropic-ai/claude-agent-sdk';
+ import { query } from 'lite-claude-agent-sdk';

// After Phase 1 features are added:
query({
  prompt: 'Generate resume for Jane Doe',
  options: {
+   systemPrompt: SYSTEM_PROMPT,      // Phase 1
+   settingSources: ['project'],       // Phase 1
    allowedTools: [ ... ]
  }
})
```

**Prerequisites:**
1. ❌ systemPrompt option (Phase 1)
2. ❌ settingSources option (Phase 1)

**Expected compatibility:** 100% after Phase 1

---

## Key Learnings

### 1. Web Research + Code Generation Pattern

Powerful combination:
```
Research → Gather data → Generate code → Execute → Produce output
```

Works for many document types:
- Resumes (.docx)
- Reports (.pdf)
- Spreadsheets (.xlsx)
- Presentations (.pptx)

### 2. System Prompt is Critical

Without detailed system prompt:
- Claude might not format properly
- Page might overflow
- Sections might be missing

**Lesson:** Good system prompt = consistent output

### 3. Skills/Commands Pattern

`.claude/` directory pattern:
```
.claude/
├── skills/          # Reusable workflows
│   └── resume.md    # Resume generation skill
└── commands/        # Slash commands
    └── /resume      # Shortcut to run skill
```

**Allows:** Project-specific customization

### 4. Simple but Effective

Only 98 lines of code:
- No complex UI
- No database
- No server
- Just: Prompt → Research → Generate → Done

**Lesson:** Agent SDK enables powerful tools with minimal code

---

## Production Considerations

### 1. Rate Limiting

WebSearch has rate limits:
- Space out queries
- Cache results
- Handle errors gracefully

### 2. Resume Quality

Varies based on:
- Availability of online info
- LinkedIn profile completeness
- Recency of data

**Solution:** Allow manual editing

### 3. Privacy

Researching people requires:
- Public data only
- Respect privacy settings
- Don't scrape behind logins

### 4. Cost

Each resume:
- 10-30 turns
- WebSearch costs
- Document generation

**Estimate:** $0.10-0.50 per resume

---

## Next Steps

All completed:
1. ✅ **systemPrompt** - Implemented
2. ✅ **settingSources** - Implemented
3. ✅ **Ported demos** - `demos/lite/resume-generator/` and `demos/official/resume-generator/`
4. ✅ **Integration tests** - `tests/integration/setting-sources.test.ts`

---

## Reference

- **Source:** `/tmp/claude-agent-sdk-demos/resume-generator/resume-generator.ts`
- **README:** `README.md`
- **Output:** `agent/custom_scripts/resume.docx`

**Status:** ✅ 100% compatible - Demo ported to `demos/lite/resume-generator/` and `demos/official/resume-generator/`

**Priority:** Complete

**Compatibility:** Full - Both systemPrompt and settingSources are now implemented and tested
