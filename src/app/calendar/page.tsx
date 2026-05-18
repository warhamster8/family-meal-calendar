import WeekView from "@/components/calendar/WeekView";

export default function CalendarPage() {
    return (
        <div className="py-6">
            <h1 className="text-3xl font-extrabold text-stone-800 tracking-tight mb-6">
                Calendario Pasti Settimanale
            </h1>
            <WeekView />
        </div>
    );
}
