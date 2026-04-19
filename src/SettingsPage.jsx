import React from 'react';
import { ArrowLeft, User, Shield, Bell, Download, Globe, HelpCircle, FileText, CreditCard } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAppContext } from './AppContext';

export default function SettingsPage() {
  const navigate = useNavigate();
  const { topic } = useParams();
  const { logout, user } = useAppContext();
  
  const renderContent = () => {
    switch(topic) {
      case 'Profile':
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div style={{ padding: 20, backgroundColor: 'var(--surface-color)', borderRadius: 16 }}>
              <label style={{ color: '#888', fontSize: 12, display: 'block', marginBottom: 8 }}>NAME</label>
              <div style={{ fontSize: 16 }}>{user?.name}</div>
            </div>
            <div style={{ padding: 20, backgroundColor: 'var(--surface-color)', borderRadius: 16 }}>
              <label style={{ color: '#888', fontSize: 12, display: 'block', marginBottom: 8 }}>EMAIL</label>
              <div style={{ fontSize: 16 }}>{user?.email}</div>
            </div>
            <button className="button-secondary">Change Password</button>
          </div>
        );
      case 'Security':
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <button className="button-secondary">Change Security PIN</button>
            <button className="button-secondary">Two-Factor Authentication</button>
            <button className="button-secondary" style={{ color: '#ff3b3b' }}>Clear Login History</button>
          </div>
        );
      case 'Language':
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {['English (US)', 'Nigeria (Hausa)', 'Nigeria (Yoruba)', 'Nigeria (Igbo)'].map(lang => (
              <div key={lang} style={{ padding: 18, backgroundColor: 'var(--surface-color)', borderRadius: 12, display: 'flex', justifyContent: 'space-between' }}>
                {lang}
                {lang === 'English (US)' && <div style={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: 'var(--primary-red)' }} />}
              </div>
            ))}
          </div>
        );
      case 'Download':
        return (
           <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
             <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Smart Downloads</span>
                <div style={{ width: 40, height: 24, borderRadius: 12, backgroundColor: 'var(--primary-red)', position: 'relative' }}><div style={{ width: 20, height: 20, borderRadius: '50%', backgroundColor: '#fff', position: 'absolute', right: 2, top: 2 }} /></div>
             </div>
             <p style={{ fontSize: 12, color: '#888' }}>We'll automatically download recommended movies for you based on your taste.</p>
           </div>
        );
      case 'PaymentHistory':
        return (
          <div style={{ padding: 20, backgroundColor: 'var(--surface-color)', borderRadius: 16, textAlign: 'center' }}>
            <p style={{ color: '#888' }}>No recent transactions found.</p>
          </div>
        );
      case 'HelpCenter':
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ padding: 18, backgroundColor: 'var(--surface-color)', borderRadius: 12 }}>FAQ</div>
            <div style={{ padding: 18, backgroundColor: 'var(--surface-color)', borderRadius: 12 }}>Contact Support</div>
            <div style={{ padding: 18, backgroundColor: 'var(--surface-color)', borderRadius: 12 }}>Terms of Service</div>
          </div>
        );
      case 'PrivacyPolicy':
        return (
          <div style={{ padding: 20, backgroundColor: 'var(--surface-color)', borderRadius: 16, lineHeight: '1.6', fontSize: 14 }}>
            <p>At MOVIEZONE, we value your privacy. We do not sell your data to third parties. Your streaming history is used only to improve your recommendations.</p>
          </div>
        );
      case 'Notification':
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
               <span>New Content Alerts</span>
               <div style={{ width: 40, height: 24, borderRadius: 12, backgroundColor: 'var(--primary-red)', position: 'relative' }}><div style={{ width: 20, height: 20, borderRadius: '50%', backgroundColor: '#fff', position: 'absolute', right: 2, top: 2 }} /></div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
               <span>App Updates</span>
               <div style={{ width: 40, height: 24, borderRadius: 12, backgroundColor: '#333', position: 'relative' }}><div style={{ width: 20, height: 20, borderRadius: '50%', backgroundColor: '#fff', position: 'absolute', left: 2, top: 2 }} /></div>
            </div>
          </div>
        );
      default:
        return (
          <div style={{ textAlign: 'center', padding: '40px 0', color: '#888' }}>
            <p>Settings for {topic} coming soon...</p>
          </div>
        );
    }
  };
  
  return (
    <div className="page-container" style={{ padding: '24px 20px', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 32 }}>
        <ArrowLeft onClick={() => navigate(-1)} style={{ cursor: 'pointer', marginRight: 16 }} />
        <h2 style={{ fontSize: 20, fontWeight: 700 }}>{topic} Settings</h2>
      </div>

      <div style={{ flex: 1 }}>
        {renderContent()}
      </div>

      <div style={{ marginTop: 'auto', paddingTop: 20 }}>
        <button onClick={() => { logout(); navigate('/'); }} className="button-primary" style={{ backgroundColor: '#ff3b3b', width: '100%' }}>
          Logout
        </button>
      </div>
    </div>
  );
}
