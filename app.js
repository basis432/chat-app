let currentUser = null;
let currentUserData = null;
let currentChatFriend = null;

const loginScreen = document.getElementById('login-screen');
const pinScreen = document.getElementById('pin-screen');
const friendRequestScreen = document.getElementById('friend-request-screen');
const chatScreen = document.getElementById('chat-screen');

const loginMessage = document.getElementById('login-message');
const pinMessage = document.getElementById('pin-message');

const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');

const pinInput = document.getElementById('pin-input');

const friendPinInput = document.getElementById('friend-pin-input');
const friendRequestsList = document.getElementById('friend-requests-list');
const friendsList = document.getElementById('friends-list');

const chatWithName = document.getElementById('chat-with-name');
const chatMessages = document.getElementById('chat-messages');
const chatMessageInput = document.getElementById('chat-message-input');
const chatFileInput = document.getElementById('chat-file-input');

document.getElementById('btn-login').onclick = login;
document.getElementById('btn-register').onclick = register;
document.getElementById('btn-save-pin').onclick = savePin;
document.getElementById('btn-send-friend-request').onclick = sendFriendRequest;
document.getElementById('btn-logout').onclick = logout;
document.getElementById('btn-send-message').onclick = sendMessage;
document.getElementById('btn-send-file').onclick = () => chatFileInput.click();
chatFileInput.onchange = sendFile;

auth.onAuthStateChanged(async user => {
  if (user) {
    currentUser = user;
    await loadUserData();
  } else {
    currentUser = null;
    currentUserData = null;
    showScreen('login');
  }
});

function showScreen(screenName) {
  loginScreen.style.display = 'none';
  pinScreen.style.display = 'none';
  friendRequestScreen.style.display = 'none';
  chatScreen.style.display = 'none';

  if (screenName === 'login') loginScreen.style.display = 'block';
  else if (screenName === 'pin') pinScreen.style.display = 'block';
  else if (screenName === 'friendRequests') friendRequestScreen.style.display = 'block';
  else if (screenName === 'chat') chatScreen.style.display = 'block';
}

async function login() {
  const email = emailInput.value.trim();
  const password = passwordInput.value.trim();
  loginMessage.textContent = '';

  if (!email || !password) {
    loginMessage.textContent = 'Email dan password harus diisi.';
    return;
  }

  try {
    await auth.signInWithEmailAndPassword(email, password);
  } catch (error) {
    loginMessage.textContent = 'Login gagal: ' + error.message;
  }
}

async function register() {
  const email = emailInput.value.trim();
  const password = passwordInput.value.trim();
  loginMessage.textContent = '';

  if (!email || !password) {
    loginMessage.textContent = 'Email dan password harus diisi.';
    return;
  }

  try {
    const userCredential = await auth.createUserWithEmailAndPassword(email, password);
    currentUser = userCredential.user;

    // Simpan data user dasar
    await db.ref('users/' + currentUser.uid).set({
      email: email,
      pin: null,
      friends: {},
      friendRequests: {},
      displayName: email.split('@')[0]
    });

  } catch (error) {
    loginMessage.textContent = 'Registrasi gagal: ' + error.message;
  }
}

async function loadUserData() {
  if (!currentUser) return;
  const userRef = db.ref('users/' + currentUser.uid);
  const snapshot = await userRef.once('value');
  currentUserData = snapshot.val();

  if (!currentUserData) {
    // Kalau data tidak ada, buat default data
    await userRef.set({
      email: currentUser.email,
      pin: null,
      friends: {},
      friendRequests: {},
      displayName: currentUser.email.split('@')[0]
    });
    currentUserData = {
      email: currentUser.email,
      pin: null,
      friends: {},
      friendRequests: {},
      displayName: currentUser.email.split('@')[0]
    };
  }

  if (!currentUserData.pin) {
    showScreen('pin');
  } else {
    showScreen('friendRequests');
    setupFriendRequestsListener();
    setupFriendsListener();
  }
}

async function savePin() {
  const pin = pinInput.value.trim();
  pinMessage.textContent = '';

  if (!/^\d{4}$/.test(pin)) {
    pinMessage.textContent = 'PIN harus 4 digit angka.';
    return;
  }

  // Cek apakah PIN sudah dipakai user lain
  const usersRef = db.ref('users');
  const snapshot = await usersRef.orderByChild('pin').equalTo(pin).once('value');
  if (snapshot.exists()) {
    pinMessage.textContent = 'PIN sudah digunakan orang lain, pilih PIN lain.';
    return;
  }

  // Simpan PIN ke profil user
  await db.ref('users/' + currentUser.uid + '/pin').set(pin);
  currentUserData.pin = pin;

  showScreen('friendRequests');
  setupFriendRequestsListener();
  setupFriendsListener();
}

function setupFriendRequestsListener() {
  const friendRequestsRef = db.ref('users/' + currentUser.uid + '/friendRequests');

  friendRequestsRef.on('value', snapshot => {
    friendRequestsList.innerHTML = '';
    const requests = snapshot.val() || {};

    Object.entries(requests).forEach(([requesterUid, status]) => {
      if (status === 'pending') {
        // Tampilkan permintaan
        db.ref('users/' + requesterUid).once('value').then(snap => {
          const user = snap.val();
          if (!user) return;
          const li = document.createElement('li');
          li.textContent = user.displayName + ' (' + user.pin + ')';

          // Tombol terima
          const btnAccept = document.createElement('button');
          btnAccept.textContent = 'Terima';
          btnAccept.onclick = () => acceptFriendRequest(requesterUid);

          // Tombol tolak
          const btnReject = document.createElement('button');
          btnReject.textContent = 'Tolak';
          btnReject.onclick = () => rejectFriendRequest(requesterUid);

          li.appendChild(btnAccept);
          li.appendChild(btnReject);

          friendRequestsList.appendChild(li);
        });
      }
    });
  });
}

async function acceptFriendRequest(requesterUid) {
  // Update status permintaan jadi accepted
  await db.ref('users/' + currentUser.uid + '/friendRequests/' + requesterUid).set('accepted');

  // Tambah teman di kedua user
  await db.ref('users/' + currentUser.uid + '/friends/' + requesterUid).set(true);
  await db.ref('users/' + requesterUid + '/friends/' + currentUser.uid).set(true);

  // Hapus permintaan
  await db.ref('users/' + currentUser.uid + '/friendRequests/' + requesterUid).remove();
}

async function rejectFriendRequest(requesterUid) {
  await db.ref('users/' + currentUser.uid + '/friendRequests/' + requesterUid).remove();
}

function setupFriendsListener() {
  const friendsRef = db.ref('users/' + currentUser.uid + '/friends');
  friendsRef.on('value', snapshot => {
    friendsList.innerHTML = '';
    const friends = snapshot.val() || {};

    Object.keys(friends).forEach(async friendUid => {
      const friendSnap = await db.ref('users/' + friendUid).once('value');
      const friend = friendSnap.val();
      if (!friend) return;

      const li = document.createElement('li');
      li.textContent = friend.displayName + ' (' + friend.pin + ')';
      li.onclick = () => openChat(friendUid, friend.displayName);
      friendsList.appendChild(li);
    });
  });
}

function openChat(friendUid, friendName) {
  currentChatFriend = friendUid;
  chatWithName.textContent = friendName;
  showScreen('chat');
  loadChatMessages();
}

function loadChatMessages() {
  chatMessages.innerHTML = '';
  if (!currentUser || !currentChatFriend) return;

  const chatId = getChatId(currentUser.uid, currentChatFriend);
  const messagesRef = db.ref('messages/' + chatId);
  messagesRef.off(); // Bersihkan listener lama

  messagesRef.on('child_added', snapshot => {
    const message = snapshot.val();
    displayMessage(message);
  });

  chatMessages.scrollTop = chatMessages.scrollHeight;
}

function getChatId(uid1, uid2) {
  return uid1 < uid2 ? uid1 + '_' + uid2 : uid2 + '_' + uid1;
}

function displayMessage(message) {
  const div = document.createElement('div');
  div.classList.add('message');
  div.classList.add(message.sender === currentUser.uid ? 'self' : 'friend');

  if (message.type === 'text') {
    div.textContent = message.text;
  } else if (message.type === 'file') {
    const a = document.createElement('a');
    a.href = message.fileUrl;
    a.target = '_blank';
    a.textContent = message.fileName || 'File';
    div.appendChild(a);
  }
  chatMessages.appendChild(div);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

async function sendMessage() {
  const text = chatMessageInput.value.trim();
  if (!text || !currentUser || !currentChatFriend) return;

  const chatId = getChatId(currentUser.uid, currentChatFriend);
  const messageData = {
    sender: currentUser.uid,
    type: 'text',
    text,
    timestamp: Date.now()
  };
  await db.ref('messages/' + chatId).push(messageData);
  chatMessageInput.value = '';
}

function sendFile() {
  const file = chatFileInput.files[0];
  if (!file || !currentUser || !currentChatFriend) return;

  const chatId = getChatId(currentUser.uid, currentChatFriend);
  const storageRef = storage.ref().child('chat_files/' + chatId + '/' + Date.now() + '_' + file.name);

  const uploadTask = storageRef.put(file);
  uploadTask.on('state_changed',
    null,
    error => alert('Upload gagal: ' + error.message),
    async () => {
      const fileUrl = await uploadTask.snapshot.ref.getDownloadURL();
      const messageData = {
        sender: currentUser.uid,
        type: 'file',
        fileUrl,
        fileName: file.name,
        timestamp: Date.now()
      };
      await db.ref('messages/' + chatId).push(messageData);
      chatFileInput.value = '';
    });
}

async function sendFriendRequest() {
  const pin = friendPinInput.value.trim();
  if (!/^\d{4}$/.test(pin)) {
    alert('PIN teman harus 4 digit angka.');
    return;
  }

  if (pin === currentUserData.pin) {
    alert('Tidak bisa menambahkan diri sendiri.');
    return;
  }

  // Cari user dengan PIN tersebut
  const usersRef = db.ref('users');
  const snapshot = await usersRef.orderByChild('pin').equalTo(pin).once('value');

  if (!snapshot.exists()) {
    alert('PIN tidak ditemukan.');
    return;
  }

  const foundUsers = snapshot.val();
  const friendUid = Object.keys(foundUsers)[0];

  // Cek jika sudah teman
  if (currentUserData.friends && currentUserData.friends[friendUid]) {
    alert('Sudah menjadi teman.');
    return;
  }

  // Kirim permintaan ke user tersebut
  await db.ref('users/' + friendUid + '/friendRequests/' + currentUser.uid).set('pending');
  alert('Permintaan teman terkirim.');
  friendPinInput.value = '';
}

function logout() {
  auth.signOut();
  currentUser = null;
  currentUserData = null;
  currentChatFriend = null;
  showScreen('login');
}
