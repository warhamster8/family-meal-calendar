import { sql } from "./db";
import { getSessionUser } from "./session";

/**
 * Fetch full profile and family details for the currently logged-in user
 */
export async function getCurrentUser() {
    const session = await getSessionUser();
    if (!session || !session.userId) return null;

    try {
        // Fetch user basic info
        const users = await sql`
            SELECT id, email FROM users WHERE id = ${session.userId}
        `;
        if (users.length === 0) return null;
        const user = users[0];

        // Fetch profile info
        const profiles = await sql`
            SELECT name, avatar_url FROM profiles WHERE id = ${user.id}
        `;
        const profile = profiles[0] || null;

        // Fetch family membership (a user belongs to at most one family for this calendar)
        const members = await sql`
            SELECT family_id, role FROM family_members WHERE profile_id = ${user.id} LIMIT 1
        `;
        const member = members[0] || null;

        return {
            id: user.id,
            email: user.email,
            name: profile?.name || "Utente",
            avatarUrl: profile?.avatar_url || null,
            familyId: member?.family_id || null,
            role: member?.role || null,
        };
    } catch (error) {
        console.error("Error fetching current user:", error);
        return null;
    }
}
