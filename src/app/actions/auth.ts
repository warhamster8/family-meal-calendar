"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { sql } from "@/lib/db";
import { signSession } from "@/lib/session";

interface AuthResponse {
    success: boolean;
    error?: string;
}

/**
 * Server Action to log in an existing user
 */
export async function loginAction(formData: FormData): Promise<AuthResponse> {
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;

    if (!email || !password) {
        return { success: false, error: "Tutti i campi sono obbligatori." };
    }

    try {
        // Find user by email
        const users = await sql`
            SELECT id, email, password_hash FROM users WHERE email = ${email.toLowerCase().trim()}
        `;

        if (users.length === 0) {
            return { success: false, error: "Credenziali non valide." };
        }

        const user = users[0];

        // Compare password hashes
        const matches = await bcrypt.compare(password, user.password_hash);
        if (!matches) {
            return { success: false, error: "Credenziali non valide." };
        }

        // Fetch user's family membership if any
        const memberships = await sql`
            SELECT family_id FROM family_members WHERE profile_id = ${user.id} LIMIT 1
        `;
        const familyId = memberships[0]?.family_id || null;

        // Sign JWT session token
        const token = await signSession({
            userId: user.id,
            email: user.email,
            familyId,
        });

        // Set secure HTTP-only cookie
        const cookieStore = await cookies();
        cookieStore.set("session", token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            path: "/",
            maxAge: 60 * 60 * 24 * 7, // 7 days
        });

        return { success: true };
    } catch (error) {
        console.error("Login error:", error);
        return { success: false, error: "Si è verificato un errore durante l'accesso." };
    }
}

/**
 * Server Action to sign up a new user, setting up a default profile,
 * a default family, and an administrator family membership.
 */
export async function signupAction(formData: FormData): Promise<AuthResponse> {
    const name = formData.get("name") as string;
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;

    if (!name || !email || !password) {
        return { success: false, error: "Tutti i campi sono obbligatori." };
    }

    if (password.length < 6) {
        return { success: false, error: "La password deve contenere almeno 6 caratteri." };
    }

    try {
        // Check if user already exists
        const existingUsers = await sql`
            SELECT id FROM users WHERE email = ${email.toLowerCase().trim()}
        `;

        if (existingUsers.length > 0) {
            return { success: false, error: "Un utente con questa email esiste già." };
        }

        // Hash the password securely
        const salt = await bcrypt.genSalt(10);
        const hash = await bcrypt.hash(password, salt);

        let userId = "";
        let familyId = "";

        // Execute sign up operations inside a safe transaction
        await sql.begin(async (sql: any) => {
            // 1. Create user record
            const [user] = await sql`
                INSERT INTO users (email, password_hash)
                VALUES (${email.toLowerCase().trim()}, ${hash})
                RETURNING id
            `;
            userId = user.id;

            // 2. Create profile record
            await sql`
                INSERT INTO profiles (id, name)
                VALUES (${userId}, ${name.trim()})
            `;

            // 3. Create a default family for the user
            const familyName = `Famiglia ${name.trim()}`;
            const [family] = await sql`
                INSERT INTO families (name)
                VALUES (${familyName})
                RETURNING id
            `;
            familyId = family.id;

            // 4. Create default family membership as Admin
            await sql`
                INSERT INTO family_members (family_id, profile_id, role, color)
                VALUES (${familyId}, ${userId}, 'admin', '#f43f5e') -- Rose color default
            `;
        });

        // Sign session token
        const token = await signSession({
            userId,
            email: email.toLowerCase().trim(),
            familyId,
        });

        // Set secure HTTP-only cookie
        const cookieStore = await cookies();
        cookieStore.set("session", token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            path: "/",
            maxAge: 60 * 60 * 24 * 7, // 7 days
        });

        return { success: true };
    } catch (error) {
        console.error("Signup error:", error);
        return { success: false, error: "Si è verificato un errore durante la registrazione." };
    }
}

/**
 * Server Action to log out the user by deleting the session cookie
 */
export async function logoutAction() {
    const cookieStore = await cookies();
    cookieStore.delete("session");
    redirect("/login");
}
