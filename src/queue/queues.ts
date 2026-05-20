import { LogStrategy } from '../core/LogMode';
import {
  TBL_ANCHORED_PRIVATE,
  TBL_ANCHORED_PUBLIC,
  TBL_BATCHED_PRIVATE,
  TBL_BATCHED_PUBLIC,
  TBL_BATCHES_PRIVATE,
  TBL_BATCHES_PUBLIC,
} from '../infrastructure/database/PostgresAdapter';

// Submit queues — one per chain strategy (db_only has no queue)
export const SUBMIT_QUEUES = {
  private_chain:        'logs.private_chain',
  public_chain:         'logs.public_chain',
  hybrid_private:       'logs.hybrid_private',
  hybrid_public:        'logs.hybrid_public',
  hybrid_private_batch: 'logs.hybrid_private_batch',
  hybrid_public_batch:  'logs.hybrid_public_batch',
} as const;

// Confirm queues — receive txHash, poll chain, update DB anchor_status
export const CONFIRM_QUEUES = {
  private_chain:        'confirm.private_chain',
  public_chain:         'confirm.public_chain',
  hybrid_private:       'confirm.hybrid_private',
  hybrid_public:        'confirm.hybrid_public',
  hybrid_private_batch: 'confirm.hybrid_private_batch',
  hybrid_public_batch:  'confirm.hybrid_public_batch',
} as const;

export const ALL_QUEUES: string[] = [
  ...Object.values(SUBMIT_QUEUES),
  ...Object.values(CONFIRM_QUEUES),
];

export function submitQueueFor(strategy: string): string {
  const q = SUBMIT_QUEUES[strategy as keyof typeof SUBMIT_QUEUES];
  if (!q) throw new Error(`No submit queue for strategy: ${strategy}`);
  return q;
}

export function confirmQueueFor(strategy: string): string {
  const q = CONFIRM_QUEUES[strategy as keyof typeof CONFIRM_QUEUES];
  if (!q) throw new Error(`No confirm queue for strategy: ${strategy}`);
  return q;
}

export function chainFor(strategy: string): 'exonum' | 'ethereum' {
  if (strategy.includes('public')) return 'ethereum';
  return 'exonum';
}

export function anchoredTableFor(strategy: string): string {
  if (strategy.includes('public')) return TBL_ANCHORED_PUBLIC;
  return TBL_ANCHORED_PRIVATE;
}

export function batchedTableFor(strategy: string): string {
  if (strategy.includes('public')) return TBL_BATCHED_PUBLIC;
  return TBL_BATCHED_PRIVATE;
}

export function batchesTableFor(strategy: string): string {
  if (strategy.includes('public')) return TBL_BATCHES_PUBLIC;
  return TBL_BATCHES_PRIVATE;
}

export function isChainStrategy(strategy: string): boolean {
  return strategy !== LogStrategy.DATABASE_ONLY;
}
