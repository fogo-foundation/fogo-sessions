import { useWallet } from "@solana/wallet-adapter-react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import { PublicKey } from "@solana/web3.js";
import { useRef, useEffect, useCallback } from "react";

// The function returned by by this hook returns a promise that returns the
// connected wallet public key and message signer function.  If a wallet is
// already connected, it resolves with these fields immediately.  Otherwise, it
// triggers the wallet modal and resolves with these once the wallet connects.

// It's a bit of a hacky hook, because the APIs in the solana wallet adapter
// libs don't make it very easy to subscribe to wallet connection state
// changes...
export const useWalletInfo = (): (() => Promise<WalletInfo>) => {
  const { publicKey, signMessage, connecting } = useWallet();
  const { setVisible, visible } = useWalletModal();
  const connectWalletResolver = useRef<
    | undefined
    | {
        resolve: (walletInfo: WalletInfo) => void;
        reject: (err: unknown) => void;
      }
  >(undefined);

  useEffect(() => {
    if (publicKey !== null && signMessage !== undefined) {
      connectWalletResolver.current?.resolve({ publicKey, signMessage });
    } else if (!visible) {
      connectWalletResolver.current?.reject("Wallet connection failed");
    }
  }, [publicKey, signMessage, visible]);

  return useCallback(
    () =>
      new Promise<WalletInfo>((resolve, reject) => {
        if (signMessage !== undefined && publicKey !== null) {
          resolve({ signMessage, publicKey });
        } else {
          connectWalletResolver.current = { resolve, reject };
          setVisible(!connecting);
        }
      }),
    [signMessage, publicKey, setVisible, connecting],
  );
};

export type WalletInfo = {
  publicKey: PublicKey;
  signMessage: (message: Uint8Array) => Promise<Uint8Array>;
};
