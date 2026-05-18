import postgres from "postgres";

// Prevent multiple database connections in development due to hot reloading
const globalForDb = globalThis as unknown as {
    conn: postgres.Sql | undefined;
};

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
    throw new Error("DATABASE_URL environment variable is not defined");
}

export const sql = globalForDb.conn ?? postgres(databaseUrl, {
    ssl: "require", // Neon requires SSL
});

if (process.env.NODE_ENV !== "production") {
    globalForDb.conn = sql;
}
