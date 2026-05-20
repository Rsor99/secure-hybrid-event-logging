import { Pool } from 'pg';
import { PostgresAdapter } from './PostgresAdapter';
import { MongoAdapter } from './MongoAdapter';
import { config } from '../config/env';

async function ensurePostgresDb(): Promise<void> {
  const dbName = config.postgresql.name;
  // Connect to the default "postgres" maintenance DB to create the target DB
  const pool = new Pool({
    host:     config.postgresql.host,
    port:     config.postgresql.port,
    user:     config.postgresql.user,
    password: config.postgresql.password,
    database: 'postgres',
    connectionTimeoutMillis: 5000,
  });
  try {
    const exists = await pool.query(
      `SELECT 1 FROM pg_database WHERE datname = $1`,
      [dbName],
    );
    if (exists.rowCount === 0) {
      await pool.query(`CREATE DATABASE "${dbName}"`);
      console.log(`Created database "${dbName}"`);
    } else {
      console.log(`Database "${dbName}" already exists`);
    }
  } finally {
    await pool.end();
  }
}

async function migrate(): Promise<void> {
  const args   = process.argv.slice(2);
  const target = args.find(a => ['postgresql', 'mongodb'].includes(a));
  const fresh  = args.includes('--fresh');

  if (!target) {
    console.error('Usage: npx ts-node migrate.ts <postgresql|mongodb> [--fresh]');
    console.error('  --fresh  drop ALL tables/collections then recreate from scratch');
    process.exit(1);
  }

  console.log(`\nMigrating ${target}${fresh ? ' (fresh — dropping everything first)' : ''}...\n`);

  try {
    if (target === 'postgresql') {
      await ensurePostgresDb();
    }

    const adapter = target === 'mongodb' ? new MongoAdapter() : new PostgresAdapter();

    try {
      if (fresh) {
        await adapter.dropAll();
        console.log('Dropped all logs_* / batches_* tables (incl. legacy singular names).');
        console.log('');
      }

      await adapter.initialize();

      console.log('Created:');
      console.log('  ✓ logs_offchain          — db_only strategy');
      console.log('  ✓ logs_anchored_private  — hybrid single-anchor (Exonum)');
      console.log('  ✓ logs_anchored_public   — hybrid single-anchor (Ethereum)');
      console.log('  ✓ logs_batched_private   — hybrid batch leaves (Exonum)');
      console.log('  ✓ logs_batched_public    — hybrid batch leaves (Ethereum)');
      console.log('  ✓ batches_private        — Merkle roots + anchor status (Exonum)');
      console.log('  ✓ batches_public         — Merkle roots + anchor status (Ethereum)');
      console.log('\nMigration completed.\n');
    } finally {
      await adapter.close();
    }
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  }
}

migrate();
