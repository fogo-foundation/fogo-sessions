import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  // Session Button
  sessionButton: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    minHeight: 48,
  },
  sessionButtonActive: {
    backgroundColor: '#2563EB',
  },
  sessionButtonLoading: {
    opacity: 0.7,
  },
  loader: {
    marginRight: 8,
  },
  walletInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  walletAddress: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginRight: 8,
  },
  chevron: {
    color: '#FFFFFF',
    fontSize: 12,
  },
  loginText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },

  // Session Panel
  sessionPanel: {
    flex: 1,
  },
  panelHeader: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  walletAddressCode: {
    fontSize: 16,
    fontFamily: 'monospace',
    color: '#374151',
  },

  // Tabs
  tabContainer: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  tab: {
    flex: 1,
    paddingVertical: 16,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: '#3B82F6',
  },
  tabText: {
    fontSize: 16,
    color: '#6B7280',
    fontWeight: '500',
  },
  tabTextActive: {
    color: '#3B82F6',
    fontWeight: '600',
  },
  tabContent: {
    flex: 1,
    padding: 16,
    paddingBottom: 40,
  },

  // Footer
  panelFooter: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    alignItems: 'center',
  },

  // Session Limits
  sessionLimits: {
    flex: 1,
    paddingBottom: 100
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

  // Session Expiry
  sessionExpiryBanner: {
    backgroundColor: '#F3F4F6',
    padding: 12,
    marginBottom: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D1D5DB',
  },
  sessionExpiryExpired: {
    backgroundColor: '#FEE2E2',
    borderColor: '#FCA5A5',
  },
});
