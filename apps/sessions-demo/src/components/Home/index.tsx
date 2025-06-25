import "@solana/wallet-adapter-react-ui/styles.css";
import {
  SPONSOR_KEY,
  SOLANA_RPC,
  ADDRESS_LOOKUP_TABLE_ADDRESS,
} from "../../config/server";
import { WalletDisconnectButton, WalletMultiButton } from "../WalletButton";
import { Buttons } from "./buttons";

export const Home = () => (
  <main>
    <div className="m-auto w-2/4 parent space-y-2">
      <h1>Gasless Trading App</h1>
      <WalletMultiButton />
      <WalletDisconnectButton />
      <Buttons
        sponsorPubkey={SPONSOR_KEY.publicKey.toBase58()}
        solanaRpc={SOLANA_RPC}
        addressLookupTableAddress={ADDRESS_LOOKUP_TABLE_ADDRESS}
      />
    </div>
  </main>
);
