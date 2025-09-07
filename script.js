window.addEventListener('load', () => {
    // --- Header Pill Navigation ---
    const pillContainers = document.querySelectorAll('.pill-container');

    pillContainers.forEach(container => {
        const links = container.querySelectorAll('.nav-link');
        const indicator = container.querySelector('.nav-indicator');
        const activeLink = container.querySelector('.nav-link.active');

        function moveIndicator(target) {
            if (!indicator || !target) return;
            indicator.style.width = `${target.offsetWidth}px`;
            indicator.style.left = `${target.offsetLeft}px`;
            indicator.style.opacity = '1';
        }

        if (activeLink) {
            setTimeout(() => moveIndicator(activeLink), 50);
        }

        links.forEach(link => {
            link.addEventListener('mouseenter', () => moveIndicator(link));
        });

        container.addEventListener('mouseleave', () => {
            if (activeLink) {
                moveIndicator(activeLink);
            } else if (indicator) {
                indicator.style.opacity = '0';
            }
        });
    });

    // --- Waving Hand Animation Trigger ---
    const waveEmoji = document.querySelector('.wave');
    if (waveEmoji) {
        setTimeout(() => {
            waveEmoji.classList.add('wave-animation-active'); // A class to trigger the animation
        }, 1000); // 1-second delay
    }

    // --- Dino Positioning ---
    const dino = document.querySelector('.dino-on-line');
    
    function positionDino() {
        if (!dino) return;
        
        // Find the appropriate line element based on page content
        let targetLine = null;
        
        // Priority 1: Look for the footer section-divider (most reliable across all pages)
        const footerDividers = document.querySelectorAll('.site-footer .section-divider');
        if (footerDividers.length > 0) {
            targetLine = footerDividers[0];
        }
        // Priority 2: Look for any section-divider if footer not found yet
        else {
            const dividers = document.querySelectorAll('.section-divider');
            if (dividers.length > 0) {
                // For pages with multiple dividers, use the last one (likely footer)
                targetLine = dividers[dividers.length - 1];
            }
        }
        
        if (targetLine) {
            const lineRect = targetLine.getBoundingClientRect();
            // Wait a frame to ensure dino dimensions are available
            requestAnimationFrame(() => {
                const dinoHeight = dino.offsetHeight || 60; // Fallback height if not yet loaded
                // Position the dino so its skateboard (bottom 15% of the image) sits on the line
                const offsetFromLine = dinoHeight * 0.85;
                dino.style.top = `${lineRect.top - offsetFromLine}px`;
                
            });
        }
    }

    function setupDinoPositioning() {
        if (!dino) return;
        
        positionDino();
        
        // Add event listeners for dynamic repositioning
        window.addEventListener('resize', positionDino);
        window.addEventListener('scroll', positionDino);
    }

    function waitForFooterAndImage() {
        const footerExists = document.querySelector('.site-footer');
        const dinoLoaded = dino && (dino.complete || dino.offsetHeight > 0);
        
        
        if (footerExists && dinoLoaded) {
            // Wait 2 seconds, then position and start animation
            setTimeout(() => {
                setupDinoPositioning();
                dino.classList.add('skating');
            }, 2000); // 2-second delay
            return;
        }
        
        // If footer doesn't exist yet, watch for it
        if (!footerExists) {
            const observer = new MutationObserver((mutations) => {
                for (const mutation of mutations) {
                    if (mutation.type === 'childList') {
                        for (const node of mutation.addedNodes) {
                            if (node.nodeType === Node.ELEMENT_NODE && 
                                (node.classList?.contains('site-footer') || 
                                 node.querySelector?.('.site-footer'))) {
                                observer.disconnect();
                                // Footer added, try positioning again
                                setTimeout(waitForFooterAndImage, 50);
                                return;
                            }
                        }
                    }
                }
            });
            
            observer.observe(document.body, { 
                childList: true, 
                subtree: true 
            });
            
            // Also check periodically in case observer misses it
            setTimeout(waitForFooterAndImage, 200);
        }
        
        // If dino not loaded yet, wait for it
        if (!dinoLoaded && dino) {
            if (!dino.complete) {
                dino.addEventListener('load', () => {
                    waitForFooterAndImage();
                }, { once: true });
            }
            // Also try again after a short delay
            setTimeout(waitForFooterAndImage, 100);
        }
    }

    // Start the process
    if (dino) {
        waitForFooterAndImage();
    }
});