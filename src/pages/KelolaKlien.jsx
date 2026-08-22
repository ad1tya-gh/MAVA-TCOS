import { useEffect, useState, useRef } from "react";
import { supabase } from "../supabaseClient";
import { Building2, Plus, MoreVertical, Pencil, Trash2, X, Check, Phone, BriefcaseBusiness, AlertTriangle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import MavaLoader from "../components/MavaLoader";

export default function KelolaKlien() {
    const [clients, setClients] = useState([]);
    const [loading, setLoading] = useState(true);

    // State Dropdown
    const [activeDropdown, setActiveDropdown] = useState(null);
    const dropdownRef = useRef(null);

    // State Modal Form (Tambah/Edit)
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalMode, setModalMode] = useState("add");
    const [selectedId, setSelectedId] = useState(null);
    const [formData, setFormData] = useState({
        client_name: "",
        company_name: "",
        contact_phone: "",
        is_active: true,
    });
    const [submitting, setSubmitting] = useState(false);

    // State Modal Konfirmasi Hapus
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [clientToDelete, setClientToDelete] = useState(null);
    const [isDeleting, setIsDeleting] = useState(false);

    // 1. FETCH DATA (Aman dari Race Condition)
    useEffect(() => {
        let ignore = false;

        async function fetchClients() {
            setLoading(true);
            const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

            try {
                const [{ data, error }] = await Promise.all([supabase.from("clients").select("*").order("client_id", { ascending: false }), delay(600)]);

                if (!ignore) {
                    if (!error) {
                        setClients(data || []);
                    }
                }
            } catch (err) {
                console.error("Error fetching clients:", err);
            } finally {
                if (!ignore) {
                    setLoading(false);
                }
            }
        }

        fetchClients();

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

    // 2. MODAL FORM HANDLERS
    const handleOpenAddModal = () => {
        setModalMode("add");
        setSelectedId(null);
        setFormData({ client_name: "", company_name: "", contact_phone: "", is_active: true });
        setIsModalOpen(true);
        setActiveDropdown(null);
    };

    const handleOpenEditModal = (item) => {
        setModalMode("edit");
        setSelectedId(item.client_id);
        setFormData({
            client_name: item.client_name,
            company_name: item.company_name || "",
            contact_phone: item.contact_phone || "",
            is_active: item.is_active,
        });
        setIsModalOpen(true);
        setActiveDropdown(null);
    };

    const handleCloseModal = () => {
        if (!submitting) {
            setIsModalOpen(false);
            setFormData({ client_name: "", company_name: "", contact_phone: "", is_active: true });
        }
    };

    // 3. SUBMIT FORM HANDLER (Tambah/Edit)
    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.client_name.trim()) return;

        setSubmitting(true);

        if (modalMode === "add") {
            const { data, error } = await supabase
                .from("clients")
                .insert([
                    {
                        client_name: formData.client_name.trim(),
                        company_name: formData.company_name.trim(),
                        contact_phone: formData.contact_phone.trim(),
                        is_active: formData.is_active,
                    },
                ])
                .select();

            if (!error && data) {
                setClients((prev) => [data[0], ...prev]);
            } else {
                alert("Gagal menambah klien: " + error?.message);
            }
        } else {
            const { error } = await supabase
                .from("clients")
                .update({
                    client_name: formData.client_name.trim(),
                    company_name: formData.company_name.trim(),
                    contact_phone: formData.contact_phone.trim(),
                    is_active: formData.is_active,
                })
                .eq("client_id", selectedId);

            if (!error) {
                setClients((prev) => prev.map((item) => (item.client_id === selectedId ? { ...item, ...formData } : item)));
            } else {
                alert("Gagal memperbarui klien: " + error?.message);
            }
        }

        setSubmitting(false);
        setIsModalOpen(false);
    };

    // 4. DELETE MODAL HANDLERS
    const handleOpenDeleteModal = (item) => {
        setClientToDelete(item);
        setIsDeleteModalOpen(true);
        setActiveDropdown(null);
    };

    const handleCloseDeleteModal = () => {
        if (!isDeleting) {
            setIsDeleteModalOpen(false);
            setClientToDelete(null);
        }
    };

    const confirmDelete = async () => {
        if (!clientToDelete) return;
        setIsDeleting(true);

        const { error } = await supabase.from("clients").delete().eq("client_id", clientToDelete.client_id);

        if (!error) {
            setClients((prev) => prev.filter((item) => item.client_id !== clientToDelete.client_id));
            setIsDeleteModalOpen(false);
            setClientToDelete(null);
        } else {
            alert("Gagal menghapus klien. Pastikan tidak ada task yang terhubung dengan klien ini.\nDetail: " + error.message);
        }

        setIsDeleting(false);
    };

    return (
        <div className="p-8 space-y-6 min-h-screen relative">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-white">Kelola Klien</h2>
                    <p className="text-sm text-neutral-400">Manajemen direktori perusahaan dan profil klien MAVA</p>
                </div>
                <button
                    onClick={handleOpenAddModal}
                    className="cursor-pointer flex items-center gap-2 bg-linear-to-r from-[#DB3B96] to-[#8B5EA8] hover:opacity-90 hover:scale-105 active:scale-95 text-white font-medium px-4 py-2.5 rounded-xl text-sm transition-all shadow-lg shadow-[#DB3B96]/20"
                >
                    <Plus className="w-4 h-4" />
                    Tambah Klien
                </button>
            </div>

            {/* Konten Loading / Grid */}
            {loading ? (
                <MavaLoader text="Mengambil data klien..." />
            ) : clients.length === 0 ? (
                <div className="p-12 text-center bg-neutral-900/50 border border-neutral-800 rounded-2xl">
                    <Building2 className="w-12 h-12 text-neutral-600 mx-auto mb-3" />
                    <h3 className="text-lg font-semibold text-white">Belum Ada Klien</h3>
                    <p className="text-neutral-400 text-sm mt-1">Klik tombol "Tambah Klien" untuk mendaftarkan klien baru.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" ref={dropdownRef}>
                    {clients.map((item) => {
                        const isDropdownOpen = activeDropdown === item.client_id;

                        return (
                            <div key={item.client_id} className="p-5 bg-neutral-900 border border-neutral-800 rounded-xl flex flex-col justify-between space-y-4 hover:border-neutral-700 hover:shadow-lg transition-all relative group">
                                {/* Header Card */}
                                <div className="flex items-start justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-linear-to-br from-neutral-700 to-neutral-900 border border-neutral-600 flex items-center justify-center text-white font-bold text-sm uppercase shadow-inner">
                                            {item.client_name.substring(0, 2)}
                                        </div>
                                        <div>
                                            <h3 className="text-base font-bold text-white truncate max-w-[150px]">{item.client_name}</h3>
                                            <span
                                                className={`text-[11px] font-medium px-2 py-0.5 rounded-md mt-1 inline-block ${item.is_active ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-neutral-800 text-neutral-400 border border-neutral-700"}`}
                                            >
                                                {item.is_active ? "Aktif" : "Nonaktif"}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Tombol Titik Tiga */}
                                    <div className="relative">
                                        <button
                                            onClick={() => setActiveDropdown(isDropdownOpen ? null : item.client_id)}
                                            className="cursor-pointer p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 active:scale-90 transition-all"
                                        >
                                            <MoreVertical className="w-5 h-5" />
                                        </button>
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
                                                        className="cursor-pointer w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-neutral-300 hover:text-white hover:bg-neutral-800 transition-colors"
                                                    >
                                                        <Pencil className="w-3.5 h-3.5 text-blue-400" /> Edit Data
                                                    </button>
                                                    <button
                                                        onClick={() => handleOpenDeleteModal(item)}
                                                        className="cursor-pointer w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-colors"
                                                    >
                                                        <Trash2 className="w-3.5 h-3.5" /> Hapus
                                                    </button>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </div>
                                </div>

                                {/* Detail Klien */}
                                <div className="space-y-2 pt-2 border-t border-neutral-800/50">
                                    <div className="flex items-center gap-2 text-sm text-neutral-400">
                                        <BriefcaseBusiness className="w-4 h-4 text-neutral-500" />
                                        <span className="truncate">{item.company_name || "-"}</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-sm text-neutral-400">
                                        <Phone className="w-4 h-4 text-neutral-500" />
                                        <span>{item.contact_phone || "Belum ada kontak"}</span>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* POPUP MODAL TAMBAH / EDIT KLIEN */}
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
                                <h3 className="text-lg font-bold text-white">{modalMode === "add" ? "Tambah Klien Baru" : "Edit Data Klien"}</h3>
                                <button onClick={handleCloseModal} className="cursor-pointer p-1 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 active:scale-90 transition-all">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            <form onSubmit={handleSubmit} className="p-5 space-y-4">
                                <div>
                                    <label className="block text-xs font-semibold text-neutral-300 tracking-wide mb-2">
                                        Nama Klien / Penanggung Jawab <span className="text-[#DB3B96]">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="Contoh: Budi Santoso"
                                        value={formData.client_name}
                                        onChange={(e) => setFormData({ ...formData, client_name: e.target.value })}
                                        className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-2.5 text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-[#DB3B96] transition-colors"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-neutral-300 tracking-wide mb-2">Nama Perusahaan (Opsional)</label>
                                    <input
                                        type="text"
                                        placeholder="Contoh: PT Sukses Bersama"
                                        value={formData.company_name}
                                        onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                                        className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-2.5 text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-[#DB3B96] transition-colors"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-neutral-300 tracking-wide mb-2">Nomor Telepon / WhatsApp</label>
                                    <input
                                        type="text"
                                        placeholder="Contoh: 08123456789"
                                        value={formData.contact_phone}
                                        onChange={(e) => setFormData({ ...formData, contact_phone: e.target.value })}
                                        className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-2.5 text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-[#DB3B96] transition-colors"
                                    />
                                </div>

                                <div className="flex items-center justify-between pt-2">
                                    <label className="text-sm font-medium text-neutral-300">Status Klien Aktif</label>
                                    <label className="relative inline-flex items-center cursor-pointer hover:opacity-80 transition-opacity">
                                        <input type="checkbox" className="sr-only peer" checked={formData.is_active} onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })} />
                                        <div className="w-11 h-6 bg-neutral-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#DB3B96]"></div>
                                    </label>
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
                                                <Check className="w-4 h-4" /> {modalMode === "add" ? "Simpan Data" : "Perbarui"}
                                            </>
                                        )}
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* POPUP MODAL KONFIRMASI HAPUS */}
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
                            <h3 className="text-lg font-bold text-white mb-2">Hapus Klien Ini?</h3>
                            <p className="text-sm text-neutral-400 mb-6">
                                Apakah Anda yakin ingin menghapus klien <strong className="text-white">{clientToDelete?.client_name}</strong>? Tindakan ini tidak dapat dibatalkan.
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
