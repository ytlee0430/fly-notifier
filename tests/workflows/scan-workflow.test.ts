import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const workflowPath = join(process.cwd(), '.github/workflows/scan.yml');
const content = readFileSync(workflowPath, 'utf-8');

describe('Story 5.1: scan.yml 結構驗證', () => {
  it('包含每 2 小時 cron 排程', () => {
    expect(content).toContain('0 */2 * * *');
  });

  it('支援 workflow_dispatch 手動觸發', () => {
    expect(content).toContain('workflow_dispatch');
  });

  it('使用 Node.js 22.x', () => {
    expect(content).toContain("node-version: '22'");
  });

  it('注入 AMADEUS_CLIENT_ID secret', () => {
    expect(content).toContain('AMADEUS_CLIENT_ID');
    expect(content).toContain('secrets.AMADEUS_CLIENT_ID');
  });

  it('注入 AMADEUS_CLIENT_SECRET secret', () => {
    expect(content).toContain('secrets.AMADEUS_CLIENT_SECRET');
  });

  it('注入 LINE_CHANNEL_ACCESS_TOKEN secret', () => {
    expect(content).toContain('secrets.LINE_CHANNEL_ACCESS_TOKEN');
  });

  it('注入 LINE_USER_ID secret', () => {
    expect(content).toContain('secrets.LINE_USER_ID');
  });

  it('執行 npm run scan', () => {
    expect(content).toContain('npm run scan');
  });

  it('包含 dedup cache 設定（.cache 目錄）', () => {
    expect(content).toContain('.cache');
    expect(content).toContain('actions/cache');
  });
});
