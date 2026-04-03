# GBCRM Repository Cleanup & Upstream Sync Plan (Revised v2)

## Executive Summary

The `gbvai/gbcrm` repository is a fork of `twentyhq/twenty`, forked at commit
`58e8b466f3` (Feb 20, 2026) which is between upstream v1.17.0 and v1.18.0.
The main custom feature is **Wildix x-bees phone call integration**.

**CORRECTED** upstream gap: **792 commits behind**, spanning versions
v1.17.0 → v1.18.0 → v1.19.0 → v1.20.0 → v1.20.3 (and development toward v1.21).
11,668 files changed upstream with 730K+ insertions.

Our production workspace version is assumed to be **1.19.0** (the latest
version our current upgrade commands support: v1.16 → v1.17 → v1.18 → v1.19).

## Current State (Verified Apr 3, 2026)

### Branch Structure
- `main` - Production branch (deployed to Railway at gbcrm-production.up.railway.app)
- `staging` - Staging environment (diverged from main)
- `i18n` - Internationalization branch (stale, 6 weeks old)
- `wildix` - Wildix feature branch (already merged into main, deletable)

### Fork Point & Upstream Gap
- **Fork Point**: Commit `58e8b466f3` (Feb 20, 2026)
- **Upstream commits since fork**: 792
- **Upstream versions since fork**: v1.18.0, v1.19.0, v1.20.0, v1.20.3
- **Upstream files changed**: 11,668 files, 730,850 insertions, 308,930 deletions
- **Our commits since fork**: 28 (Wildix integration + fixes)

### Our Custom Modifications (28 commits, 206 files)
- **43 new files** (custom additions - no conflict risk)
  - 14 Wildix module files (controllers, services, DTOs, tests)
  - 10 PhoneCall standard object files (entities, query hooks, field metadata)
  - 7 deployment files (Dockerfiles, Railway configs)
  - 5 frontend files (phone call timeline components, landing pages)
  - 3 docs, 2 CLI commands, 2 attachment util files
- **~38 modified upstream source files** (merge conflict hotspots)
- **~130 modified locale/translation files** (mechanical conflicts)
- **0 deleted upstream files**
- **0 modified package.json files** (no custom dependency additions)
- **0 custom TypeORM migrations** (phoneCall uses metadata sync, not migrations)

### Critical: Upstream Migration Chain (v1.17 → v1.21)

Our codebase has upgrade commands for: **v1.16 → v1.17 → v1.18 → v1.19**
Upstream HEAD has upgrade commands for: **v1.19 → v1.20 → v1.21** (v1.16-v1.18 DELETED)

**Upgrade commands are version-gated**: the runner checks each workspace's
`version` column and only runs commands for the NEXT version step. Workspaces
MUST be at version N-1 to upgrade to version N. You cannot skip versions.

#### v1.17 → v1.18 (ALREADY RUN on our production DB)
- Morph relations for attachments/notes/tasks
- Webhook metadata backfill + NOT NULL enforcement
- File records deletion + restructuring

#### v1.18 → v1.19 (ALREADY RUN on our production DB)
- Favorites → Navigation menu items migration
- Person avatar, attachment, workspace picture file migrations
- Activity rich text file ID migration
- Standard views + field metadata backfill
- System fields backfill

#### v1.19 → v1.20 (NEEDS TO RUN after merge)
- **Permission system overhaul** (identify + NOT NULL for permissions)
- **RICH_TEXT → TEXT rename** (RICH_TEXT_V2 → RICH_TEXT)
- **Messaging infrastructure** migration to core metadata schema
- Navigation menu item type backfill + orphan cleanup
- Command menu items backfill
- CLI application registration
- Select field option IDs backfill
- Standard index view name updates
- Make workflow searchable

#### v1.20 → v1.21 (NEEDS TO RUN after merge)
- Global key-value pair dedup + unique index
- Datasource → workspace table backfill
- Page layouts + field widget view fields backfill
- Engine command deduplication
- AI agent text → JSON format migration
- Command menu item label update

### Merge Conflict Analysis (Dry-Run Verified)

**135 total conflicting files** from `git merge upstream/main`:
- 122 locale/translation files (.po and generated .ts)
- 13 source code files requiring manual resolution:

| File | Risk | Notes |
|------|------|-------|
| upgrade-version-command.module.ts | CRITICAL | Complete restructure; must re-wire SyncStandardObjectsCommand |
| core-engine.module.ts | CRITICAL | Must re-add WildixModule import |
| ActivityRichTextEditor.tsx | HIGH | 12+ conflict markers; upstream rewrote significantly |
| useCreateAppRouter.tsx | MEDIUM | Must re-add Home/Privacy/TOS routes |
| useAttachments.tsx | MEDIUM | Attachment util rename collision |
| useUploadAttachmentFile.tsx | MEDIUM | Attachment util rename collision |
| StandaloneRichTextWidget.tsx | MEDIUM | Attachment util rename collision |
| twenty-front/project.json | LOW | Build config differences |
| twenty-server/project.json | LOW | Build config differences |
| twenty-server/.env.example | LOW | WILDIX env vars |
| yarn.lock | LOW | Auto-resolvable with yarn install |
| .gitignore | LOW | Trivial |
| CLAUDE.md | LOW | Trivial |

**Auto-merged but needs manual verification:**
- standard-object.constant.ts (VERIFIED: 3-way merge is clean and correct)
- config-variables.ts (WILDIX_* vars survive)
- workspace-query-hook.module.ts (PhoneCallQueryHookModule survives)
- All compute-*-field-metadata.util.ts files (phoneCall relations survive)

### Post-Merge Required Updates
1. Add i18n `msg\`...\`` wrapping to all phoneCall field labels/descriptions
   (upstream wrapped all standard object strings with Lingui i18n)
2. Re-register SyncStandardObjectsCommand in new v1.20+ module structure
3. Verify branding patches (Twenty → GBCRM) survived in index.html,
   manifest.json, Logo.tsx, SignInUp.tsx
4. Regenerate locale files rather than resolving 122 .po conflicts by hand

## Implementation Plan: "Porcupine Protocol"

### Guiding Principles
- Every step is reversible until the final deploy
- Production is never touched until everything is verified on `sync` branch
- Database migrations run with `--dry-run` first
- Build must pass before considering deploy
- Tag everything before and after

### Pre-Flight (Before Starting)

```bash
# 1. Ensure main is clean and tagged
git checkout main
git tag v0.2.1-pre-upstream-sync
git push origin v0.2.1-pre-upstream-sync

# 2. Create the sync branch
git checkout -b sync main

# 3. Verify upstream remote is configured with full history
git remote add upstream https://github.com/twentyhq/twenty.git 2>/dev/null
git fetch upstream  # must be unshallowed
```

### Phase 1: The Merge (sync branch)

```bash
# Merge upstream into sync branch
git merge upstream/main --no-ff -m "Merge upstream twentyhq/twenty v1.20.3+ into gbcrm"

# This will produce 135 conflicts. Resolve in this order:
```

**Conflict Resolution Order:**

1. **Locale files (122 files)**: Accept upstream versions (`git checkout --theirs`),
   then regenerate our phoneCall translations after build works
2. **yarn.lock**: Accept upstream, then run `yarn install` to reconcile
3. **.gitignore / CLAUDE.md**: Manual merge (trivial)
4. **project.json files**: Take upstream, re-add our custom targets
5. **.env.example**: Take upstream, re-add WILDIX_* variables
6. **core-engine.module.ts**: Take upstream, re-add WildixModule import
7. **upgrade-version-command.module.ts**: Take upstream (v1.20+v1.21 structure),
   re-add SyncStandardObjectsCommand + TwentyStandardApplicationModule
8. **useCreateAppRouter.tsx**: Take upstream, re-add Home/Privacy/TOS routes
9. **ActivityRichTextEditor.tsx**: Take upstream version, re-apply our markdown
   fallback fix if still needed
10. **Attachment util files** (useAttachments, useUploadAttachmentFile,
    StandaloneRichTextWidget): Evaluate if upstream has fixed the issue we
    patched; if so, drop our changes; if not, re-apply cleanly

### Phase 2: Post-Merge Verification (sync branch)

```bash
# 1. Verify no conflict markers remain
git grep -r "<<<<<<" -- "*.ts" "*.tsx" "*.json" "*.sh"

# 2. Build twenty-shared first (dependency)
npx nx build twenty-shared

# 3. Typecheck everything
npx nx typecheck twenty-server
npx nx typecheck twenty-front

# 4. Build server and front
npx nx build twenty-server
npx nx build twenty-front

# 5. Run server unit tests
npx nx test twenty-server

# 6. Verify phoneCall standard object is still registered
grep -r "phoneCall" packages/twenty-shared/src/metadata/constants/standard-object.constant.ts
grep -r "WildixModule" packages/twenty-server/src/engine/core-modules/core-engine.module.ts
grep -r "PhoneCallQueryHookModule" packages/twenty-server/src/engine/workspace-manager/
```

### Phase 3: Migration Safety Check

```bash
# Check the upgrade command will work:
# - Our workspace is at v1.19.0
# - Upstream allCommands has v1.19 → v1.20 → v1.21
# - The runner will see workspace at 1.19, run v1.20 commands
# - Then see workspace at 1.20, run v1.21 commands

# Verify the command structure:
grep -A3 "allCommands" packages/twenty-server/src/database/commands/upgrade-version-command/upgrade.command.ts

# The v1.20 commands include:
# - Permission system migration (safe: backfill then constrain)
# - RICH_TEXT rename (metadata only)
# - Messaging infrastructure move (data copy, not delete)
# All are idempotent via feature flags
```

### Phase 4: Deploy to Railway (EOD)

```bash
# 1. Push sync branch
git push origin sync

# 2. On Railway: point deployment to sync branch (NOT main yet)
# 3. Set DISABLE_DB_MIGRATIONS=true initially
# 4. Verify the build completes
# 5. Set DISABLE_DB_MIGRATIONS=false
# 6. Monitor logs for upgrade command execution
# 7. Verify healthcheck passes
# 8. Test Wildix webhook endpoint
# 9. Test phone call timeline display

# If all good:
git checkout main
git merge sync --ff-only  # or merge commit
git push origin main
git tag v0.3.0-upstream-sync
git push origin v0.3.0-upstream-sync
```

### Rollback Plan

If ANYTHING goes wrong during deploy:
1. Railway: redeploy previous commit (pre-upstream-sync tag)
2. Database: if migrations ran partially, restore from Supabase backup
3. The sync branch stays separate until merge into main is confirmed

## Risk Matrix (Updated)

| Risk | Severity | Likelihood | Mitigation |
|------|----------|------------|------------|
| Upgrade commands fail on v1.19→v1.20 | HIGH | LOW | Commands are idempotent; --dry-run first |
| phoneCall metadata corrupted by sync | HIGH | LOW | Verified: 3-way merge is clean |
| Build fails after merge | MEDIUM | MEDIUM | Fix on sync branch before deploy |
| Branding reverts to "Twenty" | LOW | HIGH | Post-merge branding patch script |
| Locale files broken | LOW | HIGH | Regenerate from lingui extract |
| Wildix module fails to load | MEDIUM | LOW | Single import line in core-engine |

## Linear Issues (Updated Priorities)

1. **CRM-1** (P0): Fix deployment workflow - cd-deploy-main.yaml
2. **CRM-4** (P0): Upstream sync - THIS PLAN (792 commits, 4 major versions)
3. **CRM-2** (P1): .gitignore cleanup (do AFTER merge)
4. **CRM-3** (P1): Branch cleanup (do AFTER merge)
5. **CRM-5** (P2): Large binary cleanup
6. **CRM-6** (P2): Ongoing sync maintenance process

---
*Plan created: April 3, 2026*
*Revised: April 3, 2026 (v2 - corrected upstream gap, migration analysis)*
*Estimated merge effort: 4-6 hours (including build verification)*
