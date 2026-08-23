const firebaseConfig = {
  apiKey: "AIzaSyDkN7eArrsNvrAzdIlR9CtJrEZlFi3taQs",
  authDomain: "lab-room-maintenance.firebaseapp.com",
  projectId: "lab-room-maintenance",
  storageBucket: "lab-room-maintenance.firebasestorage.app",
  messagingSenderId: "763924327692",
  appId: "1:763924327692:web:5766ff29f6ba93492aed29",
  measurementId: "G-Y6FBDD13BL"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();