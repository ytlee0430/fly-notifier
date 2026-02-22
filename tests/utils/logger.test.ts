import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { logger } from '../../src/utils/logger.js';

describe('Story 2.1: 結構化 Logger', () => {
  let stdoutSpy: ReturnType<typeof vi.spyOn>;
  let stderrSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    stdoutSpy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
    stderrSpy = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('logger.info', () => {
    it('輸出包含 level: info 的 JSON', () => {
      logger.info({ module: 'test', action: 'test-action' });
      expect(stdoutSpy).toHaveBeenCalledOnce();
      const output = JSON.parse(String(stdoutSpy.mock.calls[0]![0])) as Record<string, unknown>;
      expect(output['level']).toBe('info');
    });

    it('輸出包含 module 和 action 欄位', () => {
      logger.info({ module: 'scanner', action: 'scan', route: 'TPE-NRT' });
      const output = JSON.parse(String(stdoutSpy.mock.calls[0]![0])) as Record<string, unknown>;
      expect(output['module']).toBe('scanner');
      expect(output['action']).toBe('scan');
      expect(output['route']).toBe('TPE-NRT');
    });

    it('輸出包含 ISO timestamp', () => {
      logger.info({ module: 'test', action: 'ts' });
      const output = JSON.parse(String(stdoutSpy.mock.calls[0]![0])) as Record<string, unknown>;
      expect(output['timestamp']).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    });
  });

  describe('logger.warn', () => {
    it('輸出包含 level: warn', () => {
      logger.warn({ module: 'test', action: 'warn-action', message: 'watch out' });
      const output = JSON.parse(String(stdoutSpy.mock.calls[0]![0])) as Record<string, unknown>;
      expect(output['level']).toBe('warn');
      expect(output['message']).toBe('watch out');
    });
  });

  describe('logger.error', () => {
    it('寫入 stderr（不寫 stdout）', () => {
      logger.error({ module: 'amadeus', action: 'search', error: 'timeout' });
      expect(stderrSpy).toHaveBeenCalledOnce();
      expect(stdoutSpy).not.toHaveBeenCalled();
    });

    it('輸出包含 level: error', () => {
      logger.error({ module: 'amadeus', action: 'search', error: 'timeout' });
      const output = JSON.parse(String(stderrSpy.mock.calls[0]![0])) as Record<string, unknown>;
      expect(output['level']).toBe('error');
      expect(output['error']).toBe('timeout');
    });
  });

  describe('禁止使用 console.log（架構規範）', () => {
    it('logger 模組本身不使用 console', async () => {
      const { readFileSync } = await import('node:fs');
      const { join } = await import('node:path');
      const src = readFileSync(join(process.cwd(), 'src/utils/logger.ts'), 'utf-8');
      expect(src).not.toContain('console.log');
      expect(src).not.toContain('console.error');
    });
  });
});
