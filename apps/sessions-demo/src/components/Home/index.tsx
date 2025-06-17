import "@solana/wallet-adapter-react-ui/styles.css";
import { WalletDisconnectButton, WalletMultiButton } from "../WalletButton";
import { SPONSOR_KEY, SOLANA_RPC } from "../../config/server";
import { Buttons } from "./buttons";

export const Home = () => {
  return <main>
    <div className="m-auto w-2/4 parent space-y-2">
      <h1>Gasless Trading App</h1>
      <WalletMultiButton />
      <WalletDisconnectButton />
      <Buttons sponsorPubkey={SPONSOR_KEY.publicKey.toBase58()} solanaRpc={SOLANA_RPC} />
    </div>
  </main>
};
