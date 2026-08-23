import { useCallback, useEffect, useState } from "react";
import { supabase } from "../supabaseClient";
import { CheckSquare, X, Send, Calendar, User, Briefcase, Building2, Link as LinkIcon, MessageSquare, FileUp } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import MavaLoader from "../components/MavaLoader";

export default function TaskKaryawan() {
    const [tasks, setTasks] = useState([]);
    const [loading, setLoading] = useState(true);

    // SIMULASI LOGIN KARYAWAN (Misal ID 2 adalah Adit - Web Dev)
    // TODO: saat auth Supabase sudah aktif, ganti ini dengan ID user yang benar-benar login
    // (misal dari supabase.auth.getUser() lalu di-mapping ke tabel users).
    const DUMMY_EMPLOYEE_ID = 2;

    // State Modal Detail & Update
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedTask, setSelectedTask] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // State Form Update Progress
    const [formData, setFormData] = useState({
        status: "",
        notes: "",
        attachment_url: "",
    });

    // State untuk file fisik. fileInputKey dipakai untuk "memaksa" reset tampilan
    // nama file di elemen <input type="file"> setelah submit/tutup modal.
    const [selectedFile, setSelectedFile] = useState(null);
    const [fileInputKey, setFileInputKey] = useState(0);

    // 1. FETCH DATA TUGAS KHUSUS KARYAWAN INI
    // Dibungkus useCallback (bukan didefinisikan di dalam useEffect) supaya bisa
    // dipanggil ulang dari mana saja (misal setelah submit update progress),
    // tapi tetap tidak memicu cascading render karena setState hanya terjadi
    // di dalam callback async, bukan langsung di body effect.
    const fetchMyTasks = useCallback(async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from("tasks")
                .select(
                    `
          *,
          assigner:users!tasks_assigner_id_fkey(full_name),
          service:services(service_name),
          client:clients(client_name)
        `,
                )
                .eq("assignee_id", DUMMY_EMPLOYEE_ID) // HANYA AMBIL TUGAS MILIKNYA SENDIRI
                .order("created_at", { ascending: false });

            if (!error) setTasks(data || []);
        } catch (err) {
            console.error("Error fetching my tasks:", err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchMyTasks();
    }, [fetchMyTasks]);

    // 2. HANDLERS MODAL
    const handleOpenModal = (task) => {
        setSelectedTask(task);
        setFormData({
            status: task.status,
            notes: "", // Dikosongkan agar karyawan bisa mengetik log baru
            attachment_url: "",
        });
        setSelectedFile(null);
        setFileInputKey((k) => k + 1);
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        if (!isSubmitting) {
            setIsModalOpen(false);
            setSelectedTask(null);
            setSelectedFile(null);
            setFileInputKey((k) => k + 1); // reset input file supaya tidak "nyangkut" ke task lain
        }
    };

    // 3. SUBMIT UPDATE PROGRESS & UPLOAD FILE
    const handleSubmitUpdate = async (e) => {
        e.preventDefault();
        if (!formData.status) return;

        // Validasi Ukuran File (Maksimal 5MB)
        if (selectedFile && selectedFile.size > 5 * 1024 * 1024) {
            alert("Gagal: Ukuran file melebihi 5MB!");
            return;
        }

        setIsSubmitting(true);

        // Path (bukan URL publik) disimpan terpisah supaya bisa dipakai untuk
        // menghapus file dari storage kalau langkah setelahnya gagal.
        let uploadedFilePath = null;
        let finalFileUrl = null;
        const previousStatus = selectedTask.status;

        try {
            // 1. UPLOAD FILE FISIK (jika ada) - dilakukan pertama karena tidak butuh rollback DB
            if (selectedFile) {
                const fileExt = selectedFile.name.split(".").pop();
                const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
                uploadedFilePath = `bukti_kerja/${fileName}`;

                const { error: uploadError } = await supabase.storage.from("task_attachments").upload(uploadedFilePath, selectedFile);
                if (uploadError) throw uploadError;

                const { data: publicUrlData } = supabase.storage.from("task_attachments").getPublicUrl(uploadedFilePath);
                finalFileUrl = publicUrlData.publicUrl;
            }

            // 2. UPDATE STATUS TASK
            const { error: taskError } = await supabase.from("tasks").update({ status: formData.status }).eq("task_id", selectedTask.task_id);
            if (taskError) throw taskError;

            // 3. INSERT LOG (riwayat + bukti kerja)
            const { error: logError } = await supabase.from("task_logs").insert([
                {
                    task_id: selectedTask.task_id,
                    user_id: DUMMY_EMPLOYEE_ID,
                    status_changed: formData.status,
                    notes: formData.notes.trim() || null,
                    attachment_url: formData.attachment_url.trim() || null,
                    attachment_file: finalFileUrl,
                },
            ]);

            if (logError) {
                // ROLLBACK: kembalikan status task seperti semula karena log gagal tersimpan.
                // Catatan: idealnya ini pakai satu Supabase RPC/transaction supaya benar-benar
                // atomic, tapi untuk skala proyek ini, rollback manual ini cukup aman.
                await supabase.from("tasks").update({ status: previousStatus }).eq("task_id", selectedTask.task_id);
                throw logError;
            }

            setSelectedFile(null);
            setFileInputKey((k) => k + 1);
            await fetchMyTasks();
            setIsModalOpen(false);
        } catch (error) {
            // Bersihkan file yang sudah terlanjur ke-upload kalau langkah selanjutnya gagal,
            // supaya tidak jadi file "sampah" yang tidak pernah tereferensi di database.
            if (uploadedFilePath) {
                await supabase.storage.from("task_attachments").remove([uploadedFilePath]);
            }
            alert("Gagal mengupdate progress: " + error.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    // Helper Warna Status
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
                return "bg-neutral-800 text-neutral-400 border-neutral-700"; // To Do
        }
    };

    const isOverdue = (task) => task.due_date && new Date(task.due_date) < new Date() && task.status !== "Completed";

    return (
        <div className="p-8 space-y-6 min-h-screen relative">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-white">Ruang Kerja Saya</h2>
                    <p className="text-sm text-neutral-400">Daftar tugas yang diinstruksikan kepada Anda</p>
                </div>
            </div>

            {loading ? (
                <MavaLoader text="Menyiapkan ruang kerja..." />
            ) : tasks.length === 0 ? (
                <div className="p-12 text-center bg-neutral-900/50 border border-neutral-800 rounded-2xl">
                    <CheckSquare className="w-12 h-12 text-neutral-600 mx-auto mb-3" />
                    <h3 className="text-lg font-semibold text-white">Hore! Belum Ada Tugas</h3>
                    <p className="text-neutral-400 text-sm mt-1">Anda sudah menyelesaikan semua pekerjaan saat ini.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {tasks.map((task) => (
                        <div
                            key={task.task_id}
                            onClick={() => handleOpenModal(task)}
                            className="cursor-pointer p-5 bg-neutral-900 border border-neutral-800 rounded-xl flex flex-col justify-between space-y-4 hover:border-[#DB3B96]/50 hover:shadow-lg hover:shadow-[#DB3B96]/5 transition-all active:scale-[0.98] group"
                        >
                            <div className="space-y-3">
                                <div className="flex items-start justify-between">
                                    <span className={`text-[11px] font-bold px-2.5 py-1 rounded-md border ${getStatusColor(task.status)} uppercase tracking-wider`}>{task.status}</span>
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold text-white leading-snug group-hover:text-[#DB3B96] transition-colors line-clamp-2">{task.title}</h3>
                                    {task.client?.client_name && (
                                        <p className="text-xs text-neutral-500 mt-1.5 font-medium flex items-center gap-1.5">
                                            <Building2 className="w-3.5 h-3.5" /> {task.client.client_name}
                                        </p>
                                    )}
                                </div>
                            </div>

                            <div className="space-y-2 pt-3 border-t border-neutral-800/50">
                                <div className="flex items-center gap-2 text-xs text-neutral-400">
                                    <Briefcase className="w-3.5 h-3.5 text-neutral-500" />
                                    <span className="truncate">{task.service?.service_name || "-"}</span>
                                </div>
                                <div className="flex items-center justify-between text-xs text-neutral-400">
                                    <div className="flex items-center gap-2">
                                        <User className="w-3.5 h-3.5 text-neutral-500" />
                                        <span>
                                            Dari: <strong className="text-neutral-300">{task.assigner?.full_name || "Atasan"}</strong>
                                        </span>
                                    </div>
                                    {task.due_date && (
                                        <div className={`flex items-center gap-1 font-semibold ${isOverdue(task) ? "text-red-400" : "text-neutral-500"}`}>
                                            <Calendar className="w-3.5 h-3.5" />
                                            {new Date(task.due_date).toLocaleDateString("id-ID", { day: "numeric", month: "short" })}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* POPUP BESAR: DETAIL TUGAS & FORM UPDATE */}
            <AnimatePresence>
                {isModalOpen && selectedTask && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={handleCloseModal} className="absolute inset-0 bg-black/80 backdrop-blur-sm cursor-pointer" />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 10 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 10 }}
                            className="relative w-full max-w-4xl bg-neutral-900 border border-neutral-800 rounded-2xl shadow-2xl overflow-hidden z-10 flex flex-col max-h-[90vh]"
                        >
                            {/* Header Modal */}
                            <div className="flex items-start justify-between p-6 border-b border-neutral-800 bg-neutral-950/50 shrink-0">
                                <div>
                                    <div className="flex items-center gap-3 mb-2">
                                        <span className={`text-[11px] font-bold px-2.5 py-1 rounded-md border ${getStatusColor(selectedTask.status)} uppercase tracking-wider`}>{selectedTask.status}</span>
                                        {selectedTask.client?.client_name && (
                                            <span className="text-xs text-[#DB3B96] font-semibold flex items-center gap-1">
                                                <Building2 className="w-3.5 h-3.5" /> {selectedTask.client.client_name}
                                            </span>
                                        )}
                                    </div>
                                    <h2 className="text-2xl font-bold text-white">{selectedTask.title}</h2>
                                </div>
                                <button onClick={handleCloseModal} className="cursor-pointer p-2 rounded-xl text-neutral-400 hover:text-white hover:bg-neutral-800 active:scale-90 transition-all bg-neutral-900">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            {/* Layout 2 Kolom */}
                            <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 md:grid-cols-5 gap-8 custom-scrollbar">
                                {/* KOLOM KIRI: Detail Instruksi */}
                                <div className="md:col-span-3 space-y-6">
                                    <div>
                                        <h4 className="text-xs font-bold text-neutral-500 uppercase tracking-wider mb-2">Instruksi Atasan</h4>
                                        <div className="p-4 bg-neutral-950 border border-neutral-800 rounded-xl">
                                            <p className="text-sm text-neutral-300 leading-relaxed whitespace-pre-wrap">{selectedTask.description || "Tidak ada deskripsi detail."}</p>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="p-4 bg-neutral-950 border border-neutral-800 rounded-xl">
                                            <h4 className="text-xs font-bold text-neutral-500 uppercase mb-1">Diberikan Oleh</h4>
                                            <p className="text-sm text-white font-medium">{selectedTask.assigner?.full_name}</p>
                                        </div>
                                        <div className="p-4 bg-neutral-950 border border-neutral-800 rounded-xl">
                                            <h4 className="text-xs font-bold text-neutral-500 uppercase mb-1">Tenggat Waktu</h4>
                                            {/* FIX: guard due_date null supaya tidak selalu dianggap "lewat" (1 Jan 1970) */}
                                            <p className={`text-sm font-medium ${isOverdue(selectedTask) ? "text-red-400" : "text-white"}`}>
                                                {selectedTask.due_date ? new Date(selectedTask.due_date).toLocaleDateString("id-ID", { dateStyle: "long" }) : "-"}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                {/* KOLOM KANAN: Form Update Progress */}
                                <div className="md:col-span-2">
                                    <form onSubmit={handleSubmitUpdate} className="bg-neutral-950 border border-neutral-800 rounded-xl p-5 space-y-5 sticky top-0">
                                        <h4 className="text-sm font-bold text-white flex items-center gap-2 border-b border-neutral-800 pb-3">
                                            <Send className="w-4 h-4 text-[#DB3B96]" /> Update Progress
                                        </h4>

                                        {/* Status Terbatas */}
                                        <div>
                                            <label className="block text-xs font-semibold text-neutral-400 mb-2">Ubah Status</label>
                                            <select
                                                required
                                                value={formData.status}
                                                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                                                className="cursor-pointer w-full bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[#DB3B96] transition-colors"
                                                disabled={selectedTask.status === "Completed"}
                                            >
                                                <option value="To Do">To Do</option>
                                                <option value="In Progress">In Progress</option>
                                                <option value="Pending">Pending (Tertahan)</option>
                                                <option value="In Review">In Review (Selesai & Minta Cek)</option>
                                                {/* Karyawan tidak boleh memilih Completed */}
                                            </select>
                                        </div>

                                        <div>
                                            <label className="block text-xs font-semibold text-neutral-400 mb-2 flex items-center gap-1.5">
                                                <LinkIcon className="w-3.5 h-3.5" /> Supporting Data (Link)
                                            </label>
                                            <input
                                                type="url"
                                                placeholder="Link GDrive / Figma / Preview"
                                                value={formData.attachment_url}
                                                onChange={(e) => setFormData({ ...formData, attachment_url: e.target.value })}
                                                className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-2.5 text-sm text-white placeholder-neutral-600 focus:outline-none focus:border-[#DB3B96] transition-colors"
                                                disabled={selectedTask.status === "Completed"}
                                            />
                                        </div>

                                        {/* Upload File / Foto */}
                                        <div>
                                            <label className="block text-xs font-semibold text-neutral-400 mb-2 flex items-center gap-1.5">
                                                <FileUp className="w-3.5 h-3.5" /> Upload File / Foto (Opsional)
                                            </label>
                                            <input
                                                key={fileInputKey}
                                                type="file"
                                                accept="image/png, image/jpeg, image/jpg, application/pdf, .doc, .docx"
                                                onChange={(e) => setSelectedFile(e.target.files[0])}
                                                className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-2 text-sm text-neutral-400 focus:outline-none focus:border-[#DB3B96] transition-colors file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-neutral-800 file:text-white hover:file:bg-neutral-700 cursor-pointer"
                                                disabled={selectedTask.status === "Completed"}
                                            />
                                            <p className="text-[10px] text-neutral-500 mt-1.5">Format: JPG, PNG, PDF, DOC (Maks. 5MB)</p>
                                        </div>

                                        <div>
                                            <label className="block text-xs font-semibold text-neutral-400 mb-2 flex items-center gap-1.5">
                                                <MessageSquare className="w-3.5 h-3.5" /> Catatan Pengerjaan
                                            </label>
                                            <textarea
                                                rows="3"
                                                placeholder="Contoh: Slicing selesai, mohon direview..."
                                                value={formData.notes}
                                                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                                                className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-2.5 text-sm text-white placeholder-neutral-600 focus:outline-none focus:border-[#DB3B96] transition-colors resize-none"
                                                disabled={selectedTask.status === "Completed"}
                                            />
                                        </div>

                                        <button
                                            type="submit"
                                            disabled={isSubmitting || selectedTask.status === "Completed"}
                                            className="cursor-pointer w-full flex items-center justify-center gap-2 bg-linear-to-r from-[#DB3B96] to-[#8B5EA8] hover:opacity-90 active:scale-95 text-white font-medium py-2.5 rounded-lg text-sm transition-all shadow-lg shadow-[#DB3B96]/20 disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            {isSubmitting ? "Menyimpan..." : "Kirim Laporan Progress"}
                                        </button>

                                        {selectedTask.status === "Completed" && <p className="text-xs text-emerald-400 text-center font-medium">Tugas ini telah disetujui dan selesai.</p>}
                                    </form>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}