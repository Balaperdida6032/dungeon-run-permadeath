// firebase-config.js - Conexión con Firebase Authentication y Firestore

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { 
    getAuth, 
    GoogleAuthProvider, 
    signInWithPopup, 
    signInWithEmailAndPassword, 
    createUserWithEmailAndPassword, 
    signOut, 
    onAuthStateChanged 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { 
    getFirestore, 
    doc, 
    setDoc, 
    getDoc, 
    updateDoc, 
    onSnapshot, 
    deleteDoc,
    collection,
    addDoc,
    getDocs 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyBEcaaWX_6upGHY_2I5cSy3j4XZh50Q410",
    authDomain: "dungeon-run-permadeath.firebaseapp.com",
    projectId: "dungeon-run-permadeath",
    storageBucket: "dungeon-run-permadeath.firebasestorage.app",
    messagingSenderId: "1057265525316",
    appId: "1:1057265525316:web:85276d443ff52ae9b3d211",
    measurementId: "G-J4JGJSCPS8"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

export { 
    GoogleAuthProvider, 
    signInWithPopup, 
    signInWithEmailAndPassword, 
    createUserWithEmailAndPassword, 
    signOut, 
    onAuthStateChanged,
    doc, 
    setDoc, 
    getDoc, 
    updateDoc, 
    onSnapshot, 
    deleteDoc,
    collection,
    addDoc,
    getDocs 
};