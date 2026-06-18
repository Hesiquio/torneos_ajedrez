import { createClient } from '@libsql/client';
import dotenv from 'dotenv';

dotenv.config();

const url = process.env.DATABASE_URL;
const authToken = process.env.DATABASE_AUTH_TOKEN;

if (!url) {
  throw new Error('DATABASE_URL is not set in environment variables');
}

export const db = createClient({
  url: url,
  authToken: authToken,
});
