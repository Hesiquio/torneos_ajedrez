import * as dotenv from 'dotenv';
import { createClient } from '@libsql/client';
dotenv.config();

const db = createClient({
  url: process.env.DATABASE_URL!,
  authToken: process.env.DATABASE_AUTH_TOKEN!,
});

async function run() {
  console.log('Agregando columna hidden a players...');
  await db.execute('ALTER TABLE players ADD COLUMN hidden INTEGER DEFAULT 0');
  console.log('✅ Columna "hidden" agregada correctamente.');
  db.close();
}

run().catch(err => {
  if (err.message?.includes('duplicate column name') || err.message?.includes('already exists')) {
    console.log('La columna ya existe, no se requiere migración.');
  } else {
    console.error('Error:', err.message);
    process.exit(1);
  }
});
