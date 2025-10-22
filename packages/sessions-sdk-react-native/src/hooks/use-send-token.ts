import { TransactionResultType, sendTransfer } from '@fogo/sessions-sdk';
import { PublicKey } from '@solana/web3.js';
import { useState, useCallback } from 'react';

import type {EstablishedSessionState} from '../session-provider';
import { stringToAmount } from '../utils/amount-to-string';
import { errorToString } from '../utils/error-to-string';

export type SendTokenParams = {
  sessionState: EstablishedSessionState;
  tokenMint: PublicKey;
  decimals: number;
  amountAvailable: bigint;
  onSuccess?: (txSignature: string) => void;
  onError?: (error: string) => void;
}

export type SendTokenState = {
  amount: string;
  recipient: string;
  isLoading: boolean;
  error: string | undefined;
}

export type SendTokenActions = {
  setAmount: (amount: string) => void;
  setRecipient: (recipient: string) => void;
  setMaxAmount: () => void;
  validateAndSend: () => Promise<void>;
  reset: () => void;
}

export type SendTokenValidation = {
  isValidRecipient: boolean;
  isValidAmount: boolean;
  isReadyToSend: boolean;
  recipientError: string | undefined;
  amountError: string | undefined;
}

/**
 * Hook for sending tokens using intent transfers.
 *
 * This hook uses the `sendTransfer` function from the sessions SDK to perform
 * intent-based transfers rather than session-based transfers, providing better
 * security and user experience.
 *
 * @category React Hooks
 * @public
 */
export const useSendToken = ({
  sessionState,
  tokenMint,
  decimals,
  amountAvailable,
  onSuccess,
  onError,
}: SendTokenParams) => {
  // Type assertions for sessionState properties
  const walletPublicKey = (sessionState as { walletPublicKey: PublicKey }).walletPublicKey;
  const adapter = (sessionState as { adapter: unknown }).adapter;
  const signMessage = (sessionState as { signMessage: (message: Uint8Array) => Promise<Uint8Array> }).signMessage;
  const [amount, setAmountState] = useState('');
  const [recipient, setRecipientState] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | undefined>(undefined);

  const validation: SendTokenValidation = {
    isValidRecipient: (() => {
      if (!recipient) return false;
      try {
        new PublicKey(recipient);
        return !new PublicKey(recipient).equals(walletPublicKey);
      } catch {
        return false;
      }
    })(),
    isValidAmount: (() => {
      if (!amount) return false;
      try {
        const amountBigInt = stringToAmount(amount, decimals);
        return amountBigInt > 0n && amountBigInt <= amountAvailable;
      } catch {
        return false;
      }
    })(),
    get isReadyToSend() {
      return this.isValidRecipient && this.isValidAmount && !isLoading;
    },
    recipientError: (() => {
      if (!recipient) return;
      try {
        const recipientKey = new PublicKey(recipient);
        if (recipientKey.equals(walletPublicKey)) {
          return 'You cannot send tokens to yourself';
        }
        return;
      } catch {
        return 'Invalid recipient address';
      }
    })(),
    amountError: (() => {
      if (!amount) return;
      try {
        const amountBigInt = stringToAmount(amount, decimals);
        if (amountBigInt <= 0n) {
          return 'Amount must be greater than 0';
        }
        if (amountBigInt > amountAvailable) {
          return 'Insufficient balance';
        }
        return;
      } catch (validationError: unknown) {
        return `Invalid amount: ${errorToString(validationError)}`;
      }
    })(),
  };

  const setAmount = useCallback((newAmount: string) => {
    setAmountState(newAmount);
    setError(undefined);
  }, []);

  const setRecipient = useCallback((newRecipient: string) => {
    setRecipientState(newRecipient);
    setError(undefined);
  }, []);

  const setMaxAmount = useCallback(() => {
    const maxAmountStr = (
      Number(amountAvailable) / Math.pow(10, decimals)
    ).toString();
    setAmount(maxAmountStr);
  }, [amountAvailable, decimals, setAmount]);

  const validateAndSend = useCallback(async () => {
    setError(undefined);


    if (!validation.isValidRecipient || !validation.isValidAmount) {
      const errorMsg =
        validation.recipientError ??
        validation.amountError ??
        'Please fill in all fields';
      setError(errorMsg);
      onError?.(errorMsg);
      return;
    }

    setIsLoading(true);

    try {
      const transferAmount = stringToAmount(amount, decimals);
      const recipientPublicKey = new PublicKey(recipient);


      const result = await (sendTransfer as (params: {
        adapter: unknown;
        walletPublicKey: PublicKey;
        signMessage: (message: Uint8Array) => Promise<Uint8Array>;
        mint: PublicKey;
        amount: bigint;
        recipient: PublicKey;
      }) => Promise<{ type: number; signature: string; error?: unknown }>)({
        adapter,
        walletPublicKey,
        signMessage,
        mint: tokenMint,
        amount: transferAmount,
        recipient: recipientPublicKey,
      });

      if (result.type === (TransactionResultType as { Success: number }).Success) {
        onSuccess?.(result.signature);
        // Reset form on success
        setAmountState('');
        setRecipientState('');
      } else {
        const errorMsg = `Failed to send tokens: ${errorToString(result.error)}`;
        setError(errorMsg);
        onError?.(errorMsg);
      }
    } catch (sendError: unknown) {
      const errorMsg = `Failed to send tokens: ${errorToString(sendError)}`;
      setError(errorMsg);
      onError?.(errorMsg);
    } finally {
      setIsLoading(false);
    }
  }, [
    amount,
    recipient,
    decimals,
    validation.isValidRecipient,
    validation.isValidAmount,
    validation.recipientError,
    validation.amountError,
    tokenMint,
    adapter,
    walletPublicKey,
    signMessage,
    onSuccess,
    onError,
  ]);

  const reset = useCallback(() => {
    setAmountState('');
    setRecipientState('');
    setError(undefined);
    setIsLoading(false);
  }, []);

  const state: SendTokenState = {
    amount,
    recipient,
    isLoading,
    error,
  };

  const actions: SendTokenActions = {
    setAmount,
    setRecipient,
    setMaxAmount,
    validateAndSend,
    reset,
  };

  return {
    state,
    actions,
    validation,
  };
};

export type UseSendTokenReturn = ReturnType<typeof useSendToken>;
