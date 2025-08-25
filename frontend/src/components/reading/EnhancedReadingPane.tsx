'use client';

import React, { useRef, useEffect, useCallback, useState } from 'react';
import '@/styles/reading-typography.css';

export interface Chapter {
  id: string;
  title: string;
  content: string;
  anchors?: Record<string, string>; // paragraph ID -> anchor mapping
}

export interface EnhancedReadingPaneProps {
  chapter: Chapter | null;
  fontSize: number;
  onJumpToAnchor?: (anchorId: string) => void;
  onScrollToAnchor?: (scrollFunction: (anchorId: string, options?: any) => boolean) => void;
  onAnchorsReady?: (anchors: string[]) => void;
  onCurrentParagraphChange?: (paragraphId: string | null) => void;
  onChapterNavigation?: (direction: 'prev' | 'next') => void;
  hasPreviousChapter?: boolean;
  hasNextChapter?: boolean;
  layoutMode?: 'reading' | 'split' | 'activity';
  className?: string;
  isLoading?: boolean;
}

const EnhancedReadingPane: React.FC<EnhancedReadingPaneProps> = ({
  chapter,
  fontSize,
  onJumpToAnchor,
  onScrollToAnchor,
  onAnchorsReady,
  onCurrentParagraphChange,
  onChapterNavigation,
  hasPreviousChapter = false,
  hasNextChapter = false,
  layoutMode = 'split',
  className = '',
  isLoading = false
}) => {
  const contentRef = useRef<HTMLDivElement>(null);
  const [highlightedAnchor, setHighlightedAnchor] = useState<string | null>(null);
  const [currentParagraph, setCurrentParagraph] = useState<string | null>(null);



  // Enhanced scrollToAnchor function with smooth scrolling and highlighting
  const scrollToAnchor = useCallback((anchorId: string, options: {
    highlight?: boolean;
    announce?: boolean;
    scrollBehavior?: ScrollBehavior;
    block?: ScrollLogicalPosition;
  } = {}) => {
    const {
      highlight = true,
      announce = true,
      scrollBehavior = 'smooth',
      block = 'center'
    } = options;

    if (!contentRef.current) {
      console.warn('Content container not available');
      return false;
    }

    // Try multiple selectors for better compatibility
    const element = contentRef.current.querySelector(`[data-anchor="${anchorId}"]`) ||
                   contentRef.current.querySelector(`#${anchorId}`) ||
                   contentRef.current.querySelector(`[id="${anchorId}"]`);

    if (!element) {
      console.warn(`Anchor element not found: ${anchorId}`);
      return false;
    }

    // Calculate scroll position with offset for better visibility
    const containerRect = contentRef.current.getBoundingClientRect();
    const elementRect = element.getBoundingClientRect();
    const offset = 20; // pixels from top of container

    // Calculate target scroll position
    const targetScrollTop = contentRef.current.scrollTop + elementRect.top - containerRect.top - offset;

    // Smooth scroll to calculated position
    contentRef.current.scrollTo({
      top: targetScrollTop,
      behavior: scrollBehavior
    });

    // Highlight the paragraph if requested
    if (highlight) {
      setHighlightedAnchor(anchorId);
      
      // Clear highlight after delay
      setTimeout(() => setHighlightedAnchor(null), 3000);
    }

    // Focus the element for screen readers
    if (element instanceof HTMLElement) {
      // Small delay to ensure scroll completes
      setTimeout(() => {
        element.focus();
        
        // Announce to screen readers if requested
        if (announce) {
          const paragraphNumber = anchorId.split('-').pop();
          const announcement = `Jumped to paragraph ${paragraphNumber}`;
          const liveRegion = document.querySelector('[aria-live="polite"]');
          if (liveRegion) {
            liveRegion.textContent = announcement;
          }
        }
      }, scrollBehavior === 'smooth' ? 500 : 100);
    }

    return true;
  }, []);

  // Legacy handleJumpToAnchor for backward compatibility
  const handleJumpToAnchor = useCallback((anchorId: string) => {
    return scrollToAnchor(anchorId);
  }, [scrollToAnchor]);

  // Process chapter content to add anchor IDs and enhance structure
  const processContent = useCallback((content: string): string => {
    // Split content into paragraphs and filter out empty ones
    const paragraphs = content.split(/\n\s*\n/).filter(p => p.trim().length > 0);
    
    return paragraphs.map((paragraph, index) => {
      const trimmedParagraph = paragraph.trim();
      if (!trimmedParagraph) return '';
      
      // Generate unique anchor ID with chapter context
      const anchorId = `chapter-${chapter?.id || '1'}-para-${index + 1}`;
      const isHighlighted = highlightedAnchor === anchorId;
      
      // Check if this paragraph is a heading (starts with # or is all caps)
      const isHeading = trimmedParagraph.startsWith('#') || 
                       (trimmedParagraph.length < 100 && trimmedParagraph === trimmedParagraph.toUpperCase() && trimmedParagraph.length > 3);
      
      // Determine heading level based on content
      let headingLevel = 2; // Default to h2 for chapter sections
      if (trimmedParagraph.startsWith('#')) {
        const hashCount = trimmedParagraph.match(/^#+/)?.[0]?.length || 1;
        headingLevel = Math.min(Math.max(hashCount, 1), 6); // Ensure valid heading level 1-6
        trimmedParagraph = trimmedParagraph.replace(/^#+\s*/, ''); // Remove # symbols
      } else if (isHeading) {
        headingLevel = 3; // Use h3 for section headings
      }
      
      // Enhanced paragraph with semantic HTML structure
      if (isHeading) {
        return `<h${headingLevel} 
          data-anchor="${anchorId}" 
          id="${anchorId}"
          class="mb-4 mt-8 leading-tight text-gray-900 ${isHighlighted ? 'bg-yellow-100 border-l-4 border-yellow-400 pl-6 shadow-sm' : 'border-l-4 border-transparent pl-6'} focus-ring group" 
          tabindex="-1" 
          role="heading"
          aria-level="${headingLevel}"
          aria-label="Heading: ${trimmedParagraph}"
          style="text-indent: 0; max-width: 65ch; margin-left: auto; margin-right: auto; font-weight: 600; ${headingLevel === 2 ? 'font-size: 1.5rem;' : headingLevel === 3 ? 'font-size: 1.25rem;' : 'font-size: 1.125rem;'}"
        >
          <span class="inline-block w-2 h-2 bg-blue-200 rounded-full mr-3 opacity-0 group-focus:opacity-100 transition-opacity duration-200" aria-hidden="true"></span>
          ${trimmedParagraph}
        </h${headingLevel}>`;
      } else {
        return `<p 
          data-anchor="${anchorId}" 
          id="${anchorId}"
          class="mb-6 leading-7 text-gray-800 cursor-pointer ${isHighlighted ? 'bg-yellow-100 border-l-4 border-yellow-400 pl-6 shadow-sm' : 'border-l-4 border-transparent pl-6'} focus-ring group text-lg" 
          tabindex="-1" 
          role="text"
          aria-label="Paragraph ${index + 1} of chapter content"
          onclick="this.focus()"
          onkeydown="if(event.key === 'Enter' || event.key === ' ') { event.preventDefault(); this.focus(); }"
          style="text-indent: 0; max-width: 65ch; margin-left: auto; margin-right: auto;"
        >
          ${trimmedParagraph}
        </p>`;
      }
    }).join('');
  }, [highlightedAnchor, chapter?.id]);

  // Handle external jump to anchor calls
  useEffect(() => {
    if (onJumpToAnchor) {
      // Expose the jump function to parent components
      onJumpToAnchor(handleJumpToAnchor);
    }
  }, [onJumpToAnchor, handleJumpToAnchor]);

  // Expose enhanced scrollToAnchor function to parent components
  useEffect(() => {
    if (onScrollToAnchor) {
      onScrollToAnchor(scrollToAnchor);
    }
  }, [onScrollToAnchor, scrollToAnchor]);

  // Notify parent of current paragraph changes
  useEffect(() => {
    if (onCurrentParagraphChange) {
      onCurrentParagraphChange(currentParagraph);
    }
  }, [onCurrentParagraphChange, currentParagraph]);

  // Get currently visible paragraph
  const getCurrentVisibleParagraph = useCallback(() => {
    if (!contentRef.current) return null;

    const container = contentRef.current;
    const containerRect = container.getBoundingClientRect();
    const containerCenter = containerRect.top + containerRect.height / 2;

    const paragraphs = container.querySelectorAll('[data-anchor]');
    let closestParagraph = null;
    let closestDistance = Infinity;

    paragraphs.forEach((paragraph) => {
      const rect = paragraph.getBoundingClientRect();
      const paragraphCenter = rect.top + rect.height / 2;
      const distance = Math.abs(paragraphCenter - containerCenter);

      if (distance < closestDistance) {
        closestDistance = distance;
        closestParagraph = paragraph;
      }
    });

    return closestParagraph?.getAttribute('data-anchor') || null;
  }, []);

  // Track scroll position and update current paragraph



  useEffect(() => {
    const handleScroll = () => {
      const visibleParagraph = getCurrentVisibleParagraph();
      if (visibleParagraph !== currentParagraph) {
        setCurrentParagraph(visibleParagraph);
      }
      

      

    };

    const container = contentRef.current;
    if (container) {
      container.addEventListener('scroll', handleScroll, { passive: true });
      
      // Don't set initial current paragraph to prevent first paragraph highlighting
      
      return () => container.removeEventListener('scroll', handleScroll);
    }
  }, [getCurrentVisibleParagraph, currentParagraph]);

  // Generate table of contents from headings
  const generateTableOfContents = useCallback((content: string) => {
    const paragraphs = content.split(/\n\s*\n/).filter(p => p.trim().length > 0);
    const toc: Array<{ id: string; text: string; level: number; index: number }> = [];
    
    paragraphs.forEach((paragraph, index) => {
      const trimmedParagraph = paragraph.trim();
      if (!trimmedParagraph) return;
      
      const isHeading = trimmedParagraph.startsWith('#') || 
                       (trimmedParagraph.length < 100 && trimmedParagraph === trimmedParagraph.toUpperCase() && trimmedParagraph.length > 3);
      
      if (isHeading) {
        let headingLevel = 2;
        let headingText = trimmedParagraph;
        
        if (trimmedParagraph.startsWith('#')) {
          const hashCount = trimmedParagraph.match(/^#+/)?.[0]?.length || 1;
          headingLevel = Math.min(Math.max(hashCount, 1), 6);
          headingText = trimmedParagraph.replace(/^#+\s*/, '');
        } else {
          headingLevel = 3;
        }
        
        toc.push({
          id: `chapter-${chapter?.id || '1'}-para-${index + 1}`,
          text: headingText,
          level: headingLevel,
          index: index + 1
        });
      }
    });
    
    return toc;
  }, [chapter?.id]);

  // Generate and notify available anchors when chapter changes
  useEffect(() => {
    if (chapter?.content && onAnchorsReady) {
      const paragraphs = chapter.content.split(/\n\s*\n/).filter(p => p.trim().length > 0);
      const anchors = paragraphs.map((_, index) => `chapter-${chapter.id || '1'}-para-${index + 1}`);
      onAnchorsReady(anchors);
    }
  }, [chapter?.content, chapter?.id, onAnchorsReady]);

  // Auto-scroll to top when chapter changes
  useEffect(() => {
    if (contentRef.current && chapter) {
      contentRef.current.scrollTop = 0;
    }
  }, [chapter?.id]);

  // Handle visibility based on layout mode
  const isVisible = layoutMode === 'reading' || layoutMode === 'split';
  const isFullWidth = layoutMode === 'reading';
  const [showTableOfContents, setShowTableOfContents] = useState(false);
  
  // Generate table of contents
  const tableOfContents = chapter?.content ? generateTableOfContents(chapter.content) : [];

  // Keyboard navigation handler
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (!isVisible) return;
    
    switch (event.key) {
      case 'Home':
        event.preventDefault();
        scrollToAnchor('chapter-1-para-1', { scrollBehavior: 'smooth' });
        break;
      case 'End':
        event.preventDefault();
        contentRef.current?.scrollTo({ top: contentRef.current.scrollHeight, behavior: 'smooth' });
        break;
      case 'PageUp':
        event.preventDefault();
        contentRef.current?.scrollBy({ top: -window.innerHeight * 0.8, behavior: 'smooth' });
        break;
      case 'PageDown':
        event.preventDefault();
        contentRef.current?.scrollBy({ top: window.innerHeight * 0.8, behavior: 'smooth' });
        break;
      case 't':
        if (event.ctrlKey || event.metaKey) {
          event.preventDefault();
          setShowTableOfContents(!showTableOfContents);
        }
        break;
    }
  }, [isVisible, scrollToAnchor, showTableOfContents]);

  // Add keyboard event listener
  useEffect(() => {
    if (isVisible) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [isVisible, handleKeyDown]);

  // Screen reader announcement system
  const announceToScreenReader = useCallback((message: string, priority: 'polite' | 'assertive' = 'polite') => {
    const announcement = document.createElement('div');
    announcement.setAttribute('aria-live', priority);
    announcement.setAttribute('aria-atomic', 'true');
    announcement.className = 'sr-only';
    announcement.textContent = message;
    
    document.body.appendChild(announcement);
    
    // Remove after announcement
    setTimeout(() => {
      document.body.removeChild(announcement);
    }, 1000);
  }, []);

  // Announce reading progress changes


  // Focus management for accessibility
  const focusFirstContent = useCallback(() => {
    const firstParagraph = document.querySelector('[data-anchor]') as HTMLElement;
    if (firstParagraph) {
      firstParagraph.focus();
      announceToScreenReader('Focus moved to chapter content');
    }
  }, [announceToScreenReader]);

  // Removed auto-focus to prevent first paragraph highlighting

  if (isLoading) {
    return (
      <div 
        className={`p-4 md:p-6 bg-white h-full overflow-auto reading-content ${className}`}
        style={{ fontSize: `${fontSize}rem` }}
        role="main"
        aria-label="Reading content"
      >
        <div className="max-w-4xl mx-auto">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-3/4 mb-6"></div>
            <div className="space-y-4">
              <div className="h-4 bg-gray-200 rounded w-full"></div>
              <div className="h-4 bg-gray-200 rounded w-5/6"></div>
              <div className="h-4 bg-gray-200 rounded w-full"></div>
              <div className="h-4 bg-gray-200 rounded w-4/5"></div>
              <div className="h-4 bg-gray-200 rounded w-full"></div>
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              <div className="h-4 bg-gray-200 rounded w-full"></div>
              <div className="h-4 bg-gray-200 rounded w-5/6"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!chapter) {
    return (
      <div 
        className={`p-4 md:p-6 bg-white h-full overflow-auto reading-content ${className}`}
        style={{ fontSize: `${fontSize}rem` }}
        role="main"
        aria-label="Reading content"
      >
        <div className="max-w-4xl mx-auto">
          <div className="text-center py-12">
            <div className="text-gray-400 mb-4">
              <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"></path>
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-gray-600 mb-2">No Chapter Available</h2>
            <p className="text-gray-500">The chapter content is not available at this time.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div 
      className={`p-4 md:p-8 bg-white h-full overflow-auto reading-content transition-all duration-300 ease-in-out ${className} ${
        isVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'
      } ${isFullWidth ? 'w-full' : ''}`}
      style={{ fontSize: `${fontSize}rem` }}
      role="main"
      aria-label="Reading content"
      aria-hidden={!isVisible}
      aria-live="polite"
      aria-atomic="false"
      data-high-contrast="true"
    >
      {/* Skip to main content link for keyboard users */}
      <a 
        href="#chapter-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 bg-blue-600 text-white px-4 py-2 rounded-lg z-50 focus-ring"
        aria-label="Skip to chapter content"
      >
        Skip to content
      </a>
      
      <div className={`mx-auto w-full ${isFullWidth ? 'max-w-4xl' : 'max-w-3xl'}`}>
        {/* Chapter Header */}
        <header className="mb-8 pb-6 border-b border-gray-200" role="banner">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 leading-tight tracking-tight" id="chapter-title">
              {chapter.title}
            </h1>
            <div className="flex items-center space-x-2">
              {/* Table of Contents Button */}
              {tableOfContents.length > 0 && (
                <button
                  onClick={() => setShowTableOfContents(!showTableOfContents)}
                  className="p-2 text-gray-400 hover:text-gray-600 focus-ring rounded-lg transition-colors"
                  aria-label={showTableOfContents ? "Hide table of contents" : "Show table of contents"}
                  aria-expanded={showTableOfContents}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 10h16M4 14h16M4 18h16"></path>
                  </svg>
                </button>
              )}
              
              {/* Chapter Navigation - Only show in reading mode */}
              {onChapterNavigation && layoutMode === 'reading' && (
                <>
                  <button
                    onClick={() => onChapterNavigation('prev')}
                    disabled={!hasPreviousChapter}
                    className="p-2 text-gray-400 hover:text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed focus-ring rounded-lg"
                    aria-label="Previous chapter"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"></path>
                    </svg>
                  </button>
                  <button
                    onClick={() => onChapterNavigation('next')}
                    disabled={!hasNextChapter}
                    className="p-2 text-gray-400 hover:text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed focus-ring rounded-lg"
                    aria-label="Next chapter"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path>
                    </svg>
                  </button>
                </>
              )}
            </div>
          </div>
          


          <div className="flex items-center text-sm text-gray-500 space-x-6" role="contentinfo" aria-label="Chapter metadata">
            <span className="flex items-center">
              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"></path>
              </svg>
              <span>Chapter Content</span>
            </span>
            {chapter.anchors && (
              <span className="ml-4 flex items-center">
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
                <span>{Object.keys(chapter.anchors).length} paragraphs</span>
              </span>
            )}
          </div>
        </header>

        {/* Table of Contents */}
        {showTableOfContents && tableOfContents.length > 0 && (
          <nav 
            className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200" 
            role="navigation" 
            aria-label="Table of contents"
          >
            <h2 className="text-sm font-semibold text-gray-700 mb-3 flex items-center">
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 10h16M4 14h16M4 18h16"></path>
              </svg>
              Table of Contents
            </h2>
            <ul className="space-y-1" role="list">
              {tableOfContents.map((item) => (
                <li key={item.id} role="listitem">
                  <button
                    onClick={() => scrollToAnchor(item.id, { highlight: true, announce: true })}
                    className={`w-full text-left px-2 py-1 rounded text-sm hover:bg-blue-50 hover:text-blue-700 focus-ring transition-colors ${
                      item.level === 2 ? 'font-medium text-gray-900' : 'text-gray-700 ml-4'
                    }`}
                    aria-label={`Jump to ${item.text}`}
                  >
                    {item.text}
                  </button>
                </li>
              ))}
            </ul>
          </nav>
        )}

        {/* Chapter Content */}
        <article 
          ref={contentRef}
          id="chapter-content"
          className="max-w-none"
          style={{ color: '#000000' }}
          aria-label="Chapter content"
          role="article"
          tabIndex={-1}
        >
          <section 
            className="leading-relaxed"
            style={{
              fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
              lineHeight: '1.75',
              letterSpacing: '0.01em',
              color: '#000000',
              fontWeight: '400'
            }}
            aria-label="Chapter text content"
            dangerouslySetInnerHTML={{ __html: processContent(chapter.content) }}
          />
        </article>

        {/* Reading Progress Indicator */}
        <footer className="mt-12 pt-6 border-t border-gray-200" role="contentinfo" aria-label="Chapter navigation">
          <div className="flex items-center justify-between text-sm text-gray-500">
            <div className="flex items-center space-x-6">
              <span className="font-medium text-gray-600">End of chapter</span>
              {currentParagraph && (
                <span className="flex items-center font-medium text-gray-600">
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                  </svg>
                  <span>Paragraph {currentParagraph.split('-').pop()}</span>
                </span>
              )}
            </div>
            <div className="flex items-center space-x-3" role="group" aria-label="Chapter navigation controls">
              <button
                onClick={() => scrollToAnchor('chapter-1-para-1', { scrollBehavior: 'smooth' })}
                className="flex items-center px-3 py-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-all duration-200 focus-ring font-medium"
                aria-label="Go to first paragraph"
                title="Go to first paragraph"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 19l-7-7 7-7m8 14l-7-7 7-7"></path>
                </svg>
                First
              </button>
              <button
                onClick={() => {
                  const container = document.querySelector('.reading-content');
                  if (container) {
                    container.scrollTo({ top: 0, behavior: 'smooth' });
                  } else {
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }
                }}
                className="flex items-center px-3 py-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-all duration-200 focus-ring font-medium"
                aria-label="Scroll to top of chapter"
                title="Scroll to top of chapter"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 10l7-7m0 0l7 7m-7-7v18"></path>
                </svg>
                Top
              </button>
            </div>
          </div>
        </footer>
      </div>


    </div>
  );
};

export default EnhancedReadingPane;
