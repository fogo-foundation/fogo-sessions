import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  // Copy Button
  copyButton: {
    padding: 8,
    borderRadius: 6,
    backgroundColor: '#F3F4F6',
  },
  copyButtonCopied: {
    backgroundColor: '#D1FAE5',
  },
  copyButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  copyIcon: {
    marginLeft: 8,
    fontSize: 16,
  },

  // Logout Button
  logoutButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#DC2626',
  },
  logoutButtonText: {
    color: '#DC2626',
    fontSize: 16,
    fontWeight: '500',
  },
});
