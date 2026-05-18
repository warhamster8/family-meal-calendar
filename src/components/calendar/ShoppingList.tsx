"use client";

import { useState, useEffect } from "react";
import { generateShoppingListAction } from "@/app/actions/ai";
import { Meal } from "@/types";
import { Sparkles, ShoppingBag, Copy, Printer, Check, RefreshCw, CheckSquare, Square, AlertTriangle } from "lucide-react";

interface ShoppingItem {
    name: string;
    quantity: string;
}

interface ShoppingCategory {
    categoryName: string;
    items: ShoppingItem[];
}

interface ShoppingListStructure {
    categories: ShoppingCategory[];
    notes?: string;
}

interface ShoppingListProps {
    meals: Meal[];
    weekStartStr: string;
}

export default function ShoppingList({ meals, weekStartStr }: ShoppingListProps) {
    const [list, setList] = useState<ShoppingListStructure | null>(null);
    const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({});
    const [cachedFingerprint, setCachedFingerprint] = useState<string>("");
    const [loading, setLoading] = useState(false);
    const [copied, setCopied] = useState(false);

    // Cache keys based on week start
    const listCacheKey = `shopping_list_${weekStartStr}`;
    const checkCacheKey = `shopping_checks_${weekStartStr}`;
    const fingerprintCacheKey = `shopping_fingerprint_${weekStartStr}`;

    // Calculate dynamic fingerprint of current weekly menu meals
    const currentFingerprint = meals
        .map((m) => `${m.id}_${m.title}_${m.description || ""}`)
        .sort()
        .join("|");

    // Load from LocalStorage on mount or week change
    useEffect(() => {
        const cachedList = localStorage.getItem(listCacheKey);
        const cachedChecks = localStorage.getItem(checkCacheKey);
        const cachedFp = localStorage.getItem(fingerprintCacheKey) || "";

        if (cachedList) {
            try {
                setList(JSON.parse(cachedList));
            } catch (e) {
                console.error("Error parsing cached shopping list", e);
            }
        } else {
            setList(null);
        }

        if (cachedChecks) {
            try {
                setCheckedItems(JSON.parse(cachedChecks));
            } catch (e) {
                console.error("Error parsing cached checks", e);
            }
        } else {
            setCheckedItems({});
        }

        setCachedFingerprint(cachedFp);
    }, [weekStartStr, listCacheKey, checkCacheKey, fingerprintCacheKey]);

    const handleGenerateList = async () => {
        if (meals.length === 0) return;
        setLoading(true);
        try {
            const formattedMeals = meals.map((m) => ({
                title: m.title,
                description: m.description || "",
                notes: m.notes || "",
            }));

            const res = await generateShoppingListAction({ meals: formattedMeals });

            if (res.success && res.shoppingList) {
                const newList = res.shoppingList as ShoppingListStructure;
                setList(newList);
                setCheckedItems({});
                setCachedFingerprint(currentFingerprint);
                
                // Save to localStorage
                localStorage.setItem(listCacheKey, JSON.stringify(newList));
                localStorage.setItem(fingerprintCacheKey, currentFingerprint);
                localStorage.removeItem(checkCacheKey); // Reset old checkboxes
            } else {
                alert(res.error || "Impossibile generare la lista della spesa.");
            }
        } catch (error) {
            console.error(error);
            alert("Errore imprevisto durante la generazione della lista della spesa.");
        } finally {
            setLoading(false);
        }
    };

    const toggleItem = (itemName: string) => {
        const nextChecks = {
            ...checkedItems,
            [itemName]: !checkedItems[itemName],
        };
        setCheckedItems(nextChecks);
        localStorage.setItem(checkCacheKey, JSON.stringify(nextChecks));
    };

    const handleCopyClipboard = () => {
        if (!list) return;

        let text = `🛒 *LISTA DELLA SPESA SETTIMANALE* 🛒\n_Porzioni calcolate per la famiglia (5 persone: 2 adulti + 3 figli di 13, 9 e 4 anni)_\n\n`;

        list.categories.forEach((cat) => {
            text += `*${cat.categoryName.toUpperCase()}*\n`;
            cat.items.forEach((item) => {
                const isChecked = checkedItems[item.name] ? "✅ " : "[ ] ";
                text += `${isChecked}${item.name} - _${item.quantity}_\n`;
            });
            text += `\n`;
        });

        if (list.notes) {
            text += `💡 *Consiglio Chef:* ${list.notes}\n`;
        }

        navigator.clipboard.writeText(text).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        });
    };

    const handlePrint = () => {
        window.print();
    };

    if (meals.length === 0) {
        return null; // Don't show if there are absolutely no meals scheduled
    }

    // Check if the current weekly menu has changed compared to when we generated the shopping list
    const isOutOfSync = list !== null && currentFingerprint !== cachedFingerprint;

    return (
        <div className="bg-white rounded-2xl border border-stone-200/80 shadow-sm p-6 mt-8 print:border-none print:shadow-none print:p-0">
            {/* Header Banner */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-5 border-b border-stone-100 mb-6">
                <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-primary-50 rounded-xl text-primary-600 shadow-sm print:hidden">
                        <ShoppingBag size={22} className="animate-pulse" />
                    </div>
                    <div>
                        <h2 className="text-lg font-bold text-stone-800">
                            Lista della Spesa Automatica con IA
                        </h2>
                        <p className="text-xs text-stone-400 font-medium">
                            Quantità calcolate su misura per **5 persone** (2 adulti + figli di 13, 9, 4 anni)
                        </p>
                    </div>
                </div>

                {list && !loading && (
                    <div className="flex items-center gap-2 print:hidden">
                        <button
                            onClick={handleGenerateList}
                            className="flex items-center gap-1.5 px-3.5 py-2 border border-stone-200 text-stone-600 hover:bg-stone-50 rounded-xl text-xs font-bold transition-all active:scale-95 cursor-pointer"
                        >
                            <RefreshCw size={13} />
                            Rigenera
                        </button>
                        <button
                            onClick={handleCopyClipboard}
                            className="flex items-center gap-1.5 px-3.5 py-2 bg-stone-50 hover:bg-stone-100 border border-stone-200 text-stone-700 rounded-xl text-xs font-bold transition-all active:scale-95 cursor-pointer"
                        >
                            <Copy size={13} />
                            {copied ? "Copiata!" : "Copia per WhatsApp"}
                        </button>
                        <button
                            onClick={handlePrint}
                            className="flex items-center gap-1.5 px-3.5 py-2 bg-stone-900 hover:bg-stone-800 text-white rounded-xl text-xs font-bold transition-all active:scale-95 cursor-pointer shadow-sm"
                        >
                            <Printer size={13} />
                            Stampa
                        </button>
                    </div>
                )}
            </div>

            {/* In-Sync Warning Banner */}
            {isOutOfSync && !loading && (
                <div className="bg-amber-50/70 border border-amber-200/80 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-amber-800 animate-pulse print:hidden mb-6">
                    <div className="flex items-center gap-2.5">
                        <AlertTriangle size={18} className="text-amber-600 flex-shrink-0" />
                        <p className="text-xs font-bold">
                            Il menu settimanale è stato modificato! Aggiorna la lista della spesa per allineare gli ingredienti.
                        </p>
                    </div>
                    <button
                        onClick={handleGenerateList}
                        className="flex items-center gap-1.5 px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-extrabold shadow-sm active:scale-95 transition-all cursor-pointer"
                    >
                        <RefreshCw size={12} />
                        Aggiorna Ora
                    </button>
                </div>
            )}

            {loading ? (
                /* Pulsing Loading State with chef tips */
                <div className="flex flex-col items-center justify-center py-12 text-center">
                    <div className="relative mb-4">
                        <div className="absolute inset-0 bg-primary-100 rounded-full blur-xl opacity-50 animate-pulse"></div>
                        <div className="relative p-4 bg-primary-50 rounded-full text-primary-600 border border-primary-100">
                            <Sparkles size={28} className="animate-spin text-primary-500" />
                        </div>
                    </div>
                    <h3 className="text-sm font-bold text-stone-700 mb-1">
                        Consolidamento ingredienti in corso...
                    </h3>
                    <p className="text-xs text-stone-400 font-medium max-w-sm leading-relaxed">
                        L'intelligenza artificiale sta analizzando i pasti, sommando le grammature e proporzionando la spesa per il tuo nucleo familiare di 5 persone.
                    </p>
                </div>
            ) : !list ? (
                /* Empty state with generate button */
                <div className="flex flex-col items-center justify-center py-10 text-center">
                    <div className="p-4 bg-stone-50 rounded-2xl text-stone-400 border border-stone-100 mb-4 print:hidden">
                        <ShoppingBag size={32} />
                    </div>
                    <h3 className="text-sm font-bold text-stone-700 mb-1">
                        Genera la tua lista spesa per 5 persone
                    </h3>
                    <p className="text-xs text-stone-400 max-w-md mb-5 leading-relaxed font-medium">
                        Raggruppa all'istante tutti gli ingredienti dei pranzi e delle cene pianificati per questa settimana, calcolando le porzioni ideali per 2 adulti e i figli di 13, 9 e 4 anni.
                    </p>
                    <button
                        onClick={handleGenerateList}
                        className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-primary-600 to-indigo-600 hover:from-primary-700 hover:to-indigo-700 text-white rounded-xl text-sm font-bold shadow-md hover:shadow-lg transition-all active:scale-[0.98] cursor-pointer"
                    >
                        <Sparkles size={16} />
                        ✨ Genera Lista della Spesa
                    </button>
                </div>
            ) : (
                /* Grid of Categories */
                <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {list.categories.map((cat, catIdx) => (
                            <div
                                key={catIdx}
                                className="bg-stone-50/50 rounded-2xl border border-stone-150/70 p-4 flex flex-col print:border-none print:bg-white print:p-0"
                            >
                                <h3 className="text-xs font-extrabold uppercase text-stone-500 tracking-wider mb-3.5 pb-1.5 border-b border-stone-200/50 flex items-center justify-between">
                                    <span>{cat.categoryName}</span>
                                    <span className="text-[10px] bg-stone-200/60 text-stone-600 px-1.5 py-0.5 rounded-full print:hidden">
                                        {cat.items.length}
                                    </span>
                                </h3>
                                <ul className="space-y-2 flex-1">
                                    {cat.items.map((item, itemIdx) => {
                                        const isChecked = !!checkedItems[item.name];
                                        return (
                                            <li
                                                key={itemIdx}
                                                onClick={() => toggleItem(item.name)}
                                                className="flex items-start gap-2.5 p-1 rounded-lg hover:bg-stone-100/50 transition-colors cursor-pointer group select-none"
                                            >
                                                <button
                                                    type="button"
                                                    className="mt-0.5 text-stone-400 group-hover:text-primary-500 transition-colors flex-shrink-0 print:hidden"
                                                >
                                                    {isChecked ? (
                                                        <CheckSquare size={16} className="text-primary-600" />
                                                    ) : (
                                                        <Square size={16} className="text-stone-300" />
                                                    )}
                                                </button>
                                                <div className="flex-1 flex items-baseline justify-between gap-2">
                                                    <span
                                                        className={`text-xs font-semibold leading-relaxed transition-all ${
                                                            isChecked
                                                                ? "text-stone-300 line-through decoration-stone-300 decoration-1"
                                                                : "text-stone-700"
                                                        }`}
                                                    >
                                                        {item.name}
                                                    </span>
                                                    <span
                                                        className={`text-[11px] font-bold text-stone-500/80 whitespace-nowrap bg-white border border-stone-200 px-1.5 py-0.5 rounded-md ${
                                                            isChecked ? "text-stone-300/70 border-stone-100" : ""
                                                        }`}
                                                    >
                                                        {item.quantity}
                                                    </span>
                                                </div>
                                            </li>
                                        );
                                    })}
                                </ul>
                            </div>
                        ))}
                    </div>

                    {/* AI Nutrition Note */}
                    {list.notes && (
                        <div className="mt-6 bg-gradient-to-r from-primary-50/50 to-indigo-50/30 border border-primary-100/60 rounded-2xl p-4 flex gap-3 print:hidden">
                            <span className="text-lg">💡</span>
                            <div>
                                <h4 className="text-xs font-extrabold uppercase text-primary-800 tracking-wider mb-0.5">
                                    Nota Nutrizionale & Antispreco
                                </h4>
                                <p className="text-xs text-stone-600 font-medium leading-relaxed">
                                    {list.notes}
                                </p>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
