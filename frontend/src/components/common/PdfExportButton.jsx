import React from 'react';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

const PdfExportButton = ({ data, title, filename }) => {
  const exportPDF = () => {
    const doc = new jsPDF();
    const currentDateAD = new Date().toISOString().split('T')[0];

    // Title and Meta
    doc.setFontSize(18);
    doc.text(title || "Project Cost Summary", 14, 22);
    
    doc.setFontSize(11);
    doc.setTextColor(100);
    doc.text(`Generated On: ${currentDateAD}`, 14, 30);
    
    // AutoTable
    doc.autoTable({
      startY: 36,
      head: [data.columns],
      body: data.rows,
      theme: 'grid',
      styles: { fontSize: 10, cellPadding: 3 },
      headStyles: { fillColor: [41, 128, 185], textColor: 255 },
      alternateRowStyles: { fillColor: [245, 245, 245] }
    });

    // Footer
    const pageCount = doc.internal.getNumberOfPages();
    for(let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.text(`Page ${i} of ${pageCount}`, doc.internal.pageSize.width - 20, doc.internal.pageSize.height - 10, {align: 'right'});
    }

    doc.save(filename || 'cost_summary.pdf');
  };

  return (
    <button 
      onClick={exportPDF}
      className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded shadow transition-colors duration-200 flex items-center gap-2"
    >
      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
      </svg>
      Export PDF
    </button>
  );
};

export default PdfExportButton;
