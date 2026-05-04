import { PostgresAdapter } from './PostgresAdapter';
import { MongoAdapter } from './MongoAdapter';

async function migrate() {
  const target = process.argv[2];
  if (!target || !['postgresql', 'mongodb'].includes(target)) {
    console.error('Usage: npx ts-node migrate.ts <postgresql|mongodb>');
    process.exit(1);
  }

  const adapter = target === 'mongodb' ? new MongoAdapter() : new PostgresAdapter();
  console.log(`Running migration for ${target}...`);
  try {
    await adapter.initialize();
    console.log('Migration completed successfully.');
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  } finally {
    await adapter.close();
  }
}

migrate();
