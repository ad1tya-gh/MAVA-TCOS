import { useState } from "react";
import Sidebar from "./components/Sidebar";
import KelolaLayanan from "./pages/KelolaLayanan";
import KelolaKlien from "./pages/KelolaKlien";

export default function App() {
    const [activeTab, setActiveTab] = useState("layanan");

    return (
        <div className="flex min-h-screen bg-black text-white antialiased font-sans">
            {/* Sidebar Kiri */}
            <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />

            {/* Konten Utama Kanan */}
            <main className="flex-1 overflow-y-auto">
                {activeTab === "layanan" && <KelolaLayanan />}
                {activeTab === "klien" && <KelolaKlien />}
                {activeTab !== "layanan" && activeTab !== "klien" && (
                    <div className="p-8">
                        <h2 className="text-2xl font-bold capitalize">Halaman {activeTab}</h2>
                        <p className="text-neutral-500 mt-2">Sedang dalam tahap pembuatan...</p>
                    </div>
                )}
            </main>
        </div>
    );
}
