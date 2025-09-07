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
    const line = document.querySelector('.section-divider');
    const footer = document.querySelector('.connect-section');

    function positionDino() {
        if (dino && line) {
            const lineRect = line.getBoundingClientRect();
            // Position fixed is relative to the viewport, so we only need getBoundingClientRect().top
            dino.style.top = `${lineRect.top}px`;
        }
    }

    // Position dino after the footer animation finishes, then on resize/scroll.
    if (footer) {
        footer.addEventListener('animationend', positionDino, { once: true });
    } else {
        // Fallback if there's no animation for some reason.
        positionDino();
    }
    
    window.addEventListener('resize', positionDino);
    window.addEventListener('scroll', positionDino);
});