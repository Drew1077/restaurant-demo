// MENU UPDATE SCRIPT - Copy-paste this entire code into your browser console
// Open browser DevTools (F12) on the Chef Dashboard and paste this code

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

// Import Firebase SDK (already loaded in the page)
const { db } = window.__FIREBASE__ || {};
if (!db) {
  // Try alternative approach - use the Firebase instances from the page
  console.log("⚠️ Firebase not found directly. Using dynamic import...");
}

(async () => {
  try {
    // Get Firebase imports from the window or require them
    const { collection, getDocs, deleteDoc, doc, addDoc } = await import('https://www.gstatic.com/firebasejs/10.8.0/firestore.js');
    const { db } = await import('../lib/firebase.ts');

    console.log("🗑️ Clearing existing menu...");
    
    // Delete all existing menu items
    const querySnapshot = await getDocs(collection(db, "menu"));
    let deletedCount = 0;
    for (const docSnapshot of querySnapshot.docs) {
      await deleteDoc(doc(db, "menu", docSnapshot.id));
      deletedCount++;
    }
    console.log(`✅ Deleted ${deletedCount} items`);

    console.log("➕ Adding new menu items...");
    
    // Add all new items
    let addedCount = 0;
    for (const item of newMenuItems) {
      await addDoc(collection(db, "menu"), {
        name: item.name,
        half: item.price,
        full: item.price,
        noPortion: true,
        category: item.category,
        image: "/images/default.jpg"
      });
      addedCount++;
      console.log(`✅ Added: ${item.name} (${item.category})`);
    }

    console.log(`\n✅ SUCCESS! Updated menu with ${addedCount} items`);
    alert(`✅ Menu updated successfully!\n- Deleted ${deletedCount} items\n- Added ${addedCount} new items\n\nRefresh the page to see changes.`);
  } catch (error) {
    console.error("❌ Error updating menu:", error);
    alert(`❌ Error: ${error.message}\n\nNote: This script requires being run on a page where Firebase is already loaded.`);
  }
})();
