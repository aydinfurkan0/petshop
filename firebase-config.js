// firebase-config.js - CDN Version
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
    where ,
    setDoc
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
            // undefined değerleri temizle
            const cleanData = {};
            Object.keys(companyData).forEach(key => {
                if (companyData[key] !== undefined) {
                    cleanData[key] = companyData[key];
                }
            });
            await updateDoc(doc(db, 'companies', companyId), cleanData);
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

    async updateStock(stockId, stockData) {
        try {
            await updateDoc(doc(db, 'stock', stockId), stockData);
            return true;
        } catch (error) {
            console.error('Error updating stock:', error);
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
            const cleanData = { ...productionData };
            delete cleanData.id;
            Object.keys(cleanData).forEach(key => {
                if (cleanData[key] === undefined || cleanData[key] === null) {
                    delete cleanData[key];
                }
            });
            if (!cleanData.product && cleanData.productName) {
                cleanData.product = cleanData.productName;
            }
            if (!cleanData.product) {
                cleanData.product = 'Belirtilmemiş';
            }
            if (!cleanData.quantity || cleanData.quantity === 0) {
                cleanData.quantity = 1;
            }
            const docRef = await addDoc(collection(db, 'production'), cleanData);
            console.log('Production added with ID:', docRef.id);
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

    async deleteProduction(productionId) {
        try {
            await deleteDoc(doc(db, 'production', productionId));
            return true;
        } catch (error) {
            console.error('Error deleting production:', error);
            throw error;
        }
    },

    // Shipments
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
    },

    // Leave Requests
    async getLeaveRequests() {
        try {
            const snapshot = await getDocs(collection(db, 'leaveRequests'));
            return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        } catch (error) {
            console.error('Error getting leave requests:', error);
            return [];
        }
    },

    async addLeaveRequest(leaveData) {
        try {
            const docRef = await addDoc(collection(db, 'leaveRequests'), leaveData);
            return docRef.id;
        } catch (error) {
            console.error('Error adding leave request:', error);
            throw error;
        }
    },

    async updateLeaveRequest(leaveId, leaveData) {
        try {
            await updateDoc(doc(db, 'leaveRequests', leaveId), leaveData);
            return true;
        } catch (error) {
            console.error('Error updating leave request:', error);
            throw error;
        }
    },

    async deleteLeaveRequest(leaveId) {
        try {
            await deleteDoc(doc(db, 'leaveRequests', leaveId));
            return true;
        } catch (error) {
            console.error('Error deleting leave request:', error);
            throw error;
        }
    },

    async addLeaveLog(logData) {
        try {
            const docRef = await addDoc(collection(db, 'leaveLogs'), logData);
            return docRef.id;
        } catch (error) {
            console.error('Leave log ekleme hatası:', error);
            throw error;
        }
    },

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

    // Main Categories
    async getMainCategories() {
        try {
            const snapshot = await getDocs(collection(db, 'mainCategories'));
            return snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
        } catch (error) {
            console.error('Ana kategoriler alınamadı:', error);
            return [];
        }
    },

    async addMainCategory(data) {
        try {
            const docRef = await addDoc(collection(db, 'mainCategories'), data);
            return docRef.id;
        } catch (error) {
            console.error('Ana kategori eklenemedi:', error);
            throw error;
        }
    },

    async updateMainCategory(id, data) {
        try {
            await updateDoc(doc(db, 'mainCategories', id), data);
            return true;
        } catch (error) {
            console.error('Ana kategori güncellenemedi:', error);
            throw error;
        }
    },

    async deleteMainCategory(id) {
        try {
            await deleteDoc(doc(db, 'mainCategories', id));
            return true;
        } catch (error) {
            console.error('Ana kategori silinemedi:', error);
            throw error;
        }
    },

    async getMainCategory(id) {
        try {
            const docSnap = await getDoc(doc(db, 'mainCategories', id));
            if (docSnap.exists()) {
                return { id: docSnap.id, ...docSnap.data() };
            }
            return null;
        } catch (error) {
            console.error('Ana kategori alınamadı:', error);
            return null;
        }
    },

    // Sub Categories
    async getSubCategories() {
        try {
            const snapshot = await getDocs(collection(db, 'subCategories'));
            return snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
        } catch (error) {
            console.error('Alt kategoriler alınamadı:', error);
            return [];
        }
    },

    async addSubCategory(data) {
        try {
            const docRef = await addDoc(collection(db, 'subCategories'), data);
            return docRef.id;
        } catch (error) {
            console.error('Alt kategori eklenemedi:', error);
            throw error;
        }
    },

    async updateSubCategory(id, data) {
        try {
            await updateDoc(doc(db, 'subCategories', id), data);
            return true;
        } catch (error) {
            console.error('Alt kategori güncellenemedi:', error);
            throw error;
        }
    },

    async deleteSubCategory(id) {
        try {
            await deleteDoc(doc(db, 'subCategories', id));
            return true;
        } catch (error) {
            console.error('Alt kategori silinemedi:', error);
            throw error;
        }
    },

    async getSubCategory(id) {
        try {
            const docSnap = await getDoc(doc(db, 'subCategories', id));
            if (docSnap.exists()) {
                return { id: docSnap.id, ...docSnap.data() };
            }
            return null;
        } catch (error) {
            console.error('Alt kategori alınamadı:', error);
            return null;
        }
    },

    // Modal Fields
    // firebase-config.js içinde:
async getCategoryModalFields(categoryId) {
    try {
        console.log('Modal alanları getiriliyor:', categoryId);
        const docRef = doc(db, 'categoryModalFields', categoryId);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
            const data = docSnap.data();
            const fields = data.fields || [];
            
            // optionsString'i geri options array'ına çevir
            const processedFields = fields.map(field => {
                if (field.optionsString) {
                    field.options = field.optionsString.split(',').map(label => ({
                        value: label.trim().toLowerCase().replace(/\s+/g, '_'),
                        label: label.trim()
                    }));
                    delete field.optionsString;
                }
                return field;
            });
            
            return processedFields;
        } else {
            console.log('Modal alanları bulunamadı, varsayılan alanlar döndürülüyor');
            return getSimpleDefaultFields();
        }
    } catch (error) {
        console.error('Modal alanları getirme hatası:', error);
        return getSimpleDefaultFields();
    }
}
,

   // firebase-config.js içinde bu fonksiyonu değiştir:
async updateCategoryModalFields(categoryId, fields) {
    try {
        console.log('Modal alanları güncelleniyor:', categoryId, fields);
        
        // Nested array'ları temizle
        const cleanFields = fields.map(field => {
            const cleanField = { ...field };
            // options array'ını basit stringe çevir
            if (cleanField.options && Array.isArray(cleanField.options)) {
                cleanField.optionsString = cleanField.options.map(opt => opt.label).join(',');
                delete cleanField.options;
            }
            return cleanField;
        });
        
        await setDoc(doc(db, 'categoryModalFields', categoryId), {
            fields: cleanFields,
            updatedAt: new Date().toISOString()
        });
        console.log('Modal alanları güncellendi');
        return true;
    } catch (error) {
        console.error('Modal alanları güncelleme hatası:', error);
        throw error;
    }
}
    ,

    // Stock Cards
    async getStockCards() {
        try {
            const snapshot = await getDocs(collection(db, 'stockCards'));
            return snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
        } catch (error) {
            console.error('Stok kartları alınamadı:', error);
            return [];
        }
    },

    async addStockCard(data) {
        try {
            const docRef = await addDoc(collection(db, 'stockCards'), data);
            return docRef.id;
        } catch (error) {
            console.error('Stok kartı eklenemedi:', error);
            throw error;
        }
    },

    async updateStockCard(id, data) {
        try {
            await updateDoc(doc(db, 'stockCards', id), data);
            return true;
        } catch (error) {
            console.error('Stok kartı güncellenemedi:', error);
            throw error;
        }
    },

    async deleteStockCard(id) {
        try {
            await deleteDoc(doc(db, 'stockCards', id));
            return true;
        } catch (error) {
            console.error('Stok kartı silinemedi:', error);
            throw error;
        }
    },

    async getStockCard(id) {
        try {
            const docSnap = await getDoc(doc(db, 'stockCards', id));
            if (docSnap.exists()) {
                return { id: docSnap.id, ...docSnap.data() };
            }
            return null;
        } catch (error) {
            console.error('Stok kartı alınamadı:', error);
            return null;
        }
    },

    // firebase-config.js içine eklenecek metodlar

// Ana kategoriler için metodlar
async getMainCategories() {
    try {
        const querySnapshot = await getDocs(collection(db, 'mainCategories'));
        return querySnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
    } catch (error) {
        console.error('Ana kategoriler alınamadı:', error);
        return [];
    }
},

async addMainCategory(data) {
    try {
        const docRef = await addDoc(collection(db, 'mainCategories'), data);
        return docRef.id;
    } catch (error) {
        console.error('Ana kategori eklenemedi:', error);
        throw error;
    }
},

async updateMainCategory(id, data) {
    try {
        await updateDoc(doc(db, 'mainCategories', id), data);
        return true;
    } catch (error) {
        console.error('Ana kategori güncellenemedi:', error);
        throw error;
    }
},

async deleteMainCategory(id) {
    try {
        await deleteDoc(doc(db, 'mainCategories', id));
        return true;
    } catch (error) {
        console.error('Ana kategori silinemedi:', error);
        throw error;
    }
},

// Alt kategoriler için metodlar
async getSubCategories() {
    try {
        const querySnapshot = await getDocs(collection(db, 'subCategories'));
        return querySnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
    } catch (error) {
        console.error('Alt kategoriler alınamadı:', error);
        return [];
    }
},

// Modal alanları için metodlar
async getCategoryModalFields() {
    try {
        const querySnapshot = await getDocs(collection(db, 'categoryModalFields'));
        const fields = {};
        querySnapshot.docs.forEach(doc => {
            fields[doc.id] = doc.data().fields || [];
        });
        return fields;
    } catch (error) {
        console.error('Modal alanları alınamadı:', error);
        return {};
    }
},

async updateCategoryModalFields(categoryId, fields) {
    try {
        await setDoc(doc(db, 'categoryModalFields', categoryId), {
            fields: fields,
            updatedAt: new Date().toISOString()
        });
        return true;
    } catch (error) {
        console.error('Modal alanları güncellenemedi:', error);
        throw error;
    }
},

// Stok kartları için metodlar
async getStockCards() {
    try {
        const querySnapshot = await getDocs(collection(db, 'stockCards'));
        return querySnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
    } catch (error) {
        console.error('Stok kartları alınamadı:', error);
        return [];
    }
},

async addStockCard(data) {
    try {
        const docRef = await addDoc(collection(db, 'stockCards'), data);
        // İlgili kategorinin itemCount'unu güncelle
        if (data.mainCategoryId) {
            const categoryRef = doc(db, 'mainCategories', data.mainCategoryId);
            const categoryDoc = await getDoc(categoryRef);
            if (categoryDoc.exists()) {
                const currentCount = categoryDoc.data().itemCount || 0;
                await updateDoc(categoryRef, {
                    itemCount: currentCount + 1
                });
            }
        }
        return docRef.id;
    } catch (error) {
        console.error('Stok kartı eklenemedi:', error);
        throw error;
    }
},

async getStockCard(id) {
    try {
        const docSnap = await getDoc(doc(db, 'stockCards', id));
        if (docSnap.exists()) {
            return { id: docSnap.id, ...docSnap.data() };
        }
        return null;
    } catch (error) {
        console.error('Stok kartı alınamadı:', error);
        return null;
    }
},

async updateStockCard(id, data) {
    try {
        await updateDoc(doc(db, 'stockCards', id), data);
        return true;
    } catch (error) {
        console.error('Stok kartı güncellenemedi:', error);
        throw error;
    }
},

async deleteStockCard(id) {
    try {
        // Önce stok kartını al
        const cardDoc = await getDoc(doc(db, 'stockCards', id));
        if (cardDoc.exists()) {
            const cardData = cardDoc.data();
            // Stok kartını sil
            await deleteDoc(doc(db, 'stockCards', id));
            
            // İlgili kategorinin itemCount'unu güncelle
            if (cardData.mainCategoryId) {
                const categoryRef = doc(db, 'mainCategories', cardData.mainCategoryId);
                const categoryDoc = await getDoc(categoryRef);
                if (categoryDoc.exists()) {
                    const currentCount = categoryDoc.data().itemCount || 0;
                    await updateDoc(categoryRef, {
                        itemCount: Math.max(0, currentCount - 1)
                    });
                }
            }
        }
        return true;
    } catch (error) {
        console.error('Stok kartı silinemedi:', error);
        throw error;
    }
}

,

// ============================================
// ÜRÜN BOYUTLARI YÖNETİMİ
// ============================================

// Tüm boyutları getir
async getProductSizes() {
    try {
        const snapshot = await getDocs(collection(db, 'productSizes'));
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
        console.error('Boyutlar getirme hatası:', error);
        return [];
    }
}
,
// Tek boyut getir
async getProductSize(sizeId) {
    try {
        const docRef = doc(db, 'productSizes', sizeId);
        const docSnap = await getDoc(docRef);
        return docSnap.exists() ? { id: docSnap.id, ...docSnap.data() } : null;
    } catch (error) {
        console.error('Boyut getirme hatası:', error);
        return null;
    }
}
,
// Yeni boyut ekle
async addProductSize(sizeData) {
    try {
        const docRef = await addDoc(collection(db, 'productSizes'), {
            ...sizeData,
            createdAt: new Date().toISOString()
        });
        return docRef.id;
    } catch (error) {
        console.error('Boyut ekleme hatası:', error);
        throw error;
    }
}
,
// Boyut güncelle
async updateProductSize(sizeId, sizeData) {
    try {
        const docRef = doc(db, 'productSizes', sizeId);
        await updateDoc(docRef, {
            ...sizeData,
            updatedAt: new Date().toISOString()
        });
    } catch (error) {
        console.error('Boyut güncelleme hatası:', error);
        throw error;
    }
},

// Boyut sil
async deleteProductSize(sizeId) {
    try {
        await deleteDoc(doc(db, 'productSizes', sizeId));
    } catch (error) {
        console.error('Boyut silme hatası:', error);
        throw error;
    }
}
,
// ============================================
// KATEGORİ BAZLI FİYATLANDIRMA
// ============================================

// Kategori fiyatlandırmasını kaydet
async saveCategoryPricing(pricingData) {
    try {
        const docRef = doc(db, 'settings', 'categoryPricing');
        await setDoc(docRef, {
            pricing: pricingData,
            updatedAt: new Date().toISOString()
        });
    } catch (error) {
        console.error('Kategori fiyatlandırma kaydetme hatası:', error);
        throw error;
    }
}
,
// Kategori fiyatlandırmasını getir
async getCategoryPricing(category = null) {
    try {
        const docRef = doc(db, 'settings', 'categoryPricing');
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
            const data = docSnap.data();
            if (category) {
                return data.pricing?.[category] || null;
            }
            return data.pricing || {};
        }
        return category ? null : {};
    } catch (error) {
        console.error('Kategori fiyatlandırma getirme hatası:', error);
        return category ? null : {};
    }
}

};
// firebase-config.js veya stock-card.js'e ekle:
function getSimpleDefaultFields() {
    return [
        { id: 'code', type: 'text', label: 'Ürün Kodu', required: true },
        { id: 'name', type: 'text', label: 'Ürün Adı', required: true },
        { id: 'brand', type: 'text', label: 'Marka', required: false },
        { id: 'model', type: 'text', label: 'Model', required: false },
        { id: 'unit', type: 'text', label: 'Birim', required: true },
        { id: 'price', type: 'number', label: 'Birim Fiyat', required: false },
        { id: 'description', type: 'textarea', label: 'Açıklama', required: false }
    ];
}





// window.firestoreService'e tüm fonksiyonları ekle
window.firestoreService = {
    ...firestoreService,
    getMainCategories: firestoreService.getMainCategories,
    addMainCategory: firestoreService.addMainCategory,
    updateMainCategory: firestoreService.updateMainCategory,
    deleteMainCategory: firestoreService.deleteMainCategory,
    getMainCategory: firestoreService.getMainCategory,
    getSubCategories: firestoreService.getSubCategories,
    addSubCategory: firestoreService.addSubCategory,
    updateSubCategory: firestoreService.updateSubCategory,
    deleteSubCategory: firestoreService.deleteSubCategory,
    getSubCategory: firestoreService.getSubCategory,
    getCategoryModalFields: firestoreService.getCategoryModalFields,
    updateCategoryModalFields: firestoreService.updateCategoryModalFields,
    getStockCards: firestoreService.getStockCards,
    addStockCard: firestoreService.addStockCard,
    updateStockCard: firestoreService.updateStockCard,
    deleteStockCard: firestoreService.deleteStockCard,
    getStockCard: firestoreService.getStockCard
};

console.log('Database CDN yüklendi');