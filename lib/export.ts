import jsPDF from 'jspdf';

interface Article {
  id: number;
  topic: string;
  source_name: string;
  title: string;
  url: string;
  content: string;
  crawl_date: string;
}

export function exportToCSV(articles: Article[], topic: string) {
  const headers = ['Title', 'Source', 'URL', 'Date'];
  const rows = articles.map(a => [
    `"${a.title.replace(/"/g, '""')}"`,
    a.source_name,
    a.url,
    new Date(a.crawl_date).toLocaleDateString(),
  ]);

  const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${topic}-research.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

export function exportToJSON(articles: Article[], topic: string) {
  const data = { topic, count: articles.length, articles };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${topic}-research.json`;
  link.click();
  URL.revokeObjectURL(url);
}

export function exportToPDF(articles: Article[], topic: string) {
  const doc = new jsPDF();
  doc.setFontSize(20);
  doc.text(`${topic} Research`, 20, 20);
  doc.setFontSize(10);
  doc.text(`Articles: ${articles.length}`, 20, 30);
  
  let y = 45;
  
  articles.forEach((article, idx) => {
    if (y > 250) {
      doc.addPage();
      y = 20;
    }
    
    doc.setFontSize(11);
    doc.text(`${idx + 1}. ${article.title.substring(0, 60)}`, 20, y);
    y += 7;
    
    doc.setFontSize(9);
    doc.text(`Source: ${article.source_name}`, 20, y);
    y += 5;
    doc.text(`URL: ${article.url}`, 20, y);
    y += 10;
  });
  
  doc.save(`${topic}-research.pdf`);
}
