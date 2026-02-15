"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  doc,
  updateDoc,
  addDoc,
  deleteDoc,
  getDocs,
  QueryDocumentSnapshot,
} from "firebase/firestore";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { db, auth, serverTimestamp } from "@/lib/firebase";
import { OrderItem, MenuItem, Order, ExtraBatch } from "@/types";

function getStatusColor(status: Order["status"]) {
  switch (status) {
    case "waiting":
      return "bg-amber-500/20 text-amber-500 border border-amber-500/30";
    case "preparing":
      return "bg-blue-500/20 text-blue-500 border border-blue-500/30";
    case "served":
      return "bg-emerald-500/20 text-emerald-500 border border-emerald-500/30";
    default:
      return "bg-slate-700 text-slate-400";
  }
}

function getStatusStyles(status: Order["status"], sessionStatus: string) {
  if (sessionStatus === "bill-requested") {
    return "border-rose-500 shadow-[0_0_20px_rgba(244,63,94,0.3)] animate-pulse-slow border-2";
  }
  switch (status) {
    case "waiting":
      return "border-amber-500/40 border-2";
    case "preparing":
      return "border-blue-500/40 border-2";
    case "served":
      return "border-emerald-500/40 border-2";
    default:
      return "border-slate-700 border-2";
  }
}

function formatDate(timestamp: Order["createdAt"]) {
  if (!timestamp || !timestamp.toDate) return "N/A";
  return timestamp.toDate().toLocaleString("en-IN", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const mapDocToOrder = (docSnap: QueryDocumentSnapshot): Order => {
  const data = docSnap.data();
  return {
    id: docSnap.id,
    customerName: data.customerName || "",
    numberOfPeople: data.numberOfPeople || 0,
    tableNumber: data.tableNumber || 0,
    sessionId: data.sessionId || "",
    sessionStatus: data.sessionStatus || "active",
    sessionItems: data.sessionItems || [],
    sessionTotal: data.sessionTotal || 0,
    status: data.status || "waiting",
    createdAt: data.createdAt,
    updatedAt: data.updatedAt || data.createdAt,
    extrasBatches: data.extrasBatches || [],
    billGeneratedAt: data.billGeneratedAt,
    billStatus: data.billStatus || null,
    billRequestedAt: data.billRequestedAt,
    hasNewExtras: data.hasNewExtras || false,
  };
};

const mapDocToMenuItem = (docSnap: QueryDocumentSnapshot): MenuItem => {
  const rawData = docSnap.data();

  const data = {
    name: typeof rawData.name === 'object' ? rawData.name.stringValue : rawData.name,
    half: typeof rawData.half === 'object' ? Number(rawData.half?.integerValue || rawData.half?.numberValue) : Number(rawData.half),
    full: typeof rawData.full === 'object' ? Number(rawData.full?.integerValue || rawData.full?.numberValue) : Number(rawData.full),
    image: typeof rawData.image === 'object' ? rawData.image.stringValue : rawData.image || "/images/default.jpg",
    noPortion: rawData.noPortion === true || rawData.noPortion === 'true',
    category: typeof rawData.category === 'object' ? rawData.category.stringValue : rawData.category || "individual",
  };

  return {
    id: docSnap.id,
    name: data.name || "Unnamed Item",
    price: {
      full: data.full || 0,
      half: data.half || undefined,
    },
    image: data.image,
    noPortion: data.noPortion || false,
    category: (data.category as MenuItem["category"]) || "individual",
    description: rawData.description || "",
  };
};

export default function ChefDashboard() {
  const router = useRouter();
  const [allOrders, setAllOrders] = useState<Order[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingOrder, setUpdatingOrder] = useState<string | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [selectedTableOrder, setSelectedTableOrder] = useState<Order | null>(null);
  const [expandedSessions, setExpandedSessions] = useState<Set<string>>(new Set());

  // Menu Editor States
  const [showMenuEditor, setShowMenuEditor] = useState(false);
  const [menuEditorLoading, setMenuEditorLoading] = useState(false);
  const [newMenuItem, setNewMenuItem] = useState({
    name: "",
    half: "",
    full: "",
    image: "",
    description: "",
    noPortion: false,
    category: "starter" as MenuItem["category"],
  });

  const [lang, setLang] = useState<"en" | "mr">("en");

  const translations = {
    en: {
      activeTables: "Active Tables",
      waiting: "Waiting",
      preparing: "Preparing",
      served: "Served",
      billRequested: "Bill Requested",
      forceClose: "Force Close",
      tables: "TABLES",
      noActiveOrders: "NO ACTIVE ORDERS",
    },
    mr: {
      activeTables: "सक्रिय टेबल्स",
      waiting: "प्रतीक्षेत",
      preparing: "तयार होत आहे",
      served: "वाढले",
      billRequested: "बिल विनंती",
      forceClose: "सत्र बंद करा",
      tables: "टेबल्स",
      noActiveOrders: "कोणतेही सक्रिय ऑर्डर नाहीत",
    }
  };

  const t = translations[lang];

  // 1. AUTH PROTECTION
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      if (!user) {
        router.replace("/chef-login?redirect=/chef");
      } else {
        setAuthChecked(true);
        console.log("✅ AUTH CHECKED - User logged in");
      }
    });
    return () => unsub();
  }, [router]);

  // 2. LOAD ALL ORDERS (REAL-TIME)
  useEffect(() => {
    if (!authChecked) return;

    console.log("🔥 LOADING ORDERS...");
    const q = query(collection(db, "orders"), orderBy("updatedAt", "desc"));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const ordersData: Order[] = snapshot.docs.map(mapDocToOrder);
        console.log("📦 ORDERS LOADED:", ordersData.length);
        setAllOrders(ordersData);
        setLoading(false);
      },
      (err) => {
        console.error("❌ ORDERS ERROR:", err);
        setError("Failed to load orders");
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [authChecked]);

  // 3. LOAD MENU ITEMS
  useEffect(() => {
    console.log("🔥 LOADING MENU...");
    const q = query(collection(db, "menu"), orderBy("name"));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        console.log("📦 RAW SNAPSHOT:", snapshot.docs.length);
        const items: MenuItem[] = snapshot.docs.map(mapDocToMenuItem);
        console.log("📦 MENU LOADED:", items.length, items);
        setMenuItems(items);
      },
      (error) => {
        console.error("❌ MENU ERROR:", error);
        setMenuItems([]);
        setError("Menu failed to load - Add items using Edit Menu button");
      }
    );
    return () => unsubscribe();
  }, []);

  // 4. GET ACTIVE TABLES
  const activeTables = allOrders.filter(
    (order) => order.sessionStatus === "active" || order.sessionStatus === "bill-requested"
  );

  const closedOrders = allOrders.filter(
    (order) => order.sessionStatus === "closed"
  );

  const updateOrderStatus = async (orderId: string, newStatus: Order["status"]) => {
    setUpdatingOrder(orderId);
    try {
      await updateDoc(doc(db, "orders", orderId), {
        status: newStatus,
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      console.error("Failed to update order status:", error);
      alert("Failed to update order status");
    } finally {
      setUpdatingOrder(null);
    }
  };

  const closeSession = async (orderId: string) => {
    const order = allOrders.find(o => o.id === orderId);
    if (!order) return;

    if (order.billStatus === "downloaded") {
      alert("Bill already downloaded.");
      return;
    }

    if (!window.confirm("Are you sure you want to force close this table?")) {
      return;
    }

    setUpdatingOrder(orderId);
    try {
      await updateDoc(doc(db, "orders", orderId), {
        sessionStatus: "closed",
        updatedAt: serverTimestamp(),
      });
      alert(`✅ Table ${order.tableNumber} session closed.`);
    } catch (error) {
      console.error("Failed to close session:", error);
      alert("Failed to close session");
    } finally {
      setUpdatingOrder(null);
    }
  };

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

  const clearClosedOrders = async () => {
    if (closedOrders.length === 0) {
      alert("No closed orders to clear");
      return;
    }

    if (!confirm(`Are you sure you want to delete all ${closedOrders.length} closed session orders? This action cannot be undone.`)) {
      return;
    }

    setUpdatingOrder("clearing");
    let successCount = 0;
    let failedOrders: string[] = [];

    try {
      for (const order of closedOrders) {
        try {
          await deleteDoc(doc(db, "orders", order.id));
          successCount++;
        } catch (itemError) {
          console.error(`Failed to delete order ${order.id}:`, itemError);
          failedOrders.push(`Table ${order.tableNumber}`);
        }
      }

      if (failedOrders.length === 0) {
        alert(`✅ Successfully cleared ${successCount} closed orders.`);
      } else {
        alert(
          `⚠️ Cleared ${successCount} orders, but failed to clear ${failedOrders.length}:\n${failedOrders.join(", ")}\n\nCheck browser console for details.`
        );
      }
    } catch (error) {
      console.error("Failed to clear closed orders:", error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      alert(`❌ Error clearing orders: ${errorMessage}\n\nCheck browser console for details.`);
    } finally {
      setUpdatingOrder(null);
    }
  };

  const addMenuItem = async () => {
    if (!newMenuItem.name.trim()) {
      alert("Please enter item name");
      return;
    }

    setMenuEditorLoading(true);
    try {
      await addDoc(collection(db, "menu"), {
        name: newMenuItem.name.trim(),
        price: {
          full: newMenuItem.full ? Number(newMenuItem.full) : 0,
          half: newMenuItem.half ? Number(newMenuItem.half) : undefined,
        },
        image: newMenuItem.image.trim() || "/images/default.jpg",
        description: newMenuItem.description.trim(),
        noPortion: newMenuItem.noPortion,
        category: newMenuItem.category,
      });
      setNewMenuItem({
        name: "",
        half: "",
        full: "",
        image: "",
        description: "",
        noPortion: false,
        category: "starter",
      });
      alert("Item added successfully! ✨");
    } catch (error) {
      console.error("Failed to add item:", error);
      alert("Failed to add item");
    } finally {
      setMenuEditorLoading(false);
    }
  };

  const deleteMenuItem = async (itemId: string) => {
    if (!confirm(`Delete "${menuItems.find((item) => item.id === itemId)?.name}"?`))
      return;

    try {
      await deleteDoc(doc(db, "menu", itemId));
      alert("Item deleted!");
    } catch (error) {
      console.error("Failed to delete item:", error);
      alert("Failed to delete item");
    }
  };

  const bulkImportMenu = async () => {
    const newMenuItems = [
      // STARTERS
      { name: "Roasted Papad", price: 45, category: "starter" },
      { name: "Masala Papad", price: 70, category: "starter" },
      { name: "Finger Chips", price: 110, category: "starter" },
      { name: "Veg. Manchurian", price: 200, category: "starter" },
      { name: "Gobi Manchurian", price: 200, category: "starter" },
      { name: "Lemon Gobi Manchurian", price: 220, category: "starter" },
      { name: "Chinese Bhel", price: 190, category: "starter" },
      { name: "Potato Pops", price: 200, category: "starter" },
      { name: "Harabhara Kabab", price: 220, category: "starter" },
      { name: "Veg 65", price: 200, category: "starter" },
      { name: "Cheese Corn Nuggets", price: 200, category: "starter" },
      { name: "Veg. Crispy", price: 220, category: "starter" },
      { name: "Baby Corn Crispy", price: 220, category: "starter" },
      { name: "Baby Corn Chilly", price: 220, category: "starter" },
      { name: "Paneer Pakoda", price: 270, category: "starter" },
      { name: "Paneer Tikka", price: 270, category: "starter" },
      { name: "Paneer Crispy", price: 270, category: "starter" },
      { name: "Paneer Pahadi Kabab", price: 270, category: "starter" },
      { name: "Paneer Malai Kabab", price: 270, category: "starter" },
      { name: "Paneer Manchurian", price: 270, category: "starter" },
      { name: "Paneer Chilly", price: 270, category: "starter" },

      // INDIAN BREAD
      { name: "Chapati", price: 30, category: "indian-bread" },
      { name: "Bhakari", price: 35, category: "indian-bread" },
      { name: "Roti", price: 35, category: "indian-bread" },
      { name: "Butter Roti", price: 40, category: "indian-bread" },
      { name: "Naan", price: 45, category: "indian-bread" },
      { name: "Butter Naan", price: 50, category: "indian-bread" },
      { name: "Paratha", price: 45, category: "indian-bread" },
      { name: "Butter Paratha", price: 50, category: "indian-bread" },
      { name: "Garlic Naan", price: 60, category: "indian-bread" },
      { name: "Butter Garlic Naan", price: 70, category: "indian-bread" },
      { name: "Cheese Garlic Naan", price: 120, category: "indian-bread" },
      { name: "Aaloo Paratha", price: 110, category: "indian-bread" },

      // RICE
      { name: "Veg. Fried Rice", price: 210, category: "rice" },
      { name: "Singapori Fried Rice", price: 210, category: "rice" },
      { name: "Schezwan Fried Rice", price: 210, category: "rice" },
      { name: "Triple Schezwan Fried Rice", price: 240, category: "rice" },

      // DAL
      { name: "Dal Fry", price: 160, category: "dal" },
      { name: "Dal Tadka", price: 180, category: "dal" },
      { name: "Dal Kolhapuri", price: 190, category: "dal" },
      { name: "Butter Dal Fry", price: 200, category: "dal" },

      // RAITA
      { name: "Green Salad", price: 80, category: "raita" },
      { name: "Mix Raita", price: 95, category: "raita" },
      { name: "Pineapple Raita", price: 100, category: "raita" },

      // NOODLES
      { name: "Veg. Hakka Noodles", price: 220, category: "noodles" },
      { name: "Veg. Schezwan", price: 220, category: "noodles" },
      { name: "Veg. Singapori", price: 220, category: "noodles" },
      { name: "Veg. American Chopsuey", price: 240, category: "noodles" },

      // ICE CREAMS
      { name: "Vanilla / Mango / Pista", price: 65, category: "ice-cream" },
      { name: "Butter Scotch", price: 70, category: "ice-cream" },
      { name: "Mataka Kulfi", price: 80, category: "ice-cream" },
      { name: "Cassatta", price: 80, category: "ice-cream" },
      { name: "Fruit Salad with Ice Cream", price: 140, category: "ice-cream" },
    ];

    if (!confirm(`This will delete all current menu items and add ${newMenuItems.length} new items. Continue?`)) {
      return;
    }

    setMenuEditorLoading(true);
    try {
      // Delete all existing items
      const querySnapshot = await getDocs(collection(db, "menu"));
      let deletedCount = 0;
      for (const docSnap of querySnapshot.docs) {
        await deleteDoc(doc(db, "menu", docSnap.id));
        deletedCount++;
      }
      console.log(`✅ Deleted ${deletedCount} items`);

      // Add new items
      let addedCount = 0;
      for (const item of newMenuItems) {
        await addDoc(collection(db, "menu"), {
          name: item.name,
          price: {
            full: item.price,
            half: undefined,
          },
          noPortion: true,
          category: item.category,
          image: "/images/default.jpg",
        });
        addedCount++;
      }
      console.log(`✅ Added ${addedCount} items`);
      alert(`✅ Success! Deleted ${deletedCount} items and added ${addedCount} new items.`);
    } catch (error) {
      console.error("Bulk import error:", error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      alert(`❌ Error: ${errorMessage}`);
    } finally {
      setMenuEditorLoading(false);
    }
  };

  const toggleSessionExpanded = (sessionId: string) => {
    setExpandedSessions(prev => {
      const newSet = new Set(prev);
      if (newSet.has(sessionId)) {
        newSet.delete(sessionId);
      } else {
        newSet.add(sessionId);
      }
      return newSet;
    });
  };

  if (!authChecked) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 flex items-center justify-center">
        <div className="text-white text-2xl">Checking authentication...</div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 flex items-center justify-center">
        <div className="text-white text-2xl">Loading orders...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 font-sans selection:bg-blue-500/30">
      <style jsx global>{`
        @keyframes pulse-slow {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.8; transform: scale(1.02); }
        }
        .animate-pulse-slow {
          animation: pulse-slow 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }
      `}</style>

      {/* STICKY HEADER */}
      <nav className="sticky top-0 z-40 bg-slate-900/80 backdrop-blur-md border-b border-slate-800 px-6 py-4">
        <div className="max-w-screen-2xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-900/20">
              <span className="text-xl">👨‍🍳</span>
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight">Chef Dashboard</h1>
              <p className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">Kitchen Display System v2.0</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex bg-slate-800 p-1 rounded-xl border border-slate-700">
              <button
                onClick={() => setLang("en")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${lang === "en" ? "bg-blue-600 text-white shadow-lg" : "text-slate-500 hover:text-slate-300"}`}
              >
                EN
              </button>
              <button
                onClick={() => setLang("mr")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${lang === "mr" ? "bg-blue-600 text-white shadow-lg" : "text-slate-500 hover:text-slate-300"}`}
              >
                मराठी
              </button>
            </div>
            <button
              onClick={() => setShowMenuEditor(!showMenuEditor)}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${showMenuEditor
                ? "bg-slate-700 text-white border border-slate-600 shadow-inner"
                : "bg-slate-800 text-slate-300 border border-slate-700 hover:bg-slate-700"
                }`}
            >
              {showMenuEditor ? "Close Editor" : "Manage Menu"}
            </button>
            <button
              onClick={bulkImportMenu}
              disabled={menuEditorLoading}
              className="px-4 py-2 rounded-lg bg-slate-800 text-slate-300 border border-slate-700 hover:bg-slate-700 text-sm font-semibold disabled:opacity-50 transition-all"
            >
              {menuEditorLoading ? "Importing..." : "Bulk Import"}
            </button>
            <div className="h-6 w-px bg-slate-800 mx-2 hidden md:block" />
            <button
              onClick={async () => {
                await signOut(auth);
                router.replace("/chef-login");
              }}
              className="px-4 py-2 rounded-lg bg-rose-600/10 text-rose-500 border border-rose-500/20 hover:bg-rose-600 hover:text-white text-sm font-semibold transition-all"
            >
              Logout
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-screen-2xl mx-auto p-6 space-y-10">
        {error && (
          <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 p-4 rounded-xl flex items-center gap-3 animate-in slide-in-from-top-4 duration-300">
            <span className="text-xl">⚠️</span> {error}
          </div>
        )}

        {/* MENU EDITOR */}
        {showMenuEditor && (
          <section className="bg-slate-800 rounded-2xl border border-slate-700 p-8 shadow-2xl animate-in fade-in zoom-in duration-300">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-lg font-bold flex items-center gap-2">
                <span className="text-blue-400">●</span> Menu Management
                <span className="text-xs bg-slate-900 px-2 py-1 rounded text-slate-500 font-mono">
                  {menuItems.length} ITEMS
                </span>
              </h2>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Form Side */}
              <div className="lg:col-span-1 space-y-6">
                <div className="space-y-4">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Item Details</label>
                  <input
                    placeholder="Item Name"
                    value={newMenuItem.name}
                    onChange={(e) => setNewMenuItem({ ...newMenuItem, name: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-sm"
                  />
                  <div className="grid grid-cols-2 gap-4">
                    <input
                      placeholder="Half Price"
                      type="number"
                      value={newMenuItem.half}
                      onChange={(e) => setNewMenuItem({ ...newMenuItem, half: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-sm"
                    />
                    <input
                      placeholder="Full Price"
                      type="number"
                      value={newMenuItem.full}
                      onChange={(e) => setNewMenuItem({ ...newMenuItem, full: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-sm"
                    />
                  </div>
                  <input
                    placeholder="Image URL"
                    value={newMenuItem.image}
                    onChange={(e) => setNewMenuItem({ ...newMenuItem, image: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-sm"
                  />
                  <textarea
                    placeholder="Item Description (e.g. Full serves 2-3 people)"
                    value={newMenuItem.description}
                    onChange={(e) => setNewMenuItem({ ...newMenuItem, description: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-sm h-24 resize-none"
                  />
                </div>

                <div className="space-y-4">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Category</label>
                  <select
                    value={newMenuItem.category}
                    onChange={(e) => setNewMenuItem({ ...newMenuItem, category: e.target.value as any })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-sm"
                  >
                    <option value="starter">Starters</option>
                    <option value="indian-bread">Indian Bread</option>
                    <option value="rice">Rice</option>
                    <option value="dal">Dal</option>
                    <option value="raita">Raita</option>
                    <option value="noodles">Noodles</option>
                    <option value="ice-cream">Ice Cream</option>
                  </select>
                </div>

                <button
                  onClick={addMenuItem}
                  disabled={menuEditorLoading || !newMenuItem.name}
                  className="w-full py-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-lg shadow-blue-900/20 transition-all transform active:scale-95 disabled:opacity-50"
                >
                  {menuEditorLoading ? "Adding..." : "Add to Menu"}
                </button>
              </div>

              {/* Items Side */}
              <div className="lg:col-span-2 overflow-y-auto max-h-[500px] border border-slate-700 rounded-2xl bg-slate-900/50 p-4 scrollbar-thin scrollbar-thumb-slate-700">
                <div className="space-y-8">
                  {["starter", "indian-bread", "rice", "dal", "raita", "noodles", "ice-cream"].map((cat) => {
                    const items = menuItems.filter(item => item.category === cat);
                    if (items.length === 0) return null;
                    return (
                      <div key={cat} className="space-y-4">
                        <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-600">{cat}</h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {items.map((item) => (
                            <div key={item.id} className="flex items-center justify-between p-3 bg-slate-800 rounded-xl border border-slate-700 group hover:border-slate-500 transition-all">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-lg overflow-hidden bg-slate-700">
                                  <img src={item.image} className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all" />
                                </div>
                                <div>
                                  <p className="text-sm font-bold truncate w-32">{item.name}</p>
                                  <p className="text-[10px] text-slate-500">₹{item.price.full}</p>
                                </div>
                              </div>
                              <button
                                onClick={() => deleteMenuItem(item.id)}
                                className="w-8 h-8 rounded-lg bg-slate-900/50 text-slate-600 hover:bg-rose-600 hover:text-white transition-all transition-colors"
                              >
                                ✕
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </section>
        )}

        {/* ACTIVE DISPLAY SYSTEM */}
        <section>
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl font-black text-white flex items-center gap-4">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
              </span>
              {t.activeTables}
              <span className="px-3 py-1 bg-slate-800 border border-slate-700 rounded-full text-sm text-slate-400 font-mono">
                {activeTables.length} {t.tables}
              </span>
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6">
            {activeTables.map((order) => (
              <div
                key={order.id}
                onClick={() => {
                  setSelectedTableOrder(order);
                  if (order.hasNewExtras) acknowledgeExtras(order.id);
                }}
                className={`relative group bg-slate-800 border border-slate-700 rounded-[2rem] p-6 cursor-pointer transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl ${getStatusStyles(order.status, order.sessionStatus)}`}
              >
                {/* Header Info */}
                <div className="flex items-start justify-between mb-8">
                  <div>
                    <span className="text-6xl font-black text-white tracking-tighter leading-none">{order.tableNumber}</span>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-2">{order.customerName || "Walk-in"}</p>
                  </div>
                  {order.hasNewExtras && (
                    <div className="bg-rose-500 text-white p-2 rounded-xl text-[10px] font-black animate-bounce shadow-lg shadow-rose-900/20">
                      NEW EXTRAS
                    </div>
                  )}

                  {/* Force Close Button - Permanently visible as per requirement */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      closeSession(order.id);
                    }}
                    className="absolute top-4 right-4 w-10 h-10 flex items-center justify-center rounded-2xl bg-rose-600 shadow-lg shadow-rose-900/40 text-white hover:bg-rose-700 transition-all z-20"
                    title={t.forceClose}
                  >
                    <span className="text-lg">✕</span>
                  </button>
                </div>

                {/* Stats */}
                <div className="space-y-4 mb-8">
                  <div className="flex items-center gap-2 text-xs text-slate-400">
                    <span className="bg-slate-900 rounded-lg px-2 py-1 font-mono">{order.sessionItems.length} ITEMS</span>
                    <span className="bg-slate-900 rounded-lg px-2 py-1 font-mono">{order.numberOfPeople} PEOPLE</span>
                  </div>
                </div>

                {/* Footer Status & Quick Action */}
                <div className="flex flex-col gap-4 pt-4 border-t border-slate-700/50">
                  <div className="flex items-center justify-between">
                    <div className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest ${getStatusColor(order.status)}`}>
                      {order.sessionStatus === "bill-requested" ? t.billRequested : t[order.status as keyof typeof t]}
                    </div>
                    <div className="text-[10px] text-slate-500 font-bold">
                      {formatDate(order.updatedAt).split(',')[1]}
                    </div>
                  </div>

                  {order.status !== "served" && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        updateOrderStatus(order.id, "served");
                      }}
                      className="w-full py-3 bg-emerald-500/10 hover:bg-emerald-500 text-emerald-500 hover:text-white border border-emerald-500/20 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
                    >
                      Mark Served
                    </button>
                  )}
                </div>

                {/* Bill Requested Overlay - Moved left to avoid Force Close button */}
                {order.sessionStatus === "bill-requested" && (
                  <div className="absolute top-4 right-16 text-2xl animate-pulse z-10 bg-rose-500/20 p-2 rounded-xl border border-rose-500/30">
                    🧾
                  </div>
                )}
              </div>
            ))}
          </div>

          {activeTables.length === 0 && (
            <div className="py-20 bg-slate-800/50 border border-dashed border-slate-700 rounded-[3rem] text-center">
              <div className="text-4xl mb-4 opacity-20">📭</div>
              <p className="text-slate-500 font-bold uppercase tracking-widest text-sm">{t.noActiveOrders}</p>
            </div>
          )}
        </section>

        {/* COMPACT HISTORY SYSTEM */}
        {closedOrders.length > 0 && (
          <section className="bg-slate-900/50 rounded-[3rem] border border-slate-800 p-8">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-xl font-bold text-slate-400 flex items-center gap-3">
                <span className="text-2xl">📋</span> Session History
              </h2>
              <button
                onClick={clearClosedOrders}
                className="text-[10px] font-black uppercase tracking-widest text-rose-500 hover:text-rose-400 transition-all py-2 px-4 bg-rose-500/10 border border-rose-500/20 rounded-xl"
              >
                Clear Archives
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="text-[10px] font-black text-slate-600 uppercase tracking-[0.2em] border-b border-slate-800">
                    <th className="pb-4 px-4">Table</th>
                    <th className="pb-4 px-4">Customer</th>
                    <th className="pb-4 px-4">Time</th>
                    <th className="pb-4 px-4">Items</th>
                    <th className="pb-4 px-4">Total</th>
                    <th className="pb-4 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {closedOrders.map((order) => (
                    <tr key={order.id} className="group hover:bg-slate-800/30 transition-all text-sm font-medium">
                      <td className="py-4 px-4 text-lg font-bold">#{order.tableNumber}</td>
                      <td className="py-4 px-4 text-slate-400">{order.customerName}</td>
                      <td className="py-4 px-4 text-slate-500 text-xs">{formatDate(order.createdAt).split(',')[0]}</td>
                      <td className="py-4 px-4">
                        <span className="bg-slate-800 px-2 py-1 rounded text-xs text-slate-400">{order.sessionItems.length} items</span>
                      </td>
                      <td className="py-4 px-4 font-bold text-emerald-500">₹{order.sessionTotal}</td>
                      <td className="py-4 px-4 text-right">
                        <a
                          href={`/bill/${order.id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-xs font-bold rounded-lg transition-all"
                        >
                          Bill
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </main>

      {/* DETAIL MODAL (Preserved logic with SaaS styling) */}
      {selectedTableOrder && (
        <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-xl flex items-center justify-center z-50 p-4 animate-in fade-in duration-300">
          <div className="bg-slate-900 border border-slate-700 w-full max-w-4xl max-h-[90vh] rounded-[2.5rem] overflow-hidden shadow-2xl flex flex-col animate-in zoom-in-95 duration-300">
            {/* Modal Header */}
            <div className={`p-8 flex items-center justify-between border-b ${getStatusStyles(selectedTableOrder.status, selectedTableOrder.sessionStatus)}`}>
              <div className="flex items-center gap-6">
                <div className="text-7xl font-black text-white leading-none tracking-tighter">
                  {selectedTableOrder.tableNumber}
                </div>
                <div>
                  <h2 className="text-2xl font-bold">{selectedTableOrder.customerName}</h2>
                  <div className="flex items-center gap-3 mt-2">
                    <span className="text-xs uppercase tracking-widest text-slate-500 font-bold">{selectedTableOrder.numberOfPeople} GUESTS</span>
                    <span className="h-4 w-px bg-slate-800" />
                    <span className="text-xs uppercase tracking-widest text-slate-500 font-bold">ACTIVE FOR {Math.floor((Date.now() - (selectedTableOrder.createdAt?.toMillis?.() || Date.now())) / 60000)} MIN</span>
                  </div>
                </div>
              </div>
              <button
                onClick={() => setSelectedTableOrder(null)}
                className="w-12 h-12 flex items-center justify-center rounded-2xl bg-slate-800 hover:bg-rose-500 text-slate-400 hover:text-white transition-all shadow-lg"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-8 lg:p-12 space-y-10">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                {/* Items List Side */}
                <div className="space-y-8">
                  <div className="space-y-4">
                    <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-500">Order Summary</h3>
                    <div className="space-y-3">
                      {selectedTableOrder.sessionItems.map((item, idx) => (
                        <div key={item.id || idx} className="flex items-center justify-between p-4 bg-slate-800/50 rounded-2xl border border-slate-800/50">
                          <div className="flex items-center gap-4">
                            <span className="w-8 h-8 flex items-center justify-center bg-slate-900 rounded-lg text-xs font-bold text-slate-500">{item.quantity}×</span>
                            <span className="font-bold text-slate-200">{item.name} <span className="text-[10px] text-slate-500 ml-1 font-normal opacity-50">({item.portion})</span></span>
                          </div>
                          <span className="font-mono text-slate-400 text-sm">₹{item.price * item.quantity}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {selectedTableOrder.extrasBatches && selectedTableOrder.extrasBatches.length > 0 && (
                    <div className="space-y-4">
                      <h3 className="text-xs font-black uppercase tracking-[0.2em] text-amber-500/70">Extra Add-ons</h3>
                      <div className="space-y-4">
                        {selectedTableOrder.extrasBatches.map((batch) => (
                          <div key={batch.batchId} className="p-4 bg-amber-500/5 border border-amber-500/10 rounded-2xl">
                            <p className="text-[10px] font-bold text-amber-500/50 mb-3 ml-2 uppercase tracking-widest">
                              BATCH {batch.timestamp?.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </p>
                            <div className="space-y-2">
                              {batch.items.map((item, i) => (
                                <div key={i} className="flex items-center justify-between text-sm">
                                  <span className="text-slate-300">{item.quantity}× {item.name}</span>
                                  <span className="text-slate-500">₹{item.price * item.quantity}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Controls Side */}
                <div className="space-y-8">
                  <div className="p-8 bg-blue-600 rounded-[2rem] text-white shadow-2xl shadow-blue-500/20">
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-60 mb-2">Grand Total</p>
                    <div className="text-6xl font-black tracking-tighter mb-8">₹{selectedTableOrder.sessionTotal}</div>

                    <div className="space-y-3">
                      <div className="space-y-3">
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-60 mb-2">Kitchen Progress</p>
                        {selectedTableOrder.status !== "served" && (
                          <button
                            onClick={() => {
                              updateOrderStatus(selectedTableOrder.id, "served");
                              setSelectedTableOrder({ ...selectedTableOrder, status: "served" });
                            }}
                            className="w-full py-4 bg-emerald-500 text-white rounded-xl text-xs font-black uppercase tracking-widest shadow-xl flex items-center justify-center gap-2"
                          >
                            ✅ Mark Served
                          </button>
                        )}
                        {selectedTableOrder.status === "served" && (
                          <div className="w-full py-4 bg-blue-700/30 border border-blue-500/30 text-blue-200 rounded-xl text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2">
                            ✓ Order Completed
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3 pt-8 border-t border-slate-800">
                    {selectedTableOrder.sessionStatus === "bill-requested" && selectedTableOrder.billStatus !== "accepted" && (
                      <button
                        onClick={() => {
                          acceptAndGenerateBill(selectedTableOrder.id);
                          setSelectedTableOrder({ ...selectedTableOrder, billStatus: "accepted" });
                        }}
                        className="w-full py-5 bg-emerald-500 hover:bg-emerald-600 text-white font-black rounded-2xl transition-all shadow-xl shadow-emerald-500/20 uppercase tracking-widest text-xs"
                      >
                        💳 Accept & Push Bill
                      </button>
                    )}

                    {/* Redundant Force Close button removed from modal as per requirement */}

                    {selectedTableOrder.sessionStatus === "closed" && (
                      <a
                        href={`/bill/${selectedTableOrder.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-center w-full py-5 bg-blue-600/10 text-blue-500 font-black rounded-2xl transition-all border border-blue-500/20 uppercase tracking-widest text-xs"
                      >
                        📄 View Generated Bill
                      </a>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
