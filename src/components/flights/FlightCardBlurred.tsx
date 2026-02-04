import React, { useState } from 'react';
import { Lock, Clock, Star } from 'lucide-react';
import LoginModal from '../auth/LoginModal';
import RegisterModal from '../auth/RegisterModal';

interface FlightCardBlurredProps {
  departureCode?: string;
  arrivalCode?: string;
}

const FlightCardBlurred: React.FC<FlightCardBlurredProps> = ({
  departureCode = '***',
  arrivalCode = '***',
}) => {
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showRegisterModal, setShowRegisterModal] = useState(false);

  return (
    <>
      <div
        className="relative flight-card overflow-hidden cursor-pointer group"
        onClick={() => setShowLoginModal(true)}
      >
        {/* Blurred Content */}
        <div className="blur-md pointer-events-none p-4">
          {/* Header */}
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-gray-200" />
              <div>
                <div className="h-4 w-24 bg-gray-200 rounded" />
                <div className="h-3 w-16 bg-gray-100 rounded mt-1" />
              </div>
            </div>
            <div className="bg-gray-300 px-3 py-2 rounded-xl">
              <div className="flex items-center gap-1">
                <Star className="w-4 h-4 text-gray-400" />
                <div className="h-5 w-6 bg-gray-400 rounded" />
              </div>
              <div className="h-3 w-12 bg-gray-200 rounded mt-1" />
            </div>
          </div>

          {/* Times */}
          <div className="flex items-center justify-between mb-4">
            <div className="text-center">
              <div className="h-7 w-14 bg-gray-200 rounded" />
              <div className="h-4 w-10 bg-gray-100 rounded mt-1 mx-auto" />
            </div>

            <div className="flex-1 px-4">
              <div className="flex items-center justify-center gap-2 mb-1">
                <Clock className="w-4 h-4 text-gray-300" />
                <div className="h-4 w-12 bg-gray-100 rounded" />
              </div>
              <div className="h-px bg-gray-200" />
            </div>

            <div className="text-center">
              <div className="h-7 w-14 bg-gray-200 rounded" />
              <div className="h-4 w-10 bg-gray-100 rounded mt-1 mx-auto" />
            </div>

            <div className="text-right ml-4">
              <div className="h-7 w-16 bg-gray-300 rounded" />
              <div className="h-3 w-12 bg-gray-100 rounded mt-1" />
            </div>
          </div>

          {/* Date */}
          <div className="flex items-center gap-2 mb-3">
            <Clock className="w-4 h-4 text-gray-300" />
            <div className="h-4 w-32 bg-gray-100 rounded" />
          </div>
        </div>

        {/* Overlay with CTA */}
        <div className="absolute inset-0 bg-white/70 backdrop-blur-sm flex flex-col items-center justify-center transition-all group-hover:bg-white/80">
          <div className="w-12 h-12 rounded-full bg-airease-blue/10 flex items-center justify-center mb-3">
            <Lock className="w-6 h-6 text-airease-blue" />
          </div>
          <p className="text-gray-700 font-semibold mb-1">Sign in to view this flight</p>
          <p className="text-sm text-gray-500 mb-4">
            {departureCode} → {arrivalCode}
          </p>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowRegisterModal(true);
            }}
            className="btn-primary"
          >
            Sign Up Free
          </button>
        </div>
      </div>

      <LoginModal
        isOpen={showLoginModal}
        onClose={() => setShowLoginModal(false)}
        onSwitchToRegister={() => {
          setShowLoginModal(false);
          setShowRegisterModal(true);
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
    </>
  );
};

export default FlightCardBlurred;
