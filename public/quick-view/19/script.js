/**
 * HEIME - Product Detail Page JavaScript
 * Handles mobile navigation and interactive elements
 */

// ===========================
// Mobile Menu Toggle
// ===========================

const hamburger = document.getElementById('hamburger');
const navMenu = document.getElementById('navMenu');

if (hamburger && navMenu) {
    hamburger.addEventListener('click', () => {
        hamburger.classList.toggle('active');
        navMenu.classList.toggle('active');
    });
}

const navLinks = document.querySelectorAll('.nav-link');

navLinks.forEach(link => {
    link.addEventListener('click', (e) => {
        if (hamburger && navMenu) {
            hamburger.classList.remove('active');
            navMenu.classList.remove('active');
        }
    });
});

document.addEventListener('click', (e) => {
    if (hamburger && navMenu) {
        if (!hamburger.contains(e.target) && !navMenu.contains(e.target)) {
            hamburger.classList.remove('active');
            navMenu.classList.remove('active');
        }
    }
});

// ===========================
// Add to Cart / Buy Now
// ===========================

const addToCartBtn = document.querySelector('.add-to-cart-btn');
const buyNowBtn = document.querySelector('.buy-now-btn');

if (addToCartBtn) {
    addToCartBtn.addEventListener('click', () => {
        alert('Product added to cart!');
    });
}

if (buyNowBtn) {
    buyNowBtn.addEventListener('click', () => {
        alert('Redirecting to checkout...');
    });
}

// ===========================
// Navbar Scroll Effect
// ===========================

const navbar = document.querySelector('header');

if (navbar) {
    window.addEventListener('scroll', () => {
        const currentScroll = window.pageYOffset;
        
        if (currentScroll > 0) {
            navbar.style.boxShadow = '0 2px 20px rgba(0, 0, 0, 0.2)';
        } else {
            navbar.style.boxShadow = '0 2px 10px rgba(0, 0, 0, 0.1)';
        }
    });
}

console.log('%cSan Sebastian Hoodie - Product Detail', 'color: #FF6600; font-size: 18px; font-weight: bold;');


