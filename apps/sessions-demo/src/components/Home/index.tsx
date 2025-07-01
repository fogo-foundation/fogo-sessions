import "@solana/wallet-adapter-react-ui/styles.css";
import { Demo } from "./demo";
import {
  SPONSOR_KEY,
  SOLANA_RPC,
  ADDRESS_LOOKUP_TABLE_ADDRESS,
} from "../../config/server";

export const Home = () => (
  <main>
    <div className="m-auto px-4 sm:px-10 lg:px-0 lg:w-3/5 parent space-y-2">
      <h1 className="text-2xl font-medium mt-8 mb-4">Fogo Sessions Demo</h1>
      <Demo
        sponsor={SPONSOR_KEY.publicKey.toBase58()}
        rpc={SOLANA_RPC}
        addressLookupTableAddress={ADDRESS_LOOKUP_TABLE_ADDRESS}
      />
    </div>
  </main>
);
