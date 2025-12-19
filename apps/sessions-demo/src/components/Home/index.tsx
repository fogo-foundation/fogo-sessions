import { Demo } from "./demo";
import { FAUCET_KEY } from "../../config/server";

export const Home = () => <Demo faucetAvailable={FAUCET_KEY !== undefined} />;
