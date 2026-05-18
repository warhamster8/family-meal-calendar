"use client";

import { Meal, MealType } from "@/types";
import { Pencil, Plus, Sparkles } from "lucide-react";
import clsx from "clsx";

interface MealSlotProps {
    mealType: MealType;
    meal: Meal | null;
    onAdd: (mealType: MealType) => void;
    onEdit: (meal: Meal) => void;
    onAIRegenerate?: (meal: Meal | null) => void;
}

export default function MealSlot({ mealType, meal, onAdd, onEdit, onAIRegenerate }: MealSlotProps) {
    const label = mealType === "lunch" ? "Pranzo" : "Cena";

    let courses: string[] = [];
    let contorno = "";

    if (meal) {
        courses = meal.title.includes("|")
            ? meal.title.split("|").map((c) => c.trim())
            : [meal.title];

        const descriptionText = meal.description || "";
        if (descriptionText.startsWith("Contorno:")) {
            const parts = descriptionText.split("—");
            contorno = parts[0].replace("Contorno:", "").trim();
        }
    }
    return (
        <div
            className={clsx(
                "rounded-2xl border transition-all duration-300 flex flex-col min-h-[132px] p-4.5 sm:p-5 cursor-pointer",
                meal
                    ? mealType === "lunch"
                        ? "bg-amber-50/65 border-stone-200/60 border-l-4 border-l-amber-500 shadow-[0_2px_8px_rgba(0,0,0,0.02)] hover:shadow-[0_8px_20px_rgba(245,158,11,0.08)] hover:-translate-y-0.5"
                        : "bg-indigo-50/65 border-stone-200/60 border-l-4 border-l-indigo-500 shadow-[0_2px_8px_rgba(0,0,0,0.02)] hover:shadow-[0_8px_20px_rgba(99,102,241,0.08)] hover:-translate-y-0.5"
                    : "bg-stone-50/40 hover:bg-stone-100/40 border-dashed border-stone-200 hover:border-stone-300"
            )}
            onClick={() => meal && onEdit(meal)}
        >
            <div className="flex items-center justify-between mb-3" onClick={(e) => e.stopPropagation()}>
                <span
                    className={clsx(
                        "text-[10px] font-extrabold uppercase tracking-wider",
                        mealType === "lunch" ? "text-amber-700" : "text-indigo-700"
                    )}
                >
                    {label}
                </span>
                {meal ? (
                    <div className="flex items-center gap-1.5 opacity-60 hover:opacity-100 transition-opacity">
                        {onAIRegenerate && (
                            <button
                                onClick={() => onAIRegenerate(meal)}
                                className="p-1 rounded-lg hover:bg-black/5 text-primary-500 hover:text-primary-600 transition-all cursor-pointer group"
                                title="Rigenera questo pasto con l'IA"
                            >
                                <Sparkles size={13} className="animate-pulse group-hover:scale-110 transition-transform" />
                            </button>
                        )}
                        <button
                            onClick={() => onEdit(meal)}
                            className="p-1 rounded-lg hover:bg-black/5 transition-all cursor-pointer"
                            aria-label={`Modifica ${label}`}
                        >
                            <Pencil size={13} className="text-stone-400 hover:text-stone-600" />
                        </button>
                    </div>
                ) : (
                    <div className="flex items-center gap-1.5">
                        {onAIRegenerate && (
                            <button
                                onClick={() => onAIRegenerate(null)}
                                className="p-1 rounded-lg hover:bg-stone-200/60 text-stone-400 hover:text-primary-600 transition-all cursor-pointer group"
                                title="Suggerisci con l'IA per questo slot"
                            >
                                <Sparkles size={13} className="group-hover:scale-110 transition-transform" />
                            </button>
                        )}
                        <button
                            onClick={() => onAdd(mealType)}
                            className="p-1 rounded-lg hover:bg-stone-200/60 transition-all cursor-pointer"
                            aria-label={`Aggiungi ${label}`}
                        >
                            <Plus size={13} className="text-stone-400 hover:text-stone-600" />
                        </button>
                    </div>
                )}
            </div>

            {meal ? (
                <div className="flex-1 flex flex-col justify-between">
                    <div>
                        <ul className="space-y-1.5">
                            {courses.map((course, idx) => (
                                <li key={idx} className="text-xs sm:text-[13px] lg:text-[13.5px] font-bold text-stone-850 flex items-start gap-1.5 leading-snug">
                                    <span className="text-primary-500/75 mt-1.5 shrink-0 text-[11px]">•</span>
                                    <span>{course}</span>
                                </li>
                            ))}
                        </ul>
                        {!contorno && meal.description && (
                            <p className="text-[11px] text-stone-500 mt-2 line-clamp-2 leading-relaxed font-medium pl-3">
                                {meal.description}
                            </p>
                        )}
                    </div>
                    {contorno && (
                        <div className="mt-3 pt-2.5 border-t border-stone-200/35 flex flex-wrap items-center gap-1.5">
                            <span className="text-[10px] font-extrabold uppercase tracking-widest text-stone-400">Contorno:</span>
                            <span className="text-[11px] sm:text-xs font-bold text-stone-700 bg-stone-100/70 px-2.5 py-0.5 rounded-md leading-none border border-stone-200/20">
                                {contorno}
                            </span>
                        </div>
                    )}
                </div>
            ) : (
                <div className="flex-1 flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
                    <button
                        onClick={() => onAdd(mealType)}
                        className="w-full h-full flex items-center justify-center text-[12px] font-bold text-stone-400 hover:text-stone-600 transition-colors py-4 cursor-pointer"
                    >
                        + Aggiungi Pasto
                    </button>
                </div>
            )}
        </div>
    );
}