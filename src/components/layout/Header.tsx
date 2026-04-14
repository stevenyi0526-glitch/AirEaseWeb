import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Plane, Globe } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../contexts/AuthContext';
import LoginModal from '../auth/LoginModal';
import RegisterModal from '../auth/RegisterModal';
import ForgotPasswordModal from '../auth/ForgotPasswordModal';
import UserProfileDropdown from '../auth/UserProfileDropdown';

const LANGUAGES = [
  { code: 'zh-TW', label: '繁體中文', available: true },
  { code: 'en', label: 'English', available: true },
  { code: 'ja', label: '日本語', available: false },
  { code: 'ko', label: '한국어', available: false },
  { code: 'es', label: 'Español', available: false },
  { code: 'fr', label: 'Français', available: false },
  { code: 'de', label: 'Deutsch', available: false },
  { code: 'th', label: 'ไทย', available: false },
] as const;

const Header: React.FC = () => {
  const { isAuthenticated } = useAuth();
  const { t, i18n } = useTranslation();
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [showForgotPasswordModal, setShowForgotPasswordModal] = useState(false);
  const [showLangMenu, setShowLangMenu] = useState(false);
  const langMenuRef = useRef<HTMLDivElement>(null);

  const switchLanguage = (code: string, available: boolean) => {
    if (!available) {
      alert(t('header.languageDeveloping'));
      return;
    }
    i18n.changeLanguage(code);
    document.documentElement.lang = code;
    setShowLangMenu(false);
  };

  // Close language menu on outside click
  useEffect(() => {
    if (!showLangMenu) return;
    const handleClick = (e: MouseEvent) => {
      if (langMenuRef.current && !langMenuRef.current.contains(e.target as Node)) {
        setShowLangMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [showLangMenu]);

  // Listen for global 'open-login-modal' event from other components
  useEffect(() => {
    const handleOpenLoginModal = () => setShowLoginModal(true);
    window.addEventListener('open-login-modal', handleOpenLoginModal);
    return () => window.removeEventListener('open-login-modal', handleOpenLoginModal);
  }, []);

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-40 bg-[#034891] shadow-sm">
        <div className="max-w-6xl mx-auto px-3 sm:px-4 py-1.5 sm:py-2">
          <div className="flex items-center justify-between">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-2 sm:gap-2.5">
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center bg-white">
                <Plane className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
              </div>
              <span className="text-lg sm:text-xl font-bold text-white">
                AirEase
              </span>
            </Link>

            {/* Auth buttons */}
            <div className="flex items-center gap-2 sm:gap-3">
              {/* Language switcher */}
              <div className="relative" ref={langMenuRef}>
                <button
                  onClick={() => setShowLangMenu(!showLangMenu)}
                  className="p-1.5 sm:p-2 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors"
                  title={i18n.language === 'zh-TW' ? 'Switch Language' : '切換語言'}
                >
                  <Globe className="w-4 h-4 sm:w-5 sm:h-5" />
                </button>
                {showLangMenu && (
                  <div className="absolute right-0 mt-1 w-44 bg-white rounded-lg shadow-lg ring-1 ring-black/5 py-1 z-50 max-h-72 overflow-y-auto">
                    {LANGUAGES.map((lang) => (
                      <button
                        key={lang.code}
                        onClick={() => switchLanguage(lang.code, lang.available)}
                        className={`w-full text-left px-4 py-2 text-sm transition-colors flex items-center justify-between ${
                          i18n.language === lang.code
                            ? 'text-primary font-semibold bg-primary/5'
                            : lang.available
                              ? 'text-gray-700 hover:bg-gray-50'
                              : 'text-gray-400 hover:bg-gray-50'
                        }`}
                      >
                        <span>{lang.label}</span>
                        {!lang.available && (
                          <span className="text-[10px] text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">Soon</span>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {isAuthenticated ? (
                <UserProfileDropdown isHomePage={true} />
              ) : (
                <>
                  <button
                    onClick={() => setShowLoginModal(true)}
                    className="px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg text-sm font-medium transition-colors text-white hover:bg-white/10"
                  >
                    {t('header.signIn')}
                  </button>
                  <button
                    onClick={() => setShowRegisterModal(true)}
                    className="px-3 sm:px-4 py-1.5 sm:py-2 rounded-button text-sm font-medium transition-colors bg-white text-primary hover:bg-white/90"
                  >
                    {t('header.signUp')}
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
