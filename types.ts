// types.ts - Shared TypeScript types for the restaurant ordering system

export type OrderItem = {
  id: string;
  name: string;
  portion: "Half" | "Full" | "N/A";
  price: number;
  quantity: number;
  spiceLevel?: "Sweet" | "Medium" | "Spicy";
};

export type MenuItem = {
  id: string;
  name: string;
  mr_name?: string;
  description?: string;
  mr_description?: string;
  price: {
    full: number;
    half?: number;
  };
  foodType?: "Veg" | "Non-Veg";
  spiceLevel?: "Sweet" | "Medium" | "Spicy";
  image: string;
  noPortion?: boolean;
  category: "starter" | "indian-bread" | "rice" | "dal" | "raita" | "noodles" | "ice-cream";
};

// NEW: ExtraBatch type for separate extra orders
export type ExtraBatch = {
  batchId: string;
  items: OrderItem[];
  batchTotal: number;
  timestamp: any; // Firestore Timestamp
};

export type Order = {
  id: string;
  customerName: string;
  numberOfPeople: number;
  tableNumber: number;
  sessionId: string; // e.g. "table5_rajesh"
  sessionStatus: "active" | "bill-requested" | "closed";
  sessionItems: OrderItem[]; // ONLY initial order items (never mix extras)
  sessionTotal: number;
  status: "waiting" | "preparing" | "served"; // current kitchen status for the latest batch
  createdAt: any; // Firestore Timestamp
  updatedAt: any; // Firestore Timestamp
  // NEW: Extras batches array
  extrasBatches?: ExtraBatch[]; // array of extra orders
  billGeneratedAt?: any; // Firestore Timestamp
  billStatus?: "pending" | "accepted" | "downloaded" | null;
  billRequestedAt?: any; // Firestore Timestamp when customer requests bill
  hasNewExtras?: boolean; // Flag to indicate unacknowledged extra items
};
