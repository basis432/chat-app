// app.js
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
import { getAuth, signInAnonymously, signOut } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-auth.js";

import { firebaseConfig } from "./firebase-config.js";

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
const auth = getAuth();

let currentUser = null;  // akan menyimpan userId
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

// Fungsi bantu buat generate conversationId konsisten berdasarkan userId yg urut alfabet
function getConversationId(uid1, uid2) {
  return uid1 < uid2 ? uid1 + "_" + uid2 : uid2 + "_" + uid1;
}

// Login user dengan username dan pin
async function login(username, pin) {
  if (!username || !pin || pin.length !== 4) {
    alert("Username dan PIN (4 digit) harus diisi dengan benar");
    return;
  }

  // Login anonymous dulu agar dapat uid
  const userCredential = await signInAnonymously(auth);
  currentUser = userCredential.user.uid;
  currentUsername = username;
  currentPin = pin;

  // Cek apakah user sudah ada di DB
  const userRef = ref(db, `users/${currentUser}`);
  const snapshot = await get(userRef);

  if (!snapshot.exists()) {
    // User baru: simpan data user dengan username, pin, online true
    await set(userRef, {
      username,
      pin,
      online: true,
      friends: {},
      friendRequests: {}
    });
  } else {
    // User sudah ada, cek username dan pin sesuai
    const data = snapshot.val();
    if (data.username !== username || data.pin !== pin) {
      alert("Username atau PIN tidak cocok dengan data yang tersimpan");
      await signOut(auth);
      currentUser = null;
      return;
    }
    // Update status online
    await update(userRef, { online: true });
  }

  // Update UI
  loginSection.classList.add("hidden");
  chatSection.classList.remove("hidden");
  userStatus.textContent = `Login sebagai: ${username}`;
  
  // Mulai listen data realtime teman, permintaan, dan pesan
  listenFriendRequests();
  listenFriends();
}

// Logout user
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

// Dapatkan list teman dan listen perubahan
function listenFriends() {
  const friendsRef = ref(db, `users/${currentUser}/friends`);
  onValue(friendsRef, (snapshot) => {
    const friends = snapshot.val() || {};
    friendListEl.innerHTML = "";
    for (const friendId in friends) {
      // Ambil username teman
      get(ref(db, `users/${friendId}/username`)).then(friendSnap => {
        if (!friendSnap.exists()) return;
        const friendUsername = friendSnap.val();

        // Ambil status online
        get(ref(db, `users/${friendId}/online`)).then(statusSnap => {
          const isOnline = statusSnap.exists() ? statusSnap.val() : false;

          const li = document.createElement("li");
          li.textContent = friendUsername;
          li.classList.add("friend-item");
          if (isOnline) li.classList.add("online");
          li.dataset.friendId = friendId;
          li.addEventListener("click", () => selectFriend(friendId, friendUsername));
          friendListEl.appendChild(li);
        });
      });
    }
  });
}

// Listen permintaan pertemanan masuk
function listenFriendRequests() {
  const requestsRef = ref(db, `users/${currentUser}/friendRequests`);
  onValue(requestsRef, (snapshot) => {
    const requests = snapshot.val() || {};
    friendRequestListEl.innerHTML = "";
    for (const requesterId in requests) {
      // Ambil username requester
      get(ref(db, `users/${requesterId}/username`)).then(userSnap => {
        if (!userSnap.exists()) return;
        const requesterUsername = userSnap.val();

        const div = document.createElement("div");
        div.classList.add("friend-request-item");
        div.textContent = `Permintaan dari: ${requesterUsername}`;

        const btnAccept = document.createElement("button");
        btnAccept.textContent = "Terima";
        btnAccept.addEventListener("click", () => acceptFriendRequest(requesterId));

        const btnReject = document.createElement("button");
        btnReject.textContent = "Tolak";
        btnReject.addEventListener("click", () => rejectFriendRequest(requesterId));

        div.appendChild(btnAccept);
        div.appendChild(btnReject);
        friendRequestListEl.appendChild(div);
      });
    }
  });
}

// Kirim permintaan pertemanan
async function sendFriendRequest() {
  const targetUsername = friendRequestInput.value.trim();
  if (!targetUsername) {
    alert("Masukkan username tujuan");
    return;
  }
  if (targetUsername === currentUsername) {
    alert("Tidak bisa mengirim permintaan ke diri sendiri");
    return;
  }

  // Cari userId berdasarkan username
  const usersRef = ref(db, "users");
  const usersQuery = query(usersRef, orderByChild("username"), equalTo(targetUsername));
  const usersSnap = await get(usersQuery);

  if (usersSnap.exists()) {
    const usersData = usersSnap.val();
    const targetUserId = Object.keys(usersData)[0];

    // Cek apakah sudah teman
    const friendsSnap = await get(ref(db, `users/${currentUser}/friends/${targetUserId}`));
    if (friendsSnap.exists()) {
      alert("Sudah menjadi teman");
      return;
    }

    // Cek apakah sudah kirim permintaan
    const requestSnap = await get(ref(db, `users/${targetUserId}/friendRequests/${currentUser}`));
    if (requestSnap.exists()) {
      alert("Permintaan sudah dikirim, tunggu konfirmasi");
      return;
    }

    // Kirim permintaan
    await set(ref(db, `users/${targetUserId}/friendRequests/${currentUser}`), "pending");
    alert("Permintaan pertemanan terkirim");
    friendRequestInput.value = "";
  } else {
    alert("Username tidak ditemukan");
  }
}

// Terima permintaan pertemanan
async function acceptFriendRequest(requesterId) {
  if (!currentUser) return;

  // Tambahkan requester ke friend list user
  await set(ref(db, `users/${currentUser}/friends/${requesterId}`), true);
  // Tambahkan user ke friend list requester (dua arah)
  await set(ref(db, `users/${requesterId}/friends/${currentUser}`), true);
  // Hapus permintaan yang sudah diterima
  await remove(ref(db, `users/${currentUser}/friendRequests/${requesterId}`));
}

// Tolak permintaan pertemanan
async function rejectFriendRequest(requesterId) {
  if (!currentUser) return;

  await remove(ref(db, `users/${currentUser}/friendRequests/${requesterId}`));
}

// Pilih teman untuk chat
function selectFriend(friendId, friendUsername) {
  selectedFriendId = friendId;
  friendChatTitle.textContent = `Chat dengan ${friendUsername}`;
  chatBox.innerHTML = "";
  messageInput.disabled = false;
  btnSendMessage.disabled = false;
  listenMessages(friendId);
}

// Listen pesan dari dan ke friendId
function listenMessages(friendId) {
  const convId = getConversationId(currentUser, friendId);
  const messagesRef = ref(db, `messages/${convId}`);
  onValue(messagesRef, (snapshot) => {
    chatBox.innerHTML = "";
    const messages = snapshot.val();
    if (messages) {
      Object.keys(messages)
        .sort((a, b) => messages[a].timestamp - messages[b].timestamp)
        .forEach((msgId) => {
          const msg = messages[msgId];
          const div = document.createElement("div");
          div.classList.add("chat-message");
          div.classList.add(msg.from === currentUser ? "sent" : "received");
          div.textContent = msg.text;
          chatBox.appendChild(div);
        });
      chatBox.scrollTop = chatBox.scrollHeight;
    }
  });
}

// Kirim pesan ke friendId yang dipilih
async function sendMessage() {
  if (!selectedFriendId) {
    alert("Pilih teman untuk chat");
    return;
  }
  const text = messageInput.value.trim();
  if (!text) return;

  const convId = getConversationId(currentUser, selectedFriendId);
  const messagesRef = ref(db, `messages/${convId}`);
  const newMsgRef = push(messagesRef);
  await set(newMsgRef, {
    from: currentUser,
    text,
    timestamp: Date.now()
  });

  messageInput.value = "";
}

// Event Listener tombol login
btnLogin.addEventListener("click", () => {
  login(usernameInput.value.trim(), pinInput.value.trim());
});

// Event Listener tombol logout
btnLogout.addEventListener("click", logout);

// Event Listener kirim permintaan pertemanan
btnSendRequest.addEventListener("click", sendFriendRequest);

// Event Listener kirim pesan (tombol kirim)
btnSendMessage.addEventListener("click", sendMessage);

// Event Listener input pesan tekan enter
messageInput.addEventListener("keyup", (e) => {
  if (e.key === "Enter") {
    sendMessage();
  }
});

// Event Listener input login (enter untuk login)
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
