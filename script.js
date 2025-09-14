// script.js - Firebase CDN ile tam entegre
let currentUser = null;
let currentPage = 'dashboard';

// Firebase data cache
let firebaseData = {
    users: [],
    companies: [],
    products: [],
    stock: [],
    recipes: [],
    production: [],
    offers: [],
    shipments: []
};
// Global değişkenleri tanımla
window.currentUser = null;
window.currentPage = 'dashboard';
window.firebaseData = {
    users: [],
    companies: [],
    products: [],
    stock: [],
    recipes: [],
    production: [],
    offers: [],
    shipments: []
};


// Firebase verilerini yükle (fallback ekli)
async function loadFirebaseData() {
    try {
        console.log('Firebase veriler yükleniyor...');
        
        firebaseData.users = await window.firestoreService.getUsers();
        firebaseData.companies = await window.firestoreService.getCompanies();
        firebaseData.products = await window.firestoreService.getProducts();
        firebaseData.stock = await window.firestoreService.getStock();
        firebaseData.recipes = await window.firestoreService.getRecipes();
        firebaseData.production = await window.firestoreService.getProduction();
        firebaseData.offers = await window.firestoreService.getOffers();
        firebaseData.shipments = await window.firestoreService.getShipments();
        
        // Production için fallback: approvals ve workTimeRecords yoksa boş array ekle
        firebaseData.production = firebaseData.production.map(p => ({
            ...p,
            approvals: p.approvals || [],
            workTimeRecords: p.workTimeRecords || [],
            progress: p.progress || 0,
            currentDepartment: p.currentDepartment || 'Depo/Stok'
        }));
        
      
        
        console.log('Firebase veriler yüklendi:', firebaseData);
        
        // Bildirim badge'ini güncelle (eğer giriş yapılmışsa)
        if (currentUser) {
            updateNotificationBadge();
        }
        
        return true;
    } catch (error) {
        console.error('Firebase veri hatası:', error);
        
        // Hata durumunda boş veri setleri oluştur
        firebaseData = {
            users: [],
            companies: [],
            products: [],
            stock: [],
            recipes: [],
            production: [],
            offers: [],
            shipments: []
        };
        
        return false;
    }
}

// Toggle user profile dropdown
function toggleUserProfile() {
    const panel = document.getElementById('userProfilePanel');
    const btn = document.getElementById('profileBtn');
    
    if (panel.style.display === 'block') {
        panel.style.display = 'none';
    } else {
        panel.style.display = 'block';
    }
    
    const chevron = btn.querySelector('.fa-chevron-down');
    if (chevron) {
        chevron.style.transform = panel.style.display === 'block' ? 'rotate(180deg)' : 'rotate(0deg)';
        chevron.style.transition = 'transform 0.2s ease';
    }
}

// Close dropdown when clicking outside
document.addEventListener('click', function(e) {
    const panel = document.getElementById('userProfilePanel');
    const btn = document.getElementById('profileBtn');
    if (panel && btn && !e.target.closest('#profileBtn') && !e.target.closest('#userProfilePanel')) {
        panel.style.display = 'none';
        const chevron = btn.querySelector('.fa-chevron-down');
        if (chevron) {
            chevron.style.transform = 'rotate(0deg)';
        }
    }
});

// Modal functions
function openModal(modalId) {
    document.getElementById(modalId).classList.add('show');
}

function closeModal(modalId) {
    document.getElementById(modalId).classList.remove('show');
}

// Login form handler - Firebase - Kullanıcı adı ile giriş
document.getElementById('loginForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value;
    
    try {
        console.log('Giriş deneniyor:', username);
        
        // Firebase'den kullanıcı bul - username ile
        const user = await window.firestoreService.getUserByUsername(username);
        console.log('Bulunan kullanıcı:', user);
        
        if (user && user.password === password && user.active) {
            currentUser = user;
            
            document.getElementById('userName').textContent = user.name;
            document.getElementById('avatarText').textContent = user.name.charAt(0).toUpperCase();
            
            if (user.role === 'admin' || user.permissions.includes('admin')) {
                document.getElementById('adminSection').style.display = 'block';
            }
            
            document.getElementById('loginContainer').style.display = 'none';
            document.getElementById('appContainer').style.display = 'block';
            
            // Firebase verilerini yükle
            await loadFirebaseData();
            
            showPage('dashboard');
            showNotification('Giriş başarılı', `Hoş geldiniz ${user.name}!`, 'success');
            
            document.getElementById('password').value = '';
        } else {
            showNotification('Giriş hatası', 'Kullanıcı adı veya şifre hatalı.', 'error');
            document.getElementById('password').value = '';
        }
    } catch (error) {
        console.error('Login error:', error);
        showNotification('Bağlantı Hatası', 'Firebase bağlantısında sorun var.', 'error');
        document.getElementById('password').value = '';
    }
});

// Show product details - Firebase - Hammaddeler dahil
function showProductDetails(productId) {
    const product = firebaseData.products.find(p => p.id === productId);
    if (product) {
        const rawMaterialsList = product.rawMaterials ? product.rawMaterials.map(rmId => {
            const rm = firebaseData.stock.find(s => s.id === rmId);
            return rm ? `${rm.name} (${rm.quantity} ${rm.unit})` : 'Bilinmeyen';
        }).join(', ') : 'Hammadde tanımlanmamış';
        
        document.getElementById('productModalBody').innerHTML = `
            <div class="form-grid">
                <div class="form-group">
                    <label class="form-label">Ürün Kodu</label>
                    <input type="text" class="form-control" value="${product.code}" readonly>
                </div>
                <div class="form-group">
                    <label class="form-label">Barkod</label>
                    <input type="text" class="form-control" value="${product.barcode || ''}" readonly>
                </div>
                <div class="form-group">
                    <label class="form-label">Ürün Adı</label>
                    <input type="text" class="form-control" value="${product.name}" readonly>
                </div>
                <div class="form-group">
                    <label class="form-label">Kategori</label>
                    <input type="text" class="form-control" value="${product.category}" readonly>
                </div>
                <div class="form-group">
                    <label class="form-label">Birim Fiyat</label>
                    <input type="text" class="form-control" value="${product.price} ₺" readonly>
                </div>
                <div class="form-group">
                    <label class="form-label">Mevcut Stok</label>
                    <input type="text" class="form-control" value="${product.stock} adet" readonly>
                </div>
                <div class="form-group">
                    <label class="form-label">Hammaddeler</label>
                    <textarea class="form-control" readonly>${rawMaterialsList}</textarea>
                </div>
                <div class="form-group">
                    <label class="form-label">Son Güncelleme</label>
                    <input type="text" class="form-control" value="${new Date().toLocaleDateString('tr-TR')}" readonly>
                </div>
                ${product.image ? `<div class="form-group"><label>Fotoğraf</label><img src="${product.image}" style="max-width: 200px;"></div>` : ''}
            </div>
            <h4 style="margin-top: 24px; margin-bottom: 16px;">Stok Hareketleri</h4>
            <div class="table-container">
                <table class="table">
                    <thead>
                        <tr>
                            <th>Tarih</th>
                            <th>İşlem</th>
                            <th>Miktar</th>
                            <th>Açıklama</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td>08.09.2025</td>
                            <td><span class="badge success">Giriş</span></td>
                            <td>+50</td>
                            <td>Tedarikçi teslimatı</td>
                        </tr>
                        <tr>
                            <td>07.09.2025</td>
                            <td><span class="badge danger">Çıkış</span></td>
                            <td>-20</td>
                            <td>Üretim talebi</td>
                        </tr>
                    </tbody>
                </table>
            </div>
        `;
        document.getElementById('productModal').querySelector('.modal-title').textContent = 'Ürün Detayları';
        openModal('productModal');
    }
}

// Delete product - Firebase
async function deleteProduct(productId) {
    if (confirm('Bu ürünü silmek istediğinize emin misiniz?')) {
        try {
            await window.firestoreService.deleteProduct(productId);
            showNotification('Ürün Silindi', 'Ürün başarıyla silindi.', 'success');
            await loadFirebaseData();
            if (currentPage === 'stok') loadStok();
        } catch (error) {
            console.error('Ürün silme hatası:', error);
            showNotification('Hata', 'Ürün silinirken hata oluştu.', 'error');
        }
    }
}

// Edit product - Firebase - Hammaddeler ekle
function editProduct(productId) {
    const product = firebaseData.products.find(p => p.id === productId);
    if (product) {
        const rawOptions = firebaseData.stock.map(stock => `<option value="${stock.id}" ${product.rawMaterials && product.rawMaterials.includes(stock.id) ? 'selected' : ''}>${stock.name} - ${stock.code}</option>`).join('');
        
        document.getElementById('productModalBody').innerHTML = `
            <form id="productForm">
                <div class="form-grid">
                    <div class="form-group">
                        <label class="form-label">Ürün Kodu</label>
                        <input type="text" class="form-control" id="productFormCode" value="${product.code}" required>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Barkod</label>
                        <input type="text" class="form-control" id="productFormBarcode" value="${product.barcode || ''}" required>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Ürün Adı</label>
                        <input type="text" class="form-control" id="productFormName" value="${product.name}" required>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Kategori</label>
                        <select class="form-control" id="productFormCategory" required>
                            <option value="Metal" ${product.category === 'Metal' ? 'selected' : ''}>Metal</option>
                            <option value="Plastik" ${product.category === 'Plastik' ? 'selected' : ''}>Plastik</option>
                            <option value="Elektronik" ${product.category === 'Elektronik' ? 'selected' : ''}>Elektronik</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Birim Fiyat</label>
                        <input type="number" class="form-control" id="productFormPrice" value="${product.price}" required>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Stok Miktarı</label>
                        <input type="number" class="form-control" id="productFormStock" value="${product.stock}" required>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Hammaddeler (Reçete)</label>
                        <select class="form-control" id="productFormRawMaterials" multiple>
                            ${rawOptions}
                        </select>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Fotoğraf Yükle (Opsiyonel)</label>
                        <input type="file" class="form-control" id="productFormImage" accept="image/*">
                    </div>
                </div>
            </form>
        `;
        document.getElementById('productModal').querySelector('.modal-footer').innerHTML = `
            <button class="btn btn-success" onclick="saveProduct('${productId}')">Kaydet</button>
            <button class="btn btn-outline" onclick="closeModal('productModal')">İptal</button>
        `;
        openModal('productModal');
    }
}

async function saveProduct(productId = null) {
    const code = document.getElementById('productFormCode').value;
    const barcode = document.getElementById('productFormBarcode').value;
    const name = document.getElementById('productFormName').value;
    const category = document.getElementById('productFormCategory').value;
    const price = parseFloat(document.getElementById('productFormPrice').value);
    const stock = parseInt(document.getElementById('productFormStock').value);
    const rawMaterialsInput = document.getElementById('productFormRawMaterials').value;
    const rawMaterials = rawMaterialsInput ? rawMaterialsInput.split(',') : [];
    const imageFile = document.getElementById('productFormImage')?.files[0];

    let image = '';
    if (imageFile) {
        image = 'data:image/jpeg;base64,' + btoa('simulated_image_data');
    }

    const productData = {
        code: code,
        barcode: barcode,
        name: name,
        category: category,
        price: price,
        stock: stock,
        rawMaterials: rawMaterials,
        active: true
    };

    if (image) {
        productData.image = image;
    }

    try {
        if (productId) {
            await window.firestoreService.updateProduct(productId, productData);
            showNotification('Ürün Güncellendi', 'Ürün başarıyla güncellendi.', 'success');
        } else {
            await window.firestoreService.addProduct(productData);
            showNotification('Ürün Eklendi', 'Yeni ürün başarıyla eklendi.', 'success');
        }
        
        // Geçici listeyi temizle
        tempSelectedRawMaterials = [];
        
        closeModal('productModal');
        await loadFirebaseData();
        if (currentPage === 'urunAgaci') loadUrunAgaci();
    } catch (error) {
        console.error('Ürün kaydetme hatası:', error);
        showNotification('Hata', 'Ürün kaydedilirken hata oluştu.', 'error');
    }
}

// Save user - Firebase - username ekle
async function saveUser(userId = null) {
    const name = document.getElementById('userFormName').value;
    const username = document.getElementById('userFormUsername').value;
    const password = document.getElementById('userFormPassword').value;
    const role = document.getElementById('userFormRole').value;
    
    const permissions = [];
    if (document.getElementById('perm_sales').checked) permissions.push('sales');
    if (document.getElementById('perm_production').checked) permissions.push('production');
    if (document.getElementById('perm_warehouse').checked) permissions.push('warehouse');
    if (document.getElementById('perm_reports').checked) permissions.push('reports');
    if (document.getElementById('perm_admin').checked) permissions.push('admin');
    
    const userData = {
        name: name,
        username: username,
        password: password,
        role: role,
        permissions: permissions,
        active: true
    };

    try {
        if (userId) {
            await window.firestoreService.updateUser(userId, userData);
            showNotification('Kullanıcı Güncellendi', 'Kullanıcı başarıyla güncellendi.', 'success');
        } else {
            await window.firestoreService.addUser(userData);
            showNotification('Kullanıcı Eklendi', 'Yeni kullanıcı başarıyla eklendi.', 'success');
        }
        
        closeModal('userModal');
        await loadFirebaseData();
        if (currentPage === 'admin') loadAdmin();
    } catch (error) {
        console.error('Kullanıcı kaydetme hatası:', error);
        showNotification('Hata', 'Kullanıcı kaydedilirken hata oluştu.', 'error');
    }
}

// Delete user - Firebase
async function deleteUser(userId) {
    const user = firebaseData.users.find(u => u.id === userId);
    if (user && user.username === 'furkan') {
        showNotification('Hata', 'Ana admin kullanıcısı silinemez.', 'error');
        return;
    }
    
    if (confirm('Bu kullanıcıyı silmek istediğinize emin misiniz?')) {
        try {
            await window.firestoreService.deleteUser(userId);
            showNotification('Kullanıcı Silindi', 'Kullanıcı başarıyla silindi.', 'success');
            await loadFirebaseData();
            if (currentPage === 'admin') loadAdmin();
        } catch (error) {
            console.error('Kullanıcı silme hatası:', error);
            showNotification('Hata', 'Kullanıcı silinirken hata oluştu.', 'error');
        }
    }
}

// Toggle submenu
function toggleSubmenu(submenuId) {
    const submenu = document.getElementById(submenuId);
    if (!submenu) return;
    const menuItem = submenu.previousElementSibling;
    if (menuItem) {
        submenu.classList.toggle('show');
        menuItem.classList.toggle('expanded');
    }
}

// Logout function
function logout() {
    currentUser = null;
    document.getElementById('loginContainer').style.display = 'flex';
    document.getElementById('appContainer').style.display = 'none';
    document.getElementById('username').value = '';
    document.getElementById('password').value = '';
    document.getElementById('adminSection').style.display = 'none';
    document.getElementById('userName').textContent = 'Kullanıcı';
    document.getElementById('avatarText').textContent = 'K';
    document.querySelectorAll('.menu-item').forEach(item => item.classList.remove('active'));
    document.querySelectorAll('.submenu-item').forEach(item => item.classList.remove('active'));
    
    firebaseData = {
        users: [],
        companies: [],
        products: [],
        stock: [],
        production: [],
        offers: []
    };
}

    
// getRoleDisplayName
function getRoleDisplayName(role) {
    const roleNames = {
        'admin': 'Yönetici',
        'production': 'Üretim Sorumlusu',
        'sales': 'Satış',
        'warehouse': 'Depo Sorumlusu',
        'logistics': 'Lojistik',
        'quality': 'Kalite Kontrol'
    };
    return roleNames[role] || role;
}


// Son Aktiviteler (Sade)
function loadRecentActivities() {
    const activities = [];
    (firebaseData.production || []).forEach(prod => {
        (prod.approvals || []).forEach(approval => {
            const user = (firebaseData.users || []).find(u => u.id === approval.userId);
            if (approval.date && prod.orderNo) {
                activities.push({
                    user: user ? `${user.name} (${getRoleDisplayName(user.role)})` : 'Bilinmeyen',
                    department: approval.department || 'Bilinmeyen',
                    orderNo: prod.orderNo,
                    date: approval.date,
                    timeSpent: approval.timeSpent ? `${approval.timeSpent} saat` : 'Girilmemiş'
                });
            }
        });
    });

    const sortedActivities = activities
        .sort((a, b) => {
            const dateA = a.date.split('.').reverse().join('-');
            const dateB = b.date.split('.').reverse().join('-');
            return new Date(dateB) - new Date(dateA);
        })
        .slice(0, 5);

    return `
        <ul class="activity-list">
            ${sortedActivities.length > 0 ? sortedActivities.map(activity => `
                <li>
                    <strong>${activity.user}</strong>, <span class="badge primary">${activity.department}</span> için 
                    <strong>${activity.orderNo}</strong> iş emrini ${activity.date} tarihinde onayladı 
                    (${activity.timeSpent}).
                </li>
            `).join('') : '<p class="text-gray-500">Henüz aktivite yok.</p>'}
        </ul>
    `;
}

// Ürün Çalışma Süreleri
function loadProductTimeSummary() {
    const summary = {};
    (firebaseData.production || []).forEach(prod => {
        if (!prod || !prod.orderNo || !prod.product) return;
        const approvals = prod.approvals || [];
        const totalTime = approvals.reduce((sum, a) => sum + (parseFloat(a.timeSpent) || 0), 0);
        summary[prod.orderNo] = {
            product: prod.product,
            totalTime,
            dates: approvals
                .filter(a => a.date)
                .map(a => ({
                    date: a.date,
                    timeSpent: a.timeSpent ? `${a.timeSpent} saat` : 'Girilmemiş'
                }))
        };
    });

    return `
        <div class="table-container">
            <table class="user-activity-table">
                <thead>
                    <tr>
                        <th>İş Emri No</th>
                        <th>Ürün</th>
                        <th>Toplam Süre (saat)</th>
                        <th>Çalışma Tarihleri</th>
                    </tr>
                </thead>
                <tbody>
                    ${Object.keys(summary).length > 0 ? Object.entries(summary).map(([orderNo, data]) => `
                        <tr>
                            <td><strong>${orderNo}</strong></td>
                            <td>${data.product}</td>
                            <td class="time-spent">${data.totalTime > 0 ? data.totalTime.toFixed(2) : 'Girilmemiş'}</td>
                            <td>
                                ${data.dates.length > 0 ? data.dates.map(d => `
                                    <div>${d.date}: ${d.timeSpent}</div>
                                `).join('') : 'Henüz tarih yok'}
                            </td>
                        </tr>
                    `).join('') : '<tr><td colspan="4" class="text-gray-500">Henüz veri yok</td></tr>'}
                </tbody>
            </table>
        </div>
    `;
}

// showPage fonksiyonuna bildirimler case'ini ekleyin
function showPage(pageName) {
    currentPage = pageName;
    
    document.querySelectorAll('.menu-item').forEach(item => item.classList.remove('active'));
    document.querySelectorAll('.submenu-item').forEach(item => item.classList.remove('active'));
    
    const pageContent = document.getElementById('pageContent');
    if (!pageContent) return;
    
    switch(pageName) {
        case 'dashboard':
            loadDashboard();
            break;
        case 'teklifHazirla':
            loadTeklifHazirla();
            break;
        case 'teklifListesi':
            loadTeklifListesi();
            break;
        case 'firmalar':
            loadFirmalar();
            break;
        case 'urunAgaci':
            loadUrunAgaci();
            break;
        case 'urunReceteleri':
            loadUrunReceteleri();
            break;
        case 'isEmriVer':
            loadIsEmriVer();
            break;
        case 'uretimTakip':
            loadUretimTakip();
            break;
        case 'uretimListesi':
            loadUretimListesi();
            break;
        case 'depo':
            loadDepo();
            break;
        case 'sevkiyatBekleyen':
            loadSevkiyatBekleyen();
            break;
        case 'sevkiyatEdilen':
            loadSevkiyatEdilen();
            break;
        case 'raporlar':
            loadRaporlar();
            break;
        case 'admin':
            loadAdmin();
            break;
        case 'kullaniciAktiviteleri':
            loadKullaniciAktiviteleri();
            break;
        case 'kullaniciRaporlari':
            loadKullaniciRaporlari();
            break;
        case 'bildirimler':  
            loadNotifications();
            break;
        case 'profil':
            loadUserProfile();
            break;
        case 'ayarlar':
            loadUserSettings();
            break;
        case 'aktivite':
            loadUserActivity();
            break;
        case 'insanKaynaklari':
            loadInsanKaynaklari();
            break;
        default:
            loadDashboard();
    }
    
    const menuItem = document.querySelector(`[onclick="showPage('${pageName}')"]`);
    if (menuItem) menuItem.classList.add('active');
}

// loadKullaniciAktiviteleri (Admin için) - Onaydan bağımsız çalışma saatleri de dahil
function loadKullaniciAktiviteleri() {
    if (!currentUser || currentUser.role !== 'admin') {
        showNotification('Erişim reddedildi', 'Bu sayfaya erişim yetkiniz bulunmamaktadır', 'error');
        showPage('dashboard');
        return;
    }
    const users = firebaseData.users || [];
    const content = `
        <div class="page-header">
            <h1 class="page-title"><i class="fas fa-user-clock"></i> Kullanıcı Aktiviteleri</h1>
            <p class="page-subtitle">Kullanıcıların üretimde yaptığı işler ve harcanan süreler</p>
        </div>
        <div class="card">
            <div class="card-header">
                <h3 class="card-title">Kullanıcı Bazlı İş Listesi</h3>
            </div>
            <div class="card-body">
                ${users.map(user => {
                    const userActivities = [];
                    
                    // Onaylanan işler
                    (firebaseData.production || []).forEach(prod => {
                        (prod.approvals || []).forEach(a => {
                            if (a.userId === user.id) {
                                const recipe = (firebaseData.recipes || []).find(r => r.id === prod.recipeId);
                                userActivities.push({
                                    orderNo: prod.orderNo,
                                    product: prod.product,
                                    recipe: recipe ? recipe.name : 'Bilinmeyen',
                                    department: a.department,
                                    date: a.date,
                                    timeSpent: a.timeSpent || 0,
                                    status: 'Onaylandı',
                                    type: 'approval'
                                });
                            }
                        });
                        
                        // Onaysız çalışma kayıtları (workTimeRecords)
                        (prod.workTimeRecords || []).forEach(record => {
                            if (record.userId === user.id) {
                                // Bu kaydın onaylanmış versiyonu var mı kontrol et
                                const hasApproval = (prod.approvals || []).some(a => 
                                    a.userId === user.id && a.department === record.department
                                );
                                
                                if (!hasApproval) {
                                    const recipe = (firebaseData.recipes || []).find(r => r.id === prod.recipeId);
                                    userActivities.push({
                                        orderNo: prod.orderNo,
                                        product: prod.product,
                                        recipe: recipe ? recipe.name : 'Bilinmeyen',
                                        department: record.department,
                                        date: record.date,
                                        timeSpent: record.timeSpent || 0,
                                        status: 'Çalışma Kaydı',
                                        type: 'workTime'
                                    });
                                }
                            }
                        });
                    });
                    
                    // Tarihe göre sırala
                    userActivities.sort((a, b) => {
                        const dateA = a.date.split('.').reverse().join('-');
                        const dateB = b.date.split('.').reverse().join('-');
                        return new Date(dateB) - new Date(dateA);
                    });
                    
                    const totalHours = userActivities.reduce((sum, activity) => sum + activity.timeSpent, 0);
                    
                    return `
                        <div class="section">
                            <h4 class="section-title">
                                ${user.name} (${user.username} - ${getRoleDisplayName(user.role)})
                                <span style="font-size: 14px; color: var(--gray-600); margin-left: 15px;">
                                    Toplam: ${totalHours.toFixed(1)} saat
                                </span>
                            </h4>
                            <div class="table-container">
                                <table class="user-activity-table">
                                    <thead>
                                        <tr>
                                            <th>İş Emri No</th>
                                            <th>Ürün</th>
                                            <th>Reçete</th>
                                            <th>Bölüm</th>
                                            <th>Tarih</th>
                                            <th>Çalışma Süresi</th>
                                            <th>Durum</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        ${userActivities.length > 0 ? userActivities.map(activity => `
                                            <tr>
                                                <td><strong>${activity.orderNo}</strong></td>
                                                <td>${activity.product}</td>
                                                <td>${activity.recipe}</td>
                                                <td><span class="badge primary">${activity.department}</span></td>
                                                <td>${activity.date}</td>
                                                <td class="time-spent">${activity.timeSpent > 0 ? activity.timeSpent + ' saat' : 'Girilmemiş'}</td>
                                                <td>
                                                    <span class="badge ${activity.type === 'approval' ? 'success' : 'info'}">
                                                        ${activity.status}
                                                    </span>
                                                </td>
                                            </tr>
                                        `).join('') : '<tr><td colspan="7" class="text-gray-500">Henüz aktivite yok</td></tr>'}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    `;
                }).join('')}
            </div>
        </div>
    `;
    document.getElementById('pageContent').innerHTML = content;
}


function loadDashboard() {
    const productionData = firebaseData.production || [];
    const users = firebaseData.users || [];

    // Son aktiviteler verisi
    const activities = [];
    productionData.forEach(prod => {
        (prod.approvals || []).forEach(approval => {
            const user = users.find(u => u.id === approval.userId);
            activities.push({
                user: user ? `${user.name} (${getRoleDisplayName(user.role)})` : 'Bilinmeyen',
                department: approval.department,
                orderNo: prod.orderNo,
                date: approval.date,
                timeSpent: approval.timeSpent ? `${approval.timeSpent} saat` : 'Girilmemiş'
            });
        });
    });

    // Son 5 aktivite, tarihe göre sıralı
    const sortedActivities = activities
        .sort((a, b) => {
            const dateA = a.date.split('.').reverse().join('-');
            const dateB = b.date.split('.').reverse().join('-');
            return new Date(dateB) - new Date(dateA);
        })
        .slice(0, 5);

    // Ürün çalışma süreleri
    const summary = {};
    productionData.forEach(prod => {
        const approvals = prod.approvals || [];
        const totalTime = approvals.reduce((sum, a) => sum + (parseFloat(a.timeSpent) || 0), 0);
        summary[prod.orderNo] = {
            product: prod.product,
            totalTime,
            dates: approvals
                .filter(a => a.date)
                .map(a => ({
                    date: a.date,
                    timeSpent: a.timeSpent ? `${a.timeSpent} saat` : 'Girilmemiş'
                }))
        };
    });

    const content = `
        <div class="page-header">
            <h1 class="page-title"><i class="fas fa-tachometer-alt"></i> Ana Sayfa</h1>
            <p class="page-subtitle">Sistem genel özeti ve son aktiviteler</p>
        </div>
        <div class="stats-grid">
            <div class="stat-card">
                <div class="stat-icon primary"><i class="fas fa-file-contract"></i></div>
                <div class="stat-value">${productionData.length}</div>
                <div class="stat-label">Aktif İş Emirleri</div>
            </div>
            <div class="stat-card">
                <div class="stat-icon success"><i class="fas fa-boxes"></i></div>
                <div class="stat-value">${(firebaseData.products || []).length}</div>
                <div class="stat-label">Toplam Ürün</div>
            </div>
            <div class="stat-card">
                <div class="stat-icon warning"><i class="fas fa-clock"></i></div>
                <div class="stat-value">${activities.length}</div>
                <div class="stat-label">Toplam Onay</div>
            </div>
            <div class="stat-card">
                <div class="stat-icon info"><i class="fas fa-users"></i></div>
                <div class="stat-value">${users.length}</div>
                <div class="stat-label">Kullanıcı Sayısı</div>
            </div>
        </div>
        <div class="card-grid">
            <div class="card">
                <div class="card-header">
                    <h3 class="card-title">Son Aktiviteler</h3>
                </div>
                <div class="card-body">
                    ${loadRecentActivities()}
                </div>
            </div>
            <div class="card">
                <div class="card-header">
                    <h3 class="card-title">Ürün Çalışma Süreleri</h3>
                </div>
                <div class="card-body">
                    ${loadProductTimeSummary()}
                </div>
            </div>
        </div>
    `;
    document.getElementById('pageContent').innerHTML = content;
}

// Load Companies - Firebase
function loadFirmalar() {
    const content = `
        <div class="page-header">
            <h1 class="page-title"><i class="fas fa-building"></i> Firmalar</h1>
            <p class="page-subtitle">Müşteri ve tedarikçi firmalarını yönetin</p>
        </div>
        <div class="card">
            <div class="card-header">
                <div class="flex justify-between items-center">
                    <div>
                        <h3 class="card-title">Firma Listesi</h3>
                        <p class="card-subtitle">Toplam ${firebaseData.companies.length} firma kayıtlı</p>
                    </div>
                    <button class="btn btn-primary" onclick="addCompany()">
                        <i class="fas fa-plus"></i> Yeni Firma Ekle
                    </button>
                </div>
            </div>
            <div class="card-body">
                <div class="table-container">
                    <table class="table">
                        <thead>
                            <tr>
                                <th>Firma Adı</th>
                                <th>Vergi No</th>
                                <th>Telefon</th>
                                <th>E-posta</th>
                                <th>Adres</th>
                                <th>Tip</th>
                                <th>İşlemler</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${firebaseData.companies.map(company => `
                                <tr>
                                    <td><strong>${company.name}</strong> ${company.isFavorite ? '<i class="fas fa-star" style="color: gold;"></i>' : ''}</td>
                                    <td>${company.taxNo}</td>
                                    <td>${company.phone}</td>
                                    <td>${company.email}</td>
                                    <td>${company.address}</td>
                                    <td><span class="badge ${company.customerType === 'vip' ? 'warning' : company.customerType === 'potansiyel' ? 'info' : 'success'}">${company.customerType || 'normal'}</span></td>
                                    <td>
                                        <div class="action-buttons">
                                            <button class="action-btn edit" onclick="editCompany('${company.id}')">
                                                <i class="fas fa-edit"></i>
                                            </button>
                                            <button class="action-btn delete" onclick="deleteCompany('${company.id}')">
                                                <i class="fas fa-trash"></i>
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    `;
    document.getElementById('pageContent').innerHTML = content;
}

// Load Stock Management - Firebase - Ürün tabında hammaddeler göster
// Load Ürün Ağacı - Firebase (eski loadUrunler)
function loadUrunAgaci() {
    const content = `
        <div class="page-header">
            <h1 class="page-title"><i class="fas fa-boxes"></i> Ürün Ağacı</h1>
            <p class="page-subtitle">Üretilen ürünleri yönetin</p>
        </div>
        <div class="stats-grid">
            <div class="stat-card">
                <div class="stat-icon primary"><i class="fas fa-box"></i></div>
                <div class="stat-value">${firebaseData.products.length}</div>
                <div class="stat-label">Ürün Kalemi</div>
            </div>
            <div class="stat-card">
                <div class="stat-icon danger"><i class="fas fa-times"></i></div>
                <div class="stat-value">${firebaseData.products.filter(p => p.stock === 0).length}</div>
                <div class="stat-label">Tükenmiş Ürün</div>
            </div>
        </div>
        <div class="card">
            <div class="card-header">
                <div class="flex justify-between items-center">
                    <div>
                        <h3 class="card-title">Ürün Listesi</h3>
                        <p class="card-subtitle">Toplam ${firebaseData.products.length} ürün kayıtlı</p>
                    </div>
                    <button class="btn btn-primary" onclick="addProduct()">
                        <i class="fas fa-plus"></i> Yeni Ürün
                    </button>
                </div>
            </div>
            <div class="card-body">
                <div class="filter-bar">
                    <div class="filter-grid">
                        <div class="search-box">
                            <i class="fas fa-search"></i>
                            <input type="text" placeholder="Ürün ara..." onkeyup="searchProducts(this.value)">
                        </div>
                        <div class="form-group">
                            <select class="form-control" onchange="filterByCategory(this.value)">
                                <option value="">Tüm Kategoriler</option>
                                <option>Metal</option>
                                <option>Plastik</option>
                                <option>Elektronik</option>
                            </select>
                        </div>
                    </div>
                </div>
                <div class="table-container">
                    <table class="table">
                        <thead>
                            <tr>
                                <th>Kod</th>
                                <th>Barkod</th>
                                <th>Ürün Adı</th>
                                <th>Kategori</th>
                                <th>Fiyat</th>
                                <th>Stok</th>
                                <th>Reçete</th>
                                <th>İşlemler</th>
                            </tr>
                        </thead>
                        <tbody id="productTableBody">
                            ${firebaseData.products.map(product => {
                                const recipe = firebaseData.recipes.find(r => r.productId === product.id);
                                return `
                                <tr>
                                    <td>${product.code}</td>
                                    <td>${product.barcode || ''}</td>
                                    <td><strong>${product.name}</strong></td>
                                    <td><span class="badge primary">${product.category}</span></td>
                                    <td>${product.price} ₺</td>
                                    <td>${product.stock} adet</td>
                                    <td>${recipe ? `<span class="badge success">${recipe.name}</span>` : '<span class="badge warning">Reçete Yok</span>'}</td>
                                    <td>
                                        <div class="action-buttons">
                                            <button class="action-btn view" onclick="showProductDetails('${product.id}')">
                                                <i class="fas fa-eye"></i>
                                            </button>
                                            <button class="action-btn edit" onclick="editProduct('${product.id}')">
                                                <i class="fas fa-edit"></i>
                                            </button>
                                            <button class="action-btn delete" onclick="deleteProduct('${product.id}')">
                                                <i class="fas fa-trash"></i>
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            `;
                            }).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    `;
    document.getElementById('pageContent').innerHTML = content;
}

function loadTeklifHazirla() {
    const content = `
        <div class="page-header">
            <h1 class="page-title"><i class="fas fa-file-contract"></i> Teklif Hazırla</h1>
            <p class="page-subtitle">Yeni teklif oluşturun</p>
        </div>
        <div class="card">
            <div class="card-header">
                <h3 class="card-title">Firma Seçimi</h3>
            </div>
            <div class="card-body">
                <div class="form-group">
                    <label class="form-label">Firma</label>
                    <button type="button" class="btn btn-outline-primary form-control" onclick="openCompanySelectionModal()" id="companySelectionBtn" style="text-align: left; justify-content: left;">
                        <i class="fas fa-building" style="margin-right: 8px;"></i>Firma seçiniz...
                    </button>
                    <input type="hidden" id="offerCompany" value="">
                    <input type="hidden" id="offerCompanyId" value="">
                    <small class="text-muted">Firma seçmek için butona tıklayın veya yeni firma ekleyin.</small>
                </div>
                
                <div class="form-group">
                    <label class="form-label">Teklif Tarihi</label>
                    <input type="date" class="form-control" value="${new Date().toISOString().split('T')[0]}" id="offerDate">
                </div>
                <div class="form-group">
                    <label class="form-label">Geçerlilik Süresi</label>
                    <select class="form-control" id="offerValidity">
                        <option>15 gün</option>
                        <option>30 gün</option>
                        <option>45 gün</option>
                        <option>60 gün</option>
                    </select>
                </div>
            </div>
        </div>
        <div class="card">
            <div class="card-header">
                <h3 class="card-title">Ürünler</h3>
                <p class="card-subtitle">Teklife eklenecek ürünler</p>
            </div>
            <div class="card-body">
                <div class="filter-bar">
                    <div class="search-box">
                        <i class="fas fa-search"></i>
                        <input type="text" placeholder="Ürün ara..." onkeyup="searchOfferProducts(this.value)">
                    </div>
                    <button class="btn btn-success" onclick="addOfferProduct()">
                        <i class="fas fa-plus"></i> Ürün Ekle
                    </button>
                </div>
                <div class="table-container">
                    <table class="table">
                        <thead>
                            <tr>
                                <th>Ürün</th>
                                <th>Hammaddeler</th>
                                <th>Miktar</th>
                                <th>Birim Fiyat</th>
                                <th>Toplam</th>
                                <th></th>
                            </tr>
                        </thead>
                        <tbody id="offerProductsTable">
                            <!-- Products will be added here -->
                        </tbody>
                    </table>
                </div>
                <div style="margin-top: 20px; text-align: right;">
                    <div style="font-size: 18px; font-weight: 600; margin-bottom: 16px;">
                        Ara Toplam: <span id="offerSubtotal">0 ₺</span>
                    </div>
                    <div style="font-size: 16px; color: var(--gray-500); margin-bottom: 8px;">
                        KDV (%20): <span id="offerTax">0 ₺</span>
                    </div>
                    <div style="font-size: 24px; font-weight: 700; color: var(--primary);">
                        Genel Toplam: <span id="offerTotal">0 ₺</span>
                    </div>
                </div>
                <div style="margin-top: 24px; text-align: right;">
                    <button class="btn btn-primary" onclick="previewOffer()">
                        <i class="fas fa-eye"></i> Önizleme
                    </button>
                    <button class="btn btn-success" onclick="saveOffer()">
                        <i class="fas fa-save"></i> Teklifi Kaydet
                    </button>
                    <button class="btn btn-success" onclick="sendOffer()">
                        <i class="fas fa-paper-plane"></i> Teklifi Gönder
                    </button>
                </div>
            </div>
        </div>
    `;
    document.getElementById('pageContent').innerHTML = content;
    document.getElementById('offerProductsTable').innerHTML = '';
}

// Yeni: Firma Modal Aç - Yeni ekle veya düzenle
function openCompanyModal(companyId = null) {
    const company = companyId ? firebaseData.companies.find(c => c.id === companyId) : null;
    document.getElementById('companyModalTitle').textContent = company ? 'Firma Düzenle' : 'Yeni Firma Ekle';
    document.getElementById('companyModalBody').innerHTML = `
        <form id="companyForm">
            <div class="form-group">
                <label class="form-label">Firma Adı</label>
                <input type="text" class="form-control" id="companyFormName" value="${company ? company.name : ''}" required>
            </div>
            <div class="form-group">
                <label class="form-label">Vergi No</label>
                <input type="text" class="form-control" id="companyFormTaxNo" value="${company ? company.taxNo : ''}" required>
            </div>
            <div class="form-group">
                <label class="form-label">Telefon</label>
                <input type="text" class="form-control" id="companyFormPhone" value="${company ? company.phone : ''}">
            </div>
            <div class="form-group">
                <label class="form-label">E-posta</label>
                <input type="email" class="form-control" id="companyFormEmail" value="${company ? company.email : ''}">
            </div>
            <div class="form-group">
                <label class="form-label">Web Sitesi</label>
                <input type="text" class="form-control" id="companyFormWebsite" value="${company ? company.website : ''}">
            </div>
            <div class="form-group">
                <label class="form-label">Adres</label>
                <textarea class="form-control" id="companyFormAddress">${company ? company.address : ''}</textarea>
            </div>
            <div class="form-group">
                <label class="form-label">Müşteri Tipi</label>
                <select class="form-control" id="companyFormType">
                    <option value="normal" ${company && company.customerType === 'normal' ? 'selected' : ''}>Normal</option>
                    <option value="vip" ${company && company.customerType === 'vip' ? 'selected' : ''}>VIP</option>
                    <option value="potansiyel" ${company && company.customerType === 'potansiyel' ? 'selected' : ''}>Potansiyel</option>
                </select>
            </div>
            <div class="form-group">
                <label><input type="checkbox" id="companyFormEmailAccept" ${company && company.acceptsEmailNotifications ? 'checked' : ''}> E-posta Bildirimleri Kabul Ediyor</label>
            </div>
            <div class="form-group">
                <label><input type="checkbox" id="companyFormFavorite" ${company && company.isFavorite ? 'checked' : ''}> Sık Kullanılan</label>
            </div>
            <div class="form-group">
                <label class="form-label">Fotoğraf Yükle (Opsiyonel)</label>
                <input type="file" class="form-control" id="companyFormImage" accept="image/*">
            </div>
        </form>
    `;
    document.getElementById('companyModal').querySelector('.modal-footer').innerHTML = `
        <button class="btn btn-success" onclick="saveCompanyAndUpdateDropdown('${companyId || ''}')">Kaydet</button>
        <button class="btn btn-outline" onclick="closeModal('companyModal')">İptal</button>
    `;
    openModal('companyModal');
}

// Yeni: Firma Kaydet ve Dropdown Güncelle
async function saveCompanyAndUpdateDropdown(companyId = null) {
    await saveCompany(companyId);
    // Dropdown güncelle
    const select = document.getElementById('offerCompany');
    if (select) {
        select.innerHTML = '<option value="">Firma seçiniz...</option>' + firebaseData.companies.map(company => `<option value="${company.id}" ${company.isFavorite ? 'style="font-weight: bold;"' : ''}>${company.name} - ${company.taxNo} ${company.isFavorite ? '(Sık Kullanılan)' : ''}</option>`).join('');
    }
}

// Yeni: Firma Filtreleme (Arama)
// filterCompanies: Firma arama için iyileştirme
function filterCompanies() {
    const search = document.getElementById('companySearch').value.toLowerCase().trim();
    const select = document.getElementById('offerCompany');
    if (!select) return;

    Array.from(select.options).forEach(option => {
        if (option.value === '') {
            option.style.display = '';
            return;
        }
        const text = option.text.toLowerCase();
        option.style.display = text.includes(search) ? '' : 'none';
    });

    // Arama sonrası seçili firma kaybolursa seçimi sıfırla
    if (select.options[select.selectedIndex]?.style.display === 'none') {
        select.value = '';
    }
}

function previewOffer() {
    const companyId = document.getElementById('offerCompanyId')?.value || document.getElementById('offerCompany')?.value;
    const company = firebaseData.companies.find(c => c.id === companyId);
    
    if (!company) {
        showNotification('Hata', 'Lütfen firma seçin.', 'error');
        return;
    }

    const items = [];
    const rows = document.querySelectorAll('#offerProductsTable tr');
    
    rows.forEach(row => {
        const productSelect = row.querySelector('select');
        const qtyInput = row.querySelectorAll('input[type="number"]')[0]; // İlk number input miktar
        const priceInput = row.querySelectorAll('input[type="number"]')[1]; // İkinci number input fiyat
        
        if (productSelect && qtyInput) {
            const productId = productSelect.value;
            const qty = parseFloat(qtyInput.value) || 0;
            const price = parseFloat(priceInput?.value) || parseFloat(productSelect.selectedOptions[0]?.dataset.price) || 0;
            
            if (productId && qty > 0) {
                const product = firebaseData.products.find(p => p.id === productId);
                const recipe = firebaseData.recipes.find(r => r.productId === productId);
                const rawMaterialIds = product?.rawMaterials || [];
                
                const rawDetails = rawMaterialIds.map(rmId => {
                    const rm = firebaseData.stock.find(s => s.id === rmId);
                    const multiplier = recipe ? recipe.quantityPerUnit : 1;
                    return rm ? `${rm.name} (${qty * multiplier} ${rm.unit})` : '';
                }).filter(x => x).join(', ');
                
                items.push({
                    name: product?.name || 'Bilinmeyen Ürün',
                    rawMaterials: rawDetails || 'Hammadde tanımlanmamış',
                    quantity: qty,
                    price: price
                });
            }
        }
    });

    if (items.length === 0) {
        showNotification('Hata', 'Lütfen en az bir ürün ekleyin.', 'error');
        return;
    }

    const date = document.getElementById('offerDate').value;
    const validity = document.getElementById('offerValidity').value;
    const subtotal = items.reduce((sum, item) => sum + (item.quantity * item.price), 0);
    const tax = subtotal * 0.20;
    const total = subtotal + tax;

    // Şirket bilgileri
    const companyInfo = {
        name: 'Furka Tech ERP',
        address: 'Organize Sanayi Bölgesi 3. Cadde No:45',
        city: 'İstanbul, Türkiye',
        phone: '+90 212 555 00 00',
        email: 'info@furkatech.com',
        website: 'www.furkatech.com',
        taxNo: '123 456 789',
        logo: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTUwIiBoZWlnaHQ9IjUwIiB2aWV3Qm94PSIwIDAgMTUwIDUwIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPjxyZWN0IHdpZHRoPSIxNTAiIGhlaWdodD0iNTAiIGZpbGw9IiM0RjQ2RTUiLz48dGV4dCB4PSI3NSIgeT0iMzAiIGZvbnQtZmFtaWx5PSJBcmlhbCwgc2Fucy1zZXJpZiIgZm9udC1zaXplPSIxOCIgZm9udC13ZWlnaHQ9ImJvbGQiIGZpbGw9IndoaXRlIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIj5GdXJrYSBUZWNoPC90ZXh0Pjwvc3ZnPg=='
    };

    const offerNo = `TKF-${new Date().getFullYear()}-${String((firebaseData.offers?.length || 0) + 1).padStart(4, '0')}`;

    const previewHtml = `
        <div class="offer-preview" style="font-family: 'Inter', -apple-system, sans-serif; padding: 40px; background: white; position: relative;">
            <!-- Üst Bilgiler -->
            <div style="display: flex; justify-content: space-between; align-items: start; margin-top: 50px; padding-bottom: 30px; border-bottom: 2px solid #e5e7eb;">
                <!-- Sol: Bizim Firma -->
                <div style="flex: 1;">
                    <img src="${companyInfo.logo}" alt="Logo" style="height: 40px; margin-bottom: 20px;">
                    <h2 style="font-size: 20px; font-weight: 700; color: #1f2937; margin: 0 0 10px 0;">${companyInfo.name}</h2>
                    <div style="font-size: 13px; color: #6b7280; line-height: 1.6;">
                        <div>${companyInfo.address}</div>
                        <div>${companyInfo.city}</div>
                        <div>Tel: ${companyInfo.phone}</div>
                        <div>E-posta: ${companyInfo.email}</div>
                        <div>Vergi No: ${companyInfo.taxNo}</div>
                    </div>
                </div>
                
                <!-- Orta: Teklif Başlığı -->
                <div style="flex: 1; text-align: center; padding: 0 20px;">
                    <h1 style="font-size: 24px; font-weight: 700; color: #4F46E5; margin: 20px 0 10px 0;">TEKLİF</h1>
                    <div style="font-size: 14px; color: #6b7280;">
                        <div style="margin: 5px 0;">Teklif No: <strong>${offerNo}</strong></div>
                        <div style="margin: 5px 0;">Tarih: <strong>${new Date(date).toLocaleDateString('tr-TR')}</strong></div>
                        <div style="margin: 5px 0;">Geçerlilik: <strong>${validity}</strong></div>
                    </div>
                </div>
                
                <!-- Sağ: Müşteri Bilgileri -->
                <div style="flex: 1; text-align: right;">
                    <div style="font-size: 12px; color: #6b7280; margin-bottom: 10px;">SAYIN MÜŞTERİMİZ</div>
                    <h3 style="font-size: 18px; font-weight: 600; color: #1f2937; margin: 0 0 10px 0;">${company.name}</h3>
                    <div style="font-size: 13px; color: #6b7280; line-height: 1.6;">
                        <div>Vergi No: ${company.taxNo}</div>
                        ${company.phone ? `<div>Tel: ${company.phone}</div>` : ''}
                        ${company.email ? `<div>E-posta: ${company.email}</div>` : ''}
                        ${company.address ? `<div style="max-width: 250px; margin-left: auto;">${company.address}</div>` : ''}
                    </div>
                </div>
            </div>
            
            <!-- Teklif İçeriği -->
            <div style="margin: 40px 0;">
                <table style="width: 100%; border-collapse: collapse;">
                    <thead>
                        <tr style="background: #f9fafb;">
                            <th style="padding: 12px; text-align: left; font-size: 12px; font-weight: 600; color: #4b5563; border-bottom: 2px solid #e5e7eb;">ÜRÜN ADI</th>
                            <th style="padding: 12px; text-align: left; font-size: 12px; font-weight: 600; color: #4b5563; border-bottom: 2px solid #e5e7eb;">KULLANILACAK HAMMADDELER</th>
                            <th style="padding: 12px; text-align: center; font-size: 12px; font-weight: 600; color: #4b5563; border-bottom: 2px solid #e5e7eb;">MİKTAR</th>
                            <th style="padding: 12px; text-align: right; font-size: 12px; font-weight: 600; color: #4b5563; border-bottom: 2px solid #e5e7eb;">BİRİM FİYAT</th>
                            <th style="padding: 12px; text-align: right; font-size: 12px; font-weight: 600; color: #4b5563; border-bottom: 2px solid #e5e7eb;">TOPLAM</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${items.map((item, index) => `
                            <tr style="border-bottom: 1px solid #f3f4f6;">
                                <td style="padding: 14px 12px; font-size: 14px; color: #1f2937;">
                                    <strong>${item.name}</strong>
                                </td>
                                <td style="padding: 14px 12px; font-size: 12px; color: #6b7280;">
                                    ${item.rawMaterials}
                                </td>
                                <td style="padding: 14px 12px; text-align: center; font-size: 14px; color: #1f2937;">
                                    ${item.quantity}
                                </td>
                                <td style="padding: 14px 12px; text-align: right; font-size: 14px; color: #1f2937;">
                                    ${item.price.toFixed(2)} ₺
                                </td>
                                <td style="padding: 14px 12px; text-align: right; font-size: 14px; font-weight: 600; color: #1f2937;">
                                    ${(item.quantity * item.price).toFixed(2)} ₺
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
            
            <!-- Toplam -->
            <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
                <div style="display: flex; justify-content: flex-end;">
                    <div style="width: 300px;">
                        <div style="display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 14px;">
                            <span style="color: #6b7280;">Ara Toplam:</span>
                            <span style="color: #1f2937; font-weight: 500;">${subtotal.toFixed(2)} ₺</span>
                        </div>
                        <div style="display: flex; justify-content: space-between; margin-bottom: 12px; font-size: 14px;">
                            <span style="color: #6b7280;">KDV (%20):</span>
                            <span style="color: #1f2937; font-weight: 500;">${tax.toFixed(2)} ₺</span>
                        </div>
                        <div style="display: flex; justify-content: space-between; padding-top: 12px; border-top: 2px solid #4F46E5; font-size: 18px; font-weight: 700;">
                            <span style="color: #1f2937;">GENEL TOPLAM:</span>
                            <span style="color: #4F46E5;">${total.toFixed(2)} ₺</span>
                        </div>
                    </div>
                </div>
            </div>
            
            <!-- Alt Bilgi -->
            <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb; text-align: center; font-size: 12px; color: #9ca3af;">
                <p>Bu teklif ${validity} süreyle geçerlidir.</p>
                <p style="margin-top: 5px;">Teklif kabul edildiği takdirde sipariş onayı gönderilecektir.</p>
            </div>
        </div>
    `;

    document.getElementById('offerPreviewBody').innerHTML = previewHtml;
    openModal('offerPreviewModal');
}
// Load Offer List - Firebase
function loadTeklifListesi() {
    const content = `
        <div class="page-header">
            <h1 class="page-title"><i class="fas fa-list"></i> Teklifler Listesi</h1>
            <p class="page-subtitle">Oluşturulan teklifleri görüntüleyin</p>
        </div>
        <div class="card">
            <div class="card-header">
                <div class="flex justify-between items-center">
                    <div>
                        <h3 class="card-title">Teklifler</h3>
                        <p class="card-subtitle">Toplam ${firebaseData.offers.length} teklif</p>
                    </div>
                    <button class="btn btn-primary" onclick="showPage('teklifHazirla')">
                        <i class="fas fa-plus"></i> Yeni Teklif
                    </button>
                </div>
            </div>
            <div class="card-body">
                <div class="table-container">
                    <table class="table">
                        <thead>
                            <tr>
                                <th>Teklif No</th>
                                <th>Firma</th>
                                <th>Tarih</th>
                                <th>Toplam</th>
                                <th>Durum</th>
                                <th>İşlemler</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${firebaseData.offers.map(offer => {
                                const company = firebaseData.companies.find(c => c.id === offer.companyId);
                                return `
                                    <tr>
                                        <td><strong>${offer.no}</strong></td>
                                        <td>${company?.name || 'Bilinmeyen'}</td>
                                        <td>${offer.date}</td>
                                        <td>${offer.total.toFixed(2)} ₺</td>
                                        <td><span class="badge ${offer.status === 'Onaylandı' ? 'success' : offer.status === 'Beklemede' ? 'warning' : 'danger'}">${offer.status}</span></td>
                                        <td>
                                            <div class="action-buttons">
                                                <button class="action-btn view" onclick="viewOffer('${offer.id}')">
                                                    <i class="fas fa-eye"></i>
                                                </button>
                                                <button class="action-btn edit" onclick="editOffer('${offer.id}')">
                                                    <i class="fas fa-edit"></i>
                                                </button>
                                                <button class="action-btn delete" onclick="deleteOffer('${offer.id}')">
                                                    <i class="fas fa-trash"></i>
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                `;
                            }).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    `;
    document.getElementById('pageContent').innerHTML = content;
}

// loadUretimListesi - Icon'lu versiyon
function loadUretimListesi() {
    const departments = ['Depo/Stok', 'Dizgi', 'İmalat/Montaj'];
    const content = `
        <div class="page-header">
            <h1 class="page-title"><i class="fas fa-list"></i> Üretim Listesi</h1>
            <p class="page-subtitle">Bölüm bazlı işleri görüntüleyin ve onaylayın</p>
        </div>
        <div class="card">
            <div class="card-header">
                <div class="flex justify-between items-center">
                    <h3 class="card-title">Üretim İşleri</h3>
                    <button class="btn btn-primary" onclick="printProductionList()">
                        <i class="fas fa-print"></i> Listeyi Yazdır
                    </button>
                </div>
            </div>
            <div class="card-body">
                <div class="table-container" id="productionListTable">
                    <table class="table">
                        <thead>
                            <tr>
                                <th>İş Emri No</th>
                                <th>Ürün</th>
                                <th>Reçete</th>
                                <th>Miktar</th>
                                <th>Depo/Stok</th>
                                <th>Dizgi</th>
                                <th>İmalat/Montaj</th>
                                <th>İlerleme</th>
                                <th class="no-print">İşlemler</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${firebaseData.production
                                .filter(p => p.status !== 'Tamamlandı')
                                .map(prod => {
                                    const recipe = firebaseData.recipes.find(r => r.id === prod.recipeId);
                                    const approvals = prod.approvals || [];
                                    const approvalStates = {
                                        'Depo/Stok': approvals.some(a => a.department === 'Depo/Stok'),
                                        Dizgi: approvals.some(a => a.department === 'Dizgi'),
                                        'İmalat/Montaj': approvals.some(a => a.department === 'İmalat/Montaj')
                                    };
                                    return `
                                    <tr>
                                        <td><strong>${prod.orderNo}</strong></td>
                                        <td>${prod.product}</td>
                                        <td>${recipe ? recipe.name : 'Bilinmeyen'}</td>
                                        <td>${prod.quantity}</td>
                                        <td>
                                            <span class="badge ${approvalStates['Depo/Stok'] ? 'success' : 'warning'}">
                                                <i class="fas ${approvalStates['Depo/Stok'] ? 'fa-check-circle' : 'fa-clock'}"></i>
                                                ${approvalStates['Depo/Stok'] ? 'Onaylandı' : 'Bekliyor'}
                                            </span>
                                        </td>
                                        <td>
                                            <span class="badge ${approvalStates.Dizgi ? 'success' : 'warning'}">
                                                <i class="fas ${approvalStates.Dizgi ? 'fa-check-circle' : 'fa-clock'}"></i>
                                                ${approvalStates.Dizgi ? 'Onaylandı' : 'Bekliyor'}
                                            </span>
                                        </td>
                                        <td>
                                            <span class="badge ${approvalStates['İmalat/Montaj'] ? 'success' : 'warning'}">
                                                <i class="fas ${approvalStates['İmalat/Montaj'] ? 'fa-check-circle' : 'fa-clock'}"></i>
                                                ${approvalStates['İmalat/Montaj'] ? 'Onaylandı' : 'Bekliyor'}
                                            </span>
                                        </td>
                                        <td>
                                            <div style="display: flex; align-items: center; gap: 8px;">
                                                <div style="width: 60px; height: 6px; background: var(--gray-200); border-radius: 3px; overflow: hidden;">
                                                    <div style="width: ${prod.progress || 0}%; height: 100%; background: var(--primary);"></div>
                                                </div>
                                                <span>${prod.progress || 0}%</span>
                                            </div>
                                        </td>
                                        <td class="no-print">
                                            <button class="btn btn-sm btn-primary" onclick="showProductionDetail('${prod.id}')">
                                                <i class="fas fa-edit"></i> Düzenle
                                            </button>
                                            <button class="btn btn-sm btn-info" onclick="printProductionOrder('${prod.id}')">
                                                <i class="fas fa-print"></i>
                                            </button>
                                        </td>
                                    </tr>
                                `;
                                }).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    `;
    document.getElementById('pageContent').innerHTML = content;
}
// Genel değişiklikleri kaydet (admin için, production değişikliklerini batch olarak)
async function saveAllProductionChanges() {
    // Bu fonksiyon için production değişikliklerini topla (modal'dan açılan değişiklikler zaten kaydediliyor, bu admin için toplu onay)
    showNotification('Bilgi', 'Değişiklikler modal üzerinden kaydediliyor. Toplu kaydetme için modal kullanın.', 'info');
    // Eğer toplu kaydetme istersen, local değişiklikleri Firebase'e push et (şimdilik modal öncelikli)
}
function loadDepo() {
    const content = `
        <div class="page-header">
            <h1 class="page-title"><i class="fas fa-warehouse"></i> Depo Yönetimi</h1>
            <p class="page-subtitle">Hammadde stoklarını yönetin</p>
        </div>
        <div class="stats-grid">
            <div class="stat-card">
                <div class="stat-icon primary"><i class="fas fa-box"></i></div>
                <div class="stat-value">${firebaseData.stock.length}</div>
                <div class="stat-label">Hammadde Kalemi</div>
            </div>
            <div class="stat-card">
                <div class="stat-icon warning"><i class="fas fa-exclamation-triangle"></i></div>
                <div class="stat-value">${firebaseData.stock.filter(s => s.quantity <= s.minStock && s.quantity > 0).length}</div>
                <div class="stat-label">Kritik Hammadde</div>
            </div>
            <div class="stat-card">
                <div class="stat-icon danger"><i class="fas fa-times"></i></div>
                <div class="stat-value">${firebaseData.stock.filter(s => s.quantity === 0).length}</div>
                <div class="stat-label">Tükenmiş Hammadde</div>
            </div>
        </div>
        <div class="card">
            <div class="card-header">
                <div class="flex justify-between items-center">
                    <div>
                        <h3 class="card-title">Hammadde Listesi</h3>
                        <p class="card-subtitle">Hammadde stokları</p>
                    </div>
                    <button class="btn btn-primary" onclick="addStock()">
                        <i class="fas fa-plus"></i> Hammadde Ekle
                    </button>
                </div>
            </div>
            <div class="card-body">
                <div class="table-container">
                    <table class="table">
                        <thead>
                            <tr>
                                <th>Stok Kodu</th>
                                <th>Barkod</th>
                                <th>Malzeme Adı</th>
                                <th>Miktar</th>
                                <th>Birim</th>
                                <th>Min. Stok</th>
                                <th>Durum</th>
                                <th>Son Güncelleme</th>
                                <th>İşlemler</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${firebaseData.stock.map(item => `
                                <tr>
                                    <td>${item.code}</td>
                                    <td>${item.barcode || ''}</td>
                                    <td><strong>${item.name}</strong></td>
                                    <td>${item.quantity}</td>
                                    <td>${item.unit}</td>
                                    <td>${item.minStock}</td>
                                    <td>
                                        ${item.quantity > item.minStock 
                                            ? '<span class="badge success">Yeterli</span>' 
                                            : item.quantity > 0 
                                                ? '<span class="badge warning">Kritik</span>'
                                                : '<span class="badge danger">Tükendi</span>'
                                        }
                                    </td>
                                    <td>${item.lastUpdate}</td>
                                    <td>
                                        <div class="action-buttons">
                                            <button class="action-btn view" onclick="showStockDetails('${item.id}')">
                                                <i class="fas fa-eye"></i>
                                            </button>
                                            <button class="action-btn edit" onclick="editStock('${item.id}')">
                                                <i class="fas fa-edit"></i>
                                            </button>
                                            <button class="action-btn delete" onclick="deleteStock('${item.id}')">
                                                <i class="fas fa-trash"></i>
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    `;
    document.getElementById('pageContent').innerHTML = content;
}


async function deleteStock(stockId) {
    const stock = firebaseData.stock.find(s => s.id === stockId);
    if (!stock) {
        showNotification('Hata', 'Hammadde bulunamadı.', 'error');
        return;
    }
    
    // Reçetelerde kullanılıyor mu kontrol et
    const usedInRecipes = firebaseData.recipes.filter(r => 
        r.rawMaterials && r.rawMaterials.includes(stockId)
    );
    
    if (usedInRecipes.length > 0) {
        const recipeNames = usedInRecipes.map(r => r.name).join(', ');
        const confirmDelete = confirm(`Bu hammadde şu reçetelerde kullanılıyor: ${recipeNames}\n\nYine de silmek istiyor musunuz?`);
        if (!confirmDelete) return;
    }
    
    if (confirm(`${stock.name} hammaddesini silmek istediğinize emin misiniz?`)) {
        try {
            await window.firestoreService.deleteStock(stockId);
            showNotification('Hammadde Silindi', `${stock.name} başarıyla silindi.`, 'success');
            await loadFirebaseData();
            if (currentPage === 'depo') loadDepo();
        } catch (error) {
            console.error('Hammadde silme hatası:', error);
            showNotification('Hata', 'Hammadde silinirken hata oluştu.', 'error');
        }
    }
}

// Load Shipment
function loadSevkiyat() {
    const content = `
        <div class="page-header">
            <h1 class="page-title"><i class="fas fa-truck"></i> Sevkiyat Yönetimi</h1>
            <p class="page-subtitle">Sevkiyat operasyonlarını takip edin</p>
        </div>
        <div class="card">
            <div class="card-body">
                <div class="empty-state">
                    <i class="fas fa-shipping-fast"></i>
                    <h3>Sevkiyat Modülü</h3>
                    <p>Bu modül geliştirilme aşamasındadır.</p>
                </div>
            </div>
        </div>
    `;
    document.getElementById('pageContent').innerHTML = content;
}

function loadAdmin() {
    if (!currentUser || currentUser.role !== 'admin') {
        showNotification('Erişim reddedildi', 'Bu sayfaya erişim yetkiniz bulunmamaktadır', 'error');
        showPage('dashboard');
        return;
    }
    
    const content = `
        <div class="page-header">
            <h1 class="page-title"><i class="fas fa-shield-alt"></i> Admin Panel</h1>
            <p class="page-subtitle">Sistem ve kullanıcı ayarlarını yönetin</p>
        </div>
        
        <!-- Veri Yönetimi Bölümü -->
        <div class="card">
            <div class="card-header">
                <h3 class="card-title"><i class="fas fa-database"></i> Veri Yönetimi</h3>
                <p class="card-subtitle">Verileri yedekleyin, dışa aktarın veya temizleyin</p>
            </div>
            <div class="card-body">
                <div class="stats-grid">
                    <div class="stat-card">
                        <div class="stat-icon primary"><i class="fas fa-download"></i></div>
                        <div class="stat-value">${firebaseData.production.length + firebaseData.offers.length + firebaseData.shipments.length}</div>
                        <div class="stat-label">Toplam İşlem Kaydı</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-icon success"><i class="fas fa-calendar"></i></div>
                        <div class="stat-value">2025</div>
                        <div class="stat-label">Aktif Yıl</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-icon warning"><i class="fas fa-database"></i></div>
                        <div class="stat-value">${(firebaseData.users.length + firebaseData.products.length + firebaseData.stock.length + firebaseData.companies.length + firebaseData.recipes.length + firebaseData.production.length + firebaseData.offers.length + firebaseData.shipments.length)}</div>
                        <div class="stat-label">Toplam Kayıt</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-icon info"><i class="fas fa-hdd"></i></div>
                        <div class="stat-value">${Math.round(JSON.stringify(firebaseData).length / 1024)} KB</div>
                        <div class="stat-label">Veri Boyutu</div>
                    </div>
                </div>
                
                <div style="margin-top: 20px; display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 20px;">
                    <!-- Tüm Veriyi İndir -->
                    <div style="border: 2px solid var(--primary); border-radius: 10px; padding: 20px;">
                        <h4 style="margin-bottom: 10px;"><i class="fas fa-database"></i> Tam Yedekleme</h4>
                        <p style="color: var(--gray-600); font-size: 14px; margin-bottom: 15px;">Tüm sistem verilerini ZIP formatında indirin</p>
                        <button class="btn btn-primary" onclick="exportAllData()">
                            <i class="fas fa-file-archive"></i> ZIP Olarak İndir
                        </button>
                    </div>
                    
                    <!-- Yıllık Veri İndir -->
                    <div style="border: 2px solid var(--warning); border-radius: 10px; padding: 20px;">
                        <h4 style="margin-bottom: 10px;"><i class="fas fa-calendar-alt"></i> Yıllık Export</h4>
                        <p style="color: var(--gray-600); font-size: 14px; margin-bottom: 15px;">Belirli bir yıla ait verileri indirin</p>
                        <div style="display: flex; gap: 10px;">
                            <select id="exportYear" class="form-control" style="flex: 1;">
                                <option value="2025">2025</option>
                                <option value="2024">2024</option>
                                <option value="2023">2023</option>
                            </select>
                            <button class="btn btn-warning" onclick="exportYearData()">
                                <i class="fas fa-file-export"></i> İndir
                            </button>
                        </div>
                    </div>
                    
                    <!-- Seçimli Export -->
                    <div style="border: 2px solid var(--success); border-radius: 10px; padding: 20px;">
                        <h4 style="margin-bottom: 10px;"><i class="fas fa-check-square"></i> Seçimli Export</h4>
                        <p style="color: var(--gray-600); font-size: 14px; margin-bottom: 15px;">İstediğiniz veri tiplerini seçin</p>
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 15px;">
                            <label style="cursor: pointer;"><input type="checkbox" name="dataType" value="users" style="margin-right: 5px;"> Kullanıcılar</label>
                            <label style="cursor: pointer;"><input type="checkbox" name="dataType" value="products" style="margin-right: 5px;"> Ürünler</label>
                            <label style="cursor: pointer;"><input type="checkbox" name="dataType" value="stock" style="margin-right: 5px;"> Stok</label>
                            <label style="cursor: pointer;"><input type="checkbox" name="dataType" value="companies" style="margin-right: 5px;"> Firmalar</label>
                            <label style="cursor: pointer;"><input type="checkbox" name="dataType" value="recipes" style="margin-right: 5px;"> Reçeteler</label>
                            <label style="cursor: pointer;"><input type="checkbox" name="dataType" value="production" style="margin-right: 5px;"> Üretim</label>
                            <label style="cursor: pointer;"><input type="checkbox" name="dataType" value="offers" style="margin-right: 5px;"> Teklifler</label>
                            <label style="cursor: pointer;"><input type="checkbox" name="dataType" value="shipments" style="margin-right: 5px;"> Sevkiyat</label>
                        </div>
                        <button class="btn btn-success" onclick="exportSelectedData()">
                            <i class="fas fa-file-archive"></i> Seçili Verileri İndir
                        </button>
                    </div>
                    
                    <!-- Eski Verileri Temizle -->
                    <div style="border: 2px solid var(--danger); border-radius: 10px; padding: 20px;">
                        <h4 style="margin-bottom: 10px;"><i class="fas fa-trash-alt"></i> Veri Temizleme</h4>
                        <p style="color: var(--gray-600); font-size: 14px; margin-bottom: 15px;">Eski yıllara ait verileri silin</p>
                        <div style="display: flex; gap: 10px;">
                            <select id="cleanYear" class="form-control" style="flex: 1;">
                                <option value="">Yıl Seçin</option>
                                <option value="2024">2024 ve öncesi</option>
                                <option value="2023">2023 ve öncesi</option>
                            </select>
                            <button class="btn btn-danger" onclick="cleanOldData()">
                                <i class="fas fa-broom"></i> Temizle
                            </button>
                        </div>
                    </div>
                    
                    <!-- Veri İçe Aktar -->
                    <div style="border: 2px solid var(--info); border-radius: 10px; padding: 20px;">
                        <h4 style="margin-bottom: 10px;"><i class="fas fa-upload"></i> Veri Geri Yükle</h4>
                        <p style="color: var(--gray-600); font-size: 14px; margin-bottom: 15px;">Yedek dosyasından veri yükleyin</p>
                        <input type="file" id="importFile" accept=".json,.zip" style="display: none;" onchange="importData(event)">
                        <button class="btn btn-info" onclick="document.getElementById('importFile').click()">
                            <i class="fas fa-file-import"></i> Dosya Seç
                        </button>
                    </div>
                </div>
            </div>
        </div>
        
        <!-- Sistem Ayarları -->
        <div class="card">
            <div class="card-header">
                <h3 class="card-title">Sistem Ayarları</h3>
                <p class="card-subtitle">Genel sistem konfigürasyonları</p>
            </div>
            <div class="card-body">
                <div class="form-grid">
                    <div class="form-group">
                        <label class="form-label">Sistem Adı</label>
                        <input type="text" class="form-control" value="Furkatech Technology FZA-ERP" readonly>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Yedekleme Sıklığı</label>
                        <select class="form-control">
                            <option>Günlük</option>
                            <option>Haftalık</option>
                            <option>Aylık</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Firebase Durumu</label>
                        <input type="text" class="form-control" value="Bağlı" readonly style="color: var(--success);">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Son Yedekleme</label>
                        <input type="text" class="form-control" value="${new Date().toLocaleDateString('tr-TR')}" readonly>
                    </div>
                </div>
                <button class="btn btn-primary" onclick="saveAdminSettings()">
                    <i class="fas fa-save"></i> Ayarları Kaydet
                </button>
            </div>
        </div>
        
        <!-- Kullanıcı Yönetimi -->
        <div class="card">
            <div class="card-header">
                <div class="flex justify-between items-center">
                    <div>
                        <h3 class="card-title">Kullanıcı Yönetimi</h3>
                        <p class="card-subtitle">Toplam ${firebaseData.users.length} kullanıcı</p>
                    </div>
                    <button class="btn btn-primary" onclick="openModal('userModal')">
                        <i class="fas fa-user-plus"></i> Yeni Kullanıcı Ekle
                    </button>
                </div>
            </div>
            <div class="card-body">
                <div class="table-container">
                    <table class="table">
                        <thead>
                            <tr>
                                <th>ID</th>
                                <th>Ad Soyad</th>
                                <th>Kullanıcı Adı</th>
                                <th>Departman</th>
                                <th>Yetkiler</th>
                                <th>Durum</th>
                                <th>İşlemler</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${firebaseData.users.map(user => `
                                <tr>
                                    <td>${user.id}</td>
                                    <td><strong>${user.name}</strong></td>
                                    <td>${user.username}</td>
                                    <td><span class="badge ${user.role === 'admin' ? 'primary' : 'info'}">${getRoleDisplayName(user.role)}</span></td>
                                    <td>
                                        <div style="display: flex; flex-wrap: wrap; gap: 4px;">
                                            ${user.permissions.map(perm => `<span class="badge ${perm === 'admin' ? 'danger' : 'success'}">${perm}</span>`).join('')}
                                        </div>
                                    </td>
                                    <td>
                                        <span class="badge ${user.active ? 'success' : 'danger'}">
                                            ${user.active ? 'Aktif' : 'Pasif'}
                                        </span>
                                    </td>
                                    <td>
                                        <div class="action-buttons">
                                            <button class="action-btn edit" onclick="editUser('${user.id}')">
                                                <i class="fas fa-edit"></i>
                                            </button>
                                            <button class="action-btn delete" onclick="deleteUser('${user.id}')" ${user.username === 'furkan' ? 'disabled style="opacity: 0.5; cursor: not-allowed;"' : ''}>
                                                <i class="fas fa-trash"></i>
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    `;
    
    document.getElementById('pageContent').innerHTML = content;
    
    document.getElementById('userModalTitle').textContent = 'Kullanıcı Ekle';
    document.getElementById('userForm').reset();
    document.querySelectorAll('#userForm input[type="checkbox"]').forEach(cb => cb.checked = false);
}
function loadUserProfile() {
    if (!currentUser) {
        showPage('dashboard');
        return;
    }
    
    const content = `
        <div class="page-header">
            <h1 class="page-title"><i class="fas fa-user"></i> Profil</h1>
            <p class="page-subtitle">Kişisel bilgilerinizi görüntüleyin</p>
        </div>
        <div class="card">
            <div class="card-header">
                <h3 class="card-title">Kullanıcı Bilgileri</h3>
            </div>
            <div class="card-body">
                <div class="form-grid">
                    <div class="form-group">
                        <label class="form-label">Ad Soyad</label>
                        <input type="text" class="form-control" value="${currentUser.name}" readonly>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Kullanıcı Adı</label>
                        <input type="text" class="form-control" value="${currentUser.username}" readonly>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Departman</label>
                        <input type="text" class="form-control" value="${getRoleDisplayName(currentUser.role)}" readonly>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Durum</label>
                        <input type="text" class="form-control" value="${currentUser.active ? 'Aktif' : 'Pasif'}" readonly>
                    </div>
                </div>
            </div>
        </div>
        
        <div class="card">
            <div class="card-header">
                <h3 class="card-title">Yetkiler</h3>
            </div>
            <div class="card-body">
                <div style="display: flex; flex-wrap: wrap; gap: 10px;">
                    ${currentUser.permissions.map(perm => `
                        <span class="badge ${perm === 'admin' ? 'danger' : 'success'}">
                            <i class="fas fa-check-circle"></i> ${perm.toUpperCase()}
                        </span>
                    `).join('')}
                </div>
            </div>
        </div>
        
        <div class="card">
            <div class="card-body">
                <button class="btn btn-primary" onclick="showPage('ayarlar')">
                    <i class="fas fa-cog"></i> Ayarlara Git
                </button>
            </div>
        </div>
    `;
    document.getElementById('pageContent').innerHTML = content;
}

// Load User Settings
// loadUserSettings fonksiyonunu güncelle
function loadUserSettings() {
    const content = `
        <div class="page-header">
            <h1 class="page-title"><i class="fas fa-cog"></i> Ayarlar</h1>
            <p class="page-subtitle">Kişisel ayarlarınızı yönetin</p>
        </div>
        <div class="card">
            <div class="card-header">
                <h3 class="card-title">Şifre Değiştir</h3>
            </div>
            <div class="card-body">
                <div class="form-group">
                    <label class="form-label">Mevcut Şifre</label>
                    <input type="password" class="form-control" id="currentPassword" placeholder="Mevcut şifrenizi girin">
                </div>
                <div class="form-group">
                    <label class="form-label">Yeni Şifre</label>
                    <input type="password" class="form-control" id="newPassword" placeholder="Yeni şifrenizi girin">
                </div>
                <div class="form-group">
                    <label class="form-label">Yeni Şifre (Tekrar)</label>
                    <input type="password" class="form-control" id="confirmPassword" placeholder="Yeni şifrenizi tekrar girin">
                </div>
                <button class="btn btn-warning" onclick="changePassword()">
                    <i class="fas fa-key"></i> Şifreyi Değiştir
                </button>
            </div>
        </div>
    `;
    document.getElementById('pageContent').innerHTML = content;
}
// Load User Activity
function loadUserActivity() {
    const content = `
        <div class="page-header">
            <h1 class="page-title"><i class="fas fa-history"></i> Aktivite</h1>
            <p class="page-subtitle">Son işlemlerinizi görüntüleyin</p>
        </div>
        <div class="card">
            <div class="card-body">
                <div class="table-container">
                    <table class="table">
                        <thead>
                            <tr>
                                <th>Tarih</th>
                                <th>Modül</th>
                                <th>İşlem</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td>08.09.2025</td>
                                <td>Üretim</td>
                                <td>URT-2025-001 güncellendi</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    `;
    document.getElementById('pageContent').innerHTML = content;
}




// Tab switching function
function switchTab(button, tabId) {
    document.querySelectorAll('.tab').forEach(tab => tab.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
    button.classList.add('active');
    document.getElementById(tabId).classList.add('active');
}

// Search products in offers
function searchOfferProducts(query) {
    const filtered = firebaseData.products.filter(p => 
        p.name.toLowerCase().includes(query.toLowerCase()) || 
        p.code.toLowerCase().includes(query.toLowerCase()) ||
        (p.barcode && p.barcode.includes(query))
    );
    const tableBody = document.getElementById('offerProductsTable');
    if (tableBody) {
        // Dinamik select güncelle - ama row eklerken yapılıyor
        console.log('Filtered products for offer:', filtered);
    }
}

function addOfferProduct() {
    const tableBody = document.getElementById('offerProductsTable');
    if (!tableBody) {
        console.error('offerProductsTable bulunamadı');
        return;
    }
    
    const row = tableBody.insertRow();
    const productOptions = firebaseData.products.map(p => 
        `<option value="${p.id}" data-price="${p.price}">${p.name} - ${p.code} - ${p.price} ₺</option>`
    ).join('');
    
    row.innerHTML = `
        <td>
            <select class="form-control" onchange="updateRawMaterials(this); updatePriceFromProduct(this); calculateOfferTotal()">
                <option value="">Ürün seçiniz...</option>
                ${productOptions}
            </select>
        </td>
        <td>
            <div class="raw-materials-list" style="max-height: 100px; overflow-y: auto; font-size: 12px; color: #666;">
                Ürün seçiniz
            </div>
        </td>
        <td>
            <input type="number" class="form-control" value="1" min="1" style="width: 80px;" onchange="calculateOfferTotal()">
        </td>
        <td>
            <input type="number" class="form-control" value="0" min="0" step="0.01" style="width: 100px;" onchange="calculateOfferTotal()">
        </td>
        <td class="total-cell" style="font-weight: 600;">0 ₺</td>
        <td>
            <button class="btn btn-sm btn-danger" onclick="this.parentElement.parentElement.remove(); calculateOfferTotal()">
                <i class="fas fa-trash"></i>
            </button>
        </td>
    `;
    calculateOfferTotal();
}
function updateRawMaterials(select) {
    const productId = select.value;
    const rawDiv = select.parentElement.nextElementSibling.querySelector('.raw-materials-list');
    if (!rawDiv) return;

    if (!productId) {
        rawDiv.innerHTML = '<span style="color: #999;">Ürün seçiniz</span>';
        return;
    }

    const product = firebaseData.products.find(p => p.id === productId);
    if (!product) {
        rawDiv.innerHTML = '<span style="color: #f00;">Ürün bulunamadı</span>';
        return;
    }

    const recipe = firebaseData.recipes.find(r => r.productId === productId);
    const rawMaterials = recipe?.rawMaterials || product.rawMaterials || [];
    
    if (rawMaterials.length === 0) {
        rawDiv.innerHTML = '<span style="color: #ff9800;">Hammadde tanımlı değil</span>';
        return;
    }

    const rawList = rawMaterials
        .map(rmId => {
            const rm = firebaseData.stock.find(s => s.id === rmId);
            if (!rm) return null;
            const stockStatus = rm.quantity > 0 ? 
                `<span style="color: green;">(Stok: ${rm.quantity} ${rm.unit})</span>` : 
                `<span style="color: red;">(Stok YOK)</span>`;
            return `<div style="padding: 2px 0;">• ${rm.name} ${stockStatus}</div>`;
        })
        .filter(item => item !== null)
        .join('');

    rawDiv.innerHTML = rawList || '<span style="color: #999;">Hammadde bilgisi yok</span>';
}

function calculateOfferTotal() {
    const tableBody = document.getElementById('offerProductsTable');
    if (!tableBody) return;
    
    let subtotal = 0;

    Array.from(tableBody.rows).forEach(row => {
        const select = row.querySelector('select');
        const quantityInput = row.querySelectorAll('input[type="number"]')[0];
        const priceInput = row.querySelectorAll('input[type="number"]')[1];
        const totalCell = row.querySelector('.total-cell');

        const quantity = parseFloat(quantityInput?.value) || 0;
        const price = parseFloat(priceInput?.value) || 0;
        const total = quantity * price;

        if (totalCell) {
            totalCell.textContent = `${total.toFixed(2)} ₺`;
        }
        subtotal += total;
    });

    const tax = subtotal * 0.20;
    const total = subtotal + tax;

    const subtotalEl = document.getElementById('offerSubtotal');
    const taxEl = document.getElementById('offerTax');
    const totalEl = document.getElementById('offerTotal');

    if (subtotalEl) subtotalEl.textContent = `${subtotal.toFixed(2)} ₺`;
    if (taxEl) taxEl.textContent = `${tax.toFixed(2)} ₺`;
    if (totalEl) totalEl.textContent = `${total.toFixed(2)} ₺`;
}

async function saveOffer() {
    // Firma kontrolü
    const companyId = document.getElementById('offerCompanyId')?.value || '';
    if (!companyId) {
        showNotification('Hata', 'Lütfen firma seçin.', 'error');
        return;
    }

    const offerDate = document.getElementById('offerDate').value;
    const offerValidity = document.getElementById('offerValidity').value;

    if (!offerDate) {
        showNotification('Hata', 'Lütfen teklif tarihini seçin.', 'error');
        return;
    }

    // Ürünleri topla
    const products = [];
    const rows = document.querySelectorAll('#offerProductsTable tr');
    let subTotal = 0;

    rows.forEach(row => {
        const productSelect = row.querySelector('select');
        const qtyInput = row.querySelectorAll('input[type="number"]')[0];
        const priceInput = row.querySelectorAll('input[type="number"]')[1];

        if (productSelect && qtyInput && priceInput) {
            const productId = productSelect.value;
            const quantity = parseFloat(qtyInput.value) || 0;
            const unitPrice = parseFloat(priceInput.value) || 0;

            if (productId && quantity > 0 && unitPrice > 0) {
                const product = firebaseData.products.find(p => p.id === productId);
                const total = quantity * unitPrice;
                products.push({
                    productId: productId,
                    productName: product?.name || 'Bilinmeyen',
                    quantity: quantity,
                    unitPrice: unitPrice,
                    total: total
                });
                subTotal += total;
            }
        }
    });

    if (products.length === 0) {
        showNotification('Hata', 'Lütfen en az bir ürün ekleyin ve fiyat bilgilerini girin.', 'error');
        return;
    }

    // KDV ve toplam
    const tax = subTotal * 0.20;
    const grandTotal = subTotal + tax;
    const offerNo = `TKF-${new Date().getFullYear()}-${String((firebaseData.offers?.length || 0) + 1).padStart(4, '0')}`;

    const offerData = {
        no: offerNo,
        companyId: companyId,
        date: offerDate,
        validity: offerValidity,
        products: products,
        subtotal: subTotal,
        tax: tax,
        total: grandTotal,
        status: 'Beklemede',
        createdAt: new Date().toISOString(),
        active: true
    };

    try {
        await window.firestoreService.addOffer(offerData);
        showNotification('Başarılı', `Teklif ${offerNo} başarıyla kaydedildi.`, 'success');
        
        // Formu temizle
        document.getElementById('offerProductsTable').innerHTML = '';
        document.getElementById('offerSubtotal').textContent = '0 ₺';
        document.getElementById('offerTax').textContent = '0 ₺';
        document.getElementById('offerTotal').textContent = '0 ₺';
        document.getElementById('companySelectionBtn').innerHTML = '<i class="fas fa-building" style="margin-right: 8px;"></i>Firma seçiniz...';
        document.getElementById('companySelectionBtn').classList.remove('selected');
        document.getElementById('offerCompanyId').value = '';
        document.getElementById('offerCompany').value = '';
        document.getElementById('offerDate').value = new Date().toISOString().split('T')[0];
        document.getElementById('offerValidity').value = '15 gün';
        
        await loadFirebaseData();
        
    } catch (error) {
        console.error('Teklif kaydetme hatası:', error);
        showNotification('Hata', 'Teklif kaydedilirken hata oluştu.', 'error');
    }
}

document.addEventListener('DOMContentLoaded', function() {
    if (!document.getElementById('company-selection-styles')) {
        const style = document.createElement('style');
        style.id = 'company-selection-styles';
        style.textContent = `
            .company-selection-modal {
                max-width: 500px;
                max-height: 80vh;
                overflow-y: auto;
            }
            .suggestions-section h4 {
                margin-top: 20px;
                font-size: 14px;
                color: var(--gray-600);
                border-bottom: 1px solid var(--gray-200);
                padding-bottom: 8px;
            }
            .suggestions-list {
                list-style: none;
                padding: 0;
                max-height: 200px;
                overflow-y: auto;
            }
            .suggestion-item {
                padding: 10px;
                cursor: pointer;
                border-bottom: 1px solid var(--gray-100);
                transition: background 0.2s;
            }
            .suggestion-item:hover {
                background: var(--gray-50);
            }
            .suggestion-item.favorite {
                background: var(--yellow-50);
                font-weight: bold;
            }
            .no-favorites {
                color: var(--gray-500);
                font-style: italic;
                padding: 10px;
            }
            .add-new-section {
                text-align: center;
                margin-top: 20px;
                padding-top: 20px;
                border-top: 1px solid var(--gray-200);
            }
            .search-section {
                margin-bottom: 20px;
            }
            #companySelectionSearch {
                width: 100%;
                padding: 10px;
                border: 1px solid var(--gray-300);
                border-radius: 6px;
            }
            .btn.selected {
                background: var(--primary);
                color: white;
            }
        `;
        document.head.appendChild(style);
    }
});

async function sendOffer() {
    const companyId = document.getElementById('offerCompanyId')?.value || '';
    const company = firebaseData.companies.find(c => c.id === companyId);
    
    if (!company) {
        showNotification('Hata', 'Lütfen firma seçin.', 'error');
        return;
    }
    
    if (!company.acceptsEmailNotifications && !company.emailNotifications) {
        const confirmSend = confirm('Seçilen firma e-posta bildirimlerini kabul etmiyor. Yine de göndermek istiyor musunuz?');
        if (!confirmSend) {
            return;
        }
    }
    
    if (!company.email) {
        showNotification('Hata', 'Firma için e-posta adresi tanımlı değil.', 'error');
        return;
    }
    
    // Önce teklifi kaydet
    const products = [];
    const rows = document.querySelectorAll('#offerProductsTable tr');
    let subTotal = 0;

    rows.forEach(row => {
        const productSelect = row.querySelector('select');
        const qtyInput = row.querySelectorAll('input[type="number"]')[0];
        const priceInput = row.querySelectorAll('input[type="number"]')[1];

        if (productSelect && qtyInput && priceInput) {
            const productId = productSelect.value;
            const quantity = parseFloat(qtyInput.value) || 0;
            const unitPrice = parseFloat(priceInput.value) || 0;

            if (productId && quantity > 0 && unitPrice > 0) {
                const product = firebaseData.products.find(p => p.id === productId);
                const total = quantity * unitPrice;
                products.push({
                    productId: productId,
                    productName: product?.name || 'Bilinmeyen',
                    quantity: quantity,
                    unitPrice: unitPrice,
                    total: total
                });
                subTotal += total;
            }
        }
    });

    if (products.length === 0) {
        showNotification('Hata', 'Lütfen en az bir ürün ekleyin.', 'error');
        return;
    }
    
    const senderEmail = prompt('Teklifi göndermek için e-posta hesabınızı girin:');
    if (!senderEmail) {
        showNotification('İptal', 'Teklif gönderme iptal edildi.', 'warning');
        return;
    }
    
    // Teklifi kaydet ve gönder
    const tax = subTotal * 0.20;
    const grandTotal = subTotal + tax;
    const offerNo = `TKF-${new Date().getFullYear()}-${String((firebaseData.offers?.length || 0) + 1).padStart(4, '0')}`;
    const offerDate = document.getElementById('offerDate').value;
    const offerValidity = document.getElementById('offerValidity').value;

    const offerData = {
        no: offerNo,
        companyId: companyId,
        date: offerDate,
        validity: offerValidity,
        products: products,
        subtotal: subTotal,
        tax: tax,
        total: grandTotal,
        status: 'Gönderildi',
        sentDate: new Date().toISOString(),
        sentFrom: senderEmail,
        sentTo: company.email,
        createdAt: new Date().toISOString(),
        active: true
    };

    try {
        await window.firestoreService.addOffer(offerData);
        
        // E-posta gönderimi simülasyonu
        console.log(`Sending offer ${offerNo} to ${company.email} from ${senderEmail}`);
        
        showNotification('Teklif Gönderildi', `Teklif ${offerNo} numarası ile ${company.name} firmasına başarıyla gönderildi.`, 'success');
        
        // Formu temizle
        document.getElementById('offerProductsTable').innerHTML = '';
        document.getElementById('offerSubtotal').textContent = '0 ₺';
        document.getElementById('offerTax').textContent = '0 ₺';
        document.getElementById('offerTotal').textContent = '0 ₺';
        document.getElementById('companySelectionBtn').innerHTML = '<i class="fas fa-building" style="margin-right: 8px;"></i>Firma seçiniz...';
        document.getElementById('companySelectionBtn').classList.remove('selected');
        document.getElementById('offerCompanyId').value = '';
        document.getElementById('offerCompany').value = '';
        
        await loadFirebaseData();
        
    } catch (error) {
        console.error('Teklif gönderme hatası:', error);
        showNotification('Hata', 'Teklif gönderilirken hata oluştu.', 'error');
    }
}

// View offer - Firebase
function viewOffer(offerId) {
    const offer = firebaseData.offers.find(o => o.id === offerId);
    if (offer) {
        const company = firebaseData.companies.find(c => c.id === offer.companyId);
        showNotification('Teklif Görüntüleniyor', `Teklif ${offer.no} detayları yükleniyor.`, 'info');
    }
}

// Edit offer - Firebase
function editOffer(offerId) {
    showNotification('Düzenleme', `Teklif düzenleme moduna geçiliyor.`, 'info');
    showPage('teklifHazirla');
}

// Delete offer - Firebase
async function deleteOffer(offerId) {
    if (confirm(`Bu teklifi silmek istediğinize emin misiniz?`)) {
        try {
            await window.firestoreService.deleteOffer(offerId);
            showNotification('Teklif Silindi', `Teklif başarıyla silindi.`, 'success');
            await loadFirebaseData();
            if (currentPage === 'teklifListesi') loadTeklifListesi();
        } catch (error) {
            console.error('Teklif silme hatası:', error);
            showNotification('Hata', 'Teklif silinirken hata oluştu.', 'error');
        }
    }
}

// Create job order - Firebase


// Start production - Firebase
async function startProduction(orderId) {
    const order = firebaseData.production.find(p => p.id === orderId);
    if (order) {
        try {
            await window.firestoreService.updateProduction(orderId, {
                ...order,
                status: 'Üretimde',
                progress: 10
            });
            showNotification('Üretim Başlatıldı', `${order.orderNo} üretimi başlatıldı.`, 'success');
            await loadFirebaseData();
            loadUretimListesi();
        } catch (error) {
            console.error('Üretim başlatma hatası:', error);
            showNotification('Hata', 'Üretim başlatılırken hata oluştu.', 'error');
        }
    }
}

// Update progress - Firebase
async function updateProgress(orderId) {
    const newProgress = prompt('Yeni ilerleme yüzdesi (%):', '50');
    if (newProgress && !isNaN(newProgress) && newProgress >= 0 && newProgress <= 100) {
        const order = firebaseData.production.find(p => p.id === orderId);
        if (order) {
            const progress = parseInt(newProgress);
            const status = progress >= 100 ? 'Tamamlandı' : 'Üretimde';
            
            try {
                await window.firestoreService.updateProduction(orderId, {
                    ...order,
                    progress: progress,
                    status: status,
                    completedDate: progress >= 100 ? new Date().toLocaleDateString('tr-TR') : order.completedDate
                });
                showNotification('İlerleme Güncellendi', `${order.orderNo} ilerlemesi %${newProgress} olarak güncellendi.`, 'success');
                await loadFirebaseData();
                loadUretimListesi();
            } catch (error) {
                console.error('İlerleme güncelleme hatası:', error);
                showNotification('Hata', 'İlerleme güncellenirken hata oluştu.', 'error');
            }
        }
    }
}

// Ship product - Firebase


// Search products
function searchProducts(query) {
    const filtered = firebaseData.products.filter(p => 
        p.name.toLowerCase().includes(query.toLowerCase()) || 
        p.code.toLowerCase().includes(query.toLowerCase()) ||
        (p.barcode && p.barcode.includes(query))
    );
    updateProductTable(filtered);
}

// Filter by category
function filterByCategory(category) {
    let filtered = firebaseData.products;
    if (category) {
        filtered = filtered.filter(p => p.category === category);
    }
    updateProductTable(filtered);
}

// Update product table - hammaddeler sütunu
function updateProductTable(products) {
    const tbody = document.getElementById('productTableBody');
    if (tbody) {
        tbody.innerHTML = products.map(product => {
            const rawCount = product.rawMaterials ? product.rawMaterials.length : 0;
            const rawNames = product.rawMaterials ? product.rawMaterials.map(rmId => {
                const rm = firebaseData.stock.find(s => s.id === rmId);
                return rm ? rm.name : 'Bilinmeyen';
            }).join(', ') : 'Yok';
            return `
                <tr>
                    <td>${product.code}</td>
                    <td>${product.barcode || ''}</td>
                    <td><strong>${product.name}</strong></td>
                    <td><span class="badge primary">${product.category}</span></td>
                    <td>${product.price} ₺</td>
                    <td>${product.stock} adet</td>
                    <td title="${rawNames}">${rawCount} adet</td>
                    <td>
                        <div class="action-buttons">
                            <button class="action-btn view" onclick="showProductDetails('${product.id}')">
                                <i class="fas fa-eye"></i>
                            </button>
                            <button class="action-btn edit" onclick="editProduct('${product.id}')">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="action-btn delete" onclick="deleteProduct('${product.id}')">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');
    }
}

function addProduct() {
    document.getElementById('productModalBody').innerHTML = `
        <form id="productForm">
            <div class="form-grid">
                <div class="form-group">
                    <label class="form-label">Ürün Kodu</label>
                    <input type="text" class="form-control" id="productFormCode" value="PRD-${String(firebaseData.products.length + 1).padStart(4, '0')}" required>
                </div>
                <div class="form-group">
                    <label class="form-label">Barkod</label>
                    <input type="text" class="form-control" id="productFormBarcode" placeholder="Barkod numarası" required>
                </div>
                <div class="form-group">
                    <label class="form-label">Ürün Adı</label>
                    <input type="text" class="form-control" id="productFormName" required>
                </div>
                <div class="form-group">
                    <label class="form-label">Kategori</label>
                    <select class="form-control" id="productFormCategory" required>
                        <option value="Metal">Metal</option>
                        <option value="Plastik">Plastik</option>
                        <option value="Elektronik">Elektronik</option>
                    </select>
                </div>
                <div class="form-group">
                    <label class="form-label">Birim Fiyat</label>
                    <input type="number" class="form-control" id="productFormPrice" required>
                </div>
                <div class="form-group">
                    <label class="form-label">Stok Miktarı</label>
                    <input type="number" class="form-control" id="productFormStock" value="0" required>
                </div>
            </div>
            
            <!-- Hammadde Seçimi Bölümü -->
            <div class="form-group" style="margin-top: 20px;">
                <label class="form-label">Hammaddeler (Reçete)</label>
                <div style="border: 2px solid var(--gray-200); border-radius: 10px; padding: 15px; background: var(--gray-50);">
                    <button type="button" class="btn btn-primary" onclick="openRawMaterialModal()">
                        <i class="fas fa-plus"></i> Hammadde Ekle
                    </button>
                    
                    <div id="selectedRawMaterials" style="margin-top: 15px;">
                        <div id="rawMaterialsList" style="display: none;">
                            <h5 style="margin-bottom: 10px; color: var(--gray-700);">Seçilen Hammaddeler:</h5>
                            <div id="rawMaterialsContainer" style="display: flex; flex-wrap: wrap; gap: 10px;">
                                <!-- Seçilen hammaddeler buraya gelecek -->
                            </div>
                        </div>
                        <div id="noRawMaterials" style="color: var(--gray-500); font-style: italic;">
                            Henüz hammadde seçilmedi
                        </div>
                    </div>
                    <input type="hidden" id="productFormRawMaterials" value="">
                </div>
            </div>
            
            <div class="form-group">
                <label class="form-label">Fotoğraf Yükle (Opsiyonel)</label>
                <input type="file" class="form-control" id="productFormImage" accept="image/*">
            </div>
        </form>
    `;
    
    document.getElementById('productModal').querySelector('.modal-title').textContent = 'Yeni Ürün Ekle';
    document.getElementById('productModal').querySelector('.modal-footer').innerHTML = `
        <button class="btn btn-success" onclick="saveProduct()">Kaydet</button>
        <button class="btn btn-outline" onclick="closeModal('productModal')">İptal</button>
    `;
    openModal('productModal');
}

function openRawMaterialModal() {
    // Ana modal HTML'i oluştur
    const modalHTML = `
        <div id="rawMaterialSelectModal" class="modal show" style="z-index: 10001;">
            <div class="modal-content" style="max-width: 600px; max-height: 80vh;">
                <div class="modal-header">
                    <h3 class="modal-title">Hammadde Seç</h3>
                    <button class="modal-close" onclick="closeRawMaterialModal()">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="modal-body">
                    <div class="search-box" style="margin-bottom: 20px;">
                        <i class="fas fa-search"></i>
                        <input type="text" placeholder="Hammadde ara..." onkeyup="filterRawMaterials(this.value)">
                    </div>
                    
                    <div style="max-height: 400px; overflow-y: auto;">
                        <table class="table">
                            <thead>
                                <tr>
                                    <th width="40">Seç</th>
                                    <th>Kod</th>
                                    <th>Hammadde</th>
                                    <th>Stok</th>
                                    <th>Birim</th>
                                </tr>
                            </thead>
                            <tbody id="rawMaterialTableBody">
                                ${firebaseData.stock.map(stock => `
                                    <tr>
                                        <td>
                                            <input type="checkbox" 
                                                   id="rm_${stock.id}" 
                                                   value="${stock.id}"
                                                   onchange="toggleRawMaterial('${stock.id}')"
                                                   ${isRawMaterialSelected(stock.id) ? 'checked' : ''}>
                                        </td>
                                        <td>${stock.code}</td>
                                        <td><strong>${stock.name}</strong></td>
                                        <td>
                                            <span class="badge ${stock.quantity > stock.minStock ? 'success' : stock.quantity > 0 ? 'warning' : 'danger'}">
                                                ${stock.quantity}
                                            </span>
                                        </td>
                                        <td>${stock.unit}</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-success" onclick="confirmRawMaterialSelection()">
                        <i class="fas fa-check"></i> Tamam
                    </button>
                    <button class="btn btn-outline" onclick="closeRawMaterialModal()">İptal</button>
                </div>
            </div>
        </div>
    `;
    
    // Modal'ı body'e ekle
    document.body.insertAdjacentHTML('beforeend', modalHTML);
}
// Geçici seçili hammaddeler listesi
let tempSelectedRawMaterials = [];

function isRawMaterialSelected(rmId) {
    return tempSelectedRawMaterials.includes(rmId);
}

function toggleRawMaterial(rmId) {
    const index = tempSelectedRawMaterials.indexOf(rmId);
    if (index > -1) {
        tempSelectedRawMaterials.splice(index, 1);
    } else {
        tempSelectedRawMaterials.push(rmId);
    }
}

function confirmRawMaterialSelection() {
    // Seçilen hammaddeleri göster
    updateSelectedRawMaterialsDisplay();
    closeRawMaterialModal();
}

function updateSelectedRawMaterialsDisplay() {
    const container = document.getElementById('rawMaterialsContainer');
    const listDiv = document.getElementById('rawMaterialsList');
    const noItemsDiv = document.getElementById('noRawMaterials');
    const hiddenInput = document.getElementById('productFormRawMaterials');
    
    if (tempSelectedRawMaterials.length > 0) {
        container.innerHTML = tempSelectedRawMaterials.map(rmId => {
            const rm = firebaseData.stock.find(s => s.id === rmId);
            return `
                <div style="background: var(--white); border: 2px solid var(--primary); border-radius: 20px; padding: 8px 12px; display: flex; align-items: center; gap: 8px;">
                    <span style="font-weight: 500;">${rm.name}</span>
                    <button type="button" onclick="removeRawMaterial('${rmId}')" style="background: none; border: none; color: var(--danger); cursor: pointer;">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
            `;
        }).join('');
        
        listDiv.style.display = 'block';
        noItemsDiv.style.display = 'none';
        hiddenInput.value = tempSelectedRawMaterials.join(',');
    } else {
        listDiv.style.display = 'none';
        noItemsDiv.style.display = 'block';
        hiddenInput.value = '';
    }
}

function removeRawMaterial(rmId) {
    const index = tempSelectedRawMaterials.indexOf(rmId);
    if (index > -1) {
        tempSelectedRawMaterials.splice(index, 1);
        updateSelectedRawMaterialsDisplay();
    }
}

function closeRawMaterialModal() {
    const modal = document.getElementById('rawMaterialSelectModal');
    if (modal) {
        modal.remove();
    }
}

function filterRawMaterials(query) {
    const rows = document.querySelectorAll('#rawMaterialTableBody tr');
    rows.forEach(row => {
        const text = row.textContent.toLowerCase();
        row.style.display = text.includes(query.toLowerCase()) ? '' : 'none';
    });
}
// Show stock details - Firebase
function showStockDetails(stockId) {
    const stock = firebaseData.stock.find(s => s.id === stockId);
    if (stock) {
        document.getElementById('productModalBody').innerHTML = `
            <div class="form-grid">
                <div class="form-group">
                    <label class="form-label">Stok Kodu</label>
                    <input type="text" class="form-control" value="${stock.code}" readonly>
                </div>
                <div class="form-group">
                    <label class="form-label">Barkod</label>
                    <input type="text" class="form-control" value="${stock.barcode || ''}" readonly>
                </div>
                <div class="form-group">
                    <label class="form-label">Malzeme Adı</label>
                    <input type="text" class="form-control" value="${stock.name}" readonly>
                </div>
                <div class="form-group">
                    <label class="form-label">Miktar</label>
                    <input type="text" class="form-control" value="${stock.quantity} ${stock.unit}" readonly>
                </div>
                <div class="form-group">
                    <label class="form-label">Min. Stok</label>
                    <input type="text" class="form-control" value="${stock.minStock} ${stock.unit}" readonly>
                </div>
                <div class="form-group">
                    <label class="form-label">Son Güncelleme</label>
                    <input type="text" class="form-control" value="${stock.lastUpdate}" readonly>
                </div>
                ${stock.image ? `<div class="form-group"><label>Fotoğraf</label><img src="${stock.image}" style="max-width: 200px;"></div>` : ''}
            </div>
        `;
        document.getElementById('productModal').querySelector('.modal-title').textContent = 'Hammadde Detayları';
        openModal('productModal');
    }
}

// Edit stock - Firebase
function editStock(stockId) {
    const stock = firebaseData.stock.find(s => s.id === stockId);
    if (stock) {
        document.getElementById('productModalBody').innerHTML = `
            <form id="stockForm">
                <div class="form-grid">
                    <div class="form-group">
                        <label class="form-label">Stok Kodu</label>
                        <input type="text" class="form-control" id="stockFormCode" value="${stock.code}" required>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Barkod</label>
                        <input type="text" class="form-control" id="stockFormBarcode" value="${stock.barcode || ''}" required>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Malzeme Adı</label>
                        <input type="text" class="form-control" id="stockFormName" value="${stock.name}" required>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Miktar</label>
                        <input type="number" class="form-control" id="stockFormQuantity" value="${stock.quantity}" required>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Birim</label>
                        <input type="text" class="form-control" id="stockFormUnit" value="${stock.unit}" required>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Min. Stok</label>
                        <input type="number" class="form-control" id="stockFormMinStock" value="${stock.minStock}" required>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Fotoğraf Yükle (Opsiyonel)</label>
                        <input type="file" class="form-control" id="stockFormImage" accept="image/*">
                    </div>
                </div>
            </form>
        `;
        document.getElementById('productModal').querySelector('.modal-footer').innerHTML = `
            <button class="btn btn-success" onclick="saveStock('${stockId}')">Kaydet</button>
            <button class="btn btn-outline" onclick="closeModal('productModal')">İptal</button>
        `;
        openModal('productModal');
    }
}

async function saveStock(stockId = null) {
    const code = document.getElementById('stockFormCode').value;
    const barcode = document.getElementById('stockFormBarcode').value;
    const name = document.getElementById('stockFormName').value;
    const quantity = parseInt(document.getElementById('stockFormQuantity').value);
    const unit = document.getElementById('stockFormUnit').value;
    const minStock = parseInt(document.getElementById('stockFormMinStock').value);
    const imageFile = document.getElementById('stockFormImage')?.files[0];
    
    let image = '';
    if (imageFile) {
        image = 'data:image/jpeg;base64,' + btoa('simulated_image_data');
    }

    const stockData = {
        code: code,
        barcode: barcode,
        name: name,
        quantity: quantity,
        unit: unit,
        minStock: minStock,
        lastUpdate: new Date().toLocaleDateString('tr-TR'),
        active: true
    };

    if (image) {
        stockData.image = image;
    }

    try {
        // Önceki stok durumunu kontrol et
        let oldStock = null;
        if (stockId) {
            oldStock = firebaseData.stock.find(s => s.id === stockId);
        }
        
        // Kaydet
        if (stockId) {
            await window.firestoreService.updateStock(stockId, stockData);
            showNotification('Hammadde Güncellendi', 'Hammadde bilgileri başarıyla güncellendi.', 'success');
        } else {
            await window.firestoreService.addStock(stockData);
            showNotification('Hammadde Eklendi', 'Yeni hammadde başarıyla eklendi.', 'success');
        }
        
        // Kritik stok kontrolü ve bildirim
        if (quantity <= minStock && quantity > 0) {
            await sendCriticalStockNotification(name, quantity, minStock, unit, 'kritik');
        } else if (quantity === 0) {
            await sendCriticalStockNotification(name, quantity, minStock, unit, 'tükendi');
        } else if (oldStock && oldStock.quantity <= oldStock.minStock && quantity > minStock) {
            // Stok normale döndü bildirimi
            await sendCriticalStockNotification(name, quantity, minStock, unit, 'normale_döndü');
        }
        
        closeModal('productModal');
        await loadFirebaseData();
        if (currentPage === 'depo') loadDepo();
    } catch (error) {
        console.error('Hammadde kaydetme hatası:', error);
        showNotification('Hata', 'Hammadde kaydedilirken hata oluştu.', 'error');
    }
}

async function sendCriticalStockNotification(stockName, currentQty, minStock, unit, type) {
    // Bildirimi alacak kullanıcıları belirle
    const notifyUsers = firebaseData.users.filter(u => 
        u.role === 'admin' || 
        u.role === 'warehouse' || 
        u.role === 'sales' ||
        u.permissions?.includes('warehouse') ||
        u.permissions?.includes('admin')
    );
    
    let title, message, notificationType;
    
    switch(type) {
        case 'kritik':
            title = 'Kritik Stok Uyarısı';
            message = `${stockName} hammaddesi kritik seviyede! Mevcut: ${currentQty} ${unit}, Minimum: ${minStock} ${unit}`;
            notificationType = 'stock_critical';
            break;
        case 'tükendi':
            title = 'Stok Tükendi';
            message = `${stockName} hammaddesi tükendi! Acil sipariş verilmesi gerekiyor.`;
            notificationType = 'stock_empty';
            break;
        case 'normale_döndü':
            title = 'Stok Normale Döndü';
            message = `${stockName} hammaddesi normale döndü. Mevcut: ${currentQty} ${unit}`;
            notificationType = 'stock_normal';
            break;
        default:
            console.error('Geçersiz bildirim tipi:', type);
            return;
    }
    
    try {
        // Her yetkili kullanıcıya bildirim gönder
        for (const user of notifyUsers) {
            await createNotification({
                type: notificationType,
                title: title,
                message: message,
                from: 'system',
                to: user.id,
                stockName: stockName,
                currentQuantity: currentQty,
                minStock: minStock,
                date: new Date().toISOString()
            });
        }
        
        // Ayrıca genel bildirim de oluştur
        await createNotification({
            type: notificationType,
            title: title,
            message: message,
            from: 'system',
            to: 'all',
            stockName: stockName,
            currentQuantity: currentQty,
            minStock: minStock,
            date: new Date().toISOString()
        });
        
        console.log(`Stok bildirimi gönderildi: ${stockName} - ${type}`);
        
    } catch (error) {
        console.error('Stok bildirimi gönderme hatası:', error);
        // Hata durumunda sessizce devam et, uygulamayı durdurma
    }
}

// Add stock
function addStock() {
    document.getElementById('productModalBody').innerHTML = `
        <form id="stockForm">
            <div class="form-grid">
                <div class="form-group">
                    <label class="form-label">Stok Kodu</label>
                    <input type="text" class="form-control" id="stockFormCode" value="STK-${String(firebaseData.stock.length + 1).padStart(4, '0')}" required>
                </div>
                <div class="form-group">
                    <label class="form-label">Barkod</label>
                    <input type="text" class="form-control" id="stockFormBarcode" placeholder="Barkod numarası" required>
                </div>
                <div class="form-group">
                    <label class="form-label">Malzeme Adı</label>
                    <input type="text" class="form-control" id="stockFormName" required>
                </div>
                <div class="form-group">
                    <label class="form-label">Miktar</label>
                    <input type="number" class="form-control" id="stockFormQuantity" value="0" required>
                </div>
                <div class="form-group">
                    <label class="form-label">Birim</label>
                    <input type="text" class="form-control" id="stockFormUnit" value="kg" required>
                </div>
                <div class="form-group">
                    <label class="form-label">Min. Stok</label>
                    <input type="number" class="form-control" id="stockFormMinStock" value="0" required>
                </div>
                <div class="form-group">
                    <label class="form-label">Fotoğraf Yükle (Opsiyonel)</label>
                    <input type="file" class="form-control" id="stockFormImage" accept="image/*">
                </div>
            </div>
        </form>
    `;
    document.getElementById('productModal').querySelector('.modal-footer').innerHTML = `
        <button class="btn btn-success" onclick="saveStock()">Kaydet</button>
        <button class="btn btn-outline" onclick="closeModal('productModal')">İptal</button>
    `;
    openModal('productModal');
}

// Add company - Firebase
async function addCompany() {
    const name = prompt('Firma adı:');
    const taxNo = prompt('Vergi No:');
    if (name && taxNo) {
        const newCompany = {
            name: name,
            taxNo: taxNo,
            phone: '000 000 0000',
            email: '',
            address: 'Adres',
            website: '',
            customerType: 'normal',
            acceptsEmailNotifications: false,
            isFavorite: false,
            image: '',
            active: true
        };
        
        try {
            await window.firestoreService.addCompany(newCompany);
            showNotification('Firma Eklendi', 'Yeni firma başarıyla eklendi.', 'success');
            await loadFirebaseData();
            loadFirmalar();
        } catch (error) {
            console.error('Firma ekleme hatası:', error);
            showNotification('Hata', 'Firma eklenirken hata oluştu.', 'error');
        }
    }
}

// Edit company - Firebase
async function editCompany(companyId) {
    const company = firebaseData.companies.find(c => c.id === companyId);
    if (company) {
        const newName = prompt('Yeni firma adı:', company.name);
        if (newName) {
            try {
                await window.firestoreService.updateCompany(companyId, {
                    ...company,
                    name: newName
                });
                showNotification('Firma Güncellendi', 'Firma bilgileri güncellendi.', 'success');
                await loadFirebaseData();
                loadFirmalar();
            } catch (error) {
                console.error('Firma güncelleme hatası:', error);
                showNotification('Hata', 'Firma güncellenirken hata oluştu.', 'error');
            }
        }
    }
}

// Delete company - Firebase
async function deleteCompany(companyId) {
    if (confirm('Bu firmayı silmek istediğinize emin misiniz?')) {
        try {
            await window.firestoreService.deleteCompany(companyId);
            showNotification('Firma Silindi', 'Firma başarıyla silindi.', 'success');
            await loadFirebaseData();
            loadFirmalar();
        } catch (error) {
            console.error('Firma silme hatası:', error);
            showNotification('Hata', 'Firma silinirken hata oluştu.', 'error');
        }
    }
}

// Edit user - Firebase - username dahil
function editUser(userId) {
    const user = firebaseData.users.find(u => u.id === userId);
    if (user) {
        document.getElementById('userModalTitle').textContent = 'Kullanıcı Düzenle';
        document.getElementById('userFormName').value = user.name;
        document.getElementById('userFormUsername').value = user.username;
        document.getElementById('userFormPassword').value = user.password;
        document.getElementById('userFormRole').value = user.role;
        document.getElementById('perm_sales').checked = user.permissions.includes('sales');
        document.getElementById('perm_production').checked = user.permissions.includes('production');
        document.getElementById('perm_warehouse').checked = user.permissions.includes('warehouse');
        document.getElementById('perm_reports').checked = user.permissions.includes('reports');
        document.getElementById('perm_admin').checked = user.permissions.includes('admin');
        openModal('userModal');
        document.getElementById('userModal').querySelector('.modal-footer').innerHTML = `
            <button class="btn btn-success" onclick="saveUser('${userId}')">Kaydet</button>
            <button class="btn btn-outline" onclick="closeModal('userModal')">İptal</button>
        `;
    }
}

// Change password
// changePassword fonksiyonunu güncelle
async function changePassword() {
    const currentPassword = document.getElementById('currentPassword').value;
    const newPassword = document.getElementById('newPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    
    // Boş alan kontrolü
    if (!currentPassword || !newPassword || !confirmPassword) {
        showNotification('Hata', 'Lütfen tüm alanları doldurun.', 'error');
        return;
    }
    
    // Mevcut şifre kontrolü
    if (currentUser.password !== currentPassword) {
        showNotification('Hata', 'Mevcut şifreniz yanlış.', 'error');
        document.getElementById('currentPassword').value = '';
        return;
    }
    
    // Yeni şifre eşleşme kontrolü
    if (newPassword !== confirmPassword) {
        showNotification('Hata', 'Yeni şifreler eşleşmiyor.', 'error');
        document.getElementById('confirmPassword').value = '';
        return;
    }
    
   
    
    try {
        // Firebase'de güncelle
        const updatedUserData = {
            ...currentUser,
            password: newPassword
        };
        
        await window.firestoreService.updateUser(currentUser.id, updatedUserData);
        
        // Local currentUser objesini güncelle
        currentUser.password = newPassword;
        
        // Firebase'den veriyi yeniden çek
        await loadFirebaseData();
        
        // Form alanlarını temizle
        document.getElementById('currentPassword').value = '';
        document.getElementById('newPassword').value = '';
        document.getElementById('confirmPassword').value = '';
        
        showNotification('Başarılı', 'Şifreniz başarıyla değiştirildi.', 'success');
        
        // Güvenlik için 3 saniye sonra otomatik çıkış yap
        setTimeout(() => {
            showNotification('Bilgi', 'Güvenlik nedeniyle çıkış yapılıyor. Lütfen yeni şifrenizle giriş yapın.', 'info');
            setTimeout(() => {
                logout();
            }, 2000);
        }, 3000);
        
    } catch (error) {
        console.error('Şifre değiştirme hatası:', error);
        showNotification('Hata', 'Şifre değiştirilirken bir hata oluştu. Lütfen tekrar deneyin.', 'error');
    }
}

// Save admin settings
function saveAdminSettings() {
    showNotification('Ayarlar Kaydedildi', 'Sistem ayarları güncellendi.', 'success');
}

// Show notification
function showNotification(title, message, type = 'info') {
    const notification = document.getElementById('notification');
    notification.querySelector('.notification-title').textContent = title;
    notification.querySelector('.notification-message').textContent = message;
    notification.className = `notification ${type} show`;
    notification.querySelector('.notification-icon i').className = type === 'success' ? 'fas fa-check' : 
                                                               type === 'error' ? 'fas fa-times' : 
                                                               type === 'warning' ? 'fas fa-exclamation-triangle' : 'fas fa-info-circle';
    
    setTimeout(() => {
        notification.classList.remove('show');
    }, 5000);
}

// Print offer function - preview'den yazdır
function printOffer() {
    window.print();
}

// Initialize app on load - Firebase integrated
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 ERP sistemi başlatılıyor...');
    
    document.getElementById('loginContainer').style.display = 'flex';
    document.getElementById('appContainer').style.display = 'none';
    
    // Firebase bağlantısını test et
    console.log('🔥 Firebase bağlantısı kontrol ediliyor...');
});

// Close modals on outside click
window.onclick = function(event) {
    const modals = document.querySelectorAll('.modal');
    modals.forEach(modal => {
        if (event.target === modal) {
            modal.classList.remove('show');
        }
    });
};


// Yeni: Ürün Reçeteleri Sayfası - Reçete Oluşturma// Load Ürün Reçeteleri - Hammadde ve Ürün bağlantısı
function loadUrunReceteleri() {
    const content = `
        <div class="page-header">
            <h1 class="page-title"><i class="fas fa-sitemap"></i> Ürün Reçeteleri</h1>
            <p class="page-subtitle">Ürünler için hammadde reçetelerini yönetin</p>
        </div>
        <div class="stats-grid">
            <div class="stat-card">
                <div class="stat-icon primary"><i class="fas fa-sitemap"></i></div>
                <div class="stat-value">${firebaseData.recipes.length}</div>
                <div class="stat-label">Reçete Sayısı</div>
            </div>
            <div class="stat-card">
                <div class="stat-icon warning"><i class="fas fa-exclamation-triangle"></i></div>
                <div class="stat-value">${firebaseData.products.filter(p => !firebaseData.recipes.some(r => r.productId === p.id)).length}</div>
                <div class="stat-label">Reçetesiz Ürün</div>
            </div>
        </div>
        <div class="card">
            <div class="card-header">
                <div class="flex justify-between items-center">
                    <div>
                        <h3 class="card-title">Reçete Listesi</h3>
                        <p class="card-subtitle">Toplam ${firebaseData.recipes.length} reçete kayıtlı</p>
                    </div>
                    <button class="btn btn-primary" onclick="addRecipe()">
                        <i class="fas fa-plus"></i> Yeni Reçete
                    </button>
                </div>
            </div>
            <div class="card-body">
                <div class="table-container">
                    <table class="table">
                        <thead>
                            <tr>
                                <th>Reçete Adı</th>
                                <th>Ürün</th>
                                <th>Hammaddeler</th>
                                <th>Birim Başına Miktar</th>
                                <th>İşlemler</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${firebaseData.recipes.map(recipe => {
                                const product = firebaseData.products.find(p => p.id === recipe.productId);
                                const rawCount = recipe.rawMaterials ? recipe.rawMaterials.length : 0;
                                const rawNames = recipe.rawMaterials ? recipe.rawMaterials.map(rmId => {
                                    const rm = firebaseData.stock.find(s => s.id === rmId);
                                    return rm ? rm.name : 'Bilinmeyen';
                                }).join(', ') : 'Yok';
                                return `
                                <tr>
                                    <td><strong>${recipe.name}</strong></td>
                                    <td>${product ? product.name : 'Bilinmeyen'}</td>
                                    <td title="${rawNames}">${rawCount} hammadde</td>
                                    <td>${recipe.quantityPerUnit || 1}</td>
                                    <td>
                                        <div class="action-buttons">
                                            <button class="action-btn view" onclick="showRecipeDetails('${recipe.id}')">
                                                <i class="fas fa-eye"></i>
                                            </button>
                                            <button class="action-btn edit" onclick="editRecipe('${recipe.id}')">
                                                <i class="fas fa-edit"></i>
                                            </button>
                                            <button class="action-btn delete" onclick="deleteRecipe('${recipe.id}')">
                                                <i class="fas fa-trash"></i>
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            `;
                            }).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    `;
    document.getElementById('pageContent').innerHTML = content;
}
// Yeni: Reçete Ekle
function addRecipe() {
    const productOptions = firebaseData.products.map(p => `<option value="${p.id}">${p.name} - ${p.code}</option>`).join('');
    
    document.getElementById('productModalBody').innerHTML = `
        <form id="recipeForm">
            <div class="form-group">
                <label class="form-label">Reçete Adı</label>
                <input type="text" class="form-control" id="recipeName" placeholder="Örn: Sokak Lambası Reçetesi" required>
            </div>
            <div class="form-group">
                <label class="form-label">Ürün</label>
                <select class="form-control" id="recipeProduct" required>
                    <option value="">Ürün seçiniz...</option>
                    ${productOptions}
                </select>
            </div>
            <div class="form-group">
                <label class="form-label">Birim Ürün İçin Hammadde Miktarı</label>
                <input type="number" class="form-control" id="recipeQuantityPerUnit" value="1" min="1" required>
            </div>
            
            <!-- Hammadde Seçimi Bölümü -->
            <div class="form-group">
                <label class="form-label">Hammaddeler (Reçete)</label>
                <div style="border: 2px solid var(--gray-200); border-radius: 10px; padding: 15px; background: var(--gray-50);">
                    <button type="button" class="btn btn-primary" onclick="openRecipeRawMaterialModal()">
                        <i class="fas fa-plus"></i> Hammadde Ekle
                    </button>
                    
                    <div id="recipeSelectedRawMaterials" style="margin-top: 15px;">
                        <div id="recipeRawMaterialsList" style="display: none;">
                            <h5 style="margin-bottom: 10px; color: var(--gray-700);">Seçilen Hammaddeler:</h5>
                            <div id="recipeRawMaterialsContainer" style="display: flex; flex-wrap: wrap; gap: 10px;">
                                <!-- Seçilen hammaddeler buraya gelecek -->
                            </div>
                        </div>
                        <div id="recipeNoRawMaterials" style="color: var(--gray-500); font-style: italic;">
                            Henüz hammadde seçilmedi
                        </div>
                    </div>
                    <input type="hidden" id="recipeRawMaterials" value="">
                </div>
            </div>
        </form>
    `;
    
    // Geçici listeyi temizle
    tempRecipeRawMaterials = [];
    
    document.getElementById('productModal').querySelector('.modal-title').textContent = 'Yeni Reçete Oluştur';
    document.getElementById('productModal').querySelector('.modal-footer').innerHTML = `
        <button class="btn btn-success" onclick="saveRecipe()">Kaydet</button>
        <button class="btn btn-outline" onclick="closeModal('productModal')">İptal</button>
    `;
    openModal('productModal');
}

// Reçete için geçici seçili hammaddeler listesi
let tempRecipeRawMaterials = [];

function openRecipeRawMaterialModal() {
    const modalHTML = `
        <div id="recipeRawMaterialSelectModal" class="modal show" style="z-index: 10001;">
            <div class="modal-content" style="max-width: 700px; max-height: 85vh;">
                <div class="modal-header" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white;">
                    <h3 class="modal-title"><i class="fas fa-cubes"></i> Hammadde Seç</h3>
                    <button class="modal-close" onclick="closeRecipeRawMaterialModal()" style="color: white;">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="modal-body">
                    <div class="search-box" style="margin-bottom: 20px;">
                        <i class="fas fa-search"></i>
                        <input type="text" placeholder="Hammadde ara..." onkeyup="filterRecipeRawMaterials(this.value)">
                    </div>
                    
                    <div style="max-height: 400px; overflow-y: auto; border: 1px solid var(--gray-200); border-radius: 8px;">
                        <table class="table">
                            <thead style="position: sticky; top: 0; background: white; z-index: 10;">
                                <tr>
                                    <th width="50">
                                        <input type="checkbox" onchange="toggleAllRecipeRawMaterials(this.checked)">
                                    </th>
                                    <th>Kod</th>
                                    <th>Hammadde</th>
                                    <th>Stok</th>
                                    <th>Min. Stok</th>
                                    <th>Birim</th>
                                    <th>Durum</th>
                                </tr>
                            </thead>
                            <tbody id="recipeRawMaterialTableBody">
                                ${firebaseData.stock.map(stock => {
                                    const stockStatus = stock.quantity > stock.minStock ? 'success' : 
                                                       stock.quantity > 0 ? 'warning' : 'danger';
                                    const stockLabel = stock.quantity > stock.minStock ? 'Yeterli' : 
                                                      stock.quantity > 0 ? 'Kritik' : 'Tükendi';
                                    return `
                                    <tr>
                                        <td>
                                            <input type="checkbox" 
                                                   id="recipe_rm_${stock.id}" 
                                                   value="${stock.id}"
                                                   onchange="toggleRecipeRawMaterial('${stock.id}')"
                                                   ${isRecipeRawMaterialSelected(stock.id) ? 'checked' : ''}>
                                        </td>
                                        <td><code>${stock.code}</code></td>
                                        <td>
                                            <strong>${stock.name}</strong>
                                            ${stock.barcode ? `<br><small style="color: var(--gray-500);">Barkod: ${stock.barcode}</small>` : ''}
                                        </td>
                                        <td style="text-align: center;">
                                            <span style="font-weight: 600;">${stock.quantity}</span>
                                        </td>
                                        <td style="text-align: center;">
                                            <span style="color: var(--gray-600);">${stock.minStock}</span>
                                        </td>
                                        <td>${stock.unit}</td>
                                        <td>
                                            <span class="badge ${stockStatus}">${stockLabel}</span>
                                        </td>
                                    </tr>
                                `;}).join('')}
                            </tbody>
                        </table>
                    </div>
                    
                    <div style="margin-top: 15px; padding: 10px; background: var(--gray-50); border-radius: 8px;">
                        <strong>Seçilen: </strong>
                        <span id="recipeSelectedCount" style="color: var(--primary); font-weight: 600;">
                            ${tempRecipeRawMaterials.length}
                        </span> hammadde
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-success" onclick="confirmRecipeRawMaterialSelection()">
                        <i class="fas fa-check"></i> Seçimi Onayla
                    </button>
                    <button class="btn btn-outline" onclick="closeRecipeRawMaterialModal()">İptal</button>
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHTML);
}

function isRecipeRawMaterialSelected(rmId) {
    return tempRecipeRawMaterials.includes(rmId);
}

function toggleRecipeRawMaterial(rmId) {
    const index = tempRecipeRawMaterials.indexOf(rmId);
    if (index > -1) {
        tempRecipeRawMaterials.splice(index, 1);
    } else {
        tempRecipeRawMaterials.push(rmId);
    }
    updateRecipeSelectedCount();
}

function toggleAllRecipeRawMaterials(checked) {
    if (checked) {
        tempRecipeRawMaterials = firebaseData.stock.map(s => s.id);
    } else {
        tempRecipeRawMaterials = [];
    }
    
    // Tüm checkbox'ları güncelle
    document.querySelectorAll('#recipeRawMaterialTableBody input[type="checkbox"]').forEach(cb => {
        cb.checked = checked;
    });
    
    updateRecipeSelectedCount();
}

function updateRecipeSelectedCount() {
    const countElement = document.getElementById('recipeSelectedCount');
    if (countElement) {
        countElement.textContent = tempRecipeRawMaterials.length;
    }
}

function confirmRecipeRawMaterialSelection() {
    updateRecipeSelectedRawMaterialsDisplay();
    closeRecipeRawMaterialModal();
}

function updateRecipeSelectedRawMaterialsDisplay() {
    const container = document.getElementById('recipeRawMaterialsContainer');
    const listDiv = document.getElementById('recipeRawMaterialsList');
    const noItemsDiv = document.getElementById('recipeNoRawMaterials');
    const hiddenInput = document.getElementById('recipeRawMaterials');
    
    if (tempRecipeRawMaterials.length > 0) {
        container.innerHTML = tempRecipeRawMaterials.map(rmId => {
            const rm = firebaseData.stock.find(s => s.id === rmId);
            const stockStatus = rm.quantity > rm.minStock ? 'success' : 
                               rm.quantity > 0 ? 'warning' : 'danger';
            return `
                <div style="background: var(--white); border: 2px solid var(--primary); border-radius: 20px; padding: 8px 12px; display: flex; align-items: center; gap: 8px; position: relative;">
                    <span style="font-weight: 500;">${rm.name}</span>
                    <span class="badge ${stockStatus}" style="font-size: 10px;">
                        ${rm.quantity} ${rm.unit}
                    </span>
                    <button type="button" onclick="removeRecipeRawMaterial('${rmId}')" 
                            style="background: var(--danger); border: none; color: white; cursor: pointer; width: 20px; height: 20px; border-radius: 50%; display: flex; align-items: center; justify-content: center; padding: 0;">
                        <i class="fas fa-times" style="font-size: 10px;"></i>
                    </button>
                </div>
            `;
        }).join('');
        
        listDiv.style.display = 'block';
        noItemsDiv.style.display = 'none';
        hiddenInput.value = tempRecipeRawMaterials.join(',');
    } else {
        listDiv.style.display = 'none';
        noItemsDiv.style.display = 'block';
        hiddenInput.value = '';
    }
}

function removeRecipeRawMaterial(rmId) {
    const index = tempRecipeRawMaterials.indexOf(rmId);
    if (index > -1) {
        tempRecipeRawMaterials.splice(index, 1);
        updateRecipeSelectedRawMaterialsDisplay();
    }
}

function closeRecipeRawMaterialModal() {
    const modal = document.getElementById('recipeRawMaterialSelectModal');
    if (modal) {
        modal.remove();
    }
}

function filterRecipeRawMaterials(query) {
    const rows = document.querySelectorAll('#recipeRawMaterialTableBody tr');
    rows.forEach(row => {
        const text = row.textContent.toLowerCase();
        row.style.display = text.includes(query.toLowerCase()) ? '' : 'none';
    });
}
async function saveRecipe(recipeId = null) {
    const name = document.getElementById('recipeName').value;
    const productId = document.getElementById('recipeProduct').value;
    const quantityPerUnit = parseFloat(document.getElementById('recipeQuantityPerUnit').value);
    const rawMaterialsInput = document.getElementById('recipeRawMaterials').value;
    const rawMaterials = rawMaterialsInput ? rawMaterialsInput.split(',') : [];

    if (!name || !productId || rawMaterials.length === 0) {
        showNotification('Hata', 'Lütfen tüm alanları doldurun ve en az bir hammadde seçin.', 'error');
        return;
    }

    const recipeData = {
        name: name,
        productId: productId,
        rawMaterials: rawMaterials,
        quantityPerUnit: quantityPerUnit,
        active: true
    };

    try {
        if (recipeId) {
            await window.firestoreService.updateRecipe(recipeId, recipeData);
            showNotification('Reçete Güncellendi', 'Reçete başarıyla güncellendi.', 'success');
        } else {
            await window.firestoreService.addRecipe(recipeData);
            showNotification('Reçete Oluşturuldu', 'Yeni reçete başarıyla oluşturuldu.', 'success');
        }
        
        // Geçici listeyi temizle
        tempRecipeRawMaterials = [];
        
        closeModal('productModal');
        await loadFirebaseData();
        if (currentPage === 'urunReceteleri') loadUrunReceteleri();
    } catch (error) {
        console.error('Reçete kaydetme hatası:', error);
        showNotification('Hata', 'Reçete kaydedilirken hata oluştu.', 'error');
    }
}

// Yeni: Reçete Detay Göster
function showRecipeDetails(recipeId) {
    const recipe = firebaseData.recipes.find(r => r.id === recipeId);
    if (recipe) {
        const product = firebaseData.products.find(p => p.id === recipe.productId);
        const rawDetails = recipe.rawMaterials.map(rmId => {
            const rm = firebaseData.stock.find(s => s.id === rmId);
            return rm ? `<div><strong>${rm.name}</strong> - ${recipe.quantityPerUnit} ${rm.unit}</div>` : '<div>Bilinmeyen hammadde</div>';
        }).join('');

        document.getElementById('productModalBody').innerHTML = `
            <div class="form-grid">
                <div class="form-group">
                    <label class="form-label">Reçete Adı</label>
                    <input type="text" class="form-control" value="${recipe.name}" readonly>
                </div>
                <div class="form-group">
                    <label class="form-label">Ürün</label>
                    <input type="text" class="form-control" value="${product ? product.name : 'Bilinmeyen'}" readonly>
                </div>
                <div class="form-group">
                    <label class="form-label">Birim Miktar</label>
                    <input type="text" class="form-control" value="${recipe.quantityPerUnit}" readonly>
                </div>
                <div class="form-group">
                    <label class="form-label">Hammaddeler</label>
                    <div class="form-control" style="height: 200px; overflow-y: auto;">${rawDetails}</div>
                </div>
            </div>
        `;
        document.getElementById('productModal').querySelector('.modal-title').textContent = 'Reçete Detayları';
        document.getElementById('productModal').querySelector('.modal-footer').innerHTML = `
            <button class="btn btn-primary" onclick="editRecipe('${recipe.id}')">Düzenle</button>
            <button class="btn btn-outline" onclick="closeModal('productModal')">Kapat</button>
        `;
        openModal('productModal');
    }
}

// Yeni: Reçete Düzenle
function editRecipe(recipeId) {

    const recipe = firebaseData.recipes.find(r => r.id === recipeId);
    if (recipe) {
        const productOptions = firebaseData.products.map(p => `<option value="${p.id}" ${p.id === recipe.productId ? 'selected' : ''}>${p.name} - ${p.code}</option>`).join('');
        const rawOptions = firebaseData.stock.map(stock => `<option value="${stock.id}" ${recipe.rawMaterials && recipe.rawMaterials.includes(stock.id) ? 'selected' : ''}>${stock.name} - ${stock.code}</option>`).join('');
        
        document.getElementById('productModalBody').innerHTML = `
            <form id="recipeForm">
                <div class="form-group">
                    <label class="form-label">Reçete Adı</label>
                    <input type="text" class="form-control" id="recipeName" value="${recipe.name}" required>
                </div>
                <div class="form-group">
                    <label class="form-label">Ürün</label>
                    <select class="form-control" id="recipeProduct" required>
                        <option value="">Ürün seçiniz...</option>
                        ${productOptions}
                    </select>
                </div>
                <div class="form-group">
                    <label class="form-label">Birim Ürün İçin Hammadde Miktarı</label>
                    <input type="number" class="form-control" id="recipeQuantityPerUnit" value="${recipe.quantityPerUnit}" min="1" required>
                </div>
                <div class="form-group">
                    <label class="form-label">Hammaddeler (Reçete)</label>
                    <select class="form-control" id="recipeRawMaterials" multiple required>
                        ${rawOptions}
                    </select>
                </div>
            </form>
        `;
        document.getElementById('productModal').querySelector('.modal-title').textContent = 'Reçete Düzenle';
        document.getElementById('productModal').querySelector('.modal-footer').innerHTML = `
            <button class="btn btn-success" onclick="saveRecipe('${recipe.id}')">Kaydet</button>
            <button class="btn btn-outline" onclick="closeModal('productModal')">İptal</button>
        `;
        openModal('productModal');
    }
}

// Yeni: Reçete Sil
async function deleteRecipe(recipeId) {
    if (confirm('Bu reçeteyi silmek istediğinize emin misiniz?')) {
        try {
            await window.firestoreService.deleteRecipe(recipeId);
            showNotification('Reçete Silindi', 'Reçete başarıyla silindi.', 'success');
            await loadFirebaseData();
            loadUrunReceteleri();
        } catch (error) {
            console.error('Reçete silme hatası:', error);
            showNotification('Hata', 'Reçete silinirken hata oluştu.', 'error');
        }
    }
}

function loadIsEmriVer() {
    const recipeOptions = firebaseData.recipes.map(recipe => {
        const product = firebaseData.products.find(p => p.id === recipe.productId);
        return `<option value="${recipe.id}" data-product="${product?.name || ''}">${recipe.name} - (${product ? product.name : 'Bilinmeyen'})</option>`;
    }).join('');
    
    const companyOptions = firebaseData.companies.map(c => 
        `<option value="${c.id}">${c.name}</option>`
    ).join('');

    const content = `
        <div class="page-header">
            <h1 class="page-title"><i class="fas fa-file-alt"></i> İş Emri Ver</h1>
            <p class="page-subtitle">Reçete bazlı üretim emri oluşturun</p>
        </div>
        
        <!-- İstatistikler -->
        <div class="stats-grid" style="margin-bottom: 30px;">
            <div class="stat-card">
                <div class="stat-icon primary"><i class="fas fa-clipboard-list"></i></div>
                <div class="stat-value">${firebaseData.production.filter(p => p.status === 'Beklemede').length}</div>
                <div class="stat-label">Bekleyen İş Emri</div>
            </div>
            <div class="stat-card">
                <div class="stat-icon warning"><i class="fas fa-cogs"></i></div>
                <div class="stat-value">${firebaseData.production.filter(p => p.status === 'Üretimde').length}</div>
                <div class="stat-label">Üretimde</div>
            </div>
            <div class="stat-card">
                <div class="stat-icon success"><i class="fas fa-check-circle"></i></div>
                <div class="stat-value">${firebaseData.production.filter(p => p.status === 'Tamamlandı').length}</div>
                <div class="stat-label">Tamamlanan</div>
            </div>
            <div class="stat-card">
                <div class="stat-icon info"><i class="fas fa-sitemap"></i></div>
                <div class="stat-value">${firebaseData.recipes.length}</div>
                <div class="stat-label">Aktif Reçete</div>
            </div>
        </div>
        
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
            <!-- Sol Taraf - Form -->
            <div class="card">
                <div class="card-header" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white;">
                    <h3 class="card-title"><i class="fas fa-edit"></i> İş Emri Bilgileri</h3>
                </div>
                <div class="card-body">
                    <div class="form-group">
                        <label class="form-label">
                            <i class="fas fa-hashtag"></i> İş Emri No
                        </label>
                        <input type="text" class="form-control" value="URT-2025-${String(firebaseData.production.length + 1).padStart(3, '0')}" readonly style="font-weight: bold; background: var(--gray-50);">
                    </div>
                    
                    <div class="form-group">
                        <label class="form-label">
                            <i class="fas fa-sitemap"></i> Reçete Seçimi <span style="color: red;">*</span>
                        </label>
                        <select class="form-control" id="jobRecipe" onchange="loadRecipeDetails(this.value)" required>
                            <option value="">Reçete seçiniz...</option>
                            ${recipeOptions}
                        </select>
                    </div>
                    
                    <div class="form-group">
                        <label class="form-label">
                            <i class="fas fa-building"></i> Müşteri (Opsiyonel)
                        </label>
                        <select class="form-control" id="jobCompany">
                            <option value="">Müşteri seçiniz...</option>
                            ${companyOptions}
                        </select>
                    </div>
                    
                    <div class="form-grid">
                        <div class="form-group">
                            <label class="form-label">
                                <i class="fas fa-sort-numeric-up"></i> Üretim Miktarı <span style="color: red;">*</span>
                            </label>
                            <input type="number" class="form-control" id="jobQuantity" placeholder="Adet" min="1" required onchange="calculateRequiredMaterials()">
                        </div>
                        
                        <div class="form-group">
                            <label class="form-label">
                                <i class="fas fa-tachometer-alt"></i> Öncelik
                            </label>
                            <select class="form-control" id="jobPriority">
                                <option value="normal">Normal</option>
                                <option value="yuksek" style="color: orange;">Yüksek</option>
                                <option value="acil" style="color: red;">Acil</option>
                            </select>
                        </div>
                    </div>
                    
                    <div class="form-grid">
                        <div class="form-group">
                            <label class="form-label">
                                <i class="fas fa-calendar-alt"></i> Başlangıç Tarihi
                            </label>
                            <input type="date" class="form-control" id="jobStartDate" value="${new Date().toISOString().split('T')[0]}" required>
                        </div>
                        
                        <div class="form-group">
                            <label class="form-label">
                                <i class="fas fa-calendar-check"></i> Termin Tarihi
                            </label>
                            <input type="date" class="form-control" id="jobDeadline">
                        </div>
                    </div>
                    
                    <div class="form-group">
                        <label class="form-label">
                            <i class="fas fa-industry"></i> İlk Bölüm
                        </label>
                        <select class="form-control" id="jobDepartment">
                            <option value="Depo/Stok">Depo/Stok</option>
                            <option value="Dizgi">Dizgi</option>
                            <option value="İmalat/Montaj">İmalat/Montaj</option>
                        </select>
                    </div>
                    
                    <div class="form-group">
                        <label class="form-label">
                            <i class="fas fa-sticky-note"></i> Notlar
                        </label>
                        <textarea class="form-control" id="jobNotes" rows="3" placeholder="Üretim ile ilgili özel notlar..."></textarea>
                    </div>
                    
                    <button class="btn btn-success" onclick="createJobOrder()" style="width: 100%; padding: 15px; font-size: 16px;">
                        <i class="fas fa-plus-circle"></i> İş Emri Oluştur
                    </button>
                </div>
            </div>
            
            <!-- Sağ Taraf - Reçete Detayları -->
            <div>
                <!-- Reçete Detayları -->
                <div id="recipePreview" class="card" style="display: none;">
                    <div class="card-header" style="background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); color: white;">
                        <h4 class="card-title"><i class="fas fa-info-circle"></i> Reçete Detayları</h4>
                    </div>
                    <div class="card-body" id="recipePreviewBody">
                        <!-- Dinamik yüklenir -->
                    </div>
                </div>
                
                <!-- Stok Durumu -->
                <div id="stockStatus" class="card" style="display: none; margin-top: 20px;">
                    <div class="card-header">
                        <h4 class="card-title"><i class="fas fa-warehouse"></i> Stok Durumu</h4>
                    </div>
                    <div class="card-body" id="stockStatusBody">
                        <!-- Dinamik yüklenir -->
                    </div>
                </div>
                
                <!-- Son İş Emirleri -->
                <div class="card" style="margin-top: 20px;">
                    <div class="card-header">
                        <h4 class="card-title"><i class="fas fa-history"></i> Son İş Emirleri</h4>
                    </div>
                    <div class="card-body">
                        <div style="max-height: 300px; overflow-y: auto;">
                            ${firebaseData.production.slice(-5).reverse().map(prod => `
                                <div style="padding: 10px; border-bottom: 1px solid var(--gray-200);">
                                    <div style="display: flex; justify-content: space-between; align-items: center;">
                                        <div>
                                            <strong>${prod.orderNo}</strong>
                                            <div style="font-size: 12px; color: var(--gray-600);">
                                                ${prod.product} - ${prod.quantity} adet
                                            </div>
                                        </div>
                                        <span class="badge ${prod.status === 'Tamamlandı' ? 'success' : prod.status === 'Üretimde' ? 'warning' : 'info'}">
                                            ${prod.status}
                                        </span>
                                    </div>
                                </div>
                            `).join('') || '<p style="color: var(--gray-500); text-align: center;">Henüz iş emri yok</p>'}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
    document.getElementById('pageContent').innerHTML = content;
}

// Reçete detaylarını yükle ve stok kontrolü yap
function loadRecipeDetails(recipeId) {
    const recipe = firebaseData.recipes.find(r => r.id === recipeId);
    const previewBody = document.getElementById('recipePreviewBody');
    const previewDiv = document.getElementById('recipePreview');
    const stockDiv = document.getElementById('stockStatus');
    const stockBody = document.getElementById('stockStatusBody');
    
    if (recipe && previewBody) {
        const product = firebaseData.products.find(p => p.id === recipe.productId);
        
        // Reçete detayları
        const rawDetails = recipe.rawMaterials.map(rmId => {
            const rm = firebaseData.stock.find(s => s.id === rmId);
            return `
                <tr>
                    <td>${rm ? rm.name : 'Bilinmeyen'}</td>
                    <td style="text-align: center;">${recipe.quantityPerUnit}</td>
                    <td style="text-align: center;">${rm ? rm.unit : ''}</td>
                </tr>
            `;
        }).join('');
        
        previewBody.innerHTML = `
            <div style="background: var(--gray-50); padding: 15px; border-radius: 10px; margin-bottom: 15px;">
                <p style="margin: 5px 0;"><strong>Ürün:</strong> ${product ? product.name : 'Bilinmeyen'}</p>
                <p style="margin: 5px 0;"><strong>Ürün Kodu:</strong> ${product ? product.code : '-'}</p>
                <p style="margin: 5px 0;"><strong>Birim Miktar:</strong> ${recipe.quantityPerUnit}</p>
            </div>
            
            <h5 style="margin-bottom: 10px;">Hammaddeler:</h5>
            <table class="table">
                <thead>
                    <tr>
                        <th>Hammadde</th>
                        <th style="text-align: center;">Miktar</th>
                        <th style="text-align: center;">Birim</th>
                    </tr>
                </thead>
                <tbody>
                    ${rawDetails}
                </tbody>
            </table>
        `;
        
        previewDiv.style.display = 'block';
        
        // Miktar girilmişse stok kontrolü yap
        const quantity = document.getElementById('jobQuantity').value;
        if (quantity) {
            calculateRequiredMaterials();
        }
    } else {
        previewDiv.style.display = 'none';
        stockDiv.style.display = 'none';
    }
}

// Gerekli hammaddeleri hesapla ve stok kontrolü yap
function calculateRequiredMaterials() {
    const recipeId = document.getElementById('jobRecipe').value;
    const quantity = parseInt(document.getElementById('jobQuantity').value) || 0;
    
    if (!recipeId || !quantity) return;
    
    const recipe = firebaseData.recipes.find(r => r.id === recipeId);
    if (!recipe) return;
    
    const stockDiv = document.getElementById('stockStatus');
    const stockBody = document.getElementById('stockStatusBody');
    
    let allSufficient = true;
    const stockDetails = recipe.rawMaterials.map(rmId => {
        const rm = firebaseData.stock.find(s => s.id === rmId);
        const needed = quantity * (recipe.quantityPerUnit || 1);
        const sufficient = rm && rm.quantity >= needed;
        if (!sufficient) allSufficient = false;
        
        return `
            <div style="padding: 10px; border: 1px solid ${sufficient ? 'var(--success)' : 'var(--danger)'}; border-radius: 8px; margin-bottom: 10px; background: ${sufficient ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)'};">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <div>
                        <strong>${rm ? rm.name : 'Bilinmeyen'}</strong>
                        <div style="font-size: 12px; color: var(--gray-600); margin-top: 5px;">
                            Gerekli: ${needed} ${rm ? rm.unit : ''} | Mevcut: ${rm ? rm.quantity : 0} ${rm ? rm.unit : ''}
                        </div>
                    </div>
                    <span class="badge ${sufficient ? 'success' : 'danger'}">
                        ${sufficient ? 'Yeterli' : `${rm ? needed - rm.quantity : needed} ${rm ? rm.unit : ''} Eksik`}
                    </span>
                </div>
            </div>
        `;
    }).join('');
    
    stockBody.innerHTML = `
        ${allSufficient ? 
            '<div class="alert alert-success"><i class="fas fa-check-circle"></i> Tüm hammaddeler yeterli!</div>' : 
            '<div class="alert alert-danger"><i class="fas fa-exclamation-triangle"></i> Bazı hammaddeler yetersiz!</div>'
        }
        ${stockDetails}
    `;
    
    stockDiv.style.display = 'block';
}



// createJobOrder - Reçete bazlı, yeni bölümler
async function createJobOrder() {
    const recipeId = document.getElementById('jobRecipe').value;
    const quantity = document.getElementById('jobQuantity').value;
    const startDate = document.getElementById('jobStartDate').value;
    const department = document.getElementById('jobDepartment').value;
    
    if (!recipeId || !quantity) {
        showNotification('Hata', 'Lütfen reçete ve miktar bilgilerini girin.', 'error');
        return;
    }

    const recipe = firebaseData.recipes.find(r => r.id === recipeId);
    const product = firebaseData.products.find(p => p.id === recipe.productId);

    const departments = ['Depo/Stok', 'Dizgi', 'İmalat/Montaj'];

    const newOrder = {
        orderNo: `URT-2025-${String(firebaseData.production.length + 1).padStart(3, '0')}`,
        recipeId: recipeId,
        product: product ? product.name : 'Bilinmeyen Ürün',
        productId: recipe.productId,
        quantity: parseInt(quantity),
        status: 'Beklemede',
        currentDepartment: department,
        departments: departments,
        progress: 0,
        startDate: startDate,
        completedDate: '',
        active: true,
        approvals: [],
        shipmentStatus: null
    };
    
    try {
        await window.firestoreService.addProduction(newOrder);
        showNotification('İş Emri Oluşturuldu', `İş emri ${newOrder.orderNo} oluşturuldu. İlk bölüm: ${department}.`, 'success');
        document.getElementById('jobRecipe').value = '';
        document.getElementById('jobQuantity').value = '';
        document.getElementById('recipePreview').style.display = 'none';
        await loadFirebaseData();
        loadIsEmriVer();
    } catch (error) {
        console.error('İş emri oluşturma hatası:', error);
        showNotification('Hata', 'İş emri oluşturulurken hata oluştu.', 'error');
    }
}

// Load Üretim Takip - Bölüm bazlı listeler (onclick kaldırıldı)
function loadUretimTakip() {
    const departments = ['Depo/Stok', 'Dizgi', 'İmalat/Montaj'];
    const content = `
        <div class="page-header">
            <h1 class="page-title"><i class="fas fa-tasks"></i> Üretim Takip</h1>
            <p class="page-subtitle">Bölüm bazlı üretim işlerini izleyin</p>
        </div>
        <div class="card">
            <div class="card-header">
                <h3 class="card-title">Bölüm İş Listeleri</h3>
            </div>
            <div class="card-body">
                ${departments.map(dep => `
                    <div class="section">
                        <h4 class="section-title">${dep} İş Listesi</h4>
                        <div class="table-container">
                            <table class="table">
                                <thead>
                                    <tr>
                                        <th>İş Emri No</th>
                                        <th>Ürün</th>
                                        <th>Reçete</th>
                                        <th>Miktar</th>
                                        <th>Başlangıç</th>
                                        <th>İlerleme</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${firebaseData.production
                                        .filter(p => p.status !== 'Tamamlandı' && p.currentDepartment === dep)
                                        .map(prod => {
                                            const recipe = firebaseData.recipes.find(r => r.id === prod.recipeId);
                                            // Fallback: approvals yoksa boş array
                                            const approvals = prod.approvals || [];
                                            return `
                                            <tr style="cursor: default;">
                                                <td><strong>${prod.orderNo}</strong></td>
                                                <td>${prod.product}</td>
                                                <td>${recipe ? recipe.name : 'Bilinmeyen'}</td>
                                                <td>${prod.quantity}</td>
                                                <td>${prod.startDate}</td>
                                                <td>
                                                    <div style="display: flex; align-items: center; gap: 8px;">
                                                        <div style="width: 60px; height: 6px; background: var(--gray-200); border-radius: 3px; overflow: hidden;">
                                                            <div style="width: ${prod.progress || 0}%; height: 100%; background: var(--primary);"></div>
                                                        </div>
                                                        <span>${prod.progress || 0}%</span>
                                                    </div>
                                                </td>
                                            </tr>
                                        `;
                                        }).join('')}
                                </tbody>
                            </table>
                        </div>
                    </div>
                `).join('')}
            </div>
        </div>
    `;
    document.getElementById('pageContent').innerHTML = content;
}
function showProductionDetail(productionId) {
    const prod = firebaseData.production.find(p => p.id === productionId);
    if (prod) {
        const approvals = prod.approvals || [];
        const progress = prod.progress || 0;
        const status = prod.status || 'Beklemede';
        const currentDepartment = prod.currentDepartment || 'Depo/Stok';
        const departments = ['Depo/Stok', 'Dizgi', 'İmalat/Montaj'];
        const recipe = firebaseData.recipes.find(r => r.id === prod.recipeId);
        const product = firebaseData.products.find(p => p.id === prod.productId);

        // Sıralı kontrol
        const isDepoApproved = approvals.some(a => a.department === 'Depo/Stok');
        const isDizgiApproved = approvals.some(a => a.department === 'Dizgi');

        // Reçete detayları - daha düzenli
        let rawDetailsHTML = '';
        if (recipe && recipe.rawMaterials) {
            rawDetailsHTML = `
                <div style="background: var(--gray-50); padding: 15px; border-radius: 8px;">
                    <h5 style="margin-bottom: 10px; color: var(--primary);">Kullanılacak Hammaddeler:</h5>
                    <table style="width: 100%; font-size: 13px;">
                        <thead>
                            <tr style="border-bottom: 2px solid var(--gray-300);">
                                <th style="text-align: left; padding: 5px;">Hammadde</th>
                                <th style="text-align: center; padding: 5px;">Gerekli</th>
                                <th style="text-align: center; padding: 5px;">Stok</th>
                                <th style="text-align: center; padding: 5px;">Durum</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${recipe.rawMaterials.map(rmId => {
                                const rm = firebaseData.stock.find(s => s.id === rmId);
                                const usedQuantity = prod.quantity * (recipe.quantityPerUnit || 1);
                                const sufficient = rm ? rm.quantity >= usedQuantity : false;
                                return `
                                    <tr style="border-bottom: 1px solid var(--gray-200);">
                                        <td style="padding: 5px;"><strong>${rm ? rm.name : 'Bilinmeyen'}</strong></td>
                                        <td style="text-align: center; padding: 5px;">${usedQuantity} ${rm ? rm.unit : ''}</td>
                                        <td style="text-align: center; padding: 5px;">${rm ? rm.quantity : 0} ${rm ? rm.unit : ''}</td>
                                        <td style="text-align: center; padding: 5px;">
                                            <span class="badge ${sufficient ? 'success' : 'danger'}" style="font-size: 11px;">
                                                ${sufficient ? 'Yeterli' : 'Yetersiz'}
                                            </span>
                                        </td>
                                    </tr>
                                `;
                            }).join('')}
                        </tbody>
                    </table>
                </div>
            `;
        } else {
            rawDetailsHTML = '<div style="color: var(--gray-500);">Reçete bilgisi bulunamadı</div>';
        }

        // Bölüm onayları - her bölüm için ayrı satır
        let departmentApprovals = '';
        departments.forEach(dep => {
            const idSafe = dep.replace('/', '_');
            const depApproval = approvals.find(a => a.department === dep);
            const isDisabled = currentUser.role !== 'admin' && (
                (dep === 'Depo/Stok' && currentUser.role !== 'warehouse') ||
                (dep !== 'Depo/Stok' && currentUser.role !== 'production') ||
                (dep === 'Dizgi' && !isDepoApproved) ||
                (dep === 'İmalat/Montaj' && (!isDepoApproved || !isDizgiApproved))
            );
            
            departmentApprovals += `
                <div style="border: 1px solid var(--gray-200); padding: 15px; border-radius: 8px; margin-bottom: 10px;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                        <h5 style="margin: 0; color: var(--gray-700);">${dep}</h5>
                        <label style="display: flex; align-items: center; gap: 8px;">
                            <input type="checkbox" 
                                id="dep_${idSafe}" 
                                ${depApproval ? 'checked' : ''} 
                                ${isDisabled ? 'disabled' : ''} 
                                onchange="updateProgressFromModal('${productionId}')"
                                style="width: 18px; height: 18px;">
                            <span>Onaylandı</span>
                        </label>
                    </div>
                    ${!isDisabled ? `
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                            <div>
                                <label style="font-size: 12px; color: var(--gray-600);">Tarih:</label>
                                <input type="date" 
                                    id="date_${idSafe}" 
                                    class="form-control" 
                                    value="${depApproval ? depApproval.date : new Date().toISOString().split('T')[0]}"
                                    style="font-size: 13px;">
                            </div>
                            <div>
                                <label style="font-size: 12px; color: var(--gray-600);">Çalışma Süresi (saat):</label>
                                <input type="number" 
                                    id="time_${idSafe}" 
                                    class="form-control" 
                                    value="${depApproval ? depApproval.timeSpent : ''}"
                                    min="0" 
                                    step="0.5" 
                                    placeholder="0.0"
                                    style="font-size: 13px;">
                            </div>
                        </div>
                        ${depApproval && depApproval.userId ? `
                            <div style="margin-top: 5px; font-size: 11px; color: var(--gray-500);">
                                Son onay: ${firebaseData.users.find(u => u.id === depApproval.userId)?.name || 'Bilinmeyen'}
                            </div>
                        ` : ''}
                    ` : `
                        <div style="font-size: 12px; color: var(--gray-500);">
                            ${depApproval ? `Onaylandı: ${depApproval.date} - ${depApproval.timeSpent || 0} saat` : 'Bu bölüme erişim yetkiniz yok'}
                        </div>
                    `}
                </div>
            `;
        });

        document.getElementById('productionDetailTitle').textContent = `${prod.orderNo} Detayları`;
        document.getElementById('productionDetailBody').innerHTML = `
            <input type="hidden" name="productionId" value="${productionId}">
            <div class="production-detail-grid">
                <div class="form-grid">
                    <div class="form-group">
                        <label class="form-label">Ürün</label>
                        <input type="text" class="form-control" value="${product ? product.name : 'Bilinmeyen'}" readonly>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Miktar</label>
                        <input type="text" class="form-control" value="${prod.quantity}" readonly>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Mevcut Bölüm</label>
                        <input type="text" class="form-control" value="${currentDepartment}" readonly>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Durum</label>
                        <input type="text" class="form-control" value="${status}" readonly style="font-weight: bold; color: ${status === 'Tamamlandı' ? 'var(--success)' : status === 'Üretimde' ? 'var(--warning)' : 'var(--gray-500)'};">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Genel İlerleme</label>
                        <div style="display: flex; align-items: center; gap: 10px;">
                            <div class="progress-bar" style="flex: 1;">
                                <div class="progress-fill" style="width: ${progress}%;"></div>
                            </div>
                            <span style="font-weight: 600;">${progress}%</span>
                        </div>
                    </div>
                    ${status === 'Tamamlandı' ? `
                        <div class="form-group">
                            <label class="form-label">Tamamlanma Tarihi</label>
                            <input type="text" class="form-control" value="${prod.completedDate || '-'}" readonly>
                        </div>
                    ` : ''}
                </div>
                
                <div class="section">
                    <h4 class="section-title">Reçete Detayları</h4>
                    ${rawDetailsHTML}
                </div>
                
                <div class="section">
                    <h4 class="section-title">Bölüm Onayları</h4>
                    <p style="color: var(--gray-500); font-size: 12px; margin-bottom: 15px;">
                        <i class="fas fa-info-circle"></i> Sıralı onay sistemi: Depo/Stok → Dizgi → İmalat/Montaj
                    </p>
                    ${departmentApprovals}
                </div>
                
                ${status === 'Tamamlandı' && prod.shipmentStatus ? `
                    <div class="section">
                        <h4 class="section-title">Sevkiyat Durumu</h4>
                        <div style="background: var(--gray-50); padding: 15px; border-radius: 8px;">
                            <div style="display: flex; align-items: center; gap: 10px;">
                                <i class="fas fa-truck" style="font-size: 24px; color: ${prod.shipmentStatus === 'Sevk Edildi' ? 'var(--success)' : 'var(--warning)'};"></i>
                                <div>
                                    <div style="font-weight: 600; color: var(--gray-900);">
                                        ${prod.shipmentStatus === 'Sevk Edildi' ? 'Sevk Edildi' : 'Sevk Bekliyor'}
                                    </div>
                                    ${prod.shipmentDate ? `<div style="font-size: 12px; color: var(--gray-600);">Sevk Tarihi: ${prod.shipmentDate}</div>` : ''}
                                </div>
                            </div>
                        </div>
                    </div>
                ` : ''}
                
                <div style="margin-top: 20px; padding-top: 20px; border-top: 2px solid var(--gray-200);">
                    ${status !== 'Tamamlandı' ? `
                        <button class="btn btn-success" onclick="completeProduction('${productionId}')">
                            <i class="fas fa-check-circle"></i> Üretimi Tamamla
                        </button>
                    ` : ''}
                    
                    ${currentUser.role === 'admin' ? `
                        <button class="btn btn-danger" onclick="deleteProduction('${productionId}')" style="${status !== 'Tamamlandı' ? 'margin-left: 10px;' : ''}">
                            <i class="fas fa-trash"></i> Üretimden Sil
                        </button>
                    ` : ''}
                </div>
            </div>
        `;
        openModal('productionDetailModal');
    }
}

// Üretimi Sil
async function deleteProduction(productionId) {
    if (!currentUser || currentUser.role !== 'admin') {
        showNotification('Hata', 'Bu işlem için yetkiniz yok.', 'error');
        return;
    }
    
    if (confirm('Bu üretimi silmek istediğinize emin misiniz? Bu işlem geri alınamaz.')) {
        const prod = firebaseData.production.find(p => p.id === productionId);
        if (prod) {
            try {
                // Bildirim oluştur
                await createNotification({
                    type: 'production_deleted',
                    title: 'Üretim Silindi',
                    message: `${prod.orderNo} numaralı üretim ${currentUser.name} tarafından silindi.`,
                    from: currentUser.id,
                    to: 'all',
                    productionId: productionId,
                    date: new Date().toISOString()
                });
                
                await window.firestoreService.deleteProduction(productionId);
                showNotification('Silindi', 'Üretim başarıyla silindi.', 'success');
                closeModal('productionDetailModal');
                await loadFirebaseData();
                loadUretimListesi();
                loadUretimTakip();
            } catch (error) {
                console.error('Üretim silme hatası:', error);
                showNotification('Hata', 'Üretim silinirken hata oluştu.', 'error');
            }
        }
    }
}


function updateProgressFromModal(productionId) {
    const departments = ['Depo/Stok', 'Dizgi', 'İmalat/Montaj'];
    let checkedCount = 0;
    departments.forEach(dep => {
        const idSafe = dep.replace('/', '_');
        const cb = document.getElementById(`dep_${idSafe}`);
        if (cb && cb.checked) checkedCount++;
    });
    const progress = Math.round((checkedCount / departments.length) * 100);
    document.getElementById('detailProgress').value = progress;
}


async function saveProductionDetail() {
    const productionId = document.querySelector('#productionDetailModal input[name="productionId"]').value;
    const prod = firebaseData.production.find(p => p.id === productionId);
    if (!prod) return;

    const departments = ['Depo/Stok', 'Dizgi', 'İmalat/Montaj'];
    let updatedApprovals = [];
    let workTimeRecords = prod.workTimeRecords || [];
    
    for (const dep of departments) {
        const idSafe = dep.replace('/', '_');
        const cb = document.getElementById(`dep_${idSafe}`);
        const dateInput = document.getElementById(`date_${idSafe}`);
        const timeInput = document.getElementById(`time_${idSafe}`);
        
        if (!cb || cb.disabled) continue;
        
        const date = dateInput ? dateInput.value : new Date().toISOString().split('T')[0];
        const timeSpent = timeInput ? parseFloat(timeInput.value) || 0 : 0;
        
        if (timeSpent > 0 || date) {
            const existingRecord = workTimeRecords.find(r => 
                r.department === dep && r.userId === currentUser.id
            );
            
            if (existingRecord) {
                existingRecord.date = new Date(date).toLocaleDateString('tr-TR');
                existingRecord.timeSpent = timeSpent;
                existingRecord.lastUpdated = new Date().toISOString();
            } else {
                workTimeRecords.push({
                    userId: currentUser.id,
                    userName: currentUser.name,
                    userRole: currentUser.role,
                    department: dep,
                    date: new Date(date).toLocaleDateString('tr-TR'),
                    timeSpent: timeSpent,
                    createdAt: new Date().toISOString(),
                    lastUpdated: new Date().toISOString()
                });
            }
        }
        
        const existingApproval = (prod.approvals || []).find(a => a.department === dep);
        
        if (cb.checked) {
            if (!existingApproval) {
                if (dep === 'Depo/Stok') {
                    const recipe = firebaseData.recipes.find(r => r.id === prod.recipeId);
                    if (recipe) {
                        let stockOk = true;
                        const stockUpdates = [];
                        
                        for (const rmId of recipe.rawMaterials) {
                            const rm = firebaseData.stock.find(s => s.id === rmId);
                            const needed = prod.quantity * (recipe.quantityPerUnit || 1);
                            
                            if (!rm || rm.quantity < needed) {
                                stockOk = false;
                                showNotification('Stok Yetersiz', 
                                    `${rm ? rm.name : 'Hammadde'} için stok yetersiz! Gerekli: ${needed} ${rm?.unit || ''}, Mevcut: ${rm?.quantity || 0} ${rm?.unit || ''}`, 
                                    'error');
                                cb.checked = false;
                                break;
                            } else {
                                stockUpdates.push({
                                    id: rmId,
                                    name: rm.name,
                                    newQuantity: rm.quantity - needed,
                                    unit: rm.unit,
                                    minStock: rm.minStock
                                });
                            }
                        }
                        
                        if (stockOk) {
                            for (const update of stockUpdates) {
                                const stockData = firebaseData.stock.find(s => s.id === update.id);
                                await window.firestoreService.updateStock(update.id, {
                                    ...stockData,
                                    quantity: update.newQuantity,
                                    lastUpdate: new Date().toLocaleDateString('tr-TR')
                                });
                                
                                if (update.newQuantity <= update.minStock && update.newQuantity > 0) {
                                    await sendCriticalStockNotification(
                                        update.name, 
                                        update.newQuantity, 
                                        update.minStock, 
                                        update.unit, 
                                        'kritik'
                                    );
                                } else if (update.newQuantity <= 0) {
                                    await sendCriticalStockNotification(
                                        update.name, 
                                        0, 
                                        update.minStock, 
                                        update.unit, 
                                        'tükendi'
                                    );
                                }
                            }
                            
                            firebaseData.stock = await window.firestoreService.getStock();
                        } else {
                            continue;
                        }
                    }
                }
                
                updatedApprovals.push({
                    userId: currentUser.id,
                    userName: currentUser.name,
                    userRole: currentUser.role,
                    department: dep,
                    date: new Date(date).toLocaleDateString('tr-TR'),
                    timeSpent: timeSpent,
                    approvedAt: new Date().toISOString()
                });
                
                await createNotification({
                    type: 'production_approval',
                    title: 'Üretim Onayı',
                    message: `${currentUser.name} tarafından ${prod.orderNo} için ${dep} onaylandı.`,
                    from: currentUser.id,
                    to: 'all',
                    productionId: productionId,
                    date: new Date().toISOString()
                });
            } else {
                updatedApprovals.push(existingApproval);
            }
        } else {
            if (existingApproval) {
                if (currentUser.role === 'admin' || existingApproval.userId === currentUser.id) {
                    if (dep === 'Depo/Stok') {
                        const recipe = firebaseData.recipes.find(r => r.id === prod.recipeId);
                        if (recipe) {
                            for (const rmId of recipe.rawMaterials) {
                                const rm = firebaseData.stock.find(s => s.id === rmId);
                                const returnQty = prod.quantity * (recipe.quantityPerUnit || 1);
                                
                                if (rm) {
                                    await window.firestoreService.updateStock(rmId, {
                                        ...rm,
                                        quantity: rm.quantity + returnQty,
                                        lastUpdate: new Date().toLocaleDateString('tr-TR')
                                    });
                                }
                            }
                            firebaseData.stock = await window.firestoreService.getStock();
                        }
                    }
                    
                    await createNotification({
                        type: 'production_approval_removed',
                        title: 'Üretim Onayı Geri Alındı',
                        message: `${currentUser.name} tarafından ${prod.orderNo} için ${dep} onayı geri alındı.`,
                        from: currentUser.id,
                        to: 'all',
                        productionId: productionId,
                        date: new Date().toISOString()
                    });
                } else {
                    updatedApprovals.push(existingApproval);
                    showNotification('Uyarı', `${dep} onayını geri alamazsınız. Sadece admin veya onayı veren kişi geri alabilir.`, 'warning');
                }
            }
        }
    }
    
    (prod.approvals || []).forEach(approval => {
        if (!departments.includes(approval.department)) {
            updatedApprovals.push(approval);
        }
    });
    
    const progress = Math.round((updatedApprovals.length / departments.length) * 100);
    
    let currentDepartment = prod.currentDepartment || 'Depo/Stok';
    if (updatedApprovals.length > 0 && updatedApprovals.length < departments.length) {
        for (const dep of departments) {
            if (!updatedApprovals.some(a => a.department === dep)) {
                currentDepartment = dep;
                break;
            }
        }
    }
    
    let status = prod.status;
    if (progress > 0 && progress < 100) {
        status = 'Üretimde';
    } else if (progress === 0) {
        status = 'Beklemede';
    }
    
    const updateData = {
        ...prod,
        approvals: updatedApprovals,
        workTimeRecords: workTimeRecords,
        progress: progress,
        currentDepartment: currentDepartment,
        status: status,
        lastUpdated: new Date().toISOString()
    };
    
    try {
        await window.firestoreService.updateProduction(productionId, updateData);
        
        showNotification('Başarılı', 'Üretim detayları güncellendi.', 'success');
        closeModal('productionDetailModal');
        
        await loadFirebaseData();
        
        if (currentPage === 'uretimListesi') loadUretimListesi();
        if (currentPage === 'uretimTakip') loadUretimTakip();
        if (currentPage === 'depo') loadDepo();
        
    } catch (error) {
        console.error('Üretim güncelleme hatası:', error);
        showNotification('Hata', 'Güncellenirken hata oluştu.', 'error');
    }
}


// Next Department - Sabit bölümlere göre
async function nextDepartment(productionId) {
    const prod = firebaseData.production.find(p => p.id === productionId);
    if (prod && prod.departments) {
        const departments = ['Depo', 'İmalat/Montaj', 'Dizgi'];
        const currentIndex = departments.indexOf(prod.currentDepartment);
        if (currentIndex < departments.length - 1) {
            const nextDep = departments[currentIndex + 1];
            const updateData = {
                ...prod,
                currentDepartment: nextDep,
                progress: prod.progress + (100 / departments.length)
            };

            try {
                await window.firestoreService.updateProduction(productionId, updateData);
                showNotification('Bölüm Değişti', `${nextDep} bölümüne geçildi.`, 'success');
                await loadFirebaseData();
                loadUretimTakip();
            } catch (error) {
                console.error('Bölüm değiştirme hatası:', error);
                showNotification('Hata', 'Bölüm değiştirilirken hata oluştu.', 'error');
            }
        } else {
            showNotification('Bilgi', 'Tüm bölümler tamamlandı.', 'info');
        }
    }
}


async function shipProduct(productionId) {
    const prod = firebaseData.production.find(p => p.id === productionId);
    
    if (!prod) {
        showNotification('Hata', 'Üretim bulunamadı.', 'error');
        return;
    }
    
    if (prod.status !== 'Tamamlandı') {
        showNotification('Uyarı', 'Sadece tamamlanmış üretimler sevk edilebilir.', 'warning');
        return;
    }
    
    if (prod.shipmentStatus === 'Sevk Edildi') {
        showNotification('Bilgi', 'Bu ürün zaten sevk edilmiş.', 'info');
        return;
    }
    
    if (!confirm(`${prod.orderNo} numaralı ${prod.quantity} adet ${prod.product} ürününü sevk etmek istediğinize emin misiniz?`)) {
        return;
    }
    
    try {
        // Sevkiyat kaydı oluştur
        const shipment = {
            productionId: productionId,
            orderNo: prod.orderNo,
            productName: prod.product,
            quantity: prod.quantity,
            date: new Date().toLocaleDateString('tr-TR'),
            time: new Date().toLocaleTimeString('tr-TR'),
            status: 'Sevk Edildi',
            destination: prod.companyId ? getCustomerName(prod.companyId) : 'Depo',
            shippedBy: currentUser.name,
            active: true
        };
        
        // Üretim kaydını güncelle
        const updateData = {
            ...prod,
            shipmentStatus: 'Sevk Edildi',
            shipmentDate: new Date().toLocaleDateString('tr-TR'),
            shippedBy: currentUser.id
        };
        
        await window.firestoreService.addShipment(shipment);
        await window.firestoreService.updateProduction(productionId, updateData);
        
        // Bildirim oluştur
        await createNotification({
            type: 'shipment_completed',
            title: 'Sevkiyat Tamamlandı',
            message: `${prod.orderNo} numaralı ${prod.quantity} adet ${prod.product} başarıyla sevk edildi.`,
            from: currentUser.id,
            to: 'all',
            productionId: productionId,
            date: new Date().toISOString()
        });
        
        showNotification('Başarılı', `${prod.orderNo} başarıyla sevk edildi.`, 'success');
        await loadFirebaseData();
        
        if (currentPage === 'sevkiyatBekleyen') loadSevkiyatBekleyen();
        if (currentPage === 'sevkiyatEdilen') loadSevkiyatEdilen();
        
    } catch (error) {
        console.error('Sevk hatası:', error);
        showNotification('Hata', 'Sevkiyat sırasında hata oluştu.', 'error');
    }
}

// Yeni: Sevkiyat Bekleyen Sayfası
function loadSevkiyatBekleyen() {
    // Debug için log ekleyelim
    console.log('Tüm üretimler:', firebaseData.production);
    console.log('Tamamlanmış üretimler:', firebaseData.production.filter(p => p.status === 'Tamamlandı'));
    
    // Sevk bekleyenleri filtrele
    const bekleyenUretimler = firebaseData.production.filter(p => {
        return p.status === 'Tamamlandı' && p.shipmentStatus === 'Sevk Bekliyor';
    });
    
    console.log('Sevk bekleyen üretimler:', bekleyenUretimler);
    
    const content = `
        <div class="page-header">
            <h1 class="page-title"><i class="fas fa-truck"></i> Sevk Bekleyen</h1>
            <p class="page-subtitle">Sevk edilmeyi bekleyen ürünler</p>
        </div>
        <div class="card">
            <div class="card-header">
                <h3 class="card-title">Sevk Bekleyen Ürünler (${bekleyenUretimler.length})</h3>
            </div>
            <div class="card-body">
                <div class="table-container">
                    <table class="table">
                        <thead>
                            <tr>
                                <th>İş Emri No</th>
                                <th>Ürün</th>
                                <th>Miktar</th>
                                <th>Tamamlanma Tarihi</th>
                                <th>İşlemler</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${bekleyenUretimler.length > 0 ? bekleyenUretimler.map(prod => `
                                <tr>
                                    <td><strong>${prod.orderNo}</strong></td>
                                    <td>${prod.product}</td>
                                    <td>${prod.quantity} adet</td>
                                    <td>${prod.completedDate || '-'}</td>
                                    <td>
                                        <button class="btn btn-sm btn-warning" onclick="shipProduct('${prod.id}')">
                                            <i class="fas fa-truck"></i> Sevk Et
                                        </button>
                                    </td>
                                </tr>
                            `).join('') : '<tr><td colspan="5" style="text-align: center; color: var(--gray-500);">Sevk bekleyen ürün bulunmuyor</td></tr>'}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    `;
    document.getElementById('pageContent').innerHTML = content;
}

async function deleteShipment(productionId) {
    const prod = firebaseData.production.find(p => p.id === productionId);
    
    if (!prod) {
        showNotification('Hata', 'Üretim bulunamadı.', 'error');
        return;
    }
    
    if (!confirm(`${prod.orderNo} numaralı sevkiyat kaydını tamamen silmek istediğinize emin misiniz?\n\nDİKKAT: Bu işlem geri alınamaz!`)) {
        return;
    }
    
    try {
        // Üretim kaydından sevkiyat bilgilerini temizle
        const updateData = {
            ...prod,
            shipmentStatus: null,
            shipmentDate: null,
            shippedBy: null,
            shipmentReadyDate: null
        };
        
        await window.firestoreService.updateProduction(productionId, updateData);
        
        // Bildirim oluştur
        await createNotification({
            type: 'shipment_deleted',
            title: 'Sevkiyat Silindi',
            message: `${prod.orderNo} numaralı ürünün sevkiyat kaydı silindi.`,
            from: currentUser.id,
            to: 'all',
            productionId: productionId,
            date: new Date().toISOString()
        });
        
        showNotification('Başarılı', 'Sevkiyat kaydı başarıyla silindi.', 'success');
        
        await loadFirebaseData();
        
        if (currentPage === 'sevkiyatEdilen') loadSevkiyatEdilen();
        
    } catch (error) {
        console.error('Sevkiyat silme hatası:', error);
        showNotification('Hata', 'Sevkiyat silinirken hata oluştu.', 'error');
    }
}

// loadRaporlar fonksiyonunun sonuna ekleyin
function loadRaporlar() {
    const content = `
        <div class="page-header">
            <h1 class="page-title"><i class="fas fa-chart-bar"></i> Raporlar</h1>
            <p class="page-subtitle">Detaylı analiz ve raporlar</p>
        </div>
        
        ${currentUser.role === 'admin' ? `
        <div class="card" style="margin-bottom: 20px;">
            <div class="card-body">
                <button class="btn btn-primary" onclick="showPage('kullaniciRaporlari')">
                    <i class="fas fa-users"></i> Kullanıcı Raporlarını Görüntüle
                </button>
            </div>
        </div>
        ` : ''}
        
        <div class="card">
            <div class="card-header">
                <h3 class="card-title">Depo Raporu</h3>
            </div>
            <div class="card-body">
                <div class="table-container">
                    <table class="table">
                        <thead><tr><th>Ürün</th><th>Stok Miktarı</th><th>Son Güncelleme</th></tr></thead>
                        <tbody>
                            ${firebaseData.products.map(p => `
                                <tr>
                                    <td>${p.name}</td>
                                    <td>${p.stock || 0} adet</td>
                                    <td>${p.lastUpdate || new Date().toLocaleDateString('tr-TR')}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
        <div class="card">
            <div class="card-header">
                <h3 class="card-title">Sevkiyat Raporu</h3>
            </div>
            <div class="card-body">
                <div class="table-container">
                    <table class="table">
                        <thead><tr><th>İş Emri No</th><th>Ürün</th><th>Miktar</th><th>Sevk Tarihi</th></tr></thead>
                        <tbody>
                            ${firebaseData.shipments.map(s => `
                                <tr>
                                    <td><strong>${s.productionId || 'Bilinmeyen'}</strong></td>
                                    <td>${s.productName}</td>
                                    <td>${s.quantity}</td>
                                    <td>${s.date}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    `;
    document.getElementById('pageContent').innerHTML = content;
}

function filterSevkiyatBekleyen() {
    const search = document.getElementById('shipmentBekleyenSearch').value.toLowerCase();
    const dateFrom = document.getElementById('shipmentBekleyenDateFrom').value;
    const dateTo = document.getElementById('shipmentBekleyenDateTo').value;
    const customerId = document.getElementById('shipmentBekleyenCustomer').value;

    const filteredData = firebaseData.production.filter(p => p.status === 'Tamamlandı' && !p.shipmentStatus)
        .filter(p => {
            // Ürün arama
            if (search && !p.product.toLowerCase().includes(search)) return false;
            // Müşteri arama (eğer companyId varsa)
            if (search && !getCustomerName(p.companyId).toLowerCase().includes(search)) return false;
            // Tarih filtre (completedDate'i Date objesine çevir)
            if (dateFrom && new Date(p.completedDate) < new Date(dateFrom)) return false;
            if (dateTo && new Date(p.completedDate) > new Date(dateTo)) return false;
            // Müşteri filtre
            if (customerId && p.companyId !== customerId) return false;
            return true;
        });

    const tbody = document.getElementById('sevkiyatBekleyenTableBody');
    if (tbody) {
        tbody.innerHTML = filteredData.map(prod => `
            <tr>
                <td><strong>${prod.orderNo}</strong></td>
                <td>${prod.product}</td>
                <td>${getCustomerName(prod.companyId)}</td>
                <td>${prod.quantity}</td>
                <td>${prod.completedDate}</td>
                <td>
                    <button class="btn btn-sm btn-warning" onclick="shipProduct('${prod.id}')">
                        <i class="fas fa-truck"></i> Sevk Et
                    </button>
                </td>
            </tr>
        `).join('');
    }
}

// Yeni: Müşteri Adı Getir (companyId'den)
function getCustomerName(companyId) {
    const company = firebaseData.companies.find(c => c.id === companyId);
    return company ? company.name : 'Bilinmeyen Müşteri';
}

// Yeni: Filtre Temizle
function clearSevkiyatBekleyenFilter() {
    document.getElementById('shipmentBekleyenSearch').value = '';
    document.getElementById('shipmentBekleyenDateFrom').value = '';
    document.getElementById('shipmentBekleyenDateTo').value = '';
    document.getElementById('shipmentBekleyenCustomer').value = '';
    filterSevkiyatBekleyen();
}


function clearSevkiyatEdilenFilter() {
    const searchInput = document.getElementById('shipmentEdilenSearch');
    const dateFromInput = document.getElementById('shipmentEdilenDateFrom');
    const dateToInput = document.getElementById('shipmentEdilenDateTo');
    
    if (searchInput) searchInput.value = '';
    if (dateFromInput) dateFromInput.value = '';
    if (dateToInput) dateToInput.value = '';
    
    // Tabloyu gizle, mesajı göster
    const message = document.getElementById('sevkiyatEdilenMessage');
    const table = document.getElementById('sevkiyatEdilenTable');
    
    if (message) message.style.display = 'block';
    if (table) table.style.display = 'none';
}

// Yeni: Filtreli Veri Getir (Bekleyen için helper)
function filterSevkiyatBekleyenData() {
    // Yukarıdaki filtre mantığını buraya taşı (reuse için)
    const search = document.getElementById('shipmentBekleyenSearch')?.value.toLowerCase() || '';
    const dateFrom = document.getElementById('shipmentBekleyenDateFrom')?.value || '';
    const dateTo = document.getElementById('shipmentBekleyenDateTo')?.value || '';
    const customerId = document.getElementById('shipmentBekleyenCustomer')?.value || '';

    return firebaseData.production.filter(p => p.status === 'Tamamlandı' && !p.shipmentStatus)
        .filter(p => {
            if (search && !p.product.toLowerCase().includes(search)) return false;
            if (search && !getCustomerName(p.companyId).toLowerCase().includes(search)) return false;
            if (dateFrom && new Date(p.completedDate) < new Date(dateFrom)) return false;
            if (dateTo && new Date(p.completedDate) > new Date(dateTo)) return false;
            if (customerId && p.companyId !== customerId) return false;
            return true;
        });
}

// Yeni: Filtreli Veri Getir (Edilen için helper)
function filterSevkiyatEdilenData() {
    const search = document.getElementById('shipmentEdilenSearch')?.value.toLowerCase() || '';
    const dateFrom = document.getElementById('shipmentEdilenDateFrom')?.value || '';
    const dateTo = document.getElementById('shipmentEdilenDateTo')?.value || '';
    const customerId = document.getElementById('shipmentEdilenCustomer')?.value || '';

    return firebaseData.production.filter(p => p.shipmentStatus === 'Sevk Edildi')
        .filter(p => {
            if (search && !p.product.toLowerCase().includes(search)) return false;
            if (search && !getCustomerName(p.companyId).toLowerCase().includes(search)) return false;
            if (dateFrom && new Date(p.shipmentDate) < new Date(dateFrom)) return false;
            if (dateTo && new Date(p.shipmentDate) > new Date(dateTo)) return false;
            if (customerId && p.companyId !== customerId) return false;
            return true;
        });
}

// Complete Department - Checkbox ile bölüm tamamlama
async function completeDepartment(productionId, department) {
    if (!currentUser) {
        showNotification('Hata', 'Giriş yapın.', 'error');
        return;
    }

    const prod = firebaseData.production.find(p => p.id === productionId);
    if (prod && prod.currentDepartment === department) {
        // Role kontrolü
        if ((department === 'Depo' && currentUser.role !== 'warehouse') ||
            (department !== 'Depo' && currentUser.role !== 'production')) {
            showNotification('Erişim Red', 'Bu bölümü tamamlamaya yetkiniz yok.', 'error');
            return;
        }

        // Depo için hammadde kontrolü
        let stockOk = true;
        if (department === 'Depo' && currentUser.role === 'warehouse') {
            const recipe = firebaseData.recipes.find(r => r.id === prod.recipeId);
            if (recipe) {
                recipe.rawMaterials.forEach(rmId => {
                    const rm = firebaseData.stock.find(s => s.id === rmId);
                    const needed = prod.quantity * (recipe.quantityPerUnit || 1);
                    if (rm && rm.quantity < needed) {
                        stockOk = false;
                        showNotification('Uyarı', `${rm.name} stok yetersiz: ${needed - rm.quantity} ${rm.unit} eksik. Tamamlanamaz.`, 'warning');
                        document.getElementById(`complete_${productionId}_${department.replace('/', '_')}`).checked = false;
                    }
                });
                if (!stockOk) return;
            }
        }

        if (stockOk) {
            const departments = ['Depo', 'İmalat/Montaj', 'Dizgi'];
            const currentIndex = departments.indexOf(department);
            const approval = {
                userId: currentUser.id,
                userRole: currentUser.role,
                department: department,
                date: new Date().toLocaleDateString('tr-TR')
            };

            let updateData = {
                ...prod,
                approvals: [...prod.approvals, approval],
                progress: Math.round(((prod.approvals.length + 1) / departments.length) * 100)
            };

            // Sonraki bölüm veya tamamlanma
            if (currentIndex < departments.length - 1) {
                updateData.currentDepartment = departments[currentIndex + 1];
                updateData.status = 'Üretimde';
            } else {
                updateData.status = 'Tamamlandı';
                updateData.completedDate = new Date().toLocaleDateString('tr-TR');
                updateData.shipmentStatus = 'Sevk Bekliyor';
                // Ürün stokunu artır
                const product = firebaseData.products.find(p => p.id === prod.productId);
                if (product) {
                    await window.firestoreService.updateProduct(product.id, {
                        ...product,
                        stock: (product.stock || 0) + prod.quantity
                    });
                }
            }

            try {
                await window.firestoreService.updateProduction(productionId, updateData);
                showNotification('Tamamlandı', `${department} bölümü tamamlandı.`, 'success');
                await loadFirebaseData();
                loadUretimListesi();
                loadUretimTakip();
            } catch (error) {
                console.error('Bölüm tamamlama hatası:', error);
                showNotification('Hata', 'Tamamlanırken hata oluştu.', 'error');
            }
        }
    }
}

// Firma Seçimi Modalı Aç
function openCompanySelectionModal() {
    const modal = document.getElementById('companySelectionModal');
    if (modal) {
        openModal('companySelectionModal');
        filterCompanySuggestions(); // Önerileri yükle
    } else {
        console.error('Firma seçim modalı bulunamadı');
    }
}

function filterCompanySuggestions() {
    const search = document.getElementById('companySelectionSearch')?.value.toLowerCase() || '';
    const list = document.getElementById('companySuggestionsList');
    
    if (!list) {
        console.error('companySuggestionsList elementi bulunamadı');
        return;
    }
    
    list.innerHTML = '';
    
    const filtered = firebaseData.companies
        .filter(c => c.name.toLowerCase().includes(search))
        .sort((a, b) => (b.isFavorite ? 1 : 0) - (a.isFavorite ? 1 : 0));
    
    if (filtered.length === 0) {
        list.innerHTML = '<li class="no-favorites">Firma bulunamadı</li>';
    } else {
        filtered.forEach(company => {
            const item = document.createElement('li');
            item.className = 'suggestion-item' + (company.isFavorite ? ' favorite' : '');
            item.innerHTML = `
                ${company.name} 
                ${company.isFavorite ? '<i class="fas fa-star" style="color: gold; margin-left: 5px;"></i>' : ''}
                <small style="display: block; color: #666; font-size: 11px;">Vergi No: ${company.taxNo}</small>
            `;
            item.onclick = () => selectCompanyFromModal(company.id);
            list.appendChild(item);
        });
    }
}

function selectCompanyFromModal(companyId) {
    const company = firebaseData.companies.find(c => c.id === companyId);
    if (company) {
        // Input elemanlarını kontrol et
        const offerCompanyInput = document.getElementById('offerCompany');
        const offerCompanyIdInput = document.getElementById('offerCompanyId');
        const companySelectionBtn = document.getElementById('companySelectionBtn');
        
        if (!offerCompanyInput || !offerCompanyIdInput) {
            console.error('Hata: offerCompany veya offerCompanyId inputu bulunamadı.');
            // Input yoksa oluştur
            if (!offerCompanyInput) {
                const hiddenInput = document.createElement('input');
                hiddenInput.type = 'hidden';
                hiddenInput.id = 'offerCompany';
                hiddenInput.value = company.name;
                document.querySelector('.card-body').appendChild(hiddenInput);
            } else {
                offerCompanyInput.value = company.name;
            }
            
            if (!offerCompanyIdInput) {
                const hiddenIdInput = document.createElement('input');
                hiddenIdInput.type = 'hidden';
                hiddenIdInput.id = 'offerCompanyId';
                hiddenIdInput.value = company.id;
                document.querySelector('.card-body').appendChild(hiddenIdInput);
            } else {
                offerCompanyIdInput.value = company.id;
            }
        } else {
            offerCompanyInput.value = company.name;
            offerCompanyIdInput.value = company.id;
        }
        
        // Butonu güncelle
        if (companySelectionBtn) {
            companySelectionBtn.innerHTML = `<i class="fas fa-building" style="margin-right: 8px;"></i>${company.name} - ${company.taxNo}`;
            companySelectionBtn.classList.add('selected');
        }
        
        closeModal('companySelectionModal');
        showNotification('Firma Seçildi', `${company.name} seçildi.`, 'success');
    }
}
// Yeni Firma Ekle ve Kaydet (Geliştirildi)
async function saveCompany(companyId = null) {
    const name = document.getElementById('companyName').value.trim();
    const taxNo = document.getElementById('companyTaxNo').value.trim();
    
    if (!name || !taxNo) {
        showNotification('Hata', 'Firma adı ve vergi no zorunlu.', 'error');
        return;
    }
    
    const companyData = {
        name,
        taxNo,
        phone: document.getElementById('companyPhone').value,
        email: document.getElementById('companyEmail').value,
        website: document.getElementById('companyWebsite').value,
        address: document.getElementById('companyAddress').value,
        type: document.getElementById('companyType').value,
        emailNotifications: document.getElementById('companyEmailNotifications').checked,
        favorite: document.getElementById('companyFavorite').checked,
        active: true
    };
    
    // Fotoğraf varsa ekle (base64 olarak)
    const file = document.getElementById('companyPhoto').files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = async function(e) {
            companyData.photo = e.target.result;
            await saveCompanyToFirebase(companyData, companyId);
        };
        reader.readAsDataURL(file);
    } else {
        await saveCompanyToFirebase(companyData, companyId);
    }
}

async function saveCompanyToFirebase(companyData, companyId) {
    try {
        let id;
        if (companyId) {
            await window.firestoreService.updateCompany(companyId, companyData);
            id = companyId;
            showNotification('Güncellendi', 'Firma güncellendi.', 'success');
        } else {
            id = await window.firestoreService.addCompany(companyData);
            showNotification('Eklendi', 'Yeni firma eklendi.', 'success');
        }
        await loadFirebaseData();
        closeModal('addCompanyModal');
        filterCompanySuggestions(); // Önerileri güncelle
    } catch (error) {
        console.error('Firma kaydetme hatası:', error);
        showNotification('Hata', 'Firma kaydedilemedi.', 'error');
    }
}

// Teklif Hazırla Sayfasında Firma Seçimi Butonu (Varsa Event Listener Ekle)
document.addEventListener('DOMContentLoaded', () => {
    const offerCompanyBtn = document.querySelector('#offerCompanyBtn'); // Varsa buton ID'si
    if (offerCompanyBtn) {
        offerCompanyBtn.onclick = openCompanySelectionModal;
    }
});


// Bildirim sistemi
async function createNotification(notificationData) {
    try {
        // read özelliğini ekle
        notificationData.read = false;
        
        await window.firestoreService.addNotification(notificationData);
        
        // Canlı bildirim göster
        if (notificationData.to === 'all' || notificationData.to === currentUser.id) {
            updateNotificationBadge();
        }
    } catch (error) {
        console.error('Bildirim oluşturma hatası:', error);
    }
}

// Bildirim sayısını güncelle
async function updateNotificationBadge() {
    try {
        const notifications = await window.firestoreService.getNotifications();
        const unreadCount = notifications.filter(n => 
            (n.to === 'all' || n.to === currentUser.id) && !n.read
        ).length;
        
        const badge = document.getElementById('notificationBadge');
        if (badge) {
            if (unreadCount > 0) {
                badge.style.display = 'inline-block';
                badge.textContent = unreadCount > 9 ? '9+' : unreadCount;
            } else {
                badge.style.display = 'none';
            }
        }
    } catch (error) {
        console.error('Bildirim badge güncelleme hatası:', error);
    }
}

function loadNotifications() {
    const content = `
        <div class="page-header">
            <h1 class="page-title"><i class="fas fa-bell"></i> Bildirimler</h1>
            <p class="page-subtitle">Sistem bildirimleri ve güncellemeler</p>
        </div>
        <div class="card">
            <div class="card-header">
                <div class="flex justify-between items-center">
                    <h3 class="card-title">Tüm Bildirimler</h3>
                    <div style="display: flex; gap: 10px;">
                        <button class="btn btn-sm btn-outline" onclick="markAllAsRead()">
                            <i class="fas fa-check-double"></i> Tümünü Okundu İşaretle
                        </button>
                        <button class="btn btn-sm btn-danger" onclick="deleteAllNotifications()">
                            <i class="fas fa-trash-alt"></i> Tümünü Sil
                        </button>
                    </div>
                </div>
            </div>
            <div class="card-body">
                <div id="notificationsList"></div>
            </div>
        </div>
    `;
    document.getElementById('pageContent').innerHTML = content;
    loadNotificationsList();
}

async function deleteAllNotifications() {
    if (!confirm('Tüm bildirimleri silmek istediğinize emin misiniz? Bu işlem geri alınamaz.')) {
        return;
    }
    
    try {
        const notifications = await window.firestoreService.getNotifications();
        const userNotifications = notifications.filter(n => 
            n.to === 'all' || n.to === currentUser.id
        );
        
        let deletedCount = 0;
        
        // Her bildirimi sil
        for (const notif of userNotifications) {
            try {
                await window.firestoreService.deleteNotification(notif.id);
                deletedCount++;
            } catch (error) {
                console.error(`Bildirim silinemedi: ${notif.id}`, error);
            }
        }
        
        // Listeyi yenile
        await loadNotificationsList();
        updateNotificationBadge();
        
        if (deletedCount > 0) {
            showNotification('Başarılı', `${deletedCount} bildirim silindi.`, 'success');
        } else {
            showNotification('Bilgi', 'Silinecek bildirim bulunamadı.', 'info');
        }
        
    } catch (error) {
        console.error('Bildirimleri silme hatası:', error);
        showNotification('Hata', 'Bildirimler silinirken hata oluştu.', 'error');
    }
}

// Kullanıcı Raporları Sayfası
function loadKullaniciRaporlari() {
    if (!currentUser || currentUser.role !== 'admin') {
        showNotification('Erişim reddedildi', 'Bu sayfaya erişim yetkiniz bulunmamaktadır', 'error');
        showPage('dashboard');
        return;
    }
    
    const content = `
        <div class="page-header">
            <h1 class="page-title"><i class="fas fa-users"></i> Kullanıcı Raporları</h1>
            <p class="page-subtitle">Her kullanıcının detaylı üretim raporu</p>
        </div>
        <div class="tabs">
            ${firebaseData.users.map(user => `
                <button class="tab" onclick="switchUserReport(this, '${user.id}')">
                    ${user.name}
                </button>
            `).join('')}
        </div>
        <div id="userReportContent"></div>
    `;
    document.getElementById('pageContent').innerHTML = content;
    
    // İlk kullanıcıyı seç
    const firstTab = document.querySelector('.tab');
    if (firstTab) firstTab.click();
}

// Kullanıcı rapor sekmesi değiştir
// Kullanıcı rapor sekmesi değiştir - Sadece çalıştığı yerler görünsün
function switchUserReport(button, userId) {
    // Aktif sekmeyi güncelle
    document.querySelectorAll('.tab').forEach(tab => tab.classList.remove('active'));
    button.classList.add('active');
    
    // Kullanıcı raporunu yükle
    const user = firebaseData.users.find(u => u.id === userId);
    if (user) {
        const userProductions = [];
        
        firebaseData.production.forEach(prod => {
            // Bu üretimde kullanıcının çalışmaları
            const userWorkInThisProduction = [];
            
            // Onaylanan işler
            (prod.approvals || []).forEach(approval => {
                if (approval.userId === userId && approval.timeSpent > 0) {
                    userWorkInThisProduction.push({
                        orderNo: prod.orderNo,
                        product: prod.product,
                        department: approval.department,
                        date: approval.date,
                        timeSpent: approval.timeSpent,
                        status: prod.status,
                        type: 'Onaylandı'
                    });
                }
            });
            
            // workTimeRecords'dan çalışma saatleri
            (prod.workTimeRecords || []).forEach(record => {
                if (record.userId === userId && record.timeSpent > 0) {
                    // Bu bölüm için onay var mı kontrol et
                    const hasApproval = (prod.approvals || []).some(a => 
                        a.userId === userId && 
                        a.department === record.department &&
                        a.timeSpent > 0
                    );
                    
                    // Onay yoksa veya onayda saat 0 ise workTimeRecord'u ekle
                    if (!hasApproval) {
                        userWorkInThisProduction.push({
                            orderNo: prod.orderNo,
                            product: prod.product,
                            department: record.department,
                            date: record.date,
                            timeSpent: record.timeSpent,
                            status: prod.status,
                            type: 'Çalışma Kaydı'
                        });
                    }
                }
            });
            
            // Bu üretimde çalışması varsa ekle
            userProductions.push(...userWorkInThisProduction);
        });
        
        // Tarihe göre sırala
        userProductions.sort((a, b) => {
            const dateA = a.date.split('.').reverse().join('-');
            const dateB = b.date.split('.').reverse().join('-');
            return new Date(dateB) - new Date(dateA);
        });
        
        const totalHours = userProductions.reduce((sum, p) => sum + p.timeSpent, 0);
        
        // Bölüm istatistikleri - sadece çalıştığı bölümler
        const departmentStats = {};
        userProductions.forEach(p => {
            if (!departmentStats[p.department]) {
                departmentStats[p.department] = { 
                    count: 0, 
                    hours: 0,
                    approved: 0,
                    workRecords: 0
                };
            }
            departmentStats[p.department].count++;
            departmentStats[p.department].hours += p.timeSpent;
            if (p.type === 'Onaylandı') {
                departmentStats[p.department].approved++;
            } else {
                departmentStats[p.department].workRecords++;
            }
        });
        
        // İş emri bazlı özet
        const orderSummary = {};
        userProductions.forEach(p => {
            if (!orderSummary[p.orderNo]) {
                orderSummary[p.orderNo] = {
                    product: p.product,
                    departments: [],
                    totalHours: 0
                };
            }
            if (!orderSummary[p.orderNo].departments.includes(p.department)) {
                orderSummary[p.orderNo].departments.push(p.department);
            }
            orderSummary[p.orderNo].totalHours += p.timeSpent;
        });
        
        const reportHTML = `
            <div class="card">
                <div class="card-header">
                    <h3 class="card-title">${user.name} - Üretim Raporu</h3>
                    <p class="card-subtitle">Kullanıcı Adı: ${user.username} | Departman: ${getRoleDisplayName(user.role)}</p>
                </div>
                <div class="card-body">
                    <div class="stats-grid">
                        <div class="stat-card">
                            <div class="stat-icon primary"><i class="fas fa-tasks"></i></div>
                            <div class="stat-value">${userProductions.length}</div>
                            <div class="stat-label">Toplam Çalışma</div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-icon success"><i class="fas fa-clock"></i></div>
                            <div class="stat-value">${totalHours.toFixed(1)}</div>
                            <div class="stat-label">Toplam Saat</div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-icon warning"><i class="fas fa-chart-pie"></i></div>
                            <div class="stat-value">${Object.keys(departmentStats).length}</div>
                            <div class="stat-label">Çalışılan Bölüm</div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-icon info"><i class="fas fa-clipboard-list"></i></div>
                            <div class="stat-value">${Object.keys(orderSummary).length}</div>
                            <div class="stat-label">İş Emri Sayısı</div>
                        </div>
                    </div>
                    
                    ${Object.keys(departmentStats).length > 0 ? `
                    <div class="section">
                        <h4 class="section-title">Bölüm Bazlı İstatistikler</h4>
                        <div class="table-container">
                            <table class="table">
                                <thead>
                                    <tr>
                                        <th>Bölüm</th>
                                        <th>Çalışma Sayısı</th>
                                        <th>Onaylı</th>
                                        <th>Çalışma Kaydı</th>
                                        <th>Toplam Saat</th>
                                        <th>Ortalama Saat</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${Object.entries(departmentStats).map(([dep, stats]) => `
                                        <tr>
                                            <td><strong>${dep}</strong></td>
                                            <td>${stats.count}</td>
                                            <td><span class="badge success">${stats.approved}</span></td>
                                            <td><span class="badge info">${stats.workRecords}</span></td>
                                            <td>${stats.hours.toFixed(1)}</td>
                                            <td>${(stats.hours / stats.count).toFixed(1)}</td>
                                        </tr>
                                    `).join('')}
                                </tbody>
                            </table>
                        </div>
                    </div>
                    ` : ''}
                    
                    ${Object.keys(orderSummary).length > 0 ? `
                    <div class="section">
                        <h4 class="section-title">İş Emri Özeti</h4>
                        <div class="table-container">
                            <table class="table">
                                <thead>
                                    <tr>
                                        <th>İş Emri No</th>
                                        <th>Ürün</th>
                                        <th>Çalıştığı Bölümler</th>
                                        <th>Toplam Saat</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${Object.entries(orderSummary).map(([orderNo, summary]) => `
                                        <tr>
                                            <td><strong>${orderNo}</strong></td>
                                            <td>${summary.product}</td>
                                            <td>
                                                ${summary.departments.map(d => 
                                                    `<span class="badge primary" style="margin-right: 5px;">${d}</span>`
                                                ).join('')}
                                            </td>
                                            <td>${summary.totalHours.toFixed(1)} saat</td>
                                        </tr>
                                    `).join('')}
                                </tbody>
                            </table>
                        </div>
                    </div>
                    ` : ''}
                    
                    ${userProductions.length > 0 ? `
                    <div class="section">
                        <h4 class="section-title">Detaylı Çalışma Listesi</h4>
                        <div class="table-container">
                            <table class="table">
                                <thead>
                                    <tr>
                                        <th>İş Emri No</th>
                                        <th>Ürün</th>
                                        <th>Bölüm</th>
                                        <th>Tarih</th>
                                        <th>Çalışma Süresi</th>
                                        <th>Kayıt Tipi</th>
                                        <th>Üretim Durumu</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${userProductions.map(prod => `
                                        <tr>
                                            <td><strong>${prod.orderNo}</strong></td>
                                            <td>${prod.product}</td>
                                            <td><span class="badge primary">${prod.department}</span></td>
                                            <td>${prod.date}</td>
                                            <td><strong>${prod.timeSpent} saat</strong></td>
                                            <td>
                                                <span class="badge ${prod.type === 'Onaylandı' ? 'success' : 'info'}">
                                                    ${prod.type}
                                                </span>
                                            </td>
                                            <td>
                                                <span class="badge ${prod.status === 'Tamamlandı' ? 'success' : 'warning'}">
                                                    ${prod.status}
                                                </span>
                                            </td>
                                        </tr>
                                    `).join('')}
                                </tbody>
                            </table>
                        </div>
                    </div>
                    ` : '<p class="text-gray-500">Bu kullanıcının henüz çalışma kaydı bulunmamaktadır.</p>'}
                </div>
            </div>
        `;
        
        document.getElementById('userReportContent').innerHTML = reportHTML;
    }
}

// Navbar'daki bildirim butonu güncellemesi
function updateNavbarNotificationButton() {
    const navbarHTML = `
        <button class="notification-btn" onclick="openNotificationModal()" style="background: none; border: none; cursor: pointer; position: relative; margin-right: 15px;">
            <i class="fas fa-bell" style="font-size: 20px; color: var(--gray-600);"></i>
            <span id="notificationBadge" style="position: absolute; top: -5px; right: -5px; background: var(--danger); color: white; border-radius: 50%; width: 18px; height: 18px; display: none; font-size: 11px; line-height: 18px; text-align: center;"></span>
        </button>
    `;
    // Bu HTML navbar-user div'ine eklenecek
}

function openNotificationModal() {
    const modal = document.getElementById('notificationModal');
    if (!modal) {
        // Modal yoksa oluştur
        const modalHTML = `
            <div id="notificationModal" class="modal">
                <div class="modal-content" style="max-width: 600px;">
                    <div class="modal-header">
                        <h3 class="modal-title">
                            <i class="fas fa-bell"></i> Bildirimler
                            <span id="unreadCount" style="background: var(--danger); color: white; padding: 2px 8px; border-radius: 12px; font-size: 14px; margin-left: 10px;"></span>
                        </h3>
                        <button class="modal-close" onclick="closeModal('notificationModal')">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    <div class="modal-body" style="max-height: 500px; overflow-y: auto;">
                        <div class="notification-filters" style="margin-bottom: 20px; display: flex; gap: 10px; flex-wrap: wrap;">
                            <button class="btn btn-sm btn-outline" onclick="filterNotifications('all')">Tümü</button>
                            <button class="btn btn-sm btn-outline" onclick="filterNotifications('unread')">Okunmamış</button>
                            <button class="btn btn-sm btn-outline" onclick="filterNotifications('production')">Üretim</button>
                            <button class="btn btn-sm btn-outline" onclick="markAllAsRead()">
                                <i class="fas fa-check-double"></i> Tümünü Okundu İşaretle
                            </button>
                            <button class="btn btn-sm btn-danger" onclick="deleteAllNotifications()">
                                <i class="fas fa-trash-alt"></i> Tümünü Sil
                            </button>
                        </div>
                        <div id="notificationsList">
                            <!-- Bildirimler buraya yüklenecek -->
                        </div>
                    </div>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', modalHTML);
    }
    
    loadNotificationsList();
    openModal('notificationModal');
}

// Bildirim listesini yükle
async function loadNotificationsList(filter = 'all') {
    try {
        const notifications = await window.firestoreService.getNotifications();
        let userNotifications = notifications
            .filter(n => n.to === 'all' || n.to === currentUser.id)
            .sort((a, b) => new Date(b.date) - new Date(a.date));
        
        // Filtreleme
        if (filter === 'unread') {
            userNotifications = userNotifications.filter(n => !n.read);
        } else if (filter === 'production') {
            userNotifications = userNotifications.filter(n => 
                n.type === 'production_approval' || n.type === 'production_deleted'
            );
        }
        
        // Okunmamış sayısı
        const unreadCount = userNotifications.filter(n => !n.read).length;
        document.getElementById('unreadCount').textContent = unreadCount > 0 ? unreadCount : '';
        
        // Liste HTML
        const listHTML = userNotifications.length > 0 ? userNotifications.map(notif => `
            <div class="notification-item ${notif.read ? '' : 'unread'}" 
                 onclick="markAsRead('${notif.id}')"
                 style="padding: 15px; border: 1px solid var(--gray-200); border-radius: 8px; margin-bottom: 10px; cursor: pointer; transition: all 0.2s; ${notif.read ? 'background: var(--gray-50);' : 'background: var(--white); border-left: 4px solid var(--primary);'}">
                <div style="display: flex; gap: 15px; align-items: start;">
                    <div class="notification-icon" style="width: 40px; height: 40px; background: ${getNotificationColor(notif.type)}; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white;">
                        <i class="fas ${getNotificationIcon(notif.type)}"></i>
                    </div>
                    <div style="flex: 1;">
                        <div style="display: flex; justify-content: space-between; align-items: start;">
                            <div>
                                <div style="font-weight: 600; color: var(--gray-900); margin-bottom: 5px;">
                                    ${notif.title}
                                    ${!notif.read ? '<span style="background: var(--danger); color: white; padding: 2px 6px; border-radius: 8px; font-size: 10px; margin-left: 8px;">YENİ</span>' : ''}
                                </div>
                                <div style="color: var(--gray-600); font-size: 14px; margin-bottom: 5px;">
                                    ${notif.message}
                                </div>
                                <div style="color: var(--gray-400); font-size: 12px;">
                                    <i class="fas fa-clock"></i> ${formatNotificationDate(notif.date)}
                                </div>
                            </div>
                            <button onclick="deleteNotification('${notif.id}'); event.stopPropagation();" 
                                    style="background: none; border: none; color: var(--gray-400); cursor: pointer; padding: 5px;">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `).join('') : '<div style="text-align: center; padding: 40px; color: var(--gray-500);"><i class="fas fa-bell-slash" style="font-size: 48px; margin-bottom: 10px;"></i><p>Henüz bildirim yok</p></div>';
        
        document.getElementById('notificationsList').innerHTML = listHTML;
        
        // Badge güncelle
        updateNotificationBadge();
    } catch (error) {
        console.error('Bildirimler yüklenemedi:', error);
        document.getElementById('notificationsList').innerHTML = '<p style="color: var(--danger);">Bildirimler yüklenirken hata oluştu.</p>';
    }
}

// Bildirimi okundu olarak işaretle
async function markAsRead(notificationId) {
    try {
        await window.firestoreService.updateNotification(notificationId, { read: true });
        await loadNotificationsList();
    } catch (error) {
        console.error('Bildirim güncellenemedi:', error);
    }
}

// Tüm bildirimleri okundu olarak işaretle
async function markAllAsRead() {
    try {
        const notifications = await window.firestoreService.getNotifications();
        const userNotifications = notifications.filter(n => 
            (n.to === 'all' || n.to === currentUser.id) && !n.read
        );
        
        for (const notif of userNotifications) {
            await window.firestoreService.updateNotification(notif.id, { read: true });
        }
        
        await loadNotificationsList();
        showNotification('Başarılı', 'Tüm bildirimler okundu olarak işaretlendi.', 'success');
    } catch (error) {
        console.error('Bildirimler güncellenemedi:', error);
    }
}

// Bildirimi sil
async function deleteNotification(notificationId) {
    if (confirm('Bu bildirimi silmek istediğinize emin misiniz?')) {
        try {
            await window.firestoreService.deleteNotification(notificationId);
            await loadNotificationsList();
            showNotification('Silindi', 'Bildirim başarıyla silindi.', 'success');
        } catch (error) {
            console.error('Bildirim silinemedi:', error);
        }
    }
}

// Bildirimleri filtrele
function filterNotifications(filter) {
    // Butonları güncelle
    document.querySelectorAll('.notification-filters button').forEach(btn => {
        btn.classList.remove('btn-primary');
        btn.classList.add('btn-outline');
    });
    event.target.classList.remove('btn-outline');
    event.target.classList.add('btn-primary');
    
    // Listeyi yeniden yükle
    loadNotificationsList(filter);
}

// Bildirim ikonunu belirle
function getNotificationIcon(type) {
    const icons = {
        'production_approval': 'fa-check-circle',
        'production_deleted': 'fa-trash',
        'stock_alert': 'fa-exclamation-triangle',
        'shipment': 'fa-truck',
        'general': 'fa-info-circle'
    };
    return icons[type] || 'fa-bell';
}

// Bildirim rengini belirle
function getNotificationColor(type) {
    const colors = {
        'production_approval': 'var(--success)',
        'production_deleted': 'var(--danger)',
        'stock_alert': 'var(--warning)',
        'shipment': 'var(--info)',
        'general': 'var(--primary)'
    };
    return colors[type] || 'var(--gray-500)';
}

// Bildirim tarihini formatla
function formatNotificationDate(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now - date;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    
    if (minutes < 1) return 'Az önce';
    if (minutes < 60) return `${minutes} dakika önce`;
    if (hours < 24) return `${hours} saat önce`;
    if (days < 7) return `${days} gün önce`;
    return date.toLocaleDateString('tr-TR');
}

// Tek iş emri yazdırma
function printProductionOrder(productionId) {
    const prod = firebaseData.production.find(p => p.id === productionId);
    if (!prod) return;
    
    const recipe = firebaseData.recipes.find(r => r.id === prod.recipeId);
    const product = firebaseData.products.find(p => p.id === prod.productId);
    
    // Hammadde listesi
    let rawMaterialsList = '';
    if (recipe && recipe.rawMaterials) {
        rawMaterialsList = recipe.rawMaterials.map(rmId => {
            const rm = firebaseData.stock.find(s => s.id === rmId);
            const needed = prod.quantity * (recipe.quantityPerUnit || 1);
            return rm ? `${rm.name} - ${needed} ${rm.unit}` : 'Bilinmeyen';
        }).join('<br>');
    }
    
    const printContent = `
        <!DOCTYPE html>
        <html>
        <head>
            <title>İş Emri - ${prod.orderNo}</title>
            <style>
                body { font-family: Arial, sans-serif; padding: 20px; }
                .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #333; padding-bottom: 20px; }
                .header h1 { margin: 0; color: #333; }
                .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin: 20px 0; }
                .info-item { padding: 10px; background: #f5f5f5; border-radius: 5px; }
                .info-label { font-weight: bold; color: #666; margin-bottom: 5px; }
                .info-value { font-size: 16px; color: #333; }
                .materials { margin-top: 30px; }
                .materials h3 { border-bottom: 1px solid #ddd; padding-bottom: 10px; }
                .materials-list { padding: 15px; background: #f9f9f9; border-radius: 5px; }
                .footer { margin-top: 40px; text-align: center; font-size: 12px; color: #666; }
                @media print {
                    body { margin: 0; }
                    .no-print { display: none !important; }
                }
            </style>
        </head>
        <body>
            <div class="header">
                <h1>İŞ EMRİ</h1>
                <p style="font-size: 18px; margin: 10px 0;">No: ${prod.orderNo}</p>
                <p style="color: #666;">Tarih: ${new Date().toLocaleDateString('tr-TR')}</p>
            </div>
            
            <div class="info-grid">
                <div class="info-item">
                    <div class="info-label">Ürün Adı:</div>
                    <div class="info-value">${product ? product.name : 'Bilinmeyen'}</div>
                </div>
                <div class="info-item">
                    <div class="info-label">Ürün Kodu:</div>
                    <div class="info-value">${product ? product.code : '-'}</div>
                </div>
                <div class="info-item">
                    <div class="info-label">Üretim Miktarı:</div>
                    <div class="info-value">${prod.quantity} Adet</div>
                </div>
                <div class="info-item">
                    <div class="info-label">Reçete:</div>
                    <div class="info-value">${recipe ? recipe.name : 'Tanımsız'}</div>
                </div>
                <div class="info-item">
                    <div class="info-label">Başlangıç Tarihi:</div>
                    <div class="info-value">${prod.startDate}</div>
                </div>
                <div class="info-item">
                    <div class="info-label">Durum:</div>
                    <div class="info-value">${prod.status}</div>
                </div>
            </div>
            
            <div class="materials">
                <h3>Kullanılacak Hammaddeler</h3>
                <div class="materials-list">
                    ${rawMaterialsList || 'Hammadde bilgisi bulunamadı'}
                </div>
            </div>
            
            <div class="footer">
                <p>Furkatech Technology FZA-ERP Sistemi - ${new Date().toLocaleString('tr-TR')}</p>
            </div>
        </body>
        </html>
    `;
    
    const printWindow = window.open('', '_blank');
    printWindow.document.write(printContent);
    printWindow.document.close();
    printWindow.print();
}

// Tüm listeyi yazdır
function printProductionList() {
    const tableContent = document.getElementById('productionListTable').innerHTML;
    const printContent = `
        <!DOCTYPE html>
        <html>
        <head>
            <title>Üretim Listesi</title>
            <style>
                body { font-family: Arial, sans-serif; }
                table { width: 100%; border-collapse: collapse; }
                th, td { padding: 8px; text-align: left; border: 1px solid #ddd; }
                th { background: #f5f5f5; }
                .no-print { display: none !important; }
                .badge { padding: 3px 8px; border-radius: 4px; font-size: 12px; }
                .badge.success { background: #d4edda; color: #155724; }
                .badge.warning { background: #fff3cd; color: #856404; }
            </style>
        </head>
        <body>
            <h2>Üretim Listesi - ${new Date().toLocaleDateString('tr-TR')}</h2>
            ${tableContent}
        </body>
        </html>
    `;
    
    const printWindow = window.open('', '_blank');
    printWindow.document.write(printContent);
    printWindow.document.close();
    printWindow.print();
}
function loadSevkiyatEdilen() {
    const content = `
        <div class="page-header">
            <h1 class="page-title"><i class="fas fa-truck-loading"></i> Sevk Edilen</h1>
            <p class="page-subtitle">Sevk edilen ürünlerin kaydı - Filtreleme yaparak görüntüleyin</p>
        </div>
        <div class="card">
            <div class="card-header">
                <h3 class="card-title">Sevk Edilen Ürünler</h3>
            </div>
            <div class="card-body">
                <div class="filter-bar" style=" background: linear-gradient(135deg, #00fefb ); padding: 25px; border-radius: 15px; margin-bottom: 25px;">
                    <div class="filter-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; align-items: end;">
                        
                        <div class="search-box" style="position: relative;">
                            <label style=color: #172d4c; font-size: 12px; font-weight: 600; margin-bottom: 8px; display: block;">
                             Arama
                            </label>
                            <input type="text" 
                                id="shipmentEdilenSearch" 
                                placeholder="Ürün veya İş Emri ara..." 
                                onkeyup="filterSevkiyatEdilen()"
                                style="width: 100%; padding: 12px 15px; border: none; border-radius: 10px; background: rgba(255,255,255,0.9); font-size: 14px; transition: all 0.3s; box-shadow: 0 2px 10px rgba(0,0,0,0.1);"
                                onfocus="this.style.transform='scale(1.02)'; this.style.background='white';"
                                onblur="this.style.transform='scale(1)'; this.style.background='rgba(255,255,255,0.9)';">
                        </div>
                        
                        <div class="date-filter-group">
                            <label style="color: #172d4c; font-size: 12px; font-weight: 600; margin-bottom: 8px; display: block;">
                                <i class="fas fa-calendar-alt"></i> Başlangıç Tarihi
                            </label>
                            <div style="position: relative;">
                                <input type="date" 
                                    id="shipmentEdilenDateFrom" 
                                    onchange="filterSevkiyatEdilen()"
                                    style="width: 100%; padding: 12px 15px; border: none; border-radius: 10px; background: rgba(255,255,255,0.9); font-size: 14px; cursor: pointer; transition: all 0.3s; box-shadow: 0 2px 10px rgba(0,0,0,0.1);"
                                    onfocus="this.style.background='white';"
                                    onblur="this.style.background='rgba(255,255,255,0.9)';">
                            </div>
                        </div>
                        
                        <div class="date-filter-group">
                            <label style="color: #172d4c;  font-size: 12px; font-weight: 600; margin-bottom: 8px; display: block;">
                                <i class="fas fa-calendar-check"></i> Bitiş Tarihi
                            </label>
                            <div style="position: relative;">
                                <input type="date" 
                                    id="shipmentEdilenDateTo" 
                                    onchange="filterSevkiyatEdilen()"
                                    style="width: 100%; padding: 12px 15px; border: none; border-radius: 10px; background: rgba(255,255,255,0.9); font-size: 14px; cursor: pointer; transition: all 0.3s; box-shadow: 0 2px 10px rgba(0,0,0,0.1);"
                                    onfocus="this.style.background='white';"
                                    onblur="this.style.background='rgba(255,255,255,0.9)';">
                            </div>
                        </div>
                        
                        <div style="display: flex; gap: 10px; align-items: end;">
                            <button class="btn" 
                                onclick="showAllShippedItems()"
                                style="background: white; color: #172d4c; padding: 12px 20px; border: none; border-radius: 10px; font-weight: 600; cursor: pointer; transition: all 0.3s; box-shadow: 0 2px 10px rgba(0,0,0,0.1);"
                                onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 5px 20px rgba(0,0,0,0.2)';"
                                onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 2px 10px rgba(0,0,0,0.1)';">
                                <i class="fas fa-list"></i> Tümünü Göster
                            </button>
                            
                            <button class="btn" 
                                onclick="clearSevkiyatEdilenFilter()"
                                style="background: '#172d4c'; color: white; padding: 12px 20px; border: 2px solid white; border-radius: 10px; font-weight: 600; cursor: pointer; transition: all 0.3s;"
                                onmouseover="this.style.background='white'; this.style.color='#172d4c';"
                                onmouseout="this.style.background='#172d4c'; this.style.color='white';">
                                <i class="fas fa-times"></i> Temizle
                            </button>
                        </div>
                    </div>
                    
                    <!-- Hızlı Filtreler -->
                    <div style="background='#172d4c';margin-top: 20px; display: flex; gap: 10px; flex-wrap: wrap;">
                        <button onclick="setQuickDateFilter('today')" 
                            style="padding: 8px 16px; background: '#172d4c'; color: white; border: '1px solid #172d4c';border-radius: 20px; font-size: 12px; cursor: pointer; transition: all 0.3s;"
                            onmouseover="this.style.background='white'; this.style.color='#172d4c';"
                            onmouseout="this.style.background='#172d4c'; this.style.color='white';">
                            Bugün
                        </button>
                        <button onclick="setQuickDateFilter('week')" 
                            style="padding: 8px 16px; background: '#172d4c'; color: white; border: '1px solid #172d4c'; border-radius: 20px; font-size: 12px; cursor: pointer; transition: all 0.3s;"
                            onmouseover="this.style.background='white'; this.style.color='#172d4c';"
                            onmouseout="this.style.background='#172d4c'; this.style.color='white';">
                            Bu Hafta
                        </button>
                        <button onclick="setQuickDateFilter('month')" 
                            style="padding: 8px 16px; background: '#172d4c'; color: white; border: '1px solid #172d4c'; border-radius: 20px; font-size: 12px; cursor: pointer; transition: all 0.3s;"
                            onmouseover="this.style.background='white'; this.style.color='#172d4c';"
                            onmouseout="this.style.background='#172d4c'; this.style.color='white';">
                            Bu Ay
                        </button>
                    </div>
                </div>
                
                <div class="table-container">
                    <div id="sevkiyatEdilenMessage" style="text-align: center; padding: 60px; background: linear-gradient(135deg, ); border-radius: 15px;">
                        <i class="fas fa-filter" style="font-size: 64px; margin-bottom: 20px; color: #172d4c;"></i>
                        <h3 style="color: #2d3748; margin-bottom: 10px;">Filtre Seçin</h3>
                        <p style="color: #718096;">Sevk edilen ürünleri görüntülemek için yukarıdaki filtrelerden birini kullanın veya "Tümünü Göster" butonuna tıklayın.</p>
                    </div>
                    <table class="table" id="sevkiyatEdilenTable" style="display: none;">
                        <thead>
                            <tr>
                                <th>İş Emri No</th>
                                <th>Ürün</th>
                                <th>Miktar</th>
                                <th>Sevk Tarihi</th>
                                <th>Durum</th>
                                <th>İşlemler</th>
                            </tr>
                        </thead>
                        <tbody id="sevkiyatEdilenTableBody">
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    `;
    document.getElementById('pageContent').innerHTML = content;
}

function setQuickDateFilter(period) {
    const today = new Date();
    const fromInput = document.getElementById('shipmentEdilenDateFrom');
    const toInput = document.getElementById('shipmentEdilenDateTo');
    
    if (!fromInput || !toInput) {
        console.error('Tarih inputları bulunamadı');
        return;
    }
    
    switch(period) {
        case 'today':
            fromInput.value = today.toISOString().split('T')[0];
            toInput.value = today.toISOString().split('T')[0];
            break;
        case 'week':
            const weekStart = new Date(today);
            weekStart.setDate(today.getDate() - today.getDay());
            fromInput.value = weekStart.toISOString().split('T')[0];
            toInput.value = today.toISOString().split('T')[0];
            break;
        case 'month':
            const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
            fromInput.value = monthStart.toISOString().split('T')[0];
            toInput.value = today.toISOString().split('T')[0];
            break;
    }
    
    filterSevkiyatEdilen();
}

function showAllShippedItems() {
    const message = document.getElementById('sevkiyatEdilenMessage');
    const table = document.getElementById('sevkiyatEdilenTable');
    
    if (message) message.style.display = 'none';
    if (table) table.style.display = 'table';
    
    const allShipped = firebaseData.production.filter(p => p.shipmentStatus === 'Sevk Edildi');
    
    const tbody = document.getElementById('sevkiyatEdilenTableBody');
    if (tbody) {
        tbody.innerHTML = allShipped.length > 0 ? allShipped.map(prod => `
            <tr>
                <td><strong>${prod.orderNo}</strong></td>
                <td>${prod.product}</td>
                <td>${prod.quantity} adet</td>
                <td>${prod.shipmentDate || '-'}</td>
                <td><span class="badge success">Sevk Edildi</span></td>
                <td>
                    <button class="btn btn-sm btn-danger" onclick="deleteShipment('${prod.id}')" title="Sevkiyatı Sil">
                        <i class="fas fa-trash"></i> Sil
                    </button>
                </td>
            </tr>
        `).join('') : '<tr><td colspan="6" style="text-align: center; color: var(--gray-500);">Sevk edilen ürün bulunmuyor</td></tr>';
    }
}
// Tümünü göster fonksiyonu
function showAllShipments() {
    const message = document.getElementById('sevkiyatEdilenMessage');
    const table = document.getElementById('sevkiyatEdilenTable');
    
    if (message) message.style.display = 'none';
    if (table) table.style.display = 'table';
    
    const allShipped = firebaseData.production.filter(p => p.shipmentStatus === 'Sevk Edildi');
    
    const tbody = document.getElementById('sevkiyatEdilenTableBody');
    if (tbody) {
        tbody.innerHTML = allShipped.map(prod => `
            <tr>
                <td><strong>${prod.orderNo}</strong></td>
                <td>${prod.product}</td>
                <td>${getCustomerName(prod.companyId)}</td>
                <td>${prod.quantity}</td>
                <td>${prod.shipmentDate || 'Belirtilmemiş'}</td>
                <td><span class="badge success">Sevk Edildi</span></td>
            </tr>
        `).join('') || '<tr><td colspan="6" class="text-gray-500">Sevk edilen ürün bulunmuyor</td></tr>';
    }
}

// Filtreleme fonksiyonu güncelleme
function filterSevkiyatEdilen() {
    const search = document.getElementById('shipmentEdilenSearch')?.value?.toLowerCase() || '';
    const dateFrom = document.getElementById('shipmentEdilenDateFrom')?.value || '';
    const dateTo = document.getElementById('shipmentEdilenDateTo')?.value || '';
    
    // Eğer hiç filtre yoksa mesajı göster
    if (!search && !dateFrom && !dateTo) {
        const message = document.getElementById('sevkiyatEdilenMessage');
        const table = document.getElementById('sevkiyatEdilenTable');
        
        if (message) message.style.display = 'block';
        if (table) table.style.display = 'none';
        return;
    }
    
    // Filtre varsa tabloyu göster
    const message = document.getElementById('sevkiyatEdilenMessage');
    const table = document.getElementById('sevkiyatEdilenTable');
    
    if (message) message.style.display = 'none';
    if (table) table.style.display = 'table';

    const filteredData = firebaseData.production.filter(p => p.shipmentStatus === 'Sevk Edildi')
        .filter(p => {
            if (search && !p.product.toLowerCase().includes(search) && !p.orderNo.toLowerCase().includes(search)) return false;
            if (dateFrom && new Date(p.shipmentDate) < new Date(dateFrom)) return false;
            if (dateTo && new Date(p.shipmentDate) > new Date(dateTo)) return false;
            return true;
        });

    const tbody = document.getElementById('sevkiyatEdilenTableBody');
    if (tbody) {
        tbody.innerHTML = filteredData.length > 0 ? filteredData.map(prod => `
            <tr>
                <td><strong>${prod.orderNo}</strong></td>
                <td>${prod.product}</td>
                <td>${prod.quantity} adet</td>
                <td>${prod.shipmentDate || '-'}</td>
                <td><span class="badge success">Sevk Edildi</span></td>
                <td>
                    <button class="btn btn-sm btn-danger" onclick="deleteShipment('${prod.id}')" title="Sevkiyatı Sil">
                        <i class="fas fa-trash"></i> Sil
                    </button>
                </td>
            </tr>
        `).join('') : '<tr><td colspan="6" style="text-align: center; color: var(--gray-500);">Filtrelemeye uygun kayıt bulunamadı</td></tr>';
    }
}

async function completeProduction(productionId) {
    const prod = firebaseData.production.find(p => p.id === productionId);
    if (!prod) {
        showNotification('Hata', 'Üretim bulunamadı.', 'error');
        return;
    }
    
    if (prod.status === 'Tamamlandı') {
        showNotification('Bilgi', 'Bu üretim zaten tamamlanmış.', 'info');
        return;
    }
    
    if (!confirm(`${prod.orderNo} numaralı üretimi tamamlamak istediğinize emin misiniz?\n\nBu işlem:\n• Üretimi tamamlanmış olarak işaretleyecek\n• Ürünü sevkiyat bekleyenlere ekleyecek\n• Ürün stoğunu artıracak`)) {
        return;
    }
    
    try {
        const updateData = {
            ...prod,
            progress: 100,
            status: 'Tamamlandı',
            completedDate: new Date().toLocaleDateString('tr-TR'),
            shipmentStatus: 'Sevk Bekliyor', // BU SATIRDA SORUN OLABİLİR
            shipmentReadyDate: new Date().toISOString(),
            currentDepartment: 'Tamamlandı'
        };
        
        // Ürün stoğunu artır
        const product = firebaseData.products.find(p => p.id === prod.productId);
        if (product) {
            await window.firestoreService.updateProduct(product.id, {
                ...product,
                stock: (product.stock || 0) + prod.quantity,
                lastUpdate: new Date().toLocaleDateString('tr-TR')
            });
        }
        
        // Üretimi güncelle
        await window.firestoreService.updateProduction(productionId, updateData);
        
        // Bildirimler
        await createNotification({
            type: 'production_completed',
            title: 'Üretim Tamamlandı',
            message: `${prod.orderNo} numaralı ${prod.quantity} adet ${prod.product} üretimi tamamlandı.`,
            from: currentUser.id,
            to: 'all',
            productionId: productionId,
            date: new Date().toISOString()
        });
        
        showNotification('Başarılı', 'Üretim tamamlandı ve sevk bekleyenlere eklendi.', 'success');
        closeModal('productionDetailModal');
        
        // Firebase'den güncel veriyi çek
        await loadFirebaseData();
        
        // Sayfaları güncelle
        if (currentPage === 'uretimListesi') loadUretimListesi();
        if (currentPage === 'uretimTakip') loadUretimTakip();
        if (currentPage === 'sevkiyatBekleyen') loadSevkiyatBekleyen();
        
    } catch (error) {
        console.error('Üretim tamamlama hatası:', error);
        showNotification('Hata', 'Üretim tamamlanırken hata oluştu.', 'error');
    }
}

function updatePriceFromProduct(select) {
    const tr = select.closest('tr');
    const priceInput = tr.querySelectorAll('input[type="number"]')[1];
    const selectedOption = select.selectedOptions[0];
    
    if (selectedOption && selectedOption.dataset.price) {
        priceInput.value = selectedOption.dataset.price;
    }
}

// Tüm veriyi ZIP olarak export et
async function exportAllData() {
    try {
        showNotification('İşleniyor', 'Veriler hazırlanıyor, lütfen bekleyin...', 'info');
        
        const zip = new JSZip();
        const date = new Date().toISOString().split('T')[0];
        const folderName = `erp_backup_${date}`;
        
        // Her veri tipini ayrı dosya olarak ekle
        const dataTypes = [
            { name: 'users', data: firebaseData.users },
            { name: 'products', data: firebaseData.products },
            { name: 'stock', data: firebaseData.stock },
            { name: 'companies', data: firebaseData.companies },
            { name: 'recipes', data: firebaseData.recipes },
            { name: 'production', data: firebaseData.production },
            { name: 'offers', data: firebaseData.offers },
            { name: 'shipments', data: firebaseData.shipments }
        ];
        
        // Metadata dosyası
        const metadata = {
            exportDate: new Date().toISOString(),
            exportedBy: currentUser.name,
            version: '1.0',
            stats: {
                users: firebaseData.users.length,
                products: firebaseData.products.length,
                stock: firebaseData.stock.length,
                companies: firebaseData.companies.length,
                recipes: firebaseData.recipes.length,
                production: firebaseData.production.length,
                offers: firebaseData.offers.length,
                shipments: firebaseData.shipments.length
            }
        };
        
        // Metadata'yı ekle
        zip.file(`${folderName}/metadata.json`, JSON.stringify(metadata, null, 2));
        
        // Her veri tipini ayrı dosya olarak ekle
        dataTypes.forEach(type => {
            const fileName = `${folderName}/${type.name}.json`;
            const fileContent = JSON.stringify(type.data, null, 2);
            zip.file(fileName, fileContent);
        });
        
        // ZIP dosyasını oluştur ve indir
        const content = await zip.generateAsync({ type: 'blob' });
        const url = URL.createObjectURL(content);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${folderName}.zip`;
        link.click();
        URL.revokeObjectURL(url);
        
        showNotification('Başarılı', `Tüm veriler ${folderName}.zip dosyasına aktarıldı.`, 'success');
        
    } catch (error) {
        console.error('Export hatası:', error);
        showNotification('Hata', 'Veri aktarımı sırasında hata oluştu.', 'error');
    }
}

// Yıllık veriyi ZIP olarak export et
async function exportYearData() {

    const year = document.getElementById('exportYear').value;
    
    try {
        showNotification('İşleniyor', `${year} yılı verileri hazırlanıyor...`, 'info');
        
        const zip = new JSZip();
        const date = new Date().toISOString().split('T')[0];
        const folderName = `erp_${year}_backup_${date}`;
        
        // Yıla göre filtrele
        const filteredProduction = firebaseData.production.filter(p => {
            const date = p.startDate || p.completedDate || '';
            return date.includes(year);
        });
        
        const filteredOffers = firebaseData.offers.filter(o => {
            const date = o.date || '';
            return date.includes(year);
        });
        
        const filteredShipments = firebaseData.shipments.filter(s => {
            const date = s.date || '';
            return date.includes(year);
        });
        
        // Metadata
        const metadata = {
            exportDate: new Date().toISOString(),
            exportedBy: currentUser.name,
            year: year,
            version: '1.0',
            stats: {
                production: filteredProduction.length,
                offers: filteredOffers.length,
                shipments: filteredShipments.length
            }
        };
        
        // Dosyaları ZIP'e ekle
        zip.file(`${folderName}/metadata.json`, JSON.stringify(metadata, null, 2));
        zip.file(`${folderName}/production_${year}.json`, JSON.stringify(filteredProduction, null, 2));
        zip.file(`${folderName}/offers_${year}.json`, JSON.stringify(filteredOffers, null, 2));
        zip.file(`${folderName}/shipments_${year}.json`, JSON.stringify(filteredShipments, null, 2));
        
        // Master data'ları da referans için ekle
        zip.file(`${folderName}/reference/products.json`, JSON.stringify(firebaseData.products, null, 2));
        zip.file(`${folderName}/reference/companies.json`, JSON.stringify(firebaseData.companies, null, 2));
        zip.file(`${folderName}/reference/recipes.json`, JSON.stringify(firebaseData.recipes, null, 2));
        
        // ZIP'i indir
        const content = await zip.generateAsync({ type: 'blob' });
        const url = URL.createObjectURL(content);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${folderName}.zip`;
        link.click();
        URL.revokeObjectURL(url);
        
        showNotification('Başarılı', `${year} yılı verileri ${folderName}.zip dosyasına aktarıldı.`, 'success');
        
    } catch (error) {
        console.error('Export hatası:', error);
        showNotification('Hata', 'Yıllık veri aktarımı sırasında hata oluştu.', 'error');
    }
}

// Seçili veri tiplerini export et
async function exportSelectedData() {
    const selectedTypes = [];
    document.querySelectorAll('input[name="dataType"]:checked').forEach(cb => {
        selectedTypes.push(cb.value);
    });
    
    if (selectedTypes.length === 0) {
        showNotification('Uyarı', 'Lütfen en az bir veri tipi seçin.', 'warning');
        return;
    }
    
    try {
        showNotification('İşleniyor', 'Seçili veriler hazırlanıyor...', 'info');
        
        const zip = new JSZip();
        const date = new Date().toISOString().split('T')[0];
        const folderName = `erp_selected_${date}`;
        
        // Metadata
        const metadata = {
            exportDate: new Date().toISOString(),
            exportedBy: currentUser.name,
            selectedTypes: selectedTypes,
            version: '1.0'
        };
        
        zip.file(`${folderName}/metadata.json`, JSON.stringify(metadata, null, 2));
        
        // Seçili veri tiplerini ekle
        selectedTypes.forEach(type => {
            if (firebaseData[type]) {
                zip.file(`${folderName}/${type}.json`, JSON.stringify(firebaseData[type], null, 2));
            }
        });
        
        // ZIP'i indir
        const content = await zip.generateAsync({ type: 'blob' });
        const url = URL.createObjectURL(content);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${folderName}.zip`;
        link.click();
        URL.revokeObjectURL(url);
        
        showNotification('Başarılı', `Seçili veriler ${folderName}.zip dosyasına aktarıldı.`, 'success');
        
    } catch (error) {
        console.error('Export hatası:', error);
        showNotification('Hata', 'Veri aktarımı sırasında hata oluştu.', 'error');
    }
}



// Eski verileri temizle
async function cleanOldData() {
    const year = document.getElementById('cleanYear').value;
    
    if (!year) {
        showNotification('Uyarı', 'Lütfen temizlenecek yılı seçin.', 'warning');
        return;
    }
    
    // Önce export al
    const confirmMsg = `DİKKAT! ${year} ve öncesine ait tüm veriler silinecek.\n\nDevam etmeden önce:\n1. Veriyi yedeklediniz mi?\n2. Bu işlem geri alınamaz!\n\nDevam etmek istiyor musunuz?`;
    
    if (!confirm(confirmMsg)) {
        return;
    }
    
    // İkinci onay
    if (!confirm('Son kez onaylayın: Veriler SİLİNECEK!')) {
        return;
    }
    
    try {
        showNotification('İşleniyor', 'Veriler temizleniyor, lütfen bekleyin...', 'info');
        
        // Production verilerini temizle
        let deletedCount = 0;
        for (const prod of firebaseData.production) {
            const date = prod.startDate || prod.completedDate || '';
            const prodYear = parseInt(date.split('.')[2] || date.split('-')[0]);
            
            if (prodYear <= parseInt(year)) {
                await window.firestoreService.deleteProduction(prod.id);
                deletedCount++;
            }
        }
        
        // Offers verilerini temizle
        for (const offer of firebaseData.offers) {
            const date = offer.date || '';
            const offerYear = parseInt(date.split('-')[0]);
            
            if (offerYear <= parseInt(year)) {
                await window.firestoreService.deleteOffer(offer.id);
                deletedCount++;
            }
        }
        
        // Shipments verilerini temizle
        for (const shipment of firebaseData.shipments) {
            const date = shipment.date || '';
            const shipYear = parseInt(date.split('.')[2] || date.split('-')[0]);
            
            if (shipYear <= parseInt(year)) {
                await window.firestoreService.deleteShipment(shipment.id);
                deletedCount++;
            }
        }
        
        // Veriyi yeniden yükle
        await loadFirebaseData();
        
        showNotification('Başarılı', `${deletedCount} kayıt başarıyla silindi.`, 'success');
        loadAdmin(); // Sayfayı yenile
        
    } catch (error) {
        console.error('Temizleme hatası:', error);
        showNotification('Hata', 'Veri temizleme sırasında hata oluştu.', 'error');
    }
}

// Veri içe aktar
async function importData(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = async function(e) {
        try {
            const importedData = JSON.parse(e.target.result);
            
            if (!confirm(`${importedData.exportDate} tarihli yedek yüklenecek. Devam?`)) {
                return;
            }
            
            // Veriyi Firebase'e yükle
            // Bu kısım ihtiyaca göre özelleştirilebilir
            showNotification('Başarılı', 'Veriler başarıyla içe aktarıldı.', 'success');
            
        } catch (error) {
            console.error('Import hatası:', error);
            showNotification('Hata', 'Dosya okunamadı.', 'error');
        }
    };
    reader.readAsText(file);
}


// ============================================
// İNSAN KAYNAKLARI MODÜLÜ
// ============================================

// Resmi tatiller listesi
const officialHolidays = {
    2025: [
        { date: '2025-01-01', name: 'Yılbaşı' },
        { date: '2025-04-23', name: '23 Nisan Ulusal Egemenlik ve Çocuk Bayramı' },
        { date: '2025-05-01', name: '1 Mayıs İşçi ve Emekçi Bayramı' },
        { date: '2025-05-19', name: '19 Mayıs Atatürk\'ü Anma, Gençlik ve Spor Bayramı' },
        { date: '2025-07-15', name: '15 Temmuz Demokrasi ve Milli Birlik Günü' },
        { date: '2025-08-30', name: '30 Ağustos Zafer Bayramı' },
        { date: '2025-10-29', name: '29 Ekim Cumhuriyet Bayramı' },
        { date: '2025-03-30', name: 'Ramazan Bayramı 1. Gün' },
        { date: '2025-03-31', name: 'Ramazan Bayramı 2. Gün' },
        { date: '2025-04-01', name: 'Ramazan Bayramı 3. Gün' },
        { date: '2025-06-06', name: 'Kurban Bayramı 1. Gün' },
        { date: '2025-06-07', name: 'Kurban Bayramı 2. Gün' },
        { date: '2025-06-08', name: 'Kurban Bayramı 3. Gün' },
        { date: '2025-06-09', name: 'Kurban Bayramı 4. Gün' }
    ]
};

// İzin türleri
const leaveTypes = {
    annual: { name: 'Yıllık İzin', icon: 'fa-calendar', color: '#10b981' },
    sick: { name: 'Hastalık İzni', icon: 'fa-medkit', color: '#ef4444' },
    marriage: { name: 'Evlilik İzni', icon: 'fa-heart', color: '#ec4899' },
    bereavement: { name: 'Vefat İzni', icon: 'fa-pray', color: '#6b7280' },
    maternity: { name: 'Doğum İzni', icon: 'fa-baby', color: '#8b5cf6' },
    unpaid: { name: 'Ücretsiz İzin', icon: 'fa-ban', color: '#f59e0b' },
    excuse: { name: 'Mazeret İzni', icon: 'fa-exclamation', color: '#3b82f6' }
};

// Geçici izin verileri (Firebase'e taşınacak)
let leaveRequests = [];

// İnsan Kaynakları Ana Sayfası
function loadInsanKaynaklari() {
    if (!currentUser) {
        showNotification('Hata', 'Giriş yapmanız gerekiyor.', 'error');
        return;
    }

    const isHR = currentUser.role === 'admin' || currentUser.permissions?.includes('hr');
    const content = `
        <div class="page-header">
            <h1 class="page-title"><i class="fas fa-users"></i> İnsan Kaynakları</h1>
            <p class="page-subtitle">İzin yönetimi ve personel işlemleri</p>
        </div>

        <!-- İstatistikler -->
        <div class="stats-grid">
            <div class="stat-card">
                <div class="stat-icon primary"><i class="fas fa-calendar-check"></i></div>
                <div class="stat-value">${currentUser.annualLeaveBalance || 14}</div>
                <div class="stat-label">Kalan Yıllık İzin</div>
            </div>
            <div class="stat-card">
                <div class="stat-icon success"><i class="fas fa-check-circle"></i></div>
                <div class="stat-value">${currentUser.usedLeave || 0}</div>
                <div class="stat-label">Kullanılan İzin</div>
            </div>
            <div class="stat-card">
                <div class="stat-icon warning"><i class="fas fa-clock"></i></div>
                <div class="stat-value">${getPendingLeaveCount()}</div>
                <div class="stat-label">Bekleyen Talep</div>
            </div>
            <div class="stat-card">
                <div class="stat-icon info"><i class="fas fa-umbrella-beach"></i></div>
                <div class="stat-value">${getUpcomingHolidaysCount()}</div>
                <div class="stat-label">Yaklaşan Tatil</div>
            </div>
        </div>

        <!-- Tabs -->
        <div class="tabs">
            <button class="tab active" onclick="switchHRTab(this, 'leaveRequest')">İzin Talebi</button>
            <button class="tab" onclick="switchHRTab(this, 'myLeaves')">İzinlerim</button>
            ${isHR ? '<button class="tab" onclick="switchHRTab(this, \'leaveApprovals\')">İzin Onayları</button>' : ''}
            ${isHR ? '<button class="tab" onclick="switchHRTab(this, \'employeeList\')">Personel Listesi</button>' : ''}
            <button class="tab" onclick="switchHRTab(this, 'holidays')">Resmi Tatiller</button>
            <button class="tab" onclick="switchHRTab(this, 'hrSettings')">Ayarlar</button>
        </div>

        <!-- Tab Contents -->
        <div id="leaveRequest" class="tab-content active">
            ${renderLeaveRequestForm()}
        </div>
        <div id="myLeaves" class="tab-content">
            ${renderMyLeaves()}
        </div>
        ${isHR ? `
        <div id="leaveApprovals" class="tab-content">
            ${renderLeaveApprovals()}
        </div>
        <div id="employeeList" class="tab-content">
            ${renderEmployeeList()}
        </div>
        ` : ''}
        <div id="holidays" class="tab-content">
            ${renderHolidays()}
        </div>
        <div id="hrSettings" class="tab-content">
            ${renderHRSettings()}
        </div>
    `;
    
    document.getElementById('pageContent').innerHTML = content;
}

// İzin Talebi Formu
function renderLeaveRequestForm() {
    return `
        <div class="card">
            <div class="card-header">
                <h3 class="card-title">Yeni İzin Talebi</h3>
            </div>
            <div class="card-body">
                <!-- İzin Türü Seçimi -->
                <div class="form-group">
                    <label class="form-label">İzin Türü</label>
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 10px;">
                        ${Object.entries(leaveTypes).map(([key, type]) => `
                            <div onclick="selectLeaveType('${key}')" data-type="${key}" class="leave-type-card"
                                 style="padding: 15px; border: 2px solid var(--gray-200); border-radius: 8px; cursor: pointer; text-align: center; transition: all 0.3s;">
                                 <i class="fas ${type.icon}" style="font-size: 24px; color: ${type.color}; margin-bottom: 8px; display: block;"></i>
                               <div style="font-size: 12px; color: inherit;">${type.name}</div>
                            </div>
                        `).join('')}
                    </div>
                </div>

                <!-- Tarih Seçimi -->
                <div class="form-grid">
                    <div class="form-group">
                        <label class="form-label">Başlangıç Tarihi</label>
                        <input type="date" id="leaveStartDate" class="form-control" min="${new Date().toISOString().split('T')[0]}" onchange="calculateLeaveDays()">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Bitiş Tarihi</label>
                        <input type="date" id="leaveEndDate" class="form-control" min="${new Date().toISOString().split('T')[0]}" onchange="calculateLeaveDays()">
                    </div>
                </div>

                <!-- Gün Sayısı -->
                <div class="form-group">
                    <label class="form-label">Toplam Gün</label>
                    <input type="text" id="totalLeaveDays" class="form-control" readonly value="0 gün">
                </div>

                <!-- Açıklama -->
                <div class="form-group">
                    <label class="form-label">Açıklama</label>
                    <textarea id="leaveDescription" class="form-control" rows="3" placeholder="İzin talebiniz ile ilgili açıklama yazabilirsiniz..."></textarea>
                </div>

                <!-- Vekil Seçimi -->
                <div class="form-group">
                    <label class="form-label">Vekil Personel</label>
                    <select id="leaveDeputy" class="form-control">
                        <option value="">Vekil seçiniz (opsiyonel)</option>
                        ${firebaseData.users.filter(u => u.id !== currentUser.id).map(user => 
                            `<option value="${user.id}">${user.name} - ${getRoleDisplayName(user.role)}</option>`
                        ).join('')}
                    </select>
                </div>

                <!-- E-posta Bildirimi -->
                <div class="form-group">
                    <label style="display: flex; align-items: center; gap: 8px;">
                        <input type="checkbox" id="emailNotification" checked>
                        E-posta bildirimi gönder
                    </label>
                </div>

                <!-- Butonlar -->
                <div style="display: flex; gap: 10px; justify-content: flex-end;">
                    <button class="btn btn-outline" onclick="clearLeaveForm()">
                        <i class="fas fa-times"></i> Temizle
                    </button>
                    <button class="btn btn-success" onclick="submitLeaveRequest()">
                        <i class="fas fa-paper-plane"></i> Talep Gönder
                    </button>
                </div>
            </div>
        </div>
    `;
}

// Diğer render fonksiyonları...
function renderMyLeaves() {
    const myLeaves = leaveRequests.filter(l => l.employeeId === currentUser.id);
    return `
        <div class="card">
            <div class="card-header">
                <h3 class="card-title">İzin Geçmişim</h3>
            </div>
            <div class="card-body">
                <div class="table-container">
                    <table class="table">
                        <thead>
                            <tr>
                                <th>Talep No</th>
                                <th>İzin Türü</th>
                                <th>Başlangıç</th>
                                <th>Bitiş</th>
                                <th>Gün</th>
                                <th>Durum</th>
                                <th>İşlemler</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${myLeaves.length > 0 ? myLeaves.map(leave => `
                                <tr>
                                    <td><strong>#${leave.id}</strong></td>
                                    <td>${leaveTypes[leave.type]?.name}</td>
                                    <td>${formatDate(leave.startDate)}</td>
                                    <td>${formatDate(leave.endDate)}</td>
                                    <td>${leave.totalDays}</td>
                                    <td>${getLeaveStatusBadge(leave.status)}</td>
                                    <td>
                                        ${leave.status === 'pending' ? 
                                            `<button class="btn btn-sm btn-danger" onclick="cancelLeaveRequest('${leave.id}')">
                                                <i class="fas fa-times"></i> İptal
                                            </button>` : '-'
                                        }
                                    </td>
                                </tr>
                            `).join('') : '<tr><td colspan="7" style="text-align: center;">Henüz izin talebiniz bulunmuyor.</td></tr>'}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    `;
}

function renderLeaveApprovals() {
    const pendingLeaves = leaveRequests.filter(l => l.status === 'pending');
    return `
        <div class="card">
            <div class="card-header">
                <h3 class="card-title">Bekleyen İzin Talepleri</h3>
            </div>
            <div class="card-body">
                <div class="table-container">
                    <table class="table">
                        <thead>
                            <tr>
                                <th>Personel</th>
                                <th>İzin Türü</th>
                                <th>Tarih Aralığı</th>
                                <th>Gün</th>
                                <th>Açıklama</th>
                                <th>İşlemler</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${pendingLeaves.length > 0 ? pendingLeaves.map(leave => `
                                <tr>
                                    <td><strong>${leave.employeeName}</strong></td>
                                    <td>${leaveTypes[leave.type]?.name}</td>
                                    <td>${formatDate(leave.startDate)} - ${formatDate(leave.endDate)}</td>
                                    <td>${leave.totalDays}</td>
                                    <td>${leave.description || '-'}</td>
                                    <td>
                                        <button class="btn btn-sm btn-success" onclick="approveLeave('${leave.id}')">
                                            <i class="fas fa-check"></i> Onayla
                                        </button>
                                        <button class="btn btn-sm btn-danger" onclick="rejectLeave('${leave.id}')">
                                            <i class="fas fa-times"></i> Reddet
                                        </button>
                                    </td>
                                </tr>
                            `).join('') : '<tr><td colspan="6" style="text-align: center;">Bekleyen izin talebi bulunmuyor.</td></tr>'}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    `;
}

function renderEmployeeList() {
    return `
        <div class="card">
            <div class="card-header">
                <h3 class="card-title">Personel İzin Durumları</h3>
            </div>
            <div class="card-body">
                <div class="table-container">
                    <table class="table">
                        <thead>
                            <tr>
                                <th>Personel</th>
                                <th>Departman</th>
                                <th>Toplam İzin</th>
                                <th>Kullanılan</th>
                                <th>Kalan</th>
                                <th>E-posta</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${firebaseData.users.map(user => `
                                <tr>
                                    <td><strong>${user.name}</strong></td>
                                    <td>${getRoleDisplayName(user.role)}</td>
                                    <td>${user.annualLeaveBalance || 14} gün</td>
                                    <td>${user.usedLeave || 0} gün</td>
                                    <td>${(user.annualLeaveBalance || 14) - (user.usedLeave || 0)} gün</td>
                                    <td>${user.email || '<span style="color: #999;">Belirtilmemiş</span>'}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    `;
}

function renderHolidays() {
    const year = new Date().getFullYear();
    return `
        <div class="card">
            <div class="card-header">
                <h3 class="card-title">${year} Yılı Resmi Tatiller</h3>
            </div>
            <div class="card-body">
                <div class="table-container">
                    <table class="table">
                        <thead>
                            <tr>
                                <th>Tarih</th>
                                <th>Gün</th>
                                <th>Tatil Adı</th>
                                <th>Kalan Gün</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${officialHolidays[year].map(holiday => {
                                const holidayDate = new Date(holiday.date);
                                const today = new Date();
                                const diffDays = Math.ceil((holidayDate - today) / (1000 * 60 * 60 * 24));
                                const dayName = holidayDate.toLocaleDateString('tr-TR', { weekday: 'long' });
                                
                                return `
                                    <tr style="${diffDays < 0 ? 'opacity: 0.5;' : ''}">
                                        <td>${formatDate(holiday.date)}</td>
                                        <td>${dayName}</td>
                                        <td><strong>${holiday.name}</strong></td>
                                        <td>${diffDays > 0 ? `${diffDays} gün` : diffDays === 0 ? 'Bugün' : 'Geçti'}</td>
                                    </tr>
                                `;
                            }).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    `;
}

function renderHRSettings() {
    return `
        <div class="card">
            <div class="card-header">
                <h3 class="card-title">E-posta Ayarları</h3>
            </div>
            <div class="card-body">
                <div class="form-group">
                    <label class="form-label">E-posta Adresim</label>
                    <input type="email" id="userEmail" class="form-control" value="${currentUser.email || ''}" placeholder="ornek@sirket.com">
                </div>
                
                <div class="form-group">
                    <label style="display: flex; align-items: center; gap: 8px;">
                        <input type="checkbox" id="receiveEmailNotifications" ${currentUser.receiveEmailNotifications ? 'checked' : ''}>
                        E-posta bildirimlerini almak istiyorum
                    </label>
                </div>

                <button class="btn btn-primary" onclick="saveHRSettings()">
                    <i class="fas fa-save"></i> Kaydet
                </button>
            </div>
        </div>
    `;
}

// Yardımcı Fonksiyonlar
function selectLeaveType(type) {
    // Tüm kartları temizle
    document.querySelectorAll('[data-type]').forEach(card => {
        card.style.background = 'white';
        card.style.borderColor = 'var(--gray-200)';
        card.style.color = 'inherit';
        card.classList.remove('selected'); // class ekle
    });
    
    // Seçili kartı işaretle
    const selected = document.querySelector(`[data-type="${type}"]`);
    if (selected) {
        selected.style.background = 'var(--primary)';
        selected.style.borderColor = 'var(--primary)';
        selected.style.color = 'white';
        selected.classList.add('selected'); // class ekle
    }
}

function calculateLeaveDays() {
    const startDate = document.getElementById('leaveStartDate').value;
    const endDate = document.getElementById('leaveEndDate').value;
    
    if (startDate && endDate) {
        const start = new Date(startDate);
        const end = new Date(endDate);
        let workDays = 0;
        
        for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
            const dayOfWeek = d.getDay();
            if (dayOfWeek !== 0 && dayOfWeek !== 6) workDays++;
        }
        
        document.getElementById('totalLeaveDays').value = `${workDays} iş günü`;
    }
}

function submitLeaveRequest() {
     const selectedType = document.querySelector('[data-type].selected')?.dataset.type;
    
    if (!selectedType) {
        showNotification('Hata', 'Lütfen izin türü seçin.', 'error');
        return;
    }

    const startDate = document.getElementById('leaveStartDate').value;
    const endDate = document.getElementById('leaveEndDate').value;
    
    if (!startDate || !endDate) {
        showNotification('Hata', 'Lütfen tarih aralığı seçin.', 'error');
        return;
    }

    const leaveRequest = {
        id: 'LR-' + Date.now(),
        employeeId: currentUser.id,
        employeeName: currentUser.name,
        type: selectedType,
        startDate: startDate,
        endDate: endDate,
        totalDays: document.getElementById('totalLeaveDays').value,
        description: document.getElementById('leaveDescription').value,
        deputy: document.getElementById('leaveDeputy').value,
        requestDate: new Date().toISOString(),
        status: 'pending'
    };

    leaveRequests.push(leaveRequest);
    
    // Bildirimi oluştur
    createNotification({
        type: 'leave_request',
        title: 'Yeni İzin Talebi',
        message: `${currentUser.name} yeni bir izin talebi oluşturdu.`,
        from: currentUser.id,
        to: 'all',
        date: new Date().toISOString()
    });
    
    showNotification('Başarılı', 'İzin talebiniz gönderildi.', 'success');
    clearLeaveForm();
    loadInsanKaynaklari();
}

function approveLeave(leaveId) {
    const leave = leaveRequests.find(l => l.id === leaveId);
    if (leave) {
        leave.status = 'approved';
        showNotification('Onaylandı', 'İzin talebi onaylandı.', 'success');
        loadInsanKaynaklari();
    }
}

function rejectLeave(leaveId) {
    // Red modalı oluştur
    const modalHTML = `
        <div id="rejectLeaveModal" class="modal show" style="z-index: 10001;">
            <div class="modal-content" style="max-width: 500px;">
                <div class="modal-header">
                    <h3 class="modal-title">İzin Red Formu</h3>
                    <button class="modal-close" onclick="closeModal('rejectLeaveModal')">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="modal-body">
                    <div class="form-group">
                        <label class="form-label">Red Sebebi <span style="color: red;">*</span></label>
                        <textarea id="rejectReason" class="form-control" rows="3" placeholder="Red sebebini detaylı açıklayın..." required></textarea>
                    </div>
                    
                    <div class="form-group">
                        <label class="form-label">Alternatif İzin Önerisi</label>
                        <div class="form-grid">
                            <div>
                                <label style="font-size: 12px;">Başlangıç</label>
                                <input type="date" id="altStartDate" class="form-control">
                            </div>
                            <div>
                                <label style="font-size: 12px;">Bitiş</label>
                                <input type="date" id="altEndDate" class="form-control">
                            </div>
                        </div>
                    </div>
                    
                    <div class="form-group">
                        <label class="form-label">Ek Not</label>
                        <textarea id="additionalNote" class="form-control" rows="2" placeholder="Personele iletmek istediğiniz ek notlar..."></textarea>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-danger" onclick="confirmRejectLeave('${leaveId}')">
                        <i class="fas fa-times"></i> Reddet
                    </button>
                    <button class="btn btn-outline" onclick="closeModal('rejectLeaveModal')">İptal</button>
                </div>
            </div>
        </div>
    `;
    
    // Modalı body'e ekle
    document.body.insertAdjacentHTML('beforeend', modalHTML);
}

function confirmRejectLeave(leaveId) {
    const reason = document.getElementById('rejectReason').value;
    const altStartDate = document.getElementById('altStartDate').value;
    const altEndDate = document.getElementById('altEndDate').value;
    const additionalNote = document.getElementById('additionalNote').value;
    
    if (!reason.trim()) {
        showNotification('Hata', 'Red sebebi yazmalısınız.', 'error');
        return;
    }
    
    const leave = leaveRequests.find(l => l.id === leaveId);
    if (leave) {
        leave.status = 'rejected';
        leave.rejectReason = reason;
        leave.alternativeDates = altStartDate && altEndDate ? {
            start: altStartDate,
            end: altEndDate
        } : null;
        leave.managerNote = additionalNote;
        leave.rejectedBy = currentUser.name;
        leave.rejectedDate = new Date().toISOString();
        
        // Bildirim oluştur
        const notificationMessage = `İzin talebiniz reddedildi. Sebep: ${reason}` +
            (leave.alternativeDates ? `\nAlternatif tarih önerisi: ${formatDate(altStartDate)} - ${formatDate(altEndDate)}` : '') +
            (additionalNote ? `\nYönetici notu: ${additionalNote}` : '');
        
        createNotification({
            type: 'leave_rejected',
            title: 'İzin Talebi Reddedildi',
            message: notificationMessage,
            from: currentUser.id,
            to: leave.employeeId,
            date: new Date().toISOString()
        });
        
        // E-posta gönder (simülasyon)
        sendRejectionEmail(leave, reason, leave.alternativeDates, additionalNote);
        
        showNotification('İzin Reddedildi', 'İzin talebi reddedildi ve personele bildirim gönderildi.', 'info');
        
        // Modalı kapat
        closeModal('rejectLeaveModal');
        
        // Sayfayı yenile
        loadInsanKaynaklari();
    }
}

function sendRejectionEmail(leave, reason, altDates, note) {
    const employee = firebaseData.users.find(u => u.id === leave.employeeId);
    if (!employee?.email) return;
    
    const emailContent = `
        Kime: ${employee.email}
        Konu: İzin Talebiniz Hakkında
        
        Sayın ${employee.name},
        
        ${formatDate(leave.requestDate)} tarihinde yapmış olduğunuz ${leaveTypes[leave.type]?.name} talebiniz değerlendirilmiştir.
        
        Red Sebebi: ${reason}
        
        ${altDates ? `
        Alternatif Tarih Önerisi:
        Başlangıç: ${formatDate(altDates.start)}
        Bitiş: ${formatDate(altDates.end)}
        ` : ''}
        
        ${note ? `Yönetici Notu: ${note}` : ''}
        
        Bu tarihler için yeni bir izin talebi oluşturabilir veya İnsan Kaynakları ile iletişime geçebilirsiniz.
        
        Saygılarımızla,
        ${currentUser.name}
        İnsan Kaynakları Departmanı
    `;
    
    console.log('Red e-postası gönderildi:', emailContent);
}

// Global fonksiyonlara ekle
window.confirmRejectLeave = confirmRejectLeave;

function cancelLeaveRequest(leaveId) {
    if (confirm('İzin talebini iptal etmek istediğinize emin misiniz?')) {
        leaveRequests = leaveRequests.filter(l => l.id !== leaveId);
        showNotification('İptal Edildi', 'İzin talebi iptal edildi.', 'warning');
        loadInsanKaynaklari();
    }
}

function clearLeaveForm() {
    document.getElementById('leaveStartDate').value = '';
    document.getElementById('leaveEndDate').value = '';
    document.getElementById('totalLeaveDays').value = '0 gün';
    document.getElementById('leaveDescription').value = '';
    document.getElementById('leaveDeputy').value = '';
    document.querySelectorAll('[data-type]').forEach(card => {
        card.style.background = 'white';
        card.style.borderColor = 'var(--gray-200)';
        card.style.color = 'inherit';
    });
}

function saveHRSettings() {
    const email = document.getElementById('userEmail').value;
    const receiveNotifications = document.getElementById('receiveEmailNotifications').checked;
    
    currentUser.email = email;
    currentUser.receiveEmailNotifications = receiveNotifications;
    
    if (window.firestoreService) {
        window.firestoreService.updateUser(currentUser.id, {
            email: email,
            receiveEmailNotifications: receiveNotifications
        });
    }
    
    showNotification('Başarılı', 'Ayarlarınız kaydedildi.', 'success');
}

function switchHRTab(button, tabId) {
    document.querySelectorAll('.tab').forEach(tab => tab.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
    button.classList.add('active');
    document.getElementById(tabId).classList.add('active');
}

function formatDate(dateStr) {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('tr-TR');
}

function getLeaveStatusBadge(status) {
    const badges = {
        pending: '<span class="badge warning">Beklemede</span>',
        approved: '<span class="badge success">Onaylandı</span>',
        rejected: '<span class="badge danger">Reddedildi</span>'
    };
    return badges[status] || status;
}

function getPendingLeaveCount() {
    return leaveRequests.filter(l => l.status === 'pending').length;
}

function getUpcomingHolidaysCount() {
    const today = new Date();
    const year = today.getFullYear();
    return officialHolidays[year].filter(h => {
        const holidayDate = new Date(h.date);
        return holidayDate > today && holidayDate < new Date(today.getTime() + 30*24*60*60*1000);
    }).length;
}



// ========================================
// GLOBAL EXPORTS - EN SONDA OLMALI
// ========================================

// Tüm fonksiyonları global alana aktar
window.loadInsanKaynaklari = loadInsanKaynaklari;
window.selectLeaveType = selectLeaveType;
window.calculateLeaveDays = calculateLeaveDays;
window.submitLeaveRequest = submitLeaveRequest;
window.approveLeave = approveLeave;
window.rejectLeave = rejectLeave;
window.cancelLeaveRequest = cancelLeaveRequest;
window.switchHRTab = switchHRTab;
window.clearLeaveForm = clearLeaveForm;
window.saveHRSettings = saveHRSettings;
window.exportAllData = exportAllData;
window.exportYearData = exportYearData;
window.exportSelectedData = exportSelectedData;
window.exportAllData = exportAllData;
window.exportYearData = exportYearData;
window.cleanOldData = cleanOldData;
window.importData = importData;
window.toggleUserProfile = toggleUserProfile;
window.logout = logout;
window.showPage = showPage;
window.toggleSubmenu = toggleSubmenu;
window.openModal = openModal;
window.closeModal = closeModal;
window.showProductDetails = showProductDetails;
window.editProduct = editProduct;
window.deleteProduct = deleteProduct;
window.saveProduct = saveProduct;
window.addProduct = addProduct;
window.showStockDetails = showStockDetails;
window.editStock = editStock;
window.saveStock = saveStock;
window.addStock = addStock;
window.addCompany = addCompany;
window.editCompany = editCompany;
window.deleteCompany = deleteCompany;
window.saveCompany = saveCompany;
window.editUser = editUser;
window.deleteUser = deleteUser;
window.saveUser = saveUser;
window.searchOfferProducts = searchOfferProducts;
window.addOfferProduct = addOfferProduct;
window.calculateOfferTotal = calculateOfferTotal;
window.saveOffer = saveOffer;
window.sendOffer = sendOffer;
window.viewOffer = viewOffer;
window.editOffer = editOffer;
window.deleteOffer = deleteOffer;
window.previewOffer = previewOffer;
window.printOffer = printOffer;
window.createJobOrder = createJobOrder;
window.startProduction = startProduction;
window.updateProgress = updateProgress;
window.shipProduct = shipProduct;
window.searchProducts = searchProducts;
window.filterByCategory = filterByCategory;
window.switchTab = switchTab;
window.changePassword = changePassword;
window.saveAdminSettings = saveAdminSettings;
window.showNotification = showNotification;
window.loadFirebaseData = loadFirebaseData
window.addRecipe = addRecipe;
window.saveRecipe = saveRecipe;
window.showRecipeDetails = showRecipeDetails;
window.editRecipe = editRecipe;
window.deleteRecipe = deleteRecipe;
window.loadRecipeDetails = loadRecipeDetails;
window.showProductionDetail = showProductionDetail;
window.saveProductionDetail = saveProductionDetail;
window.nextDepartment = nextDepartment;
window.loadSevkiyatBekleyen = loadSevkiyatBekleyen;
window.loadSevkiyatEdilen = loadSevkiyatEdilen;
window.filterSevkiyatBekleyen = filterSevkiyatBekleyen;
window.clearSevkiyatBekleyenFilter = clearSevkiyatBekleyenFilter;
window.filterSevkiyatEdilen = filterSevkiyatEdilen;
window.clearSevkiyatEdilenFilter = clearSevkiyatEdilenFilter;
window.getCustomerName = getCustomerName;
window.openCompanySelectionModal = openCompanySelectionModal;
window.filterCompanySuggestions = filterCompanySuggestions;
window.selectCompanyFromModal = selectCompanyFromModal;
window.openNotificationModal = openNotificationModal;
window.loadNotificationsList = loadNotificationsList;
window.markAsRead = markAsRead;
window.markAllAsRead = markAllAsRead;
window.deleteNotification = deleteNotification;
window.filterNotifications = filterNotifications;
window.updateNotificationBadge = updateNotificationBadge;
window.loadNotifications = loadNotifications;
window.loadKullaniciRaporlari = loadKullaniciRaporlari;
window.switchUserReport = switchUserReport;
window.deleteProduction = deleteProduction;
window.createNotification = createNotification;
window.updateProgressFromModal = updateProgressFromModal;
window.printProductionOrder = printProductionOrder;
window.printProductionList = printProductionList;
window.showAllShipments = showAllShipments;
window.deleteStock = deleteStock;
window.sendCriticalStockNotification = sendCriticalStockNotification;
window.deleteAllNotifications = deleteAllNotifications;
window.completeProduction = completeProduction;
window.deleteShipment = deleteShipment;
window.setQuickDateFilter = setQuickDateFilter;
window.showAllShippedItems = showAllShippedItems;
window.openRawMaterialModal = openRawMaterialModal;
window.toggleRawMaterial = toggleRawMaterial;
window.confirmRawMaterialSelection = confirmRawMaterialSelection;
window.removeRawMaterial = removeRawMaterial;
window.closeRawMaterialModal = closeRawMaterialModal;
window.filterRawMaterials = filterRawMaterials;
window.isRawMaterialSelected = isRawMaterialSelected;
window.updateSelectedRawMaterialsDisplay = updateSelectedRawMaterialsDisplay;
window.openRecipeRawMaterialModal = openRecipeRawMaterialModal;
window.toggleRecipeRawMaterial = toggleRecipeRawMaterial;
window.toggleAllRecipeRawMaterials = toggleAllRecipeRawMaterials;
window.confirmRecipeRawMaterialSelection = confirmRecipeRawMaterialSelection;
window.removeRecipeRawMaterial = removeRecipeRawMaterial;
window.closeRecipeRawMaterialModal = closeRecipeRawMaterialModal;
window.filterRecipeRawMaterials = filterRecipeRawMaterials;
window.isRecipeRawMaterialSelected = isRecipeRawMaterialSelected;
window.updateRecipeSelectedRawMaterialsDisplay = updateRecipeSelectedRawMaterialsDisplay;
window.updateRecipeSelectedCount = updateRecipeSelectedCount;
console.log('✅ Tüm fonksiyonlar global alana aktarıldı');