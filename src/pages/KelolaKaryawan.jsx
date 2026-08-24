import { useEffect, useState, useRef } from "react";
import { supabase } from "../supabaseClient";
import { Users, Plus, MoreVertical, Pencil, Trash2, X, Check, Mail, CircleUser, AlertTriangle, Eye, EyeOff, Search } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import MavaLoader from "../components/MavaLoader";

export default function KelolaKaryawan() {
    const [employees, setEmployees] = useState([]);
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
        full_name: "",
        email: "",
        password: "",
        role_id: "",
        is_active: true,
    });
    const [submitting, setSubmitting] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    // State Modal Hapus
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [employeeToDelete, setEmployeeToDelete] = useState(null);
    const [isDeleting, setIsDeleting] = useState(false);

    // State Search
    const [searchTerm, setSearchTerm] = useState("");

    // 1. FETCH DATA USERS & ROLES
    useEffect(() => {
        let ignore = false;

        async function fetchData() {
            setLoading(true);
            const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

            try {
                // Ambil data users (join dengan tabel roles untuk dapat nama role) dan ambil data roles untuk dropdown
                const [usersRes, rolesRes] = await Promise.all([
                    supabase.from("users").select(`*, roles(role_name)`).order("user_id", { ascending: false }),
                    supabase.from("roles").select("*").order("role_id", { ascending: true }),
                    delay(600),
                ]);

                if (!ignore) {
                    if (!usersRes.error) setEmployees(usersRes.data || []);
                    if (!rolesRes.error) setRoles(rolesRes.data || []);
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
        setFormData({ full_name: "", email: "", password: "", role_id: roles[0]?.role_id || "", is_active: true });
        setIsModalOpen(true);
        setActiveDropdown(null);
    };

    const handleOpenEditModal = (item) => {
        setModalMode("edit");
        setSelectedId(item.user_id);
        setFormData({
            full_name: item.full_name,
            email: item.email,
            password: item.password,
            role_id: item.role_id,
            is_active: item.is_active,
        });
        setIsModalOpen(true);
        setActiveDropdown(null);
    };

    const handleCloseModal = () => {
        if (!submitting) {
            setIsModalOpen(false);
            setFormData({ full_name: "", email: "", password: "", role_id: "", is_active: true });
        }
    };

    // 3. SUBMIT HANDLER
    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.full_name.trim() || !formData.email.trim() || !formData.role_id) return;

        setSubmitting(true);
        const selectedRoleName = roles.find((r) => r.role_id.toString() === formData.role_id.toString())?.role_name;

        if (modalMode === "add") {
            const { data, error } = await supabase
                .from("users")
                .insert([
                    {
                        full_name: formData.full_name.trim(),
                        email: formData.email.trim().toLowerCase(),
                        password: formData.password.trim(),
                        role_id: formData.role_id,
                        is_active: formData.is_active,
                    },
                ])
                .select(`*, roles(role_name)`);

            if (!error && data) {
                setEmployees((prev) => [data[0], ...prev]);
            } else {
                alert("Gagal menambah karyawan: " + error?.message);
            }
        } else {
            const { error } = await supabase
                .from("users")
                .update({
                    full_name: formData.full_name.trim(),
                    email: formData.email.trim().toLowerCase(),
                    password: formData.password.trim(),
                    role_id: formData.role_id,
                    is_active: formData.is_active,
                })
                .eq("user_id", selectedId);

            if (!error) {
                setEmployees((prev) => prev.map((item) => (item.user_id === selectedId ? { ...item, ...formData, roles: { role_name: selectedRoleName } } : item)));
            } else {
                alert("Gagal memperbarui karyawan: " + error?.message);
            }
        }

        setSubmitting(false);
        setIsModalOpen(false);
    };

    // 4. DELETE MODAL HANDLERS
    const handleOpenDeleteModal = (item) => {
        setEmployeeToDelete(item);
        setIsDeleteModalOpen(true);
        setActiveDropdown(null);
    };

    const confirmDelete = async () => {
        if (!employeeToDelete) return;
        setIsDeleting(true);

        const { error } = await supabase.from("users").delete().eq("user_id", employeeToDelete.user_id);

        if (!error) {
            setEmployees((prev) => prev.filter((item) => item.user_id !== employeeToDelete.user_id));
            setIsDeleteModalOpen(false);
            setEmployeeToDelete(null);
        } else {
            alert("Gagal menghapus karyawan.\nDetail: " + error.message);
        }

        setIsDeleting(false);
    };

    // 5. FILTER EMPLOYEES BASED ON SEARCH TERM
    const filteredEmployees = employees.filter((emp) => emp.full_name.toLowerCase().includes(searchTerm.toLowerCase()) || emp.email.toLowerCase().includes(searchTerm.toLowerCase()));

    return (
        <div className="p-8 space-y-6 min-h-screen relative">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-white">Kelola Karyawan</h2>
                    <p className="text-sm text-neutral-400">Manajemen akun staf, posisi, dan akses sistem</p>
                </div>
                <button
                    onClick={handleOpenAddModal}
                    className="cursor-pointer flex items-center gap-2 bg-linear-to-r from-[#DB3B96] to-[#8B5EA8] hover:opacity-90 hover:scale-105 active:scale-95 text-white font-medium px-4 py-2.5 rounded-xl text-sm transition-all shadow-lg shadow-[#DB3B96]/20"
                >
                    <Plus className="w-4 h-4" />
                    Tambah Karyawan
                </button>
            </div>

            {/* SEARCH */}
            <div className="relative mb-6">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Search className="w-4 h-4 text-neutral-500" />
                </div>
                <input
                    type="text"
                    placeholder="Cari nama atau email karyawan..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full bg-neutral-900 border border-neutral-800 rounded-xl pl-11 pr-4 py-2.5 text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-[#DB3B96] transition-colors"
                />
            </div>
            {/* END SEARCH */}

            {loading ? (
                <MavaLoader text="Sinkronisasi data karyawan..." />
            ) : employees.length === 0 ? (
                <div className="p-12 text-center bg-neutral-900/50 border border-neutral-800 rounded-2xl">
                    <Users className="w-12 h-12 text-neutral-600 mx-auto mb-3" />
                    <h3 className="text-lg font-semibold text-white">Belum Ada Karyawan</h3>
                    <p className="text-neutral-400 text-sm mt-1">Klik tombol "Tambah Karyawan" untuk mendaftarkan staf baru.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4" ref={dropdownRef}>
                    {filteredEmployees.map((item) => {
                        const isDropdownOpen = activeDropdown === item.user_id;

                        return (
                            <div key={item.user_id} className="p-5 bg-neutral-900 border border-neutral-800 rounded-xl flex flex-col justify-between space-y-4 hover:border-neutral-700 hover:shadow-lg transition-all relative group">
                                <div className="flex items-start justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="w-11 h-11 rounded-full bg-linear-to-br from-neutral-700 to-neutral-900 border border-neutral-600 flex items-center justify-center text-white font-bold text-sm uppercase shadow-inner">
                                            {item.full_name.substring(0, 2)}
                                        </div>
                                        <div>
                                            <h3 className="text-base font-bold text-white truncate max-w-[150px]">{item.full_name}</h3>
                                            <span
                                                className={`text-[11px] font-medium px-2 py-0.5 rounded-md mt-1 inline-block ${item.is_active ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-neutral-800 text-neutral-400 border border-neutral-700"}`}
                                            >
                                                {item.is_active ? "Aktif" : "Nonaktif"}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="relative">
                                        <button
                                            onClick={() => setActiveDropdown(isDropdownOpen ? null : item.user_id)}
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
                                                        <Pencil className="w-3.5 h-3.5" /> Edit Data
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

                                <div className="space-y-2 pt-3 border-t border-neutral-800/50">
                                    <div className="flex items-center gap-2 text-sm text-neutral-400">
                                        <CircleUser className="w-4.5 h-4.5 text-[#DB3B96]" />
                                        <span className="font-medium text-neutral-200">{item.roles?.role_name || "Tanpa Posisi"}</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-sm text-neutral-400">
                                        <Mail className="w-4 h-4 text-neutral-500" />
                                        <span className="truncate">{item.email}</span>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* POPUP MODAL TAMBAH/EDIT */}
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
                                <h3 className="text-lg font-bold text-white">{modalMode === "add" ? "Tambah Karyawan" : "Edit Karyawan"}</h3>
                                <button onClick={handleCloseModal} className="cursor-pointer p-1 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 active:scale-90 transition-all">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            <form onSubmit={handleSubmit} className="p-5 space-y-4">
                                <div>
                                    <label className="block text-xs font-semibold text-neutral-300 tracking-wide mb-2">
                                        Nama Lengkap <span className="text-[#DB3B96]">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="Contoh: Ahmad Aditya"
                                        value={formData.full_name}
                                        onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                                        className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-2.5 text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-[#DB3B96] transition-colors"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold text-neutral-300 tracking-wide mb-2">
                                        Email Login <span className="text-[#DB3B96]">*</span>
                                    </label>
                                    <input
                                        type="email"
                                        required
                                        placeholder="adit@mava.com"
                                        value={formData.email}
                                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                        className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-2.5 text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-[#DB3B96] transition-colors"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold text-neutral-300 tracking-wide mb-2">
                                        Password <span className="text-[#DB3B96]">*</span>
                                    </label>
                                    <input
                                        type={showPassword ? "text" : "password"}
                                        required
                                        placeholder="Minimal 6 karakter"
                                        value={formData.password}
                                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                        className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-2.5 text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-[#DB3B96] transition-colors"
                                    />
                                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute top-[calc(50%+20px)] right-8 flex items-center text-neutral-500 hover:text-white transition-colors cursor-pointer">
                                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                    </button>
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold text-neutral-300 tracking-wide mb-2">
                                        Role / Posisi <span className="text-[#DB3B96]">*</span>
                                    </label>
                                    <select
                                        required
                                        value={formData.role_id}
                                        onChange={(e) => setFormData({ ...formData, role_id: e.target.value })}
                                        className="cursor-pointer w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#DB3B96] transition-colors appearance-none"
                                    >
                                        <option value="" disabled>
                                            -- Pilih Posisi --
                                        </option>
                                        {roles.map((r) => (
                                            <option key={r.role_id} value={r.role_id}>
                                                {r.role_name}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div className="flex items-center justify-between pt-2">
                                    <label className="text-sm font-medium text-neutral-300">Status Akun Aktif</label>
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
                                                <Check className="w-4 h-4" /> {modalMode === "add" ? "Simpan" : "Perbarui"}
                                            </>
                                        )}
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* POPUP HAPUS */}
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
                            <h3 className="text-lg font-bold text-white mb-2">Hapus Karyawan?</h3>
                            <p className="text-sm text-neutral-400 mb-6">
                                Yakin ingin menghapus <strong className="text-white">{employeeToDelete?.full_name}</strong>? Tindakan ini tidak dapat dibatalkan.
                            </p>

                            <div className="flex items-center gap-3">
                                <button
                                    onClick={() => setIsDeleteModalOpen(false)}
                                    disabled={isDeleting}
                                    className="cursor-pointer flex-1 px-4 py-2.5 rounded-xl text-sm font-medium text-neutral-300 bg-neutral-800 hover:bg-neutral-700 active:scale-95 transition-all"
                                >
                                    Batal
                                </button>
                                <button
                                    onClick={confirmDelete}
                                    disabled={isDeleting}
                                    className="cursor-pointer flex-1 px-4 py-2.5 rounded-xl text-sm font-medium text-white bg-red-600 hover:bg-red-500 active:scale-95 transition-all disabled:opacity-50"
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
