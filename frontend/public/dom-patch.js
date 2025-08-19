// Global DOM patch to prevent autofill overlay insertBefore errors
(function() {
  'use strict';
  
  console.log('Installing DOM patches for autofill overlay protection...');
  
  // Safe insertBefore patch
  const originalInsertBefore = Node.prototype.insertBefore;
  Node.prototype.insertBefore = function(newNode, referenceNode) {
    try {
      // Check if referenceNode is null/undefined or not a child of this node
      if (!referenceNode || !this.contains(referenceNode)) {
        console.warn('Skipped insertBefore: referenceNode not in parent anymore', {
          referenceNode: referenceNode,
          parent: this,
          newNode: newNode
        });
        
        // Instead of failing, append to the end or return safely
        if (this.appendChild && newNode) {
          try {
            return this.appendChild(newNode);
          } catch (appendError) {
            console.warn('appendChild also failed, returning newNode', appendError);
            return newNode;
          }
        }
        return newNode;
      }
      
      // Call original insertBefore if everything looks good
      return originalInsertBefore.call(this, newNode, referenceNode);
    } catch (err) {
      console.warn('insertBefore patch caught error:', err);
      
      // Try to append instead of insert
      if (this.appendChild && newNode) {
        try {
          return this.appendChild(newNode);
        } catch (appendError) {
          console.warn('appendChild fallback also failed', appendError);
        }
      }
      
      return newNode;
    }
  };
  
  // Safe removeChild patch
  const originalRemoveChild = Node.prototype.removeChild;
  Node.prototype.removeChild = function(child) {
    try {
      if (!child || !this.contains(child)) {
        console.warn('Skipped removeChild: child not in parent', {
          child: child,
          parent: this
        });
        return child;
      }
      return originalRemoveChild.call(this, child);
    } catch (err) {
      console.warn('removeChild patch caught error:', err);
      return child;
    }
  };
  
  // Additional cleanup for autofill overlays on page transitions
  const cleanupAutofillOverlays = function() {
    try {
      const selectors = [
        '.bootstrap-autofill-overlay',
        '[id*="bootstrap-autofill"]',
        '[class*="bootstrap-autofill"]',
        '[id*="autofill-overlay"]',
        '[class*="autofill-overlay"]'
      ];
      
      selectors.forEach(selector => {
        const elements = document.querySelectorAll(selector);
        elements.forEach(el => {
          try {
            if (el && el.parentNode) {
              el.parentNode.removeChild(el);
            }
          } catch (cleanupError) {
            console.warn('Error cleaning up autofill overlay', cleanupError);
          }
        });
      });
    } catch (err) {
      console.warn('Error in cleanupAutofillOverlays', err);
    }
  };
  
  // Run cleanup on page visibility changes and before unload
  document.addEventListener('visibilitychange', cleanupAutofillOverlays);
  window.addEventListener('beforeunload', cleanupAutofillOverlays);
  
  // Run cleanup periodically to catch any missed overlays
  setInterval(cleanupAutofillOverlays, 5000);
  
  console.log('DOM patches installed successfully');
})();