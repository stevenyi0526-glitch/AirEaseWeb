import React, { useState, useMemo, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import {
  Loader2,
  AlertCircle,
  Armchair,
  Wifi,
  Zap,
  Tv,
  UtensilsCrossed,
  Maximize2,
  Info,
} from 'lucide-react';
import { seatmapApi, type Seat, type Deck, type CabinAmenities, type SeatMapResponse, type UpdatedFacilities } from '../../api/seatmap';
import { cn } from '../../utils/cn';

// ============================================================
// Sub-components
// ============================================================

/** Amenities display bar */
const AmenitiesBar: React.FC<{ amenities: CabinAmenities }> = ({ amenities }) => {
  const { t } = useTranslation();
  if (!amenities || Object.keys(amenities).length === 0) return null;

  const items: { icon: React.ReactNode; label: string; detail?: string }[] = [];

  if (amenities.seat?.legSpace) {
    items.push({
      icon: <Maximize2 className="w-4 h-4" />,
      label: t('seatMap.legroom'),
      detail: `${amenities.seat.legSpace}${amenities.seat.legSpaceUnit || '"'}`,
    });
  }

  if (amenities.seat?.tilt) {
    const tiltLabels: Record<string, string> = {
      FULL_FLAT: t('seatMap.lieFlatSeat'),
      ANGLE_FLAT: t('seatMap.angledFlat'),
      NORMAL: t('seatMap.standardRecline'),
    };
    items.push({
      icon: <Armchair className="w-4 h-4" />,
      label: tiltLabels[amenities.seat.tilt] || amenities.seat.tilt,
    });
  }

  if (amenities.wifi) {
    items.push({
      icon: <Wifi className="w-4 h-4" />,
      label: t('seatMap.wifiLabel'),
      detail: amenities.wifi.isChargeable ? t('seatMap.paid') : t('seatMap.free'),
    });
  }

  if (amenities.power) {
    items.push({
      icon: <Zap className="w-4 h-4" />,
      label: t('seatMap.power'),
      detail: [amenities.power.powerType, amenities.power.usbType].filter(Boolean).join(', '),
    });
  }

  if (amenities.entertainment && Array.isArray(amenities.entertainment) && amenities.entertainment.length > 0) {
    items.push({
      icon: <Tv className="w-4 h-4" />,
      label: t('seatMap.entertainmentLabel'),
    });
  }

  if (amenities.food && Object.keys(amenities.food).length > 0) {
    items.push({
      icon: <UtensilsCrossed className="w-4 h-4" />,
      label: t('seatMap.mealService'),
    });
  }

  if (items.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-3 mb-4">
      {items.map((item, idx) => (
        <div
          key={idx}
          className="flex items-center gap-1.5 text-xs bg-surface-alt px-2.5 py-1.5 rounded-full text-text-secondary"
        >
          {item.icon}
          <span className="font-medium">{item.label}</span>
          {item.detail && <span className="text-text-muted">({item.detail})</span>}
        </div>
      ))}
    </div>
  );
};

/** Legend for seat availability colors */
const SeatLegend: React.FC = () => {
  const { t } = useTranslation();
  return (
    <div className="flex flex-wrap gap-4 text-xs text-text-secondary mb-4">
      <div className="flex items-center gap-1.5">
        <div className="w-4 h-4 rounded-sm bg-emerald-500/20 border border-emerald-500" />
        <span>{t('seatMap.available')}</span>
      </div>
      <div className="flex items-center gap-1.5">
        <div className="w-4 h-4 rounded-sm bg-blue-500/20 border border-blue-500" />
        <span>{t('seatMap.extraLegroom')}</span>
      </div>
      <div className="flex items-center gap-1.5">
        <div className="w-4 h-4 rounded-sm bg-gray-300/40 border border-gray-400" />
        <span>{t('seatMap.occupied')}</span>
      </div>
      <div className="flex items-center gap-1.5">
        <div className="w-4 h-4 rounded-sm bg-yellow-500/20 border border-yellow-500" />
        <span>{t('seatMap.blocked')}</span>
      </div>
      <div className="flex items-center gap-1.5">
        <div className="w-4 h-4 rounded-sm bg-orange-500/20 border border-orange-500" />
        <span>{t('seatMap.exitRow')}</span>
      </div>
    </div>
  );
};

/** Individual seat cell */
const SeatCell: React.FC<{ seat: Seat; onSelect: (s: Seat) => void; isSelected: boolean }> = ({
  seat,
  onSelect,
  isSelected,
}) => {
  const { t } = useTranslation();
  const isAvailable = seat.availability === 'AVAILABLE';
  const isOccupied = seat.availability === 'OCCUPIED';
  const isBlocked = seat.availability === 'BLOCKED';

  const bgClass = isSelected
    ? 'bg-primary/40 border-primary ring-2 ring-primary/30'
    : seat.hasExtraLegroom
    ? 'bg-blue-500/20 border-blue-500 hover:bg-blue-500/30'
    : seat.isExitRow
    ? 'bg-orange-500/20 border-orange-500 hover:bg-orange-500/30'
    : isAvailable
    ? 'bg-emerald-500/20 border-emerald-500 hover:bg-emerald-500/30'
    : isBlocked
    ? 'bg-yellow-500/20 border-yellow-500'
    : isOccupied
    ? 'bg-gray-300/40 border-gray-400'
    : 'bg-gray-200/30 border-gray-300';

  // Extract row letter (last char) for display
  const seatLetter = seat.number?.slice(-1) || '';

  return (
    <button
      className={cn(
        'w-7 h-7 rounded-sm border text-[10px] font-medium transition-all',
        'flex items-center justify-center',
        bgClass,
        isAvailable || seat.hasExtraLegroom || seat.isExitRow
          ? 'cursor-pointer'
          : 'cursor-not-allowed opacity-60'
      )}
      onClick={() => isAvailable && onSelect(seat)}
      disabled={!isAvailable}
      title={[
        seat.number,
        seat.availability,
        seat.hasExtraLegroom ? t('seatMap.extraLegroomTag') : '',
        seat.isExitRow ? t('seatMap.exitRowTag') : '',
        seat.isWindow ? t('seatMap.window') : '',
        seat.isAisle ? t('seatMap.aisle') : '',
        seat.price ? `$${seat.price}` : '',
      ]
        .filter(Boolean)
        .join(' · ')}
    >
      {seatLetter}
    </button>
  );
};

// ============================================================
// Seat Grid - Renders the aircraft cabin layout
// ============================================================

const SeatGrid: React.FC<{ deck: Deck; onSelect: (s: Seat) => void; selectedSeat: Seat | null }> = ({
  deck,
  onSelect,
  selectedSeat,
}) => {
  const { t } = useTranslation();
  // Group seats by row number
  const seatsByRow = useMemo(() => {
    const map = new Map<number, Seat[]>();
    for (const seat of deck.seats) {
      const rowNum = parseInt(seat.number?.replace(/[A-Z]/gi, '') || '0', 10);
      if (!map.has(rowNum)) map.set(rowNum, []);
      map.get(rowNum)!.push(seat);
    }
    // Sort seats within each row by column letter
    for (const [, seats] of map) {
      seats.sort((a, b) => {
        const colA = a.number?.slice(-1) || '';
        const colB = b.number?.slice(-1) || '';
        return colA.localeCompare(colB);
      });
    }
    return map;
  }, [deck.seats]);

  const sortedRows = useMemo(() => [...seatsByRow.keys()].sort((a, b) => a - b), [seatsByRow]);

  // Determine column letters from first row with most seats
  const columnLetters = useMemo(() => {
    let maxCols: string[] = [];
    for (const [, seats] of seatsByRow) {
      const cols = seats.map((s) => s.number?.slice(-1) || '').filter(Boolean);
      if (cols.length > maxCols.length) maxCols = cols;
    }
    return [...new Set(maxCols)].sort();
  }, [seatsByRow]);

  const config = deck.configuration;
  const exitRows = new Set(config?.exitRowsX || []);
  const wingStart = config?.startWingsRow;
  const wingEnd = config?.endWingsRow;

  if (sortedRows.length === 0) {
    return (
      <div className="text-center text-text-muted py-8">
        <AlertCircle className="w-6 h-6 mx-auto mb-2" />
        <p className="text-sm">{t('seatMap.noSeatData')}</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <div className="inline-block min-w-fit">
        {/* Column header letters */}
        <div className="flex items-center gap-0.5 mb-1 pl-8">
          {columnLetters.map((letter, idx) => {
            // Add aisle gap heuristic
            const isMiddleGap = columnLetters.length <= 4
              ? idx === Math.floor(columnLetters.length / 2)
              : idx === 3 || (columnLetters.length > 6 && idx === columnLetters.length - 3);
            return (
              <React.Fragment key={letter}>
                {isMiddleGap && <div className="w-4" />}
                <div className="w-7 text-center text-[10px] font-medium text-text-muted">
                  {letter}
                </div>
              </React.Fragment>
            );
          })}
        </div>

        {/* Seat rows */}
        {sortedRows.map((rowNum) => {
          const seats = seatsByRow.get(rowNum) || [];
          const isExit = exitRows.has(rowNum);
          const isWing = wingStart && wingEnd && rowNum >= wingStart && rowNum <= wingEnd;

          // Build a lookup by column letter
          const seatMap = new Map<string, Seat>();
          for (const s of seats) {
            const col = s.number?.slice(-1) || '';
            seatMap.set(col, s);
          }

          return (
            <div
              key={rowNum}
              className={cn(
                'flex items-center gap-0.5',
                isExit && 'bg-orange-500/5 border-l-2 border-orange-400 pl-1 rounded-sm',
                isWing && !isExit && 'border-l-2 border-sky-300/40 pl-1'
              )}
            >
              {/* Row number */}
              <div className="w-6 text-right text-[10px] font-mono text-text-muted mr-1.5">
                {rowNum}
              </div>

              {/* Seats */}
              {columnLetters.map((letter, idx) => {
                const seat = seatMap.get(letter);
                const isMiddleGap = columnLetters.length <= 4
                  ? idx === Math.floor(columnLetters.length / 2)
                  : idx === 3 || (columnLetters.length > 6 && idx === columnLetters.length - 3);

                return (
                  <React.Fragment key={letter}>
                    {isMiddleGap && <div className="w-4" />}
                    {seat ? (
                      <SeatCell
                        seat={seat}
                        onSelect={onSelect}
                        isSelected={selectedSeat?.number === seat.number}
                      />
                    ) : (
                      <div className="w-7 h-7" /> // Empty space
                    )}
                  </React.Fragment>
                );
              })}

              {/* Exit indicator */}
              {isExit && (
                <span className="ml-2 text-[9px] text-orange-500 font-medium">{t('seatMap.exit')}</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ============================================================
// Selected Seat Details Panel
// ============================================================

const SeatDetails: React.FC<{ seat: Seat }> = ({ seat }) => {
  const { t } = useTranslation();
  return (
    <div className="bg-surface-alt rounded-xl p-4 border border-border">
      <div className="flex items-center justify-between mb-3">
        <h4 className="font-semibold text-text-primary">{t('seatMap.seat', { number: seat.number })}</h4>
        {seat.price && (
          <span className="text-primary font-semibold">
            {seat.currency || '$'}{seat.price}
          </span>
        )}
      </div>
      <div className="flex flex-wrap gap-2">
        {seat.isWindow && (
          <span className="text-xs bg-sky-500/10 text-sky-600 px-2 py-1 rounded-full">{t('seatMap.window')}</span>
        )}
        {seat.isAisle && (
          <span className="text-xs bg-indigo-500/10 text-indigo-600 px-2 py-1 rounded-full">{t('seatMap.aisle')}</span>
        )}
        {seat.isMiddle && (
          <span className="text-xs bg-gray-500/10 text-gray-600 px-2 py-1 rounded-full">{t('seatMap.middle')}</span>
        )}
        {seat.hasExtraLegroom && (
          <span className="text-xs bg-blue-500/10 text-blue-600 px-2 py-1 rounded-full">{t('seatMap.extraLegroomTag')}</span>
        )}
        {seat.isExitRow && (
          <span className="text-xs bg-orange-500/10 text-orange-600 px-2 py-1 rounded-full">{t('seatMap.exitRowTag')}</span>
        )}
        {seat.characteristics
          .filter((c) => !['A', 'W', 'M', 'E', 'L'].includes(c.code))
          .map((c) => (
            <span key={c.code} className="text-xs bg-gray-500/10 text-gray-600 px-2 py-1 rounded-full">
              {c.description || c.code}
            </span>
          ))}
      </div>
    </div>
  );
};

// ============================================================
// Main SeatMap Component
// ============================================================

interface SeatMapViewProps {
  flightId: string;
  /** Callback when Amadeus enrichment data is available (updated facilities + score) */
  onEnrichment?: (data: { updatedFacilities?: UpdatedFacilities; updatedScore?: SeatMapResponse['updatedScore'] }) => void;
}

const SeatMapView: React.FC<SeatMapViewProps> = ({ flightId, onEnrichment }) => {
  const [selectedSeat, setSelectedSeat] = useState<Seat | null>(null);
  const { t } = useTranslation();

  const {
    data: seatmapResponse,
    isLoading,
    error,
    isError,
  } = useQuery<SeatMapResponse>({
    queryKey: ['seatmap', flightId],
    queryFn: () => seatmapApi.getByFlightId(flightId),
    enabled: !!flightId,
    staleTime: 10 * 60 * 1000, // Cache for 10 minutes
    retry: 1,
  });

  // Summary stats
  const stats = useMemo(() => {
    if (!seatmapResponse?.seatmap?.segments?.length) return null;
    const allSeats = seatmapResponse.seatmap.segments.flatMap((s) =>
      s.decks.flatMap((d) => d.seats)
    );
    return {
      total: allSeats.length,
      available: allSeats.filter((s) => s.availability === 'AVAILABLE').length,
      extraLegroom: allSeats.filter((s) => s.hasExtraLegroom).length,
      exitRow: allSeats.filter((s) => s.isExitRow).length,
    };
  }, [seatmapResponse]);

  // Notify parent when Amadeus enrichment data arrives
  useEffect(() => {
    if (seatmapResponse?.available && onEnrichment) {
      const { updatedFacilities, updatedScore } = seatmapResponse;
      if (updatedFacilities || updatedScore) {
        onEnrichment({ updatedFacilities, updatedScore });
      }
    }
  }, [seatmapResponse, onEnrichment]);

  // Loading state
  if (isLoading) {
    return (
      <div className="bg-surface rounded-2xl p-6 border border-border">
        <div className="flex items-center gap-3 mb-4">
          <Armchair className="w-5 h-5 text-primary" />
          <h3 className="text-lg font-semibold text-text-primary">{t('seatMap.title')}</h3>
        </div>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 text-primary animate-spin mr-3" />
          <span className="text-text-secondary text-sm">{t('seatMap.loadingFromAmadeus')}</span>
        </div>
      </div>
    );
  }

  // Error state
  if (isError || error) {
    return (
      <div className="bg-surface rounded-2xl p-6 border border-border">
        <div className="flex items-center gap-3 mb-4">
          <Armchair className="w-5 h-5 text-primary" />
          <h3 className="text-lg font-semibold text-text-primary">{t('seatMap.title')}</h3>
        </div>
        <div className="flex items-center justify-center py-8 text-text-muted">
          <AlertCircle className="w-5 h-5 mr-2" />
          <span className="text-sm">{t('seatMap.unableToLoad')}</span>
        </div>
      </div>
    );
  }

  // Not available state
  if (seatmapResponse && !seatmapResponse.available) {
    return (
      <div className="bg-surface rounded-2xl p-6 border border-border">
        <div className="flex items-center gap-3 mb-4">
          <Armchair className="w-5 h-5 text-primary" />
          <h3 className="text-lg font-semibold text-text-primary">{t('seatMap.title')}</h3>
        </div>
        <div className="flex flex-col items-center justify-center py-8 text-text-muted">
          <Info className="w-8 h-8 mb-3 text-text-muted/60" />
          <p className="text-sm text-center max-w-sm">
            {seatmapResponse.message || t('seatMap.notAvailable')}
          </p>
          <p className="text-xs text-text-muted mt-2">
            Flight: {seatmapResponse.flightInfo?.flightNumber} · {seatmapResponse.flightInfo?.route}
          </p>
        </div>
      </div>
    );
  }

  if (!seatmapResponse?.seatmap) return null;

  const { seatmap } = seatmapResponse;

  return (
    <div className="bg-surface rounded-2xl p-6 border border-border">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <Armchair className="w-5 h-5 text-primary" />
          <h3 className="text-lg font-semibold text-text-primary">{t('seatMap.title')}</h3>
        </div>
        {stats && (
          <div className="flex gap-3 text-xs text-text-secondary">
            <span>{t('seatMap.availableCount', { count: stats.available })}</span>
            <span className="text-blue-500">{t('seatMap.extraLegroomCount', { count: stats.extraLegroom })}</span>
            <span className="text-orange-500">{t('seatMap.exitRowCount', { count: stats.exitRow })}</span>
          </div>
        )}
      </div>

      {/* Render each segment */}
      {seatmap.segments.map((segment, segIdx) => (
        <div key={segIdx} className="mb-6">
          {seatmap.segments.length > 1 && (
            <p className="text-sm font-medium text-text-secondary mb-3">
              {t('seatMap.segment', { index: segIdx + 1, carrier: `${segment.carrierCode}${segment.number}` })}
              {segment.aircraft?.code && ` · ${segment.aircraft.code}`}
            </p>
          )}

          {/* Amenities */}
          <AmenitiesBar amenities={segment.amenities} />

          {/* Legend */}
          <SeatLegend />

          {/* Decks */}
          {segment.decks.map((deck, deckIdx) => (
            <div key={deckIdx} className="mb-4">
              {segment.decks.length > 1 && (
                <p className="text-xs text-text-muted mb-2 uppercase tracking-wider">
                  {deck.deckType === 'UPPER' ? t('seatMap.upperDeck') : t('seatMap.mainDeck')}
                </p>
              )}
              <SeatGrid deck={deck} onSelect={setSelectedSeat} selectedSeat={selectedSeat} />
            </div>
          ))}
        </div>
      ))}

      {/* Selected seat details */}
      {selectedSeat && (
        <div className="mt-4">
          <SeatDetails seat={selectedSeat} />
        </div>
      )}

      {/* Enriched facilities from Amadeus API */}
      {seatmapResponse.updatedFacilities && (
        <div className="mt-4 bg-surface-alt rounded-xl p-4 border border-border">
          <div className="flex items-center gap-2 mb-3">
            <Info className="w-4 h-4 text-primary" />
            <h4 className="text-sm font-semibold text-text-primary">{t('seatMap.verifiedAmenities')}</h4>
            <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">
              {t('seatMap.amadeusData')}
            </span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
            {seatmapResponse.updatedFacilities.hasWifi !== undefined && (
              <div className="flex items-center gap-1.5">
                <Wifi className={cn("w-3.5 h-3.5", seatmapResponse.updatedFacilities.hasWifi ? "text-emerald-500" : "text-gray-400")} />
                <span>WiFi: {seatmapResponse.updatedFacilities.hasWifi
                  ? (seatmapResponse.updatedFacilities.wifiFree ? t('seatMap.wifiStatus.free') : t('seatMap.wifiStatus.paid'))
                  : t('seatMap.wifiStatus.notAvailable')}</span>
              </div>
            )}
            {seatmapResponse.updatedFacilities.hasPower !== undefined && (
              <div className="flex items-center gap-1.5">
                <Zap className={cn("w-3.5 h-3.5", seatmapResponse.updatedFacilities.hasPower ? "text-emerald-500" : "text-gray-400")} />
                <span>{t('seatMap.power')}: {seatmapResponse.updatedFacilities.hasPower
                  ? (seatmapResponse.updatedFacilities.powerType?.replace(/_/g, ' ').toLowerCase() || t('seatMap.powerStatus.yes'))
                  : t('seatMap.powerStatus.notAvailable')}</span>
              </div>
            )}
            {seatmapResponse.updatedFacilities.hasIFE !== undefined && (
              <div className="flex items-center gap-1.5">
                <Tv className={cn("w-3.5 h-3.5", seatmapResponse.updatedFacilities.hasIFE ? "text-emerald-500" : "text-gray-400")} />
                <span>IFE: {seatmapResponse.updatedFacilities.hasIFE ? t('seatMap.ifeStatus.yes') : t('seatMap.ifeStatus.notAvailable')}</span>
              </div>
            )}
            {seatmapResponse.updatedFacilities.mealIncluded !== undefined && (
              <div className="flex items-center gap-1.5">
                <UtensilsCrossed className={cn("w-3.5 h-3.5", seatmapResponse.updatedFacilities.mealIncluded ? "text-emerald-500" : "text-gray-400")} />
                <span>{t('pdfExport.meals')}: {seatmapResponse.updatedFacilities.mealIncluded
                  ? `${seatmapResponse.updatedFacilities.mealType || t('seatMap.ifeStatus.yes')}${seatmapResponse.updatedFacilities.mealChargeable ? ` ${t('seatMap.mealStatus.paid')}` : ''}`
                  : t('seatMap.mealStatus.notIncluded')}</span>
              </div>
            )}
            {seatmapResponse.updatedFacilities.hasBeverage && (
              <div className="flex items-center gap-1.5">
                <UtensilsCrossed className="w-3.5 h-3.5 text-emerald-500" />
                <span>{t('seatMap.beverage')}: {seatmapResponse.updatedFacilities.beverageType || t('seatMap.ifeStatus.yes')}
                  {seatmapResponse.updatedFacilities.beverageChargeable ? ` ${t('seatMap.mealStatus.paid')}` : ''}</span>
              </div>
            )}
            {seatmapResponse.updatedFacilities.seatTilt && (
              <div className="flex items-center gap-1.5">
                <Armchair className="w-3.5 h-3.5 text-blue-500" />
                <span>{t('seatMap.recline')}: {
                  seatmapResponse.updatedFacilities.seatTilt === 'FULL_FLAT' ? t('seatMap.reclineType.lieFLat') :
                  seatmapResponse.updatedFacilities.seatTilt === 'ANGLE_FLAT' ? t('seatMap.reclineType.angledFlat') :
                  t('seatMap.reclineType.standard')
                }</span>
              </div>
            )}
          </div>
          {seatmapResponse.updatedScore && (
            <div className="mt-3 pt-3 border-t border-border/50 flex items-center gap-3 text-xs text-text-secondary">
              <span>{t('seatMap.updatedComfort')}</span>
              <span className={cn(
                "font-semibold",
                seatmapResponse.updatedScore.dimensions.comfort >= 8 ? "text-emerald-600" :
                seatmapResponse.updatedScore.dimensions.comfort >= 6 ? "text-amber-600" : "text-red-500"
              )}>
                {seatmapResponse.updatedScore.dimensions.comfort.toFixed(1)}/10
              </span>
              <span>·</span>
              <span>{t('seatMap.overallLabel')}</span>
              <span className={cn(
                "font-semibold",
                seatmapResponse.updatedScore.overallScore >= 8 ? "text-emerald-600" :
                seatmapResponse.updatedScore.overallScore >= 6 ? "text-amber-600" : "text-red-500"
              )}>
                {seatmapResponse.updatedScore.overallScore.toFixed(1)}/10
              </span>
            </div>
          )}
        </div>
      )}

      {/* Source attribution */}
      <p className="text-[10px] text-text-muted mt-4 text-center">
        {t('seatMap.sourceAttribution')}
      </p>
    </div>
  );
};

export default SeatMapView;
