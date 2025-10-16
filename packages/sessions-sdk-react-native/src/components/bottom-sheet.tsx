import { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Animated,
  Dimensions,
  PanResponder,
  TouchableWithoutFeedback,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { ReactNode } from 'react';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

type Props = {
  children: ReactNode | ((args: { close: () => void }) => ReactNode);
  heading: ReactNode;
  message?: ReactNode | undefined;
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  isDismissable?: boolean;
  snapPoints?: string[];
};

/**
 * Custom bottom sheet component for modal presentations.
 *
 * @category UI Components
 * @public
 */
export const CustomBottomSheet = ({
  children,
  heading,
  message,
  isOpen,
  onOpenChange,
  isDismissable = true,
  snapPoints = ['50%', '80%'],
}: Props) => {
  const [modalVisible, setModalVisible] = useState(false);
  const translateY = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const insets = useSafeAreaInsets();

  // Calculate height from snap points
  const getHeightFromSnapPoint = (snapPoint: string) => {
    if (snapPoint.endsWith('%')) {
      const percentage = parseInt(snapPoint.replace('%', ''), 10);
      return (SCREEN_HEIGHT * percentage) / 100;
    }
    return parseInt(snapPoint, 10);
  };

  const minHeight = getHeightFromSnapPoint(snapPoints[0] || '50%');
  const maxHeight = getHeightFromSnapPoint(
    snapPoints[snapPoints.length - 1] || '80%'
  );

  const [currentHeight, setCurrentHeight] = useState(minHeight);

  const handleClose = useCallback(() => {
    if (isDismissable) {
      onOpenChange(false);
    }
  }, [isDismissable, onOpenChange]);

  const animateIn = useCallback(() => {
    setModalVisible(true);
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: SCREEN_HEIGHT - currentHeight,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(backdropOpacity, {
        toValue: 0.5,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();
  }, [translateY, backdropOpacity, currentHeight]);

  const animateOut = useCallback(() => {
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: SCREEN_HEIGHT,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(backdropOpacity, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setModalVisible(false);
    });
  }, [translateY, backdropOpacity]);

  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: (_, gestureState) => {
      return Math.abs(gestureState.dy) > 5;
    },
    onPanResponderMove: (_, gestureState) => {
      const newTranslateY = SCREEN_HEIGHT - currentHeight + gestureState.dy;
      if (
        newTranslateY >= SCREEN_HEIGHT - maxHeight &&
        newTranslateY <= SCREEN_HEIGHT
      ) {
        translateY.setValue(newTranslateY);
      }
    },
    onPanResponderRelease: (_, gestureState) => {
      const { dy, vy } = gestureState;

      // If dragged down significantly or with high velocity, close
      if (dy > 100 || vy > 0.5) {
        if (isDismissable) {
          handleClose();
        } else {
          // Snap back to current position
          Animated.timing(translateY, {
            toValue: SCREEN_HEIGHT - currentHeight,
            duration: 200,
            useNativeDriver: true,
          }).start();
        }
      } else if (dy < -100 || vy < -0.5) {
        // If dragged up significantly, expand to max height
        const newHeight = maxHeight;
        setCurrentHeight(newHeight);
        Animated.timing(translateY, {
          toValue: SCREEN_HEIGHT - newHeight,
          duration: 200,
          useNativeDriver: true,
        }).start();
      } else {
        // Snap back to current position
        Animated.timing(translateY, {
          toValue: SCREEN_HEIGHT - currentHeight,
          duration: 200,
          useNativeDriver: true,
        }).start();
      }
    },
  });

  const renderChildren = () => {
    if (typeof children === 'function') {
      return children({ close: handleClose });
    }
    return children;
  };

  useEffect(() => {
    if (isOpen) {
      animateIn();
    } else {
      animateOut();
    }
  }, [isOpen, animateIn, animateOut]);

  return (
    <Modal
      visible={modalVisible}
      transparent
      animationType="none"
      onRequestClose={handleClose}
    >
      <View style={styles.overlay}>
        {/* Backdrop */}
        <TouchableWithoutFeedback
          onPress={isDismissable ? handleClose : undefined}
        >
          <Animated.View
            style={[
              styles.backdrop,
              {
                opacity: backdropOpacity,
              },
            ]}
          />
        </TouchableWithoutFeedback>

        {/* Bottom Sheet */}
        <Animated.View
          style={[
            styles.bottomSheet,
            {
              height: maxHeight,
              transform: [{ translateY }],
            },
          ]}
        >
          {/* Handle */}
          <View style={styles.handleContainer} {...panResponder.panHandlers}>
            <View style={styles.handle} />
          </View>

          <View
            style={[
              styles.contentContainer,
              { paddingBottom: Math.max(20, insets.bottom) },
            ]}
          >
            {/* Header */}
            <View style={styles.header}>
              <Text style={styles.heading}>
                {typeof heading === 'string' ? heading : heading}
              </Text>
              {isDismissable && (
                <TouchableOpacity
                  onPress={handleClose}
                  style={styles.closeButton}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Text style={styles.closeButtonText}>✕</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Message */}
            {message && (
              <View style={styles.messageContainer}>
                <Text style={styles.message}>
                  {typeof message === 'string' ? message : message}
                </Text>
              </View>
            )}

            {/* Content */}
            <View style={styles.content}>{renderChildren()}</View>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'black',
  },
  bottomSheet: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: -2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  handleContainer: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: '#D1D5DB',
    borderRadius: 2,
  },
  contentContainer: {
    flex: 1,
    paddingHorizontal: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    marginBottom: 16,
  },
  heading: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1F2937',
    flex: 1,
  },
  closeButton: {
    padding: 8,
    marginLeft: 12,
  },
  closeButtonText: {
    fontSize: 18,
    color: '#6B7280',
    fontWeight: 'bold',
  },
  messageContainer: {
    marginBottom: 20,
  },
  message: {
    fontSize: 16,
    color: '#6B7280',
    lineHeight: 24,
  },
  content: {
    flex: 1,
  },
});
