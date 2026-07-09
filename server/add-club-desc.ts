import * as dotenv from 'dotenv';
import { createClient } from '@libsql/client';
dotenv.config();

const db = createClient({
  url: process.env.DATABASE_URL!,
  authToken: process.env.DATABASE_AUTH_TOKEN!,
});

async function run() {
  console.log('Agregando columna "description" a la tabla "clubs"...');
  try {
    await db.execute('ALTER TABLE clubs ADD COLUMN description TEXT');
    console.log('✅ Columna "description" agregada con éxito.');
  } catch (err: any) {
    if (err.message?.includes('duplicate column name') || err.message?.includes('already exists')) {
      console.log('La columna "description" ya existe.');
    } else {
      console.error('Error:', err.message);
      process.exit(1);
    }
  }
  db.close();
}

run().catch(console.error);
