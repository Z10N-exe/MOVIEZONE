import React from 'react';
import { ArrowLeft, Crown, Check } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from './AppContext';

const PlanCard = ({ title, price, isSelected }) => (
  <div style={{ 
    display: 'flex', 
    alignItems: 'center', 
    padding: 24, 
    borderRadius: 16, 
    border: `2px solid ${isSelected ? 'var(--primary-red)' : 'var(--border-color)'}`,
    marginBottom: 24
  }}>
    <Crown color="var(--primary-red)" size={32} style={{ marginRight: 16 }} />
    <div>
      <h3 style={{ fontSize: 24, fontWeight: 700 }}>{price} <span style={{fontSize: 14, color: 'var(--text-secondary)'}}>/month</span></h3>
    </div>
  </div>
);

export default function Premium() {
  const navigate = useNavigate();
  const { isPremium, setIsPremium } = useAppContext();

  const handleSubscribe = () => {
    if (isPremium) {
       alert('You are already a premium member.');
       return;
    }
    setIsPremium(true);
    alert('Payment successful! ₦1000 deducted. You are now a Premium member.');
    navigate('/profile');
  };

  return (
    <div className="page-container" style={{ padding: '24px 20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 32 }}>
        <ArrowLeft onClick={() => navigate(-1)} style={{ cursor: 'pointer', marginRight: 16 }} />
      </div>

      <div style={{ textAlign: 'center', marginBottom: 40 }}>
        <h2 style={{ fontSize: 24, fontWeight: 700, color: 'var(--primary-red)', marginBottom: 12 }}>{isPremium ? 'Premium Active' : 'Subscribe to Premium'}</h2>
        <p style={{ color: 'var(--text-secondary)' }}>Enjoy watching Full-HD movies, without restrictions and without ads.</p>
      </div>

      <PlanCard title="Monthly" price="₦1000" isSelected />

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 40 }}>
        <p style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 14 }}><span style={{ color: 'var(--primary-red)' }}><Check size={16} /></span> Watch all you want. Ad-free.</p>
        <p style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 14 }}><span style={{ color: 'var(--primary-red)' }}><Check size={16} /></span> Allows streaming of 4K.</p>
        <p style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 14 }}><span style={{ color: 'var(--primary-red)' }}><Check size={16} /></span> Video & Audio Quality is Better.</p>
      </div>

      <div style={{ position: 'absolute', bottom: 24, left: 20, right: 20 }}>
         <button onClick={handleSubscribe} className={isPremium ? "button-secondary" : "button-primary"} style={{ boxShadow: isPremium ? 'none' : '0 4px 20px rgba(229, 9, 20, 0.4)' }}>
           {isPremium ? 'Manage Subscription' : 'Subscribe with Paystack'}
         </button>
      </div>
    </div>
  );
}
