import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getDatabase } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-storage.js";

const firebaseConfig = {
  apiKey: "AIzaSyBnkk02CHyiWG1ygWVV3g9O07jd5TFVNn0",
  authDomain: "chatappgratis-d2649.firebaseapp.com",
  databaseURL: "https://chatappgratis-d2649-default-rtdb.firebaseio.com",
  projectId: "chatappgratis-d2649",
  storageBucket: "chatappgratis-d2649.appspot.com",
  messagingSenderId: "425067394100",
  appId: "1:425067394100:web:4b71a9c92cbbf636234661"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getDatabase(app);
export const storage = getStorage(app);
