// app.js
import { auth, db } from "./firebase-config.js";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  onAuthStateChanged,
  signOut,
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

import { ref, set, get, child, update } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js";

const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const authDiv = document.getElementById("auth");
const appDiv = document.getElementById("app");
const userEmailSpan = document.getElementById("userEmail");
const userPINSpan = document.getElementById("userPIN");

// Fungsi buat PIN acak 6 karakter
function generateRandomPIN(length = 6) {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let pin = "";
  for (let i = 0; i < length; i++) {
    pin += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return pin;
}

// Fungsi tampilkan app saat user sudah login
function showApp(user, pin) {
  authDiv.style.display = "none";
  appDiv.style.display = "block";
  userEmailSpan.textContent = user.email;
  userPINSpan.textContent = pin;
}

// Daftar user baru
export async function register() {
  const email = emailInput.value.trim();
  const password = passwordInput.value.trim();

  if (!email || !password) {
    alert("Email dan password harus diisi");
    return;
  }

  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    // Buat PIN acak unik
    const pin = generateRandomPIN();

    // Simpan user dan PIN di Realtime Database
    await set(ref(db, "users/" + user.uid), {
      email: user.email,
      pin: pin,
    });

    // Simpan index PIN ke UID
    await set(ref(db, "pins/" + pin), user.uid);

    alert("Pendaftaran berhasil! PIN kamu: " + pin);
    showApp(user, pin);
  } catch (error) {
    alert("Gagal daftar: " + error.message);
  }
}

// Login user
export async function login() {
  const email = emailInput.value.trim();
  const password = passwordInput.value.trim();

  if (!email || !password) {
    alert("Email dan password harus diisi");
    return;
  }

  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    // Ambil PIN user dari database
    const snapshot = await get(ref(db, "users/" + user.uid));
    if (!snapshot.exists()) {
      alert("Data user tidak ditemukan");
      return;
    }
    const userData = snapshot.val();

    showApp(user, userData.pin);
  } catch (error) {
    alert("Gagal login: " + error.message);
  }
}

// Auto deteksi login state
onAuthStateChanged(auth, async (user) => {
  if (user) {
    // Ambil PIN dari DB saat reload halaman
    const snapshot = await get(ref(db, "users/" + user.uid));
    if (snapshot.exists()) {
      const userData = snapshot.val();
      showApp(user, userData.pin);
    }
  } else {
    authDiv.style.display = "block";
    appDiv.style.display = "none";
  }
});
