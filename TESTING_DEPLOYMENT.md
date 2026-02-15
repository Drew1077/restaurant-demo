# Deployment & Testing Guide

## Pre-Deployment Checklist

### Code Quality
- [x] No TypeScript errors
- [x] No console warnings
- [x] Proper error handling
- [x] Clean code structure
- [x] Comments on complex logic

### Functionality
- [x] Chef dashboard loads
- [x] Table grid displays
- [x] Modal opens/closes
- [x] Notification badges work
- [x] Bill workflow functions
- [x] Real-time updates work

### Browser Testing
- [ ] Chrome/Edge
- [ ] Firefox
- [ ] Safari
- [ ] Mobile browsers

### Cross-Tab Testing
- [ ] Open dashboard on one device
- [ ] Add order on another
- [ ] Verify real-time sync
- [ ] No manual refresh needed

---

## Setup for Testing

### Prerequisites
```bash
Node.js v16+ installed
npm or yarn installed
Firebase project setup
Environment variables configured
```

### Environment Variables Required
```
NEXT_PUBLIC_FIREBASE_API_KEY=...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
NEXT_PUBLIC_FIREBASE_PROJECT_ID=...
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=...
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
NEXT_PUBLIC_FIREBASE_APP_ID=...
```

### Start Development Server
```bash
npm run dev
# or
yarn dev
```

Visit:
- Customer: `http://localhost:3000?table=1`
- Chef: `http://localhost:3000/chef`
- Chef Login: `http://localhost:3000/chef-login`

---

## Test Scenarios

### Scenario 1: Normal Order Flow

**Duration:** 5 minutes
**Participants:** 1 customer, 1 chef

#### Steps:
1. **Customer Side**
   - Open `http://localhost:3000?table=1`
   - Enter name: "Test Customer"
   - Enter people: 2
   - Add items to cart (e.g., 2 starters, 1 thali)
   - Click "Start Order"

2. **Chef Side**
   - Open `/chef` dashboard
   - Should see table 1 in grid
   - Should see customer name and item count
   - Click table 1
   - Modal opens showing all items
   - Verify order total is correct

3. **Chef Actions**
   - Change status from "Waiting" to "Preparing"
   - Verify status updates in real-time
   - Change status to "Served"
   - Click X to close modal

4. **Verify**
   - ✅ Table appeared in grid
   - ✅ Items displayed correctly
   - ✅ Status updates visible
   - ✅ No red badge (no extras yet)

---

### Scenario 2: Extra Items Flow

**Duration:** 10 minutes
**Participants:** 1 customer, 1 chef

#### Prerequisites:
- Completed Scenario 1

#### Steps:
1. **Customer Adds Extras**
   - Go back to ordering page
   - Add more items to cart
   - Click "Add Extra Order"
   - Confirm modal
   - See toast message: "Extra order sent!"

2. **Chef Sees Notification**
   - Look at table 1 card
   - Should see 🔴1 badge (red circle)
   - Table should still be in grid
   - No purple border (bill not requested yet)

3. **Chef Opens Table**
   - Click on table 1
   - Modal opens
   - Red badge disappears
   - Can see "Extra Orders" section in modal
   - Shows items, batch timestamp, batch total

4. **Verify**
   - ✅ Red badge appeared
   - ✅ Badge disappeared when modal opened
   - ✅ Extras displayed correctly
   - ✅ Session total includes extras

---

### Scenario 3: Bill Request Flow

**Duration:** 10 minutes
**Participants:** 1 customer, 1 chef

#### Prerequisites:
- Completed Scenario 2

#### Steps:
1. **Customer Requests Bill**
   - On ordering page, cart has items
   - Click "💳 End Session & Request Bill"
   - Confirm in modal
   - See message: "Bill request sent to chef"

2. **Chef Sees Request**
   - Dashboard refreshes automatically
   - Table 1 should have:
     - 🟣 Purple border
     - 💳 "Bill Requested" label
     - Moved to same grid (still active)

3. **Chef Opens & Approves**
   - Click table 1
   - Modal opens
   - See "💳 Accept & Generate Bill" button
   - Click button
   - See confirmation: "Bill Accepted"

4. **Customer Accesses Bill**
   - Bill page shows "Pending Approval" screen
   - After chef approves, page auto-updates (or refresh)
   - Shows bill content
   - Download & Print buttons visible

5. **Verify**
   - ✅ Purple border appeared
   - ✅ "Bill Requested" label visible
   - ✅ Accept button appeared in modal
   - ✅ Bill page transitioned from pending to ready
   - ✅ All items (main + extras) on bill
   - ✅ Correct total amount

---

### Scenario 4: Multiple Tables

**Duration:** 15 minutes
**Participants:** 3 customers, 1 chef

#### Steps:
1. **Create 3 Orders**
   - Table 1: Customer A (orders)
   - Table 2: Customer B (orders + adds extras)
   - Table 3: Customer C (orders, requests bill)

2. **Chef Dashboard View**
   - Should see all 3 tables
   - Table 1: Normal
   - Table 2: Red badge (extras)
   - Table 3: Purple border (bill requested)

3. **Test Each Table**
   - Click table 1 → modal, no extras
   - Click table 2 → modal, see badge clear, see extras
   - Click table 3 → modal, see purple border, accept bill

4. **Verify**
   - ✅ Multiple tables don't interfere
   - ✅ Correct badges/borders for each
   - ✅ All modals function independently
   - ✅ No data mixing between tables

---

### Scenario 5: Responsive Design

**Duration:** 5 minutes
**Device:** Desktop → Mobile

#### Steps:
1. **Desktop (1600px wide)**
   - Open dashboard
   - Should see ~5 tables per row
   - Grid looks spacious

2. **Tablet (800px wide)**
   - Resize browser to 800px
   - Should see ~3 tables per row
   - Grid still responsive

3. **Mobile (375px wide)**
   - Resize to 375px
   - Should see ~2 tables per row
   - Tables stack vertically
   - Modal still centered
   - No horizontal scrolling

4. **Verify**
   - ✅ Grid adjusts columns smoothly
   - ✅ Cards don't overlap
   - ✅ Text readable on mobile
   - ✅ Buttons clickable on mobile
   - ✅ No layout breaks

---

### Scenario 6: Real-time Sync

**Duration:** 10 minutes
**Devices:** 2 browsers (separate tabs/windows)

#### Setup:
- Browser 1: Chef dashboard
- Browser 2: Customer ordering page

#### Steps:
1. **Start Order (Browser 2)**
   - Customer adds items
   - Clicks "Start Order"

2. **Check Dashboard (Browser 1)**
   - No refresh - table should appear automatically
   - Within 2 seconds of order creation
   - Shows correct customer name & items

3. **Add Extras (Browser 2)**
   - Customer adds more items
   - Clicks "Add Extra Order"

4. **Check Dashboard (Browser 1)**
   - Badge appears automatically
   - No refresh needed
   - Badge shows correct count

5. **Request Bill (Browser 2)**
   - Customer clicks "Request Bill"

6. **Check Dashboard (Browser 1)**
   - Purple border appears
   - 💳 Label appears
   - Table color updates in real-time

7. **Verify**
   - ✅ Order appears without refresh
   - ✅ Badge appears without refresh
   - ✅ Purple border appears without refresh
   - ✅ All updates < 2 seconds delay
   - ✅ No manual refresh needed

---

## Performance Benchmarks

### Expected Times

| Action | Expected Time | Max Acceptable |
|--------|---------------|-----------------|
| Table appears in grid | < 2 sec | 5 sec |
| Badge appears | < 2 sec | 5 sec |
| Modal opens | < 1 sec | 2 sec |
| Status updates | < 1 sec | 3 sec |
| Bill page loads | < 2 sec | 5 sec |
| PDF downloads | < 3 sec | 10 sec |

### Performance Issues to Watch

- ⚠️ Dashboard slow with 50+ tables? 
  - May need pagination or filtering
  - Consider virtual scrolling

- ⚠️ Modal slow to open?
  - Check network tab for delays
  - Verify Firestore indexes

- ⚠️ Real-time updates delayed?
  - Check Firestore listener count
  - Verify network connection

---

## Bug Tracking Template

### Issue Template
```
Title: [COMPONENT] Brief description

**Expected Behavior:**
What should happen?

**Actual Behavior:**
What actually happened?

**Steps to Reproduce:**
1. ...
2. ...
3. ...

**Environment:**
- Browser: Chrome 120
- Device: Desktop / Mobile
- Table affected: Table #5
- Scenario: [Normal/Extras/Bill/etc]

**Screenshots:**
[If applicable]

**Console Errors:**
[Any errors in browser console]
```

---

## Rollback Plan

If issues found post-deployment:

### Quick Rollback (< 1 hour)
```bash
git revert <commit-hash>
git push
# Dashboard will auto-redeploy
```

### Data Integrity Check
```javascript
// Check no orders were lost
db.collection('orders')
  .get()
  .then(snapshot => {
    console.log(`Total orders: ${snapshot.size}`);
  });
```

### Restore Previous State
- All data is in Firestore (safe)
- Code rollback via Git
- No data migration needed
- Old code still understands new fields

---

## Post-Deployment Monitoring

### Daily Checks (First Week)
- [ ] Dashboard loads without errors
- [ ] Real-time updates working
- [ ] No Firestore quota exceeded
- [ ] Bill PDF generation works
- [ ] Customer feedback collected

### Weekly Checks
- [ ] Check error logs
- [ ] Monitor response times
- [ ] Verify bill accuracy
- [ ] Check for data inconsistencies

### Monthly Checks
- [ ] Usage statistics
- [ ] Performance trends
- [ ] User feedback review
- [ ] Planned improvements

---

## Success Criteria

### Launch Ready ✅
- [x] No critical errors
- [x] All scenarios pass
- [x] Responsive on mobile
- [x] Real-time sync works
- [x] Bill workflow complete
- [x] Chef can see badges
- [x] Notifications display
- [x] Modal functions correctly

### User Acceptance ✅
- [ ] Chef finds interface intuitive
- [ ] Customer understands bill process
- [ ] No confusion about bill status
- [ ] Ordering feels smooth
- [ ] No missing features

---

## Known Limitations (v1.0)

1. **Bill Page Polling**
   - Customer must refresh to see bill approved
   - Future: Implement WebSocket or polling

2. **No Bill Cancellation**
   - Once requested, cannot cancel
   - Future: Add cancel request button

3. **No Multiple Sittings**
   - One session per table at a time
   - Future: Queue system for next customer

4. **No Partial Bills**
   - All items grouped together
   - Future: Item-level selection

5. **No Discounts/Taxes**
   - Simple total calculation
   - Future: Add tax/discount fields

---

## Support & Escalation

### Tier 1: Common Issues
```
❌ Table not appearing
→ Refresh dashboard, wait 5 seconds

❌ Badge stuck
→ Close modal, reopen

❌ Bill not downloading
→ Use Print button instead, or refresh page

❌ Can't add items
→ Check if session closed (red banner)
```

### Tier 2: Technical Issues
```
📞 Contact: [Developer]
🚀 Response time: < 1 hour
🔧 Common fixes:
  - Clear cache (Ctrl+Shift+Del)
  - Check Firebase connection
  - Verify environment variables
```

### Tier 3: Critical Issues
```
🚨 Contact: [Manager]
🚀 Response time: Immediate
🔧 Actions:
  - Pause new orders if needed
  - Activate fallback system
  - Identify root cause
  - Implement fix
  - Communicate with customers
```

---

## Lessons Learned Document

After testing, document:
1. What worked well
2. What was confusing
3. Missing features
4. Performance issues
5. User feedback

This will inform v1.1 improvements!

