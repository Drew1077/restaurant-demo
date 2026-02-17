"use client";

import { useState } from "react";
import { MenuItem } from "@/types";

interface MenuCardProps {
    item: MenuItem;
    currentLang: "en" | "mr";
    t: (key: string) => string;
    sessionClosed: boolean;
    isMenuUnlocked: boolean;
    billRequested: boolean;
    addToCart: (item: MenuItem, portion: "Half" | "Full", price: number, quantity: number) => void;
}

export default function MenuCard({
    item,
    currentLang,
    t,
    sessionClosed,
    isMenuUnlocked,
    billRequested,
    addToCart,
}: MenuCardProps) {
    const [portion, setPortion] = useState<"Half" | "Full">(item.price.half ? "Half" : "Full");
    const [quantity, setQuantity] = useState(1);

    const currentPrice = portion === "Half" ? (item.price.half || item.price.full) : item.price.full;

    const getSpiceColor = (level?: string) => {
        switch (level) {
            case "Spicy": return "text-rose-600 bg-rose-50 border-rose-100";
            case "Sweet": return "text-emerald-600 bg-emerald-50 border-emerald-100";
            default: return "text-orange-600 bg-orange-50 border-orange-100";
        }
    };

    const getSpiceIcon = (level?: string) => {
        switch (level) {
            case "Spicy": return "🌶️🌶️";
            case "Sweet": return "🍯";
            default: return "🌶️";
        }
    };

    const isVeg = item.foodType === "Veg";

    return (
        <div className="group bg-white rounded-[2rem] overflow-hidden border border-gray-100 shadow-xl shadow-gray-200/40 hover:shadow-2xl hover:shadow-primary/10 transition-all duration-500 flex flex-col h-full hover:-translate-y-2">
            <div className="relative h-40 md:h-64 overflow-hidden bg-gray-100">
                <img
                    src={item.image}
                    alt={item.name}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 ease-out"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-60 group-hover:opacity-40 transition-opacity" />

                <div className="absolute top-4 left-4 right-4 flex justify-between items-start">
                    <div className="bg-white/95 backdrop-blur-sm p-1.5 rounded-xl shadow-lg border border-white/20">
                        {/* Standard Veg/Non-Veg Icon */}
                        <div className={`w-5 h-5 border-2 rounded flex items-center justify-center ${isVeg ? "border-green-600" : "border-rose-600"}`}>
                            <div className={`w-2 h-2 rounded-full ${isVeg ? "bg-green-600" : "bg-rose-600"}`} />
                        </div>
                    </div>

                    {!item.noPortion && item.price.half && (
                        <div className="flex bg-white/95 backdrop-blur-sm rounded-2xl p-1 shadow-xl border border-white/20">
                            {["Half", "Full"].map((p) => (
                                <button
                                    key={p}
                                    disabled={!isMenuUnlocked || sessionClosed || billRequested}
                                    onClick={() => setPortion(p as any)}
                                    className={`px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-tighter transition-all ${portion === p
                                        ? "bg-primary text-white shadow-lg"
                                        : "text-gray-400 hover:text-gray-900"
                                        } ${(!isMenuUnlocked || sessionClosed || billRequested) ? "opacity-30" : ""}`}
                                >
                                    {t(p.toLowerCase())}
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                <div className="absolute bottom-4 md:bottom-6 left-4 md:left-6 right-4 md:right-6 pointer-events-none">
                    <h3 className="text-lg md:text-xl font-black text-white leading-tight drop-shadow-lg">
                        {currentLang === "mr" && item.mr_name ? item.mr_name : item.name}
                    </h3>
                    {(currentLang === "mr" ? item.mr_description : item.description) && (
                        <p className="text-[10px] md:text-[10px] font-bold text-white/80 uppercase tracking-tighter mt-1 drop-shadow-md line-clamp-1 md:line-clamp-none">
                            {currentLang === "mr" ? item.mr_description : item.description}
                        </p>
                    )}
                </div>
            </div>

            <div className="p-4 md:p-6 flex flex-col flex-1">
                <div className="flex items-center justify-between mb-2 md:mb-3">
                    <div className={`px-2 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest border ${getSpiceColor(item.spiceLevel)}`}>
                        {getSpiceIcon(item.spiceLevel)} {item.spiceLevel}
                    </div>
                </div>

                <div className="flex items-center justify-between mb-4 md:mb-6 pt-3 md:pt-4 border-t border-gray-50">
                    <div className="flex flex-col">
                        <span className="text-xl md:text-2xl font-black text-gray-900 leading-none">
                            ₹{currentPrice}
                        </span>
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">
                            {t('price')} ({t(portion.toLowerCase())})
                        </span>
                    </div>

                    <div className={`flex items-center bg-gray-50 rounded-2xl p-0.5 md:p-1 border border-gray-100 select-none ${!isMenuUnlocked || sessionClosed || billRequested ? 'opacity-50 pointer-events-none' : ''}`}>
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                setQuantity(prev => Math.max(1, prev - 1));
                            }}
                            className="w-12 h-12 flex items-center justify-center text-gray-400 hover:text-primary transition-colors disabled:opacity-30"
                            disabled={sessionClosed || billRequested || quantity <= 1}
                        >
                            <span className="text-2xl leading-none">−</span>
                        </button>
                        <span className="w-8 text-center text-sm font-black text-gray-900">{quantity}</span>
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                setQuantity(prev => prev + 1);
                            }}
                            className="w-12 h-12 flex items-center justify-center text-gray-400 hover:text-primary transition-colors disabled:opacity-30"
                            disabled={sessionClosed || billRequested}
                        >
                            <span className="text-2xl leading-none">+</span>
                        </button>
                    </div>
                </div>

                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        if (isMenuUnlocked && !sessionClosed && !billRequested) {
                            addToCart(item, portion, currentPrice, quantity);
                            setQuantity(1);
                        }
                    }}
                    className={`w-full py-4 text-white font-black rounded-2xl transition-all duration-300 shadow-xl active:scale-95 flex items-center justify-center gap-3 uppercase tracking-tighter text-xs md:text-sm ${!isMenuUnlocked || sessionClosed || billRequested
                        ? 'bg-gray-300 text-gray-500 opacity-50 cursor-not-allowed'
                        : 'bg-gray-900 hover:bg-primary shadow-gray-200 hover:shadow-primary/30'
                        }`}
                    disabled={!isMenuUnlocked || sessionClosed || billRequested}
                >
                    {isMenuUnlocked ? (
                        billRequested ? (
                            currentLang === "mr" ? "बिल मागितले आहे" : "Bill Requested"
                        ) : (
                            <>
                                {t('add')}
                                <span className="bg-white/20 px-2 py-0.5 rounded-lg text-xs">₹{currentPrice * quantity}</span>
                            </>
                        )
                    ) : (
                        currentLang === "mr" ? "ऑर्डर करण्यासाठी वरील तपशील भरा" : "Enter details above to order"
                    )}
                </button>
            </div>
        </div>
    );
}
