import { Pool } from 'pg';

const pool = new Pool({
  host: process.env.POSTGRES_HOST,
  port: Number(process.env.POSTGRES_PORT),
  user: process.env.POSTGRES_USER?.trim(),
  password: process.env.POSTGRES_PASSWORD?.trim(),
  database: process.env.POSTGRES_DB?.trim(),
});


export default pool;