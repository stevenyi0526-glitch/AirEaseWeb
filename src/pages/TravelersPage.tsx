import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { User, ArrowLeft, Plus, Trash2, Edit2, Star, Shield } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useTravelersStore } from '../stores/travelersStore';
import { useAuth } from '../contexts/AuthContext';
import type { CreateTraveler, Traveler } from '../api/types';
import { cn } from '../utils/cn';

const MONTH_KEYS = [
  'months.january', 'months.february', 'months.march', 'months.april',
  'months.may', 'months.june', 'months.july', 'months.august',
  'months.september', 'months.october', 'months.november', 'months.december',
];

interface TravelerFormProps {
  traveler?: Traveler;
  onSave: (data: CreateTraveler) => void;
  onCancel: () => void;
  isLoading?: boolean;
  error?: string | null;
}

const TravelerForm: React.FC<TravelerFormProps> = ({ traveler, onSave, onCancel, isLoading, error }) => {
  const { t } = useTranslation();
  const [formData, setFormData] = useState<CreateTraveler>({
    firstName: traveler?.firstName || '',
    middleName: traveler?.middleName || '',
    lastName: traveler?.lastName || '',
    passportNumber: '',
    dob: traveler?.dob || '',
    nationality: traveler?.nationality || '',
    gender: traveler?.gender || '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // When adding: convert empty optional fields to undefined so backend doesn't receive invalid values (e.g. dob: "" fails date validation)
    // When editing: keep empty strings as "" so the backend receives them and clears the field
    //   (backend checks `if field is not None:` — undefined/missing keys = skip, "" = clear)
    const isEditing = !!traveler;
    // Only send dob if it's a complete YYYY-MM-DD (not a partial selection like "-03-")
    const dobParts = (formData.dob || '').split('-');
    const completeDob = (dobParts.length === 3 && dobParts[0] && dobParts[1] && dobParts[2]) ? formData.dob : undefined;
    const cleanedData: CreateTraveler = {
      firstName: formData.firstName,
      lastName: formData.lastName,
      middleName: isEditing ? (formData.middleName ?? '') : (formData.middleName || undefined),
      passportNumber: isEditing ? (formData.passportNumber ?? '') : (formData.passportNumber || undefined),
      dob: completeDob,
      nationality: isEditing ? (formData.nationality ?? '') : (formData.nationality || undefined),
      gender: isEditing ? (formData.gender ?? '') : (formData.gender || undefined),
    };
    onSave(cleanedData);
  };

  return (
    <form onSubmit={handleSubmit} className="bg-surface rounded-2xl shadow-card p-6">
      <h3 className="text-lg font-semibold text-text-primary mb-4">
        {traveler ? t('travelers.editTraveler') : t('travelers.addNew')}
      </h3>

      {error && (
        <div className="p-3 mb-4 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-1">
            {t('travelers.firstName')} *
          </label>
          <input
            type="text"
            required
            value={formData.firstName}
            onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
            className="w-full px-4 py-2.5 rounded-xl border border-border focus:ring-2 focus:ring-primary focus:border-transparent"
            placeholder="John"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-text-secondary mb-1">
            {t('travelers.middleName')}
          </label>
          <input
            type="text"
            value={formData.middleName}
            onChange={(e) => setFormData({ ...formData, middleName: e.target.value })}
            className="w-full px-4 py-2.5 rounded-xl border border-border focus:ring-2 focus:ring-primary focus:border-transparent"
            placeholder={t('travelers.optional')}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-text-secondary mb-1">
            {t('travelers.lastName')} *
          </label>
          <input
            type="text"
            required
            value={formData.lastName}
            onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
            className="w-full px-4 py-2.5 rounded-xl border border-border focus:ring-2 focus:ring-primary focus:border-transparent"
            placeholder="Doe"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-text-secondary mb-1">
            {t('travelers.dob')}
          </label>
          {(() => {
            // Parse existing dob (YYYY-MM-DD) or partial (--MM, YYYY--, etc.) into parts
            const parts = (formData.dob || '').split('-');
            const dobYear = parts[0] || '';
            const dobMonth = parts[1] || '';
            const dobDay = parts[2] || '';

            const updateDob = (year: string, month: string, day: string) => {
              if (year && month && day) {
                // All filled → valid YYYY-MM-DD
                setFormData({ ...formData, dob: `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}` });
              } else if (!year && !month && !day) {
                // All empty → clear
                setFormData({ ...formData, dob: '' });
              } else {
                // Partially filled → store as partial so selects keep their value
                const y = year || '';
                const m = month ? month.padStart(2, '0') : '';
                const d = day ? day.padStart(2, '0') : '';
                setFormData({ ...formData, dob: `${y}-${m}-${d}` });
              }
            };

            const currentYear = new Date().getFullYear();
            const years = Array.from({ length: 100 }, (_, i) => (currentYear - i).toString());
            const months = MONTH_KEYS.map((key, i) => ({ value: (i + 1).toString().padStart(2, '0'), label: t(key) }));
            const daysInMonth = dobYear && dobMonth
              ? new Date(parseInt(dobYear), parseInt(dobMonth), 0).getDate()
              : 31;
            const days = Array.from({ length: daysInMonth }, (_, i) => (i + 1).toString().padStart(2, '0'));

            const selectClass = "px-3 py-2.5 rounded-xl border border-border focus:ring-2 focus:ring-primary focus:border-transparent bg-surface text-sm";

            return (
              <div className="grid grid-cols-3 gap-2">
                <select
                  value={dobMonth}
                  onChange={(e) => updateDob(dobYear, e.target.value, dobDay)}
                  className={selectClass}
                >
                  <option value="">{t('travelers.month')}</option>
                  {months.map((m) => (
                    <option key={m.value} value={m.value}>{m.label}</option>
                  ))}
                </select>
                <select
                  value={dobDay}
                  onChange={(e) => updateDob(dobYear, dobMonth, e.target.value)}
                  className={selectClass}
                >
                  <option value="">{t('travelers.day')}</option>
                  {days.map((d) => (
                    <option key={d} value={d}>{parseInt(d)}</option>
                  ))}
                </select>
                <select
                  value={dobYear}
                  onChange={(e) => updateDob(e.target.value, dobMonth, dobDay)}
                  className={selectClass}
                >
                  <option value="">{t('travelers.year')}</option>
                  {years.map((y) => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </div>
            );
          })()}
        </div>

        <div>
          <label className="block text-sm font-medium text-text-secondary mb-1">
            {t('travelers.passport')}
          </label>
          <input
            type="text"
            value={formData.passportNumber}
            onChange={(e) => setFormData({ ...formData, passportNumber: e.target.value })}
            className="w-full px-4 py-2.5 rounded-xl border border-border focus:ring-2 focus:ring-primary focus:border-transparent"
            placeholder="E12345678"
          />
          <p className="text-xs text-text-muted mt-1">{t('travelers.encryptedNote')}</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-text-secondary mb-1">
            {t('travelers.nationality')}
          </label>
          <input
            type="text"
            value={formData.nationality}
            onChange={(e) => setFormData({ ...formData, nationality: e.target.value })}
            className="w-full px-4 py-2.5 rounded-xl border border-border focus:ring-2 focus:ring-primary focus:border-transparent"
            placeholder="China"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-text-secondary mb-1">
            {t('travelers.gender')}
          </label>
          <select
            value={formData.gender}
            onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
            className="w-full px-4 py-2.5 rounded-xl border border-border focus:ring-2 focus:ring-primary focus:border-transparent bg-surface"
          >
            <option value="">{t('travelers.selectGender')}</option>
            <option value="male">{t('travelers.male')}</option>
            <option value="female">{t('travelers.female')}</option>
            <option value="other">{t('travelers.other')}</option>
          </select>
        </div>
      </div>

      <div className="flex items-center justify-end gap-3 mt-6 pt-4 border-t border-divider">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-text-secondary hover:text-text-primary transition-colors"
        >
          {t('common.cancel')}
        </button>
        <button
          type="submit"
          disabled={isLoading}
          className="btn-primary"
        >
          {isLoading ? t('travelers.saving') : traveler ? t('travelers.updateTraveler') : t('travelers.addTraveler')}
        </button>
      </div>
    </form>
  );
};

const TravelersPage: React.FC = () => {
  const { t } = useTranslation();
  const { isAuthenticated } = useAuth();
  const {
    travelers,
    isLoading,
    defaultTravelerId,
    fetchTravelers,
    addTraveler,
    updateTraveler,
    removeTraveler,
    setDefaultTraveler,
  } = useTravelersStore();

  const [showForm, setShowForm] = useState(false);
  const [editingTraveler, setEditingTraveler] = useState<Traveler | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (isAuthenticated) {
      fetchTravelers();
    }
  }, [isAuthenticated, fetchTravelers]);

  const handleAdd = async (data: CreateTraveler) => {
    setFormError(null);

    // Duplicate check: same first + last name already exists
    const duplicate = travelers.find(
      (t) =>
        t.firstName.toLowerCase() === data.firstName.toLowerCase() &&
        t.lastName.toLowerCase() === data.lastName.toLowerCase()
    );
    if (duplicate) {
      setFormError(t('travelers.duplicateError', { name: `${data.firstName} ${data.lastName}` }));
      return;
    }

    setIsSaving(true);
    try {
      await addTraveler(data);
      setShowForm(false);
      setFormError(null);
    } catch (err: unknown) {
      const error = err as { response?: { data?: { detail?: string } }; message?: string };
      setFormError(error.response?.data?.detail || error.message || 'Failed to add traveler. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdate = async (data: CreateTraveler) => {
    if (editingTraveler) {
      await updateTraveler(editingTraveler.id, data);
      setEditingTraveler(null);
    }
  };

  const handleRemove = async (id: number) => {
    if (confirm(t('travelers.removeConfirm'))) {
      await removeTraveler(id);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center">
        <User className="w-16 h-16 mx-auto text-gray-300 mb-4" />
        <h1 className="text-2xl font-bold text-text-primary mb-2">{t('travelers.signInRequired')}</h1>
        <p className="text-text-secondary mb-6">
          {t('travelers.signInDesc')}
        </p>
        <Link to="/" className="btn-primary">
          {t('common.goHome')}
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <main className="max-w-4xl mx-auto px-4 py-6">
        {/* Back Link */}
        <Link
          to="/"
          className="inline-flex items-center gap-1 text-text-secondary hover:text-primary mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>{t('travelers.backToHome')}</span>
        </Link>

        {/* Page Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-text-primary">{t('travelers.title')}</h1>
            <p className="text-text-secondary">
              {t('travelers.travelersSaved', { count: travelers.length })}
            </p>
          </div>
          {!showForm && !editingTraveler && (
            <button
              onClick={() => setShowForm(true)}
              className="btn-primary flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              <span>{t('travelers.addTraveler')}</span>
            </button>
          )}
        </div>

        {/* Add/Edit Form */}
        {(showForm || editingTraveler) && (
          <div className="mb-6">
            <TravelerForm
              traveler={editingTraveler || undefined}
              onSave={editingTraveler ? handleUpdate : handleAdd}
              onCancel={() => {
                setShowForm(false);
                setEditingTraveler(null);
                setFormError(null);
              }}
              isLoading={editingTraveler ? isLoading : isSaving}
              error={editingTraveler ? null : formError}
            />
          </div>
        )}

        {/* Travelers List */}
        {isLoading && travelers.length === 0 ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary mx-auto" />
            <p className="text-text-secondary mt-4">{t('travelers.loadingTravelers')}</p>
          </div>
        ) : travelers.length === 0 && !showForm ? (
          <div className="bg-surface rounded-2xl shadow-card p-12 text-center">
            <User className="w-16 h-16 mx-auto text-gray-300 mb-4" />
            <h2 className="text-xl font-semibold text-text-primary mb-2">{t('travelers.noTravelers')}</h2>
            <p className="text-text-secondary mb-6">
              {t('travelers.noTravelersDesc')}
            </p>
            <button
              onClick={() => setShowForm(true)}
              className="btn-primary"
            >
              {t('travelers.addFirst')}
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {travelers.map((traveler) => (
              <div
                key={traveler.id}
                className={cn(
                  'bg-surface rounded-2xl shadow-card overflow-hidden hover:shadow-lg transition-shadow',
                  traveler.id === defaultTravelerId && 'ring-2 ring-primary'
                )}
              >
                <div className="p-4 md:p-5">
                  {/* Header Row */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        'w-10 h-10 rounded-xl flex items-center justify-center',
                        traveler.id === defaultTravelerId
                          ? 'bg-primary text-white'
                          : 'bg-gray-100 text-gray-600'
                      )}>
                        <User className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-text-primary">
                          {traveler.firstName} {traveler.middleName} {traveler.lastName}
                        </h3>
                        <div className="flex items-center gap-2">
                          {traveler.isPrimary && (
                            <span className="inline-flex items-center gap-1 text-xs text-green-600 bg-green-50 px-2 py-0.5 rounded-full font-medium">
                              <Shield className="w-3 h-3" />
                              {t('travelers.accountHolder')}
                            </span>
                          )}
                          {traveler.id === defaultTravelerId && (
                            <span className="text-xs text-primary font-medium">{t('travelers.defaultTraveler')}</span>
                          )}
                        </div>
                      </div>
                    </div>
                    {traveler.id !== defaultTravelerId && (
                      <button
                        onClick={() => setDefaultTraveler(traveler.id)}
                        className="text-sm text-text-secondary hover:text-primary transition-colors flex items-center gap-1"
                      >
                        <Star className="w-4 h-4" />
                        <span>{t('travelers.setAsDefault')}</span>
                      </button>
                    )}
                  </div>

                  {/* Details Grid */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                    {traveler.dob && (
                      <div>
                        <span className="text-text-muted block text-xs">{t('travelers.dob')}</span>
                        <span className="text-text-primary font-medium">{traveler.dob}</span>
                      </div>
                    )}
                    {traveler.passportNumber && (
                      <div>
                        <span className="text-text-muted block text-xs">{t('travelers.passport')}</span>
                        <span className="text-text-primary font-medium">{traveler.passportNumber}</span>
                      </div>
                    )}
                    {traveler.nationality && (
                      <div>
                        <span className="text-text-muted block text-xs">{t('travelers.nationality')}</span>
                        <span className="text-text-primary font-medium">{traveler.nationality}</span>
                      </div>
                    )}
                    {traveler.gender && (
                      <div>
                        <span className="text-text-muted block text-xs">{t('travelers.gender')}</span>
                        <span className="text-text-primary font-medium capitalize">
                          {t(`travelers.${traveler.gender}`, traveler.gender)}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-end gap-3 mt-4 pt-4 border-t border-divider">
                    <button
                      onClick={() => setEditingTraveler(traveler)}
                      className="flex items-center gap-1 text-primary hover:text-primary-hover transition-colors"
                    >
                      <Edit2 className="w-4 h-4" />
                      <span className="text-sm font-medium">{t('common.edit')}</span>
                    </button>
                    {!traveler.isPrimary && (
                      <button
                        onClick={() => handleRemove(traveler.id)}
                        className="flex items-center gap-1 text-danger hover:text-danger/80 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                        <span className="text-sm font-medium">{t('common.remove')}</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default TravelersPage;
