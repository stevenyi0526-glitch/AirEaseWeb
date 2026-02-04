import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { User, ArrowLeft, Plus, Trash2, Edit2, Star, Shield } from 'lucide-react';
import { useTravelersStore } from '../stores/travelersStore';
import { useAuth } from '../contexts/AuthContext';
import type { CreateTraveler, Traveler } from '../api/types';
import { cn } from '../utils/cn';

interface TravelerFormProps {
  traveler?: Traveler;
  onSave: (data: CreateTraveler) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

const TravelerForm: React.FC<TravelerFormProps> = ({ traveler, onSave, onCancel, isLoading }) => {
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
    onSave(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="bg-surface rounded-2xl shadow-card p-6">
      <h3 className="text-lg font-semibold text-text-primary mb-4">
        {traveler ? 'Edit Traveler' : 'Add New Traveler'}
      </h3>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-1">
            First Name *
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
            Middle Name
          </label>
          <input
            type="text"
            value={formData.middleName}
            onChange={(e) => setFormData({ ...formData, middleName: e.target.value })}
            className="w-full px-4 py-2.5 rounded-xl border border-border focus:ring-2 focus:ring-primary focus:border-transparent"
            placeholder="Optional"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-text-secondary mb-1">
            Last Name *
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
            Date of Birth
          </label>
          <input
            type="date"
            value={formData.dob}
            onChange={(e) => setFormData({ ...formData, dob: e.target.value })}
            className="w-full px-4 py-2.5 rounded-xl border border-border focus:ring-2 focus:ring-primary focus:border-transparent"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-text-secondary mb-1">
            Passport Number
          </label>
          <input
            type="text"
            value={formData.passportNumber}
            onChange={(e) => setFormData({ ...formData, passportNumber: e.target.value })}
            className="w-full px-4 py-2.5 rounded-xl border border-border focus:ring-2 focus:ring-primary focus:border-transparent"
            placeholder="E12345678"
          />
          <p className="text-xs text-text-muted mt-1">Encrypted & stored securely</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-text-secondary mb-1">
            Nationality
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
            Gender
          </label>
          <select
            value={formData.gender}
            onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
            className="w-full px-4 py-2.5 rounded-xl border border-border focus:ring-2 focus:ring-primary focus:border-transparent bg-surface"
          >
            <option value="">Select</option>
            <option value="male">Male</option>
            <option value="female">Female</option>
            <option value="other">Other</option>
          </select>
        </div>
      </div>

      <div className="flex items-center justify-end gap-3 mt-6 pt-4 border-t border-divider">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-text-secondary hover:text-text-primary transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isLoading}
          className="btn-primary"
        >
          {isLoading ? 'Saving...' : traveler ? 'Update Traveler' : 'Add Traveler'}
        </button>
      </div>
    </form>
  );
};

const TravelersPage: React.FC = () => {
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

  useEffect(() => {
    if (isAuthenticated) {
      fetchTravelers();
    }
  }, [isAuthenticated, fetchTravelers]);

  const handleAdd = async (data: CreateTraveler) => {
    await addTraveler(data);
    setShowForm(false);
  };

  const handleUpdate = async (data: CreateTraveler) => {
    if (editingTraveler) {
      await updateTraveler(editingTraveler.id, data);
      setEditingTraveler(null);
    }
  };

  const handleRemove = async (id: number) => {
    if (confirm('Remove this traveler? This action cannot be undone.')) {
      await removeTraveler(id);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center">
        <User className="w-16 h-16 mx-auto text-gray-300 mb-4" />
        <h1 className="text-2xl font-bold text-text-primary mb-2">Sign in to manage travelers</h1>
        <p className="text-text-secondary mb-6">
          Save traveler information for faster bookings.
        </p>
        <Link to="/" className="btn-primary">
          Go to Home
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
          <span>Back to Home</span>
        </Link>

        {/* Page Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-text-primary">My Travelers</h1>
            <p className="text-text-secondary">
              {travelers.length} traveler{travelers.length !== 1 ? 's' : ''} saved
            </p>
          </div>
          {!showForm && !editingTraveler && (
            <button
              onClick={() => setShowForm(true)}
              className="btn-primary flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              <span>Add Traveler</span>
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
              }}
              isLoading={isLoading}
            />
          </div>
        )}

        {/* Travelers List */}
        {isLoading && travelers.length === 0 ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary mx-auto" />
            <p className="text-text-secondary mt-4">Loading travelers...</p>
          </div>
        ) : travelers.length === 0 && !showForm ? (
          <div className="bg-surface rounded-2xl shadow-card p-12 text-center">
            <User className="w-16 h-16 mx-auto text-gray-300 mb-4" />
            <h2 className="text-xl font-semibold text-text-primary mb-2">No travelers saved</h2>
            <p className="text-text-secondary mb-6">
              Add travelers to speed up your booking process.
            </p>
            <button
              onClick={() => setShowForm(true)}
              className="btn-primary"
            >
              Add First Traveler
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
                              Account Holder
                            </span>
                          )}
                          {traveler.id === defaultTravelerId && (
                            <span className="text-xs text-primary font-medium">Default Traveler</span>
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
                        <span>Set as Default</span>
                      </button>
                    )}
                  </div>

                  {/* Details Grid */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                    {traveler.dob && (
                      <div>
                        <span className="text-text-muted block text-xs">Date of Birth</span>
                        <span className="text-text-primary font-medium">{traveler.dob}</span>
                      </div>
                    )}
                    {traveler.passportNumber && (
                      <div>
                        <span className="text-text-muted block text-xs">Passport</span>
                        <span className="text-text-primary font-medium">{traveler.passportNumber}</span>
                      </div>
                    )}
                    {traveler.nationality && (
                      <div>
                        <span className="text-text-muted block text-xs">Nationality</span>
                        <span className="text-text-primary font-medium">{traveler.nationality}</span>
                      </div>
                    )}
                    {traveler.gender && (
                      <div>
                        <span className="text-text-muted block text-xs">Gender</span>
                        <span className="text-text-primary font-medium capitalize">{traveler.gender}</span>
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
                      <span className="text-sm font-medium">Edit</span>
                    </button>
                    {!traveler.isPrimary && (
                      <button
                        onClick={() => handleRemove(traveler.id)}
                        className="flex items-center gap-1 text-danger hover:text-danger/80 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                        <span className="text-sm font-medium">Remove</span>
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
