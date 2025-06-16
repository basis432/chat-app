import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-app.js";
import {
  getDatabase,
  ref,
  set,
  get,
  child,
  onValue,
  push,
  update,
  remove,
  query,
  orderByChild,
  equalTo,
} from "https://www.gstatic.com/firebasejs/9.22.1/firebase-database.js";
import { getAuth, signInAnonymously, signOut, signInWithCustomToken } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-auth.js";

import { firebaseConfig } from "./firebase-config.js";

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
const auth = getAuth();

let currentUser = null;  // menyimpan user id (uid)
let currentUsername = "";
let currentPin = "";
let selectedFriendId = null;

// Elemen DOM
const loginSection = document.getElementById("login-section");
const chatSection = document.getElementById("chat-section");
const usernameInput = document.getElementById("username-input");
const pinInput = document.getElementById("pin-input");
const btnLogin = document.getElementById("btn-login");
const btnLogout = document.getElementById("btn-logout");

const userStatus = document.getElementById("user-status");
const friendListEl = document.getElementById("friend-list");
const friendRequestListEl = document.getElementById("friend-request-list");
const friendRequestInput = document.getElementById("friend-request-input");
const btnSendRequest = document.getElementById("btn-send-request");

const friendChatTitle = document.getElementById("friend-chat-title");
const chatBox = document.getElementById("chat-box");
const messageInput = document.getElementById("message-input");
const btnSendMessage = document.getElementById("btn-send-message");

// Fungsi bantu generate conversationId konsisten berdasar uid
function getConversationId(uid1, uid2) {
  return uid1 < uid2 ? uid1 + "_" + uid2 : uid2 + "_" + uid1;
}

// LOGIN: cari user berdasarkan username
async function login(username, pin) {
  if (!username || !pin || pin.length !== 4) {
    alert("Username dan PIN (4 digit) harus diisi dengan benar");
    return;
  }

  // Cari user berdasarkan username
  const usersRef = ref(db, "users");
  const usersQuery = query(usersRef, orderByChild("username"), equalTo(username));
  const usersSnap = await get(usersQuery);

  if (usersSnap.exists()) {
    // User ditemukan, cek PIN cocok?
    const usersData = usersSnap.val();
    const userIds = Object.keys(usersData);
    const foundUserId = userIds[0];
    const foundUserData = usersData[foundUserId];

    if (foundUserData.pin !== pin) {
      alert("PIN salah");
      return;
    }

    // PIN cocok, lakukan login anonymous (tetap agar dapat akses firebase auth)
    await signInAnonymously(auth);
    currentUser = foundUserId;
    currentUsername = username;
    currentPin = pin;

    // Update status online di DB
    await update(ref(db, `users/${currentUser}`), { online: true });

    // Update UI dan mulai listen data
    afterLoginSuccess();
  } else {
    // User baru, buat anonymous login dan simpan data baru
    const userCredential = await signInAnonymously(auth);
    currentUser = userCredential.user.uid;
    currentUsername = username;
    currentPin = pin;

    // Simpan data user baru
    await set(ref(db, `users/${currentUser}`), {
      username,
      pin,
      online: true,
      friends: {},
      friendRequests: {}
    });

    // Update UI dan mulai listen data
    afterLoginSuccess();
  }
}

function afterLoginSuccess() {
  loginSection.classList.add("hidden");
  chatSection.classList.remove("hidden");
  userStatus.textContent = `Login sebagai: ${currentUsername}`;
  listenFriendRequests();
  listenFriends();
}

// Logout
async function logout() {
  if (!currentUser) return;

  // Update status offline
  await update(ref(db, `users/${currentUser}`), { online: false });

  // Sign out firebase auth
  await signOut(auth);

  currentUser = null;
  currentUsername = "";
  currentPin = "";
  selectedFriendId = null;

  // Reset UI
  chatSection.classList.add("hidden");
  loginSection.classList.remove("hidden");

  friendListEl.innerHTML = "";
  friendRequestListEl.innerHTML = "";
  friendChatTitle.textContent = "Pilih teman untuk chat";
  chatBox.innerHTML = "";
  messageInput.value = "";
  messageInput.disabled = true;
  btnSendMessage.disabled = true;
}

// ... (sisa fungsi friend list, friend request, chat, kirim pesan sama seperti sebelumnya) ...

// Event Listener tombol login
btnLogin.addEventListener("click", () => {
  login(usernameInput.value.trim(), pinInput.value.trim());
});

// Event Listener tombol logout
btnLogout.addEventListener("click", logout);

// Event Listener kirim permintaan pertemanan
btnSendRequest.addEventListener("click", sendFriendRequest);

// Event Listener kirim pesan
btnSendMessage.addEventListener("click", sendMessage);

messageInput.addEventListener("keyup", (e) => {
  if (e.key === "Enter") {
    sendMessage();
  }
});

pinInput.addEventListener("keyup", (e) => {
  if (e.key === "Enter") {
    btnLogin.click();
  }
});
usernameInput.addEventListener("keyup", (e) => {
  if (e.key === "Enter") {
    pinInput.focus();
  }
});
