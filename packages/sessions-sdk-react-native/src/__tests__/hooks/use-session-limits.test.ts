import { renderHook, act } from '@testing-library/react-native';
import { useSessionLimits } from '../../hooks/use-session-limits';

describe('useSessionLimits', () => {
  describe('initial state', () => {
    it('should initialize with applyLimits=true when enableUnlimited is false', () => {
      const { result } = renderHook(() => 
        useSessionLimits(false, false)
      );

      expect(result.current.applyLimits).toBe(true);
      expect(result.current.shouldShowLimitToggle).toBe(false);
    });

    it('should initialize with applyLimits=false when enableUnlimited is true and isSessionUnlimited is undefined', () => {
      const { result } = renderHook(() => 
        useSessionLimits(true, undefined) // undefined isSessionUnlimited falls back to enableUnlimited
      );

      expect(result.current.applyLimits).toBe(false); // !(undefined ?? true) = !true = false
      expect(result.current.shouldShowLimitToggle).toBe(true);
    });

    it('should prioritize isSessionUnlimited over enableUnlimited', () => {
      const { result } = renderHook(() => 
        useSessionLimits(true, false) // enableUnlimited=true, isSessionUnlimited=false
      );

      expect(result.current.applyLimits).toBe(true); // Should be true because session is not unlimited
    });

    it('should initialize with applyLimits=false when session is unlimited', () => {
      const { result } = renderHook(() => 
        useSessionLimits(false, true) // enableUnlimited=false, isSessionUnlimited=true
      );

      expect(result.current.applyLimits).toBe(false); // Should be false because session is unlimited
    });

    it('should handle undefined values gracefully', () => {
      const { result } = renderHook(() => 
        useSessionLimits(undefined, undefined)
      );

      expect(result.current.applyLimits).toBe(true); // Default to applying limits
      expect(result.current.shouldShowLimitToggle).toBe(false);
    });

    it('should handle mixed undefined values', () => {
      const { result } = renderHook(() => 
        useSessionLimits(true, undefined)
      );

      expect(result.current.applyLimits).toBe(false); // enableUnlimited=true, isSessionUnlimited=undefined
      expect(result.current.shouldShowLimitToggle).toBe(true);
    });
  });

  describe('toggleApplyLimits function', () => {
    it('should toggle applyLimits to true', () => {
      const { result } = renderHook(() => 
        useSessionLimits(true, undefined) // This gives applyLimits = false initially
      );

      expect(result.current.applyLimits).toBe(false);

      act(() => {
        result.current.toggleApplyLimits(true);
      });

      expect(result.current.applyLimits).toBe(true);
    });

    it('should toggle applyLimits to false', () => {
      const { result } = renderHook(() => 
        useSessionLimits(false, false)
      );

      expect(result.current.applyLimits).toBe(true);

      act(() => {
        result.current.toggleApplyLimits(false);
      });

      expect(result.current.applyLimits).toBe(false);
    });

    it('should maintain the same function reference across renders', () => {
      const { result, rerender } = renderHook(() => 
        useSessionLimits(true, false)
      );

      const firstToggleRef = result.current.toggleApplyLimits;

      rerender();

      const secondToggleRef = result.current.toggleApplyLimits;

      expect(firstToggleRef).toBe(secondToggleRef);
    });

    it('should allow multiple toggles', () => {
      const { result } = renderHook(() => 
        useSessionLimits(true, undefined) // This gives applyLimits = false initially
      );

      expect(result.current.applyLimits).toBe(false);

      act(() => {
        result.current.toggleApplyLimits(true);
      });
      expect(result.current.applyLimits).toBe(true);

      act(() => {
        result.current.toggleApplyLimits(false);
      });
      expect(result.current.applyLimits).toBe(false);

      act(() => {
        result.current.toggleApplyLimits(true);
      });
      expect(result.current.applyLimits).toBe(true);
    });
  });

  describe('shouldShowLimitToggle', () => {
    it('should return true when enableUnlimited is true', () => {
      const { result } = renderHook(() => 
        useSessionLimits(true, false)
      );

      expect(result.current.shouldShowLimitToggle).toBe(true);
    });

    it('should return false when enableUnlimited is false', () => {
      const { result } = renderHook(() => 
        useSessionLimits(false, false)
      );

      expect(result.current.shouldShowLimitToggle).toBe(false);
    });

    it('should return false when enableUnlimited is undefined', () => {
      const { result } = renderHook(() => 
        useSessionLimits(undefined, false)
      );

      expect(result.current.shouldShowLimitToggle).toBe(false);
    });

    it('should not be affected by isSessionUnlimited', () => {
      const { result: result1 } = renderHook(() => 
        useSessionLimits(true, true)
      );

      const { result: result2 } = renderHook(() => 
        useSessionLimits(true, false)
      );

      expect(result1.current.shouldShowLimitToggle).toBe(true);
      expect(result2.current.shouldShowLimitToggle).toBe(true);
    });
  });

  describe('parameter changes', () => {
    it('should update when enableUnlimited changes', () => {
      const { result, rerender } = renderHook(
        ({ enableUnlimited, isSessionUnlimited }) => 
          useSessionLimits(enableUnlimited, isSessionUnlimited),
        {
          initialProps: { enableUnlimited: false, isSessionUnlimited: false }
        }
      );

      expect(result.current.shouldShowLimitToggle).toBe(false);

      rerender({ enableUnlimited: true, isSessionUnlimited: false });

      expect(result.current.shouldShowLimitToggle).toBe(true);
    });

    it('should not reset applyLimits state when parameters change', () => {
      const { result, rerender } = renderHook(
        ({ enableUnlimited, isSessionUnlimited }) => 
          useSessionLimits(enableUnlimited, isSessionUnlimited),
        {
          initialProps: { enableUnlimited: true, isSessionUnlimited: false }
        }
      );

      // Change the state
      act(() => {
        result.current.toggleApplyLimits(true);
      });

      expect(result.current.applyLimits).toBe(true);

      // Change parameters
      rerender({ enableUnlimited: false, isSessionUnlimited: true });

      // State should be preserved
      expect(result.current.applyLimits).toBe(true);
    });
  });

  describe('edge cases', () => {
    it('should handle rapid state changes', () => {
      const { result } = renderHook(() => 
        useSessionLimits(true, false)
      );

      act(() => {
        result.current.toggleApplyLimits(true);
        result.current.toggleApplyLimits(false);
        result.current.toggleApplyLimits(true);
      });

      expect(result.current.applyLimits).toBe(true);
    });

    it('should handle setting the same value multiple times', () => {
      const { result } = renderHook(() => 
        useSessionLimits(false, false)
      );

      expect(result.current.applyLimits).toBe(true);

      act(() => {
        result.current.toggleApplyLimits(true);
        result.current.toggleApplyLimits(true);
        result.current.toggleApplyLimits(true);
      });

      expect(result.current.applyLimits).toBe(true);
    });
  });
});