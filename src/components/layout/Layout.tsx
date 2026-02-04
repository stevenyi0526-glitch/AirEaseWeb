import React, { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { MessageSquareWarning } from 'lucide-react';
import Header from './Header';
import { FeedbackModal } from '../common/FeedbackModal';

const Layout: React.FC = () => {
  const location = useLocation();
  const isHomePage = location.pathname === '/';
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className={isHomePage ? '' : 'pt-14'}>
        <Outlet />
      </main>

      {/* Global Floating Feedback Button */}
      <button
        onClick={() => setShowFeedbackModal(true)}
        className="fixed bottom-6 right-6 z-40 flex items-center gap-2 px-4 py-3 
                   bg-gradient-to-r from-amber-500 to-orange-500 
                   hover:from-amber-600 hover:to-orange-600
                   text-white font-medium rounded-full shadow-lg
                   transition-all duration-200 hover:scale-105
                   group"
        title="Feedback & Report"
      >
        <MessageSquareWarning className="w-5 h-5" />
        <span className="hidden sm:inline">Feedback</span>
      </button>

      {/* Feedback Modal */}
      <FeedbackModal
        isOpen={showFeedbackModal}
        onClose={() => setShowFeedbackModal(false)}
      />
    </div>
  );
};

export default Layout;
