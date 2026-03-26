-- Create peptide_data table for storing peptide-specific research data
-- Run this in your Supabase SQL editor

CREATE TABLE IF NOT EXISTS peptide_data (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  
  -- Foreign key to syntheses table
  synthesis_id BIGINT NOT NULL,
  
  -- Chemical properties
  molecular_weight DECIMAL(10, 4),           -- e.g., 1234.5678
  molecular_formula VARCHAR(255),             -- e.g., C₁₀H₁₅N₂O₃
  sequence TEXT,                              -- Amino acid sequence
  purity DECIMAL(5, 4),                      -- 0-1 range (0.985 = 98.5%)
  
  -- Structural data
  pdb_ids TEXT[],                            -- Array of PDB IDs ['1ABC', '2XYZ']
  coordinates_3d JSONB,                      -- 3D structure coordinates
  experimental_methods TEXT[],               -- Array of methods ['X-ray', 'NMR']
  
  -- Supplier information
  suppliers JSONB,                           -- Array of supplier objects
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Foreign key constraint
  CONSTRAINT fk_peptide_data_synthesis 
    FOREIGN KEY (synthesis_id) 
    REFERENCES syntheses(id) ON DELETE CASCADE
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_peptide_data_synthesis_id 
  ON peptide_data(synthesis_id);

-- Create index for molecular weight range queries
CREATE INDEX IF NOT EXISTS idx_peptide_data_molecular_weight 
  ON peptide_data(molecular_weight);

-- Create index for purity searches
CREATE INDEX IF NOT EXISTS idx_peptide_data_purity 
  ON peptide_data(purity);

-- Enable RLS if needed (adjust based on your Supabase auth setup)
ALTER TABLE peptide_data ENABLE ROW LEVEL SECURITY;

-- Example RLS policy: Allow read for all authenticated users
CREATE POLICY "Enable read access for authenticated users" 
  ON peptide_data FOR SELECT 
  USING (auth.role() = 'authenticated');

-- Example RLS policy: Allow insert/update for authenticated users with matching synthesis owner
-- (Adjust based on your syntheses table ownership model)
-- CREATE POLICY "Enable insert/update for authenticated users" 
--   ON peptide_data FOR INSERT, UPDATE 
--   WITH CHECK (auth.role() = 'authenticated');

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_peptide_data_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to call the timestamp update function
DROP TRIGGER IF EXISTS update_peptide_data_timestamp_trigger ON peptide_data;
CREATE TRIGGER update_peptide_data_timestamp_trigger
  BEFORE UPDATE ON peptide_data
  FOR EACH ROW
  EXECUTE FUNCTION update_peptide_data_timestamp();

-- Example data insertion
-- INSERT INTO peptide_data (
--   synthesis_id,
--   molecular_weight,
--   molecular_formula,
--   sequence,
--   purity,
--   pdb_ids,
--   experimental_methods,
--   suppliers
-- ) VALUES (
--   1,
--   1234.5678,
--   'C₁₀H₁₅N₂O₃',
--   'MKCNFLKPLQTALTKPFLQVLQEMVQKGQLK',
--   0.985,
--   ARRAY['1ABC', '2XYZ'],
--   ARRAY['X-ray Crystallography', 'NMR Spectroscopy'],
--   '[
--     {
--       "name": "Sigma-Aldrich",
--       "url": "https://www.sigmaaldrich.com/...",
--       "price": "$99.99 per 1mg",
--       "availability": "In Stock"
--     },
--     {
--       "name": "Thermo Fisher",
--       "url": "https://www.thermofisher.com/...",
--       "price": "$149.99 per 5mg",
--       "availability": "Pre-Order"
--     }
--   ]'::jsonb
-- );

-- Verify table creation
-- SELECT * FROM peptide_data LIMIT 1;
