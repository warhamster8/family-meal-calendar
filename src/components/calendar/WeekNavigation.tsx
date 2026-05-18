"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { formatWeekLabel } from "@/utils/dates";

interface WeekNavigationProps {
    weekStart: Date;
    weekEnd: Date;
    onPrevWeek: () => void;
    onNextWeek: () => void;
    onCurrentWeek: () => void;
}

export default function WeekNavigation({
    weekStart,
    weekEnd,
    onPrevWeek,
    onNextWeek,
    onCurrentWeek,
}: WeekNavigationProps) {
    const label = formatWeekLabel(weekStart, weekEnd);

    return (
        <div className="flex items-center justify-between bg-white/85 backdrop-blur-md rounded-2xl border border-stone-200/55 px-5 py-4 shadow-[0_8px_30px_rgb(0,0,0,0.03)] transition-all">
            <button
                onClick={onPrevWeek}
                className="p-2 rounded-xl border border-stone-150 text-stone-500 hover:text-stone-850 hover:bg-stone-50 transition-all duration-200 active:scale-95 cursor-pointer shadow-sm"
                aria-label="Settimana precedente"
            >
                <ChevronLeft size={18} />
            </button>

            <div className="flex flex-col items-center">
                <button
                    onClick={onCurrentWeek}
                    className="px-3.5 py-1 bg-primary-50 hover:bg-primary-100 border border-primary-100/40 text-primary-700 hover:text-primary-800 text-[10px] font-extrabold uppercase tracking-wider rounded-full transition-all active:scale-95 cursor-pointer mb-1.5 shadow-[0_2px_8px_rgba(14,165,233,0.08)]"
                >
                    Oggi
                </button>
                <span className="text-xs sm:text-sm font-extrabold text-stone-700 tracking-tight">{label}</span>
            </div>

            <button
                onClick={onNextWeek}
                className="p-2 rounded-xl border border-stone-150 text-stone-500 hover:text-stone-855 hover:bg-stone-50 transition-all duration-200 active:scale-95 cursor-pointer shadow-sm"
                aria-label="Settimana successiva"
            >
                <ChevronRight size={18} />
            </button>
        </div>
    );
}