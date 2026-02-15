"use client";

import { useState, useEffect, Suspense } from "react";
import React from "react";
import { useParams, useRouter } from "next/navigation";
import { doc, getDoc, onSnapshot, updateDoc } from "firebase/firestore";
import { db, serverTimestamp } from "@/lib/firebase";
import { Order } from "@/types";
import jsPDF from "jspdf";

export default function BillPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center">Loading bill...</div>}>
      <BillPageInner />
    </Suspense>
  );
}

function BillPageInner() {
  const params = useParams();
  const router = useRouter();
  const orderId = params.orderId as string;
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [downloadingPDF, setDownloadingPDF] = useState(false);

  useEffect(() => {
    if (!orderId) {
      setError("Invalid order ID");
      setLoading(false);
      return;
    }

    // Set up real-time listener to monitor bill status changes
    const unsubscribe = onSnapshot(
      doc(db, "orders", orderId),
      (snapshot) => {
        if (!snapshot.exists()) {
          setError("Order not found");
          setLoading(false);
          return;
        }

        const data = snapshot.data();
        const orderData: Order = {
          id: snapshot.id,
          customerName: data.customerName || "",
          numberOfPeople: data.numberOfPeople || 0,
          tableNumber: data.tableNumber || 0,
          sessionId: data.sessionId || "",
          sessionStatus: data.sessionStatus || "closed",
          sessionItems: data.sessionItems || [],
          sessionTotal: data.sessionTotal || 0,
          status: data.status || "served",
          createdAt: data.createdAt,
          updatedAt: data.updatedAt || data.createdAt,
          extrasBatches: data.extrasBatches || [],
          billStatus: data.billStatus || null,
          billRequestedAt: data.billRequestedAt,
        };
        setOrder(orderData);
        setLoading(false);
      },
      (err) => {
        console.error("Error listening to order:", err);
        setError(err.message || "Failed to load order");
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [orderId]);


  const generatePDF = async () => {
    if (!order) return;

    setDownloadingPDF(true);
    try {
      const pdfDoc = new jsPDF();
      const accentColor = [30, 41, 59]; // Slate 800
      const lightAcccent = [241, 245, 249]; // Slate 100

      // --- HEADER SECTION ---
      // Restaurant Logo/Name & Tax Invoice Title
      pdfDoc.setFillColor(accentColor[0], accentColor[1], accentColor[2]);
      pdfDoc.rect(0, 0, 210, 40, "F");

      pdfDoc.setTextColor(255, 255, 255);
      pdfDoc.setFontSize(28);
      pdfDoc.setFont("helvetica", "bold");
      pdfDoc.text("DELICIOUS BITES", 15, 25);

      pdfDoc.setFontSize(10);
      pdfDoc.setFont("helvetica", "normal");
      pdfDoc.text("FLAVORS YOU'LL REMEMBER", 15, 32);

      pdfDoc.setFontSize(20);
      pdfDoc.setFont("helvetica", "bold");
      pdfDoc.text("TAX INVOICE", 150, 25, { align: "left" });

      // --- DETAILS SECTION (Two Columns) ---
      pdfDoc.setTextColor(0, 0, 0);
      let y = 55;

      // Column widths
      const leftColX = 15;
      const rightColX = 130;

      // Left: Restaurant Details
      pdfDoc.setFontSize(10);
      pdfDoc.setFont("helvetica", "bold");
      pdfDoc.text("RESTAURANT DETAILS", leftColX, y);
      pdfDoc.setFont("helvetica", "normal");
      pdfDoc.setFontSize(9);
      y += 6;
      pdfDoc.text("123 Foodie Street, Gourmet City", leftColX, y);
      y += 5;
      pdfDoc.text("Maharashtra, India - 400001", leftColX, y);
      y += 5;
      pdfDoc.text("Phone: +91 98765 43210", leftColX, y);
      y += 5;
      pdfDoc.text("GSTIN: 27AAAAA0000A1Z5", leftColX, y);
      y += 5;
      pdfDoc.text("FSSAI: 12345678901234", leftColX, y);

      // Right: Bill Details
      let yRight = 55;
      pdfDoc.setFontSize(10);
      pdfDoc.setFont("helvetica", "bold");
      pdfDoc.text("BILL DETAILS", rightColX, yRight);
      pdfDoc.setFont("helvetica", "normal");
      pdfDoc.setFontSize(9);
      yRight += 6;
      pdfDoc.text(`Table No: #${order.tableNumber}`, rightColX, yRight);
      yRight += 5;
      pdfDoc.text(`Customer: ${order.customerName}`, rightColX, yRight);
      yRight += 5;
      pdfDoc.text(`Bill No: DB-${order.id.substring(0, 6).toUpperCase()}`, rightColX, yRight);
      yRight += 5;
      const dateStr = order.updatedAt?.toDate
        ? order.updatedAt.toDate().toLocaleString("en-IN")
        : new Date().toLocaleString("en-IN");
      pdfDoc.text(`Date & Time: ${dateStr}`, rightColX, yRight);

      y = Math.max(y, yRight) + 15;

      // --- ITEM NAMES TABLE ---
      // Table Header
      pdfDoc.setFillColor(lightAcccent[0], lightAcccent[1], lightAcccent[2]);
      pdfDoc.rect(15, y, 180, 10, "F");
      pdfDoc.setDrawColor(203, 213, 225); // Slate 300
      pdfDoc.line(15, y, 195, y);
      pdfDoc.line(15, y + 10, 195, y + 10);

      pdfDoc.setFontSize(9);
      pdfDoc.setFont("helvetica", "bold");
      const headerY = y + 6.5;
      pdfDoc.text("Item Name", 20, headerY);
      pdfDoc.text("Portion", 90, headerY);
      pdfDoc.text("Qty", 125, headerY, { align: "right" });
      pdfDoc.text("Rate", 145, headerY, { align: "right" });
      pdfDoc.text("Amount", 185, headerY, { align: "right" });

      y += 10;

      // Items
      pdfDoc.setFont("helvetica", "normal");
      pdfDoc.setFontSize(9);

      const allItems = [
        ...order.sessionItems,
        ...(order.extrasBatches?.flatMap(b => b.items) || [])
      ];

      allItems.forEach((item, index) => {
        if (y > 250) {
          pdfDoc.addPage();
          y = 20;
        }

        // Alternate row shading
        if (index % 2 !== 0) {
          pdfDoc.setFillColor(248, 250, 252); // Slate 50
          pdfDoc.rect(15, y, 180, 8, "F");
        }

        const itemName = item.name.length > 40 ? item.name.substring(0, 37) + "..." : item.name;
        pdfDoc.text(itemName, 20, y + 5.5);
        pdfDoc.text(item.portion || "Full", 90, y + 5.5);
        pdfDoc.text(String(item.quantity), 125, y + 5.5, { align: "right" });
        pdfDoc.text(`Rs. ${item.price.toFixed(2)}`, 145, y + 5.5, { align: "right" });
        const lineTotal = item.price * item.quantity;
        pdfDoc.text(`Rs. ${lineTotal.toFixed(2)}`, 185, y + 5.5, { align: "right" });

        y += 8;
      });

      // Bottom line of table
      pdfDoc.line(15, y, 195, y);
      y += 10;

      // --- SUMMARY SECTION ---
      const summaryX = 130;
      const subtotal = order.sessionTotal;
      const cgst = subtotal * 0.025;
      const sgst = subtotal * 0.025;
      const serviceCharge = subtotal * 0.05;
      const grandTotal = subtotal + cgst + sgst + serviceCharge;

      pdfDoc.setFontSize(9);
      pdfDoc.setFont("helvetica", "normal");

      const drawSummaryRow = (label: string, value: string, currentY: number, isBold = false) => {
        if (isBold) pdfDoc.setFont("helvetica", "bold");
        pdfDoc.text(label, summaryX, currentY);
        pdfDoc.text(value, 185, currentY, { align: "right" });
        if (isBold) pdfDoc.setFont("helvetica", "normal");
      };

      drawSummaryRow("Subtotal:", `Rs. ${subtotal.toFixed(2)}`, y);
      y += 6;
      drawSummaryRow("CGST (2.5%):", `Rs. ${cgst.toFixed(2)}`, y);
      y += 6;
      drawSummaryRow("SGST (2.5%):", `Rs. ${sgst.toFixed(2)}`, y);
      y += 6;
      drawSummaryRow("Service Charge (5%):", `Rs. ${serviceCharge.toFixed(2)}`, y);
      y += 10;

      // Grand Total Highlight
      pdfDoc.setFillColor(accentColor[0], accentColor[1], accentColor[2]);
      pdfDoc.rect(summaryX - 5, y - 6, 70, 12, "F");
      pdfDoc.setTextColor(255, 255, 255);
      pdfDoc.setFontSize(12);
      drawSummaryRow("GRAND TOTAL:", `Rs. ${grandTotal.toFixed(2)}`, y + 2, true);

      // --- FOOTER SECTION ---
      y = 260;
      pdfDoc.setTextColor(100, 116, 139); // Slate 500
      pdfDoc.setFontSize(9);
      pdfDoc.text("Thank you for dining with us!", 105, y, { align: "center" });
      y += 5;
      pdfDoc.text("Visit us again at www.deliciousbites.com", 105, y, { align: "center" });

      // QR Placeholder
      pdfDoc.setDrawColor(203, 213, 225);
      pdfDoc.rect(95, y + 5, 20, 20);
      pdfDoc.setFontSize(7);
      pdfDoc.text("QR FEEDBACK", 105, y + 17, { align: "center" });

      // Save PDF
      pdfDoc.save(`invoice-table${order.tableNumber}-${order.customerName}-${Date.now()}.pdf`);

      // Update Firestore
      await updateDoc(doc(db, "orders", orderId), {
        billStatus: "downloaded",
        sessionStatus: "closed",
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      console.error("Error generating PDF:", error);
      alert("Failed to process bill download. Please try again.");
    } finally {
      setDownloadingPDF(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4 animate-spin">🍽️</div>
          <p className="text-xl text-slate-600">Loading bill details...</p>
        </div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center bg-white p-8 rounded-2xl shadow-xl">
          <div className="text-4xl mb-4">❌</div>
          <p className="text-xl text-slate-700">{error || "Order not found"}</p>
        </div>
      </div>
    );
  }

  // Show waiting message if bill is pending
  if (order.billStatus === "pending") {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <div className="text-center bg-slate-800 p-12 rounded-[2.5rem] shadow-2xl max-w-md border border-slate-700">
          <div className="text-6xl mb-6 animate-pulse">⏳</div>
          <h2 className="text-3xl font-black text-white mb-4">Pending Approval</h2>
          <p className="text-lg text-slate-400 mb-6 font-medium">
            Your bill request has been sent to the chef. Please wait a moment while we prepare your invoice.
          </p>
          <div className="p-4 bg-slate-900 rounded-2xl border border-slate-800 inline-block">
            <p className="text-sm text-slate-500 font-bold uppercase tracking-widest">
              Table {order.tableNumber} • {order.customerName}
            </p>
          </div>
          <br />
          <button
            onClick={() => window.location.reload()}
            className="mt-8 px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-2xl transition-all active:scale-95"
          >
            🔄 Refresh Status
          </button>
        </div>
      </div>
    );
  }

  const subtotal = order.sessionTotal;
  const cgst = subtotal * 0.025;
  const sgst = subtotal * 0.025;
  const serviceCharge = subtotal * 0.05;
  const grandTotal = subtotal + cgst + sgst + serviceCharge;

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8 font-sans selection:bg-blue-100">
      <div className="max-w-4xl mx-auto">
        {/* Printable/Display Bill */}
        <div className="bg-white rounded-[2.5rem] shadow-2xl shadow-slate-200 border border-slate-100 overflow-hidden mb-8" id="bill-content">
          {/* Header */}
          <div className="bg-slate-900 p-8 md:p-12 text-white flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="text-center md:text-left">
              <h1 className="text-3xl font-black tracking-tighter mb-1">DELICIOUS BITES</h1>
              <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">Flavors you&apos;ll remember</p>
            </div>
            <div className="px-6 py-3 bg-slate-800 rounded-2xl border border-slate-700">
              <span className="text-xl font-bold tracking-tight">TAX INVOICE</span>
            </div>
          </div>

          <div className="p-8 md:p-12">
            {/* Details Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-12 mb-12 pb-12 border-b border-slate-100">
              <div className="space-y-4">
                <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Restaurant Details</h3>
                <div className="text-sm text-slate-600 space-y-1">
                  <p className="font-bold text-slate-900">Delicious Bites Ltd.</p>
                  <p>123 Foodie Street, Gourmet City</p>
                  <p>Maharashtra, India - 400001</p>
                  <p>GSTIN: 27AAAAA0000A1Z5</p>
                </div>
              </div>
              <div className="space-y-4">
                <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Bill Details</h3>
                <div className="text-sm text-slate-600 space-y-1">
                  <div className="flex justify-between">
                    <span>Table Number:</span>
                    <span className="font-bold text-slate-900">#{order.tableNumber}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Customer:</span>
                    <span className="font-bold text-slate-900">{order.customerName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Date:</span>
                    <span>{order.updatedAt?.toDate ? order.updatedAt.toDate().toLocaleDateString() : new Date().toLocaleDateString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Bill No:</span>
                    <span className="font-mono text-xs">DB-{order.id.substring(0, 6).toUpperCase()}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Items Table */}
            <div className="mb-12">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="text-left py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Item</th>
                    <th className="text-center py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Portion</th>
                    <th className="text-center py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Qty</th>
                    <th className="text-right py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {order.sessionItems.map((item, idx) => (
                    <tr key={item.id || idx}>
                      <td className="py-4 text-sm font-bold text-slate-800">{item.name}</td>
                      <td className="py-4 text-center text-sm text-slate-500">{item.portion}</td>
                      <td className="py-4 text-center text-sm text-slate-500">{item.quantity}</td>
                      <td className="py-4 text-right text-sm font-bold text-slate-800">Rs. {(item.price * item.quantity).toFixed(2)}</td>
                    </tr>
                  ))}
                  {order.extrasBatches?.map((batch) =>
                    batch.items.map((item, idx) => (
                      <tr key={`${batch.batchId}-${idx}`} className="bg-slate-50/50">
                        <td className="py-4 px-2 text-sm font-medium text-slate-800">{item.name} <span className="text-[10px] text-blue-500 ml-1">(Extra)</span></td>
                        <td className="py-4 text-center text-sm text-slate-500">{item.portion}</td>
                        <td className="py-4 text-center text-sm text-slate-500">{item.quantity}</td>
                        <td className="py-4 text-right text-sm font-bold text-slate-800">Rs. {(item.price * item.quantity).toFixed(2)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Total Section */}
            <div className="flex justify-end">
              <div className="w-full md:w-64 space-y-3">
                <div className="flex justify-between text-sm text-slate-500">
                  <span>Subtotal:</span>
                  <span>Rs. {subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm text-slate-500">
                  <span>CGST (2.5%):</span>
                  <span>Rs. {cgst.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm text-slate-500">
                  <span>SGST (2.5%):</span>
                  <span>Rs. {sgst.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm text-slate-500 pb-2 border-b border-slate-100">
                  <span>Service Charge (5%):</span>
                  <span>Rs. {serviceCharge.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center pt-2">
                  <span className="text-lg font-black text-slate-900">Total:</span>
                  <span className="text-2xl font-black text-blue-600">Rs. {grandTotal.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="bg-slate-50 p-8 border-t border-slate-100 text-center">
            <p className="text-slate-500 text-sm font-medium italic">Thank you for dining with us! See you again soon.</p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col md:flex-row gap-4 justify-center items-center">
          <button
            onClick={generatePDF}
            disabled={downloadingPDF}
            className="w-full md:w-auto px-8 py-4 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-2xl transition-all shadow-xl hover:shadow-slate-200 active:scale-95 disabled:opacity-50 flex items-center justify-center gap-3"
          >
            {downloadingPDF ? "Preparing PDF..." : "📄 Download Digital Invoice"}
          </button>
          <button
            onClick={() => window.print()}
            className="w-full md:w-auto px-8 py-4 bg-white hover:bg-slate-50 text-slate-900 border border-slate-200 font-bold rounded-2xl transition-all shadow-lg active:scale-95 flex items-center justify-center gap-3"
          >
            🖨️ Print Receipt
          </button>
        </div>

        <div className="mt-12 text-center">
          <button
            onClick={() => router.push("/")}
            className="text-slate-400 hover:text-slate-600 text-sm font-bold uppercase tracking-widest transition-colors"
          >
            ← Return to Menu
          </button>
        </div>
      </div>

      <style jsx global>{`
        @media print {
          body { background: white; }
          #bill-content { box-shadow: none; border: none; }
          button { display: none; }
        }
      `}</style>
    </div>
  );
}
