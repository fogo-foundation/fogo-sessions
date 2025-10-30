import { getMetadata } from '../../utils/get-metadata';

// Mock fetch globally
const mockFetch = jest.fn();
globalThis.fetch = mockFetch;

describe('getMetadata', () => {
  beforeEach(() => {
    mockFetch.mockClear();
  });

  it('should fetch metadata for single mint', async () => {
    const mockResponse = {
      'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v': {
        name: 'USD Coin',
        symbol: 'USDC',
        image: 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v/logo.png'
      }
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockResponse)
    });

    const result = await getMetadata(['EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v']);
    
    expect(mockFetch).toHaveBeenCalledWith(
      expect.objectContaining({
        href: expect.stringContaining('https://www.fogo.io/api/token-metadata'),
        searchParams: expect.any(URLSearchParams)
      })
    );

    expect(result).toEqual(mockResponse);
  });

  it('should fetch metadata for multiple mints', async () => {
    const mints = [
      'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
      'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB'
    ];

    const mockResponse = {
      'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v': {
        name: 'USD Coin',
        symbol: 'USDC',
        image: 'https://example.com/usdc.png'
      },
      'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB': {
        name: 'Tether USD',
        symbol: 'USDT',
        image: 'https://example.com/usdt.png'
      }
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockResponse)
    });

    const result = await getMetadata(mints);
    
    // Check that the URL contains both mint parameters
    const [fetchCall] = mockFetch.mock.calls;
    const url = fetchCall[0];
    const searchParams = url.searchParams;
    
    expect(searchParams.getAll('mint[]')).toEqual(mints);
    expect(result).toEqual(mockResponse);
  });

  it('should handle empty mints array', async () => {
    const mockResponse = {};

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockResponse)
    });

    const result = await getMetadata([]);
    
    expect(mockFetch).toHaveBeenCalledWith(
      expect.objectContaining({
        href: 'https://www.fogo.io/api/token-metadata'
      })
    );

    expect(result).toEqual({});
  });

  it('should construct correct URL with query parameters', async () => {
    const mints = ['mint1', 'mint2', 'mint3'];
    
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({})
    });

    await getMetadata(mints);
    
    const [fetchCall] = mockFetch.mock.calls;
    const url = fetchCall[0];
    
    expect(url.href).toContain('https://www.fogo.io/api/token-metadata');
    expect(url.searchParams.getAll('mint[]')).toEqual(mints);
  });

  it('should validate response schema', async () => {
    const validResponse = {
      'test-mint': {
        name: 'Test Token',
        symbol: 'TEST',
        image: 'https://example.com/test.png'
      }
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(validResponse)
    });

    const result = await getMetadata(['test-mint']);
    expect(result).toEqual(validResponse);
  });

  it('should throw validation error for invalid response schema', async () => {
    const invalidResponse = {
      'test-mint': {
        name: 'Test Token',
        symbol: 'TEST',
        // missing image property
      }
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(invalidResponse)
    });

    await expect(getMetadata(['test-mint'])).rejects.toThrow();
  });

  it('should throw validation error for response with wrong types', async () => {
    const invalidResponse = {
      'test-mint': {
        name: 123, // should be string
        symbol: 'TEST',
        image: 'https://example.com/test.png'
      }
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(invalidResponse)
    });

    await expect(getMetadata(['test-mint'])).rejects.toThrow();
  });

  it('should handle fetch errors', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error'));

    await expect(getMetadata(['test-mint'])).rejects.toThrow('Network error');
  });

  it('should handle JSON parsing errors', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.reject(new Error('Invalid JSON'))
    });

    await expect(getMetadata(['test-mint'])).rejects.toThrow('Invalid JSON');
  });

  it('should handle complex metadata structure', async () => {
    const complexResponse = {
      'mint1': {
        name: 'Complex Token With Long Name',
        symbol: 'COMPLEX',
        image: 'https://very-long-domain-name.example.com/path/to/image.png'
      },
      'mint2': {
        name: 'Simple',
        symbol: 'S',
        image: 'https://short.co/i.png'
      }
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(complexResponse)
    });

    const result = await getMetadata(['mint1', 'mint2']);
    expect(result).toEqual(complexResponse);
  });
});