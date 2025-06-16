// app.js

// Referensi elemen
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

let currentUser = null; // {nama, pin}
let currentChatPartner = null; // {nama, pin}
let messagesListener = null;

// Fungsi buat PIN 6 digit
function generatePIN() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Simpan user baru di Firebase
function saveUser(user) {
  return db.ref(`users/${user.pin}`).set({
    nama: user.nama,
    online: true
  });
}

// Set online status
function setOnlineStatus(pin, status) {
  return db.ref(`users/${pin}/online`).set(status);
}

// Login function
async function login() {
  const nama = namaInput.value.trim();
  if (!nama) return alert("Isi nama kamu!");

  if (localStorage.getItem("pin") && localStorage.getItem("nama")) {
    currentUser = {
      pin: localStorage.getItem("pin"),
      nama: localStorage.getItem("nama"),
    };
    await setOnlineStatus(currentUser.pin, true);
    afterLogin();
  } else {
    const pin = generatePIN();
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

// Setelah login
function afterLogin() {
  userName.textContent = currentUser.nama;
  userPIN.textContent = currentUser.pin;
  loginSection.style.display = "none";
  chatSection.style.display = "block";
  loadPermintaan();
  loadFriends();
  hideChatArea();
}

// Logout
async function logout() {
  if (currentUser) {
    await setOnlineStatus(currentUser.pin, false);
  }
  localStorage.clear();
  location.reload();
}

// Kirim permintaan pertemanan
async function kirimPermintaan() {
  const pinTeman = pinInput.value.trim();
  if (!pinTeman) return alert("Masukkan PIN teman!");

  if (pinTeman === currentUser.pin) {
    return alert("Tidak bisa kirim permintaan ke diri sendiri.");
  }

  // Cek apakah pin teman ada di database
  const userSnap = await db.ref(`users/${pinTeman}`).once("value");
  if (!userSnap.exists()) {
    return alert("PIN teman tidak ditemukan.");
  }

  // Cek apakah sudah teman
  const friendSnap = await db.ref(`users/${currentUser.pin}/friends/${pinTeman}`).once("value");
  if (friendSnap.exists()) {
    return alert("Sudah menjadi teman.");
  }

  // Cek apakah sudah mengirim permintaan sebelumnya
  const requestSentSnap = await db.ref(`requests/${pinTeman}/${currentUser.pin}`).once("value");
  if (requestSentSnap.exists()) {
    return alert("Permintaan sudah dikirim sebelumnya.");
  }

  // Simpan permintaan di requests
  await db.ref(`requests/${pinTeman}/${currentUser.pin}`).set(true);
  alert("Permintaan pertemanan berhasil dikirim.");
  pinInput.value = "";
}

// Load daftar permintaan masuk
function loadPermintaan() {
  db.ref(`requests/${currentUser.pin}`).on("value", (snapshot) => {
    permintaanList.innerHTML = "";
    const requests = snapshot.val();
    if (requests) {
      Object.keys(requests).forEach(async (pinPengirim) => {
        const namaSnap = await db.ref(`users/${pinPengirim}/nama`).once("value");
        const namaPengirim = namaSnap.val() || pinPengirim;

        const div = document.createElement("div");
        div.textContent = `${namaPengirim} (${pinPengirim})`;

        const terimaBtn = document.createElement("button");
        terimaBtn.textContent = "Terima";
        terimaBtn.onclick = () => terimaPermintaan(pinPengirim);

        const tolakBtn = document.createElement("button");
        tolakBtn.textContent = "Tolak";
        tolakBtn.onclick = () => tolakPermintaan(pinPengirim);

        div.appendChild(terimaBtn);
        div.appendChild(tolakBtn);
        permintaanList.appendChild(div);
      });
    }
  });
}

// Terima permintaan
async function terimaPermintaan(pinPengirim) {
  try {
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

// Tolak permintaan
async function tolakPermintaan(pinPengirim) {
  try {
    await db.ref(`requests/${currentUser.pin}/${pinPengirim}`).remove();
    alert("Permintaan ditolak.");
  } catch (err) {
    alert("Gagal tolak permintaan: " + err.message);
  }
}

// Load daftar teman
function loadFriends() {
  db.ref(`users/${currentUser.pin}/friends`).on("value", async (snapshot) => {
    friendsList.innerHTML = "";
    const friends = snapshot.val();
    if (friends) {
      for (const pinTeman of Object.keys(friends)) {
        const namaSnap = await db.ref(`users/${pinTeman}/nama`).once("value");
        const namaTeman = namaSnap.val() || pinTeman;

        const li = document.createElement("li");
        li.textContent = `${namaTeman} (${pinTeman})`;
        li.style.cursor = "pointer";
        li.onclick = () => bukaChatTeman(pinTeman, namaTeman);

        friendsList.appendChild(li);
      }
    } else {
      friendsList.innerHTML = "<i>Belum ada teman</i>";
    }
  });
}

// Buka chat dengan teman
function bukaChatTeman(pinTeman, namaTeman) {
  currentChatPartner = { pin: pinTeman, nama: namaTeman };
  chatPartnerName.textContent = namaTeman;
  chatPartnerPIN.textContent = pinTeman;

  loginSection.style.display = "none";
  chatSection.style.display = "block";
  chatAreaSection.style.display = "block";

  loadChatMessages(pinTeman);
}

// Sembunyikan area chat
function hideChatArea() {
  chatAreaSection.style.display = "none";
  currentChatPartner = null;
  chatArea.innerHTML = "";
}

// Load pesan chat antara dua user
function loadChatMessages(pinTeman) {
  if (messagesListener) {
    db.ref("messages").off("value", messagesListener);
  }

  // Ambil pesan dari node messages dengan key yang berisi pin user dan pin teman (unik)
  // Kita buat key room: urutkan pin supaya konsisten
  const roomKey = currentUser.pin < pinTeman
    ? `${currentUser.pin}_${pinTeman}`
    : `${pinTeman}_${currentUser.pin}`;

  messagesListener = db.ref(`messages/${roomKey}`).on("value", (snapshot) => {
    chatArea.innerHTML = "";
    const messages = snapshot.val();
    if (messages) {
      Object.values(messages).forEach((msg) => {
        const div = document.createElement("div");
        div.classList.add("message");
        div.classList.add(msg.pin === currentUser.pin ? "you" : "other");
        div.textContent = `${msg.nama}: ${msg.text}`;
        chatArea.appendChild(div);
      });
      chatArea.scrollTop = chatArea.scrollHeight;
    }
  });
}

// Kirim pesan
async function kirimPesan() {
  const text = messageInput.value.trim();
  if (!text) return;

  if (!currentChatPartner) {
    alert("Pilih teman dulu untuk mulai chat.");
    return;
  }

  // Cek apakah teman benar-benar teman
  const friendSnap = await db.ref(`users/${currentUser.pin}/friends/${currentChatPartner.pin}`).once("value");
  if (!friendSnap.exists()) {
    return alert("Kamu belum berteman dengan user ini.");
  }

  const roomKey = currentUser.pin < currentChatPartner.pin
    ? `${currentUser.pin}_${currentChatPartner.pin}`
    : `${currentChatPartner.pin}_${currentUser.pin}`;

  const newMsgRef = db.ref(`messages/${roomKey}`).push();
  await newMsgRef.set({
    pin: currentUser.pin,
    nama: currentUser.nama,
    text,
    timestamp: Date.now(),
  });

  messageInput.value = "";
}

// Event listeners
loginBtn.addEventListener("click", login);
logoutBtn.addEventListener("click", logout);
btnKirimPermintaan.addEventListener("click", kirimPermintaan);
sendBtn.addEventListener("click", kirimPesan);
backToFriendsBtn.addEventListener("click", () => {
  hideChatArea();
});

// Enter key support
namaInput.addEventListener("keypress", (e) => {
  if (e.key === "Enter") login();
});
messageInput.addEventListener("keypress", (e) => {
  if (e.key === "Enter") kirimPesan();
});
pinInput.addEventListener("keypress", (e) => {
  if (e.key === "Enter") kirimPermintaan();
});

// Auto login jika data ada di localStorage
window.onload = async () => {
  if (localStorage.getItem("pin") && localStorage.getItem("nama")) {
    currentUser = {
      pin: localStorage.getItem("pin"),
      nama: localStorage.getItem("nama"),
    };
    await setOnlineStatus(currentUser.pin, true);
    afterLogin();
  }
};
