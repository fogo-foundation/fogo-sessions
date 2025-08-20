import { Demo } from "./demo";
import { FAUCET_KEY, RPC } from "../../config/server";

export const Home = () => (
  <Demo rpc={RPC} faucetAvailable={FAUCET_KEY !== undefined} />
);
