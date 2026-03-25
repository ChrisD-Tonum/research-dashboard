# UI/UX Fixes Applied to Research Dashboard

## Summary
Fixed 2 critical UI/UX issues in `/app/research/page.tsx`:

---

## Fix 1: Count Display Bug ✅

**Problem:**
- Tab counts were changing when switching between "All", "Articles", and "Pages" tabs
- Example: "All" tab showed 38 items, but clicking "Articles" tab changed "All" to 16
- Counts were being filtered by the active tab instead of showing true totals

**Root Cause:**
- Count calculation used the filtered `content` array which was already filtered by `contentTypeFilter`
- This meant switching tabs caused recalculation of what "total" meant

**Solution:**
- Added separate variables: `totalArticles` and `totalPages`
- These calculate counts from the full `content` array BEFORE tab filtering
- Tab display now uses these constant totals instead of filtered counts
- Only the displayed content changes when switching tabs, not the count labels

**Changes:**
```tsx
// NEW: Calculate total counts (not affected by active tab)
const totalArticles = content.filter(c => c.type === 'article').length;
const totalPages = content.filter(c => c.type === 'page').length;

// Tab display uses totalArticles and totalPages
const displayCount = type === 'all' 
  ? (totalArticles + totalPages) 
  : (type === 'articles' 
      ? totalArticles 
      : totalPages);
```

**Expected Behavior:**
- ✅ "All" tab always shows total count (articles + pages)
- ✅ "Articles" tab always shows article count
- ✅ "Pages" tab always shows page count
- ✅ Counts only change when source/keyword filters are applied, NOT when switching tabs

---

## Fix 2: Source Filter Dropdown Activation ✅

**Problem:**
- Dropdown used hover state (CSS `group-hover:block`)
- When cursor moved away from the filter field, dropdown disappeared
- User couldn't click filter options because dropdown closed while moving the mouse

**Root Cause:**
- Hover-based activation is unreliable for dropdown menus with click targets
- Need state-based toggle activation instead

**Solution:**
- Added `dropdownOpen` state to track dropdown visibility
- Changed button to `onClick={() => setDropdownOpen(!dropdownOpen)}` toggle
- Removed hover CSS, replaced with conditional rendering `{dropdownOpen && <div>...`
- Added click-outside detection via `useEffect` with document listener
- Each dropdown option now explicitly calls `setDropdownOpen(false)` after selection
- Added visual feedback: chevron rotates 180° when dropdown opens

**Changes:**
```tsx
// NEW: State for dropdown visibility
const [dropdownOpen, setDropdownOpen] = useState(false);

// NEW: Click-outside detection
useEffect(() => {
  function handleClickOutside(event: MouseEvent) {
    const sourceFilterDiv = document.getElementById('source-filter-dropdown');
    if (sourceFilterDiv && !sourceFilterDiv.contains(event.target as Node)) {
      setDropdownOpen(false);
    }
  }
  if (dropdownOpen) {
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }
}, [dropdownOpen]);

// CHANGED: Button to toggle state instead of using hover
<button onClick={() => setDropdownOpen(!dropdownOpen)}>

// CHANGED: Dropdown now conditionally rendered
{dropdownOpen && <div>...</div>}

// CHANGED: Options close dropdown after selection
onClick={() => {
  setFilters({ ...filters, source });
  setDropdownOpen(false);
}}
```

**Expected Behavior:**
- ✅ Click filter button → dropdown opens
- ✅ Click a filter option → selection applied and dropdown closes
- ✅ Click outside dropdown → dropdown closes
- ✅ Works like a standard dropdown menu
- ✅ Chevron icon rotates to indicate open/closed state

---

## Files Modified
- `/app/research/page.tsx` (lines: 52, 71-87, 255-257, 313-314, 337-377)

## Testing Checklist
- [ ] Load research dashboard with data
- [ ] Verify tab counts remain constant when switching between tabs
- [ ] Verify tab counts change only with source/keyword filters
- [ ] Click source filter button - dropdown should open
- [ ] Click a source filter option - should apply filter and close dropdown
- [ ] Click source filter button again - dropdown should toggle
- [ ] Click outside dropdown - dropdown should close
- [ ] Test with dark mode on/off
- [ ] Test on mobile (touch) and desktop (mouse)

---

Generated: 2026-03-25 13:34 PDT
