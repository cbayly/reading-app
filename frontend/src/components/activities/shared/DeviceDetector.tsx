import { useState, useEffect } from 'react';

export interface DeviceInfo {
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  isTouchDevice: boolean;
  screenWidth: number;
  screenHeight: number;
  orientation: 'portrait' | 'landscape';
  supportsTouch: boolean;
  supportsHover: boolean;
}

export interface DeviceDetectorProps {
  children: (deviceInfo: DeviceInfo) => React.ReactNode;
  className?: string;
}

const DeviceDetector: React.FC<DeviceDetectorProps> = ({ children, className = '' }) => {
  const [deviceInfo, setDeviceInfo] = useState<DeviceInfo>({
    isMobile: false,
    isTablet: false,
    isDesktop: false,
    isTouchDevice: false,
    screenWidth: 0,
    screenHeight: 0,
    orientation: 'portrait',
    supportsTouch: false,
    supportsHover: false
  });

  useEffect(() => {
    const updateDeviceInfo = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      
      // Determine device type based on screen width
      const isMobile = width < 768;
      const isTablet = width >= 768 && width < 1024;
      const isDesktop = width >= 1024;
      
      // Check for touch support
      const supportsTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
      
      // Check for hover support (desktop devices typically support hover)
      const supportsHover = window.matchMedia('(hover: hover)').matches;
      
      // Determine orientation
      const orientation = width > height ? 'landscape' : 'portrait';
      
      // Determine if it's a touch device (mobile/tablet or touch-enabled desktop)
      const isTouchDevice = isMobile || isTablet || (isDesktop && supportsTouch);

      setDeviceInfo({
        isMobile,
        isTablet,
        isDesktop,
        isTouchDevice,
        screenWidth: width,
        screenHeight: height,
        orientation,
        supportsTouch,
        supportsHover
      });
    };

    // Initial detection
    updateDeviceInfo();

    // Update on resize and orientation change
    window.addEventListener('resize', updateDeviceInfo);
    window.addEventListener('orientationchange', updateDeviceInfo);

    // Cleanup
    return () => {
      window.removeEventListener('resize', updateDeviceInfo);
      window.removeEventListener('orientationchange', updateDeviceInfo);
    };
  }, []);

  return (
    <div className={className}>
      {children(deviceInfo)}
    </div>
  );
};

// Hook version for use in components
export const useDeviceDetector = (): DeviceInfo => {
  const [deviceInfo, setDeviceInfo] = useState<DeviceInfo>({
    isMobile: false,
    isTablet: false,
    isDesktop: false,
    isTouchDevice: false,
    screenWidth: 0,
    screenHeight: 0,
    orientation: 'portrait',
    supportsTouch: false,
    supportsHover: false
  });

  useEffect(() => {
    const updateDeviceInfo = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      
      const isMobile = width < 768;
      const isTablet = width >= 768 && width < 1024;
      const isDesktop = width >= 1024;
      
      const supportsTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
      const supportsHover = window.matchMedia('(hover: hover)').matches;
      const orientation = width > height ? 'landscape' : 'portrait';
      const isTouchDevice = isMobile || isTablet || (isDesktop && supportsTouch);

      setDeviceInfo({
        isMobile,
        isTablet,
        isDesktop,
        isTouchDevice,
        screenWidth: width,
        screenHeight: height,
        orientation,
        supportsTouch,
        supportsHover
      });
    };

    updateDeviceInfo();

    window.addEventListener('resize', updateDeviceInfo);
    window.addEventListener('orientationchange', updateDeviceInfo);

    return () => {
      window.removeEventListener('resize', updateDeviceInfo);
      window.removeEventListener('orientationchange', updateDeviceInfo);
    };
  }, []);

  return deviceInfo;
};

// Utility functions for common device checks
export const getInteractionType = (deviceInfo: DeviceInfo): 'touch' | 'mouse' | 'hybrid' => {
  if (deviceInfo.isTouchDevice && !deviceInfo.supportsHover) {
    return 'touch';
  } else if (!deviceInfo.isTouchDevice && deviceInfo.supportsHover) {
    return 'mouse';
  } else {
    return 'hybrid'; // Touch device that also supports hover (like touch laptops)
  }
};

export const getOptimalInteractionPattern = (deviceInfo: DeviceInfo): {
  primaryInteraction: 'tap' | 'click' | 'hover';
  secondaryInteraction: 'longPress' | 'rightClick' | 'doubleClick';
  dragPattern: 'touchDrag' | 'mouseDrag' | 'hybridDrag';
} => {
  const interactionType = getInteractionType(deviceInfo);
  
  switch (interactionType) {
    case 'touch':
      return {
        primaryInteraction: 'tap',
        secondaryInteraction: 'longPress',
        dragPattern: 'touchDrag'
      };
    case 'mouse':
      return {
        primaryInteraction: 'click',
        secondaryInteraction: 'rightClick',
        dragPattern: 'mouseDrag'
      };
    case 'hybrid':
      return {
        primaryInteraction: 'click',
        secondaryInteraction: 'rightClick',
        dragPattern: 'hybridDrag'
      };
  }
};

export const getResponsiveBreakpoint = (deviceInfo: DeviceInfo): 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' => {
  if (deviceInfo.screenWidth < 640) return 'xs';
  if (deviceInfo.screenWidth < 768) return 'sm';
  if (deviceInfo.screenWidth < 1024) return 'md';
  if (deviceInfo.screenWidth < 1280) return 'lg';
  if (deviceInfo.screenWidth < 1536) return 'xl';
  return '2xl';
};

export default DeviceDetector;
