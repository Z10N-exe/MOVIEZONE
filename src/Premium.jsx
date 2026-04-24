import React, { useEffect } from 'react';
import { ArrowLeft, Crown, Check } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from './AppContext';
import { updateUserStatus } from './api';

// Replace with your actual Paystack public key
const PAYSTACK_PUBLIC_KEY = import.meta.env.VITE_PAYSTACK_KEY || 'pk_test_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx';
const PREMIUM_AMOUNT = 100000; // ₦1000 in kobo (Paystack uses kobo)

export default function Premium() {
  const navigate = useNavigate();
  const { isPremium, user, login } = useAppContext();

  // Load Paystack script
  useEffect(() => {
    if (document.getElementById('paystack-script')) return;
    const script = document.createElement('script');
    script.id = 'paystack-script';
    script.src = 'https://js.paystack.co/v1/inline.js';
    document.head.appendChild(script);
  }, []);

  const handleSubscribe = () => {
    if (isPremium) {
      alert('You are already a Premium member.');
      return;
    }

    if (!user?.email) {
      alert('Please log in to subscribe.');
      navigate('/auth');
      return;
    }

    const handler = window.PaystackPop?.setup({
      key: PAYSTACK_PUBLIC_KEY,
      email: user.email,
      amount: PREMIUM_AMOUNT,
      currency: 'NGN',
      ref: `mz_${Date.now()}_${user.id}`,
      metadata: {
        custom_fields: [
          { display_name: 'User ID', variable_name: 'user_id', value: user.id },
          { display_name: 'Plan', variable_name: 'plan', value: 'monthly_premium' },
        ],
      },
      callback: async (response) => {
        // Payment successful — activate premium
        console.log('Payment ref:', response.reference);
        try {
          // Update user premium status via API
          const token = localStorage.getItem('token');
          if (token) {
            await updateUserStatus(user.id, { isPremium: true });
          }
          // Update local state
          const updatedUser = { ...user, isPremium: true };
          login(updatedUser, localStorage.getItem('token'));
          alert('Payment successful! You are now a Premium member.');
          navigate('/profile');
        } catch (e) {
          console.error(e);
          alert('Payment received but activation failed. Contact support with ref: ' + response.reference);
        }
      },
      onClose: () => {
        console.log('Payment window closed');
      },
    });

    handler?.openIframe();
  };

  return (
    <div className="page-container" style={{ padding: '24px 20px', paddingBottom: 100 }}>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 32 }}>
        <ArrowLeft onClick={() => navigate(-1)} style={{ cursor: 'pointer', marginRight: 16 }} />
        <h2 style={{ fontSize: 20, fontWeight: 700 }}>Premium</h2>
      </div>

      <div style={{ textAlign: 'center', marginBottom: 40 }}>
        <Crown size={56} color="var(--primary-red)" style={{ marginBottom: 16 }} />
        <h2 style={{ fontSize: 24, fontWeight: 700, marginBottom: 12 }}>
          {isPremium ? 'Premium Active' : 'Subscribe to Premium'}
        </h2>
        <p style={{ color: 'var(--text-secondary)', lineHeight: 1.6 }}>
          Enjoy Full-HD movies, zero ads, and unlimited streaming.
        </p>
      </div>

      {/* Plan card */}
      <div style={{
        display: 'flex', alignItems: 'center', padding: 24,
        borderRadius: 16, border: `2px solid ${isPremium ? '#1db954' : 'var(--primary-red)'}`,
        marginBottom: 32, background: 'var(--surface-color-light)'
      }}>
        <Crown color={isPremium ? '#1db954' : 'var(--primary-red)'} size={32} style={{ marginRight: 16 }} />
        <div>
          <h3 style={{ fontSize: 22, fontWeight: 700 }}>₦1,000 <span style={{ fontSize: 13, color: 'var(--text-secondary)', fontWeight: 400 }}>/month</span></h3>
          <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4 }}>
            {isPremium ? 'Your subscription is active' : 'Cancel anytime'}
          </p>
        </div>
      </div>

      {/* Features */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 40 }}>
        {[
          'Watch all you want. Ad-free.',
          'Stream in Full HD & 4K quality.',
          'Download for offline viewing.',
          'Access all premium content.',
          'Priority customer support.',
        ].map(f => (
          <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 14 }}>
            <Check size={16} color="var(--primary-red)" />
            <span>{f}</span>
          </div>
        ))}
      </div>

      <button
        onClick={handleSubscribe}
        className={isPremium ? 'button-secondary' : 'button-primary'}
        style={{ boxShadow: isPremium ? 'none' : '0 4px 20px rgba(229, 9, 20, 0.4)' }}
      >
        {isPremium ? 'Already Subscribed' : 'Subscribe — ₦1,000/month'}
      </button>

      <p style={{ textAlign: 'center', fontSize: 11, color: 'var(--text-secondary)', marginTop: 16 }}>
        Secured by Paystack. Your payment info is never stored on our servers.
      </p>
    </div>
  );
}
