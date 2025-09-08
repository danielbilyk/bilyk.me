// Sample projects data - you can replace this with your actual projects
const projects = [
    {
        id: 'project-1',
        title: 'Sample Project 1',
        year: '2024',
        summary: 'A brief description of the first project.',
        description: 'This is a more detailed description of the first project. Here you can explain what the project is about, what technologies were used, and what problems it solves.',
        image: 'https://via.placeholder.com/600x400/E5F3FD/171717?text=Project+1',
        link: 'https://example.com'
    },
    {
        id: 'project-2',
        title: 'Sample Project 2',
        year: '2023',
        summary: 'A brief description of the second project.',
        description: 'This is a more detailed description of the second project. You can describe the challenges you faced, the solutions you implemented, and the results you achieved.',
        image: 'https://via.placeholder.com/600x400/E5F3FD/171717?text=Project+2',
        link: null // No link for this project
    },
    {
        id: 'project-3',
        title: 'Sample Project 3',
        year: '2023',
        summary: 'A brief description of the third project.',
        description: 'This is a more detailed description of the third project. Feel free to add any relevant information about the project scope, team collaboration, or lessons learned.',
        image: 'https://via.placeholder.com/600x400/E5F3FD/171717?text=Project+3',
        link: 'https://example.com'
    }
];

let currentProject = null;
let isMobile = false;

// Check if we're on mobile
function checkMobile() {
    isMobile = window.innerWidth <= 768;
}

// Initialize mobile check
checkMobile();
window.addEventListener('resize', checkMobile);

function createProjectElement(project) {
    const projectEl = document.createElement('div');
    projectEl.className = 'project-item';
    projectEl.dataset.projectId = project.id;
    
    projectEl.innerHTML = `
        <div class="project-title">${project.title}</div>
        <div class="project-year">${project.year}</div>
        <div class="project-summary">${project.summary}</div>
    `;
    
    return projectEl;
}

function showProject(project) {
    if (isMobile) {
        showMobileProject(project);
    } else {
        showDesktopProject(project);
    }
}

function showDesktopProject(project) {
    const projectContent = document.getElementById('project-content');
    const projectImg = document.getElementById('project-img');
    const projectTitle = document.getElementById('project-title');
    const projectDescription = document.getElementById('project-description');
    const projectLink = document.getElementById('project-link');
    const dinoNeck = document.querySelector('.dino-neck');
    
    // Hide nodding dino
    if (dinoNeck) {
        dinoNeck.classList.add('hidden');
    }
    
    // Update project content
    projectImg.src = project.image;
    projectImg.alt = project.title;
    projectTitle.textContent = project.title;
    projectDescription.textContent = project.description;
    
    // Handle project link
    if (project.link) {
        projectLink.href = project.link;
        projectLink.style.display = 'inline-flex';
    } else {
        projectLink.style.display = 'none';
    }
    
    // Show project content with animation
    projectContent.style.display = 'flex';
    setTimeout(() => {
        projectContent.classList.add('active');
    }, 50);
    
    currentProject = project.id;
}

function showMobileProject(project) {
    const overlay = document.getElementById('project-overlay');
    const overlayImg = document.getElementById('overlay-project-img');
    const overlayTitle = document.getElementById('overlay-project-title');
    const overlayDescription = document.getElementById('overlay-project-description');
    const overlayLink = document.getElementById('overlay-project-link');
    
    // Update overlay content
    overlayImg.src = project.image;
    overlayImg.alt = project.title;
    overlayTitle.textContent = project.title;
    overlayDescription.textContent = project.description;
    
    // Handle project link
    if (project.link) {
        overlayLink.href = project.link;
        overlayLink.style.display = 'inline-flex';
    } else {
        overlayLink.style.display = 'none';
    }
    
    // Show overlay
    overlay.classList.add('active');
    currentProject = project.id;
}

function hideProject() {
    if (isMobile) {
        hideMobileProject();
    } else {
        hideDesktopProject();
    }
}

function hideDesktopProject() {
    const projectContent = document.getElementById('project-content');
    const dinoNeck = document.querySelector('.dino-neck');
    
    // Hide project content
    projectContent.classList.remove('active');
    
    setTimeout(() => {
        projectContent.style.display = 'none';
        // Show nodding dino again
        if (dinoNeck) {
            dinoNeck.classList.remove('hidden');
        }
    }, 400);
    
    currentProject = null;
}

function hideMobileProject() {
    const overlay = document.getElementById('project-overlay');
    overlay.classList.remove('active');
    currentProject = null;
}

function initializeProjects() {
    const projectsList = document.querySelector('.projects-list');
    
    // Clear existing content
    projectsList.innerHTML = '';
    
    // Add projects
    projects.forEach(project => {
        const projectEl = createProjectElement(project);
        projectsList.appendChild(projectEl);
        
        // Add event listeners based on device type
        if (isMobile) {
            // On mobile, use click to open overlay
            projectEl.addEventListener('click', () => {
                showProject(project);
            });
        } else {
            // On desktop, use hover
            projectEl.addEventListener('mouseenter', () => {
                if (currentProject !== project.id) {
                    showProject(project);
                }
            });
        }
    });
    
    // Desktop hover behavior
    if (!isMobile) {
        const sidebar = document.querySelector('.projects-sidebar');
        const projectDetail = document.querySelector('.project-detail');
        const projectsLayout = document.querySelector('.projects-layout');
        
        // Hide project when leaving the entire projects area
        projectsLayout.addEventListener('mouseleave', () => {
            hideProject();
        });
    }
    
    // Add back button functionality for mobile
    const backButton = document.getElementById('back-button');
    if (backButton) {
        backButton.addEventListener('click', hideMobileProject);
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', initializeProjects);
