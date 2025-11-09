/**
 * HEIME - Signup Page JavaScript
 * Handles multi-step signup process with OTP verification
 */

let userEmail = '';
let username = '';
let otpToken = '';

// OTP Input handling
const otpInputs = document.querySelectorAll('.otp-input');
otpInputs.forEach((input, index) => {
    input.addEventListener('input', (e) => {
        if (e.target.value.length === 1 && index < otpInputs.length - 1) {
            otpInputs[index + 1].focus();
        }
    });

    input.addEventListener('keydown', (e) => {
        if (e.key === 'Backspace' && !e.target.value && index > 0) {
            otpInputs[index - 1].focus();
        }
    });
});

// Step 1: Email and Username submission
document.getElementById('emailForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('email').value.trim();
    const usernameInput = document.getElementById('username').value.trim();
    
    // Validate username
    const usernameRegex = /^[a-zA-Z0-9]{3,20}$/;
    if (!usernameRegex.test(usernameInput)) {
        showError('Username must be 3-20 characters and contain only letters and numbers.');
        return;
    }
    
    userEmail = email;
    username = usernameInput;

    const submitBtn = e.target.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Sending...';

    try {
        const response = await fetch('/api/auth/signup', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email, username })
        });

        const data = await response.json();

        if (data.success) {
            otpToken = data.token;
            showSuccess('OTP sent to your email! Please check your inbox.');
            setTimeout(() => {
                goToStep(2);
            }, 1500);
        } else {
            showError(data.message || 'Failed to send OTP. Please try again.');
        }
    } catch (error) {
        showError('Network error. Please check your connection and try again.');
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Send OTP';
    }
});

// Step 2: OTP verification
document.getElementById('otpForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const otp = Array.from(otpInputs).map(input => input.value).join('');

    if (otp.length !== 6) {
        showError('Please enter the complete 6-digit OTP.');
        return;
    }

    const submitBtn = e.target.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Verifying...';

    try {
        const response = await fetch('/api/auth/verify-otp', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email: userEmail, otp, token: otpToken })
        });

        const data = await response.json();

        if (data.success) {
            otpToken = data.token; // Update token for password creation
            showSuccess('OTP verified successfully!');
            setTimeout(() => {
                goToStep(3);
            }, 1500);
        } else {
            showError(data.message || 'Invalid OTP. Please try again.');
            // Clear OTP inputs
            otpInputs.forEach(input => input.value = '');
            otpInputs[0].focus();
        }
    } catch (error) {
        showError('Network error. Please check your connection and try again.');
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Verify OTP';
    }
});

// Step 3: Password creation
document.getElementById('passwordForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const password = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirmPassword').value;

    if (password.length < 6) {
        showError('Password must be at least 6 characters long.');
        return;
    }

    if (password !== confirmPassword) {
        showError('Passwords do not match. Please try again.');
        return;
    }

    const submitBtn = e.target.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Creating Account...';

    try {
        const response = await fetch('/api/auth/create-password', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email: userEmail, username: username, password, token: otpToken })
        });

        const data = await response.json();

        if (data.success) {
            showSuccess('Account created successfully! Redirecting to login...');
            setTimeout(() => {
                window.location.href = 'login.html';
            }, 2000);
        } else {
            showError(data.message || 'Failed to create account. Please try again.');
        }
    } catch (error) {
        showError('Network error. Please check your connection and try again.');
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Create Account';
    }
});

// Resend OTP
document.getElementById('resendOtp').addEventListener('click', async (e) => {
    e.preventDefault();
    
    try {
        const response = await fetch('/api/auth/resend-otp', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email: userEmail })
        });

        const data = await response.json();

        if (data.success) {
            otpToken = data.token;
            showSuccess('New OTP sent to your email!');
            otpInputs.forEach(input => input.value = '');
            otpInputs[0].focus();
        } else {
            showError(data.message || 'Failed to resend OTP. Please try again.');
        }
    } catch (error) {
        showError('Network error. Please check your connection and try again.');
    }
});

// Helper functions
function goToStep(step) {
    // Hide all steps
    document.getElementById('step1').classList.remove('active');
    document.getElementById('step2').classList.remove('active');
    document.getElementById('step3').classList.remove('active');

    // Show current step
    document.getElementById(`step${step}`).classList.add('active');

    // Update step indicators
    for (let i = 1; i <= 3; i++) {
        const indicator = document.getElementById(`step${i}-indicator`);
        if (i < step) {
            indicator.classList.remove('active', 'inactive');
            indicator.classList.add('completed');
        } else if (i === step) {
            indicator.classList.remove('inactive', 'completed');
            indicator.classList.add('active');
        } else {
            indicator.classList.remove('active', 'completed');
            indicator.classList.add('inactive');
        }
    }
}

function showError(message) {
    const errorDiv = document.getElementById('errorMessage');
    errorDiv.textContent = message;
    errorDiv.classList.add('show');
    setTimeout(() => {
        errorDiv.classList.remove('show');
    }, 5000);
}

function showSuccess(message) {
    const successDiv = document.getElementById('successMessage');
    successDiv.textContent = message;
    successDiv.classList.add('show');
    setTimeout(() => {
        successDiv.classList.remove('show');
    }, 5000);
}

