import { db } from '../server/db';

async function check() {
  try {
    const res = await db.execute("SELECT name FROM sqlite_master WHERE type='table';");
    console.log("Tablas encontradas en Turso DB:");
    res.rows.forEach(row => {
      console.log(`- ${row.name}`);
    });
  } catch (err) {
    console.error("Error conectando a Turso:", err);
  } finally {
    db.close();
  }
}

check();
