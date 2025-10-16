const CONFIG = {
    MOBILE_BREAKPOINT: 768,
    RESIZE_DEBOUNCE: 150,
    TRANSITION_DELAY: 1600,
    HOVER_DELAY: 50
};

let PROJECTS_DATA = [];

async function loadProjectsData() {
    try {
        const response = await fetch('/projects.json');
        if (!response.ok) {
            throw new Error(`Failed to load projects data: ${response.status}`);
        }
        const data = await response.json();
        PROJECTS_DATA = data;
        console.log('Projects data loaded successfully');
        return data;
    } catch (error) {
        console.error('Error loading projects data:', error);
        // Fallback to empty array if loading fails
        PROJECTS_DATA = [];
        throw error;
    }
}

class ProjectManager {
    constructor() {
        this.state = {
            projects: [...PROJECTS_DATA],
            currentProject: null,
            isMobile: false,
            isInitialized: false,
            imageCache: new Map(),
            preloadedImages: new Set()
        };
        
        this.elements = {};
        this.eventListeners = [];
        this.timers = {};
        
        this.init();
    }

    /**
     * Initialize project manager
     */
    init() {
        try {
            this.cacheElements();
            this.updateViewportState();
            this.setupEventListeners();
            this.renderProjects();
            // Attempt to replace embedded data with external JSON, then re-render
            this.loadProjectsFromJson();
            this.preloadImages();
            this.state.isInitialized = true;
            
            console.log('ProjectsManager initialized successfully');
        } catch (error) {
            console.error('Failed to initialize ProjectsManager:', error);
            this.showErrorState();
        }
    }

    /**
     * Load projects from external JSON file with graceful fallback
     */
    async loadProjectsFromJson() {
        try {
            const response = await fetch('/projects.json', { cache: 'no-cache' });
            if (!response.ok) return; // keep fallback
            const data = await response.json();
            if (!Array.isArray(data)) return; // invalid shape, keep fallback

            const normalized = data
                .filter(p => p && typeof p === 'object' && p.id && p.title)
                .map(p => ({
                    id: String(p.id),
                    title: String(p.title),
                    subtitle: p.subtitle ? String(p.subtitle) : undefined,
                    year: p.year ? String(p.year) : '',
                    summary: p.summary ? String(p.summary) : '',
                    description: p.description ? String(p.description) : '',
                    image: p.image ? String(p.image) : '',
                    link: p.link || null
                }));

            if (normalized.length === 0) return;

            this.state.projects = normalized;
            this.renderProjects();
            this.preloadImages();
            console.log('Loaded projects from projects.json');
        } catch (e) {
            console.debug('Could not load projects.json; using embedded data');
        }
    }

    /**
     * Preload all project images for smooth transitions
     */
    preloadImages() {
        this.state.projects.forEach((project, index) => {
            if (project.image && !this.state.preloadedImages.has(project.image)) {
                // Stagger image loading to avoid overwhelming the browser
                setTimeout(() => {
                    const img = new Image();
                    img.onload = () => {
                        this.state.imageCache.set(project.image, img);
                        this.state.preloadedImages.add(project.image);
                        console.log(`Preloaded image for ${project.title}`);
                    };
                    img.onerror = () => {
                        console.warn(`Failed to preload image: ${project.image}`);
                    };
                    img.src = project.image;
                }, index * 100); // 100ms between each image load
            }
        });
    }

    /**
     * Cache DOM elements with error handling
     */
    cacheElements() {
        const elementSelectors = {
            projectsList: '.projects-list',
            projectContent: '#project-content',
            projectImg: '#project-img',
            projectTitle: '#project-title',
            projectDescription: '#project-description',
            projectLink: '#project-link',
            dinoNeck: '.dino-neck',
            projectsLayout: '.projects-layout',
            
            // Mobile overlay elements
            projectOverlay: '#project-overlay',
            overlayImg: '#overlay-project-img',
            overlayTitle: '#overlay-project-title',
            overlayDescription: '#overlay-project-description',
            overlayLink: '#overlay-project-link',
            backButton: '#back-button'
        };

        for (const [key, selector] of Object.entries(elementSelectors)) {
            const element = document.querySelector(selector);
            if (!element) {
                console.warn(`Element not found: ${selector}`);
            }
            this.elements[key] = element;
        }

        // Validate required elements
        if (!this.elements.projectsList) {
            throw new Error('Required element .projects-list not found');
        }
    }

    /**
     * Update viewport state with debouncing
     */
    updateViewportState() {
        const newIsMobile = window.innerWidth <= CONFIG.MOBILE_BREAKPOINT;
        
        if (this.state.isMobile !== newIsMobile) {
            this.state.isMobile = newIsMobile;
            
            // Re-render if already initialized to adapt to new viewport
            if (this.state.isInitialized) {
                this.renderProjects();
            }
        }

        // Update sticky top alignment on viewport changes
        this.updateStickyTopOffset();
            this.updateDinoStickyTop();
    }

    /**
     * Setup all event listeners with proper cleanup tracking
     */
    setupEventListeners() {
        // Debounced resize handler
        const debouncedResize = this.debounce(() => {
            this.updateViewportState();
        }, CONFIG.RESIZE_DEBOUNCE);

        this.addEventListenerWithCleanup(window, 'resize', debouncedResize);

        // Scroll handler to update sticky offset
        const debouncedScroll = this.debounce(() => {
            this.updateStickyTopOffset();
            this.updateDinoStickyTop();
        }, 50);
        this.addEventListenerWithCleanup(window, 'scroll', debouncedScroll);

        // Mobile back button
        if (this.elements.backButton) {
            this.addEventListenerWithCleanup(
                this.elements.backButton,
                'click',
                () => this.hideProject()
            );
        }

        // Desktop layout hover behavior
        if (this.elements.projectsLayout) {
            this.addEventListenerWithCleanup(
                this.elements.projectsLayout,
                'mouseleave',
                () => {
                    if (!this.state.isMobile && this.state.currentProject) {
                        this.hideProject();
                    }
                }
            );
        }

        // Keyboard accessibility
        this.addEventListenerWithCleanup(document, 'keydown', (event) => {
            if (event.key === 'Escape' && this.state.currentProject) {
                this.hideProject();
            }
        });
    }

    /**
     * Add event listener with cleanup tracking
     */
    addEventListenerWithCleanup(element, event, handler) {
        if (!element) return;
        
        element.addEventListener(event, handler);
        this.eventListeners.push({ element, event, handler });
    }

    /**
     * Remove all event listeners
     */
    cleanup() {
        this.eventListeners.forEach(({ element, event, handler }) => {
            element.removeEventListener(event, handler);
        });
        this.eventListeners = [];

        Object.values(this.timers).forEach(clearTimeout);
        this.timers = {};
    }

    /**
     * Render all projects in the list
     */
    renderProjects() {
        if (!this.elements.projectsList) {
            console.error('Cannot render projects: projectsList element not found');
            return;
        }

        try {
            this.elements.projectsList.innerHTML = '';
            
            // Render each project
            this.state.projects.forEach(project => {
                const projectElement = this.createProjectElement(project);
                if (projectElement) {
                    this.elements.projectsList.appendChild(projectElement);
                }
            });

        } catch (error) {
            console.error('Error rendering projects:', error);
            this.showErrorState();
        }
    }

    /**
     * Create a single project element with proper event handling
     */
    createProjectElement(project) {
        if (!project || !project.id) {
            console.warn('Invalid project data:', project);
            return null;
        }

        try {
            const projectEl = document.createElement('div');
            projectEl.className = 'project-item';
            projectEl.dataset.projectId = project.id;
            
            // Add ARIA attributes for accessibility
            projectEl.setAttribute('role', 'button');
            projectEl.setAttribute('tabindex', '0');
            projectEl.setAttribute('aria-label', `View ${project.title} project details`);
            
            // Sanitize content to prevent XSS
            const titleWithSubtitle = project.subtitle 
                ? `${this.escapeHtml(project.title)} (${this.escapeHtml(project.subtitle)})`
                : this.escapeHtml(project.title);
            
            projectEl.innerHTML = `
                <div class="project-title">${titleWithSubtitle}</div>
                <div class="project-year">${this.escapeHtml(project.year)}</div>
                <div class="project-summary">${this.sanitizeHtml(project.summary)}</div>
            `;
            
            // Setup interaction handlers based on device type
            this.setupProjectInteraction(projectEl, project);
            
            return projectEl;
        } catch (error) {
            console.error('Error creating project element:', error);
            return null;
        }
    }

    /**
     * Setup interaction handlers for a project element
     */
    setupProjectInteraction(projectEl, project) {
        if (this.state.isMobile) {
            // Mobile: tap to show overlay
            const clickHandler = (event) => {
                event.preventDefault();
                this.showProject(project);
            };
            
            projectEl.addEventListener('click', clickHandler);
            projectEl.addEventListener('keydown', (event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    clickHandler(event);
                }
            });
        } else {
            // Desktop: hover to show details with debouncing
            let hoverTimer = null;
            
            const mouseEnterHandler = () => {
                // Clear any existing timer
                if (hoverTimer) {
                    clearTimeout(hoverTimer);
                }
                
                // Add small delay to prevent rapid switching
                hoverTimer = setTimeout(() => {
                    if (this.state.currentProject !== project.id) {
                        this.showProject(project);
                    }
                }, CONFIG.HOVER_DELAY);
            };

            const mouseLeaveHandler = () => {
                // Clear timer on mouse leave to prevent delayed activation
                if (hoverTimer) {
                    clearTimeout(hoverTimer);
                    hoverTimer = null;
                }
            };

            projectEl.addEventListener('mouseenter', mouseEnterHandler);
            projectEl.addEventListener('mouseleave', mouseLeaveHandler);
            
            // Add keyboard support for desktop too
            projectEl.addEventListener('keydown', (event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    this.showProject(project);
                }
            });
        }
    }

    /**
     * Show project details (mobile or desktop)
     */
    showProject(project) {
        if (!project) {
            console.warn('Cannot show project: invalid project data');
            return;
        }

        try {
            this.state.currentProject = project.id;
            
            if (this.state.isMobile) {
                this.showMobileProject(project);
            } else {
                this.showDesktopProject(project);
            }
        } catch (error) {
            console.error('Error showing project:', error);
        }
    }

    /**
     * Show project details on desktop
     */
    showDesktopProject(project) {
        const { projectContent, projectImg, projectTitle, projectDescription, projectLink } = this.elements;
        
        if (!projectContent) {
            console.warn('Desktop project content elements not found');
            return;
        }

        // Update active state on project items
        this.updateActiveProjectItem(project.id);
        
        // Add class to body to trigger dino hiding
        document.body.classList.add('project-viewing');

        // Ensure sticky offset reflects current scroll position
        this.updateStickyTopOffset();

        const performUpdate = () => {
            // Clear any hide timer that might be running
            if (this.timers.hideProject) {
                clearTimeout(this.timers.hideProject);
                delete this.timers.hideProject;
            }

            // Dino stays visible and fixed on the right now

            // Load image first, then sync text and reveal together
            if (projectImg) {
                this.loadImageSmoothly(projectImg, project.image, `${project.title} project image`, () => {
                    // Ignore if user already hovered away
                    if (this.state.currentProject !== project.id) return;

                    if (projectTitle) {
                        projectTitle.textContent = project.title;
                    }

                    if (projectDescription) {
                        projectDescription.innerHTML = this.sanitizeHtml(project.description);
                    }

                    // Handle project link
                    if (projectLink) {
                        if (project.link) {
                            projectLink.href = project.link;
                            projectLink.style.display = 'inline-flex';
                            projectLink.setAttribute('aria-label', `Visit ${project.title} project`);
                        } else {
                            projectLink.style.display = 'none';
                        }
                    }

            // Show content without reflow jumps
            projectContent.style.display = 'flex';
            projectContent.classList.remove('hidden');
            requestAnimationFrame(() => {
                projectContent.classList.add('active');
            });
                });
            }
        };

        // If a project is already visible, transition smoothly
        if (projectContent.classList.contains('active')) {
            projectContent.classList.remove('active');
            setTimeout(performUpdate, 150); // Reduced delay for snappier transitions
        } else {
            performUpdate();
        }
    }

    /**
     * Show project details on mobile (overlay)
     */
    showMobileProject(project) {
        const { projectOverlay, overlayImg, overlayTitle, overlayDescription, overlayLink } = this.elements;
        
        if (!projectOverlay) {
            console.warn('Mobile overlay elements not found');
            return;
        }

        try {
            // Update active state on project items
            this.updateActiveProjectItem(project.id);

            // Show overlay immediately
            projectOverlay.classList.add('active');

            // Update overlay content after image is ready
            if (overlayImg) {
                this.loadImageSmoothly(overlayImg, project.image, `${project.title} project image`, () => {
                    if (overlayTitle) {
                        overlayTitle.textContent = project.title;
                    }
                    
                    // Handle subtitle
                    const overlaySubtitle = document.getElementById('overlay-project-subtitle');
                    if (overlaySubtitle) {
                        if (project.subtitle) {
                            overlaySubtitle.textContent = project.subtitle;
                            overlaySubtitle.style.display = 'block';
                        } else {
                            overlaySubtitle.style.display = 'none';
                        }
                    }

                    if (overlayDescription) {
                        overlayDescription.innerHTML = this.sanitizeHtml(project.description);
                    }

                    if (overlayLink) {
                        if (project.link) {
                            overlayLink.href = project.link;
                            overlayLink.style.display = 'inline-flex';
                            overlayLink.setAttribute('aria-label', `Visit ${project.title} project`);
                        } else {
                            overlayLink.style.display = 'none';
                        }
                    }
                });
            }
            
            // Focus management for accessibility
            if (this.elements.backButton) {
                this.elements.backButton.focus();
            }

        } catch (error) {
            console.error('Error in showMobileProject:', error);
        }
    }

    /**
     * Update active state on project items
     */
    updateActiveProjectItem(projectId) {
        // Remove active class from all project items
        const allProjectItems = document.querySelectorAll('.project-item');
        allProjectItems.forEach(item => {
            item.classList.remove('active');
        });

        // Add active class to current project item if projectId is provided
        if (projectId) {
            const activeItem = document.querySelector(`[data-project-id="${projectId}"]`);
            if (activeItem) {
                activeItem.classList.add('active');
            }
        }
    }

    /**
     * Load image smoothly with fade transition and race-cancellation
     */
    loadImageSmoothly(imgElement, imageSrc, altText, onReady) {
        if (!imgElement) return;

        const fallbackSrc = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAwIiBoZWlnaHQ9IjQwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZjBmMGYwIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCwgc2Fucy1zZXJpZiIgZm9udC1zaXplPSIxOCIgZmlsbD0iIzk5OSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPkltYWdlIE5vdCBGb3VuZDwvdGV4dD48L3N2Zz4=';
        const targetSrc = imageSrc || fallbackSrc;

        // Increment request id for race cancellation
        const currentId = (parseInt(imgElement.dataset.requestId || '0', 10) + 1).toString();
        imgElement.dataset.requestId = currentId;

        const container = imgElement.closest('.project-image');
        this.setLoadingState(container, true);

        const finish = () => {
            this.setLoadingState(container, false);
            if (typeof onReady === 'function') {
                onReady();
            }
        };

        // Cached: swap quickly with crossfade
        if (this.state.imageCache.has(targetSrc)) {
            const cachedImg = this.state.imageCache.get(targetSrc);
            imgElement.style.opacity = '0';
            requestAnimationFrame(() => {
                // Ensure still the latest request
                if (imgElement.dataset.requestId !== currentId) return;
                imgElement.src = cachedImg.src;
                imgElement.alt = altText || 'Project showcase image';
                // Next frame, fade in
                requestAnimationFrame(() => {
                    if (imgElement.dataset.requestId !== currentId) return;
                    imgElement.style.opacity = '1';
                    finish();
                });
            });
            return;
        }

        // Not cached: preload, then swap
        const preloader = new Image();
        preloader.onload = () => {
            this.state.imageCache.set(targetSrc, preloader);
            this.state.preloadedImages.add(targetSrc);
            if (imgElement.dataset.requestId !== currentId) return; // stale
            imgElement.style.opacity = '0';
            setTimeout(() => {
                if (imgElement.dataset.requestId !== currentId) return;
                imgElement.src = targetSrc;
                imgElement.alt = altText || 'Project showcase image';
                requestAnimationFrame(() => {
                    if (imgElement.dataset.requestId !== currentId) return;
                    imgElement.style.opacity = '1';
                    finish();
                });
            }, 60);
        };
        preloader.onerror = () => {
            if (imgElement.dataset.requestId !== currentId) return;
            imgElement.src = fallbackSrc;
            imgElement.alt = 'Image not found';
            finish();
        };
        preloader.src = targetSrc;
    }

    /**
     * Set image source with proper error handling
     */
    setImageSource(imgElement, targetSrc, altText, fallbackSrc) {
        // Kept for backward compatibility; prefer loadImageSmoothly
        imgElement.src = targetSrc || fallbackSrc;
                imgElement.alt = altText || 'Project showcase image';
        imgElement.onerror = () => {
            if (imgElement.src !== fallbackSrc) {
                imgElement.src = fallbackSrc;
                imgElement.alt = 'Image not found';
            }
        };
    }

    /**
     * Toggle loading UI on image container
     */
    setLoadingState(container, isLoading) {
        if (!container) return;
        if (isLoading) {
            container.classList.add('loading');
            if (!container.querySelector('.spinner')) {
                const spinner = document.createElement('div');
                spinner.className = 'spinner';
                container.appendChild(spinner);
            }
        } else {
            container.classList.remove('loading');
            const spinner = container.querySelector('.spinner');
            if (spinner) spinner.remove();
        }
    }

    /**
     * Hide project details
     */
    hideProject() {
        try {
            if (this.state.isMobile) {
                this.hideMobileProject();
            } else {
                this.hideDesktopProject();
            }
            
            // Clear active states
            this.updateActiveProjectItem(null);
            this.state.currentProject = null;
            
            // Remove class from body to show dino again
            document.body.classList.remove('project-viewing');
        } catch (error) {
            console.error('Error hiding project:', error);
        }
    }

    /**
     * Hide desktop project details
     */
    hideDesktopProject() {
        const { projectContent } = this.elements;
        
        if (!projectContent) return;

        try {
            projectContent.classList.remove('active');
            
            // Clear any existing timer
            if (this.timers.hideProject) {
                clearTimeout(this.timers.hideProject);
            }
            
            this.timers.hideProject = setTimeout(() => {
                // Keep in flow, just visually hide to avoid scroll jumps
                projectContent.classList.add('hidden');
                projectContent.classList.remove('active');
                
                // Dino remains visible; no toggling
                
                delete this.timers.hideProject;
            }, CONFIG.TRANSITION_DELAY);
            
        } catch (error) {
            console.error('Error in hideDesktopProject:', error);
        }
    }

    /**
     * Hide mobile project overlay
     */
    hideMobileProject() {
        const { projectOverlay } = this.elements;
        
        if (!projectOverlay) return;

        try {
            projectOverlay.classList.remove('active');
        } catch (error) {
            console.error('Error in hideMobileProject:', error);
        }
    }

    /**
     * Show error state when something goes wrong
     */
    showErrorState() {
        if (!this.elements.projectsList) return;
        
        this.elements.projectsList.innerHTML = `
            <div class="error-state" style="text-align: center; padding: 2rem; color: var(--text-secondary);">
                <p>Sorry, there was an error loading the projects.</p>
                <button onclick="location.reload()" style="margin-top: 1rem; padding: 0.5rem 1rem; border: 1px solid var(--border); border-radius: 6px; background: none; cursor: pointer;">
                    Try Again
                </button>
            </div>
        `;
    }

    /**
     * Utility: Debounce function calls
     */
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    /**
     * Utility: Escape HTML to prevent XSS
     */
    escapeHtml(text) {
        if (typeof text !== 'string') return '';
        
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    /**
     * Utility: Sanitize HTML content (allows basic HTML but prevents scripts)
     */
    sanitizeHtml(html) {
        if (typeof html !== 'string') return '';
        
        // Basic sanitization - remove script tags and on* attributes
        return html
            .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
            .replace(/\son\w+\s*=\s*["'][^"']*["']/gi, '')
            .replace(/javascript:/gi, '');
    }

    /**
     * Compute and set sticky top offset so that the project image aligns as requested
     */
    updateStickyTopOffset() {
        try {
            if (this.state.isMobile) return;
            const { projectContent } = this.elements;
            if (!projectContent) return;

            // Elements for reference
            const heroIcon = document.querySelector('.hero-header .dino-userpic');
            const hero = document.querySelector('.hero');
            const sidebar = document.querySelector('.projects-sidebar');
            const layout = document.querySelector('.projects-layout');
            if (!layout) return;

            const viewportTop = 0; // relative to viewport for sticky

            const heroRect = hero?.getBoundingClientRect();
            const iconRect = heroIcon?.getBoundingClientRect();
            const sidebarRect = sidebar?.getBoundingClientRect();

            let topOffset = 0;

            // Case 1: Hero title visible -> align image top with hero icon top
            if (heroRect && heroRect.bottom > 0) {
                if (iconRect) {
                    topOffset = Math.max(iconRect.top, 0);
                } else {
                    topOffset = Math.max(heroRect.top, 0);
                }
            } else if (sidebarRect && sidebarRect.top >= 0) {
                // Case 2: Hero scrolled past but sidebar top visible -> align with sidebar top
                topOffset = Math.max(sidebarRect.top, 0);
            } else {
                // Case 3: Neither hero nor sidebar visible -> stick to top
                topOffset = viewportTop;
            }

            // Apply as CSS variable on the container root
            const root = document.querySelector('.projects-page');
            if (root) {
                root.style.setProperty('--project-sticky-top', `${Math.round(topOffset)}px`);
            }
        } catch (e) {
            // Non-fatal
            console.debug('updateStickyTopOffset failed', e);
        }
    }

    /**
     * Compute sticky top for dino: starts aligned to bottom of subtitle area,
     * then centers vertically in viewport when scrolled past
     */
    updateDinoStickyTop() {
        try {
            if (this.state.isMobile) return;
            const root = document.querySelector('.projects-page');
            const hero = document.querySelector('.hero');
            const subtitle = document.querySelector('.hero .subtitle');
            const header = document.querySelector('header');

            if (!root || !hero) return;

            const headerRect = header?.getBoundingClientRect();
            const subtitleRect = subtitle?.getBoundingClientRect();
            const heroRect = hero.getBoundingClientRect();

            // Base offset: align dino top to just under the subtitle bottom while hero is on screen
            let desiredTop = 0;
            if (heroRect.bottom > 0) {
                const baseline = subtitleRect ? subtitleRect.bottom : heroRect.bottom - 8;
                desiredTop = Math.max(Math.round(baseline), 0);
            } else {
                // When hero is scrolled past, center dino vertically in viewport
                desiredTop = Math.round((window.innerHeight - 400) / 2); // 400px approx dino height
            }

            // Ensure it doesn't overlap nav; add tiny offset under header if visible
            if (headerRect && headerRect.bottom > 0) {
                desiredTop = Math.max(desiredTop, Math.round(headerRect.bottom + 8));
            }

            root.style.setProperty('--dino-sticky-top', `${desiredTop}px`);
        } catch (e) {
            console.debug('updateDinoStickyTop failed', e);
        }
    }
}

// Initialize when DOM is ready
let projectsManager = null;

async function initializeProjects() {
    try {
        // Clean up existing instance if any
        if (projectsManager) {
            projectsManager.cleanup();
        }
        
        // Load projects data first
        await loadProjectsData();
        
        // Create new instance
        projectsManager = new ProjectManager();
        
        // Make it globally accessible for testing/debugging
        if (typeof window !== 'undefined') {
            window.projectsManager = projectsManager;
        }
        
    } catch (error) {
        console.error('Failed to initialize projects:', error);
        // Show error state if data loading fails
        showProjectsLoadingError();
    }
}

function showProjectsLoadingError() {
    const projectsList = document.querySelector('.projects-list');
    if (projectsList) {
        projectsList.innerHTML = `
            <div class="error-state" style="text-align: center; padding: 2rem; color: var(--text-secondary);">
                <p>Sorry, there was an error loading the projects data.</p>
                <button onclick="location.reload()" style="margin-top: 1rem; padding: 0.5rem 1rem; border: 1px solid var(--border); border-radius: 6px; background: none; cursor: pointer;">
                    Try Again
                </button>
            </div>
        `;
    }
}

// Auto-initialize
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeProjects);
} else {
    initializeProjects();
}

// Export for external access if needed
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { ProjectsManager: ProjectManager, initializeProjects };
}