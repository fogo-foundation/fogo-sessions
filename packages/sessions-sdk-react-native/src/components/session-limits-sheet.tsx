import React from 'react';
import { useSessionContext } from '../session-provider';
import { SessionLimits } from './session-limits';
import { CustomBottomSheet } from './bottom-sheet';
import { StateType } from '../session-provider';

/**
 * Props for the SessionLimitsSheet component.
 *
 * @public
 */
export interface SessionLimitsSheetProps {
  /** Custom heading for the sheet (default: "Session Limits") */
  heading?: string;

  /** Custom message for the sheet (default: "Limit how many tokens this app is allowed to interact with") */
  message?: string;

  /** Custom snap points for the bottom sheet (default: ['60%', '90%']) */
  snapPoints?: string[];
}

/**
 * SessionLimitsSheet component that provides a bottom sheet UI for managing session spending limits.
 *
 * This component automatically shows when the session is in RequestingLimits or SettingLimits state
 * and provides the standard session limits interface. Use this component when you want the default
 * session limits UI, or build your own custom UI using the session context data.
 *
 * @example
 * ```tsx
 * import { FogoSessionProvider, SessionLimitsSheet } from '@fogo/sessions-sdk-react-native';
 *
 * function App() {
 *   return (
 *     <FogoSessionProvider
 *       endpoint="YOUR_SOLANA_RPC_ENDPOINT"
 *       redirectUrl="yourapp://wallet"
 *       domain="yourapp.com"
 *       tokens={['TOKEN_MINT_ADDRESS']}
 *     >
 *       <YourApp />
 *       <SessionLimitsSheet />
 *     </FogoSessionProvider>
 *   );
 * }
 * ```
 *
 * @param props - Configuration options for the session limits sheet
 * @returns JSX element that renders the session limits bottom sheet
 *
 * @category UI Components
 * @public
 */
export const SessionLimitsSheet: React.FC<SessionLimitsSheetProps> = ({
  heading = 'Session Limits',
  message = 'Limit how many tokens this app is allowed to interact with',
  snapPoints = ['60%', '90%'],
}) => {
  const {
    sessionState,
    enableUnlimited,
    whitelistedTokens,
    isSessionLimitsOpen,
    onSessionLimitsOpenChange,
    requestedLimits,
  } = useSessionContext();

  // Only render if there are tokens configured
  if (!whitelistedTokens || whitelistedTokens.length === 0) {
    return null;
  }

  return (
    <CustomBottomSheet
      heading={heading}
      message={message}
      isOpen={isSessionLimitsOpen}
      snapPoints={snapPoints}
      onOpenChange={onSessionLimitsOpenChange}
    >
      <SessionLimits
        enableUnlimited={enableUnlimited}
        tokens={whitelistedTokens}
        onSubmit={
          sessionState.type === StateType.RequestingLimits
            ? sessionState.onSubmitLimits
            : undefined
        }
        initialLimits={requestedLimits ?? new Map()}
        error={
          sessionState.type === StateType.RequestingLimits
            ? sessionState.error
            : undefined
        }
        autoFocus
      />
    </CustomBottomSheet>
  );
};
