/**
 * HEIME - Authentication Helper
 * Checks login status and protects cart/buy functionality
 */

let isAuthenticated = false;
let currentUser = null;

// Check authentication status on page load
async function checkAuth() {
    try {
        const response = await fetch('/api/auth/check', {
            credentials: 'include'
        });
        const data = await response.json();
        
        if (data.authenticated) {
            isAuthenticated = true;
            currentUser = data.user;
            updateNavForLoggedIn();
        } else {
            isAuthenticated = false;
            currentUser = null;
            updateNavForLoggedOut();
        }
    } catch (error) {
        console.error('Error checking auth:', error);
        isAuthenticated = false;
        updateNavForLoggedOut();
    }
}

// Update navigation for logged in users
function updateNavForLoggedIn() {
    const signupBtn = document.querySelector('.signup-btn');
    const loginBtn = document.querySelector('.login-btn');
    const userMenu = document.getElementById('userMenu');
    const cartLink = document.querySelector('.cart-link');
    
    if (signupBtn) signupBtn.parentElement.style.display = 'none';
    if (loginBtn) loginBtn.parentElement.style.display = 'none';
    
    if (userMenu) {
        userMenu.style.display = 'block';
        const userLink = userMenu.querySelector('a.user-name');
        if (userLink) {
            // Display username if available, otherwise use email prefix
            userLink.textContent = currentUser.username || currentUser.email.split('@')[0];
        }
    }
    
    // Show cart link when logged in
    if (cartLink) {
        cartLink.parentElement.style.display = 'block';
        cartLink.style.setProperty('display', 'flex', 'important');
    }
    
    // Enable cart/buy buttons
    enableCartButtons();
}

// Update navigation for logged out users
function updateNavForLoggedOut() {
    const signupBtn = document.querySelector('.signup-btn');
    const loginBtn = document.querySelector('.login-btn');
    const userMenu = document.getElementById('userMenu');
    const cartLink = document.querySelector('.cart-link');
    
    if (signupBtn) signupBtn.parentElement.style.display = 'block';
    if (loginBtn) loginBtn.parentElement.style.display = 'block';
    
    if (userMenu) {
        userMenu.style.display = 'none';
    }
    
    // Hide cart link when logged out
    if (cartLink) {
        cartLink.parentElement.style.display = 'none';
        cartLink.style.setProperty('display', 'none', 'important');
    }
    
    // Disable cart/buy buttons
    disableCartButtons();
}

// Enable cart and buy buttons
function enableCartButtons() {
    const cartButtons = document.querySelectorAll('.add-to-cart-btn, .buy-now-btn');
    cartButtons.forEach(btn => {
        btn.disabled = false;
        btn.style.opacity = '1';
        btn.style.cursor = 'pointer';
    });
}

// Disable cart and buy buttons
function disableCartButtons() {
    const cartButtons = document.querySelectorAll('.add-to-cart-btn, .buy-now-btn');
    cartButtons.forEach(btn => {
        btn.disabled = true;
        btn.style.opacity = '0.6';
        btn.style.cursor = 'not-allowed';
    });
}

// Protect cart/buy actions
function protectCartAction(action, callback) {
    console.log('protectCartAction called, isAuthenticated:', isAuthenticated);
    if (!isAuthenticated) {
        // Get correct login path based on current page location
        let loginPath = 'auth/login.html';
        if (window.location.pathname.includes('quick-view/')) {
            loginPath = '../../auth/login.html';
        } else if (window.location.pathname.includes('/shop/') || window.location.pathname.includes('/about/') || window.location.pathname.includes('/contact/') || window.location.pathname.includes('/cart/')) {
            loginPath = '../auth/login.html';
        }
        alert('Please login to add items to cart or make a purchase.');
        window.location.href = loginPath + '?return=' + encodeURIComponent(window.location.pathname);
        return;
    }
    console.log('User authenticated, executing callback');
    callback();
}

// Logout function
async function logout() {
    try {
        const response = await fetch('/api/auth/logout', {
            method: 'POST',
            credentials: 'include'
        });
        const data = await response.json();
        
        if (data.success) {
            isAuthenticated = false;
            currentUser = null;
            updateNavForLoggedOut();
            window.location.href = '../index.html';
        }
    } catch (error) {
        console.error('Error logging out:', error);
    }
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    checkAuth();
    
    // Wait for CartManager to be available before setting up buttons
    function waitForCartManager(callback, maxAttempts = 50) {
        if (window.CartManager) {
            console.log('CartManager is available');
            callback();
            return;
        }
        
        if (maxAttempts <= 0) {
            console.error('CartManager failed to load after multiple attempts');
            alert('Cart system failed to load. Please refresh the page.');
            return;
        }
        
        setTimeout(() => {
            waitForCartManager(callback, maxAttempts - 1);
        }, 100);
    }
    
    waitForCartManager(() => {
        // Add logout handler if logout button exists
        const logoutBtn = document.querySelector('.logout-btn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', (e) => {
                e.preventDefault();
                logout();
            });
        }
        
        // Protect add to cart buttons - remove existing handlers and add protected ones
        const addToCartBtns = document.querySelectorAll('.add-to-cart-btn');
        console.log('Found add to cart buttons:', addToCartBtns.length);
        addToCartBtns.forEach((btn, index) => {
            // Clone button to remove all event listeners
            const newBtn = btn.cloneNode(true);
            btn.parentNode.replaceChild(newBtn, btn);
            
            newBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('Add to cart button clicked, button index:', index);
                protectCartAction('add-to-cart', () => {
                    console.log('Adding to cart from button:', index);
                    addToCartFromButton(newBtn);
                });
            });
        });
        
        // Protect buy now buttons
        const buyNowBtns = document.querySelectorAll('.buy-now-btn');
        console.log('Found buy now buttons:', buyNowBtns.length);
        buyNowBtns.forEach((btn, index) => {
            // Clone button to remove all event listeners
            const newBtn = btn.cloneNode(true);
            btn.parentNode.replaceChild(newBtn, btn);
            
            newBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('Buy now button clicked, button index:', index);
                protectCartAction('buy-now', () => {
                    console.log('Buy now - adding to cart and redirecting');
                    addToCartFromButton(newBtn);
                    setTimeout(() => {
                        // Get correct cart path based on current page location
                        let cartPath = 'cart/cart.html';
                        if (window.location.pathname.includes('quick-view/')) {
                            cartPath = '../../cart/cart.html';
                        } else if (window.location.pathname.includes('/shop/') || window.location.pathname.includes('/about/') || window.location.pathname.includes('/contact/')) {
                            cartPath = '../cart/cart.html';
                        }
                        console.log('Redirecting to cart:', cartPath);
                        window.location.href = cartPath;
                    }, 500);
                });
            });
        });
    });
});

// Add to cart function
function addToCartFromButton(button) {
    // CartManager should be available by now (we wait for it before setting up buttons)
    if (!window.CartManager) {
        console.error('CartManager not available! This should not happen.');
        alert('Cart system error. Please refresh the page and try again.');
        return;
    }

    // Try to get product info from product detail page
    const productTitle = document.querySelector('.product-title');
    const productPrice = document.querySelector('.product-price');
    const productImage = document.querySelector('#mainImage, .main-image img, .product-image img');
    
    if (!productTitle || !productPrice) {
        console.error('Product info not found');
        alert('Could not find product information. Please refresh the page and try again.');
        return;
    }

    // Get proper image path - always use URL to get product number
    let imagePath = '../../images/1.jpeg';
    const urlMatch = window.location.pathname.match(/quick-view\/(\d+)/);
    if (urlMatch) {
        imagePath = '../../images/' + urlMatch[1] + '.jpeg';
    } else if (productImage && productImage.src) {
        // Fallback: Extract from image src
        const imgSrc = productImage.src;
        const match = imgSrc.match(/images\/(\d+)\.jpeg/);
        if (match) {
            imagePath = '../../images/' + match[1] + '.jpeg';
        }
    }
    
    const product = {
        id: getProductId(),
        name: productTitle.textContent.trim(),
        price: productPrice.textContent.trim(),
        image: imagePath
    };
    
    console.log('Adding product to cart:', product);
    console.log('CartManager available:', !!window.CartManager);
    
    if (!window.CartManager) {
        console.error('CartManager is not available!');
        alert('Cart system error. Please refresh the page and try again.');
        return;
    }
    
    try {
        const result = window.CartManager.addItem(product);
        console.log('Add item result:', result);
        showCartNotification('Product added to cart!');
        const updatedCart = window.CartManager.getCart();
        console.log('Cart after adding:', updatedCart);
        
        // Force update cart count on all pages
        window.CartManager.updateCartCount();
        console.log('Cart count updated:', window.CartManager.getCartCount());
        
        // Trigger a custom event for cross-page updates
        if (typeof window.dispatchEvent !== 'undefined') {
            window.dispatchEvent(new CustomEvent('cartUpdated', { 
                detail: { count: window.CartManager.getCartCount() } 
            }));
        }
    } catch (error) {
        console.error('Error adding to cart:', error);
        console.error('Error stack:', error.stack);
        alert('Error adding product to cart: ' + error.message);
    }
}

// Get product ID from URL or page
function getProductId() {
    // Try to get from URL (quick-view/1/index.html)
    const match = window.location.pathname.match(/quick-view\/(\d+)/);
    if (match && match[1]) {
        console.log('Product ID from URL:', match[1]);
        return String(match[1]); // Ensure it's a string
    }
    
    // Try to get from image src
    const img = document.querySelector('#mainImage, .main-image img');
    if (img && img.src) {
        const imgMatch = img.src.match(/images\/(\d+)\.jpeg/);
        if (imgMatch && imgMatch[1]) {
            console.log('Product ID from image:', imgMatch[1]);
            return String(imgMatch[1]); // Ensure it's a string
        }
    }
    
    // Generate ID from product name (fallback)
    const productName = document.querySelector('.product-title');
    if (productName) {
        const nameId = productName.textContent.toLowerCase().replace(/\s+/g, '-');
        console.log('Product ID from name:', nameId);
        return nameId;
    }
    
    const fallbackId = Date.now().toString();
    console.log('Product ID fallback:', fallbackId);
    return fallbackId;
}

// Show cart notification
function showCartNotification(message) {
    // Create notification element
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 80px;
        right: 20px;
        background-color: #4caf50;
        color: white;
        padding: 16px 24px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        z-index: 10000;
        animation: slideIn 0.3s ease;
    `;
    notification.textContent = message;
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => notification.remove(), 300);
    }, 2000);
    
    // Update cart count if CartManager available
    if (window.CartManager) {
        window.CartManager.updateCartCount();
    }
}

// Add CSS for notification animation
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    @keyframes slideOut {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(100%);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);
