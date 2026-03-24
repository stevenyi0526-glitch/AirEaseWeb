import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Heart, Trash2, ArrowLeft, Plane, Calendar, ChevronRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useFavoritesStore } from '../stores/favoritesStore';
import { useAuth } from '../contexts/AuthContext';
import ScoreBadge from '../components/flights/ScoreBadge';
import { formatPrice, formatDate, formatTime } from '../utils/formatters';
import { translateAirline } from '../utils/translate';

const FavoritesPage: React.FC = () => {
  const { t } = useTranslation();
  const { isAuthenticated } = useAuth();
  const { favorites, isLoading, fetchFavorites, removeFavorite } = useFavoritesStore();

  useEffect(() => {
    if (isAuthenticated) {
      fetchFavorites();
    }
  }, [isAuthenticated, fetchFavorites]);

  const handleRemove = async (flightId: string) => {
    if (confirm(t('favorites.removeConfirm'))) {
      await removeFavorite(flightId);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center">
        <Heart className="w-16 h-16 mx-auto text-gray-300 mb-4" />
        <h1 className="text-2xl font-bold text-text-primary mb-2">{t('favorites.signInRequired')}</h1>
        <p className="text-text-secondary mb-6">
          {t('favorites.signInDesc')}
        </p>
        <Link to="/" className="btn-primary">
          {t('favorites.backToHome')}
        </Link>
      </div>
    );
  }

  return (
    <main className="max-w-4xl mx-auto px-4 py-6">
      {/* Back Link */}
      <Link
        to="/"
        className="inline-flex items-center gap-1 text-text-secondary hover:text-primary mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>{t('favorites.backToHome')}</span>
      </Link>

      {/* Page Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
            <h1 className="text-2xl font-bold text-text-primary">{t('favorites.title')}</h1>
            <p className="text-text-secondary">
              {t('favorites.savedFlights', { count: favorites.length })}
            </p>
          </div>
        </div>

        {/* Favorites List */}
        {isLoading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary mx-auto" />
            <p className="text-text-secondary mt-4">{t('favorites.loadingFavorites')}</p>
          </div>
        ) : favorites.length === 0 ? (
          <div className="bg-surface rounded-2xl shadow-card p-12 text-center">
            <Heart className="w-16 h-16 mx-auto text-gray-300 mb-4" />
            <h2 className="text-xl font-semibold text-text-primary mb-2">{t('favorites.noFavorites')}</h2>
            <p className="text-text-secondary mb-6">
              {t('favorites.noFavoritesDesc')}
            </p>
            <Link to="/" className="btn-primary">
              {t('favorites.searchFlights')}
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {favorites.map((favorite) => (
              <div
                key={favorite.id}
                className="bg-surface rounded-2xl shadow-card overflow-hidden hover:shadow-lg transition-shadow"
              >
                <div className="p-4 md:p-5">
                  {/* Header Row */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-primary-light flex items-center justify-center">
                        <Plane className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-text-primary">{translateAirline(favorite.airline)}</h3>
                        <p className="text-sm text-text-secondary">{favorite.flightNumber}</p>
                      </div>
                    </div>
                    <ScoreBadge score={favorite.score} size="sm" />
                  </div>

                  {/* Route Row */}
                  <div className="flex items-center gap-4 mb-3">
                    <div>
                      <p className="text-lg font-bold text-text-primary">{favorite.departureCity}</p>
                      <p className="text-sm text-text-secondary">{formatTime(favorite.departureTime)}</p>
                    </div>
                    <div className="flex-1 border-t border-dashed border-border" />
                    <div className="text-right">
                      <p className="text-lg font-bold text-text-primary">{favorite.arrivalCity}</p>
                    </div>
                  </div>

                  {/* Date & Price Row */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm text-text-secondary">
                      <Calendar className="w-4 h-4" />
                      <span>{formatDate(favorite.departureTime)}</span>
                    </div>
                    <p className="text-xl font-bold text-primary">
                      {formatPrice(favorite.price, 'CNY')}
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-between mt-4 pt-4 border-t border-divider">
                    <button
                      onClick={() => handleRemove(favorite.flightId)}
                      className="flex items-center gap-1 text-danger hover:text-danger/80 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                      <span className="text-sm font-medium">{t('common.remove')}</span>
                    </button>
                    <Link
                      to={`/flights/${favorite.flightId}`}
                      className="flex items-center gap-1 text-primary hover:text-primary-hover transition-colors"
                    >
                      <span className="font-medium">{t('common.viewDetails')}</span>
                      <ChevronRight className="w-4 h-4" />
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
    </main>
  );
};

export default FavoritesPage;
