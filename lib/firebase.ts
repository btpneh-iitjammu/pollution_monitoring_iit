import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database";

const firebaseConfig = {
  apiKey: "AIzaSyD93H25b1S4yhhMDn4e0Oo2vi6yAtfuDVo",
  authDomain: "btp-endsem-bb3d4.firebaseapp.com",
  databaseURL: "https://btp-endsem-bb3d4-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "btp-endsem-bb3d4",
  storageBucket: "btp-endsem-bb3d4.firebasestorage.app",
  messagingSenderId: "297287763320",
  appId: "1:297287763320:web:7dd689d9deba3de254f48d",
};

const app = initializeApp(firebaseConfig);
export const database = getDatabase(app);
