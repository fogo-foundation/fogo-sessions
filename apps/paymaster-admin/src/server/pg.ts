import { Pool } from "pg";

import { DATABASE_URL } from "../config/server";

const pool = new Pool({
  connectionString: DATABASE_URL,
});

export default pool;
