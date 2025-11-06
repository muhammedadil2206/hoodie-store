/**
 * HEIME - Main JavaScript File
 * Handles mobile navigation and interactive elements
 */

// ===========================
// Mobile Menu Toggle
// ===========================

// Get DOM elements
const hamburger = document.getElementById('hamburger');
const navMenu = document.getElementById('navMenu');

// Toggle mobile menu on hamburger click
hamburger.addEventListener('click', () => {
    hamburger.classList.toggle('active');
    navMenu.classList.toggle('active');
});

// Close mobile menu when clicking on a nav link
const navLinks = document.querySelectorAll('.nav-link');

navLinks.forEach(link => {
    link.addEventListener('click', (e) => {
        hamburger.classList.remove('active');
        navMenu.classList.remove('active');
        // Debug: log the link being clicked
        console.log('Navigating to:', link.getAttribute('href'));
    });
});

// Close mobile menu when clicking outside
document.addEventListener('click', (e) => {
    if (!hamburger.contains(e.target) && !navMenu.contains(e.target)) {
        hamburger.classList.remove('active');
        navMenu.classList.remove('active');
    }
});

// ===========================
// Smooth Scroll for CTA Button
// ===========================

// Smooth scroll to shop section (if on same page)
const ctaButton = document.querySelector('.cta-button');

if (ctaButton && window.location.pathname.includes('index.html')) {
    ctaButton.addEventListener('click', (e) => {
        // Only prevent default if products section exists on this page
        const productsSection = document.querySelector('.products-section');
        if (productsSection && ctaButton.getAttribute('href') === '#shop') {
            e.preventDefault();
            productsSection.scrollIntoView({ behavior: 'smooth' });
        }
    });
}

// ===========================
// Product Quick View
// ===========================
// Quick View buttons are now links that navigate to product detail pages
// No JavaScript needed - links handle navigation automatically

// ===========================
// Scroll Animation Observer
// ===========================

// Fade in elements on scroll (optional enhancement)
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

// Observe all product cards for scroll animation
const productCards = document.querySelectorAll('.product-card');

productCards.forEach((card, index) => {
    // Set initial state
    card.style.opacity = '0';
    card.style.transform = 'translateY(30px)';
    card.style.transition = `all 0.6s ease ${index * 0.1}s`;
    
    // Observe the card
    observer.observe(card);
});

// ===========================
// Active Page Highlighting
// ===========================

// Get current page from URL
const currentPage = window.location.pathname.split('/').pop() || 'index.html';

// Update active nav link based on current page
navLinks.forEach(link => {
    const linkPage = link.getAttribute('href');
    
    // Remove active class from all links first
    link.classList.remove('active');
    
    // Add active class to matching link
    if (linkPage === currentPage || (currentPage === '' && linkPage === 'index.html')) {
        link.classList.add('active');
    }
});

// ===========================
// Navbar Scroll Effect (Optional)
// ===========================

let lastScroll = 0;
const navbar = document.querySelector('header');

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

// ===========================
// Console Welcome Message
// ===========================

console.log('%cWelcome to HEIME! 👗', 'color: #FF6600; font-size: 20px; font-weight: bold;');
console.log('%cDiscover the latest premium hoodies', 'color: #1a1a1a; font-size: 14px;');