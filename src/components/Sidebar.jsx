import { LayoutDashboard, CheckSquare, Users, Building2, Briefcase, BarChart3, UserRoundCog } from "lucide-react";

// Tambahkan prop 'userRole' untuk menerima status login dari App.jsx
export default function Sidebar({ activeTab, setActiveTab, userRole }) {
    const menuItems = [
        { id: "dashboard", label: "Dashboard", icon: LayoutDashboard, allowed: ["Manager", "Karyawan"] },
        { id: "tasks", label: "Semua Task", icon: CheckSquare, allowed: ["Manager", "Karyawan"] },
        // Menu di bawah hanya untuk Manager
        { id: "posisi", label: "Kelola Posisi", icon: UserRoundCog, allowed: ["Manager"] },
        { id: "karyawan", label: "Kelola Karyawan", icon: Users, allowed: ["Manager"] },
        { id: "klien", label: "Kelola Klien", icon: Building2, allowed: ["Manager"] },
        { id: "layanan", label: "Kelola Layanan", icon: Briefcase, allowed: ["Manager"] },
        { id: "laporan", label: "Laporan", icon: BarChart3, allowed: ["Manager"] },
    ];

    // Saring menu berdasarkan role yang login
    const visibleMenus = menuItems.filter((item) => item.allowed.includes(userRole));

    return (
        <aside className="w-64 bg-neutral-900 border-r border-neutral-800 flex flex-col justify-between h-screen sticky top-0 shrink-0">
            <div>
                <div className="p-6 border-b border-neutral-800">
                    <img src="/img/Logo.png" alt="Logo" className="h-14" />
                    {/* <h1 className="text-xl font-bold text-white tracking-wide">MAVA Ops</h1> */}
                    {/* <p className="text-xs text-neutral-400 mt-0.5">Task & Operations System</p> */}
                </div>

                <nav className="p-4 space-y-1">
                    {visibleMenus.map((item) => {
                        const Icon = item.icon;
                        const isActive = activeTab === item.id;
                        return (
                            <button
                                key={item.id}
                                onClick={() => setActiveTab(item.id)}
                                className={`cursor-pointer w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all active:scale-95 ${
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

            {/* Profile Ringkas */}
            <div className="p-4 border-t border-neutral-800 m-4 bg-neutral-950 rounded-xl border">
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-linear-to-tr from-[#DB3B96] to-[#8B5EA8] text-white flex items-center justify-center font-bold text-sm shadow-inner">{userRole === "Manager" ? "MG" : "KY"}</div>
                    <div className="overflow-hidden">
                        <p className="text-sm font-semibold text-white truncate">{userRole === "Manager" ? "Atasan / Manager" : "Staf Karyawan"}</p>
                        <p className="text-xs text-[#DB3B96] font-medium truncate">{userRole}</p>
                    </div>
                </div>
            </div>
        </aside>
    );
}
