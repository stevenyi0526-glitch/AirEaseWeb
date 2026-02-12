import React, { useState, useEffect, useCallback } from 'react';
import {
  X,
  ChevronLeft,
  ChevronRight,
  Loader2,
  AlertTriangle,
  MapPin,
  Calendar,
  Plane,
  FileText,
  Shield,
} from 'lucide-react';
import { fetchIncidents } from '../../api/aircraft';
import type { IncidentResponse } from '../../api/aircraft';

interface IncidentRecordsModalProps {
  isOpen: boolean;
  onClose: () => void;
  queryType: 'tail' | 'airline' | 'model';
  queryValue: string;
  /** Display label, e.g. "United Airlines", "Boeing 737-800", "N12345" */
  label: string;
}

/**
 * Severity badge colour mapping
 */
function getSeverityStyle(severity: string | null): { bg: string; text: string; label: string } {
  if (!severity) return { bg: 'bg-gray-100', text: 'text-gray-600', label: 'Unknown' };
  const s = severity.toUpperCase();
  if (s.includes('FATL') || s.includes('FATAL')) return { bg: 'bg-red-100', text: 'text-red-700', label: 'Fatal' };
  if (s.includes('SERS') || s.includes('SERIOUS')) return { bg: 'bg-orange-100', text: 'text-orange-700', label: 'Serious' };
  if (s.includes('MINR') || s.includes('MINOR')) return { bg: 'bg-amber-100', text: 'text-amber-700', label: 'Minor' };
  if (s.includes('NONE') || s.includes('NFAT') || s.includes('NON')) return { bg: 'bg-green-100', text: 'text-green-700', label: 'Non-Fatal' };
  if (s.includes('INCD') || s.includes('INCIDENT')) return { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Incident' };
  // Country codes (ev_country) can appear in injury_severity for some records
  return { bg: 'bg-gray-100', text: 'text-gray-600', label: severity };
}

/**
 * Category title mapping
 */
function getCategoryInfo(queryType: 'tail' | 'airline' | 'model'): { icon: React.ReactNode; title: string; subtitle: string } {
  switch (queryType) {
    case 'tail':
      return {
        icon: <Plane className="w-5 h-5 text-green-600" />,
        title: 'This Aircraft\'s Incident Records',
        subtitle: 'NTSB-reported events for this specific aircraft',
      };
    case 'airline':
      return {
        icon: <Shield className="w-5 h-5 text-blue-600" />,
        title: 'Airline Incident Records (10yr)',
        subtitle: 'NTSB-reported events for this airline in the past 10 years',
      };
    case 'model':
      return {
        icon: <AlertTriangle className="w-5 h-5 text-amber-600" />,
        title: 'Model Incident Records (All Time)',
        subtitle: 'NTSB-reported events for this aircraft model worldwide',
      };
  }
}

export const IncidentRecordsModal: React.FC<IncidentRecordsModalProps> = ({
  isOpen,
  onClose,
  queryType,
  queryValue,
  label,
}) => {
  const [page, setPage] = useState(1);
  const [data, setData] = useState<IncidentResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const loadPage = useCallback(async (p: number) => {
    setLoading(true);
    try {
      const result = await fetchIncidents({
        queryType,
        queryValue,
        page: p,
        perPage: 10,
      });
      setData(result);
      setPage(p);
      setExpandedId(null);
    } catch {
      // handled in fetchIncidents
    } finally {
      setLoading(false);
    }
  }, [queryType, queryValue]);

  useEffect(() => {
    if (isOpen) {
      setPage(1);
      setData(null);
      loadPage(1);
    }
  }, [isOpen, loadPage]);

  if (!isOpen) return null;

  const categoryInfo = getCategoryInfo(queryType);

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col animate-[fadeInScale_0.25s_ease-out]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
          <div className="flex items-center gap-3 min-w-0">
            {categoryInfo.icon}
            <div className="min-w-0">
              <h3 className="text-base font-semibold text-gray-900 truncate">{categoryInfo.title}</h3>
              <p className="text-xs text-gray-500 truncate">{label} · {categoryInfo.subtitle}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors flex-shrink-0"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16">
              <Loader2 className="w-8 h-8 text-blue-500 animate-spin mb-3" />
              <p className="text-sm text-gray-500">Loading incident records...</p>
            </div>
          ) : !data || data.records.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16">
              <Shield className="w-12 h-12 text-green-400 mb-3" />
              <p className="text-base font-medium text-gray-700">No incident records found</p>
              <p className="text-sm text-gray-500 mt-1">Clean safety record</p>
            </div>
          ) : (
            <div className="space-y-3">
              {data.records.map((record) => {
                const sev = getSeverityStyle(record.injury_severity);
                const isExpanded = expandedId === record.ev_id;
                const hasNarrative = record.description || record.cause;
                return (
                  <div
                    key={record.ev_id}
                    className="border border-gray-200 rounded-xl overflow-hidden hover:border-gray-300 transition-colors"
                  >
                    {/* Record summary row */}
                    <button
                      onClick={() => hasNarrative && setExpandedId(isExpanded ? null : record.ev_id)}
                      className={`w-full text-left px-4 py-3 flex items-start gap-3 ${hasNarrative ? 'cursor-pointer hover:bg-gray-50' : 'cursor-default'}`}
                    >
                      {/* Severity badge */}
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium whitespace-nowrap mt-0.5 ${sev.bg} ${sev.text}`}>
                        {sev.label}
                      </span>

                      <div className="flex-1 min-w-0">
                        {/* Date + location */}
                        <div className="flex items-center gap-3 text-sm">
                          {record.date && (
                            <span className="flex items-center gap-1 text-gray-700 font-medium">
                              <Calendar className="w-3.5 h-3.5 text-gray-400" />
                              {record.date}
                            </span>
                          )}
                          {(record.city || record.state || record.country) && (
                            <span className="flex items-center gap-1 text-gray-500">
                              <MapPin className="w-3.5 h-3.5 text-gray-400" />
                              {[record.city, record.state, record.country].filter(Boolean).join(', ')}
                            </span>
                          )}
                        </div>

                        {/* Model + operator + reg */}
                        <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
                          {record.model && (
                            <span className="flex items-center gap-1">
                              <Plane className="w-3 h-3" />
                              {record.model}
                            </span>
                          )}
                          {record.operator && <span>· {record.operator}</span>}
                          {record.registration && <span className="text-gray-400">({record.registration})</span>}
                        </div>
                      </div>

                      {/* Expand indicator */}
                      {hasNarrative && (
                        <FileText className={`w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0 transition-transform ${isExpanded ? 'text-blue-500' : ''}`} />
                      )}
                    </button>

                    {/* Expanded narrative */}
                    {isExpanded && hasNarrative && (
                      <div className="px-4 pb-4 border-t border-gray-100 animate-fade-in">
                        {record.cause && (
                          <div className="mt-3">
                            <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-1">Probable Cause</p>
                            <p className="text-sm text-gray-700 leading-relaxed">{record.cause}</p>
                          </div>
                        )}
                        {record.description && (
                          <div className="mt-3">
                            <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-1">Description</p>
                            <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">{record.description}</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer: Pagination */}
        {data && data.total_pages > 1 && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-gray-200 bg-gray-50 rounded-b-2xl">
            <p className="text-xs text-gray-500">
              Showing {(data.page - 1) * data.per_page + 1}–{Math.min(data.page * data.per_page, data.total)} of {data.total} records
            </p>
            <div className="flex items-center gap-1">
              <button
                onClick={() => loadPage(page - 1)}
                disabled={page <= 1 || loading}
                className="p-1.5 rounded-lg hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              {/* Page numbers */}
              {Array.from({ length: Math.min(5, data.total_pages) }, (_, i) => {
                let pageNum: number;
                if (data.total_pages <= 5) {
                  pageNum = i + 1;
                } else if (page <= 3) {
                  pageNum = i + 1;
                } else if (page >= data.total_pages - 2) {
                  pageNum = data.total_pages - 4 + i;
                } else {
                  pageNum = page - 2 + i;
                }
                return (
                  <button
                    key={pageNum}
                    onClick={() => loadPage(pageNum)}
                    disabled={loading}
                    className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors ${
                      pageNum === page
                        ? 'bg-blue-600 text-white'
                        : 'hover:bg-gray-200 text-gray-600'
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}
              <button
                onClick={() => loadPage(page + 1)}
                disabled={page >= data.total_pages || loading}
                className="p-1.5 rounded-lg hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
