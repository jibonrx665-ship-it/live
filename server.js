const express = require('express');
const cors = require('cors');
require('dotenv').config();

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const app = express();

app.use(express.json());
app.use(cors());

// Luhn Algorithm Pre-validation Function
function luhnCheck(cardNumber) {
    let arr = cardNumber.split('').reverse().map(x => parseInt(x));
    let sum = arr.reduce((acc, val, idx) => {
        if (idx % 2 !== 0) {
            val *= 2;
            if (val > 9) val -= 9;
        }
        return acc + val;
    }, 0);
    return (sum % 10 === 0);
}

// Card Checking Endpoint
app.post('/api/check-card', async (req, res) => {
    const { card, mm, yy, cvv } = req.body;

    if (!card || !mm || !yy || !cvv) {
        return res.status(400).json({ status: 'DEAD', message: 'Incomplete parameters' });
    }

    const cleanCard = card.trim();
    const cleanMm = mm.trim();
    const cleanYy = yy.trim().length === 2 ? `20${yy.trim()}` : yy.trim();
    const cleanCvv = cvv.trim();

    // 1. Pre-check: Luhn Algorithm
    if (!luhnCheck(cleanCard)) {
        return res.json({ status: 'DEAD', message: 'Declined: Invalid Luhn Check' });
    }

    try {
        // 2. Gateway Integration using Stripe Tokens API
        const token = await stripe.tokens.create({
            card: {
                number: cleanCard,
                exp_month: parseInt(cleanMm),
                exp_year: parseInt(cleanYy),
                cvc: cleanCvv,
            },
        });

        return res.json({ 
            status: 'LIVE', 
            message: 'Approved (Auth Success)', 
            id: token.id 
        });

    } catch (error) {
        return res.json({ 
            status: 'DEAD', 
            message: `Declined: ${error.raw ? error.raw.message : error.message}` 
        });
    }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`[Backend] Server running on port ${PORT}`);
});
