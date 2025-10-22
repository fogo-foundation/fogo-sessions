import { PublicKey } from '@solana/web3.js';
import React, { createContext, useContext } from 'react';

import type {UseSendTokenReturn, SendTokenParams} from '../../hooks/use-send-token';
import {
  useSendToken
  
  
} from '../../hooks/use-send-token';
import type {EstablishedSessionState} from '../../session-provider';

export type SendTokenProviderProps = {
  children: React.ReactNode;
  sessionState: EstablishedSessionState;
  tokenMint: PublicKey;
  decimals: number;
  amountAvailable: bigint;
  onSuccess?: (txSignature: string) => void;
  onError?: (error: string) => void;
} & Omit<SendTokenParams, 'sessionState'>

const SendTokenContext = createContext<UseSendTokenReturn | undefined>(undefined);

export const SendTokenProvider: React.FC<SendTokenProviderProps> = ({
  children,
  sessionState,
  tokenMint,
  decimals,
  amountAvailable,
  onSuccess,
  onError,
}) => {
  const sendTokenHook = useSendToken({
    sessionState,
    tokenMint,
    decimals,
    amountAvailable,
    ...(onSuccess && { onSuccess }),
    ...(onError && { onError }),
  });

  return (
    <SendTokenContext.Provider value={sendTokenHook}>
      {children}
    </SendTokenContext.Provider>
  );
};

export const useSendTokenContext = (): UseSendTokenReturn => {
  const context = useContext(SendTokenContext);
  if (!context) {
    throw new Error(
      'useSendTokenContext must be used within a SendTokenProvider'
    );
  }
  return context;
};

export type SendTokenAmountInputProps = {
  placeholder?: string;
  style?: unknown;
  onChangeText?: (text: string) => void;
  children?: (props: {
    value: string;
    onChangeText: (text: string) => void;
    error: string | undefined;
    isValid: boolean;
  }) => React.ReactNode;
}

export const SendTokenAmountInput: React.FC<SendTokenAmountInputProps> = ({
  children,
  onChangeText,
}) => {
  const { state, actions, validation } = useSendTokenContext();

  const handleChangeText = (text: string) => {
    actions.setAmount(text);
    onChangeText?.(text);
  };

  if (children) {
    return (
      <>
        {children({
          value: state.amount,
          onChangeText: handleChangeText,
          error: validation.amountError,
          isValid: validation.isValidAmount,
        })}
      </>
    );
  }

  return;
};

export type SendTokenRecipientInputProps = {
  placeholder?: string;
  style?: unknown;
  onChangeText?: (text: string) => void;
  children?: (props: {
    value: string;
    onChangeText: (text: string) => void;
    error: string | undefined;
    isValid: boolean;
  }) => React.ReactNode;
}

export const SendTokenRecipientInput: React.FC<
  SendTokenRecipientInputProps
> = ({ children, onChangeText }) => {
  const { state, actions, validation } = useSendTokenContext();

  const handleChangeText = (text: string) => {
    actions.setRecipient(text);
    onChangeText?.(text);
  };

  if (children) {
    return (
      <>
        {children({
          value: state.recipient,
          onChangeText: handleChangeText,
          error: validation.recipientError,
          isValid: validation.isValidRecipient,
        })}
      </>
    );
  }

  return;
};

export type SendTokenButtonProps = {
  children?: (props: {
    onPress: () => void;
    isLoading: boolean;
    disabled: boolean;
  }) => React.ReactNode;
  onPress?: () => void;
}

export const SendTokenButton: React.FC<SendTokenButtonProps> = ({
  children,
  onPress,
}) => {
  const { state, actions, validation } = useSendTokenContext();

  const handlePress = () => {
    void actions.validateAndSend();
    onPress?.();
  };

  if (children) {
    return (
      <>
        {children({
          onPress: handlePress,
          isLoading: state.isLoading,
          disabled: !validation.isReadyToSend,
        })}
      </>
    );
  }

  return;
};

export type SendTokenMaxButtonProps = {
  children?: (props: { onPress: () => void }) => React.ReactNode;
  onPress?: () => void;
}

export const SendTokenMaxButton: React.FC<SendTokenMaxButtonProps> = ({
  children,
  onPress,
}) => {
  const { actions } = useSendTokenContext();

  const handlePress = () => {
    actions.setMaxAmount();
    onPress?.();
  };

  if (children) {
    return (
      <>
        {children({
          onPress: handlePress,
        })}
      </>
    );
  }

  return;
};

export type SendTokenStatusProps = {
  children: (props: {
    isLoading: boolean;
    error: string | undefined;
    isValid: boolean;
    canSend: boolean;
  }) => React.ReactNode;
}

export const SendTokenStatus: React.FC<SendTokenStatusProps> = ({
  children,
}) => {
  const { state, validation } = useSendTokenContext();

  return (
    <>
      {children({
        isLoading: state.isLoading,
        error: state.error,
        isValid: validation.isValidRecipient && validation.isValidAmount,
        canSend: validation.isReadyToSend,
      })}
    </>
  );
};
