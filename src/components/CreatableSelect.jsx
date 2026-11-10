import { useState, useRef, useEffect } from "react";
import { ChevronDown, Plus, Check, X, Loader2, Search } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function CreatableSelect({
    required = false,
    options = [],
    valueKey = "id",
    labelKey = "label",
    value = "",
    onChange,
    onCreate,
    placeholder = "-- Pilih --",
    createLabel = "Tambah data baru",
    allowClear = false,
    clearLabel = "-- Tanpa Pilihan --",
    icon: Icon,
    disabled = false,
}) {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const [isCreating, setIsCreating] = useState(false);
    const containerRef = useRef(null);
    const searchInputRef = useRef(null);

    // Dapatkan data yang sedang dipilih saat ini
    const selectedItem = options.find((opt) => String(opt[valueKey]) === String(value));
    const displayValue = selectedItem ? selectedItem[labelKey] : "";

    // Listener click outside untuk menutup dropdown
    useEffect(() => {
        function handleClickOutside(event) {
            if (containerRef.current && !containerRef.current.contains(event.target)) {
                setIsOpen(false);
                setSearchTerm("");
            }
        }
        if (isOpen) {
            document.addEventListener("mousedown", handleClickOutside);
        }
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [isOpen]);

    // Auto-focus ke input pencarian saat dropdown terbuka
    useEffect(() => {
        if (isOpen && searchInputRef.current) {
            searchInputRef.current.focus();
        }
    }, [isOpen]);

    // Filter opsi berdasarkan pencarian (case-insensitive)
    const cleanSearch = searchTerm.trim().toLowerCase();
    const filteredOptions = options.filter((opt) => {
        const text = String(opt[labelKey] || "").toLowerCase();
        return text.includes(cleanSearch);
    });

    // Cek apakah ada opsi yang persis sama (untuk mencegah duplikasi)
    const exactMatch = options.some((opt) => String(opt[labelKey] || "").trim().toLowerCase() === cleanSearch);

    // Boleh membuat baru jika ada teks, belum ada yang sama persis, dan ada callback onCreate
    const canCreate = Boolean(onCreate && cleanSearch.length > 0 && !exactMatch);

    // Handler memilih opsi
    const handleSelect = (item) => {
        if (!item) {
            onChange?.("", null);
        } else {
            onChange?.(item[valueKey], item);
        }
        setIsOpen(false);
        setSearchTerm("");
    };

    // Handler membuat data baru inline
    const handleCreateNew = async () => {
        if (!canCreate || isCreating) return;
        const textToCreate = searchTerm.trim();
        setIsCreating(true);
        try {
            const newItem = await onCreate(textToCreate);
            if (newItem) {
                onChange?.(newItem[valueKey], newItem);
                setIsOpen(false);
                setSearchTerm("");
            }
        } catch (err) {
            console.error("Gagal membuat data baru:", err);
        } finally {
            setIsCreating(false);
        }
    };

    // Handler saat menekan tombol keyboard di search input
    const handleKeyDown = (e) => {
        if (e.key === "Enter") {
            e.preventDefault();
            if (canCreate && filteredOptions.length === 0) {
                handleCreateNew();
            } else if (filteredOptions.length > 0) {
                // Pilih opsi pertama yang cocok
                handleSelect(filteredOptions[0]);
            }
        } else if (e.key === "Escape") {
            setIsOpen(false);
            setSearchTerm("");
        }
    };

    return (
        <div className="relative w-full" ref={containerRef}>
            {/* Input Tersembunyi untuk validasi required bawaan form HTML5 */}
            {required && (
                <input
                    type="text"
                    tabIndex={-1}
                    required={required}
                    value={value || ""}
                    onChange={() => {}}
                    className="sr-only"
                    aria-hidden="true"
                />
            )}

            {/* Trigger Button */}
            <button
                type="button"
                disabled={disabled}
                onClick={() => {
                    if (!disabled) {
                        setIsOpen((prev) => !prev);
                        setSearchTerm("");
                    }
                }}
                className={`w-full flex items-center justify-between gap-2 bg-neutral-950 border rounded-xl px-4 py-2.5 text-sm transition-all text-left cursor-pointer ${
                    disabled
                        ? "opacity-50 cursor-not-allowed border-neutral-800"
                        : isOpen
                        ? "border-[#DB3B96] ring-1 ring-[#DB3B96]/20"
                        : "border-neutral-800 hover:border-neutral-700"
                }`}
            >
                <div className="flex items-center gap-2.5 truncate">
                    {Icon && <Icon className="w-4 h-4 text-neutral-500 shrink-0" />}
                    <span className={`truncate ${displayValue ? "text-white font-medium" : "text-neutral-500"}`}>
                        {displayValue || placeholder}
                    </span>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                    {allowClear && displayValue && !disabled && (
                        <span
                            role="button"
                            tabIndex={0}
                            onClick={(e) => {
                                e.stopPropagation();
                                handleSelect(null);
                            }}
                            className="p-0.5 rounded-md hover:bg-neutral-800 text-neutral-400 hover:text-white transition-colors"
                            title="Hapus pilihan"
                        >
                            <X className="w-3.5 h-3.5" />
                        </span>
                    )}
                    <ChevronDown
                        className={`w-4 h-4 text-neutral-500 transition-transform duration-200 ${
                            isOpen ? "rotate-180 text-[#DB3B96]" : ""
                        }`}
                    />
                </div>
            </button>

            {/* Dropdown Popover */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: -4, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -4, scale: 0.98 }}
                        transition={{ duration: 0.15 }}
                        className="absolute left-0 right-0 top-full mt-1.5 z-50 bg-neutral-900 border border-neutral-800 rounded-xl shadow-2xl overflow-hidden flex flex-col"
                    >
                        {/* Search Input Box */}
                        <div className="p-2 border-b border-neutral-800 bg-neutral-900/90 backdrop-blur-sm sticky top-0 z-10">
                            <div className="relative">
                                <Search className="w-4 h-4 text-neutral-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                                <input
                                    ref={searchInputRef}
                                    type="text"
                                    placeholder="Ketik untuk mencari atau menambah..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    onKeyDown={handleKeyDown}
                                    className="w-full bg-neutral-950 border border-neutral-800 rounded-lg pl-9 pr-8 py-2 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-[#DB3B96] transition-colors"
                                />
                                {searchTerm && (
                                    <button
                                        type="button"
                                        onClick={() => setSearchTerm("")}
                                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-white p-0.5 rounded transition-colors"
                                    >
                                        <X className="w-3.5 h-3.5" />
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* List Opsi */}
                        <div className="max-h-52 overflow-y-auto p-1.5 space-y-1 custom-scrollbar">
                            {/* Opsi Kosong / Clear jika allowClear */}
                            {allowClear && (
                                <button
                                    type="button"
                                    onClick={() => handleSelect(null)}
                                    className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs transition-colors text-left cursor-pointer ${
                                        !value
                                            ? "bg-[#DB3B96]/15 text-[#DB3B96] font-semibold"
                                            : "text-neutral-400 hover:bg-neutral-800 hover:text-white"
                                    }`}
                                >
                                    <span>{clearLabel}</span>
                                    {!value && <Check className="w-3.5 h-3.5 text-[#DB3B96]" />}
                                </button>
                            )}

                            {filteredOptions.length > 0 ? (
                                filteredOptions.map((opt) => {
                                    const isSelected = String(opt[valueKey]) === String(value);
                                    return (
                                        <button
                                            key={opt[valueKey]}
                                            type="button"
                                            onClick={() => handleSelect(opt)}
                                            className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs transition-colors text-left cursor-pointer ${
                                                isSelected
                                                    ? "bg-[#DB3B96]/15 text-[#DB3B96] font-semibold"
                                                    : "text-neutral-300 hover:bg-neutral-800 hover:text-white"
                                            }`}
                                        >
                                            <span className="truncate">{opt[labelKey]}</span>
                                            {isSelected && <Check className="w-3.5 h-3.5 text-[#DB3B96] shrink-0 ml-2" />}
                                        </button>
                                    );
                                })
                            ) : (
                                !canCreate && (
                                    <div className="px-3 py-4 text-center text-xs text-neutral-500">
                                        Tidak ada data yang cocok
                                    </div>
                                )
                            )}

                            {/* Tombol Buat Baru Inline */}
                            {canCreate && (
                                <button
                                    type="button"
                                    disabled={isCreating}
                                    onClick={handleCreateNew}
                                    className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg text-xs text-left bg-linear-to-r from-[#DB3B96]/20 to-[#8B5EA8]/20 border border-[#DB3B96]/30 hover:border-[#DB3B96] text-white hover:bg-[#DB3B96]/30 transition-all cursor-pointer mt-1 group"
                                >
                                    {isCreating ? (
                                        <>
                                            <Loader2 className="w-3.5 h-3.5 text-[#DB3B96] animate-spin shrink-0" />
                                            <span className="text-[#DB3B96] truncate">Menyimpan "{searchTerm.trim()}"...</span>
                                        </>
                                    ) : (
                                        <>
                                            <Plus className="w-3.5 h-3.5 text-[#DB3B96] group-hover:scale-110 transition-transform shrink-0" />
                                            <span className="truncate">
                                                {createLabel}: <strong className="text-[#DB3B96]">"{searchTerm.trim()}"</strong>
                                            </span>
                                        </>
                                    )}
                                </button>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
