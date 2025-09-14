// import-data.js
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc } from 'firebase/firestore';
import fs from 'fs';

// Firebase config - firebase-config.js'den kopyala
const firebaseConfig = {
  apiKey: "AIzaSyBjNOx8iwYUU3yQNYwrURPQ91kui_qilHc",
  authDomain: "mottodeneme-86727.firebaseapp.com",
  projectId: "mottodeneme-86727",
  storageBucket: "mottodeneme-86727.firebasestorage.app",
  messagingSenderId: "179396498084",
  appId: "1:179396498084:web:e3389de34824fe1d540c31",
  measurementId: "G-EEV1NRP7XG"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function uploadData() {
    console.log('Firebase veri yükleniyor...');
    
    // Users
    const users = JSON.parse(fs.readFileSync('./data/users.json', 'utf8'));
    for (const user of users) {
        await addDoc(collection(db, 'users'), user);
    }
    console.log(`Users: ${users.length} kayıt eklendi`);

    // Companies
    const companies = JSON.parse(fs.readFileSync('./data/companies.json', 'utf8'));
    for (const company of companies) {
        await addDoc(collection(db, 'companies'), company);
    }
    console.log(`Companies: ${companies.length} kayıt eklendi`);

    // Products
    const products = JSON.parse(fs.readFileSync('./data/products.json', 'utf8'));
    for (const product of products) {
        await addDoc(collection(db, 'products'), product);
    }
    console.log(`Products: ${products.length} kayıt eklendi`);

    // Stock
    const stock = JSON.parse(fs.readFileSync('./data/stock.json', 'utf8'));
    for (const item of stock) {
        await addDoc(collection(db, 'stock'), item);
    }
    console.log(`Stock: ${stock.length} kayıt eklendi`);

    // Production
    const production = JSON.parse(fs.readFileSync('./data/production.json', 'utf8'));
    for (const prod of production) {
        await addDoc(collection(db, 'production'), prod);
    }
    console.log(`Production: ${production.length} kayıt eklendi`);

    // Offers
    const offers = JSON.parse(fs.readFileSync('./data/offers.json', 'utf8'));
    for (const offer of offers) {
        await addDoc(collection(db, 'offers'), offer);
    }
    console.log(`Offers: ${offers.length} kayıt eklendi`);

    console.log('TAMAMLANDI!');
}

uploadData().catch(console.error);