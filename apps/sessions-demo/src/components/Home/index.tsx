import { Demo } from "./demo";
import { SOLANA_RPC } from "../../config/server";

export const Home = () => <Demo rpc={SOLANA_RPC} />;
