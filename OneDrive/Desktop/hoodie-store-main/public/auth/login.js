/**
 * HEIME - Login Page JavaScript
 * Handles user login
 */

document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;

    const submitBtn = e.target.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Logging in...';

    try {
        const response = await fetch('/api/auth/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include', // Important for cookies
            body: JSON.stringify({ email, password })
        });

        const data = await response.json();

        if (data.success) {
            showSuccess('Login successful! Redirecting...');
            setTimeout(() => {
                // Redirect to previous page or homepage
                const returnUrl = new URLSearchParams(window.location.search).get('return') || '../index.html';
                window.location.href = returnUrl;
            }, 1000);
        } else {
            showError(data.message || 'Invalid email or password. Please try again.');
        }
    } catch (error) {
        showError('Network error. Please check your connection and try again.');
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Login';
    }
});

function showError(message) {
    const errorDiv = document.getElementById('errorMessage');
    errorDiv.textContent = message;
    errorDiv.classList.add('show');
    setTimeout(() => {
        errorDiv.classList.remove('show');
    }, 5000);
}

function showSuccess(message) {
    // Create success message if it doesn't exist
    let successDiv = document.getElementById('successMessage');
    if (!successDiv) {
        successDiv = document.createElement('div');
        successDiv.id = 'successMessage';
        successDiv.className = 'success-message';
        successDiv.style.cssText = 'background-color: #e8f5e9; color: #2e7d32; padding: 12px; border-radius: 8px; margin-bottom: 20px; font-size: 14px; display: none;';
        document.querySelector('.auth-card').insertBefore(successDiv, document.getElementById('loginForm'));
    }
    successDiv.textContent = message;
    successDiv.style.display = 'block';
    setTimeout(() => {
        successDiv.style.display = 'none';
    }, 3000);
}

