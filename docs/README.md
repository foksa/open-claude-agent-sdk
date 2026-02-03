# Documentation

**Last Updated:** 2026-02-02

Complete documentation for the Lite Claude Agent SDK.

---

## 📁 Documentation Structure

```
docs/
├── README.md              ← You are here
├── KNOWN_LIMITATIONS.md   ← Current known limitations
│
├── planning/              ← Project planning
│   ├── ROADMAP.md         - Development timeline & priorities
│   └── FEATURES.md        - Feature matrix & status
│
├── guides/                ← User guides
│   ├── QUICK_START.md     - Getting started guide
│   ├── MIGRATION.md       - Migration from official SDK
│   ├── IMPLEMENTATION_GUIDE.md - Implementation details
│   └── REVERSE_ENGINEERING.md - Proxy CLI debugging technique
│
├── research/              ← Technical research
│   ├── README.md          - Research summary
│   ├── protocol.md        - CLI protocol spec
│   ├── official-sdk.md    - Official SDK analysis
│   ├── performance.md     - Performance optimization
│   ├── architecture.md    - Architecture decisions
│   ├── alternatives.md    - Community implementations
│   ├── cache-token-investigation.md - Cache token parity fix
│   └── PROXY_CLI_SUCCESS.md - Proxy CLI technique discovery
│
├── examples/              ← Code examples
│   └── README.md          - Examples index
│
└── archive/               ← Historical documents
    ├── demos-research/    - Demo analysis files
    └── historical/        - Past documentation
```

---

## 🎯 Quick Navigation

### New to the Project?
1. [../README.md](../README.md) - Project overview
2. [guides/QUICK_START.md](./guides/QUICK_START.md) - Usage examples
3. [planning/FEATURES.md](./planning/FEATURES.md) - What's implemented
4. [KNOWN_LIMITATIONS.md](./KNOWN_LIMITATIONS.md) - Current limitations

### Want to Contribute?
1. [planning/ROADMAP.md](./planning/ROADMAP.md) - What needs to be done
2. [research/README.md](./research/README.md) - Technical background
3. [guides/REVERSE_ENGINEERING.md](./guides/REVERSE_ENGINEERING.md) - Debugging with proxy CLI

### Migrating from Official SDK?
1. [guides/MIGRATION.md](./guides/MIGRATION.md) - Migration guide
2. [research/official-sdk.md](./research/official-sdk.md) - Compatibility analysis

---

## 📚 Core Documents

### planning/ROADMAP.md
**Development timeline and priorities**

- Current status: Baby Steps 1-5 complete, Phase 0.5 (validation) complete
- Phase 1: 4 features (8-10 days)
- Phase 2: 4 features (7-11 days)
- Phase 3: Optional enhancements

### planning/FEATURES.md
**Feature comparison and tracking**

- Complete feature matrix (Lite vs Official SDK)
- Implementation status (✅ ❌ ⚠️)
- Priority levels and effort estimates
- Code examples

### guides/QUICK_START.md
**Getting started with the SDK**

- Installation instructions
- Basic usage examples
- Common patterns
- Best practices

### guides/MIGRATION.md
**Migration from official SDK**

- API compatibility guide
- Code examples (before/after)
- Breaking changes
- Migration steps

### guides/REVERSE_ENGINEERING.md
**Proxy CLI debugging technique**

- Intercept CLI communication for debugging
- Compare Official SDK vs Lite SDK behavior
- Discover protocol differences

---

## 📖 Research Documents

### research/README.md
**Research summary and key findings**

- Protocol is documented
- Local CLI approach validated
- Performance optimization identified
- Cache token parity fix (73% cost reduction)
- 70x smaller bundle size

### research/protocol.md
**CLI protocol specification**

- NDJSON format
- Message types
- CLI flags
- Communication flow

### research/official-sdk.md
**Official SDK analysis**

- How Official SDK works
- Bundle size comparison
- API compatibility path
- Demo compatibility

### research/performance.md
**Performance optimization**

- User config overhead (47% slower, 23% more expensive)
- Isolation modes
- Test results
- Recommendations

### research/cache-token-investigation.md
**Cache token parity fix**

- Discovery of `systemPrompt: ""` field requirement
- Reduced costs from 73% higher to 1.8% cheaper
- Proxy CLI debugging technique

### research/PROXY_CLI_SUCCESS.md
**Proxy CLI technique success**

- Method for intercepting CLI messages
- Comparing Official vs Lite SDK behavior
- Key protocol discoveries

---

## 🗂️ Archive

Historical documents and research files are in `archive/`:

- `archive/demos-research/` - Analysis of official SDK demos
- `archive/historical/` - Past documentation snapshots

---

## 📊 Documentation Stats

**Before Cleanup:**
- 35 files, ~18,000 lines
- Multiple overlapping documents
- Scattered research findings

**After Cleanup:**
- 29 files, ~14,500 lines
- Consolidated core documents
- Clear navigation structure

**Improvements:**
- ✅ 17% fewer files
- ✅ 19% fewer lines
- ✅ Clearer structure
- ✅ Better navigation

---

**Status:** ✅ Documentation Organized
**Date:** 2026-02-02
