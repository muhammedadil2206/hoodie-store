require('dotenv').config(); // load env variables
const express = require('express');
const nodemailer = require('nodemailer');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');
const session = require('express-session');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const mongoose = require('mongoose');
const Contact = require('./model/contact');

const app = express();
const isProduction = process.env.NODE_ENV === 'production';

// Session configuration
app.use(session({
    secret: process.env.SESSION_SECRET || 'heime-secret-key-change-in-production',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: isProduction,
        httpOnly: true,
        sameSite: isProduction ? 'none' : 'lax',
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
}));

if (isProduction) {
    app.set('trust proxy', 1);
}

app.use(cors({
    origin: true,
    credentials: true
}));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// Serve static files from public directory
app.use(express.static(path.join(__dirname, 'public')));
app.use('/images', express.static(path.join(__dirname, 'images')));

// Root route fallback for static hosting providers
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const GMAIL_USER = process.env.GMAIL_USER;
const GMAIL_APP_PASSWORD = process.env.GMAIL_APP_PASSWORD;
const PORT = process.env.PORT || 3000;
const MONGO_URI = process.env.MONGODB_URI || 'mongodb+srv://aithorappan_db_user:<db_password>@cluster0.rl7qkny.mongodb.net/?appName=Cluster0';

// Check if email credentials are set
if (!GMAIL_USER || !GMAIL_APP_PASSWORD) {
    console.error('⚠️  WARNING: GMAIL_USER and GMAIL_APP_PASSWORD must be set in .env file');
}

const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    requireTLS: true,
    auth: {
        user: GMAIL_USER,
        pass: GMAIL_APP_PASSWORD
    },
    connectionTimeout: 20000,
    socketTimeout: 20000
});

// Proactively verify transporter connectivity in the background
transporter.verify()
    .then(() => console.log('✅ SMTP transporter verified'))
    .catch((err) => console.error('❌ SMTP verification failed:', err));

// MongoDB Schemas & Models
const userSchema = new mongoose.Schema({
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    username: { type: String, required: true, trim: true },
    usernameLower: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    createdAt: { type: Date, default: Date.now }
});

userSchema.pre('validate', function (next) {
    if (this.username) {
        this.usernameLower = this.username.toLowerCase();
    }
    next();
});

const otpSchema = new mongoose.Schema({
    email: { type: String, required: true, lowercase: true, trim: true, index: true },
    otp: { type: String, required: true },
    token: { type: String, required: true },
    expiresAt: { type: Date, required: true },
    username: { type: String },
    usernameLower: { type: String },
    verified: { type: Boolean, default: false }
}, { timestamps: true });

otpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const orderSchema = new mongoose.Schema({
    orderNumber: { type: String, required: true, unique: true },
    fullName: { type: String, required: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    phone: { type: String, required: true },
    address: { type: String, required: true },
    city: { type: String, required: true },
    postalCode: { type: String },
    paymentMethod: { type: String, required: true },
    paymentMethodDisplay: { type: String, required: true },
    subtotal: { type: String, required: true },
    total: { type: String, required: true },
    orderItems: [{
        name: String,
        price: String,
        quantity: Number,
        totalPrice: String
    }],
    createdAt: { type: Date, default: Date.now }
});

const User = mongoose.model('User', userSchema);
const Otp = mongoose.model('Otp', otpSchema);
const Order = mongoose.model('Order', orderSchema);

// Utilities
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const usernameRegex = /^[a-zA-Z0-9]{3,20}$/;

function generateOTP() {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

function normalizeEmail(email) {
    return email.trim().toLowerCase();
}

function normalizeUsername(username) {
    return username.trim();
}

// Email endpoint
app.post('/api/contact', async (req, res) => {
    try {
        // Check if email credentials are configured
        if (!GMAIL_USER || !GMAIL_APP_PASSWORD) {
            console.error('❌ Email credentials not configured');
            return res.status(500).json({
                success: false,
                message: 'Email service is not configured. Please contact the administrator.'
            });
        }

        const { name, email, phone, subject, message } = req.body;

        // Validate required fields
        if (!name || !email || !subject || !message) {
            return res.status(400).json({
                success: false,
                message: 'Please fill in all required fields.'
            });
        }

        // Email validation
        if (!emailRegex.test(email)) {
            return res.status(400).json({
                success: false,
                message: 'Please enter a valid email address.'
            });
        }

        const normalizedEmail = normalizeEmail(email);

        // Persist contact submission
        await Contact.create({
            name: name.trim(),
            email: normalizedEmail,
            phone: phone ? phone.toString().trim() : '',
            subject: subject.trim(),
            message: message.toString()
        });

        // 1. Send notification email to admin (yourself)
        const adminMailOptions = {
            from: `HEIME <${GMAIL_USER}>`,
            to: GMAIL_USER, // Send to yourself
            replyTo: email,
            subject: `Contact Form: ${subject}`,
            html: `
                <h2>New Contact Form Submission</h2>
                <p><strong>Name:</strong> ${name}</p>
                <p><strong>Email:</strong> ${email}</p>
                <p><strong>Phone:</strong> ${phone || 'Not provided'}</p>
                <p><strong>Subject:</strong> ${subject}</p>
                <h3>Message:</h3>
                <p>${message.replace(/\n/g, '<br>')}</p>
            `
        };

        // 2. Send automatic reply to customer (hide Gmail address)
        const customerMailOptions = {
            from: `HEIME <${GMAIL_USER}>`,
            to: email, // Send to the person who contacted
            replyTo: 'heime@cloth.com', // Set reply-to to heime@cloth.com (not Gmail)
            headers: {
                'X-Mailer': 'HEIME Contact System',
                'X-Priority': '3',
            },
            subject: `Thank you for contacting HEIME`,
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2 style="color: #FF6600;">Thank you for contacting HEIME!</h2>
                    <p>Dear ${name},</p>
                    <p>We have received your message regarding "<strong>${subject}</strong>" and we truly appreciate you taking the time to reach out to us.</p>
                    <p>Our team will review your inquiry and we will reach out to you as soon as possible, typically within 24-48 hours.</p>
                    <p>If your matter is urgent, please feel free to contact us directly.</p>
                    <br>
                    <p>Best regards,<br>
                    <strong>The HEIME Team</strong></p>
                    <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
                    <p style="color: #666; font-size: 12px;">
                        This is an automated response. Please do not reply to this email.<br>
                        If you need to contact us, please use our contact form or email us at <a href="mailto:heime@cloth.com">heime@cloth.com</a>.
                    </p>
                </div>
            `
        };

        // Send both emails
        await Promise.all([
            transporter.sendMail(adminMailOptions),
            transporter.sendMail(customerMailOptions)
        ]);

        console.log('✅ Notification email sent to admin');
        console.log('✅ Auto-reply email sent to customer:', email);

        res.json({
            success: true,
            message: 'Thank you for contacting us! We will get back to you as soon as possible.'
        });

    } catch (error) {
        console.error('❌ Error sending email:', error);

        // Provide more specific error messages
        let errorMessage = 'Sorry, there was an error sending your message. Please try again later.';

        if (error.code === 'EAUTH') {
            errorMessage = 'Email authentication failed. Please check your Gmail credentials.';
        } else if (error.code === 'ECONNECTION' || error.code === 'ETIMEDOUT') {
            errorMessage = 'Could not connect to email server. Please check your internet connection.';
        } else if (error.response) {
            errorMessage = `Email server error: ${error.response}`;
        }

        res.status(500).json({
            success: false,
            message: errorMessage
        });
    }
});

// Order processing endpoint
app.post('/api/orders', async (req, res) => {
    try {
        if (!GMAIL_USER || !GMAIL_APP_PASSWORD) {
            return res.status(500).json({
                success: false,
                message: 'Email service is not configured.'
            });
        }

        const { 
            fullName, 
            email, 
            phone, 
            address, 
            city, 
            postalCode, 
            paymentMethod,
            orderItems, 
            subtotal, 
            total 
        } = req.body;

        // Validate required fields
        if (!fullName || !email || !phone || !address || !city || !orderItems || !total) {
            console.error('Missing required fields:', {
                fullName: !!fullName,
                email: !!email,
                phone: !!phone,
                address: !!address,
                city: !!city,
                orderItems: !!orderItems,
                orderItemsLength: orderItems ? orderItems.length : 0,
                total: !!total
            });
            return res.status(400).json({
                success: false,
                message: 'Missing required order information. Please fill in all required fields.'
            });
        }

        // Validate orderItems is an array and has items
        if (!Array.isArray(orderItems) || orderItems.length === 0) {
            console.error('Invalid orderItems:', orderItems);
            return res.status(400).json({
                success: false,
                message: 'No items in order. Please add items to your cart.'
            });
        }

        // Generate order number
        const orderNumber = 'HEIME-' + Date.now().toString().slice(-8);
        const orderDate = new Date().toLocaleString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });

        // Format payment method name for display
        const paymentMethodNames = {
            'card': 'Credit/Debit Card',
            'applepay': 'Apple Pay',
            'googlepay': 'Google Pay',
            'paypal': 'PayPal',
            'cod': 'Cash on Delivery',
            'tabby': 'Tabby (Buy Now, Pay Later)'
        };
        const paymentMethodDisplay = paymentMethodNames[paymentMethod] || paymentMethod;

        // Format order items for email
        const itemsHtml = orderItems.map(item => `
            <tr>
                <td style="padding: 10px; border-bottom: 1px solid #eee;">
                    <strong>${item.name}</strong><br>
                    <small style="color: #666;">Quantity: ${item.quantity}</small>
                </td>
                <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right;">
                    ${item.price}
                </td>
                <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right;">
                    ${(parseFloat(item.price.replace(' AED', '').replace(',', '')) * item.quantity).toFixed(0)} AED
                </td>
            </tr>
        `).join('');

        const normalizedEmail = normalizeEmail(email);
        const storedOrderItems = orderItems.map(item => {
            const numericPrice = parseFloat(item.price.replace(/[^\d.]/g, '')) || 0;
            const totalValue = numericPrice * item.quantity;
            return {
                name: item.name,
                price: item.price,
                quantity: item.quantity,
                totalPrice: `${totalValue.toFixed(0)} AED`
            };
        });

        // Persist order
        await Order.create({
            orderNumber,
            fullName,
            email: normalizedEmail,
            phone,
            address,
            city,
            postalCode,
            paymentMethod,
            paymentMethodDisplay,
            subtotal,
            total,
            orderItems: storedOrderItems
        });

        // 1. Send order notification to admin
        const adminMailOptions = {
            from: `HEIME Orders <${GMAIL_USER}>`,
            to: GMAIL_USER,
            replyTo: email,
            subject: `New Order Received - ${orderNumber}`,
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                    <h2 style="color: #FF6600;">New Order Received!</h2>
                    <p><strong>Order Number:</strong> ${orderNumber}</p>
                    <p><strong>Order Date:</strong> ${orderDate}</p>
                    
                    <h3 style="color: #333; margin-top: 30px;">Customer Information</h3>
                    <table style="width: 100%; border-collapse: collapse;">
                        <tr>
                            <td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>Name:</strong></td>
                            <td style="padding: 8px; border-bottom: 1px solid #eee;">${fullName}</td>
                        </tr>
                        <tr>
                            <td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>Email:</strong></td>
                            <td style="padding: 8px; border-bottom: 1px solid #eee;">${email}</td>
                        </tr>
                        <tr>
                            <td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>Phone:</strong></td>
                            <td style="padding: 8px; border-bottom: 1px solid #eee;">${phone}</td>
                        </tr>
                        <tr>
                            <td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>Address:</strong></td>
                            <td style="padding: 8px; border-bottom: 1px solid #eee;">${address}</td>
                        </tr>
                        <tr>
                            <td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>City:</strong></td>
                            <td style="padding: 8px; border-bottom: 1px solid #eee;">${city}</td>
                        </tr>
                        ${postalCode ? `
                        <tr>
                            <td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>Postal Code:</strong></td>
                            <td style="padding: 8px; border-bottom: 1px solid #eee;">${postalCode}</td>
                        </tr>
                        ` : ''}
                        <tr>
                            <td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>Payment Method:</strong></td>
                            <td style="padding: 8px; border-bottom: 1px solid #eee;">${paymentMethodDisplay}</td>
                        </tr>
                    </table>

                    <h3 style="color: #333; margin-top: 30px;">Order Items</h3>
                    <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
                        <thead>
                            <tr style="background-color: #f5f5f5;">
                                <th style="padding: 10px; text-align: left; border-bottom: 2px solid #ddd;">Item</th>
                                <th style="padding: 10px; text-align: right; border-bottom: 2px solid #ddd;">Price</th>
                                <th style="padding: 10px; text-align: right; border-bottom: 2px solid #ddd;">Total</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${itemsHtml}
                        </tbody>
                    </table>

                    <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin-top: 20px;">
                        <table style="width: 100%;">
                            <tr>
                                <td style="padding: 5px; text-align: right;"><strong>Subtotal:</strong></td>
                                <td style="padding: 5px; text-align: right; width: 100px;">${subtotal} AED</td>
                            </tr>
                            <tr>
                                <td style="padding: 5px; text-align: right;"><strong>Shipping:</strong></td>
                                <td style="padding: 5px; text-align: right;">Free</td>
                            </tr>
                            <tr style="font-size: 18px;">
                                <td style="padding: 10px 5px; text-align: right; border-top: 2px solid #ddd;"><strong>Total:</strong></td>
                                <td style="padding: 10px 5px; text-align: right; color: #FF6600; font-size: 20px;"><strong>${total} AED</strong></td>
                            </tr>
                        </table>
                    </div>
                </div>
            `
        };

        // 2. Send invoice to customer
        const customerMailOptions = {
            from: `HEIME <${GMAIL_USER}>`,
            to: email,
            replyTo: 'heime@cloth.com',
            subject: `Payment Successful - Order Confirmation ${orderNumber}`,
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #ffffff;">
                    <div style="text-align: center; margin-bottom: 30px;">
                        <h1 style="color: #FF6600; margin: 0;">HEIME</h1>
                        <p style="color: #666; margin: 5px 0;">Premium Hoodies Collection</p>
                    </div>

                    <div style="background-color: #4caf50; color: white; padding: 20px; border-radius: 10px; text-align: center; margin-bottom: 30px;">
                        <h2 style="margin: 0; font-size: 24px;">✓ Payment Successful!</h2>
                        <p style="margin: 10px 0 0 0;">Your order has been confirmed</p>
                    </div>

                    <div style="background-color: #f5f5f5; padding: 20px; border-radius: 10px; margin-bottom: 30px;">
                        <h3 style="color: #333; margin-top: 0;">Order Details</h3>
                        <table style="width: 100%;">
                            <tr>
                                <td style="padding: 5px 0;"><strong>Order Number:</strong></td>
                                <td style="padding: 5px 0; text-align: right;">${orderNumber}</td>
                            </tr>
                            <tr>
                                <td style="padding: 5px 0;"><strong>Order Date:</strong></td>
                                <td style="padding: 5px 0; text-align: right;">${orderDate}</td>
                            </tr>
                            <tr>
                                <td style="padding: 5px 0;"><strong>Payment Method:</strong></td>
                                <td style="padding: 5px 0; text-align: right;">${paymentMethodDisplay}</td>
                            </tr>
                        </table>
                    </div>

                    <h3 style="color: #333; margin-top: 30px;">Delivery Information</h3>
                    <div style="background-color: #f9f9f9; padding: 15px; border-radius: 5px; margin-bottom: 30px;">
                        <p style="margin: 5px 0;"><strong>${fullName}</strong></p>
                        <p style="margin: 5px 0;">${address}</p>
                        <p style="margin: 5px 0;">${city}${postalCode ? ', ' + postalCode : ''}</p>
                        <p style="margin: 5px 0;">Phone: ${phone}</p>
                    </div>

                    <h3 style="color: #333; margin-top: 30px;">Order Items</h3>
                    <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
                        <thead>
                            <tr style="background-color: #f5f5f5;">
                                <th style="padding: 10px; text-align: left; border-bottom: 2px solid #ddd;">Item</th>
                                <th style="padding: 10px; text-align: right; border-bottom: 2px solid #ddd;">Price</th>
                                <th style="padding: 10px; text-align: right; border-bottom: 2px solid #ddd;">Total</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${itemsHtml}
                        </tbody>
                    </table>

                    <div style="background-color: #f5f5f5; padding: 20px; border-radius: 5px; margin-bottom: 30px;">
                        <table style="width: 100%;">
                            <tr>
                                <td style="padding: 8px 0; text-align: right;"><strong>Subtotal:</strong></td>
                                <td style="padding: 8px 0; text-align: right; width: 120px;">${subtotal} AED</td>
                            </tr>
                            <tr>
                                <td style="padding: 8px 0; text-align: right;"><strong>Shipping:</strong></td>
                                <td style="padding: 8px 0; text-align: right;">Free</td>
                            </tr>
                            <tr style="font-size: 18px; border-top: 2px solid #ddd;">
                                <td style="padding: 15px 0; text-align: right;"><strong>Total:</strong></td>
                                <td style="padding: 15px 0; text-align: right; color: #FF6600; font-size: 22px;"><strong>${total} AED</strong></td>
                            </tr>
                        </table>
                    </div>

                    <div style="background-color: #fff3e0; border-left: 4px solid #FF6600; padding: 15px; margin: 30px 0; border-radius: 5px;">
                        <p style="margin: 0; color: #333;">
                            <strong>What's Next?</strong><br>
                            We're preparing your order and will send you a shipping confirmation email once it's on its way. 
                            Expected delivery time: 3-5 business days.
                        </p>
                    </div>

                    <div style="text-align: center; margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee;">
                        <p style="color: #666; font-size: 14px; margin: 5px 0;">
                            Thank you for shopping with HEIME!
                        </p>
                        <p style="color: #999; font-size: 12px; margin: 10px 0;">
                            If you have any questions, please contact us at <a href="mailto:heime@cloth.com" style="color: #FF6600;">heime@cloth.com</a>
                        </p>
                    </div>
                </div>
            `
        };

        // Send both emails
        await Promise.all([
            transporter.sendMail(adminMailOptions),
            transporter.sendMail(customerMailOptions)
        ]);

        console.log(`✅ Order notification sent to admin for order ${orderNumber}`);
        console.log(`✅ Invoice sent to customer: ${email}`);

        res.json({
            success: true,
            message: 'Order processed successfully. Confirmation email sent.',
            orderNumber: orderNumber
        });

    } catch (error) {
        console.error('Error processing order:', error);
        console.error('Error stack:', error.stack);
        res.status(500).json({
            success: false,
            message: 'Failed to process order: ' + error.message
        });
    }
});

// Signup - Send OTP
app.post('/api/auth/signup', async (req, res) => {
    try {
        if (!GMAIL_USER || !GMAIL_APP_PASSWORD) {
            return res.status(500).json({
                success: false,
                message: 'Email service is not configured.'
            });
        }

        const { email, username } = req.body;
        if (!email || !emailRegex.test(email)) {
            return res.status(400).json({
                success: false,
                message: 'Please enter a valid email address.'
            });
        }

        if (!username || !usernameRegex.test(username)) {
            return res.status(400).json({
                success: false,
                message: 'Username must be 3-20 characters and contain only letters and numbers.'
            });
        }

        const normalizedEmail = normalizeEmail(email);
        const normalizedUsername = normalizeUsername(username);

        // Check if email already exists
        const existingUser = await User.findOne({ email: normalizedEmail });
        if (existingUser) {
            return res.status(400).json({
                success: false,
                message: 'An account with this email already exists. Please login instead.'
            });
        }

        // Check if username already exists
        const existingUsername = await User.findOne({ usernameLower: normalizedUsername.toLowerCase() });
        if (existingUsername) {
            return res.status(400).json({
                success: false,
                message: 'This username is already taken. Please choose another one.'
            });
        }

        // Generate OTP
        const otp = generateOTP();
        const token = crypto.randomBytes(32).toString('hex');
        const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes

        await Otp.findOneAndUpdate(
            { email: normalizedEmail },
            {
                email: normalizedEmail,
                otp,
                token,
                expiresAt: new Date(expiresAt),
                username: normalizedUsername,
                usernameLower: normalizedUsername.toLowerCase(),
                verified: false
            },
            { upsert: true, new: true, setDefaultsOnInsert: true }
        );

        // Send OTP email
        const mailOptions = {
            from: `HEIME <${GMAIL_USER}>`,
            to: email,
            replyTo: 'heime@cloth.com',
            subject: 'Your HEIME Account Verification Code',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2 style="color: #FF6600;">Welcome to HEIME!</h2>
                    <p>Thank you for signing up. Please use the following code to verify your email address:</p>
                    <div style="background-color: #f5f5f5; padding: 20px; text-align: center; margin: 30px 0; border-radius: 10px;">
                        <h1 style="color: #FF6600; font-size: 36px; letter-spacing: 5px; margin: 0;">${otp}</h1>
                    </div>
                    <p>This code will expire in 10 minutes.</p>
                    <p>If you didn't request this code, please ignore this email.</p>
                    <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
                    <p style="color: #666; font-size: 12px;">
                        This is an automated email from HEIME. Please do not reply to this email.
                    </p>
                </div>
            `
        };

        await transporter.sendMail(mailOptions);
        console.log(`✅ OTP sent to: ${email}`);

        res.json({
            success: true,
            message: 'OTP sent to your email.',
            token: token
        });

    } catch (error) {
        console.error('❌ Error in signup:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to send OTP. Please try again later.'
        });
    }
});

// Verify OTP
app.post('/api/auth/verify-otp', async (req, res) => {
    try {
        const { email, otp, token } = req.body;

        if (!email || !otp || !token) {
            return res.status(400).json({
                success: false,
                message: 'Missing required fields.'
            });
        }

        const normalizedEmail = normalizeEmail(email);
        const storedData = await Otp.findOne({ email: normalizedEmail });

        if (!storedData) {
            return res.status(400).json({
                success: false,
                message: 'OTP not found. Please request a new OTP.'
            });
        }

        if (storedData.token !== token) {
            return res.status(400).json({
                success: false,
                message: 'Invalid token.'
            });
        }

        if (Date.now() > storedData.expiresAt.getTime()) {
            await Otp.deleteOne({ email: normalizedEmail });
            return res.status(400).json({
                success: false,
                message: 'OTP has expired. Please request a new one.'
            });
        }

        if (storedData.otp !== otp) {
            return res.status(400).json({
                success: false,
                message: 'Invalid OTP. Please try again.'
            });
        }

        // OTP verified - generate new token for password creation
        const newToken = crypto.randomBytes(32).toString('hex');
        storedData.token = newToken;
        storedData.verified = true;
        storedData.expiresAt = new Date(Date.now() + 10 * 60 * 1000);
        await storedData.save();

        res.json({
            success: true,
            message: 'OTP verified successfully.',
            token: newToken
        });

    } catch (error) {
        console.error('❌ Error verifying OTP:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to verify OTP. Please try again.'
        });
    }
});

// Resend OTP
app.post('/api/auth/resend-otp', async (req, res) => {
    try {
        if (!GMAIL_USER || !GMAIL_APP_PASSWORD) {
            return res.status(500).json({
                success: false,
                message: 'Email service is not configured.'
            });
        }

        const { email } = req.body;
        if (!email || !emailRegex.test(email)) {
            return res.status(400).json({
                success: false,
                message: 'Please enter a valid email address.'
            });
        }

        const normalizedEmail = normalizeEmail(email);

        const existingOtp = await Otp.findOne({ email: normalizedEmail });
        if (!existingOtp) {
            return res.status(404).json({
                success: false,
                message: 'No OTP request found for this email. Please start signup again.'
            });
        }

        // Generate new OTP
        const otp = generateOTP();
        const token = crypto.randomBytes(32).toString('hex');
        const expiresAt = Date.now() + 10 * 60 * 1000;

        existingOtp.otp = otp;
        existingOtp.token = token;
        existingOtp.expiresAt = new Date(expiresAt);
        existingOtp.verified = false;
        await existingOtp.save();

        // Send OTP email
        const mailOptions = {
            from: `HEIME <${GMAIL_USER}>`,
            to: email,
            replyTo: 'heime@cloth.com',
            subject: 'Your HEIME Account Verification Code',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2 style="color: #FF6600;">Your Verification Code</h2>
                    <p>Here is your new verification code:</p>
                    <div style="background-color: #f5f5f5; padding: 20px; text-align: center; margin: 30px 0; border-radius: 10px;">
                        <h1 style="color: #FF6600; font-size: 36px; letter-spacing: 5px; margin: 0;">${otp}</h1>
                    </div>
                    <p>This code will expire in 10 minutes.</p>
                </div>
            `
        };

        await transporter.sendMail(mailOptions);
        console.log(`✅ OTP resent to: ${email}`);

        res.json({
            success: true,
            message: 'New OTP sent to your email.',
            token: token
        });

    } catch (error) {
        console.error('❌ Error resending OTP:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to resend OTP. Please try again later.'
        });
    }
});

// Create Password
app.post('/api/auth/create-password', async (req, res) => {
    try {
        const { email, password, token } = req.body;

        if (!email || !password || !token) {
            return res.status(400).json({
                success: false,
                message: 'Missing required fields.'
            });
        }

        if (password.length < 6) {
            return res.status(400).json({
                success: false,
                message: 'Password must be at least 6 characters long.'
            });
        }

        const normalizedEmail = normalizeEmail(email);
        const storedData = await Otp.findOne({ email: normalizedEmail });

        if (!storedData || !storedData.verified || storedData.token !== token) {
            return res.status(400).json({
                success: false,
                message: 'Invalid or expired verification. Please start over.'
            });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create user
        await User.create({
            email: normalizedEmail,
            username: storedData.username,
            password: hashedPassword
        });

        // Clean up OTP data
        await Otp.deleteOne({ email: normalizedEmail });

        console.log(`✅ Account created for: ${email}`);

        res.json({
            success: true,
            message: 'Account created successfully!'
        });

    } catch (error) {
        console.error('❌ Error creating password:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create account. Please try again.'
        });
    }
});

// Login
app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: 'Please enter both email and password.'
            });
        }

        const normalizedEmail = normalizeEmail(email);
        const user = await User.findOne({ email: normalizedEmail });

        if (!user) {
            return res.status(400).json({
                success: false,
                message: 'Invalid email or password.'
            });
        }

        const passwordMatch = await bcrypt.compare(password, user.password);

        if (!passwordMatch) {
            return res.status(400).json({
                success: false,
                message: 'Invalid email or password.'
            });
        }

        // Create session
        req.session.user = {
            email: user.email,
            username: user.username,
            createdAt: user.createdAt
        };

        console.log(`✅ User logged in: ${email}`);

        res.json({
            success: true,
            message: 'Login successful!',
            user: {
                email: user.email
            }
        });

    } catch (error) {
        console.error('❌ Error in login:', error);
        res.status(500).json({
            success: false,
            message: 'Login failed. Please try again.'
        });
    }
});

// Logout
app.post('/api/auth/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            return res.status(500).json({
                success: false,
                message: 'Failed to logout.'
            });
        }
        res.json({
            success: true,
            message: 'Logged out successfully.'
        });
    });
});

// Check authentication status
app.get('/api/auth/check', (req, res) => {
    if (req.session && req.session.user) {
        res.json({
            success: true,
            authenticated: true,
            user: req.session.user
        });
    } else {
        res.json({
            success: true,
            authenticated: false
        });
    }
});

// Start server after MongoDB connection
async function startServer() {
    try {
        await mongoose.connect(MONGO_URI);
        console.log('✅ Connected to MongoDB');

        app.listen(PORT, () => {
            console.log(`🚀 Server running on http://localhost:${PORT}`);
            if (!GMAIL_USER || !GMAIL_APP_PASSWORD) {
                console.log('⚠️  Email functionality will not work until GMAIL credentials are set in .env');
            }
        });
    } catch (error) {
        console.error('❌ MongoDB connection error:', error);
        process.exit(1);
    }
}

startServer();
