# Story 1.1: 專案初始化與開發環境建立

Status: done

## Story

As a 開發者,
I want 初始化 TypeScript 專案並安裝所有必要依賴,
so that 後續功能開發有一致的基礎環境。

## Acceptance Criteria

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

## Tasks / Subtasks

- [x] Task 1: 初始化 npm 專案並設定 package.json (AC: package.json type:module, scripts, dependencies)
  - [x] 1.1 執行 `npm init -y` 產生 package.json
  - [x] 1.2 設定 `"type": "module"` 至 package.json
  - [x] 1.3 安裝 production dependencies: `npm install amadeus @line/bot-sdk`
  - [x] 1.4 安裝 dev dependencies: `npm install --save-dev typescript tsx vitest @types/node`
  - [x] 1.5 在 package.json 加入 npm scripts（dev, scan, report, test, test:watch）
- [x] Task 2: 設定 TypeScript（strict mode + ESM）(AC: tsconfig.json strict + ESM)
  - [x] 2.1 建立 tsconfig.json（module: NodeNext, strict: true）
- [x] Task 3: 設定 Vitest 測試框架 (AC: vitest.config.ts 已建立)
  - [x] 3.1 建立 vitest.config.ts
- [x] Task 4: 建立環境設定檔 (AC: .env.example, .gitignore)
  - [x] 4.1 建立 .env.example（4 個 env vars）
  - [x] 4.2 建立 .gitignore
- [x] Task 5: 建立 src/ 目錄結構與空白入口點 (AC: src/ directories, tsx src/index.ts 可執行)
  - [x] 5.1 建立 src/providers/、src/scanner/、src/notifier/、src/utils/ 目錄
  - [x] 5.2 建立空白 src/index.ts（main entry point）
  - [x] 5.3 建立空白 src/morning-report.ts（morning report entry point）
  - [x] 5.4 驗證 `tsx src/index.ts` 成功執行（無 error，exit code 0）

## Dev Notes

### 🔴 Critical: 精確的相依版本

這是 **MVP 基礎建設故事** - 後續所有故事都依賴此環境。版本設定必須完全符合 Architecture ADR。

**Production Dependencies（確定版本）：**
- `amadeus@11.0.0` — Amadeus Self-Service API 官方 SDK（ADR-01）。**注意：** 此 SDK 無原生 TypeScript 型別，需在 `src/providers/types.ts` 自行定義回傳型別包裝（Story 2.1 任務）
- `@line/bot-sdk@10.6.0` — LINE Messaging API 官方 SDK（ADR-02）。2026-01-27 仍為最新穩定版，完全相容

**Dev Dependencies（推薦版本）：**
- `typescript` — TypeScript 5.x strict mode（`^5.0.0`）
- `tsx@^4.21.0` — TypeScript 直接執行器，無需 compile，支援 ESM + CJS 切換，完全相容 Node.js 22 + ESM
- `vitest@^4.0.18` — ⚠️ **最新穩定版為 v4.0.18（Major Version）**，架構設計時為 v1.x，但 v4 為當前穩定版。安裝時不要鎖定舊版
- `@types/node` — 實際安裝版本為 `^25.3.0`（2026-02 當前最新版）；架構文件原建議 `^22`，但 v25 完全相容 Node.js 22 API，無需降版

**⚠️ Vitest v4 注意事項：** v4 帶入穩定的 Browser Mode（本專案不用），API 與 v1 核心測試 API 相容，無需特殊 migration。

### 精確的 package.json 設定

```json
{
  "name": "fly-notifier",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "scan": "tsx src/index.ts",
    "report": "tsx src/morning-report.ts",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "dependencies": {
    "amadeus": "^11.0.0",
    "@line/bot-sdk": "^10.6.0"
  },
  "devDependencies": {
    "typescript": "^5.0.0",
    "tsx": "^4.21.0",
    "vitest": "^4.0.18",
    "@types/node": "^22.0.0"
  }
}
```

### 精確的 tsconfig.json（ESM + strict mode）

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "lib": ["ES2022"],
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "tests"]
}
```

**關鍵決策：**
- `"module": "NodeNext"` + `"moduleResolution": "NodeNext"` — ESM 正確組合，配合 `"type": "module"`
- `"strict": true` — 啟用所有嚴格模式（noImplicitAny, strictNullChecks 等），後續所有 story 都必須遵守
- `outDir: dist` — 保留但 MVP 不使用（tsx 直接執行 .ts 無需 compile）

### 精確的 vitest.config.ts

```typescript
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
  },
});
```

### 精確的 .env.example

```
# Amadeus API (https://developers.amadeus.com)
AMADEUS_CLIENT_ID=your_amadeus_client_id_here
AMADEUS_CLIENT_SECRET=your_amadeus_client_secret_here

# LINE Messaging API (https://developers.line.biz)
LINE_CHANNEL_ACCESS_TOKEN=your_line_channel_access_token_here
LINE_USER_ID=your_line_user_id_here
```

### 精確的 .gitignore

```
node_modules/
.env
dist/
*.log
.DS_Store
```

### 精確的目錄結構（此 Story 需建立）

```
fly-notifier/              ← 現有 working directory
├── src/
│   ├── index.ts           ← 空白入口點（掃描），此 Story 建立
│   ├── morning-report.ts  ← 空白入口點（早報），此 Story 建立
│   ├── providers/         ← 空目錄，Story 2.1 填充
│   ├── scanner/           ← 空目錄，Story 2.3 填充
│   ├── notifier/          ← 空目錄，Story 3.1 填充
│   └── utils/             ← 空目錄，Story 2.1 填充（logger）
├── tests/                 ← 測試集中在此
├── .env.example
├── .gitignore
├── package.json
├── tsconfig.json
└── vitest.config.ts
```

**⚠️ 不要建立：** `config.ts`（Story 1.2 任務）、`src/providers/types.ts`（Story 2.1 任務）、任何 `.github/` 目錄（Story 5 任務）

### Project Structure Notes

- **此 Story 範疇**：只初始化環境、安裝套件、建立目錄骨架和設定檔
- **不做的事**：不實作任何商業邏輯、不建立 config.ts、不建立任何 provider/scanner/notifier 實作
- **ESM 模組重要性**：所有後續 import 必須使用完整副檔名（`import './config.js'` not `import './config'`），tsx 執行時自動處理
- **amadeus SDK 型別限制**：`amadeus` SDK 無官方 TypeScript 型別定義，`skipLibCheck: true` 處理此問題，Story 2.1 自行定義型別包裝
- **dotenv**：不需要安裝 dotenv - 架構決策 ADR-07 使用 GitHub Secrets 在 CI，本地開發若需要 .env 可在後續 story 決定是否引入

### Architecture Compliance

- [x] Node.js 22.x LTS（active LTS 至 2027-04-30）
- [x] TypeScript 5.x strict mode（ADR-04 基礎）
- [x] ESM 模組系統 `"type": "module"`（架構需求）
- [x] `tsx` 開發期直接執行（無 dist/ 建置）
- [x] Vitest 測試框架（原生 TypeScript + ESM 相容）
- [x] 密鑰不入碼，透過 .env.example 範本（NFR1, NFR2, ADR-07）
- [x] 目錄結構完全符合 architecture.md 定義

### References

- Architecture: 目錄結構定義 [Source: architecture.md#Complete-Project-Directory-Structure]
- Architecture: Starter Template 選擇與初始化指令 [Source: architecture.md#Selected-Starter]
- Architecture: ADR-01 amadeus SDK v11.0.0 [Source: architecture.md#ADR-01]
- Architecture: ADR-02 @line/bot-sdk v10.6.0 [Source: architecture.md#ADR-02]
- Architecture: ADR-04 配置管理 config.ts [Source: architecture.md#ADR-04]
- Architecture: ADR-07 GitHub Secrets + dotenv [Source: architecture.md#ADR-07]
- Epics: Story 1.1 驗收標準 [Source: epics.md#Story-1.1]
- Latest: vitest v4.0.18 為當前穩定版（2026-02 web research）
- Latest: @line/bot-sdk v10.6.0 為當前最新版（2026-01-27 發布）
- Latest: tsx v4.21.0 為當前最新版（2026-02 web research）

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

- vitest 安裝後為 v4.0.18（major version），與 v1.x API 核心相容，無需 migration
- @types/node 安裝最新版為 25.3.0（Node.js 22 完整型別支援）
- typescript 安裝最新版為 5.9.3
- tsx 安裝最新版為 4.21.0（與 story spec 完全符合）

### Completion Notes List

- ✅ Task 1: package.json 設定完整，`"type": "module"` ✅，所有 scripts 定義完成，amadeus@11.0.0 + @line/bot-sdk@10.6.0 已安裝
- ✅ Task 2: tsconfig.json 建立，module: NodeNext + strict: true，完全符合架構規格
- ✅ Task 3: vitest.config.ts 建立，globals: true + environment: node + include pattern，vitest v4.0.18 正常運作
- ✅ Task 4: .env.example（4 個 env vars）和 .gitignore（node_modules/, .env, dist/）建立完成
- ✅ Task 5: src/providers/, scanner/, notifier/, utils/ 目錄建立（含 .gitkeep 確保 git 追蹤）；index.ts 和 morning-report.ts 空白入口點建立；`tsx src/index.ts` 已有自動化測試驗證（exit 0）
- ✅ 建立 tests/setup.test.ts 包含 32 個驗證測試，涵蓋所有驗收標準，全部通過
- ✅ 建立 tsconfig.test.json 確保 TypeScript 型別檢查涵蓋 tests/ 目錄
- ✅ npm test: 32 passed, 0 failed（vitest v4.0.18，206ms）
- ✅ Code Review 完成，6 個 HIGH/MEDIUM 問題全部修復

### File List

- `package.json` (新建)
- `package-lock.json` (新建，npm install 自動產生)
- `tsconfig.json` (新建)
- `tsconfig.test.json` (新建，code review 修復：type-check tests/ 目錄)
- `vitest.config.ts` (新建，code review 修復：加入 include pattern)
- `.env.example` (新建)
- `.gitignore` (新建)
- `src/index.ts` (新建)
- `src/morning-report.ts` (新建)
- `src/providers/` (新建目錄)
- `src/providers/.gitkeep` (新建，code review 修復：確保空目錄可被 git 追蹤)
- `src/scanner/` (新建目錄)
- `src/scanner/.gitkeep` (新建，code review 修復)
- `src/notifier/` (新建目錄)
- `src/notifier/.gitkeep` (新建，code review 修復)
- `src/utils/` (新建目錄)
- `src/utils/.gitkeep` (新建，code review 修復)
- `tests/setup.test.ts` (新建，code review 修復：加入 tsx 執行驗證測試，共 32 tests)
- `spec.md` (預存在，code review 修復：加入棄用聲明，說明此為初始草稿已由 BMAD 規劃產出物取代)
- `node_modules/` (新建，npm install 自動產生，不入版控)

### Change Log

- 2026-02-20: 專案初始化完成。建立 npm 專案、安裝所有依賴、設定 TypeScript（NodeNext + strict）、設定 Vitest v4、建立環境設定範本、建立 src/ 目錄骨架與空白入口點。31 個 setup 驗證測試全部通過。
- 2026-02-20: Code Review 修復。H1：為 4 個空目錄加入 .gitkeep（git 追蹤保障）；H2：為 spec.md 加入棄用聲明（避免誤導）；H3：加入 tsx src/index.ts 自動化執行驗證測試；M1：建立 tsconfig.test.json 啟用測試型別檢查；M2：vitest.config.ts 加入 include 限縮掃描範圍；M3：更新 @types/node 版本文件（^25.3.0）。測試通過：32 passed。
