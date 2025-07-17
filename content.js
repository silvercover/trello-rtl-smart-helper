class TrelloRTLHelper {
    constructor() {
      // RTL language codes
      this.rtlLanguages = [
        'fa', 'ar', 'he', 'ur', 'ku', 'ps', 'sd', 'yi', 'dv'
      ];
      
      // Regular expressions for detecting RTL and LTR characters
      this.rtlChars = /[\u0590-\u05FF\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/;
      this.ltrChars = /[A-Za-z0-9]/;
      
      // Track processed elements to avoid reprocessing
      this.processedElements = new WeakSet();
      
      this.init();
    }
  
    init() {
      console.log('🚀 Trello RTL Helper started');
      this.processExistingElements();
      this.setupMutationObserver();
    }

    /**
     * Smart text direction detection based on content
     */
    detectTextDirection(text) {
      if (!text || typeof text !== 'string') return 'ltr';
      
      const cleanText = text.trim().replace(/\s+/g, ' ');
      if (!cleanText) return 'ltr';
  
      // Count RTL and LTR characters
      const rtlMatches = cleanText.match(this.rtlChars) || [];
      const ltrMatches = cleanText.match(this.ltrChars) || [];
      
      const rtlCount = rtlMatches.length;
      const ltrCount = ltrMatches.length;
      
      // If no text characters found, default to LTR
      if (rtlCount === 0 && ltrCount === 0) return 'ltr';
      
      // If more than 25% of text is RTL, consider it RTL
      const rtlPercentage = rtlCount / (rtlCount + ltrCount);
      
      return rtlPercentage > 0.25 ? 'rtl' : 'ltr';
    }

    /**
     * Check if a link should remain LTR (when text equals href and both are Latin)
     */
    isLatinOnlyLink(element) {
      if (element.tagName.toLowerCase() !== 'a') return false;
      
      const href = element.getAttribute('href') || '';
      const text = (element.textContent || '').trim();
      
      // Remove protocol prefixes for comparison
      const cleanHref = href.replace(/^https?:\/\//, '').replace(/^www\./, '');
      const cleanText = text.replace(/^https?:\/\//, '').replace(/^www\./, '');
      
      // Check if text equals href (or close variations)
      const textsMatch = cleanText === cleanHref || text === href || 
                        cleanText === href || text === cleanHref;
      
      if (textsMatch && text.length > 0) {
        // Check if it's mostly Latin characters (URLs, emails, etc.)
        const latinPattern = /^[A-Za-z0-9\-._~:/?#[\]@!$&'()*+,;=%]+$/;
        return latinPattern.test(text);
      }
      
      return false;
    }

    /**
     * Force LTR direction using JavaScript to override inline styles
     */
    forceLTRDirection(element) {
      // Add class for CSS targeting
      element.classList.add('force-ltr');
      
      // Override inline styles directly with JavaScript
      element.style.setProperty('direction', 'ltr', 'important');
      element.style.setProperty('text-align', 'left', 'important');
      element.style.setProperty('unicode-bidi', 'embed', 'important');
      
      // For code elements, preserve white-space
      if (element.tagName.toLowerCase() === 'code') {
        element.style.setProperty('white-space', 'pre', 'important');
        element.style.setProperty('font-family', '"Monaco", "Menlo", "Ubuntu Mono", monospace', 'important');
      }
    }

    /**
     * Process code tags within ak-renderer-wrapper (always LTR)
     */
    processCodeTags(wrapper) {
      const codeElements = wrapper.querySelectorAll('code');
      codeElements.forEach(code => {
        this.forceLTRDirection(code);
        
        // Also process any nested spans that might have direction issues
        const nestedSpans = code.querySelectorAll('span');
        nestedSpans.forEach(span => {
          span.style.setProperty('direction', 'ltr', 'important');
          span.style.setProperty('text-align', 'left', 'important');
        });
        
        console.log('💻 Applied LTR force to code element:', code.textContent?.substring(0, 50) + '...');
      });
    }

    /**
     * Process anchor tags within ak-renderer-wrapper
     */
    processAnchorTags(wrapper) {
      const linkElements = wrapper.querySelectorAll('a');
      linkElements.forEach(link => {
        const href = link.getAttribute('href') || '';
        const text = (link.textContent || '').trim();
        
        if (this.isLatinOnlyLink(link)) {
          // Case 1: <a href="www.yahoo.com">www.yahoo.com</a> → Force LTR
          this.forceLTRDirection(link);
          console.log('🔗 Applied LTR force to Latin-only link:', text);
        } else {
          // Case 2: <a href="www.yahoo.com">عنوان لینک</a> → Detect based on text
          const direction = this.detectTextDirection(text);
          link.classList.remove('rtl-content', 'ltr-content', 'force-ltr');
          link.classList.add(`${direction}-content`);
          link.style.setProperty('direction', direction, 'important');
          link.style.setProperty('text-align', direction === 'rtl' ? 'right' : 'left', 'important');
          console.log(`🔗 Applied ${direction.toUpperCase()} to link: "${text}" (href: ${href})`);
        }
      });
    }

    /**
     * Apply direction to element with cleanup of previous classes
     */
    applyDirection(element, direction) {
      // Remove previous classes
      element.classList.remove('rtl-content', 'ltr-content');
      
      // Add new class
      element.classList.add(`${direction}-content`);
      
      // Set direction directly
      element.style.direction = direction;
      
      // Special handling for card-name, list-name, and board-tile-details-name
      if (element.hasAttribute('data-testid')) {
        const testId = element.getAttribute('data-testid');
        if (testId === 'card-name' || testId === 'list-name') {
          element.style.textAlign = direction === 'rtl' ? 'right' : 'left';
        }
      }
      
      // Special handling for board-tile-details-name class
      if (element.classList && element.classList.contains('board-tile-details-name')) {
        element.style.textAlign = direction === 'rtl' ? 'right' : 'left';
      }
  
      // Mark as processed
      this.processedElements.add(element);
    }
  
    /**
     * Process ak-renderer-wrapper element
     */
    processAkRendererWrapper(element) {
      const textContent = this.getElementText(element);
      const direction = this.detectTextDirection(textContent);
      this.applyDirection(element, direction);
      
      // Special processing for ul elements
      this.processUlElements(element, direction);

      // Process code tags (always LTR)
      this.processCodeTags(element);

      // Process anchor tags (smart direction)
      this.processAnchorTags(element);
    }
  
    /**
     * Process ul elements inside ak-renderer-wrapper
     */
    processUlElements(wrapper, direction) {
      const ulElements = wrapper.querySelectorAll('ul');
      ulElements.forEach(ul => {
        // Apply padding based on direction
        if (direction === 'rtl') {
          ul.style.paddingLeft = '0px';
          ul.style.paddingRight = '24px';
        } else {
          ul.style.paddingLeft = '24px';
          ul.style.paddingRight = '0px';
        }
        
        // Apply direction to ul
        ul.style.direction = direction;
        ul.style.textAlign = direction === 'rtl' ? 'right' : 'left';
      });
    }
  
    /**
     * Process checklist-container element
     */
    processChecklistContainer(element) {
      const textContent = this.getElementText(element);
      const direction = this.detectTextDirection(textContent);
      this.applyDirection(element, direction);
    }
  
    /**
     * Process comment-container element
     */
    processCommentContainer(element) {
      const textContent = this.getElementText(element);
      const direction = this.detectTextDirection(textContent);
      this.applyDirection(element, direction);
    }
  
    /**
     * Process card-name element
     */
    processCardName(element) {
      const textContent = this.getElementText(element);
      const direction = this.detectTextDirection(textContent);
      this.applyDirection(element, direction);
    }
  
    /**
     * Process list-name element
     */
    processListName(element) {
      const textContent = this.getElementText(element);
      const direction = this.detectTextDirection(textContent);
      this.applyDirection(element, direction);
      
      console.log(`📝 Processed list-name: "${textContent}" → ${direction}`);
    }

    /**
     * Process board-tile-details-name element
     */
    processBoardTileDetailsName(element) {
      const textContent = this.getElementText(element);
      const direction = this.detectTextDirection(textContent);
      this.applyDirection(element, direction);
      
      console.log(`🗂️ Processed board-tile-details-name: "${textContent}" → ${direction}`);
    }
  
    /**
     * Extract text from element
     */
    getElementText(element) {
      return element.textContent || element.innerText || '';
    }
  
    /**
     * Process element based on its type
     */
    processElement(element) {
      if (!element || element.nodeType !== Node.ELEMENT_NODE) return;
      
      // Prevent reprocessing
      if (this.processedElements.has(element)) return;
  
      try {
        // Check for ak-renderer-wrapper
        if (element.classList && element.classList.contains('ak-renderer-wrapper')) {
          this.processAkRendererWrapper(element);
          return;
        }

        // Check for board-tile-details-name class
        if (element.classList && element.classList.contains('board-tile-details-name')) {
          this.processBoardTileDetailsName(element);
          return;
        }
  
        // Check data-testid attributes
        const testId = element.getAttribute('data-testid');
        if (testId) {
          switch (testId) {
            case 'checklist-container':
              this.processChecklistContainer(element);
              break;
            case 'comment-container':
              this.processCommentContainer(element);
              break;
            case 'card-name':
              this.processCardName(element);
              break;
            case 'list-name':
              this.processListName(element);
              break;
          }
        }
      } catch (error) {
        console.warn('⚠️ Error processing element:', error);
      }
    }
  
    /**
     * Process existing elements on the page
     */
    processExistingElements() {
      const selectors = [
        '.ak-renderer-wrapper',
        '[data-testid="checklist-container"]',
        '[data-testid="comment-container"]',
        '[data-testid="card-name"]',
        '[data-testid="list-name"]',
        '.board-tile-details-name'
      ];
  
      selectors.forEach(selector => {
        try {
          const elements = document.querySelectorAll(selector);
          console.log(`🔍 Found ${elements.length} elements with selector: ${selector}`);
          elements.forEach(element => this.processElement(element));
        } catch (error) {
          console.warn(`⚠️ Error processing ${selector}:`, error);
        }
      });
    }
  
    /**
     * Setup MutationObserver to monitor changes
     */
    setupMutationObserver() {
      const observer = new MutationObserver((mutations) => {
        let hasChanges = false;
        
        mutations.forEach((mutation) => {
          // Check added nodes
          mutation.addedNodes.forEach((node) => {
            if (node.nodeType === Node.ELEMENT_NODE) {
              hasChanges = true;
              
              // Check the element itself
              this.processElement(node);
              
              // Check child elements
              if (node.querySelectorAll) {
                const childElements = node.querySelectorAll(
                  '.ak-renderer-wrapper, [data-testid="checklist-container"], [data-testid="comment-container"], [data-testid="card-name"], [data-testid="list-name"], .board-tile-details-name'
                );
                childElements.forEach(child => this.processElement(child));
              }
            }
          });
  
          // Check content changes
          if (mutation.type === 'childList' || mutation.type === 'characterData') {
            const target = mutation.target;
            if (target.nodeType === Node.ELEMENT_NODE && 
                target.closest && 
                target.closest('.ak-renderer-wrapper, [data-testid="checklist-container"], [data-testid="comment-container"], [data-testid="card-name"], [data-testid="list-name"], .board-tile-details-name')) {
              hasChanges = true;
              const closestElement = target.closest('.ak-renderer-wrapper, [data-testid="checklist-container"], [data-testid="comment-container"], [data-testid="card-name"], [data-testid="list-name"], .board-tile-details-name');
              // Remove from processed elements to force reprocessing
              this.processedElements.delete(closestElement);
              this.processElement(closestElement);
            }
          }
        });
  
        if (hasChanges) {
          console.log('📝 Changes detected, reprocessing...');
        }
      });
  
      // Start observing with optimized settings
      observer.observe(document.body, {
        childList: true,
        subtree: true,
        characterData: true,
        attributes: true,
        attributeFilter: ['data-testid', 'class']
      });
  
      console.log('👁️ MutationObserver set up');
    }
  
    /**
     * Reprocess all elements
     */
    reprocessAll() {
      this.processedElements = new WeakSet();
      this.processExistingElements();
      console.log('🔄 All elements reprocessed');
    }
  
    /**
     * Process list names specifically (helper method for debugging)
     */
    processAllListNames() {
      const listNames = document.querySelectorAll('[data-testid="list-name"]');
      console.log(`🏷️ Processing ${listNames.length} list names`);
      
      listNames.forEach((listName, index) => {
        const text = this.getElementText(listName);
        const direction = this.detectTextDirection(text);
        this.applyDirection(listName, direction);
        console.log(`List ${index + 1}: "${text}" → ${direction}`);
      });
    }

    /**
     * Process all board tile detail names
     */
    processAllBoardTileNames() {
      const boardTileNames = document.querySelectorAll('.board-tile-details-name');
      console.log(`🗂️ Processing ${boardTileNames.length} board tile detail names`);
      
      boardTileNames.forEach((element, index) => {
        const text = this.getElementText(element);
        const direction = this.detectTextDirection(text);
        this.applyDirection(element, direction);
        console.log(`Board tile ${index + 1}: "${text}" → ${direction}`);
      });
    }

    /**
     * Force reprocess all code elements (useful for debugging)
     */
    processAllCodeElements() {
      const codeElements = document.querySelectorAll('.ak-renderer-wrapper code');
      console.log(`💻 Force processing ${codeElements.length} code elements`);
      
      codeElements.forEach((code, index) => {
        this.forceLTRDirection(code);
        console.log(`Code ${index + 1}: Forced LTR direction`);
      });
    }

    /**
     * Force reprocess all anchor elements (useful for debugging)
     */
    processAllAnchorElements() {
      const anchorElements = document.querySelectorAll('.ak-renderer-wrapper a');
      console.log(`🔗 Processing ${anchorElements.length} anchor elements`);
      
      anchorElements.forEach((anchor, index) => {
        const href = anchor.getAttribute('href') || '';
        const text = (anchor.textContent || '').trim();
        
        if (this.isLatinOnlyLink(anchor)) {
          this.forceLTRDirection(anchor);
          console.log(`Anchor ${index + 1}: "${text}" → LTR (Latin-only)`);
        } else {
          const direction = this.detectTextDirection(text);
          anchor.classList.remove('rtl-content', 'ltr-content', 'force-ltr');
          anchor.classList.add(`${direction}-content`);
          anchor.style.setProperty('direction', direction, 'important');
          anchor.style.setProperty('text-align', direction === 'rtl' ? 'right' : 'left', 'important');
          console.log(`Anchor ${index + 1}: "${text}" → ${direction.toUpperCase()} (text-based)`);
        }
      });
    }
  }
  
  // Main initialization function
  function initTrelloRTL() {
    try {
      if (window.trelloRTLHelper) {
        window.trelloRTLHelper.reprocessAll();
      } else {
        window.trelloRTLHelper = new TrelloRTLHelper();
      }
    } catch (error) {
      console.error('Failed to initialize Trello RTL Helper:', error);
      // Retry after a short delay
      setTimeout(() => {
        try {
          window.trelloRTLHelper = new TrelloRTLHelper();
        } catch (retryError) {
          console.error('Retry failed:', retryError);
        }
      }, 1000);
    }
  }
  
  // Initialize extension
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initTrelloRTL);
  } else {
    initTrelloRTL();
  }
  
  // Reinitialize on URL change (for SPA)
  let currentUrl = location.href;
  const urlObserver = new MutationObserver(() => {
    if (location.href !== currentUrl) {
      currentUrl = location.href;
      console.log('🔄 URL changed, reprocessing in 1 second...');
      setTimeout(() => {
        initTrelloRTL();
      }, 1000);
    }
  });
  
  urlObserver.observe(document, { subtree: true, childList: true });
  
  // Handle resize for responsive adjustments
  window.addEventListener('resize', () => {
    if (window.trelloRTLHelper) {
      setTimeout(() => {
        window.trelloRTLHelper.reprocessAll();
      }, 300);
    }
  });
  
  // Handle focus changes (useful for dynamic content)
  window.addEventListener('focus', () => {
    if (window.trelloRTLHelper && document.hasFocus()) {
      setTimeout(() => {
        window.trelloRTLHelper.processAllListNames();
        window.trelloRTLHelper.processAllBoardTileNames();
        window.trelloRTLHelper.processAllCodeElements();
        window.trelloRTLHelper.processAllAnchorElements();
      }, 500);
    }
  });
  
  console.log('✅ Trello RTL Helper ready');
