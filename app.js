import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import {
  getDatabase, ref, set, get, update, onValue, push, child, query, orderByChild, equalTo, remove
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-database.js";
import {
  getAuth, signInAnonymously, onAuthStateChanged, signOut
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyBnkk02CHyiWG1ygWVV3g9O07jd5TFVNn0",
  authDomain: "chatappgratis-d2649.firebaseapp.com",
  databaseURL: "https://chatappgratis-d2649-default-rtdb.firebaseio.com",
  projectId: "chatappgratis-d2649",
  storageBucket: "chatappgratis-d2649.appspot.com",
  messagingSenderId: "425067394100",
  appId: "1:425067394100:web:4b71a9c92cbbf636234661"
};

// Inisialisasi Firebase
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
const auth = getAuth(app);

let currentUser = null;
let currentUserId = null;
let friendsList = new Set();
let incomingFriendRequests = [];
let outgoingFriendRequests = [];

// Elemen DOM utama
const loginSection = document.getElementById('login-section');
const chatSection = document.getElementById('chat-section');
const usernameInput = document.getElementById('username-input');
const btnLogin = document.getElementById('btn-login');
const btnLogout = document.getElementById('btn-logout');
const userStatusDisplay = document.getElementById('user-status');
const friendListElem = document.getElementById('friend-list');
const requestListElem = document.getElementById('friend-request-list');
const requestSendInput = document.getElementById('friend-request-input');
const btnSendRequest = document.getElementById('btn-send-request');
const chatBox = document.getElementById('chat-box');
const messageInput = document.getElementById('message-input');
const btnSendMessage = document.getElementById('btn-send-message');
const friendChatTitle = document.getElementById('friend-chat-title');

let activeChatFriendId = null;

// Fungsi login anonymous dengan set username
btnLogin.addEventListener('click', () => {
  const username = usernameInput.value.trim();
  if (!username) {
    alert('Masukkan username');
    return;
  }

  signInAnonymously(auth).then(() => {
    currentUser = auth.currentUser;
    currentUserId = currentUser.uid;
    // Simpan username ke database agar bisa tampil
    set(ref(db, 'users/' + currentUserId), {
      username: username,
      online: true,
      lastOnline: Date.now()
    });
    initAppAfterLogin();
  }).catch((error) => {
    alert('Login gagal: ' + error.message);
  });
});

function initAppAfterLogin() {
  loginSection.style.display = 'none';
  chatSection.style.display = 'block';
  userStatusDisplay.textContent = `Anda login sebagai: ${usernameInput.value.trim()}`;
  listenFriendRequests();
  listenFriends();
  listenOnlineStatus();
  setupLogout();
  listenMessages();
  updateOnlineStatus(true);
}

function setupLogout() {
  btnLogout.addEventListener('click', () => {
    updateOnlineStatus(false).then(() => {
      signOut(auth).then(() => {
        location.reload();
      });
    });
  });
}

function updateOnlineStatus(isOnline) {
  if (!currentUserId) return Promise.resolve();
  return update(ref(db, 'users/' + currentUserId), {
    online: isOnline,
    lastOnline: Date.now()
  });
}

onAuthStateChanged(auth, (user) => {
  if (user) {
    currentUser = user;
    currentUserId = user.uid;
    get(ref(db, 'users/' + currentUserId + '/username')).then(snapshot => {
      if (snapshot.exists()) {
        usernameInput.value = snapshot.val();
      }
    });
    if (user) {
      loginSection.style.display = 'none';
      chatSection.style.display = 'block';
      userStatusDisplay.textContent = `Anda login sebagai: ${usernameInput.value.trim()}`;
      listenFriendRequests();
      listenFriends();
      listenOnlineStatus();
      setupLogout();
      listenMessages();
      updateOnlineStatus(true);
    }
  } else {
    loginSection.style.display = 'block';
    chatSection.style.display = 'none';
  }
});

// ------------------ PERMOHONAN PERTEMANAN -----------------

btnSendRequest.addEventListener('click', () => {
  const requestedUsername = requestSendInput.value.trim();
  if (!requestedUsername) {
    alert('Masukkan username teman yang ingin diminta');
    return;
  }

  // Cari user berdasarkan username
  const usersRef = ref(db, 'users');
  get(query(usersRef)).then(snapshot => {
    if (!snapshot.exists()) {
      alert('User tidak ditemukan');
      return;
    }
    let foundUserId = null;
    snapshot.forEach(childSnap => {
      if (childSnap.val().username === requestedUsername) {
        foundUserId = childSnap.key;
      }
    });
    if (!foundUserId) {
      alert('User tidak ditemukan');
      return;
    }
    if (foundUserId === currentUserId) {
      alert('Anda tidak bisa mengirim permintaan ke diri sendiri');
      return;
    }
    // Cek apakah sudah teman
    if (friendsList.has(foundUserId)) {
      alert('User ini sudah teman Anda');
      return;
    }
    // Cek apakah sudah ada permintaan terkirim
    if (outgoingFriendRequests.includes(foundUserId)) {
      alert('Permintaan sudah dikirim sebelumnya');
      return;
    }
    // Simpan permintaan teman ke database di node "friendRequests"
    const friendRequestRef = ref(db, `friendRequests/${foundUserId}/${currentUserId}`);
    set(friendRequestRef, {
      from: currentUserId,
      to: foundUserId,
      status: "pending",
      timestamp: Date.now()
    }).then(() => {
      alert('Permintaan pertemanan terkirim!');
      outgoingFriendRequests.push(foundUserId);
      renderFriendRequests();
      requestSendInput.value = '';
    });
  });
});

function listenFriendRequests() {
  if (!currentUserId) return;
  const friendReqRef = ref(db, `friendRequests/${currentUserId}`);
  onValue(friendReqRef, (snapshot) => {
    incomingFriendRequests = [];
    if (snapshot.exists()) {
      snapshot.forEach(childSnap => {
        if (childSnap.val().status === "pending") {
          incomingFriendRequests.push({
            from: childSnap.key,
            data: childSnap.val()
          });
        }
      });
    }
    renderFriendRequests();
  });
}

function renderFriendRequests() {
  requestListElem.innerHTML = '';
  if (incomingFriendRequests.length === 0) {
    requestListElem.innerHTML = '<p>Tidak ada permintaan pertemanan</p>';
    return;
  }
  incomingFriendRequests.forEach(req => {
    get(ref(db, `users/${req.from}/username`)).then(snapshot => {
      const username = snapshot.exists() ? snapshot.val() : "Unknown";
      const div = document.createElement('div');
      div.classList.add('friend-request-item');
      div.innerHTML = `
        <span><strong>${username}</strong> ingin berteman dengan Anda</span>
        <button class="btn-accept" data-from="${req.from}">Terima</button>
        <button class="btn-reject" data-from="${req.from}">Tolak</button>
      `;
      requestListElem.appendChild(div);

      div.querySelector('.btn-accept').addEventListener('click', () => {
        acceptFriendRequest(req.from);
      });
      div.querySelector('.btn-reject').addEventListener('click', () => {
        rejectFriendRequest(req.from);
      });
    });
  });
}

function acceptFriendRequest(fromUserId) {
  // Tambahkan dua arah ke friend list
  const updates = {};
  updates[`friends/${currentUserId}/${fromUserId}`] = true;
  updates[`friends/${fromUserId}/${currentUserId}`] = true;
  // Update status permintaan jadi accepted dan hapus
  updates[`friendRequests/${currentUserId}/${fromUserId}`] = null;

  update(ref(db), updates).then(() => {
    alert('Permintaan pertemanan diterima!');
    listenFriends();  // Refresh teman
  });
}

function rejectFriendRequest(fromUserId) {
  remove(ref(db, `friendRequests/${currentUserId}/${fromUserId}`)).then(() => {
    alert('Permintaan pertemanan ditolak');
    listenFriendRequests();
  });
}

// ------------------ DAFTAR TEMAN -----------------

function listenFriends() {
  if (!currentUserId) return;
  const friendsRef = ref(db, `friends/${currentUserId}`);
  onValue(friendsRef, (snapshot) => {
    friendsList.clear();
    if (snapshot.exists()) {
      snapshot.forEach(childSnap => {
        friendsList.add(childSnap.key);
      });
    }
    renderFriends();
  });
}

function renderFriends() {
  friendListElem.innerHTML = '';
  if (friendsList.size === 0) {
    friendListElem.innerHTML = '<p>Anda belum memiliki teman</p>';
    return;
  }
  friendsList.forEach(friendId => {
    get(ref(db, `users/${friendId}/username`)).then(snapshot => {
      const username = snapshot.exists() ? snapshot.val() : "Unknown";
      const li = document.createElement('li');
      li.textContent = username;
      li.classList.add('friend-item');
      li.dataset.friendId = friendId;
      li.addEventListener('click', () => {
        openChatWithFriend(friendId, username);
      });
      friendListElem.appendChild(li);
    });
  });
}

// ------------------ CHAT -------------------

function openChatWithFriend(friendId, friendUsername) {
  activeChatFriendId = friendId;
  friendChatTitle.textContent = `Chat dengan ${friendUsername}`;
  chatBox.innerHTML = '';
  listenChatMessages(friendId);
}

function listenChatMessages(friendId) {
  if (!currentUserId) return;

  const chatId = getChatId(currentUserId, friendId);
  const chatRef = ref(db, `chats/${chatId}/messages`);

  onValue(chatRef, (snapshot) => {
    chatBox.innerHTML = '';
    if (!snapshot.exists()) return;
    const msgs = [];
    snapshot.forEach(childSnap => {
      msgs.push(childSnap.val());
    });
    msgs.sort((a, b) => a.timestamp - b.timestamp);

    msgs.forEach(msg => {
      const div = document.createElement('div');
      div.classList.add('chat-message');
      div.classList.add(msg.from === currentUserId ? 'sent' : 'received');
      div.textContent = `[${new Date(msg.timestamp).toLocaleTimeString()}] ${msg.text}`;
      chatBox.appendChild(div);
    });

    chatBox.scrollTop = chatBox.scrollHeight;
  });
}

function getChatId(userA, userB) {
  return userA < userB ? userA + '_' + userB : userB + '_' + userA;
}

btnSendMessage.addEventListener('click', () => {
  sendMessage();
});

messageInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') sendMessage();
});

function sendMessage() {
  if (!activeChatFriendId) {
    alert('Pilih teman dulu untuk chat');
    return;
  }
  const msg = messageInput.value.trim();
  if (!msg) return;

  const chatId = getChatId(currentUserId, activeChatFriendId);
  const messagesRef = ref(db, `chats/${chatId}/messages`);
  const newMsgRef = push(messagesRef);
  set(newMsgRef, {
    from: currentUserId,
    to: activeChatFriendId,
    text: msg,
    timestamp: Date.now()
  }).then(() => {
    messageInput.value = '';
  });
}

// ------------------ STATUS ONLINE -----------------

function listenOnlineStatus() {
  if (!currentUserId) return;
  const usersRef = ref(db, 'users');
  onValue(usersRef, (snapshot) => {
    // Update tampilan teman dengan status online
    const friendItems = document.querySelectorAll('.friend-item');
    friendItems.forEach(item => {
      const friendId = item.dataset.friendId;
      const userData = snapshot.child(friendId);
      if (userData.exists()) {
        if (userData.val().online) {
          item.classList.add('online');
        } else {
          item.classList.remove('online');
        }
      }
    });
  });
}

// Update status online saat window ditutup/tidak aktif
window.addEventListener('beforeunload', () => {
  updateOnlineStatus(false);
});
