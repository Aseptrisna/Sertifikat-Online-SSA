/*
 * FILE: createAdmin.js
 * DESKRIPSI: Jalankan file ini SATU KALI untuk membuat user admin
 * CARA MENJALANKAN: node createAdmin.js
 */
require("dotenv").config();
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const readline = require("readline");

// --- KONFIGFIGURASI ---
const MONGO_URI = process.env.MONGO_URI;
const ADMIN_USERNAME = "admin"; // Ganti username jika perlu
// ---------------------

// 1. Buat Skema User (harus sama dengan di server.js)
const userSchema = new mongoose.Schema(
  {
    username: { type: String, required: true, unique: true, lowercase: true },
    password: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
  },
  { versionKey: false, timestamps: true }
);

// 2. Hash password sebelum disimpan
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});
const User = mongoose.model("User", userSchema);

// 3. Fungsi untuk bertanya (interaktif)
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const askPassword = () => {
  return new Promise((resolve) => {
    rl.question(
      `Masukkan password baru untuk user '${ADMIN_USERNAME}': `,
      (password) => {
        resolve(password);
        rl.close();
      }
    );
  });
};

// 4. Fungsi Utama
async function createAdmin() {
  console.log("Menghubungkan ke MongoDB...");
  try {
    await mongoose.connect(MONGO_URI);
    console.log("Berhasil terhubung ke MongoDB.");

    const password = await askPassword();
    if (!password) {
      console.error("Password tidak boleh kosong.");
      return;
    }

    // Cek jika user sudah ada
    const existingUser = await User.findOne({ username: ADMIN_USERNAME });

    if (existingUser) {
      console.log(`User '${ADMIN_USERNAME}' sudah ada. Mengupdate password...`);
      existingUser.password = password; // pre-save hook akan hash password ini
      await existingUser.save();
      console.log("Password berhasil diupdate.");
    } else {
      console.log(`Membuat user baru '${ADMIN_USERNAME}'...`);
      const newUser = new User({
        username: ADMIN_USERNAME,
        password: password,
      });
      await newUser.save();
      console.log("User admin berhasil dibuat.");
    }
  } catch (err) {
    console.error("Error:", err.message);
  } finally {
    await mongoose.connection.close();
  }
}

createAdmin();
