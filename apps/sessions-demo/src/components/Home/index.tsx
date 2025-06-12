import "@solana/wallet-adapter-react-ui/styles.css";
import { WalletDisconnectButton, WalletMultiButton } from "../WalletButton";
import { EnableTradingButton } from "./enable-trading-button";
import { SPONSOR_KEY, SOLANA_RPC } from "../../config/server";

export const Home = () => (
  <main>
    <div className="m-auto w-2/4 parent space-y-2">
      <h1>Gasless Trading App</h1>
      <WalletMultiButton />
      <WalletDisconnectButton />
      <EnableTradingButton
        sponsorPubkey={SPONSOR_KEY.publicKey.toBase58()}
        solanaRpc={SOLANA_RPC}
      />
    </div>
  </main>
);
