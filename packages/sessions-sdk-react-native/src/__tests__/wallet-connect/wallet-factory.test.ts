import { BackpackMobileWalletAdapter } from '../../wallet-connect/backpack-wallet-adapter';
import { PhantomMobileWalletAdapter } from '../../wallet-connect/phantom-wallet-adapter';
import { SolflareMobileWalletAdapter } from '../../wallet-connect/solflare-wallet-adapter';
import { BaseMobileWalletAdapter } from '../../wallet-connect/wallet-connect';
import { MobileWalletFactory } from '../../wallet-connect/wallet-factory';

describe('MobileWalletFactory', () => {
  const redirectUrl = 'myapp://wallet';
  const domain = 'myapp.com';

  describe('createWallet', () => {
    it('should create Phantom wallet adapter', () => {
      const wallet = MobileWalletFactory.createWallet('phantom', redirectUrl, domain);
      
      expect(wallet).toBeInstanceOf(PhantomMobileWalletAdapter);
      expect(wallet.name).toBe('Phantom');
    });

    it('should create Solflare wallet adapter', () => {
      const wallet = MobileWalletFactory.createWallet('solflare', redirectUrl, domain);
      
      expect(wallet).toBeInstanceOf(SolflareMobileWalletAdapter);
      expect(wallet.name).toBe('Solflare');
    });

    it('should create Backpack wallet adapter', () => {
      const wallet = MobileWalletFactory.createWallet('backpack', redirectUrl, domain);
      
      expect(wallet).toBeInstanceOf(BackpackMobileWalletAdapter);
      expect(wallet.name).toBe('Backpack');
    });

    it('should be case insensitive', () => {
      const phantomLower = MobileWalletFactory.createWallet('phantom', redirectUrl);
      const phantomUpper = MobileWalletFactory.createWallet('PHANTOM', redirectUrl);
      const phantomMixed = MobileWalletFactory.createWallet('PhAnToM', redirectUrl);
      
      expect(phantomLower).toBeInstanceOf(PhantomMobileWalletAdapter);
      expect(phantomUpper).toBeInstanceOf(PhantomMobileWalletAdapter);
      expect(phantomMixed).toBeInstanceOf(PhantomMobileWalletAdapter);
    });

    it('should work without domain parameter', () => {
      const wallet = MobileWalletFactory.createWallet('phantom', redirectUrl);
      
      expect(wallet).toBeInstanceOf(PhantomMobileWalletAdapter);
    });

    it('should throw error for unsupported wallet', () => {
      expect(() => {
        MobileWalletFactory.createWallet('unsupported', redirectUrl);
      }).toThrow("Wallet 'unsupported' is not supported");
    });

    it('should throw error for empty wallet name', () => {
      expect(() => {
        MobileWalletFactory.createWallet('', redirectUrl);
      }).toThrow("Wallet '' is not supported");
    });

    it('should create wallet with correct constructor parameters', () => {
      // We can't easily test the constructor parameters without exposing them,
      // but we can verify the wallet is created and has the expected type
      const wallet = MobileWalletFactory.createWallet('phantom', redirectUrl, domain);
      
      expect(wallet).toBeInstanceOf(BaseMobileWalletAdapter);
      expect(typeof wallet.connect).toBe('function');
      expect(typeof wallet.disconnect).toBe('function');
      expect(typeof wallet.signMessage).toBe('function');
    });
  });

  describe('getAvailableWallets', () => {
    it('should return list of available wallets', () => {
      const wallets = MobileWalletFactory.getAvailableWallets();
      
      expect(wallets).toContain('phantom');
      expect(wallets).toContain('solflare');
      expect(wallets).toContain('backpack');
      expect(wallets).toHaveLength(3);
    });

    it('should return array of strings', () => {
      const wallets = MobileWalletFactory.getAvailableWallets();
      
      expect(Array.isArray(wallets)).toBe(true);
      for (const wallet of wallets) {
        expect(typeof wallet).toBe('string');
      }
    });
  });

  describe('registerWallet', () => {
    const mockWalletName = 'testwallet';
    const mockFactory = jest.fn();

    beforeEach(() => {
      mockFactory.mockClear();
    });

    afterEach(() => {
      // Clean up registered wallet
      delete (MobileWalletFactory as any).wallets[mockWalletName];
    });

    it('should register new wallet', () => {
      const mockAdapter = {} as BaseMobileWalletAdapter;
      mockFactory.mockReturnValue(mockAdapter);

      MobileWalletFactory.registerWallet(mockWalletName, mockFactory);
      
      const availableWallets = MobileWalletFactory.getAvailableWallets();
      expect(availableWallets).toContain(mockWalletName);
    });

    it('should create registered wallet', () => {
      const mockAdapter = {} as BaseMobileWalletAdapter;
      mockFactory.mockReturnValue(mockAdapter);

      MobileWalletFactory.registerWallet(mockWalletName, mockFactory);
      const wallet = MobileWalletFactory.createWallet(mockWalletName, redirectUrl, domain);
      
      expect(mockFactory).toHaveBeenCalledWith(redirectUrl, domain);
      expect(wallet).toBe(mockAdapter);
    });

    it('should register wallet with case insensitive name', () => {
      const mockAdapter = {} as BaseMobileWalletAdapter;
      mockFactory.mockReturnValue(mockAdapter);

      MobileWalletFactory.registerWallet('TestWallet', mockFactory);
      
      const availableWallets = MobileWalletFactory.getAvailableWallets();
      expect(availableWallets).toContain('testwallet');
      
      const wallet = MobileWalletFactory.createWallet('TESTWALLET', redirectUrl);
      expect(wallet).toBe(mockAdapter);
    });

    it('should override existing wallet', () => {
      const mockAdapter1 = { name: 'Mock1' } as BaseMobileWalletAdapter;
      const mockAdapter2 = { name: 'Mock2' } as BaseMobileWalletAdapter;
      const mockFactory1 = jest.fn().mockReturnValue(mockAdapter1);
      const mockFactory2 = jest.fn().mockReturnValue(mockAdapter2);

      MobileWalletFactory.registerWallet(mockWalletName, mockFactory1);
      MobileWalletFactory.registerWallet(mockWalletName, mockFactory2);
      
      const wallet = MobileWalletFactory.createWallet(mockWalletName, redirectUrl);
      
      expect(mockFactory2).toHaveBeenCalled();
      expect(mockFactory1).not.toHaveBeenCalled();
      expect(wallet).toBe(mockAdapter2);
    });

    it('should call factory with correct parameters', () => {
      const mockAdapter = {} as BaseMobileWalletAdapter;
      mockFactory.mockReturnValue(mockAdapter);

      MobileWalletFactory.registerWallet(mockWalletName, mockFactory);
      
      // Test without domain
      MobileWalletFactory.createWallet(mockWalletName, redirectUrl);
      expect(mockFactory).toHaveBeenCalledWith(redirectUrl, undefined);
      
      mockFactory.mockClear();
      
      // Test with domain
      MobileWalletFactory.createWallet(mockWalletName, redirectUrl, domain);
      expect(mockFactory).toHaveBeenCalledWith(redirectUrl, domain);
    });
  });

  describe('edge cases', () => {
    it('should handle special characters in wallet name', () => {
      expect(() => {
        MobileWalletFactory.createWallet('phantom-test', redirectUrl);
      }).toThrow();
      
      expect(() => {
        MobileWalletFactory.createWallet('phantom_test', redirectUrl);
      }).toThrow();
    });

    it('should handle whitespace in wallet name', () => {
      expect(() => {
        MobileWalletFactory.createWallet(' phantom ', redirectUrl);
      }).toThrow();
    });

    it('should work with different redirect URLs', () => {
      const wallets = [
        MobileWalletFactory.createWallet('phantom', 'http://localhost:3000'),
        MobileWalletFactory.createWallet('phantom', 'https://example.com/callback'),
        MobileWalletFactory.createWallet('phantom', 'myapp://auth'),
      ];
      
      for (const wallet of wallets) {
        expect(wallet).toBeInstanceOf(PhantomMobileWalletAdapter);
      }
    });

    it('should maintain wallet registry state', () => {
      const initialWallets = MobileWalletFactory.getAvailableWallets();
      
      // Create multiple wallets
      MobileWalletFactory.createWallet('phantom', redirectUrl);
      MobileWalletFactory.createWallet('solflare', redirectUrl);
      
      const walletsAfterCreation = MobileWalletFactory.getAvailableWallets();
      
      expect(walletsAfterCreation).toEqual(initialWallets);
    });
  });

  describe('static registry behavior', () => {
    it('should maintain registry across multiple calls', () => {
      const wallets1 = MobileWalletFactory.getAvailableWallets();
      const wallets2 = MobileWalletFactory.getAvailableWallets();
      
      expect(wallets1).toEqual(wallets2);
    });

    it('should persist registered wallets', () => {
      const customWalletName = 'persistent-test';
      const mockFactory = jest.fn().mockReturnValue({} as BaseMobileWalletAdapter);
      
      MobileWalletFactory.registerWallet(customWalletName, mockFactory);
      
      expect(MobileWalletFactory.getAvailableWallets()).toContain(customWalletName);
      expect(MobileWalletFactory.getAvailableWallets()).toContain(customWalletName);
      
      // Clean up
      delete (MobileWalletFactory as any).wallets[customWalletName];
    });
  });
});