# Story 4.1: 每日早報掃描與推播

Status: done

## Story

As a 使用者（Bruce）,
I want 每天早上收到所有監控航線的最低價摘要,
So that 我不用主動查價也能掌握市場行情，確認系統正常運作。

## Acceptance Criteria

**Given** config.ts 有多條啟用的航線
**When** 執行 `npm run report`（tsx src/morning-report.ts）
**Then** 掃描所有啟用航線，取得各航線最低價航班
**And** 彙整為一則摘要訊息，包含每條航線的：目的地、最低價（TWD）、航空公司、航班號、出發時間、轉機資訊
**And** 透過 LINE push message 發送摘要

**Given** 某條航線無任何航班結果（API 失敗或無航班）
**When** 彙整早報
**Then** 該航線顯示「無資料」或類似提示，不影響其他航線的摘要
**And** 早報仍正常發送（不論有無 match）

**Given** 所有航線都有結果
**When** 早報送出
**Then** 早報不觸發去重機制（早報是摘要，不是低價通知）
**And** 早報不影響低價通知的去重 Cache

## Tasks / Subtasks

- [x] Task 1: 驗證 sendMorningReport 實作符合所有 AC (AC: 摘要格式、無資料處理、不觸發去重)
  - [x] 1.1 確認 sendMorningReport 彙整格式包含所有必要欄位
  - [x] 1.2 確認無結果航線顯示「無資料」
  - [x] 1.3 確認早報不使用 dedup 模組
- [x] Task 2: 為 sendMorningReport 補充單元測試 (AC: 測試覆蓋摘要格式和 LINE 推播)
  - [x] 2.1 測試正常摘要送出（含多條航線）
  - [x] 2.2 測試有航線無資料時仍送出
  - [x] 2.3 測試 LINE API 失敗時回傳 failure，不 throw

## Dev Notes

### 實作說明
- `src/morning-report.ts` 已作為 Story 3.3 的一部分完成實作
- `src/notifier/line.ts` 的 `sendMorningReport()` 負責格式化與推播
- 早報使用 `result.allOffers`（全部航班）找最低價，不依賴 dedup 機制
- 無航班的航線：`bestOffer = null`，訊息顯示「無資料」

### 訊息格式範例
```
📊 每日航班早報
──────────────────────────────
TPE→NRT: NT$17,491 | CI 001 | 09:00 (直飛)
TPE→KIX: NT$15,071 | IT 202 | 10:30 (直飛)
TPE→FUK: 無資料
```

## Dev Agent Record

### Agent Model Used
claude-sonnet-4-6

### Completion Notes List
- ✅ Task 1: 確認 morning-report.ts + sendMorningReport 完整符合 ACs（已含所有欄位、無資料處理、不觸發去重）
- ✅ Task 2: 新增 sendMorningReport 單元測試（3 個測試涵蓋正常、部分無資料、API 失敗情境）

### File List
- `src/morning-report.ts` (已存在，Story 3.3 實作)
- `src/notifier/line.ts` (已存在，sendMorningReport 已實作)
- `tests/notifier/line.test.ts` (修改，補充 sendMorningReport 測試)
- `tests/setup.test.ts` (修改，tsx 執行測試加入空 credentials env 防止 real API 逾時)

### Change Log
- 2026-02-22: 建立 story 檔；補充 sendMorningReport 單元測試
- 2026-02-22: [Code Review] 補充 tests/setup.test.ts 至 File List；修正測試型別轉型加入 to/type 欄位驗證；sendLowPriceAlert/sendMorningReport 加入空 credentials 早期驗證
