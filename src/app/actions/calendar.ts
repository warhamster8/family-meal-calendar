"use server";

import { sql } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { WeeklyMenu, Meal, DayOfWeek, MealType } from "@/types";
import { formatISODate } from "@/utils/dates";

interface WeekDataResponse {
    menu: WeeklyMenu | null;
    meals: Meal[];
    error?: string;
}

interface SaveMealInput {
    weekStart: string;
    dayOfWeek: DayOfWeek;
    mealType: MealType;
    title: string;
    description?: string | null;
    notes?: string | null;
    mealId?: string | null;
}

interface ActionResponse {
    success: boolean;
    error?: string;
}

/**
 * Fetch weekly menu and meals for the given week (Monday date as ISO string)
 */
export async function getWeekData(weekStart: string): Promise<WeekDataResponse> {
    const user = await getCurrentUser();
    if (!user) {
        return { menu: null, meals: [], error: "Sessione non valida o scaduta." };
    }

    if (!user.familyId) {
        return { menu: null, meals: [], error: "Nessuna famiglia associata a questo profilo." };
    }

    try {
        // Query weekly menu for the user's family
        const menus = await sql`
            SELECT * FROM weekly_menus 
            WHERE family_id = ${user.familyId} AND week_start = ${weekStart}
        `;

        if (menus.length === 0) {
            return { menu: null, meals: [] };
        }

        const menu = menus[0] as unknown as WeeklyMenu;

        // Query all meals belonging to the found weekly menu
        const meals = await sql`
            SELECT * FROM meals 
            WHERE weekly_menu_id = ${menu.id}
            ORDER BY day_of_week, meal_type
        ` as unknown as Meal[];

        return { menu, meals };
    } catch (error) {
        console.error("Error fetching week data:", error);
        return { menu: null, meals: [], error: "Impossibile recuperare i pasti della settimana." };
    }
}

/**
 * Save (create or update) a meal slot.
 * Automatically initializes a weekly menu record in database if one does not exist yet.
 */
export async function saveMealAction(input: SaveMealInput): Promise<ActionResponse> {
    const user = await getCurrentUser();
    if (!user || !user.familyId) {
        return { success: false, error: "Non sei autorizzato a compiere questa azione." };
    }

    const { weekStart, dayOfWeek, mealType, title, description, notes, mealId } = input;

    if (!title || title.trim() === "") {
        return { success: false, error: "Il titolo del pasto è obbligatorio." };
    }

    try {
        await sql.begin(async (sql) => {
            // 1. Ensure the weekly menu exists for this family and week
            let menuId: string;
            const menus = await sql`
                SELECT id FROM weekly_menus 
                WHERE family_id = ${user.familyId} AND week_start = ${weekStart}
            `;

            if (menus.length === 0) {
                // Calculate week end (Sunday is 6 days after Monday start)
                const start = new Date(weekStart);
                const end = new Date(start);
                end.setDate(start.getDate() + 6);
                
                const [newMenu] = await sql`
                    INSERT INTO weekly_menus (family_id, week_start, week_end, created_by)
                    VALUES (${user.familyId}, ${weekStart}, ${formatISODate(end)}, ${user.id})
                    RETURNING id
                `;
                menuId = newMenu.id;
            } else {
                menuId = menus[0].id;
            }

            // 2. Insert or update the meal
            if (mealId) {
                // Check if meal exists and belongs to the family
                const existing = await sql`
                    SELECT m.id FROM meals m
                    JOIN weekly_menus wm ON wm.id = m.weekly_menu_id
                    WHERE m.id = ${mealId} AND wm.family_id = ${user.familyId}
                `;

                if (existing.length === 0) {
                    throw new Error("Pasto non trovato o non autorizzato.");
                }

                await sql`
                    UPDATE meals 
                    SET title = ${title.trim()}, 
                        description = ${description?.trim() || null}, 
                        notes = ${notes?.trim() || null}, 
                        updated_at = now()
                    WHERE id = ${mealId}
                `;
            } else {
                // Check if a meal is already inserted for this slot to avoid duplicates
                const duplicate = await sql`
                    SELECT id FROM meals 
                    WHERE weekly_menu_id = ${menuId} AND day_of_week = ${dayOfWeek} AND meal_type = ${mealType}
                `;

                if (duplicate.length > 0) {
                    // Update instead of insert if it already exists
                    await sql`
                        UPDATE meals 
                        SET title = ${title.trim()}, 
                            description = ${description?.trim() || null}, 
                            notes = ${notes?.trim() || null}, 
                            updated_at = now()
                        WHERE id = ${duplicate[0].id}
                    `;
                } else {
                    await sql`
                        INSERT INTO meals (weekly_menu_id, day_of_week, meal_type, title, description, notes, created_by)
                        VALUES (${menuId}, ${dayOfWeek}, ${mealType}, ${title.trim()}, ${description?.trim() || null}, ${notes?.trim() || null}, ${user.id})
                    `;
                }
            }
        });

        return { success: true };
    } catch (error: any) {
        console.error("Error saving meal:", error);
        return { success: false, error: error.message || "Errore nel salvataggio del pasto." };
    }
}

/**
 * Delete a meal slot.
 */
export async function deleteMealAction(mealId: string): Promise<ActionResponse> {
    const user = await getCurrentUser();
    if (!user || !user.familyId) {
        return { success: false, error: "Non sei autorizzato." };
    }

    try {
        const deleted = await sql`
            DELETE FROM meals 
            WHERE id = ${mealId} AND weekly_menu_id IN (
                SELECT id FROM weekly_menus WHERE family_id = ${user.familyId}
            )
            RETURNING id
        `;

        if (deleted.length === 0) {
            return { success: false, error: "Pasto non trovato o non autorizzato." };
        }

        return { success: true };
    } catch (error) {
        console.error("Error deleting meal:", error);
        return { success: false, error: "Impossibile eliminare il pasto." };
    }
}

/**
 * Clear all meals for a given week.
 */
export async function clearWeeklyMenuAction(weekStart: string): Promise<ActionResponse> {
    const user = await getCurrentUser();
    if (!user || !user.familyId) {
        return { success: false, error: "Non sei autorizzato a compiere questa azione." };
    }

    try {
        await sql`
            DELETE FROM meals 
            WHERE weekly_menu_id IN (
                SELECT id FROM weekly_menus 
                WHERE family_id = ${user.familyId} AND week_start = ${weekStart}
            )
        `;

        return { success: true };
    } catch (error) {
        console.error("Error clearing weekly menu:", error);
        return { success: false, error: "Impossibile svuotare il menu della settimana." };
    }
}
