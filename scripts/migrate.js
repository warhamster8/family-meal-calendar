const fs = require("fs");
const path = require("path");
const postgres = require("postgres");

async function main() {
    console.log("🚀 Inizio migrazione del database su Neon...");

    // 1. Legge il file .env.local per estrarre la stringa di connessione
    const envPath = path.join(__dirname, "../.env.local");
    console.log("DEBUG: Percorso assoluto di .env.local: '" + envPath + "'");
    if (!fs.existsSync(envPath)) {
        console.error("❌ File .env.local non trovato!");
        process.exit(1);
    }

    const envContent = fs.readFileSync(envPath, "utf8");
    const lines = envContent.split(/\r?\n/);
    let databaseUrl = "";
    
    console.log("DEBUG: Lette " + lines.length + " righe da .env.local");
    for (const line of lines) {
        const trimmed = line.trim();
        console.log("DEBUG: Riga: '" + trimmed + "'");
        if (trimmed.startsWith("DATABASE_URL=")) {
            databaseUrl = trimmed.split("DATABASE_URL=")[1].trim();
            console.log("DEBUG: Trovato DATABASE_URL: '" + databaseUrl + "'");
            break;
        }
    }

    // Rimuove eventuali virgolette se presenti
    if (databaseUrl.startsWith('"') && databaseUrl.endsWith('"')) {
        databaseUrl = databaseUrl.slice(1, -1);
    }
    if (databaseUrl.startsWith("'") && databaseUrl.endsWith("'")) {
        databaseUrl = databaseUrl.slice(1, -1);
    }

    if (!databaseUrl || databaseUrl.includes("inserisci_qui")) {
        console.error("❌ DATABASE_URL valida non trovata nel file .env.local!");
        process.exit(1);
    }

    // 2. Legge il file schema.sql
    const schemaPath = path.join(__dirname, "../supabase/schema.sql");
    if (!fs.existsSync(schemaPath)) {
        console.error("❌ File schema.sql non trovato!");
        process.exit(1);
    }

    const schemaSql = fs.readFileSync(schemaPath, "utf8");

    // 3. Rimuove la sezione Row Level Security (RLS) specifica di Supabase
    // in quanto tutte le query girano lato server in modo sicuro tramite Server Actions
    let cleanSchemaSql = schemaSql;
    const rlsMarker = schemaSql.indexOf("-- ROW LEVEL SECURITY");
    const triggersMarker = schemaSql.indexOf("-- TRIGGERS");
    
    if (rlsMarker !== -1 && triggersMarker !== -1) {
        console.log("🧹 Rimozione automatica delle policy RLS specifiche di Supabase...");
        cleanSchemaSql = schemaSql.substring(0, rlsMarker) + schemaSql.substring(triggersMarker);
    }

    // 4. Si connette ed esegue lo schema
    console.log("🔌 Connessione a Neon in corso...");
    const sql = postgres(databaseUrl, { ssl: "require" });

    try {
        console.log("📝 Esecuzione dello schema SQL (tabelle, relazioni, trigger)...");
        
        // Esegue il reset pulito ed applica lo schema completo
        const dropSql = `
            DROP TABLE IF EXISTS meal_recipes CASCADE;
            DROP TABLE IF EXISTS meals CASCADE;
            DROP TABLE IF EXISTS weekly_menus CASCADE;
            DROP TABLE IF EXISTS family_members CASCADE;
            DROP TABLE IF EXISTS recipes CASCADE;
            DROP TABLE IF EXISTS profiles CASCADE;
            DROP TABLE IF EXISTS families CASCADE;
            DROP TABLE IF EXISTS users CASCADE;
        `;
        
        await sql.unsafe(dropSql + cleanSchemaSql);
        
        console.log("✅ Database configurato ed inizializzato con successo su Neon!");
    } catch (error) {
        console.error("❌ Errore durante la migrazione del database:", error);
    } finally {
        await sql.end();
    }
}

main();
