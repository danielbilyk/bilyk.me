document.addEventListener('DOMContentLoaded', () => {
    // Select all pill containers on the page
    const pillContainers = document.querySelectorAll('.pill-container');

    // Iterate over each container to set up its unique logic
    pillContainers.forEach(container => {
        const links = container.querySelectorAll('.nav-link');
        const indicator = container.querySelector('.nav-indicator');
        const activeLink = container.querySelector('.nav-link.active');

        // Function to move the indicator within the current container
        function moveIndicator(element) {
            if (element && indicator) {
                indicator.style.width = `${element.offsetWidth}px`;
                indicator.style.left = `${element.offsetLeft}px`;
                indicator.style.opacity = '1'; // Make it visible
            }
        }

        // Function to hide the indicator
        function hideIndicator() {
            if (indicator) {
                indicator.style.opacity = '0';
            }
        }

        // Set initial position for the indicator
        if (activeLink) {
            // This is for the main navigation, which has an active state
            moveIndicator(activeLink);
        } else {
            // This is for the social links, which have no initial active state
            hideIndicator();
        }

        // Add event listeners to the links within this container
        links.forEach(link => {
            link.addEventListener('mouseover', () => {
                moveIndicator(link);
            });
        });

        // Add a mouseleave listener to the whole container
        container.addEventListener('mouseleave', () => {
            if (activeLink) {
                // If there's an active link (main nav), return to it
                moveIndicator(activeLink);
            } else {
                // If there's no active link (social links), hide the indicator
                hideIndicator();
            }
        });
    });
});