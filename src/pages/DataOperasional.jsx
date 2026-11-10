import { useState } from "react";
import { UserRoundCog, Briefcase, Building2, Layers } from "lucide-react";
import KelolaRole from "./KelolaRole";
import KelolaLayanan from "./KelolaLayanan";
import KelolaKlien from "./KelolaKlien";

export default function DataOperasional({ defaultTab = "posisi" }) {
    const [activeTab, setActiveTab] = useState(defaultTab);

    const tabs = [
        { id: "posisi", label: "Posisi Tim", icon: UserRoundCog, desc: "Daftar peran & jabatan" },
        { id: "layanan", label: "Jenis Layanan", icon: Briefcase, desc: "Katalog penawaran jasa" },
        { id: "klien", label: "Daftar Klien", icon: Building2, desc: "Direktori klien & mitra" },
    ];

    return (
        <div className="p-8 space-y-6 min-h-screen relative">
            {/* Header Data Operasional */}
            <div className="border-b border-neutral-800 pb-5">
                <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-xl bg-linear-to-tr from-[#DB3B96]/20 to-[#8B5EA8]/20 border border-[#DB3B96]/30 flex items-center justify-center text-[#DB3B96]">
                        <Layers className="w-5 h-5" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold text-white">Data Operasional</h2>
                        <p className="text-sm text-neutral-400">Pusat kelola referensi posisi tim, katalog layanan, dan data klien</p>
                    </div>
                </div>

                {/* Tab Switcher */}
                <div className="flex items-center gap-2 pt-2">
                    {tabs.map((tab) => {
                        const Icon = tab.icon;
                        const isActive = activeTab === tab.id;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`cursor-pointer flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
                                    isActive
                                        ? "bg-linear-to-r from-[#DB3B96] to-[#8B5EA8] text-white shadow-lg shadow-[#DB3B96]/20"
                                        : "bg-neutral-900 border border-neutral-800 text-neutral-400 hover:text-white hover:bg-neutral-800/60"
                                }`}
                            >
                                <Icon className="w-4 h-4" />
                                <span>{tab.label}</span>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Konten Tab Aktif */}
            <div>
                {activeTab === "posisi" && <KelolaRole embedded={true} />}
                {activeTab === "layanan" && <KelolaLayanan embedded={true} />}
                {activeTab === "klien" && <KelolaKlien embedded={true} />}
            </div>
        </div>
    );
}

