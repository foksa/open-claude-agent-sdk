# Repository Rename - Instructions

## ✅ What's Been Done

1. **Directory renamed**: `lite-claude-agent-sdk` → `lite-claude-agent-sdk`
2. **package.json updated**:
   - Name: `@lite-claude/agent-sdk` → `@lite-claude/agent-sdk`
   - Description: Updated to reflect "lightweight alternative"
3. **Main files updated**:
   - README.md title and description
   - src/index.ts header comment
   - RESEARCH_SUMMARY.md header

## 🔧 What You Need to Do

### Step 1: Update All Remaining References

Run the helper script to replace all "symdion" references throughout the codebase:

```bash
cd /Users/marshal/Work/lite-claude-agent-sdk
chmod +x update-all-refs.sh
./update-all-refs.sh
```

This will update:
- All `.md` files (documentation)
- All `.ts`/`.js` files (source code, tests, examples)
- The plan file at `~/.claude/plans/sharded-giggling-dream.md`

### Step 2: Rewrite Git History (Squash Commits)

Run the git history rewrite script:

```bash
chmod +x rewrite-history.sh
./rewrite-history.sh
```

This will:
- Create a backup branch (`backup-before-squash`)
- Squash all 11 commits into 2 clean commits:
  1. Initial project setup with all research
  2. Rename to lite-claude-agent-sdk

### Step 3: Verify the Changes

```bash
# Check git history
git log --oneline

# Expected output:
# abc1234 chore: rename project to lite-claude-agent-sdk
# def5678 chore: initial project setup

# Check that all files are updated
grep -r "symdion" . --exclude-dir=node_modules --exclude-dir=.git
# Should return minimal or no results
```

### Step 4: Push to Remote (if applicable)

If you have a remote repository:

```bash
git push --force-with-lease
```

⚠️ **Warning**: This will rewrite history on the remote. Only do this if:
- You're the only one working on this repository
- Or you've coordinated with other contributors

### Step 5: Clean Up Helper Scripts

After verification, you can remove the helper scripts:

```bash
rm rewrite-history.sh update-all-refs.sh RENAME_INSTRUCTIONS.md
git add -A
git commit -m "chore: remove temporary rename scripts"
```

---

## 📝 Summary of Changes

### Package Name
- **Old**: `@lite-claude/agent-sdk`
- **New**: `@lite-claude/agent-sdk`

### Project Name
- **Old**: "Lite Claude Agent SDK"
- **New**: "Lite Claude Agent SDK"

### Description
- **Old**: "Modern, lightweight SDK for building AI agents with Claude"
- **New**: "A lightweight alternative to Claude Agent SDK - 70x smaller, uses local CLI"

### Git History
- **Old**: 11 commits with various development stages
- **New**: 2 clean commits (setup + rename)

---

## 🎯 Why This Rename?

The original name "Symdion" referred to your app name, not the SDK itself. The new name "Lite Claude Agent SDK" better reflects:

1. **Purpose**: Lightweight alternative to official SDK
2. **Clarity**: Immediately obvious what it does
3. **SEO**: Better discoverability (people searching for "claude agent sdk")
4. **Ecosystem fit**: Follows naming pattern of other community SDKs

---

## 🚀 Next Steps After Rename

Once the rename is complete, you can proceed with Phase 1 implementation:

1. **Phase 1**: Add PermissionMode type definitions
2. **Phase 2**: Core process spawning
3. **Phase 3**: Query function implementation
4. **Phase 4**: Tool & MCP support
5. **Phase 5**: Integration & polish

See the plan file for full implementation details: `~/.claude/plans/sharded-giggling-dream.md`

---

## ❓ Questions or Issues?

If you encounter any issues:

1. Check that you're in the correct directory: `/Users/marshal/Work/lite-claude-agent-sdk`
2. Verify git status: `git status`
3. Check backup branch exists: `git branch --list backup-*`
4. You can always restore from backup: `git reset --hard backup-before-squash`
