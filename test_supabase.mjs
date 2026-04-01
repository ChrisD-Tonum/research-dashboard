import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

console.log('🔍 Testing Supabase Connection...\n');
console.log(`URL: ${supabaseUrl}`);
console.log(`Key: ${supabaseAnonKey.substring(0, 20)}...\n`);

const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Test tables that dashboard queries
const tablesToCheck = [
  'articles',
  'web_pages',
  'syntheses',
  'synthesis_peptides_detailed',
  'peptide_raw_data',
  'peptide_crawl_stats',
  'peptide_extracted_with_source',
  'peptides',
  'peptide_enrichments',
  'peptide_articles'
];

console.log('📋 Checking table existence and record counts:\n');

for (const table of tablesToCheck) {
  try {
    const { data, error, count } = await supabase
      .from(table)
      .select('*', { count: 'exact', head: true });
    
    if (error) {
      console.log(`❌ ${table.padEnd(35)} - ERROR: ${error.message}`);
    } else {
      console.log(`✅ ${table.padEnd(35)} - ${count} records`);
    }
  } catch (e) {
    console.log(`❌ ${table.padEnd(35)} - Exception: ${e.message}`);
  }
}

console.log('\n✨ Test complete!');
