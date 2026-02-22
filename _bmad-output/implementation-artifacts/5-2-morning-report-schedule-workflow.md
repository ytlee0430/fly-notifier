# Story 5.2: 每日早報排程 Workflow

Status: done

## Story

As a 使用者（Bruce）,
I want 每天早上 6 點（台灣時間）自動收到早報,
So that 我起床後就能看到最新價格摘要。

## Acceptance Criteria

**Given** .github/workflows/morning-report.yml 已建立
**When** GitHub Actions cron 觸發（`0 22 * * *`，UTC 22:00 = 台灣 06:00）
**Then** Workflow 使用 Node.js 22.x 執行 `tsx src/morning-report.ts`
**And** 環境變數從 GitHub Secrets 正確注入
**And** Workflow 支援手動觸發（workflow_dispatch）

**Given** scan.yml 和 morning-report.yml 同時存在
**When** 各自排程觸發
**Then** 兩個 Workflow 完全獨立運行，互不影響
**And** 全部使用免費層級資源，月成本 $0

## Tasks / Subtasks

- [x] Task 1: 建立 .github/workflows/morning-report.yml (AC: cron UTC 22:00、Node.js 22、secrets、workflow_dispatch)
  - [x] 1.1 設定 cron: `0 22 * * *` 和 workflow_dispatch 觸發
  - [x] 1.2 設定 Node.js 22.x 環境與 npm ci
  - [x] 1.3 注入四個 GitHub Secrets 環境變數
  - [x] 1.4 執行 npm run report（早報不需 dedup cache）
- [x] Task 2: 撰寫 workflow 結構驗證測試 (AC: 確認 YAML 關鍵欄位正確)
  - [x] 2.1 驗證 cron 排程字串（UTC 22:00）
  - [x] 2.2 驗證 workflow_dispatch 觸發
  - [x] 2.3 驗證執行命令為 npm run report

## Dev Notes

### 時區說明
- UTC 22:00 = 台灣時間（UTC+8）06:00
- GitHub Actions cron 以 UTC 為準

### 與 scan.yml 的差異
- 無需 dedup cache（早報是摘要，不追蹤去重）
- 執行 `npm run report`（`tsx src/morning-report.ts`）

## Dev Agent Record

### Agent Model Used
claude-sonnet-4-6

### Completion Notes List
- ✅ Task 1: 建立 .github/workflows/morning-report.yml，含 cron 0 22 * * *、workflow_dispatch、Node.js 22、4 secrets
- ✅ Task 2: 在 tests/workflows/morning-report-workflow.test.ts 新增 YAML 結構驗證測試

### File List
- `.github/workflows/morning-report.yml` (新建)
- `tests/workflows/morning-report-workflow.test.ts` (新建)

### Change Log
- 2026-02-22: 建立 morning-report.yml GitHub Actions workflow；補充 YAML 結構驗證測試
- 2026-02-22: [Code Review] 加入 timeout-minutes: 10；修正 Node.js 版本測試精確度
