import React, { useState, useEffect } from 'react';
import { Plane, Sparkles } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import SearchForm from '../components/search/SearchForm';
import AISearchBar from '../components/search/AISearchBar';
import { getGreeting } from '../utils/formatters';

// Background images for looping slideshow - flight and plane related
const backgroundImages = [
  'https://images.unsplash.com/photo-1436491865332-7a61a109cc05?auto=format&fit=crop&w=1920&q=80', // airplane wing sunset
  'https://images.unsplash.com/photo-1569629743817-70d8db6c323b?auto=format&fit=crop&w=1920&q=80', // airplane in clouds
  'https://images.unsplash.com/photo-1529074963764-98f45c47344b?auto=format&fit=crop&w=1920&q=80', // airplane window view
  'https://images.unsplash.com/photo-1556388158-158ea5ccacbd?auto=format&fit=crop&w=1920&q=80', // airplane taking off
  'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&w=1920&q=80', // airplane at sunset
  'https://images.unsplash.com/photo-1542296332-2e4473faf563?auto=format&fit=crop&w=1920&q=80', // cockpit view
  'https://images.unsplash.com/photo-1517479149777-5f3b1511d5ad?auto=format&fit=crop&w=1920&q=80', // airplane silhouette
  'https://images.unsplash.com/photo-1464037866556-6812c9d1c72e?auto=format&fit=crop&w=1920&q=80', // city skyline from plane
];

const HomePage: React.FC = () => {
  const { user, isAuthenticated } = useAuth();
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [searchMode, setSearchMode] = useState<'ai' | 'classic'>('ai');

  // Background image slideshow loop
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentImageIndex((prevIndex) => 
        (prevIndex + 1) % backgroundImages.length
      );
    }, 5000); // Change image every 5 seconds

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Background Images with Fade Transition - Full Screen */}
      <div className="fixed inset-0 overflow-hidden">
        {backgroundImages.map((image, index) => (
          <div
            key={index}
            className="absolute inset-0 transition-opacity duration-1000 ease-in-out"
            style={{
              backgroundImage: `url(${image})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              opacity: index === currentImageIndex ? 1 : 0,
            }}
          />
        ))}
        {/* Dark overlay for text readability */}
        <div className="absolute inset-0 bg-black/40" />
      </div>

      {/* Hero Section - Responsive */}
      <div className="relative z-10 pt-20 pb-8 px-4 min-h-[50vh] flex flex-col justify-center">
        <div className="w-full max-w-md sm:max-w-lg md:max-w-xl lg:max-w-2xl xl:max-w-3xl mx-auto">
          {/* Main Heading - Large Text */}
          <div className="text-center mb-6">
            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-3 tracking-tight italic">
              Your Journey, Your Story
            </h1>
            <p className="text-base sm:text-lg md:text-xl text-white/90">
              {getGreeting()}, {isAuthenticated ? user?.username : 'Traveler'}. Find your perfect flight.
            </p>
          </div>

          {/* Search Mode Toggle */}
          <div className="flex justify-center mb-6">
            <div className="flex items-center gap-1 p-1 rounded-full bg-white/20 backdrop-blur-sm">
              <button
                onClick={() => setSearchMode('ai')}
                className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all ${
                  searchMode === 'ai'
                    ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg'
                    : 'text-white/80 hover:text-white'
                }`}
              >
                <Sparkles className="w-4 h-4" />
                <span>AI Search</span>
              </button>
              <button
                onClick={() => setSearchMode('classic')}
                className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all ${
                  searchMode === 'classic'
                    ? 'bg-white text-gray-800 shadow-lg'
                    : 'text-white/80 hover:text-white'
                }`}
              >
                <Plane className="w-4 h-4" />
                <span>Classic</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Search Section */}
      <div className="relative z-10 w-full max-w-sm sm:max-w-md md:max-w-lg lg:max-w-xl xl:max-w-2xl mx-auto px-4">
        {searchMode === 'ai' ? (
          <div className="mb-12">
            <AISearchBar />
            <p className="text-center text-white/70 text-sm mt-8">
              Just describe what you're looking for in natural language
            </p>
          </div>
        ) : (
          <SearchForm />
        )}
      </div>

      {/* Features Section - On background */}
      <div className="relative z-10 mt-8 pb-8">
        <div className="w-full max-w-sm sm:max-w-lg md:max-w-2xl lg:max-w-4xl xl:max-w-5xl mx-auto px-4 py-8">
          <h2 className="text-lg sm:text-xl font-bold text-center text-white mb-6">
            Why Choose Airease?
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
            <div className="bg-white/95 backdrop-blur-sm rounded-xl p-4 sm:p-5 shadow-lg text-center">
              <div className="w-10 h-10 mx-auto mb-3 rounded-full bg-green-100 flex items-center justify-center">
                <span className="text-lg sm:text-xl">🎯</span>
              </div>
              <h3 className="font-semibold text-gray-800 mb-1.5 text-sm">Smart Scoring</h3>
              <p className="text-gray-600 text-xs">
                Our Airease Score helps you find flights with the best balance of price, comfort, and service.
              </p>
            </div>

            <div className="bg-white/95 backdrop-blur-sm rounded-xl p-4 sm:p-5 shadow-lg text-center">
              <div className="w-10 h-10 mx-auto mb-3 rounded-full bg-blue-100 flex items-center justify-center">
                <span className="text-lg sm:text-xl">✈️</span>
              </div>
              <h3 className="font-semibold text-gray-800 mb-1.5 text-sm">Compare Easily</h3>
              <p className="text-gray-600 text-xs">
                See all the details that matter - WiFi, seat pitch, meals, and more - at a glance.
              </p>
            </div>

            <div className="bg-white/95 backdrop-blur-sm rounded-xl p-4 sm:p-5 shadow-lg text-center">
              <div className="w-10 h-10 mx-auto mb-3 rounded-full bg-yellow-100 flex items-center justify-center">
                <span className="text-lg sm:text-xl">💰</span>
              </div>
              <h3 className="font-semibold text-gray-800 mb-1.5 text-sm">Price Trends</h3>
              <p className="text-gray-600 text-xs">
                Track price history and know if you're getting a good deal.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HomePage;
