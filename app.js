import { auth, db, storage } from "./firebase-config.js";

import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  onAuthStateChanged,
  signOut,
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

import {
  ref,
  set,
  get,
  child,
  push,
  onValue,
  update,
  remove,
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js";

import {
  ref as sRef,
  uploadBytes,
  getDownloadURL,
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-storage.js";

// ELEMENTS
const authDiv = document.getElementById("auth");
const appDiv = document.getElementById("app");

const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const btnRegister = document.getElementById("btnRegister");
const btnLogin = document.getElementById("btnLogin");
const btnLogout = document.getElementById("btnLogout");

const userEmailSpan = document.getElementById("userEmail");
const userPINSpan = document.getElementById("userPIN");

const inputFriendPIN = document.getElementById("inputFriendPIN");
const btnAddFriend = document.getElementById("btnAddFriend");
const friendRequestsList = document.getElementById("friendRequestsList");
const friendList = document.getElementById("friendList");

const chatWithSpan = document.getElementById("chatWith");
const chatMessagesDiv = document.getElementById("chatMessages");
const inputMessage = document.getElementById("inputMessage");
const inputFile = document.getElementById("inputFile");
const btnSendMessage = document.getElementById("btnSendMessage");

let currentUser = null;
let currentUserData = null;
let chatPartnerUID = null;
let chatPartnerData = null;

// Buat PIN acak 6 karakter
function generateRandomPIN(length = 6) {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let pin = "";
  for (let i = 0; i < length; i++) {
    pin += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return pin;
}

// DAFTAR
btnRegister.onclick = async () => {
  const email = emailInput.value.trim();
  const password = passwordInput.value.trim();

  if (!email || !password) {
    alert("Email dan password harus diisi");
    return;
  }
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    // Buat PIN unik
    let pin = generateRandomPIN();

    // Cek PIN sudah dipakai?
    let pinUsed = await get(ref(db, "pins/" + pin));
    while (pinUsed.exists()) {
      pin = generateRandomPIN();
      pinUsed = await get(ref(db, "pins/" + pin));
    }

    // Simpan user
    await set(ref(db, "users/" + user.uid), {
      email: user.email,
      pin: pin,
    });

    // Simpan index PIN ke UID
    await set(ref(db, "pins/" + pin), user.uid);

    alert("Pendaftaran berhasil! PIN kamu: " + pin);
  } catch (error) {
    alert("Gagal daftar: " + error.message);
  }
};

// LOGIN
btnLogin.onclick = async () => {
  const email = emailInput.value.trim();
  const password = passwordInput.value.trim();

  if (!email || !password) {
    alert("Email dan password harus diisi");
    return;
  }
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    // Ambil data user
    const snapshot = await get(ref(db, "users/" + user.uid));
    if (!snapshot.exists()) {
      alert("Data user tidak ditemukan");
      return;
    }
    currentUserData = snapshot.val();

    currentUser = user;

    showApp(user, currentUserData.pin);
    setupFriendListListener();
    setupFriendRequestsListener();
  } catch (error) {
    alert("Gagal login: " + error.message);
  }
};

// LOGOUT
btnLogout.onclick = async () => {
  await signOut(auth);
  authDiv.style.display = "block";
  appDiv.style.display = "none";
  currentUser = null;
  currentUserData = null;
  chatPartnerUID = null;
  chatPartnerData = null;
  friendList.innerHTML = "";
  friendRequestsList.innerHTML = "";
  chatMessagesDiv.innerHTML = "";
  chatWithSpan.textContent = "";
};

// TAMPILKAN APLIKASI
function showApp(user, pin) {
  authDiv.style.display = "none";
  appDiv.style.display = "block";
  userEmailSpan.textContent = user.email;
  userPINSpan.textContent = pin;
}

// TAMBAH TEMAN via PIN
btnAddFriend.onclick = async () => {
  const friendPIN = inputFriendPIN.value.trim().toUpperCase();
  if (!friendPIN) {
    alert("Masukkan PIN teman");
    return;
  }
  if (friendPIN === currentUserData.pin) {
    alert("Tidak bisa menambahkan diri sendiri");
    return;
  }

  try {
    const friendUIDSnap = await get(ref(db, "pins/" + friendPIN));
    if (!friendUIDSnap.exists()) {
      alert("PIN teman tidak ditemukan");
      return;
    }
    const friendUID = friendUIDSnap.val();

    // Cek sudah teman atau ada permintaan?
    const alreadyFriendSnap = await get(ref(db, `friends/${currentUser.uid}/${friendUID}`));
    const alreadyRequestedSnap = await get(ref(db, `friendRequests/${friendUID}/${currentUser.uid}`));

    if (alreadyFriendSnap.exists()) {
      alert("Teman sudah ada di daftar kamu");
      return;
    }
    if (alreadyRequestedSnap.exists()) {
      alert("Permintaan sudah dikirim sebelumnya");
      return;
    }

    // Kirim permintaan teman ke friendRequests/{targetUID}/{currentUID} = true
    await set(ref(db, `friendRequests/${friendUID}/${currentUser.uid}`), true);
    alert("Permintaan pertemanan terkirim");
    inputFriendPIN.value = "";
  } catch (error) {
    alert("Gagal tambah teman: " + error.message);
  }
};

// LISTENER untuk permintaan teman masuk
function setupFriendRequestsListener() {
  const requestsRef = ref(db, `friendRequests/${currentUser.uid}`);
  onValue(requestsRef, (snapshot) => {
    friendRequestsList.innerHTML = "";
    if (!snapshot.exists()) return;

    const requests = snapshot.val();
    for (const requesterUID in requests) {
      // Ambil data requester email dan pin
      get(ref(db, `users/${requesterUID}`)).then((snap) => {
        if (!snap.exists()) return;
        const userData = snap.val();

        const li = document.createElement("li");
        li.textContent = `PIN: ${userData.pin} | Email: ${userData.email}`;

        const btnAccept = document.createElement("button");
        btnAccept.textContent = "Terima";
        btnAccept.onclick = async () => {
          // Tambah ke friends kedua arah
          const updates = {};
          updates[`friends/${currentUser.uid}/${requesterUID}`] = true;
          updates[`friends/${requesterUID}/${currentUser.uid}`] = true;
          await update(ref(db), updates);

          // Hapus permintaan
          await remove(ref(db, `friendRequests/${currentUser.uid}/${requesterUID}`));

          alert("Permintaan diterima");
        };

        const btnReject = document.createElement("button");
        btnReject.textContent = "Tolak";
        btnReject.onclick = async () => {
          await remove(ref(db, `friendRequests/${currentUser.uid}/${requesterUID}`));
          alert("Permintaan ditolak");
        };

        li.appendChild(btnAccept);
        li.appendChild(btnReject);
        friendRequestsList.appendChild(li);
      });
    }
  });
}

// LISTENER untuk daftar teman
function setupFriendListListener() {
  const friendsRef = ref(db, `friends/${currentUser.uid}`);
  onValue(friendsRef, (snapshot) => {
    friendList.innerHTML = "";
    if (!snapshot.exists()) return;

    const friends = snapshot.val();
    for (const friendUID in friends) {
      // Ambil data teman
      get(ref(db, `users/${friendUID}`)).then((snap) => {
        if (!snap.exists()) return;
        const userData = snap.val();

        const li = document.createElement("li");
        li.textContent = `PIN: ${userData.pin} | Email: ${userData.email}`;
        li.style.cursor = "pointer";

        li.onclick = () => {
          openChat(friendUID, userData);
        };

        friendList.appendChild(li);
      });
    }
  });
}

// BUKA CHAT dengan UID tertentu
function openChat(friendUID, friendData) {
  chatPartnerUID = friendUID;
  chatPartnerData = friendData;
  chatWithSpan.textContent = `${friendData.email} (${friendData.pin})`;
  chatMessagesDiv.innerHTML = "";
  listenChatMessages(currentUser.uid, friendUID);
}

// LISTEN pesan chat realtime (dari dan ke)
let chatListener = null;
function listenChatMessages(uid1, uid2) {
  if (chatListener) {
    chatListener(); // Unsubscribe
  }
  // Buat ID chat konsisten: misal urut alfabet
  const chatId = uid1 < uid2 ? uid1 + "_" + uid2 : uid2 + "_" + uid1;
  const messagesRef = ref(db, "messages/" + chatId);

  chatListener = onValue(messagesRef, (snapshot) => {
    chatMessagesDiv.innerHTML = "";
    if (!snapshot.exists()) return;

    const messages = snapshot.val();
    for (const msgId in messages) {
      const msg = messages[msgId];
      const div = document.createElement("div");
      div.textContent = `${msg.from === currentUser.uid ? "Kamu" : chatPartnerData.email}: ${msg.text || ""}`;

      if (msg.fileUrl) {
        const link = document.createElement("a");
        link.href = msg.fileUrl;
        link.target = "_blank";
        link.textContent = `[File: ${msg.fileName}]`;
        div.appendChild(document.createElement("br"));
        div.appendChild(link);
      }

      div.className = msg.from === currentUser.uid ? "message-sent" : "message-received";
      chatMessagesDiv.appendChild(div);
    }
    chatMessagesDiv.scrollTop = chatMessagesDiv.scrollHeight;
  });
}

// KIRIM PESAN
btnSendMessage.onclick = async () => {
  if (!chatPartnerUID) {
    alert("Pilih teman dulu untuk chat");
    return;
  }

  const text = inputMessage.value.trim();
  const file = inputFile.files[0];

  if (!text && !file) {
    alert("Tulis pesan atau pilih file untuk dikirim");
    return;
  }

  // ID chat sama seperti di listenChatMessages
  const chatId = currentUser.uid < chatPartnerUID ? currentUser.uid + "_" + chatPartnerUID : chatPartnerUID + "_" + currentUser.uid;
  const messagesRef = ref(db, "messages/" + chatId);

  let fileUrl = null;
  let fileName = null;

  if (file) {
    // Batasi ukuran file max 5MB
    if (file.size > 5 * 1024 * 1024) {
      alert("File terlalu besar, maksimal 5MB");
      return;
    }

    const storageRef = sRef(storage, `chat_files/${chatId}/${Date.now()}_${file.name}`);
    await uploadBytes(storageRef, file);
    fileUrl = await getDownloadURL(storageRef);
    fileName = file.name;
  }

  // Push pesan baru
  await push(messagesRef, {
    from: currentUser.uid,
    to: chatPartnerUID,
    text: text || null,
    fileUrl,
    fileName,
    timestamp: Date.now(),
  });

  inputMessage.value = "";
  inputFile.value = "";
};
 
// AUTO LOGIN CHECK
onAuthStateChanged(auth, async (user) => {
  if (user) {
    currentUser = user;
    const snapshot = await get(ref(db, "users/" + user.uid));
    if (snapshot.exists()) {
      currentUserData = snapshot.val();
      showApp(user, currentUserData.pin);
      setupFriendListListener();
      setupFriendRequestsListener();
    } else {
      alert("Data user tidak ditemukan di database");
      await signOut(auth);
    }
  } else {
    authDiv.style.display = "block";
    appDiv.style.display = "none";
    currentUser = null;
    currentUserData = null;
  }
});
