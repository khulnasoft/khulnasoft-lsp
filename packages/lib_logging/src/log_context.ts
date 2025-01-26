export interface LogContext {
  name: string;
  value?: string;
  children?: LogContext[];
}

export const logCtxItem = (name: string, value: string): LogContext => ({
  name,
  value,
});

export const logCtxParent = (name: string, ...children: LogContext[]): LogContext => ({
  name,
  children,
});
