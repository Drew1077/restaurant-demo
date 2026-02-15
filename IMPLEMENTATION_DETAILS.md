# Implementation Details & Code Architecture

## 1. Chef Dashboard Architecture

### Component Structure
```
ChefDashboard (Main Component)
├── State Management
│   ├── allOrders: Order[]
│   ├── selectedTableOrder: Order | null (modal state)
│   ├── updatingOrder: string | null (loading state)
│   └── ... (menu editor states)
│
├── Real-time Data Fetching
│   ├── Auth check (useAuthStateChanged)
│   ├── Orders listener (onSnapshot)
│   └── Menu items listener (onSnapshot)
│
└── UI Sections
    ├── Header (title, menu editor toggle, logout)
    ├── Menu Editor (if showMenuEditor)
    ├── Active Tables Grid
    │   └── Table Cards with badges
    ├── Table Detail Modal (if selectedTableOrder)
    └── Closed Sessions List
```

### Key Methods

#### `activeTables` Filter
```typescript
const activeTables = allOrders.filter(
  (order) => order.sessionStatus === "active" || order.sessionStatus === "bill-requested"
);
```
- Includes BOTH active sessions AND bill-requested sessions
- Tables with bill-requested show purple border and label

#### `acknowledgeExtras(orderId)`
```typescript
const acknowledgeExtras = async (orderId: string) => {
  try {
    await updateDoc(doc(db, "orders", orderId), {
      hasNewExtras: false,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    console.error("Failed to acknowledge extras:", error);
  }
};
```
- Automatically called when table modal opens
- Clears the red notification badge
- No explicit confirmation needed

#### `acceptAndGenerateBill(orderId)`
```typescript
const acceptAndGenerateBill = async (orderId: string) => {
  setUpdatingOrder(orderId);
  try {
    await updateDoc(doc(db, "orders", orderId), {
      billStatus: "accepted",
      updatedAt: serverTimestamp(),
    });
    alert("✅ Bill accepted. Customer can now download.");
  } catch (error) {
    console.error("Failed to accept bill:", error);
    alert("Failed to accept bill");
  } finally {
    setUpdatingOrder(null);
  }
};
```
- Chef explicitly approves the bill
- Updates billStatus to "accepted"
- Customer can now download from bill page

### Active Tables Grid Card
```tsx
<div
  onClick={() => {
    setSelectedTableOrder(order);
    if (order.hasNewExtras) {
      acknowledgeExtras(order.id);
    }
  }}
  className={`relative cursor-pointer rounded-2xl p-6 transition-all duration-300 hover:scale-110 hover:shadow-2xl border-2 ${
    order.sessionStatus === "bill-requested"
      ? "bg-purple-500/30 border-purple-400 hover:bg-purple-500/50"
      : "bg-white/10 border-white/20 hover:bg-white/20"
  }`}
>
```

**Features:**
- Clickable → opens modal
- Color changes if bill-requested
- Shows notification badge absolutely positioned
- Shows bill-requested label if applicable
- Hover effect (scale + shadow)

### Red Notification Badge
```tsx
{order.hasNewExtras && (
  <div className="absolute -top-2 -right-2 w-8 h-8 bg-red-500 text-white rounded-full flex items-center justify-center text-sm font-bold shadow-lg border-2 border-red-600">
    {order.extrasBatches?.length || 1}
  </div>
)}
```
- Positioned absolutely (top-right corner)
- Red background, white text
- Shows count of extra batches
- Self-closing border for depth

### Table Detail Modal
```tsx
{selectedTableOrder && (
  <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
    <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-3xl p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-white/20">
      {/* Modal content */}
    </div>
  </div>
)}
```

**Modal Sections:**
1. Header (Table #, Customer name, Close button)
2. Customer Info (People, Order Status)
3. Main Order Items
4. Extra Batches (if any)
5. Session Total
6. Action Buttons

---

## 2. Customer Ordering Page Changes

### Bill Request Flow
```typescript
const generateBill = useCallback(async () => {
  // ... validation ...
  
  // Update session: request bill (NOT generate)
  await updateDoc(sessionRef, {
    sessionStatus: "bill-requested",
    billStatus: "pending",
    billRequestedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  setSessionClosed(true);
  setIsSessionMode(false);
  setShowBillConfirm(false);
  setToastMessage("✅ Bill request sent to chef—please wait for approval");
}, [currentSessionId]);
```

**Key Points:**
- Does NOT generate PDF
- Sets status to "bill-requested" (not "closed")
- Sets billStatus to "pending" (not "accepted" or "generated")
- Closes the modal
- Shows waiting message

### Extra Order Update
```typescript
await updateDoc(sessionRef, {
  extrasBatches: newExtras,
  sessionTotal: newSessionTotal,
  status: "extrasReady",
  hasNewExtras: true,  // CRITICAL: This triggers badge
  updatedAt: serverTimestamp(),
});
```

---

## 3. Bill Page Changes

### Two-State Rendering

#### State 1: Bill Pending (billStatus === "pending")
```tsx
if (order.billStatus === "pending") {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-100 to-blue-200 flex items-center justify-center p-4">
      <div className="text-center bg-white p-12 rounded-3xl shadow-2xl max-w-md">
        <div className="text-6xl mb-6 animate-spin">⏳</div>
        <h2 className="text-3xl font-bold text-gray-800 mb-4">Bill Pending Approval</h2>
        <p className="text-lg text-gray-600 mb-6">
          Your bill request has been sent to the chef. Please wait for approval.
        </p>
        <button onClick={() => window.location.reload()}>🔄 Refresh</button>
      </div>
    </div>
  );
}
```

**Design:**
- Blue gradient background (calm/waiting)
- Animated spinner
- Clear messaging
- Refresh button to poll for updates
- No download/print buttons

#### State 2: Bill Accepted (billStatus === "accepted" or "downloaded")
```tsx
// Shows full bill with download/print buttons
<div className="max-w-4xl mx-auto">
  {/* Printable Bill */}
  <div className="bg-white rounded-3xl shadow-2xl p-8 md:p-12 mb-8" id="bill-content">
    {/* All items including extras */}
  </div>
  
  {/* Actions */}
  <div className="flex gap-4 justify-center">
    <button onClick={generatePDF}>📄 Download PDF</button>
    <button onClick={() => window.print()}>🖨️ Print Bill</button>
  </div>
</div>
```

### Extra Batches in Bill
```tsx
{order.extrasBatches && order.extrasBatches.map((batch, batchIdx) => (
  <React.Fragment key={batch.batchId}>
    <tr className="bg-yellow-50">
      <td colSpan={5} className="py-2 px-4 text-sm font-semibold text-yellow-800">
        Extra Order {batchIdx + 1}
      </td>
    </tr>
    {batch.items.map((item, itemIdx) => (
      <tr key={item.id || `${batchIdx}-${itemIdx}`} className="border-b border-gray-200 bg-yellow-50">
        {/* Item details */}
      </tr>
    ))}
  </React.Fragment>
))}
```

**Features:**
- Yellow background for visual distinction
- Section header for each batch
- All items displayed with quantity and prices
- Complete total includes all extras

---

## 4. Data Flow Diagrams

### Happy Path: Normal Order with Extras

```
Customer Orders
    ↓
Create Order (sessionStatus: active, billStatus: null)
    ↓
Chef sees table in grid
    ↓
Customer adds Extras
    ↓
Order gets hasNewExtras: true
    ↓
Red badge appears on table card
    ↓
Chef clicks table
    ↓
Modal opens, acknowledgeExtras() called
    ↓
hasNewExtras: false (badge disappears)
    ↓
Customer wants bill
    ↓
Click "End Session & Request Bill"
    ↓
Order updates: sessionStatus: "bill-requested", billStatus: "pending"
    ↓
Chef sees "💳 Bill Requested" label and color change
    ↓
Chef clicks "Accept & Generate Bill"
    ↓
Order updates: billStatus: "accepted"
    ↓
Customer refreshes bill page or sees "accepted" message
    ↓
Bill displays with download/print options
```

### State Transitions

```
Order Creation:
  sessionStatus: "active"
  billStatus: null
  status: "waiting"

After Extras:
  hasNewExtras: true
  status: "extrasReady"

After Bill Request:
  sessionStatus: "bill-requested"
  billStatus: "pending"
  billRequestedAt: <timestamp>

After Chef Approval:
  billStatus: "accepted"

After Session Closes:
  sessionStatus: "closed"
```

---

## 5. Performance Considerations

### Real-time Updates
- Chef dashboard uses `onSnapshot()` for live updates
- Automatically reflects new extras on cards
- No polling needed

### Badge Performance
- Badge only renders if `order.hasNewExtras` is true
- Cleared immediately when modal opens
- No unnecessary re-renders

### Modal Performance
- Only one modal state at a time
- Lazy rendered (only if selectedTableOrder !== null)
- Click outside doesn't close (must click X button)

---

## 6. Error Handling

### Chef Dashboard
```typescript
try {
  await updateDoc(doc(db, "orders", orderId), {...});
  alert("✅ Success message");
} catch (error) {
  console.error("Error:", error);
  alert("Failed to...");
} finally {
  setUpdatingOrder(null);  // Always clear loading state
}
```

### Customer Page
```typescript
try {
  // Updates
  setSessionClosed(true);
  setIsSessionMode(false);
  setShowBillConfirm(false);
  setToastMessage("✅ Success");
} catch (error: any) {
  console.error("Error:", error);
  alert(`❌ Failed: ${error.message}`);
} finally {
  setLoading(false);
}
```

---

## 7. Future Enhancements

### Could Add:
1. **Auto-refresh on bill page** (poll every 2 seconds)
2. **Notifications/Sounds** when new extras arrive
3. **Bill preview before approval** (chef sees PDF preview)
4. **Multiple bill attempts** (if customer disputes)
5. **Settlement/Payment tracking** (billStatus: "paid")
6. **Table statuses** (occupied vs vacant)
7. **Waiter notifications** (QR codes for waiters)
8. **Analytics dashboard** (sales, popular items, etc.)

---

## 8. Browser Compatibility

- Modern React 18+
- Tailwind CSS v3+
- Firestore (any version)
- jsPDF for PDF generation
- ES2020+ features used

### Tested On:
- ✅ Chrome/Edge (Windows)
- ✅ Firefox
- ✅ Mobile browsers (responsive)

---

## 9. Database Queries Used

### Chef Dashboard Orders
```javascript
query(
  collection(db, "orders"),
  orderBy("updatedAt", "desc")
)
// Real-time listener: onSnapshot
```

### Customer Bill Page
```javascript
doc(db, "orders", orderId)
// One-time fetch: getDoc
```

### Menu Items
```javascript
query(
  collection(db, "menu"),
  orderBy("name")
)
// Real-time listener: onSnapshot
```

---

## 10. Styling Notes

### Color Scheme
- **Active tables**: White/translucent background, white border
- **Bill requested**: Purple background, purple border
- **Status badges**: Yellow (waiting), Orange (preparing), Green (served)
- **Notification badge**: Red with darker red border
- **Extras section**: Yellow background (both dashboard & bill)
- **Success messages**: Green
- **Error messages**: Red

### Responsive Breakpoints
- **Grid columns**: 2 (mobile) → 3 (tablet) → 4 (desktop) → 5 (wide)
- **Modal width**: Max 2xl, full width on mobile
- **Padding**: 4px-8px on mobile, 8px-12px on desktop
