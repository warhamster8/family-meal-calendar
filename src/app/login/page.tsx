"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { loginAction, signupAction } from "@/app/actions/auth";
import Button from "@/components/ui/Button";

export default function LoginPage() {
    const [isSignUp, setIsSignUp] = useState(false);
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [errorMsg, setErrorMsg] = useState("");
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setErrorMsg("");

        const formData = new FormData();
        formData.append("email", email);
        formData.append("password", password);
        if (isSignUp) {
            formData.append("name", name);
        }

        try {
            const res = isSignUp 
                ? await signupAction(formData) 
                : await loginAction(formData);
            
            if (res.success) {
                router.push("/calendar");
                router.refresh(); // Refresh route to update middleware session state
            } else {
                setErrorMsg(res.error || "Si è verificato un errore.");
                setLoading(false);
            }
        } catch (err) {
            console.error(err);
            setErrorMsg("Connessione al server non riuscita.");
            setLoading(false);
        }
    };
    return (
        <div className="flex items-center justify-center min-h-screen bg-gradient-to-tr from-stone-50 via-primary-50/20 to-indigo-50/30 p-4">
            <div className="w-full max-w-md bg-white/80 backdrop-blur-xl p-8 sm:p-10 rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.04)] border border-stone-200/40 transition-all duration-300">
                
                {/* Brand Logo */}
                <div className="flex justify-center mb-6">
                    <div className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-primary-50 to-indigo-50 border border-primary-100 rounded-2xl">
                        <span className="text-primary-600 font-extrabold text-sm tracking-tight">🍕 Menu Familiare</span>
                    </div>
                </div>

                <h2 className="text-2xl sm:text-3xl font-extrabold mb-1.5 text-center text-stone-850 tracking-tight bg-gradient-to-r from-stone-900 to-stone-700 bg-clip-text text-transparent">
                    {isSignUp ? "Crea Account" : "Accedi al Portale"}
                </h2>
                <p className="text-xs sm:text-sm text-stone-400 font-medium text-center mb-8 leading-relaxed">
                    {isSignUp 
                        ? "Registrati per pianificare e gustare ricette sane ogni settimana." 
                        : "Bentornato! Inserisci le tue credenziali per accedere."}
                </p>

                {errorMsg && (
                    <div className="mb-6 p-4 bg-red-50 border border-red-100 text-red-700 rounded-2xl text-xs text-center font-bold animate-pulse">
                        ⚠️ {errorMsg}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-5">
                    {isSignUp && (
                        <div>
                            <label className="block text-[10px] font-extrabold text-stone-400 uppercase tracking-widest mb-1.5" htmlFor="name">
                                Nome
                            </label>
                            <input
                                id="name"
                                type="text"
                                required
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className="w-full border border-stone-200 rounded-2xl px-4 py-3 text-stone-700 bg-stone-50/50 focus:outline-none focus:ring-2 focus:ring-primary-500/25 focus:border-primary-500 focus:bg-white transition-all text-xs font-semibold"
                                placeholder="Il tuo nome"
                            />
                        </div>
                    )}
                    <div>
                        <label className="block text-[10px] font-extrabold text-stone-400 uppercase tracking-widest mb-1.5" htmlFor="email">
                            Indirizzo Email
                        </label>
                        <input
                            id="email"
                            type="email"
                            required
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full border border-stone-200 rounded-2xl px-4 py-3 text-stone-700 bg-stone-50/50 focus:outline-none focus:ring-2 focus:ring-primary-500/25 focus:border-primary-500 focus:bg-white transition-all text-xs font-semibold"
                            placeholder="esempio@email.com"
                        />
                    </div>
                    <div>
                        <label className="block text-[10px] font-extrabold text-stone-400 uppercase tracking-widest mb-1.5" htmlFor="password">
                            Password Segreta
                        </label>
                        <input
                            id="password"
                            type="password"
                            required
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full border border-stone-200 rounded-2xl px-4 py-3 text-stone-700 bg-stone-50/50 focus:outline-none focus:ring-2 focus:ring-primary-500/25 focus:border-primary-500 focus:bg-white transition-all text-xs font-semibold"
                            placeholder="••••••••"
                        />
                    </div>
                    <Button 
                        type="submit" 
                        loading={loading} 
                        className="w-full py-3.5 mt-2 bg-gradient-to-r from-primary-600 to-indigo-600 hover:from-primary-700 hover:to-indigo-700 text-white rounded-2xl font-bold shadow-md hover:shadow-lg transition-all active:scale-[0.98] cursor-pointer text-xs"
                    >
                        {isSignUp ? "Crea Nuovo Profilo" : "Accedi all'Account"}
                    </Button>
                </form>

                <div className="mt-8 pt-6 border-t border-stone-150 text-center">
                    <button
                        onClick={() => {
                            setIsSignUp(!isSignUp);
                            setErrorMsg("");
                        }}
                        className="text-xs font-extrabold text-primary-600 hover:text-indigo-600 hover:underline transition-all cursor-pointer"
                    >
                        {isSignUp 
                            ? "Hai già un account? Accedi ora" 
                            : "Prima volta qui? Crea un account"}
                    </button>
                </div>
            </div>
        </div>
    );
}