# Peptide Data Integration - Complete Implementation Guide

## Overview

This document describes the complete integration of peptide data into the Next.js research dashboard synthesis page. The implementation adds three new collapsible sections to display peptide-specific information alongside research synthesis data.

## What Was Updated

### 1. **Type Definitions** (`lib/synthesisExport.ts`)

Added new TypeScript interfaces:

```typescript
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
  peptide_data?: PeptideData | null;  // NEW FIELD
}
```

**Key Points:**
- All peptide fields are optional for backward compatibility
- `peptide_data` is optional on the Synthesis interface
- Supports rich supplier information with URLs and pricing

### 2. **Data Fetching** (`app/research/synthesis/page.tsx`)

Updated `fetchSynthesis()` function to:

```typescript
// 1. Fetch synthesis data as before
const { data } = await supabase
  .from('syntheses')
  .select('*')
  .eq('topic', topic)
  .order('generated_at', { ascending: false })
  .limit(1);

// 2. Attempt to fetch associated peptide data
const { data: peptideRows } = await supabase
  .from('peptide_data')
  .select('*')
  .eq('synthesis_id', synthesisData.id)
  .limit(1);

// 3. Combine both into single response
setSynthesis({
  ...synthesisData,
  peptide_data: peptideRows?.[0] || null,
});
```

**Features:**
- Graceful error handling if peptide_data table doesn't exist
- Works with syntheses that have no peptide data
- Automatically associates peptide data via `synthesis_id` FK

### 3. **UI Components** (`app/research/synthesis/page.tsx`)

Added three new collapsible sections with distinct styling:

#### A. **Chemical Properties Section** 🧬
```
- Molecular Weight (g/mol)
- Molecular Formula (code format)
- Sequence (monospace, scrollable)
- Purity (percentage badge)

Styling: Purple→Pink gradient background
```

#### B. **Structural Data Section** 🔬
```
- PDB IDs (clickable links to RCSB)
- Experimental Methods (bulleted list)
- 3D Coordinates (availability indicator)

Styling: Blue→Cyan gradient background
```

#### C. **Suppliers Section** 🛒
```
- Supplier Name (clickable link if URL provided)
- Price
- Availability Status (In Stock / Pre-Order badge)

Styling: Orange→Yellow gradient background
Per-supplier cards with borders
```

**Implementation Details:**
- Sections only render if they have data (null-safe)
- Each section uses custom icon and color scheme
- Consistent with existing collapsible component pattern
- Dark mode support for all gradients

### 4. **Export Functions** (`lib/synthesisExport.ts`)

#### PDF Export
Added peptide data sections with:
- Formatted tables and lists
- Proper spacing and page breaks
- Supplier URLs included as text
- PDB links referenced

#### JSON Export
Peptide data included as structured object:
```json
{
  "topic": "...",
  "outline": {...},
  "peptide_data": {
    "molecular_weight": 1234.56,
    "sequence": "...",
    "suppliers": [...]
  }
}
```

#### CSV Export
Peptide data formatted as:
```
Chemical Properties,
  Molecular Weight,1234.56 g/mol
  Molecular Formula,C₁₀H₁₅N...
  Sequence,MKCNFL...
  Purity,98.50%

Structural Data,
  PDB IDs,1ABC, 2XYZ
  Experimental Methods,X-ray Crystallography; NMR
  3D Coordinates,Available

Suppliers,
  Supplier,Supplier Name (In Stock) - $99.99 - https://...
```

## Database Schema Requirements

Your Supabase database should have:

### `peptide_data` table

```sql
CREATE TABLE peptide_data (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  synthesis_id BIGINT NOT NULL REFERENCES syntheses(id) ON DELETE CASCADE,
  molecular_weight DECIMAL(10, 4),
  molecular_formula VARCHAR(255),
  sequence TEXT,
  purity DECIMAL(5, 4),  -- 0-1 range (0.95 = 95%)
  pdb_ids TEXT[],        -- Array of PDB IDs
  coordinates_3d JSONB,  -- Can store XYZ coordinates
  experimental_methods TEXT[],
  suppliers JSONB,       -- Array of supplier objects
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  CONSTRAINT fk_synthesis FOREIGN KEY (synthesis_id) 
    REFERENCES syntheses(id) ON DELETE CASCADE
);

CREATE INDEX idx_peptide_data_synthesis_id ON peptide_data(synthesis_id);
```

### Supplier Object Schema (in JSONB)

```json
{
  "name": "Sigma-Aldrich",
  "url": "https://www.sigmaaldrich.com/...",
  "price": "$99.99 per 1mg",
  "availability": "In Stock"
}
```

## Backward Compatibility

✅ **Fully backward compatible:**

- Existing syntheses work as before
- Peptide data is optional (nulls are handled gracefully)
- No changes to existing synthesis data structure
- Sections don't render if peptide data is missing
- All exports work with or without peptide data

### Example: Synthesis Without Peptide Data

```typescript
// This still works perfectly
const synthesis = {
  id: 1,
  topic: "Aspirin",
  outline: {...},
  peptide_data: null  // No peptide info
};
```

The UI will render normally, but the three peptide sections won't appear.

## Deployment Checklist

- [ ] **1. Update Supabase Schema**
  ```bash
  # Login to Supabase dashboard or use CLI
  # Create peptide_data table with schema above
  ```

- [ ] **2. Deploy Next.js Changes**
  ```bash
  git add .
  git commit -m "feat: Add peptide data integration with 3 collapsible sections"
  npm run build
  npm run start
  ```

- [ ] **3. Test Backward Compatibility**
  - Load existing synthesis (no peptide data) → should work
  - Check browser console for no errors

- [ ] **4. Test New Features**
  - Add test peptide data to a synthesis
  - Verify all three sections render correctly
  - Test exports (PDF, JSON, CSV)
  - Test dark mode styling

- [ ] **5. Test Mobile Responsiveness**
  - Check collapsible sections on mobile
  - Verify sequence scrolling works
  - Check supplier card layout

## File Changes Summary

### Modified Files
1. **`app/research/synthesis/page.tsx`**
   - Added PeptideData interface
   - Updated Synthesis interface with peptide_data field
   - Enhanced fetchSynthesis() with peptide data query
   - Added 3 new collapsible sections for peptide display

2. **`lib/synthesisExport.ts`**
   - Added PeptideData and updated Synthesis interfaces
   - Enhanced exportSynthesisToPDF() with peptide sections
   - Updated exportSynthesisToJSON() to include peptide data
   - Enhanced exportSynthesisToCSV() with formatted peptide data

### New Dependencies
None! Uses existing libraries:
- `@supabase/supabase-js` (already in use)
- `jspdf` (already imported)

## Styling Details

### Color Scheme

| Section | Background | Icon | Use Case |
|---------|-----------|------|----------|
| **Chemical Properties** | Purple→Pink gradient | 🧬 | Molecular data |
| **Structural Data** | Blue→Cyan gradient | 🔬 | 3D/PDB data |
| **Suppliers** | Orange→Yellow gradient | 🛒 | Vendor info |

### Dark Mode

All gradient backgrounds include dark mode variants:
```css
/* Light mode */
bg-gradient-to-br from-purple-50 to-pink-50

/* Dark mode */
dark:from-purple-900/20 dark:to-pink-900/20
```

### Typography

- **Section titles**: Font-semibold, gray-900/100 (dark)
- **Field labels**: Font-semibold, gray-900/100 (dark)
- **Values**: Regular, gray-700/300 (dark)
- **Sequences**: Monospace, scrollable, max-h-32

## Usage Examples

### Inserting Peptide Data

```typescript
// Via Supabase client
const { data, error } = await supabase
  .from('peptide_data')
  .insert([{
    synthesis_id: 123,
    molecular_weight: 1234.56,
    molecular_formula: 'C₁₀H₁₅N₂O₃',
    sequence: 'MKCNFLK...',
    purity: 0.985,  // 98.5%
    pdb_ids: ['1ABC', '2XYZ'],
    experimental_methods: ['X-ray Crystallography', 'NMR'],
    suppliers: [
      {
        name: 'Sigma-Aldrich',
        url: 'https://...',
        price: '$99.99',
        availability: 'In Stock'
      }
    ]
  }]);
```

### Fetching with Synthesis

```typescript
// Already handled in the updated fetchSynthesis()
const { data: synthesis } = await supabase
  .from('syntheses')
  .select('*, peptide_data(*)')  // Alternative: use * wildcard
  .eq('topic', 'Insulin');
```

## Known Limitations & Future Enhancements

### Current Limitations
- 3D coordinates displayed as availability indicator only
- Supplier comparison view not available
- No peptide data editor UI (data must be inserted via backend)

### Potential Enhancements
1. **3D Viewer**: Integrate Mol* or PV viewer for interactive 3D structures
2. **Supplier Comparison**: Side-by-side price/availability comparison
3. **Admin Panel**: Form-based peptide data entry/editing
4. **Export Formats**: Add support for PDB file format export
5. **Search**: Filter syntheses by peptide properties (MW range, purity %, etc.)

## Troubleshooting

### Peptide data not appearing?

**Problem**: Sections not rendering despite data in DB
**Solution**: 
- Check browser console for fetch errors
- Verify `synthesis_id` is correctly set in peptide_data table
- Ensure synthesis ID matches in both tables

### Dark mode looks wrong?

**Problem**: Gradients too dark or not visible
**Solution**:
- Check Tailwind dark mode is enabled in layout
- Verify `dark:` classes are properly applied
- Test with explicit toggle on page

### Export not including peptide data?

**Problem**: PDF/JSON/CSV missing peptide sections
**Solution**:
- Verify peptide_data is loaded (check network tab)
- Check console for export errors
- Try with fresh browser cache

## Support

For issues or questions:
1. Check the Database Schema Requirements section
2. Review the console logs for error messages
3. Verify all type definitions match your data
4. Test with a minimal peptide_data record first

---

**Last Updated**: March 26, 2025
**Status**: Ready for Production
**Backward Compatibility**: ✅ Full
