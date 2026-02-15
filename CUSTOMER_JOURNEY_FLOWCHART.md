# Customer Journey Flow - Complete Workflow

## Visual Overview

```
┌─────────────────────────────────────────────────────────────┐
│                     CUSTOMER ORDERING FLOW                  │
└─────────────────────────────────────────────────────────────┘

                        QR CODE SCAN
                             │
                             ▼
                    ✅ Table Detected
                    ✅ URL has ?table=5
                             │
                             ▼
                    ENTRY SCREEN
        ┌───────────────────────────────────┐
        │ Customer Name: [____________]     │
        │ Number of People: [______]        │
        │                                   │
        │ 🔄 Menu Items displayed           │
        │ Select items by clicking          │
        └───────────────────────────────────┘
                             │
                    ▼─ Item Added ─▼
            [Item] x[qty] added to cart
                             │
                    ▼─ More Items? ─▼
                    Yes ──┐       ┌── No
                         │       │
                         ▼       ▼
                    Add More   [CART READY]
                         │
                         └─────┬─────┘
                               │
                    ┌──────────▼──────────┐
                    │  BUTTON APPEARS:   │
                    │ 🚀 CONFIRM & START │
                    │      ORDER         │
                    └──────────┬──────────┘
                               │
                      ▼ Click Button ▼
                    [Starting Order...]
                    (Creating in Firestore)
                               │
                    ┌──────────▼──────────┐
                    │  ORDER CREATED ✅  │
                    │ sessionStatus:     │
                    │    "ACTIVE"        │
                    └──────────┬──────────┘
                               │
                         ACTIVE SESSION
                         (User in DB)
                    ┌──────────┴──────────┐
                    │                     │
              BUTTON CHANGES         TOAST SHOWS
           "Add Extra Order"      "Order started!
                    │             You can add more"
                    │                     │
                    ▼─────────────────────▼
              SESSION ACTIVE
        ┌──────────────────────────┐
        │ Cart cleared for extras  │
        │ Show "Add Extra Order"   │
        │ Show "Request Bill"      │
        │ Customer can continue    │
        └──────────────────────────┘
                    │
         ┌─────────┬┴┬─────────┐
         │ Add    │ │ Request │
       Extras    │ │   Bill  │
         │       │ │         │
         ▼       │ ▼         ▼
      [Add]      │    BILL REQUESTED
        │        │         │
        └────┬───┘    [WAITING...]
             │        ⏳ Spinner
             │             │
        Continue      CHEF APPROVES
        Ordering            │
             │              ▼
             │         BILL ACCEPTED
             │         (in Firestore)
             │              │
             ▼ ◄────────────┘
        REAL-TIME UPDATE
             │
             ▼
     "✅ Bill Approved!
      Download PDF" BUTTON
             │
             ▼
      CLICK DOWNLOAD
             │
             ▼
    Navigate to /bill page
    Show full bill details
             │
             ▼
    Customer downloads/prints
             │
             ▼
      SESSION CLOSED ✅
```

---

## State Diagram: Button Visibility

```
                    CART EMPTY
                        │
                        ▼
                  NO BUTTON VISIBLE
                        │
         ┌──────────────┘
         │ [Add items to cart]
         │
         ▼
    ITEMS IN CART, NO SESSION
         │
         ├─────────────────────────────────────┐
         │                                     │
    ✅ SHOW BUTTON:                           │
    "🚀 Confirm & Start Order"               │
    (Emerald/Cyan gradient)                   │
         │                                     │
    [CLICK BUTTON]                             │
         │                                     │
         ▼                                     │
    Session Created ✅                        │
         │                                     │
         ├─────────────────────────────────────┘
         │
         ▼
    ACTIVE SESSION
    (isSessionMode = true)
         │
    ┌────┴──────────────────────┐
    │                           │
    ▼                           ▼
NO BILL REQUESTED    BILL REQUESTED
    │                           │
    ├── SHOW:                   ├── SHOW:
    │   1. "Add Extra"          │   1. "⏳ Waiting..."
    │   2. "Request Bill"       │   2. Status message
    │                           │
    │                           ▼
    │                    [Chef approves]
    │                           │
    │                           ▼
    │                    billStatus="accepted"
    │                           │
    │                           ▼
    │                    SHOW: "✅ Download"
    │                           │
    │                           ▼
    └────────────────► Session Closed
```

---

## Timeline: Request Bill Process

```
CUSTOMER                         FIRESTORE              CHEF
   │                                 │                   │
   │  "Request Bill"                 │                   │
   │──────────────────────────────→  │                   │
   │                            {    │                   │
   │                       bill     │                   │
   │                      Status:   │                   │
   │                     "pending"  │                   │
   │                            }   │                   │
   │                                │ Updates            │
   │ ⏳ Waiting message              │                   │
   │ appears (yellow)                │                   │
   │                                │ See "Bill         │
   │                                │  Requested"      │
   │                                │ in queue          │
   │                                │  │                │
   │                                │  ▼                │
   │ Real-time listener             │ "Accept Bill"    │
   │ listening...                   │  │                │
   │                                │  ▼                │
   │                                │ Update:          │
   │                                │ billStatus=      │
   │                                │ "accepted"       │
   │◄─────────────────────────────  │                   │
   │ onSnapshot triggered!          │                   │
   │                                │                   │
   │ Toast:                         │                   │
   │ "✅ Chef Approved!"            │                   │
   │ Download button shows          │                   │
   │  │                                                  │
   │  └─ Click "Download"                              │
   │     ↓                                              │
   │   Shows bill page /bill/[id]   │                   │
   │     ↓                                              │
   │   Customer can:                │                   │
   │   - View full details          │                   │
   │   - Print                      │                   │
   │   - Download as PDF            │                   │
   │     ↓                                              │
   │   Session Closed ✅             │                   │
   │                                                    │

KEY: ←→ = Network request/update
     ⏳ = Waiting state
     ✅ = Confirmed/Success
```

---

## Four Critical Buttons

### 1. "🚀 Confirm & Start Order" (NEW - ENTRY POINT)
```
When: Items in cart, NO session exists
Where: Bottom of cart section
Color: Emerald to Cyan gradient
On Click:
  - Create order in Firestore
  - Set sessionStatus = "active"
  - Initialize session
  - Change to "Add Extra Order"
```

### 2. "Add Extra Order" (EXISTING - EXTRAS)
```
When: Session active, bill NOT requested
Where: Bottom of cart section
Color: Blue to Purple gradient
On Click:
  - Show confirmation modal
  - Add items to existing session
  - Update extrasBatches array
```

### 3. "💳 End Session & Request Bill" (EXISTING - REQUEST)
```
When: Session active, bill NOT approved
Where: Bottom of cart section
Color: Red to Orange gradient
On Click:
  - Show confirmation modal
  - Set billStatus = "pending"
  - Keep session active
  - Show "Waiting..." message
```

### 4. "✅ Bill Approved! Download PDF" (EXISTING - DOWNLOAD)
```
When: billStatus = "accepted"
Where: Bottom of cart section
Color: Green to Emerald gradient
On Click:
  - Navigate to /bill/[orderId]
  - Show bill details
  - Allow download/print
```

---

## Data Flow: Order Creation

```
CUSTOMER CLICKS "Confirm & Start Order"
              │
              ▼
    handlePlaceOrder()
              │
              ├─ Check: isSessionMode? 
              │ (NO - first order)
              │
              ├─ Call: placeNewOrder()
              │
              ▼
    Create Firestore Document:
    {
      customerName: "John",
      numberOfPeople: 4,
      tableNumber: 5,
      sessionId: "table5_john",
      sessionStatus: "active",        ← Session starts
      sessionItems: [...cart items],  ← Initial items
      sessionTotal: ₹850,
      status: "waiting",
      createdAt: timestamp,
      updatedAt: timestamp,
      extrasBatches: [],
      billStatus: null                ← No bill yet
    }
              │
              ▼
    setCurrentSessionId(docRef.id)
    setIsSessionMode(true)            ← UI knows session exists
    setCart([])                       ← Clear for extras
              │
              ▼
    Show Toast: "Order started!"
              │
              ▼
    Button changes to "Add Extra Order"
```

---

## Error Handling

```
Customer clicks "Start Order"
         │
         ▼
Validate:
  ✓ Customer name filled?        → If no: Alert & disable button
  ✓ People count > 0?            → If no: Alert & disable button
  ✓ Cart has items?              → If no: Alert & disable button
  ✓ Table from QR?               → If no: Alert & disable button
         │
         ▼ All valid
         │
Create order in Firestore
         │
         ├─ Success: Toast & button changes ✅
         │
         └─ Error: Alert with error message ❌
            (user can retry)
```

---

## Page Reload Scenario

```
SCENARIO: Customer starts order, then refreshes page

SESSION CREATED
  ├─ Firestore has order with sessionStatus="active"
  │
  ▼
CUSTOMER REFRESHES PAGE
  │
  ├─ checkExistingSession() runs
  │  (fixed to check both "active" and "bill-requested")
  │
  ▼
QUERY FIRESTORE:
  table=5, customerName="John", sessionStatus="active"
  
  ✅ FOUND!
  │
  ▼
SESSION RECOVERED
  ├─ setCurrentSessionId(orderId)
  ├─ setIsSessionMode(true)
  ├─ setBillStatus(from DB)
  ├─ setBillRequested(from sessionStatus)
  │
  ▼
SAME VIEW AS BEFORE REFRESH
  ├─ "Add Extra Order" button shows (not "Start Order")
  ├─ Session ready to continue
  ├─ Real-time listener reattached
  │
  ✅ NO DATA LOSS
```

---

## Comparison: Before vs After Fix

### BEFORE (Broken)
```
QR Scan → Enter Name → Select Items → 
  [Cart shows items]
  NO BUTTON → STUCK ❌
```

### AFTER (Fixed)
```
QR Scan → Enter Name → Select Items → 
  [Cart shows items]
  "🚀 Confirm & Start Order" appears ✅ →
  Click → Order created ✅ →
  "Add Extra Order" now shows ✅ →
  Can continue with ordering flow ✅
```

---

## Summary

The initial entry point is now **COMPLETE**:
✅ Customer can scan QR code
✅ Customer can select items
✅ Customer can start order with ONE CLICK
✅ Session is created and active
✅ Can add extras, request bill, download
✅ Can recover on page reload
✅ Real-time updates working
✅ All validations in place

**Status: PRODUCTION READY ✅**

