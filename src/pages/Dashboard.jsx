import { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";
import { LayoutDashboard, CheckCircle2, Clock, AlertTriangle, ListTodo } from "lucide-react";
import { motion } from "framer-motion";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell } from "recharts";
import MavaLoader from "../components/MavaLoader";

export default function Dashboard({ userRole, userId }) {
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({ total: 0, pendingReview: 0, completed: 0, overdue: 0 });
    const [chartData, setChartData] = useState([]);
    const [completedChartData, setCompletedChartData] = useState([]); // State untuk grafik Selesai dikembalikan

    const isManager = userRole === "Manager";

    useEffect(() => {
        let ignore = false;
        async function fetchDashboardData() {
            try {
                let query = supabase.from("tasks").select(`*, assignee:users!tasks_assignee_id_fkey(full_name)`).order("created_at", { ascending: false });

                // Jika Karyawan, HANYA ambil tugas miliknya
                if (!isManager) {
                    query = query.eq("assignee_id", userId);
                }

                const { data: tasks, error } = await query;
                if (error) throw error;

                if (!ignore && tasks) {
                    const now = new Date();
                    const total = tasks.length;
                    const pendingReview = tasks.filter((t) => t.status === "In Review").length;
                    const completed = tasks.filter((t) => t.status === "Completed").length;
                    const overdue = tasks.filter((t) => t.due_date && new Date(t.due_date) < now && t.status !== "Completed").length;

                    setStats({ total, pendingReview, completed, overdue });

                    if (isManager) {
                        // GRAFIK MANAGER 1: Beban Kerja Aktif
                        const workload = {};
                        // GRAFIK MANAGER 2: Tugas Selesai
                        const completedWorkload = {};

                        tasks.forEach((task) => {
                            const name = task.assignee?.full_name || "Unassigned";
                            if (task.status !== "Completed") {
                                workload[name] = (workload[name] || 0) + 1;
                            } else {
                                completedWorkload[name] = (completedWorkload[name] || 0) + 1;
                            }
                        });

                        setChartData(
                            Object.keys(workload).map((name) => ({
                                name: name.substring(0, 10) + (name.length > 10 ? "..." : ""),
                                "Jumlah Tugas": workload[name],
                            })),
                        );

                        setCompletedChartData(
                            Object.keys(completedWorkload).map((name) => ({
                                name: name.substring(0, 10) + (name.length > 10 ? "..." : ""),
                                "Tugas Selesai": completedWorkload[name],
                            })),
                        );
                    } else {
                        // GRAFIK KARYAWAN: Distribusi Status Pribadi
                        const statusCount = { "To Do": 0, "In Progress": 0, Pending: 0, "In Review": 0 };
                        tasks.forEach((task) => {
                            if (task.status !== "Completed" && statusCount[task.status] !== undefined) {
                                statusCount[task.status] += 1;
                            }
                        });
                        setChartData(
                            Object.keys(statusCount).map((status) => ({
                                name: status,
                                "Jumlah Tugas": statusCount[status],
                            })),
                        );
                    }
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
    }, [userRole, userId, isManager]);

    if (loading) return <MavaLoader text="Memuat Analytics..." />;

    const kpiCards = [
        { title: isManager ? "Total Tugas Agensi" : "Total Tugas Saya", value: stats.total, icon: ListTodo, color: "text-blue-400", bg: "bg-blue-500/10", border: "border-blue-500/20" },
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
                    <h2 className="text-2xl font-bold text-white">{isManager ? "Dashboard Manager" : "Performa Pribadi"}</h2>
                    <p className="text-sm text-neutral-400">{isManager ? "Pantau beban kerja dan performa seluruh tim." : "Ringkasan performa penyelesaian tugas Anda."}</p>
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

            {/* GRAFIK 1: BEBAN KERJA AKTIF / KARYAWAN */}
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }} className="bg-neutral-900/50 border border-neutral-800 rounded-2xl p-6 h-100">
                <h3 className="text-sm font-bold text-white mb-6 uppercase tracking-wider">{isManager ? "Beban Kerja Aktif per Karyawan" : "Distribusi Tugas Saya (Belum Selesai)"}</h3>
                {chartData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#262626" vertical={false} />
                            <XAxis dataKey="name" stroke="#737373" fontSize={12} tickLine={false} axisLine={false} />
                            <YAxis stroke="#737373" fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} />
                            <Tooltip cursor={{ fill: "#262626" }} contentStyle={{ backgroundColor: "#171717", borderColor: "#404040", borderRadius: "12px", color: "#fff" }} />
                            <Bar dataKey="Jumlah Tugas" radius={[6, 6, 0, 0]} barSize={40}>
                                {chartData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={isManager ? "#DB3B96" : "#8B5EA8"} />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                ) : (
                    <div className="h-full flex items-center justify-center text-neutral-500 text-sm">Belum ada tugas untuk ditampilkan.</div>
                )}
            </motion.div>

            {/* GRAFIK 2: TUGAS SELESAI (HANYA MUNCUL UNTUK MANAGER) */}
            {isManager && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }} className="bg-neutral-900/50 border border-neutral-800 rounded-2xl p-6 h-100">
                    <h3 className="text-sm font-bold text-white mb-6 uppercase tracking-wider">Produktivitas Selesai per Karyawan</h3>
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
                        <div className="h-full flex items-center justify-center text-neutral-500 text-sm">Belum ada tugas selesai.</div>
                    )}
                </motion.div>
            )}
        </div>
    );
}
