import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  // Action Buttons
  actionButtons: {
    flexDirection: 'row',
    marginBottom: 24,
    gap: 12,
  },
  actionButton: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  actionButtonIcon: {
    fontSize: 24,
    marginBottom: 8,
  },
  actionButtonText: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '500',
  },

  // Back Button
  backButton: {
    paddingVertical: 12,
    paddingHorizontal: 4,
    marginBottom: 16,
  },
  backButtonText: {
    fontSize: 16,
    color: '#3B82F6',
    fontWeight: '500',
  },

  // Token List
  tokenList: {
    gap: 12,
  },
  tokenItem: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    overflow: 'hidden',
  },
  tokenContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  tokenIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  tokenIconLarge: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginBottom: 12,
  },
  tokenIconPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#E5E7EB',
    marginRight: 12,
  },
  tokenInfo: {
    flex: 1,
  },
  tokenName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  tokenAmount: {
    fontSize: 14,
    color: '#6B7280',
  },
  sendTokenButton: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  sendTokenButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
  },

  // Loading States
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#6B7280',
    marginTop: 12,
  },

  // Error States
  errorContainer: {
    padding: 20,
    alignItems: 'center',
  },
  errorText: {
    fontSize: 16,
    color: '#DC2626',
    textAlign: 'center',
  },

  // Empty States
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
  },

  // Receive Screen
  receivePage: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  receiveContainer: {
    alignItems: 'center',
    paddingVertical: 20,
    paddingHorizontal: 20,
    flex: 1,
    justifyContent: 'center',
  },
  receiveTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 32,
    textAlign: 'center',
  },
  qrCodeContainer: {
    width: 200,
    height: 200,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 32,
    padding: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  qrCodePlaceholder: {
    fontSize: 16,
    color: '#6B7280',
  },
  walletAddressFull: {
    fontSize: 13,
    fontFamily: 'monospace',
    color: '#374151',
    textAlign: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    lineHeight: 18,
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    maxWidth: '100%',
    flexWrap: 'wrap',
  },

  // Send Screen
  sendContainer: {
    flex: 1,
  },
  sendHeader: {
    alignItems: 'center',
    marginBottom: 24,
  },
  sendTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
  },
  availableAmount: {
    fontSize: 16,
    color: '#6B7280',
  },
  inputContainer: {
    marginBottom: 20,
  },
  inputHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
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
    textAlignVertical: 'top',
  },
  inputWithQR: {
    paddingRight: 48,
  },
  qrScanButton: {
    position: 'absolute',
    right: 12,
    top: 12,
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qrScanButtonText: {
    fontSize: 16,
    color: '#3B82F6',
  },
  maxButton: {
    fontSize: 16,
    color: '#3B82F6',
    fontWeight: '600',
  },
  sendButton: {
    backgroundColor: '#3B82F6',
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    minHeight: 52,
  },
  sendButtonDisabled: {
    opacity: 0.6,
  },
  sendButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
