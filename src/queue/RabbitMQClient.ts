import amqp, { ChannelModel, Channel, ConsumeMessage } from 'amqplib';
import { ALL_QUEUES } from './queues';

export type MessageHandler = (msg: ConsumeMessage, ack: () => void, nack: (requeue?: boolean) => void) => Promise<void>;

export class RabbitMQClient {
  private model:   ChannelModel | null = null;
  private channel: Channel      | null = null;
  private readonly url: string;

  constructor(url: string) {
    this.url = url;
  }

  async connect(maxRetries = 5, backoffMs = 3000): Promise<void> {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        this.model   = await amqp.connect(this.url);
        this.channel = await this.model.createChannel();
        this.channel.prefetch(1);

        this.model.on('error', (err: Error) => console.error('[RabbitMQ] connection error:', err.message));
        this.model.on('close', ()           => console.warn('[RabbitMQ] connection closed'));
        return;
      } catch (err) {
        console.warn(`[RabbitMQ] connect attempt ${attempt}/${maxRetries} failed: ${(err as Error).message}`);
        if (attempt < maxRetries) {
          await new Promise<void>((r) => setTimeout(r, backoffMs));
        } else {
          throw err;
        }
      }
    }
  }

  async assertQueues(): Promise<void> {
    if (!this.channel) throw new Error('RabbitMQ channel not initialized');
    for (const q of ALL_QUEUES) {
      await this.channel.assertQueue(q, { durable: true });
    }
  }

  async assertTempQueue(name: string): Promise<void> {
    if (!this.channel) throw new Error('RabbitMQ channel not initialized');
    await this.channel.assertQueue(name, { durable: false, autoDelete: true, exclusive: false });
  }

  publish(queue: string, payload: unknown, options?: amqp.Options.Publish): boolean {
    if (!this.channel) throw new Error('RabbitMQ channel not initialized');
    const content = Buffer.from(JSON.stringify(payload));
    return this.channel.sendToQueue(queue, content, { persistent: true, ...options });
  }

  async subscribe(queue: string, handler: MessageHandler): Promise<void> {
    if (!this.channel) throw new Error('RabbitMQ channel not initialized');
    await this.channel.consume(queue, async (msg) => {
      if (!msg) return;
      const ack  = () => this.channel!.ack(msg);
      const nack = (requeue = false) => this.channel!.nack(msg, false, requeue);
      try {
        await handler(msg, ack, nack);
      } catch (err) {
        console.error(`[RabbitMQ] unhandled error in handler for ${queue}:`, err);
        nack(false);
      }
    });
  }

  parseMessage<T>(msg: ConsumeMessage): T {
    return JSON.parse(msg.content.toString()) as T;
  }

  async close(): Promise<void> {
    try { await this.channel?.close(); } catch { /* ignore */ }
    try { await this.model?.close(); } catch { /* ignore */ }
    this.channel = null;
    this.model   = null;
  }
}
