import { errorToString } from '../../utils/error-to-string';

describe('errorToString', () => {
  it('should convert Error objects to message string', () => {
    const error = new Error('Test error message');
    expect(errorToString(error)).toBe('Test error message');
  });

  it('should convert custom Error subclasses to message string', () => {
    class CustomError extends Error {
      constructor(message: string) {
        super(message);
        this.name = 'CustomError';
      }
    }
    
    const error = new CustomError('Custom error message');
    expect(errorToString(error)).toBe('Custom error message');
  });

  it('should handle string errors directly', () => {
    expect(errorToString('String error')).toBe('String error');
    expect(errorToString('')).toBe('');
  });

  it('should convert object errors to JSON string', () => {
    const errorObj = { code: 500, message: 'Server error' };
    expect(errorToString(errorObj)).toBe('{"code":500,"message":"Server error"}');
  });

  it('should handle null and undefined objects', () => {
    expect(errorToString(null)).toBe('null');
    expect(errorToString(undefined)).toBe('Unknown Error');
  });

  it('should handle primitive types', () => {
    expect(errorToString(42)).toBe('Unknown Error');
    expect(errorToString(true)).toBe('Unknown Error');
    expect(errorToString(false)).toBe('Unknown Error');
  });

  it('should handle complex objects', () => {
    const complexError = {
      name: 'ValidationError',
      details: {
        field: 'email',
        issue: 'invalid format'
      },
      timestamp: '2023-01-01T00:00:00Z'
    };
    
    const result = errorToString(complexError);
    expect(result).toContain('ValidationError');
    expect(result).toContain('email');
    expect(result).toContain('invalid format');
  });

  it('should handle arrays as objects', () => {
    const arrayError = ['error1', 'error2', 'error3'];
    expect(errorToString(arrayError)).toBe('["error1","error2","error3"]');
  });

  it('should handle circular references in objects', () => {
    const circularObj: any = { name: 'test' };
    circularObj.self = circularObj;
    
    // JSON.stringify throws on circular references, so it should throw
    expect(() => errorToString(circularObj)).toThrow();
  });

  it('should handle Error objects with no message', () => {
    const error = new Error();
    expect(errorToString(error)).toBe('');
  });

  it('should handle Error objects with empty message', () => {
    const error = new Error('');
    expect(errorToString(error)).toBe('');
  });

  it('should handle functions', () => {
    const fn = () => 'test';
    expect(errorToString(fn)).toBe('Unknown Error');
  });

  it('should handle symbols', () => {
    const sym = Symbol('test');
    expect(errorToString(sym)).toBe('Unknown Error');
  });

  it('should handle bigint', () => {
    const big = BigInt(123);
    expect(errorToString(big)).toBe('Unknown Error');
  });
});