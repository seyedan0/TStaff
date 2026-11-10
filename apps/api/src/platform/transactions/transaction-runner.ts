/** Framework-neutral unit of work shared through public application services. */
export const TRANSACTION_RUNNER = Symbol("TRANSACTION_RUNNER");
export interface TransactionRunner {
  run<T>(operation: () => Promise<T>): Promise<T>;
}
