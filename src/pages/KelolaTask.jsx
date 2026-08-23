import { useCallback, useEffect, useState, useRef } from "react";
import { supabase } from "../supabaseClient";
import { Plus, MoreVertical, Pencil, Trash2, X, Check, AlertTriangle, Calendar, User, Briefcase, Building2, FileText, Link as LinkIcon, CheckCircle2, XCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import MavaLoader from "../components/MavaLoader";

const TASKS_SELECT = `
    *,
    assignee:users!tasks_assignee_id_fkey(full_name),
    service:services(service_name),
    client:clients(client_name),
    task_logs(*)
`;

export default function KelolaTask({ managerId }) {
    const [tasks, setTasks] = useState([]);
    const [employees, setEmployees] = useState([]);
    const [services, setServices] = useState([]);
    const [clients, setClients] = useState([]);
    const [loading, setLoading] = useState(true);

    const [activeDropdown, setActiveDropdown] = useState(null);
    const dropdownRef = useRef(null);

    // States untuk 3 Jenis Modal Utama
    const [isFormModalOpen, setIsFormModalOpen] = useState(false);
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

    const [modalMode, setModalMode] = useState("add");
    const [selectedTask, setSelectedTask] = useState(null); // Dipakai untuk Detail & Delete
    const [isProcessing, setIsProcessing] = useState(false);

    const [formData, setFormData] = useState({
        title: "",
        description: "",
        assignee_id: "",
        service_id: "",
        client_id: "",
        due_date: "",
    });

    // Refetch khusus daftar tasks (dipakai setelah tambah/edit/approval)
    const fetchTasksList = useCallback(async () => {
        const { data, error } = await supabase.from("tasks").select(TASKS_SELECT).order("created_at", { ascending: false });
        if (!error) setTasks(data || []);
        return { data, error };
    }, []);

    // 1. FETCH DATA UTAMA (sekali saat mount)
    useEffect(() => {
        let ignore = false;
        async function fetchData() {
            setLoading(true);
            try {
                const [tasksRes, empRes, srvRes, cliRes] = await Promise.all([
                    supabase.from("tasks").select(TASKS_SELECT).order("created_at", { ascending: false }),
                    supabase.from("users").select("user_id, full_name").eq("is_active", true),
                    supabase.from("services").select("service_id, service_name"),
                    supabase.from("clients").select("client_id, client_name").eq("is_active", true),
                ]);

                if (!ignore) {
                    if (!tasksRes.error) setTasks(tasksRes.data || []);
                    if (!empRes.error) setEmployees(empRes.data || []);
                    if (!srvRes.error) setServices(srvRes.data || []);
                    if (!cliRes.error) setClients(cliRes.data || []);
                }
            } catch (err) {
                console.error("Error fetching data:", err);
            } finally {
                if (!ignore) setLoading(false);
            }
        }
        fetchData();
        return () => {
            ignore = true;
        };
    }, []);

    // Click Outside Listener untuk Dropdown
    useEffect(() => {
        function handleClickOutside(event) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setActiveDropdown(null);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // 2. HANDLERS MODAL FORM (TAMBAH/EDIT)
    const handleOpenAddModal = () => {
        setModalMode("add");
        setFormData({ title: "", description: "", assignee_id: "", service_id: "", client_id: "", due_date: "" });
        setIsFormModalOpen(true);
    };

    const handleOpenEditModal = (task, e) => {
        e.stopPropagation(); // Mencegah kartu ter-klik
        setModalMode("edit");
        setSelectedTask(task);
        const formattedDate = task.due_date ? new Date(task.due_date).toISOString().slice(0, 16) : "";

        setFormData({
            title: task.title,
            description: task.description || "",
            assignee_id: task.assignee_id || "",
            service_id: task.service_id || "",
            client_id: task.client_id || "",
            due_date: formattedDate,
        });
        setActiveDropdown(null);
        setIsFormModalOpen(true);
    };

    const handleCloseFormModal = () => {
        if (!isProcessing) setIsFormModalOpen(false);
    };

    const handleFormSubmit = async (e) => {
        e.preventDefault();
        if (!formData.title.trim() || !formData.assignee_id) return;
        setIsProcessing(true);
        try {
            if (modalMode === "add") {
                const { error } = await supabase.from("tasks").insert([
                    {
                        title: formData.title.trim(),
                        description: formData.description.trim(),
                        assigner_id: managerId,
                        assignee_id: formData.assignee_id,
                        service_id: formData.service_id,
                        client_id: formData.client_id || null,
                        due_date: formData.due_date || null,
                        status: "To Do",
                    },
                ]);
                if (error) throw error;
            } else {
                const { error } = await supabase
                    .from("tasks")
                    .update({
                        title: formData.title.trim(),
                        description: formData.description.trim(),
                        assignee_id: formData.assignee_id,
                        service_id: formData.service_id,
                        client_id: formData.client_id || null,
                        due_date: formData.due_date || null,
                    })
                    .eq("task_id", selectedTask.task_id);
                if (error) throw error;
            }

            // Refetch lewat fungsi yang sama supaya task_logs tetap ikut termuat
            await fetchTasksList();
            setIsFormModalOpen(false);
        } catch (error) {
            alert("Gagal menyimpan tugas: " + error.message);
        } finally {
            setIsProcessing(false);
        }
    };

    // 3. HANDLERS MODAL DELETE
    const handleOpenDeleteModal = (task, e) => {
        e.stopPropagation();
        setSelectedTask(task);
        setActiveDropdown(null);
        setIsDeleteModalOpen(true);
    };

    const confirmDelete = async () => {
        if (!selectedTask) return;
        setIsProcessing(true);
        const { error } = await supabase.from("tasks").delete().eq("task_id", selectedTask.task_id);
        if (!error) {
            setTasks((prev) => prev.filter((t) => t.task_id !== selectedTask.task_id));
            setIsDeleteModalOpen(false);
            setSelectedTask(null);
        } else {
            alert("Gagal menghapus tugas: " + error.message);
        }
        setIsProcessing(false);
    };

    // 4. HANDLERS MODAL DETAIL & APPROVAL
    const handleOpenDetailModal = (task) => {
        setSelectedTask(task);
        setActiveDropdown(null); // FIX: pastikan dropdown titik-tiga dari kartu lain ikut tertutup
        setIsDetailModalOpen(true);
    };

    const handleApproval = async (newStatus) => {
        setIsProcessing(true);
        const { error } = await supabase.from("tasks").update({ status: newStatus }).eq("task_id", selectedTask.task_id);
        if (!error) {
            setTasks((prev) => prev.map((t) => (t.task_id === selectedTask.task_id ? { ...t, status: newStatus } : t)));
            setSelectedTask({ ...selectedTask, status: newStatus });
            setIsDetailModalOpen(false); // Tutup modal setelah approval
        } else {
            alert("Gagal memperbarui status: " + error.message);
        }
        setIsProcessing(false);
    };

    // 5. HELPER KANBAN COLUMNS
    const kanbanColumns = [
        { id: "To Do", label: "To Do", color: "border-slate-500", bg: "bg-slate-500/10" },
        { id: "In Progress", label: "In Progress", color: "border-blue-500", bg: "bg-blue-500/10" },
        { id: "Pending", label: "Pending", color: "border-amber-500", bg: "bg-amber-500/10" },
        { id: "In Review", label: "In Review", color: "border-purple-500", bg: "bg-purple-500/10" },
        { id: "Completed", label: "Completed", color: "border-emerald-500", bg: "bg-emerald-500/10" },
    ];

    const isOverdue = (task) => task.due_date && new Date(task.due_date) < new Date() && task.status !== "Completed";

    return (
        <div className="p-8 space-y-6 min-h-screen relative flex flex-col">
            {/* Header Halaman */}
            <div className="flex items-center justify-between shrink-0">
                <div>
                    <h2 className="text-2xl font-bold text-white">Task Management</h2>
                    <p className="text-sm text-neutral-400">Pantau progres dan review hasil kerja tim</p>
                </div>
                <button
                    onClick={handleOpenAddModal}
                    className="cursor-pointer flex items-center gap-2 bg-linear-to-r from-[#DB3B96] to-[#8B5EA8] hover:opacity-90 hover:scale-105 active:scale-95 text-white font-medium px-4 py-2.5 rounded-xl text-sm transition-all shadow-lg shadow-[#DB3B96]/20"
                >
                    <Plus className="w-4 h-4" /> Delegasikan Tugas
                </button>
            </div>

            {/* KANBAN BOARD VIEW */}
            {loading ? (
                <MavaLoader text="Menyiapkan Papan Kanban..." />
            ) : (
                <div className="flex-1 overflow-x-auto pb-4 custom-scrollbar" ref={dropdownRef}>
                    <div className="flex gap-6 h-full items-start">
                        {kanbanColumns.map((col) => {
                            const columnTasks = tasks.filter((t) => t.status === col.id);

                            return (
                                <div key={col.id} className="min-w-[320px] w-[320px] bg-neutral-900/40 border border-neutral-800 rounded-2xl flex flex-col max-h-full">
                                    {/* Column Header */}
                                    <div className={`p-4 border-b border-neutral-800 flex items-center justify-between`}>
                                        <div className="flex items-center gap-2">
                                            <div className={`w-3 h-3 rounded-full border-2 ${col.color} ${col.bg}`}></div>
                                            <h3 className="font-bold text-white tracking-wide">{col.label}</h3>
                                        </div>
                                        <span className="bg-neutral-800 text-neutral-400 text-xs font-bold px-2.5 py-1 rounded-full">{columnTasks.length}</span>
                                    </div>

                                    {/* Column Cards */}
                                    <div className="p-3 space-y-3 overflow-y-auto custom-scrollbar flex-1">
                                        {columnTasks.map((task) => {
                                            const isDropdownOpen = activeDropdown === task.task_id;
                                            return (
                                                <div
                                                    key={task.task_id}
                                                    onClick={() => handleOpenDetailModal(task)}
                                                    className="cursor-pointer bg-neutral-900 border border-neutral-700/50 hover:border-neutral-500 rounded-xl p-4 flex flex-col gap-3 transition-all hover:shadow-lg active:scale-[0.98] group relative"
                                                >
                                                    <div className="flex items-start justify-between gap-2">
                                                        <h4 className="text-sm font-bold text-white leading-snug group-hover:text-[#DB3B96] transition-colors line-clamp-2">{task.title}</h4>
                                                        {/* Tombol Titik Tiga */}
                                                        <div className="relative shrink-0">
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    setActiveDropdown(isDropdownOpen ? null : task.task_id);
                                                                }}
                                                                className="cursor-pointer p-1 rounded-md text-neutral-400 hover:text-white hover:bg-neutral-800 active:scale-90 transition-all"
                                                            >
                                                                <MoreVertical className="w-4 h-4" />
                                                            </button>

                                                            {/* Dropdown Menu (Hanya Edit/Hapus) */}
                                                            <AnimatePresence>
                                                                {isDropdownOpen && (
                                                                    <motion.div
                                                                        initial={{ opacity: 0, scale: 0.95 }}
                                                                        animate={{ opacity: 1, scale: 1 }}
                                                                        exit={{ opacity: 0, scale: 0.95 }}
                                                                        className="absolute right-0 mt-1 w-32 bg-neutral-950 border border-neutral-700 rounded-lg shadow-xl z-20 overflow-hidden py-1"
                                                                    >
                                                                        <button
                                                                            onClick={(e) => handleOpenEditModal(task, e)}
                                                                            className="cursor-pointer w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-neutral-300 hover:text-white hover:bg-neutral-800 transition-colors"
                                                                        >
                                                                            <Pencil className="w-3.5 h-3.5" /> Edit
                                                                        </button>
                                                                        <button
                                                                            onClick={(e) => handleOpenDeleteModal(task, e)}
                                                                            className="cursor-pointer w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-neutral-300 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                                                                        >
                                                                            <Trash2 className="w-3.5 h-3.5" /> Hapus
                                                                        </button>
                                                                    </motion.div>
                                                                )}
                                                            </AnimatePresence>
                                                        </div>
                                                    </div>

                                                    <div className="space-y-1.5">
                                                        {task.client?.client_name && (
                                                            <div className="flex items-center gap-1.5 text-xs text-neutral-400">
                                                                <Building2 className="w-3.5 h-3.5 text-neutral-500" /> {task.client.client_name}
                                                            </div>
                                                        )}
                                                        <div className="flex items-center gap-1.5 text-xs text-neutral-400">
                                                            <Briefcase className="w-3.5 h-3.5 text-neutral-500" /> {task.service?.service_name || "-"}
                                                        </div>
                                                    </div>

                                                    <div className="flex items-center justify-between pt-3 border-t border-neutral-800/80 mt-1">
                                                        <div className="flex items-center gap-1.5 text-xs font-medium">
                                                            <div className="w-5 h-5 rounded-full bg-neutral-700 flex items-center justify-center text-[10px] text-white">{task.assignee?.full_name?.substring(0, 1) || "?"}</div>
                                                            <span className="text-neutral-300 truncate max-w-[100px]">{task.assignee?.full_name}</span>
                                                        </div>
                                                        {task.due_date && (
                                                            <div className={`flex items-center gap-1 text-[11px] font-semibold ${isOverdue(task) ? "text-red-400" : "text-neutral-500"}`}>
                                                                <Calendar className="w-3 h-3" />
                                                                {new Date(task.due_date).toLocaleDateString("id-ID", { day: "numeric", month: "short" })}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}

                                        {columnTasks.length === 0 && <div className="text-center p-4 border border-dashed border-neutral-800 rounded-xl text-neutral-600 text-xs font-medium">Kosong</div>}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* 1. POPUP DETAIL & APPROVAL BESAR (KLIK KARTU) */}
            <AnimatePresence>
                {isDetailModalOpen && selectedTask && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsDetailModalOpen(false)} className="absolute inset-0 bg-black/80 backdrop-blur-sm cursor-pointer" />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 10 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 10 }}
                            className="relative w-full max-w-3xl bg-neutral-900 border border-neutral-800 rounded-2xl shadow-2xl overflow-hidden z-10 flex flex-col max-h-[85vh]"
                        >
                            {/* Header Detail */}
                            <div className="flex items-start justify-between p-6 border-b border-neutral-800 bg-neutral-950/50">
                                <div>
                                    <div className="flex items-center gap-3 mb-2">
                                        <span className="bg-neutral-800 text-neutral-300 text-xs font-bold px-2.5 py-1 rounded-md uppercase tracking-wide border border-neutral-700">{selectedTask.status}</span>
                                        {selectedTask.client?.client_name && (
                                            <span className="text-xs text-[#DB3B96] font-semibold flex items-center gap-1">
                                                <Building2 className="w-3.5 h-3.5" /> {selectedTask.client.client_name}
                                            </span>
                                        )}
                                    </div>
                                    <h2 className="text-2xl font-bold text-white">{selectedTask.title}</h2>
                                </div>
                                <button onClick={() => setIsDetailModalOpen(false)} className="cursor-pointer p-2 rounded-xl text-neutral-400 hover:text-white hover:bg-neutral-800 active:scale-90 transition-all bg-neutral-900">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            {/* Body Detail (2 Kolom Layout) */}
                            <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 md:grid-cols-3 gap-8">
                                {/* Kolom Kiri: Info Utama */}
                                <div className="md:col-span-2 space-y-6">
                                    <div>
                                        <h4 className="text-xs font-bold text-neutral-500 uppercase tracking-wider mb-2">Instruksi / Deskripsi Tugas</h4>
                                        <p className="text-sm text-neutral-300 leading-relaxed whitespace-pre-wrap">{selectedTask.description || "Tidak ada deskripsi detail."}</p>
                                    </div>

                                    {/* RIWAYAT LOG DARI KARYAWAN, TERURUT TERBARU DULU */}
                                    <div className="pt-4">
                                        <h4 className="text-xs font-bold text-neutral-500 uppercase tracking-wider mb-3">Riwayat Pengerjaan & Bukti Kerja</h4>
                                        <div className="space-y-3">
                                            {selectedTask.task_logs?.length > 0 ? (
                                                [...selectedTask.task_logs]
                                                    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
                                                    .map((log) => (
                                                        <div key={log.log_id} className="p-4 bg-neutral-950 border border-neutral-800 rounded-xl">
                                                            <div className="flex items-center justify-between mb-2">
                                                                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-neutral-800 text-neutral-300 border border-neutral-700 uppercase">{log.status_changed}</span>
                                                                <span className="text-xs text-neutral-500">{new Date(log.created_at).toLocaleDateString("id-ID", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</span>
                                                            </div>
                                                            <p className="text-sm text-neutral-300 italic mb-3">"{log.notes || "Tidak ada catatan"}"</p>

                                                            {/* Menampilkan 2 Jenis Supporting Data */}
                                                            <div className="flex flex-wrap gap-3">
                                                                {log.attachment_url && (
                                                                    <a
                                                                        href={log.attachment_url}
                                                                        target="_blank"
                                                                        rel="noreferrer"
                                                                        className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-lg text-xs font-medium hover:bg-blue-500 hover:text-white transition-all active:scale-95"
                                                                    >
                                                                        <LinkIcon className="w-3.5 h-3.5" /> Buka Link
                                                                    </a>
                                                                )}
                                                                {log.attachment_file && (
                                                                    <a
                                                                        href={log.attachment_file}
                                                                        target="_blank"
                                                                        rel="noreferrer"
                                                                        className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-lg text-xs font-medium hover:bg-emerald-500 hover:text-white transition-all active:scale-95"
                                                                    >
                                                                        <FileText className="w-3.5 h-3.5" /> Lihat File / Foto
                                                                    </a>
                                                                )}
                                                            </div>
                                                        </div>
                                                    ))
                                            ) : (
                                                <p className="text-sm text-neutral-500 italic p-4 bg-neutral-950 rounded-xl border border-neutral-800">Belum ada laporan dari karyawan.</p>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Kolom Kanan: Meta Data & Action */}
                                <div className="space-y-6">
                                    <div className="space-y-4">
                                        <div>
                                            <h4 className="text-xs font-bold text-neutral-500 uppercase mb-1">Ditugaskan Kepada</h4>
                                            <div className="flex items-center gap-2 text-sm text-white font-medium">
                                                <User className="w-4 h-4 text-[#DB3B96]" /> {selectedTask.assignee?.full_name}
                                            </div>
                                        </div>
                                        <div>
                                            <h4 className="text-xs font-bold text-neutral-500 uppercase mb-1">Tenggat Waktu</h4>
                                            <div className="flex items-center gap-2 text-sm text-white font-medium">
                                                <Calendar className="w-4 h-4 text-[#DB3B96]" />
                                                {selectedTask.due_date ? new Date(selectedTask.due_date).toLocaleDateString("id-ID", { dateStyle: "long" }) : "-"}
                                            </div>
                                        </div>
                                    </div>

                                    {/* ACTION APPROVAL (Hanya Tampil Jika Status In Review) */}
                                    {selectedTask.status === "In Review" && (
                                        <div className="pt-6 border-t border-neutral-800 space-y-3">
                                            <h4 className="text-xs font-bold text-purple-400 uppercase tracking-wider mb-2 flex items-center gap-2">Review Pekerjaan</h4>
                                            <button
                                                onClick={() => handleApproval("Completed")}
                                                disabled={isProcessing}
                                                className="cursor-pointer w-full flex items-center justify-center gap-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 hover:bg-emerald-500 hover:text-white font-bold py-3 rounded-xl transition-all active:scale-95 disabled:opacity-50"
                                            >
                                                <CheckCircle2 className="w-5 h-5" /> Setujui (Completed)
                                            </button>
                                            <button
                                                onClick={() => handleApproval("In Progress")}
                                                disabled={isProcessing}
                                                className="cursor-pointer w-full flex items-center justify-center gap-2 bg-neutral-800 text-neutral-300 hover:bg-neutral-700 font-bold py-2.5 rounded-xl transition-all active:scale-95 disabled:opacity-50"
                                            >
                                                <XCircle className="w-4 h-4" /> Tolak / Minta Revisi
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* 2. POPUP FORM TAMBAH/EDIT TUGAS */}
            <AnimatePresence>
                {isFormModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={handleCloseFormModal} className="absolute inset-0 bg-black/70 backdrop-blur-sm cursor-pointer" />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="relative w-full max-w-lg bg-neutral-900 border border-neutral-800 rounded-2xl shadow-2xl overflow-hidden z-10"
                        >
                            <div className="flex items-center justify-between p-5 border-b border-neutral-800">
                                <h3 className="text-lg font-bold text-white">{modalMode === "add" ? "Delegasikan Tugas Baru" : "Edit Instruksi Tugas"}</h3>
                                <button onClick={handleCloseFormModal} className="cursor-pointer p-1 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 active:scale-90 transition-all">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            <form onSubmit={handleFormSubmit} className="p-5 space-y-4 max-h-[70vh] overflow-y-auto custom-scrollbar">
                                <div>
                                    <label className="block text-xs font-semibold text-neutral-300 tracking-wide mb-2">
                                        Judul Tugas <span className="text-[#DB3B96]">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="Contoh: Slicing Landing Page"
                                        value={formData.title}
                                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                        className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-2.5 text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-[#DB3B96] transition-colors"
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-semibold text-neutral-300 tracking-wide mb-2">
                                            Penerima Tugas <span className="text-[#DB3B96]">*</span>
                                        </label>
                                        <select
                                            required
                                            value={formData.assignee_id}
                                            onChange={(e) => setFormData({ ...formData, assignee_id: e.target.value })}
                                            className="cursor-pointer w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#DB3B96] transition-colors appearance-none"
                                        >
                                            <option value="" disabled>
                                                -- Pilih Karyawan --
                                            </option>
                                            {employees.map((emp) => (
                                                <option key={emp.user_id} value={emp.user_id}>
                                                    {emp.full_name}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-neutral-300 tracking-wide mb-2">Tenggat Waktu (Deadline)</label>
                                        <input
                                            type="datetime-local"
                                            value={formData.due_date}
                                            onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                                            className="cursor-pointer w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#DB3B96] transition-colors [color-scheme:dark]"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-semibold text-neutral-300 tracking-wide mb-2">Klien (Opsional)</label>
                                        <select
                                            value={formData.client_id}
                                            onChange={(e) => setFormData({ ...formData, client_id: e.target.value })}
                                            className="cursor-pointer w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#DB3B96] transition-colors appearance-none"
                                        >
                                            <option value="">-- Internal / Tanpa Klien --</option>
                                            {clients.map((cli) => (
                                                <option key={cli.client_id} value={cli.client_id}>
                                                    {cli.client_name}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-neutral-300 tracking-wide mb-2">
                                            Jenis Layanan <span className="text-[#DB3B96]">*</span>
                                        </label>
                                        <select
                                            required
                                            value={formData.service_id}
                                            onChange={(e) => setFormData({ ...formData, service_id: e.target.value })}
                                            className="cursor-pointer w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#DB3B96] transition-colors appearance-none"
                                        >
                                            <option value="" disabled>
                                                -- Pilih Kategori --
                                            </option>
                                            {services.map((srv) => (
                                                <option key={srv.service_id} value={srv.service_id}>
                                                    {srv.service_name}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold text-neutral-300 tracking-wide mb-2">Instruksi Detail</label>
                                    <textarea
                                        rows="3"
                                        placeholder="Jelaskan detail pengerjaan..."
                                        value={formData.description}
                                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                        className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-2.5 text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-[#DB3B96] transition-colors resize-none"
                                    />
                                </div>

                                <div className="flex items-center justify-end gap-3 pt-4 border-t border-neutral-800">
                                    <button
                                        type="button"
                                        onClick={handleCloseFormModal}
                                        disabled={isProcessing}
                                        className="cursor-pointer px-4 py-2.5 rounded-xl text-sm font-medium text-neutral-400 hover:text-white hover:bg-neutral-800 active:scale-95 transition-all"
                                    >
                                        Batal
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={isProcessing}
                                        className="cursor-pointer flex items-center gap-2 bg-linear-to-r from-[#DB3B96] to-[#8B5EA8] hover:opacity-90 active:scale-95 text-white font-medium px-5 py-2.5 rounded-xl text-sm transition-all shadow-lg shadow-[#DB3B96]/20 disabled:opacity-50"
                                    >
                                        {isProcessing ? (
                                            "Menyimpan..."
                                        ) : (
                                            <>
                                                <Check className="w-4 h-4" /> {modalMode === "add" ? "Kirim Tugas" : "Perbarui"}
                                            </>
                                        )}
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* 3. POPUP MODAL HAPUS */}
            <AnimatePresence>
                {isDeleteModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsDeleteModalOpen(false)} className="absolute inset-0 bg-black/70 backdrop-blur-sm cursor-pointer" />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 10 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 10 }}
                            className="relative w-full max-w-sm bg-neutral-900 border border-neutral-800 rounded-2xl shadow-2xl overflow-hidden z-10 text-center p-6"
                        >
                            <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-4">
                                <AlertTriangle className="w-6 h-6 text-red-500" />
                            </div>
                            <h3 className="text-lg font-bold text-white mb-2">Hapus Tugas Ini?</h3>
                            <p className="text-sm text-neutral-400 mb-6">
                                Yakin ingin menghapus <strong className="text-white">{selectedTask?.title}</strong>? Riwayat log pekerjaannya akan ikut terhapus.
                            </p>

                            <div className="flex items-center gap-3">
                                <button
                                    onClick={() => setIsDeleteModalOpen(false)}
                                    disabled={isProcessing}
                                    className="cursor-pointer flex-1 px-4 py-2.5 rounded-xl text-sm font-medium text-neutral-300 bg-neutral-800 hover:bg-neutral-700 active:scale-95 transition-all"
                                >
                                    Batal
                                </button>
                                <button
                                    onClick={confirmDelete}
                                    disabled={isProcessing}
                                    className="cursor-pointer flex-1 px-4 py-2.5 rounded-xl text-sm font-medium text-white bg-red-600 hover:bg-red-500 active:scale-95 transition-all disabled:opacity-50"
                                >
                                    {isProcessing ? "Menghapus..." : "Ya, Hapus"}
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}
