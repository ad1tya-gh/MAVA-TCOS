import { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";
import { LayoutDashboard, CheckCircle2, Clock, AlertTriangle, ListTodo } from "lucide-react";
import { motion } from "framer-motion";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import MavaLoader from "../components/MavaLoader";

export default function Dashboard() {
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({ total: 0, pendingReview: 0, completed: 0, overdue: 0 });
    const [chartData, setChartData] = useState([]);
    const [completedChartData, setCompletedChartData] = useState([]);

    useEffect(() => {
        let ignore = false;
        async function fetchDashboardData() {
            try {
                const { data: tasks, error } = await supabase.from("tasks").select(`*, assignee:users!tasks_assignee_id_fkey(full_name)`).order("created_at", { ascending: false });

                if (error) throw error;

                if (!ignore && tasks) {
                    // 1. Hitung KPI Cards
                    const now = new Date();
                    const total = tasks.length;
                    const pendingReview = tasks.filter((t) => t.status === "In Review").length;
                    const completed = tasks.filter((t) => t.status === "Completed").length;
                    const overdue = tasks.filter((t) => t.due_date && new Date(t.due_date) < now && t.status !== "Completed").length;

                    setStats({ total, pendingReview, completed, overdue });

                    // 2. Olah Data untuk Grafik (Beban Kerja per Karyawan)
                    const workload = {};
                    tasks.forEach((task) => {
                        if (task.status !== "Completed") {
                            const name = task.assignee?.full_name || "Unassigned";
                            workload[name] = (workload[name] || 0) + 1;
                        }
                    });

                    const formattedChartData = Object.keys(workload).map((name) => ({
                        name: name.substring(0, 10) + (name.length > 10 ? "..." : ""), // Singkat nama
                        "Tugas Aktif": workload[name],
                    }));

                    setChartData(formattedChartData);

                    // ... (kode workload aktif sebelumnya) ...

                    // Olah Data untuk Grafik (Tugas Selesai per Karyawan)
                    const completedWorkload = {};
                    tasks.forEach((task) => {
                        if (task.status === "Completed") {
                            const name = task.assignee?.full_name || "Unassigned";
                            completedWorkload[name] = (completedWorkload[name] || 0) + 1;
                        }
                    });

                    const formattedCompletedData = Object.keys(completedWorkload).map((name) => ({
                        name: name.substring(0, 10) + (name.length > 10 ? "..." : ""),
                        "Tugas Selesai": completedWorkload[name],
                    }));

                    setCompletedChartData(formattedCompletedData);
                }
            } catch (err) {
                console.error("Error fetching dashboard data:", err);
            } finally {
                if (!ignore) setLoading(false);
            }
        }

        fetchDashboardData();
        return () => {
            ignore = true;
        };
    }, []);

    if (loading) return <MavaLoader text="Memuat Analytics..." />;

    const kpiCards = [
        { title: "Total Semua Tugas", value: stats.total, icon: ListTodo, color: "text-blue-400", bg: "bg-blue-500/10", border: "border-blue-500/20" },
        { title: "Menunggu Review", value: stats.pendingReview, icon: Clock, color: "text-purple-400", bg: "bg-purple-500/10", border: "border-purple-500/20" },
        { title: "Tugas Selesai", value: stats.completed, icon: CheckCircle2, color: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/20" },
        { title: "Melewati Deadline", value: stats.overdue, icon: AlertTriangle, color: "text-red-400", bg: "bg-red-500/10", border: "border-red-500/20" },
    ];

    return (
        <div className="p-8 space-y-8 min-h-screen">
            <div className="flex items-center gap-3">
                <div className="p-2.5 bg-[#DB3B96]/20 rounded-xl border border-[#DB3B96]/30">
                    <LayoutDashboard className="w-6 h-6 text-[#DB3B96]" />
                </div>
                <div>
                    <h2 className="text-2xl font-bold text-white">Dashboard Monitoring</h2>
                    <p className="text-sm text-neutral-400">Ringkasan performa dan beban kerja tim saat ini.</p>
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
                {kpiCards.map((card, idx) => (
                    <motion.div
                        key={idx}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.1 }}
                        className={`p-5 rounded-2xl border bg-neutral-900/50 flex items-center justify-between ${card.border}`}
                    >
                        <div>
                            <p className="text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-1">{card.title}</p>
                            <h3 className="text-3xl font-bold text-white">{card.value}</h3>
                        </div>
                        <div className={`p-3 rounded-xl ${card.bg}`}>
                            <card.icon className={`w-6 h-6 ${card.color}`} />
                        </div>
                    </motion.div>
                ))}
            </div>

            {/* Grafik Beban Kerja */}
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }} className="bg-neutral-900/50 border border-neutral-800 rounded-2xl p-6 h-[400px]">
                <h3 className="text-sm font-bold text-white mb-6 uppercase tracking-wider">Beban Kerja Aktif per Karyawan</h3>
                {chartData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#262626" vertical={false} />
                            <XAxis dataKey="name" stroke="#737373" fontSize={12} tickLine={false} axisLine={false} />
                            <YAxis stroke="#737373" fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} />
                            <Tooltip cursor={{ fill: "#262626" }} contentStyle={{ backgroundColor: "#171717", borderColor: "#404040", borderRadius: "12px", color: "#fff" }} />
                            <Bar dataKey="Tugas Aktif" fill="#DB3B96" radius={[6, 6, 0, 0]} barSize={40} />
                        </BarChart>
                    </ResponsiveContainer>
                ) : (
                    <div className="h-full flex items-center justify-center text-neutral-500 text-sm">Belum ada tugas aktif untuk ditampilkan.</div>
                )}
            </motion.div>

            {/* Grafik Selesai Kerja */}
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }} className="bg-neutral-900/50 border border-neutral-800 rounded-2xl p-6 h-[400px]">
                <h3 className="text-sm font-bold text-white mb-6 uppercase tracking-wider">Kerjaan yang Selesai</h3>
                {completedChartData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={completedChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#262626" vertical={false} />
                            <XAxis dataKey="name" stroke="#737373" fontSize={12} tickLine={false} axisLine={false} />
                            <YAxis stroke="#737373" fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} />
                            <Tooltip cursor={{ fill: "#262626" }} contentStyle={{ backgroundColor: "#171717", borderColor: "#404040", borderRadius: "12px", color: "#fff" }} />
                            <Bar dataKey="Tugas Selesai" fill="#10B981" radius={[6, 6, 0, 0]} barSize={40} />
                        </BarChart>
                    </ResponsiveContainer>
                ) : (
                    <div className="h-full flex items-center justify-center text-neutral-500 text-sm">Belum ada tugas selesai untuk ditampilkan.</div>
                )}
            </motion.div>
        </div>
    );
}
