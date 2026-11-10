import { PrismaClient } from '@prisma/client';
import type { Prisma } from '@prisma/client';
import { AsyncLocalStorage } from 'node:async_hooks';

export class PrismaService extends PrismaClient {
  private readonly transactionContext = new AsyncLocalStorage<Prisma.TransactionClient>();
  constructor() {
    super({
      log:
        process.env.NODE_ENV === 'development'
          ? ['warn', 'error']
          : ['error'],
    });
    // Repository delegates transparently participate in the current unit of work.
    // Separate async request chains never share a transaction.
    return new Proxy(this, {
      get: (target, property, receiver) => {
        const transaction = target.transactionContext.getStore();
        if (transaction && typeof property === 'string' && !property.startsWith('$') && property in transaction) {
          const member = Reflect.get(transaction, property);
          return typeof member === 'function' ? member.bind(transaction) : member;
        }
        const member = Reflect.get(target, property, receiver);
        return typeof member === 'function' ? member.bind(target) : member;
      },
    });
  }

  async runInTransaction<T>(operation: () => Promise<T>): Promise<T> {
    if (this.transactionContext.getStore()) return operation();
    return super.$transaction(
      (transaction) => this.transactionContext.run(transaction, operation),
      { maxWait: 10000, timeout: 20000 },
    );
  }
}
