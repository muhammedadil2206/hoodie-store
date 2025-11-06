/**
 * HEIME - About Page JavaScript File
 * Handles mobile navigation and interactive elements
 */

// ===========================
// Mobile Menu Toggle
// ===========================

// Get DOM elements
const hamburger = document.getElementById('hamburger');
const navMenu = document.getElementById('navMenu');

// Toggle mobile menu on hamburger click
if (hamburger && navMenu) {
    hamburger.addEventListener('click', () => {
        hamburger.classList.toggle('active');
        navMenu.classList.toggle('active');
    });
}

// Close mobile menu when clicking on a nav link
const navLinks = document.querySelectorAll('.nav-link');

navLinks.forEach(link => {
    link.addEventListener('click', (e) => {
        if (hamburger && navMenu) {
            hamburger.classList.remove('active');
            navMenu.classList.remove('active');
        }
        // Debug: log the link being clicked
        console.log('Navigating to:', link.getAttribute('href'));
    });
});

// Close mobile menu when clicking outside
document.addEventListener('click', (e) => {
    if (hamburger && navMenu) {
        if (!hamburger.contains(e.target) && !navMenu.contains(e.target)) {
            hamburger.classList.remove('active');
            navMenu.classList.remove('active');
        }
    }
});

// ===========================
// Active Page Highlighting
// ===========================

// Get current page from URL
const currentPage = window.location.pathname.split('/').pop() || 'about.html';

// Update active nav link based on current page
navLinks.forEach(link => {
    const linkPage = link.getAttribute('href');
    
    // Remove active class from all links first
    link.classList.remove('active');
    
    // Add active class to matching link
    if (linkPage === currentPage || 
        (currentPage === 'about.html' && linkPage.includes('about.html'))) {
        link.classList.add('active');
    }
});

// ===========================
// Navbar Scroll Effect
// ===========================

let lastScroll = 0;
const navbar = document.querySelector('header');

if (navbar) {
    window.addEventListener('scroll', () => {
        const currentScroll = window.pageYOffset;
        
        // Add shadow on scroll
        if (currentScroll > 0) {
            navbar.style.boxShadow = '0 2px 20px rgba(0, 0, 0, 0.2)';
        } else {
            navbar.style.boxShadow = '0 2px 10px rgba(0, 0, 0, 0.1)';
        }
        
        lastScroll = currentScroll;
    });
}

// ===========================
// Scroll Animation Observer
// ===========================

// Fade in elements on scroll
const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -100px 0px'
};

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.style.opacity = '1';
            entry.target.style.transform = 'translateY(0)';
        }
    });
}, observerOptions);

// Observe all feature cards for scroll animation
const featureCards = document.querySelectorAll('.feature-card');

featureCards.forEach((card, index) => {
    // Set initial state
    card.style.opacity = '0';
    card.style.transform = 'translateY(30px)';
    card.style.transition = `all 0.6s ease ${index * 0.1}s`;
    
    // Observe the card
    observer.observe(card);
});

// ===========================
// Console Welcome Message
// ===========================

console.log('%cWelcome to HEIME - About Page! 👗', 'color: #FF6600; font-size: 20px; font-weight: bold;');
console.log('%cLearn more about our story and mission', 'color: #1a1a1a; font-size: 14px;');

