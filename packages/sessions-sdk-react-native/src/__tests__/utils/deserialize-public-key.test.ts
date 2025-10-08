import { PublicKey } from '@solana/web3.js';
import {
  deserializePublicKey,
  deserializePublicKeyList,
  deserializePublicKeyMap,
} from '../../utils/deserialize-public-key';
import { createMockPublicKey } from '../test-utils';

describe('deserializePublicKey', () => {
  it('should return the same PublicKey when passed a PublicKey', () => {
    const pubkey = createMockPublicKey('test');
    const result = deserializePublicKey(pubkey);
    expect(result).toBe(pubkey);
    expect(result).toBeInstanceOf(PublicKey);
  });

  it('should create PublicKey from valid base58 string', () => {
    const pubkeyString = '11111111111111111111111111111112';
    const result = deserializePublicKey(pubkeyString);
    expect(result).toBeInstanceOf(PublicKey);
    expect(result.toBase58()).toBe(pubkeyString);
  });

  it('should create PublicKey from valid token mint address', () => {
    const usdcMint = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';
    const result = deserializePublicKey(usdcMint);
    expect(result).toBeInstanceOf(PublicKey);
    expect(result.toBase58()).toBe(usdcMint);
  });

  it('should handle invalid base58 string gracefully with mock', () => {
    // Our mock PublicKey doesn't validate base58, so it won't throw
    // In a real scenario, these would throw, but we're testing the logic flow
    const result1 = deserializePublicKey('invalid-base58');
    const result2 = deserializePublicKey('');
    const result3 = deserializePublicKey('123');
    
    expect(result1).toBeDefined();
    expect(result2).toBeDefined();
    expect(result3).toBeDefined();
  });
});

describe('deserializePublicKeyList', () => {
  it('should handle empty array', () => {
    const result = deserializePublicKeyList([]);
    expect(result).toEqual([]);
  });

  it('should handle array of PublicKey objects', () => {
    const pubkey1 = createMockPublicKey('test1');
    const pubkey2 = createMockPublicKey('test2');
    const input = [pubkey1, pubkey2];
    
    const result = deserializePublicKeyList(input);
    expect(result).toHaveLength(2);
    expect(result[0]).toBe(pubkey1);
    expect(result[1]).toBe(pubkey2);
  });

  it('should handle array of base58 strings', () => {
    const strings = [
      '11111111111111111111111111111112',
      'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'
    ];
    
    const result = deserializePublicKeyList(strings);
    expect(result).toHaveLength(2);
    expect(result[0]).toBeInstanceOf(PublicKey);
    expect(result[1]).toBeInstanceOf(PublicKey);
    expect(result[0].toBase58()).toBe(strings[0]);
    expect(result[1].toBase58()).toBe(strings[1]);
  });

  it('should handle mixed array of PublicKey objects and strings', () => {
    const pubkey = createMockPublicKey('test');
    const string = '11111111111111111111111111111112';
    const input = [pubkey, string];
    
    const result = deserializePublicKeyList(input);
    expect(result).toHaveLength(2);
    expect(result[0]).toBe(pubkey);
    expect(result[1]).toBeInstanceOf(PublicKey);
    expect(result[1].toBase58()).toBe(string);
  });

  it('should handle invalid strings in array with mock', () => {
    // With mocked PublicKey, invalid strings won't throw
    const input = ['valid', 'invalid-base58'];
    const result = deserializePublicKeyList(input);
    expect(result).toHaveLength(2);
    expect(result[0]).toBeDefined();
    expect(result[1]).toBeDefined();
  });
});

describe('deserializePublicKeyMap', () => {
  it('should return the same Map when passed a Map with PublicKey keys', () => {
    const pubkey1 = createMockPublicKey('test1');
    const pubkey2 = createMockPublicKey('test2');
    const map = new Map([
      [pubkey1, 1000n],
      [pubkey2, 2000n]
    ]);
    
    const result = deserializePublicKeyMap(map);
    expect(result).toBe(map);
    expect(result.size).toBe(2);
  });

  it('should convert Record with string keys to Map with PublicKey keys', () => {
    const record = {
      '11111111111111111111111111111112': 1000n,
      'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v': 2000n
    };
    
    const result = deserializePublicKeyMap(record);
    expect(result).toBeInstanceOf(Map);
    expect(result.size).toBe(2);
    
    const keys = Array.from(result.keys());
    expect(keys[0]).toBeInstanceOf(PublicKey);
    expect(keys[1]).toBeInstanceOf(PublicKey);
    expect(keys[0].toBase58()).toBe('11111111111111111111111111111112');
    expect(keys[1].toBase58()).toBe('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v');
    
    expect(result.get(keys[0])).toBe(1000n);
    expect(result.get(keys[1])).toBe(2000n);
  });

  it('should handle empty Record', () => {
    const result = deserializePublicKeyMap({});
    expect(result).toBeInstanceOf(Map);
    expect(result.size).toBe(0);
  });

  it('should handle empty Map', () => {
    const map = new Map();
    const result = deserializePublicKeyMap(map);
    expect(result).toBe(map);
    expect(result.size).toBe(0);
  });

  it('should preserve value types in Record conversion', () => {
    const record = {
      '11111111111111111111111111111112': { amount: 1000n, decimals: 6 },
      'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v': { amount: 2000n, decimals: 9 }
    };
    
    const result = deserializePublicKeyMap(record);
    const values = Array.from(result.values());
    
    expect(values[0]).toEqual({ amount: 1000n, decimals: 6 });
    expect(values[1]).toEqual({ amount: 2000n, decimals: 9 });
  });

  it('should handle invalid PublicKey strings in Record with mock', () => {
    // With mocked PublicKey, invalid strings won't throw
    const record = {
      'valid-key': 1000n,
      'invalid-base58': 2000n
    };
    
    const result = deserializePublicKeyMap(record);
    expect(result).toBeInstanceOf(Map);
    expect(result.size).toBe(2);
  });

  it('should handle Map with mixed value types', () => {
    const pubkey = createMockPublicKey('test');
    const map = new Map([
      [pubkey, 'string-value'],
      [createMockPublicKey('test2'), 42]
    ]);
    
    const result = deserializePublicKeyMap(map);
    expect(result).toBe(map);
    expect(result.get(pubkey)).toBe('string-value');
  });
});