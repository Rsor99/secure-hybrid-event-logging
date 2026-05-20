import { LogEntry } from '../core/LogEntry';
import { LogStrategy } from '../core/LogMode';
import { RabbitMQClient } from './RabbitMQClient';
import { submitQueueFor, confirmQueueFor } from './queues';
import { EntryDTO, SubmitMessage, BatchSubmitMessage, ConfirmMessage } from './types';

function toDTO(entry: LogEntry): EntryDTO {
  return {
    id:          entry.id,
    timestampMs: entry.timestamp.getTime(),
    level:       entry.level,
    source:      entry.source,
    message:     entry.message,
    metadata:    entry.metadata ?? {},
    dataHash:    entry.dataHash ?? '',
  };
}

export async function publishLog(
  client:        RabbitMQClient,
  entry:         LogEntry,
  strategy:      string,
  db:            'postgres' | 'mongo',
  replyTo?:      string,
  correlationId?: string,
): Promise<void> {
  if (strategy === LogStrategy.DATABASE_ONLY) {
    throw new Error('publishLog must not be called for db_only strategy');
  }
  const msg: SubmitMessage = {
    entry:         toDTO(entry),
    strategy,
    db,
    correlationId: correlationId ?? entry.id,
    replyTo,
    enqueuedAt:    Date.now(),
  };
  client.publish(submitQueueFor(strategy), msg);
}

export async function publishBatch(
  client:        RabbitMQClient,
  entries:       LogEntry[],
  strategy:      string,
  db:            'postgres' | 'mongo',
  correlationId: string,
  replyTo?:      string,
): Promise<void> {
  if (strategy === LogStrategy.DATABASE_ONLY) {
    throw new Error('publishBatch must not be called for db_only strategy');
  }
  const msg: BatchSubmitMessage = {
    entries:       entries.map(toDTO),
    strategy,
    db,
    correlationId,
    replyTo,
    enqueuedAt:    Date.now(),
  };
  client.publish(submitQueueFor(strategy), msg);
}

export async function publishConfirm(
  client: RabbitMQClient,
  msg:    ConfirmMessage,
): Promise<void> {
  client.publish(confirmQueueFor(msg.strategy), msg);
}
