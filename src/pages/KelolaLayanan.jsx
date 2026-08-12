import { useEffect, useState, useRef } from "react";
import { supabase } from "../supabaseClient";
import { Briefcase, Plus, MoreVertical, Pencil, Trash2, X, Check } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import MavaLoader from "../components/MavaLoader";

export default function KelolaLayanan() {
    const [services, setServices] = useState([]);
    const [loading, setLoading] = useState(true);

    // State untuk Dropdown Titik Tiga (menyimpan service_id yang aktif)
    const [activeDropdown, setActiveDropdown] = useState(null);

    // State untuk Modal (Tambah / Edit)
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalMode, setModalMode] = useState("add"); // 'add' atau 'edit'
    const [selectedId, setSelectedId] = useState(null);
    const [formData, setFormData] = useState({
        service_name: "",
        description: "",
    });
    const [submitting, setSubmitting] = useState(false);

    // Ref untuk menutup dropdown saat klik di luar
    const dropdownRef = useRef(null);

    // 1. FETCH DATA DARI SUPABASE (Bebas Error & Sesuai Aturan React Terbaru)
    useEffect(() => {
        let ignore = false;

        async function fetchServices() {
            setLoading(true);

            try {
                const [{ data, error }] = await Promise.all([supabase.from("services").select("*").order("service_id", { ascending: true })]);

                if (!ignore) {
                    if (!error) {
                        setServices(data || []);
                    }
                }
            } catch (err) {
                console.error("Error fetching services:", err);
            } finally {
                if (!ignore) {
                    setLoading(false);
                }
            }
        }

        fetchServices();

        return () => {
            ignore = true;
        };
    }, []);

    // Menutup dropdown saat klik di luar area card
    useEffect(() => {
        function handleClickOutside(event) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setActiveDropdown(null);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // 2. MODAL HANDLERS
    const handleOpenAddModal = () => {
        setModalMode("add");
        setSelectedId(null);
        setFormData({ service_name: "", description: "" });
        setIsModalOpen(true);
        setActiveDropdown(null);
    };

    const handleOpenEditModal = (item) => {
        setModalMode("edit");
        setSelectedId(item.service_id);
        setFormData({
            service_name: item.service_name,
            description: item.description || "",
        });
        setIsModalOpen(true);
        setActiveDropdown(null);
    };

    const handleCloseModal = () => {
        if (!submitting) {
            setIsModalOpen(false);
            setFormData({ service_name: "", description: "" });
        }
    };

    // 3. SUBMIT HANDLER (TAMBAH / EDIT LAYANAN)
    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.service_name.trim()) return;

        setSubmitting(true);

        if (modalMode === "add") {
            // TAMBAH LAYANAN BARU
            const { data, error } = await supabase
                .from("services")
                .insert([
                    {
                        service_name: formData.service_name.trim(),
                        description: formData.description.trim(),
                    },
                ])
                .select();

            if (!error && data) {
                setServices((prev) => [...prev, ...data]);
            } else {
                alert("Gagal menambah layanan: " + error?.message);
            }
        } else {
            // EDIT LAYANAN EXIST
            const { error } = await supabase
                .from("services")
                .update({
                    service_name: formData.service_name.trim(),
                    description: formData.description.trim(),
                })
                .eq("service_id", selectedId);

            if (!error) {
                setServices((prev) =>
                    prev.map((item) =>
                        item.service_id === selectedId
                            ? {
                                  ...item,
                                  service_name: formData.service_name.trim(),
                                  description: formData.description.trim(),
                              }
                            : item,
                    ),
                );
            } else {
                alert("Gagal memperbarui layanan: " + error?.message);
            }
        }

        setSubmitting(false);
        setIsModalOpen(false);
    };

    // 4. HAPUS LAYANAN HANDLER
    const handleDelete = async (id, name) => {
        setActiveDropdown(null);
        const confirmDelete = window.confirm(`Apakah Anda yakin ingin menghapus layanan "${name}"?`);

        if (!confirmDelete) return;

        const { error } = await supabase.from("services").delete().eq("service_id", id);

        if (!error) {
            setServices((prev) => prev.filter((item) => item.service_id !== id));
        } else {
            alert("Gagal menghapus layanan. Pastikan tidak ada task yang terhubung dengan layanan ini.\nDetail: " + error.message);
        }
    };

    return (
        <div className="p-8 space-y-6 min-h-screen relative">
            {/* Header Halaman */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-white">Kelola Layanan</h2>
                    <p className="text-sm text-neutral-400">Daftar katalog layanan agensi MAVA</p>
                </div>
                <button
                    onClick={handleOpenAddModal}
                    className="flex items-center gap-2 bg-linear-to-r from-[#DB3B96] to-[#8B5EA8] hover:opacity-90 text-white font-medium px-4 py-2.5 rounded-xl text-sm transition-all shadow-lg shadow-[#DB3B96]/20 active:scale-95 cursor-pointer"
                >
                    <Plus className="w-4 h-4" />
                    Tambah Layanan
                </button>
            </div>

            {/* Grid Card / Loading */}
            {loading ? (
                <MavaLoader text="Sinkronisasi katalog MAVA..." />
            ) : services.length === 0 ? (
                <div className="p-12 text-center bg-neutral-900/50 border border-neutral-800 rounded-2xl">
                    <Briefcase className="w-12 h-12 text-neutral-600 mx-auto mb-3" />
                    <h3 className="text-lg font-semibold text-white">Belum Ada Layanan</h3>
                    <p className="text-neutral-400 text-sm mt-1">Klik tombol "Tambah Layanan" untuk menambahkan katalog baru.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" ref={dropdownRef}>
                    {services.map((item) => {
                        const isDropdownOpen = activeDropdown === item.service_id;

                        return (
                            <div key={item.service_id} className="p-5 bg-neutral-900 border border-neutral-800 rounded-xl flex flex-col justify-between space-y-4 hover:border-neutral-700 transition-all relative group">
                                <div className="space-y-3">
                                    {/* Top Bar Card (Icon & Menu Titik Tiga) */}
                                    <div className="flex items-center justify-between">
                                        <div className="w-10 h-10 rounded-lg bg-neutral-800 border border-neutral-700 flex items-center justify-center text-[#DB3B96]">
                                            <Briefcase className="w-5 h-5" />
                                        </div>

                                        {/* Tombol Titik Tiga */}
                                        <div className="relative">
                                            <button
                                                onClick={() => setActiveDropdown(isDropdownOpen ? null : item.service_id)}
                                                className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors cursor-pointer"
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
                                                            className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-neutral-300 hover:text-white hover:bg-neutral-800 transition-colors cursor-pointer"
                                                        >
                                                            <Pencil className="w-3.5 h-3.5 text-blue-400" />
                                                            Edit Layanan
                                                        </button>
                                                        <button
                                                            onClick={() => handleDelete(item.service_id, item.service_name)}
                                                            className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer"
                                                        >
                                                            <Trash2 className="w-3.5 h-3.5" />
                                                            Hapus
                                                        </button>
                                                    </motion.div>
                                                )}
                                            </AnimatePresence>
                                        </div>
                                    </div>

                                    {/* Info Layanan */}
                                    <div>
                                        <h3 className="text-lg font-semibold text-white">{item.service_name}</h3>
                                        <p className="text-sm text-neutral-400 leading-relaxed mt-1 line-clamp-3">{item.description || "Tidak ada deskripsi."}</p>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* POPUP MODAL (TAMBAH / EDIT LAYANAN) */}
            <AnimatePresence>
                {isModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        {/* Backdrop Gelap */}
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={handleCloseModal} className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

                        {/* Kotak Modal */}
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 10 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 10 }}
                            className="relative w-full max-w-md bg-neutral-900 border border-neutral-800 rounded-2xl shadow-2xl overflow-hidden z-10"
                        >
                            {/* Header Modal */}
                            <div className="flex items-center justify-between p-5 border-b border-neutral-800">
                                <h3 className="text-lg font-bold text-white">{modalMode === "add" ? "Tambah Layanan Baru" : "Edit Layanan"}</h3>
                                <button onClick={handleCloseModal} className="p-1 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            {/* Form Input */}
                            <form onSubmit={handleSubmit} className="p-5 space-y-4">
                                <div>
                                    <label className="block text-xs font-semibold text-neutral-300 uppercase tracking-wider mb-2">
                                        Nama Layanan <span className="text-[#DB3B96]">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="Contoh: Social Media Management"
                                        value={formData.service_name}
                                        onChange={(e) => setFormData({ ...formData, service_name: e.target.value })}
                                        className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-2.5 text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-[#DB3B96] transition-colors"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold text-neutral-300 uppercase tracking-wider mb-2">Deskripsi Layanan</label>
                                    <textarea
                                        rows="3"
                                        placeholder="Rincian singkat seputar cakupan layanan..."
                                        value={formData.description}
                                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                        className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-2.5 text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-[#DB3B96] transition-colors resize-none"
                                    />
                                </div>

                                {/* Footer Modal / Tombol Aksi */}
                                <div className="flex items-center justify-end gap-3 pt-4 border-t border-neutral-800">
                                    <button
                                        type="button"
                                        onClick={handleCloseModal}
                                        disabled={submitting}
                                        className="cursor-pointer px-4 py-2.5 rounded-xl text-sm font-medium text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
                                    >
                                        Batal
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={submitting}
                                        className="cursor-pointer flex items-center gap-2 bg-linear-to-r from-[#DB3B96] to-[#8B5EA8] hover:opacity-90 text-white font-medium px-5 py-2.5 rounded-xl text-sm transition-all shadow-lg shadow-[#DB3B96]/20 disabled:opacity-50"
                                    >
                                        {submitting ? (
                                            "Menyimpan..."
                                        ) : (
                                            <>
                                                <Check className="w-4 h-4" />
                                                {modalMode === "add" ? "Simpan Layanan" : "Perbarui"}
                                            </>
                                        )}
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}
