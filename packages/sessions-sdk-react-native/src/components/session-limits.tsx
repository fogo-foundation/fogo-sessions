import React, { useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Modal,
  TouchableWithoutFeedback,
} from 'react-native';
import { PublicKey } from '@solana/web3.js';

import { amountToString } from '../utils/amount-to-string';
import { errorToString } from '../utils/error-to-string';
import { TokenAmountInput } from './token-amount-input';
import {
  TokenDataStateType,
  useTokenMetadata,
} from '../hooks/use-token-metadata';
import { useSessionLimitsForm } from '../hooks/use-session-limits-form';
import { DURATION, type DurationKey } from '../hooks/use-session-duration';

const Switch = ({
  isEnabled,
  onToggle,
  children,
  style,
}: {
  isEnabled: boolean;
  onToggle: (enabled: boolean) => void;
  children: React.ReactNode;
  style?: any;
}) => (
  <View style={[styles.switchContainer, style]}>
    <View style={styles.switchLabel}>
      {typeof children === 'string' ? (
        <Text style={styles.switchText}>{children}</Text>
      ) : (
        children
      )}
    </View>
    <TouchableOpacity
      style={[styles.switch, isEnabled && styles.switchEnabled]}
      onPress={() => onToggle(!isEnabled)}
      activeOpacity={0.8}
    >
      <View
        style={[styles.switchThumb, isEnabled && styles.switchThumbEnabled]}
      />
    </TouchableOpacity>
  </View>
);

// Duration Picker component for React Native
const DurationPicker = React.memo(
  ({
    selectedDuration,
    onDurationChange,
    style,
  }: {
    selectedDuration: DurationKey;
    onDurationChange: (duration: DurationKey) => void;
    style?: any;
  }) => {
    const [isOpen, setIsOpen] = React.useState(false);

    return (
      <View style={[styles.durationContainer, style]}>
        <Text style={styles.durationLabel}>
          Allow transactions with this app for
        </Text>
        <TouchableOpacity
          style={styles.durationSelector}
          onPress={() => setIsOpen(true)}
          activeOpacity={0.8}
        >
          <Text style={styles.durationSelectorText}>
            {DURATION[selectedDuration].label}
          </Text>
          <Text style={styles.durationSelectorArrow}>▼</Text>
        </TouchableOpacity>

        <Modal
          visible={isOpen}
          transparent
          animationType="slide"
          onRequestClose={() => setIsOpen(false)}
        >
          <TouchableWithoutFeedback onPress={() => setIsOpen(false)}>
            <View style={styles.durationModalOverlay}>
              <TouchableWithoutFeedback>
                <View style={styles.durationModal}>
                  <View style={styles.durationModalHeader}>
                    <Text style={styles.durationModalTitle}>
                      Select Duration
                    </Text>
                    <TouchableOpacity
                      onPress={() => setIsOpen(false)}
                      style={styles.durationModalClose}
                    >
                      <Text style={styles.durationModalCloseText}>✕</Text>
                    </TouchableOpacity>
                  </View>
                  <ScrollView>
                    {Object.entries(DURATION).map(([key, { label }]) => (
                      <TouchableOpacity
                        key={key}
                        style={[
                          styles.durationOption,
                          selectedDuration === key &&
                          styles.durationOptionSelected,
                        ]}
                        onPress={() => {
                          onDurationChange(key as DurationKey);
                          setIsOpen(false);
                        }}
                      >
                        <Text
                          style={[
                            styles.durationOptionText,
                            selectedDuration === key &&
                            styles.durationOptionTextSelected,
                          ]}
                        >
                          {label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              </TouchableWithoutFeedback>
            </View>
          </TouchableWithoutFeedback>
        </Modal>
      </View>
    );
  }
);

/**
 * Component for setting session spending limits.
 *
 * @category UI Components
 * @public
 */
export const SessionLimits = <Token extends PublicKey>({
  tokens,
  initialLimits,
  onSubmit,
  buttonText = 'Log in',
  error,
  style,
  enableUnlimited,
  isSessionUnlimited,
  autoFocus,
}: {
  tokens: Token[];
  initialLimits: Map<Token, bigint>;
  onSubmit?:
  | ((duration: number, tokens?: Map<Token, bigint>) => void)
  | undefined;
  buttonText?: string;
  error?: unknown;
  style?: any;
  autoFocus?: boolean;
} & (
    | { enableUnlimited?: false | undefined; isSessionUnlimited?: undefined }
    | { enableUnlimited: true | undefined; isSessionUnlimited?: boolean }
  )) => {
  const {
    duration,
    limits,
    tokenForm,
    handleSubmit,
    shouldShowTokenInputs,
    isSubmitDisabled,
  } = useSessionLimitsForm({
    enableUnlimited,
    isSessionUnlimited,
    tokens,
    onSubmit,
  });

  return (
    <View style={[styles.sessionLimits, style]}>
      <ScrollView
        style={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
      >
        <DurationPicker
          selectedDuration={duration.selectedDuration}
          onDurationChange={duration.setDuration}
          style={styles.durationPicker}
        />

        {limits.shouldShowLimitToggle ? (
          <Switch
            isEnabled={limits.applyLimits}
            onToggle={limits.toggleApplyLimits}
            style={styles.applyLimitsSwitch}
          >
            <Text style={styles.switchText}>
              Limit this app's access to tokens
            </Text>
          </Switch>
        ) : (
          <View />
        )}

        {shouldShowTokenInputs ? (
          <View style={styles.tokenList}>
            {tokens.map((mint) => (
              <Token
                key={mint.toBase58()}
                mint={mint}
                initialAmount={
                  [...initialLimits.entries()].find(([limitMint]) =>
                    limitMint.equals(mint)
                  )?.[1] ?? 0n
                }
                onValueChange={tokenForm.updateFormData}
                autoFocus={autoFocus}
              />
            ))}
          </View>
        ) : (
          <View style={styles.unlimitedMessage}>
            <Text style={styles.unlimitedText}>
              This app will have unlimited access to your tokens
            </Text>
          </View>
        )}

        <View style={styles.footer}>
          {error !== undefined && (
            <Text style={styles.errorMessage}>{errorToString(error)}</Text>
          )}

          <TouchableOpacity
            style={[
              styles.submitButton,
              isSubmitDisabled && styles.submitButtonDisabled,
            ]}
            onPress={handleSubmit}
            disabled={isSubmitDisabled}
            activeOpacity={0.8}
          >
            {isSubmitDisabled ? (
              <ActivityIndicator color="white" size="small" />
            ) : (
              <Text style={styles.submitButtonText}>{buttonText}</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
};

const Token = ({
  mint,
  initialAmount,
  onValueChange,
  autoFocus,
}: {
  mint: PublicKey;
  initialAmount: bigint;
  onValueChange: (mint: string, value: string, decimals: number) => void;
  autoFocus?: boolean;
}) => {
  const metadata = useTokenMetadata(mint);
  const initializedRef = useRef(false);

  const handleValueChange = useCallback(
    (value: string) => {
      if (metadata.type === TokenDataStateType.Loaded) {
        onValueChange(mint.toBase58(), value, metadata.data.decimals);
      }
    },
    [mint, metadata, onValueChange]
  );

  // Initialize formData with initial value when metadata loads
  useEffect(() => {
    if (
      metadata.type === TokenDataStateType.Loaded &&
      initialAmount > 0n &&
      !initializedRef.current
    ) {
      const initialValue = amountToString(
        initialAmount,
        metadata.data.decimals
      );
      onValueChange(mint.toBase58(), initialValue, metadata.data.decimals);
      initializedRef.current = true;
    }
  }, [metadata, initialAmount, mint, onValueChange]);

  switch (metadata.type) {
    case TokenDataStateType.Error: {
      return (
        <View style={styles.tokenError}>
          <Text style={styles.tokenErrorText}>
            Error loading token: {mint.toBase58().slice(0, 8)}...
          </Text>
        </View>
      );
    }

    case TokenDataStateType.Loaded: {
      return (
        <View style={styles.tokenContainer}>
          <TokenAmountInput
            style={styles.tokenInput}
            label={
              'name' in metadata.data ? metadata.data.name : mint.toBase58()
            }
            decimals={metadata.data.decimals}
            symbol={metadata.data.symbol}
            defaultValue={amountToString(initialAmount, metadata.data.decimals)}
            min={0n}
            onValueChange={handleValueChange}
            autoFocus={autoFocus}
          />
        </View>
      );
    }

    case TokenDataStateType.Loading:
    case TokenDataStateType.NotLoaded: {
      return (
        <View style={styles.tokenLoading}>
          <ActivityIndicator size="small" color="#666" />
          <Text style={styles.tokenLoadingText}>Loading token...</Text>
        </View>
      );
    }
  }
};

const styles = StyleSheet.create({
  sessionLimits: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scrollContainer: {
    flex: 1,
    paddingHorizontal: 0,
  },
  switchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 4,
  },
  switchLabel: {
    flex: 1,
    marginRight: 16,
  },
  switchText: {
    fontSize: 16,
    color: '#374151',
    lineHeight: 22,
    fontWeight: '500',
  },
  switch: {
    width: 50,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#D1D5DB',
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  switchEnabled: {
    backgroundColor: '#3B82F6',
  },
  switchThumb: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
    alignSelf: 'flex-start',
  },
  switchThumbEnabled: {
    alignSelf: 'flex-end',
  },
  applyLimitsSwitch: {
    marginBottom: 20,
  },
  tokenList: {
    gap: 16,
  },
  tokenContainer: {
    marginBottom: 4,
  },
  tokenInput: {
    // TokenAmountInput will handle its own styling
  },
  tokenLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 4,
  },
  tokenLoadingText: {
    marginLeft: 8,
    fontSize: 16,
    color: '#6B7280',
  },
  tokenError: {
    paddingVertical: 16,
    paddingHorizontal: 4,
  },
  tokenErrorText: {
    fontSize: 16,
    color: '#DC2626',
  },
  unlimitedMessage: {
    paddingVertical: 20,
    paddingHorizontal: 16,
    backgroundColor: '#FEF3C7',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#F59E0B',
    marginVertical: 16,
  },
  unlimitedText: {
    fontSize: 16,
    color: '#92400E',
    textAlign: 'center',
    fontWeight: '500',
  },
  footer: {
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
  },
  errorMessage: {
    fontSize: 14,
    color: '#DC2626',
    marginBottom: 12,
    textAlign: 'center',
    lineHeight: 20,
  },
  submitButton: {
    backgroundColor: '#3B82F6',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
  },
  submitButtonDisabled: {
    backgroundColor: '#9CA3AF',
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  durationPicker: {
    marginBottom: 20,
  },
  durationContainer: {
    marginBottom: 16,
  },
  durationLabel: {
    fontSize: 16,
    color: '#374151',
    fontWeight: '500',
    marginBottom: 8,
  },
  durationSelector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  durationSelectorText: {
    fontSize: 16,
    color: '#374151',
    fontWeight: '500',
  },
  durationSelectorArrow: {
    fontSize: 12,
    color: '#6B7280',
  },
  durationModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  durationModal: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    width: '80%',
    maxHeight: '60%',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  durationModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  durationModalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
  },
  durationModalClose: {
    padding: 8,
  },
  durationModalCloseText: {
    fontSize: 18,
    color: '#6B7280',
    fontWeight: 'bold',
  },
  durationOption: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  durationOptionSelected: {
    backgroundColor: '#EBF4FF',
  },
  durationOptionText: {
    fontSize: 16,
    color: '#374151',
  },
  durationOptionTextSelected: {
    color: '#1D4ED8',
    fontWeight: '600',
  },
});
