'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';

interface ResizableSplitProps {
  left: React.ReactNode;
  right: React.ReactNode;
  value: number; // 0-1 representing the left panel width as a fraction
  onChange: (value: number) => void;
  minLeftWidth?: number; // Minimum width in pixels for left panel
  minRightWidth?: number; // Minimum width in pixels for right panel
  className?: string;
  disabled?: boolean;
}

const ResizableSplit: React.FC<ResizableSplitProps> = ({
  left,
  right,
  value,
  onChange,
  minLeftWidth = 300,
  minRightWidth = 300,
  className = '',
  disabled = false
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [startValue, setStartValue] = useState(0);

  // Calculate the actual width values
  const leftWidth = Math.max(0, Math.min(1, value));
  const rightWidth = 1 - leftWidth;

  // Handle mouse down on divider
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (disabled) return;
    
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
    setStartX(e.clientX);
    setStartValue(value);
    
    // Add global mouse event listeners
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    
    // Add cursor style to body
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    document.body.style.pointerEvents = 'none';
  }, [disabled, value]);

  // Handle mouse move
  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging || !containerRef.current) return;

    const containerRect = containerRef.current.getBoundingClientRect();
    const containerWidth = containerRect.width;
    const deltaX = e.clientX - startX;
    
    // Calculate new value based on mouse movement
    const deltaValue = deltaX / containerWidth;
    let newValue = startValue + deltaValue;
    
    // Apply minimum width constraints
    const minLeftFraction = minLeftWidth / containerWidth;
    const minRightFraction = minRightWidth / containerWidth;
    
    newValue = Math.max(minLeftFraction, Math.min(1 - minRightFraction, newValue));
    
    onChange(newValue);
  }, [isDragging, startX, startValue, onChange, minLeftWidth, minRightWidth]);

  // Handle mouse up
  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    
    // Remove global event listeners
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
    
    // Reset cursor and user select
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
    document.body.style.pointerEvents = '';
  }, [handleMouseMove]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      document.body.style.pointerEvents = '';
    };
  }, [handleMouseMove, handleMouseUp]);

  // Handle keyboard navigation
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (disabled) return;

    const step = 0.05; // 5% step size
    let newValue = value;

    switch (e.key) {
      case 'ArrowLeft':
        e.preventDefault();
        newValue = Math.max(0, value - step);
        break;
      case 'ArrowRight':
        e.preventDefault();
        newValue = Math.min(1, value + step);
        break;
      case 'Home':
        e.preventDefault();
        newValue = 0;
        break;
      case 'End':
        e.preventDefault();
        newValue = 1;
        break;
      default:
        return;
    }

    // Apply minimum width constraints
    if (containerRef.current) {
      const containerWidth = containerRef.current.offsetWidth;
      const minLeftFraction = minLeftWidth / containerWidth;
      const minRightFraction = minRightWidth / containerWidth;
      newValue = Math.max(minLeftFraction, Math.min(1 - minRightFraction, newValue));
    }

    onChange(newValue);
  }, [disabled, value, onChange, minLeftWidth, minRightWidth]);

  return (
    <div
      ref={containerRef}
      className={`flex h-full ${className}`}
      style={{ 
        cursor: isDragging ? 'col-resize' : 'default'
      }}
    >
      {/* Left Panel */}
      <div 
        className="overflow-auto border-r border-gray-200"
        style={{ 
          width: `${leftWidth * 100}%`,
          minWidth: `${minLeftWidth}px`,
          maxWidth: `calc(100% - ${minRightWidth}px)`
        }}
      >
        {left}
      </div>

      {/* Resizable Divider */}
      <div
        className={`
          relative flex-shrink-0 z-10
          ${disabled ? 'cursor-default opacity-0' : 'cursor-col-resize opacity-0'}
          ${isDragging ? 'bg-blue-400' : 'bg-gray-300 hover:bg-gray-400'}
        `}
        style={{ 
          width: '0px',
          minWidth: '0px',
          maxWidth: '0px'
        }}
        onMouseDown={handleMouseDown}
        onKeyDown={handleKeyDown}
        tabIndex={disabled ? -1 : 0}
        role="separator"
        aria-label="Resize panels"
        aria-valuenow={Math.round(value * 100)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-orientation="vertical"
      >
        {/* Divider handle - hidden */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-0">
          <div className="w-1 h-20 bg-gray-600 rounded-full shadow-sm"></div>
        </div>
        
        {/* Hover indicator - hidden */}
        <div className="absolute inset-0 bg-gray-200 opacity-0 hover:opacity-0 transition-opacity duration-200 pointer-events-none" />
        
        {/* Focus indicator - hidden */}
        <div className="absolute inset-0 ring-2 ring-blue-500 ring-opacity-0 focus-within:ring-opacity-0 transition-opacity duration-200 pointer-events-none" />
        
        {/* Drag indicator - hidden */}
        {isDragging && (
          <div className="absolute inset-0 bg-blue-200 opacity-0 pointer-events-none" />
        )}
        
        {/* Debug info - hidden */}
        <div className="absolute top-1 left-1 text-xs text-gray-500 pointer-events-none opacity-0">
          {Math.round(value * 100)}%
        </div>
      </div>

      {/* Right Panel */}
      <div 
        className="overflow-auto"
        style={{ 
          width: `${rightWidth * 100}%`,
          minWidth: `${minRightWidth}px`,
          maxWidth: `calc(100% - ${minLeftWidth}px)`
        }}
      >
        {right}
      </div>

      {/* Overlay to prevent text selection while dragging */}
      {isDragging && (
        <div className="fixed inset-0 z-50" style={{ pointerEvents: 'none' }} />
      )}
    </div>
  );
};

export default ResizableSplit;
