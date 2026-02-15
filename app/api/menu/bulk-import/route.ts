import { db } from "@/lib/firebase";
import {
  collection,
  getDocs,
  deleteDoc,
  doc,
  addDoc,
} from "firebase/firestore";
import { NextRequest, NextResponse } from "next/server";

const MENU_ITEMS = [
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

export async function POST(request: NextRequest) {
  try {
    console.log("🗑️ Clearing existing menu items...");

    // Delete all existing items
    const querySnapshot = await getDocs(collection(db, "menu"));
    let deletedCount = 0;
    for (const docSnap of querySnapshot.docs) {
      await deleteDoc(doc(db, "menu", docSnap.id));
      deletedCount++;
    }
    console.log(`✅ Deleted ${deletedCount} items`);

    console.log("➕ Adding new menu items...");

    // Add all new items
    let addedCount = 0;
    for (const item of MENU_ITEMS) {
      await addDoc(collection(db, "menu"), {
        name: item.name,
        half: item.price,
        full: item.price,
        noPortion: true,
        category: item.category,
        image: "/images/default.jpg",
      });
      addedCount++;
    }

    console.log(`✅ Successfully added ${addedCount} items`);

    return NextResponse.json(
      {
        success: true,
        message: `Menu updated! Deleted ${deletedCount} items and added ${addedCount} new items.`,
        deletedCount,
        addedCount,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("❌ Error updating menu:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  return NextResponse.json(
    {
      message: "Menu bulk import API",
      usage: "POST to this endpoint to import all 57 menu items",
      itemsToAdd: MENU_ITEMS.length,
    },
    { status: 200 }
  );
}
