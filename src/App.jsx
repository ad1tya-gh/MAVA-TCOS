import { useState, useEffect } from "react";
import Sidebar from "./components/Sidebar";
import KelolaLayanan from "./pages/KelolaLayanan";
import KelolaKlien from "./pages/KelolaKlien";
import KelolaKaryawan from "./pages/KelolaKaryawan";
import KelolaRole from "./pages/KelolaRole";
import KelolaTask from "./pages/KelolaTask";
import TaskKaryawan from "./pages/TaskKaryawan";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Laporan from "./pages/Laporan";

export default function App() {
    const [activeTab, setActiveTab] = useState("dashboard");
    const [loggedInUser, setLoggedInUser] = useState(null);

    // Cek apakah ada sesi login tersimpan di localStorage saat web dibuka
    useEffect(() => {
        const savedUser = localStorage.getItem("mava_user");
        if (savedUser) {
            setLoggedInUser(JSON.parse(savedUser));
        }
    }, []);

    const handleLoginSuccess = (userData) => {
        setLoggedInUser(userData);
        localStorage.setItem("mava_user", JSON.stringify(userData)); // Simpan sesi
        setActiveTab("tasks");
    };

    const handleLogout = () => {
        setLoggedInUser(null);
        localStorage.removeItem("mava_user");
    };

    // Jika belum login, tampilkan halaman Login saja
    if (!loggedInUser) {
        return <Login onLogin={handleLoginSuccess} />;
    }

    // Tentukan apakah user ini Manager atau Karyawan
    const isManager = loggedInUser.roles?.role_name === "Manager";
    const userRole = isManager ? "Manager" : "Karyawan";

    // Proteksi Halaman Khusus Manager
    const managerOnlyTabs = ["karyawan", "posisi", "klien", "layanan", "laporan"];
    const isAccessDenied = !isManager && managerOnlyTabs.includes(activeTab);

    return (
        <div className="flex min-h-screen bg-black text-white antialiased font-sans flex-col md:flex-row">
            {/* Sidebar Kiri */}
            <Sidebar
                activeTab={activeTab}
                setActiveTab={setActiveTab}
                userRole={userRole}
                userName={loggedInUser.full_name} // Kirim nama asli user ke Sidebar
                onLogout={handleLogout} // Kirim fungsi logout
            />

            {/* Konten Utama Kanan */}
            <main className="flex-1 overflow-y-auto">
                {isAccessDenied ? (
                    <div className="p-12 text-center h-full flex flex-col items-center justify-center">
                        <h2 className="text-3xl font-bold text-red-500 mb-2">Akses Ditolak</h2>
                        <p className="text-neutral-400">Anda tidak memiliki izin untuk mengakses halaman ini.</p>
                    </div>
                ) : (
                    <>
                        {activeTab === "layanan" && <KelolaLayanan />}
                        {activeTab === "klien" && <KelolaKlien />}
                        {activeTab === "karyawan" && <KelolaKaryawan />}
                        {activeTab === "posisi" && <KelolaRole />}
                        {activeTab === "dashboard" && <Dashboard userId={loggedInUser.user_id} userRole={userRole} />}
                        {activeTab === "laporan" && <Laporan />}

                        {/* LOGIKA PERCABANGAN TASK DENGAN MENGIRIM ID USER ASLI */}
                        {activeTab === "tasks" && isManager && <KelolaTask managerId={loggedInUser.user_id} />}
                        {activeTab === "tasks" && !isManager && <TaskKaryawan employeeId={loggedInUser.user_id} />}

                        {activeTab !== "layanan" && activeTab !== "klien" && activeTab !== "karyawan" && activeTab !== "posisi" && activeTab !== "tasks" && activeTab !== "dashboard" && activeTab !== "laporan" && (
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
