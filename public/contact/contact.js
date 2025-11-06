/**
 * HEIME - Contact Page JavaScript File
 * Handles mobile navigation, form validation, and interactive elements
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
const currentPage = window.location.pathname.split('/').pop() || 'contact.html';

// Update active nav link based on current page
navLinks.forEach(link => {
    const linkPage = link.getAttribute('href');
    
    // Remove active class from all links first
    link.classList.remove('active');
    
    // Add active class to matching link
    if (linkPage === currentPage || 
        (currentPage === 'contact.html' && linkPage.includes('contact.html'))) {
        link.classList.add('active');
    }
});

// ===========================
// Contact Form Handling
// ===========================

const contactForm = document.getElementById('contactForm');

if (contactForm) {
    contactForm.addEventListener('submit', (e) => {
        e.preventDefault();
        
        // Get form data
        const formData = new FormData(contactForm);
        const name = formData.get('name');
        const email = formData.get('email');
        const phone = formData.get('phone');
        const subject = formData.get('subject');
        const message = formData.get('message');
        
        // Basic validation
        if (!name || !email || !subject || !message) {
            alert('Please fill in all required fields.');
            return;
        }
        
        // Email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            alert('Please enter a valid email address.');
            return;
        }
        
        // Disable submit button to prevent double submission
        const submitButton = contactForm.querySelector('.submit-button');
        const originalButtonText = submitButton.textContent;
        submitButton.disabled = true;
        submitButton.textContent = 'Sending...';
        
        // Send form data to server
        fetch('/api/contact', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                name,
                email,
                phone,
                subject,
                message
            })
        })
        .then(response => {
            // Check if response is ok
            if (!response.ok) {
                return response.json().then(data => {
                    throw new Error(data.message || 'Server error');
                });
            }
            return response.json();
        })
        .then(data => {
            if (data.success) {
                // Show success message
                alert(data.message || 'Thank you for contacting us! We will get back to you as soon as possible.');
                // Reset form
                contactForm.reset();
            } else {
                // Show error message
                alert(data.message || 'Sorry, there was an error. Please try again.');
            }
        })
        .catch(error => {
            console.error('Error:', error);
            // Check if it's a network error
            if (error.message === 'Failed to fetch' || error.message === 'NetworkError') {
                alert('Cannot connect to server. Please make sure the server is running and try again.');
            } else {
                alert(error.message || 'Sorry, there was an error sending your message. Please try again later.');
            }
        })
        .finally(() => {
            // Re-enable submit button
            submitButton.disabled = false;
            submitButton.textContent = originalButtonText;
        });
    });
}

// ===========================
// Form Input Animations
// ===========================

const formInputs = document.querySelectorAll('.form-input, .form-textarea');

formInputs.forEach(input => {
    // Add focus animation
    input.addEventListener('focus', () => {
        input.parentElement.classList.add('focused');
    });
    
    // Remove focus animation
    input.addEventListener('blur', () => {
        if (!input.value) {
            input.parentElement.classList.remove('focused');
        }
    });
    
    // Check if input has value on load (for autofill)
    if (input.value) {
        input.parentElement.classList.add('focused');
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

// Observe all contact items for scroll animation
const contactItems = document.querySelectorAll('.contact-item');

contactItems.forEach((item, index) => {
    // Set initial state
    item.style.opacity = '0';
    item.style.transform = 'translateY(30px)';
    item.style.transition = `all 0.6s ease ${index * 0.1}s`;
    
    // Observe the item
    observer.observe(item);
});

// ===========================
// Console Welcome Message
// ===========================

console.log('%cWelcome to HEIME - Contact Page! 👗', 'color: #FF6600; font-size: 20px; font-weight: bold;');
console.log('%cGet in touch with us - we\'d love to hear from you!', 'color: #1a1a1a; font-size: 14px;');

