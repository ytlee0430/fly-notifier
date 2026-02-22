import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const workflowPath = join(process.cwd(), '.github/workflows/morning-report.yml');
const content = readFileSync(workflowPath, 'utf-8');

describe('Story 5.2: morning-report.yml 結構驗證', () => {
  it('包含 UTC 22:00 cron 排程（台灣時間 06:00）', () => {
    expect(content).toContain('0 22 * * *');
  });

  it('支援 workflow_dispatch 手動觸發', () => {
    expect(content).toContain('workflow_dispatch');
  });

  it('使用 Node.js 22.x', () => {
    expect(content).toContain("node-version: '22'");
  });

  it('注入四個必要 secrets', () => {
    expect(content).toContain('secrets.AMADEUS_CLIENT_ID');
    expect(content).toContain('secrets.AMADEUS_CLIENT_SECRET');
    expect(content).toContain('secrets.LINE_CHANNEL_ACCESS_TOKEN');
    expect(content).toContain('secrets.LINE_USER_ID');
  });

  it('執行 npm run report', () => {
    expect(content).toContain('npm run report');
  });

  it('不包含 dedup cache（早報不需去重）', () => {
    expect(content).not.toContain('dedup');
  });
});
