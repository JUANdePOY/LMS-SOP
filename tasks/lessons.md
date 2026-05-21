# Lessons Learned

## 2026-05-22 - Corrupted node_modules Dependencies
**Context**: Server failed to start with `Error: Cannot find module './common'` from the `debug` package, followed by `Error: Cannot find module './mimeScore'` from `mime-types`.
**Mistake**: Assuming a single package reinstall would fix the issue; the corruption affected multiple packages.
**Pattern**: When Node.js cannot find internal modules within packages, the entire `node_modules` directory is likely corrupted or incomplete.
**Action**: Always do a full clean reinstall (`rm -r node_modules && npm install`) when encountering missing internal module errors, rather than trying to fix individual packages.

## 2026-05-22 - Uncommitted File Loss During Tool Interruption
**Context**: A partial edit to `From-main-pafr_database_schema.sql` was lost when a subsequent command caused the shell to abort.
**Mistake**: Making changes to files without committing them to version control first.
**Pattern**: Uncommitted work is vulnerable to loss when tools fail or are interrupted.
**Action**: Commit important files before making edits, or use atomic operations to ensure file state consistency.