import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

const ROOT = new URL('..', import.meta.url).pathname;

describe('Story 1.1: 專案初始化與開發環境建立', () => {
  describe('package.json 設定', () => {
    const pkg = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf-8')) as Record<string, unknown>;

    it('type 為 module（ESM）', () => {
      expect(pkg['type']).toBe('module');
    });

    it('包含 amadeus production dependency', () => {
      expect((pkg['dependencies'] as Record<string, string>)['amadeus']).toBeDefined();
    });

    it('包含 @line/bot-sdk production dependency', () => {
      expect((pkg['dependencies'] as Record<string, string>)['@line/bot-sdk']).toBeDefined();
    });

    it('包含 typescript devDependency', () => {
      expect((pkg['devDependencies'] as Record<string, string>)['typescript']).toBeDefined();
    });

    it('包含 tsx devDependency', () => {
      expect((pkg['devDependencies'] as Record<string, string>)['tsx']).toBeDefined();
    });

    it('包含 vitest devDependency', () => {
      expect((pkg['devDependencies'] as Record<string, string>)['vitest']).toBeDefined();
    });

    it('包含 @types/node devDependency', () => {
      expect((pkg['devDependencies'] as Record<string, string>)['@types/node']).toBeDefined();
    });

    it('定義 scan 腳本', () => {
      expect((pkg['scripts'] as Record<string, string>)['scan']).toBe('tsx src/index.ts');
    });

    it('定義 report 腳本', () => {
      expect((pkg['scripts'] as Record<string, string>)['report']).toBe('tsx src/morning-report.ts');
    });

    it('定義 dev 腳本', () => {
      expect((pkg['scripts'] as Record<string, string>)['dev']).toBe('tsx watch src/index.ts');
    });

    it('定義 test 腳本', () => {
      expect((pkg['scripts'] as Record<string, string>)['test']).toBe('vitest run');
    });
  });

  describe('設定檔存在', () => {
    it('tsconfig.json 存在', () => {
      expect(existsSync(join(ROOT, 'tsconfig.json'))).toBe(true);
    });

    it('vitest.config.ts 存在', () => {
      expect(existsSync(join(ROOT, 'vitest.config.ts'))).toBe(true);
    });

    it('.env.example 存在', () => {
      expect(existsSync(join(ROOT, '.env.example'))).toBe(true);
    });

    it('.gitignore 存在', () => {
      expect(existsSync(join(ROOT, '.gitignore'))).toBe(true);
    });
  });

  describe('.env.example 包含必要環境變數', () => {
    const envExample = readFileSync(join(ROOT, '.env.example'), 'utf-8');

    it('包含 AMADEUS_CLIENT_ID', () => {
      expect(envExample).toContain('AMADEUS_CLIENT_ID');
    });

    it('包含 AMADEUS_CLIENT_SECRET', () => {
      expect(envExample).toContain('AMADEUS_CLIENT_SECRET');
    });

    it('包含 LINE_CHANNEL_ACCESS_TOKEN', () => {
      expect(envExample).toContain('LINE_CHANNEL_ACCESS_TOKEN');
    });

    it('包含 LINE_USER_ID', () => {
      expect(envExample).toContain('LINE_USER_ID');
    });
  });

  describe('.gitignore 包含必要排除項', () => {
    const gitignore = readFileSync(join(ROOT, '.gitignore'), 'utf-8');

    it('排除 node_modules/', () => {
      expect(gitignore).toContain('node_modules/');
    });

    it('排除 .env', () => {
      expect(gitignore).toContain('.env');
    });

    it('排除 dist/', () => {
      expect(gitignore).toContain('dist/');
    });
  });

  describe('src/ 目錄結構', () => {
    it('src/providers/ 目錄存在', () => {
      expect(existsSync(join(ROOT, 'src/providers'))).toBe(true);
    });

    it('src/scanner/ 目錄存在', () => {
      expect(existsSync(join(ROOT, 'src/scanner'))).toBe(true);
    });

    it('src/notifier/ 目錄存在', () => {
      expect(existsSync(join(ROOT, 'src/notifier'))).toBe(true);
    });

    it('src/utils/ 目錄存在', () => {
      expect(existsSync(join(ROOT, 'src/utils'))).toBe(true);
    });

    it('src/index.ts 存在', () => {
      expect(existsSync(join(ROOT, 'src/index.ts'))).toBe(true);
    });

    it('src/morning-report.ts 存在', () => {
      expect(existsSync(join(ROOT, 'src/morning-report.ts'))).toBe(true);
    });

    it('tsx src/index.ts 可成功執行（AC10: exit code 0）', () => {
      const result = spawnSync(
        join(ROOT, 'node_modules/.bin/tsx'),
        ['src/index.ts'],
        {
          cwd: ROOT,
          encoding: 'utf-8',
          timeout: 10000,
          env: { ...process.env, AMADEUS_CLIENT_ID: '', AMADEUS_CLIENT_SECRET: '' },
        }
      );
      expect(result.status).toBe(0);
    });
  });

  describe('tsconfig.json 內容驗證', () => {
    const tsconfig = JSON.parse(readFileSync(join(ROOT, 'tsconfig.json'), 'utf-8')) as {
      compilerOptions: Record<string, unknown>;
    };

    it('module 設定為 NodeNext（ESM）', () => {
      expect(String(tsconfig.compilerOptions['module']).toLowerCase()).toBe('nodenext');
    });

    it('strict mode 啟用', () => {
      expect(tsconfig.compilerOptions['strict']).toBe(true);
    });

    it('moduleResolution 設定為 NodeNext', () => {
      expect(String(tsconfig.compilerOptions['moduleResolution']).toLowerCase()).toBe('nodenext');
    });
  });
});
