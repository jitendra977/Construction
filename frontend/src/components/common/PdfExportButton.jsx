import React from 'react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

const PdfExportButton = ({ data, title, filename, summaryData, projectInfo }) => {
  const exportPDF = () => {
    try {
      const doc = new jsPDF();
      if (!doc) throw new Error("Could not initialize PDF document");
      
      const pageWidth = doc.internal.pageSize.width;
      const dateStr = new Date().toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'long',
        year: 'numeric'
      });

      // 1. BRANDED HEADER
      // Background Header Bar
      doc.setFillColor(30, 30, 30);
      doc.rect(0, 0, pageWidth, 40, 'F');
      
      // Project Title
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(22);
      doc.text(projectInfo?.name || "Dream Home Project", 14, 18);
      
      // Owner & Subtitle
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text(`Project Intelligence Report | Owner: ${projectInfo?.owner || 'Authorized User'}`, 14, 26);
      
      // Filter Context
      if (projectInfo?.filterMetadata) {
        doc.setFontSize(8);
        doc.setTextColor(150);
        doc.setFont('helvetica', 'italic');
        doc.text(projectInfo.filterMetadata, 14, 32);
      }
      
      // Report Name (Right Aligned)
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text(title?.toUpperCase() || "FINANCIAL SUMMARY", pageWidth - 14, 18, { align: 'right' });
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.text(`Generated on: ${dateStr}`, pageWidth - 14, 25, { align: 'right' });

      // 2. SUMMARY METRICS SECTION
      if (summaryData) {
        doc.setTextColor(0, 0, 0);
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.text("Financial Health Overview", 14, 52);
        
        doc.setDrawColor(240);
        doc.setFillColor(250, 250, 250);
        doc.rect(14, 56, pageWidth - 28, 24, 'FD');
        
        const colWidth = (pageWidth - 28) / 3;
        
        doc.setFontSize(8);
        doc.setTextColor(100);
        doc.text("TOTAL EXPENSE", 20, 63);
        doc.setFontSize(12);
        doc.setTextColor(0, 0, 0);
        doc.text(summaryData.totalAmount || "Rs. 0", 20, 72);
        
        doc.setFontSize(8);
        doc.setTextColor(100);
        doc.text("TOTAL DISBURSED", 20 + colWidth, 63);
        doc.setFontSize(12);
        doc.setTextColor(34, 197, 94); // Green
        doc.text(summaryData.totalPaid || "Rs. 0", 20 + colWidth, 72);
        
        doc.setFontSize(8);
        doc.setTextColor(100);
        doc.text("OUTSTANDING BALANCE", 20 + (colWidth * 2), 63);
        doc.setFontSize(12);
        doc.setTextColor(239, 68, 68); // Red
        doc.text(summaryData.totalDue || "Rs. 0", 20 + (colWidth * 2), 72);
      }

      // 3. MAIN DATA TABLE
      autoTable(doc, {
        startY: summaryData ? 90 : 50,
        head: [data.columns],
        body: data.rows,
        theme: 'striped',
        headStyles: { 
          fillColor: [30, 30, 30], 
          textColor: 255, 
          fontSize: 9, 
          fontStyle: 'bold',
          halign: 'left'
        },
        styles: { 
          fontSize: 8, 
          cellPadding: 4,
          font: 'helvetica'
        },
        columnStyles: {
          5: { halign: 'right', fontStyle: 'bold' },
          6: { halign: 'center' }
        },
        alternateRowStyles: { 
          fillColor: [250, 250, 250] 
        }
      });

      // 4. FOOTER
      const pageCount = doc.internal.getNumberOfPages();
      for(let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(150);
        doc.setDrawColor(240);
        doc.line(14, doc.internal.pageSize.height - 15, pageWidth - 14, doc.internal.pageSize.height - 15);
        doc.text(
          "Construction Intelligence System | Confidential Report", 
          14, 
          doc.internal.pageSize.height - 10
        );
        doc.text(
          `Page ${i} of ${pageCount}`, 
          pageWidth - 14, 
          doc.internal.pageSize.height - 10, 
          { align: 'right' }
        );
      }

      doc.save(filename || 'construction_report.pdf');
    } catch (error) {
      console.error("PDF Export Failure:", error);
      alert("Failed to generate PDF. Check console for details.");
    }
  };

  return (
    <button 
      onClick={exportPDF}
      className="flex items-center gap-2 px-4 py-2 bg-[var(--t-surface2)] text-[var(--t-text2)] border border-[var(--t-border)] rounded-[2px] transition-all hover:bg-[var(--t-surface3)] hover:text-[var(--t-text)] font-['DM_Mono',monospace] uppercase tracking-widest text-[10px] font-bold"
    >
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
      {data.rows.length} RECORD{data.rows.length !== 1 ? 'S' : ''} [PDF]
    </button>
  );
};

export default PdfExportButton;
