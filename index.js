/*
 * FILE: server.js
 * DESKRIPSI: Server utama dengan Session Login, API Admin, dan Skema Fleksibel
 */

require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const path = require("path");
const multer = require("multer");
const fs = require("fs");
const bcrypt = require("bcrypt");
const session = require("express-session");
const MongoStore = require("connect-mongo");
const {
  generatePdf,
  parseExcelBuffer,
  deletePdf,
} = require("./certificateLogic");
const { timeStamp } = require("console");

// --- KONFIGURASI ---
const app = express();
const PORT = process.env.PORT || 3000;
const MONGO_URI = process.env.MONGO_URI;
const SESSION_SECRET = process.env.SESSION_SECRET;
if (!SESSION_SECRET) {
  console.error("Error: SESSION_SECRET tidak diatur di file .env");
  process.exit(1);
}
const upload = multer({ storage: multer.memoryStorage() });
// ---------------------

// 1. Hubungkan ke MongoDB
mongoose
  .connect(MONGO_URI)
  .then(() => console.log("Berhasil terhubung ke MongoDB."))
  .catch((err) => console.error("Gagal terhubung ke MongoDB:", err));

// 2. Skema dan Model
// Skema Sertifikat (FLEKSIBEL)
const certificateSchema = new mongoose.Schema(
  {
    guid: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    certificateNumber: { type: String, required: true, unique: true },
    issueDate: { type: String, required: true },
    certificateType: {
      type: String,
      required: true,
      enum: ["Kompetensi", "PKL"],
    },
    filePath: { type: String, required: true },

    // Bidang fleksibel untuk data unik per tipe
    details: { type: mongoose.Schema.Types.Mixed, default: {} },

    createdAt: { type: Date, default: Date.now },
  },
  { versionKey: false, timeStamp: true }
);
if (mongoose.models.Certificate) delete mongoose.models.Certificate;
const Certificate = mongoose.model("Certificate", certificateSchema);

// Skema User
const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true, lowercase: true },
  password: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
});
if (mongoose.models.User) delete mongoose.models.User;
const User = mongoose.model("User", userSchema);

// 3. Middleware
app.use(express.static(path.join(__dirname, "public")));
app.use(express.json());
app.use(express.urlencoded({ extended: true })); // Penting untuk form login

// 4. Konfigurasi Sesi
app.use(
  session({
    secret: SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
      mongoUrl: MONGO_URI,
      collectionName: "sessions",
    }),
    cookie: {
      maxAge: 1000 * 60 * 60 * 24, // Sesi berlaku 1 hari
      httpOnly: true,
    },
  })
);

// 5. Middleware Autentikasi (Gatekeeper)
const isAuthenticated = (req, res, next) => {
  if (req.session.user) {
    return next();
  }
  res.redirect("/login");
};

// 6. Rute Halaman (HTML)
// Rute Publik
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});
app.get("/detail/:guid", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "detail.html"));
});

// --- RUTE LOGIN/LOGOUT ---
app.get("/login", (req, res) => {
  if (req.session.user) {
    return res.redirect("/admin-manage");
  }
  res.sendFile(path.join(__dirname, "public", "login.html"));
});

app.post("/login", async (req, res) => {
  const { username, password } = req.body;
  try {
    const user = await User.findOne({ username: username.toLowerCase() });
    if (!user) {
      return res.redirect("/login?error=1");
    }
    const isMatch = await bcrypt.compare(password, user.password);
    if (isMatch) {
      req.session.user = { id: user._id, username: user.username };
      res.redirect("/admin-manage");
    } else {
      return res.redirect("/login?error=1");
    }
  } catch (err) {
    console.error(err);
    res.redirect("/login?error=1");
  }
});

app.get("/logout", (req, res) => {
  req.session.destroy((err) => {
    if (err) return console.log(err);
    res.redirect("/login");
  });
});
// --- AKHIR RUTE LOGIN/LOGOUT ---

// --- RUTE ADMIN (DILINDUNGI) ---
app.get("/admin", (req, res) => {
  res.redirect("/admin-create");
});
app.get("/admin-create", isAuthenticated, (req, res) => {
  res.sendFile(path.join(__dirname, "public", "admin-create.html"));
});
app.get("/admin-manage", isAuthenticated, (req, res) => {
  res.sendFile(path.join(__dirname, "public", "admin-manage.html"));
});
// --- AKHIR RUTE ADMIN ---

// 7. Rute API (JSON)
// API Publik
app.get("/all-certificates", async (req, res) => {
  try {
    const allCertificates = await Certificate.find({}).sort({ name: 1 });
    res.json(allCertificates);
  } catch (error) {
    res.status(500).json({ message: "Error server." });
  }
});
// API Verifikasi
app.get("/api/certificate/:guid", async (req, res) => {
  try {
    const certificate = await Certificate.findOne({ guid: req.params.guid });
    if (!certificate)
      return res.status(404).json({ message: "Sertifikat tidak ditemukan" });
    res.json(certificate);
  } catch (error) {
    res.status(500).json({ message: "Error server." });
  }
});

// 8. Rute API ADMIN (DILINDUNGI)
// API Get List (Search + Pagination)
app.get("/admin/certificates", isAuthenticated, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const search = req.query.search || "";
    const skip = (page - 1) * limit;

    const query = {};
    if (search) {
      query.name = new RegExp(search, "i");
    }

    const certificates = await Certificate.find(query)
      .sort({ name: 1 })
      .skip(skip)
      .limit(limit);

    const totalCount = await Certificate.countDocuments(query);

    res.json({
      certificates,
      totalPages: Math.ceil(totalCount / limit),
      currentPage: page,
      totalCount,
    });
  } catch (error) {
    console.error("Error /admin/certificates:", error);
    res.status(500).json({ message: error.message });
  }
});

// API Create Form
app.post("/admin/create-form", isAuthenticated, async (req, res) => {
  try {
    const data = req.body;
    const fullData = await generatePdf(data, null);
    const newCertificate = new Certificate(fullData);
    await newCertificate.save();
    console.log(`Dibuat via form: ${fullData.name}`);
    res
      .status(201)
      .json({ message: "Sertifikat berhasil dibuat", data: fullData });
  } catch (error) {
    console.error("Error create-form:", error);
    res.status(500).json({ message: error.message });
  }
});

// API Upload Excel
app.post(
  "/admin/upload-excel",
  isAuthenticated,
  upload.single("excelFile"),
  async (req, res) => {
    if (!req.file)
      return res.status(400).json({ message: "File tidak ditemukan" });
    try {
      const rows = parseExcelBuffer(req.file.buffer);
      let createdCount = 0,
        errors = [];
      for (const data of rows) {
        try {
          const fullData = await generatePdf(data, null);
          await Certificate.findOneAndUpdate(
            { certificateNumber: fullData.certificateNumber },
            fullData,
            { upsert: true, new: true }
          );
          createdCount++;
        } catch (err) {
          errors.push(`Gagal proses ${data.name || "N/A"}: ${err.message}`);
        }
      }
      res.status(201).json({
        message: `Selesai. Berhasil: ${createdCount}. Gagal: ${errors.length}`,
        errors: errors,
      });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }
);

// API Delete
app.delete("/admin/delete/:id", isAuthenticated, async (req, res) => {
  try {
    const { id } = req.params;
    const certificate = await Certificate.findById(id);
    if (!certificate)
      return res.status(404).json({ message: "Sertifikat tidak ditemukan" });
    deletePdf(certificate.filePath);
    await Certificate.findByIdAndDelete(id);
    res.json({ message: "Sertifikat berhasil dihapus" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// API Edit
app.put("/admin/edit/:id", isAuthenticated, async (req, res) => {
  try {
    const { id } = req.params;
    const data = req.body;
    const oldCertificate = await Certificate.findById(id);
    if (!oldCertificate)
      return res.status(404).json({ message: "Sertifikat tidak ditemukan" });

    const fullData = await generatePdf(data, oldCertificate.guid);
    await Certificate.findByIdAndUpdate(id, fullData, { new: true });
    deletePdf(oldCertificate.filePath);
    res.json({ message: "Sertifikat berhasil diupdate" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// 9. Jalankan Server
app.listen(PORT, () => {
  console.log(`Server berjalan di http://localhost:${PORT}`);
  console.log(`Halaman Login Admin di http://localhost:${PORT}/login`);
});
