import React from 'react';
import { ChevronRight, Crown, User, Bell, Download, Shield, Globe, HelpCircle, FileText, CreditCard, CheckCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from './AppContext';

const ProfileMenuItem = ({ icon: Icon, title, rightContent, onClick }) => (
  <div onClick={onClick} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 0', borderBottom: '1px solid var(--border-color)', cursor: 'pointer' }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
      <Icon style={{ color: 'var(--text-secondary)' }} size={24} />
      <span style={{ fontSize: 16, fontWeight: 500 }}>{title}</span>
    </div>
    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      {rightContent}
      <ChevronRight style={{ color: 'var(--text-secondary)' }} size={20} />
    </div>
  </div>
);

export default function Profile() {
  const navigate = useNavigate();
  const { isPremium, user } = useAppContext();

  return (
    <div className="page-container" style={{ padding: '24px 20px', paddingBottom: 100 }}>
      {/* Avatar + Name */}
      <div style={{ textAlign: 'center', marginTop: 24, marginBottom: 32 }}>
        <div style={{ position: 'relative', width: 100, margin: '0 auto 16px' }}>
          <div style={{
            width: 100, height: 100, borderRadius: '50%',
            background: 'var(--surface-color-light)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'var(--primary-red)',
            border: isPremium ? '3px solid #E50914' : '3px solid transparent',
            boxSizing: 'border-box'
          }}>
            <User size={50} />
          </div>
          {isPremium && (
            <div style={{
              position: 'absolute', bottom: 0, right: 0,
              background: '#E50914', borderRadius: '50%',
              width: 28, height: 28,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              border: '2px solid #0a0a0a'
            }}>
              <CheckCircle size={16} color="#fff" />
            </div>
          )}
        </div>
        <h2 style={{ fontSize: 24, fontWeight: 700, marginBottom: 4 }}>{user?.name || 'User'}</h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: 14, marginBottom: isPremium ? 8 : 0 }}>
          {user?.email || 'user@example.com'}
        </p>
        {isPremium && (
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            background: 'linear-gradient(135deg, #E50914, #ff4d4d)',
            borderRadius: 20, padding: '4px 14px',
            marginTop: 6
          }}>
            <CheckCircle size={14} color="#fff" />
            <span style={{ fontSize: 12, fontWeight: 700, color: '#fff', letterSpacing: '0.5px' }}>
              MovieZone PRO
            </span>
          </div>
        )}
      </div>

      {/* PRO Card — conditionally shown */}
      {isPremium ? (
        <div style={{
          background: 'linear-gradient(135deg, #1a0a0a, #2d1010)',
          borderRadius: 16,
          padding: 24,
          display: 'flex',
          alignItems: 'center',
          gap: 16,
          marginBottom: 32,
          border: '1px solid rgba(229,9,20,0.3)',
          boxShadow: '0 4px 20px rgba(229, 9, 20, 0.15)'
        }}>
          <div style={{
            background: 'rgba(229,9,20,0.15)',
            borderRadius: 12,
            width: 52, height: 52,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0
          }}>
            <Crown size={28} color="#E50914" />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <h3 style={{ fontSize: 18, fontWeight: 700, color: '#fff' }}>Subscribed</h3>
              <CheckCircle size={16} color="#E50914" />
            </div>
            <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', margin: 0 }}>
              You have full access to all premium content.
            </p>
          </div>
        </div>
      ) : (
        <div
          onClick={() => navigate('/premium')}
          style={{
            backgroundColor: 'var(--primary-red)',
            borderRadius: 16,
            padding: 24,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 32,
            cursor: 'pointer',
            boxShadow: '0 4px 20px rgba(229, 9, 20, 0.4)'
          }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <Crown size={32} color="#fff" />
            <div>
              <h3 style={{ fontSize: 18, fontWeight: 700, color: '#fff', marginBottom: 4 }}>Join Premium!</h3>
              <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.8)', margin: 0 }}>
                Enjoy watching Full-HD movies, without restrictions.
              </p>
            </div>
          </div>
          <ChevronRight color="#fff" />
        </div>
      )}

      {/* Menu Items */}
      <div>
        <ProfileMenuItem icon={User} title="Edit Profile" onClick={() => navigate('/settings/Profile')} />
        <ProfileMenuItem icon={Bell} title="Notification" onClick={() => navigate('/settings/Notification')} />
        <ProfileMenuItem icon={Download} title="Download Settings" rightContent={<div style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: 'var(--primary-red)' }} />} onClick={() => navigate('/settings/Download')} />
        <ProfileMenuItem icon={Shield} title="Security" onClick={() => navigate('/settings/Security')} />
        <ProfileMenuItem icon={Globe} title="Language" rightContent={<span style={{ color: 'var(--text-secondary)', fontSize: 14 }}>English (US)</span>} onClick={() => navigate('/settings/Language')} />
        <ProfileMenuItem icon={CreditCard} title="Payment History" onClick={() => navigate('/settings/PaymentHistory')} />
        <ProfileMenuItem icon={HelpCircle} title="Help Center" onClick={() => navigate('/settings/HelpCenter')} />
        <ProfileMenuItem icon={FileText} title="Privacy Policy" onClick={() => navigate('/settings/PrivacyPolicy')} />
      </div>
    </div>
  );
}
