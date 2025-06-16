const auth = firebase.auth();
const db = firebase.database();

const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const btnRegister = document.getElementById('btn-register');
const btnLogin = document.getElementById('btn-login');
const btnLogout = document.getElementById('btn-logout');
const message = document.getElementById('message');

const authContainer = document.getElementById('auth-container');
const userContainer = document.getElementById('user-container');
const userEmailSpan = document.getElementById('user-email');
const userPinSpan = document.getElementById('user-pin');

function clearMessage() {
  message.textContent = '';
}

// Generate PIN unik (6 digit angka)
function generatePin() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Simpan PIN unik ke database user
async function saveUserPin(uid, pin) {
  return db.ref('users/' + uid).update({ pin });
}

// Cek apakah PIN sudah ada di database
async function isPinExist(pin) {
  const snapshot = await db.ref('users').orderByChild('pin').equalTo(pin).once('value');
  return snapshot.exists();
}

// Cari PIN unik yang belum dipakai
async function generateUniquePin() {
  let pin;
  let exists = true;
  while (exists) {
    pin = generatePin();
    exists = await isPinExist(pin);
  }
  return pin;
}

// Register
btnRegister.addEventListener('click', async () => {
  clearMessage();
  const email = emailInput.value.trim();
  const password = passwordInput.value.trim();

  if (!email || !password) {
    message.textContent = 'Email dan password wajib diisi.';
    return;
  }
  if (password.length < 6) {
    message.textContent = 'Password minimal 6 karakter.';
    return;
  }

  try {
    const userCredential = await auth.createUserWithEmailAndPassword(email, password);
    const uid = userCredential.user.uid;

    // Generate PIN unik dan simpan
    const pin = await generateUniquePin();
    await saveUserPin(uid, pin);

    // Simpan email juga
    await db.ref('users/' + uid).update({ email });

    message.style.color = 'green';
    message.textContent = 'Berhasil daftar! Silahkan login.';
    emailInput.value = '';
    passwordInput.value = '';
  } catch (error) {
    message.style.color = 'red';
    message.textContent = 'Gagal daftar: ' + error.message;
  }
});

// Login
btnLogin.addEventListener('click', async () => {
  clearMessage();
  const email = emailInput.value.trim();
  const password = passwordInput.value.trim();

  if (!email || !password) {
    message.textContent = 'Email dan password wajib diisi.';
    return;
  }

  try {
    const userCredential = await auth.signInWithEmailAndPassword(email, password);
    const user = userCredential.user;

    // Tampilkan info user setelah login
    showUserInfo(user);

    emailInput.value = '';
    passwordInput.value = '';
  } catch (error) {
    message.style.color = 'red';
    message.textContent = 'Gagal login: ' + error.message;
  }
});

// Logout
btnLogout.addEventListener('click', () => {
  auth.signOut();
});

// Tampilkan info user
async function showUserInfo(user) {
  authContainer.style.display = 'none';
  userContainer.style.display = 'block';
  userEmailSpan.textContent = user.email;

  // Ambil PIN dari database
  const snapshot = await db.ref('users/' + user.uid + '/pin').once('value');
  const pin = snapshot.val() || 'Tidak ada PIN';

  userPinSpan.textContent = pin;
}

// Pantau status login
auth.onAuthStateChanged(user => {
  if (user) {
    showUserInfo(user);
    message.textContent = '';
  } else {
    authContainer.style.display = 'block';
    userContainer.style.display = 'none';
  }
});
