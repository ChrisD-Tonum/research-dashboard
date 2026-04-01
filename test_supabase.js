const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://ffvozsgmyxxfkdpvnpxv.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZmdm96c2dteXh4ZmtkcHZucHh2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQzOTM0MzQsImV4cCI6MjA4OTk2OTQzNH0.prujtq18HN6tKFfGZXbpHphxqZ5VNeAS8XsUfUxrFgM';

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

async function checkTables() {
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
}

checkTables();
