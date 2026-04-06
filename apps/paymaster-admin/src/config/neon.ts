import "server-only";

import { neon as neonClient } from "@neondatabase/serverless";

import { DATABASE_URL } from "./server";

export const sql = neonClient(DATABASE_URL);
