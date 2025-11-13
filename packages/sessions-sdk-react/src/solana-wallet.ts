import type {
  MessageSignerWalletAdapterProps,
  BaseWalletAdapter,
  WalletReadyState,
  WalletError,
} from "@solana/wallet-adapter-base";
import { PublicKey } from "@solana/web3.js";
import { SolanaMobileWalletAdapter } from "@solana-mobile/wallet-adapter-mobile";

/**
 * The BaseWalletAdapter is used by all Solana wallet types. It extends EventEmitter but the types from the EventEmitter are not present so we are creating our own 
 * SolanaWallet type here that includes them and also adds some extra typings to only include the available methods and properties.
 */

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
