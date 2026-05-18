/**
 * Date utilities for the Family Meal Calendar.
 * Uses native Date methods (no external deps needed — date-fns is optional).
 */

import { DayOfWeek } from "@/types";

/**
 * Get the Monday of the week containing the given date.
 * ISO weeks start on Monday.
 */
export function getMondayOfWeek(date: Date): Date {
    const d = new Date(date);
    const day = d.getDay(); // 0=Sun, 1=Mon, ..., 6=Sat
    const diff = day === 0 ? -6 : 1 - day; // Monday is 1
    d.setDate(d.getDate() + diff);
    d.setHours(0, 0, 0, 0);
    return d;
}

/**
 * Get the Sunday of the week containing the given date.
 */
export function getSundayOfWeek(date: Date): Date {
    const monday = getMondayOfWeek(date);
    const sunday = new Date(monday);
    sunday.setDate(sunday.getDate() + 6);
    sunday.setHours(23, 59, 59, 999);
    return sunday;
}

/**
 * Get a date range for a given week offset (0 = current week).
 */
export function getWeekRange(offset: number = 0): { start: Date; end: Date } {
    const today = new Date();
    const monday = getMondayOfWeek(today);
    monday.setDate(monday.getDate() + offset * 7);
    const sunday = getSundayOfWeek(monday);
    return { start: monday, end: sunday };
}

/**
 * Format a date as YYYY-MM-DD (ISO date string, local timezone).
 */
export function formatISODate(date: Date): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
}

/**
 * Format a date as a readable Italian label, e.g. "18 Maggio 2026".
 */
export function formatDateLabel(date: Date): string {
    return date.toLocaleDateString("it-IT", {
        day: "numeric",
        month: "long",
        year: "numeric",
    });
}

/**
 * Format a week range label, e.g. "12 - 18 Maggio 2026".
 */
export function formatWeekLabel(start: Date, end: Date): string {
    const startDay = start.getDate();
    const endDay = end.getDate();
    const month = start.toLocaleDateString("it-IT", { month: "long" });
    const year = start.getFullYear();
    return `${startDay} - ${endDay} ${month} ${year}`;
}

/**
 * Get the day name in Italian for a given DayOfWeek.
 */
export function getDayName(dayOfWeek: DayOfWeek): string {
    const names: Record<DayOfWeek, string> = {
        0: "Lunedì",
        1: "Martedì",
        2: "Mercoledì",
        3: "Giovedì",
        4: "Venerdì",
        5: "Sabato",
        6: "Domenica",
    };
    return names[dayOfWeek];
}

/**
 * Get the short day name in Italian for a given DayOfWeek.
 */
export function getDayNameShort(dayOfWeek: DayOfWeek): string {
    const names: Record<DayOfWeek, string> = {
        0: "Lun",
        1: "Mar",
        2: "Mer",
        3: "Gio",
        4: "Ven",
        5: "Sab",
        6: "Dom",
    };
    return names[dayOfWeek];
}

/**
 * Convert a Date to a DayOfWeek (0=Mon, 6=Sun).
 */
export function dateToDayOfWeek(date: Date): DayOfWeek {
    const jsDay = date.getDay(); // 0=Sun, 1=Mon
    return ((jsDay + 6) % 7) as DayOfWeek; // 0=Mon, 6=Sun
}

/**
 * Get a Date for a specific day in a week from Monday.
 */
export function getDateForDayOfWeek(monday: Date, dayOfWeek: DayOfWeek): Date {
    const d = new Date(monday);
    d.setDate(d.getDate() + dayOfWeek);
    return d;
}

/**
 * Get the current week's Monday date as ISO string.
 */
export function getCurrentWeekStart(): string {
    return formatISODate(getMondayOfWeek(new Date()));
}