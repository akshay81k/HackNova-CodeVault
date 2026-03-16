import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { useAuth } from '../context/AuthContext';
import API from '../api';
import { Check, Shield, Zap, Crown, Star, X, AlertCircle } from 'lucide-react';

const PLANS = [
    {
        id: 'free',
        name: 'Community',
        price: '0',
        color: '#10b981',
        icon: <Zap size={24} />,
        storage: '1 GB',
        features: [
            'Up to 10 team submissions',
            'Secure project upload',
            'Basic submission hashing',
            'Blockchain timestamp verification',
            'Basic organizer dashboard',
            'Limited plagiarism check (manual)'
        ],
        notIncluded: [
            'Full plagiarism scan',
            'Forensic timeline analytics',
            'Verification reports',
            'Priority support'
        ]
    },
    {
        id: 'builder',
        name: 'Builder',
        price: '999',
        color: '#3b82f6',
        icon: <Star size={24} />,
        storage: '5 GB',
        features: [
            'Up to 50 teams per event',
            'Secure ZIP / Git submission',
            'Tamper-proof hashing',
            'Blockchain integrity verification',
            'Basic token plagiarism detection',
            'Forensic submission timeline',
            'Email support'
        ],
        notIncluded: [
            'Similarity percentage reports',
            'Multi-admin access',
            'Dedicated support'
        ]
    },
    {
        id: 'organizer',
        name: 'Organizer',
        price: '3,499',
        color: '#8b5cf6',
        icon: <Shield size={24} />,
        storage: '25 GB',
        isPopular: true,
        features: [
            'Everything in Builder, plus:',
            'Up to 200 teams',
            'Advanced plagiarism comparison',
            'Similarity percentage reports',
            'Full forensic reconstruction',
            'Submission verification reports',
            'Priority support'
        ],
        notIncluded: [
            'Real-time plagiarism detection',
            'Dedicated support'
        ]
    },
    {
        id: 'integrity',
        name: 'Integrity',
        price: '9,999',
        color: '#ec4899',
        icon: <Crown size={24} />,
        storage: '100 GB',
        features: [
            'Everything in Organizer, plus:',
            'Up to 500+ teams',
            'Real-time plagiarism detection',
            'Blockchain verification portal',
            'Public verification links',
            'Security alerts (post-deadline)',
            'Multi-admin access',
            'Dedicated 24/7 support'
        ]
    }
];

const loadRazorpay = () => {
    return new Promise((resolve) => {
        const script = document.createElement('script');
        script.src = 'https://checkout.razorpay.com/v1/checkout.js';
        script.onload = () => resolve(true);
        script.onerror = () => resolve(false);
        document.body.appendChild(script);
    });
};

export default function SubscriptionPage() {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [selectedPlan, setSelectedPlan] = useState(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [status, setStatus] = useState('idle'); // idle, success, error
    const [errorMsg, setErrorMsg] = useState('');

    const handleUpgrade = async (plan) => {
        if (plan.id === 'free' || plan.price === '0') {
            try {
                // For free plan, directly update in backend if needed, or just show success
                await API.post('/payment/verify-payment', { planId: 'free' });
                setStatus('success');
                setSelectedPlan(plan);
            } catch (err) {
                setErrorMsg('Failed to update plan.');
            }
            return;
        }

        setIsProcessing(true);
        setErrorMsg('');

        try {
            const razorpayKey = import.meta.env.VITE_RAZORPAY_KEY_ID;
            console.log('Using Razorpay Key ID:', razorpayKey);
            
            if (!razorpayKey || razorpayKey === 'rzp_test_YOUR_KEY_HERE') {
                setErrorMsg('Razorpay Key ID is not configured. Please add VITE_RAZORPAY_KEY_ID to your frontend .env file.');
                setIsProcessing(false);
                return;
            }

            const res = await loadRazorpay();
            if (!res) {
                setErrorMsg('Razorpay SDK failed to load. Are you online?');
                setIsProcessing(false);
                return;
            }

            // 1. Create Order in Backend
            const { data: order } = await API.post('/payment/create-order', {
                planId: plan.id,
                amount: parseInt(plan.price.replace(',', ''))
            });

            // 2. Open Razorpay Checkout
            const options = {
                key: import.meta.env.VITE_RAZORPAY_KEY_ID || 'rzp_test_YOUR_KEY_HERE',
                amount: order.amount,
                currency: order.currency,
                name: "HackNova Integrity",
                description: `Upgrade to ${plan.name} Plan`,
                image: "https://cdn-icons-png.flaticon.com/512/6530/6530182.png",
                order_id: order.id,
                handler: async function (response) {
                    try {
                        const verifyRes = await API.post('/payment/verify-payment', {
                            ...response,
                            planId: plan.id
                        });
                        if (verifyRes.status === 200) {
                            setSelectedPlan(plan);
                            setStatus('success');
                        }
                    } catch (err) {
                        setErrorMsg('Payment verification failed. Please contact support.');
                    }
                },
                prefill: {
                    name: user?.name || "Test User",
                    email: user?.email || "test@example.com",
                    contact: "9999999999" // Razorpay requires 10 digits for contact
                },
                notes: {
                    address: "HackNova Integrity Platform"
                },
                theme: {
                    color: plan.color
                },
                modal: {
                    ondismiss: function() {
                        setIsProcessing(false);
                    }
                }
            };

            const rzp = new window.Razorpay(options);
            rzp.on('payment.failed', function (response){
                setErrorMsg(response.error.description);
            });
            rzp.open();
        } catch (err) {
            console.error(err);
            setErrorMsg(err.response?.data?.message || 'Something went wrong while initiating payment.');
        } finally {
            setIsProcessing(false);
        }
    };

    if (status === 'success') {
        return (
            <div className="page-wrapper" style={{ background: 'var(--bg-primary)', minHeight: '100vh' }}>
                <Navbar />
                <div className="container" style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center', 
                    minHeight: 'calc(100vh - 80px)', // Adjust based on navbar height
                    padding: '20px'
                }}>
                    <div style={{ maxWidth: 500, width: '100%', padding: '60px 40px', textAlign: 'center' }} className="card">
                        <div style={{ 
                            width: 80, height: 80, background: 'rgba(16, 185, 129, 0.1)', color: 'var(--accent-green)',
                            borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px',
                            boxShadow: '0 0 40px rgba(16, 185, 129, 0.2)'
                        }}>
                            <Check size={40} />
                        </div>
                        <h2 style={{ fontSize: '1.75rem', marginBottom: 12 }}>Payment Successful!</h2>
                        <p style={{ color: 'var(--text-secondary)', marginBottom: 32 }}>
                            Thank you for upgrading. Your organization's plan has been updated to <strong>{selectedPlan?.name}</strong>. 
                            You now have access to premium features.
                        </p>
                        <button className="btn btn-primary btn-full" onClick={() => navigate('/organizer')}>
                            Go to Dashboard
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="page-wrapper" style={{ background: 'var(--bg-primary)', minHeight: '100vh', paddingBottom: 100 }}>
            <Navbar />

            <div className="container" style={{ marginTop: 60, textAlign: 'center' }}>
                <div style={{ marginBottom: 40 }}>
                    <div className="hero-badge">Subscription Plans</div>
                    <h1 style={{ fontSize: '2.5rem', fontWeight: 800, marginBottom: 16 }}>Choose your <span className="accent">Integrity</span> level</h1>
                    <p style={{ color: 'var(--text-secondary)', maxWidth: 600, margin: '0 auto' }}>
                        Empower your hackathon with blockchain verification, forensic timelines, and advanced plagiarism detection.
                    </p>
                    {errorMsg && (
                        <div className="alert alert-error" style={{ maxWidth: 500, margin: '20px auto' }}>
                            <AlertCircle size={16} /> {errorMsg}
                        </div>
                    )}
                </div>

                <div style={{ 
                    display: 'grid', 
                    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', 
                    gap: 24,
                    marginTop: 40
                }}>
                    {PLANS.map(plan => (
                        <div key={plan.id} className={`card ${plan.isPopular ? 'popular' : ''}`} style={{ 
                            display: 'flex', flexDirection: 'column', textAlign: 'left', position: 'relative',
                            border: plan.isPopular ? `2px solid ${plan.color}` : '1px solid var(--border)',
                            transform: plan.isPopular ? 'scale(1.05)' : 'none', zIndex: plan.isPopular ? 2 : 1
                        }}>
                            {plan.isPopular && (
                                <div style={{
                                    position: 'absolute', top: -12, left: '50%', transform: 'translateX(-50%)',
                                    background: plan.color, color: '#fff', padding: '2px 12px', borderRadius: 20,
                                    fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase'
                                }}>
                                    Most Popular
                                </div>
                            )}
                            <div style={{ marginBottom: 20 }}>
                                <div style={{ 
                                    width: 48, height: 48, borderRadius: 12, background: `${plan.color}20`, color: plan.color,
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16
                                }}>
                                    {plan.icon}
                                </div>
                                <h3 style={{ fontSize: '1.25rem', marginBottom: 4 }}>{plan.name} Plan</h3>
                                <div style={{ fontSize: '1.75rem', fontWeight: 800 }}>
                                    ₹{plan.price}<span style={{ fontSize: '0.9rem', color: 'var(--text-muted)', fontWeight: 400 }}>/month</span>
                                </div>
                                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: 4 }}>
                                    Includes {plan.storage} storage
                                </div>
                            </div>

                            <div style={{ flex: 1, marginBottom: 24 }}>
                                <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
                                    {plan.features.map((f, i) => (
                                        <li key={i} style={{ fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: 8 }}>
                                            <Check size={14} color={plan.color} />
                                            <span>{f}</span>
                                        </li>
                                    ))}
                                    {plan.id === 'free' && PLANS[1].features.slice(-3).map((f, i) => (
                                         <li key={i} style={{ fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-muted)', opacity: 0.6 }}>
                                            <X size={14} />
                                            <span>{f}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>

                            <button 
                                className="btn btn-primary btn-full" 
                                disabled={isProcessing}
                                style={{ 
                                    background: plan.isPopular ? plan.color : 'transparent',
                                    border: plan.isPopular ? 'none' : `1px solid ${plan.color}`,
                                    color: plan.isPopular ? '#fff' : plan.color,
                                    boxShadow: plan.isPopular ? `0 4px 14px ${plan.color}40` : 'none'
                                }}
                                onClick={() => handleUpgrade(plan)}
                            >
                                {isProcessing && selectedPlan?.id === plan.id ? 'Loading...' : (plan.price === '0' ? 'Current Plan' : 'Purchase Plan')}
                            </button>
                        </div>
                    ))}
                </div>
            </div>

            <style dangerouslySetInnerHTML={{ __html: `
                .card.popular {
                    background: linear-gradient(145deg, #0f2a50, #0a1628);
                    box-shadow: 0 20px 40px rgba(0,0,0,0.4);
                }
            `}} />
        </div>
    );
}
