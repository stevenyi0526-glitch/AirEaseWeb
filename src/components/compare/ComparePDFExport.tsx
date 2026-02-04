import React, { useState, useRef } from 'react';
import { Download, Loader2, CheckCircle } from 'lucide-react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import type { FlightWithScore } from '../../api/types';
import { formatPrice, formatDuration, formatTime } from '../../utils/formatters';
import { cn } from '../../utils/cn';

interface ComparePDFExportProps {
  flights: FlightWithScore[];
  radarChartRef: React.RefObject<HTMLDivElement | null>;
}

const ComparePDFExport: React.FC<ComparePDFExportProps> = ({ flights, radarChartRef }) => {
  const [isExporting, setIsExporting] = useState(false);
  const [exportSuccess, setExportSuccess] = useState(false);
  const printableRef = useRef<HTMLDivElement>(null);

  const handleExportPDF = async () => {
    setIsExporting(true);
    setExportSuccess(false);

    try {
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 15;
      let yPosition = margin;

      // Title and Header
      pdf.setFillColor(37, 99, 235); // Primary blue
      pdf.rect(0, 0, pageWidth, 40, 'F');
      
      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(24);
      pdf.setFont('helvetica', 'bold');
      pdf.text('AirEase Flight Comparison', margin, 25);
      
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'normal');
      pdf.text(`Generated on ${new Date().toLocaleDateString('en-US', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })}`, margin, 34);

      yPosition = 50;

      // Flight Summary Section
      pdf.setTextColor(31, 41, 55);
      pdf.setFontSize(14);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Flight Summary', margin, yPosition);
      yPosition += 8;

      // Find best values
      const bestPrice = Math.min(...flights.map(f => f.flight.price));
      const bestDuration = Math.min(...flights.map(f => f.flight.durationMinutes));
      const bestScore = Math.max(...flights.map(f => f.score.overallScore));

      // Flight cards
      const cardWidth = (pageWidth - margin * 2 - 10 * (flights.length - 1)) / flights.length;
      
      flights.forEach((flight, idx) => {
        const xPos = margin + idx * (cardWidth + 10);
        const isBestPrice = flight.flight.price === bestPrice;
        const isBestDuration = flight.flight.durationMinutes === bestDuration;
        const isBestScore = flight.score.overallScore === bestScore;
        const isBestOverall = isBestPrice && isBestScore;

        // Card background
        if (isBestOverall) {
          pdf.setFillColor(236, 253, 245); // Light green for best
          pdf.setDrawColor(16, 185, 129); // Green border
        } else {
          pdf.setFillColor(249, 250, 251); // Light gray
          pdf.setDrawColor(229, 231, 235); // Gray border
        }
        pdf.roundedRect(xPos, yPosition, cardWidth, 85, 3, 3, 'FD');

        // Best badge
        if (isBestOverall) {
          pdf.setFillColor(16, 185, 129);
          pdf.roundedRect(xPos + cardWidth/2 - 20, yPosition - 3, 40, 10, 2, 2, 'F');
          pdf.setTextColor(255, 255, 255);
          pdf.setFontSize(7);
          pdf.setFont('helvetica', 'bold');
          pdf.text('BEST CHOICE', xPos + cardWidth/2, yPosition + 3, { align: 'center' });
        }

        let cardY = yPosition + 12;

        // Airline name
        pdf.setTextColor(31, 41, 55);
        pdf.setFontSize(12);
        pdf.setFont('helvetica', 'bold');
        const airlineName = flight.flight.airline.length > 18 
          ? flight.flight.airline.substring(0, 16) + '...' 
          : flight.flight.airline;
        pdf.text(airlineName, xPos + cardWidth/2, cardY, { align: 'center' });
        cardY += 5;

        // Flight number
        pdf.setTextColor(107, 114, 128);
        pdf.setFontSize(9);
        pdf.setFont('helvetica', 'normal');
        pdf.text(flight.flight.flightNumber, xPos + cardWidth/2, cardY, { align: 'center' });
        cardY += 8;

        // Route
        pdf.setTextColor(31, 41, 55);
        pdf.setFontSize(10);
        pdf.setFont('helvetica', 'bold');
        pdf.text(`${flight.flight.departureCityCode} → ${flight.flight.arrivalCityCode}`, xPos + cardWidth/2, cardY, { align: 'center' });
        cardY += 8;

        // Score
        const scoreColor = flight.score.overallScore >= 80 ? [16, 185, 129] : 
                          flight.score.overallScore >= 60 ? [59, 130, 246] : [245, 158, 11];
        pdf.setFillColor(scoreColor[0], scoreColor[1], scoreColor[2]);
        pdf.roundedRect(xPos + cardWidth/2 - 12, cardY - 4, 24, 12, 2, 2, 'F');
        pdf.setTextColor(255, 255, 255);
        pdf.setFontSize(10);
        pdf.setFont('helvetica', 'bold');
        pdf.text(`${flight.score.overallScore}`, xPos + cardWidth/2, cardY + 4, { align: 'center' });
        cardY += 12;

        // Price
        pdf.setTextColor(37, 99, 235);
        pdf.setFontSize(14);
        pdf.setFont('helvetica', 'bold');
        pdf.text(formatPrice(flight.flight.price, flight.flight.currency), xPos + cardWidth/2, cardY, { align: 'center' });
        if (isBestPrice) {
          pdf.setFontSize(7);
          pdf.setTextColor(16, 185, 129);
          pdf.text('LOWEST', xPos + cardWidth/2, cardY + 5, { align: 'center' });
        }
        cardY += 10;

        // Duration
        pdf.setTextColor(55, 65, 81);
        pdf.setFontSize(9);
        pdf.setFont('helvetica', 'normal');
        pdf.text(`Duration: ${formatDuration(flight.flight.durationMinutes)}${isBestDuration ? ' ⚡' : ''}`, xPos + cardWidth/2, cardY, { align: 'center' });
        cardY += 5;

        // Stops
        const stopsText = flight.flight.stops === 0 ? 'Direct' : `${flight.flight.stops} stop${flight.flight.stops > 1 ? 's' : ''}`;
        pdf.text(`Stops: ${stopsText}`, xPos + cardWidth/2, cardY, { align: 'center' });
        cardY += 5;

        // Time
        pdf.text(`${formatTime(flight.flight.departureTime)} - ${formatTime(flight.flight.arrivalTime)}`, xPos + cardWidth/2, cardY, { align: 'center' });
      });

      yPosition += 95;

      // Score Dimensions Section
      pdf.setTextColor(31, 41, 55);
      pdf.setFontSize(14);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Score Breakdown', margin, yPosition);
      yPosition += 8;

      // Table header
      const colWidth = (pageWidth - margin * 2) / (flights.length + 1);
      pdf.setFillColor(243, 244, 246);
      pdf.rect(margin, yPosition, pageWidth - margin * 2, 8, 'F');
      
      pdf.setTextColor(107, 114, 128);
      pdf.setFontSize(8);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Dimension', margin + 3, yPosition + 5);
      
      flights.forEach((flight, idx) => {
        const shortName = flight.flight.airline.split(' ')[0].substring(0, 10);
        pdf.text(shortName, margin + colWidth * (idx + 1) + colWidth/2, yPosition + 5, { align: 'center' });
      });
      yPosition += 10;

      // Dimension rows
      const dimensions = [
        { key: 'overallScore', label: 'Overall Score', getValue: (f: FlightWithScore) => f.score.overallScore },
        { key: 'reliability', label: 'Reliability', getValue: (f: FlightWithScore) => f.score.dimensions.reliability },
        { key: 'comfort', label: 'Comfort', getValue: (f: FlightWithScore) => f.score.dimensions.comfort },
        { key: 'service', label: 'Service', getValue: (f: FlightWithScore) => f.score.dimensions.service },
        { key: 'value', label: 'Value', getValue: (f: FlightWithScore) => f.score.dimensions.value },
      ];

      dimensions.forEach((dim, rowIdx) => {
        const values = flights.map(f => dim.getValue(f));
        const maxValue = Math.max(...values);

        if (rowIdx % 2 === 1) {
          pdf.setFillColor(249, 250, 251);
          pdf.rect(margin, yPosition - 2, pageWidth - margin * 2, 7, 'F');
        }

        pdf.setTextColor(55, 65, 81);
        pdf.setFontSize(8);
        pdf.setFont('helvetica', 'normal');
        pdf.text(dim.label, margin + 3, yPosition + 3);

        flights.forEach((flight, idx) => {
          const value = dim.getValue(flight);
          const isBest = value === maxValue;
          
          if (isBest) {
            pdf.setTextColor(16, 185, 129);
            pdf.setFont('helvetica', 'bold');
          } else {
            pdf.setTextColor(55, 65, 81);
            pdf.setFont('helvetica', 'normal');
          }
          pdf.text(`${value}${isBest ? ' ★' : ''}`, margin + colWidth * (idx + 1) + colWidth/2, yPosition + 3, { align: 'center' });
        });

        yPosition += 7;
      });

      yPosition += 10;

      // Amenities Section
      pdf.setTextColor(31, 41, 55);
      pdf.setFontSize(14);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Amenities & Facilities', margin, yPosition);
      yPosition += 8;

      // Amenities table
      pdf.setFillColor(243, 244, 246);
      pdf.rect(margin, yPosition, pageWidth - margin * 2, 8, 'F');
      
      pdf.setTextColor(107, 114, 128);
      pdf.setFontSize(8);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Amenity', margin + 3, yPosition + 5);
      
      flights.forEach((flight, idx) => {
        const shortName = flight.flight.airline.split(' ')[0].substring(0, 10);
        pdf.text(shortName, margin + colWidth * (idx + 1) + colWidth/2, yPosition + 5, { align: 'center' });
      });
      yPosition += 10;

      const amenities = [
        { label: 'WiFi', getValue: (f: FlightWithScore) => f.facilities?.hasWifi ? '✓' : '✗' },
        { label: 'Power Outlets', getValue: (f: FlightWithScore) => f.facilities?.hasPower ? '✓' : '✗' },
        { label: 'Entertainment', getValue: (f: FlightWithScore) => f.facilities?.hasIFE ? f.facilities.ifeType || '✓' : '✗' },
        { label: 'Seat Pitch', getValue: (f: FlightWithScore) => f.facilities?.seatPitchInches ? `${f.facilities.seatPitchInches}"` : '—' },
        { label: 'Meals', getValue: (f: FlightWithScore) => f.facilities?.mealIncluded ? f.facilities.mealType || '✓' : '✗' },
      ];

      amenities.forEach((amenity, rowIdx) => {
        if (rowIdx % 2 === 1) {
          pdf.setFillColor(249, 250, 251);
          pdf.rect(margin, yPosition - 2, pageWidth - margin * 2, 7, 'F');
        }

        pdf.setTextColor(55, 65, 81);
        pdf.setFontSize(8);
        pdf.setFont('helvetica', 'normal');
        pdf.text(amenity.label, margin + 3, yPosition + 3);

        flights.forEach((flight, idx) => {
          const value = amenity.getValue(flight);
          if (value === '✓' || (value !== '✗' && value !== '—')) {
            pdf.setTextColor(16, 185, 129);
          } else if (value === '✗') {
            pdf.setTextColor(239, 68, 68);
          } else {
            pdf.setTextColor(156, 163, 175);
          }
          pdf.text(value, margin + colWidth * (idx + 1) + colWidth/2, yPosition + 3, { align: 'center' });
        });

        yPosition += 7;
      });

      // Capture radar chart if available
      if (radarChartRef.current) {
        try {
          const canvas = await html2canvas(radarChartRef.current, {
            backgroundColor: '#ffffff',
            scale: 2,
            logging: false,
          });
          
          const imgData = canvas.toDataURL('image/png');
          const imgWidth = pageWidth - margin * 2;
          const imgHeight = (canvas.height * imgWidth) / canvas.width;
          
          // Check if we need a new page
          if (yPosition + imgHeight + 20 > pageHeight - margin) {
            pdf.addPage();
            yPosition = margin;
          } else {
            yPosition += 15;
          }

          pdf.setTextColor(31, 41, 55);
          pdf.setFontSize(14);
          pdf.setFont('helvetica', 'bold');
          pdf.text('Visual Comparison', margin, yPosition);
          yPosition += 8;

          pdf.addImage(imgData, 'PNG', margin, yPosition, imgWidth, imgHeight);
          yPosition += imgHeight + 10;
        } catch (error) {
          console.error('Error capturing radar chart:', error);
        }
      }

      // Footer
      const footerY = pageHeight - 10;
      pdf.setTextColor(156, 163, 175);
      pdf.setFontSize(8);
      pdf.setFont('helvetica', 'normal');
      pdf.text('Generated by AirEase • Your Journey, Your Story', pageWidth / 2, footerY, { align: 'center' });

      // Save the PDF
      const fileName = `AirEase_Comparison_${new Date().toISOString().split('T')[0]}.pdf`;
      pdf.save(fileName);

      setExportSuccess(true);
      setTimeout(() => setExportSuccess(false), 3000);
    } catch (error) {
      console.error('Error generating PDF:', error);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="flex items-center gap-3">
      <button
        onClick={handleExportPDF}
        disabled={isExporting}
        className={cn(
          'flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium transition-all',
          isExporting
            ? 'bg-surface-alt text-text-muted cursor-not-allowed'
            : exportSuccess
            ? 'bg-success text-white'
            : 'bg-gradient-to-r from-primary to-blue-600 text-white shadow-lg hover:shadow-xl hover:scale-[1.02]'
        )}
      >
        {isExporting ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Generating PDF...</span>
          </>
        ) : exportSuccess ? (
          <>
            <CheckCircle className="w-4 h-4" />
            <span>Downloaded!</span>
          </>
        ) : (
          <>
            <Download className="w-4 h-4" />
            <span>Download PDF</span>
          </>
        )}
      </button>

      <div className="hidden">
        <div ref={printableRef}>
          {/* Hidden printable content for html2canvas if needed */}
        </div>
      </div>
    </div>
  );
};

export default ComparePDFExport;
