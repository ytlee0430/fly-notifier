export type LogLevel = 'info' | 'warn' | 'error';

export interface LogEntry {
  level: LogLevel;
  timestamp: string;
  module: string;
  action: string;
  [key: string]: unknown;
}

function log(level: LogLevel, data: Record<string, unknown>): void {
  const entry: LogEntry = {
    level,
    timestamp: new Date().toISOString(),
    module: String(data['module'] ?? 'unknown'),
    action: String(data['action'] ?? 'unknown'),
    ...data,
  };
  const output = JSON.stringify(entry);
  if (level === 'error') {
    process.stderr.write(output + '\n');
  } else {
    process.stdout.write(output + '\n');
  }
}

export const logger = {
  info(data: Record<string, unknown>): void {
    log('info', data);
  },
  warn(data: Record<string, unknown>): void {
    log('warn', data);
  },
  error(data: Record<string, unknown>): void {
    log('error', data);
  },
};
