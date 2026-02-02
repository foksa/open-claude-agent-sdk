# Demo Analysis: excel-demo

**Source:** https://github.com/anthropics/claude-agent-sdk-demos/tree/main/excel-demo
**Purpose:** AI-powered Excel spreadsheet creation and analysis
**Architecture:** Electron desktop app with Python backend

---

## What It Does

Desktop application (Electron) that:
1. **Creates Excel files** - AI generates sophisticated spreadsheets with formulas
2. **Analyzes data** - Claude reads and interprets existing spreadsheets
3. **Python Integration** - Uses `openpyxl` library for Excel manipulation
4. **Professional Formatting** - Styles, borders, colors, conditional formatting
5. **Multi-sheet workbooks** - Complex spreadsheets with related sheets

**Key Feature:** Shows Python agent integration + desktop app with Claude SDK.

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                Electron Desktop App                      │
│  ┌────────────────────┐      ┌────────────────────┐    │
│  │  Renderer Process  │      │   Main Process     │    │
│  │  (React UI)        │─IPC─>│   (query handler)  │    │
│  └────────────────────┘      └──────────┬─────────┘    │
└─────────────────────────────────────────┼──────────────┘
                                           │
                                           ▼
                                    Claude CLI (SDK)
                                           │
                        ┌──────────────────┼──────────────────┐
                        │                  │                  │
                        ▼                  ▼                  ▼
                  Bash (Python)      Write Scripts      Read Files
                        │
                        ▼
                  Python Scripts
                  (openpyxl library)
                        │
                        ▼
                  Excel Files (.xlsx)
                  - Formulas
                  - Formatting
                  - Multiple sheets
                  - Charts
```

---

## Core Components

### 1. Electron Main Process

**File:** `src/main/main.ts` (250+ lines)

Handles:
- IPC communication (`claude-code:query`)
- File downloads (save dialog)
- Output directory management
- File watching (detect new Excel files)

```typescript
ipcMain.on('claude-code:query', async (event, data) => {
  const cwd = path.join(process.cwd(), 'agent');

  const q = query({
    prompt: data.content,
    options: {
      maxTurns: 50,
      cwd,
      model: 'opus',
      allowedTools: ['Bash', 'Write', 'Read', 'Glob', 'Skill'],
      settingSources: ['project']
    }
  });

  for await (const msg of q) {
    event.reply('claude-code:message', msg);
  }
});
```

### 2. React Frontend

**Directory:** `src/renderer/`

Features:
- Chat interface with Claude
- File upload (drag & drop Excel files)
- Download buttons for generated files
- Real-time message streaming

### 3. Python Agent

**Directory:** `agent/` (Python scripts)

Example scripts:
- `create_workout_tracker.py` - Fitness log with auto-calculations
- `create_budget_tracker.py` - Financial tracker with formulas

**Pattern:**
```python
from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill, Border, Side

wb = Workbook()
ws = wb.active

# Headers
ws['A1'] = 'Date'
ws['B1'] = 'Exercise'
ws['C1'] = 'Sets'
ws['A1'].font = Font(bold=True, size=12)
ws['A1'].fill = PatternFill(start_color='4472C4', fill_type='solid')

# Formulas
ws['D10'] = '=SUM(D2:D9)'

wb.save('workout_tracker.xlsx')
```

### 4. Skills

**Directory:** `agent/.claude/skills/xlsx/`

Custom skill: `recalc.py` - Recalculates formulas using LibreOffice

---

## Workflow Example: Budget Tracker

### User Request
```
"Create a budget tracker for 2024 with income, expenses, and savings"
```

### Claude's Process

1. **Plan** (thinking):
   - Need income section (salary, freelance)
   - Need expense categories (rent, food, transport, etc.)
   - Need savings calculation (income - expenses)
   - Need monthly breakdown (12 columns)
   - Need summary sheet with charts

2. **Write Python Script**:
   ```python
   # agent/custom_scripts/create_budget.py
   from openpyxl import Workbook
   from openpyxl.styles import Font, PatternFill, Border, Side, Alignment

   wb = Workbook()

   # Sheet 1: Monthly Budget
   ws1 = wb.active
   ws1.title = 'Monthly Budget'

   # Headers
   ws1['A1'] = 'Category'
   ws1['B1'] = 'Jan'
   ws1['C1'] = 'Feb'
   # ... 12 months

   # Income section
   ws1['A3'] = 'INCOME'
   ws1['A3'].font = Font(bold=True, size=14)
   ws1['A4'] = 'Salary'
   ws1['A5'] = 'Freelance'
   ws1['A6'] = 'Total Income'
   ws1['B6'] = '=SUM(B4:B5)'  # Formula

   # Expenses section
   ws1['A8'] = 'EXPENSES'
   ws1['A9'] = 'Rent'
   ws1['A10'] = 'Food'
   # ... more categories

   # Savings
   ws1['A20'] = 'SAVINGS'
   ws1['B20'] = '=B6-B18'  # Income - Expenses

   # Formatting
   ws1['A1'].fill = PatternFill(start_color='4472C4', fill_type='solid')

   # Sheet 2: Summary
   ws2 = wb.create_sheet('Summary')
   # Add yearly summary and charts

   wb.save('budget_tracker.xlsx')
   ```

3. **Execute Script**:
   ```bash
   python agent/custom_scripts/create_budget.py
   ```

4. **Verify Output**:
   - Check file exists: `agent/budget_tracker.xlsx`
   - Notify user via IPC

5. **User Downloads** file via Electron save dialog

---

## APIs Used

### 1. query() with IPC Pattern

```typescript
// Main process
const q = query({
  prompt: userMessage,
  options: { ... }
});

for await (const msg of q) {
  // Send to renderer via IPC
  event.reply('claude-code:message', msg);
}
```

**In Lite SDK:** ✅ Complete (query works)

### 2. settingSources Option

```typescript
options: {
  settingSources: ['project']  // Load .claude/skills/
}
```

**In Lite SDK:** ❌ Phase 1 feature

### 3. allowedTools

```typescript
allowedTools: [
  'Bash',    // Execute Python scripts
  'Write',   // Create Python files
  'Read',    // Read existing files
  'Glob',    // Find files
  'Skill'    // Execute custom skills
]
```

**In Lite SDK:** ✅ Pass-through

### 4. File Upload Pattern

```typescript
// User uploads Excel file via drag & drop
const files: { name: string; buffer: ArrayBuffer }[] = uploadedFiles;

query({
  prompt: {
    content: 'Analyze this spreadsheet',
    files: files  // Attach files to prompt
  }
})
```

**In Lite SDK:** ❓ Unclear if supported (need to test)

---

## Python Integration

### openpyxl Library

Main library for Excel generation:
```bash
pip install openpyxl
```

**Features:**
- Create workbooks
- Add formulas (=SUM, =AVERAGE, etc.)
- Apply styling (fonts, colors, borders)
- Multiple sheets
- Data validation
- Conditional formatting
- Charts (bar, line, pie)

### LibreOffice (Optional)

Used by `recalc.py` skill to recalculate formulas:
```bash
# Install LibreOffice
brew install --cask libreoffice  # macOS
apt install libreoffice          # Linux
```

**Why?** `openpyxl` writes formulas but doesn't calculate results. LibreOffice can open and recalculate.

---

## Lite SDK Compatibility

### What Works Now ✅

1. **query() with string prompt** - ✅ Complete
2. **Electron IPC integration** - ✅ Complete (not SDK concern)
3. **allowedTools pass-through** - ✅ Complete
4. **Bash execution** - ✅ Complete (Python scripts work)
5. **Message streaming** - ✅ Complete

### What's Missing ❌

1. **settingSources option** - ❌ Phase 1
   - Load skills from `.claude/skills/`
   - Effort: 2-3 days

2. **File upload support** - ❓ Needs testing
   - Attach files to prompts
   - May require special handling
   - Effort: 1-2 days (if not working)

### What's Not Needed ✅

1. **Electron setup** - Not SDK concern (app-level)
2. **Python environment** - User responsibility
3. **openpyxl library** - Python package, not SDK

---

## Implementation Plan

### Phase 1: Add settingSources

**Step 1:** Research CLI support
```bash
claude --help | grep -A 5 settings
```

**Step 2:** Implement loading
```typescript
if (options.settingSources?.includes('project')) {
  const skillsDir = path.join(cwd, '.claude/skills');
  // Read .md files and inject into system prompt
}
```

**Effort:** 2-3 days

### Test File Upload

**Step 1:** Test if files work with current SDK
```typescript
query({
  prompt: {
    content: 'Analyze this data',
    files: [{ name: 'data.xlsx', buffer: fileBuffer }]
  }
})
```

**Step 2:** If not working, add support
- May need to write files to temp dir
- Pass file paths to CLI
- Effort: 1-2 days

---

## Testing Strategy

### Test 1: Python Script Generation

```typescript
test('excel-demo - generate Python script', async () => {
  for await (const msg of query({
    prompt: 'Create a Python script that generates a simple Excel file',
    options: {
      allowedTools: ['Write', 'Bash'],
      permissionMode: 'bypassPermissions',
      allowDangerouslySkipPermissions: true,
      maxTurns: 10
    }
  })) {
    // Should Write a .py file
    // Should Bash execute it
    // Should produce .xlsx file
  }
});
```

### Test 2: Skills Loading

```typescript
test('excel-demo - load xlsx skills', async () => {
  // Create .claude/skills/xlsx/test.md
  await fs.writeFile('.claude/skills/xlsx/test.md', '# Test skill');

  for await (const msg of query({
    prompt: 'Use the xlsx test skill',
    options: {
      settingSources: ['project'],
      allowedTools: ['Skill'],
      maxTurns: 5
    }
  })) {
    // Should load and execute skill
  }
});
```

---

## Example Use Cases

### 1. Workout Tracker

Features:
- Date + Exercise + Sets/Reps columns
- Summary sheet with totals
- Auto-calculate: total workouts, average sets
- Charts: workouts per week

### 2. Budget Tracker

Features:
- Income vs Expenses
- Monthly breakdown (12 columns)
- Categories (rent, food, transport, etc.)
- Savings calculation
- Year-over-year comparison sheet

### 3. Data Analysis

User uploads existing Excel:
- Claude reads data
- Identifies patterns
- Suggests improvements
- Creates summary sheet
- Generates charts

---

## Key Learnings

### 1. Electron + SDK Integration

Electron main process runs SDK:
```typescript
// Main process has access to filesystem and spawn
const q = query({ ... });

// Renderer process gets results via IPC
ipcMain.on('query', async (event, prompt) => {
  for await (const msg of q) {
    event.reply('message', msg);
  }
});
```

**Pattern works for any desktop app.**

### 2. Python for Complex Tasks

JavaScript libraries for Excel are limited:
- `exceljs` - Good but not as mature as openpyxl
- `xlsx` - Read-only or basic writes

Python's `openpyxl`:
- Full Excel features
- Formulas, charts, validation
- Industry standard

**Lesson:** Use best tool for the job, Claude can generate Python.

### 3. Skills = Reusable Tools

`.claude/skills/xlsx/recalc.py`:
- Reusable across projects
- Version controlled
- Can be shared

**Pattern:** Build library of skills over time.

### 4. File Watching Pattern

Electron watches `agent/` directory:
```typescript
// Before query: snapshot files
const before = fs.readdirSync('agent/').filter(f => f.endsWith('.xlsx'));

// After query: find new files
const after = fs.readdirSync('agent/').filter(f => f.endsWith('.xlsx'));
const newFiles = after.filter(f => !before.includes(f));

// Show download buttons for new files
```

**Use:** Auto-detect generated outputs.

---

## Production Considerations

### 1. Python Environment

Users need:
```bash
python3 -m venv .venv
source .venv/bin/activate
pip install openpyxl
```

**Solution:** Document setup clearly, or bundle Python.

### 2. LibreOffice Dependency

Optional but useful:
- Recalculates formulas
- Converts to PDF
- Opens in preview

**Solution:** Make it optional, document installation.

### 3. File Size Limits

Large Excel files (10MB+):
- Slow to generate
- Slow to upload
- Memory intensive

**Solution:** Implement size limits, show progress.

### 4. Error Handling

Python script errors:
- Syntax errors
- Import errors
- Runtime errors

**Solution:** Parse stderr, show helpful messages.

---

## Recommendations

### Short-term (Phase 1)

**After settingSources is implemented:**
1. Test basic Excel generation
2. Verify Python script execution
3. Test skills loading

**Estimated compatibility:** 90%

### Medium-term (Phase 2)

**Test file upload:**
1. Determine if files work currently
2. If not, implement file handling
3. Test with uploaded Excel files

**Estimated compatibility:** 95%

### Long-term (Phase 3)

**Polish:**
1. Add file size warnings
2. Better error messages for Python errors
3. Progress indicators for long operations

---

## Porting Guide

### To Run with Lite SDK

```diff
- import { query } from '@anthropic-ai/claude-agent-sdk';
+ import { query } from 'lite-claude-agent-sdk';

// Main process (Electron)
ipcMain.on('claude-code:query', async (event, data) => {
  const q = query({
    prompt: data.content,
    options: {
      maxTurns: 50,
      cwd: path.join(process.cwd(), 'agent'),
      model: 'opus',
      allowedTools: ['Bash', 'Write', 'Read', 'Glob', 'Skill'],
+     settingSources: ['project']  // Phase 1 feature
    }
  });

  for await (const msg of q) {
    event.reply('claude-code:message', msg);
  }
});
```

**Prerequisites:**
1. ❌ settingSources option (Phase 1)
2. ❓ File upload support (needs testing)

**Expected compatibility:** 90% after Phase 1

---

## Next Steps

1. **Add settingSources** (Phase 1)
   - 2-3 days
   - Required for skills

2. **Test file upload** with current SDK
   - 1 day testing
   - 1-2 days implementation (if broken)

3. **Port excel-demo** to examples/
   - After Phase 1 complete
   - Test end-to-end

4. **Document Python setup**
   - Installation guide
   - Troubleshooting common errors

---

## Reference

- **Source:** `/tmp/claude-agent-sdk-demos/excel-demo/`
- **Main Process:** `src/main/main.ts` (250+ lines)
- **Python Agent:** `agent/*.py` (example scripts)
- **Skills:** `agent/.claude/skills/xlsx/`
- **README:** `README.md`

**Status:** ⚠️ 90% compatible, needs settingSources

**Priority:** MEDIUM (shows desktop app integration + Python)

**Estimated Time to Full Compatibility:** 3-5 days (Phase 1 features + testing)
