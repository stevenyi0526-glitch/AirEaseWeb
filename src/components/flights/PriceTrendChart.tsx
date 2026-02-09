/**
 * PriceTrendChart - Displays price insights for flight search results
 * Matches Google Flights reference design with:
 * - Dynamic summary header
 * - Price gauge bar with indicator pill
 * - Stepped line chart (step-after interpolation)
 */

import React, { useMemo, useState } from 'react';
import { Info, ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '../../utils/cn';
import type { PriceInsights } from '../../api/types';

interface PriceTrendChartProps {
  priceInsights: PriceInsights;
  currency?: string;
  className?: string;
  departureCity?: string;
  arrivalCity?: string;
  cabinClass?: string;
}

const PriceTrendChart: React.FC<PriceTrendChartProps> = ({
  priceInsights,
  currency = 'USD',
  className,
  departureCity,
  arrivalCity,
  cabinClass,
}) => {
  const { lowestPrice, priceLevel, typicalPriceRange, priceHistory } = priceInsights;
  const [showHistory, setShowHistory] = useState(true);

  // Debug logging
  console.log('[PriceTrendChart] Received priceInsights:', {
    lowestPrice,
    priceLevel,
    typicalPriceRange,
    priceHistoryCount: priceHistory?.length || 0,
    departureCity,
    arrivalCity,
  });

  // Format currency
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(price);
  };

  // Calculate price difference from typical
  const priceDifference = useMemo(() => {
    if (!lowestPrice || !typicalPriceRange) return null;
    const typicalMid = (typicalPriceRange[0] + typicalPriceRange[1]) / 2;
    return Math.round(typicalMid - lowestPrice);
  }, [lowestPrice, typicalPriceRange]);

  // Get price level text and color
  const getLevelInfo = () => {
    switch (priceLevel) {
      case 'low':
        return {
          text: 'low',
          color: 'text-green-600',
          bgColor: 'bg-green-600',
          description: priceDifference && priceDifference > 0 
            ? `${formatPrice(priceDifference)} cheaper than usual`
            : 'cheaper than usual',
        };
      case 'high':
        return {
          text: 'high',
          color: 'text-red-600',
          bgColor: 'bg-red-600',
          description: priceDifference && priceDifference < 0
            ? `${formatPrice(Math.abs(priceDifference))} more than usual`
            : 'more expensive than usual',
        };
      default:
        return {
          text: 'typical',
          color: 'text-amber-600',
          bgColor: 'bg-amber-600',
          description: 'around the usual price',
        };
    }
  };

  const levelInfo = getLevelInfo();

  // Calculate gauge position (0-100%)
  const getGaugePosition = () => {
    if (!typicalPriceRange || !lowestPrice) return 50;
    const [low, high] = typicalPriceRange;
    const range = high - low;
    const extendedLow = low - range * 0.3;
    const extendedHigh = high + range * 0.3;
    const extendedRange = extendedHigh - extendedLow;
    
    if (lowestPrice <= extendedLow) return 2;
    if (lowestPrice >= extendedHigh) return 98;
    
    const position = ((lowestPrice - extendedLow) / extendedRange) * 100;
    return Math.min(98, Math.max(2, position));
  };

  if (!lowestPrice && !priceLevel) {
    return null;
  }

  return (
    <div className={cn('bg-white rounded-xl border border-gray-200 p-5', className)}>
      {/* Header Section - Dynamic Summary */}
      <div className="mb-4">
        {/* Main headline */}
        <h3 className="text-lg font-semibold text-gray-900 mb-1">
          {lowestPrice && (
            <>
              {formatPrice(lowestPrice)} {cabinClass ? cabinClass.charAt(0).toUpperCase() + cabinClass.slice(1).toLowerCase() : 'Economy'} is{' '}
              <span className={levelInfo.color}>{levelInfo.text}</span>
              {priceDifference !== null && priceDifference !== 0 && (
                <span className="text-gray-600">
                  {' — '}{levelInfo.description}
                </span>
              )}
            </>
          )}
        </h3>
        
        {/* Subtitle with route info */}
        <p className="text-sm text-gray-500 flex items-center gap-1">
          {typicalPriceRange && (
            <>
              Flights {departureCity && arrivalCity ? `from ${departureCity} to ${arrivalCity}` : 'on this route'} are usually{' '}
              {formatPrice(typicalPriceRange[0])}–{formatPrice(typicalPriceRange[1])}.
            </>
          )}
          <button className="ml-1 text-gray-400 hover:text-gray-600">
            <Info className="w-4 h-4" />
          </button>
        </p>
      </div>

      {/* Price Gauge Bar */}
      {typicalPriceRange && lowestPrice && (
        <div className="mb-6 relative pt-10">
          {/* Floating Price Pill - positioned closer to the bar */}
          <div 
            className="absolute top-0 transform -translate-x-1/2 z-10"
            style={{ left: `${getGaugePosition()}%` }}
          >
            <div className="flex flex-col items-center">
              {/* Pill */}
              <div className={cn(
                'px-3 py-1 rounded-full text-white text-sm font-medium shadow-md',
                levelInfo.bgColor
              )}>
                {formatPrice(lowestPrice)}
              </div>
              {/* Arrow pointing down */}
              <div 
                className={cn('w-0 h-0 border-l-[6px] border-r-[6px] border-t-[6px] border-l-transparent border-r-transparent', 
                  priceLevel === 'low' ? 'border-t-green-600' : 
                  priceLevel === 'high' ? 'border-t-red-600' : 'border-t-amber-600'
                )} 
              />
            </div>
          </div>

          {/* Gauge Bar - 3 segments */}
          <div className="flex h-2 rounded-full overflow-hidden mt-2">
            {/* Green segment (Low) - ~30% */}
            <div className="flex-[3] bg-green-400 rounded-l-full" />
            {/* Yellow segment (Typical) - ~40% */}
            <div className="flex-[4] bg-amber-400" />
            {/* Red segment (High) - ~30% */}
            <div className="flex-[3] bg-red-400 rounded-r-full" />
          </div>

          {/* Price labels below gauge */}
          <div className="flex justify-between mt-1.5 text-xs text-gray-500">
            <span>{formatPrice(typicalPriceRange[0])}</span>
            <span>{formatPrice(typicalPriceRange[1])}</span>
          </div>
        </div>
      )}

      {/* Historical Price Chart - Collapsible */}
      {priceHistory && priceHistory.length > 0 && (
        <div className="border-t border-gray-100 pt-4">
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-gray-900 mb-3 w-full text-left"
          >
            {showHistory ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            Price history for these flights
          </button>
          
          {showHistory && (
            <SmoothPriceChart 
              priceHistory={priceHistory} 
              currency={currency}
            />
          )}
        </div>
      )}
    </div>
  );
};

/**
 * Smooth Price Chart - SVG-based smooth curve chart using Catmull-Rom spline interpolation
 */
interface SmoothPriceChartProps {
  priceHistory: [number, number][]; // [timestamp, price] pairs
  currency: string;
}

const SmoothPriceChart: React.FC<SmoothPriceChartProps> = ({
  priceHistory,
  currency,
}) => {
  const chartData = useMemo(() => {
    if (!priceHistory || priceHistory.length === 0) return null;

    // Sort by timestamp
    const sorted = [...priceHistory].sort((a, b) => a[0] - b[0]);
    
    // Extract prices and calculate range
    const prices = sorted.map(([, price]) => price);
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    const priceRange = maxPrice - minPrice || 1;
    
    // Add padding to price range (15%)
    const padding = priceRange * 0.15;
    const paddedMin = minPrice - padding;
    const paddedMax = maxPrice + padding;
    const paddedRange = paddedMax - paddedMin;

    // Chart dimensions (in viewBox units)
    const width = 100;
    const height = 100;
    const chartPadding = { top: 5, right: 2, bottom: 5, left: 2 };
    const chartWidth = width - chartPadding.left - chartPadding.right;
    const chartHeight = height - chartPadding.top - chartPadding.bottom;

    // Generate points
    const points: { x: number; y: number; timestamp: number; price: number }[] = [];
    
    sorted.forEach(([timestamp, price], index) => {
      const x = chartPadding.left + (index / (sorted.length - 1 || 1)) * chartWidth;
      const y = chartPadding.top + chartHeight - ((price - paddedMin) / paddedRange) * chartHeight;
      points.push({ x, y, timestamp, price });
    });

    // Generate smooth path using Catmull-Rom spline converted to cubic bezier
    const smoothPathD = generateSmoothPath(points);

    // Y-axis labels (4 price points)
    const priceStep = (maxPrice - minPrice) / 3;
    const yLabels = [
      { price: maxPrice, y: chartPadding.top + chartHeight * 0.05 },
      { price: Math.round(maxPrice - priceStep), y: chartPadding.top + chartHeight * 0.35 },
      { price: Math.round(minPrice + priceStep), y: chartPadding.top + chartHeight * 0.65 },
      { price: minPrice, y: chartPadding.top + chartHeight * 0.95 },
    ];

    // X-axis labels (days ago)
    const now = Date.now() / 1000;
    const firstTimestamp = sorted[0][0];
    const lastTimestamp = sorted[sorted.length - 1][0];
    const midTimestamp = sorted[Math.floor(sorted.length / 2)][0];

    const xLabels = [
      { label: formatDaysAgo(firstTimestamp, now), x: 0 },
      { label: formatDaysAgo(midTimestamp, now), x: 50 },
      { label: formatDaysAgo(lastTimestamp, now), x: 100 },
    ];

    // Grid lines (horizontal)
    const gridLines = [0.25, 0.5, 0.75].map(ratio => ({
      y: chartPadding.top + chartHeight * ratio,
    }));

    return {
      points,
      smoothPathD,
      yLabels,
      xLabels,
      gridLines,
      height,
      width,
      minPrice,
      maxPrice,
    };
  }, [priceHistory]);

  // Generate smooth SVG path using Catmull-Rom to Bezier conversion
  function generateSmoothPath(points: { x: number; y: number }[]): string {
    if (points.length < 2) return '';
    if (points.length === 2) {
      return `M ${points[0].x} ${points[0].y} L ${points[1].x} ${points[1].y}`;
    }

    let path = `M ${points[0].x} ${points[0].y}`;
    
    // Tension factor for smoothness (0 = straight lines, 1 = very curved)
    const tension = 0.3;

    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[Math.max(0, i - 1)];
      const p1 = points[i];
      const p2 = points[i + 1];
      const p3 = points[Math.min(points.length - 1, i + 2)];

      // Calculate control points using Catmull-Rom to Bezier conversion
      const cp1x = p1.x + (p2.x - p0.x) * tension;
      const cp1y = p1.y + (p2.y - p0.y) * tension;
      const cp2x = p2.x - (p3.x - p1.x) * tension;
      const cp2y = p2.y - (p3.y - p1.y) * tension;

      path += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`;
    }

    return path;
  }

  // Format days ago
  function formatDaysAgo(timestamp: number, now: number): string {
    const days = Math.round((now - timestamp) / (60 * 60 * 24));
    if (days <= 0) return 'Today';
    if (days === 1) return '1 day ago';
    return `${days} days ago`;
  }

  // Format currency
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(price);
  };

  if (!chartData) return null;

  return (
    <div className="relative">
      {/* Y-axis labels */}
      <div className="absolute left-0 top-0 bottom-6 w-14 flex flex-col justify-between text-xs text-gray-400 py-1">
        {chartData.yLabels.map((label, i) => (
          <span key={i} className="text-right pr-2 leading-none">
            {formatPrice(label.price)}
          </span>
        ))}
      </div>

      {/* Chart area */}
      <div className="ml-14">
        <svg
          viewBox={`0 0 ${chartData.width} ${chartData.height}`}
          preserveAspectRatio="none"
          className="w-full h-32 bg-gray-50 rounded-lg"
        >
          {/* Horizontal grid lines */}
          {chartData.gridLines.map((line, i) => (
            <line
              key={i}
              x1="2"
              y1={line.y}
              x2="98"
              y2={line.y}
              stroke="#e5e7eb"
              strokeWidth="0.5"
              strokeDasharray="2,2"
            />
          ))}

          {/* Smooth curve line */}
          <path
            d={chartData.smoothPathD}
            fill="none"
            stroke="#3b82f6"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
          />
        </svg>

        {/* X-axis labels */}
        <div className="flex justify-between text-xs text-gray-400 mt-2 px-1">
          {chartData.xLabels.map((label, i) => (
            <span key={i}>{label.label}</span>
          ))}
        </div>
      </div>
    </div>
  );
};

export default PriceTrendChart;
