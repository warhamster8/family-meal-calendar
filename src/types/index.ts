// ============================================================
// TypeScript type definitions for Family Meal Calendar
// ============================================================

// ---- Database Row Types ----

export interface Profile {
    id: string;
    name: string;
    avatar_url: string | null;
    created_at: string;
    updated_at: string;
}

export interface Family {
    id: string;
    name: string;
    invite_code: string;
    created_at: string;
    updated_at: string;
}

export interface FamilyMember {
    id: string;
    family_id: string;
    profile_id: string;
    role: "admin" | "member" | "viewer";
    color: string | null;
    joined_at: string;
    profile?: Profile;
}

export interface WeeklyMenu {
    id: string;
    family_id: string;
    week_start: string; // ISO date (Monday)
    week_end: string;   // ISO date (Sunday)
    notes: string | null;
    created_by: string;
    created_at: string;
    updated_at: string;
}

export type MealType = "lunch" | "dinner";
export type DayOfWeek = 0 | 1 | 2 | 3 | 4 | 5 | 6; // 0=Mon, 6=Sun

export interface Meal {
    id: string;
    weekly_menu_id: string;
    day_of_week: DayOfWeek;
    meal_type: MealType;
    title: string;
    description: string | null;
    notes: string | null;
    created_by: string;
    created_at: string;
    updated_at: string;
}

export interface Recipe {
    id: string;
    family_id: string;
    name: string;
    description: string | null;
    ingredients: string[] | null;
    instructions: string | null;
    link: string | null;
    image_url: string | null;
    created_by: string;
    created_at: string;
    updated_at: string;
}

// ---- Frontend / View Models ----

export interface MealSlot {
    dayOfWeek: DayOfWeek;
    mealType: MealType;
    meal: Meal | null;
}

export interface DayMeals {
    date: Date;
    dayName: string;
    dayOfWeek: DayOfWeek;
    lunch: Meal | null;
    dinner: Meal | null;
}

export interface WeekData {
    menu: WeeklyMenu;
    days: DayMeals[];
}

export interface WeekRange {
    start: Date; // Monday
    end: Date;   // Sunday
    label: string;
}

// ---- Form Types ----

export interface MealFormData {
    title: string;
    description?: string;
    notes?: string;
    meal_type: MealType;
    day_of_week: DayOfWeek;
}

export interface FamilyFormData {
    name: string;
}

export interface JoinFamilyData {
    invite_code: string;
}

// ---- Constants ----

export const DAY_NAMES: Record<DayOfWeek, string> = {
    0: "Lunedì",
    1: "Martedì",
    2: "Mercoledì",
    3: "Giovedì",
    4: "Venerdì",
    5: "Sabato",
    6: "Domenica",
};

export const DAY_NAMES_SHORT: Record<DayOfWeek, string> = {
    0: "Lun",
    1: "Mar",
    2: "Mer",
    3: "Gio",
    4: "Ven",
    5: "Sab",
    6: "Dom",
};

export const MEAL_TYPE_LABELS: Record<MealType, string> = {
    lunch: "Pranzo",
    dinner: "Cena",
};