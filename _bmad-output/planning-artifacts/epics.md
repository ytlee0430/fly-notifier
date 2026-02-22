---
stepsCompleted: ['step-01-validate-prerequisites', 'step-02-design-epics', 'step-03-create-stories', 'step-04-final-validation']
inputDocuments: ['prd.md', 'architecture.md']
---

# fly-notifier - Epic Breakdown

## Overview

This document provides the complete epic and story breakdown for fly-notifier, decomposing the requirements from the PRD and Architecture requirements into implementable stories.

## Requirements Inventory

### Functional Requirements

- FR1: 使用者可配置監控航線（出發地、目的地）
- FR2: 使用者可為每條航線設定獨立的價格閾值（TWD）
- FR3: 使用者可為每條航線設定出發日期彈性區間
- FR4: 使用者可為每條航線設定偏好的出發時間範圍
- FR5: 使用者可為每條航線設定偏好的抵達時間範圍
- FR6: 使用者可設定乘客組成（成人數、兒童數）
- FR7: 使用者可啟用或停用個別航線的監控
- FR8: 使用者可新增或移除監控航線
- FR9: 系統依排程自動掃描所有啟用的監控航線
- FR10: 系統透過外部航班 API 查詢含稅總價（含指定乘客組成）
- FR11: 系統利用彈性日期參數在單次 API 呼叫中取得多天結果
- FR12: 系統根據出發/抵達時間偏好過濾不符合的航班
- FR13: 系統識別低於價格閾值的航班
- FR14: 系統在發現低價航班時即時推播 LINE 通知
- FR15: 通知內容包含：航線、日期、出發/抵達時間、航空公司、轉機資訊、含稅總價、訂票連結
- FR16: 系統避免對相同航班重複推播（同航班號+同日期+同價格在去重窗口內不重複通知）
- FR17: 系統在每日固定時間發送各航線最低價摘要早報
- FR18: 每日早報不論有無 match 都發送
- FR19: 系統支援 Provider Pattern，可擴展多個航班資料來源
- FR20: 單一 Provider 故障不影響其他 Provider
- FR21: 系統記錄 Provider 錯誤日誌
- FR22: 系統依固定間隔（每 2 小時）自動執行掃描
- FR23: 系統在每日固定時間執行早報掃描
- FR24: 系統控制 API 呼叫量在免費額度內

### NonFunctional Requirements

- NFR1: API 金鑰與 LINE token 透過安全的密鑰管理機制管理，不寫入程式碼
- NFR2: 程式碼倉庫不含任何明文密鑰
- NFR3: 單次 API 呼叫失敗不導致整個掃描流程中斷
- NFR4: Provider 錯誤日誌包含時間戳、Provider 名稱、回應狀態碼、錯誤訊息
- NFR5: API 呼叫總量每月不超過 2,000 次
- NFR6: 排程失敗時下次排程仍正常執行（無狀態依賴）
- NFR7: 去重機制在 Cache 過期後自動重置，不影響運作
- NFR8: 月運行成本 $0（全免費層級）

### Additional Requirements

- **Starter Template**: Minimal TypeScript Project 手動初始化（npm init + dependencies），影響 Epic 1 Story 1
- Node.js 22.x LTS + TypeScript 5.x (strict mode) + ESM 模組系統
- `amadeus` npm SDK v11.0.0（ADR-01：官方 SDK，自動處理 OAuth2）
- `@line/bot-sdk` v10.6.0（ADR-02：官方 SDK，push message 封裝）
- GitHub Actions Cache + JSON 去重機制（ADR-03：7 天 TTL，Cache Key = `dedup-{routeKey}`）
- `config.ts` 硬編碼配置（ADR-04：MVP 階段，Phase 2 移至 Google Sheet）
- 錯誤處理策略：隔離不重試，try-catch + log + return empty（ADR-05）
- 兩個獨立 GitHub Actions Workflow：scan.yml（每 2 小時）+ morning-report.yml（每日 UTC 22:00）（ADR-06）
- GitHub Secrets + dotenv 環境設定（ADR-07：AMADEUS_CLIENT_ID/SECRET、LINE_CHANNEL_ACCESS_TOKEN、LINE_USER_ID）
- FlightProvider interface + FlightOffer / RouteConfig / AppConfig 標準型別
- 結構化 JSON logger（所有 log 含 module + action 欄位，禁止 console.log）
- Phase 1a Spike 驗證項目：Amadeus dateWindow 多天回傳、含稅價幣別與 TWD 轉換、LINE push message 格式、GitHub Actions cron 排程

### FR Coverage Map

| FR | Epic | Story | 說明 |
|----|------|-------|------|
| FR1 | Epic 1 | 1.2 | 配置監控航線 |
| FR2 | Epic 1 | 1.2 | 價格閾值設定 |
| FR3 | Epic 1 | 1.2 | 出發日期區間 |
| FR4 | Epic 1 | 1.2 | 出發時間偏好 |
| FR5 | Epic 1 | 1.2 | 抵達時間偏好 |
| FR6 | Epic 1 | 1.2 | 乘客組成 |
| FR7 | Epic 1 | 1.2 | 啟用/停用航線 |
| FR8 | Epic 1 | 1.2 | 新增/移除航線 |
| FR9 | Epic 2 | 2.3 | 排程自動掃描 |
| FR10 | Epic 2 | 2.2 | API 查詢含稅價 |
| FR11 | Epic 2 | 2.2 | dateWindow 多天查詢 |
| FR12 | Epic 2 | 2.3 | 時間偏好過濾 |
| FR13 | Epic 2 | 2.3 | 低價識別 |
| FR14 | Epic 3 | 3.1 | LINE 即時推播 |
| FR15 | Epic 3 | 3.1 | 通知完整內容 |
| FR16 | Epic 3 | 3.2 | 去重避免重複 |
| FR17 | Epic 4 | 4.1 | 每日早報 |
| FR18 | Epic 4 | 4.1 | 無 match 也發送 |
| FR19 | Epic 2 | 2.1 | Provider Pattern |
| FR20 | Epic 2 | 2.1, 2.3 | Provider 故障隔離 |
| FR21 | Epic 2 | 2.1, 2.2 | Provider 錯誤日誌 |
| FR22 | Epic 5 | 5.1 | 每 2 小時掃描 |
| FR23 | Epic 5 | 5.2 | 每日早報排程 |
| FR24 | Epic 5 | 5.1 | API 額度控制 |

**覆蓋率：24/24 FRs (100%), 8/8 NFRs (100%)**

## Epic List

### Epic 1: 專案初始化與航線設定管理
使用者可以在 config.ts 中定義和管理所有監控航線的設定（目的地、價格閾值、日期區間、時間偏好、乘客組成）。
**FRs covered:** FR1, FR2, FR3, FR4, FR5, FR6, FR7, FR8
**NFRs addressed:** NFR1, NFR2

### Epic 2: 航班價格掃描引擎
系統可透過 Amadeus API 查詢多條航線的航班含稅價格，並根據時間偏好過濾、識別低於閾值的航班。
**FRs covered:** FR9, FR10, FR11, FR12, FR13, FR19, FR20, FR21
**NFRs addressed:** NFR3, NFR4, NFR5

### Epic 3: 低價航班即時通知
使用者在低價航班被發現時收到 LINE 推播通知，包含完整航班資訊和訂票連結，且不會收到重複通知。
**FRs covered:** FR14, FR15, FR16
**NFRs addressed:** NFR7

### Epic 4: 每日早報
使用者每天早上收到所有監控航線的最低價格摘要，不論有無低價 match。
**FRs covered:** FR17, FR18

### Epic 5: GitHub Actions 自動化排程
系統全自動運行：每 2 小時掃描低價航班、每日早上發送早報，零人工介入。
**FRs covered:** FR22, FR23, FR24
**NFRs addressed:** NFR6, NFR8

## Epic 1: 專案初始化與航線設定管理

使用者可以在 config.ts 中定義和管理所有監控航線的設定（目的地、價格閾值、日期區間、時間偏好、乘客組成）。

### Story 1.1: 專案初始化與開發環境建立

As a 開發者,
I want 初始化 TypeScript 專案並安裝所有必要依賴,
So that 後續功能開發有一致的基礎環境。

**Acceptance Criteria:**

**Given** 空的專案目錄
**When** 執行專案初始化
**Then** package.json 包含正確的 dependencies（amadeus, @line/bot-sdk）和 devDependencies（typescript, tsx, vitest, @types/node）
**And** package.json 設定 `"type": "module"`
**And** tsconfig.json 啟用 strict mode 和 ESM 模組
**And** vitest.config.ts 已建立
**And** .env.example 包含 AMADEUS_CLIENT_ID、AMADEUS_CLIENT_SECRET、LINE_CHANNEL_ACCESS_TOKEN、LINE_USER_ID
**And** .gitignore 包含 node_modules/、.env、dist/
**And** src/ 目錄結構已建立（providers/、scanner/、notifier/、utils/）
**And** npm run dev / npm run scan / npm run report / npm test 腳本已定義
**And** `tsx src/index.ts` 可成功執行（空的入口點）

### Story 1.2: 航線設定模組

As a 使用者（Bruce）,
I want 在 config.ts 中配置監控航線的所有設定,
So that 系統知道要掃描哪些航線、什麼價格觸發通知、什麼時間範圍可接受。

**Acceptance Criteria:**

**Given** config.ts 已建立
**When** 匯入 AppConfig
**Then** 包含 passengers 設定（adults: 2, children: 1）
**And** 包含 5 條預設航線（TPE → NRT/KIX/FUK/OKA/CTS），每條有獨立 priceThreshold（TWD）
**And** 每條航線包含 dateRange（start/end ISO date string）
**And** 每條航線可選配 departureTimeRange 和 arrivalTimeRange（earliest/latest HH:mm）
**And** 每條航線包含 enabled 布林值控制啟停
**And** RouteConfig、AppConfig interface 定義在 config.ts 中並匯出
**And** 新增航線只需在 routes 陣列新增一筆 RouteConfig
**And** 移除航線只需刪除或設定 enabled: false
**And** 所有密鑰（API key、LINE token）不出現在 config.ts，透過環境變數讀取

## Epic 2: 航班價格掃描引擎

系統可透過 Amadeus API 查詢多條航線的航班含稅價格，並根據時間偏好過濾、識別低於閾值的航班。

### Story 2.1: FlightProvider 介面與結構化 Logger

As a 開發者,
I want 定義統一的 FlightProvider 介面和 FlightOffer 型別，以及結構化 logger,
So that 所有航班資料來源使用一致的介面，且錯誤日誌格式統一。

**Acceptance Criteria:**

**Given** providers/types.ts 已建立
**When** 匯入 FlightProvider 和 FlightOffer
**Then** FlightOffer interface 包含所有欄位（source, origin, destination, departureDate, departureTime, arrivalTime, airline, flightNumber, stops, totalPriceTWD, currency, bookingUrl）
**And** FlightProvider interface 定義 `search(route: RouteConfig, passengers: { adults: number; children: number }): Promise<FlightOffer[]>` 方法
**And** provider-registry.ts 提供 `getProviders(): FlightProvider[]` 函式，支援多 Provider 註冊
**And** utils/logger.ts 提供 info/warn/error 方法，輸出結構化 JSON 含 module + action 欄位
**And** logger 禁止使用 console.log，統一透過 logger 輸出
**And** 所有型別均有 TypeScript 嚴格型別定義，無 `any`

### Story 2.2: Amadeus Provider 實作

As a 系統,
I want 透過 Amadeus API 查詢指定航線的航班含稅價格,
So that 使用者可以取得真實的航班報價資料。

**Acceptance Criteria:**

**Given** 有效的 Amadeus API 憑證（環境變數）和一條啟用的航線設定
**When** AmadeusProvider.search() 被呼叫
**Then** 使用 amadeus SDK 呼叫 Flight Offers Search API，傳入正確的出發地/目的地/乘客數
**And** 使用 dateWindow 參數在單次 API 呼叫中取得日期區間內多天結果
**And** 回傳的資料正確轉換為 FlightOffer[] 格式
**And** 含稅總價正確解析（若非 TWD 則記錄原始幣別，幣別轉換邏輯待 Phase 1a spike 確認）
**And** bookingUrl 正確產生

**Given** Amadeus API 呼叫失敗（網路錯誤、401、500 等）
**When** AmadeusProvider.search() 捕捉到錯誤
**Then** 使用 logger.error 記錄錯誤日誌，包含時間戳、Provider 名稱（"amadeus"）、回應狀態碼、錯誤訊息
**And** 回傳空陣列 `[]`，不 throw 異常
**And** 不影響其他 Provider 或其他航線的掃描

### Story 2.3: Scanner 掃描邏輯

As a 系統,
I want 對 Provider 回傳的航班結果進行時間過濾和價格比對,
So that 只有符合使用者偏好且低於閾值的航班被識別出來。

**Acceptance Criteria:**

**Given** Provider 回傳一組 FlightOffer[] 和對應的 RouteConfig
**When** Scanner 執行過濾
**Then** 出發時間不在 departureTimeRange 內的航班被排除
**And** 抵達時間不在 arrivalTimeRange 內的航班被排除
**And** 未設定 timeRange 時不過濾（全部通過）
**And** totalPriceTWD 低於 priceThreshold 的航班被標記為低價

**Given** 多條啟用的航線設定
**When** Scanner 執行全部航線掃描
**Then** 只掃描 enabled: true 的航線
**And** 單一航線掃描失敗不影響其他航線（try-catch 隔離）
**And** 回傳各航線的低價航班列表和各航線最低價（供早報使用）
**And** API 呼叫數量等於啟用的航線數（每航線 1 次 dateWindow 呼叫）

## Epic 3: 低價航班即時通知

使用者在低價航班被發現時收到 LINE 推播通知，包含完整航班資訊和訂票連結，且不會收到重複通知。

### Story 3.1: LINE 通知模組

As a 使用者（Bruce）,
I want 透過 LINE 收到格式清晰的低價航班通知,
So that 我可以在 10 秒內判斷是否購買。

**Acceptance Criteria:**

**Given** 有效的 LINE Channel Access Token 和 User ID（環境變數）
**When** 呼叫 LINE 通知模組發送低價航班訊息
**Then** 使用 @line/bot-sdk push message API 成功送出純文字通知
**And** 通知內容包含：航線（TPE→NRT）、日期、出發/抵達時間、航空公司、航班號、轉機資訊（直飛/轉機N次）、含稅總價（TWD）、訂票連結
**And** 多筆低價航班分開為獨立訊息或清晰分段

**Given** LINE API 呼叫失敗
**When** 通知模組捕捉到錯誤
**Then** 使用 logger.error 記錄錯誤（含 module: "line-notifier"、action、錯誤訊息）
**And** 回傳失敗狀態，不 throw 異常
**And** 不影響其他航線的通知發送

### Story 3.2: 去重機制

As a 使用者（Bruce）,
I want 系統不要對同一航班重複通知我,
So that 我的 LINE 不會被相同資訊洗版。

**Acceptance Criteria:**

**Given** 去重模組已初始化
**When** 檢查一筆 FlightOffer 是否已通知
**Then** 使用 Cache Key 格式 `{flightNumber}-{departureDate}-{totalPriceTWD}` 比對
**And** 已存在於 Cache 中的航班返回「已通知」，不再推播
**And** 不存在於 Cache 中的航班返回「未通知」，允許推播

**Given** 新的低價航班通知成功發送
**When** 更新去重 Cache
**Then** 該航班的 Cache Key 被寫入 JSON 記錄
**And** Cache 以 `dedup-{routeKey}`（如 `dedup-TPE-NRT`）為 key 儲存

**Given** GitHub Actions Cache 過期（7 天 TTL）
**When** 同一航班仍低於閾值
**Then** Cache 自動重置後該航班會被重新通知（可接受行為）
**And** 系統正常運作不中斷

**Given** 本地開發環境（無 GitHub Actions Cache）
**When** 執行去重邏輯
**Then** 使用本地檔案系統或記憶體作為 fallback，不報錯

### Story 3.3: 掃描通知流程串接

As a 使用者（Bruce）,
I want 手動執行一次完整的掃描→過濾→去重→通知流程,
So that 我可以驗證整個系統端到端運作正常。

**Acceptance Criteria:**

**Given** config.ts 有啟用的航線、環境變數已設定
**When** 執行 `npm run scan`（tsx src/index.ts）
**Then** index.ts 協調完整流程：讀取 Config → 呼叫 Provider 掃描 → Scanner 過濾 → Dedup 去重 → LINE 通知
**And** 有低價航班時發送 LINE 通知
**And** 無低價航班時不發送通知，僅 log info
**And** 去重後的航班不重複通知

**Given** 某條航線的 Provider 或通知失敗
**When** 流程繼續執行
**Then** 失敗的航線被 log 記錄，其他航線正常完成
**And** 程序正常結束（exit code 0）

## Epic 4: 每日早報

使用者每天早上收到所有監控航線的最低價格摘要，不論有無低價 match。

### Story 4.1: 每日早報掃描與推播

As a 使用者（Bruce）,
I want 每天早上收到所有監控航線的最低價摘要,
So that 我不用主動查價也能掌握市場行情，確認系統正常運作。

**Acceptance Criteria:**

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

## Epic 5: GitHub Actions 自動化排程

系統全自動運行：每 2 小時掃描低價航班、每日早上發送早報，零人工介入。

### Story 5.1: 掃描排程 Workflow

As a 使用者（Bruce）,
I want 系統每 2 小時自動掃描低價航班並通知我,
So that 我不用手動執行，低價機會不會被錯過。

**Acceptance Criteria:**

**Given** .github/workflows/scan.yml 已建立
**When** GitHub Actions cron 觸發（`0 */2 * * *`，每 2 小時）
**Then** Workflow 使用 Node.js 22.x 執行 `tsx src/index.ts`
**And** 環境變數從 GitHub Secrets 正確注入（AMADEUS_CLIENT_ID、AMADEUS_CLIENT_SECRET、LINE_CHANNEL_ACCESS_TOKEN、LINE_USER_ID）
**And** GitHub Actions Cache 正確讀取/寫入去重記錄
**And** Workflow 支援手動觸發（workflow_dispatch）方便測試

**Given** 上次排程執行失敗
**When** 下次 cron 觸發
**Then** 新的執行完全獨立，不受上次失敗影響（無狀態依賴）

**Given** 每月 API 呼叫量
**When** 5 航線 × 12 次/天（每 2 小時）× 30 天 = ~1,800 次
**Then** 加上每日早報 5 次 × 30 天 = 150 次，合計 ~1,950 次，低於 2,000 次限制

### Story 5.2: 每日早報排程 Workflow

As a 使用者（Bruce）,
I want 每天早上 6 點（台灣時間）自動收到早報,
So that 我起床後就能看到最新價格摘要。

**Acceptance Criteria:**

**Given** .github/workflows/morning-report.yml 已建立
**When** GitHub Actions cron 觸發（`0 22 * * *`，UTC 22:00 = 台灣 06:00）
**Then** Workflow 使用 Node.js 22.x 執行 `tsx src/morning-report.ts`
**And** 環境變數從 GitHub Secrets 正確注入
**And** Workflow 支援手動觸發（workflow_dispatch）

**Given** scan.yml 和 morning-report.yml 同時存在
**When** 各自排程觸發
**Then** 兩個 Workflow 完全獨立運行，互不影響
**And** 全部使用免費層級資源，月成本 $0
