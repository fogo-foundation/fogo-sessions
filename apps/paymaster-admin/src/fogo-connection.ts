import { Connection } from "@solana/web3.js";

import { RPC } from "./config/server";

export const connection = new Connection(RPC);
