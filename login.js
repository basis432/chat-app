function login() {
  const pin = document.getElementById('pinInput').value.trim();
  if (!pin) return alert('Masukkan PIN');
  db.ref('users/' + pin).once('value', snap => {
    if (!snap.exists()) {
      db.ref('users/' + pin).set({ online: true, friends: {} });
    } else {
      db.ref('users/' + pin + '/online').set(true);
    }
    localStorage.setItem('pin', pin);
    window.location.href = 'chat.html';
  });
}
