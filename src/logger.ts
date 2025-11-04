/* eslint-disable no-console */
// Simple logger exposing info/warn/debug/error methods.
// Each method prints the type, a timestamp and the supplied message using the corresponding console method.

const ts = () => new Date().toISOString();

const logger = {
  info: (message: string) => console.info(`[INFO] [${ts()}] ${message}`),
  warn: (message: string) => console.warn(`[WARN] [${ts()}] ${message}`),
  debug: (message: string) => console.debug(`[DEBUG] [${ts()}] ${message}`),
  error: (message: string) => console.error(`[ERROR] [${ts()}] ${message}`),
};

export default logger;
export { logger };
