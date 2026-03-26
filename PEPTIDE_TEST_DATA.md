# Peptide Data Test Cases

Use this file to add test peptide data to your local Supabase instance for development and testing.

## Prerequisites

1. You must have a synthesis record first
   ```sql
   -- Create a test synthesis if needed
   INSERT INTO syntheses (topic, format, outline, full_text, generated_at)
   VALUES (
     'Insulin Peptide',
     'structured',
     '{"overview": "Test synthesis"}',
     'Test full text content',
     NOW()
   ) RETURNING id;
   -- Note the returned ID
   ```

## Test Case 1: Complete Peptide Data

Complete record with all fields populated.

```sql
INSERT INTO peptide_data (
  synthesis_id,
  molecular_weight,
  molecular_formula,
  sequence,
  purity,
  pdb_ids,
  experimental_methods,
  suppliers
) VALUES (
  1,  -- Change to your synthesis_id
  5805.5000,
  'C₂₅₁H₃₇₇N₆₅O₇₅S₆',
  'GIVEQCCTSICSLYQLENYCN',  -- Simplified insulin sequence
  0.9850,
  ARRAY['1MSO', '1A7F', '4AIY'],
  ARRAY['X-ray Crystallography', 'NMR Spectroscopy', 'Mass Spectrometry'],
  '[
    {
      "name": "Sigma-Aldrich",
      "url": "https://www.sigmaaldrich.com/catalog/product/sigma/i2643",
      "price": "$149.99 per 10mg",
      "availability": "In Stock"
    },
    {
      "name": "Thermo Fisher Scientific",
      "url": "https://www.thermofisher.com/protein/product/PI25915",
      "price": "$189.99 per 5mg",
      "availability": "In Stock"
    },
    {
      "name": "MP Biomedicals",
      "url": "https://www.mpbio.com/product/insulin-human-recombinant",
      "price": "$129.99 per 10mg",
      "availability": "Pre-Order"
    }
  ]'::jsonb
);
```

## Test Case 2: Minimal Peptide Data

Only required fields, testing graceful handling of nulls.

```sql
INSERT INTO peptide_data (
  synthesis_id,
  molecular_weight,
  purity
) VALUES (
  2,  -- Change to your synthesis_id
  1234.5678,
  0.9500
);
```

## Test Case 3: No Suppliers (Structure Only)

Testing structural data without supplier information.

```sql
INSERT INTO peptide_data (
  synthesis_id,
  molecular_weight,
  molecular_formula,
  sequence,
  purity,
  pdb_ids,
  experimental_methods,
  coordinates_3d
) VALUES (
  3,  -- Change to your synthesis_id
  8567.1234,
  'C₃₈₆H₅₈₂N₁₀₂O₁₁₂S₂',
  'MTAFSQLTDVF',  -- GFP tag sequence
  0.9750,
  ARRAY['1GFP', '2WAJ'],
  ARRAY['Cryo-EM', 'X-ray Crystallography'],
  '{"resolution": "1.8 Angstroms", "method": "X-ray", "quality": "high"}'::jsonb
);
```

## Test Case 4: Peptide with Many Suppliers

Testing supplier comparison feature.

```sql
INSERT INTO peptide_data (
  synthesis_id,
  molecular_weight,
  molecular_formula,
  sequence,
  purity,
  suppliers
) VALUES (
  4,  -- Change to your synthesis_id
  2341.5600,
  'C₁₀₈H₁₆₁N₂₉O₃₁',
  'LRFLVYQYLLDMLSRED',
  0.9800,
  '[
    {
      "name": "Sigma-Aldrich",
      "url": "https://www.sigmaaldrich.com/",
      "price": "$199.99 per 1mg",
      "availability": "In Stock"
    },
    {
      "name": "Bachem",
      "url": "https://www.bachem.com/",
      "price": "$159.99 per 1mg",
      "availability": "In Stock"
    },
    {
      "name": "Peptide 2.0",
      "url": "https://www.peptide2.com/",
      "price": "$99.99 per 1mg",
      "availability": "In Stock"
    },
    {
      "name": "GL Biochem",
      "url": "https://www.glbiochem.com/",
      "price": "$119.99 per 2mg",
      "availability": "7-10 days"
    },
    {
      "name": "China Peptides",
      "url": "https://www.chinapeptides.com/",
      "price": "$49.99 per 1mg",
      "availability": "Pre-Order (3-4 weeks)"
    }
  ]'::jsonb
);
```

## Test Case 5: No Peptide Data (Backward Compatibility)

Testing that syntheses without peptide data still work.

```sql
-- Simply don't insert any peptide_data row for this synthesis
-- The synthesis will load normally without peptide sections
INSERT INTO syntheses (topic, format, outline, full_text, generated_at)
VALUES (
  'Test Topic Without Peptide',
  'structured',
  '{"overview": "This synthesis has no peptide data"}',
  'Full text content',
  NOW()
) RETURNING id;
```

## Testing Checklist

After inserting test data, verify:

### ✅ UI Display
- [ ] All three peptide sections appear for Test Case 1
- [ ] Sections gracefully hide when data is missing (Test Case 2, 3)
- [ ] Gradient backgrounds display correctly
- [ ] Icons are properly rendered (🧬 🔬 🛒)
- [ ] Dark mode styling looks good

### ✅ Collapsible Behavior
- [ ] Sections expand/collapse on click
- [ ] Icons rotate when expanding/collapsing
- [ ] Content is properly formatted inside sections

### ✅ Chemical Properties Section
- [ ] Molecular weight displays with "g/mol" unit
- [ ] Molecular formula displays in code blocks
- [ ] Sequence is scrollable and uses monospace font
- [ ] Purity shows percentage as green badge

### ✅ Structural Data Section
- [ ] PDB IDs appear as clickable links to RCSB
- [ ] Link targets are correct: `https://www.rcsb.org/structure/{ID}`
- [ ] External link icon (↗) appears next to PDB IDs
- [ ] Experimental methods appear as bulleted list
- [ ] 3D coordinates show availability indicator

### ✅ Suppliers Section
- [ ] Each supplier has its own card
- [ ] Supplier names are clickable links (when URL provided)
- [ ] Price displays on the same line as name
- [ ] Availability badge colors correctly:
  - Green for "In Stock"
  - Yellow for other statuses
- [ ] Cards have proper spacing and border

### ✅ Export Functions
- [ ] PDF export includes peptide sections
- [ ] PDF formatting is clean and readable
- [ ] JSON export includes `peptide_data` object
- [ ] CSV export has peptide data in proper columns

### ✅ Dark Mode
- [ ] Gradient backgrounds are visible in dark mode
- [ ] Text has sufficient contrast
- [ ] Badge colors are readable
- [ ] Code blocks have proper background

### ✅ Backward Compatibility
- [ ] Test Case 5 (no peptide data) loads and displays normally
- [ ] No errors in browser console
- [ ] Peptide sections don't appear for Test Case 5

### ✅ Mobile Responsive
- [ ] Sections stack properly on mobile
- [ ] Sequences are scrollable horizontally
- [ ] Supplier cards display correctly on small screens
- [ ] Badges wrap appropriately

## SQL Queries for Testing

### View all peptide data for a topic
```sql
SELECT 
  p.*,
  s.topic,
  s.generated_at
FROM peptide_data p
JOIN syntheses s ON p.synthesis_id = s.id
WHERE s.topic ILIKE '%insulin%'
ORDER BY s.generated_at DESC;
```

### Find syntheses without peptide data
```sql
SELECT s.id, s.topic, s.generated_at
FROM syntheses s
LEFT JOIN peptide_data p ON s.id = p.synthesis_id
WHERE p.id IS NULL
LIMIT 10;
```

### Count peptide data records
```sql
SELECT COUNT(*) as total_peptides
FROM peptide_data;
```

### Check data type of suppliers field
```sql
SELECT 
  id,
  synthesis_id,
  jsonb_typeof(suppliers) as suppliers_type,
  jsonb_array_length(suppliers) as num_suppliers
FROM peptide_data
WHERE suppliers IS NOT NULL;
```

## Common Test Scenarios

### Scenario A: Developer Testing
1. Use Test Case 1 for full feature testing
2. Use Test Case 2 for null-safety testing
3. Verify all export formats work

### Scenario B: QA Testing
1. Test all five test cases in sequence
2. Verify collapsible behavior
3. Test dark mode toggle
4. Test on multiple devices/browsers
5. Check mobile responsiveness

### Scenario C: Performance Testing
1. Insert 100+ peptide records
2. Load synthesis page with large datasets
3. Verify page load time
4. Check for N+1 query problems

## Cleanup

To remove test data:

```sql
-- Delete specific peptide data
DELETE FROM peptide_data WHERE synthesis_id IN (1, 2, 3, 4);

-- Delete test syntheses
DELETE FROM syntheses WHERE topic LIKE '%Test%';

-- Or reset everything (careful!)
-- DELETE FROM peptide_data;
-- DELETE FROM syntheses;
```

## Troubleshooting Test Data

### Error: "Synthesis not found"
- Check that synthesis_id exists in syntheses table
- Verify foreign key is properly set

### Peptide section doesn't appear
- Verify data was inserted (check with SELECT query)
- Check browser console for fetch errors
- Reload page with Cmd+Shift+R (cache clear)

### Data looks wrong in UI
- Verify JSONB format is correct (use SQL queries above)
- Check for special characters that need escaping
- Test with simpler data first (Test Case 2)

### Export fails
- Check console for specific errors
- Verify all required fields are present
- Try exporting Test Case 1 first

---

**Note**: Remember to use your actual `synthesis_id` values when running these queries!
