import { useEffect, useState, useRef } from "react";
import { supabase } from "../supabaseClient";
import { CircleUser, Plus, MoreVertical, Pencil, Trash2, X, Check, AlertTriangle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import MavaLoader from "../components/MavaLoader";

export default function KelolaRole({ embedded = false }) {
    const [roles, setRoles] = useState([]);
    const [loading, setLoading] = useState(true);

    // State Dropdown
    const [activeDropdown, setActiveDropdown] = useState(null);
    const dropdownRef = useRef(null);

    // State Modal Tambah/Edit
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalMode, setModalMode] = useState("add");
    const [selectedId, setSelectedId] = useState(null);
    const [formData, setFormData] = useState({
        role_name: "",
        description: "",
    });
    const [submitting, setSubmitting] = useState(false);

    // State Modal Hapus (Standar MAVA)
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [roleToDelete, setRoleToDelete] = useState(null);
    const [isDeleting, setIsDeleting] = useState(false);

    // 1. FETCH DATA (Aman dari Race Condition)
    useEffect(() => {
        let ignore = false;

        async function fetchRoles() {
            setLoading(true);
            const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

            try {
                const [{ data, error }] = await Promise.all([supabase.from("roles").select("*").order("role_id", { ascending: true }), delay(600)]);

                if (!ignore) {
                    if (!error) {
                        setRoles(data || []);
                    }
                }
            } catch (err) {
                console.error("Error fetching roles:", err);
            } finally {
                if (!ignore) {
                    setLoading(false);
                }
            }
        }

        fetchRoles();

        return () => {
            ignore = true;
        };
    }, []);

    // Click Outside Listener
    useEffect(() => {
        function handleClickOutside(event) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setActiveDropdown(null);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // 2. MODAL FORM HANDLERS
    const handleOpenAddModal = () => {
        setModalMode("add");
        setSelectedId(null);
        setFormData({ role_name: "", description: "" });
        setIsModalOpen(true);
        setActiveDropdown(null);
    };

    const handleOpenEditModal = (item) => {
        setModalMode("edit");
        setSelectedId(item.role_id);
        setFormData({
            role_name: item.role_name,
            description: item.description || "",
        });
        setIsModalOpen(true);
        setActiveDropdown(null);
    };

    const handleCloseModal = () => {
        if (!submitting) {
            setIsModalOpen(false);
            setFormData({ role_name: "", description: "" });
        }
    };

    // 3. SUBMIT HANDLER (Tambah/Edit)
    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.role_name.trim()) return;

        setSubmitting(true);

        if (modalMode === "add") {
            const { data, error } = await supabase
                .from("roles")
                .insert([
                    {
                        role_name: formData.role_name.trim(),
                        description: formData.description.trim(),
                    },
                ])
                .select();

            if (!error && data) {
                setRoles((prev) => [...prev, ...data]);
            } else {
                alert("Gagal menambah posisi: " + error?.message);
            }
        } else {
            const { error } = await supabase
                .from("roles")
                .update({
                    role_name: formData.role_name.trim(),
                    description: formData.description.trim(),
                })
                .eq("role_id", selectedId);

            if (!error) {
                setRoles((prev) => prev.map((item) => (item.role_id === selectedId ? { ...item, role_name: formData.role_name.trim(), description: formData.description.trim() } : item)));
            } else {
                alert("Gagal memperbarui posisi: " + error?.message);
            }
        }

        setSubmitting(false);
        setIsModalOpen(false);
    };

    // 4. DELETE MODAL HANDLERS
    const handleOpenDeleteModal = (item) => {
        setRoleToDelete(item);
        setIsDeleteModalOpen(true);
        setActiveDropdown(null);
    };

    const handleCloseDeleteModal = () => {
        if (!isDeleting) {
            setIsDeleteModalOpen(false);
            setRoleToDelete(null);
        }
    };

    const confirmDelete = async () => {
        if (!roleToDelete) return;
        setIsDeleting(true);

        const { error } = await supabase.from("roles").delete().eq("role_id", roleToDelete.role_id);

        if (!error) {
            setRoles((prev) => prev.filter((item) => item.role_id !== roleToDelete.role_id));
            setIsDeleteModalOpen(false);
            setRoleToDelete(null);
        } else {
            alert("Gagal menghapus posisi. Pastikan tidak ada karyawan yang sedang menjabat di posisi ini.\nDetail: " + error.message);
        }

        setIsDeleting(false);
    };

    return (
        <div className={embedded ? "space-y-6 relative" : "p-8 space-y-6 min-h-screen relative"}>
            {/* Header Halaman */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-white">Kelola Posisi (Roles)</h2>
                    <p className="text-sm text-neutral-400">Master data peran dan jabatan karyawan agensi</p>
                </div>
                <button
                    onClick={handleOpenAddModal}
                    className="cursor-pointer flex items-center gap-2 bg-linear-to-r from-[#DB3B96] to-[#8B5EA8] hover:opacity-90 hover:scale-105 active:scale-95 text-white font-medium px-4 py-2.5 rounded-xl text-sm transition-all shadow-lg shadow-[#DB3B96]/20"
                >
                    <Plus className="w-4 h-4" />
                    Tambah Posisi
                </button>
            </div>

            {/* Grid Card / Loading */}
            {loading ? (
                <MavaLoader text="Sinkronisasi data posisi..." />
            ) : roles.length === 0 ? (
                <div className="p-12 text-center bg-neutral-900/50 border border-neutral-800 rounded-2xl">
                    <CircleUser className="w-12 h-12 text-neutral-600 mx-auto mb-3" />
                    <h3 className="text-lg font-semibold text-white">Belum Ada Posisi</h3>
                    <p className="text-neutral-400 text-sm mt-1">Klik tombol "Tambah Posisi" untuk mendaftarkan peran baru.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" ref={dropdownRef}>
                    {roles.map((item) => {
                        const isDropdownOpen = activeDropdown === item.role_id;

                        return (
                            <div key={item.role_id} className="p-5 bg-neutral-900 border border-neutral-800 rounded-xl flex flex-col justify-between space-y-4 hover:border-neutral-700 hover:shadow-lg transition-all relative group">
                                <div className="space-y-3">
                                    {/* Top Bar Card */}
                                    <div className="flex items-center justify-between">
                                        <div className="w-10 h-10 rounded-lg bg-neutral-800 border border-neutral-700 flex items-center justify-center text-[#DB3B96]">
                                            <CircleUser className="w-5 h-5" />
                                        </div>

                                        {/* Tombol Titik Tiga */}
                                        <div className="relative">
                                            <button
                                                onClick={() => setActiveDropdown(isDropdownOpen ? null : item.role_id)}
                                                className="cursor-pointer p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 active:scale-90 transition-all"
                                            >
                                                <MoreVertical className="w-5 h-5" />
                                            </button>

                                            {/* Dropdown Menu Popup */}
                                            <AnimatePresence>
                                                {isDropdownOpen && (
                                                    <motion.div
                                                        initial={{ opacity: 0, scale: 0.95, y: -5 }}
                                                        animate={{ opacity: 1, scale: 1, y: 0 }}
                                                        exit={{ opacity: 0, scale: 0.95, y: -5 }}
                                                        transition={{ duration: 0.15 }}
                                                        className="absolute right-0 mt-1 w-36 bg-neutral-950 border border-neutral-800 rounded-xl shadow-xl z-20 overflow-hidden py-1"
                                                    >
                                                        <button
                                                            onClick={() => handleOpenEditModal(item)}
                                                            // PERATURAN 2: Warna ikon mengikuti warna text-neutral-300
                                                            className="cursor-pointer w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-neutral-300 hover:text-white hover:bg-neutral-800 transition-colors"
                                                        >
                                                            <Pencil className="w-3.5 h-3.5" />
                                                            Edit Posisi
                                                        </button>
                                                        <button
                                                            onClick={() => handleOpenDeleteModal(item)}
                                                            className="cursor-pointer w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-colors"
                                                        >
                                                            <Trash2 className="w-3.5 h-3.5" />
                                                            Hapus
                                                        </button>
                                                    </motion.div>
                                                )}
                                            </AnimatePresence>
                                        </div>
                                    </div>

                                    {/* Info Peran */}
                                    <div>
                                        <h3 className="text-lg font-semibold text-white">{item.role_name}</h3>
                                        <p className="text-sm text-neutral-400 leading-relaxed mt-1 line-clamp-3">{item.description || "Tidak ada deskripsi."}</p>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* POPUP MODAL TAMBAH / EDIT */}
            <AnimatePresence>
                {isModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={handleCloseModal} className="absolute inset-0 bg-black/70 backdrop-blur-sm cursor-pointer" />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 10 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 10 }}
                            className="relative w-full max-w-md bg-neutral-900 border border-neutral-800 rounded-2xl shadow-2xl overflow-hidden z-10"
                        >
                            <div className="flex items-center justify-between p-5 border-b border-neutral-800">
                                <h3 className="text-lg font-bold text-white">{modalMode === "add" ? "Tambah Posisi Baru" : "Edit Data Posisi"}</h3>
                                <button onClick={handleCloseModal} className="cursor-pointer p-1 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 active:scale-90 transition-all">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            <form onSubmit={handleSubmit} className="p-5 space-y-4">
                                <div>
                                    <label className="block text-xs font-semibold text-neutral-300 tracking-wide mb-2">
                                        Nama Posisi (Role) <span className="text-[#DB3B96]">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="Contoh: Copywriter"
                                        value={formData.role_name}
                                        onChange={(e) => setFormData({ ...formData, role_name: e.target.value })}
                                        className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-2.5 text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-[#DB3B96] transition-colors"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold text-neutral-300 tracking-wide mb-2">Deskripsi Pekerjaan</label>
                                    <textarea
                                        rows="3"
                                        placeholder="Rincian cakupan tugas untuk posisi ini..."
                                        value={formData.description}
                                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                        className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-2.5 text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-[#DB3B96] transition-colors resize-none"
                                    />
                                </div>

                                <div className="flex items-center justify-end gap-3 pt-4 border-t border-neutral-800">
                                    <button
                                        type="button"
                                        onClick={handleCloseModal}
                                        disabled={submitting}
                                        className="cursor-pointer px-4 py-2.5 rounded-xl text-sm font-medium text-neutral-400 hover:text-white hover:bg-neutral-800 active:scale-95 transition-all"
                                    >
                                        Batal
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={submitting}
                                        className="cursor-pointer flex items-center gap-2 bg-linear-to-r from-[#DB3B96] to-[#8B5EA8] hover:opacity-90 active:scale-95 text-white font-medium px-5 py-2.5 rounded-xl text-sm transition-all shadow-lg shadow-[#DB3B96]/20 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {submitting ? (
                                            "Menyimpan..."
                                        ) : (
                                            <>
                                                <Check className="w-4 h-4" /> {modalMode === "add" ? "Simpan Posisi" : "Perbarui"}
                                            </>
                                        )}
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* POPUP MODAL KONFIRMASI HAPUS (Standar MAVA) */}
            <AnimatePresence>
                {isDeleteModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={handleCloseDeleteModal} className="absolute inset-0 bg-black/70 backdrop-blur-sm cursor-pointer" />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 10 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 10 }}
                            className="relative w-full max-w-sm bg-neutral-900 border border-neutral-800 rounded-2xl shadow-2xl overflow-hidden z-10 text-center p-6"
                        >
                            <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-4">
                                <AlertTriangle className="w-6 h-6 text-red-500" />
                            </div>
                            <h3 className="text-lg font-bold text-white mb-2">Hapus Posisi Ini?</h3>
                            <p className="text-sm text-neutral-400 mb-6">
                                Apakah Anda yakin ingin menghapus peran <strong className="text-white">{roleToDelete?.role_name}</strong>? Tindakan ini tidak dapat dibatalkan.
                            </p>

                            <div className="flex items-center gap-3">
                                <button
                                    onClick={handleCloseDeleteModal}
                                    disabled={isDeleting}
                                    className="cursor-pointer flex-1 px-4 py-2.5 rounded-xl text-sm font-medium text-neutral-300 bg-neutral-800 hover:bg-neutral-700 active:scale-95 transition-all"
                                >
                                    Batal
                                </button>
                                <button
                                    onClick={confirmDelete}
                                    disabled={isDeleting}
                                    className="cursor-pointer flex-1 px-4 py-2.5 rounded-xl text-sm font-medium text-white bg-red-600 hover:bg-red-500 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {isDeleting ? "Menghapus..." : "Ya, Hapus"}
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}
