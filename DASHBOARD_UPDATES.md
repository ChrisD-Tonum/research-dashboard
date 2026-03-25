# Dashboard Updates for Dual Crawlers

## What Changed

The dashboard has been updated to support **both articles AND web pages** from the new crawler system.

### Before
- Only displayed `articles` table
- Couldn't show reference pages, landing pages, documentation

### After ✅
- Displays **both** `articles` and `web_pages` tables
- Content type filter (All / Articles / Pages)
- Shows page type badges (landing, reference, documentation, data)
- Displays structured data when available (tables, sections, metadata)
- Enhanced export includes both data types

---

## New Features

### 1. Content Type Filter
Three buttons to filter what you see:
- **All** — Both articles and pages
- **Articles** — Only research articles
- **Pages** — Only reference/landing/documentation pages

Shows live count: `📄 Articles (15)` `🌐 Pages (8)`

### 2. Page Type Badges
Each page shows its type:
- `🔷 Page: landing` — Home/intro pages
- `🔷 Page: reference` — Reference material
- `🔷 Page: documentation` — Official docs
- `🔷 Page: data` — Data portals

### 3. Structured Data Display
If a page was crawled with a site-specific extractor, you'll see:
```
Structured Data: tables, sections, metadata
```

Click to expand and see what was extracted.

### 4. Combined Search
- Filters apply to **both** articles and pages
- Source filter works across both types
- Title search finds content in both tables
- Sorting applies to combined results

### 5. Smart Export
All three export formats (CSV, JSON, PDF) now include:
- Articles count
- Pages count
- Content type of each item
- Structured data (in JSON export)

---

## Files Modified

| File | Change |
|------|--------|
| `app/research/page.tsx` | Redesigned to support articles + web_pages |
| `app/research/page-original.tsx` | Backup of original version |

---

## Updated Interfaces

### Article
```typescript
interface Article {
  id: number;
  topic: string;
  source_name: string;
  title: string;
  url: string;
  content: string;
  crawl_date: string;
  type: 'article';
}
```

### WebPage (NEW)
```typescript
interface WebPage {
  id: number;
  topic: string;
  page_type: 'landing' | 'reference' | 'documentation' | 'data';
  source_name: string;
  url: string;
  title: string;
  content: string;
  structured_data: Record<string, any> | null;
  crawl_date: string;
  type: 'page';
}
```

---

## How to Use

### 1. Run the Crawlers
```bash
# Crawl reference pages
cd /Users/mr.agent2/.openclaw/workspace/skills/web-research
node scripts/crawl-pages.js --topic "BPC-157"

# Crawl articles
node scripts/crawl.js --topic "BPC-157"
```

### 2. Visit Dashboard
```bash
cd /Users/mr.agent2/Projects/research-dashboard
npm run dev
# Open http://localhost:3000/research
```

### 3. Search for Topic
- Enter "BPC-157" in the search box
- You'll see:
  - Landing pages from each source
  - Reference documentation pages
  - Research articles

### 4. Filter by Type
- Click "📋 All" to see everything
- Click "📄 Articles (N)" to see just articles
- Click "🌐 Pages (N)" to see just pages

### 5. View Structured Data
- If a page shows "Structured Data: tables, sections..."
- That's data extracted by the site-specific extractor

### 6. Export
- **CSV** — All items in spreadsheet format
- **JSON** — Structured data with metadata
- **PDF** — Professional formatted document

---

## Database Queries Used

The dashboard now queries:

**For Articles:**
```sql
SELECT * FROM articles WHERE topic = ? [AND filters...]
```

**For Web Pages:**
```sql
SELECT * FROM web_pages WHERE topic = ? [AND filters...]
```

**Combined:**
```sql
(SELECT * FROM articles WHERE topic = ?)
UNION ALL
(SELECT * FROM web_pages WHERE topic = ?)
ORDER BY crawl_date DESC
```

---

## Component Structure

```
ResearchPage (page.tsx)
├── Header
├── Topic Input + Search History
├── Navigation (Synthesis link)
├── Stats Dashboard (articles only)
├── Content Type Filter (NEW)
├── Source + Keyword Filters (now applies to both)
├── Sort Options (now applies to both)
├── Export Buttons (enhanced for both)
└── Content List
    ├── Articles (with source, date, copy URL)
    └── Pages (with type, source, date, copy URL, structured data preview)
```

---

## What Gets Displayed

For each item:
- ✅ Title
- ✅ Content preview (first 200 chars)
- ✅ Source name (PubMed, Mayo, Wikipedia, etc.)
- ✅ Crawl date
- ✅ Type badge (Article vs Page type)
- ✅ View button (opens in new tab)
- ✅ Copy URL button
- 🆕 Structured data summary (for pages only)

---

## Performance Notes

- Combined query load should be minimal (~10-20ms for typical topics)
- Filtering/sorting applied client-side after load
- Responsive design works on mobile, tablet, desktop
- Dark mode fully supported

---

## Testing Checklist

- [ ] Run crawl-pages.js and crawl.js for test topic
- [ ] Load /research page
- [ ] Search for topic
- [ ] See both articles and pages listed
- [ ] Toggle content type filter
- [ ] Filter by source (should show articles + pages from that source)
- [ ] Search by keyword
- [ ] Sort by date/source
- [ ] Export to CSV (should include both types)
- [ ] Export to JSON (should show structured data)
- [ ] View structured data badges on pages
- [ ] Click View button (should open in new tab)
- [ ] Copy URL (should copy to clipboard)

---

## Rollback

If you need to revert to articles-only:
```bash
cp app/research/page-original.tsx app/research/page.tsx
npm run build
```

---

## Future Enhancements

- [ ] Advanced filter by page_type
- [ ] Toggle between table and card views
- [ ] Detailed structured data viewer (expand tables/sections)
- [ ] Side-by-side article + page comparison
- [ ] Bookmark/star favorite items
- [ ] Synthesis generation from both types
