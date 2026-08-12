import { motion } from 'framer-motion';

export default function MavaLoader({ text = "Memuat data MAVA..." }) {
  // Konfigurasi untuk 4 kotak kecil yang menari
  const containerVariants = {
    start: {
      transition: {
        staggerChildren: 0.15, // Jeda waktu antar kotak (efek gelombang)
      },
    },
    end: {
      transition: {
        staggerChildren: 0.15,
      },
    },
  };

  const dotVariants = {
    start: {
      y: "0%",
      opacity: 0.3,
      scale: 0.8,
    },
    end: {
      y: "100%", // Gerakan turun
      opacity: 1,
      scale: 1.1, // Sedikit membesar saat di bawah
      transition: {
        duration: 0.6,
        repeat: Infinity, // Putar terus
        repeatType: "reverse", // Balik lagi ke atas
        ease: "easeInOut", // Gerakan halus sinusoidal
      },
    },
  };

  return (
    <div className="flex flex-col items-center justify-center space-y-6 py-12 min-h-75">
      {/* Container Kotak Menari (The Dancer) */}
      <motion.div
        className="flex items-center gap-2.5 h-10" // Tinggi container untuk batasan gerak
        variants={containerVariants}
        initial="start"
        animate="end"
      >
        {/* Kita buat 4 kotak kecil dengan gradien MAVA */}
        {[...Array(4)].map((_, index) => (
          <motion.span
            key={index}
            className="w-4 h-8 rounded-full bg-linear-to-b from-[#DB3B96] to-[#8B5EA8] shadow-lg shadow-[#DB3B96]/20"
            variants={dotVariants}
          />
        ))}
      </motion.div>

      {/* Teks Loading yang Berdenyut Lembut */}
      <motion.p
        className="text-sm font-medium text-neutral-400 tracking-wide"
        initial={{ opacity: 0.4 }}
        animate={{ opacity: 1 }}
        transition={{
          duration: 1,
          repeat: Infinity,
          repeatType: "reverse",
          ease: "easeInOut",
        }}
      >
        {text}
      </motion.p>
    </div>
  );
}