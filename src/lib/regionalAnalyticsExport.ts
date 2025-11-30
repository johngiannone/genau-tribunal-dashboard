import jsPDF from 'jspdf';
import 'jspdf-autotable';
import html2canvas from 'html2canvas';

interface RegionalData {
  country: string;
  currency: string;
  totalRevenue: number;
  transactionCount: number;
  userCount: number;
}

interface CurrencyData {
  currency: string;
  amount: number;
  count: number;
}

const CURRENCY_SYMBOLS: Record<string, string> = {
  'USD': '$',
  'EUR': '€',
  'GBP': '£',
};

const formatCurrency = (amount: number, currency: string = 'USD') => {
  const symbol = CURRENCY_SYMBOLS[currency] || '$';
  return `${symbol}${amount.toFixed(2)}`;
};

export const exportRegionalDataToCSV = (
  regionalData: RegionalData[],
  currencyData: CurrencyData[],
  totalRevenue: number,
  totalTransactions: number
) => {
  // Create CSV content
  const csvRows: string[] = [];
  
  // Add summary section
  csvRows.push('Regional Payment Analytics Report');
  csvRows.push(`Generated: ${new Date().toLocaleString()}`);
  csvRows.push('');
  csvRows.push('Summary');
  csvRows.push(`Total Revenue,$${totalRevenue.toFixed(2)}`);
  csvRows.push(`Total Transactions,${totalTransactions}`);
  csvRows.push(`Active Regions,${regionalData.length}`);
  csvRows.push('');
  
  // Add currency breakdown
  csvRows.push('Currency Breakdown');
  csvRows.push('Currency,Amount,Transaction Count');
  currencyData.forEach(curr => {
    csvRows.push(`${curr.currency},${curr.amount.toFixed(2)},${curr.count}`);
  });
  csvRows.push('');
  
  // Add regional breakdown
  csvRows.push('Regional Breakdown');
  csvRows.push('Country,Currency,Revenue,Transactions,Unique Users,Avg Transaction,Conversion Rate');
  regionalData.forEach(region => {
    const avgTransaction = region.totalRevenue / region.transactionCount;
    const conversionRate = ((region.transactionCount / region.userCount) * 100).toFixed(1);
    csvRows.push(
      `${region.country},${region.currency},${region.totalRevenue.toFixed(2)},${region.transactionCount},${region.userCount},${avgTransaction.toFixed(2)},${conversionRate}%`
    );
  });
  
  // Create blob and download
  const csvContent = csvRows.join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', `regional-analytics-${new Date().getTime()}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

export const exportRegionalDataToPDF = async (
  regionalData: RegionalData[],
  currencyData: CurrencyData[],
  totalRevenue: number,
  totalTransactions: number,
  currencyChartRef: HTMLElement | null,
  countryChartRef: HTMLElement | null
) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  
  let currentY = 20;
  let pageNum = 1;
  
  // Header
  doc.setFillColor(0, 113, 227);
  doc.rect(0, 0, pageWidth, 40, 'F');
  doc.setFontSize(24);
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.text('Regional Payment Analytics', 20, 25);
  doc.setFontSize(10);
  doc.text(new Date().toLocaleString(), 20, 32);
  
  currentY = 50;
  
  // Summary KPIs
  doc.setFontSize(16);
  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'bold');
  doc.text('Executive Summary', 20, currentY);
  currentY += 10;
  
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.text(`Total Revenue: $${totalRevenue.toFixed(2)}`, 20, currentY);
  currentY += 7;
  doc.text(`Total Transactions: ${totalTransactions}`, 20, currentY);
  currentY += 7;
  doc.text(`Active Regions: ${regionalData.length}`, 20, currentY);
  currentY += 15;
  
  // Currency breakdown chart
  if (currencyChartRef) {
    try {
      const canvas = await html2canvas(currencyChartRef, { scale: 2, backgroundColor: '#ffffff' });
      const imgData = canvas.toDataURL('image/png');
      const imgWidth = 80;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      
      if (currentY + imgHeight > pageHeight - 30) {
        doc.addPage();
        pageNum++;
        currentY = 20;
      }
      
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('Revenue by Currency', 20, currentY);
      currentY += 10;
      
      doc.addImage(imgData, 'PNG', 20, currentY, imgWidth, imgHeight);
      currentY += imgHeight + 15;
    } catch (error) {
      console.error('Error capturing currency chart:', error);
    }
  }
  
  // Country breakdown chart
  if (countryChartRef) {
    try {
      const canvas = await html2canvas(countryChartRef, { scale: 2, backgroundColor: '#ffffff' });
      const imgData = canvas.toDataURL('image/png');
      const imgWidth = 160;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      
      if (currentY + imgHeight > pageHeight - 30) {
        doc.addPage();
        pageNum++;
        currentY = 20;
      }
      
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('Top Countries by Revenue', 20, currentY);
      currentY += 10;
      
      doc.addImage(imgData, 'PNG', 20, currentY, imgWidth, imgHeight);
      currentY += imgHeight + 15;
    } catch (error) {
      console.error('Error capturing country chart:', error);
    }
  }
  
  // Regional breakdown table
  if (currentY + 50 > pageHeight - 30) {
    doc.addPage();
    pageNum++;
    currentY = 20;
  }
  
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Regional Transaction Details', 20, currentY);
  currentY += 5;
  
  const tableData = regionalData.map(region => [
    region.country,
    region.currency,
    formatCurrency(region.totalRevenue, region.currency),
    region.transactionCount.toString(),
    region.userCount.toString(),
    formatCurrency(region.totalRevenue / region.transactionCount, region.currency),
    `${((region.transactionCount / region.userCount) * 100).toFixed(1)}%`
  ]);
  
  doc.autoTable({
    startY: currentY,
    head: [['Country', 'Currency', 'Revenue', 'Transactions', 'Users', 'Avg/Transaction', 'Conv. Rate']],
    body: tableData,
    theme: 'striped',
    headStyles: { fillColor: [0, 113, 227], textColor: [255, 255, 255], fontStyle: 'bold' },
    styles: { fontSize: 9, cellPadding: 3 },
    columnStyles: {
      2: { halign: 'right' },
      3: { halign: 'right' },
      4: { halign: 'right' },
      5: { halign: 'right' },
      6: { halign: 'right' }
    }
  });
  
  // Footer on all pages
  const totalPages = doc.internal.pages.length - 1;
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    const footerY = pageHeight - 15;
    doc.setFontSize(9);
    doc.setTextColor(150, 150, 150);
    doc.text('Generated by Genau Analytics', 20, footerY);
    doc.text(`Page ${i} of ${totalPages}`, pageWidth - 20, footerY, { align: 'right' });
  }
  
  doc.save(`regional-analytics-report-${new Date().getTime()}.pdf`);
};
