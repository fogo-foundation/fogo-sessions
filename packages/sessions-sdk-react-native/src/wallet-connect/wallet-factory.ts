import { BaseMobileWalletAdapter } from './wallet-connect';
import { PhantomMobileWalletAdapter } from './phantom-wallet-adapter';
import { SolflareMobileWalletAdapter } from './solflare-wallet-adapter';
import { BackpackMobileWalletAdapter } from './backpack-wallet-adapter';

// Wallet factory for easy extensibility
export class MobileWalletFactory {
  private static wallets: Record<
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

  static createWallet(
    name: string,
    redirectUrl: string,
    domain?: string
  ): BaseMobileWalletAdapter {
    const walletFactory = this.wallets[name.toLowerCase()];
    if (!walletFactory) {
      throw new Error(`Wallet '${name}' is not supported`);
    }
    return walletFactory(redirectUrl, domain);
  }

  static getAvailableWallets(): string[] {
    return Object.keys(this.wallets);
  }

  static registerWallet(
    name: string,
    factory: (redirectUrl: string, domain?: string) => BaseMobileWalletAdapter
  ) {
    this.wallets[name.toLowerCase()] = factory;
  }
}
