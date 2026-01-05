// Navigation functionality
const nav = document.getElementById('nav');
const navToggle = document.getElementById('navToggle');
const navLinks = document.querySelector('.nav-links');

// Handle scroll effect on navigation
let lastScroll = 0;
window.addEventListener('scroll', () => {
    const currentScroll = window.pageYOffset;
    
    if (currentScroll > 50) {
        nav.classList.add('scrolled');
    } else {
        nav.classList.remove('scrolled');
    }
    
    lastScroll = currentScroll;
});

// Mobile navigation toggle
if (navToggle) {
    navToggle.addEventListener('click', () => {
        navLinks.classList.toggle('active');
        navToggle.classList.toggle('active');
    });
}

// Close mobile menu when clicking on a link
document.querySelectorAll('.nav-links a').forEach(link => {
    link.addEventListener('click', () => {
        navLinks.classList.remove('active');
        navToggle.classList.remove('active');
    });
});

// Smooth scroll for anchor links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            const navHeight = nav.offsetHeight;
            const targetPosition = target.offsetTop - navHeight;
            
            window.scrollTo({
                top: targetPosition,
                behavior: 'smooth'
            });
        }
    });
});

// Scroll reveal animation
const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
};

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('active');
        }
    });
}, observerOptions);

// Observe all sections and project cards
document.querySelectorAll('section, .project-card, .project-item').forEach(el => {
    el.classList.add('reveal');
    observer.observe(el);
});

// Project card interactions
document.querySelectorAll('.project-card').forEach(card => {
    card.addEventListener('click', function() {
        // Add your project detail modal or navigation logic here
        console.log('Project clicked:', this.dataset.project);
        // Example: window.location.href = `project-${this.dataset.project}.html`;
    });
});

// Expandable project items
document.querySelectorAll('.project-item.expandable').forEach(item => {
    item.addEventListener('click', function(e) {
        // Toggle expanded state
        this.classList.toggle('expanded');
        
        // Scroll to expanded item if it's being opened
        if (this.classList.contains('expanded')) {
            setTimeout(() => {
                this.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            }, 100);
        }
    });
    
    // Remove hover transform for expandable items
    item.addEventListener('mouseenter', function() {
        if (!this.classList.contains('expanded')) {
            this.style.transform = 'translateX(5px)';
        }
    });
    
    item.addEventListener('mouseleave', function() {
        if (!this.classList.contains('expanded')) {
            this.style.transform = 'translateX(0)';
        }
    });
});

// Update current year in footer
const currentYear = new Date().getFullYear();
const yearElement = document.getElementById('currentYear');
if (yearElement) {
    yearElement.textContent = currentYear;
}

// Parallax effect for hero section (subtle)
window.addEventListener('scroll', () => {
    const scrolled = window.pageYOffset;
    const hero = document.querySelector('.hero');
    if (hero && scrolled < window.innerHeight) {
        hero.style.transform = `translateY(${scrolled * 0.5}px)`;
        hero.style.opacity = 1 - (scrolled / window.innerHeight) * 0.5;
    }
});

// Add loading animation
window.addEventListener('load', () => {
    document.body.classList.add('loaded');
});

// Keyboard navigation support
document.addEventListener('keydown', (e) => {
    // ESC key closes mobile menu
    if (e.key === 'Escape' && navLinks.classList.contains('active')) {
        navLinks.classList.remove('active');
        navToggle.classList.remove('active');
    }
});

// Smooth reveal for skills on scroll
const skillsObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry, index) => {
        if (entry.isIntersecting) {
            setTimeout(() => {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
            }, index * 50);
        }
    });
}, { threshold: 0.1 });

document.querySelectorAll('.skills-grid span').forEach(skill => {
    skill.style.opacity = '0';
    skill.style.transform = 'translateY(10px)';
    skill.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
    skillsObserver.observe(skill);
});

// Local video play functionality
const homeMonitorContainer = document.getElementById('home-monitor-video-container');
const homeMonitorThumbnail = document.getElementById('home-monitor-thumbnail');
const homeMonitorVideo = document.getElementById('home-monitor-video');
const homeMonitorPlay = document.getElementById('home-monitor-play');

if (homeMonitorContainer && homeMonitorThumbnail && homeMonitorVideo && homeMonitorPlay) {
    homeMonitorContainer.addEventListener('click', function() {
        if (homeMonitorVideo.style.display === 'none') {
            homeMonitorThumbnail.style.display = 'none';
            homeMonitorPlay.style.display = 'none';
            homeMonitorVideo.style.display = 'block';
            homeMonitorVideo.play();
        }
    });
}

