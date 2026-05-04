import crypto from 'crypto';
import { LogEntry } from './LogEntry';

export class HashService {
  static sha256(data: string): string {
    return crypto.createHash('sha256').update(data).digest('hex');
  }

  static computeBlockHash(
    index: number,
    timestamp: string,
    previousHash: string,
    dataHash: string,
    nonce = 0
  ): string {
    return HashService.sha256(`${index}:${timestamp}:${previousHash}:${dataHash}:${nonce}`);
  }

  static computeLogHash(log: LogEntry): string {
    return HashService.sha256(log.toHashableString());
  }

  static verifyLogHash(log: LogEntry): boolean {
    return HashService.sha256(log.toHashableString()) === log.dataHash;
  }

  static computeBatchHash(entries: LogEntry[]): string {
    let leaves: Buffer<ArrayBuffer>[] = entries.map((e) =>
      Buffer.from(e.dataHash || HashService.computeLogHash(e), 'hex') as Buffer<ArrayBuffer>
    );
    if (leaves.length === 0) return HashService.sha256('');
    // Binary Merkle tree: pair up, hash pairs, repeat until one root
    while (leaves.length > 1) {
      const next: Buffer<ArrayBuffer>[] = [];
      for (let i = 0; i < leaves.length; i += 2) {
        const left  = leaves[i];
        const right = leaves[i + 1] ?? left; // duplicate last leaf if odd
        next.push(crypto.createHash('sha256').update(Buffer.concat([left, right])).digest() as Buffer<ArrayBuffer>);
      }
      leaves = next;
    }
    return leaves[0].toString('hex');
  }
}
