"use client";

import { ReactNode, useEffect, useCallback } from "react";
import { X } from "lucide-react";
import clsx from "clsx";

interface ModalProps {
    open: boolean;
    onClose: () => void;
    title?: string;
    children: ReactNode;
    className?: string;
}

export default function Modal({
    open,
    onClose,
    title,
    children,
    className,
}: ModalProps) {
    const handleEscape = useCallback(
        (e: KeyboardEvent) => {
            if (e.key === "Escape") onClose();
        },
        [onClose]
    );

    useEffect(() => {
        if (open) {
            document.addEventListener("keydown", handleEscape);
            document.documentElement.classList.add("modal-open");
        }
        return () => {
            document.removeEventListener("keydown", handleEscape);
            document.documentElement.classList.remove("modal-open");
        };
    }, [open, handleEscape]);

    if (!open) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Modal content */}
            <div
                className={clsx(
                    "relative w-full max-w-lg bg-white rounded-2xl shadow-xl",
                    "max-h-[90vh] overflow-y-auto",
                    "animate-in fade-in zoom-in-95 duration-200",
                    className
                )}
            >
                {/* Header */}
                {title && (
                    <div className="flex items-center justify-between px-6 py-4 border-b border-stone-200">
                        <h2 className="text-lg font-semibold text-stone-900">{title}</h2>
                        <button
                            onClick={onClose}
                            className="p-1 rounded-lg text-stone-400 hover:text-stone-600 hover:bg-stone-100 transition-colors"
                            aria-label="Chiudi"
                        >
                            <X size={20} />
                        </button>
                    </div>
                )}

                {/* Body */}
                <div className="px-6 py-4">{children}</div>
            </div>
        </div>
    );
}