import { useCallback, useMemo, useState } from 'react';
import type {TextInputProps} from 'react-native';
import {
  View,
  Text,
  TextInput,
  StyleSheet
  
} from 'react-native';

import { stringToAmount, amountToString } from '../utils/amount-to-string';
import { errorToString } from '../utils/error-to-string';

// TextField component for React Native
const TextField = ({
  label,
  description,
  value,
  onChangeText,
  validate,
  errorMessage: externalError,
  style,
  inputStyle,
  labelStyle,
  errorStyle,
  descriptionStyle,
  ...textInputProps
}: TextInputProps & {
  label?: string;
  description?: string;
  validate?: (value: string) => string | undefined;
  errorMessage?: string;
  style?: unknown;
  inputStyle?: unknown;
  labelStyle?: unknown;
  errorStyle?: unknown;
  descriptionStyle?: unknown;
}) => {
  const [internalError, setInternalError] = useState<string | undefined>();
  const [isFocused, setIsFocused] = useState(false);

  const handleChangeText = useCallback(
    (text: string) => {
      onChangeText?.(text);

      if (validate) {
        const error = validate(text);
        setInternalError(error);
      }
    },
    [onChangeText, validate]
  );

  const handleFocus = useCallback(() => {
    setIsFocused(true);
  }, []);

  const handleBlur = useCallback(() => {
    setIsFocused(false);
  }, []);

  const error = externalError ?? internalError;
  const hasError = !!error;

  return (
    <View style={[fieldStyles.container, style]}>
      {label && <Text style={[fieldStyles.label, labelStyle]}>{label}</Text>}

      {description && (
        <Text style={[fieldStyles.description, descriptionStyle]}>
          {description}
        </Text>
      )}

      <TextInput
        {...textInputProps}
        style={[
          fieldStyles.input,
          isFocused && fieldStyles.inputFocused,
          hasError && fieldStyles.inputError,
          inputStyle,
        ]}
        value={value}
        onChangeText={handleChangeText}
        onFocus={handleFocus}
        onBlur={handleBlur}
      />

      {hasError && <Text style={[fieldStyles.error, errorStyle]}>{error}</Text>}
    </View>
  );
};

// TokenAmountInput component
export const TokenAmountInput = ({
  decimals,
  symbol,
  min,
  max,
  gt,
  lt,
  ...props
}: TextInputProps & {
  label?: string;
  decimals: number;
  symbol?: string;
  min?: bigint;
  max?: bigint;
  gt?: bigint;
  lt?: bigint;
  onValueChange?: (value: string) => void;
  defaultValue?: string;
  style?: unknown;
  inputStyle?: unknown;
  labelStyle?: unknown;
  errorStyle?: unknown;
  descriptionStyle?: unknown;
}) => {
  const tokenAmountProps = useTokenAmountInput({
    decimals,
    ...(symbol !== undefined && { symbol }),
    ...(min !== undefined && { min }),
    ...(max !== undefined && { max }),
    ...(gt !== undefined && { gt }),
    ...(lt !== undefined && { lt }),
  });
  const [value, setValue] = useState(props.defaultValue ?? '');

  const handleChangeText = useCallback(
    (text: string) => {
      setValue(text);
      props.onValueChange?.(text);
      props.onChangeText?.(text);
    },
    [props]
  );

  return (
    <TextField
      {...tokenAmountProps}
      {...props}
      value={value}
      onChangeText={handleChangeText}
      keyboardType="numeric"
      placeholder="0.00"
    />
  );
};

// Hook for token amount validation
const useTokenAmountInput = ({
  decimals,
  symbol = 'Tokens',
  min,
  max,
  gt,
  lt,
}: {
  decimals: number;
  symbol?: string;
  min?: bigint;
  max?: bigint;
  gt?: bigint;
  lt?: bigint;
}) => {
  const validate = useCallback(
    (value: string) => {
      if (value) {
        try {
          const amount = stringToAmount(value, decimals);
          if (gt !== undefined && amount <= gt) {
            return `Must be greater than ${amountToString(gt, decimals).toString()} ${symbol}`;
          } else if (lt !== undefined && amount >= lt) {
            return `Must be less than ${amountToString(lt, decimals).toString()} ${symbol}`;
          } else if (max !== undefined && amount > max) {
            return `Cannot be more than ${amountToString(max, decimals).toString()} ${symbol}`;
          } else if (min !== undefined && amount < min) {
            return `Cannot be less than ${amountToString(min, decimals).toString()} ${symbol}`;
          } else {
            return;
          }
        } catch (error: unknown) {
          return errorToString(error);
        }
      } else {
        return;
      }
    },
    [decimals, gt, lt, max, min, symbol]
  );

  return useMemo(
    () => ({
      description: symbol,
      validate,
    }),
    [symbol, validate]
  );
};

// Styles
const fieldStyles = StyleSheet.create({
  container: {
    marginBottom: 4,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 4,
  },
  description: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#111827',
    backgroundColor: '#FFFFFF',
    minHeight: 48,
  },
  inputFocused: {
    borderColor: '#3B82F6',
    borderWidth: 2,
  },
  inputError: {
    borderColor: '#EF4444',
    borderWidth: 2,
  },
  error: {
    fontSize: 14,
    color: '#EF4444',
    marginTop: 4,
    lineHeight: 20,
  },
});

// Enhanced version with better styling for token amounts
export const EnhancedTokenAmountInput = ({
  decimals,
  symbol,
  label,
  min,
  max,
  gt,
  lt,
  style,
  ...props
}: TextInputProps & {
  label: string;
  decimals: number;
  symbol: string;
  min?: bigint;
  max?: bigint;
  gt?: bigint;
  lt?: bigint;
  onValueChange?: (value: string) => void;
  defaultValue?: string;
  style?: unknown;
}) => {
  const tokenAmountProps = useTokenAmountInput({
    decimals,
    symbol,
    ...(min !== undefined && { min }),
    ...(max !== undefined && { max }),
    ...(gt !== undefined && { gt }),
    ...(lt !== undefined && { lt }),
  });
  const [value, setValue] = useState(props.defaultValue ?? '');
  const [isFocused, setIsFocused] = useState(false);

  const handleChangeText = useCallback(
    (text: string) => {
      setValue(text);
      props.onValueChange?.(text);
      props.onChangeText?.(text);
    },
    [props]
  );

  const handleFocus = useCallback(() => {
    setIsFocused(true);
  }, []);

  const handleBlur = useCallback(() => {
    setIsFocused(false);
  }, []);

  const error = tokenAmountProps.validate(value);
  const hasError = !!error;

  return (
    <View style={[enhancedStyles.container, style]}>
      {/* Header with token name and symbol */}
      <View style={enhancedStyles.header}>
        <Text style={enhancedStyles.tokenName}>{label}</Text>
        <Text style={enhancedStyles.tokenSymbol}>{symbol}</Text>
      </View>

      {/* Input field */}
      <View
        style={[
          enhancedStyles.inputContainer,
          isFocused && enhancedStyles.inputContainerFocused,
          hasError && enhancedStyles.inputContainerError,
        ]}
      >
        <TextInput
          {...props}
          style={enhancedStyles.input}
          value={value}
          onChangeText={handleChangeText}
          onFocus={handleFocus}
          onBlur={handleBlur}
          keyboardType="numeric"
          placeholder="0.00"
          placeholderTextColor="#9CA3AF"
        />
        {symbol && <Text style={enhancedStyles.symbolSuffix}>{symbol}</Text>}
      </View>

      {/* Error message */}
      {hasError && <Text style={enhancedStyles.errorMessage}>{error}</Text>}

      {/* Helper text for limits */}
      {(min !== undefined || max !== undefined) && !hasError && (
        <Text style={enhancedStyles.helperText}>
          {(() => {
            if (min !== undefined && max !== undefined) {
              return `Range: ${amountToString(min, decimals)} - ${amountToString(max, decimals)} ${symbol}`;
            }
            if (min === undefined && max !== undefined) {
              return `Maximum: ${amountToString(max, decimals)} ${symbol}`;
            }
            if (max === undefined && min !== undefined) {
              return `Minimum: ${amountToString(min, decimals)} ${symbol}`;
            }
            return '';
          })()}
        </Text>
      )}
    </View>
  );
};

const enhancedStyles = StyleSheet.create({
  container: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  tokenName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    flex: 1,
  },
  tokenSymbol: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
    backgroundColor: '#E5E7EB',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    paddingHorizontal: 12,
    minHeight: 48,
  },
  inputContainerFocused: {
    borderColor: '#3B82F6',
    borderWidth: 2,
  },
  inputContainerError: {
    borderColor: '#EF4444',
    borderWidth: 2,
  },
  input: {
    flex: 1,
    fontSize: 18,
    color: '#111827',
    paddingVertical: 12,
    paddingHorizontal: 0,
    fontWeight: '500',
  },
  symbolSuffix: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
    marginLeft: 8,
  },
  errorMessage: {
    fontSize: 14,
    color: '#EF4444',
    marginTop: 8,
    lineHeight: 20,
  },
  helperText: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
    lineHeight: 16,
  },
});
