import postgres from "postgres";
import fs from "fs";
import path from "path";
import crypto from "crypto";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
    throw new Error("DATABASE_URL environment variable is not defined");
}

const isPlaceholder = databaseUrl.includes("placeholder") || databaseUrl.includes("your-project-id");

// Prevent multiple database connections in development due to hot reloading
const globalForDb = globalThis as unknown as {
    conn: any | undefined;
};

let sqlExport: any;

if (!isPlaceholder) {
    // ─── REAL POSTGRESQL CONNECTION ──────────────────────────────────
    console.log("🔌 Connecting to real PostgreSQL/Neon Database...");
    sqlExport = globalForDb.conn ?? postgres(databaseUrl, {
        ssl: "require", // Neon requires SSL
    });
    if (process.env.NODE_ENV !== "production") {
        globalForDb.conn = sqlExport;
    }
} else {
    // ─── MOCK JSON DATABASE FALLBACK ─────────────────────────────────
    console.log("🎮 Using Local JSON Mock Database Fallback...");

    const DATA_DIR = path.join(process.cwd(), ".data");
    const DATA_FILE = path.join(DATA_DIR, "db.json");

    const initMockDb = () => {
        if (!fs.existsSync(DATA_DIR)) {
            fs.mkdirSync(DATA_DIR, { recursive: true });
        }
        if (!fs.existsSync(DATA_FILE)) {
            fs.writeFileSync(
                DATA_FILE,
                JSON.stringify(
                    {
                        users: [],
                        profiles: [],
                        families: [],
                        family_members: [],
                        weekly_menus: [],
                        meals: [],
                    },
                    null,
                    2
                )
            );
        }
    };

    const readData = () => {
        initMockDb();
        try {
            return JSON.parse(fs.readFileSync(DATA_FILE, "utf-8"));
        } catch (e) {
            return {
                users: [],
                profiles: [],
                families: [],
                family_members: [],
                weekly_menus: [],
                meals: [],
            };
        }
    };

    const writeData = (data: any) => {
        initMockDb();
        fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
    };

    // Construct a mock tagged template function
    const mockSql = function (strings: TemplateStringsArray, ...args: any[]) {
        const normalized = strings.join("?").replace(/\s+/g, " ").trim();
        const data = readData();

        console.log(`[MOCK DB] ${normalized}`);

        if (normalized.startsWith("SELECT id, email, password_hash FROM users WHERE email =")) {
            const email = args[0]?.toLowerCase().trim();
            const user = data.users.find((u: any) => u.email === email);
            return user ? [user] : [];
        }

        if (normalized.startsWith("SELECT id FROM users WHERE email =")) {
            const email = args[0]?.toLowerCase().trim();
            const user = data.users.find((u: any) => u.email === email);
            return user ? [{ id: user.id }] : [];
        }

        if (normalized.startsWith("INSERT INTO users (email, password_hash) VALUES (") || normalized.includes("INSERT INTO users")) {
            const email = args[0]?.toLowerCase().trim();
            const password_hash = args[1];
            const newId = crypto.randomUUID();
            const newUser = { id: newId, email, password_hash, created_at: new Date().toISOString(), updated_at: new Date().toISOString() };
            data.users.push(newUser);
            writeData(data);
            return [{ id: newId }];
        }

        if (normalized.startsWith("INSERT INTO profiles (id, name)")) {
            const id = args[0];
            const name = args[1];
            const newProfile = { id, name, avatar_url: null, created_at: new Date().toISOString(), updated_at: new Date().toISOString() };
            data.profiles.push(newProfile);
            writeData(data);
            return [];
        }

        if (normalized.startsWith("INSERT INTO families (name)")) {
            const name = args[0];
            const newId = crypto.randomUUID();
            const invite_code = Math.random().toString(36).substring(2, 10).toUpperCase();
            const newFamily = { id: newId, name, invite_code, created_at: new Date().toISOString(), updated_at: new Date().toISOString() };
            data.families.push(newFamily);
            writeData(data);
            return [{ id: newId }];
        }

        if (normalized.startsWith("INSERT INTO family_members")) {
            const family_id = args[0];
            const profile_id = args[1];
            const role = args[2] || "admin";
            const color = args[3] || "#f43f5e";
            const newMembership = { id: crypto.randomUUID(), family_id, profile_id, role, color, joined_at: new Date().toISOString() };
            data.family_members.push(newMembership);
            writeData(data);
            return [];
        }

        if (normalized.startsWith("SELECT id, email FROM users WHERE id =")) {
            const id = args[0];
            const user = data.users.find((u: any) => u.id === id);
            return user ? [{ id: user.id, email: user.email }] : [];
        }

        if (normalized.startsWith("SELECT name, avatar_url FROM profiles WHERE id =")) {
            const id = args[0];
            const profile = data.profiles.find((p: any) => p.id === id);
            return profile ? [{ name: profile.name, avatar_url: profile.avatar_url }] : [];
        }

        if (normalized.startsWith("SELECT family_id, role FROM family_members WHERE profile_id =")) {
            const profile_id = args[0];
            const member = data.family_members.find((m: any) => m.profile_id === profile_id);
            return member ? [{ family_id: member.family_id, role: member.role }] : [];
        }

        if (normalized.startsWith("SELECT * FROM weekly_menus WHERE family_id =") && normalized.includes("week_start =")) {
            const family_id = args[0];
            const week_start = args[1];
            const menu = data.weekly_menus.find((m: any) => m.family_id === family_id && m.week_start === week_start);
            return menu ? [menu] : [];
        }

        if (normalized.startsWith("SELECT id FROM weekly_menus WHERE family_id =") && normalized.includes("week_start =")) {
            const family_id = args[0];
            const week_start = args[1];
            const menu = data.weekly_menus.find((m: any) => m.family_id === family_id && m.week_start === week_start);
            return menu ? [{ id: menu.id }] : [];
        }

        if (normalized.startsWith("SELECT * FROM meals WHERE weekly_menu_id =") && normalized.includes("ORDER BY day_of_week, meal_type")) {
            const weekly_menu_id = args[0];
            const meals = data.meals
                .filter((m: any) => m.weekly_menu_id === weekly_menu_id)
                .sort((a: any, b: any) => {
                    if (a.day_of_week !== b.day_of_week) {
                        return a.day_of_week - b.day_of_week;
                    }
                    return a.meal_type.localeCompare(b.meal_type);
                });
            return meals;
        }

        if (normalized.startsWith("INSERT INTO weekly_menus (family_id, week_start, week_end, created_by)")) {
            const family_id = args[0];
            const week_start = args[1];
            const week_end = args[2];
            const created_by = args[3];
            const newId = crypto.randomUUID();
            const newMenu = {
                id: newId,
                family_id,
                week_start,
                week_end,
                notes: null,
                created_by,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
            };
            data.weekly_menus.push(newMenu);
            writeData(data);
            return [{ id: newId }];
        }

        if (normalized.startsWith("SELECT m.id FROM meals m JOIN weekly_menus wm ON wm.id = m.weekly_menu_id WHERE m.id =") && normalized.includes("wm.family_id =")) {
            const mealId = args[0];
            const familyId = args[1];
            const meal = data.meals.find((m: any) => m.id === mealId);
            if (!meal) return [];
            const menu = data.weekly_menus.find((wm: any) => wm.id === meal.weekly_menu_id && wm.family_id === familyId);
            return menu ? [{ id: meal.id }] : [];
        }

        if (normalized.startsWith("UPDATE meals SET title =")) {
            const title = args[0];
            const description = args[1];
            const notes = args[2];
            const id = args[3];
            const mealIndex = data.meals.findIndex((m: any) => m.id === id);
            if (mealIndex !== -1) {
                data.meals[mealIndex].title = title;
                data.meals[mealIndex].description = description;
                data.meals[mealIndex].notes = notes;
                data.meals[mealIndex].updated_at = new Date().toISOString();
                writeData(data);
            }
            return [];
        }

        if (normalized.startsWith("SELECT id FROM meals WHERE weekly_menu_id =") && normalized.includes("day_of_week =") && normalized.includes("meal_type =")) {
            const weekly_menu_id = args[0];
            const day_of_week = args[1];
            const meal_type = args[2];
            const meal = data.meals.find((m: any) => m.weekly_menu_id === weekly_menu_id && m.day_of_week === Number(day_of_week) && m.meal_type === meal_type);
            return meal ? [{ id: meal.id }] : [];
        }

        if (normalized.startsWith("INSERT INTO meals")) {
            const weekly_menu_id = args[0];
            const day_of_week = args[1];
            const meal_type = args[2];
            const title = args[3];
            const description = args[4];
            const notes = args[5];
            const created_by = args[6];
            const newMeal = {
                id: crypto.randomUUID(),
                weekly_menu_id,
                day_of_week: Number(day_of_week),
                meal_type,
                title,
                description,
                notes,
                created_by,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
            };
            data.meals.push(newMeal);
            writeData(data);
            return [];
        }

        if (normalized.startsWith("DELETE FROM meals WHERE id =") && normalized.includes("weekly_menu_id IN ( SELECT id FROM weekly_menus WHERE family_id =")) {
            const mealId = args[0];
            const familyId = args[1];
            const meal = data.meals.find((m: any) => m.id === mealId);
            if (!meal) return [];
            const menu = data.weekly_menus.find((wm: any) => wm.id === meal.weekly_menu_id && wm.family_id === familyId);
            if (menu) {
                data.meals = data.meals.filter((m: any) => m.id !== mealId);
                writeData(data);
                return [{ id: mealId }];
            }
            return [];
        }

        if (normalized.startsWith("DELETE FROM meals WHERE weekly_menu_id IN ( SELECT id FROM weekly_menus WHERE family_id =") && normalized.includes("week_start =")) {
            const familyId = args[0];
            const weekStart = args[1];
            const menus = data.weekly_menus.filter((wm: any) => wm.family_id === familyId && wm.week_start === weekStart);
            const menuIds = menus.map((wm: any) => wm.id);
            data.meals = data.meals.filter((m: any) => !menuIds.includes(m.weekly_menu_id));
            writeData(data);
            return [];
        }

        if (normalized.startsWith("SELECT m.title, m.description FROM meals m JOIN weekly_menus wm ON m.weekly_menu_id = wm.id WHERE wm.family_id =") && normalized.includes("wm.week_start <")) {
            const familyId = args[0];
            const weekStart = args[1];
            const fourWeeksAgoStr = args[2];
            const matchingMenus = data.weekly_menus.filter((wm: any) => 
                wm.family_id === familyId && 
                wm.week_start < weekStart && 
                wm.week_start >= fourWeeksAgoStr
            );
            const menuIds = matchingMenus.map((wm: any) => wm.id);
            const matchingMeals = data.meals.filter((m: any) => menuIds.includes(m.weekly_menu_id));
            return matchingMeals.map((m: any) => ({ title: m.title, description: m.description }));
        }

        if (normalized.startsWith("SELECT m.title, m.description FROM meals m JOIN weekly_menus wm ON m.weekly_menu_id = wm.id WHERE wm.family_id =") && normalized.includes("wm.week_start <=")) {
            const familyId = args[0];
            const weekStart = args[1];
            const fourWeeksAgoStr = args[2];
            const matchingMenus = data.weekly_menus.filter((wm: any) => 
                wm.family_id === familyId && 
                wm.week_start <= weekStart && 
                wm.week_start >= fourWeeksAgoStr
            );
            const menuIds = matchingMenus.map((wm: any) => wm.id);
            const matchingMeals = data.meals.filter((m: any) => menuIds.includes(m.weekly_menu_id));
            return matchingMeals.map((m: any) => ({ title: m.title, description: m.description }));
        }

        return [];
    };

    mockSql.begin = async function (cb: (sql: any) => Promise<any>) {
        console.log(`[MOCK DB] Transaction Begin`);
        try {
            const res = await cb(mockSql);
            console.log(`[MOCK DB] Transaction Commit`);
            return res;
        } catch (e) {
            console.error(`[MOCK DB] Transaction Rollback:`, e);
            throw e;
        }
    };

    mockSql.unsafe = async function (queryString: string) {
        console.log(`[MOCK DB] Unsafe execution: ${queryString}`);
        if (queryString.includes("DROP TABLE IF EXISTS")) {
            console.log(`[MOCK DB] Resetting tables...`);
            writeData({
                users: [],
                profiles: [],
                families: [],
                family_members: [],
                weekly_menus: [],
                meals: [],
            });
        }
        return [];
    };

    mockSql.end = async function () {
        console.log(`[MOCK DB] Connection End`);
    };

    sqlExport = mockSql;
}

export const sql = sqlExport;
