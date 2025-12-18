import { FAUCET_KEY } from "../../config/server";
import { Demo } from "./demo";

export const Home = () => <Demo faucetAvailable={FAUCET_KEY !== undefined} />;
