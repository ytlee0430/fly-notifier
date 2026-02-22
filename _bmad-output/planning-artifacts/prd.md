---
stepsCompleted: ['step-01-init', 'step-02-discovery', 'step-03-success', 'step-04-journeys', 'step-05-domain', 'step-06-innovation', 'step-07-project-type', 'step-08-scoping', 'step-09-functional', 'step-10-nonfunctional', 'step-11-polish', 'step-12-complete']
inputDocuments: ['spec.md']
workflowType: 'prd'
documentCounts:
  briefs: 0
  research: 0
  brainstorming: 0
  projectDocs: 0
  other: 1
classification:
  projectType: api_backend
  domain: general
  complexity: low
  projectContext: greenfield
  futureExpansion: hotel_pricing
---

# Product Requirements Document - fly-notifier

**Author:** Bruce
**Date:** 2026-02-16

## 執行摘要

**fly-notifier** 是一個自動化機票價格監控工具，定期掃描台北出發至日本多個目的地的航班含稅總價，當價格低於使用者設定的閾值時，透過 LINE 即時推播通知。

**核心價值：** 使用者無需主動查價，系統自動捕捉低價機會並推播，純文字通知即可 10 秒內判斷是否購買。

**目標使用者：** 個人使用者（Bruce），家庭旅行（2 大 1 小），定期關注台北飛日本的機票價格。

**差異化：** 全免費運行（GitHub Actions + Amadeus Free Tier + LINE Free），零維運、無狀態、無伺服器。

## 成功指標

### 使用者成功

- 純文字通知即可判斷是否購買，無需額外點擊
- 價格閾值 per 航線可配置
- 出發/抵達時間範圍可配置，排除紅眼航班
- 價格為唯一觸發因素

### 商業成功

- 系統穩定自動運行，低價機會即時捕捉
- 無需每日主動檢查
- 每日早報確保使用者知道系統在運作

### 技術成功

- 全免費層級運行：Amadeus Free Tier、GitHub Actions Free、LINE Free
- 無狀態、無伺服器、零維運
- API 呼叫量控制在 2,000 次/月內

### 可衡量成果

- 低於閾值航班在 2 小時內推播（掃描間隔）
- 每日早報 100% 送達
- 月運行成本：$0

## 產品範圍與分階段開發

### MVP 策略

**方式：** Problem-Solving MVP — 最快驗證核心價值
**完成定義：** 能成功掃描、過濾、推播即完成
**資源：** 單人開發

### Phase 1a — 技術驗證 Spike

- 驗證 Amadeus `dateWindow` 回傳多天結果
- 確認含稅價格幣別與 TWD 轉換機制
- 測試 LINE push message 純文字格式
- 驗證 GitHub Actions cron 排程

### Phase 1b — MVP 核心功能

- 5 條航線監控（TPE → NRT/KIX/FUK/OKA/CTS）
- 2 大 1 小，彈性日期（Amadeus `dateWindow`）
- 可配置價格閾值（per 航線）
- 可配置出發/抵達時間範圍篩選
- 低於閾值即時 LINE 純文字推播（含航班時間、航空公司、轉機、價格、連結）
- 每日早報：各航線最低價摘要（不論有無 match）
- GitHub Actions 排程（每 2 小時 + 每日早報）
- GitHub Cache 短期去重
- `config.ts` 設定管理

### Phase 2 — Growth

- Google Sheet UI 設定管理
- LINE Flex Message 卡片樣式通知
- 飯店價格監控（Provider Pattern 擴展）
- 新增航線/目的地

### Phase 3 — Vision

- 多使用者支援
- 更多通知管道（Email、Telegram）
- 機票 + 飯店組合推薦

### 風險緩解

| 風險類型 | 策略 |
|---------|------|
| 技術風險 | Phase 1a spike 先驗證 Amadeus API 假設 |
| 額度風險 | 2,000 次/月為硬限制，超出時限制監控數量 |
| 單一來源風險 | Provider Pattern 預留擴展，MVP 不過度防禦 |

## 使用者旅程

### 旅程一：明確計畫 — 「四月沖繩家庭旅行」

**開場**：決定四月帶家人去沖繩 4 天。打開 `config.ts` 新增監控：TPE → OKA，4/10-4/20，預算 TWD 20,000，06:00-22:00 出發。

**等待期**：每 2 小時掃描。每天早報：「OKA 最低價：TWD 22,500（長榮 BR112，08:30 出發，直飛）」。

**高潮**：LINE 通知：「OKA 低價！TWD 18,900 — 虎航 IT201，4/12 09:15，直飛，2大1小含稅」。10 秒判斷：買。

**結局**：移除 OKA 監控，繼續其他航線。

### 旅程二：探索模式 — 「日本哪裡便宜就去哪」

**開場**：無特定計畫。5 條航線全開，未來 3 個月，各自預算不同。

**日常**：每天早報 5 條航線最低價，邊喝咖啡邊掃一眼。

**轉折**：福岡兩週沒 match，調高 FUK 閾值 15,000 → 18,000。

**高潮**：FUK 通知 TWD 17,200，星宇航空，10:00 直飛。決定去福岡。

### 旅程三：設定調整 — 「計畫變了」

**行動**：沖繩取消改大阪。刪除 OKA 監控，新增 KIX 5/1-5/15，TWD 22,000，偏好早上出發。系統無縫切換。

### 旅程需求摘要

| 能力 | 來源旅程 |
|------|---------|
| 可配置航線、日期、價格閾值、時間偏好 | 一、二、三 |
| 即時低價 LINE 推播（航班時間、航空公司、轉機、價格、連結） | 一、二 |
| 每日早報（各航線最低價摘要） | 一、二 |
| 新增/移除/調整監控航線 | 二、三 |
| 去重避免重複通知 | 一、二 |

## 技術架構考量

### 系統概述

排程自動化後端服務，消費外部航班 API、過濾結果、推播通知。不對外提供 API，無使用者認證需求。

### 外部 API 整合策略

- Provider Pattern，不依賴單一 API 來源
- MVP：Amadeus Provider
- 預留擴展：Skyscanner、Duffel 等備選 Provider
- Provider 故障隔離：單一 Provider 失敗不影響其他
- 不做過度防禦性設計

### 速率限制管理

- Amadeus Free Tier：2,000 次/月
- 5 航線 × 1 call（dateWindow） = 5 次/輪
- 每 2 小時 + 每日早報 ≈ ~1,900 次/月

### 實作原則

- 統一 `FlightProvider` interface
- Provider 失敗時 log 錯誤不中斷流程
- 無版本管理、無 SDK 需求

## 功能需求

### 航線設定管理

- **FR1:** 使用者可配置監控航線（出發地、目的地）
- **FR2:** 使用者可為每條航線設定獨立的價格閾值（TWD）
- **FR3:** 使用者可為每條航線設定出發日期彈性區間
- **FR4:** 使用者可為每條航線設定偏好的出發時間範圍
- **FR5:** 使用者可為每條航線設定偏好的抵達時間範圍
- **FR6:** 使用者可設定乘客組成（成人數、兒童數）
- **FR7:** 使用者可啟用或停用個別航線的監控
- **FR8:** 使用者可新增或移除監控航線

### 航班價格掃描

- **FR9:** 系統依排程自動掃描所有啟用的監控航線
- **FR10:** 系統透過外部航班 API 查詢含稅總價（含指定乘客組成）
- **FR11:** 系統利用彈性日期參數在單次 API 呼叫中取得多天結果
- **FR12:** 系統根據出發/抵達時間偏好過濾不符合的航班
- **FR13:** 系統識別低於價格閾值的航班

### 通知推播

- **FR14:** 系統在發現低價航班時即時推播 LINE 通知
- **FR15:** 通知內容包含：航線、日期、出發/抵達時間、航空公司、轉機資訊、含稅總價、訂票連結
- **FR16:** 系統避免對相同航班重複推播（同航班號+同日期+同價格在去重窗口內不重複通知）
- **FR17:** 系統在每日固定時間發送各航線最低價摘要早報
- **FR18:** 每日早報不論有無 match 都發送

### 外部 API 整合

- **FR19:** 系統支援 Provider Pattern，可擴展多個航班資料來源
- **FR20:** 單一 Provider 故障不影響其他 Provider
- **FR21:** 系統記錄 Provider 錯誤日誌

### 排程與執行

- **FR22:** 系統依固定間隔（每 2 小時）自動執行掃描
- **FR23:** 系統在每日固定時間執行早報掃描
- **FR24:** 系統控制 API 呼叫量在免費額度內

## 非功能需求

### 安全性

- **NFR1:** API 金鑰與 LINE token 透過安全的密鑰管理機制管理，不寫入程式碼
- **NFR2:** 程式碼倉庫不含任何明文密鑰

### 整合可靠性

- **NFR3:** 單次 API 呼叫失敗不導致整個掃描流程中斷
- **NFR4:** Provider 錯誤日誌包含時間戳、Provider 名稱、回應狀態碼、錯誤訊息
- **NFR5:** API 呼叫總量每月不超過 2,000 次

### 運行可靠性

- **NFR6:** 排程失敗時下次排程仍正常執行（無狀態依賴）
- **NFR7:** 去重機制在 Cache 過期後自動重置，不影響運作

### 成本

- **NFR8:** 月運行成本 $0（全免費層級）
