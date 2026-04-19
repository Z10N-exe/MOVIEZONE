import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from './AppContext';
import { Lock, Mail, User, AlertCircle } from 'lucide-react';
import { loginUser, signupUser } from './api';

export default function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const navigate = useNavigate();
  const { login } = useAppContext();
  
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({ name: '', email: '', password: '' });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const res = isLogin 
        ? await loginUser({ email: formData.email, password: formData.password })
        : await signupUser(formData);
      
      if (res.status === 'success') {
        login(res.user, res.token);
        navigate(res.user.role === 'admin' ? '/admin' : '/');
      } else {
        setError(res.message || 'Signup failed. Please try again.');
      }
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.');
    }
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  return (
    <div className="page-container" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px 20px' }}>
      <div style={{ textAlign: 'center', marginBottom: 40 }}>
        <div style={{ 
          color: 'var(--primary-red)', 
          fontSize: 64, 
          fontWeight: 'bold', 
          marginBottom: 16 
        }}>M</div>
        <h1 style={{ fontSize: 24, fontWeight: 'bold' }}>
          {isLogin ? 'Login to Your Account' : 'Create Your Account'}
        </h1>
      </div>

      <form onSubmit={handleSubmit} style={{ width: '100%', maxWidth: 400 }}>
        {!isLogin && (
          <div style={{ position: 'relative', marginBottom: 20 }}>
            <User style={{ position: 'absolute', left: 16, top: 16, color: 'var(--text-secondary)' }} />
            <input 
               type="text" 
               name="name"
               placeholder="Full Name" 
               required
               value={formData.name}
               onChange={handleChange}
               style={{ width: '100%', padding: '16px 16px 16px 48px', borderRadius: 12, border: 'none', backgroundColor: 'var(--surface-color-light)', color: '#fff', fontSize: 16 }} 
            />
          </div>
        )}
        <div style={{ position: 'relative', marginBottom: 20 }}>
          <Mail style={{ position: 'absolute', left: 16, top: 16, color: 'var(--text-secondary)' }} />
          <input 
             type="email" 
             name="email"
             placeholder="Email" 
             required
             value={formData.email}
             onChange={handleChange}
             style={{ width: '100%', padding: '16px 16px 16px 48px', borderRadius: 12, border: 'none', backgroundColor: 'var(--surface-color-light)', color: '#fff', fontSize: 16 }} 
          />
        </div>
        <div style={{ position: 'relative', marginBottom: 32 }}>
          <Lock style={{ position: 'absolute', left: 16, top: 16, color: 'var(--text-secondary)' }} />
          <input 
             type="password" 
             name="password"
             placeholder="Password" 
             required
             value={formData.password}
             onChange={handleChange}
             style={{ width: '100%', padding: '16px 16px 16px 48px', borderRadius: 12, border: 'none', backgroundColor: 'var(--surface-color-light)', color: '#fff', fontSize: 16 }} 
          />
        </div>

        {error && (
          <div style={{ color: 'var(--primary-red)', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8, fontSize: 14 }}>
            <AlertCircle size={16} /> {error}
          </div>
        )}

        <button type="submit" className="button-primary">
          {isLogin ? 'Sign In' : 'Sign Up'}
        </button>
      </form>

      <div style={{ marginTop: 24, display: 'flex', gap: 8, fontSize: 14 }}>
        <span style={{ color: 'var(--text-secondary)' }}>
          {isLogin ? "Don't have an account?" : "Already have an account?"}
        </span>
        <span 
          style={{ color: 'var(--primary-red)', cursor: 'pointer', fontWeight: 'bold' }}
          onClick={() => setIsLogin(!isLogin)}
        >
          {isLogin ? "Sign Up" : "Sign In"}
        </span>
      </div>
    </div>
  );
}
