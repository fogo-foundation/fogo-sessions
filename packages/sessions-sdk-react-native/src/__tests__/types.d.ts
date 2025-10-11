// Test type declarations to relax strict typing for test files
declare module '@fogo/sessions-sdk' {
  export interface SessionAccount {
    expiration: Date;
    [key: string]: any;
  }
  
  export interface TransactionResult {
    type: any;
    signature?: string;
    error?: any;
  }
}

// Allow any property access on test objects
declare global {
  namespace jest {
    interface Mock {
      [key: string]: any;
    }
  }
}