import React from 'react';
import { render, screen, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import DeviceDetector, { 
  useDeviceDetector, 
  getInteractionType, 
  getOptimalInteractionPattern, 
  getResponsiveBreakpoint,
  DeviceInfo 
} from './DeviceDetector';

// Mock window properties
const mockWindow = {
  innerWidth: 1024,
  innerHeight: 768,
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  matchMedia: jest.fn(),
  ontouchstart: null,
  navigator: {
    maxTouchPoints: 0
  }
};

Object.defineProperty(window, 'innerWidth', {
  writable: true,
  configurable: true,
  value: mockWindow.innerWidth
});

Object.defineProperty(window, 'innerHeight', {
  writable: true,
  configurable: true,
  value: mockWindow.innerHeight
});

Object.defineProperty(window, 'addEventListener', {
  writable: true,
  configurable: true,
  value: mockWindow.addEventListener
});

Object.defineProperty(window, 'removeEventListener', {
  writable: true,
  configurable: true,
  value: mockWindow.removeEventListener
});

Object.defineProperty(window, 'matchMedia', {
  writable: true,
  configurable: true,
  value: mockWindow.matchMedia
});

Object.defineProperty(window, 'ontouchstart', {
  writable: true,
  configurable: true,
  value: mockWindow.ontouchstart
});

Object.defineProperty(window, 'navigator', {
  writable: true,
  configurable: true,
  value: mockWindow.navigator
});

// Test component to use the hook
const TestComponent: React.FC = () => {
  const deviceInfo = useDeviceDetector();
  return (
    <div>
      <span data-testid="is-mobile">{deviceInfo.isMobile.toString()}</span>
      <span data-testid="is-tablet">{deviceInfo.isTablet.toString()}</span>
      <span data-testid="is-desktop">{deviceInfo.isDesktop.toString()}</span>
      <span data-testid="is-touch-device">{deviceInfo.isTouchDevice.toString()}</span>
      <span data-testid="screen-width">{deviceInfo.screenWidth}</span>
      <span data-testid="screen-height">{deviceInfo.screenHeight}</span>
      <span data-testid="orientation">{deviceInfo.orientation}</span>
      <span data-testid="supports-touch">{deviceInfo.supportsTouch.toString()}</span>
      <span data-testid="supports-hover">{deviceInfo.supportsHover.toString()}</span>
    </div>
  );
};

describe('DeviceDetector', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset window properties to default desktop values
    Object.defineProperty(window, 'innerWidth', { value: 1024 });
    Object.defineProperty(window, 'innerHeight', { value: 768 });
    Object.defineProperty(window, 'ontouchstart', { value: null });
    Object.defineProperty(window.navigator, 'maxTouchPoints', { value: 0 });
    window.matchMedia = jest.fn().mockReturnValue({ matches: true });
  });

  describe('DeviceDetector Component', () => {
    it('renders children with device info', () => {
      const mockChildren = jest.fn().mockReturnValue(<div>Test Content</div>);
      
      render(
        <DeviceDetector>
          {mockChildren}
        </DeviceDetector>
      );

      expect(mockChildren).toHaveBeenCalledWith(expect.objectContaining({
        isMobile: false,
        isTablet: false,
        isDesktop: true,
        screenWidth: 1024,
        screenHeight: 768
      }));
      expect(screen.getByText('Test Content')).toBeInTheDocument();
    });

    it('applies custom className', () => {
      const { container } = render(
        <DeviceDetector className="custom-class">
          {() => <div>Test</div>}
        </DeviceDetector>
      );

      expect(container.firstChild).toHaveClass('custom-class');
    });

    it('sets up event listeners on mount', () => {
      render(
        <DeviceDetector>
          {() => <div>Test</div>}
        </DeviceDetector>
      );

      expect(window.addEventListener).toHaveBeenCalledWith('resize', expect.any(Function));
      expect(window.addEventListener).toHaveBeenCalledWith('orientationchange', expect.any(Function));
    });

    it('removes event listeners on unmount', () => {
      const { unmount } = render(
        <DeviceDetector>
          {() => <div>Test</div>}
        </DeviceDetector>
      );

      unmount();

      expect(window.removeEventListener).toHaveBeenCalledWith('resize', expect.any(Function));
      expect(window.removeEventListener).toHaveBeenCalledWith('orientationchange', expect.any(Function));
    });
  });

  describe('useDeviceDetector Hook', () => {
    it('returns device info for desktop', () => {
      render(<TestComponent />);

      expect(screen.getByTestId('is-mobile')).toHaveTextContent('false');
      expect(screen.getByTestId('is-tablet')).toHaveTextContent('false');
      expect(screen.getByTestId('is-desktop')).toHaveTextContent('true');
      expect(screen.getByTestId('screen-width')).toHaveTextContent('1024');
      expect(screen.getByTestId('screen-height')).toHaveTextContent('768');
      expect(screen.getByTestId('orientation')).toHaveTextContent('landscape');
    });

    it('detects mobile device', () => {
      Object.defineProperty(window, 'innerWidth', { value: 375 });
      Object.defineProperty(window, 'innerHeight', { value: 667 });
      Object.defineProperty(window, 'ontouchstart', { value: {} });
      Object.defineProperty(window.navigator, 'maxTouchPoints', { value: 5 });

      render(<TestComponent />);

      expect(screen.getByTestId('is-mobile')).toHaveTextContent('true');
      expect(screen.getByTestId('is-tablet')).toHaveTextContent('false');
      expect(screen.getByTestId('is-desktop')).toHaveTextContent('false');
      expect(screen.getByTestId('is-touch-device')).toHaveTextContent('true');
      expect(screen.getByTestId('supports-touch')).toHaveTextContent('true');
    });

    it('detects tablet device', () => {
      Object.defineProperty(window, 'innerWidth', { value: 768 });
      Object.defineProperty(window, 'innerHeight', { value: 1024 });
      Object.defineProperty(window, 'ontouchstart', { value: {} });

      render(<TestComponent />);

      expect(screen.getByTestId('is-mobile')).toHaveTextContent('false');
      expect(screen.getByTestId('is-tablet')).toHaveTextContent('true');
      expect(screen.getByTestId('is-desktop')).toHaveTextContent('false');
    });

    it('detects portrait orientation', () => {
      Object.defineProperty(window, 'innerWidth', { value: 375 });
      Object.defineProperty(window, 'innerHeight', { value: 667 });

      render(<TestComponent />);

      expect(screen.getByTestId('orientation')).toHaveTextContent('portrait');
    });

    it('detects touch support', () => {
      Object.defineProperty(window, 'ontouchstart', { value: {} });
      Object.defineProperty(window.navigator, 'maxTouchPoints', { value: 5 });

      render(<TestComponent />);

      expect(screen.getByTestId('supports-touch')).toHaveTextContent('true');
    });

    it('detects hover support', () => {
      window.matchMedia = jest.fn().mockReturnValue({ matches: true });

      render(<TestComponent />);

      expect(screen.getByTestId('supports-hover')).toHaveTextContent('true');
    });
  });

  describe('Utility Functions', () => {
    describe('getInteractionType', () => {
      it('returns touch for touch-only devices', () => {
        const deviceInfo: DeviceInfo = {
          isMobile: true,
          isTablet: false,
          isDesktop: false,
          isTouchDevice: true,
          screenWidth: 375,
          screenHeight: 667,
          orientation: 'portrait',
          supportsTouch: true,
          supportsHover: false
        };

        expect(getInteractionType(deviceInfo)).toBe('touch');
      });

      it('returns mouse for desktop devices', () => {
        const deviceInfo: DeviceInfo = {
          isMobile: false,
          isTablet: false,
          isDesktop: true,
          isTouchDevice: false,
          screenWidth: 1920,
          screenHeight: 1080,
          orientation: 'landscape',
          supportsTouch: false,
          supportsHover: true
        };

        expect(getInteractionType(deviceInfo)).toBe('mouse');
      });

      it('returns hybrid for touch-enabled laptops', () => {
        const deviceInfo: DeviceInfo = {
          isMobile: false,
          isTablet: false,
          isDesktop: true,
          isTouchDevice: true,
          screenWidth: 1920,
          screenHeight: 1080,
          orientation: 'landscape',
          supportsTouch: true,
          supportsHover: true
        };

        expect(getInteractionType(deviceInfo)).toBe('hybrid');
      });
    });

    describe('getOptimalInteractionPattern', () => {
      it('returns touch patterns for touch devices', () => {
        const deviceInfo: DeviceInfo = {
          isMobile: true,
          isTablet: false,
          isDesktop: false,
          isTouchDevice: true,
          screenWidth: 375,
          screenHeight: 667,
          orientation: 'portrait',
          supportsTouch: true,
          supportsHover: false
        };

        const pattern = getOptimalInteractionPattern(deviceInfo);
        expect(pattern.primaryInteraction).toBe('tap');
        expect(pattern.secondaryInteraction).toBe('longPress');
        expect(pattern.dragPattern).toBe('touchDrag');
      });

      it('returns mouse patterns for desktop devices', () => {
        const deviceInfo: DeviceInfo = {
          isMobile: false,
          isTablet: false,
          isDesktop: true,
          isTouchDevice: false,
          screenWidth: 1920,
          screenHeight: 1080,
          orientation: 'landscape',
          supportsTouch: false,
          supportsHover: true
        };

        const pattern = getOptimalInteractionPattern(deviceInfo);
        expect(pattern.primaryInteraction).toBe('click');
        expect(pattern.secondaryInteraction).toBe('rightClick');
        expect(pattern.dragPattern).toBe('mouseDrag');
      });

      it('returns hybrid patterns for touch-enabled laptops', () => {
        const deviceInfo: DeviceInfo = {
          isMobile: false,
          isTablet: false,
          isDesktop: true,
          isTouchDevice: true,
          screenWidth: 1920,
          screenHeight: 1080,
          orientation: 'landscape',
          supportsTouch: true,
          supportsHover: true
        };

        const pattern = getOptimalInteractionPattern(deviceInfo);
        expect(pattern.primaryInteraction).toBe('click');
        expect(pattern.secondaryInteraction).toBe('rightClick');
        expect(pattern.dragPattern).toBe('hybridDrag');
      });
    });

    describe('getResponsiveBreakpoint', () => {
      it('returns correct breakpoints for different screen widths', () => {
        expect(getResponsiveBreakpoint({ ...mockWindow, screenWidth: 320 } as DeviceInfo)).toBe('xs');
        expect(getResponsiveBreakpoint({ ...mockWindow, screenWidth: 640 } as DeviceInfo)).toBe('sm');
        expect(getResponsiveBreakpoint({ ...mockWindow, screenWidth: 768 } as DeviceInfo)).toBe('md');
        expect(getResponsiveBreakpoint({ ...mockWindow, screenWidth: 1024 } as DeviceInfo)).toBe('lg');
        expect(getResponsiveBreakpoint({ ...mockWindow, screenWidth: 1280 } as DeviceInfo)).toBe('xl');
        expect(getResponsiveBreakpoint({ ...mockWindow, screenWidth: 1536 } as DeviceInfo)).toBe('2xl');
      });
    });
  });

  describe('Event Handling', () => {
    it('updates device info on resize', () => {
      const mockChildren = jest.fn().mockReturnValue(<div>Test</div>);
      
      render(
        <DeviceDetector>
          {mockChildren}
        </DeviceDetector>
      );

      // Simulate resize event
      const resizeHandler = window.addEventListener.mock.calls.find(
        call => call[0] === 'resize'
      )[1];

      act(() => {
        Object.defineProperty(window, 'innerWidth', { value: 375 });
        Object.defineProperty(window, 'innerHeight', { value: 667 });
        resizeHandler();
      });

      expect(mockChildren).toHaveBeenCalledWith(expect.objectContaining({
        isMobile: true,
        isTablet: false,
        isDesktop: false
      }));
    });

    it('updates device info on orientation change', () => {
      const mockChildren = jest.fn().mockReturnValue(<div>Test</div>);
      
      render(
        <DeviceDetector>
          {mockChildren}
        </DeviceDetector>
      );

      // Simulate orientation change event
      const orientationHandler = window.addEventListener.mock.calls.find(
        call => call[0] === 'orientationchange'
      )[1];

      act(() => {
        Object.defineProperty(window, 'innerWidth', { value: 667 });
        Object.defineProperty(window, 'innerHeight', { value: 375 });
        orientationHandler();
      });

      expect(mockChildren).toHaveBeenCalledWith(expect.objectContaining({
        orientation: 'portrait'
      }));
    });
  });
});
