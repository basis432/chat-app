// app.js

// Referensi elemen DOM
const loginSection = document.getElementById("loginSection");
const chatSection = document.getElementById("chatSection");
const loginBtn = document.getElementById("loginBtn");
const logoutBtn = document.getElementById("logoutBtn");
const namaInput = document.getElementById("namaInput");
const userName = document.getElementById("userName");
const userPIN = document.getElementById("userPIN");

const permintaanList = document.getElementById("permintaanList");
const pinInput = document.getElementById("pinInput");
const btnKirimPermintaan = document.getElementById("btnKirimPermintaan");

const friendsList = document.getElementById("friendsList");

const chatAreaSection = document.getElementById("chatAreaSection");
const chatArea = document.getElementById("chatArea");
const messageInput = document.getElementById("messageInput");
const sendBtn = document.getElementById("sendBtn");
const backToFriendsBtn = document.getElementById("backToFriendsBtn");
const chatPartnerName = document.getElementById("chatPartnerName");
const chatPartnerPIN = document.getElementById("chatPartnerPIN");

let currentUser = null;
let currentChatPartner = null;
let messagesListener = null;

/**
 * Generate PIN 6 digit unik
 */
function generatePIN() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Simpan user baru ke Firebase
 */
async function saveUser(user) {
  await db.ref(`users/${user.pin}`).set({
    nama: user.nama,
    online: true
  });
}

/**
 * Update status online user
 */
async function setOnlineStatus(pin, status) {
  await db.ref(`users/${pin}/online`).set(status);
}

/**
 * Login user
 */
async function login() {
  const nama = namaInput.value.trim();
  if (!nama) {
    alert("Mohon isi nama kamu.");
    return;
  }

  if (localStorage.getItem("pin") && localStorage.getItem("nama")) {
    // Login otomatis dari localStorage
    currentUser = {
      pin: localStorage.getItem("pin"),
      nama: localStorage.getItem("nama"),
    };
    await setOnlineStatus(currentUser.pin, true);
    afterLogin();
  } else {
    // Buat user baru
    const pin = generatePIN();

    // Cek apakah PIN sudah dipakai (loop bila perlu)
    let pinExists = await db.ref(`users/${pin}`).once("value");
    while (pinExists.exists()) {
      pin = generatePIN();
      pinExists = await db.ref(`users/${pin}`).once("value");
    }

    currentUser = { nama, pin };
    try {
      await saveUser(currentUser);
      localStorage.setItem("pin", pin);
      localStorage.setItem("nama", nama);
      await setOnlineStatus(pin, true);
      afterLogin();
    } catch (err) {
      alert("Gagal login: " + err.message);
    }
  }
}

/**
 * Setelah login sukses
 */
function afterLogin() {
  userName.textContent = currentUser.nama;
  userPIN.textContent = currentUser.pin;
  loginSection.classList.add("hidden");
  chatSection.classList.remove("hidden");
  chatAreaSection.classList.add("hidden");
  loadPermintaan();
  loadFriends();
}

/**
 * Logout user
 */
async function logout() {
  if (!currentUser) return;
  await setOnlineStatus(currentUser.pin, false);
  localStorage.clear();
  location.reload();
}

/**
 * Kirim permintaan pertemanan
 */
async function kirimPermintaan() {
  const pinTeman = pinInput.value.trim();

  if (!pinTeman) {
    alert("Masukkan PIN teman.");
    return;
  }
  if (pinTeman === currentUser.pin) {
    alert("Tidak bisa mengirim permintaan ke diri sendiri.");
    return;
  }

  // Cek apakah PIN teman ada
  const userSnap = await db.ref(`users/${pinTeman}`).once("value");
  if (!userSnap.exists()) {
    alert("PIN teman tidak ditemukan.");
    return;
  }

  // Cek sudah jadi teman
  const friendSnap = await db.ref(`users/${currentUser.pin}/friends/${pinTeman}`).once("value");
  if (friendSnap.exists()) {
    alert("Sudah menjadi teman.");
    return;
  }

  // Cek sudah kirim permintaan
  const requestSentSnap = await db.ref(`requests/${pinTeman}/${currentUser.pin}`).once("value");
  if (requestSentSnap.exists()) {
    alert("Permintaan sudah dikirim sebelumnya.");
    return;
  }

  await db.ref(`requests/${pinTeman}/${currentUser.pin}`).set(true);
  alert("Permintaan pertemanan berhasil dikirim.");
  pinInput.value = "";
}

/**
 * Load permintaan pertemanan masuk dan render
 */
function loadPermintaan() {
  db.ref(`requests/${currentUser.pin}`).on("value", async (snapshot) => {
    permintaanList.innerHTML = "";
    const requests = snapshot.val();

    if (!requests) {
      permintaanList.innerHTML = "<em>Tidak ada permintaan.</em>";
      return;
    }

    for (const pinPengirim of Object.keys(requests)) {
      const namaSnap = await db.ref(`users/${pinPengirim}/nama`).once("value");
      const namaPengirim = namaSnap.val() || pinPengirim;

      const div = document.createElement("div");
      div.classList.add("request-item");
      div.textContent = `${namaPengirim} (PIN: ${pinPengirim})`;

      const btnTerima = document.createElement("button");
      btnTerima.textContent = "Terima";
      btnTerima.classList.add("btn-accept");
      btnTerima.onclick = () => terimaPermintaan(pinPengirim);

      const btnTolak = document.createElement("button");
      btnTolak.textContent = "Tolak";
      btnTolak.classList.add("btn-reject");
      btnTolak.onclick = () => tolakPermintaan(pinPengirim);

      div.appendChild(btnTerima);
      div.appendChild(btnTolak);
      permintaanList.appendChild(div);
    }
  });
}

/**
 * Terima permintaan pertemanan
 */
async function terimaPermintaan(pinPengirim) {
  try {
    // Update friends dan hapus request
    let updates = {};
    updates[`users/${currentUser.pin}/friends/${pinPengirim}`] = true;
    updates[`users/${pinPengirim}/friends/${currentUser.pin}`] = true;
    updates[`requests/${currentUser.pin}/${pinPengirim}`] = null;

    await db.ref().update(updates);
    alert("Permintaan diterima.");
    loadFriends();
  } catch (err) {
    alert("Gagal terima permintaan: " + err.message);
  }
}

/**
 * Tolak permintaan
 */
async function tolakPermintaan(pinPengirim) {
  try {
    await db.ref(`requests/${currentUser.pin}/${pinPengirim}`).remove();
    alert("Permintaan ditolak.");
  } catch (err) {
    alert("Gagal tolak permintaan: " + err.message);
  }
}

/**
 * Load daftar teman dan render
 */
function loadFriends() {
  db.ref(`users/${currentUser.pin}/friends`).on("value", async (snapshot) => {
    friendsList.innerHTML = "";
    const friends = snapshot.val();

    if (!friends) {
      friendsList.innerHTML = "<li><em>Belum ada teman</em></li>";
      return;
    }

    for (const pinTeman of Object.keys(friends)) {
      const namaSnap = await db.ref(`users/${pinTeman}/nama`).once("value");
      const namaTeman = namaSnap.val() || pinTeman;

      const li = document.createElement("li");
      li.textContent = `${namaTeman} (PIN: ${pinTeman})`;
      li.style.cursor = "pointer";
      li.onclick = () => bukaChatTeman(pinTeman, namaTeman);

      friendsList.appendChild(li);
    }
  });
}

/**
 * Buka chat dengan teman tertentu
 */
function bukaChatTeman(pinTeman, namaTeman) {
  currentChatPartner = { pin: pinTeman, nama: namaTeman };
  chatPartnerName.textContent = namaTeman;
  chatPartnerPIN.textContent = pinTeman;

  chatAreaSection.classList.remove("hidden");
  chatSection.querySelector("#permintaanSection").classList.add("hidden");
  chatSection.querySelector("#cariTemanSection").classList.add("hidden");
  chatSection.querySelector("#friendsSection").classList.add("hidden");

  loadChatMessages(pinTeman);
}

/**
 * Sembunyikan area chat dan tampilkan daftar teman & lainnya
 */
function sembunyikanChatArea() {
  currentChatPartner = null;
  chatAreaSection.classList.add("hidden");
  chatSection.querySelector("#permintaanSection").classList.remove("hidden");
  chatSection.querySelector("#cariTemanSection").classList.remove("hidden
