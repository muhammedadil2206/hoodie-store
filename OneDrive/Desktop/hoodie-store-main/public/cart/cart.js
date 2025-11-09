/**
 * HEIME - Cart Page JavaScript
 * Manages shopping cart functionality
 */

// Cart management functions
const CartManager = {
    // Get cart from localStorage
    getCart: function() {
        const cart = localStorage.getItem('heime_cart');
        return cart ? JSON.parse(cart) : [];
    },

    // Save cart to localStorage
    saveCart: function(cart) {
        localStorage.setItem('heime_cart', JSON.stringify(cart));
        this.updateCartCount();
    },

    // Add item to cart
    addItem: function(product) {
        try {
            console.log('CartManager.addItem called with:', product);
            const cart = this.getCart();
            console.log('Current cart:', cart);
            
            // Compare IDs as strings to ensure consistency
            const existingItem = cart.find(item => String(item.id) === String(product.id));

            if (existingItem) {
                existingItem.quantity += 1;
                console.log('Updated existing item quantity:', existingItem.quantity);
            } else {
                const newItem = {
                    id: product.id,
                    name: product.name,
                    price: product.price,
                    image: product.image,
                    quantity: 1
                };
                cart.push(newItem);
                console.log('Added new item to cart:', newItem);
            }

            this.saveCart(cart);
            console.log('Cart saved. New cart:', this.getCart());
            return cart;
        } catch (error) {
            console.error('Error in addItem:', error);
            throw error;
        }
    },

    // Remove item from cart
    removeItem: function(productId) {
        const cart = this.getCart();
        const filteredCart = cart.filter(item => String(item.id) !== String(productId));
        this.saveCart(filteredCart);
        return filteredCart;
    },

    // Update item quantity
    updateQuantity: function(productId, quantity) {
        if (quantity < 1) {
            return this.removeItem(productId);
        }

        const cart = this.getCart();
        const item = cart.find(item => String(item.id) === String(productId));
        
        if (item) {
            item.quantity = quantity;
            this.saveCart(cart);
        }
        
        return cart;
    },

    // Clear cart
    clearCart: function() {
        localStorage.removeItem('heime_cart');
        this.updateCartCount();
    },

    // Get cart count
    getCartCount: function() {
        const cart = this.getCart();
        return cart.reduce((total, item) => total + item.quantity, 0);
    },

    // Update cart count in navigation
    updateCartCount: function() {
        const count = this.getCartCount();
        const cartCountElements = document.querySelectorAll('#cartCount, .cart-count-badge');
        cartCountElements.forEach(el => {
            el.textContent = count;
            // Show/hide badge based on count
            if (count > 0) {
                el.style.display = 'inline-block';
            } else {
                el.style.display = 'inline-block'; // Always show, even if 0
            }
        });
        console.log('Cart count updated to:', count, 'on', cartCountElements.length, 'elements');
    },

    // Calculate total
    calculateTotal: function() {
        const cart = this.getCart();
        return cart.reduce((total, item) => {
            const price = parseFloat(item.price.replace(' AED', '').replace(',', ''));
            return total + (price * item.quantity);
        }, 0);
    }
};

// Render cart items
function renderCart() {
    console.log('Rendering cart...');
    const cart = CartManager.getCart();
    console.log('Cart items:', cart);
    const cartItemsContainer = document.querySelector('.cart-items');
    const emptyCart = document.getElementById('emptyCart');
    const cartContent = document.getElementById('cartContent');

    if (!cartItemsContainer || !emptyCart || !cartContent) {
        console.error('Cart elements not found');
        return;
    }

    if (cart.length === 0) {
        emptyCart.style.display = 'block';
        cartContent.style.display = 'none';
        return;
    }

    emptyCart.style.display = 'none';
    cartContent.style.display = 'grid';

    cartItemsContainer.innerHTML = cart.map(item => {
        // Fix image path if needed - cart page is in public/cart/
        let imagePath = item.image;
        if (imagePath) {
            // If it's already a relative path starting with ../, keep it
            if (imagePath.startsWith('../')) {
                // Already correct
            } else if (imagePath.includes('images/')) {
                // Extract just the images/X.jpeg part and add relative path
                const match = imagePath.match(/images\/(\d+\.jpeg)/);
                if (match) {
                    imagePath = '../../images/' + match[1];
                } else {
                    imagePath = '../../' + imagePath;
                }
            } else {
                // Default fallback
                imagePath = '../../images/1.jpeg';
            }
        } else {
            imagePath = '../../images/1.jpeg';
        }
        
        return `
        <div class="cart-item" data-id="${item.id}">
            <div class="cart-item-image">
                <img src="${imagePath}" alt="${item.name}" onerror="this.src='../../images/1.jpeg'">
            </div>
            <div class="cart-item-details">
                <h3 class="cart-item-name">${item.name}</h3>
                <p class="cart-item-price">${item.price}</p>
                <div class="cart-item-controls">
                    <div class="quantity-control">
                        <button class="quantity-btn" onclick="decreaseQuantity('${item.id}')">-</button>
                        <input type="number" class="quantity-input" value="${item.quantity}" min="1" 
                               onchange="updateQuantityInput('${item.id}', this.value)">
                        <button class="quantity-btn" onclick="increaseQuantity('${item.id}')">+</button>
                    </div>
                    <button class="remove-btn" onclick="removeFromCart('${item.id}')">Remove</button>
                </div>
            </div>
        </div>
        `;
    }).join('');

    updateSummary();
}

// Update cart summary
function updateSummary() {
    const total = CartManager.calculateTotal();
    document.getElementById('subtotal').textContent = `${total.toFixed(0)} AED`;
    document.getElementById('total').textContent = `${total.toFixed(0)} AED`;
}

// Quantity controls
function increaseQuantity(productId) {
    const cart = CartManager.getCart();
    const item = cart.find(item => item.id === productId);
    if (item) {
        CartManager.updateQuantity(productId, item.quantity + 1);
        renderCart();
    }
}

function decreaseQuantity(productId) {
    const cart = CartManager.getCart();
    const item = cart.find(item => item.id === productId);
    if (item && item.quantity > 1) {
        CartManager.updateQuantity(productId, item.quantity - 1);
        renderCart();
    }
}

function updateQuantityInput(productId, quantity) {
    const qty = parseInt(quantity) || 1;
    CartManager.updateQuantity(productId, qty);
    renderCart();
}

// Remove from cart
function removeFromCart(productId) {
    if (confirm('Are you sure you want to remove this item from your cart?')) {
        CartManager.removeItem(productId);
        renderCart();
    }
}

// Checkout - initialize when DOM is ready
function initializeCheckout() {
    const checkoutBtn = document.getElementById('checkoutBtn');
    if (checkoutBtn) {
        checkoutBtn.addEventListener('click', function() {
            // Check if user is logged in (check auth status)
            checkAuthStatus().then(isAuth => {
                if (!isAuth) {
                    alert('Please login to proceed with checkout.');
                    window.location.href = '../auth/login.html?return=' + encodeURIComponent(window.location.pathname);
                    return;
                }

                const cart = CartManager.getCart();
                if (cart.length === 0) {
                    alert('Your cart is empty!');
                    return;
                }

                const total = CartManager.calculateTotal();
                const orderSummary = cart.map(item => 
                    `${item.name} x${item.quantity} - ${item.price}`
                ).join('\n');

                if (confirm(`Proceed to checkout?\n\n${orderSummary}\n\nTotal: ${total.toFixed(0)} AED`)) {
                    // Redirect to payment page
                    window.location.href = '../payment/payment.html';
                }
            });
        });
    }
}

// Check authentication status
function checkAuthStatus() {
    return fetch('/api/auth/check', {
        credentials: 'include'
    })
    .then(response => response.json())
    .then(data => {
        return data.authenticated || false;
    })
    .catch(error => {
        console.error('Error checking auth:', error);
        return false;
    });
}

// Make CartManager available globally IMMEDIATELY (before DOM loads)
// This must happen synchronously, not in any async callback
if (typeof window !== 'undefined') {
    window.CartManager = CartManager;
    console.log('CartManager initialized and available globally', window.CartManager);
} else {
    // Fallback if window is not available yet
    this.CartManager = CartManager;
}

// Initialize cart count on all pages
function initializeCart() {
    try {
        // Check if user is logged in before showing cart
        // This check will be done by auth.js, but we also check here for cart page access
        if (document.querySelector('.cart-items')) {
            // We're on the cart page - check authentication
            fetch('/api/auth/check', {
                credentials: 'include'
            })
            .then(response => response.json())
            .then(data => {
                if (!data.authenticated) {
                    // User not logged in, redirect to login
                    alert('Please login to access your cart');
                    window.location.href = '../auth/login.html';
                    return;
                }
                // User is logged in, proceed with cart
                console.log('Cart page detected, rendering cart...');
                renderCart();
                initializeCheckout();
            })
            .catch(error => {
                console.error('Error checking auth:', error);
                // On error, still try to render cart (graceful degradation)
                renderCart();
                initializeCheckout();
            });
        }
        
        // Update cart count immediately (only if cart link is visible)
        CartManager.updateCartCount();
        console.log('Cart initialized. Count:', CartManager.getCartCount());
        
        // Set up a listener to update cart count when storage changes (for cross-tab sync)
        window.addEventListener('storage', function(e) {
            if (e.key === 'heime_cart') {
                CartManager.updateCartCount();
                console.log('Cart updated from storage event');
            }
        });
        
        // Listen for custom cart update events
        window.addEventListener('cartUpdated', function(e) {
            CartManager.updateCartCount();
            console.log('Cart updated from custom event:', e.detail);
        });
        
    } catch (error) {
        console.error('Error initializing cart:', error);
    }
}

// Wait for DOM to be ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeCart);
} else {
    // DOM already loaded, initialize immediately
    setTimeout(initializeCart, 100);
}

// Also update cart count periodically to ensure it stays in sync
setInterval(function() {
    if (window.CartManager) {
        CartManager.updateCartCount();
    }
}, 1000);

