/*
 * FILE: certificateLogic.js
 * DESKRIPSI: Logika PDF/Excel diupdate untuk Tipe Kompetensi baru
 */

const fs = require('fs');
const path = require('path');
const { PDFDocument, rgb, StandardFonts } = require('pdf-lib');
const { v4: uuidv4 } = require('uuid');
const qrcode = require('qrcode');
const xlsx = require('xlsx');

const outputPath = path.join(__dirname, 'public', 'certificates');
if (!fs.existsSync(outputPath)) {
    fs.mkdirSync(outputPath, { recursive: true });
}

function deletePdf(filePath) {
    if (!filePath) return;
    try {
        const fullPath = path.join(__dirname, 'public', filePath);
        if (fs.existsSync(fullPath)) fs.unlinkSync(fullPath);
    } catch (err) {
        console.error(`Gagal menghapus file ${filePath}:`, err);
    }
}

// === FUNGSI GENERATE PDF (DIMODIFIKASI TOTAL) ===
async function generatePdf(data, existingGuid = null) {
    // 1. Tentukan Template
    let templateName = '';
    if (data.certificateType === 'Kompetensi') {
        templateName = 'template-kompetensi.pdf'; // 
    } else if (data.certificateType === 'PKL') {
        templateName = 'template-pkl.pdf';
    } else {
        throw new Error('Tipe sertifikat tidak valid');
    }
    const templatePath = path.join(__dirname, 'template', templateName);
    if (!fs.existsSync(templatePath)) throw new Error(`Template tidak ditemukan: ${templateName}`);

    const templateBytes = fs.readFileSync(templatePath);
    const pdfDoc = await PDFDocument.load(templateBytes);
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    const pages = pdfDoc.getPages();
    const firstPage = pages[0];
    const { width } = firstPage.getSize();

    // 2. Generate GUID & QR Data
    const guid = existingGuid || `SERTIFIKAT-${uuidv4().toUpperCase()}-${new Date().getFullYear()}`;
    const qrUrl = `https://sertifikat-ssa.lskk.id/detail/${guid}`;
    const qrDataURL = await qrcode.toDataURL(qrUrl, { errorCorrectionLevel: 'H' });
    const qrImage = await pdfDoc.embedPng(qrDataURL);

    // 3. Ambil 'details'
    const details = data.details || {};

    // 4. === JALUR LOGIKA GAMBAR TERPISAH ===

    // --- JALUR 1: TIPE KOMPETENSI (BARU) ---
    if (data.certificateType === 'Kompetensi') {

        // --- DATA DARI PDF ANALISIS ---
        // data.name
        // details.programName, data.issueDate
        // data.certificateNumber
        // details.totalScore
        // details.predicate
        // details.subjects
        // ---------------------------------

        // (SESUAIKAN SEMUA KOORDINAT X/Y/SIZE DI BAWAH INI)

        // Gambar QR (Misal: pojok kiri bawah)
        firstPage.drawImage(qrImage, { x: 750, y: 510, width: 80, height: 80 });

        // Gambar Nama (Rata tengah)
        const nameSize = 23;
        const nameWidth = fontBold.widthOfTextAtSize(data.name, nameSize);
        firstPage.drawText(data.name, { // 
            x: 30, y: 360, size: nameSize, font: fontBold, color: rgb(1, 1, 1)
        });

        // Gambar Nama Program (Rata tengah)
        const programSize = 15;
        const programName = details.programName || '';
        const programWidth = fontBold.widthOfTextAtSize(programName, programSize);
        firstPage.drawText(programName, { // 
            x: 30, y: 290, size: programSize, font: fontBold, color: rgb(1, 1, 1)
        });

        // Gambar Tanggal
        firstPage.drawText(`${data.issueDate}`, { // 
            x: 75, y: 255, size: 12, font: font, color: rgb(255 / 255, 233 / 255, 59 / 255) // atau sekitar rgb(1, 0.913, 0.231)

        });

        // Gambar Info Kiri (Tabel Nilai)
        // firstPage.drawText("Certification ID:", { x: 50, y: 220, size: 10, font: fontBold });
        firstPage.drawText(data.certificateNumber, { x: 626, y: 432, size: 8, font: fontBold }); // 

        let yPos = 255;
        const subjects = details.subjects || [];
        if (subjects.length > 0) {
            for (const subject of subjects) { // 
                firstPage.drawText(subject.name, { x: 550, y: yPos, size: 9, font: font, maxWidth: 300 });
                firstPage.drawText(subject.score, { x: 778, y: yPos, size: 10, font: fontBold });
                yPos -= 20; // Beri jarak lebih untuk nama materi yang panjang
            }
        }

        // Gambar Info Kanan (Total Score & Predicate)
        const rightAlignX = width - 150;
        // firstPage.drawText("TOTAL SCORE", { x: rightAlignX, y: 300, size: 12, font: fontBold });
        firstPage.drawText(details.totalScore || 'N/A', { x: 665, y: 370, size: 18, font: fontBold }); // 

        // firstPage.drawText("PREDICATE", { x: rightAlignX, y: 250, size: 12, font: fontBold });
        firstPage.drawText(details.predicate || 'N/A', { x: 620, y: 300, size: 18, font: fontBold }); // 


        // --- JALUR 2: TIPE PKL (Tidak Berubah) ---
    } else if (data.certificateType === 'PKL') {

        // Gambar QR (posisi PKL) 
        firstPage.drawImage(qrImage, { x: width - 100, y: 390, width: 80, height: 80 });

        // Gambar Nama (posisi PKL) 
        const nameSize = 28;
        firstPage.drawText(data.name, {
            x: 140, y: 310, size: nameSize, font: fontBold, color: rgb(0, 0, 0),
        });

        // Gambar Info Umum (posisi PKL)
        firstPage.drawText(data.certificateNumber, {
            x: 550, y: 127, size: 9, font: font
        });

        // Gambar Info Spesifik PKL (Halaman 1) 
        if (pages.length < 2) throw new Error('Template PKL harus memiliki 2 halaman.');
        const secondPage = pages[1];
        const { height: heightP2 } = secondPage.getSize();

        const institution = details.institution || '';
        const activityDesc = details.activityDescription || '';
        const instSize = 16;
        firstPage.drawText(institution, {
            x: 140, y: 250, size: instSize, font: fontBold, color: rgb(0, 0, 0), maxWidth: width - 300
        });

        // Logika Pecah Baris (dari permintaan Anda sebelumnya)
        const breakText = "(PT. LSKK)";
        const breakIndex = activityDesc.indexOf(breakText);
        let line1 = `Pada Kegiatan ${activityDesc}`;
        let line2 = "";
        if (breakIndex !== -1) {
            const splitPoint = breakIndex + breakText.length;
            line1 = `Pada Kegiatan ${activityDesc.substring(0, splitPoint)}`;
            line2 = activityDesc.substring(splitPoint).trim();
        }
        firstPage.drawText(line1, { x: 140, y: 225, size: 10, font: font, maxWidth: width - 250 });
        if (line2) {
            firstPage.drawText(line2, { x: 140, y: 210, size: 10, font: font, maxWidth: width - 250 });
        }

        // Gambar Info Spesifik PKL (Halaman 2) 
        const keterampilan = details.nilaiKeterampilan || [];
        const sikap = details.nilaiSikap || [];
        const pembimbing = details.pembimbing || '';
        let yPos = heightP2 - 100;

        // Tabel Keterampilan
        secondPage.drawText('NILAI KETRAMPILAN', { x: 380, y: yPos, size: 14, font: fontBold });
        yPos -= 50;
        secondPage.drawText('No', { x: 200, y: yPos, size: 12, font: fontBold });
        secondPage.drawText('Materi Keterampilan', { x: 250, y: yPos, size: 12, font: fontBold });
        secondPage.drawText('Nilai', { x: 650, y: yPos, size: 12, font: fontBold });
        yPos -= 20;
        keterampilan.forEach((item, index) => {
            secondPage.drawText(`${index + 1}.`, { x: 200, y: yPos, size: 12, font: font });
            secondPage.drawText(item.name, { x: 250, y: yPos, size: 12, font: font });
            secondPage.drawText(item.score, { x: 650, y: yPos, size: 12, font: font });
            yPos -= 20;
        });

        // Tabel Sikap
        yPos -= 50;
        secondPage.drawText('NILAI SIKAP', { x: 380, y: yPos, size: 14, font: fontBold });
        yPos -= 50;
        secondPage.drawText('No', { x: 200, y: yPos, size: 12, font: fontBold });
        secondPage.drawText('Materi Sikap', { x: 250, y: yPos, size: 12, font: fontBold });
        secondPage.drawText('Nilai', { x: 650, y: yPos, size: 12, font: fontBold });
        yPos -= 20;
        sikap.forEach((item, index) => {
            secondPage.drawText(`${index + 1}.`, { x: 200, y: yPos, size: 12, font: font });
            secondPage.drawText(item.name, { x: 250, y: yPos, size: 12, font: font });
            secondPage.drawText(item.score, { x: 650, y: yPos, size: 12, font: font });
            yPos -= 20;
        });

        // Pembimbing (Anda mengomentari ini, saya biarkan)
        // secondPage.drawText('Pembimbing Industri', { x: 400, y: 150, size: 12, font: font });
        // secondPage.drawText(pembimbing, { x: 400, y: 80, size: 12, font: fontBold, });
    }
    // === AKHIR JALUR LOGIKA GAMBAR ===

    // 6. Simpan file
    const pdfBytes = await pdfDoc.save();
    const slug = data.name.toLowerCase().replace(/[\s,.'"]/g, '-').replace(/[^a-z0-N9-]/g, '');
    const safeCertificateNumber = data.certificateNumber.replace(/[\/\\]/g, '-');
    const outputFileName = `${data.certificateType}-${safeCertificateNumber}-${slug}.pdf`;
    const publicAccessPath = `/certificates/${outputFileName}`;

    fs.writeFileSync(path.join(outputPath, outputFileName), pdfBytes);

    return { ...data, guid: guid, filePath: publicAccessPath };
}

// === FUNGSI PARSE EXCEL (DIMODIFIKASI) ===
function parseExcelBuffer(buffer) {
    const workbook = xlsx.read(buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const jsonData = xlsx.utils.sheet_to_json(worksheet);

    return jsonData.map(row => {
        const certificateType = row.Tipe;
        let details = {};

        if (certificateType === 'Kompetensi') {
            let subjects = [];
            try {
                // Kolom Excel harus 'DaftarMateri'
                if (row.DaftarMateri) subjects = JSON.parse(row.DaftarMateri);
            } catch (e) { console.warn(`Gagal parse materi: ${e.message}`); }
            details = {
                programName: row.ProgramName, // 
                totalScore: row.TotalScore, // 
                predicate: row.Predicate, // 
                subjects: subjects // [{"name":"...", "score":"..."}]
            };
        } else if (certificateType === 'PKL') {
            let nilaiKeterampilan = [], nilaiSikap = [];
            try {
                if (row.NilaiKeterampilan) nilaiKeterampilan = JSON.parse(row.NilaiKeterampilan);
                if (row.NilaiSikap) nilaiSikap = JSON.parse(row.NilaiSikap);
            } catch (e) { console.warn(`Gagal parse nilai PKL: ${e.message}`); }

            details = {
                institution: row.Institusi,
                activityDescription: row.DeskripsiKegiatan,
                pembimbing: row.Pembimbing,
                nilaiKeterampilan: nilaiKeterampilan,
                nilaiSikap: nilaiSikap
            };
        }

        return {
            name: row.Nama,
            certificateNumber: row.NomorSertifikat,
            certificateType: certificateType,
            issueDate: row.Tanggal,
            details: details
        };
    });
}

module.exports = {
    generatePdf,
    parseExcelBuffer,
    deletePdf
};