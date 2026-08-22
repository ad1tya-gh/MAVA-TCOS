import { LayoutDashboard, CheckSquare, Users, Building2, Briefcase, BarChart3 } from "lucide-react";

export default function Sidebar({ activeTab, setActiveTab }) {
    const menuItems = [
        { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
        { id: "tasks", label: "Semua Task", icon: CheckSquare },
        { id: "karyawan", label: "Kelola Karyawan", icon: Users },
        { id: "klien", label: "Kelola Klien", icon: Building2 },
        { id: "layanan", label: "Kelola Layanan", icon: Briefcase },
        { id: "laporan", label: "Laporan", icon: BarChart3 },
    ];

    return (
        <aside className="w-64 bg-neutral-900 border-r border-neutral-800 flex flex-col justify-between h-screen sticky top-0 shrink-0">
            <div>
                {/* Logo / Brand Header */}
                <div className="p-6 border-b border-neutral-800">
                    <img src="/img/Logo.png" alt="Logo" className="h-14" />
                    {/* <h1 className="text-xl font-bold text-white tracking-wide">MAVA Ops</h1> */}
                    {/* <p className="text-xs text-neutral-400 mt-0.5">Task & Operations System</p> */}
                </div>

                {/* Menu Navigasi */}
                <nav className="p-4 space-y-1">
                    {menuItems.map((item) => {
                        const Icon = item.icon;
                        const isActive = activeTab === item.id;
                        return (
                            <button
                                key={item.id}
                                onClick={() => setActiveTab(item.id)}
                                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all cursor-pointer ${
                                    isActive ? "bg-neutral-800 text-white border-l-4 border-[#DB3B96]" : "text-neutral-400 hover:text-white hover:bg-neutral-800/50"
                                }`}
                            >
                                <Icon className={`w-5 h-5 ${isActive ? "text-[#DB3B96]" : "text-neutral-400"}`} />
                                {item.label}
                            </button>
                        );
                    })}
                </nav>
            </div>

            {/* Profile Ringkas (Atasan/Manager) */}
            <div className="p-4 border-t m-4 bg-neutral-950 rounded-xl border border-neutral-800">
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-linear-to-tr from-[#DB3B96] to-[#8B5EA8] text-white flex items-center justify-center font-bold text-sm">MO</div>
                    <div className="overflow-hidden">
                        <p className="text-sm font-semibold text-white truncate">Manager Ops</p>
                        <p className="text-xs text-neutral-400 truncate">manager@mava.com</p>
                    </div>
                </div>
            </div>
        </aside>
    );
}
