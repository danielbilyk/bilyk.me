window.addEventListener('DOMContentLoaded', () => {
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

    // Start parsing Wisdoms
    if (dino) {
        waitForFooterAndImage();
    }

    let allQuotes = [];
    let isLoading = false;
    
    function renderMarkdown(text) {
        return text
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            .replace(/_(.*?)_/g, '<em>$1</em>');
    }
    
    function parseWisdomContent(content) {
        const wisdomQuotes = [];
        const lines = content.split('\n');
        
        let startParsing = false;
        for (const line of lines) {
            if (line.includes('## The Wisdom So Far')) {
                startParsing = true;
                continue;
            }
            
            if (startParsing && line.includes('## Works Cited')) {
                break;
            }
            
            if (startParsing && line.trim().startsWith('- ') && 
                !line.includes('<!--') && !line.includes('<hr id=')) {
                const quote = line.substring(2).trim();
                if (quote.length > 0) {
                    wisdomQuotes.push({
                        text: quote,
                        source: 'The Wisdom Project',
                        link: 'https://github.com/merlinmann/wisdom/blob/master/wisdom.md'
                    });
                }
            }
        }
        
        // Remove duplicates based on text content
        const uniqueWisdomQuotes = wisdomQuotes.filter((quote, index, array) => 
            array.findIndex(q => q.text === quote.text) === index
        );
        
        return uniqueWisdomQuotes;
    }
    
    // Load quotes from both sources
    async function loadQuotes() {
        if (isLoading || allQuotes.length > 0) return;
        isLoading = true;
        
        try {
            // Load talking points
            const talkingPointsResponse = await fetch('/talking-points.json');
            if (talkingPointsResponse.ok) {
                const talkingPointsData = await talkingPointsResponse.json();
                talkingPointsData.projects.forEach(project => {
                    project.points.forEach(point => {
                        allQuotes.push({
                            text: point,
                            source: project.name,
                            link: project.link
                        });
                    });
                });
            }
            
            // Load wisdom quotes
            const wisdomResponse = await fetch('https://raw.githubusercontent.com/merlinmann/wisdom/refs/heads/master/wisdom.md');
            if (wisdomResponse.ok) {
                const wisdomContent = await wisdomResponse.text();
                const wisdomQuotes = parseWisdomContent(wisdomContent);
                allQuotes.push(...wisdomQuotes);
            }
        } catch (error) {
            console.log('Could not load all quote sources:', error);
        }
        
        isLoading = false;
    }
    
    // Create and position tooltip
    function showTooltip(clickEvent, quote) {
        // Remove any existing tooltip
        const existingTooltip = document.querySelector('.dino-tooltip');
        if (existingTooltip) {
            existingTooltip.remove();
        }
        
        // Create tooltip element
        const tooltip = document.createElement('div');
        tooltip.className = 'dino-tooltip';
        
        const quoteText = document.createElement('div');
        quoteText.className = 'quote-text';
        quoteText.innerHTML = renderMarkdown(quote.text);
        
        const quoteSource = document.createElement('p');
        quoteSource.className = 'quote-source';
        quoteSource.innerHTML = `<a href="${quote.link}" target="_blank" rel="noopener">${quote.source}</a>`;
        
        tooltip.appendChild(quoteText);
        tooltip.appendChild(quoteSource);
        document.body.appendChild(tooltip);
        
        // Position tooltip
        const rect = clickEvent.target.getBoundingClientRect();
        const tooltipRect = tooltip.getBoundingClientRect();
        
        // Calculate position (always center below the dino)
        let left = rect.left + (rect.width / 2) - (tooltipRect.width / 2);
        let top = rect.bottom + 16;
        
        // Ensure tooltip stays within viewport horizontally
        const padding = 16;
        left = Math.max(padding, Math.min(left, window.innerWidth - tooltipRect.width - padding));
        
        tooltip.style.left = `${left}px`;
        tooltip.style.top = `${top}px`;
        
        // Show tooltip with animation
        requestAnimationFrame(() => {
            tooltip.classList.add('show');
        });
        
        // Hide tooltip on click elsewhere
        const hideTooltip = (event) => {
            if (!tooltip.contains(event.target) && event.target !== clickEvent.target) {
                tooltip.classList.remove('show');
                setTimeout(() => {
                    if (tooltip.parentNode) {
                        tooltip.remove();
                    }
                }, 300);
                document.removeEventListener('click', hideTooltip);
            }
        };
        
        setTimeout(() => {
            document.addEventListener('click', hideTooltip);
        }, 100);
    }
    
    // Add click handlers to dino images
    const dinoImages = document.querySelectorAll('.dino-userpic');
    dinoImages.forEach(dinoImg => {
        dinoImg.addEventListener('click', async (event) => {
            event.stopPropagation();
            
            // Load quotes if not already loaded
            await loadQuotes();
            
            if (allQuotes.length === 0) {
                showTooltip(event, {
                    text: "Crocodiles walk whilst lying down.",
                    source: "Dino",
                    link: "#"
                });
                return;
            }
            
            // Get random quote
            const randomQuote = allQuotes[Math.floor(Math.random() * allQuotes.length)];
            showTooltip(event, randomQuote);
        });
    });
    
    // Preload quotes when page loads
    loadQuotes();
});