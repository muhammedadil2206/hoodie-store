/**
 * HEIME - Payment Page JavaScript
 * Handles payment form and checkout process
 */

// Load cart items and display order summary
function loadOrderSummary() {
    if (!window.CartManager) {
        console.error('CartManager not available');
        return;
    }

    const cart = window.CartManager.getCart();
    const orderItemsContainer = document.getElementById('orderItems');
    const subtotalEl = document.getElementById('subtotal');
    const totalEl = document.getElementById('totalAmount');
    const totalBtn = document.getElementById('totalBtn');

    if (cart.length === 0) {
        // Redirect to cart if empty
        window.location.href = '../cart/cart.html';
        return;
    }

    // Calculate totals
    const subtotal = window.CartManager.calculateTotal();
    const shipping = 0; // Free shipping
    const total = subtotal + shipping;

    // Display items
    orderItemsContainer.innerHTML = cart.map(item => {
        // Fix image path - payment page is in public/payment/
        let imagePath = item.image;
        if (imagePath) {
            if (imagePath.startsWith('../../')) {
                // Already correct for payment page
            } else if (imagePath.startsWith('../')) {
                imagePath = '../' + imagePath;
            } else if (imagePath.includes('images/')) {
                const match = imagePath.match(/images\/(\d+\.jpeg)/);
                if (match) {
                    imagePath = '../../images/' + match[1];
                } else {
                    imagePath = '../../' + imagePath;
                }
            } else {
                imagePath = '../../images/1.jpeg';
            }
        } else {
            imagePath = '../../images/1.jpeg';
        }

        return `
            <div class="order-item">
                <div class="order-item-image">
                    <img src="${imagePath}" alt="${item.name}" onerror="this.src='../../images/1.jpeg'">
                </div>
                <div class="order-item-details">
                    <div class="order-item-name">${item.name}</div>
                    <div class="order-item-price">${item.price}</div>
                    <div class="order-item-quantity">Quantity: ${item.quantity}</div>
                </div>
            </div>
        `;
    }).join('');

    // Display totals
    subtotalEl.textContent = `${subtotal.toFixed(0)} AED`;
    totalEl.textContent = `${total.toFixed(0)} AED`;
    totalBtn.textContent = `${total.toFixed(0)} AED`;
}

// Format card number input
function formatCardNumber(input) {
    let value = input.value.replace(/\s/g, '');
    let formattedValue = value.match(/.{1,4}/g)?.join(' ') || value;
    input.value = formattedValue;
}

// Format expiry date input
function formatExpiryDate(input) {
    let value = input.value.replace(/\D/g, '');
    if (value.length >= 2) {
        value = value.substring(0, 2) + '/' + value.substring(2, 4);
    }
    input.value = value;
}

// Handle payment method selection
function handlePaymentMethodChange() {
    const paymentMethods = document.querySelectorAll('input[name="paymentMethod"]');
    const cardDetails = document.getElementById('cardDetails');
    const cardInputs = cardDetails.querySelectorAll('input[required]');

    paymentMethods.forEach(method => {
        method.addEventListener('change', function() {
            if (this.value === 'card') {
                cardDetails.classList.remove('hidden');
                cardInputs.forEach(input => input.required = true);
            } else {
                cardDetails.classList.add('hidden');
                cardInputs.forEach(input => input.required = false);
            }
        });
    });
}

// Validate form
function validateForm(formData) {
    const errors = [];

    // Validate delivery info
    if (!formData.get('fullName') || formData.get('fullName').trim().length < 2) {
        errors.push('Please enter a valid full name');
    }

    if (!formData.get('email') || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.get('email'))) {
        errors.push('Please enter a valid email address');
    }

    if (!formData.get('phone') || formData.get('phone').trim().length < 10) {
        errors.push('Please enter a valid phone number');
    }

    if (!formData.get('address') || formData.get('address').trim().length < 10) {
        errors.push('Please enter a complete delivery address');
    }

    if (!formData.get('city') || formData.get('city').trim().length < 2) {
        errors.push('Please enter a valid city');
    }

    // Validate card details if card payment is selected
    const paymentMethod = formData.get('paymentMethod');
    if (paymentMethod === 'card') {
        const cardNumber = formData.get('cardNumber').replace(/\s/g, '');
        if (!cardNumber || cardNumber.length < 13 || cardNumber.length > 19) {
            errors.push('Please enter a valid card number');
        }

        const expiryDate = formData.get('expiryDate');
        if (!expiryDate || !/^\d{2}\/\d{2}$/.test(expiryDate)) {
            errors.push('Please enter a valid expiry date (MM/YY)');
        } else {
            const [month, year] = expiryDate.split('/');
            const expiry = new Date(2000 + parseInt(year), parseInt(month) - 1);
            const now = new Date();
            if (expiry < now) {
                errors.push('Card has expired');
            }
        }

        const cvv = formData.get('cvv');
        if (!cvv || cvv.length < 3 || cvv.length > 4) {
            errors.push('Please enter a valid CVV');
        }

        if (!formData.get('cardName') || formData.get('cardName').trim().length < 2) {
            errors.push('Please enter the name on card');
        }
    }

    return errors;
}

// Show success modal
function showSuccessModal(orderNumber) {
    const modal = document.getElementById('successModal');
    const modalContent = modal.querySelector('.modal-content');
    
    // Update modal content with order number if provided
    if (orderNumber) {
        const message = modalContent.querySelector('p');
        if (message) {
            message.innerHTML = `
                Your order has been placed successfully!<br>
                <strong>Order Number: ${orderNumber}</strong><br><br>
                A confirmation email with your invoice has been sent to your email address.
            `;
        }
    }
    
    modal.classList.add('show');
}

// Handle form submission
function handleFormSubmit(e) {
    e.preventDefault();

    const form = document.getElementById('paymentForm');
    const formData = new FormData(form);
    const submitBtn = document.querySelector('.submit-payment-btn');

    // Disable submit button
    submitBtn.disabled = true;
    submitBtn.textContent = 'Processing...';

    // Validate form
    const errors = validateForm(formData);

    if (errors.length > 0) {
        alert('Please fix the following errors:\n\n' + errors.join('\n'));
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<span>Complete Payment</span><span id="totalBtn">' + document.getElementById('totalBtn').textContent + '</span>';
        return;
    }

    // Prepare order data
    const orderData = {
        fullName: formData.get('fullName'),
        email: formData.get('email'),
        phone: formData.get('phone'),
        address: formData.get('address'),
        city: formData.get('city'),
        postalCode: formData.get('postalCode') || '',
        paymentMethod: formData.get('paymentMethod'),
        orderItems: [],
        subtotal: document.getElementById('subtotal').textContent,
        total: document.getElementById('totalAmount').textContent
    };

    // Get order items from cart
    if (window.CartManager) {
        const cart = window.CartManager.getCart();
        if (cart && cart.length > 0) {
            orderData.orderItems = cart.map(item => ({
                name: item.name,
                price: item.price,
                quantity: item.quantity
            }));
        } else {
            alert('Your cart is empty. Please add items to your cart first.');
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<span>Complete Payment</span><span id="totalBtn">' + document.getElementById('totalBtn').textContent + '</span>';
            return;
        }
    } else {
        alert('Cart system error. Please refresh the page and try again.');
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<span>Complete Payment</span><span id="totalBtn">' + document.getElementById('totalBtn').textContent + '</span>';
        return;
    }

    // Validate order data before sending
    if (!orderData.orderItems || orderData.orderItems.length === 0) {
        alert('No items in cart. Please add items before checkout.');
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<span>Complete Payment</span><span id="totalBtn">' + document.getElementById('totalBtn').textContent + '</span>';
        return;
    }

    // Log order data for debugging
    console.log('Sending order data:', orderData);

    // Send order to server
    fetch('/api/orders', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(orderData)
    })
    .then(response => {
        console.log('Response status:', response.status);
        if (!response.ok) {
            return response.json().then(err => {
                throw new Error(err.message || `Server error: ${response.status}`);
            });
        }
        return response.json();
    })
    .then(data => {
        console.log('Order response:', data);
        if (data.success) {
            // Clear cart
            if (window.CartManager) {
                window.CartManager.clearCart();
            }

            // Show success modal with order number
            showSuccessModal(data.orderNumber);

            // Redirect to homepage after 3 seconds
            setTimeout(() => {
                window.location.href = '../index.html';
            }, 3000);
        } else {
            alert('Payment processing failed: ' + (data.message || 'Unknown error'));
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<span>Complete Payment</span><span id="totalBtn">' + document.getElementById('totalBtn').textContent + '</span>';
        }
    })
    .catch(error => {
        console.error('Error details:', error);
        console.error('Error message:', error.message);
        alert('An error occurred while processing your payment: ' + error.message + '\n\nPlease check the console for more details.');
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<span>Complete Payment</span><span id="totalBtn">' + document.getElementById('totalBtn').textContent + '</span>';
    });
}

// Initialize payment page
function initializePayment() {
    // Load order summary
    loadOrderSummary();

    // Setup card number formatting
    const cardNumberInput = document.getElementById('cardNumber');
    if (cardNumberInput) {
        cardNumberInput.addEventListener('input', function() {
            formatCardNumber(this);
        });
    }

    // Setup expiry date formatting
    const expiryInput = document.getElementById('expiryDate');
    if (expiryInput) {
        expiryInput.addEventListener('input', function() {
            formatExpiryDate(this);
        });
    }

    // Setup CVV input (numbers only)
    const cvvInput = document.getElementById('cvv');
    if (cvvInput) {
        cvvInput.addEventListener('input', function() {
            this.value = this.value.replace(/\D/g, '');
        });
    }

    // Setup phone input formatting
    const phoneInput = document.getElementById('phone');
    if (phoneInput) {
        phoneInput.addEventListener('input', function() {
            this.value = this.value.replace(/[^\d+\s-]/g, '');
        });
    }

    // Handle payment method changes
    handlePaymentMethodChange();

    // Setup form submission
    const paymentForm = document.getElementById('paymentForm');
    if (paymentForm) {
        paymentForm.addEventListener('submit', handleFormSubmit);
    }

    // Setup continue shopping button
    const continueBtn = document.getElementById('continueShopping');
    if (continueBtn) {
        continueBtn.addEventListener('click', function() {
            window.location.href = '../index.html';
        });
    }
}

// Wait for DOM and CartManager
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
        // Wait for CartManager
        function waitForCartManager() {
            if (window.CartManager) {
                initializePayment();
            } else {
                setTimeout(waitForCartManager, 100);
            }
        }
        waitForCartManager();
    });
} else {
    function waitForCartManager() {
        if (window.CartManager) {
            initializePayment();
        } else {
            setTimeout(waitForCartManager, 100);
        }
    }
    waitForCartManager();
}

