import "./globals.css";
import Navbar from "@/components/layout/Navbar";

export const metadata = {
    title: "Family Meal Calendar",
    description: "Calendario familiare per pranzi e cene",
};

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="it">
            <body className="min-h-screen bg-stone-50 flex flex-col">
                <Navbar />
                <main className="flex-1 w-full max-w-[1600px] mx-auto p-4 md:p-6 lg:p-8">
                    {children}
                </main>
            </body>
        </html>
    );
}