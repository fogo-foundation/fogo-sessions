// Test type declarations to relax strict typing for test files
declare module '@fogo/sessions-sdk' {
  export type SessionAccount = {
    expiration: Date;
    [key: string]: any;
  }
  
  export type TransactionResult = {
    type: any;
    signature?: string;
    error?: any;
  }
}

// Allow any property access on test objects
declare global {
  namespace jest {
    type Mock = Record<string, any>;
  }
}