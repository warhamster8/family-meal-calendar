"use client";

import { DayOfWeek, Meal, MealType } from "@/types";
import { getDayName, getDateForDayOfWeek } from "@/utils/dates";
import MealSlot from "./MealSlot";
import { Sun, Moon } from "lucide-react";

interface DayColumnProps {
    dayOfWeek: DayOfWeek;
    monday: Date;
    lunch: Meal | null;
    dinner: Meal | null;
    onAdd: (dayOfWeek: DayOfWeek, mealType: MealType) => void;
    onEdit: (meal: Meal) => void;
    isToday: boolean;
    onAIRegenerate?: (dayOfWeek: DayOfWeek, mealType: MealType, meal: Meal | null) => void;
}

export default function DayColumn({
    dayOfWeek,
    monday,
    lunch,
    dinner,
    onAdd,
    onEdit,
    isToday,
    onAIRegenerate,
}: DayColumnProps) {
    const date = getDateForDayOfWeek(monday, dayOfWeek);
    const dayName = getDayName(dayOfWeek);
    const dayNumber = date.getDate().toString();
    const monthName = date.toLocaleDateString("it-IT", { month: "short" }).replace(".", "");

    return (
        <div
            className={`flex flex-col rounded-3xl border transition-all duration-300 overflow-hidden ${
                isToday 
                    ? "border-primary-400 bg-primary-50/20 shadow-[0_8px_30px_rgba(14,165,233,0.08)] ring-1 ring-primary-400/25 scale-[1.01]" 
                    : "border-stone-200/60 bg-white hover:border-stone-350 hover:shadow-[0_8px_20px_rgba(0,0,0,0.015)]"
            }`}
        >
            {/* Day header */}
            <div
                className={`px-3 py-3 text-center border-b transition-colors ${
                    isToday ? "bg-primary-100/70 border-primary-200" : "bg-stone-50/60 border-stone-200/50"
                }`}
            >
                <p className="text-[10px] font-extrabold uppercase text-stone-400 tracking-widest">
                    {dayName}
                </p>
                <p
                    className={`text-xl font-extrabold tracking-tight my-0.5 ${
                        isToday ? "text-primary-700" : "text-stone-800"
                    }`}
                >
                    {dayNumber}
                </p>
                <p className="text-[9px] font-extrabold text-stone-400 uppercase tracking-widest">{monthName}</p>
            </div>

            {/* Meal slots with distinct Lunch/Dinner dividers */}
            <div className="flex flex-col gap-4 p-4 flex-1">
                <div>
                    <div className="flex items-center gap-1.5 mb-1.5 px-1.5">
                        <Sun size={12} className="text-amber-500 shrink-0" />
                        <span className="text-[9px] font-extrabold uppercase text-stone-400 tracking-wider">Pranzo</span>
                    </div>
                    <MealSlot
                        mealType="lunch"
                        meal={lunch}
                        onAdd={(mt) => onAdd(dayOfWeek, mt)}
                        onEdit={onEdit}
                        onAIRegenerate={(meal) => onAIRegenerate && onAIRegenerate(dayOfWeek, "lunch", meal)}
                    />
                </div>

                <div className="border-t border-stone-200/35 my-0.5" />

                <div>
                    <div className="flex items-center gap-1.5 mb-1.5 px-1.5">
                        <Moon size={12} className="text-indigo-500 shrink-0" />
                        <span className="text-[9px] font-extrabold uppercase text-stone-400 tracking-wider">Cena</span>
                    </div>
                    <MealSlot
                        mealType="dinner"
                        meal={dinner}
                        onAdd={(mt) => onAdd(dayOfWeek, mt)}
                        onEdit={onEdit}
                        onAIRegenerate={(meal) => onAIRegenerate && onAIRegenerate(dayOfWeek, "dinner", meal)}
                    />
                </div>
            </div>
        </div>
    );
}