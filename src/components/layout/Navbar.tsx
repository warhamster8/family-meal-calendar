"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { logoutAction } from "@/app/actions/auth";
import { Menu, X, UtensilsCrossed, CalendarDays, Settings, LogOut } from "lucide-react";
import clsx from "clsx";

const navLinks = [
    { href: "/calendar", label: "Calendario", icon: CalendarDays },
    { href: "/settings", label: "Impostazioni", icon: Settings },
];

export default function Navbar() {
    const [mobileOpen, setMobileOpen] = useState(false);
    const pathname = usePathname();

    const handleSignOut = async () => {
        await logoutAction();
    };

    // Don't show navbar on login page
    if (pathname === "/login") return null;

    return (
        <nav className="sticky top-0 lg:top-4 z-40 w-full bg-white/85 backdrop-blur-md border-b lg:border border-stone-200/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)] lg:rounded-2xl lg:max-w-[1600px] lg:mx-auto lg:px-6 transition-all">
            <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between h-14 sm:h-18">
                    {/* Logo */}
                    <Link
                        href="/calendar"
                        className="flex items-center gap-2.5 text-primary-600 hover:text-primary-700 font-extrabold text-base md:text-lg tracking-tight transition-colors flex-shrink-0"
                    >
                        <div className="p-2 bg-primary-100 rounded-lg text-primary-600">
                            <UtensilsCrossed size={19} className="animate-pulse" />
                        </div>
                        <span className="bg-gradient-to-r from-primary-600 to-indigo-600 bg-clip-text text-transparent hidden sm:inline font-black tracking-tight">
                            Menu Familiare
                        </span>
                    </Link>

                    {/* Desktop nav */}
                    <div className="hidden lg:flex items-center gap-2.5 flex-shrink-0">
                        {navLinks.map((link) => {
                            const Icon = link.icon;
                            const isActive = pathname.startsWith(link.href);
                            return (
                                <Link
                                    key={link.href}
                                    href={link.href}
                                    className={clsx(
                                        "flex items-center gap-2.5 px-4.5 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all duration-200 active:scale-95",
                                        isActive
                                            ? "bg-primary-500 text-white shadow-sm shadow-primary-500/20"
                                            : "text-stone-600 hover:bg-stone-100 hover:text-stone-850"
                                    )}
                                >
                                    <Icon size={17} />
                                    {link.label}
                                </Link>
                            );
                        })}
                        <button
                            onClick={handleSignOut}
                            className="flex items-center gap-2.5 px-4.5 py-2.5 rounded-xl text-xs sm:text-sm font-bold text-stone-500 hover:bg-red-50 hover:text-red-650 transition-all duration-200 active:scale-95 ml-2 cursor-pointer"
                        >
                            <LogOut size={17} />
                            Esci
                        </button>
                    </div>

                    {/* Mobile menu button */}
                    <button
                        onClick={() => setMobileOpen(!mobileOpen)}
                        className="lg:hidden p-2 rounded-xl text-stone-600 hover:bg-stone-100 transition-colors"
                        aria-label="Menu"
                    >
                        {mobileOpen ? <X size={20} /> : <Menu size={20} />}
                    </button>
                </div>
            </div>

            {/* Mobile menu */}
            {mobileOpen && (
                <div className="lg:hidden border-t border-stone-200/60 bg-white/95 backdrop-blur-md rounded-b-xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="px-4 py-3 space-y-1">
                        {navLinks.map((link) => {
                            const Icon = link.icon;
                            const isActive = pathname.startsWith(link.href);
                            return (
                                <Link
                                    key={link.href}
                                    href={link.href}
                                    onClick={() => setMobileOpen(false)}
                                    className={clsx(
                                        "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-colors",
                                        isActive
                                            ? "bg-primary-50 text-primary-700"
                                            : "text-stone-600 hover:bg-stone-50"
                                    )}
                                >
                                    <Icon size={18} />
                                    {link.label}
                                </Link>
                            );
                        })}
                        <button
                            onClick={handleSignOut}
                            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold text-stone-500 hover:bg-red-50 hover:text-red-600 w-full transition-colors cursor-pointer text-left"
                        >
                            <LogOut size={18} />
                            Esci
                        </button>
                    </div>
                </div>
            )}
        </nav>
    );
}