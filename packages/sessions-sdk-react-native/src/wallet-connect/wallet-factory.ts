import { BackpackMobileWalletAdapter } from './backpack-wallet-adapter';
import { PhantomMobileWalletAdapter } from './phantom-wallet-adapter';
import { SolflareMobileWalletAdapter } from './solflare-wallet-adapter';
import { BaseMobileWalletAdapter } from './wallet-connect';

// Wallet factory for easy extensibility
const wallets: Record<
  string,
  (redirectUrl: string, domain?: string) => BaseMobileWalletAdapter
> = {
  phantom: (redirectUrl: string, domain?: string) =>
    new PhantomMobileWalletAdapter(redirectUrl, domain),
  solflare: (redirectUrl: string, domain?: string) =>
    new SolflareMobileWalletAdapter(redirectUrl, domain),
  backpack: (redirectUrl: string, domain?: string) =>
    new BackpackMobileWalletAdapter(redirectUrl, domain),
};

export function createWallet(
  name: string,
  redirectUrl: string,
  domain?: string
): BaseMobileWalletAdapter {
  const walletFactory = wallets[name.toLowerCase()];
  if (!walletFactory) {
    throw new Error(`Wallet '${name}' is not supported`);
  }
  return walletFactory(redirectUrl, domain);
}

export function getAvailableWallets(): string[] {
  return Object.keys(wallets);
}

export function registerWallet(
  name: string,
  factory: (redirectUrl: string, domain?: string) => BaseMobileWalletAdapter
) {
  wallets[name.toLowerCase()] = factory;
}

// Export as object for backward compatibility
export const MobileWalletFactory = {
  createWallet,
  getAvailableWallets,
  registerWallet,
  wallets, // Expose wallets for testing
};
