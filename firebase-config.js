// firebase-config.js - CDN Version - getUserByUsername ekle
// Firebase CDN imports
import { initializeApp } from 'https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js';
import { 
    getFirestore, 
    collection, 
    doc, 
    getDocs, 
    getDoc, 
    addDoc, 
    updateDoc, 
    deleteDoc, 
    query, 
    where 
} from 'https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js';

// Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyBjNOx8iwYUU3yQNYwrURPQ91kui_qilHc",
    authDomain: "mottodeneme-86727.firebaseapp.com",
    projectId: "mottodeneme-86727",
    storageBucket: "mottodeneme-86727.firebasestorage.app",
    messagingSenderId: "179396498084",
    appId: "1:179396498084:web:e3389de34824fe1d540c31"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Firebase service functions
const firestoreService = {
    // Users
    async getUsers() {
        try {
            const snapshot = await getDocs(collection(db, 'users'));
            return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        } catch (error) {
            console.error('Error getting users:', error);
            throw error;
        }
    },

    async getUserByUsername(username) {
        try {
            const q = query(collection(db, 'users'), where("username", "==", username));
            const snapshot = await getDocs(q);
            if (!snapshot.empty) {
                const doc = snapshot.docs[0];
                return { id: doc.id, ...doc.data() };
            }
            return null;
        } catch (error) {
            console.error('Error getting user by username:', error);
            throw error;
        }
    },

    async addUser(userData) {
        try {
            const docRef = await addDoc(collection(db, 'users'), userData);
            return docRef.id;
        } catch (error) {
            console.error('Error adding user:', error);
            throw error;
        }
    },

    async updateUser(userId, userData) {
        try {
            await updateDoc(doc(db, 'users', userId), userData);
            return true;
        } catch (error) {
            console.error('Error updating user:', error);
            throw error;
        }
    },

    async deleteUser(userId) {
        try {
            await deleteDoc(doc(db, 'users', userId));
            return true;
        } catch (error) {
            console.error('Error deleting user:', error);
            throw error;
        }
    },

    // Companies
    async getCompanies() {
        try {
            const snapshot = await getDocs(collection(db, 'companies'));
            return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        } catch (error) {
            console.error('Error getting companies:', error);
            throw error;
        }
    },

    async addCompany(companyData) {
        try {
            const docRef = await addDoc(collection(db, 'companies'), companyData);
            return docRef.id;
        } catch (error) {
            console.error('Error adding company:', error);
            throw error;
        }
    },

    async updateCompany(companyId, companyData) {
        try {
            await updateDoc(doc(db, 'companies', companyId), companyData);
            return true;
        } catch (error) {
            console.error('Error updating company:', error);
            throw error;
        }
    },

    async deleteCompany(companyId) {
        try {
            await deleteDoc(doc(db, 'companies', companyId));
            return true;
        } catch (error) {
            console.error('Error deleting company:', error);
            throw error;
        }
    },

    // Products
    async getProducts() {
        try {
            const snapshot = await getDocs(collection(db, 'products'));
            return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        } catch (error) {
            console.error('Error getting products:', error);
            throw error;
        }
    },

    async addProduct(productData) {
        try {
            const docRef = await addDoc(collection(db, 'products'), productData);
            return docRef.id;
        } catch (error) {
            console.error('Error adding product:', error);
            throw error;
        }
    },

    async updateProduct(productId, productData) {
        try {
            await updateDoc(doc(db, 'products', productId), productData);
            return true;
        } catch (error) {
            console.error('Error updating product:', error);
            throw error;
        }
    },

    async deleteProduct(productId) {
        try {
            await deleteDoc(doc(db, 'products', productId));
            return true;
        } catch (error) {
            console.error('Error deleting product:', error);
            throw error;
        }
    },

    // Stock
    async getStock() {
        try {
            const snapshot = await getDocs(collection(db, 'stock'));
            return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        } catch (error) {
            console.error('Error getting stock:', error);
            throw error;
        }
    },

    async addStock(stockData) {
        try {
            const docRef = await addDoc(collection(db, 'stock'), stockData);
            return docRef.id;
        } catch (error) {
            console.error('Error adding stock:', error);
            throw error;
        }
    },
    

async deleteStock(stockId) {
    try {
        await deleteDoc(doc(db, 'stock', stockId));
        console.log('Stock deleted:', stockId);
        return true;
    } catch (error) {
        console.error('Error deleting stock:', error);
        throw error;
    }
},

    async updateStock(stockId, stockData) {
        try {
            await updateDoc(doc(db, 'stock', stockId), stockData);
            return true;
        } catch (error) {
            console.error('Error updating stock:', error);
            throw error;
        }
    },

    // Production
    async getProduction() {
        try {
            const snapshot = await getDocs(collection(db, 'production'));
            return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        } catch (error) {
            console.error('Error getting production:', error);
            throw error;
        }
    },

    async addProduction(productionData) {
        try {
            const docRef = await addDoc(collection(db, 'production'), productionData);
            return docRef.id;
        } catch (error) {
            console.error('Error adding production:', error);
            throw error;
        }
    },

    async updateProduction(productionId, productionData) {
        try {
            await updateDoc(doc(db, 'production', productionId), productionData);
            return true;
        } catch (error) {
            console.error('Error updating production:', error);
            throw error;
        }
    },

    // Offers
    async getOffers() {
        try {
            const snapshot = await getDocs(collection(db, 'offers'));
            return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        } catch (error) {
            console.error('Error getting offers:', error);
            throw error;
        }
    },

    async addOffer(offerData) {
        try {
            const docRef = await addDoc(collection(db, 'offers'), offerData);
            return docRef.id;
        } catch (error) {
            console.error('Error adding offer:', error);
            throw error;
        }
    },

    async updateOffer(offerId, offerData) {
        try {
            await updateDoc(doc(db, 'offers', offerId), offerData);
            return true;
        } catch (error) {
            console.error('Error updating offer:', error);
            throw error;
        }
    },

    async deleteOffer(offerId) {
        try {
            await deleteDoc(doc(db, 'offers', offerId));
            return true;
        } catch (error) {
            console.error('Error deleting offer:', error);
            throw error;
        }
    },
    // Recipes
    async getRecipes() {
        try {
            const snapshot = await getDocs(collection(db, 'recipes'));
            return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        } catch (error) {
            console.error('Error getting recipes:', error);
            throw error;
        }
    },

    async addRecipe(recipeData) {
        try {
            const docRef = await addDoc(collection(db, 'recipes'), recipeData);
            return docRef.id;
        } catch (error) {
            console.error('Error adding recipe:', error);
            throw error;
        }
    },

    async updateRecipe(recipeId, recipeData) {
        try {
            await updateDoc(doc(db, 'recipes', recipeId), recipeData);
            return true;
        } catch (error) {
            console.error('Error updating recipe:', error);
            throw error;
        }
    },

    async deleteRecipe(recipeId) {
        try {
            await deleteDoc(doc(db, 'recipes', recipeId));
            return true;
        } catch (error) {
            console.error('Error deleting recipe:', error);
            throw error;
        }
    },

    async getShipments() {
        try {
            const snapshot = await getDocs(collection(db, 'shipments'));
            return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        } catch (error) {
            console.error('Error getting shipments:', error);
            throw error;
        }
    },

    async addShipment(shipmentData) {
        try {
            const docRef = await addDoc(collection(db, 'shipments'), shipmentData);
            return docRef.id;
        } catch (error) {
            console.error('Error adding shipment:', error);
            throw error;
        }
    },

// firebase-config.js'e eklenecek
// Notifications
async getNotifications() {
    try {
        const snapshot = await getDocs(collection(db, 'notifications'));
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
        console.error('Error getting notifications:', error);
        return [];
    }
},

async addNotification(notificationData) {
    try {
        const docRef = await addDoc(collection(db, 'notifications'), notificationData);
        return docRef.id;
    } catch (error) {
        console.error('Error adding notification:', error);
        throw error;
    }
},

async deleteProduction(productionId) {
    try {
        await deleteDoc(doc(db, 'production', productionId));
        return true;
    } catch (error) {
        console.error('Error deleting production:', error);
        throw error;
    }
}
,
// firebase-config.js'e eklenecek
async updateNotification(notificationId, data) {
    try {
        await updateDoc(doc(db, 'notifications', notificationId), data);
        return true;
    } catch (error) {
        console.error('Error updating notification:', error);
        throw error;
    }
},

async deleteNotification(notificationId) {
    try {
        await deleteDoc(doc(db, 'notifications', notificationId));
        return true;
    } catch (error) {
        console.error('Error deleting notification:', error);
        throw error;
    }
}
,


async validatePassword(userId, password) {
    try {
        const user = await this.getUser(userId);
        return user && user.password === password;
    } catch (error) {
        console.error('Password validation error:', error);
        return false;
    }
},

async getUser(userId) {
    try {
        const docRef = doc(db, 'users', userId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            return { id: docSnap.id, ...docSnap.data() };
        }
        return null;
    } catch (error) {
        console.error('Error getting user:', error);
        return null;
    }
},



};




// Export to global scope for script.js
window.firestoreService = firestoreService;

console.log('Database CDN yüklendi');