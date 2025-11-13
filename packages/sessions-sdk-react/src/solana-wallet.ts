import type {
  MessageSignerWalletAdapterProps,
  BaseWalletAdapter,
  WalletReadyState,
  WalletError,
} from "@solana/wallet-adapter-base";
import { PublicKey } from "@solana/web3.js";
import { SolanaMobileWalletAdapter } from "@solana-mobile/wallet-adapter-mobile";

export type SolanaWalletEvent = {
  connect(publicKey: PublicKey): void;
  disconnect(): void;
  error(error: WalletError): void;
  readyStateChange(readyState: WalletReadyState): void;
};

export type SolanaWalletEventEmitter = {
  on<E extends keyof SolanaWalletEvent>(
    event: E,
    listener: SolanaWalletEvent[E],
  ): void;
  off<E extends keyof SolanaWalletEvent>(
    event: E,
    listener: SolanaWalletEvent[E],
  ): void;
};

export type SolanaWallet = MessageSignerWalletAdapterProps &
  BaseWalletAdapter &
  SolanaWalletEventEmitter;

export type SolanaMobileWallet = SolanaMobileWalletAdapter &
  SolanaWalletEventEmitter;
