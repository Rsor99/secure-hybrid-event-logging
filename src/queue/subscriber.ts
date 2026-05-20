import { RabbitMQClient } from './RabbitMQClient';
import { SUBMIT_QUEUES, CONFIRM_QUEUES, chainFor, anchoredTableFor, batchedTableFor, batchesTableFor } from './queues';
import { publishConfirm } from './publisher';
import { SubmitMessage, BatchSubmitMessage, ConfirmMessage, ResultMessage } from './types';
import { LogEntry, LogLevel } from '../core/LogEntry';
import { LogStorage } from '../core/LogStorage';
import { LogStrategy } from '../core/LogMode';
import { PostgresAdapter } from '../infrastructure/database/PostgresAdapter';
import { MongoAdapter } from '../infrastructure/database/MongoAdapter';
import { ExonumAnchor } from '../adapters/storage/ExonumAnchor';
import { EthereumAnchor } from '../adapters/storage/EthereumAnchor';

type DB = 'postgres' | 'mongo';

export type StoragePicker = (strategy: LogStrategy, db: DB) => LogStorage;

function dtoToEntry(dto: SubmitMessage['entry']): LogEntry {
  return new LogEntry({
    id:        dto.id,
    timestamp: new Date(dto.timestampMs),
    level:     dto.level as LogLevel,
    source:    dto.source,
    message:   dto.message,
    metadata:  dto.metadata,
    dataHash:  dto.dataHash || undefined,
  });
}

function replyResult(
  client:   RabbitMQClient,
  replyTo:  string,
  payload:  ResultMessage,
): void {
  try {
    client.publish(replyTo, payload, { persistent: false });
  } catch (err) {
    console.error('[subscriber] failed to publish result to', replyTo, err);
  }
}

export async function startSubscriber(
  pickStorage:     StoragePicker,
  pgAdapter:       PostgresAdapter,
  mongoAdapter:    MongoAdapter | null,
  exonumAnchor:    ExonumAnchor,
  ethereumAnchor:  EthereumAnchor,
  client:          RabbitMQClient,
): Promise<void> {

  function pickAdapter(db: DB): PostgresAdapter | MongoAdapter {
    if (db === 'mongo') {
      if (!mongoAdapter) throw new Error('MongoDB not available');
      return mongoAdapter;
    }
    return pgAdapter;
  }

  // ── Submit queue handlers ──────────────────────────────────────────────────

  for (const [strategyKey, queue] of Object.entries(SUBMIT_QUEUES)) {
    const strategy = strategyKey as LogStrategy;

    await client.subscribe(queue, async (msg, ack) => {
      const raw = client.parseMessage<SubmitMessage | BatchSubmitMessage>(msg);
      const receivedAt = Date.now();

      try {
        const storage = pickStorage(strategy, raw.db);

        const isBatch = 'entries' in raw;
        let txId: string | undefined;
        let confirmed = true;
        let logId: string;

        // Submit-only on chain — confirmation is handled by the confirm queue.
        // This is what makes async+chain truly async (return tx hash immediately,
        // poll for confirmation in a separate handler).
        const writeOpts = { waitForConfirmation: false };

        if (isBatch) {
          const batchMsg = raw as BatchSubmitMessage;
          const entries  = batchMsg.entries.map(dtoToEntry);
          if (!storage.writeBatch) throw new Error(`Storage for ${strategy} does not support writeBatch`);
          const result   = await storage.writeBatch(entries, writeOpts);
          txId      = result.txId;
          confirmed = result.confirmed ?? true;
          logId     = result.batchHash;
        } else {
          const submitMsg = raw as SubmitMessage;
          const entry     = dtoToEntry(submitMsg.entry);
          const result    = await storage.writeLog(entry, writeOpts);
          txId      = result.txId;
          confirmed = result.confirmed ?? true;
          logId     = result.logId;
        }

        const processLatencyMs = Date.now() - receivedAt;

        // If chain submission returned txId but not yet confirmed, hand off to confirm queue
        if (txId && !confirmed) {
          const isBatchStrategy = strategy.endsWith('_batch');
          const dbTable    = isBatchStrategy ? batchedTableFor(strategy) : anchoredTableFor(strategy);
          const batchesTbl = isBatchStrategy ? batchesTableFor(strategy) : undefined;

          const confirmMsg: ConfirmMessage = {
            logId,
            txHash:        txId,
            strategy,
            chain:         chainFor(strategy),
            db:            raw.db,
            dbTable,
            batchesTable:  batchesTbl,
            correlationId: raw.correlationId,
            replyTo:       raw.replyTo,
            enqueuedAt:    raw.enqueuedAt,
          };
          await publishConfirm(client, confirmMsg);
        } else if (raw.replyTo) {
          // Already confirmed or no chain — reply directly
          replyResult(client, raw.replyTo, {
            correlationId:   raw.correlationId,
            success:         true,
            publishLatencyMs: receivedAt - raw.enqueuedAt,
            processLatencyMs,
            totalLatencyMs:  Date.now() - raw.enqueuedAt,
            txHash:          txId,
          });
        }
      } catch (err) {
        console.error(`[subscriber] error in submit handler for ${queue}:`, err);
        if (raw.replyTo) {
          replyResult(client, raw.replyTo, {
            correlationId:    raw.correlationId,
            success:          false,
            publishLatencyMs: receivedAt - raw.enqueuedAt,
            processLatencyMs: Date.now() - receivedAt,
            totalLatencyMs:   Date.now() - raw.enqueuedAt,
            error:            String(err),
          });
        }
      } finally {
        ack();
      }
    });
  }

  // ── Confirm queue handlers ─────────────────────────────────────────────────

  for (const [strategyKey, queue] of Object.entries(CONFIRM_QUEUES)) {
    const strategy = strategyKey as LogStrategy;

    await client.subscribe(queue, async (msg, ack) => {
      const raw = client.parseMessage<ConfirmMessage>(msg);

      try {
        const anchor = raw.chain === 'exonum' ? exonumAnchor : ethereumAnchor;

        // Retry until tx is committed, definitively failed, or timeout.
        // 60 × 2s = 2 min — enough for Sepolia (~36s @ 3 confirmations).
        const MAX_RETRIES = 60;
        const SLEEP_MS    = 2000;
        const checkStart  = Date.now();
        let result: { confirmed: boolean; pending: boolean } = { confirmed: false, pending: true };
        for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
          result = await anchor.checkTx(raw.txHash);
          if (result.confirmed || !result.pending) break;
          await new Promise<void>((r) => setTimeout(r, SLEEP_MS));
        }
        const confirmed = result.confirmed;
        const status = confirmed ? 'confirmed' : result.pending ? 'pending' : 'failed';

        // Backfill the anchor's confirmation-time series so the BC Confirmation
        // Time metric reflects the queue path, not just the synchronous path.
        if (confirmed) {
          anchor.recordConfirmationTime(Date.now() - checkStart);
        }

        // Update DB anchor_status for hybrid strategies (has a real DB adapter)
        const isHybrid = strategy.startsWith('hybrid');
        if (isHybrid) {
          const adapter = pickAdapter(raw.db);
          const isBatchStrategy = strategy.endsWith('_batch');
          if (isBatchStrategy && raw.batchesTable) {
            await adapter.updateBatchAnchorStatus(
              raw.logId,
              status,
              raw.txHash,
              undefined,
              confirmed ? new Date() : undefined,
              raw.batchesTable,
            );
          } else {
            await adapter.updateAnchorStatus(
              raw.logId,
              status,
              raw.txHash,
              undefined,
              confirmed ? new Date() : undefined,
              raw.dbTable,
            );
          }
        }

        if (raw.replyTo) {
          replyResult(client, raw.replyTo, {
            correlationId:    raw.correlationId,
            success:          confirmed,
            publishLatencyMs: 0,
            processLatencyMs: 0,
            totalLatencyMs:   Date.now() - raw.enqueuedAt,
            txHash:           raw.txHash,
          });
        }
      } catch (err) {
        console.error(`[subscriber] error in confirm handler for ${queue}:`, err);
        if (raw.replyTo) {
          replyResult(client, raw.replyTo, {
            correlationId:    raw.correlationId,
            success:          false,
            publishLatencyMs: 0,
            processLatencyMs: 0,
            totalLatencyMs:   Date.now() - raw.enqueuedAt,
            error:            String(err),
          });
        }
      } finally {
        ack();
      }
    });
  }

  console.log('[RabbitMQ] subscriber started — listening on 12 queues');
}
