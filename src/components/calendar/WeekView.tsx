"use client";

import { useState, useEffect } from "react";
import { WeeklyMenu, Meal, DayOfWeek, MealType } from "@/types";
import { getMondayOfWeek, getWeekRange, formatISODate, getDateForDayOfWeek, getDayName } from "@/utils/dates";
import DayColumn from "./DayColumn";
import MealSlot from "./MealSlot";
import WeekNavigation from "./WeekNavigation";
import ShoppingList from "./ShoppingList";
import Modal from "@/components/ui/Modal";
import Button from "@/components/ui/Button";
import { getWeekData, saveMealAction, deleteMealAction, clearWeeklyMenuAction } from "@/app/actions/calendar";
import { generateAIMenuAction, suggestSingleMealAction, regenerateSingleMealAction } from "@/app/actions/ai";
import { Sparkles, AlertCircle, Utensils, CheckCircle2, ChevronRight, Trash2, CalendarRange, Sun, Moon } from "lucide-react";

export default function WeekView() {
    const [currentWeek, setCurrentWeek] = useState(() => getWeekRange(0));
    const [weeklyMenu, setWeeklyMenu] = useState<WeeklyMenu | null>(null);
    const [meals, setMeals] = useState<Meal[]>([]);
    const [loading, setLoading] = useState(true);

    // Standard Meal Modal States
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedDay, setSelectedDay] = useState<DayOfWeek | null>(null);
    const [selectedType, setSelectedType] = useState<MealType | null>(null);
    const [selectedMeal, setSelectedMeal] = useState<Meal | null>(null);
    const [mealTitle, setMealTitle] = useState("");
    const [mealDescription, setMealDescription] = useState("");
    const [mealNotes, setMealNotes] = useState("");
    const [saving, setSaving] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [suggesting, setSuggesting] = useState(false);

    // AI Generator Modal States
    const [isAIModalOpen, setIsAIModalOpen] = useState(false);
    const [aiMealMode, setAIMealMode] = useState<"both" | "lunch" | "dinner" | "smart_mix">("both");
    const [aiPreferences, setAIPreferences] = useState("");
    const [aiGenerating, setAIGenerating] = useState(false);
    const [aiError, setAIError] = useState<string | null>(null);
    const [loadingTip, setLoadingTip] = useState("Sto studiando i tuoi pasti consumati nelle ultime 4 settimane per evitare doppioni...");

    // AI Single Meal Generator Modal States
    const [isAISingleModalOpen, setIsAISingleModalOpen] = useState(false);
    const [aiSingleDay, setAISingleDay] = useState<DayOfWeek | null>(null);
    const [aiSingleType, setAISingleType] = useState<MealType | null>(null);
    const [aiSingleMeal, setAISingleMeal] = useState<Meal | null>(null);
    const [aiSinglePreferences, setAISinglePreferences] = useState("");
    const [aiSingleGenerating, setAISingleGenerating] = useState(false);
    const [isClearConfirmOpen, setIsClearConfirmOpen] = useState(false);

    const loadingTips = [
        "Sto analizzando i tuoi pasti delle ultime 4 settimane per garantire un menu sempre vario...",
        "Sto combinando carboidrati, proteine nobili e verdure per una nutrizione equilibrata...",
        "Lo sapevi? Variare i cereali (farro, orzo, riso) fornisce uno spettro più ampio di nutrienti!",
        "Suggerimento: includere pasti a base di legumi 3 volte a settimana fa bene a te e al pianeta.",
        "L'IA sta componendo abbinamenti gustosi e sfiziosi per la tua famiglia...",
        "Cucire il menu in base alle tue preferenze culinarie... Quasi pronto!",
    ];

    // Cycle through fun, helpful tips while AI generates menu
    useEffect(() => {
        let interval: NodeJS.Timeout;
        if (aiGenerating) {
            let index = 0;
            interval = setInterval(() => {
                index = (index + 1) % loadingTips.length;
                setLoadingTip(loadingTips[index]);
            }, 3000);
        }
        return () => clearInterval(interval);
    }, [aiGenerating]);

    const loadData = async () => {
        setLoading(true);
        try {
            const res = await getWeekData(formatISODate(currentWeek.start));
            if (res.error) {
                console.error(res.error);
                setWeeklyMenu(null);
                setMeals([]);
            } else {
                setWeeklyMenu(res.menu);
                setMeals(res.meals);
            }
        } catch (err) {
            console.error("Failed to load week data:", err);
        } finally {
            setLoading(false);
        }
    };

    // Load weekly menu and meals for the current week
    useEffect(() => {
        loadData();
    }, [currentWeek]);

    const handlePrevWeek = () => {
        const newStart = new Date(currentWeek.start);
        newStart.setDate(newStart.getDate() - 7);
        const newEnd = new Date(newStart);
        newEnd.setDate(newEnd.getDate() + 6);
        newEnd.setHours(23, 59, 59, 999);
        setCurrentWeek({ start: newStart, end: newEnd });
    };
    const handleNextWeek = () => {
        const newStart = new Date(currentWeek.start);
        newStart.setDate(newStart.getDate() + 7);
        const newEnd = new Date(newStart);
        newEnd.setDate(newEnd.getDate() + 6);
        newEnd.setHours(23, 59, 59, 999);
        setCurrentWeek({ start: newStart, end: newEnd });
    };
    const handleCurrentWeek = () => {
        setCurrentWeek(getWeekRange(0));
    };

    const getMeal = (day: DayOfWeek, type: "lunch" | "dinner") => {
        return meals.find((m) => m.day_of_week === day && m.meal_type === type) || null;
    };

    const handleAddMeal = (day: DayOfWeek, type: "lunch" | "dinner") => {
        setSelectedDay(day);
        setSelectedType(type);
        setSelectedMeal(null);
        setMealTitle("");
        setMealDescription("");
        setMealNotes("");
        setIsModalOpen(true);
    };

    const handleEditMeal = (meal: Meal) => {
        setSelectedMeal(meal);
        setSelectedDay(meal.day_of_week);
        setSelectedType(meal.meal_type);
        setMealTitle(meal.title);
        setMealDescription(meal.description || "");
        setMealNotes(meal.notes || "");
        setIsModalOpen(true);
    };

    const handleSaveMeal = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!mealTitle.trim() || selectedDay === null || !selectedType) return;

        setSaving(true);
        try {
            const res = await saveMealAction({
                weekStart: formatISODate(currentWeek.start),
                dayOfWeek: selectedDay,
                mealType: selectedType,
                title: mealTitle,
                description: mealDescription,
                notes: mealNotes,
                mealId: selectedMeal?.id || null,
            });

            if (res.success) {
                setIsModalOpen(false);
                await loadData(); // Reload data from Neon DB
            } else {
                alert(res.error || "Impossibile salvare il pasto.");
            }
        } catch (error) {
            console.error(error);
            alert("Errore imprevisto durante il salvataggio.");
        } finally {
            setSaving(false);
        }
    };

    const handleDeleteMeal = async () => {
        if (!selectedMeal) return;

        if (!confirm("Sei sicuro di voler eliminare questo pasto?")) return;

        setDeleting(true);
        try {
            const res = await deleteMealAction(selectedMeal.id);
            if (res.success) {
                setIsModalOpen(false);
                await loadData(); // Reload data from Neon DB
            } else {
                alert(res.error || "Impossibile eliminare il pasto.");
            }
        } catch (error) {
            console.error(error);
            alert("Errore imprevisto durante l'eliminazione.");
        } finally {
            setDeleting(false);
        }
    };

    const handleSuggestSingleMeal = async () => {
        if (selectedDay === null || !selectedType) return;

        setSuggesting(true);
        try {
            const userPreferences = mealTitle.trim() || mealDescription.trim() || "";

            const res = await suggestSingleMealAction({
                weekStart: formatISODate(currentWeek.start),
                dayOfWeek: selectedDay,
                mealType: selectedType,
                userPreferences: userPreferences,
            });

            if (res.success && res.meal) {
                setMealTitle(res.meal.title);
                setMealDescription(res.meal.description);
                setMealNotes(res.meal.notes);
            } else {
                alert(res.error || "Impossibile generare il suggerimento con l'IA.");
            }
        } catch (error) {
            console.error(error);
            alert("Errore imprevisto durante la richiesta di suggerimento.");
        } finally {
            setSuggesting(false);
        }
    };

    const handleAIRegenerateSingle = (dayOfWeek: DayOfWeek, mealType: MealType, meal: Meal | null) => {
        setAISingleDay(dayOfWeek);
        setAISingleType(mealType);
        setAISingleMeal(meal);
        setAISinglePreferences("");
        setAISingleGenerating(false);
        setIsAISingleModalOpen(true);
    };

    const handleSubmitAISingleRegenerate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (aiSingleDay === null || !aiSingleType) return;

        setAISingleGenerating(true);
        try {
            const res = await regenerateSingleMealAction({
                weekStart: formatISODate(currentWeek.start),
                dayOfWeek: aiSingleDay,
                mealType: aiSingleType,
                userPreferences: aiSinglePreferences.trim(),
            });

            if (res.success) {
                setIsAISingleModalOpen(false);
                await loadData(); // Ricarica istantaneamente il calendario!
            } else {
                alert(res.error || "Impossibile rigenerare il pasto con l'IA.");
            }
        } catch (error) {
            console.error(error);
            alert("Errore imprevisto durante la rigenerazione del pasto.");
        } finally {
            setAISingleGenerating(false);
        }
    };

    const handleClearWeeklyMenu = () => {
        if (meals.length === 0) return;
        setIsClearConfirmOpen(true);
    };

    const handleSubmitClearWeeklyMenu = async () => {
        setIsClearConfirmOpen(false);
        setLoading(true);
        try {
            const res = await clearWeeklyMenuAction(formatISODate(currentWeek.start));
            if (res.success) {
                await loadData(); // Reload empty week data from Neon DB
            } else {
                alert(res.error || "Impossibile svuotare la settimana.");
            }
        } catch (error) {
            console.error(error);
            alert("Errore imprevisto durante lo svuotamento della settimana.");
        } finally {
            setLoading(false);
        }
    };

    const handleGenerateAIMenu = async (e: React.FormEvent) => {
        e.preventDefault();
        setAIGenerating(true);
        setAIError(null);
        try {
            const res = await generateAIMenuAction({
                weekStart: formatISODate(currentWeek.start),
                mealMode: aiMealMode,
                userPreferences: aiPreferences,
            });

            if (res.success) {
                setIsAIModalOpen(false);
                setAIPreferences("");
                await loadData(); // Reload freshly generated data!
            } else {
                setAIError(res.error || "Impossibile generare il menu con l'IA.");
            }
        } catch (err) {
            console.error(err);
            setAIError("Errore durante la connessione con l'intelligenza artificiale.");
        } finally {
            setAIGenerating(false);
        }
    };

    const today = new Date();
    const monday = getMondayOfWeek(currentWeek.start);

    // Get day name translation for modal title
    const daysItalian = ["Lunedì", "Martedì", "Mercoledì", "Giovedì", "Venerdì", "Sabato", "Domenica"];

    return (
        <div className="space-y-4">
            {/* Navigation Header */}
            <WeekNavigation
                weekStart={currentWeek.start}
                weekEnd={currentWeek.end}
                onPrevWeek={handlePrevWeek}
                onNextWeek={handleNextWeek}
                onCurrentWeek={handleCurrentWeek}
            />

            {/* Premium AI Menu Planner Banner */}
            <div className="relative overflow-hidden bg-gradient-to-tr from-white via-primary-50/20 to-indigo-50/40 border border-stone-200/60 rounded-3xl p-6 shadow-[0_8px_30px_rgb(0,0,0,0.03)] transition-all">
                <div className="absolute top-0 right-0 transform translate-x-12 -translate-y-6 opacity-5 pointer-events-none">
                    <Sparkles size={160} className="text-primary-600 animate-pulse" />
                </div>
                <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-5 relative z-10">
                    <div className="flex items-start gap-4">
                        <div className="p-3.5 bg-gradient-to-tr from-primary-600 to-indigo-600 rounded-2xl text-white shadow-[0_4px_15px_rgba(2,132,199,0.25)] flex-shrink-0">
                            <Sparkles size={20} className="animate-pulse" />
                        </div>
                        <div>
                            <h3 className="text-sm sm:text-base font-extrabold text-stone-800 tracking-tight flex items-center flex-wrap gap-2">
                                Pianificatore Intelligente con IA
                                <span className="bg-primary-100/60 text-primary-700 text-[9px] font-extrabold px-2.5 py-0.5 rounded-full uppercase tracking-widest border border-primary-200/30">
                                    Neon & Groq
                                </span>
                            </h3>
                            <p className="text-xs sm:text-sm text-stone-500 font-medium mt-1 leading-relaxed max-w-3xl">
                                Componi un menu personalizzato in un clic. L'IA analizzerà automaticamente i pasti degli 
                                ultimi 28 giorni per offrirti ricette completamente nuove ed evitare ripetizioni.
                            </p>
                        </div>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-2.5 w-full lg:w-auto shrink-0">
                        <button
                            onClick={() => {
                                setAIError(null);
                                setIsAIModalOpen(true);
                            }}
                            className="flex-1 lg:flex-initial flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-primary-600 to-indigo-600 hover:from-primary-700 hover:to-indigo-700 text-white rounded-2xl text-xs sm:text-sm font-bold shadow-md hover:shadow-lg transition-all active:scale-[0.98] group cursor-pointer"
                        >
                            <Sparkles size={14} />
                            Pianifica con IA
                            <ChevronRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
                        </button>
                        <button
                            onClick={handleClearWeeklyMenu}
                            disabled={meals.length === 0}
                            className="flex-1 lg:flex-initial flex items-center justify-center gap-2 px-6 py-3 border border-stone-200 hover:bg-red-50/40 text-stone-600 hover:text-red-650 hover:border-red-200 disabled:opacity-40 disabled:hover:bg-transparent disabled:cursor-not-allowed rounded-2xl text-xs sm:text-sm font-bold transition-all active:scale-[0.98] cursor-pointer"
                        >
                            <Trash2 size={14} />
                            Svuota Settimana
                        </button>
                    </div>
                </div>
            </div>

            {loading ? (
                <div className="flex flex-col items-center justify-center min-h-[400px] bg-white rounded-2xl border border-stone-200 shadow-sm p-8">
                    <svg
                        className="animate-spin h-8 w-8 text-primary-600 mb-4"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                    >
                        <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                        />
                        <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                        />
                    </svg>
                    <p className="text-sm font-medium text-stone-500">Caricamento del menu familiare...</p>
                </div>
            ) : (
                <div className="space-y-6">
                    {/* Desktop/Tablet Landscape Grid (Widescreen >= 1024px) */}
                    <div className="hidden lg:grid grid-cols-[120px_1fr_1fr_1fr_1fr_1fr_1fr_1fr] gap-4 items-stretch">
                        {/* Headers */}
                        <div className="flex items-center justify-center bg-stone-50/50 rounded-2xl border border-stone-200/40 font-extrabold text-xs sm:text-[13px] text-stone-500 uppercase tracking-widest">
                            Giorni
                        </div>
                        {Array.from({ length: 7 }).map((_, i) => {
                            const dayOfWeek = i as DayOfWeek;
                            const date = getDateForDayOfWeek(monday, dayOfWeek);
                            const dayName = daysItalian[dayOfWeek];
                            const dayNumber = date.getDate().toString();
                            const monthName = date.toLocaleDateString("it-IT", { month: "short" }).replace(".", "");
                            const isToday =
                                today.getDate() === date.getDate() &&
                                today.getMonth() === date.getMonth() &&
                                today.getFullYear() === date.getFullYear();

                            return (
                                <div
                                    key={i}
                                    className={`px-2 py-3.5 text-center border rounded-2xl transition-all duration-300 ${
                                        isToday
                                            ? "bg-primary-100/70 border-primary-350 shadow-[0_4px_15px_rgba(14,165,233,0.06)]"
                                            : "bg-stone-50/50 border-stone-200/50"
                                    }`}
                                >
                                    <p className="text-[11px] sm:text-xs lg:text-[13px] font-extrabold uppercase text-stone-400 tracking-widest leading-none mb-1.5">{dayName}</p>
                                    <p className={`text-xl sm:text-2xl font-black tracking-tight my-1 leading-none ${isToday ? "text-primary-700" : "text-stone-800"}`}>
                                        {dayNumber}
                                    </p>
                                    <p className="text-[10px] sm:text-[11px] lg:text-xs font-extrabold text-stone-400 uppercase tracking-widest leading-none mt-1.5">{monthName}</p>
                                </div>
                            );
                        })}

                        {/* Row 1: Lunches */}
                        <div className="flex flex-col items-center justify-center bg-amber-50/50 rounded-2xl border border-amber-200/40 p-4 text-center self-stretch min-h-[132px]">
                            <Sun size={26} className="text-amber-500 animate-pulse mb-2 shrink-0" />
                            <span className="text-xs sm:text-[13.5px] font-black text-amber-700 uppercase tracking-wider">Pranzi</span>
                        </div>
                        {Array.from({ length: 7 }).map((_, i) => {
                            const dayOfWeek = i as DayOfWeek;
                            const isToday =
                                today.getDate() === getDateForDayOfWeek(monday, dayOfWeek).getDate() &&
                                today.getMonth() === getDateForDayOfWeek(monday, dayOfWeek).getMonth() &&
                                today.getFullYear() === getDateForDayOfWeek(monday, dayOfWeek).getFullYear();
                            return (
                                <div key={i} className={`rounded-2xl transition-all duration-350 ${isToday ? "bg-primary-50/10" : ""}`}>
                                    <MealSlot
                                        mealType="lunch"
                                        meal={getMeal(dayOfWeek, "lunch")}
                                        onAdd={(mt) => handleAddMeal(dayOfWeek, mt)}
                                        onEdit={handleEditMeal}
                                        onAIRegenerate={(meal) => handleAIRegenerateSingle(dayOfWeek, "lunch", meal)}
                                    />
                                </div>
                            );
                        })}

                        {/* Row 2: Dinners */}
                        <div className="flex flex-col items-center justify-center bg-indigo-50/50 rounded-2xl border border-indigo-200/40 p-4 text-center self-stretch min-h-[132px]">
                            <Moon size={24} className="text-indigo-500 animate-pulse mb-2 shrink-0" />
                            <span className="text-xs sm:text-[13.5px] font-black text-indigo-700 uppercase tracking-wider">Cene</span>
                        </div>
                        {Array.from({ length: 7 }).map((_, i) => {
                            const dayOfWeek = i as DayOfWeek;
                            const isToday =
                                today.getDate() === getDateForDayOfWeek(monday, dayOfWeek).getDate() &&
                                today.getMonth() === getDateForDayOfWeek(monday, dayOfWeek).getMonth() &&
                                today.getFullYear() === getDateForDayOfWeek(monday, dayOfWeek).getFullYear();
                            return (
                                <div key={i} className={`rounded-2xl transition-all duration-350 ${isToday ? "bg-primary-50/10" : ""}`}>
                                    <MealSlot
                                        mealType="dinner"
                                        meal={getMeal(dayOfWeek, "dinner")}
                                        onAdd={(mt) => handleAddMeal(dayOfWeek, mt)}
                                        onEdit={handleEditMeal}
                                        onAIRegenerate={(meal) => handleAIRegenerateSingle(dayOfWeek, "dinner", meal)}
                                    />
                                </div>
                            );
                        })}
                    </div>

                    {/* Mobile/Tablet Grid Layout (Vertical stacks < 1024px) */}
                    <div className="lg:hidden grid grid-cols-1 md:grid-cols-2 gap-4">
                        {Array.from({ length: 7 }).map((_, i) => {
                            const dayOfWeek = i as DayOfWeek;
                            const isToday =
                                today.getDate() === getDateForDayOfWeek(monday, dayOfWeek).getDate() &&
                                today.getMonth() === getDateForDayOfWeek(monday, dayOfWeek).getMonth() &&
                                today.getFullYear() === getDateForDayOfWeek(monday, dayOfWeek).getFullYear();
                            return (
                                <DayColumn
                                    key={i}
                                    dayOfWeek={dayOfWeek}
                                    monday={monday}
                                    lunch={getMeal(dayOfWeek, "lunch")}
                                    dinner={getMeal(dayOfWeek, "dinner")}
                                    onAdd={handleAddMeal}
                                    onEdit={handleEditMeal}
                                    isToday={isToday}
                                    onAIRegenerate={handleAIRegenerateSingle}
                                />
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Shopping List Section */}
            {!loading && (
                <ShoppingList 
                    meals={meals} 
                    weekStartStr={formatISODate(currentWeek.start)} 
                />
            )}

            {/* AIGeneratorModal - AI Menu Planner Modal */}
            <Modal
                open={isAIModalOpen}
                onClose={() => !aiGenerating && setIsAIModalOpen(false)}
                title="Pianifica Menu Settimanale con IA"
            >
                {aiGenerating ? (
                    <div className="flex flex-col items-center justify-center py-10 px-4 space-y-6">
                        {/* Elegant Glowing Loading Ring */}
                        <div className="relative">
                            <div className="h-16 w-16 rounded-full border-4 border-primary-100 border-t-primary-600 animate-spin" />
                            <div className="absolute inset-0 flex items-center justify-center text-primary-600 animate-pulse">
                                <Sparkles size={24} />
                            </div>
                        </div>

                        <div className="text-center space-y-2 max-w-sm">
                            <h4 className="text-base font-bold text-stone-800">Generazione del menu in corso...</h4>
                            <p className="text-sm text-stone-500 leading-relaxed min-h-[60px] italic">
                                "{loadingTip}"
                            </p>
                        </div>
                    </div>
                ) : (
                    <form onSubmit={handleGenerateAIMenu} className="space-y-5">
                        {aiError && (
                            <div className="flex items-start gap-2.5 p-3.5 bg-red-50 border border-red-100 rounded-xl text-red-700 text-sm">
                                <AlertCircle size={18} className="shrink-0 mt-0.5" />
                                <span className="font-medium">{aiError}</span>
                            </div>
                        )}

                        {/* Pastes to generate selector */}
                        <div>
                            <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider mb-2">
                                Quali pasti desideri pianificare?
                            </label>
                            <div className="grid grid-cols-2 gap-2.5">
                                {[
                                    { id: "both", label: "Tutti i pasti", desc: "Pranzo e Cena", icon: Utensils },
                                    { id: "smart_mix", label: "Mix Feriale/Festivo", desc: "Cene Lun-Ven + Pranzi/Cene Sab-Dom", icon: CalendarRange },
                                    { id: "lunch", label: "Solo Pranzi", desc: "Ogni Giorno", icon: Utensils },
                                    { id: "dinner", label: "Solo Cene", desc: "Ogni Giorno", icon: Utensils },
                                ].map((mode) => {
                                    const IconComponent = mode.icon;
                                    return (
                                        <button
                                            key={mode.id}
                                            type="button"
                                            onClick={() => setAIMealMode(mode.id as any)}
                                            className={`flex flex-col items-center justify-center p-3 rounded-xl border transition-all text-center cursor-pointer ${
                                                aiMealMode === mode.id
                                                    ? "border-primary-600 bg-primary-50/50 text-primary-700 ring-2 ring-primary-100"
                                                    : "border-stone-200 hover:bg-stone-50 text-stone-600"
                                            }`}
                                        >
                                            <IconComponent size={18} className="mb-1" />
                                            <span className="text-xs font-bold">{mode.label}</span>
                                            <span className="text-[10px] text-stone-400 mt-0.5 font-medium leading-tight">{mode.desc}</span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Textarea Preferences */}
                        <div>
                            <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider mb-1" htmlFor="ai-pref">
                                Preferenze e indicazioni speciali (Opzionale)
                            </label>
                            <textarea
                                id="ai-pref"
                                rows={3}
                                value={aiPreferences}
                                onChange={(e) => setAIPreferences(e.target.value)}
                                className="w-full border border-stone-200 rounded-xl px-3.5 py-2.5 text-stone-700 bg-stone-50/50 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:bg-white transition-all text-sm"
                                placeholder="Es. Pasti leggeri a pranzo e più ricchi a cena, preferenza pesce, pasta integrale, ricette vegetariane, ecc..."
                            />
                        </div>

                        {/* Duplication Checker Info */}
                        <div className="bg-stone-50 border border-stone-150 rounded-xl p-3.5 space-y-2">
                            <h4 className="text-xs font-bold text-stone-700 uppercase tracking-wider flex items-center gap-1.5">
                                <CheckCircle2 size={15} className="text-green-600" />
                                Filtro Antiduplicati Attivo
                            </h4>
                            <p className="text-xs text-stone-500 leading-relaxed font-medium">
                                L'intelligenza artificiale consulterà la cronologia dei tuoi pasti dal **Neon Database** 
                                per assicurarsi di non consigliarti nulla di ciò che hai consumato nelle ultime 4 settimane del mese.
                            </p>
                        </div>

                        {/* Bottom Actions */}
                        <div className="flex items-center justify-end gap-3 pt-3 border-t border-stone-100">
                            <button
                                type="button"
                                onClick={() => setIsAIModalOpen(false)}
                                className="px-4 py-2 border border-stone-200 text-stone-600 hover:bg-stone-50 rounded-xl text-sm font-semibold transition-colors cursor-pointer"
                            >
                                Annulla
                            </button>
                            <Button
                                type="submit"
                                className="px-5 py-2 bg-gradient-to-r from-primary-600 to-indigo-600 hover:from-primary-700 hover:to-indigo-700 text-white rounded-xl text-sm font-semibold shadow-md transition-all flex items-center gap-1.5"
                            >
                                <Sparkles size={14} />
                                Genera Menu
                            </Button>
                        </div>
                    </form>
                )}
            </Modal>

            {/* Standard Add/Edit Meal Modal */}
            <Modal
                open={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title={
                    selectedMeal
                        ? `Modifica Pasto - ${selectedType === "lunch" ? "Pranzo" : "Cena"} di ${
                              selectedDay !== null ? daysItalian[selectedDay] : ""
                          }`
                        : `Aggiungi Pasto - ${selectedType === "lunch" ? "Pranzo" : "Cena"} di ${
                              selectedDay !== null ? daysItalian[selectedDay] : ""
                          }`
                }
            >
                <form onSubmit={handleSaveMeal} className="space-y-4">
                    <div>
                        <div className="flex items-center justify-between mb-1.5">
                            <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wider" htmlFor="meal-title">
                                Nome del Pasto
                            </label>
                            <button
                                type="button"
                                onClick={handleSuggestSingleMeal}
                                disabled={suggesting}
                                className="flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] font-bold text-primary-700 bg-primary-50 border border-primary-200 hover:bg-primary-100/70 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg shadow-sm hover:shadow transition-all cursor-pointer"
                            >
                                <Sparkles size={11} className={suggesting ? "animate-spin" : "animate-pulse text-primary-500"} />
                                {suggesting ? "Suggerisco..." : "✨ Suggerisci con IA"}
                            </button>
                        </div>
                        <input
                            id="meal-title"
                            type="text"
                            required
                            value={mealTitle}
                            onChange={(e) => setMealTitle(e.target.value)}
                            className="w-full border border-stone-200 rounded-lg px-3 py-2 text-stone-700 bg-stone-50/50 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:bg-white transition-all text-sm font-medium"
                            placeholder="Es. Pasta al pesto, Petto di pollo... (o scrivi un ingrediente e clicca sopra!)"
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wider mb-1" htmlFor="meal-desc">
                            Descrizione / Ingredienti
                        </label>
                        <textarea
                            id="meal-desc"
                            value={mealDescription}
                            onChange={(e) => setMealDescription(e.target.value)}
                            rows={3}
                            className="w-full border border-stone-200 rounded-lg px-3 py-2 text-stone-700 bg-stone-50/50 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:bg-white transition-all text-sm"
                            placeholder="Dettagli sul pasto o ingredienti necessari..."
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wider mb-1" htmlFor="meal-notes">
                            Note Aggiuntive
                        </label>
                        <input
                            id="meal-notes"
                            type="text"
                            value={mealNotes}
                            onChange={(e) => setMealNotes(e.target.value)}
                            className="w-full border border-stone-200 rounded-lg px-3 py-2 text-stone-700 bg-stone-50/50 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:bg-white transition-all text-sm"
                            placeholder="Es. Scongelare la sera prima, Preparare in anticipo..."
                        />
                    </div>

                    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-stone-100">
                        {selectedMeal ? (
                            <button
                                type="button"
                                onClick={handleDeleteMeal}
                                disabled={deleting || saving}
                                className="w-full sm:w-auto px-4 py-2 border border-red-200 text-red-600 hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-sm font-medium transition-colors cursor-pointer"
                            >
                                {deleting ? "Eliminazione..." : "Elimina"}
                            </button>
                        ) : (
                            <div />
                        )}
                        <div className="flex w-full sm:w-auto gap-3">
                            <button
                                type="button"
                                onClick={() => setIsModalOpen(false)}
                                disabled={saving || deleting}
                                className="flex-1 sm:flex-none px-4 py-2 border border-stone-200 text-stone-600 hover:bg-stone-50 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-sm font-medium transition-colors cursor-pointer"
                            >
                                Annulla
                            </button>
                            <Button
                                type="submit"
                                loading={saving}
                                disabled={deleting}
                                className="flex-1 sm:flex-none px-5 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg text-sm font-medium shadow-md transition-all"
                            >
                                Salva
                            </Button>
                        </div>
                    </div>
                </form>
            </Modal>

            {/* AISinglePromptModal - AI Single Meal Planner Modal */}
            <Modal
                open={isAISingleModalOpen}
                onClose={() => !aiSingleGenerating && setIsAISingleModalOpen(false)}
                title={
                    aiSingleMeal 
                        ? `Rigenera ${aiSingleType === "lunch" ? "Pranzo" : "Cena"} di ${aiSingleDay !== null ? getDayName(aiSingleDay) : ""}`
                        : `Suggerisci ${aiSingleType === "lunch" ? "Pranzo" : "Cena"} di ${aiSingleDay !== null ? getDayName(aiSingleDay) : ""}`
                }
            >
                {aiSingleGenerating ? (
                    <div className="flex flex-col items-center justify-center py-10 px-4 space-y-6">
                        <div className="relative">
                            <div className="h-16 w-16 rounded-full border-4 border-primary-100 border-t-primary-600 animate-spin" />
                            <div className="absolute inset-0 flex items-center justify-center text-primary-600 animate-pulse">
                                <Sparkles size={24} />
                            </div>
                        </div>
                        <div className="text-center space-y-2 max-w-sm">
                            <h4 className="text-base font-bold text-stone-800">Generazione in corso...</h4>
                            <p className="text-sm text-stone-500 leading-relaxed italic">
                                "Sto componendo una ricetta unica e bilanciata..."
                            </p>
                        </div>
                    </div>
                ) : (
                    <form onSubmit={handleSubmitAISingleRegenerate} className="space-y-4">
                        {aiSingleMeal && (
                            <div className="bg-amber-50 border border-amber-100 rounded-xl p-3.5 text-xs text-amber-800">
                                <span className="font-bold">Sostituzione pasto corrente:</span> {aiSingleMeal.title}
                            </div>
                        )}
                        <div>
                            <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider mb-2" htmlFor="ai-single-pref">
                                Preferenze particolari (Opzionale)
                            </label>
                            <textarea
                                id="ai-single-pref"
                                rows={2}
                                value={aiSinglePreferences}
                                onChange={(e) => setAISinglePreferences(e.target.value)}
                                className="w-full border border-stone-200 rounded-xl px-3.5 py-2.5 text-stone-700 bg-stone-50/50 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:bg-white transition-all text-sm font-medium"
                                placeholder="Es. vegetariano, di pesce, leggero, senza glutine..."
                            />
                        </div>
                        <div className="flex items-center justify-end gap-3 pt-3 border-t border-stone-100">
                            <button
                                type="button"
                                onClick={() => setIsAISingleModalOpen(false)}
                                className="px-4 py-2 border border-stone-200 text-stone-600 hover:bg-stone-50 rounded-xl text-sm font-semibold transition-colors cursor-pointer"
                            >
                                Annulla
                            </button>
                            <Button
                                type="submit"
                                className="px-5 py-2 bg-gradient-to-r from-primary-600 to-indigo-600 hover:from-primary-700 hover:to-indigo-700 text-white rounded-xl text-sm font-semibold shadow-md transition-all"
                            >
                                <Sparkles size={14} />
                                Genera con IA
                            </Button>
                        </div>
                    </form>
                )}
            </Modal>

            {/* ClearConfirmModal - Confirm clearing all weekly meals */}
            <Modal
                open={isClearConfirmOpen}
                onClose={() => setIsClearConfirmOpen(false)}
                title="Svuota Settimana"
            >
                <div className="space-y-4">
                    <div className="flex items-start gap-3 p-3.5 bg-red-50 border border-red-150 rounded-xl text-red-800 text-sm">
                        <AlertCircle size={20} className="shrink-0 text-red-650 mt-0.5" />
                        <div className="space-y-1">
                            <h4 className="font-bold">Sei sicuro di voler procedere?</h4>
                            <p className="text-xs text-red-700 leading-relaxed font-medium">
                                Questa azione cancellerà permanentemente tutti i pasti programmati per questa settimana. La rimozione è immediata e non può essere annullata.
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center justify-end gap-3 pt-3 border-t border-stone-100">
                        <button
                            type="button"
                            onClick={() => setIsClearConfirmOpen(false)}
                            className="px-4 py-2 border border-stone-200 text-stone-600 hover:bg-stone-50 rounded-xl text-sm font-semibold transition-colors cursor-pointer"
                        >
                            Annulla
                        </button>
                        <button
                            type="button"
                            onClick={handleSubmitClearWeeklyMenu}
                            className="px-5 py-2 bg-red-600 hover:bg-red-750 text-white rounded-xl text-sm font-semibold shadow-md transition-all cursor-pointer"
                        >
                            Svuota la Settimana
                        </button>
                    </div>
                </div>
            </Modal>
        </div>
    );
}