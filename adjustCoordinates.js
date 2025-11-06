/*
 * FILE: adjustCoordinates.js
 * DESKRIPSI: Skrip manual untuk menguji & menyesuaikan koordinat PDF.
 * CARA MENJALANKAN: node adjustCoordinates.js
 *
 * Jalankan ini setiap kali Anda mengubah koordinat (x, y, size) 
 * di dalam file 'certificateLogic.js' untuk melihat hasilnya.
 */

// Impor fungsi utama dari certificateLogic
const { generatePdf } = require('./certificateLogic');

// --- DATA UJI COBA (MOCK DATA) ---

// 1. Data Uji Coba untuk Tipe PKL
// (Berdasarkan template PKL yang Anda berikan)
const mockPklData = {
    name: "Asep Trisna Setiawan, S.Kom., M.T",
    certificateNumber: "LSKK/PKL/001", // Menguji perbaikan slash '/'
    issueDate: "6 November 2025",
    certificateType: "PKL",
    details: {
        institution: "Universitas Bandar Lampung", // 
        activityDescription: "Praktik Kerja Lapangan (PKL) yang diselenggarakan oleh PT. Langgeng Sejahtera Kreasi Komputasi (PT. LSKK) Periode Februari - Agustus 2025", // 
        pembimbing: "Asep Trisna Setiawan, M.T", // 
        nilaiKeterampilan: [ // 
            { name: "Pemrograman Web", score: "85" },
            { name: "Basis Data", score: "83" },
            { name: "Manajemen Proyek", score: "88" },
            { name: "Pemrograman Web", score: "85" },
            { name: "Basis Data", score: "83" },
            { name: "Manajemen Proyek", score: "88" }
        ],
        nilaiSikap: [ // 
            { name: "Disiplin", score: "85" },
            { name: "Kerjasama", score: "80" },
            { name: "Disiplin", score: "85" },
            { name: "Kerjasama", score: "80" },
        ]
    }
};

// 2. Data Uji Coba untuk Tipe Kompetensi
const mockKompetensiData = {
    name: "Asep Trisna Setiawan, S.Kom., M.T",
    certificateNumber: "SSA/KOMP/002",
    issueDate: "7 November 2025",
    certificateType: "Kompetensi",
    details: {
        overallScore: "A+",
        programName:"Dasar - Dasar Internet of Things ( Smart Watering )",
        totalScore:"86",
        predicate:" Junior Level",
        subjects: [
            { name: "Dasar Internet of Things", score: "90" },
            { name: "Cloud Computing", score: "88" },
            { name: "Network Security", score: "85" }
        ]
    }
};

// --- FUNGSI GENERATOR UTAMA ---

async function runManualGenerator() {
    console.log("Memulai generator manual...");

    try {
        // Hapus parameter 'null' jika Anda ingin menguji update (dengan GUID)
        
        // Uji Tipe PKL
        console.log("\n1. Membuat Sertifikat PKL (template-pkl.pdf)...");
        const pklData = await generatePdf(mockPklData, null);
        console.log(`   -> Selesai! Cek file di: ${pklData.filePath}`);
        
        // Uji Tipe Kompetensi
        console.log("\n2. Membuat Sertifikat Kompetensi (template-kompetensi.pdf)...");
        const kompData = await generatePdf(mockKompetensiData, null);
        console.log(`   -> Selesai! Cek file di: ${kompData.filePath}`);

        console.log("\n========================================================");
        console.log("BERHASIL!");
        console.log("Silakan periksa file PDF di folder 'public/certificates'.");
        console.log("\nWorkflow Anda sekarang:");
        console.log("1. Buka PDF yang baru dibuat.");
        console.log("2. Jika posisi tidak pas, edit koordinat (x, y, size) di 'certificateLogic.js'.");
        console.log("3. Simpan 'certificateLogic.js'.");
        console.log("4. Jalankan ulang 'node adjustCoordinates.js' ini.");
        console.log("========================================================");

    } catch (error) {
        console.error("\n--- TERJADI ERROR ---");
        console.error(error.message);
        console.error("---------------------");
    }
}

// Jalankan fungsi
runManualGenerator();