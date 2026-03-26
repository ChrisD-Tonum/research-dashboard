import jsPDF from 'jspdf';

export interface PeptideData {
  id?: number;
  synthesis_id?: number;
  molecular_weight?: number;
  molecular_formula?: string;
  sequence?: string;
  purity?: number;
  pdb_ids?: string[];
  coordinates_3d?: any;
  experimental_methods?: string[];
  suppliers?: Array<{
    name: string;
    url?: string;
    price?: string;
    availability?: string;
  }>;
}

export interface Synthesis {
  id: number;
  topic: string;
  format: string;
  outline: any;
  full_text: string;
  generated_at: string;
  peptide_data?: PeptideData | null;
}

function formatDate(date: string | Date): string {
  const d = new Date(date);
  return d.toLocaleDateString() + ' ' + d.toLocaleTimeString();
}

function sanitizeFilename(filename: string): string {
  return filename.replace(/[^a-z0-9-]/gi, '_').toLowerCase();
}

function flattenObject(obj: any, parentKey = ''): Record<string, any> {
  let items: Record<string, any> = {};

  for (let key in obj) {
    if (obj.hasOwnProperty(key)) {
      const newKey = parentKey ? `${parentKey}.${key}` : key;
      const value = obj[key];

      if (value === null || value === undefined) {
        items[newKey] = '';
      } else if (Array.isArray(value)) {
        items[newKey] = value.join('; ');
      } else if (typeof value === 'object') {
        items = { ...items, ...flattenObject(value, newKey) };
      } else {
        items[newKey] = String(value);
      }
    }
  }

  return items;
}

function renderOutlineToText(outline: any, depth = 0): string {
  const indent = '  '.repeat(depth);
  let text = '';

  if (Array.isArray(outline)) {
    outline.forEach((item) => {
      if (typeof item === 'object') {
        text += renderOutlineToText(item, depth + 1) + '\n';
      } else {
        text += `${indent}• ${item}\n`;
      }
    });
  } else if (typeof outline === 'object' && outline !== null) {
    Object.entries(outline).forEach(([key, value]: [string, any]) => {
      const formattedKey = key
        .replace(/_/g, ' ')
        .split(' ')
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' ');
      text += `${indent}${formattedKey}:\n`;
      text += renderOutlineToText(value, depth + 1);
    });
  } else {
    text += `${indent}${outline}\n`;
  }

  return text;
}

export function exportSynthesisToPDF(synthesis: Synthesis): void {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;
  const contentWidth = pageWidth - 2 * margin;
  let yPosition = margin;

  // Helper to add text with automatic page breaks
  function addText(
    text: string,
    fontSize: number,
    isBold = false,
    options: any = {}
  ) {
    doc.setFontSize(fontSize);
    doc.setFont('Helvetica', isBold ? 'bold' : 'normal');

    const lines = doc.splitTextToSize(text, contentWidth);
    const lineHeight = fontSize * 0.5;

    lines.forEach((line: string) => {
      if (yPosition + lineHeight > pageHeight - margin) {
        doc.addPage();
        yPosition = margin;
      }
      doc.text(line, margin, yPosition, options);
      yPosition += lineHeight;
    });

    yPosition += 2; // Add spacing between sections
  }

  // Title
  addText(synthesis.topic, 24, true);
  addText(`Generated: ${formatDate(synthesis.generated_at)}`, 10, false);
  yPosition += 5;

  // Add horizontal line
  doc.setDrawColor(200, 200, 200);
  doc.line(margin, yPosition, pageWidth - margin, yPosition);
  yPosition += 8;

  // Render outline sections
  if (synthesis.outline) {
    const sections = [
      { key: 'overview', title: 'Overview', icon: '📋' },
      { key: 'mechanism', title: 'Mechanism of Action', icon: '⚙️' },
      { key: 'findings', title: 'Research Findings', icon: '🔬' },
      { key: 'benefits', title: 'Potential Benefits', icon: '✅' },
      { key: 'risks', title: 'Risks and Safety', icon: '⚠️' },
      { key: 'legal_status', title: 'Legal Status', icon: '⚖️' },
      { key: 'citations', title: 'Citations', icon: '📚' },
    ];

    sections.forEach(({ key, title }) => {
      if (synthesis.outline[key]) {
        addText(title, 14, true);
        const contentText = renderOutlineToText(synthesis.outline[key]);
        addText(contentText, 10, false);
        yPosition += 3;
      }
    });
  }

  // Add peptide data if available
  if (synthesis.peptide_data) {
    const peptide = synthesis.peptide_data;
    
    if (peptide.molecular_weight || peptide.molecular_formula || peptide.sequence || peptide.purity !== undefined) {
      yPosition += 3;
      addText('Chemical Properties', 14, true);
      if (peptide.molecular_weight) {
        addText(`Molecular Weight: ${peptide.molecular_weight.toFixed(2)} g/mol`, 10);
      }
      if (peptide.molecular_formula) {
        addText(`Molecular Formula: ${peptide.molecular_formula}`, 10);
      }
      if (peptide.sequence) {
        addText(`Sequence: ${peptide.sequence}`, 10);
      }
      if (peptide.purity !== undefined) {
        addText(`Purity: ${(peptide.purity * 100).toFixed(2)}%`, 10);
      }
    }

    if (peptide.pdb_ids?.length || peptide.experimental_methods?.length) {
      yPosition += 3;
      addText('Structural Data', 14, true);
      if (peptide.pdb_ids && peptide.pdb_ids.length > 0) {
        addText(`PDB IDs: ${peptide.pdb_ids.join(', ')}`, 10);
      }
      if (peptide.experimental_methods && peptide.experimental_methods.length > 0) {
        addText('Experimental Methods:', 10, true);
        peptide.experimental_methods.forEach(method => {
          addText(`• ${method}`, 10);
        });
      }
      if (peptide.coordinates_3d) {
        addText('3D Coordinates: Available', 10);
      }
    }

    if (peptide.suppliers && peptide.suppliers.length > 0) {
      yPosition += 3;
      addText('Suppliers', 14, true);
      peptide.suppliers.forEach((supplier) => {
        addText(`${supplier.name}${supplier.availability ? ` (${supplier.availability})` : ''}`, 10, true);
        if (supplier.price) {
          addText(`Price: ${supplier.price}`, 10);
        }
        if (supplier.url) {
          addText(`URL: ${supplier.url}`, 9);
        }
        yPosition += 1;
      });
    }
  }

  // Add full text if available
  if (synthesis.full_text) {
    addText('Full Text', 14, true);
    addText(synthesis.full_text, 10, false);
  }

  // Save
  const filename = `synthesis-${sanitizeFilename(synthesis.topic)}-${new Date()
    .toISOString()
    .split('T')[0]}.pdf`;
  doc.save(filename);
}

export function exportSynthesisToJSON(synthesis: Synthesis): void {
  const data = {
    topic: synthesis.topic,
    generated_at: synthesis.generated_at,
    format: synthesis.format,
    outline: synthesis.outline,
    full_text: synthesis.full_text,
    ...(synthesis.peptide_data && { peptide_data: synthesis.peptide_data }),
  };

  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: 'application/json',
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `synthesis-${sanitizeFilename(synthesis.topic)}-${new Date()
    .toISOString()
    .split('T')[0]}.json`;
  link.click();
  URL.revokeObjectURL(url);
}

export function exportSynthesisToCSV(synthesis: Synthesis): void {
  const rows: string[] = [];

  // Header
  rows.push('Section,Content');

  // Add metadata
  rows.push(
    `Topic,"${synthesis.topic.replace(/"/g, '""')}"`,
    `Generated At,"${synthesis.generated_at}"`,
    `Format,"${synthesis.format || 'Structured'}"`
  );

  rows.push(''); // Empty line for separation

  // Add outline sections
  if (synthesis.outline) {
    const sections = [
      { key: 'overview', title: 'Overview' },
      { key: 'mechanism', title: 'Mechanism of Action' },
      { key: 'findings', title: 'Research Findings' },
      { key: 'benefits', title: 'Potential Benefits' },
      { key: 'risks', title: 'Risks and Safety' },
      { key: 'legal_status', title: 'Legal Status' },
      { key: 'citations', title: 'Citations' },
    ];

    sections.forEach(({ key, title }) => {
      if (synthesis.outline[key]) {
        const contentText = renderOutlineToText(synthesis.outline[key])
          .trim()
          .replace(/"/g, '""');
        rows.push(`"${title}","${contentText}"`);
      }
    });
  }

  // Add peptide data if available
  if (synthesis.peptide_data) {
    const peptide = synthesis.peptide_data;
    rows.push(''); // Empty line for separation
    
    if (peptide.molecular_weight || peptide.molecular_formula || peptide.sequence || peptide.purity !== undefined) {
      rows.push('"Chemical Properties",""');
      if (peptide.molecular_weight) {
        rows.push(`"  Molecular Weight","${peptide.molecular_weight.toFixed(2)} g/mol"`);
      }
      if (peptide.molecular_formula) {
        rows.push(`"  Molecular Formula","${peptide.molecular_formula}"`);
      }
      if (peptide.sequence) {
        rows.push(`"  Sequence","${peptide.sequence.replace(/"/g, '""')}"`);
      }
      if (peptide.purity !== undefined) {
        rows.push(`"  Purity","${(peptide.purity * 100).toFixed(2)}%"`);
      }
    }

    if (peptide.pdb_ids?.length || peptide.experimental_methods?.length) {
      rows.push('"Structural Data",""');
      if (peptide.pdb_ids && peptide.pdb_ids.length > 0) {
        rows.push(`"  PDB IDs","${peptide.pdb_ids.join(', ')}"`);
      }
      if (peptide.experimental_methods && peptide.experimental_methods.length > 0) {
        rows.push(`"  Experimental Methods","${peptide.experimental_methods.join('; ')}"`);
      }
      if (peptide.coordinates_3d) {
        rows.push('"  3D Coordinates","Available"');
      }
    }

    if (peptide.suppliers && peptide.suppliers.length > 0) {
      rows.push('"Suppliers",""');
      peptide.suppliers.forEach((supplier) => {
        const supplierInfo = `${supplier.name}${supplier.availability ? ` (${supplier.availability})` : ''}${supplier.price ? ` - ${supplier.price}` : ''}${supplier.url ? ` - ${supplier.url}` : ''}`;
        rows.push(`"  Supplier","${supplierInfo.replace(/"/g, '""')}"`);
      });
    }
  }

  // Add full text if available
  if (synthesis.full_text) {
    rows.push(`"Full Text","${synthesis.full_text.replace(/"/g, '""')}"`);
  }

  const csv = rows.join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `synthesis-${sanitizeFilename(synthesis.topic)}-${new Date()
    .toISOString()
    .split('T')[0]}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}
