import React, { useRef, useCallback } from 'react';
import { Share2, Download, X, Plane, CheckCircle } from 'lucide-react';
import { toPng } from 'html-to-image';
import type { FlightWithScore } from '../../api/types';
import ScoreRadarChart from './ScoreRadarChart';
import { formatTime, formatDuration, formatPrice, formatDate } from '../../utils/formatters';
import { cn } from '../../utils/cn';

interface SharePosterProps {
  flightWithScore: FlightWithScore;
  isOpen: boolean;
  onClose: () => void;
}

const SharePoster: React.FC<SharePosterProps> = ({
  flightWithScore,
  isOpen,
  onClose,
}) => {
  const posterRef = useRef<HTMLDivElement>(null);
  const { flight, score, facilities } = flightWithScore;

  const downloadPoster = useCallback(async () => {
    if (!posterRef.current) return;

    try {
      const dataUrl = await toPng(posterRef.current, {
        backgroundColor: '#ffffff',
        pixelRatio: 2,
      });

      const link = document.createElement('a');
      link.download = `AirEase-${flight.flightNumber}-${formatDate(flight.departureTime)}.png`;
      link.href = dataUrl;
      link.click();
    } catch (error) {
      console.error('Failed to generate poster:', error);
      alert('Failed to generate poster. Please try again.');
    }
  }, [flight.flightNumber, flight.departureTime]);

  const sharePoster = useCallback(async () => {
    if (!posterRef.current) return;

    try {
      const dataUrl = await toPng(posterRef.current, {
        backgroundColor: '#ffffff',
        pixelRatio: 2,
      });

      // Convert data URL to blob
      const res = await fetch(dataUrl);
      const blob = await res.blob();

      const file = new File([blob], `AirEase-${flight.flightNumber}.png`, {
        type: 'image/png',
      });

      if (navigator.share && navigator.canShare({ files: [file] })) {
        await navigator.share({
          title: `AirEase Flight ${flight.flightNumber}`,
          text: `Check out this flight: ${flight.departureCity} → ${flight.arrivalCity}`,
          files: [file],
        });
      } else {
        // Fallback: download
        downloadPoster();
      }
    } catch (error) {
      console.error('Failed to share:', error);
      downloadPoster();
    }
  }, [flight, downloadPoster]);

  if (!isOpen) return null;

  const getScoreColor = (value: number) => {
    if (value >= 8) return 'text-success';
    if (value >= 6) return 'text-warning';
    return 'text-danger';
  };

  // Mirror ScoreRadarChart's amenities calculation
  const calculateAmenitiesScore = (): number => {
    const hasAmenityData = facilities?.hasWifi !== undefined ||
      facilities?.hasPower !== undefined ||
      facilities?.hasIFE !== undefined ||
      facilities?.mealIncluded !== undefined;
    if (!hasAmenityData) return score.dimensions.comfort;
    let s = 0;
    if (facilities?.hasWifi) s += 2.5;
    if (facilities?.hasPower) s += 2.5;
    if (facilities?.hasIFE) s += 2.5;
    if (facilities?.mealIncluded) s += 2.5;
    return s;
  };

  // Mirror ScoreRadarChart's efficiency calculation
  const calculateEfficiencyScore = (): number => {
    const stops = flight.stops ?? 0;
    const durationMinutes = flight.durationMinutes;
    if (!durationMinutes) return score.dimensions.value;
    const hours = durationMinutes / 60.0;
    let durationScore: number;
    if (hours <= 2) durationScore = 10.0;
    else if (hours <= 4) durationScore = 9.0;
    else if (hours <= 6) durationScore = 8.0;
    else if (hours <= 10) durationScore = 6.0;
    else if (hours <= 15) durationScore = 4.0;
    else if (hours <= 24) durationScore = 2.5;
    else durationScore = 1.5;
    let stopMultiplier: number;
    if (stops === 0) stopMultiplier = 1.0;
    else if (stops === 1) stopMultiplier = 0.8;
    else stopMultiplier = 0.6;
    return Math.max(1.0, Math.min(10.0, durationScore * stopMultiplier));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="bg-white rounded-2xl max-w-md w-full max-h-[90vh] overflow-auto shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold">Share Flight</h2>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Poster Preview */}
        <div className="p-4">
          <div
            ref={posterRef}
            className="bg-gradient-to-br from-[#E6F0FA] to-white rounded-xl p-6 shadow-inner"
          >
            {/* Brand Header */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
                  <Plane className="w-4 h-4 text-white" />
                </div>
                <span className="font-bold text-primary">AirEase</span>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-500">Flight Score</p>
                <p className={cn('text-2xl font-bold', getScoreColor(score.overallScore))}>
                  {score.overallScore.toFixed(1)}
                </p>
              </div>
            </div>

            {/* Flight Route */}
            <div className="bg-white rounded-xl p-4 shadow-sm mb-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
                  <Plane className="w-5 h-5 text-gray-600" />
                </div>
                <div>
                  <p className="font-semibold text-gray-900">{flight.airline}</p>
                  <p className="text-sm text-gray-500">{flight.flightNumber}</p>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="text-center">
                  <p className="text-2xl font-bold text-gray-900">{formatTime(flight.departureTime)}</p>
                  <p className="text-sm font-medium text-gray-700">{flight.departureCityCode}</p>
                  <p className="text-xs text-gray-500">{flight.departureCity}</p>
                </div>
                <div className="flex-1 px-2">
                  <div className="text-center text-xs text-gray-500 mb-1">
                    {formatDuration(flight.durationMinutes)}
                  </div>
                  <div className="relative h-px bg-gray-300">
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-primary" />
                  </div>
                  <div className="text-center text-xs text-gray-500 mt-1">
                    {flight.stops === 0 ? 'Direct' : `${flight.stops} stop${flight.stops > 1 ? 's' : ''}`}
                  </div>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-gray-900">{formatTime(flight.arrivalTime)}</p>
                  <p className="text-sm font-medium text-gray-700">{flight.arrivalCityCode}</p>
                  <p className="text-xs text-gray-500">{flight.arrivalCity}</p>
                </div>
              </div>

              <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
                <p className="text-sm text-gray-500">{formatDate(flight.departureTime)}</p>
                <p className="text-xl font-bold text-primary">
                  {formatPrice(flight.price, flight.currency)}
                </p>
              </div>
            </div>

            {/* Radar Chart */}
            <div className="bg-white rounded-xl p-4 shadow-sm mb-4">
              <h4 className="text-sm font-semibold text-gray-700 mb-3 text-center">
                Score Breakdown
              </h4>
              <div className="flex justify-center">
                <ScoreRadarChart
                  dimensions={score.dimensions}
                  size="md"
                  flightData={{
                    price: flight.price,
                    durationMinutes: flight.durationMinutes,
                    stops: flight.stops,
                    hasWifi: facilities?.hasWifi,
                    hasPower: facilities?.hasPower,
                    hasIFE: facilities?.hasIFE,
                    mealIncluded: facilities?.mealIncluded,
                  }}
                />
              </div>
              <div className="grid grid-cols-4 gap-2 mt-3">
                {[
                  { label: 'Safety', value: score.dimensions.safety ?? 10 },
                  { label: 'Reliability', value: score.dimensions.reliability },
                  { label: 'Comfort', value: score.dimensions.comfort },
                  { label: 'Service', value: score.dimensions.service },
                  { label: 'Value', value: score.dimensions.value },
                  { label: 'Amenities', value: calculateAmenitiesScore() },
                  { label: 'Efficiency', value: calculateEfficiencyScore() },
                ].map((dim) => (
                  <div key={dim.label} className="text-center">
                    <p className={cn('text-lg font-bold', getScoreColor(dim.value))}>
                      {dim.value.toFixed(1)}
                    </p>
                    <p className="text-xs text-gray-500">{dim.label}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Highlights */}
            {score.highlights && score.highlights.length > 0 && (
              <div className="bg-white rounded-xl p-4 shadow-sm">
                <h4 className="text-sm font-semibold text-gray-700 mb-2">Highlights</h4>
                <div className="flex flex-wrap gap-1.5">
                  {score.highlights.slice(0, 4).map((highlight, index) => (
                    <span
                      key={index}
                      className="inline-flex items-center gap-1 text-xs bg-green-50 text-green-700 px-2 py-1 rounded-full"
                    >
                      <CheckCircle className="w-3 h-3" />
                      {highlight}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Footer */}
            <div className="text-center mt-4 pt-3 border-t border-gray-200">
              <p className="text-xs text-gray-400">
                Generated by AirEase • ai-powered flight comparison
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3 p-4 border-t bg-gray-50">
          <button
            onClick={downloadPoster}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border border-gray-300 bg-white hover:bg-gray-50 transition-colors"
          >
            <Download className="w-4 h-4" />
            <span className="font-medium">Save Image</span>
          </button>
          <button
            onClick={sharePoster}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-primary text-white hover:bg-primary-hover transition-colors"
          >
            <Share2 className="w-4 h-4" />
            <span className="font-medium">Share</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default SharePoster;
