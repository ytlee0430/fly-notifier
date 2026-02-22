---
stepsCompleted: [1, 2, 3, 4, 5, 6, 7, 8]
lastStep: 8
status: 'complete'
completedAt: '2026-02-18'
inputDocuments: ['prd.md', 'prd-validation-report.md', 'spec.md']
workflowType: 'architecture'
project_name: 'fly-notifier'
user_name: 'Bruce'
date: '2026-02-17'
---

# Architecture Decision Document

_This document builds collaboratively through step-by-step discovery. Sections are appended as we work through each architectural decision together._

## Project Context Analysis

### Requirements Overview

**Functional Requirements:**
24 個 FR 分為 5 個能力群組：
1. **航線設定管理**（FR1-FR8）：config.ts 驅動，per-航線配置（閾值、日期、時間偏好、乘客）
2. **航班價格掃描**（FR9-FR13）：排程觸發，Amadeus dateWindow 多天查詢，時間/價格過濾
3. **通知推播**（FR14-FR18）：LINE 即時低價通知 + 每日早報，去重防重複
4. **外部 API 整合**（FR19-FR21）：Provider Pattern 擴展性，故障隔離，錯誤日誌
5. **排程與執行**（FR22-FR24）：每 2 小時掃描 + 每日早報，API 額度控制

**Non-Functional Requirements:**
- **安全性**：密鑰不入碼，透過安全機制管理（NFR1-2）
- **故障隔離**：單一 API 失敗不中斷流程，結構化錯誤日誌（NFR3-4）
- **額度控制**：月 API 呼叫 ≤ 2,000 次（NFR5）
- **無狀態**：排程失敗不影響下次執行，Cache 過期自動重置（NFR6-7）
- **零成本**：全免費層級運行（NFR8）

**Scale & Complexity:**
- Primary domain: Scheduled Backend Automation
- Complexity level: Low
- Estimated architectural components: 5（Config、Provider、Scanner、Notifier、Scheduler）

### Technical Constraints & Dependencies

- **執行環境**：GitHub Actions（cron 排程，無常駐程序）
- **語言/Runtime**：Node.js + TypeScript（spec.md 已指定）
- **API 額度硬限**：Amadeus Free Tier 2,000 次/月，無法超額
- **通知管道**：LINE Messaging API（push message, 需 channel access token + user ID）
- **去重機制**：GitHub Actions Cache（7 天 TTL），無外部儲存
- **無資料庫**：所有狀態為暫時性（Cache）或配置性（config.ts）
- **單一使用者**：MVP 階段僅 Bruce，無多租戶需求

### Cross-Cutting Concerns Identified

- **API 速率限制**：影響掃描頻率、航線數量、日期範圍策略
- **錯誤處理與回復**：Provider 故障隔離，每次執行獨立不依賴前次狀態
- **去重一致性**：Cache key 設計（航班號+日期+價格），Cache 失效後的行為
- **幣別處理**：Amadeus 回傳可能非 TWD，需確認轉換機制（Phase 1a spike 驗證項目）
- **日誌與可觀測性**：GitHub Actions 日誌為唯一除錯管道

## Starter Template Evaluation

### Primary Technology Domain

Scheduled Backend Automation — 無 UI、無 web server、無資料庫。純排程腳本消費外部 API 並推播通知。

### Starter Options Considered

| 選項 | 評估 |
|------|------|
| Full-stack starter (T3, Next.js) | 不適用，無 UI 需求 |
| Backend framework (NestJS, Express) | 過度，不對外提供 API |
| CLI framework (oclif) | 不適用，非 CLI 工具 |
| **Minimal TypeScript project** | ✅ 最適合，精簡且足夠 |

### Selected Starter: Minimal TypeScript Project（手動初始化）

**Rationale:**
專案為單一用途排程腳本，任何 framework starter 都過度。手動初始化確保零冗餘依賴，完全控制專案結構。

**Initialization Command:**

```bash
mkdir fly-notifier && cd fly-notifier
npm init -y
npm install typescript tsx vitest @types/node --save-dev
npm install amadeus @line/bot-sdk
npx tsc --init
```

### Architectural Decisions Provided by Setup

**Language & Runtime:**
- Node.js LTS (22.x) + TypeScript 5.x (strict mode)
- ESM 模組系統 (`"type": "module"` in package.json)
- tsx 用於開發期直接執行 .ts 檔案

**Build & Execution:**
- 開發：`tsx src/index.ts`（無需編譯步驟）
- CI/GitHub Actions：`tsx src/index.ts`（直接執行）
- 無需 dist/ 輸出目錄（非 library、非 server）

**Testing Framework:**
- Vitest — 原生 TypeScript 支援，ESM 相容，快速執行

**Code Organization:**

```
fly-notifier/
├── src/
│   ├── config.ts          # 航線設定、閾值、乘客配置
│   ├── index.ts           # 主入口（掃描 + 通知）
│   ├── morning-report.ts  # 每日早報入口
│   ├── providers/
│   │   ├── types.ts       # FlightProvider interface, FlightOffer type
│   │   └── amadeus.ts     # Amadeus Provider 實作
│   ├── notifier/
│   │   └── line.ts        # LINE 通知推播
│   ├── scanner/
│   │   └── scanner.ts     # 掃描邏輯（過濾、比對閾值）
│   └── utils/
│       ├── dedup.ts       # 去重機制（GitHub Cache）
│       └── logger.ts      # 結構化日誌
├── .github/
│   └── workflows/
│       ├── scan.yml       # 每 2 小時掃描排程
│       └── morning-report.yml  # 每日早報排程
├── tests/
├── tsconfig.json
├── package.json
└── .env.example
```

**Development Experience:**
- `npm run dev` — tsx watch mode 本地開發
- `npm run scan` — 手動觸發一次掃描
- `npm run report` — 手動觸發早報
- `npm test` — Vitest 執行測試

**Note:** 專案初始化應為第一個 implementation story。

## Core Architectural Decisions

### Decision Priority Analysis

**Critical Decisions (Block Implementation):**
1. Amadeus API 整合方式
2. LINE 通知整合方式
3. 去重機制設計
4. GitHub Actions 工作流設計

**Important Decisions (Shape Architecture):**
5. 錯誤處理策略
6. 環境設定管理

**Deferred Decisions (Post-MVP):**
- Google Sheet 設定管理（Phase 2）
- LINE Flex Message 格式（Phase 2）
- 多 Provider 實作（Phase 2+）
- 多使用者支援（Phase 3）

### External API Integration

**ADR-01: Amadeus API — 使用官方 SDK**
- **Decision:** 使用 `amadeus` npm 套件 (v11.0.0)
- **Rationale:** 官方維護，自動處理 OAuth2 token 取得與 refresh，API 呼叫簡潔
- **Trade-off:** 無原生 TypeScript 型別，需自行定義回傳型別包裝
- **Affects:** providers/amadeus.ts, providers/types.ts

**ADR-02: LINE 通知 — 使用官方 SDK**
- **Decision:** 使用 `@line/bot-sdk` (v10.6.0)
- **Rationale:** 官方維護，push message API 封裝完善，MVP 純文字 → Phase 2 Flex Message 無需換 SDK
- **Affects:** notifier/line.ts

### Data Architecture

**ADR-03: 去重機制 — GitHub Actions Cache + JSON**
- **Decision:** 使用 GitHub Actions Cache 儲存已通知航班記錄
- **Cache Key:** `dedup-{routeKey}`（如 `dedup-TPE-NRT`）
- **Cache Content:** JSON，記錄已通知的 `{flightNumber}-{date}-{price}` 組合
- **TTL:** GitHub Actions Cache 預設 7 天，自動過期重置
- **流程:** 讀取 Cache → 掃描 → 過濾已通知 → 通知新的 → 更新 Cache
- **Trade-off:** 7 天後同航班若仍低價會再通知一次（可接受）
- **Affects:** utils/dedup.ts, scan.yml

**ADR-04: 配置管理 — config.ts 硬編碼**
- **Decision:** MVP 階段航線配置寫在 `src/config.ts`
- **Rationale:** 單人使用，修改後 push 即生效，零基礎建設
- **Deferred:** Phase 2 移至 Google Sheet UI
- **Affects:** config.ts

### Error Handling Strategy

**ADR-05: 錯誤處理 — 隔離不重試**
- **Decision:** 各層獨立 try-catch，失敗 log 後繼續，不重試
- **Provider 層:** 單一 Provider 失敗 log 錯誤，繼續下一個 Provider
- **Scanner 層:** 單一航線掃描失敗不影響其他航線
- **Notifier 層:** LINE 推播失敗 log 錯誤，不重試（下次排程再觸發）
- **Rationale:** PRD 原則「壞了再修」，不過度防禦。每 2 小時排程本身就是天然重試機制
- **Affects:** 所有模組

### Infrastructure & Deployment

**ADR-06: GitHub Actions — 兩個獨立 Workflow**
- **Decision:** `scan.yml` 和 `morning-report.yml` 分開
- **scan.yml:** `cron: '0 */2 * * *'`（每 2 小時）
- **morning-report.yml:** `cron: '0 22 * * *'`（UTC 22:00 = 台灣 06:00）
- **Rationale:** 邏輯分離，各自排程互不影響，易於除錯
- **Affects:** .github/workflows/

**ADR-07: 環境設定 — GitHub Secrets + dotenv**
- **Decision:**
  - CI：GitHub Secrets → 環境變數注入（`AMADEUS_CLIENT_ID`、`AMADEUS_CLIENT_SECRET`、`LINE_CHANNEL_ACCESS_TOKEN`、`LINE_USER_ID`）
  - 本地開發：`.env` + dotenv
- **Rationale:** 零成本，GitHub 原生支援，符合 NFR1/NFR2
- **Affects:** .github/workflows/*.yml, .env.example

### Decision Impact Analysis

**Implementation Sequence:**
1. 專案初始化（Starter Setup）
2. Config 模組（ADR-04）
3. Provider 介面 + Amadeus 實作（ADR-01）
4. Scanner 掃描邏輯
5. LINE 通知模組（ADR-02）
6. 去重機制（ADR-03）
7. GitHub Actions 工作流（ADR-06, ADR-07）
8. 每日早報
9. 錯誤處理完善（ADR-05）

**Cross-Component Dependencies:**
- Scanner 依賴 Provider（需先完成 FlightProvider interface）
- Notifier 依賴 Scanner 產出的 FlightOffer（共用型別）
- Dedup 依賴 GitHub Actions Cache API（需在 CI 環境驗證）
- 所有模組依賴 Config（第一個實作）

## Implementation Patterns & Consistency Rules

### Naming Patterns

**File Naming:**
- 目錄：kebab-case（`providers/`, `notifier/`, `utils/`）
- 檔案：kebab-case（`morning-report.ts`, `line.ts`）
- 型別檔案：`types.ts`（每個模組一個）
- 測試檔案：`*.test.ts`

**Code Naming:**
- 函式/變數：camelCase（`getFlightOffers`, `priceThreshold`）
- 型別/介面：PascalCase（`FlightOffer`, `FlightProvider`, `RouteConfig`）
- 常數：UPPER_SNAKE_CASE（`MAX_API_CALLS_PER_MONTH`）
- Enum：PascalCase key + PascalCase value（`NotificationType.Alert`）

**TypeScript Style:**
- 優先使用 `interface` 定義物件形狀（可擴展）
- 使用 `type` 定義 union types 和 utility types
- 所有 public function 明確標註回傳型別
- 禁止 `any`，必要時用 `unknown` + type guard

### Structure Patterns

**Test Organization:**
- 測試集中在 `tests/` 目錄
- Mirror src 結構：`tests/providers/amadeus.test.ts`
- 測試檔名：`{source-file}.test.ts`

**Module Organization:**
- 每個模組一個 `index.ts` 只在需要 re-export 時建立
- 避免 barrel exports（本專案規模不需要）
- Import 使用完整相對路徑（`../providers/types.ts`）

### Format Patterns

**FlightOffer 標準型別：**

```typescript
interface FlightOffer {
  source: string;          // Provider 名稱 (e.g., "amadeus")
  origin: string;          // IATA code (e.g., "TPE")
  destination: string;     // IATA code (e.g., "NRT")
  departureDate: string;   // ISO date "2026-04-12"
  departureTime: string;   // "09:15"
  arrivalTime: string;     // "13:30"
  airline: string;         // 航空公司名稱
  flightNumber: string;    // "IT201"
  stops: number;           // 0=直飛, 1=轉機一次
  totalPriceTWD: number;   // 含稅總價（TWD）
  currency: string;        // 原始幣別
  bookingUrl: string;      // 訂票連結
}
```

**Config 結構：**

```typescript
interface RouteConfig {
  origin: string;
  destination: string;
  enabled: boolean;
  priceThreshold: number;        // TWD
  dateRange: { start: string; end: string };
  departureTimeRange?: { earliest: string; latest: string };
  arrivalTimeRange?: { earliest: string; latest: string };
}

interface AppConfig {
  passengers: { adults: number; children: number };
  routes: RouteConfig[];
  morningReportHour: number;     // UTC hour
}
```

### Process Patterns

**Error Handling Pattern:**

```typescript
// 每個 Provider/模組統一格式
try {
  const offers = await provider.search(route);
  return offers;
} catch (error) {
  logger.error({
    module: 'amadeus-provider',
    action: 'search',
    route: `${route.origin}-${route.destination}`,
    error: error instanceof Error ? error.message : String(error),
  });
  return []; // 失敗回傳空陣列，不中斷流程
}
```

**Logger 格式（結構化 JSON）：**

```typescript
// 統一 log 格式
logger.info({ module, action, ...data });
logger.error({ module, action, route, error });
logger.warn({ module, action, message });
```

- Level：`info`（正常流程）、`warn`（可恢復問題）、`error`（失敗）
- 所有 log 含 `module` + `action` 欄位

**去重 Cache Key 格式：**

```
{flightNumber}-{departureDate}-{totalPriceTWD}
// 例: "IT201-2026-04-12-18900"
```

### Enforcement Guidelines

**All AI Agents MUST:**
- 遵循上述命名慣例（kebab-case 檔案、camelCase 變數、PascalCase 型別）
- 使用 FlightOffer 和 RouteConfig 標準型別，不自行定義替代型別
- 錯誤處理回傳空值/空陣列，不 throw 到上層
- 所有 log 使用結構化格式含 module + action
- 禁止 `console.log`，統一使用 logger

### Anti-Patterns

**避免：**
- ❌ `console.log("error:", err)` → ✅ `logger.error({ module, action, error })`
- ❌ `throw new Error(...)` in Provider → ✅ `return []` + log
- ❌ `any` 型別 → ✅ `unknown` + type guard
- ❌ 在 config 中硬編碼 API URL → ✅ 常數或環境變數
- ❌ 混用 interface 和 type 定義物件 → ✅ 統一用 interface

## Project Structure & Boundaries

### Complete Project Directory Structure

```
fly-notifier/
├── .github/
│   └── workflows/
│       ├── scan.yml                # 每 2 小時掃描排程
│       └── morning-report.yml      # 每日早報排程
├── src/
│   ├── config.ts                   # AppConfig + RouteConfig 定義與資料
│   ├── index.ts                    # 主入口：掃描 → 過濾 → 通知
│   ├── morning-report.ts           # 早報入口：掃描所有航線 → 彙整最低價 → 通知
│   ├── providers/
│   │   ├── types.ts                # FlightProvider interface, FlightOffer interface
│   │   ├── amadeus.ts              # AmadeusProvider 實作
│   │   └── provider-registry.ts    # Provider 註冊與取得（支援多 Provider 擴展）
│   ├── scanner/
│   │   └── scanner.ts              # 掃描邏輯：呼叫 Provider → 時間過濾 → 價格比對
│   ├── notifier/
│   │   ├── types.ts                # NotificationMessage interface
│   │   └── line.ts                 # LINE push message 實作
│   └── utils/
│       ├── dedup.ts                # 去重：讀寫 Cache JSON、比對已通知記錄
│       ├── logger.ts               # 結構化 logger（info/warn/error）
│       └── currency.ts             # 幣別轉換工具（若 Amadeus 回傳非 TWD）
├── tests/
│   ├── providers/
│   │   └── amadeus.test.ts
│   ├── scanner/
│   │   └── scanner.test.ts
│   ├── notifier/
│   │   └── line.test.ts
│   ├── utils/
│   │   ├── dedup.test.ts
│   │   └── currency.test.ts
│   └── integration/
│       └── scan-flow.test.ts       # 端到端掃描流程整合測試
├── .env.example                    # 環境變數範本
├── .gitignore
├── package.json
├── tsconfig.json
└── vitest.config.ts
```

### Architectural Boundaries

**Provider Boundary（外部 API 隔離層）：**
- `providers/types.ts` 定義 `FlightProvider` interface 和 `FlightOffer` interface
- 所有 Provider 實作此 interface，回傳統一的 `FlightOffer[]`
- Provider 內部處理認證、API 呼叫、資料轉換
- Provider 失敗回傳 `[]`，不 throw
- Scanner 不直接接觸任何外部 API — 只透過 Provider interface

**Scanner Boundary（業務邏輯層）：**
- 接收 `FlightOffer[]` + `RouteConfig`
- 負責：時間過濾、價格比對、去重過濾
- 產出：符合條件的 `FlightOffer[]`（待通知）+ 各航線最低價（早報用）
- 不直接操作 Cache 或通知 — 透過回傳值交由上層協調

**Notifier Boundary（通知輸出層）：**
- 接收格式化好的通知內容
- 負責：LINE API 呼叫
- 不關心航班邏輯 — 只負責送出訊息

**Orchestration（index.ts / morning-report.ts）：**
- 協調各模組的執行順序
- `index.ts`：Config → Provider → Scanner → Dedup → Notifier
- `morning-report.ts`：Config → Provider → Scanner → 彙整最低價 → Notifier

### Requirements to Structure Mapping

| FR 群組 | 對應檔案 |
|---------|---------|
| 航線設定管理（FR1-FR8） | `src/config.ts` |
| 航班價格掃描（FR9-FR13） | `src/providers/*.ts` + `src/scanner/scanner.ts` |
| 通知推播（FR14-FR18） | `src/notifier/line.ts` + `src/index.ts` + `src/morning-report.ts` |
| 外部 API 整合（FR19-FR21） | `src/providers/types.ts` + `src/providers/provider-registry.ts` |
| 排程與執行（FR22-FR24） | `.github/workflows/*.yml` |

| NFR | 對應檔案 |
|-----|---------|
| NFR1-2（密鑰安全） | `.github/workflows/*.yml` + `.env.example` |
| NFR3-4（故障隔離/日誌） | `src/utils/logger.ts` + 各模組 try-catch |
| NFR5（API 額度） | `src/config.ts`（航線數量控制）|
| NFR6-7（無狀態/去重） | `src/utils/dedup.ts` |

### Data Flow

```
[GitHub Actions Cron]
        │
        ▼
  [index.ts / morning-report.ts]  ← 讀取 config.ts
        │
        ▼
  [provider-registry.ts] → [amadeus.ts] → Amadeus API
        │                                    │
        │                    FlightOffer[] ◄──┘
        ▼
  [scanner.ts]  ← 時間過濾 + 價格比對
        │
        ▼
  [dedup.ts]  ← 讀取/寫入 GitHub Cache
        │
        ▼ (新的低價航班)
  [line.ts] → LINE Messaging API → Bruce 的 LINE
```

### External Integrations

| 外部服務 | 整合方式 | 對應檔案 |
|---------|---------|---------|
| Amadeus Self-Service API | `amadeus` SDK v11.0.0 | `src/providers/amadeus.ts` |
| LINE Messaging API | `@line/bot-sdk` v10.6.0 | `src/notifier/line.ts` |
| GitHub Actions Cache | `@actions/cache` | `src/utils/dedup.ts` |

## Architecture Validation Results

### Coherence Validation ✅

**Decision Compatibility:**
- Node.js 22.x + TypeScript 5.x + ESM：完全相容
- amadeus SDK 11.0.0 + @line/bot-sdk 10.6.0：均為 Node.js 套件，無衝突
- tsx + Vitest：均支援 ESM + TypeScript，無衝突
- GitHub Actions + GitHub Cache：原生整合，無需額外設定
- 無矛盾決策

**Pattern Consistency:**
- 命名慣例一致：kebab-case 檔案、camelCase 變數、PascalCase 型別
- 錯誤處理模式統一：try-catch + log + return empty
- Logger 格式統一：結構化 JSON + module/action 欄位
- 型別定義統一：interface 優先

**Structure Alignment:**
- 目錄結構對應所有架構決策
- Provider/Scanner/Notifier 邊界清晰
- 測試目錄 mirror 原始碼結構

### Requirements Coverage Validation ✅

**Functional Requirements Coverage:**

| FR | 架構支援 | 狀態 |
|----|---------|------|
| FR1-FR8（航線設定） | config.ts + RouteConfig interface | ✅ |
| FR9-FR13（價格掃描） | Provider + Scanner + dateWindow | ✅ |
| FR14-FR15（低價通知） | Notifier + FlightOffer 型別 | ✅ |
| FR16（去重） | dedup.ts + GitHub Cache | ✅ |
| FR17-FR18（每日早報） | morning-report.ts + 獨立 workflow | ✅ |
| FR19-FR21（Provider Pattern） | provider-registry.ts + types.ts | ✅ |
| FR22-FR24（排程/額度） | GitHub Actions cron + config 控制 | ✅ |

**Coverage: 24/24 FRs (100%)**

**Non-Functional Requirements Coverage:**

| NFR | 架構支援 | 狀態 |
|-----|---------|------|
| NFR1-2（密鑰安全） | GitHub Secrets + .env.example | ✅ |
| NFR3（故障隔離） | try-catch per Provider/Scanner | ✅ |
| NFR4（結構化日誌） | logger.ts + 統一格式 | ✅ |
| NFR5（API 額度） | config.ts 航線數控制 | ✅ |
| NFR6（無狀態） | 每次執行獨立，無持久化依賴 | ✅ |
| NFR7（Cache 重置） | GitHub Cache 7 天 TTL | ✅ |
| NFR8（零成本） | 全 free tier | ✅ |

**Coverage: 8/8 NFRs (100%)**

### Implementation Readiness Validation ✅

**Decision Completeness:**
- 7 個 ADR 均含版本號、理由、影響範圍 ✅
- Implementation sequence 明確定義 ✅

**Structure Completeness:**
- 所有檔案和目錄已定義 ✅
- 2 個 GitHub Actions workflow 已規劃 ✅

**Pattern Completeness:**
- 命名、結構、錯誤處理、日誌格式均有範例 ✅
- Anti-patterns 明確列出 ✅

### Gap Analysis Results

**Critical Gaps:** 0

**Minor Gaps（不影響 MVP 實作）：**
1. **幣別轉換機制**：currency.ts 預留但轉換邏輯待 Phase 1a spike 驗證 Amadeus 回傳幣別後確定
2. **早報訊息格式**：morning-report.ts 的純文字格式細節待實作時定義
3. **@actions/cache 用法**：dedup.ts 的 GitHub Cache API 呼叫方式待實作時驗證

**評估：** 以上皆為 Phase 1a spike 可自然解決的項目，不影響架構正確性。

### Architecture Completeness Checklist

**✅ Requirements Analysis**
- [x] Project context thoroughly analyzed
- [x] Scale and complexity assessed
- [x] Technical constraints identified
- [x] Cross-cutting concerns mapped

**✅ Architectural Decisions**
- [x] 7 ADRs documented with versions
- [x] Technology stack fully specified
- [x] Integration patterns defined (Provider Pattern)
- [x] Error handling strategy defined

**✅ Implementation Patterns**
- [x] Naming conventions established
- [x] Structure patterns defined
- [x] Type definitions specified (FlightOffer, RouteConfig, AppConfig)
- [x] Process patterns documented (error handling, logging, dedup)

**✅ Project Structure**
- [x] Complete directory structure defined
- [x] Component boundaries established
- [x] Integration points mapped
- [x] Requirements to structure mapping complete

### Architecture Readiness Assessment

**Overall Status:** READY FOR IMPLEMENTATION

**Confidence Level:** High

**Key Strengths:**
- 極簡架構，無過度設計
- Provider Pattern 為唯一抽象層，恰到好處
- 清晰的模組邊界與資料流
- 所有 FR/NFR 100% 架構覆蓋
- 零成本、無狀態、零維運

**Areas for Future Enhancement (Phase 2+):**
- Google Sheet 設定管理（取代 config.ts）
- LINE Flex Message（取代純文字）
- 多 Provider 實作（Skyscanner、Duffel）
- 多使用者支援

### Implementation Handoff

**AI Agent Guidelines:**
- Follow all architectural decisions (ADR-01 ~ ADR-07) exactly as documented
- Use implementation patterns consistently across all components
- Respect Provider/Scanner/Notifier boundaries
- Use FlightOffer, RouteConfig, AppConfig 標準型別
- 統一使用 logger，禁止 console.log

**First Implementation Priority:**
1. Phase 1a Spike — 驗證 Amadeus API 假設
2. 專案初始化（npm init + dependencies）
3. Config 模組 → Provider → Scanner → Notifier → Dedup → Workflows
