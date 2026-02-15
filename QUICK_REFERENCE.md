# Quick Reference Guide

## What Changed?

### 1. Chef's Dashboard Layout
**BEFORE:**
```
┌─────────────────────────────────────┐
│  🔥 New Orders (3 columns)          │
├─────────────────────────────────────┤
│  ➕ Extras (3 columns)              │
├─────────────────────────────────────┤
│  ✅ Closed Sessions (3 columns)     │
└─────────────────────────────────────┘
```

**AFTER:**
```
┌─────────────────────────────────────┐
│  🍽️ Active Tables (5-column grid)   │
│  ┌──────┐ ┌──────┐ ┌──────┐         │
│  │ TBL1 │ │ TBL2 │ │ TBL3 │ ...     │
│  │ [🔴1]│ │      │ │[🔴2] │         │
│  └──────┘ └──────┘ └──────┘         │
├─────────────────────────────────────┤
│  ✅ Closed Sessions (3 columns)     │
└─────────────────────────────────────┘
```

### 2. Notification Badges
- **Red circular badge** with count appears when extras added
- Automatically clears when chef opens table details
- Shows `extrasBatches.length`

### 3. Bill Approval Process
**BEFORE:** Customer → Click Button → Bill Generated → Session Closed
**AFTER:** Customer → Request Bill → Chef Approves → Customer Downloads

---

## User Journeys

### 🍽️ Chef's Journey

1. **Open Dashboard**
   - See grid of all active tables
   - Tables with extras show red badges

2. **Click a Table**
   - Modal opens showing all details
   - Red badge automatically clears
   - See: Items, Extras, Total, Status

3. **Four Actions Available:**
   - 📊 Change Status (Waiting → Preparing → Served)
   - 💳 Accept Bill (if customer requested)
   - 🔒 Close Session (active tables)
   - 📄 View Bill (closed sessions)

### 👥 Customer's Journey

1. **Start Order**
   - Enter name & people count
   - Add items
   - Click "Start Order"

2. **Can Add More Anytime**
   - Click items again
   - "Add Extra Order" button
   - Chef gets notification badge

3. **Ready to Pay?**
   - Click "💳 End Session & Request Bill"
   - Wait for chef approval
   - See "Bill Pending Approval" message

4. **Download Bill**
   - Chef approves
   - Page updates automatically (or refresh)
   - Click "📄 Download PDF" or "🖨️ Print"

---

## Key Features Summary

| Feature | Location | Trigger | Result |
|---------|----------|---------|--------|
| **Red Badge** | Table Card | Customer adds extras | Shows count of new extras |
| **Badge Clear** | Table Card | Chef opens modal | Auto-cleared when viewing |
| **Bill Request** | Cart Section | "End Session" button | Status changes to "bill-requested" |
| **Bill Pending** | Bill Page | Chef hasn't approved | Shows waiting message |
| **Bill Download** | Bill Page | Chef clicks approve | Bill becomes downloadable |
| **Purple Border** | Table Card | Bill requested | Visual indicator for chef |
| **Bill Accepted** | Modal Button | Chef action | Enables customer download |

---

## Firestore Document Structure

### Before and After Comparison

**BEFORE:**
```json
{
  "sessionStatus": "active | extrasReady | closed",
  "billStatus": "generated | null",
  "status": "waiting | preparing | served | extrasReady"
}
```

**AFTER:**
```json
{
  "sessionStatus": "active | bill-requested | closed",
  "billStatus": "pending | accepted | downloaded | null",
  "hasNewExtras": true | false,
  "billRequestedAt": Timestamp,
  "status": "waiting | preparing | served | extrasReady"
}
```

---

## Testing Quick Checklist

### Basic Flow
- [ ] Customer orders → appears in chef grid ✓
- [ ] Customer adds extras → badge shows ✓
- [ ] Chef clicks table → modal opens ✓
- [ ] Badge disappears after modal open ✓
- [ ] Chef sees all items in modal ✓
- [ ] Customer requests bill → "Bill Requested" label ✓
- [ ] Chef clicks "Accept" → status updates ✓
- [ ] Customer can download bill ✓
- [ ] Bill shows all items + extras ✓

### Edge Cases
- [ ] Multiple tables simultaneously
- [ ] Multiple extras from same table
- [ ] Fast repeated actions
- [ ] Mobile responsiveness
- [ ] Network latency (slow updates)

---

## Code Locations

### Types
- **File:** `types.ts`
- **Changes:** Order interface, new fields

### Chef Dashboard
- **File:** `app/chef/page.tsx`
- **Lines:** ~78-750
- **Key Functions:** `acceptAndGenerateBill()`, `acknowledgeExtras()`

### Customer Ordering
- **File:** `app/page.tsx`
- **Lines:** ~360-410 (bill workflow)
- **Key Function:** `generateBill()` (now requests, doesn't generate)

### Bill Display
- **File:** `app/bill/[orderId]/page.tsx`
- **Changes:** Pending state, extras display

---

## Color Guide

### Chef Dashboard
- 🔴 **Red Badge**: Unacknowledged extras
- 🟣 **Purple Border**: Bill requested state
- 🔴 **Yellow Status**: Waiting
- 🟠 **Orange Status**: Preparing
- 🟢 **Green Status**: Served
- ⚪ **White Border**: Active table

### Bill Page
- 🔵 **Blue Background**: Pending state
- ⚪ **White Background**: Approved state
- 🟡 **Yellow Rows**: Extra batches

---

## Common Questions

**Q: Where does the PDF get generated?**
A: Only when chef clicks "Accept & Generate Bill" (happens server-side), or when customer downloads from bill page.

**Q: Can customer cancel after requesting bill?**
A: Not in current implementation. Would need additional "Cancel Request" button.

**Q: What happens if chef closes modal without acting?**
A: Table stays in active/bill-requested state. Badge is cleared but session continues.

**Q: Can customer see bill before chef approves?**
A: No. Bill page shows "Pending Approval" message until billStatus is "accepted".

**Q: Are extras always charged?**
A: Yes. They're included in sessionTotal automatically.

**Q: What if customer adds items after requesting bill?**
A: Can't add - cart buttons disabled when sessionClosed. Must close and reopen session.

---

## Performance Notes

- ✅ Responsive grid (no lag)
- ✅ Real-time updates (onSnapshot)
- ✅ Lazy-rendered modal (only when needed)
- ✅ Minimal re-renders (proper state management)
- ✅ PDF generation is client-side (fast)

---

## Next Steps / Future Work

1. **Live Refresh** on bill page (auto-poll)
2. **Sound Notifications** when extras arrive
3. **Multi-table Views** (filter by status)
4. **Analytics Dashboard** (sales, peak times)
5. **Payment Integration** (mark as paid)
6. **Waiter App** (take orders, notify kitchen)
7. **Customization** (allergies, spice level)

---

## Support

For detailed implementation info, see:
- `REFACTORING_SUMMARY.md` - Complete changes overview
- `IMPLEMENTATION_DETAILS.md` - Architecture & code details
- Source code comments in the relevant `.tsx` files

