import { useState } from "react";
import { supabase } from "../supabaseClient";
import { motion } from "framer-motion";
import { Lock, Mail, ArrowRight, AlertCircle, Eye, EyeOff } from "lucide-react";

export default function Login({ onLogin }) {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState("");
    const [showPassword, setShowPassword] = useState(false);

    const handleLogin = async (e) => {
        e.preventDefault();
        setErrorMsg("");
        setLoading(true);

        try {
            // Cari user berdasarkan email & password, lalu ambil nama role-nya
            const { data, error } = await supabase.from("users").select("*, roles(role_name)").eq("email", email).eq("password", password).single();

            if (error || !data) {
                throw new Error("Email atau password salah!");
            }

            if (!data.is_active) {
                throw new Error("Akun Anda dinonaktifkan. Hubungi Atasan.");
            }

            // Jika berhasil, kirim data user ke App.jsx
            onLogin(data);
        } catch (err) {
            setErrorMsg(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-black flex items-center justify-center p-4 relative overflow-hidden">
            {/* Background Ornamen */}
            <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] bg-[#DB3B96]/20 blur-[120px] rounded-full pointer-events-none" />
            <div className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] bg-[#8B5EA8]/20 blur-[120px] rounded-full pointer-events-none" />

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md bg-neutral-900/80 backdrop-blur-xl border border-neutral-800 rounded-3xl shadow-2xl p-8 z-10">
                <div className="text-center mb-8">
                    <img src="/img/Logo.png" alt="Logo" className="h-16 mx-auto mb-4" />
                    {/* <h1 className="text-3xl font-bold text-white tracking-wide mb-2">MAVA Ops</h1> */}
                    <p className="text-neutral-400 text-sm">Masuk ke Ruang Kerja Anda</p>
                </div>

                {errorMsg && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mb-6 p-3 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-2 text-red-400 text-sm">
                        <AlertCircle className="w-4 h-4 shrink-0" />
                        <span>{errorMsg}</span>
                    </motion.div>
                )}

                <form onSubmit={handleLogin} className="space-y-5">
                    <div>
                        <label className="block text-xs font-semibold text-neutral-400 mb-2">Email Address</label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                <Mail className="w-4 h-4 text-neutral-500" />
                            </div>
                            <input
                                type="email"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full bg-neutral-950 border border-neutral-800 rounded-xl pl-11 pr-4 py-3 text-sm text-white placeholder-neutral-600 focus:outline-none focus:border-[#DB3B96] transition-colors"
                                placeholder="email@mava.com"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-neutral-400 mb-2">Password</label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                <Lock className="w-4 h-4 text-neutral-500" />
                            </div>
                            <input
                                type={showPassword ? "text" : "password"}
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full bg-neutral-950 border border-neutral-800 rounded-xl pl-11 pr-4 py-3 text-sm text-white placeholder-neutral-600 focus:outline-none focus:border-[#DB3B96] transition-colors"
                                placeholder="••••••••"
                            />
                            <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute inset-y-0 right-0 pr-4 flex items-center text-neutral-500 hover:text-white transition-colors cursor-pointer">
                                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="cursor-pointer w-full flex items-center justify-center gap-2 bg-gradient-to-r from-[#DB3B96] to-[#8B5EA8] hover:opacity-90 active:scale-95 text-white font-bold py-3.5 rounded-xl text-sm transition-all shadow-lg shadow-[#DB3B96]/20 disabled:opacity-50 mt-4"
                    >
                        {loading ? (
                            "Memeriksa Kredensial..."
                        ) : (
                            <>
                                Masuk Sekarang <ArrowRight className="w-4 h-4" />
                            </>
                        )}
                    </button>
                </form>
            </motion.div>
        </div>
    );
}
