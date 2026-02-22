# Story 5.1: 掃描排程 Workflow

Status: done

## Story

As a 使用者（Bruce）,
I want 系統每 2 小時自動掃描低價航班並通知我,
So that 我不用手動執行，低價機會不會被錯過。

## Acceptance Criteria

**Given** .github/workflows/scan.yml 已建立
**When** GitHub Actions cron 觸發（`0 */2 * * *`，每 2 小時）
**Then** Workflow 使用 Node.js 22.x 執行 `tsx src/index.ts`
**And** 環境變數從 GitHub Secrets 正確注入（AMADEUS_CLIENT_ID、AMADEUS_CLIENT_SECRET、LINE_CHANNEL_ACCESS_TOKEN、LINE_USER_ID）
**And** GitHub Actions Cache 正確讀取/寫入去重記錄（.cache/ 目錄）
**And** Workflow 支援手動觸發（workflow_dispatch）方便測試

**Given** 上次排程執行失敗
**When** 下次 cron 觸發
**Then** 新的執行完全獨立，不受上次失敗影響（無狀態依賴）

**Given** 每月 API 呼叫量
**When** 5 航線 × 12 次/天（每 2 小時）× 30 天 = ~1,800 次
**Then** 加上每日早報 5 次 × 30 天 = 150 次，合計 ~1,950 次，低於 2,000 次限制

## Tasks / Subtasks

- [x] Task 1: 建立 .github/workflows/scan.yml (AC: cron、Node.js 22、secrets、cache、workflow_dispatch)
  - [x] 1.1 設定 cron: `0 */2 * * *` 和 workflow_dispatch 觸發
  - [x] 1.2 設定 Node.js 22.x 環境與 npm ci
  - [x] 1.3 設定 actions/cache 還原/儲存 .cache/ 目錄（dedup 持久化）
  - [x] 1.4 注入四個 GitHub Secrets 環境變數
  - [x] 1.5 執行 npm run scan
- [x] Task 2: 撰寫 workflow 結構驗證測試 (AC: 確認 YAML 關鍵欄位正確)
  - [x] 2.1 驗證 cron 排程字串正確
  - [x] 2.2 驗證 workflow_dispatch 觸發存在
  - [x] 2.3 驗證四個 secrets 環境變數注入

## Dev Notes

### GitHub Actions Cache 策略（dedup 持久化）
- 使用 `actions/cache@v4` restore + save `.cache/` 目錄
- Cache key: `dedup-${{ github.run_id }}`（每次 run 唯一 key 確保寫入）
- restore-keys: `dedup-`（restores 最近一次的 cache）
- 7 天 TTL 由 GitHub Actions 自動管理

### API 呼叫量計算
- 5 航線 × 每 2 小時 × 24 小時 = 5 × 12 = 60 次/天
- 60 次/天 × 30 天 = 1,800 次/月
- 加早報：5 次/天 × 30 天 = 150 次
- 總計：1,950 次 < 2,000 次限制 ✅

## Dev Agent Record

### Agent Model Used
claude-sonnet-4-6

### Completion Notes List
- ✅ Task 1: 建立 .github/workflows/scan.yml，含 cron、workflow_dispatch、Node.js 22、npm cache、dedup cache、4 secrets
- ✅ Task 2: 建立 tests/workflows/scan-workflow.test.ts，驗證 YAML 結構正確性

### File List
- `.github/workflows/scan.yml` (新建)
- `tests/workflows/scan-workflow.test.ts` (新建)

### Change Log
- 2026-02-22: 建立 scan.yml GitHub Actions workflow；補充 YAML 結構驗證測試
- 2026-02-22: [Code Review] 加入 timeout-minutes: 10；修正 restore-keys 格式（移除多餘 | block scalar）；修正 Node.js 版本測試精確度
