const express = require('express');
const router = express.Router();
const Razorpay = require('razorpay');
const crypto = require('crypto');
const User = require('../models/User');
const { protect } = require('../middleware/auth'); // Assuming there's a protect middleware

// Initialize Razorpay with key validation
const key_id = process.env.RAZORPAY_KEY_ID;
const key_secret = process.env.RAZORPAY_KEY_SECRET;

let razorpay;
if (key_id && key_secret) {
    razorpay = new Razorpay({
        key_id,
        key_secret,
    });
} else {
    console.warn('⚠️ Razorpay keys are missing. Payment initialization will fail.');
}

// @desc    Create Razorpay Order
// @route   POST /api/payment/create-order
// @access  Private (Organizer/Admin)
router.post('/create-order', protect, async (req, res) => {
    try {
        if (!razorpay) {
            return res.status(500).json({ message: 'Razorpay keys are not configured on the server. Please check your .env file.' });
        }
        const { planId, amount } = req.body;

        if (!planId || !amount) {
            return res.status(400).json({ message: 'Plan ID and Amount are required' });
        }

        const options = {
            amount: amount * 100, // Amount in paise
            currency: 'INR',
            receipt: `rcpt_${Date.now()}`, // Just timestamp for simplicity and to stay well under 40 chars
            notes: {
                planId: planId,
                userId: req.user._id.toString()
            }
        };

        console.log('Creating Razorpay Order with options:', options);

        const order = await razorpay.orders.create(options);
        res.status(200).json(order);
    } catch (error) {
        console.error('Razorpay Order Error:', error);
        res.status(500).json({ message: 'Error creating Razorpay order', error: error.message });
    }
});

// @desc    Verify Razorpay Payment
// @route   POST /api/payment/verify-payment
// @access  Private
router.post('/verify-payment', protect, async (req, res) => {
    try {
        const {
            razorpay_order_id,
            razorpay_payment_id,
            razorpay_signature,
            planId
        } = req.body;

        // Skip verification for free plan
        if (planId === 'free') {
            await User.findByIdAndUpdate(req.user._id, { subscription: 'free' });
            return res.status(200).json({ message: "Subscription updated to free", subscription: 'free' });
        }

        if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
            return res.status(400).json({ message: "Missing payment verification details" });
        }

        const body = razorpay_order_id + "|" + razorpay_payment_id;

        const expectedSignature = crypto
            .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
            .update(body.toString())
            .digest("hex");

        const isAuthentic = expectedSignature === razorpay_signature;

        if (isAuthentic) {
            // Update user subscription
            await User.findByIdAndUpdate(req.user._id, {
                subscription: planId
            });

            res.status(200).json({
                message: "Payment verified successfully",
                subscription: planId
            });
        } else {
            res.status(400).json({ message: "Invalid payment signature" });
        }
    } catch (error) {
        console.error('Razorpay Verification Error:', error);
        res.status(500).json({ message: 'Error verifying payment', error: error.message });
    }
});

module.exports = router;
