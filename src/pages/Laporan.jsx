import { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";
import { FileSpreadsheet, FileText, Filter, Calendar, Briefcase } from "lucide-react";
import { motion } from "framer-motion";
import MavaLoader from "../components/MavaLoader";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export default function Laporan() {
    const [tasks, setTasks] = useState([]);
    const [services, setServices] = useState([]);
    const [loading, setLoading] = useState(true);

    // State untuk Filter
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");
    const [selectedService, setSelectedService] = useState("");
    const [selectedStatus, setSelectedStatus] = useState("");

    useEffect(() => {
        let ignore = false;
        async function fetchReportData() {
            setLoading(true);
            try {
                const [tasksRes, servicesRes] = await Promise.all([
                    supabase
                        .from("tasks")
                        .select(
                            `
            *,
            assignee:users!tasks_assignee_id_fkey(full_name),
            service:services(service_name),
            client:clients(client_name)
          `,
                        )
                        .order("created_at", { ascending: false }),
                    supabase.from("services").select("*"),
                ]);

                if (!ignore) {
                    if (!tasksRes.error) setTasks(tasksRes.data || []);
                    if (!servicesRes.error) setServices(servicesRes.data || []);
                }
            } catch (err) {
                console.error("Error fetching report data:", err);
            } finally {
                if (!ignore) setLoading(false);
            }
        }
        fetchReportData();
        return () => {
            ignore = true;
        };
    }, []);

    // Logika Filter Data
    const filteredTasks = tasks.filter((task) => {
        let matchStartDate = true;
        let matchEndDate = true;
        let matchService = true;
        let matchStatus = true;

        if (startDate) matchStartDate = new Date(task.created_at) >= new Date(startDate);
        if (endDate) {
            const end = new Date(endDate);
            end.setHours(23, 59, 59, 999);
            matchEndDate = new Date(task.created_at) <= end;
        }
        if (selectedService) matchService = task.service_id.toString() === selectedService;
        if (selectedStatus) matchStatus = task.status === selectedStatus;

        return matchStartDate && matchEndDate && matchService && matchStatus;
    });

    // ==========================================
    // FUNGSI EXPORT KE EXCEL
    // ==========================================
    const exportToExcel = () => {
        if (filteredTasks.length === 0) return alert("Tidak ada data untuk diekspor!");

        // 1. Format data agar rapi di Excel
        const excelData = filteredTasks.map((task, index) => ({
            No: index + 1,
            "Tanggal Dibuat": new Date(task.created_at).toLocaleDateString("id-ID"),
            "Judul Tugas": task.title,
            Klien: task.client?.client_name || "-",
            Layanan: task.service?.service_name || "-",
            "Penerima Tugas": task.assignee?.full_name || "-",
            "Tenggat Waktu": task.due_date ? new Date(task.due_date).toLocaleDateString("id-ID") : "-",
            Status: task.status,
        }));

        // 2. Buat Worksheet & Workbook
        const worksheet = XLSX.utils.json_to_sheet(excelData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Laporan Tugas");

        // 3. Simpan File
        XLSX.writeFile(workbook, `Laporan_TCOS_${new Date().getTime()}.xlsx`);
    };

    // ==========================================
    // FUNGSI EXPORT KE PDF
    // ==========================================
    const exportToPDF = () => {
        if (filteredTasks.length === 0) return alert("Tidak ada data untuk diekspor!");

        const doc = new jsPDF("landscape"); // Kertas posisi memanjang

        // Judul PDF
        doc.setFontSize(16);
        doc.text("Laporan Operasional Tugas (TCOS)", 14, 20);
        doc.setFontSize(10);
        doc.setTextColor(100);
        doc.text(`Dicetak pada: ${new Date().toLocaleString("id-ID")}`, 14, 28);

        // Format Data untuk Tabel PDF
        const tableColumn = ["No", "Tanggal", "Judul Tugas", "Klien", "Layanan", "Karyawan", "Deadline", "Status"];
        const tableRows = [];

        filteredTasks.forEach((task, index) => {
            const taskData = [
                index + 1,
                new Date(task.created_at).toLocaleDateString("id-ID"),
                task.title,
                task.client?.client_name || "-",
                task.service?.service_name || "-",
                task.assignee?.full_name || "-",
                task.due_date ? new Date(task.due_date).toLocaleDateString("id-ID") : "-",
                task.status,
            ];
            tableRows.push(taskData);
        });

        // Generate Tabel
        autoTable(doc, {
            head: [tableColumn],
            body: tableRows,
            startY: 35,
            theme: "grid",
            styles: { fontSize: 8, cellPadding: 3 },
            headStyles: { fillColor: [219, 59, 150] }, // Warna header tabel pink khas aplikasi kita
        });

        // Simpan File
        doc.save(`Laporan_TCOS_${new Date().getTime()}.pdf`);
    };

    const getStatusColor = (status) => {
        switch (status) {
            case "In Progress":
                return "bg-blue-500/10 text-blue-400 border-blue-500/20";
            case "Pending":
                return "bg-amber-500/10 text-amber-400 border-amber-500/20";
            case "In Review":
                return "bg-purple-500/10 text-purple-400 border-purple-500/20";
            case "Completed":
                return "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
            default:
                return "bg-neutral-800 text-neutral-400 border-neutral-700";
        }
    };

    return (
        <div className="p-8 space-y-6 min-h-screen relative flex flex-col">
            {/* Header Halaman */}
            <div className="flex items-center justify-between shrink-0">
                <div>
                    <h2 className="text-2xl font-bold text-white">Laporan Operasional</h2>
                    <p className="text-sm text-neutral-400">Filter dan ekspor data performa tim</p>
                </div>

                {/* Tombol Export Khas */}
                <div className="flex items-center gap-3">
                    <button
                        onClick={exportToExcel}
                        className="cursor-pointer flex items-center gap-2 bg-green-600 hover:bg-green-500 active:scale-95 text-white font-medium px-4 py-2.5 rounded-xl text-sm transition-all shadow-lg shadow-green-900/20"
                    >
                        <FileSpreadsheet className="w-4 h-4" /> Export Excel
                    </button>

                    <button
                        onClick={exportToPDF}
                        className="cursor-pointer flex items-center gap-2 bg-red-600 hover:bg-red-500 active:scale-95 text-white font-medium px-4 py-2.5 rounded-xl text-sm transition-all shadow-lg shadow-red-900/20"
                    >
                        <FileText className="w-4 h-4" /> Export PDF
                    </button>
                </div>
            </div>

            {loading ? (
                <MavaLoader text="Menyiapkan data laporan..." />
            ) : (
                <>
                    {/* Panel Filter */}
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-neutral-900/50 border border-neutral-800 rounded-2xl p-5 flex flex-wrap gap-4 items-end">
                        <div className="flex-1 min-w-[150px]">
                            <label className="block text-xs font-semibold text-neutral-400 mb-2 flex items-center gap-1.5">
                                <Calendar className="w-3.5 h-3.5" /> Tanggal Mulai
                            </label>
                            <input
                                type="date"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                                className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-[#DB3B96] [color-scheme:dark]"
                            />
                        </div>
                        <div className="flex-1 min-w-[150px]">
                            <label className="block text-xs font-semibold text-neutral-400 mb-2 flex items-center gap-1.5">
                                <Calendar className="w-3.5 h-3.5" /> Tanggal Akhir
                            </label>
                            <input
                                type="date"
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                                className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-[#DB3B96] [color-scheme:dark]"
                            />
                        </div>
                        <div className="flex-1 min-w-[150px]">
                            <label className="block text-xs font-semibold text-neutral-400 mb-2 flex items-center gap-1.5">
                                <Briefcase className="w-3.5 h-3.5" /> Kategori Layanan
                            </label>
                            <select
                                value={selectedService}
                                onChange={(e) => setSelectedService(e.target.value)}
                                className="cursor-pointer w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-[#DB3B96] appearance-none"
                            >
                                <option value="">Semua Layanan</option>
                                {services.map((s) => (
                                    <option key={s.service_id} value={s.service_id}>
                                        {s.service_name}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div className="flex-1 min-w-[150px]">
                            <label className="block text-xs font-semibold text-neutral-400 mb-2 flex items-center gap-1.5">
                                <Filter className="w-3.5 h-3.5" /> Status
                            </label>
                            <select
                                value={selectedStatus}
                                onChange={(e) => setSelectedStatus(e.target.value)}
                                className="cursor-pointer w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-[#DB3B96] appearance-none"
                            >
                                <option value="">Semua Status</option>
                                <option value="Completed">Completed (Selesai)</option>
                                <option value="In Review">In Review</option>
                                <option value="In Progress">In Progress</option>
                                <option value="Pending">Pending</option>
                                <option value="To Do">To Do</option>
                            </select>
                        </div>
                    </motion.div>

                    {/* Tabel Preview */}
                    <div className="flex-1 bg-neutral-900 border border-neutral-800 rounded-2xl overflow-hidden flex flex-col">
                        <div className="overflow-x-auto flex-1 custom-scrollbar">
                            <table className="w-full text-left text-sm text-neutral-400">
                                <thead className="bg-neutral-950/50 text-xs uppercase text-neutral-500 border-b border-neutral-800 sticky top-0 z-10">
                                    <tr>
                                        <th className="px-6 py-4 font-bold">Tugas & Klien</th>
                                        <th className="px-6 py-4 font-bold">Layanan</th>
                                        <th className="px-6 py-4 font-bold">Penerima</th>
                                        <th className="px-6 py-4 font-bold">Dibuat Tgl</th>
                                        <th className="px-6 py-4 font-bold">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-neutral-800">
                                    {filteredTasks.length > 0 ? (
                                        filteredTasks.map((task) => (
                                            <tr key={task.task_id} className="hover:bg-neutral-800/20 transition-colors">
                                                <td className="px-6 py-4">
                                                    <div className="font-bold text-white mb-1">{task.title}</div>
                                                    <div className="text-xs">{task.client?.client_name || "-"}</div>
                                                </td>
                                                <td className="px-6 py-4">{task.service?.service_name || "-"}</td>
                                                <td className="px-6 py-4 text-neutral-300 font-medium">{task.assignee?.full_name || "-"}</td>
                                                <td className="px-6 py-4">{new Date(task.created_at).toLocaleDateString("id-ID")}</td>
                                                <td className="px-6 py-4">
                                                    <span className={`text-[10px] font-bold px-2.5 py-1 rounded-md border ${getStatusColor(task.status)} uppercase`}>{task.status}</span>
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan="5" className="px-6 py-12 text-center text-neutral-500">
                                                Tidak ada data yang cocok dengan filter.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
