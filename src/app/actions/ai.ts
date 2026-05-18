"use server";

import { sql } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { formatISODate } from "@/utils/dates";

// ─── GROQ AI API MOCK INTERCEPTOR ─────────────────────────────────────
const originalFetch = globalThis.fetch;

function getMockMenu(mealMode: string) {
    const days = [0, 1, 2, 3, 4, 5, 6];
    const meals: any[] = [];
    
    const lunchPool = [
        { title: "Primo: Risotto allo Zafferano | Secondo: Scaloppina al Limone", desc: "Contorno: Asparagi al vapore — Risotto cremoso e fettine di vitello al limone.", notes: "Leggero e primaverile." },
        { title: "Primo: Spaghetti alle Vongole | Secondo: Merluzzo alla Griglia", desc: "Contorno: Insalatina di finocchi — Spaghetti freschi alle vongole e filetto di merluzzo con olio e limone.", notes: "Molto fresco." },
        { title: "Primo: Pennette all'Arrabbiata | Secondo: Uovo al Tegamino", desc: "Contorno: Spinaci al burro — Pasta al pomodoro piccante e uova fresche al tegamino.", notes: "Rapido e saporito." },
        { title: "Primo: Pasta e Fagioli | Secondo: Formaggio Fresco", desc: "Contorno: Carotine saltate — Zuppa tradizionale di fagioli borlotti e formaggio tipo caciotta fresca.", notes: "Pasto nutriente e tradizionale." },
        { title: "Primo: Gnocchi alla Sorrentina | Secondo: Spiedini di Pollo", desc: "Contorno: Zucchine grigliate — Gnocchi al pomodoro e mozzarella filante con spiedini di pollo grigliati.", notes: "Molto amato dai bambini." },
        { title: "Primo: Riso Rosso con Verdure | Secondo: Torta Salata", desc: "Contorno: Pomodori all'insalata — Riso integrale saltato con verdure miste e fetta di torta salata ricotta e spinaci.", notes: "Piatto unico vegetariano." },
        { title: "Primo: Lasagne Leggere alle Zucchine | Secondo: Prosciutto Crudo", desc: "Contorno: Insalata mista — Lasagna bianca con zucchine e scamorza abbinata a crudo dolce.", notes: "Perfetto per la domenica in famiglia." }
    ];

    const dinnerPool = [
        { title: "Primo: Vellutata di Piselli | Secondo: Petto di Pollo alla Piastra", desc: "Contorno: Fagiolini all'agro — Vellutata tiepida con crostini e petto di pollo aromatizzato alle erbe.", notes: "Cena detox e proteica." },
        { title: "Primo: Tortiglioni al Ragù Bianco | Secondo: Polpette al Sugo", desc: "Contorno: Melanzane a funghetto — Pasta condita con trito di verdure e carne, e polpettine classiche.", notes: "Molto sostanzioso." },
        { title: "Primo: Zuppa di Farro e Lenticchie | Secondo: Mozzarella di Bufala", desc: "Contorno: Bieta ripassata — Zuppa tiepida di legumi e farro abbinata a mozzarella fresca.", notes: "Ricco di fibre e proteine." },
        { title: "Primo: Pasta alla Carbonara di Zucchine | Secondo: Frittata di Patate", desc: "Contorno: Insalata verde — Pasta con crema di zucchine e uovo, e soffice frittata.", notes: "Alternativa vegetariana alla carbonara." },
        { title: "Primo: Cous Cous di Pesce | Secondo: Polipo all'insalata", desc: "Contorno: Verdure al forno — Semola cotta al vapore con brodo di pesce e insalata di polpo tiepida.", notes: "Sapore di mare." },
        { title: "Primo: Crema di Zucca e Zenzero | Secondo: Salmone al Cartoccio", desc: "Contorno: Patate al forno — Crema saporita e trancio di salmone cotto al cartoccio con aromi.", notes: "Ricco di Omega-3." },
        { title: "Primo: Minestrone Estivo | Secondo: Frittata con Erbe Spontanee", desc: "Contorno: Verdure grigliate — Minestrone leggero con verdure fresche e frittata alle erbe.", notes: "Semplice e genuino." }
    ];

    for (const day of days) {
        if (mealMode === "both" || mealMode === "lunch") {
            const p = lunchPool[day % lunchPool.length];
            meals.push({
                day_of_week: day,
                meal_type: "lunch",
                title: p.title,
                description: p.desc,
                notes: p.notes
            });
        }
        if (mealMode === "both" || mealMode === "dinner") {
            const p = dinnerPool[day % dinnerPool.length];
            meals.push({
                day_of_week: day,
                meal_type: "dinner",
                title: p.title,
                description: p.desc,
                notes: p.notes
            });
        }
        if (mealMode === "smart_mix") {
            const isWeekday = day >= 0 && day <= 4;
            if (isWeekday) {
                const p = dinnerPool[day % dinnerPool.length];
                meals.push({
                    day_of_week: day,
                    meal_type: "dinner",
                    title: p.title,
                    description: p.desc,
                    notes: p.notes
                });
            } else {
                const l = lunchPool[day % lunchPool.length];
                meals.push({
                    day_of_week: day,
                    meal_type: "lunch",
                    title: l.title,
                    description: l.desc,
                    notes: l.notes
                });
                const d = dinnerPool[day % dinnerPool.length];
                meals.push({
                    day_of_week: day,
                    meal_type: "dinner",
                    title: d.title,
                    description: d.desc,
                    notes: d.notes
                });
            }
        }
    }
    return { meals };
}

globalThis.fetch = async function(input: RequestInfo | URL, init?: RequestInit) {
    const isMock = process.env.GROQ_API_KEY?.includes("placeholder") || !process.env.GROQ_API_KEY;
    if (isMock && typeof input === "string" && input.includes("api.groq.com")) {
        console.log("🎮 Intercepted Groq Fetch call! Simulating AI Response...");
        const body = JSON.parse(init?.body as string);
        const systemPrompt = body.messages.find((m: any) => m.role === "system")?.content || "";
        
        let responseContent = "";
        
        if (systemPrompt.includes("categorie merceologiche") || systemPrompt.includes("LISTA DELLA SPESA CONSOLIDATA")) {
            responseContent = JSON.stringify({
                categories: [
                    {
                        categoryName: "Ortofrutta (Frutta e Verdura)",
                        items: [
                            { name: "Zucchine fresche", quantity: "2 kg" },
                            { name: "Patate", quantity: "1.5 kg" },
                            { name: "Insalata mista", quantity: "500 g" },
                            { name: "Asparagi", quantity: "800 g" },
                            { name: "Pomodorini", quantity: "1 kg" }
                        ]
                    },
                    {
                        categoryName: "Macelleria e Pescheria",
                        items: [
                            { name: "Petto di pollo", quantity: "1.2 kg" },
                            { name: "Fettine di vitello", quantity: "800 g" },
                            { name: "Tranci di salmone", quantity: "5 porzioni (circa 900g)" },
                            { name: "Merluzzo fresco", quantity: "700 g" }
                        ]
                    },
                    {
                        categoryName: "Latticini e Uova",
                        items: [
                            { name: "Mozzarella di bufala", quantity: "5 pezzi da 125g" },
                            { name: "Parmigiano Reggiano grattugiato", quantity: "300 g" },
                            { name: "Uova fresche grandi", quantity: "12 uova" },
                            { name: "Ricotta vaccina", quantity: "500 g" }
                        ]
                    },
                    {
                        categoryName: "Dispensa (Pasta, Riso, Condimenti)",
                        items: [
                            { name: "Spaghetti di semola", quantity: "1 kg" },
                            { name: "Riso Carnaroli", quantity: "750 g" },
                            { name: "Passata di pomodoro", quantity: "3 bottiglie da 700g" },
                            { name: "Olio Extravergine d'Oliva", quantity: "500 ml" }
                        ]
                    }
                ],
                notes: "Consiglio antispreco: usa le zucchine sia per il risotto che grigliate per ottimizzare l'acquisto del pacco da 2kg!"
            });
        } else if (systemPrompt.includes("consigliare un SINGOLO pasto") || systemPrompt.includes("pasto sostitutivo")) {
            const mockMeals = [
                { title: "Primo: Spaghetti alla Nerano | Secondo: Cotoletta di Pollo", description: "Contorno: Zucchine fritte e basilico — Pasta mantecata con provolone del monaco e petto di pollo panato e fritto dorato.", notes: "Specialità campana irresistibile." },
                { title: "Primo: Risotto ai Funghi Porcini | Secondo: Arista di Maiale", description: "Contorno: Patate prezzemolate — Riso mantecato con porcini freschi e arista di maiale cotta al forno con aromi.", notes: "Classico sapore autunnale." },
                { title: "Primo: Mezze Maniche all'Amatriciana | Secondo: Straccetti di Manzo", description: "Contorno: Rucola e scaglie di grana — Pasta con sugo di pomodoro, guanciale croccante e pecorino, abbinata a straccetti saltati in padella.", notes: "Cena romana doc." }
            ];
            responseContent = JSON.stringify(mockMeals[Math.floor(Math.random() * mockMeals.length)]);
        } else {
            let mealMode = "both";
            if (systemPrompt.includes("Solo Pranzo")) mealMode = "lunch";
            else if (systemPrompt.includes("Solo Cena")) mealMode = "dinner";
            else if (systemPrompt.includes("Mix Intelligente")) mealMode = "smart_mix";
            
            responseContent = JSON.stringify(getMockMenu(mealMode));
        }

        return {
            ok: true,
            status: 200,
            json: async () => ({
                choices: [
                    {
                        message: {
                            content: responseContent
                        }
                    }
                ]
            }),
            text: async () => JSON.stringify({ choices: [{ message: { content: responseContent } }] })
        } as unknown as Response;
    }
    return originalFetch(input, init);
};
// ──────────────────────────────────────────────────────────────────────

interface ActionResponse {
    success: boolean;
    error?: string;
}

interface GenerateAIMenuInput {
    weekStart: string; // ISO date string (Monday)
    mealMode: "both" | "lunch" | "dinner" | "smart_mix";
    userPreferences?: string;
}

/**
 * Server Action to generate a personalized weekly menu using Groq (Llama 3.3 70B) in JSON Mode.
 * Excludes any recipes consumed in the past 4 weeks (28 days) of the family meal calendar.
 */
export async function generateAIMenuAction(input: GenerateAIMenuInput): Promise<ActionResponse> {
    const user = await getCurrentUser();
    if (!user || !user.familyId) {
        return { success: false, error: "Non sei autorizzato a compiere questa azione." };
    }

    const { weekStart, mealMode, userPreferences } = input;

    try {
        // 1. Calcola l'intervallo temporale delle ultime 4 settimane (28 giorni) e la stagione
        const targetDate = new Date(weekStart);
        const monthNames = [
            "Gennaio", "Febbraio", "Marzo", "Aprile", "Maggio", "Giugno",
            "Luglio", "Agosto", "Settembre", "Ottobre", "Novembre", "Dicembre"
        ];
        const currentMonth = monthNames[targetDate.getMonth()];
        const currentYear = targetDate.getFullYear();

        const fourWeeksAgo = new Date(targetDate.getTime() - 28 * 24 * 60 * 60 * 1000);
        const fourWeeksAgoStr = formatISODate(fourWeeksAgo);

        // 2. Recupera i pasti consumati nelle ultime 4 settimane da Neon DB
        const pastMeals = await sql`
            SELECT m.title, m.description
            FROM meals m
            JOIN weekly_menus wm ON m.weekly_menu_id = wm.id
            WHERE wm.family_id = ${user.familyId}
              AND wm.week_start < ${weekStart}
              AND wm.week_start >= ${fourWeeksAgoStr}
            ORDER BY wm.week_start DESC
        `;

        // 3. Esegue la deduplicazione basata sul titolo del piatto per una lista pulita
        const uniquePastMeals = Array.from(
            new Map(pastMeals.map((m: any) => [String(m.title).toLowerCase().trim(), m])).values()
        );

        const formattedPastMeals = uniquePastMeals.length > 0
            ? uniquePastMeals.map((m: any) => `- ${m.title}${m.description ? `: ${m.description}` : ""}`).join("\n")
            : "Nessun pasto consumato di recente.";

        // 4. Verifica la chiave API di Groq
        const apiKey = process.env.GROQ_API_KEY;
        if (!apiKey || apiKey.includes("inserisci_qui")) {
            return {
                success: false,
                error: "La chiave API di Groq non è stata ancora configurata nel file .env.local o non è valida.",
            };
        }

        // 5. Costruisce il prompt di sistema inserendo le preferenze e l'elenco dei pasti da escludere
        const systemPrompt = `Sei un esperto pianificatore gastronomico, nutrizionista e chef personale di alta cucina italiana.
Il tuo compito è pianificare un menu settimanale bilanciato, salutare e gustoso per una famiglia italiana, basandoti sulle loro preferenze e su una regola di esclusione fondamentale.

Devi generare pasti per i 7 giorni della settimana (da Lunedì a Domenica, dove 0=Lunedì, 1=Martedì, 2=Mercoledì, ..., 6=Domenica).

DATI DI INPUT:
1. Pasti da pianificare per ogni giorno: ${
            mealMode === "both" 
                ? "Pranzo e Cena per tutti i giorni" 
                : mealMode === "lunch" 
                ? "Solo Pranzo per tutti i giorni" 
                : mealMode === "dinner" 
                ? "Solo Cena per tutti i giorni" 
                : "Mix Intelligente (Solo Cena da Lunedì a Venerdì; Pranzo e Cena per Sabato e Domenica)"
        }
2. Preferenze / Indicazioni speciali della famiglia: "${userPreferences || "Pianifica un menu bilanciato basato sulla dieta mediterranea"}"
3. PIATTI CONSUMATI NELLE ULTIME 4 SETTIMANE (DA ESCLUDERE TASSATIVAMENTE):
${formattedPastMeals}

REGOLA DI ESCLUSIONE FONDAMENTALE E TASSATIVA:
Non proporre ASSOLUTAMENTE piatti identici o molto simili a quelli presenti nell'elenco dei "PIATTI CONSUMATI NELLE ULTIME 4 SETTIMANE". La famiglia desidera ruotare e variare i pasti! Sii estremamente creativo, proponendo ricette fresche, sane, equilibrate e varie (es. variando tra cereali diversi, carni bianche, pesce, uova, legumi, formaggi freschi e verdure di stagione).

REGOLA DELLA STAGIONALITÀ (CRITICA ED ESSENZIALE):
1. Stagione Corrente: Il periodo dell'anno da pianificare è il mese di ${currentMonth} ${currentYear}.
2. Adatta rigorosamente le ricette e gli abbinamenti alla stagione indicata:
   * In PRIMAVERA ed ESTATE (specialmente da Maggio a Settembre, a ridosso di Giugno/Luglio/Agosto), proponi ESCLUSIVAMENTE piatti freschi, estivi e leggeri (es. insalate miste, capresi, piatti freddi, insalate di riso, paste fredde, carni bianche saltate, pesce fresco o al vapore, formaggi freschi leggeri, bruschette).
   * NON PROPORRE MAI piatti invernali pesanti, caldi o ipercalorici come Polenta, stufati pesanti, zuppe bollenti, vellutate dense invernali, lasagne pesanti o brasati. Sarebbe un gravissimo errore nutrizionale e culinario proporre la polenta o stufati a ridosso di giugno!
   * In AUTUNNO ed INVERNO, prediligi piatti confortevoli e caldi (vellutate, zuppe calde, stufati leggeri, sformati).
3. Utilizza esclusivamente ortaggi e frutti di stagione del mese di ${currentMonth} (es. per maggio/giugno prediligi zucchine, asparagi, fagiolini, pomodori, cetrioli, lattuga).

REGOLA DI ECONOMIA, SEMPLICITÀ E RIUSO DEGLI INGREDIENTI (CRITICA E IMPERATIVA):
1. Riuso Intelligente degli Ingredienti: Struttura il menu settimanale in modo che gli ingredienti freschi (specialmente verdure, formaggi, carni o pesce) vengano riutilizzati in più preparazioni nel corso della settimana (es. se compri zucchine, usale in 2-3 pasti diversi come primo, frittata e contorno; se compri carote, usale per diversi contorni e soffritti). Questo riduce drasticamente gli sprechi e il numero di ingredienti unici da comprare.
2. Ingredienti Semplici ed Economici: Evita ingredienti costosi, ricercati, gourmet o fuori stagione (es. tagli di carne costosi, pesci pregiati, formaggi d'importazione). Scegli ingredienti quotidiani, salutari e poco costosi della tradizione mediterranea (es. uova, pollo, tacchino, legumi secchi o in scatola, tonno, formaggi freschi semplici, pasta, riso, verdure di base come zucchine, carote, patate, bietole e pomodori).
3. Budget-Friendly: La spesa per l'intera settimana per il nucleo familiare di 5 persone deve essere contenuta ed economica (idealmente sotto i 100-120€). Evita quindi di introdurre troppe verdure o tipi di carne o pesce diversi nello stesso giorno o nella stessa settimana.

REQUISITO DI STRUTTURA DEL PASTO (TASSATIVO MA SEMPLIFICATO):
Ogni pasto (sia Pranzo che Cena) deve essere composto da almeno DUE PIATTI DISTINTI (ad esempio un Primo e un Secondo semplici, oppure due componenti principali bilanciate) più un CONTORNO separato. Mantieni ciascun componente estremamente semplice da cucinare e con pochissimi ingredienti per evitare di gonfiare la lista della spesa.
Devi compilare i campi JSON del pasto in questo modo:
- "title": deve contenere i due piatti principali separati da una barra verticale, ad esempio: "Primo: [Nome del Primo] | Secondo: [Nome del Secondo]" (o diciture simili come "Piatto Unico: [Nome] | Secondo: [Nome]").
- "description": deve iniziare specificando il contorno seguito dai dettagli o ingredienti dei piatti, ad esempio: "Contorno: [Nome del Contorno] — [Breve lista ingredienti o descrizione dei piatti]".
- "notes": eventuali note brevi utili per la preparazione o l'abbinamento (opzionale).

ISTRUZIONI SPECIFICHE PER IL PIANO:
- Se la modalità dei pasti è "smart_mix": devi pianificare ESCLUSIVAMENTE la Cena ("dinner") per i giorni da Lunedì a Venerdì (day_of_week da 0 a 4) e SIA il Pranzo ("lunch") CHE la Cena ("dinner") per il Sabato e la Domenica (day_of_week 5 e 6). Non inserire altri pasti.

ISTRUZIONI DI FORMATTAZIONE (JSON):
Rispondi ESCLUSIVAMENTE con un oggetto JSON valido contenente la lista "meals" dei pasti pianificati. Non aggiungere testi introduttivi, saluti o commenti prima o dopo, restituisci solo il JSON.

La struttura dell'oggetto JSON deve essere esattamente la seguente:
{
  "meals": [
    {
      "day_of_week": 0,
      "meal_type": "lunch",
      "title": "Primo: Risotto allo Zafferano | Secondo: Filetto di Merluzzo",
      "description": "Contorno: Zucchine grigliate — Riso carnaroli allo zafferano e merluzzo fresco scottato con zucchine condite con olio e menta.",
      "notes": "Preparazione rapida, ideale per pranzo."
    }
  ]
}

Pianifica accuratamente i pasti in base alla modalità selezionata.`;

        // 6. Effettua la chiamata POST a Groq completando la richiesta in JSON Mode
        console.log("Connecting to Groq API...");
        const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
                model: "llama-3.3-70b-versatile",
                messages: [
                    { role: "system", content: systemPrompt },
                    { role: "user", content: "Genera il menu settimanale personalizzato in formato JSON conforme alla struttura richiesta." },
                ],
                response_format: { type: "json_object" },
                temperature: 0.7,
            }),
        });

        if (!response.ok) {
            const errText = await response.text();
            console.error("Groq API Error:", errText);
            return { success: false, error: "La richiesta a Groq è fallita. Verifica la chiave API." };
        }

        const data = await response.json();
        const aiText = data.choices?.[0]?.message?.content;

        if (!aiText) {
            return { success: false, error: "Nessuna risposta generata dall'IA." };
        }

        let parsed: any;
        try {
            parsed = JSON.parse(aiText);
        } catch (parseErr) {
            console.error("Failed to parse JSON response from Groq:", aiText);
            return { success: false, error: "La risposta generata dall'IA non è un JSON valido." };
        }

        const generatedMeals = parsed.meals;
        if (!Array.isArray(generatedMeals)) {
            return { success: false, error: "Il formato del menu generato dall'IA non è corretto." };
        }

        // 7. Esegue una transazione database sicura per applicare il menu settimanale
        await sql.begin(async (sql: any) => {
            // A. Recupera o crea la settimana (weekly_menus)
            let menuId: string;
            const menus = await sql`
                SELECT id FROM weekly_menus 
                WHERE family_id = ${user.familyId} AND week_start = ${weekStart}
            `;

            if (menus.length === 0) {
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

            // B. Pulisce i pasti pre-esistenti per evitare violazioni di chiavi univoche (weekly_menu_id, day_of_week, meal_type)
            if (mealMode === "both") {
                await sql`
                    DELETE FROM meals 
                    WHERE weekly_menu_id = ${menuId}
                `;
            } else if (mealMode === "smart_mix") {
                await sql`
                    DELETE FROM meals 
                    WHERE weekly_menu_id = ${menuId}
                      AND (
                          (day_of_week BETWEEN 0 AND 4 AND meal_type = 'dinner')
                          OR (day_of_week BETWEEN 5 AND 6)
                      )
                `;
            } else {
                await sql`
                    DELETE FROM meals 
                    WHERE weekly_menu_id = ${menuId} AND meal_type = ${mealMode}
                `;
            }

            // C. Batch inserisce i pasti pianificati dall'IA
            for (const m of generatedMeals) {
                const day = Number(m.day_of_week);
                const type = m.meal_type === "lunch" || m.meal_type === "dinner" ? m.meal_type : null;
                const title = m.title ? String(m.title).trim() : "";

                if (isNaN(day) || day < 0 || day > 6 || !type || !title) {
                    continue; // ignora record malformati
                }

                // Filtra in base ai pasti richiesti
                if (mealMode === "lunch" && type !== "lunch") continue;
                if (mealMode === "dinner" && type !== "dinner") continue;
                if (mealMode === "smart_mix") {
                    const isWeekday = day >= 0 && day <= 4;
                    if (isWeekday && type !== "dinner") continue;
                }

                await sql`
                    INSERT INTO meals (weekly_menu_id, day_of_week, meal_type, title, description, notes, created_by)
                    VALUES (
                        ${menuId}, 
                        ${day}, 
                        ${type}, 
                        ${title}, 
                        ${m.description ? String(m.description).trim() : null}, 
                        ${m.notes ? String(m.notes).trim() : null}, 
                        ${user.id}
                    )
                `;
            }
        });

        return { success: true };
    } catch (error: any) {
        console.error("AI Generation Error:", error);
        return { success: false, error: error.message || "Errore imprevisto durante la generazione." };
    }
}

interface SuggestSingleMealInput {
    weekStart: string;
    dayOfWeek: number;
    mealType: "lunch" | "dinner";
    userPreferences?: string;
}

/**
 * Server Action to suggest a single meal slot dynamically using Groq.
 * Considers past 4 weeks history to prevent duplicate recommendations.
 */
export async function suggestSingleMealAction(input: SuggestSingleMealInput): Promise<{
    success: boolean;
    error?: string;
    meal?: { title: string; description: string; notes: string };
}> {
    const user = await getCurrentUser();
    if (!user || !user.familyId) {
        return { success: false, error: "Non sei autorizzato a compiere questa azione." };
    }

    const { weekStart, dayOfWeek, mealType, userPreferences } = input;

    try {
        const targetDate = new Date(weekStart);
        const fourWeeksAgo = new Date(targetDate.getTime() - 28 * 24 * 60 * 60 * 1000);
        const fourWeeksAgoStr = formatISODate(fourWeeksAgo);

        // Fetch past meals to build negative exclusion constraints (including current week!)
        const pastMeals = await sql`
            SELECT m.title, m.description
            FROM meals m
            JOIN weekly_menus wm ON m.weekly_menu_id = wm.id
            WHERE wm.family_id = ${user.familyId}
              AND wm.week_start <= ${weekStart}
              AND wm.week_start >= ${fourWeeksAgoStr}
            ORDER BY wm.week_start DESC
        `;

        const uniquePastMeals = Array.from(
            new Map(pastMeals.map((m: any) => [String(m.title).toLowerCase().trim(), m])).values()
        );

        const formattedPastMeals = uniquePastMeals.length > 0
            ? uniquePastMeals.map((m: any) => `- ${m.title}${m.description ? `: ${m.description}` : ""}`).join("\n")
            : "Nessun pasto consumato di recente.";

        const apiKey = process.env.GROQ_API_KEY;
        if (!apiKey || apiKey.includes("inserisci_qui")) {
            return { success: false, error: "Chiave API Groq non configurata o non valida." };
        }

        const daysItalian = ["Lunedì", "Martedì", "Mercoledì", "Giovedì", "Venerdì", "Sabato", "Domenica"];
        const dayName = daysItalian[dayOfWeek] || "Giorno";

        const systemPrompt = `Sei un esperto chef di alta cucina italiana e nutrizionista personale.
Il tuo compito è consigliare un SINGOLO pasto (pranzo o cena) sano, bilanciato e gustoso per una famiglia.

DETTAGLI DEL PASTO RICHIESTO:
- Tipo Pasto: ${mealType === "lunch" ? "Pranzo" : "Cena"}
- Giorno della settimana: ${dayName}
- Linee guida o preferenze speciali fornite (se presenti): "${userPreferences || "Nessuna preferenza specifica, proponi una ricetta saporita e salutare"}"
- PIATTI CONSUMATI DI RECENTE O GIÀ PIANIFICATI NELLA SETTIMANA IN CORSO (DA ESCLUDERE TASSATIVAMENTE):
${formattedPastMeals}

REGOLA DI ESCLUSIONE FONDAMENTALE:
Non consigliare assolutamente ricette identiche o molto simili a quelle già consumate o già presenti in altri giorni di questa settimana! Offri varietà nutrizionale e di gusto.

REQUISITO DI STRUTTURA DEL PASTO (TASSATIVO):
Il pasto deve essere composto da almeno DUE PIATTI DISTINTI (ad esempio un Primo e un Secondo, oppure due portate principali bilanciate) più un CONTORNO separato. Un singolo piatto (ad es. solo "Pollo alla cacciatora con spinaci") NON è sufficiente.
Devi compilare i campi JSON del pasto esattamente in questo modo:
- "title": deve contenere i due piatti principali separati da una barra verticale, ad esempio: "Primo: [Nome del Primo] | Secondo: [Nome del Secondo]".
- "description": deve iniziare specificando il contorno seguito dai dettagli o ingredienti dei piatti, ad esempio: "Contorno: [Nome del Contorno] — [Breve lista ingredienti o descrizione dei piatti]".
- "notes": una breve nota utile per la preparazione o l'abbinamento (opzionale).

Rispondi ESCLUSIVAMENTE con un oggetto JSON valido contenente la proposta. Nessun testo introduttivo o di contorno.
Struttura del JSON richiesto:
{
  "title": "Primo: Spaghettoni alla Carbonara | Secondo: Scaloppine al Limone",
  "description": "Contorno: Carciofi trifolati — Pasta di grano duro condita con uovo, guanciale e pecorino, abbinata a scaloppine di vitello cotte al limone con contorno di carciofi saltati.",
  "notes": "Un grande classico italiano molto nutriente."
}
`;

        const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
                model: "llama-3.3-70b-versatile",
                messages: [
                    { role: "system", content: systemPrompt },
                    { role: "user", content: "Suggerisci questo singolo pasto in formato JSON conforme alla struttura richiesta." },
                ],
                response_format: { type: "json_object" },
                temperature: 0.8,
            }),
        });

        if (!response.ok) {
            const errText = await response.text();
            console.error("Groq API Error in single suggestion:", errText);
            return { success: false, error: "La richiesta a Groq è fallita." };
        }

        const data = await response.json();
        const aiText = data.choices?.[0]?.message?.content;
        if (!aiText) {
            return { success: false, error: "Risposta IA vuota." };
        }

        const parsed = JSON.parse(aiText);
        return {
            success: true,
            meal: {
                title: parsed.title ? String(parsed.title).trim() : "Piatto suggerito",
                description: parsed.description ? String(parsed.description).trim() : "",
                notes: parsed.notes ? String(parsed.notes).trim() : "",
            },
        };
    } catch (err) {
        console.error("Error in single suggestion:", err);
        return { success: false, error: "Errore imprevisto durante il suggerimento IA." };
    }
}

interface RegenerateSingleMealInput {
    weekStart: string;
    dayOfWeek: number;
    mealType: "lunch" | "dinner";
    userPreferences?: string;
}

/**
 * Server Action to regenerate a single meal dynamically and save it directly in Neon DB.
 * Ensures the new meal is different from the current one and no duplicates exist.
 */
export async function regenerateSingleMealAction(input: RegenerateSingleMealInput): Promise<ActionResponse> {
    const user = await getCurrentUser();
    if (!user || !user.familyId) {
        return { success: false, error: "Non sei autorizzato a compiere questa azione." };
    }

    const { weekStart, dayOfWeek, mealType, userPreferences } = input;

    try {
        const targetDate = new Date(weekStart);
        const fourWeeksAgo = new Date(targetDate.getTime() - 28 * 24 * 60 * 60 * 1000);
        const fourWeeksAgoStr = formatISODate(fourWeeksAgo);

        // Fetch past meals to prevent duplicates (including current week!)
        const pastMeals = await sql`
            SELECT m.title, m.description
            FROM meals m
            JOIN weekly_menus wm ON m.weekly_menu_id = wm.id
            WHERE wm.family_id = ${user.familyId}
              AND wm.week_start <= ${weekStart}
              AND wm.week_start >= ${fourWeeksAgoStr}
            ORDER BY wm.week_start DESC
        `;

        const uniquePastMeals = Array.from(
            new Map(pastMeals.map((m: any) => [String(m.title).toLowerCase().trim(), m])).values()
        );

        // Fetch or create weekly menu ID
        let menuId: string;
        const menus = await sql`
            SELECT id FROM weekly_menus 
            WHERE family_id = ${user.familyId} AND week_start = ${weekStart}
        `;

        let currentMealTitle = "";

        if (menus.length === 0) {
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
            // Fetch current meal in this slot to make sure we don't repeat it
            const currentMeals = await sql`
                SELECT title FROM meals 
                WHERE weekly_menu_id = ${menuId} AND day_of_week = ${dayOfWeek} AND meal_type = ${mealType}
            `;
            if (currentMeals.length > 0) {
                currentMealTitle = currentMeals[0].title;
            }
        }

        const formattedPastMeals = [
            ...uniquePastMeals.map((m: any) => `- ${m.title}${m.description ? `: ${m.description}` : ""}`),
            currentMealTitle ? `- ${currentMealTitle} (QUESTO pasto è attualmente inserito in questo giorno ed è quello da cambiare!)` : ""
        ].filter(Boolean).join("\n");

        const apiKey = process.env.GROQ_API_KEY;
        if (!apiKey || apiKey.includes("inserisci_qui")) {
            return { success: false, error: "Chiave API Groq non configurata o non valida." };
        }

        const monthNames = [
            "Gennaio", "Febbraio", "Marzo", "Aprile", "Maggio", "Giugno",
            "Luglio", "Agosto", "Settembre", "Ottobre", "Novembre", "Dicembre"
        ];
        const currentMonth = monthNames[targetDate.getMonth()];
        const currentYear = targetDate.getFullYear();

        const daysItalian = ["Lunedì", "Martedì", "Mercoledì", "Giovedì", "Venerdì", "Sabato", "Domenica"];
        const dayName = daysItalian[dayOfWeek] || "Giorno";

        const systemPrompt = `Sei un esperto chef di alta cucina italiana e nutrizionista personale.
Devi consigliare un SINGOLO pasto (pranzo o cena) sano, bilanciato e gustoso per una famiglia.

DETTAGLI DEL PASTO RICHIESTO:
- Tipo Pasto: ${mealType === "lunch" ? "Pranzo" : "Cena"}
- Giorno della settimana: ${dayName}
- Desideri o preferenze speciali (se presenti): "${userPreferences || "Nessuna preferenza specifica, proponi una ricetta saporita e salutare"}"
- PIATTI DA EVITARE TASSATIVAMENTE (CRONOLOGIA + PASTI GIÀ PROGRAMMATI QUESTA SETTIMANA + PIATTO DA SOSTITUIRE):
${formattedPastMeals}

REGOLA DI ESCLUSIONE FONDAMENTALE E TASSATIVA:
Non consigliare assolutamente ricette identiche o molto simili a quelle già consumate di recente o già programmate per altri giorni di questa settimana! Vogliamo cambiare completamente.

REGOLA DELLA STAGIONALITÀ (CRITICA ED ESSENZIALE):
1. Stagione Corrente: Il periodo dell'anno da pianificare è il mese di ${currentMonth} ${currentYear}.
2. Adatta rigorosamente la proposta alla stagione indicata:
   * In PRIMAVERA ed ESTATE (specialmente da Maggio a Settembre, a ridosso di Giugno/Luglio/Agosto), proponi ESCLUSIVAMENTE piatti freschi, estivi e leggeri (es. insalate miste, capresi, piatti freddi, insalate di riso, paste fredde, carni bianche saltate, pesce fresco o al vapore, formaggi freschi leggeri, bruschette).
   * NON PROPORRE MAI piatti invernali pesanti, caldi o ipercalorici come Polenta, stufati pesanti, zuppe bollenti, vellutate dense invernali, lasagne pesanti o brasati. Sarebbe un gravissimo errore nutrizionale e culinario proporre la polenta o stufati a ridosso di giugno!
   * In AUTUNNO ed INVERNO, prediligi piatti confortevoli e caldi (vellutate, zuppe calde, stufati leggeri, sformati).
3. Utilizza esclusivamente ortaggi e frutti di stagione del mese di ${currentMonth}.

REGOLA DI ECONOMIA E SEMPLICITÀ DEGLI INGREDIENTI:
1. Riuso ed Economia: Consiglia ricette che facciano uso di ingredienti quotidiani, salutari ed estremamente accessibili (es. uova, pollo, legumi, verdure di stagione di base, pasta, riso). Evita assolutamente ingredienti premium, costosi o troppo specifici.
2. Semplicità: Mantieni la preparazione molto semplice con pochissimi ingredienti unici per pasto per evitare di far lievitare la spesa settimanale.

REQUISITO DI STRUTTURA DEL PASTO (TASSATIVO MA SEMPLIFICATO):
Il pasto deve essere composto da almeno DUE PIATTI DISTINTI (ad esempio un Primo e un Secondo semplici, oppure due portate principali bilanciate) più un CONTORNO separato. Mantieni ciascun componente semplice e veloce.
Devi compilare i campi JSON del pasto esattamente in questo modo:
- "title": deve contenere i due piatti principali separati da una barra verticale, ad esempio: "Primo: [Nome del Primo] | Secondo: [Nome del Secondo]".
- "description": deve iniziare specificando il contorno seguito dai dettagli o ingredienti dei piatti, ad esempio: "Contorno: [Nome del Contorno] — [Breve lista ingredienti o descrizione dei piatti]".
- "notes": una breve nota utile per la preparazione o l'abbinamento (opzionale).

Rispondi ESCLUSIVAMENTE con un oggetto JSON valido contenente la proposta. Nessun testo introduttivo o di contorno.
Struttura del JSON richiesto:
{
  "title": "Primo: Gnocchi alla Sorrentina | Secondo: Spiedini di Pollo",
  "description": "Contorno: Insalatina mista — Gnocchi al sugo di pomodoro con mozzarella filante e spiedini di pollo alla griglia con insalata fresca di stagione.",
  "notes": "Molto gradito dai bambini."
}
`;

        const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
                model: "llama-3.3-70b-versatile",
                messages: [
                    { role: "system", content: systemPrompt },
                    { role: "user", content: "Genera la proposta di pasto sostitutivo in formato JSON conforme alla struttura." },
                ],
                response_format: { type: "json_object" },
                temperature: 0.8,
            }),
        });

        if (!response.ok) {
            const errText = await response.text();
            console.error("Groq API Error in single regeneration:", errText);
            return { success: false, error: "La richiesta a Groq è fallita." };
        }

        const data = await response.json();
        const aiText = data.choices?.[0]?.message?.content;
        if (!aiText) {
            return { success: false, error: "Risposta IA vuota." };
        }

        const parsed = JSON.parse(aiText);
        const title = parsed.title ? String(parsed.title).trim() : "Piatto consigliato";
        const description = parsed.description ? String(parsed.description).trim() : "";
        const notes = parsed.notes ? String(parsed.notes).trim() : "";

        // Transactionally update the database
        await sql.begin(async (sql: any) => {
            // Elimina pasto precedente in questo slot
            await sql`
                DELETE FROM meals 
                WHERE weekly_menu_id = ${menuId} AND day_of_week = ${dayOfWeek} AND meal_type = ${mealType}
            `;

            // Inserisci il nuovo pasto generato dall'IA
            await sql`
                INSERT INTO meals (weekly_menu_id, day_of_week, meal_type, title, description, notes, created_by)
                VALUES (${menuId}, ${dayOfWeek}, ${mealType}, ${title}, ${description}, ${notes}, ${user.id})
            `;
        });

        return { success: true };
    } catch (err: any) {
        console.error("Error in single regeneration:", err);
        return { success: false, error: err.message || "Errore imprevisto durante la rigenerazione." };
    }
}

interface ShoppingListInput {
    meals: Array<{ title: string; description: string; notes: string }>;
}

/**
 * Server Action to generate a consolidated, categorized shopping list for the weekly meals
 * scaled for a family of 5 (2 adults, kids of 13, 9, and 4 years old).
 */
export async function generateShoppingListAction(input: ShoppingListInput): Promise<{
    success: boolean;
    error?: string;
    shoppingList?: any;
}> {
    const user = await getCurrentUser();
    if (!user || !user.familyId) {
        return { success: false, error: "Non sei autorizzato a compiere questa azione." };
    }

    const { meals } = input;
    if (!meals || meals.length === 0) {
        return { success: false, error: "Nessun pasto presente nel menu per questa settimana." };
    }

    try {
        const apiKey = process.env.GROQ_API_KEY;
        if (!apiKey || apiKey.includes("inserisci_qui")) {
            return { success: false, error: "Chiave API Groq non configurata o non valida." };
        }

        const formattedMeals = meals
            .map((m, idx) => `${idx + 1}. ${m.title}${m.description ? ` (${m.description})` : ""}${m.notes ? ` [Note: ${m.notes}]` : ""}`)
            .join("\n");

        const systemPrompt = `Sei un esperto gestore di pianificazione domestica e spesa familiare, specializzato in cucina italiana salutare e ottimizzazione della dispensa.
Il tuo compito è analizzare i pasti della settimana e compilare una LISTA DELLA SPESA CONSOLIDATA, suddivisa per categorie merceologiche, con le QUANTITÀ ESATTE calcolate su misura per il nucleo familiare di 5 persone.

DETTAGLI NUCLEO FAMILIARE (5 PERSONE TOTALI):
- 2 Adulti
- 3 Figli di: 13 anni, 9 anni e 4 anni.
Considera che gli adulti e il figlio di 13 anni mangiano porzioni piene, mentre i figli di 9 e 4 anni consumano porzioni ridotte (circa il 60% e 40% di una porzione normale).

REGOLA DI CONSOLIDAMENTO E CALCOLO QUANTITÀ:
1. Consolida gli ingredienti simili (es. se la pasta compare 3 volte in piatti diversi, calcola la quantità totale di pasta in grammi necessaria per 5 persone per tutti e 3 i pasti, sommando i pesi. Esempio: pasta 3 volte = circa 1.2kg - 1.5kg totali).
2. Esprimi le quantità in pesi chiari e unità misurabili reali (es. "800g", "250ml", "1 barattolo da 400g", "1.5 kg", "6 uova").
3. Suddividi gli alimenti in categorie merceologiche classiche: "Ortofrutta (Frutta e Verdura)", "Macelleria e Pescheria", "Latticini e Uova", "Dispensa (Pasta, Riso, Scatolame, Condimenti)", "Pane e Cereali", "Surgelati".
4. Evita ingredienti scontati come sale fino, pepe nero o acqua del rubinetto, ma includi spezie, olio extravergine d'oliva o aceto se necessari.

Rispondi ESCLUSIVAMENTE con un oggetto JSON valido. Nessun commento introduttivo o conclusivo.
Struttura del JSON richiesto:
{
  "categories": [
    {
      "categoryName": "Nome Categoria (es. Ortofrutta (Frutta e Verdura))",
      "items": [
        { "name": "Nome Ingrediente", "quantity": "Quantità calcolata per 5 persone (es. 1.2 kg)" }
      ]
    }
  ],
  "notes": "Consiglio breve antispreco o nutrizionale specifico per questa settimana per la famiglia di 5 persone (1-2 frasi)"
}
`;

        const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
                model: "llama-3.3-70b-versatile",
                messages: [
                    { role: "system", content: systemPrompt },
                    { role: "user", content: `Ecco i pasti della settimana da analizzare:\n\n${formattedMeals}\n\nGenera la lista della spesa consolidata in formato JSON conforme alle istruzioni.` },
                ],
                response_format: { type: "json_object" },
                temperature: 0.7,
            }),
        });

        if (!response.ok) {
            const errText = await response.text();
            console.error("Groq API Error in shopping list:", errText);
            return { success: false, error: "La richiesta a Groq è fallita." };
        }

        const data = await response.json();
        const aiText = data.choices?.[0]?.message?.content;
        if (!aiText) {
            return { success: false, error: "Risposta IA vuota." };
        }

        const parsed = JSON.parse(aiText);
        return {
            success: true,
            shoppingList: parsed,
        };
    } catch (err: any) {
        console.error("Error in shopping list generation:", err);
        return { success: false, error: err.message || "Errore imprevisto durante la generazione della lista della spesa." };
    }
}
