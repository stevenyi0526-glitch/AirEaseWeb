import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Plane } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import LoginModal from '../auth/LoginModal';
import RegisterModal from '../auth/RegisterModal';
import ForgotPasswordModal from '../auth/ForgotPasswordModal';
import UserProfileDropdown from '../auth/UserProfileDropdown';

const Header: React.FC = () => {
  const { isAuthenticated } = useAuth();
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [showForgotPasswordModal, setShowForgotPasswordModal] = useState(false);

  // Listen for global 'open-login-modal' event from other components
  useEffect(() => {
    const handleOpenLoginModal = () => setShowLoginModal(true);
    window.addEventListener('open-login-modal', handleOpenLoginModal);
    return () => window.removeEventListener('open-login-modal', handleOpenLoginModal);
  }, []);

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-40 bg-[#034891] shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-2">
          <div className="flex items-center justify-between">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-full flex items-center justify-center bg-white">
                <Plane className="w-5 h-5 text-primary" />
              </div>
              <span className="text-xl font-bold text-white">
                AirEase
              </span>
            </Link>

            {/* Auth buttons */}
            <div className="flex items-center gap-3">
              {isAuthenticated ? (
                <UserProfileDropdown isHomePage={true} />
              ) : (
                <>
                  <button
                    onClick={() => setShowLoginModal(true)}
                    className="px-4 py-2 rounded-lg font-medium transition-colors text-white hover:bg-white/10"
                  >
                    Sign In
                  </button>
                  <button
                    onClick={() => setShowRegisterModal(true)}
                    className="px-4 py-2 rounded-button font-medium transition-colors bg-white text-primary hover:bg-white/90"
                  >
                    Sign Up
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      <LoginModal
        isOpen={showLoginModal}
        onClose={() => setShowLoginModal(false)}
        onSwitchToRegister={() => {
          setShowLoginModal(false);
          setShowRegisterModal(true);
        }}
        onSwitchToForgotPassword={() => {
          setShowLoginModal(false);
          setShowForgotPasswordModal(true);
        }}
      />

      <RegisterModal
        isOpen={showRegisterModal}
        onClose={() => setShowRegisterModal(false)}
        onSwitchToLogin={() => {
          setShowRegisterModal(false);
          setShowLoginModal(true);
        }}
      />

      <ForgotPasswordModal
        isOpen={showForgotPasswordModal}
        onClose={() => setShowForgotPasswordModal(false)}
        onSwitchToLogin={() => {
          setShowForgotPasswordModal(false);
          setShowLoginModal(true);
        }}
      />
    </>
  );
};

export default Header;
