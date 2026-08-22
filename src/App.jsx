import { useState } from "react";
import Sidebar from "./components/Sidebar";
import KelolaLayanan from "./pages/KelolaLayanan";
import KelolaKlien from "./pages/KelolaKlien";
import KelolaKaryawan from "./pages/KelolaKaryawan";
import KelolaRole from "./pages/KelolaRole";

export default function App() {
    const [activeTab, setActiveTab] = useState("layanan");

    // SIMULASI LOGIN: Ganti 'Manager' menjadi 'Karyawan' untuk melihat efek proteksi menu!
    const [userRole, setUserRole] = useState("Manager");

    // Fungsi proteksi keamanan tambahan: Jika karyawan biasa mencoba mengakses tab khusus manager
    const managerOnlyTabs = ["karyawan", "klien", "layanan", "laporan"];
    const isAccessDenied = userRole !== "Manager" && managerOnlyTabs.includes(activeTab);

    return (
        <div className="flex min-h-screen bg-black text-white antialiased font-sans flex-col md:flex-row">
            {/* Tombol Simulasi Ganti Akun (Hapus saat fitur Login asli sudah dibuat) */}
            <div className="fixed top-4 right-50 z-50 bg-neutral-900 border border-neutral-700 p-2 rounded-xl flex items-center gap-3 shadow-lg">
                <span className="text-xs text-neutral-400 font-semibold uppercase tracking-wide">Simulasi Login:</span>
                <button
                    onClick={() => {
                        setUserRole(userRole === "Manager" ? "Karyawan" : "Manager");
                        setActiveTab("dashboard"); // Reset tab saat ganti akun
                    }}
                    className="cursor-pointer text-xs font-bold px-3 py-1.5 bg-[#DB3B96] rounded-md hover:bg-[#8B5EA8] transition-colors active:scale-95"
                >
                    {userRole} (Klik untuk Ganti)
                </button>
            </div>

            {/* Sidebar Kiri */}
            <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} userRole={userRole} />

            {/* Konten Utama Kanan */}
            <main className="flex-1 overflow-y-auto">
                {/* LAYAR PROTEKSI JIKA DIBOBOL */}
                {isAccessDenied ? (
                    <div className="p-12 text-center h-full flex flex-col items-center justify-center">
                        <h2 className="text-3xl font-bold text-red-500 mb-2">Akses Ditolak</h2>
                        <p className="text-neutral-400">Anda tidak memiliki izin (Manager) untuk mengakses halaman ini.</p>
                    </div>
                ) : (
                    <>
                        {/* RENDER HALAMAN SESUAI TAB */}
                        {activeTab === "layanan" && <KelolaLayanan />}
                        {activeTab === "klien" && <KelolaKlien />}
                        {activeTab === "karyawan" && <KelolaKaryawan />}
                        {activeTab === "posisi" && <KelolaRole />}

                        {/* Halaman Dummy */}
                        {activeTab !== "layanan" && activeTab !== "klien" && activeTab !== "karyawan" && activeTab !== "posisi" && (
                            <div className="p-8">
                                <h2 className="text-2xl font-bold capitalize">Halaman {activeTab}</h2>
                                <p className="text-neutral-500 mt-2">Sedang dalam tahap pembuatan...</p>
                            </div>
                        )}
                    </>
                )}
            </main>
        </div>
    );
}
