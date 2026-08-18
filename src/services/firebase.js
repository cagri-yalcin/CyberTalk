import firebase from 'firebase/app';
import 'firebase/auth';
import 'firebase/firestore';
import 'firebase/analytics';

const firebaseConfig = {
  apiKey: "AIzaSyDbcKtSHMwYwAa7WUIm4meFv8sHrDUOllY",
  authDomain: "cybertallk.firebaseapp.com",
  projectId: "cybertallk",
  storageBucket: "cybertallk.firebasestorage.app",
  messagingSenderId: "197549243735",
  appId: "1:197549243735:web:135aae0aa6ea6d196f9212",
  measurementId: "G-ZGJ2PRDN9Z"
};

if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

try {
  firebase.analytics();
} catch (error) {
  console.warn('Analytics başlatılamadı:', error);
}

export const auth = firebase.auth();
export const db = firebase.firestore();
export { firebase };