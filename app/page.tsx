"use client";

import { useState, useCallback, useMemo, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import {
  collection,
  addDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  updateDoc,
  doc,
  getDoc,
  getDocs,
  QueryDocumentSnapshot,
  Timestamp,
} from "firebase/firestore";
import { db, serverTimestamp } from "@/lib/firebase";
import { OrderItem, MenuItem, ExtraBatch } from "../types";
import MenuCard from "@/components/MenuCard";

const mapDocToMenuItem = (docSnap: QueryDocumentSnapshot): MenuItem => {
  const rawData = docSnap.data();
  const data = {
    name: typeof rawData.name === 'object' ? rawData.name.stringValue : rawData.name,
    mr_name: rawData.mr_name || "",
    description: rawData.description || "",
    mr_description: rawData.mr_description || "",
    price: typeof rawData.price === 'object' ? {
      full: Number(rawData.price.full),
      half: rawData.price.half ? Number(rawData.price.half) : undefined
    } : (rawData.half || rawData.full ? {
      full: Number(rawData.full || 0),
      half: Number(rawData.half || 0) || undefined
    } : { full: 0 }),
    image: typeof rawData.image === 'object' ? rawData.image.stringValue : (rawData.image && rawData.image !== "/images/default.jpg" ? rawData.image : null),
    noPortion: rawData.noPortion === true || rawData.noPortion === 'true',
    category: typeof rawData.category === 'object' ? rawData.category.stringValue : rawData.category || "starter",
    foodType: rawData.foodType,
    spiceLevel: rawData.spiceLevel || "Medium",
  };

  return {
    id: docSnap.id,
    name: data.name || "Unnamed Item",
    mr_name: data.mr_name,
    description: data.description,
    mr_description: data.mr_description,
    price: data.price,
    image: data.image || `https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&q=80&w=800`,
    noPortion: data.noPortion || false,
    category: (data.category as MenuItem["category"]) || "starter",
    foodType: data.foodType,
    spiceLevel: data.spiceLevel as any,
  };
};

const fallbackMenuItems: MenuItem[] = [
  { id: "f1", name: "Roasted Papad", mr_name: "भाजलेला पापड", description: "Crispy roasted lentil crackers", mr_description: "कुरकुरीत भाजलेला डाळीचा पापड", price: { full: 45 }, spiceLevel: "Medium", image: "https://images.unsplash.com/photo-1626602411112-10742f9a3af8?auto=format&fit=crop&q=80&w=800", noPortion: true, category: "starter" },
  { id: "f2", name: "Paneer Tikka", mr_name: "पनीर टिक्का", description: "Grilled marinated cottage cheese cubes", mr_description: "मसाल्यात मुरवलेले ग्रील्ड पनीर", price: { full: 270, half: 150 }, spiceLevel: "Medium", image: "https://images.unsplash.com/photo-1567184109411-40821c416e50?auto=format&fit=crop&q=80&w=800", noPortion: false, category: "starter" },
  { id: "f3", name: "Chapati", mr_name: "चपाती", description: "Soft whole wheat flatbread", mr_description: "मऊ गव्हाची चपाती", price: { full: 30 }, spiceLevel: "Sweet", image: "https://images.unsplash.com/photo-1601050690597-df0568f70950?auto=format&fit=crop&q=80&w=800", noPortion: true, category: "indian-bread" },
  { id: "f4", name: "Butter Naan", mr_name: "बटर नान", description: "Leavened bread with butter", mr_description: "मऊ आणि बटर लावलेला नान", price: { full: 50 }, spiceLevel: "Sweet", image: "https://images.unsplash.com/photo-1585934580020-0086c5966455?auto=format&fit=crop&q=80&w=800", noPortion: true, category: "indian-bread" },
  { id: "f5", name: "Veg. Fried Rice", mr_name: "व्हेज फ्राइड राइस", description: "Standard stir-fried rice with vegetables", mr_description: "भाज्यांसोबत परतलेला भात", price: { full: 210, half: 120 }, spiceLevel: "Medium", image: "https://images.unsplash.com/photo-1512058560366-cd2429003314?auto=format&fit=crop&q=80&w=800", noPortion: false, category: "rice" },
  { id: "f6", name: "Dal Fry", mr_name: "डाळ फ्राय", description: "Tempered yellow lentils with spices", mr_description: "फोडणी दिलेली पिवळी डाळ", price: { full: 160, half: 90 }, spiceLevel: "Medium", image: "https://images.unsplash.com/photo-1546833999-b9f581a1996d?auto=format&fit=crop&q=80&w=800", noPortion: false, category: "dal" },
  { id: "f7", name: "Mix Raita", mr_name: "मिक्स रायता", description: "Yogurt with chopped vegetables", mr_description: "दही आणि बारीक चिरलेल्या भाज्यांचे मिश्रण", price: { full: 95 }, spiceLevel: "Sweet", image: "https://images.unsplash.com/photo-1626074353765-517a681e40be?auto=format&fit=crop&q=80&w=800", noPortion: true, category: "raita" },
  { id: "f8", name: "Veg. Hakka Noodles", mr_name: "व्हेज हक्का नूडल्स", description: "Wok-tossed noodles with crunchy veggies", mr_description: "नूडल्स आणि कुरकुरीत भाज्यांचे मिश्रण", price: { full: 220, half: 130 }, spiceLevel: "Medium", image: "https://images.unsplash.com/photo-1585032226651-759b368d7246?auto=format&fit=crop&q=80&w=800", noPortion: false, category: "noodles" },
  { id: "f9", name: "Vanilla Ice Cream", mr_name: "व्हॅनिला आईसक्रीम", description: "Classic vanilla flavored frozen dessert", mr_description: "क्लासिक व्हॅनिला फ्लेवरचे आईसक्रीम", price: { full: 65 }, spiceLevel: "Sweet", image: "https://images.unsplash.com/photo-1497034825429-c343d7c6a68f?auto=format&fit=crop&q=80&w=800", noPortion: true, category: "ice-cream" },
];

const translations: Record<string, Record<string, string>> = {
  en: {
    add: "Add",
    price: "Price",
    half: "Half",
    full: "Full",
    addToCart: "Add to Cart",
    itemsAdded: "added",
    yourCart: "Your Cart",
    placeOrder: "Place Order",
    totalPayable: "Total Payable",
    categoryStarters: "Salads & Starters",
    categoryBreads: "Breads",
    categoryRice: "Biryani & Rice",
    categoryDals: "Dals & Lentils",
    categoryRaitas: "Raitas",
    categoryNoodles: "Chinese & Noodles",
    categoryDesserts: "Desserts",
    exploreMenu: "Explore Menu",
    personalDetails: "Personal Details",
    diners: "Number of People",
    fullName: "Your Full Name",
    tableConfirmed: "Table Confirmed",
    tableNotDetected: "Table Not Detected",
    startOrdering: "Start Ordering",
    pleaseEnterDetails: "Please enter your details above to start ordering.",
    instructionStep1: "👇 Step 1: Enter Details",
    instructionStep2: "Step 2: Add Items",
    instructionStep3: "Step 3: Tap Cart to Order",
    requestBill: "Request Bill",
  },
  mr: {
    add: "जोडा",
    price: "किंमत",
    half: "अर्धा",
    full: "पूर्ण",
    addToCart: "कार्टमध्ये जोडा",
    itemsAdded: "जोडले गेले",
    yourCart: "तुमचे कार्ट",
    placeOrder: "ऑर्डर द्या",
    totalPayable: "एकूण देय रक्कम",
    categoryStarters: "कोशिंबीर आणि स्टार्टर्स",
    categoryBreads: "पोळी/ब्रेड",
    categoryRice: "बिर्याणी आणि भात",
    categoryDals: "डाळ आणि आमटी",
    categoryRaitas: "रायता",
    categoryNoodles: "चायनीज आणि नूडल्स",
    categoryDesserts: "आईस्क्रीम/गोड पदार्थ",
    exploreMenu: "मेन्यू पहा",
    personalDetails: "वैयक्तिक तपशील",
    diners: "लोकांची संख्या",
    fullName: "तुमचे पूर्ण नाव",
    tableConfirmed: "टेबल निश्चित झाले",
    tableNotDetected: "टेबल सापडले नाही",
    startOrdering: "ऑर्डर सुरू करा",
    pleaseEnterDetails: "ऑर्डर सुरू करण्यासाठी कृपया वरील तुमचे तपशील भरा.",
    instructionStep1: "👇 पायरी १: तपशील भरा",
    instructionStep2: "पायरी २: पदार्थ जोडा",
    instructionStep3: "पायरी ३: ऑर्डर देण्यासाठी कार्टवर टॅप करा",
    requestBill: "बिल मागा",
  }
};

export default function OrderingPage() {
  return (
    <Suspense fallback={<div className="p-8 text-gray-700">Loading…</div>}>
      <OrderingPageInner />
    </Suspense>
  );
}


function ExpandedItemModalContent({
  item,
  currentLang,
  t,
  sessionClosed,
  isMenuUnlocked,
  billRequested,
  addToCart,
  onClose,
}: {
  item: MenuItem;
  currentLang: "en" | "mr";
  t: (key: string) => string;
  sessionClosed: boolean;
  isMenuUnlocked: boolean;
  billRequested: boolean;
  addToCart: (item: MenuItem, portion: "Half" | "Full", price: number, quantity: number) => void;
  onClose: () => void;
}) {
  const [portion, setPortion] = useState<"Half" | "Full">(item.price.half ? "Half" : "Full");
  const [quantity, setQuantity] = useState(1);

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <h3 className="text-2xl font-bold text-black">{currentLang === "mr" && item.mr_name ? item.mr_name : item.name}</h3>
          {(currentLang === "mr" ? item.mr_description : item.description) && (
            <p className="text-sm text-gray-500 font-medium mt-1">
              {currentLang === "mr" ? item.mr_description : item.description}
            </p>
          )}
          <div className="text-lg text-orange-600 font-bold mt-2">
            {!item.noPortion && item.price.half
              ? `${t('half')}: ₹${item.price.half} | ${t('full')}: ₹${item.price.full}`
              : `₹${item.price.full}`
            }
          </div>
        </div>
        <button
          onClick={onClose}
          className="text-2xl text-gray-500 hover:text-gray-700"
        >
          ✕
        </button>
      </div>

      <div className="w-full h-48 rounded-lg overflow-hidden bg-gray-200">
        <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
      </div>

      <div className="space-y-3">
        {!item.noPortion && item.price.half && (
          <div>
            <label className="block text-sm font-semibold text-gray-800 mb-2">Select Portion</label>
            <select
              value={portion}
              onChange={(e) => setPortion(e.target.value as "Half" | "Full")}
              className="w-full px-3 py-2 rounded-lg bg-white border border-gray-300 focus:outline-none focus:ring-2 focus:ring-orange-500 text-black font-semibold"
              disabled={sessionClosed || billRequested}
            >
              <option value="Half">Half</option>
              <option value="Full">Full</option>
            </select>
          </div>
        )}

        <div>
          <label className="block text-sm font-semibold text-gray-800 mb-2">Quantity</label>
          <div className="flex items-center gap-6">
            <button
              onClick={() => {
                if (isMenuUnlocked && !sessionClosed && !billRequested) setQuantity(prev => Math.max(1, prev - 1));
              }}
              className="w-12 h-12 flex items-center justify-center text-xl font-bold bg-gray-200 hover:bg-gray-300 rounded-lg disabled:opacity-30"
              disabled={sessionClosed || !isMenuUnlocked || billRequested}
            >
              −
            </button>
            <span className="text-xl font-bold text-black min-w-[1.5rem] text-center">{quantity}</span>
            <button
              onClick={() => {
                if (isMenuUnlocked && !sessionClosed && !billRequested) setQuantity(prev => prev + 1);
              }}
              className="w-12 h-12 flex items-center justify-center text-xl font-bold bg-gray-200 hover:bg-gray-300 rounded-lg disabled:opacity-30"
              disabled={sessionClosed || !isMenuUnlocked || billRequested}
            >
              +
            </button>
          </div>
        </div>

        <button
          onClick={() => {
            if (isMenuUnlocked && !sessionClosed && !billRequested) {
              const currentPrice = portion === "Half" ? (item.price.half || item.price.full) : item.price.full;
              addToCart(item, portion, currentPrice, quantity);
              onClose();
            }
          }}
          className={`w-full px-6 py-4 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-bold rounded-xl transition-all disabled:opacity-50 ${(!isMenuUnlocked || billRequested) && !sessionClosed ? 'from-gray-400 to-gray-500' : ''}`}
          disabled={sessionClosed || !isMenuUnlocked || billRequested}
        >
          {isMenuUnlocked ? `✅ ${t('addToCart')}` : (currentLang === "mr" ? "ऑर्डर करण्यासाठी वरील तपशील भरा" : "Enter details above to order")}
        </button>
      </div>
    </div>
  );
}

function OrderingPageInner() {
  const searchParams = useSearchParams();
  const tableParam = searchParams.get("table");

  // Table number ONLY from URL - validate as positive number
  const tableNumberFromUrl = useMemo(() => {
    if (!tableParam) return null;
    const num = Number(tableParam);
    return Number.isNaN(num) || num <= 0 ? null : num;
  }, [tableParam]);

  const [cart, setCart] = useState<OrderItem[]>([]);
  const [customerName, setCustomerName] = useState<string>("");
  const [numberOfPeople, setNumberOfPeople] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [addedMessage, setAddedMessage] = useState<string | null>(null);
  const [expandedItem, setExpandedItem] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"starter" | "indian-bread" | "rice" | "dal" | "raita" | "noodles" | "ice-cream">("starter");
  const [showBillConfirm, setShowBillConfirm] = useState(false);
  const [showExtraConfirm, setShowExtraConfirm] = useState(false);

  // Derived State: Auto-Unlock Menu
  const isMenuUnlocked = useMemo(() => {
    return customerName.trim() !== "" && Number(numberOfPeople) > 0;
  }, [customerName, numberOfPeople]);

  // Session state
  const [isSessionMode, setIsSessionMode] = useState(false);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [sessionLoading, setSessionLoading] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [sessionClosed, setSessionClosed] = useState(false);
  const [showCartModal, setShowCartModal] = useState(false);
  const [billStatus, setBillStatus] = useState<"pending" | "accepted" | "downloaded" | null>(null);
  const [billRequested, setBillRequested] = useState(false);
  const [currentOrder, setCurrentOrder] = useState<any>(null);
  const [currentLang, setCurrentLang] = useState<"en" | "mr">("en");
  const [isStarted, setIsStarted] = useState(false);
  const [showBanner, setShowBanner] = useState(true);
  const [menuItems, setMenuItems] = useState<MenuItem[]>(fallbackMenuItems);
  const [menuLoading, setMenuLoading] = useState(true);

  const t = (key: string) => translations[currentLang][key] || key;

  type ItemControls = {
    quantity: number;
  };

  // Load menu items
  useEffect(() => {
    const q = query(collection(db, "menu"), orderBy("name"));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const items: MenuItem[] = snapshot.docs.map(mapDocToMenuItem);
        setMenuItems(items.length > 0 ? items : fallbackMenuItems);
        setMenuLoading(false);
      },
      (error) => {
        console.error("Menu fetch failed, using fallback:", error);
        setMenuItems(fallbackMenuItems);
        setMenuLoading(false);
      }
    );
    return () => unsubscribe();
  }, []);

  // Load session from localStorage on mount
  useEffect(() => {
    const savedName = localStorage.getItem("restaurant_customerName");
    const savedPeople = localStorage.getItem("restaurant_numberOfPeople");
    const savedSessionId = localStorage.getItem("restaurant_sessionId");

    if (savedName) setCustomerName(savedName);
    if (savedPeople) setNumberOfPeople(savedPeople);
    if (savedSessionId) setCurrentSessionId(savedSessionId);
  }, []);

  // Save session to localStorage
  useEffect(() => {
    if (customerName) localStorage.setItem("restaurant_customerName", customerName);
    if (numberOfPeople) localStorage.setItem("restaurant_numberOfPeople", numberOfPeople);
    if (currentSessionId) localStorage.setItem("restaurant_sessionId", currentSessionId);
  }, [customerName, numberOfPeople, currentSessionId]);

  const clearSession = useCallback(() => {
    localStorage.removeItem("restaurant_customerName");
    localStorage.removeItem("restaurant_numberOfPeople");
    localStorage.removeItem("restaurant_sessionId");
    setCustomerName("");
    setNumberOfPeople("");
    setCurrentSessionId(null);
    setCart([]);
    setIsSessionMode(false);
    setSessionClosed(false);
    setBillStatus(null);
    setBillRequested(false);
    setCurrentOrder(null);
  }, []);

  const checkExistingSession = useCallback(async () => {
    if (!tableNumberFromUrl) {
      setIsSessionMode(false);
      setCurrentSessionId(null);
      setCart([]);
      setSessionClosed(false);
      setBillStatus(null);
      setBillRequested(false);
      return;
    }

    setSessionLoading(true);
    try {
      // If we have a customer name, prioritize finding THAT specific session
      // Otherwise, find the latest session for this table to check if it's active
      const q = customerName.trim()
        ? query(
          collection(db, "orders"),
          where("tableNumber", "==", tableNumberFromUrl),
          where("customerName", "==", customerName.trim())
        )
        : query(
          collection(db, "orders"),
          where("tableNumber", "==", tableNumberFromUrl),
          orderBy("createdAt", "desc")
        );

      const snapshot = await getDocs(q);

      if (!snapshot.empty) {
        const sessionDoc = snapshot.docs[0];
        const sessionData = sessionDoc.data();

        // Support both active and bill-requested session recovery
        if (sessionData.sessionStatus === "active" || sessionData.sessionStatus === "bill-requested") {
          const existingItems: OrderItem[] = sessionData.sessionItems || [];

          setCurrentSessionId(sessionDoc.id);
          setCurrentOrder(sessionData);
          setIsSessionMode(true);
          setIsStarted(true); // Active session means started

          // Auto-recover names if currently empty (fresh scan scenario)
          if (!customerName) setCustomerName(sessionData.customerName);
          if (!numberOfPeople) setNumberOfPeople(String(sessionData.numberOfPeople));

          setCart([]); // Start with empty cart for new extras
          setBillStatus(sessionData.billStatus || null);
          setBillRequested(sessionData.sessionStatus === "bill-requested");
          setSessionClosed(false);

          const message = sessionData.sessionStatus === "bill-requested"
            ? "Welcome back! Bill is pending chef approval..."
            : `Welcome back! Your session has ${existingItems.length} initial items.`;
          setToastMessage(message);
          setTimeout(() => setToastMessage(null), 3000);
        } else if (sessionData.sessionStatus === "closed" || sessionData.billStatus === "downloaded") {
          // If the latest session is closed, and we have matching local state, show "Session Closed"
          // If we have NO local state (new customer), we stay in "Order" mode (isSessionMode=false)
          if (customerName && sessionData.customerName === customerName.trim()) {
            setIsSessionMode(false);
            setCurrentSessionId(null);
            setCart([]);
            setSessionClosed(true);
            setBillStatus(sessionData.billStatus || null);
            setBillRequested(false);
          } else {
            // New customer detected on a table where previous session is closed
            setIsSessionMode(false);
            setCurrentSessionId(null);
            setSessionClosed(false);
          }
        }
      } else {
        setIsSessionMode(false);
        setCurrentSessionId(null);
        setCart([]);
        setSessionClosed(false);
        setBillStatus(null);
        setBillRequested(false);
      }
    } catch (error) {
      console.error("Error checking session:", error);
      setIsSessionMode(false);
      setCurrentSessionId(null);
    } finally {
      setSessionLoading(false);
    }
  }, [tableNumberFromUrl, customerName, numberOfPeople]);

  // Check session on customer name change or page load
  useEffect(() => {
    const timeoutId = setTimeout(checkExistingSession, 500);
    return () => clearTimeout(timeoutId);
  }, [checkExistingSession]);

  // Real-time listener for bill status changes (when chef approves bill)
  useEffect(() => {
    if (!currentSessionId) return;

    const sessionRef = doc(db, "orders", currentSessionId);
    const unsubscribe = onSnapshot(sessionRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data() as any;

        // Update local state when bill status changes from pending to accepted
        if (data.billStatus && data.billStatus !== billStatus) {
          setBillStatus(data.billStatus);

          if (data.billStatus === "accepted") {
            setToastMessage("✅ Chef approved your bill! You can now download it.");
            setTimeout(() => setToastMessage(null), 5000);
          }
        }

        // Update current order data
        if (data) {
          setCurrentOrder(data);
        }
      }
    });

    return () => unsubscribe();
  }, [currentSessionId, billStatus]);


  const toggleItem = useCallback((itemName: string) => {
    setExpandedItem(prev => prev === itemName ? null : itemName);
  }, []);

  const addToCart = useCallback((item: MenuItem, selectedPortion: "Half" | "Full", selectedPrice: number, quantity: number) => {
    if (sessionClosed) {
      alert("Session is closed. Cannot add more items.");
      return;
    }

    const portionDisplay = item.noPortion ? "N/A" : selectedPortion;

    const existingIndex = cart.findIndex(
      (ci) => ci.name === item.name && ci.portion === portionDisplay
    );

    if (existingIndex === -1) {
      const newItem: OrderItem = {
        id: crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(),
        name: item.name,
        portion: portionDisplay as "Half" | "Full" | "N/A",
        price: selectedPrice,
        quantity: quantity,
        spiceLevel: item.spiceLevel, // Now informational/fixed per item
      };
      setCart((prev) => [...prev, newItem]);
    } else {
      const updated = [...cart];
      updated[existingIndex] = {
        ...updated[existingIndex],
        quantity: updated[existingIndex].quantity + quantity,
      };
      setCart(updated);
    }

    const displayName = currentLang === "mr" && item.mr_name ? item.mr_name : item.name;
    setAddedMessage(`${displayName} x${quantity} (${t(portionDisplay.toLowerCase())}) ${t('itemsAdded')}`);
    setTimeout(() => setAddedMessage(null), 2000);
  }, [cart, sessionClosed, currentLang, t]);

  const removeFromCart = useCallback((id: string) => {
    if (sessionClosed) return;
    setCart((prev) => prev.filter((item) => item.id !== id));
  }, [sessionClosed]);

  const calculateTotal = useCallback(() => {
    return cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  }, [cart]);

  const filteredMenuItems = useMemo(() => {
    return menuItems.filter(item => item.category === activeTab);
  }, [menuItems, activeTab]);

  const parsedPeople = Number(numberOfPeople);
  const canPlaceOrder =
    customerName.trim().length > 0 &&
    !Number.isNaN(parsedPeople) &&
    parsedPeople > 0 &&
    cart.length > 0 &&
    tableNumberFromUrl !== null &&
    !sessionClosed;

  // Start Order or Add Extra
  const handlePlaceOrder = useCallback(async () => {
    if (!canPlaceOrder) {
      alert("Please fill customer name, number of people, and add items to cart");
      return;
    }

    if (!tableNumberFromUrl) {
      alert("Table number is required. Please access via QR code with ?table=X");
      return;
    }

    if (isSessionMode) {
      // Show confirmation modal for extra order
      setShowExtraConfirm(true);
    } else {
      // Start new order directly
      await placeNewOrder();
    }
  }, [canPlaceOrder, tableNumberFromUrl, isSessionMode, cart, customerName, numberOfPeople]);

  const placeNewOrder = useCallback(async () => {
    if (!tableNumberFromUrl || !customerName.trim()) return;

    setLoading(true);
    try {
      const numPeople = Number(numberOfPeople);
      const sessionId = `table${tableNumberFromUrl}_${customerName.trim().toLowerCase().replace(/\s+/g, '_')}`;
      const subtotal = calculateTotal();

      const orderData = {
        customerName: customerName.trim(),
        numberOfPeople: numPeople,
        tableNumber: tableNumberFromUrl,
        sessionId: sessionId,
        sessionStatus: "active" as const,
        sessionItems: cart,
        sessionTotal: subtotal,
        status: "waiting" as const,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        extrasBatches: [],
      };

      const docRef = await addDoc(collection(db, "orders"), orderData);
      setCurrentSessionId(docRef.id);
      setIsSessionMode(true);
      setCart([]); // Clear cart after order
      setToastMessage("✅ Order started! You can add more items anytime.");
      setTimeout(() => setToastMessage(null), 3000);
    } catch (error: any) {
      console.error("❌ Order error:", error);
      alert(`❌ Failed: ${error.message || 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  }, [tableNumberFromUrl, customerName, numberOfPeople, cart, calculateTotal]);

  const placeExtraOrder = useCallback(async () => {
    if (!currentSessionId || !tableNumberFromUrl) return;

    setLoading(true);
    try {
      const sessionRef = doc(db, "orders", currentSessionId);
      const sessionDoc = await getDoc(sessionRef);

      if (!sessionDoc.exists()) {
        alert("Session not found.");
        setLoading(false);
        return;
      }

      const sessionData = sessionDoc.data();
      if (sessionData.sessionStatus === "closed" || sessionData.billStatus === "generated") {
        alert("Session is closed. Cannot add more items.");
        setSessionClosed(true);
        setLoading(false);
        return;
      }

      // Create extra batch
      const batchId = crypto.randomUUID ? crypto.randomUUID() : Date.now().toString();
      const batchTotal = calculateTotal();
      const extraBatch: ExtraBatch = {
        batchId,
        items: [...cart],
        batchTotal,
        timestamp: Timestamp.now(),
      };

      const existingExtras: ExtraBatch[] = sessionData.extrasBatches || [];
      const newExtras = [...existingExtras, extraBatch];
      const newSessionTotal = (sessionData.sessionTotal || 0) + batchTotal;

      await updateDoc(sessionRef, {
        extrasBatches: newExtras,
        sessionTotal: newSessionTotal,
        status: "waiting",
        hasNewExtras: true,
        updatedAt: serverTimestamp(),
      });

      setCart([]);
      setShowExtraConfirm(false);
      setToastMessage("✅ Extra order sent!");
      setTimeout(() => setToastMessage(null), 3000);
    } catch (error: any) {
      console.error("❌ Extra order error:", error);
      alert(`❌ Failed: ${error.message || 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  }, [currentSessionId, cart, calculateTotal, tableNumberFromUrl]);

  const generateBill = useCallback(async () => {
    if (!currentSessionId) return;

    setLoading(true);
    try {
      const sessionRef = doc(db, "orders", currentSessionId);
      const sessionDoc = await getDoc(sessionRef);

      if (!sessionDoc.exists()) {
        alert("Session not found.");
        setLoading(false);
        return;
      }

      await updateDoc(sessionRef, {
        sessionStatus: "bill-requested",
        billStatus: "pending",
        billRequestedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      setBillRequested(true);
      setBillStatus("pending");
      setShowBillConfirm(false);
      setToastMessage("⏳ Bill request sent to chef—please wait for approval...");
      setTimeout(() => setToastMessage(null), 5000);
    } catch (error: any) {
      console.error("❌ Bill request error:", error);
      alert(`❌ Failed: ${error.message || 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  }, [currentSessionId]);

  return (
    <div className="min-h-screen bg-white p-4 md:p-6 relative">
      {addedMessage && (
        <div className="fixed top-24 right-6 z-50 max-w-sm animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="bg-gray-900/95 backdrop-blur-xl border border-white/10 text-white px-6 py-4 rounded-[2rem] shadow-2xl flex items-center gap-4">
            <div className="w-10 h-10 bg-emerald-500 rounded-2xl flex items-center justify-center text-lg">
              ✨
            </div>
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Added to Cart</p>
              <p className="text-sm font-black">{addedMessage}</p>
            </div>
          </div>
        </div>
      )}

      {toastMessage && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-50 max-w-lg w-full px-6 animate-in fade-in zoom-in duration-300">
          <div className="bg-white/95 backdrop-blur-xl border border-gray-100 text-gray-900 px-8 py-5 rounded-[2.5rem] shadow-2xl flex items-center gap-5">
            <div className="w-14 h-14 bg-primary/10 text-primary rounded-3xl flex items-center justify-center text-2xl shrink-0">
              📢
            </div>
            <div className="flex-1">
              <p className="text-base font-black leading-tight">{toastMessage}</p>
            </div>
            <button onClick={() => setToastMessage(null)} className="text-gray-400 hover:text-gray-900 transition-colors">
              ✕
            </button>
          </div>
        </div>
      )}

      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
        {/* Professional Header */}
        <div className="bg-white border-b border-gray-200 sticky top-0 z-40 transition-shadow duration-300 shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 h-20 flex items-center justify-between">
            <div className="flex items-center gap-2 md:gap-3">
              <div className="w-10 h-10 md:w-12 md:h-12 bg-primary rounded-2xl flex items-center justify-center text-xl md:text-2xl shadow-lg shadow-primary/20">
                🍽️
              </div>
              <div className="hidden xs:block">
                <h1 className="text-sm md:text-xl font-extrabold text-gray-900 tracking-tight leading-tight">Delicious Bites</h1>
                <p className="text-[8px] md:text-xs text-gray-500 font-semibold uppercase tracking-wider">Premium Dining</p>
              </div>
            </div>

            <div className="flex items-center gap-2 md:gap-4">
              {isSessionMode && !sessionClosed && !billRequested && (
                <button
                  onClick={() => setShowBillConfirm(true)}
                  className="px-3 md:px-5 py-2 border-2 border-rose-500 text-rose-500 hover:bg-rose-50 font-black rounded-xl text-[10px] md:text-xs transition-all uppercase tracking-tighter"
                >
                  {t('requestBill')}
                </button>
              )}

              {/* Cart Button (Backup for Desktop) */}
              <button
                onClick={() => setShowCartModal(true)}
                className="hidden md:flex group items-center gap-4 bg-gray-50 hover:bg-white border border-gray-200 hover:border-primary/30 px-3 py-2 rounded-2xl transition-all duration-300 hover:shadow-xl hover:shadow-primary/5 active:scale-95"
              >
                <div className="flex flex-col items-end">
                  <span className="text-xs font-bold text-gray-400 uppercase tracking-tighter">Your Cart</span>
                  <span className="text-sm font-black text-gray-900 leading-none">₹{calculateTotal()}</span>
                </div>
                <div className="relative w-11 h-11 bg-white group-hover:bg-primary rounded-xl flex items-center justify-center text-xl transition-colors duration-300 border border-gray-100 group-hover:border-primary shadow-sm">
                  🛒
                  {cart.length > 0 && (
                    <div className="absolute -top-2 -right-2 bg-primary text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-black shadow-lg animate-bounce">
                      {cart.length}
                    </div>
                  )}
                </div>
              </button>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 py-8">

          {/* Language Toggle */}
          <div className="flex justify-end mb-4">
            <div className="bg-white border border-gray-200 rounded-2xl p-1 flex shadow-sm">
              <button
                onClick={() => setCurrentLang("en")}
                className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${currentLang === "en" ? "bg-primary text-white shadow-lg" : "text-gray-400 hover:text-gray-900"}`}
              >
                ENGLISH
              </button>
              <button
                onClick={() => setCurrentLang("mr")}
                className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${currentLang === "mr" ? "bg-primary text-white shadow-lg" : "text-gray-400 hover:text-gray-900"}`}
              >
                मराठी
              </button>
            </div>
          </div>

          {/* Modern Table & Session Alerts */}
          <div className="space-y-4 mb-8">
            {tableNumberFromUrl !== null ? (
              <div className="flex items-center gap-4 bg-emerald-50 border border-emerald-100 px-6 py-4 rounded-3xl shadow-sm">
                <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-2xl shadow-sm border border-emerald-200">
                  🪑
                </div>
                <div>
                  <h3 className="font-bold text-emerald-900 text-lg">{t('tableConfirmed')} {tableNumberFromUrl}</h3>
                  <p className="text-emerald-700/80 text-sm font-medium">All orders will be served directly to your table.</p>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-4 bg-amber-50 border border-amber-100 px-6 py-4 rounded-3xl shadow-sm">
                <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-2xl shadow-sm border border-amber-200">
                  ⚠️
                </div>
                <div>
                  <h3 className="font-bold text-amber-900 text-lg">{t('tableNotDetected')}</h3>
                  <p className="text-amber-700/80 text-sm font-medium">Please scan a QR code or ask our staff for assistance.</p>
                </div>
              </div>
            )}

            {isSessionMode && !sessionClosed && (
              <div className="flex items-center gap-4 bg-blue-50 border border-blue-100 px-6 py-4 rounded-3xl shadow-sm">
                <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-2xl shadow-sm border border-blue-200">
                  ⌛
                </div>
                <div>
                  <h3 className="font-bold text-blue-900 text-lg">Active Session</h3>
                  <p className="text-blue-700/80 text-sm font-medium">You can continue adding items to your current order.</p>
                </div>
              </div>
            )}

            {sessionClosed && (
              <div className="flex flex-col md:flex-row items-center justify-between gap-4 bg-rose-50 border border-rose-100 px-6 py-6 rounded-3xl shadow-sm">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-2xl shadow-sm border border-rose-200">
                    🔒
                  </div>
                  <div>
                    <h3 className="font-bold text-rose-900 text-lg">Session Closed</h3>
                    <p className="text-rose-700/80 text-sm font-medium">Payment is being processed. Thank you for dining with us!</p>
                  </div>
                </div>
                <button
                  onClick={clearSession}
                  className="px-6 py-3 bg-rose-500 hover:bg-rose-600 text-white font-black rounded-xl transition-all shadow-lg shadow-rose-500/20 uppercase tracking-tighter text-sm"
                >
                  Start New Order
                </button>
              </div>
            )}

            {billRequested && !sessionClosed && (
              <div className="flex items-center gap-4 bg-amber-50 border border-amber-200 px-6 py-4 rounded-3xl shadow-sm animate-pulse">
                <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-2xl shadow-sm border border-amber-300">
                  🔒
                </div>
                <div>
                  <h3 className="font-bold text-amber-900 text-lg">Ordering Locked</h3>
                  <p className="text-amber-700/80 text-sm font-medium">Bill has been requested. No further changes can be made.</p>
                </div>
              </div>
            )}
          </div>

          {/* Modern Personal Details Form */}
          <div id="details-gate" className="mb-8">
            <div className={`bg-white rounded-3xl p-6 md:p-8 border-2 transition-all duration-500 ${isStarted ? 'border-emerald-100 bg-emerald-50/10' : 'border-primary/20 shadow-xl shadow-primary/5'}`}>
              <div className="flex items-center justify-between mb-6 md:mb-8">
                <div className="flex items-center gap-3">
                  <div className={`w-1.5 h-8 rounded-full ${isStarted ? 'bg-emerald-500' : 'bg-primary'}`} />
                  <h2 className="text-xl md:text-2xl font-black text-gray-900">{t('personalDetails')}</h2>
                </div>
                {isStarted && !sessionClosed && (
                  <span className="bg-emerald-500 text-white text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest animate-pulse">
                    READY TO ORDER
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-8 max-w-4xl">
                <div className="relative group">
                  <input
                    type="text"
                    id="customer-name"
                    placeholder=" "
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="peer w-full px-6 py-4 rounded-2xl bg-gray-50 border border-gray-200 focus:bg-white focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all outline-none text-gray-900 font-bold placeholder-transparent disabled:opacity-50"
                    disabled={sessionLoading || sessionClosed || isStarted}
                  />
                  <label
                    htmlFor="customer-name"
                    className="absolute left-6 top-4 text-gray-400 font-bold pointer-events-none transition-all peer-focus:-top-3 peer-focus:left-4 peer-focus:text-xs peer-focus:text-primary peer-focus:bg-white peer-focus:px-2 peer-[:not(:placeholder-shown)]:-top-3 peer-[:not(:placeholder-shown)]:left-4 peer-[:not(:placeholder-shown)]:text-xs peer-[:not(:placeholder-shown)]:text-primary peer-[:not(:placeholder-shown)]:bg-white peer-[:not(:placeholder-shown)]:px-2"
                  >
                    {t('fullName')} *
                  </label>
                </div>
                <div className="relative group">
                  <input
                    type="number"
                    id="num-people"
                    placeholder=" "
                    min={1}
                    value={numberOfPeople}
                    onChange={(e) => setNumberOfPeople(e.target.value)}
                    className="peer w-full px-6 py-4 rounded-2xl bg-gray-50 border border-gray-200 focus:bg-white focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all outline-none text-gray-900 font-bold placeholder-transparent disabled:opacity-50"
                    disabled={sessionLoading || sessionClosed || isStarted}
                  />
                  <label
                    htmlFor="num-people"
                    className="absolute left-6 top-4 text-gray-400 font-bold pointer-events-none transition-all peer-focus:-top-3 peer-focus:left-4 peer-focus:text-xs peer-focus:text-primary peer-focus:bg-white peer-focus:px-2 peer-[:not(:placeholder-shown)]:-top-3 peer-[:not(:placeholder-shown)]:left-4 peer-[:not(:placeholder-shown)]:text-xs peer-[:not(:placeholder-shown)]:text-primary peer-[:not(:placeholder-shown)]:bg-white peer-[:not(:placeholder-shown)]:px-2"
                  >
                    {t('diners')} *
                  </label>
                </div>
              </div>

              {sessionLoading && (
                <p className="mt-6 text-sm font-bold text-primary flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                  Checking for active session...
                </p>
              )}
            </div>
          </div>

          {/* Instructional Banner */}
          {showBanner && !isSessionMode && (
            <div className="mb-8 animate-in fade-in slide-in-from-top-4 duration-500">
              <div className="bg-gray-900 text-white p-4 rounded-2xl flex items-center justify-between shadow-lg">
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[10px] md:text-sm font-bold uppercase tracking-tighter">
                  <span className={!isMenuUnlocked ? "text-primary anim-pulse" : "text-emerald-400"}>{t('instructionStep1')}</span>
                  <span className="text-gray-600">→</span>
                  <span className={isMenuUnlocked && cart.length === 0 ? "text-primary" : "text-gray-400"}>{t('instructionStep2')}</span>
                  <span className="text-gray-600">→</span>
                  <span className={cart.length > 0 ? "text-primary" : "text-gray-400"}>{t('instructionStep3')}</span>
                </div>
                <button onClick={() => setShowBanner(false)} className="text-gray-500 hover:text-white ml-2">✕</button>
              </div>
            </div>
          )}

          {/* APPETIZING MENU SECTION */}
          <div>
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-3">
                <div className="w-1.5 h-8 bg-primary rounded-full" />
                <h2 className="text-3xl font-black text-gray-900">{t('exploreMenu')}</h2>
              </div>
            </div>

            {/* Multi-Row Category Container */}
            <div className="mb-10">
              <div className="flex flex-wrap justify-center gap-2 md:gap-3">
                {[
                  { id: "starter" as const, key: "categoryStarters", emoji: "🥗" },
                  { id: "indian-bread" as const, key: "categoryBreads", emoji: "🥖" },
                  { id: "rice" as const, key: "categoryRice", emoji: "🍚" },
                  { id: "dal" as const, key: "categoryDals", emoji: "🍲" },
                  { id: "raita" as const, key: "categoryRaitas", emoji: "🥒" },
                  { id: "noodles" as const, key: "categoryNoodles", emoji: "🍜" },
                  { id: "ice-cream" as const, key: "categoryDesserts", emoji: "🍦" },
                ].map((tab) => {
                  const isActive = activeTab === tab.id;
                  const count = menuItems.filter(i => i.category === tab.id).length;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`flex items-center gap-2 px-3 md:px-5 py-2 md:py-3 rounded-2xl font-black text-[10px] md:text-sm uppercase tracking-tight transition-all duration-300 border-2 ${isActive
                        ? "bg-primary border-primary text-white shadow-lg shadow-primary/20 scale-105"
                        : "bg-white border-gray-100 text-gray-500 hover:border-gray-300"
                        }`}
                    >
                      <span className="text-base">{tab.emoji}</span>
                      <span className="whitespace-nowrap">{t(tab.key)}</span>
                      <span className={`px-2 py-0.5 rounded-lg text-[9px] ${isActive ? "bg-white/20 text-white" : "bg-gray-100 text-gray-400"}`}>
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Menu Items Responsive Grid */}
            {menuLoading ? (
              <div className="flex flex-col items-center justify-center py-20 bg-white rounded-3xl border border-dashed border-gray-200">
                <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4" />
                <p className="text-gray-400 font-bold uppercase tracking-widest text-xs">Curating Flavors...</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                {menuItems
                  .filter((item) => item.category === activeTab)
                  .map((item) => (
                    <MenuCard
                      key={item.id}
                      item={item}
                      currentLang={currentLang}
                      t={t}
                      sessionClosed={sessionClosed}
                      isMenuUnlocked={isMenuUnlocked}
                      billRequested={billRequested}
                      addToCart={addToCart}
                    />
                  ))}
              </div>
            )}
          </div>

          {/* Expanded Item Modal */}
          {expandedItem && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
              <div className="bg-white rounded-2xl p-6 max-w-md mx-4 shadow-2xl">
                {(() => {
                  const item = menuItems.find(m => m.name === expandedItem);
                  if (!item) return null;

                  return (
                    <ExpandedItemModalContent
                      item={item}
                      currentLang={currentLang}
                      t={t}
                      sessionClosed={sessionClosed}
                      isMenuUnlocked={isMenuUnlocked}
                      billRequested={billRequested}
                      addToCart={addToCart}
                      onClose={() => setExpandedItem(null)}
                    />
                  );
                })()}
              </div>
            </div>
          )}

          {/* Extra Order Confirmation Modal */}
          {showExtraConfirm && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
              <div className="bg-white rounded-3xl p-8 max-w-md mx-4 shadow-2xl">
                <h3 className="text-2xl font-bold text-gray-800 mb-4">Add Extra Items?</h3>
                <p className="text-gray-600 mb-6">Add these items to your existing order?</p>
                <div className="flex gap-4">
                  <button
                    onClick={() => setShowExtraConfirm(false)}
                    className="flex-1 px-6 py-3 bg-gray-200 text-gray-800 font-semibold rounded-xl hover:bg-gray-300 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={placeExtraOrder}
                    disabled={loading}
                    className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white font-semibold rounded-xl hover:from-blue-600 hover:to-purple-700 transition-all disabled:opacity-50"
                  >
                    {loading ? "Sending..." : "Confirm Add"}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Bill Confirmation Modal */}
          {showBillConfirm && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
              <div className="bg-white rounded-3xl p-8 max-w-md mx-4 shadow-2xl">
                <h3 className="text-2xl font-bold text-gray-800 mb-4">Request Bill & Close Session</h3>
                <p className="text-gray-600 mb-6">Request the bill and close your session? The chef will need to approve before you can download.</p>
                <div className="flex gap-4">
                  <button
                    onClick={() => setShowBillConfirm(false)}
                    className="flex-1 px-6 py-3 bg-gray-200 text-gray-800 font-semibold rounded-xl hover:bg-gray-300 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={generateBill}
                    disabled={loading}
                    className="flex-1 px-6 py-3 bg-gradient-to-r from-red-500 to-orange-600 text-white font-semibold rounded-xl hover:from-red-600 hover:to-orange-700 transition-all disabled:opacity-50"
                  >
                    {loading ? "Requesting..." : "Request Bill"}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Cart Modal */}
          {showCartModal && (
            <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-300">
              <div className="bg-white rounded-[3rem] p-8 md:p-10 max-w-xl w-full max-h-[85vh] overflow-y-auto shadow-2xl border border-gray-100 animate-in slide-in-from-bottom-8 duration-500">
                <div className="flex items-center justify-between mb-10">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 bg-gray-50 rounded-[1.5rem] flex items-center justify-center text-3xl shadow-sm border border-gray-100">
                      🛒
                    </div>
                    <div>
                      <h2 className="text-3xl font-black text-gray-900">{t('yourCart')}</h2>
                      <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-0.5">Summary of Selection</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowCartModal(false)}
                    className="w-12 h-12 flex items-center justify-center rounded-2xl hover:bg-gray-50 text-gray-400 hover:text-gray-900 transition-all text-2xl"
                  >
                    ✕
                  </button>
                </div>

                {cart.length === 0 ? (
                  <div className="py-16 text-center">
                    {isSessionMode ? (
                      <div className="animate-in fade-in zoom-in duration-500">
                        {billRequested ? (
                          <>
                            <div className="text-6xl mb-6">🧾</div>
                            <h3 className="text-2xl font-black text-gray-900 mb-2">
                              {billStatus === "pending" ? "Bill Request Pending" : "Bill Approved"}
                            </h3>
                            <p className="text-gray-500 font-medium max-w-xs mx-auto mb-8">
                              {billStatus === "pending"
                                ? "The chef is reviewing your request. Please wait a moment."
                                : "Your digital bill is ready! You can download it below."
                              }
                            </p>
                          </>
                        ) : (
                          <>
                            <div className="text-6xl mb-6">🥘</div>
                            <h3 className="text-2xl font-black text-gray-900 mb-2">Order in Progress</h3>
                            <p className="text-gray-500 font-medium max-w-xs mx-auto mb-8">Your items are being prepared. Feel free to add more delicious bites!</p>
                          </>
                        )}

                        <div className="mt-10 space-y-3">
                          {billRequested && billStatus === "accepted" && (
                            <button
                              onClick={() => window.location.href = `/bill/${currentSessionId}`}
                              className="w-full py-5 bg-emerald-500 hover:bg-emerald-600 text-white font-black rounded-2xl transition-all duration-300 shadow-xl shadow-emerald-500/25 flex items-center justify-center gap-3 uppercase tracking-widest text-sm"
                            >
                              📥 Download Digital Bill
                            </button>
                          )}

                          {!billRequested && (
                            <button
                              onClick={() => {
                                setShowBillConfirm(true);
                                setShowCartModal(false);
                              }}
                              className="w-full py-5 bg-rose-500 hover:bg-rose-600 text-white font-black rounded-2xl transition-all duration-300 shadow-xl shadow-rose-500/25 flex items-center justify-center gap-3 uppercase tracking-widest text-sm"
                            >
                              Request Bill
                            </button>
                          )}

                          <button
                            onClick={() => setShowCartModal(false)}
                            className="w-full py-5 bg-gray-100 hover:bg-gray-200 text-gray-600 font-black rounded-2xl transition-all duration-300 flex items-center justify-center gap-3 uppercase tracking-widest text-sm"
                          >
                            Return to Menu
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="text-6xl mb-6 grayscale opacity-20">🥡</div>
                        <p className="text-gray-400 font-bold uppercase tracking-widest text-xs">Your basket is currently empty</p>
                        <button
                          onClick={() => setShowCartModal(false)}
                          className="mt-8 px-8 py-4 bg-gray-900 text-white font-black rounded-2xl hover:bg-primary transition-all uppercase tracking-widest text-xs"
                        >
                          Back to Menu
                        </button>
                      </>
                    )}
                  </div>
                ) : (
                  <>
                    <div className="space-y-4 mb-10">
                      {cart.map((item) => (
                        <div key={item.id} className="group flex items-center justify-between p-3 md:p-5 bg-gray-50/50 border border-gray-100 rounded-[1.5rem] md:rounded-[2rem] hover:bg-white hover:border-primary/20 hover:shadow-xl hover:shadow-primary/5 transition-all duration-300">
                          <div className="flex items-center gap-3 md:gap-4 flex-1 min-w-0">
                            <div className="w-12 h-12 md:w-16 md:h-16 rounded-xl overflow-hidden bg-gray-200 shrink-0 shadow-sm border border-gray-100">
                              <img src={menuItems.find(m => m.name === item.name)?.image} className="w-full h-full object-cover" alt={item.name} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="font-black text-gray-900 text-sm md:text-lg leading-tight truncate">
                                {currentLang === "mr" && menuItems.find(m => m.name === item.name)?.mr_name ? menuItems.find(m => m.name === item.name)?.mr_name : item.name}
                              </div>
                              <div className="flex flex-wrap items-center gap-1.5 md:gap-3 mt-0.5 md:mt-1.5">
                                <span className="px-2 md:px-3 py-0.5 md:py-1 bg-white border border-gray-200 rounded-lg md:rounded-xl text-[8px] md:text-[10px] font-black text-gray-400 uppercase tracking-tighter">
                                  {t(item.portion.toLowerCase())}
                                </span>
                                {item.spiceLevel && (
                                  <span className="px-2 md:px-3 py-0.5 md:py-1 bg-rose-50 border border-rose-100 rounded-lg md:rounded-xl text-[8px] md:text-[10px] font-black text-rose-500 uppercase tracking-tighter">
                                    {item.spiceLevel}
                                  </span>
                                )}
                                <span className="text-[10px] md:text-sm font-bold text-primary whitespace-nowrap">₹{item.price} × {item.quantity}</span>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 md:gap-4 ml-3">
                            <span className="text-sm md:text-xl font-black text-gray-900">₹{item.price * item.quantity}</span>
                            <button
                              onClick={() => removeFromCart(item.id)}
                              className="w-8 h-8 md:w-10 md:h-10 flex items-center justify-center bg-white border border-gray-100 text-gray-400 hover:text-rose-500 hover:border-rose-100 rounded-lg md:rounded-xl transition-all disabled:opacity-50"
                              disabled={sessionClosed}
                            >
                              ✕
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Cart Summary Header */}
                    <div className="bg-gray-900 rounded-[1.5rem] md:rounded-[2.5rem] p-5 md:p-8 text-white space-y-4 md:space-y-6 shadow-2xl shadow-gray-900/20">
                      <div className="flex justify-between items-end">
                        <div className="flex flex-col">
                          <span className="text-[8px] md:text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em] mb-1">{t('totalPayable')}</span>
                          <span className="text-xs md:text-lg font-medium text-white/60">Incl. all taxes</span>
                        </div>
                        <span className="text-3xl md:text-5xl font-black tracking-tighter text-white">₹{calculateTotal()}</span>
                      </div>

                      {/* Status Badges within Summary */}
                      {billRequested && billStatus === "pending" && (
                        <div className="px-6 py-4 bg-white/10 border border-white/10 rounded-2xl flex items-center gap-4">
                          <div className="w-8 h-8 border-2 border-amber-400 border-t-transparent rounded-full animate-spin shrink-0" />
                          <p className="text-sm font-bold text-amber-400">Bill request is currently pending chef approval...</p>
                        </div>
                      )}

                      {/* Action Buttons */}
                      <div className="grid gap-3 pt-2">
                        {billRequested && billStatus === "accepted" && (
                          <button
                            onClick={() => window.location.href = `/bill/${currentSessionId}`}
                            disabled={loading}
                            className="w-full py-5 bg-emerald-500 hover:bg-emerald-600 text-white font-black rounded-2xl transition-all duration-300 shadow-lg shadow-emerald-500/30 flex items-center justify-center gap-3 uppercase tracking-widest text-sm"
                          >
                            {loading ? "Preparing..." : (
                              <>
                                📥 Download Digital Bill
                              </>
                            )}
                          </button>
                        )}

                        {!isSessionMode ? (
                          <button
                            onClick={() => {
                              placeNewOrder();
                              setShowCartModal(false);
                            }}
                            disabled={loading || !customerName || !numberOfPeople || !tableNumberFromUrl || cart.length === 0}
                            className="w-full py-5 bg-primary hover:bg-primary-hover text-white font-black rounded-2xl transition-all duration-300 shadow-xl shadow-primary/30 flex items-center justify-center gap-3 uppercase tracking-widest text-sm disabled:bg-gray-800 disabled:text-gray-600 disabled:shadow-none"
                          >
                            {loading ? "Submitting..." : t('placeOrder')}
                          </button>
                        ) : !sessionClosed && (
                          <div className="grid gap-3 pt-2">
                            <button
                              onClick={() => {
                                setShowExtraConfirm(true);
                                setShowCartModal(false);
                              }}
                              disabled={loading || cart.length === 0}
                              className="w-full py-5 bg-primary hover:bg-primary-hover text-white font-black rounded-2xl transition-all duration-300 shadow-xl shadow-primary/30 flex items-center justify-center gap-3 uppercase tracking-widest text-sm disabled:opacity-50"
                            >
                              {loading ? "Adding..." : "Add Items to Order"}
                            </button>
                            <button
                              onClick={() => {
                                setShowBillConfirm(true);
                                setShowCartModal(false);
                              }}
                              className="w-full py-5 bg-white border-2 border-rose-500 text-rose-500 hover:bg-rose-50 font-black rounded-2xl transition-all duration-300 flex items-center justify-center gap-2 uppercase tracking-widest text-sm"
                            >
                              Request Bill
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Floating Action Button (FAB) - For Cart Summary */}
      <button
        onClick={() => setShowCartModal(true)}
        className={`fixed bottom-6 right-6 z-50 md:hidden flex items-center gap-3 bg-gray-900 text-white px-6 py-4 rounded-full shadow-2xl shadow-gray-900/40 transition-all active:scale-90 border border-white/10 ${cart.length === 0 ? 'opacity-0 translate-y-20 pointer-events-none' : 'opacity-100 translate-y-0'}`}
      >
        <div className="relative">
          <span className="text-2xl">🛒</span>
          <span className="absolute -top-2 -right-2 bg-primary text-white text-[10px] font-black w-5 h-5 rounded-full flex items-center justify-center border-2 border-gray-900">
            {cart.length}
          </span>
        </div>
        <div className="flex flex-col items-start leading-none">
          <span className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-0.5">View Cart</span>
          <span className="text-sm font-black">₹{cart.reduce((sum, item) => sum + item.price * item.quantity, 0)}</span>
        </div>
      </button>

      {/* Dynamic "Place Order" Floating Bar/Button - Auto-Hide when cart open or locked */}
      <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-[90%] max-w-md transition-all duration-500 transform ${(cart.length > 0 && !showCartModal && !billRequested) ? 'translate-y-0 opacity-100' : 'translate-y-20 opacity-0 pointer-events-none'}`}>
        <button
          onClick={() => setShowCartModal(true)}
          className="w-full bg-primary hover:bg-primary-hover text-white py-5 rounded-2xl shadow-2xl shadow-primary/40 flex items-center justify-between px-8 group overflow-hidden relative"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
          <div className="flex flex-col items-start">
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/60 mb-1">Items in Cart: {cart.length}</span>
            <span className="text-xl font-black">₹{cart.reduce((sum, item) => sum + item.price * item.quantity, 0)}</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm font-black uppercase tracking-widest bg-white/20 px-4 py-2 rounded-xl">Place Order</span>
            <span className="text-2xl">⚡</span>
          </div>
        </button>
      </div>

      {/* External Download Bill Button - Floating when locked & approved */}
      {
        billRequested && billStatus === "accepted" && (
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-[90%] max-w-md animate-in slide-in-from-bottom-5 duration-500">
            <button
              onClick={() => window.location.href = `/bill/${currentSessionId}`}
              className="w-full bg-emerald-500 hover:bg-emerald-600 text-white py-5 rounded-2xl shadow-2xl shadow-emerald-500/40 flex items-center justify-between px-8 group relative overflow-hidden"
            >
              <div className="flex flex-col items-start text-left">
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/60 mb-1">Bill is Ready</span>
                <span className="text-lg font-black uppercase">Download Digital Bill</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-2xl">📥</span>
              </div>
            </button>
          </div>
        )
      }
    </div >
  );
}

