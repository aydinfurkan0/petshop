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
        console.log('Database veriler yükleniyor...');
        
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
        
      
        
        console.log('Database veriler yüklendi:', firebaseData);
        
        // Bildirim badge'ini güncelle (eğer giriş yapılmışsa)
        if (currentUser) {
            updateNotificationBadge();
        }
        
        return true;
    } catch (error) {
        console.error('Database veri hatası:', error);
        
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
// Yetki kontrolü - Manager sadece verilen yetkilere sahip
function hasPermission(permission) {
    if (!currentUser) return false;
    
    // Admin her şeye erişebilir
    if (currentUser.role === 'admin') return true;
    
    // Manager ve diğer roller sadece verilen yetkilere sahip
    return currentUser.permissions && currentUser.permissions.includes(permission);
}

// Sayfa erişim kontrolü - Manager admin sayfalarına erişemez
function canAccessPage(pageName) {
    if (!currentUser) return false;
    
    // Admin her sayfaya erişebilir
    if (currentUser.role === 'admin') return true;
    
    const pagePermissions = {
        // Satış sayfaları
        'teklifHazirla': ['sales'],
        'teklifListesi': ['sales'],
        'firmalar': ['sales'],
        
        // Ürün yönetimi sayfaları
        'urunAgaci': ['products'],
        'urunReceteleri': ['products'],
        
        // Üretim sayfaları
        'isEmriVer': ['production'],
        'uretimTakip': ['production'],
        'uretimListesi': ['production'],
        
        // Operasyon sayfaları
        'depo': ['warehouse'],
        'sevkiyatBekleyen': ['warehouse', 'logistics'],
        'sevkiyatEdilen': ['warehouse', 'logistics'],
        
        // Admin sayfaları - SADECE admin, manager erişemez
        'admin': ['admin'],
        'kullaniciAktiviteleri': ['admin'],
        'kullaniciRaporlari': ['admin'],
        
        // Herkesin erişebileceği sayfalar
        'dashboard': true,
        'profil': true,
        'ayarlar': true,
        'aktivite': true,
        'bildirimler': true,
        'raporlar': true,
        'insanKaynaklari': true
    };
    
    const requiredPermissions = pagePermissions[pageName];
    
    // Herkesin erişebileceği sayfalar
    if (requiredPermissions === true) return true;
    
    // Yetki kontrolü
    if (Array.isArray(requiredPermissions)) {
        return requiredPermissions.some(perm => hasPermission(perm));
    }
    
    return false;
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

function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.add('show');
    } else {
        console.error('Modal bulunamadı:', modalId);
    }
}

// Login işlemi - Manager rolü için özel yetkilendirme
document.getElementById('loginForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value;
    
    try {
        const user = await window.firestoreService.getUserByUsername(username);
        
        if (user && user.password === password && user.active) {
            currentUser = user;
            
            document.getElementById('userName').textContent = user.name;
            document.getElementById('avatarText').textContent = user.name.charAt(0).toUpperCase();
            
            // Varsayılan yetkiler
            if (!user.permissions || user.permissions.length === 0) {
                const defaultPermissions = {
                    'admin': ['admin', 'sales', 'production', 'warehouse', 'logistics', 'reports', 'hr', 'products'],
                    'manager': [], // Manager'ın varsayılan yetkisi yok, admin panel'den verilecek
                    'production': ['production'],
                    'sales': ['sales'],
                    'warehouse': ['warehouse'],
                    'logistics': ['logistics'],
                    'quality': ['production']
                };
                
                user.permissions = defaultPermissions[user.role] || [];
                currentUser.permissions = user.permissions;
                
                await window.firestoreService.updateUser(user.id, {
                    permissions: user.permissions
                });
            }
            
            document.getElementById('loginContainer').style.display = 'none';
            document.getElementById('appContainer').style.display = 'block';
            
            await loadFirebaseData();
            updateSidebarPermissions();
            showPage('dashboard');
            
            const roleText = getRoleDisplayName(user.role);
            showNotification('Giriş başarılı', `Hoş geldiniz ${user.name}! (${roleText})`, 'success');
            
            document.getElementById('password').value = '';
        } else {
            showNotification('Giriş hatası', 'Kullanıcı adı veya şifre hatalı.', 'error');
            document.getElementById('password').value = '';
        }
    } catch (error) {
        console.error('Login error:', error);
        showNotification('Bağlantı Hatası', 'Database bağlantısında sorun var.', 'error');
    }
});
// Show product details - Firebase - Hammaddeler dahil
function showProductDetails(productId) {
    const product = firebaseData.products.find(p => p.id === productId);
    if (!product) {
        showNotification('Hata', 'Ürün bulunamadı.', 'error');
        return;
    }
    
    // Modal yoksa oluştur
    let modal = document.getElementById('productModal');
    if (!modal) {
        const modalHTML = `
            <div id="productModal" class="modal">
                <div class="modal-content">
                    <div class="modal-header">
                        <h3 class="modal-title">Ürün Detayları</h3>
                        <button class="modal-close" onclick="closeModal('productModal')">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    <div class="modal-body" id="productModalBody"></div>
                    <div class="modal-footer">
                        <button class="btn btn-outline" onclick="closeModal('productModal')">Kapat</button>
                    </div>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', modalHTML);
    }
    
    const recipe = firebaseData.recipes.find(r => r.productId === productId);
    
    document.getElementById('productModalBody').innerHTML = `
        <div class="form-grid">
            <div class="form-group">
                <label class="form-label">Ürün Kodu</label>
                <input type="text" class="form-control" value="${product.code}" readonly>
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
                <label class="form-label">Fiyat</label>
                <input type="text" class="form-control" value="${product.price} $" readonly>
            </div>
            <div class="form-group">
                <label class="form-label">Stok</label>
                <input type="text" class="form-control" value="${product.stock} adet" readonly>
            </div>
            ${recipe ? `
            <div class="form-group">
                <label class="form-label">Reçete</label>
                <input type="text" class="form-control" value="${recipe.name}" readonly>
            </div>
            ` : ''}
        </div>
    `;
    
    openModal('productModal');
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

function editProduct(productId) {
    const product = firebaseData.products.find(p => p.id === productId);
    if (!product) {
        showNotification('Hata', 'Ürün bulunamadı.', 'error');
        return;
    }
    
    // Modal varsa kaldır
    let existingModal = document.getElementById('productModal');
    if (existingModal) {
        existingModal.remove();
    }
    
    // Yeni modal oluştur
    const modalHTML = `
        <div id="productModal" class="modal show">
            <div class="modal-content">
                <div class="modal-header">
                    <h3 class="modal-title">Ürün Düzenle</h3>
                    <button class="modal-close" onclick="closeModal('productModal')">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="modal-body">
                    <form id="productForm">
                        <div class="form-grid">
                            <div class="form-group">
                                <label class="form-label">Ürün Kodu</label>
                                <input type="text" class="form-control" id="productFormCode" value="${product.code}" required>
                            </div>
                            <div class="form-group">
                                <label class="form-label">Barkod</label>
                                <input type="text" class="form-control" id="productFormBarcode" value="${product.barcode || ''}" placeholder="Barkod numarası">
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
                        </div>
                        <div class="form-group">
                            <label class="form-label">Açıklama</label>
                            <textarea class="form-control" id="productFormDescription" rows="3">${product.description || ''}</textarea>
                        </div>
                    </form>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-success" onclick="saveProduct('${productId}')">
                        <i class="fas fa-save"></i> Güncelle
                    </button>
                    <button class="btn btn-outline" onclick="closeModal('productModal')">İptal</button>
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHTML);
}
async function saveProduct(productId = null) {
    const code = document.getElementById('productFormCode').value;
    const barcode = document.getElementById('productFormBarcode').value;
    const name = document.getElementById('productFormName').value;
    const category = document.getElementById('productFormCategory').value;
    const price = parseFloat(document.getElementById('productFormPrice').value);
    const stock = parseInt(document.getElementById('productFormStock').value);
    const description = document.getElementById('productFormDescription').value;
    const imageFile = document.getElementById('productFormImage')?.files[0];

    let image = '';
    if (imageFile) {
        const reader = new FileReader();
        reader.onload = async function(e) {
            image = e.target.result;
            await saveProductData();
        };
        reader.readAsDataURL(imageFile);
    } else {
        await saveProductData();
    }

    async function saveProductData() {
        const productData = {
            code: code,
            barcode: barcode,
            name: name,
            category: category,
            price: price,
            stock: stock,
            description: description,
            active: true,
            updatedAt: new Date().toISOString()
        };

        if (image) {
            productData.image = image;
        }

        if (!productId) {
            productData.createdAt = new Date().toISOString();
        }

        try {
            if (productId) {
                await window.firestoreService.updateProduct(productId, productData);
                showNotification('Ürün Güncellendi', 'Ürün başarıyla güncellendi.', 'success');
            } else {
                await window.firestoreService.addProduct(productData);
                showNotification('Ürün Eklendi', 'Yeni ürün başarıyla eklendi.', 'success');
            }
            
            closeModal('productModal');
            await loadFirebaseData();
            if (currentPage === 'urunAgaci') loadUrunAgaci();
        } catch (error) {
            console.error('Ürün kaydetme hatası:', error);
            showNotification('Hata', 'Ürün kaydedilirken hata oluştu.', 'error');
        }
    }
}
async function saveUser(userId = null) {
    const name = document.getElementById('userFormName').value;
    const username = document.getElementById('userFormUsername').value;
    const password = document.getElementById('userFormPassword').value;
    const role = document.getElementById('userFormRole').value;
    
    const permissions = [];
    if (document.getElementById('perm_sales')?.checked) permissions.push('sales');
    if (document.getElementById('perm_production')?.checked) permissions.push('production');
    if (document.getElementById('perm_warehouse')?.checked) permissions.push('warehouse');
    if (document.getElementById('perm_reports')?.checked) permissions.push('reports');
    if (document.getElementById('perm_products')?.checked) permissions.push('products');
    if (document.getElementById('perm_hr')?.checked) permissions.push('hr');
    if (document.getElementById('perm_admin')?.checked) permissions.push('admin');
    
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
        
        // Sadece admin sayfasındaysa yenile
        if (currentPage === 'admin') {
            loadAdmin();
        }
    } catch (error) {
        console.error('Kullanıcı kaydetme hatası:', error);
        showNotification('Hata', 'Kullanıcı kaydedilirken hata oluştu.', 'error');
    }
}
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
            
            // Sadece admin sayfasındaysa yenile
            if (currentPage === 'admin') {
                loadAdmin();
            }
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
// Rol görüntüleme adları - Manager ve Admin ayrı
function getRoleDisplayName(role) {
    const roleNames = {
        'admin': 'Admin',
        'manager': 'Yönetici',
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

function showPage(pageName) {
    if (!canAccessPage(pageName)) {
        showNotification('Erişim Reddedildi', 'Bu sayfaya erişim yetkiniz bulunmamaktadır.', 'error');
        if (currentPage !== 'dashboard') {
            showPage('dashboard');
        }
        return;
    }
    
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
   if (!currentUser || (currentUser.role !== 'admin' && !hasPermission('admin'))) {
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
                    <button class="btn btn-primary" onclick="openCompanyModal()">
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
                                    <td>
                                        <strong>${company.name}</strong> 
                                        ${company.isFavorite ? '<i class="fas fa-star" style="color: gold; margin-left: 5px;"></i>' : ''}
                                    </td>
                                    <td>${company.taxNo}</td>
                                    <td>${company.phone || '-'}</td>
                                    <td>${company.email || '-'}</td>
                                    <td>${company.address || '-'}</td>
                                    <td>
                                        <span class="badge ${company.customerType === 'vip' ? 'warning' : company.customerType === 'potansiyel' ? 'info' : 'success'}">
                                            ${company.customerType || 'normal'}
                                        </span>
                                    </td>
                                    <td>
                                        <div class="action-buttons">
                                            <button class="action-btn view" onclick="showCompanyDetails('${company.id}')">
                                                <i class="fas fa-eye"></i>
                                            </button>
                                            <button class="action-btn edit" onclick="openCompanyModal('${company.id}')">
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
                                    <td>${product.price} $</td>
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
                        Ara Toplam: <span id="offerSubtotal">0 $</span>
                    </div>
                    <div style="font-size: 16px; color: var(--gray-500); margin-bottom: 8px;">
                        KDV (%20): <span id="offerTax">0 $</span>
                    </div>
                    <div style="font-size: 24px; font-weight: 700; color: var(--primary);">
                        Genel Toplam: <span id="offerTotal">0 $</span>
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
    if (isMobileDevice()) {
        const previewBtn = document.querySelector('[onclick="previewOffer()"]');
        if (previewBtn) {
            previewBtn.style.display = 'block';
            previewBtn.style.width = '100%';
        }
    }

}

function openCompanyModal(companyId = null) {
    const company = companyId ? firebaseData.companies.find(c => c.id === companyId) : null;
    
    // Önce eski modalı temizle
    const existingModal = document.getElementById('companyModal');
    if (existingModal) {
        existingModal.remove();
    }
    
    const modalHTML = `
        <div id="companyModal" class="modal show">
            <div class="modal-content" style="max-width: 800px;">
                <div class="modal-header">
                    <h3 class="modal-title">${company ? 'Firma Düzenle' : 'Yeni Firma Ekle'}</h3>
                    <button class="modal-close" onclick="closeModal('companyModal')">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="modal-body">
                    <form id="companyForm">
                        <div class="tabs">
                            <button type="button" class="tab active" onclick="switchCompanyTab(this, 'generalInfo')">
                                Genel Bilgiler
                            </button>
                            <button type="button" class="tab" onclick="switchCompanyTab(this, 'contactInfo')">
                                İletişim Bilgileri
                            </button>
                            <button type="button" class="tab" onclick="switchCompanyTab(this, 'financialInfo')">
                                Mali Bilgiler
                            </button>
                            <button type="button" class="tab" onclick="switchCompanyTab(this, 'additionalInfo')">
                                Ek Bilgiler
                            </button>
                        </div>
                        
                        <div id="generalInfo" class="tab-content active" style="margin-top: 20px;">
                            <div class="form-grid">
                                <div class="form-group">
                                    <label class="form-label">Firma Adı <span style="color: red;">*</span></label>
                                    <input type="text" class="form-control" id="companyFormName" value="${company ? company.name : ''}" required>
                                </div>
                                <div class="form-group">
                                    <label class="form-label">Firma Kısa Adı</label>
                                    <input type="text" class="form-control" id="companyFormShortName" value="${company ? (company.shortName || '') : ''}">
                                </div>
                                <div class="form-group">
                                    <label class="form-label">Firma Tipi</label>
                                    <select class="form-control" id="companyFormBusinessType">
                                        <option value="ltd" ${company && company.businessType === 'ltd' ? 'selected' : ''}>Limited Şirketi</option>
                                        <option value="as" ${company && company.businessType === 'as' ? 'selected' : ''}>Anonim Şirketi</option>
                                        <option value="sahis" ${company && company.businessType === 'sahis' ? 'selected' : ''}>Şahıs Şirketi</option>
                                        <option value="kamu" ${company && company.businessType === 'kamu' ? 'selected' : ''}>Kamu Kurumu</option>
                                        <option value="diger" ${company && company.businessType === 'diger' ? 'selected' : ''}>Diğer</option>
                                    </select>
                                </div>
                                <div class="form-group">
                                    <label class="form-label">Müşteri Tipi</label>
                                    <select class="form-control" id="companyFormType">
                                        <option value="normal" ${company && company.customerType === 'normal' ? 'selected' : ''}>Normal Müşteri</option>
                                        <option value="vip" ${company && company.customerType === 'vip' ? 'selected' : ''}>VIP Müşteri</option>
                                        <option value="potansiyel" ${company && company.customerType === 'potansiyel' ? 'selected' : ''}>Potansiyel Müşteri</option>
                                        <option value="tedarikci" ${company && company.customerType === 'tedarikci' ? 'selected' : ''}>Tedarikçi</option>
                                        <option value="bayi" ${company && company.customerType === 'bayi' ? 'selected' : ''}>Bayi</option>
                                    </select>
                                </div>
                                <div class="form-group">
                                    <label class="form-label">Sektör</label>
                                    <select class="form-control" id="companyFormSector">
                                        <option value="">Seçiniz</option>
                                        <option value="imalat" ${company && company.sector === 'imalat' ? 'selected' : ''}>İmalat</option>
                                        <option value="hizmet" ${company && company.sector === 'hizmet' ? 'selected' : ''}>Hizmet</option>
                                        <option value="ticaret" ${company && company.sector === 'ticaret' ? 'selected' : ''}>Ticaret</option>
                                        <option value="insaat" ${company && company.sector === 'insaat' ? 'selected' : ''}>İnşaat</option>
                                        <option value="teknoloji" ${company && company.sector === 'teknoloji' ? 'selected' : ''}>Teknoloji</option>
                                        <option value="saglik" ${company && company.sector === 'saglik' ? 'selected' : ''}>Sağlık</option>
                                        <option value="egitim" ${company && company.sector === 'egitim' ? 'selected' : ''}>Eğitim</option>
                                        <option value="diger" ${company && company.sector === 'diger' ? 'selected' : ''}>Diğer</option>
                                    </select>
                                </div>
                                <div class="form-group">
                                    <label class="form-label">Çalışan Sayısı</label>
                                    <select class="form-control" id="companyFormEmployeeCount">
                                        <option value="">Seçiniz</option>
                                        <option value="1-10" ${company && company.employeeCount === '1-10' ? 'selected' : ''}>1-10</option>
                                        <option value="11-50" ${company && company.employeeCount === '11-50' ? 'selected' : ''}>11-50</option>
                                        <option value="51-100" ${company && company.employeeCount === '51-100' ? 'selected' : ''}>51-100</option>
                                        <option value="101-500" ${company && company.employeeCount === '101-500' ? 'selected' : ''}>101-500</option>
                                        <option value="500+" ${company && company.employeeCount === '500+' ? 'selected' : ''}>500+</option>
                                    </select>
                                </div>
                            </div>
                        </div>
                        
                        <div id="contactInfo" class="tab-content" style="display: none; margin-top: 20px;">
                            <div class="form-grid">
                                <div class="form-group">
                                    <label class="form-label">Telefon 1</label>
                                    <input type="tel" class="form-control" id="companyFormPhone" value="${company ? (company.phone || '') : ''}" placeholder="+90 XXX XXX XX XX">
                                </div>
                                <div class="form-group">
                                    <label class="form-label">Telefon 2</label>
                                    <input type="tel" class="form-control" id="companyFormPhone2" value="${company ? (company.phone2 || '') : ''}" placeholder="+90 XXX XXX XX XX">
                                </div>
                                <div class="form-group">
                                    <label class="form-label">Faks</label>
                                    <input type="tel" class="form-control" id="companyFormFax" value="${company ? (company.fax || '') : ''}">
                                </div>
                                <div class="form-group">
                                    <label class="form-label">E-posta</label>
                                    <input type="email" class="form-control" id="companyFormEmail" value="${company ? (company.email || '') : ''}" placeholder="info@firma.com">
                                </div>
                                <div class="form-group">
                                    <label class="form-label">Web Sitesi</label>
                                    <input type="url" class="form-control" id="companyFormWebsite" value="${company ? (company.website || '') : ''}" placeholder="https://www.firma.com">
                                </div>
                                <div class="form-group">
                                    <label class="form-label">Yetkili Kişi</label>
                                    <input type="text" class="form-control" id="companyFormContactPerson" value="${company ? (company.contactPerson || '') : ''}">
                                </div>
                                <div class="form-group">
                                    <label class="form-label">Yetkili Telefon</label>
                                    <input type="tel" class="form-control" id="companyFormContactPhone" value="${company ? (company.contactPhone || '') : ''}">
                                </div>
                                <div class="form-group">
                                    <label class="form-label">Yetkili E-posta</label>
                                    <input type="email" class="form-control" id="companyFormContactEmail" value="${company ? (company.contactEmail || '') : ''}">
                                </div>
                            </div>
                            <div class="form-group">
                                <label class="form-label">Adres</label>
                                <textarea class="form-control" id="companyFormAddress" rows="3">${company ? (company.address || '') : ''}</textarea>
                            </div>
                            <div class="form-grid">
                                <div class="form-group">
                                    <label class="form-label">İl</label>
                                    <input type="text" class="form-control" id="companyFormCity" value="${company ? (company.city || '') : ''}">
                                </div>
                                <div class="form-group">
                                    <label class="form-label">İlçe</label>
                                    <input type="text" class="form-control" id="companyFormDistrict" value="${company ? (company.district || '') : ''}">
                                </div>
                                <div class="form-group">
                                    <label class="form-label">Posta Kodu</label>
                                    <input type="text" class="form-control" id="companyFormPostalCode" value="${company ? (company.postalCode || '') : ''}">
                                </div>
                                <div class="form-group">
                                    <label class="form-label">Ülke</label>
                                    <input type="text" class="form-control" id="companyFormCountry" value="${company ? (company.country || 'Türkiye') : 'Türkiye'}">
                                </div>
                            </div>
                        </div>
                        
                        <div id="financialInfo" class="tab-content" style="display: none; margin-top: 20px;">
                            <div class="form-grid">
                                <div class="form-group">
                                    <label class="form-label">Vergi No <span style="color: red;">*</span></label>
                                    <input type="text" class="form-control" id="companyFormTaxNo" value="${company ? company.taxNo : ''}" required>
                                </div>
                                <div class="form-group">
                                    <label class="form-label">Vergi Dairesi</label>
                                    <input type="text" class="form-control" id="companyFormTaxOffice" value="${company ? (company.taxOffice || '') : ''}">
                                </div>
                                <div class="form-group">
                                    <label class="form-label">Ticaret Sicil No</label>
                                    <input type="text" class="form-control" id="companyFormTradeRegNo" value="${company ? (company.tradeRegNo || '') : ''}">
                                </div>
                                <div class="form-group">
                                    <label class="form-label">Mersis No</label>
                                    <input type="text" class="form-control" id="companyFormMersisNo" value="${company ? (company.mersisNo || '') : ''}">
                                </div>
                                <div class="form-group">
                                    <label class="form-label">Banka Adı</label>
                                    <input type="text" class="form-control" id="companyFormBankName" value="${company ? (company.bankName || '') : ''}">
                                </div>
                                <div class="form-group">
                                    <label class="form-label">Şube</label>
                                    <input type="text" class="form-control" id="companyFormBankBranch" value="${company ? (company.bankBranch || '') : ''}">
                                </div>
                                <div class="form-group">
                                    <label class="form-label">IBAN</label>
                                    <input type="text" class="form-control" id="companyFormIban" value="${company ? (company.iban || '') : ''}" placeholder="TR00 0000 0000 0000 0000 0000 00">
                                </div>
                                <div class="form-group">
                                    <label class="form-label">Hesap No</label>
                                    <input type="text" class="form-control" id="companyFormAccountNo" value="${company ? (company.accountNo || '') : ''}">
                                </div>
                                <div class="form-group">
                                    <label class="form-label">Kredi Limiti</label>
                                    <input type="number" class="form-control" id="companyFormCreditLimit" value="${company ? (company.creditLimit || '') : ''}" placeholder="0.00">
                                </div>
                                <div class="form-group">
                                    <label class="form-label">Ödeme Vadesi (Gün)</label>
                                    <input type="number" class="form-control" id="companyFormPaymentTerm" value="${company ? (company.paymentTerm || '30') : '30'}">
                                </div>
                            </div>
                        </div>
                        
                        <div id="additionalInfo" class="tab-content" style="display: none; margin-top: 20px;">
                            <div class="form-group">
                                <label class="form-label">Notlar</label>
                                <textarea class="form-control" id="companyFormNotes" rows="4">${company ? (company.notes || '') : ''}</textarea>
                            </div>
                            <div class="form-grid">
                                <div class="form-group">
                                    <label style="display: flex; align-items: center; gap: 8px;">
                                        <input type="checkbox" id="companyFormEmailAccept" ${company && company.acceptsEmailNotifications ? 'checked' : ''}>
                                        E-posta Bildirimleri Kabul Ediyor
                                    </label>
                                </div>
                                <div class="form-group">
                                    <label style="display: flex; align-items: center; gap: 8px;">
                                        <input type="checkbox" id="companyFormSmsAccept" ${company && company.acceptsSmsNotifications ? 'checked' : ''}>
                                        SMS Bildirimleri Kabul Ediyor
                                    </label>
                                </div>
                                <div class="form-group">
                                    <label style="display: flex; align-items: center; gap: 8px;">
                                        <input type="checkbox" id="companyFormFavorite" ${company && company.isFavorite ? 'checked' : ''}>
                                        Sık Kullanılanlara Ekle
                                    </label>
                                </div>
                                <div class="form-group">
                                    <label style="display: flex; align-items: center; gap: 8px;">
                                        <input type="checkbox" id="companyFormActive" ${company ? (company.active !== false ? 'checked' : '') : 'checked'}>
                                        Aktif Firma
                                    </label>
                                </div>
                            </div>
                            <div class="form-group">
                                <label class="form-label">Logo Yükle</label>
                                <input type="file" class="form-control" id="companyFormLogo" accept="image/*">
                                ${company && company.logo ? `<img src="${company.logo}" style="max-width: 200px; margin-top: 10px;">` : ''}
                            </div>
                        </div>
                    </form>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-success" onclick="saveCompany('${companyId || ''}')">
                        <i class="fas fa-save"></i> Kaydet
                    </button>
                    <button type="button" class="btn btn-outline" onclick="closeModal('companyModal')">İptal</button>
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHTML);
}

function switchCompanyTab(button, tabId) {
    document.querySelectorAll('#companyModal .tab').forEach(tab => tab.classList.remove('active'));
    document.querySelectorAll('#companyModal .tab-content').forEach(content => content.style.display = 'none');
    button.classList.add('active');
    document.getElementById(tabId).style.display = 'block';
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
                                    ${item.price.toFixed(2)} $
                                </td>
                                <td style="padding: 14px 12px; text-align: right; font-size: 14px; font-weight: 600; color: #1f2937;">
                                    ${(item.quantity * item.price).toFixed(2)} $
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
                            <span style="color: #1f2937; font-weight: 500;">${subtotal.toFixed(2)} $</span>
                        </div>
                        <div style="display: flex; justify-content: space-between; margin-bottom: 12px; font-size: 14px;">
                            <span style="color: #6b7280;">KDV (%20):</span>
                            <span style="color: #1f2937; font-weight: 500;">${tax.toFixed(2)} $</span>
                        </div>
                        <div style="display: flex; justify-content: space-between; padding-top: 12px; border-top: 2px solid #4F46E5; font-size: 18px; font-weight: 700;">
                            <span style="color: #1f2937;">GENEL TOPLAM:</span>
                            <span style="color: #4F46E5;">${total.toFixed(2)} $</span>
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
// Teklif Listesi sayfası - Filtreleme öncelikli
function loadTeklifListesi() {
    const content = `
        <div class="page-header">
            <h1 class="page-title"><i class="fas fa-list"></i> Teklifler Listesi</h1>
            <p class="page-subtitle">Teklifleri filtreleyerek görüntüleyin</p>
        </div>
        <div class="card">
            <div class="card-header">
                <div class="flex justify-between items-center">
                    <div>
                        <h3 class="card-title">Teklif Filtreleme</h3>
                        <p class="card-subtitle">Toplam ${firebaseData.offers.length} teklif mevcut</p>
                    </div>
                    <button class="btn btn-primary" onclick="showPage('teklifHazirla')">
                        <i class="fas fa-plus"></i> Yeni Teklif
                    </button>
                </div>
            </div>
            <div class="card-body">
                <div class="filter-bar" style="background: var(--gray-50); padding: 20px; border-radius: 10px; margin-bottom: 25px;">
                    <div class="filter-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; align-items: end;">
                        <div>
                            <label style="font-size: 12px; font-weight: 600; margin-bottom: 5px; display: block;">
                                <i class="fas fa-search"></i> Arama
                            </label>
                            <input type="text" 
                                id="offerSearch" 
                                class="form-control"
                                placeholder="Teklif no veya ürün ara..." 
                                onkeyup="filterOffers()">
                        </div>
                        
                        <div>
                            <label style="font-size: 12px; font-weight: 600; margin-bottom: 5px; display: block;">
                                <i class="fas fa-building"></i> Firma
                            </label>
                            <select id="offerCompanyFilter" class="form-control" onchange="filterOffers()">
                                <option value="">Firma seçin...</option>
                                ${firebaseData.companies.map(c => `
                                    <option value="${c.id}">${c.name}</option>
                                `).join('')}
                            </select>
                        </div>
                        
                        <div>
                            <label style="font-size: 12px; font-weight: 600; margin-bottom: 5px; display: block;">
                                <i class="fas fa-calendar"></i> Başlangıç
                            </label>
                            <input type="date" 
                                id="offerDateFrom" 
                                class="form-control"
                                onchange="filterOffers()">
                        </div>
                        
                        <div>
                            <label style="font-size: 12px; font-weight: 600; margin-bottom: 5px; display: block;">
                                <i class="fas fa-calendar-check"></i> Bitiş
                            </label>
                            <input type="date" 
                                id="offerDateTo" 
                                class="form-control"
                                onchange="filterOffers()">
                        </div>
                        
                        <div>
                            <label style="font-size: 12px; font-weight: 600; margin-bottom: 5px; display: block;">
                                <i class="fas fa-flag"></i> Durum
                            </label>
                            <select id="offerStatusFilter" class="form-control" onchange="filterOffers()">
                                <option value="">Durum seçin...</option>
                                <option value="Beklemede">Beklemede</option>
                                <option value="Onaylandı">Onaylandı</option>
                                <option value="Reddedildi">Reddedildi</option>
                                <option value="Gönderildi">Gönderildi</option>
                            </select>
                        </div>
                        
                        <div style="display: flex; gap: 10px;">
                            <button class="btn btn-success" onclick="showAllOffers()">
                                <i class="fas fa-list"></i> Tümünü Göster
                            </button>
                            <button class="btn btn-info" onclick="clearOfferFilters()">
                                <i class="fas fa-times"></i> Temizle
                            </button>
                        </div>
                    </div>
                </div>
                
                <!-- Mesaj alanı -->
                <div id="offerListMessage" style="text-align: center; padding: 60px; background: white; border: 2px dashed var(--gray-300); border-radius: 10px;">
                    <i class="fas fa-filter" style="font-size: 48px; color: var(--gray-400); margin-bottom: 20px;"></i>
                    <h3 style="color: var(--gray-600); margin-bottom: 10px;">Filtre Seçin</h3>
                    <p style="color: var(--gray-500);">
                        Teklifleri görüntülemek için yukarıdaki filtrelerden birini kullanın veya "Tümünü Göster" butonuna tıklayın.
                    </p>
                </div>
                
                <!-- Teklif tablosu - başlangıçta gizli -->
                <div id="offerTableContainer" style="display: none;">
                    <div class="table-container">
                        <table class="table">
                            <thead>
                                <tr>
                                    <th>Teklif No</th>
                                    <th>Firma</th>
                                    <th>Tarih</th>
                                    <th>Ürün Sayısı</th>
                                    <th>Toplam</th>
                                    <th>Durum</th>
                                    <th>İşlemler</th>
                                </tr>
                            </thead>
                            <tbody id="offersTableBody">
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    `;
    document.getElementById('pageContent').innerHTML = content;
}
function renderOffersTable(offers) {
    return offers.map(offer => {
        const company = firebaseData.companies.find(c => c.id === offer.companyId);
        const productCount = offer.products ? offer.products.length : 0;
        
        return `
            <tr data-offer-id="${offer.id}">
                <td>
                    <input type="checkbox" class="offer-checkbox" value="${offer.id}" 
                           onchange="updateSelectedOffers()" 
                           ${offer.status !== 'Onaylandı' ? 'disabled' : ''}>
                </td>
                <td><strong>${offer.no}</strong></td>
                <td>${company?.name || 'Bilinmeyen'}</td>
                <td>${offer.date}</td>
                <td><span class="badge info">${productCount} ürün</span></td>
                <td>${offer.total.toFixed(2)} ₺</td>
                <td>
                    <span class="badge ${
                        offer.status === 'Onaylandı' ? 'success' : 
                        offer.status === 'Beklemede' ? 'warning' : 
                        offer.status === 'Gönderildi' ? 'info' : 'danger'
                    }">${offer.status}</span>
                </td>
                <td>
                    <div class="action-buttons">
                        <button class="action-btn view" onclick="previewSavedOffer('${offer.id}')" title="Önizle">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="action-btn edit" onclick="editOfferModal('${offer.id}')" title="Düzenle">
                            <i class="fas fa-edit"></i>
                        </button>
                        ${offer.status === 'Onaylandı' ? `
                            <button class="action-btn success" onclick="convertToProductionWithEdit('${offer.id}')" title="Üretime Aktar">
                                <i class="fas fa-industry"></i>
                            </button>
                        ` : ''}
                        <button class="action-btn delete" onclick="deleteOffer('${offer.id}')" title="Sil">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

// Teklif filtreleme fonksiyonu
function filterOffers() {
    const search = (document.getElementById('offerSearch')?.value || '').toLowerCase().trim();
    const companyId = document.getElementById('offerCompanyFilter')?.value || '';
    const dateFrom = document.getElementById('offerDateFrom')?.value || '';
    const dateTo = document.getElementById('offerDateTo')?.value || '';
    const status = document.getElementById('offerStatusFilter')?.value || '';
    
    // Hiç filtre yoksa mesajı göster
    if (!search && !companyId && !dateFrom && !dateTo && !status) {
        document.getElementById('offerListMessage').style.display = 'block';
        document.getElementById('offerTableContainer').style.display = 'none';
        return;
    }
    
    // Filtre varsa tabloyu göster
    document.getElementById('offerListMessage').style.display = 'none';
    document.getElementById('offerTableContainer').style.display = 'block';
    
    // Teklifleri filtrele
    let filtered = [...firebaseData.offers];
    
    // Arama filtresi
    if (search) {
        filtered = filtered.filter(offer => {
            const searchInOffer = offer.no.toLowerCase().includes(search);
            const searchInProducts = offer.products && offer.products.some(p => 
                p.productName && p.productName.toLowerCase().includes(search)
            );
            return searchInOffer || searchInProducts;
        });
    }
    
    // Firma filtresi
    if (companyId) {
        filtered = filtered.filter(offer => offer.companyId === companyId);
    }
    
    // Tarih başlangıç filtresi
    if (dateFrom) {
        filtered = filtered.filter(offer => {
            const offerDate = new Date(offer.date);
            const filterDate = new Date(dateFrom);
            return offerDate >= filterDate;
        });
    }
    
    // Tarih bitiş filtresi
    if (dateTo) {
        filtered = filtered.filter(offer => {
            const offerDate = new Date(offer.date);
            const filterDate = new Date(dateTo);
            return offerDate <= filterDate;
        });
    }
    
    // Durum filtresi
    if (status) {
        filtered = filtered.filter(offer => offer.status === status);
    }
    
    // Sonuçları göster
    renderFilteredOffers(filtered);
}
// Filtrelenmiş teklifleri göster
function renderFilteredOffers(offers) {
    const tbody = document.getElementById('offersTableBody');
    if (!tbody) return;
    
    if (offers.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" style="text-align: center; padding: 40px; color: var(--gray-500);">
                    <i class="fas fa-search" style="font-size: 32px; margin-bottom: 10px; display: block;"></i>
                    Filtrelere uygun teklif bulunamadı.
                </td>
            </tr>
        `;
        return;
    }
    
    // Tarihe göre sırala (yeniden eskiye)
    offers.sort((a, b) => new Date(b.date) - new Date(a.date));
    
    tbody.innerHTML = offers.map(offer => {
        const company = firebaseData.companies.find(c => c.id === offer.companyId);
        const productCount = offer.products ? offer.products.length : 0;
        
        return `
            <tr>
                <td><strong>${offer.no}</strong></td>
                <td>${company?.name || 'Bilinmeyen'}</td>
                <td>${new Date(offer.date).toLocaleDateString('tr-TR')}</td>
                <td><span class="badge info">${productCount} ürün</span></td>
                <td>${offer.total ? offer.total.toFixed(2) : '0.00'} ₺</td>
                <td>
                    <span class="badge ${
                        offer.status === 'Onaylandı' ? 'success' : 
                        offer.status === 'Beklemede' ? 'warning' : 
                        offer.status === 'Gönderildi' ? 'info' : 'danger'
                    }">${offer.status}</span>
                </td>
                <td>
                    <div class="action-buttons">
                        <button class="action-btn view" onclick="previewSavedOffer('${offer.id}')" title="Önizle">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="action-btn edit" onclick="editOfferModal('${offer.id}')" title="Düzenle">
                            <i class="fas fa-edit"></i>
                        </button>
                        ${offer.status === 'Onaylandı' ? `
                            <button class="action-btn success" onclick="convertToProduction('${offer.id}')" title="Üretime Aktar">
                                <i class="fas fa-industry"></i>
                            </button>
                        ` : ''}
                        <button class="action-btn delete" onclick="deleteOffer('${offer.id}')" title="Sil">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}
// Tüm teklifleri göster
function showAllOffers() {
    const messageDiv = document.getElementById('offerListMessage');
    const tableDiv = document.getElementById('offerTableContainer');
    
    if (messageDiv) messageDiv.style.display = 'none';
    if (tableDiv) tableDiv.style.display = 'block';
    
    const tbody = document.getElementById('offersTableBody');
    if (!tbody) return;
    
    if (firebaseData.offers.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align: center;">Henüz teklif bulunmuyor.</td></tr>';
        return;
    }
    
    tbody.innerHTML = firebaseData.offers.map(offer => {
        const company = firebaseData.companies.find(c => c.id === offer.companyId);
        const productCount = offer.products ? offer.products.length : 0;
        
        return `
            <tr>
                <td><strong>${offer.no}</strong></td>
                <td>${company?.name || 'Bilinmeyen'}</td>
                <td>${new Date(offer.date).toLocaleDateString('tr-TR')}</td>
                <td><span class="badge info">${productCount} ürün</span></td>
                <td>${(offer.total || 0).toFixed(2)} ₺</td>
                <td>
                    <span class="badge ${
                        offer.status === 'Onaylandı' ? 'success' : 
                        offer.status === 'Beklemede' ? 'warning' : 
                        offer.status === 'Gönderildi' ? 'info' : 'danger'
                    }">${offer.status}</span>
                </td>
                <td>
                    <div class="action-buttons">
                        <button class="action-btn view" onclick="previewSavedOffer('${offer.id}')">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="action-btn edit" onclick="editOfferModal('${offer.id}')">
                            <i class="fas fa-edit"></i>
                        </button>
                        ${offer.status === 'Onaylandı' ? `
                            <button class="action-btn success" onclick="convertToProduction('${offer.id}')">
                                <i class="fas fa-industry"></i>
                            </button>
                        ` : ''}
                        <button class="action-btn delete" onclick="deleteOffer('${offer.id}')">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}
// Filtreleri temizle
function clearOfferFilters() {
    // Input'ları temizle
    document.getElementById('offerSearch').value = '';
    document.getElementById('offerCompanyFilter').value = '';
    document.getElementById('offerDateFrom').value = '';
    document.getElementById('offerDateTo').value = '';
    document.getElementById('offerStatusFilter').value = '';
    
    // Mesajı göster, tabloyu gizle
    document.getElementById('offerListMessage').style.display = 'block';
    document.getElementById('offerTableContainer').style.display = 'none';
}
function editOfferModal(offerId) {
    const offer = firebaseData.offers.find(o => o.id === offerId);
    if (!offer) {
        showNotification('Hata', 'Teklif bulunamadı.', 'error');
        return;
    }
    
    const company = firebaseData.companies.find(c => c.id === offer.companyId);
    
    const modalHTML = `
        <div id="editOfferModal" class="modal show">
            <div class="modal-content" style="max-width: 900px;">
                <div class="modal-header">
                    <h3 class="modal-title">Teklif Düzenle - ${offer.no}</h3>
                    <button class="modal-close" onclick="closeModal('editOfferModal')">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="modal-body">
                    <div class="form-grid">
                        <div class="form-group">
                            <label class="form-label">Firma</label>
                            <select class="form-control" id="editOfferCompany">
                                ${firebaseData.companies.map(c => `
                                    <option value="${c.id}" ${c.id === offer.companyId ? 'selected' : ''}>
                                        ${c.name} - ${c.taxNo}
                                    </option>
                                `).join('')}
                            </select>
                        </div>
                        <div class="form-group">
                            <label class="form-label">Tarih</label>
                            <input type="date" class="form-control" id="editOfferDate" value="${offer.date}">
                        </div>
                        <div class="form-group">
                            <label class="form-label">Geçerlilik</label>
                            <select class="form-control" id="editOfferValidity">
                                <option ${offer.validity === '15 gün' ? 'selected' : ''}>15 gün</option>
                                <option ${offer.validity === '30 gün' ? 'selected' : ''}>30 gün</option>
                                <option ${offer.validity === '45 gün' ? 'selected' : ''}>45 gün</option>
                                <option ${offer.validity === '60 gün' ? 'selected' : ''}>60 gün</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label class="form-label">Durum</label>
                            <select class="form-control" id="editOfferStatus">
                                <option value="Beklemede" ${offer.status === 'Beklemede' ? 'selected' : ''}>Beklemede</option>
                                <option value="Onaylandı" ${offer.status === 'Onaylandı' ? 'selected' : ''}>Onaylandı</option>
                                <option value="Reddedildi" ${offer.status === 'Reddedildi' ? 'selected' : ''}>Reddedildi</option>
                            </select>
                        </div>
                    </div>
                    
                    <h4 style="margin: 20px 0 10px 0;">Ürünler</h4>
                    <button class="btn btn-success btn-sm" onclick="addProductToEditOffer()">
                        <i class="fas fa-plus"></i> Ürün Ekle
                    </button>
                    
                    <div class="table-container" style="margin-top: 15px;">
                        <table class="table">
                            <thead>
                                <tr>
                                    <th>Ürün</th>
                                    <th>Miktar</th>
                                    <th>Birim Fiyat</th>
                                    <th>Toplam</th>
                                    <th>İşlem</th>
                                </tr>
                            </thead>
                            <tbody id="editOfferProducts">
                                ${offer.products.map((item, index) => `
                                    <tr>
                                        <td>
                                            <select class="form-control" data-index="${index}">
                                                ${firebaseData.products.map(p => `
                                                    <option value="${p.id}" ${p.id === item.productId ? 'selected' : ''}>
                                                        ${p.name}
                                                    </option>
                                                `).join('')}
                                            </select>
                                        </td>
                                        <td>
                                            <input type="number" class="form-control" value="${item.quantity}" 
                                                   min="1" style="width: 80px;" onchange="calculateEditOfferTotal()">
                                        </td>
                                        <td>
                                            <input type="number" class="form-control" value="${item.unitPrice}" 
                                                   min="0" step="0.01" style="width: 100px;" onchange="calculateEditOfferTotal()">
                                        </td>
                                        <td class="total-cell">${item.total.toFixed(2)} ₺</td>
                                        <td>
                                            <button class="btn btn-sm btn-danger" onclick="this.parentElement.parentElement.remove(); calculateEditOfferTotal()">
                                                <i class="fas fa-trash"></i>
                                            </button>
                                        </td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                    
                    <div style="text-align: right; margin-top: 20px;">
                        <div style="font-size: 16px;">Ara Toplam: <span id="editOfferSubtotal">${offer.subtotal.toFixed(2)} ₺</span></div>
                        <div style="font-size: 14px;">KDV (%20): <span id="editOfferTax">${offer.tax.toFixed(2)} ₺</span></div>
                        <div style="font-size: 20px; font-weight: bold; color: var(--primary);">
                            Genel Toplam: <span id="editOfferTotal">${offer.total.toFixed(2)} ₺</span>
                        </div>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-success" onclick="updateOffer('${offerId}')">
                        <i class="fas fa-save"></i> Güncelle
                    </button>
                    <button class="btn btn-outline" onclick="closeModal('editOfferModal')">İptal</button>
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHTML);
}

function calculateEditOfferTotal() {
    const tbody = document.getElementById('editOfferProducts');
    if (!tbody) return;
    
    let subtotal = 0;
    
    tbody.querySelectorAll('tr').forEach(row => {
        const quantity = parseFloat(row.querySelectorAll('input')[0].value) || 0;
        const price = parseFloat(row.querySelectorAll('input')[1].value) || 0;
        const total = quantity * price;
        
        row.querySelector('.total-cell').textContent = `${total.toFixed(2)} ₺`;
        subtotal += total;
    });
    
    const tax = subtotal * 0.20;
    const total = subtotal + tax;
    
    document.getElementById('editOfferSubtotal').textContent = `${subtotal.toFixed(2)} ₺`;
    document.getElementById('editOfferTax').textContent = `${tax.toFixed(2)} ₺`;
    document.getElementById('editOfferTotal').textContent = `${total.toFixed(2)} ₺`;
}
async function updateOffer(offerId) {
    const offer = firebaseData.offers.find(o => o.id === offerId);
    if (!offer) return;
    
    const products = [];
    const tbody = document.getElementById('editOfferProducts');
    
    tbody.querySelectorAll('tr').forEach(row => {
        const productId = row.querySelector('select').value;
        const product = firebaseData.products.find(p => p.id === productId);
        const quantity = parseFloat(row.querySelectorAll('input')[0].value) || 0;
        const unitPrice = parseFloat(row.querySelectorAll('input')[1].value) || 0;
        const total = quantity * unitPrice;
        
        products.push({
            productId: productId,
            productName: product?.name || 'Bilinmeyen',
            quantity: quantity,
            unitPrice: unitPrice,
            total: total
        });
    });
    
    const subtotal = products.reduce((sum, p) => sum + p.total, 0);
    const tax = subtotal * 0.20;
    const total = subtotal + tax;
    
    const updatedOffer = {
        ...offer,
        companyId: document.getElementById('editOfferCompany').value,
        date: document.getElementById('editOfferDate').value,
        validity: document.getElementById('editOfferValidity').value,
        status: document.getElementById('editOfferStatus').value,
        products: products,
        subtotal: subtotal,
        tax: tax,
        total: total,
        updatedAt: new Date().toISOString()
    };
    
    try {
        await window.firestoreService.updateOffer(offerId, updatedOffer);
        showNotification('Başarılı', 'Teklif güncellendi.', 'success');
        closeModal('editOfferModal');
        await loadFirebaseData();
        loadTeklifListesi();
    } catch (error) {
        console.error('Teklif güncelleme hatası:', error);
        showNotification('Hata', 'Teklif güncellenirken hata oluştu.', 'error');
    }
}

function convertToProduction(offerId) {
    const offer = firebaseData.offers.find(o => o.id === offerId);
    if (!offer) {
        showNotification('Hata', 'Teklif bulunamadı.', 'error');
        return;
    }
    
    if (offer.status !== 'Onaylandı') {
        showNotification('Uyarı', 'Sadece onaylanmış teklifler üretime aktarılabilir.', 'warning');
        return;
    }
    
    localStorage.setItem('offerToProduction', JSON.stringify(offer));
    showNotification('Yönlendiriliyor', 'İş emri sayfasına yönlendiriliyorsunuz...', 'info');
    showPage('isEmriVer');
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

    if (isMobileDevice()) {
        // Butonları tam göster
        document.querySelectorAll('.action-buttons').forEach(btnGroup => {
            btnGroup.style.display = 'flex';
            btnGroup.style.flexDirection = 'row';
            btnGroup.style.gap = '5px';
            btnGroup.querySelectorAll('button').forEach(btn => {
                btn.style.display = 'inline-flex';
            });
        });
    }
    applyMobileOptimizations('uretimListesi');

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
    if (!currentUser || (currentUser.role !== 'admin' && !hasPermission('admin'))) {
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
                    <button class="btn btn-primary" onclick="addNewUser()">
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
                                            ${(user.permissions || []).map(perm => `<span class="badge ${perm === 'admin' ? 'danger' : 'success'}">${perm}</span>`).join('')}
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
}

function addNewUser() {
    // Önce varsa eski modalı temizle
    const existingModal = document.getElementById('userModal');
    if (existingModal) {
        existingModal.remove();
    }
    
    const modalHTML = `
        <div id="userModal" class="modal show">
            <div class="modal-content">
                <div class="modal-header">
                    <h3 class="modal-title">Yeni Kullanıcı Ekle</h3>
                    <button class="modal-close" onclick="closeModal('userModal')">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="modal-body">
                    <form id="userForm">
                        <div class="form-group">
                            <label class="form-label">Ad Soyad</label>
                            <input type="text" class="form-control" id="userFormName" required>
                        </div>
                        <div class="form-group">
                            <label class="form-label">Kullanıcı Adı</label>
                            <input type="text" class="form-control" id="userFormUsername" required>
                        </div>
                        <div class="form-group">
                            <label class="form-label">Şifre</label>
                            <input type="password" class="form-control" id="userFormPassword" required>
                        </div>
                        <div class="form-group">
                            <label class="form-label">Departman</label>
                            <select class="form-control" id="userFormRole" required>
                                <option value="">Seçiniz...</option>
                                <option value="admin">Admin</option>
                                <option value="manager">Yönetici</option>
                                <option value="sales">Satış</option>
                                <option value="production">Üretim</option>
                                <option value="warehouse">Depo</option>
                                <option value="logistics">Lojistik</option>
                                <option value="quality">Kalite Kontrol</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label class="form-label">Yetkiler</label>
                            <div style="display: grid; gap: 12px;">
                                <label><input type="checkbox" id="perm_sales"> Satış Modülü</label>
                                <label><input type="checkbox" id="perm_production"> Üretim Modülü</label>
                                <label><input type="checkbox" id="perm_warehouse"> Depo Modülü</label>
                                <label><input type="checkbox" id="perm_reports"> Raporlar</label>
                                <label><input type="checkbox" id="perm_products"> Ürün Yönetimi</label>
                                <label><input type="checkbox" id="perm_hr"> İnsan Kaynakları</label>
                                <label><input type="checkbox" id="perm_admin"> Admin Yetkileri</label>
                            </div>
                        </div>
                    </form>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-success" onclick="saveUser()">
                        <i class="fas fa-save"></i> Kaydet
                    </button>
                    <button class="btn btn-outline" onclick="closeModal('userModal')">İptal</button>
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHTML);
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
        `<option value="${p.id}" data-price="${p.price}">${p.name} - ${p.code} - ${p.price} $</option>`
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
        <td class="total-cell" style="font-weight: 600;">0 $</td>
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
            totalCell.textContent = `${total.toFixed(2)} $`;
        }
        subtotal += total;
    });

    const tax = subtotal * 0.20;
    const total = subtotal + tax;

    const subtotalEl = document.getElementById('offerSubtotal');
    const taxEl = document.getElementById('offerTax');
    const totalEl = document.getElementById('offerTotal');

    if (subtotalEl) subtotalEl.textContent = `${subtotal.toFixed(2)} $`;
    if (taxEl) taxEl.textContent = `${tax.toFixed(2)} $`;
    if (totalEl) totalEl.textContent = `${total.toFixed(2)} $`;
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
        document.getElementById('offerSubtotal').textContent = '0 $';
        document.getElementById('offerTax').textContent = '0 $';
        document.getElementById('offerTotal').textContent = '0 $';
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
        document.getElementById('offerSubtotal').textContent = '0 $';
        document.getElementById('offerTax').textContent = '0 $';
        document.getElementById('offerTotal').textContent = '0 $';
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
                    <td>${product.price} $</td>
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
    // Önce modal varsa kaldır
    let existingModal = document.getElementById('productModal');
    if (existingModal) {
        existingModal.remove();
    }
    
    // Yeni modal oluştur
    const modalHTML = `
        <div id="productModal" class="modal show">
            <div class="modal-content">
                <div class="modal-header">
                    <h3 class="modal-title">Yeni Ürün Ekle</h3>
                    <button class="modal-close" onclick="closeModal('productModal')">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="modal-body">
                    <form id="productForm">
                        <div class="form-grid">
                            <div class="form-group">
                                <label class="form-label">Ürün Kodu</label>
                                <input type="text" class="form-control" id="productFormCode" value="PRD-${String(firebaseData.products.length + 1).padStart(4, '0')}" required>
                            </div>
                            <div class="form-group">
                                <label class="form-label">Barkod</label>
                                <input type="text" class="form-control" id="productFormBarcode" placeholder="Barkod numarası">
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
                        <div class="form-group">
                            <label class="form-label">Açıklama</label>
                            <textarea class="form-control" id="productFormDescription" rows="3"></textarea>
                        </div>
                    </form>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-success" onclick="saveProduct()">
                        <i class="fas fa-save"></i> Kaydet
                    </button>
                    <button class="btn btn-outline" onclick="closeModal('productModal')">İptal</button>
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHTML);
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
function showStockDetails(stockId) {
    const stock = firebaseData.stock.find(s => s.id === stockId);
    if (!stock) {
        showNotification('Hata', 'Hammadde bulunamadı.', 'error');
        return;
    }
    
    // Modal yoksa oluştur
    let modal = document.getElementById('productModal');
    if (!modal) {
        const modalHTML = `
            <div id="productModal" class="modal">
                <div class="modal-content">
                    <div class="modal-header">
                        <h3 class="modal-title">Hammadde Detayları</h3>
                        <button class="modal-close" onclick="closeModal('productModal')">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    <div class="modal-body" id="productModalBody">
                        <!-- İçerik buraya gelecek -->
                    </div>
                    <div class="modal-footer">
                        <button class="btn btn-outline" onclick="closeModal('productModal')">Kapat</button>
                    </div>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', modalHTML);
    }
    
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
        </div>
    `;
    
    openModal('productModal');
}
function editStock(stockId) {
    const stock = firebaseData.stock.find(s => s.id === stockId);
    if (!stock) {
        showNotification('Hata', 'Hammadde bulunamadı.', 'error');
        return;
    }
    
    // Modal yoksa oluştur
    let modal = document.getElementById('productModal');
    if (!modal) {
        const modalHTML = `
            <div id="productModal" class="modal">
                <div class="modal-content">
                    <div class="modal-header">
                        <h3 class="modal-title">Hammadde Düzenle</h3>
                        <button class="modal-close" onclick="closeModal('productModal')">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    <div class="modal-body" id="productModalBody">
                        <!-- İçerik buraya gelecek -->
                    </div>
                    <div class="modal-footer" id="productModalFooter">
                        <button class="btn btn-success" onclick="saveStock('${stockId}')">Kaydet</button>
                        <button class="btn btn-outline" onclick="closeModal('productModal')">İptal</button>
                    </div>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', modalHTML);
    }
    
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
            </div>
        </form>
    `;
    
    openModal('productModal');
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
        u.role === 'manager' || 
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

function addStock() {
    // Önce modal varsa kaldır
    let existingModal = document.getElementById('stockModal');
    if (existingModal) {
        existingModal.remove();
    }
    
    // Yeni modal oluştur
    const modalHTML = `
        <div id="stockModal" class="modal show">
            <div class="modal-content">
                <div class="modal-header">
                    <h3 class="modal-title">Yeni Hammadde Ekle</h3>
                    <button class="modal-close" onclick="closeModal('stockModal')">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="modal-body">
                    <form id="stockForm">
                        <div class="form-grid">
                            <div class="form-group">
                                <label class="form-label">Stok Kodu</label>
                                <input type="text" class="form-control" id="stockFormCode" value="STK-${String(firebaseData.stock.length + 1).padStart(4, '0')}" required>
                            </div>
                            <div class="form-group">
                                <label class="form-label">Barkod</label>
                                <input type="text" class="form-control" id="stockFormBarcode" placeholder="Barkod numarası">
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
                                <select class="form-control" id="stockFormUnit" required>
                                    <option value="kg">Kilogram (kg)</option>
                                    <option value="adet">Adet</option>
                                    <option value="metre">Metre</option>
                                    <option value="litre">Litre</option>
                                    <option value="paket">Paket</option>
                                </select>
                            </div>
                            <div class="form-group">
                                <label class="form-label">Minimum Stok</label>
                                <input type="number" class="form-control" id="stockFormMinStock" value="10" required>
                            </div>
                        </div>
                    </form>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-success" onclick="saveStock()">
                        <i class="fas fa-save"></i> Kaydet
                    </button>
                    <button class="btn btn-outline" onclick="closeModal('stockModal')">İptal</button>
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHTML);
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

async function deleteCompany(companyId) {
    const company = firebaseData.companies.find(c => c.id === companyId);
    if (!company) {
        showNotification('Hata', 'Firma bulunamadı.', 'error');
        return;
    }
    
    const relatedOffers = firebaseData.offers.filter(o => o.companyId === companyId);
    
    if (relatedOffers.length > 0) {
        const confirmDelete = confirm(`Bu firmaya ait ${relatedOffers.length} adet teklif bulunmaktadır.\n\nYine de firmayı silmek istiyor musunuz?`);
        if (!confirmDelete) return;
    }
    
    if (confirm(`${company.name} firmasını silmek istediğinize emin misiniz?`)) {
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

function editUser(userId) {
    const user = firebaseData.users.find(u => u.id === userId);
    if (!user) {
        showNotification('Hata', 'Kullanıcı bulunamadı.', 'error');
        return;
    }
    
    // Modal yoksa oluştur
    let modal = document.getElementById('userModal');
    if (!modal) {
        const modalHTML = `
            <div id="userModal" class="modal">
                <div class="modal-content">
                    <div class="modal-header">
                        <h3 class="modal-title" id="userModalTitle">Kullanıcı Düzenle</h3>
                        <button class="modal-close" onclick="closeModal('userModal')">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    <div class="modal-body">
                        <form id="userForm">
                            <div class="form-group">
                                <label class="form-label">Ad Soyad</label>
                                <input type="text" class="form-control" id="userFormName" required>
                            </div>
                            <div class="form-group">
                                <label class="form-label">Kullanıcı Adı</label>
                                <input type="text" class="form-control" id="userFormUsername" required>
                            </div>
                            <div class="form-group">
                                <label class="form-label">Şifre</label>
                                <input type="password" class="form-control" id="userFormPassword" required>
                            </div>
                            <div class="form-group">
                                <label class="form-label">Departman</label>
                                <select class="form-control" id="userFormRole" required>
                                    <option value="">Seçiniz...</option>
                                    <option value="admin">Admin</option>
                                    <option value="manager">Yönetici</option>
                                    <option value="sales">Satış</option>
                                    <option value="production">Üretim</option>
                                    <option value="warehouse">Depo</option>
                                    <option value="logistics">Lojistik</option>
                                    <option value="quality">Kalite Kontrol</option>
                                </select>
                            </div>
                            <div class="form-group">
                                <label class="form-label">Yetkiler</label>
                                <div style="display: grid; gap: 12px;">
                                    <label style="display: flex; align-items: center; gap: 8px;">
                                        <input type="checkbox" id="perm_sales"> Satış Modülü
                                    </label>
                                    <label style="display: flex; align-items: center; gap: 8px;">
                                        <input type="checkbox" id="perm_production"> Üretim Modülü
                                    </label>
                                    <label style="display: flex; align-items: center; gap: 8px;">
                                        <input type="checkbox" id="perm_warehouse"> Depo Modülü
                                    </label>
                                    <label style="display: flex; align-items: center; gap: 8px;">
                                        <input type="checkbox" id="perm_reports"> Raporlar
                                    </label>
                                    <label style="display: flex; align-items: center; gap: 8px;">
                                        <input type="checkbox" id="perm_products"> Ürün Yönetimi
                                    </label>
                                    <label style="display: flex; align-items: center; gap: 8px;">
                                        <input type="checkbox" id="perm_hr"> İnsan Kaynakları
                                    </label>
                                    <label style="display: flex; align-items: center; gap: 8px;">
                                        <input type="checkbox" id="perm_admin"> Admin Yetkileri
                                    </label>
                                </div>
                            </div>
                        </form>
                    </div>
                    <div class="modal-footer">
                        <button class="btn btn-success" onclick="saveUser('${userId}')">
                            <i class="fas fa-save"></i> Kaydet
                        </button>
                        <button class="btn btn-outline" onclick="closeModal('userModal')">İptal</button>
                    </div>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', modalHTML);
        modal = document.getElementById('userModal');
    }
    
    // Form değerlerini doldur
    document.getElementById('userFormName').value = user.name;
    document.getElementById('userFormUsername').value = user.username;
    document.getElementById('userFormPassword').value = user.password;
    document.getElementById('userFormRole').value = user.role;
    
    // Yetkileri işaretle
    document.getElementById('perm_sales').checked = user.permissions?.includes('sales') || false;
    document.getElementById('perm_production').checked = user.permissions?.includes('production') || false;
    document.getElementById('perm_warehouse').checked = user.permissions?.includes('warehouse') || false;
    document.getElementById('perm_reports').checked = user.permissions?.includes('reports') || false;
    document.getElementById('perm_products').checked = user.permissions?.includes('products') || false;
    document.getElementById('perm_hr').checked = user.permissions?.includes('hr') || false;
    document.getElementById('perm_admin').checked = user.permissions?.includes('admin') || false;
    
    openModal('userModal');
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
    console.log('🚀 Furkatech FZA-ERP sistemi başlatılıyor...');
    
    document.getElementById('loginContainer').style.display = 'flex';
    document.getElementById('appContainer').style.display = 'none';
    
    // Firebase bağlantısını test et
    console.log(' Database bağlantısı kontrol ediliyor...');
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
function addRecipe() {
    // Modal varsa kaldır
    let existingModal = document.getElementById('recipeModal');
    if (existingModal) {
        existingModal.remove();
    }
    
    const productOptions = firebaseData.products.map(p => 
        `<option value="${p.id}">${p.name} - ${p.code}</option>`
    ).join('');
    
    // Yeni modal oluştur
    const modalHTML = `
        <div id="recipeModal" class="modal show">
            <div class="modal-content" style="max-width: 700px;">
                <div class="modal-header">
                    <h3 class="modal-title">Yeni Reçete Oluştur</h3>
                    <button class="modal-close" onclick="closeModal('recipeModal')">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="modal-body">
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
                        
                        <!-- Hammadde Seçim Alanı -->
                        <div class="form-group">
                            <label class="form-label">Hammaddeler</label>
                            <div style="border: 2px solid var(--gray-200); border-radius: 8px; padding: 10px; background: var(--gray-50);">
                                <div style="margin-bottom: 10px;">
                                    <input type="text" id="rawMaterialSearch" class="form-control" placeholder="Hammadde ara..." onkeyup="filterRawMaterialCheckboxes()">
                                </div>
                                <div id="rawMaterialCheckboxContainer" style="max-height: 300px; overflow-y: auto; background: white; border-radius: 6px; padding: 10px;">
                                    ${firebaseData.stock.map(stock => {
                                        const stockStatus = stock.quantity > stock.minStock ? 'success' : 
                                                          stock.quantity > 0 ? 'warning' : 'danger';
                                        const stockLabel = stock.quantity > stock.minStock ? 'Yeterli' : 
                                                         stock.quantity > 0 ? 'Kritik' : 'Tükendi';
                                        return `
                                            <div class="raw-material-checkbox-item" style="padding: 8px; border-bottom: 1px solid #eee; display: flex; align-items: center; justify-content: space-between;">
                                                <label style="display: flex; align-items: center; flex: 1; cursor: pointer;">
                                                    <input type="checkbox" class="raw-material-checkbox" value="${stock.id}" style="margin-right: 10px;">
                                                    <div>
                                                        <strong>${stock.name}</strong>
                                                        <br>
                                                        <small style="color: #666;">Kod: ${stock.code} | Stok: ${stock.quantity} ${stock.unit}</small>
                                                    </div>
                                                </label>
                                                <span class="badge ${stockStatus}" style="margin-left: 10px;">${stockLabel}</span>
                                            </div>
                                        `;
                                    }).join('')}
                                </div>
                                <div style="margin-top: 10px; display: flex; justify-content: space-between; align-items: center;">
                                    <small id="selectedRawMaterialCount" style="color: #666;">0 hammadde seçili</small>
                                    <button type="button" class="btn btn-sm btn-outline" onclick="clearRawMaterialSelection()">
                                        <i class="fas fa-times"></i> Temizle
                                    </button>
                                </div>
                            </div>
                        </div>
                    </form>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-success" onclick="saveRecipeWithCheckboxes()">
                        <i class="fas fa-save"></i> Kaydet
                    </button>
                    <button class="btn btn-outline" onclick="closeModal('recipeModal')">İptal</button>
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    
    // Checkbox değişimlerini dinle
    document.querySelectorAll('.raw-material-checkbox').forEach(checkbox => {
        checkbox.addEventListener('change', updateSelectedRawMaterialCount);
    });
}
function filterRawMaterialCheckboxes() {
    const search = document.getElementById('rawMaterialSearch').value.toLowerCase();
    const items = document.querySelectorAll('.raw-material-checkbox-item');
    
    items.forEach(item => {
        const text = item.textContent.toLowerCase();
        item.style.display = text.includes(search) ? 'flex' : 'none';
    });
}

async function saveRecipeWithCheckboxes(recipeId = null) {
    const name = document.getElementById('recipeName').value;
    const productId = document.getElementById('recipeProduct').value;
    const quantityPerUnit = parseFloat(document.getElementById('recipeQuantityPerUnit').value);
    
    // Seçili checkbox'ları topla
    const rawMaterials = [];
    document.querySelectorAll('.raw-material-checkbox:checked').forEach(checkbox => {
        rawMaterials.push(checkbox.value);
    });
    
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
            showNotification('Güncellendi', 'Reçete güncellendi.', 'success');
        } else {
            await window.firestoreService.addRecipe(recipeData);
            showNotification('Eklendi', 'Yeni reçete eklendi.', 'success');
        }
        
        closeModal('recipeModal');
        await loadFirebaseData();
        if (currentPage === 'urunReceteleri') loadUrunReceteleri();
        
    } catch (error) {
        console.error('Reçete kaydetme hatası:', error);
        showNotification('Hata', 'Reçete kaydedilemedi.', 'error');
    }
}

function updateSelectedRawMaterialCount() {
    const checkboxes = document.querySelectorAll('.raw-material-checkbox:checked');
    document.getElementById('selectedRawMaterialCount').textContent = `${checkboxes.length} hammadde seçili`;
}

function clearRawMaterialSelection() {
    document.querySelectorAll('.raw-material-checkbox').forEach(checkbox => {
        checkbox.checked = false;
    });
    updateSelectedRawMaterialCount();
}

// Reçete için geçici seçili hammaddeler listesi
let tempRecipeRawMaterials = [];
async function saveSimpleRecipe(recipeId = null) {
    const name = document.getElementById('recipeName').value;
    const productId = document.getElementById('recipeProduct').value;
    const quantityPerUnit = parseFloat(document.getElementById('recipeQuantityPerUnit').value);
    const select = document.getElementById('recipeRawMaterials');
    
    const rawMaterials = [];
    for (let option of select.selectedOptions) {
        rawMaterials.push(option.value);
    }
    
    if (!name || !productId || rawMaterials.length === 0) {
        showNotification('Hata', 'Lütfen tüm alanları doldurun.', 'error');
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
            showNotification('Güncellendi', 'Reçete güncellendi.', 'success');
        } else {
            await window.firestoreService.addRecipe(recipeData);
            showNotification('Eklendi', 'Yeni reçete eklendi.', 'success');
        }
        
        closeModal('recipeModal');
        await loadFirebaseData();
        if (currentPage === 'urunReceteleri') loadUrunReceteleri();
    } catch (error) {
        console.error('Reçete kaydetme hatası:', error);
        showNotification('Hata', 'Reçete kaydedilemedi.', 'error');
    }
}
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
    if (!recipe) {
        showNotification('Hata', 'Reçete bulunamadı.', 'error');
        return;
    }
    
    const product = firebaseData.products.find(p => p.id === recipe.productId);
    
    // Modal varsa kaldır
    let existingModal = document.getElementById('recipeDetailModal');
    if (existingModal) {
        existingModal.remove();
    }
    
    // Hammadde detaylarını hazırla
    const rawMaterialsHTML = recipe.rawMaterials?.map(rmId => {
        const rm = firebaseData.stock.find(s => s.id === rmId);
        const stockStatus = rm ? (rm.quantity > rm.minStock ? 'success' : rm.quantity > 0 ? 'warning' : 'danger') : 'danger';
        const stockLabel = rm ? (rm.quantity > rm.minStock ? 'Yeterli' : rm.quantity > 0 ? 'Kritik' : 'Tükendi') : 'Bilinmeyen';
        
        return `
            <tr>
                <td><strong>${rm?.name || 'Bilinmeyen'}</strong></td>
                <td>${rm?.code || '-'}</td>
                <td>${recipe.quantityPerUnit || 1} ${rm?.unit || ''}</td>
                <td>${rm?.quantity || 0} ${rm?.unit || ''}</td>
                <td><span class="badge ${stockStatus}">${stockLabel}</span></td>
            </tr>
        `;
    }).join('') || '<tr><td colspan="5" style="text-align: center;">Hammadde bilgisi yok</td></tr>';
    
    // Modal oluştur
    const modalHTML = `
        <div id="recipeDetailModal" class="modal show">
            <div class="modal-content" style="max-width: 700px;">
                <div class="modal-header">
                    <h3 class="modal-title">Reçete Detayları</h3>
                    <button class="modal-close" onclick="closeModal('recipeDetailModal')">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="modal-body">
                    <div style="background: var(--gray-50); padding: 15px; border-radius: 8px; margin-bottom: 20px;">
                        <div class="form-grid">
                            <div>
                                <label style="font-size: 12px; color: #666;">Reçete Adı</label>
                                <div style="font-weight: bold;">${recipe.name}</div>
                            </div>
                            <div>
                                <label style="font-size: 12px; color: #666;">Ürün</label>
                                <div style="font-weight: bold;">${product?.name || 'Bilinmeyen'}</div>
                            </div>
                            <div>
                                <label style="font-size: 12px; color: #666;">Ürün Kodu</label>
                                <div style="font-weight: bold;">${product?.code || '-'}</div>
                            </div>
                            <div>
                                <label style="font-size: 12px; color: #666;">Birim Başına</label>
                                <div style="font-weight: bold;">${recipe.quantityPerUnit || 1} birim</div>
                            </div>
                        </div>
                    </div>
                    
                    <h5 style="margin-bottom: 15px;">Hammadde Listesi</h5>
                    <table class="table">
                        <thead>
                            <tr>
                                <th>Hammadde</th>
                                <th>Kod</th>
                                <th>Miktar</th>
                                <th>Stok</th>
                                <th>Durum</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${rawMaterialsHTML}
                        </tbody>
                    </table>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-primary" onclick="editRecipe('${recipeId}')">
                        <i class="fas fa-edit"></i> Düzenle
                    </button>
                    <button class="btn btn-outline" onclick="closeModal('recipeDetailModal')">Kapat</button>
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHTML);
}

function editRecipe(recipeId) {
    const recipe = firebaseData.recipes.find(r => r.id === recipeId);
    if (!recipe) {
        showNotification('Hata', 'Reçete bulunamadı.', 'error');
        return;
    }
    
    // Seçili hammaddeleri hazırla
    tempRecipeRawMaterials = recipe.rawMaterials ? [...recipe.rawMaterials] : [];
    
    // Modal varsa kaldır
    let existingModal = document.getElementById('recipeModal');
    if (existingModal) {
        existingModal.remove();
    }
    
    const productOptions = firebaseData.products.map(p => 
        `<option value="${p.id}" ${p.id === recipe.productId ? 'selected' : ''}>${p.name} - ${p.code}</option>`
    ).join('');
    
    // Yeni modal oluştur
    const modalHTML = `
        <div id="recipeModal" class="modal show">
            <div class="modal-content" style="max-width: 700px;">
                <div class="modal-header">
                    <h3 class="modal-title">Reçete Düzenle: ${recipe.name}</h3>
                    <button class="modal-close" onclick="closeModal('recipeModal')">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="modal-body">
                    <form id="recipeForm">
                        <div class="form-group">
                            <label class="form-label">Reçete Adı</label>
                            <input type="text" class="form-control" id="recipeName" value="${recipe.name}" placeholder="Örn: Sokak Lambası Reçetesi" required>
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
                            <input type="number" class="form-control" id="recipeQuantityPerUnit" value="${recipe.quantityPerUnit || 1}" min="1" required>
                        </div>
                        
                        <!-- Geliştirilmiş Hammadde Seçimi -->
                        <div class="form-group">
                            <label class="form-label">
                                Hammaddeler 
                                <span style="background: var(--primary); color: white; padding: 2px 8px; border-radius: 12px; font-size: 12px; margin-left: 10px;">
                                    ${tempRecipeRawMaterials.length} seçili
                                </span>
                            </label>
                            
                            <!-- Seçili hammaddeleri göster -->
                            <div id="selectedRawMaterialsDisplay" style="margin-bottom: 15px; padding: 10px; background: var(--gray-50); border-radius: 8px; min-height: 60px;">
                                ${tempRecipeRawMaterials.length > 0 ? 
                                    '<div style="display: flex; flex-wrap: wrap; gap: 8px;">' +
                                    tempRecipeRawMaterials.map(rmId => {
                                        const rm = firebaseData.stock.find(s => s.id === rmId);
                                        const stockStatus = rm ? (rm.quantity > rm.minStock ? 'success' : rm.quantity > 0 ? 'warning' : 'danger') : 'danger';
                                        return `
                                            <div style="background: white; border: 2px solid var(--primary); border-radius: 20px; padding: 6px 12px; display: flex; align-items: center; gap: 8px;">
                                                <span style="font-weight: 500; font-size: 13px;">${rm?.name || 'Bilinmeyen'}</span>
                                                <span class="badge ${stockStatus}" style="font-size: 10px;">
                                                    ${rm ? rm.quantity + ' ' + rm.unit : 'Stok yok'}
                                                </span>
                                                <button type="button" onclick="removeFromTempRawMaterials('${rmId}')" 
                                                    style="background: var(--danger); border: none; color: white; cursor: pointer; width: 18px; height: 18px; border-radius: 50%; display: flex; align-items: center; justify-content: center; padding: 0;">
                                                    <i class="fas fa-times" style="font-size: 10px;"></i>
                                                </button>
                                            </div>
                                        `;
                                    }).join('') +
                                    '</div>' :
                                    '<div style="text-align: center; color: var(--gray-500); padding: 15px;">Henüz hammadde seçilmedi</div>'
                                }
                            </div>
                            
                            <!-- Hammadde seçim alanı -->
                            <div style="border: 2px solid var(--gray-200); border-radius: 8px; padding: 10px; background: var(--gray-50);">
                                <!-- Arama kutusu -->
                                <div style="margin-bottom: 10px;">
                                    <input type="text" id="rawMaterialSearch" class="form-control" 
                                        placeholder="Hammadde ara..." 
                                        onkeyup="filterEditRawMaterialCheckboxes()"
                                        style="background: white;">
                                </div>
                                
                                <!-- Hızlı eylemler -->
                                <div style="display: flex; gap: 10px; margin-bottom: 10px;">
                                    <button type="button" class="btn btn-sm btn-primary" onclick="selectAllRawMaterials()">
                                        <i class="fas fa-check-square"></i> Tümünü Seç
                                    </button>
                                    <button type="button" class="btn btn-sm btn-outline" onclick="clearTempRawMaterials()">
                                        <i class="fas fa-times"></i> Temizle
                                    </button>
                                    <button type="button" class="btn btn-sm btn-info" onclick="selectCriticalRawMaterials()">
                                        <i class="fas fa-exclamation-triangle"></i> Kritik Stokları Seç
                                    </button>
                                </div>
                                
                                <!-- Hammadde listesi -->
                                <div id="rawMaterialCheckboxContainer" style="max-height: 300px; overflow-y: auto; background: white; border-radius: 6px; padding: 10px;">
                                    ${firebaseData.stock.map(stock => {
                                        const isSelected = tempRecipeRawMaterials.includes(stock.id);
                                        const stockStatus = stock.quantity > stock.minStock ? 'success' : 
                                                          stock.quantity > 0 ? 'warning' : 'danger';
                                        const stockLabel = stock.quantity > stock.minStock ? 'Yeterli' : 
                                                         stock.quantity > 0 ? 'Kritik' : 'Tükendi';
                                        return `
                                            <div class="raw-material-checkbox-item" 
                                                style="padding: 8px; border-bottom: 1px solid #eee; display: flex; align-items: center; justify-content: space-between; ${isSelected ? 'background: var(--primary-light, #f0f0ff);' : ''}">
                                                <label style="display: flex; align-items: center; flex: 1; cursor: pointer;">
                                                    <input type="checkbox" 
                                                        class="raw-material-checkbox" 
                                                        value="${stock.id}" 
                                                        ${isSelected ? 'checked' : ''}
                                                        onchange="toggleTempRawMaterial('${stock.id}')"
                                                        style="margin-right: 10px;">
                                                    <div>
                                                        <strong>${stock.name}</strong>
                                                        <br>
                                                        <small style="color: #666;">
                                                            Kod: ${stock.code} | Stok: ${stock.quantity} ${stock.unit}
                                                            ${stock.barcode ? ' | Barkod: ' + stock.barcode : ''}
                                                        </small>
                                                    </div>
                                                </label>
                                                <div style="display: flex; align-items: center; gap: 8px;">
                                                    <span class="badge ${stockStatus}" style="margin-left: 10px;">${stockLabel}</span>
                                                    ${stock.quantity <= stock.minStock ? 
                                                        '<i class="fas fa-exclamation-triangle" style="color: var(--warning);"></i>' : ''
                                                    }
                                                </div>
                                            </div>
                                        `;
                                    }).join('')}
                                </div>
                                
                                <!-- Özet bilgi -->
                                <div style="margin-top: 10px; padding: 10px; background: white; border-radius: 6px; display: flex; justify-content: space-between; align-items: center;">
                                    <div>
                                        <small id="selectedRawMaterialCount" style="color: #666; font-weight: 600;">
                                            ${tempRecipeRawMaterials.length} hammadde seçili
                                        </small>
                                    </div>
                                    <div style="display: flex; gap: 15px; font-size: 12px;">
                                        <span><i class="fas fa-circle" style="color: var(--success);"></i> Yeterli</span>
                                        <span><i class="fas fa-circle" style="color: var(--warning);"></i> Kritik</span>
                                        <span><i class="fas fa-circle" style="color: var(--danger);"></i> Tükendi</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </form>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-success" onclick="saveEditedRecipe('${recipeId}')">
                        <i class="fas fa-save"></i> Güncelle
                    </button>
                    <button class="btn btn-outline" onclick="closeModal('recipeModal')">İptal</button>
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHTML);
}

// Yardımcı fonksiyonlar ekle
function toggleTempRawMaterial(rmId) {
    const index = tempRecipeRawMaterials.indexOf(rmId);
    if (index > -1) {
        tempRecipeRawMaterials.splice(index, 1);
    } else {
        tempRecipeRawMaterials.push(rmId);
    }
    updateEditRecipeDisplay();
}

function removeFromTempRawMaterials(rmId) {
    const index = tempRecipeRawMaterials.indexOf(rmId);
    if (index > -1) {
        tempRecipeRawMaterials.splice(index, 1);
        updateEditRecipeDisplay();
    }
}

function clearTempRawMaterials() {
    tempRecipeRawMaterials = [];
    updateEditRecipeDisplay();
}

function selectAllRawMaterials() {
    tempRecipeRawMaterials = firebaseData.stock.map(s => s.id);
    updateEditRecipeDisplay();
}

function selectCriticalRawMaterials() {
    tempRecipeRawMaterials = firebaseData.stock
        .filter(s => s.quantity <= s.minStock)
        .map(s => s.id);
    updateEditRecipeDisplay();
}

function filterEditRawMaterialCheckboxes() {
    const search = document.getElementById('rawMaterialSearch').value.toLowerCase();
    const items = document.querySelectorAll('.raw-material-checkbox-item');
    
    items.forEach(item => {
        const text = item.textContent.toLowerCase();
        item.style.display = text.includes(search) ? 'flex' : 'none';
    });
}

function updateEditRecipeDisplay() {
    // Seçili hammaddeleri güncelle
    const displayDiv = document.getElementById('selectedRawMaterialsDisplay');
    if (displayDiv) {
        displayDiv.innerHTML = tempRecipeRawMaterials.length > 0 ? 
            '<div style="display: flex; flex-wrap: wrap; gap: 8px;">' +
            tempRecipeRawMaterials.map(rmId => {
                const rm = firebaseData.stock.find(s => s.id === rmId);
                const stockStatus = rm ? (rm.quantity > rm.minStock ? 'success' : rm.quantity > 0 ? 'warning' : 'danger') : 'danger';
                return `
                    <div style="background: white; border: 2px solid var(--primary); border-radius: 20px; padding: 6px 12px; display: flex; align-items: center; gap: 8px;">
                        <span style="font-weight: 500; font-size: 13px;">${rm?.name || 'Bilinmeyen'}</span>
                        <span class="badge ${stockStatus}" style="font-size: 10px;">
                            ${rm ? rm.quantity + ' ' + rm.unit : 'Stok yok'}
                        </span>
                        <button type="button" onclick="removeFromTempRawMaterials('${rmId}')" 
                            style="background: var(--danger); border: none; color: white; cursor: pointer; width: 18px; height: 18px; border-radius: 50%; display: flex; align-items: center; justify-content: center; padding: 0;">
                            <i class="fas fa-times" style="font-size: 10px;"></i>
                        </button>
                    </div>
                `;
            }).join('') +
            '</div>' :
            '<div style="text-align: center; color: var(--gray-500); padding: 15px;">Henüz hammadde seçilmedi</div>';
    }
    
    // Checkbox'ları güncelle
    document.querySelectorAll('.raw-material-checkbox').forEach(checkbox => {
        const isSelected = tempRecipeRawMaterials.includes(checkbox.value);
        checkbox.checked = isSelected;
        checkbox.closest('.raw-material-checkbox-item').style.background = isSelected ? 'var(--primary-light, #f0f0ff)' : 'white';
    });
    
    // Sayacı güncelle
    const countElement = document.getElementById('selectedRawMaterialCount');
    if (countElement) {
        countElement.textContent = `${tempRecipeRawMaterials.length} hammadde seçili`;
    }
    
    // Header'daki badge'i güncelle
    const badge = document.querySelector('.modal-body .form-label span');
    if (badge) {
        badge.textContent = `${tempRecipeRawMaterials.length} seçili`;
    }
}

async function saveEditedRecipe(recipeId) {
    const name = document.getElementById('recipeName').value;
    const productId = document.getElementById('recipeProduct').value;
    const quantityPerUnit = parseFloat(document.getElementById('recipeQuantityPerUnit').value);
    
    if (!name || !productId || tempRecipeRawMaterials.length === 0) {
        showNotification('Hata', 'Lütfen tüm alanları doldurun ve en az bir hammadde seçin.', 'error');
        return;
    }
    
    const recipeData = {
        name: name,
        productId: productId,
        rawMaterials: tempRecipeRawMaterials,
        quantityPerUnit: quantityPerUnit,
        active: true,
        updatedAt: new Date().toISOString()
    };
    
    try {
        await window.firestoreService.updateRecipe(recipeId, recipeData);
        showNotification('Güncellendi', 'Reçete başarıyla güncellendi.', 'success');
        
        tempRecipeRawMaterials = [];
        closeModal('recipeModal');
        await loadFirebaseData();
        if (currentPage === 'urunReceteleri') loadUrunReceteleri();
        
    } catch (error) {
        console.error('Reçete güncelleme hatası:', error);
        showNotification('Hata', 'Reçete güncellenirken hata oluştu.', 'error');
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
    const offerData = localStorage.getItem('offerToProduction');
    let fromOffer = null;
    
    if (offerData) {
        fromOffer = JSON.parse(offerData);
        localStorage.removeItem('offerToProduction');
    }
    
    const orderNo = `URT-${new Date().getFullYear()}-${String(firebaseData.production.length + 1).padStart(3, '0')}`;
    
    const content = `
        <div class="page-header">
            <h1 class="page-title"><i class="fas fa-file-alt"></i> İş Emri Ver</h1>
            <p class="page-subtitle">Tek iş emri ile birden fazla ürün ekleyin ve reçete detaylarını kontrol edin</p>
        </div>
        
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
        
        <div class="card">
            <div class="card-header" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white;">
                <h3 class="card-title"><i class="fas fa-edit"></i> İş Emri No: ${orderNo}</h3>
                ${fromOffer ? `
                    <div style="background: rgba(255,255,255,0.2); padding: 10px; border-radius: 5px; margin-top: 10px;">
                        <i class="fas fa-info-circle"></i> ${fromOffer.no} numaralı tekliften aktarıldı
                    </div>
                ` : ''}
            </div>
            <div class="card-body">
                <div class="form-grid">
                    <div class="form-group">
                        <label class="form-label"><i class="fas fa-building"></i> Müşteri</label>
                        <select class="form-control" id="jobCompany">
                            <option value="">Müşteri seçiniz...</option>
                            ${firebaseData.companies.map(c => `
                                <option value="${c.id}" ${fromOffer && c.id === fromOffer.companyId ? 'selected' : ''}>
                                    ${c.name}
                                </option>
                            `).join('')}
                        </select>
                    </div>
                    
                    <div class="form-group">
                        <label class="form-label"><i class="fas fa-calendar-alt"></i> Başlangıç Tarihi</label>
                        <input type="date" class="form-control" id="jobStartDate" value="${new Date().toISOString().split('T')[0]}" required>
                    </div>
                    
                    <div class="form-group">
                        <label class="form-label"><i class="fas fa-calendar-check"></i> Termin Tarihi</label>
                        <input type="date" class="form-control" id="jobDeadline">
                    </div>
                    
                    <div class="form-group">
                        <label class="form-label"><i class="fas fa-flag"></i> Öncelik</label>
                        <select class="form-control" id="jobPriority">
                            <option value="normal">Normal</option>
                            <option value="yuksek">Yüksek</option>
                            <option value="acil">Acil</option>
                        </select>
                    </div>
                </div>
                
                <h4 style="margin: 20px 0; color: var(--primary);">
                    <i class="fas fa-boxes"></i> Üretilecek Ürünler
                </h4>
                <button class="btn btn-primary" onclick="addProductToJobOrder()">
                    <i class="fas fa-plus"></i> Ürün Ekle
                </button>
                
                <div class="table-container" style="margin-top: 15px;">
                    <table class="table">
                        <thead>
                            <tr>
                                <th>Reçete</th>
                                <th>Ürün</th>
                                <th>Miktar</th>
                                <th>Hammaddeler</th>
                                <th>Stok Durumu</th>
                                <th>İşlem</th>
                            </tr>
                        </thead>
                        <tbody id="jobOrderProducts">
                            ${fromOffer ? fromOffer.products.map(item => {
                                const product = firebaseData.products.find(p => p.id === item.productId);
                                const recipe = firebaseData.recipes.find(r => r.productId === item.productId);
                                return createJobOrderProductRow(product, recipe, item.quantity);
                            }).join('') : ''}
                        </tbody>
                    </table>
                </div>
                
                <!-- REÇETE DETAYLARI ÖNIZLEME -->
                <div id="recipeDetailsPreview" style="margin-top: 30px; display: none;">
                    <div class="card" style="border: 2px solid var(--primary);">
                        <div class="card-header" style="background: var(--primary); color: white;">
                            <h4 style="margin: 0;">
                                <i class="fas fa-flask"></i> Reçete Detayları ve Stok Kontrolü
                            </h4>
                        </div>
                        <div class="card-body" id="recipeDetailsContent" style="background: var(--gray-50);">
                            <!-- Reçete detayları buraya gelecek -->
                        </div>
                    </div>
                </div>
                
                <!-- ÜRETİM ÖZETİ -->
                <div id="productionSummary" style="margin-top: 30px; display: none;">
                    <div class="card" style="border: 2px solid var(--success);">
                        <div class="card-header" style="background: var(--success); color: white;">
                            <h4 style="margin: 0;">
                                <i class="fas fa-chart-pie"></i> Üretim Özeti
                            </h4>
                        </div>
                        <div class="card-body" id="productionSummaryContent">
                            <!-- Üretim özeti buraya gelecek -->
                        </div>
                    </div>
                </div>
                
                <div class="form-group" style="margin-top: 20px;">
                    <label class="form-label"><i class="fas fa-sticky-note"></i> Genel Notlar</label>
                    <textarea class="form-control" id="jobNotes" rows="3" placeholder="Üretim ile ilgili özel notlar..."></textarea>
                </div>
                
                <div id="stockWarning" style="display: none; margin: 20px 0; padding: 15px; background: #fef2f2; border: 2px solid #ef4444; border-radius: 8px;">
                    <h5 style="color: #ef4444; margin-bottom: 10px;">
                        <i class="fas fa-exclamation-triangle"></i> Stok Uyarısı
                    </h5>
                    <div id="stockWarningContent"></div>
                </div>
                
                <button class="btn btn-success" onclick="createSingleJobOrder()" style="width: 100%; padding: 15px; font-size: 16px;">
                    <i class="fas fa-plus-circle"></i> İş Emrini Oluştur
                </button>
            </div>
        </div>
        
        <!-- SON İŞ EMİRLERİ -->
        <div class="card" style="margin-top: 20px;">
            <div class="card-header">
                <h3 class="card-title">Son İş Emirleri</h3>
            </div>
            <div class="card-body">
                <div class="table-container">
                    <table class="table">
                        <thead>
                            <tr>
                                <th>İş Emri No</th>
                                <th>Müşteri</th>
                                <th>Ürün Sayısı</th>
                                <th>Durum</th>
                                <th>Tarih</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${firebaseData.production.slice(-5).reverse().map(prod => {
                                const company = firebaseData.companies.find(c => c.id === prod.companyId);
                                const productCount = prod.products ? prod.products.length : 1;
                                return `
                                    <tr>
                                        <td><strong>${prod.orderNo}</strong></td>
                                        <td>${company?.name || '-'}</td>
                                        <td>${productCount} ürün</td>
                                        <td><span class="badge ${prod.status === 'Tamamlandı' ? 'success' : prod.status === 'Üretimde' ? 'warning' : 'info'}">${prod.status}</span></td>
                                        <td>${prod.startDate}</td>
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
function createJobOrderProductRow(product, recipe, quantity = 1) {
    let stockStatus = 'success';
    let stockMessage = 'Yeterli';
    
    if (recipe?.rawMaterials) {
        for (const rmId of recipe.rawMaterials) {
            const rm = firebaseData.stock.find(s => s.id === rmId);
            const needed = quantity * (recipe.quantityPerUnit || 1);
            if (!rm || rm.quantity < needed) {
                stockStatus = 'danger';
                stockMessage = 'Yetersiz';
                break;
            }
        }
    }
    
    const rawMaterials = recipe?.rawMaterials?.map(rmId => {
        const rm = firebaseData.stock.find(s => s.id === rmId);
        return rm ? rm.name : 'Bilinmeyen';
    }).slice(0, 3).join(', ') + (recipe?.rawMaterials?.length > 3 ? '...' : '') || 'Hammadde yok';
    
    return `
        <tr data-product-id="${product?.id}" data-recipe-id="${recipe?.id}">
            <td>
                <select class="form-control recipe-select" onchange="updateProductFromRecipe(this)">
                    <option value="">Reçete seçiniz...</option>
                    ${firebaseData.recipes.map(r => {
                        const p = firebaseData.products.find(p => p.id === r.productId);
                        return `<option value="${r.id}" data-product="${r.productId}" ${recipe?.id === r.id ? 'selected' : ''}>
                            ${r.name}
                        </option>`;
                    }).join('')}
                </select>
            </td>
            <td class="product-name">${product?.name || '-'}</td>
            <td>
                <input type="number" class="form-control quantity-input" value="${quantity}" min="1" style="width: 80px;" onchange="updateRecipeDetails()">
            </td>
            <td class="raw-materials" style="font-size: 12px;" title="${recipe?.rawMaterials?.length || 0} hammadde">${rawMaterials}</td>
            <td>
                <span class="badge ${stockStatus}">${stockMessage}</span>
            </td>
            <td>
                <button class="btn btn-sm btn-info" onclick="showRecipeDetailModal('${recipe?.id}', ${quantity})" title="Detay">
                    <i class="fas fa-eye"></i>
                </button>
                <button class="btn btn-sm btn-danger" onclick="this.parentElement.parentElement.remove(); updateRecipeDetails()">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        </tr>
    `;
}

function createProductRow(product, recipe, quantity = 1) {
    const rawMaterials = recipe?.rawMaterials?.map(rmId => {
        const rm = firebaseData.stock.find(s => s.id === rmId);
        return rm ? rm.name : 'Bilinmeyen';
    }).join(', ') || 'Hammadde yok';
    
    return `
        <tr data-product-id="${product?.id}" data-recipe-id="${recipe?.id}">
            <td>
                <select class="form-control recipe-select" onchange="updateProductFromRecipe(this)">
                    <option value="">Reçete seçiniz...</option>
                    ${firebaseData.recipes.map(r => {
                        const p = firebaseData.products.find(p => p.id === r.productId);
                        return `<option value="${r.id}" data-product="${r.productId}" ${recipe?.id === r.id ? 'selected' : ''}>
                            ${r.name} (${p?.name || 'Bilinmeyen'})
                        </option>`;
                    }).join('')}
                </select>
            </td>
            <td class="product-name">${product?.name || '-'}</td>
            <td>
                <input type="number" class="form-control quantity-input" value="${quantity}" min="1" style="width: 80px;" onchange="updateRecipeDetails()">
            </td>
            <td class="raw-materials" style="font-size: 12px; max-width: 200px;">${rawMaterials}</td>
            <td>
                <button class="btn btn-sm btn-danger" onclick="this.parentElement.parentElement.remove(); updateRecipeDetails()">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        </tr>
    `;
}

function addProductToJobOrder() {
    const tbody = document.getElementById('jobOrderProducts');
    const newRow = document.createElement('tr');
    
    newRow.innerHTML = `
        <td>
            <select class="form-control recipe-select" onchange="updateProductFromRecipeAndDetails(this)">
                <option value="">Reçete seçiniz...</option>
                ${firebaseData.recipes.map(r => {
                    const product = firebaseData.products.find(p => p.id === r.productId);
                    return `<option value="${r.id}" data-product="${r.productId}">${r.name} (${product?.name || 'Bilinmeyen'})</option>`;
                }).join('')}
            </select>
        </td>
        <td class="product-name">-</td>
        <td>
            <input type="number" class="form-control quantity-input" value="1" min="1" style="width: 80px;" onchange="updateRecipeDetails()">
        </td>
        <td class="raw-materials" style="font-size: 12px;">-</td>
        <td><span class="badge warning">Bekliyor</span></td>
        <td>
            <button class="btn btn-sm btn-danger" onclick="this.parentElement.parentElement.remove(); updateRecipeDetails()">
                <i class="fas fa-trash"></i>
            </button>
        </td>
    `;
    
    tbody.appendChild(newRow);
}

function updateProductFromRecipeAndDetails(select) {
    const recipeId = select.value;
    const row = select.closest('tr');
    
    if (!recipeId) {
        row.querySelector('.product-name').textContent = '-';
        row.querySelector('.raw-materials').textContent = '-';
        row.querySelector('td:nth-child(5)').innerHTML = '<span class="badge warning">Bekliyor</span>';
        updateRecipeDetails();
        return;
    }
    
    const recipe = firebaseData.recipes.find(r => r.id === recipeId);
    const product = recipe ? firebaseData.products.find(p => p.id === recipe.productId) : null;
    const quantity = parseInt(row.querySelector('.quantity-input').value) || 1;
    
    // Ürün adını güncelle
    row.querySelector('.product-name').textContent = product?.name || 'Bilinmeyen';
    
    // Hammaddeleri güncelle
    const rawMaterials = recipe?.rawMaterials?.map(rmId => {
        const rm = firebaseData.stock.find(s => s.id === rmId);
        return rm?.name || 'Bilinmeyen';
    }).slice(0, 3).join(', ') + (recipe?.rawMaterials?.length > 3 ? '...' : '') || 'Hammadde yok';
    row.querySelector('.raw-materials').textContent = rawMaterials;
    
    // Stok durumunu kontrol et
    let stockStatus = 'success';
    let stockMessage = 'Yeterli';
    
    if (recipe?.rawMaterials) {
        for (const rmId of recipe.rawMaterials) {
            const rm = firebaseData.stock.find(s => s.id === rmId);
            const needed = quantity * (recipe.quantityPerUnit || 1);
            if (!rm || rm.quantity < needed) {
                stockStatus = 'danger';
                stockMessage = 'Yetersiz';
                break;
            }
        }
    }
    
    row.querySelector('td:nth-child(5)').innerHTML = `<span class="badge ${stockStatus}">${stockMessage}</span>`;
    
    // Genel reçete detaylarını güncelle
    updateRecipeDetails();
}

async function createSingleJobOrder() {
    const companyId = document.getElementById('jobCompany').value;
    const startDate = document.getElementById('jobStartDate').value;
    const deadline = document.getElementById('jobDeadline').value;
    const priority = document.getElementById('jobPriority').value;
    const notes = document.getElementById('jobNotes').value;
    
    const tbody = document.getElementById('jobOrderProducts');
    const rows = tbody.querySelectorAll('tr');
    
    if (rows.length === 0) {
        showNotification('Hata', 'Lütfen en az bir ürün ekleyin.', 'error');
        return;
    }
    
    // Ürünleri topla
    const products = [];
    let hasError = false;
    
    rows.forEach(row => {
        const recipeId = row.querySelector('.recipe-select').value;
        const quantity = parseInt(row.querySelector('.quantity-input').value);
        
        if (!recipeId) {
            showNotification('Hata', 'Tüm ürünler için reçete seçilmelidir.', 'error');
            hasError = true;
            return;
        }
        
        const recipe = firebaseData.recipes.find(r => r.id === recipeId);
        const product = firebaseData.products.find(p => p.id === recipe.productId);
        
        products.push({
            recipeId: recipeId,
            productId: recipe.productId,
            productName: product?.name || 'Bilinmeyen',
            quantity: quantity,
            rawMaterials: recipe.rawMaterials || []
        });
    });
    
    if (hasError) return;
    
    const orderNo = `URT-${new Date().getFullYear()}-${String(firebaseData.production.length + 1).padStart(3, '0')}`;
    
    const jobOrder = {
        orderNo: orderNo,
        companyId: companyId,
        products: products,
        priority: priority,
        status: 'Beklemede',
        currentDepartment: 'Depo/Stok',
        departments: ['Depo/Stok', 'Dizgi', 'İmalat/Montaj'],
        progress: 0,
        startDate: startDate,
        deadline: deadline,
        notes: notes,
        completedDate: '',
        active: true,
        approvals: [],
        workTimeRecords: [],
        shipmentStatus: null,
        createdAt: new Date().toISOString(),
        createdBy: currentUser.id
    };
    
    try {
        await window.firestoreService.addProduction(jobOrder);
        showNotification('Başarılı', `${orderNo} numaralı iş emri oluşturuldu.`, 'success');
        await loadFirebaseData();
        showPage('uretimListesi');
    } catch (error) {
        console.error('İş emri oluşturma hatası:', error);
        showNotification('Hata', 'İş emri oluşturulurken hata oluştu.', 'error');
    }
}

function updateRecipeDetails() {
    const tbody = document.getElementById('jobOrderProducts');
    const rows = tbody.querySelectorAll('tr');
    const detailsDiv = document.getElementById('recipeDetailsPreview');
    const summaryDiv = document.getElementById('productionSummary');
    const contentDiv = document.getElementById('recipeDetailsContent');
    const summaryContent = document.getElementById('productionSummaryContent');
    const warningDiv = document.getElementById('stockWarning');
    const warningContent = document.getElementById('stockWarningContent');
    
    if (rows.length === 0) {
        detailsDiv.style.display = 'none';
        summaryDiv.style.display = 'none';
        warningDiv.style.display = 'none';
        return;
    }
    
    let totalRawMaterials = {};
    let productsList = [];
    let hasStockIssue = false;
    let stockIssues = [];
    
    rows.forEach(row => {
        const recipeId = row.querySelector('.recipe-select').value;
        const quantity = parseInt(row.querySelector('.quantity-input').value) || 0;
        const productName = row.querySelector('.product-name').textContent;
        
        if (recipeId && quantity > 0) {
            const recipe = firebaseData.recipes.find(r => r.id === recipeId);
            productsList.push({
                name: productName,
                quantity: quantity,
                recipe: recipe?.name || 'Reçetesiz'
            });
            
            if (recipe?.rawMaterials) {
                recipe.rawMaterials.forEach(rmId => {
                    const rm = firebaseData.stock.find(s => s.id === rmId);
                    if (rm) {
                        if (!totalRawMaterials[rmId]) {
                            totalRawMaterials[rmId] = {
                                name: rm.name,
                                unit: rm.unit,
                                required: 0,
                                available: rm.quantity,
                                minStock: rm.minStock
                            };
                        }
                        totalRawMaterials[rmId].required += quantity * (recipe.quantityPerUnit || 1);
                    }
                });
            }
        }
    });
    
    // Stok kontrol ve uyarıları
    Object.entries(totalRawMaterials).forEach(([rmId, rm]) => {
        if (rm.available < rm.required) {
            hasStockIssue = true;
            stockIssues.push(`${rm.name}: ${rm.required - rm.available} ${rm.unit} eksik`);
        }
    });
    
    // Reçete detayları göster
    if (Object.keys(totalRawMaterials).length > 0) {
        detailsDiv.style.display = 'block';
        contentDiv.innerHTML = `
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
                <div>
                    <h5 style="margin-bottom: 15px; color: var(--primary);">
                        <i class="fas fa-cubes"></i> Toplam Hammadde İhtiyacı
                    </h5>
                    <table class="table" style="font-size: 14px;">
                        <thead>
                            <tr style="background: white;">
                                <th>Hammadde</th>
                                <th>Gerekli</th>
                                <th>Mevcut</th>
                                <th>Durum</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${Object.values(totalRawMaterials).map(rm => {
                                const sufficient = rm.available >= rm.required;
                                const percentage = Math.round((rm.available / rm.required) * 100);
                                return `
                                    <tr>
                                        <td><strong>${rm.name}</strong></td>
                                        <td>${rm.required} ${rm.unit}</td>
                                        <td>${rm.available} ${rm.unit}</td>
                                        <td>
                                            ${sufficient ? 
                                                `<span class="badge success"><i class="fas fa-check"></i> Yeterli</span>` : 
                                                `<span class="badge danger"><i class="fas fa-times"></i> ${rm.required - rm.available} ${rm.unit} Eksik</span>`
                                            }
                                            <div style="width: 100%; height: 4px; background: #e5e7eb; border-radius: 2px; margin-top: 5px;">
                                                <div style="width: ${Math.min(percentage, 100)}%; height: 100%; background: ${sufficient ? '#10b981' : '#ef4444'}; border-radius: 2px;"></div>
                                            </div>
                                        </td>
                                    </tr>
                                `;
                            }).join('')}
                        </tbody>
                    </table>
                </div>
                
                <div>
                    <h5 style="margin-bottom: 15px; color: var(--success);">
                        <i class="fas fa-clipboard-list"></i> Üretim Listesi
                    </h5>
                    <div style="background: white; padding: 15px; border-radius: 8px;">
                        ${productsList.map(p => `
                            <div style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;">
                                <strong>${p.quantity} adet</strong> ${p.name}
                                <br>
                                <small style="color: #6b7280;">Reçete: ${p.recipe}</small>
                            </div>
                        `).join('')}
                        <div style="margin-top: 15px; padding-top: 15px; border-top: 2px solid #e5e7eb;">
                            <strong>Toplam: ${productsList.reduce((sum, p) => sum + p.quantity, 0)} ürün</strong>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        // Üretim özeti
        summaryDiv.style.display = 'block';
        summaryContent.innerHTML = `
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px;">
                <div style="text-align: center; padding: 15px; background: var(--gray-50); border-radius: 8px;">
                    <div style="font-size: 24px; font-weight: bold; color: var(--primary);">${productsList.length}</div>
                    <div style="font-size: 12px; color: var(--gray-600);">Farklı Ürün</div>
                </div>
                <div style="text-align: center; padding: 15px; background: var(--gray-50); border-radius: 8px;">
                    <div style="font-size: 24px; font-weight: bold; color: var(--success);">${productsList.reduce((sum, p) => sum + p.quantity, 0)}</div>
                    <div style="font-size: 12px; color: var(--gray-600);">Toplam Adet</div>
                </div>
                <div style="text-align: center; padding: 15px; background: var(--gray-50); border-radius: 8px;">
                    <div style="font-size: 24px; font-weight: bold; color: var(--warning);">${Object.keys(totalRawMaterials).length}</div>
                    <div style="font-size: 12px; color: var(--gray-600);">Hammadde Çeşidi</div>
                </div>
                <div style="text-align: center; padding: 15px; background: var(--gray-50); border-radius: 8px;">
                    <div style="font-size: 24px; font-weight: bold; color: ${hasStockIssue ? 'var(--danger)' : 'var(--success)'};">
                        ${hasStockIssue ? '<i class="fas fa-exclamation-triangle"></i>' : '<i class="fas fa-check-circle"></i>'}
                    </div>
                    <div style="font-size: 12px; color: var(--gray-600);">Stok Durumu</div>
                </div>
            </div>
        `;
        
        // Stok uyarısı
        if (hasStockIssue) {
            warningDiv.style.display = 'block';
            warningContent.innerHTML = `
                <ul style="margin: 0; padding-left: 20px;">
                    ${stockIssues.map(issue => `<li>${issue}</li>`).join('')}
                </ul>
                <div style="margin-top: 10px; font-size: 14px;">
                    <strong>Not:</strong> Eksik hammaddeler için satın alma talebi oluşturmanız gerekmektedir.
                </div>
            `;
        } else {
            warningDiv.style.display = 'none';
        }
    } else {
        detailsDiv.style.display = 'none';
        summaryDiv.style.display = 'none';
        warningDiv.style.display = 'none';
    }
}

function showRecipeDetailModal(recipeId, quantity) {
    if (!recipeId) return;
    
    const recipe = firebaseData.recipes.find(r => r.id === recipeId);
    if (!recipe) return;
    
    const product = firebaseData.products.find(p => p.id === recipe.productId);
    
    const modalHTML = `
        <div id="recipeDetailModal" class="modal show">
            <div class="modal-content" style="max-width: 600px;">
                <div class="modal-header">
                    <h3 class="modal-title">Reçete Detayı: ${recipe.name}</h3>
                    <button class="modal-close" onclick="closeModal('recipeDetailModal')">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="modal-body">
                    <div style="background: var(--gray-50); padding: 15px; border-radius: 8px; margin-bottom: 15px;">
                        <div><strong>Ürün:</strong> ${product?.name || 'Bilinmeyen'}</div>
                        <div><strong>Miktar:</strong> ${quantity} adet</div>
                        <div><strong>Birim Başına Hammadde:</strong> ${recipe.quantityPerUnit || 1}</div>
                    </div>
                    
                    <h5>Hammadde Detayları</h5>
                    <table class="table">
                        <thead>
                            <tr>
                                <th>Hammadde</th>
                                <th>Birim İhtiyaç</th>
                                <th>Toplam İhtiyaç</th>
                                <th>Mevcut Stok</th>
                                <th>Durum</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${recipe.rawMaterials?.map(rmId => {
                                const rm = firebaseData.stock.find(s => s.id === rmId);
                                const unitNeed = recipe.quantityPerUnit || 1;
                                const totalNeed = unitNeed * quantity;
                                const sufficient = rm && rm.quantity >= totalNeed;
                                return `
                                    <tr>
                                        <td>${rm?.name || 'Bilinmeyen'}</td>
                                        <td>${unitNeed} ${rm?.unit || ''}</td>
                                        <td><strong>${totalNeed} ${rm?.unit || ''}</strong></td>
                                        <td>${rm?.quantity || 0} ${rm?.unit || ''}</td>
                                        <td>
                                            <span class="badge ${sufficient ? 'success' : 'danger'}">
                                                ${sufficient ? 'Yeterli' : 'Yetersiz'}
                                            </span>
                                        </td>
                                    </tr>
                                `;
                            }).join('') || '<tr><td colspan="5">Hammadde bilgisi yok</td></tr>'}
                        </tbody>
                    </table>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-outline" onclick="closeModal('recipeDetailModal')">Kapat</button>
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHTML);
}
function addProductionItem() {
    const tbody = document.getElementById('productionItemsTable');
    const orderNo = `URT-2025-${String(firebaseData.production.length + tbody.children.length + 1).padStart(3, '0')}`;
    
    const row = tbody.insertRow();
    row.innerHTML = `
        <td><strong>${orderNo}</strong></td>
        <td>
            <select class="form-control recipe-select" onchange="updateProductFromRecipe(this)">
                <option value="">Reçete seçiniz...</option>
                ${firebaseData.recipes.map(r => {
                    const product = firebaseData.products.find(p => p.id === r.productId);
                    return `<option value="${r.id}" data-product="${r.productId}">${r.name} (${product?.name || 'Bilinmeyen'})</option>`;
                }).join('')}
            </select>
        </td>
        <td class="product-name">-</td>
        <td>
            <input type="number" class="form-control" value="1" min="1" style="width: 80px;">
        </td>
        <td>
            <select class="form-control" style="width: 100px;">
                <option value="normal">Normal</option>
                <option value="yuksek">Yüksek</option>
                <option value="acil">Acil</option>
            </select>
        </td>
        <td>
            <select class="form-control">
                <option value="Depo/Stok">Depo/Stok</option>
                <option value="Dizgi">Dizgi</option>
                <option value="İmalat/Montaj">İmalat/Montaj</option>
            </select>
        </td>
        <td>
            <button class="btn btn-sm btn-danger" onclick="this.parentElement.parentElement.remove()">
                <i class="fas fa-trash"></i>
            </button>
        </td>
    `;
}

function updateProductFromRecipe(select) {
    const recipeId = select.value;
    const recipe = firebaseData.recipes.find(r => r.id === recipeId);
    const product = recipe ? firebaseData.products.find(p => p.id === recipe.productId) : null;
    
    const row = select.closest('tr');
    const productCell = row.querySelector('.product-name');
    
    if (product) {
        productCell.textContent = product.name;
    } else {
        productCell.textContent = '-';
    }
}

async function createMultipleJobOrders() {
    const companyId = document.getElementById('jobCompany').value;
    const startDate = document.getElementById('jobStartDate').value;
    const deadline = document.getElementById('jobDeadline').value;
    const notes = document.getElementById('jobNotes').value;
    
    const tbody = document.getElementById('productionItemsTable');
    const rows = tbody.querySelectorAll('tr');
    
    if (rows.length === 0) {
        showNotification('Hata', 'Lütfen en az bir ürün ekleyin.', 'error');
        return;
    }
    
    const orders = [];
    let hasError = false;
    
    rows.forEach((row, index) => {
        const orderNo = row.querySelector('td').textContent.trim();
        const recipeId = row.querySelector('.recipe-select').value;
        const quantity = parseInt(row.querySelectorAll('input')[0].value);
        const priority = row.querySelectorAll('select')[1].value;
        const department = row.querySelectorAll('select')[2].value;
        
        if (!recipeId) {
            showNotification('Hata', `${orderNo} için reçete seçilmedi.`, 'error');
            hasError = true;
            return;
        }
        
        const recipe = firebaseData.recipes.find(r => r.id === recipeId);
        const product = firebaseData.products.find(p => p.id === recipe.productId);
        
        orders.push({
            orderNo: orderNo,
            recipeId: recipeId,
            product: product?.name || 'Bilinmeyen',
            productId: recipe.productId,
            quantity: quantity,
            priority: priority,
            status: 'Beklemede',
            currentDepartment: department,
            departments: ['Depo/Stok', 'Dizgi', 'İmalat/Montaj'],
            progress: 0,
            startDate: startDate,
            deadline: deadline,
            companyId: companyId,
            notes: notes,
            completedDate: '',
            active: true,
            approvals: [],
            workTimeRecords: [],
            shipmentStatus: null,
            createdAt: new Date().toISOString()
        });
    });
    
    if (hasError) return;
    
    try {
        for (const order of orders) {
            await window.firestoreService.addProduction(order);
        }
        
        showNotification('Başarılı', `${orders.length} adet iş emri oluşturuldu.`, 'success');
        
        await loadFirebaseData();
        showPage('uretimListesi');
        
    } catch (error) {
        console.error('İş emri oluşturma hatası:', error);
        showNotification('Hata', 'İş emirleri oluşturulurken hata oluştu.', 'error');
    }
}

function previewSavedOffer(offerId) {
    const offer = firebaseData.offers.find(o => o.id === offerId);
    if (!offer) {
        showNotification('Hata', 'Teklif bulunamadı.', 'error');
        return;
    }
    
    const company = firebaseData.companies.find(c => c.id === offer.companyId);
    
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

    const previewHtml = `
        <div class="offer-preview" style="font-family: 'Inter', -apple-system, sans-serif; padding: 40px; background: white; position: relative;">
            <div style="display: flex; justify-content: space-between; align-items: start; margin-top: 50px; padding-bottom: 30px; border-bottom: 2px solid #e5e7eb;">
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
                
                <div style="flex: 1; text-align: center; padding: 0 20px;">
                    <h1 style="font-size: 24px; font-weight: 700; color: #4F46E5; margin: 20px 0 10px 0;">TEKLİF</h1>
                    <div style="font-size: 14px; color: #6b7280;">
                        <div style="margin: 5px 0;">Teklif No: <strong>${offer.no}</strong></div>
                        <div style="margin: 5px 0;">Tarih: <strong>${new Date(offer.date).toLocaleDateString('tr-TR')}</strong></div>
                        <div style="margin: 5px 0;">Geçerlilik: <strong>${offer.validity}</strong></div>
                        <div style="margin: 5px 0;">Durum: <span style="background: ${offer.status === 'Onaylandı' ? '#10b981' : offer.status === 'Beklemede' ? '#f59e0b' : '#ef4444'}; color: white; padding: 2px 8px; border-radius: 4px; font-size: 12px;">${offer.status}</span></div>
                    </div>
                </div>
                
                <div style="flex: 1; text-align: right;">
                    <div style="font-size: 12px; color: #6b7280; margin-bottom: 10px;">SAYIN MÜŞTERİMİZ</div>
                    <h3 style="font-size: 18px; font-weight: 600; color: #1f2937; margin: 0 0 10px 0;">${company?.name || 'Bilinmeyen Firma'}</h3>
                    <div style="font-size: 13px; color: #6b7280; line-height: 1.6;">
                        <div>Vergi No: ${company?.taxNo || '-'}</div>
                        ${company?.phone ? `<div>Tel: ${company.phone}</div>` : ''}
                        ${company?.email ? `<div>E-posta: ${company.email}</div>` : ''}
                        ${company?.address ? `<div style="max-width: 250px; margin-left: auto;">${company.address}</div>` : ''}
                    </div>
                </div>
            </div>
            
            <div style="margin: 40px 0;">
                <table style="width: 100%; border-collapse: collapse;">
                    <thead>
                        <tr style="background: #f9fafb;">
                            <th style="padding: 12px; text-align: left; font-size: 12px; font-weight: 600; color: #4b5563; border-bottom: 2px solid #e5e7eb;">ÜRÜN ADI</th>
                            <th style="padding: 12px; text-align: center; font-size: 12px; font-weight: 600; color: #4b5563; border-bottom: 2px solid #e5e7eb;">MİKTAR</th>
                            <th style="padding: 12px; text-align: right; font-size: 12px; font-weight: 600; color: #4b5563; border-bottom: 2px solid #e5e7eb;">BİRİM FİYAT</th>
                            <th style="padding: 12px; text-align: right; font-size: 12px; font-weight: 600; color: #4b5563; border-bottom: 2px solid #e5e7eb;">TOPLAM</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${offer.products.map(item => `
                            <tr style="border-bottom: 1px solid #f3f4f6;">
                                <td style="padding: 14px 12px; font-size: 14px; color: #1f2937;">
                                    <strong>${item.productName}</strong>
                                </td>
                                <td style="padding: 14px 12px; text-align: center; font-size: 14px; color: #1f2937;">
                                    ${item.quantity}
                                </td>
                                <td style="padding: 14px 12px; text-align: right; font-size: 14px; color: #1f2937;">
                                    ${item.unitPrice.toFixed(2)} ₺
                                </td>
                                <td style="padding: 14px 12px; text-align: right; font-size: 14px; font-weight: 600; color: #1f2937;">
                                    ${item.total.toFixed(2)} ₺
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
            
            <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
                <div style="display: flex; justify-content: flex-end;">
                    <div style="width: 300px;">
                        <div style="display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 14px;">
                            <span style="color: #6b7280;">Ara Toplam:</span>
                            <span style="color: #1f2937; font-weight: 500;">${offer.subtotal.toFixed(2)} ₺</span>
                        </div>
                        <div style="display: flex; justify-content: space-between; margin-bottom: 12px; font-size: 14px;">
                            <span style="color: #6b7280;">KDV (%20):</span>
                            <span style="color: #1f2937; font-weight: 500;">${offer.tax.toFixed(2)} ₺</span>
                        </div>
                        <div style="display: flex; justify-content: space-between; padding-top: 12px; border-top: 2px solid #4F46E5; font-size: 18px; font-weight: 700;">
                            <span style="color: #1f2937;">GENEL TOPLAM:</span>
                            <span style="color: #4F46E5;">${offer.total.toFixed(2)} ₺</span>
                        </div>
                    </div>
                </div>
            </div>
            
            <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb; text-align: center; font-size: 12px; color: #9ca3af;">
                <p>Bu teklif ${offer.validity} süreyle geçerlidir.</p>
                <p style="margin-top: 5px;">Teklif kabul edildiği takdirde sipariş onayı gönderilecektir.</p>
            </div>
        </div>
    `;

    document.getElementById('offerPreviewBody').innerHTML = previewHtml;
    openModal('offerPreviewModal');
}

function addProductToEditOffer() {
    const tbody = document.getElementById('editOfferProducts');
    const row = tbody.insertRow();
    
    row.innerHTML = `
        <td>
            <select class="form-control">
                <option value="">Ürün seçiniz...</option>
                ${firebaseData.products.map(p => `
                    <option value="${p.id}">${p.name}</option>
                `).join('')}
            </select>
        </td>
        <td>
            <input type="number" class="form-control" value="1" 
                   min="1" style="width: 80px;" onchange="calculateEditOfferTotal()">
        </td>
        <td>
            <input type="number" class="form-control" value="0" 
                   min="0" step="0.01" style="width: 100px;" onchange="calculateEditOfferTotal()">
        </td>
        <td class="total-cell">0.00 ₺</td>
        <td>
            <button class="btn btn-sm btn-danger" onclick="this.parentElement.parentElement.remove(); calculateEditOfferTotal()">
                <i class="fas fa-trash"></i>
            </button>
        </td>
    `;
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
    if (!prod) {
        showNotification('Hata', 'Üretim kaydı bulunamadı.', 'error');
        return;
    }

    let modal = document.getElementById('productionDetailModal');
    if (!modal) {
        const modalHTML = `
            <div id="productionDetailModal" class="modal">
                <div class="modal-content" style="max-width: 900px; max-height: 90vh; overflow-y: auto;">
                    <div class="modal-header">
                        <h3 class="modal-title" id="productionDetailTitle">Üretim Detayı</h3>
                        <button class="modal-close" onclick="closeModal('productionDetailModal')">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    <div class="modal-body" id="productionDetailBody">
                        <!-- Dynamic content -->
                    </div>
                    <div class="modal-footer">
                        <button class="btn btn-success" onclick="saveProductionDetail()">
                            <i class="fas fa-save"></i> Kaydet
                        </button>
                        <button class="btn btn-outline" onclick="closeModal('productionDetailModal')">Kapat</button>
                    </div>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', modalHTML);
        modal = document.getElementById('productionDetailModal');
    }

    const approvals = prod.approvals || [];
    const progress = prod.progress || 0;
    const status = prod.status || 'Beklemede';
    const currentDepartment = prod.currentDepartment || 'Depo/Stok';
    const departments = ['Depo/Stok', 'Dizgi', 'İmalat/Montaj'];
    const recipe = firebaseData.recipes.find(r => r.id === prod.recipeId);
    const product = firebaseData.products.find(p => p.id === prod.productId);

    const isDepoApproved = approvals.some(a => a.department === 'Depo/Stok');
    const isDizgiApproved = approvals.some(a => a.department === 'Dizgi');

    // Düzenlenebilir Hammadde Listesi
    let rawMaterialsEditHTML = '';
    if (recipe && recipe.rawMaterials) {
        rawMaterialsEditHTML = `
            <div style="background: var(--gray-50); padding: 15px; border-radius: 8px;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
                    <h5 style="margin: 0; color: var(--primary);">Kullanılacak Hammaddeler</h5>
                    ${currentUser.role === 'admin' || hasPermission('production') ? `
                        <button class="btn btn-sm btn-primary" onclick="openProductionRawMaterialModal('${productionId}')">
                            <i class="fas fa-edit"></i> Hammaddeleri Düzenle
                        </button>
                    ` : ''}
                </div>
                <table style="width: 100%; font-size: 13px;">
                    <thead>
                        <tr style="border-bottom: 2px solid var(--gray-300);">
                            <th style="text-align: left; padding: 5px;">Hammadde</th>
                            <th style="text-align: center; padding: 5px;">Gerekli</th>
                            <th style="text-align: center; padding: 5px;">Stok</th>
                            <th style="text-align: center; padding: 5px;">Durum</th>
                            ${currentUser.role === 'admin' ? '<th style="text-align: center; padding: 5px;">İşlem</th>' : ''}
                        </tr>
                    </thead>
                    <tbody id="productionRawMaterialsTable">
                        ${recipe.rawMaterials.map(rmId => {
                            const rm = firebaseData.stock.find(s => s.id === rmId);
                            const usedQuantity = prod.quantity * (recipe.quantityPerUnit || 1);
                            const sufficient = rm ? rm.quantity >= usedQuantity : false;
                            return `
                                <tr style="border-bottom: 1px solid var(--gray-200);" data-rm-id="${rmId}">
                                    <td style="padding: 5px;"><strong>${rm ? rm.name : 'Bilinmeyen'}</strong></td>
                                    <td style="text-align: center; padding: 5px;">
                                        <span class="required-qty">${usedQuantity}</span> ${rm ? rm.unit : ''}
                                    </td>
                                    <td style="text-align: center; padding: 5px;">${rm ? rm.quantity : 0} ${rm ? rm.unit : ''}</td>
                                    <td style="text-align: center; padding: 5px;">
                                        <span class="badge ${sufficient ? 'success' : 'danger'}" style="font-size: 11px;">
                                            ${sufficient ? 'Yeterli' : 'Yetersiz'}
                                        </span>
                                    </td>
                                    ${currentUser.role === 'admin' ? `
                                        <td style="text-align: center; padding: 5px;">
                                            <button class="btn btn-sm btn-danger" onclick="removeRawMaterialFromProduction('${productionId}', '${rmId}')">
                                                <i class="fas fa-times"></i>
                                            </button>
                                        </td>
                                    ` : ''}
                                </tr>
                            `;
                        }).join('')}
                    </tbody>
                </table>
            </div>
        `;
    } else {
        rawMaterialsEditHTML = '<div style="color: var(--gray-500);">Reçete bilgisi bulunamadı</div>';
    }

    // Bölüm onayları
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
                    ${currentUser.role === 'admin' ? 
                        `<input type="number" class="form-control" id="productionQuantity" value="${prod.quantity}" min="1">` :
                        `<input type="text" class="form-control" value="${prod.quantity}" readonly>`
                    }
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
            </div>
            
            <div class="section">
                <h4 class="section-title">Reçete Detayları</h4>
                ${rawMaterialsEditHTML}
            </div>
            
            <div class="section">
                <h4 class="section-title">Bölüm Onayları</h4>
                ${departmentApprovals}
            </div>
            
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

function openProductionRawMaterialModal(productionId) {
    const prod = firebaseData.production.find(p => p.id === productionId);
    const recipe = firebaseData.recipes.find(r => r.id === prod.recipeId);
    
    if (!prod || !recipe) {
        showNotification('Hata', 'Üretim veya reçete bilgisi bulunamadı.', 'error');
        return;
    }
    
    const modalHTML = `
        <div id="productionRawMaterialModal" class="modal show" style="z-index: 10002;">
            <div class="modal-content" style="max-width: 700px;">
                <div class="modal-header">
                    <h3 class="modal-title">Hammaddeleri Düzenle - ${prod.orderNo}</h3>
                    <button class="modal-close" onclick="closeModal('productionRawMaterialModal')">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="modal-body">
                    <div class="alert alert-info">
                        <i class="fas fa-info-circle"></i> 
                        Bu üretim için kullanılacak hammaddeleri düzenleyebilirsiniz. 
                        Miktar: ${prod.quantity} adet
                    </div>
                    
                    <div class="form-group">
                        <label class="form-label">Yeni Hammadde Ekle</label>
                        <div style="display: flex; gap: 10px;">
                            <select id="newRawMaterialSelect" class="form-control" style="flex: 1;">
                                <option value="">Hammadde seçin...</option>
                                ${firebaseData.stock.filter(s => !recipe.rawMaterials.includes(s.id)).map(stock => 
                                    `<option value="${stock.id}">${stock.name} - Stok: ${stock.quantity} ${stock.unit}</option>`
                                ).join('')}
                            </select>
                            <button class="btn btn-primary" onclick="addRawMaterialToProduction('${productionId}')">
                                <i class="fas fa-plus"></i> Ekle
                            </button>
                        </div>
                    </div>
                    
                    <h4 style="margin-top: 20px;">Mevcut Hammaddeler</h4>
                    <div class="table-container">
                        <table class="table">
                            <thead>
                                <tr>
                                    <th>Hammadde</th>
                                    <th>Gerekli Miktar</th>
                                    <th>Mevcut Stok</th>
                                    <th>İşlem</th>
                                </tr>
                            </thead>
                            <tbody id="editRawMaterialsList">
                                ${recipe.rawMaterials.map(rmId => {
                                    const rm = firebaseData.stock.find(s => s.id === rmId);
                                    const needed = prod.quantity * (recipe.quantityPerUnit || 1);
                                    return `
                                        <tr id="edit_rm_${rmId}">
                                            <td>${rm ? rm.name : 'Bilinmeyen'}</td>
                                            <td>
                                                <input type="number" 
                                                    class="form-control" 
                                                    value="${needed}" 
                                                    min="1" 
                                                    style="width: 100px;"
                                                    onchange="updateRawMaterialQuantity('${productionId}', '${rmId}', this.value)">
                                                ${rm ? rm.unit : ''}
                                            </td>
                                            <td>${rm ? rm.quantity : 0} ${rm ? rm.unit : ''}</td>
                                            <td>
                                                <button class="btn btn-sm btn-danger" 
                                                    onclick="removeRawMaterialFromProductionModal('${productionId}', '${rmId}')">
                                                    <i class="fas fa-trash"></i>
                                                </button>
                                            </td>
                                        </tr>
                                    `;
                                }).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-success" onclick="saveProductionRawMaterials('${productionId}')">
                        <i class="fas fa-save"></i> Değişiklikleri Kaydet
                    </button>
                    <button class="btn btn-outline" onclick="closeModal('productionRawMaterialModal')">İptal</button>
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHTML);
}

function addRawMaterialToProduction(productionId) {
    const select = document.getElementById('newRawMaterialSelect');
    const rmId = select.value;
    
    if (!rmId) {
        showNotification('Uyarı', 'Lütfen hammadde seçin.', 'warning');
        return;
    }
    
    const prod = firebaseData.production.find(p => p.id === productionId);
    const recipe = firebaseData.recipes.find(r => r.id === prod.recipeId);
    const rm = firebaseData.stock.find(s => s.id === rmId);
    
    if (!recipe.rawMaterials.includes(rmId)) {
        recipe.rawMaterials.push(rmId);
        
        // Tabloyu güncelle
        const tbody = document.getElementById('editRawMaterialsList');
        const newRow = document.createElement('tr');
        newRow.id = `edit_rm_${rmId}`;
        newRow.innerHTML = `
            <td>${rm.name}</td>
            <td>
                <input type="number" 
                    class="form-control" 
                    value="${prod.quantity}" 
                    min="1" 
                    style="width: 100px;"
                    onchange="updateRawMaterialQuantity('${productionId}', '${rmId}', this.value)">
                ${rm.unit}
            </td>
            <td>${rm.quantity} ${rm.unit}</td>
            <td>
                <button class="btn btn-sm btn-danger" 
                    onclick="removeRawMaterialFromProductionModal('${productionId}', '${rmId}')">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        `;
        tbody.appendChild(newRow);
        
        // Select'i güncelle
        select.querySelector(`option[value="${rmId}"]`).remove();
        select.value = '';
        
        showNotification('Eklendi', `${rm.name} hammaddesi eklendi.`, 'success');
    }
}

function removeRawMaterialFromProductionModal(productionId, rmId) {
    if (!confirm('Bu hammaddeyi kaldırmak istediğinize emin misiniz?')) {
        return;
    }
    
    const prod = firebaseData.production.find(p => p.id === productionId);
    const recipe = firebaseData.recipes.find(r => r.id === prod.recipeId);
    const rm = firebaseData.stock.find(s => s.id === rmId);
    
    // Recipe'den kaldır
    const index = recipe.rawMaterials.indexOf(rmId);
    if (index > -1) {
        recipe.rawMaterials.splice(index, 1);
    }
    
    // Tablodan kaldır
    const row = document.getElementById(`edit_rm_${rmId}`);
    if (row) {
        row.remove();
    }
    
    // Select'e geri ekle
    const select = document.getElementById('newRawMaterialSelect');
    const option = document.createElement('option');
    option.value = rmId;
    option.textContent = `${rm.name} - Stok: ${rm.quantity} ${rm.unit}`;
    select.appendChild(option);
    
    showNotification('Kaldırıldı', `${rm.name} hammaddesi kaldırıldı.`, 'info');
}
function removeRawMaterialFromProduction(productionId, rmId) {
    const prod = firebaseData.production.find(p => p.id === productionId);
    const recipe = firebaseData.recipes.find(r => r.id === prod.recipeId);
    const rm = firebaseData.stock.find(s => s.id === rmId);
    
    if (!confirm(`${rm ? rm.name : 'Bu hammadde'}'yi listeden kaldırmak istediğinize emin misiniz?`)) {
        return;
    }
    
    const index = recipe.rawMaterials.indexOf(rmId);
    if (index > -1) {
        recipe.rawMaterials.splice(index, 1);
        
        const row = document.querySelector(`tr[data-rm-id="${rmId}"]`);
        if (row) {
            row.remove();
        }
        
        showNotification('Kaldırıldı', `${rm ? rm.name : 'Hammadde'} listeden kaldırıldı.`, 'info');
    }
}

async function saveProductionRawMaterials(productionId) {
    const prod = firebaseData.production.find(p => p.id === productionId);
    const recipe = firebaseData.recipes.find(r => r.id === prod.recipeId);
    
    if (!prod || !recipe) {
        showNotification('Hata', 'Kayıt bulunamadı.', 'error');
        return;
    }
    
    try {
        // Recipe'i güncelle
        await window.firestoreService.updateRecipe(recipe.id, {
            ...recipe,
            rawMaterials: recipe.rawMaterials,
            lastModified: new Date().toISOString()
        });
        
        // Production kaydını da güncelle (miktar değişikliği varsa)
        const quantityInput = document.getElementById('productionQuantity');
        if (quantityInput) {
            const newQuantity = parseInt(quantityInput.value);
            if (newQuantity !== prod.quantity) {
                prod.quantity = newQuantity;
                await window.firestoreService.updateProduction(productionId, {
                    ...prod,
                    quantity: newQuantity
                });
            }
        }
        
        showNotification('Başarılı', 'Hammadde listesi güncellendi.', 'success');
        
        // Modalı kapat ve ana modalı yenile
        closeModal('productionRawMaterialModal');
        
        // Firebase'den veriyi yenile
        await loadFirebaseData();
        
        // Production detail modalını yeniden yükle
        showProductionDetail(productionId);
        
    } catch (error) {
        console.error('Hammadde güncelleme hatası:', error);
        showNotification('Hata', 'Güncelleme sırasında hata oluştu.', 'error');
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
    
    // Null kontrolü ekleyelim
    const progressEl = document.querySelector('.progress-fill');
    if (progressEl) {
        progressEl.style.width = progress + '%';
    }
    
    // Progress text güncelleme
    const progressText = document.querySelector('.progress-bar + span');
    if (progressText) {
        progressText.textContent = progress + '%';
    }
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
    applyMobileOptimizations('sevkiyatBekleyen');
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

function loadRaporlar() {
    const isAdmin = currentUser.role === 'admin' || currentUser.permissions?.includes('admin');
    
    const content = `
        <div class="page-header">
            <h1 class="page-title"><i class="fas fa-chart-bar"></i> Raporlar</h1>
            <p class="page-subtitle">Detaylı analiz ve raporlar</p>
        </div>
        
        ${isAdmin ? `
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
                                    <td><strong>${s.orderNo || 'Bilinmeyen'}</strong></td>
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
// Firma seçim modalını aç
function openCompanySelectionModal() {
    // Önce mevcut modalı temizle
    const existingModal = document.getElementById('companySelectionModal');
    if (existingModal) {
        existingModal.remove();
    }
    
    const modalHTML = `
        <div id="companySelectionModal" class="modal show">
            <div class="modal-content" style="max-width: 600px;">
                <div class="modal-header">
                    <h3 class="modal-title">Firma Seçimi</h3>
                    <button class="modal-close" onclick="closeModal('companySelectionModal')">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="modal-body">
                    <div class="search-section" style="margin-bottom: 20px;">
                        <div class="search-box">
                            <i class="fas fa-search"></i>
                            <input type="text" 
                                   id="companySelectionSearch" 
                                   placeholder="Firma adı veya vergi no ara..." 
                                   onkeyup="filterCompanySuggestions()"
                                   style="width: 100%; padding: 10px 10px 10px 40px;">
                        </div>
                    </div>
                    
                    <div class="suggestions-section">
                        <h4 style="margin-bottom: 15px; color: var(--gray-700);">Firmalar</h4>
                        <div id="companySuggestionsList" style="max-height: 300px; overflow-y: auto;">
                            <!-- Firma listesi buraya yüklenecek -->
                        </div>
                    </div>
                    
                    <div class="add-new-section" style="margin-top: 20px; padding-top: 20px; border-top: 1px solid var(--gray-200); text-align: center;">
                        <button class="btn btn-primary" onclick="openCompanyModal()">
                            <i class="fas fa-plus"></i> Yeni Firma Ekle
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    
    // Firma listesini yükle
    loadCompanyList();
}

function loadCompanyList() {
    const listContainer = document.getElementById('companySuggestionsList');
    if (!listContainer) return;
    
    const companies = firebaseData.companies || [];
    
    if (companies.length === 0) {
        listContainer.innerHTML = '<div style="text-align: center; padding: 20px; color: var(--gray-500);">Henüz firma kaydı bulunmuyor</div>';
        return;
    }
    
    // Favorileri üste al
    const sortedCompanies = companies.sort((a, b) => {
        if (a.isFavorite && !b.isFavorite) return -1;
        if (!a.isFavorite && b.isFavorite) return 1;
        return a.name.localeCompare(b.name);
    });
    
    listContainer.innerHTML = sortedCompanies.map(company => `
        <div onclick="selectCompanyFromModal('${company.id}')" 
             style="padding: 12px; border: 1px solid var(--gray-200); margin-bottom: 8px; border-radius: 8px; cursor: pointer; transition: all 0.2s;"
             onmouseover="this.style.background='var(--gray-50)'; this.style.borderColor='var(--primary)';"
             onmouseout="this.style.background='white'; this.style.borderColor='var(--gray-200)';">
            <div style="display: flex; justify-content: space-between; align-items: center;">
                <div>
                    <strong style="color: var(--gray-900);">${company.name}</strong>
                    ${company.isFavorite ? '<i class="fas fa-star" style="color: gold; margin-left: 8px;"></i>' : ''}
                    <div style="font-size: 12px; color: var(--gray-600); margin-top: 4px;">
                        Vergi No: ${company.taxNo} ${company.phone ? '| Tel: ' + company.phone : ''}
                    </div>
                </div>
                <i class="fas fa-chevron-right" style="color: var(--gray-400);"></i>
            </div>
        </div>
    `).join('');
}

function filterCompanySuggestions() {
    const search = document.getElementById('companySelectionSearch').value.toLowerCase();
    const listContainer = document.getElementById('companySuggestionsList');
    if (!listContainer) return;
    
    const companies = firebaseData.companies || [];
    
    const filtered = companies.filter(company => 
        company.name.toLowerCase().includes(search) || 
        company.taxNo.includes(search) ||
        (company.phone && company.phone.includes(search))
    );
    
    if (filtered.length === 0) {
        listContainer.innerHTML = '<div style="text-align: center; padding: 20px; color: var(--gray-500);">Arama sonucu bulunamadı</div>';
        return;
    }
    
    // Favorileri üste al
    const sortedFiltered = filtered.sort((a, b) => {
        if (a.isFavorite && !b.isFavorite) return -1;
        if (!a.isFavorite && b.isFavorite) return 1;
        return a.name.localeCompare(b.name);
    });
    
    listContainer.innerHTML = sortedFiltered.map(company => `
        <div onclick="selectCompanyFromModal('${company.id}')" 
             style="padding: 12px; border: 1px solid var(--gray-200); margin-bottom: 8px; border-radius: 8px; cursor: pointer; transition: all 0.2s;"
             onmouseover="this.style.background='var(--gray-50)'; this.style.borderColor='var(--primary)';"
             onmouseout="this.style.background='white'; this.style.borderColor='var(--gray-200)';">
            <div style="display: flex; justify-content: space-between; align-items: center;">
                <div>
                    <strong style="color: var(--gray-900);">${company.name}</strong>
                    ${company.isFavorite ? '<i class="fas fa-star" style="color: gold; margin-left: 8px;"></i>' : ''}
                    <div style="font-size: 12px; color: var(--gray-600); margin-top: 4px;">
                        Vergi No: ${company.taxNo} ${company.phone ? '| Tel: ' + company.phone : ''}
                    </div>
                </div>
                <i class="fas fa-chevron-right" style="color: var(--gray-400);"></i>
            </div>
        </div>
    `).join('');
}

function selectCompanyFromModal(companyId) {
    const company = firebaseData.companies.find(c => c.id === companyId);
    if (!company) {
        showNotification('Hata', 'Firma bulunamadı.', 'error');
        return;
    }
    
    // Hidden input'ları güncelle veya oluştur
    let offerCompanyInput = document.getElementById('offerCompany');
    let offerCompanyIdInput = document.getElementById('offerCompanyId');
    
    if (!offerCompanyInput) {
        offerCompanyInput = document.createElement('input');
        offerCompanyInput.type = 'hidden';
        offerCompanyInput.id = 'offerCompany';
        document.querySelector('.card-body').appendChild(offerCompanyInput);
    }
    
    if (!offerCompanyIdInput) {
        offerCompanyIdInput = document.createElement('input');
        offerCompanyIdInput.type = 'hidden';
        offerCompanyIdInput.id = 'offerCompanyId';
        document.querySelector('.card-body').appendChild(offerCompanyIdInput);
    }
    
    // Değerleri set et
    offerCompanyInput.value = company.name;
    offerCompanyIdInput.value = company.id;
    
    // Butonu güncelle
    const companySelectionBtn = document.getElementById('companySelectionBtn');
    if (companySelectionBtn) {
        companySelectionBtn.innerHTML = `
            <i class="fas fa-building" style="margin-right: 8px; color: var(--primary);"></i>
            <strong>${company.name}</strong> - ${company.taxNo}
        `;
        companySelectionBtn.classList.add('selected');
        companySelectionBtn.style.borderColor = 'var(--primary)';
        companySelectionBtn.style.background = 'var(--primary-light, #f0f0ff)';
    }
    
    // Modalı kapat
    closeModal('companySelectionModal');
    
    showNotification('Firma Seçildi', `${company.name} başarıyla seçildi.`, 'success');
}
async function saveCompany(companyId = null) {
    const name = document.getElementById('companyFormName').value.trim();
    const taxNo = document.getElementById('companyFormTaxNo').value.trim();
    
    if (!name || !taxNo) {
        showNotification('Hata', 'Firma adı ve vergi no zorunludur.', 'error');
        return;
    }
    
    const companyData = {
        name: name,
        shortName: document.getElementById('companyFormShortName').value,
        businessType: document.getElementById('companyFormBusinessType').value,
        customerType: document.getElementById('companyFormType').value,
        sector: document.getElementById('companyFormSector').value,
        employeeCount: document.getElementById('companyFormEmployeeCount').value,
        phone: document.getElementById('companyFormPhone').value,
        phone2: document.getElementById('companyFormPhone2').value,
        fax: document.getElementById('companyFormFax').value,
        email: document.getElementById('companyFormEmail').value,
        website: document.getElementById('companyFormWebsite').value,
        contactPerson: document.getElementById('companyFormContactPerson').value,
        contactPhone: document.getElementById('companyFormContactPhone').value,
        contactEmail: document.getElementById('companyFormContactEmail').value,
        address: document.getElementById('companyFormAddress').value,
        city: document.getElementById('companyFormCity').value,
        district: document.getElementById('companyFormDistrict').value,
        postalCode: document.getElementById('companyFormPostalCode').value,
        country: document.getElementById('companyFormCountry').value,
        taxNo: taxNo,
        taxOffice: document.getElementById('companyFormTaxOffice').value,
        tradeRegNo: document.getElementById('companyFormTradeRegNo').value,
        mersisNo: document.getElementById('companyFormMersisNo').value,
        bankName: document.getElementById('companyFormBankName').value,
        bankBranch: document.getElementById('companyFormBankBranch').value,
        iban: document.getElementById('companyFormIban').value,
        accountNo: document.getElementById('companyFormAccountNo').value,
        creditLimit: parseFloat(document.getElementById('companyFormCreditLimit').value) || 0,
        paymentTerm: parseInt(document.getElementById('companyFormPaymentTerm').value) || 30,
        notes: document.getElementById('companyFormNotes').value,
        acceptsEmailNotifications: document.getElementById('companyFormEmailAccept').checked,
        acceptsSmsNotifications: document.getElementById('companyFormSmsAccept').checked,
        isFavorite: document.getElementById('companyFormFavorite').checked,
        active: document.getElementById('companyFormActive').checked,
        createdAt: companyId ? undefined : new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };
    
    const logoFile = document.getElementById('companyFormLogo').files[0];
    if (logoFile) {
        const reader = new FileReader();
        reader.onload = async function(e) {
            companyData.logo = e.target.result;
            await saveCompanyToFirebase(companyData, companyId);
        };
        reader.readAsDataURL(logoFile);
    } else {
        await saveCompanyToFirebase(companyData, companyId);
    }
}

function showCompanyDetails(companyId) {
    const company = firebaseData.companies.find(c => c.id === companyId);
    if (!company) {
        showNotification('Hata', 'Firma bulunamadı.', 'error');
        return;
    }
    
    const modalHTML = `
        <div id="companyDetailModal" class="modal show">
            <div class="modal-content" style="max-width: 700px;">
                <div class="modal-header">
                    <h3 class="modal-title">Firma Detayları</h3>
                    <button class="modal-close" onclick="closeModal('companyDetailModal')">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="modal-body">
                    <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 10px; margin-bottom: 20px;">
                        <h2>${company.name}</h2>
                        <p style="margin: 5px 0;">Vergi No: ${company.taxNo}</p>
                        <p style="margin: 5px 0;">Tip: ${company.customerType || 'Normal'}</p>
                    </div>
                    
                    <div class="form-grid">
                        <div class="form-group">
                            <label class="form-label">Telefon</label>
                            <input type="text" class="form-control" value="${company.phone || '-'}" readonly>
                        </div>
                        <div class="form-group">
                            <label class="form-label">E-posta</label>
                            <input type="text" class="form-control" value="${company.email || '-'}" readonly>
                        </div>
                        <div class="form-group">
                            <label class="form-label">Web Sitesi</label>
                            <input type="text" class="form-control" value="${company.website || '-'}" readonly>
                        </div>
                        <div class="form-group">
                            <label class="form-label">Yetkili</label>
                            <input type="text" class="form-control" value="${company.contactPerson || '-'}" readonly>
                        </div>
                        <div class="form-group">
                            <label class="form-label">Vergi Dairesi</label>
                            <input type="text" class="form-control" value="${company.taxOffice || '-'}" readonly>
                        </div>
                        <div class="form-group">
                            <label class="form-label">Kredi Limiti</label>
                            <input type="text" class="form-control" value="${company.creditLimit ? company.creditLimit + ' $' : '-'}" readonly>
                        </div>
                    </div>
                    
                    <div class="form-group">
                        <label class="form-label">Adres</label>
                        <textarea class="form-control" readonly rows="3">${company.address || '-'}</textarea>
                    </div>
                    
                    ${company.notes ? `
                    <div class="form-group">
                        <label class="form-label">Notlar</label>
                        <textarea class="form-control" readonly rows="3">${company.notes}</textarea>
                    </div>
                    ` : ''}
                </div>
                <div class="modal-footer">
                    <button class="btn btn-primary" onclick="openCompanyModal('${companyId}')">
                        <i class="fas fa-edit"></i> Düzenle
                    </button>
                    <button class="btn btn-outline" onclick="closeModal('companyDetailModal')">Kapat</button>
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHTML);
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
    if (isMobileDevice()) {
        // Tüm butonları görünür kıl
        document.querySelectorAll('.action-btn, .btn').forEach(btn => {
            btn.style.display = 'inline-block';
            btn.style.visibility = 'visible';
        });
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
    applyMobileOptimizations('notifications');
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
     // Sadece admin erişebilir
    if (!currentUser || (currentUser.role !== 'admin' && !hasPermission('admin'))) {
        showNotification('Erişim reddedildi', 'Bu sayfaya erişim yetkiniz bulunmamaktadır', 'error');
        showPage('raporlar'); // Ana raporlar sayfasına yönlendir
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
                        timeSpent: parseFloat(approval.timeSpent),
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
                            timeSpent: parseFloat(record.timeSpent),
                            status: prod.status,
                            type: 'Çalışma Kaydı'
                        });
                    }
                }
            });
            
            // Bu üretimde çalışması varsa ekle
            userProductions.push(...userWorkInThisProduction);
        });
        
        // Tarihe göre grupla
        const groupedByDate = {};
        userProductions.forEach(prod => {
            if (!groupedByDate[prod.date]) {
                groupedByDate[prod.date] = [];
            }
            groupedByDate[prod.date].push(prod);
        });
        
        // Tarihe göre sırala
        userProductions.sort((a, b) => {
            const dateA = a.date.split('.').reverse().join('-');
            const dateB = b.date.split('.').reverse().join('-');
            return new Date(dateB) - new Date(dateA);
        });
        
        const totalHours = userProductions.reduce((sum, p) => sum + p.timeSpent, 0);
        
        // Bölüm istatistikleri
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
                                        <th>Tarih</th>
                                        <th>İş Emri No</th>
                                        <th>Ürün</th>
                                        <th>Bölüm</th>
                                        <th>Çalışma Süresi</th>
                                        <th>Günlük Toplam</th>
                                        <th>Detay</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${Object.entries(groupedByDate).map(([date, dayProductions]) => {
                                        const dayTotal = dayProductions.reduce((sum, p) => sum + p.timeSpent, 0);
                                        return dayProductions.map((prod, index) => `
                                            <tr onclick="${index === 0 ? `showWorkDetails('${userId}', '${date}')` : ''}" 
                                                style="${index === 0 ? 'cursor: pointer;' : ''}">
                                                <td>${index === 0 ? prod.date : ''}</td>
                                                <td><strong>${prod.orderNo}</strong></td>
                                                <td>${prod.product}</td>
                                                <td><span class="badge primary">${prod.department}</span></td>
                                                <td><strong>${prod.timeSpent.toFixed(1)} saat</strong></td>
                                                <td>${index === 0 ? `<strong style="color: var(--primary);">${dayTotal.toFixed(1)} saat</strong>` : ''}</td>
                                                <td>
                                                    ${index === 0 ? `
                                                    <button class="btn btn-sm btn-info" onclick="event.stopPropagation(); showWorkDetails('${userId}', '${date}')">
                                                        <i class="fas fa-eye"></i>
                                                    </button>` : ''}
                                                </td>
                                            </tr>
                                        `).join('');
                                    }).join('')}
                                </tbody>
                                <tfoot>
                                    <tr style="background: var(--gray-50); font-weight: bold;">
                                        <td colspan="5">GENEL TOPLAM</td>
                                        <td style="color: var(--primary);">${totalHours.toFixed(1)} saat</td>
                                        <td></td>
                                    </tr>
                                </tfoot>
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

// Modal kapatma fonksiyonunu düzelt
function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('show');
        setTimeout(() => {
            modal.remove();
        }, 300);
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
    applyMobileOptimizations('sevkiyatEdilen');
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
            (additionalNote ? `\nadmin notu: ${additionalNote}` : '');
        
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
        
        ${note ? `admin Notu: ${note}` : ''}
        
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



// Çalışma detayları modalı
function showWorkDetails(userId, date) {
    const user = firebaseData.users.find(u => u.id === userId);
    const dayActivities = [];
    
    firebaseData.production.forEach(prod => {
        (prod.approvals || []).forEach(approval => {
            if (approval.userId === userId && approval.date === date) {
                dayActivities.push({
                    time: approval.approvedAt ? new Date(approval.approvedAt).toLocaleTimeString('tr-TR') : '-',
                    orderNo: prod.orderNo,
                    product: prod.product,
                    department: approval.department,
                    timeSpent: parseFloat(approval.timeSpent) || 0,
                    type: 'Onay'
                });
            }
        });
        
        (prod.workTimeRecords || []).forEach(record => {
            if (record.userId === userId && record.date === date) {
                dayActivities.push({
                    time: record.createdAt ? new Date(record.createdAt).toLocaleTimeString('tr-TR') : '-',
                    orderNo: record.orderNo || prod.orderNo,
                    product: prod.product,
                    department: record.department,
                    timeSpent: parseFloat(record.timeSpent) || 0,
                    type: 'Çalışma'
                });
            }
        });
    });
    
    const totalHours = dayActivities.reduce((sum, a) => sum + a.timeSpent, 0);
    
    const modalHTML = `
        <div id="workDetailsModal" class="modal show" style="z-index: 10001;">
            <div class="modal-content" style="max-width: 700px;">
                <div class="modal-header">
                    <h3 class="modal-title">${user.name} - ${date} Tarihli Çalışma Detayları</h3>
                    <button class="modal-close" onclick="closeModal('workDetailsModal')">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="modal-body">
                    <div style="background: var(--primary); color: white; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
                        <div style="font-size: 24px; font-weight: bold;">${totalHours.toFixed(1)} saat</div>
                        <div style="font-size: 14px;">Günlük Toplam Çalışma</div>
                    </div>
                    
                    <table class="table">
                        <thead>
                            <tr>
                                <th>Saat</th>
                                <th>İş Emri</th>
                                <th>Ürün</th>
                                <th>Bölüm</th>
                                <th>Süre</th>
                                <th>Tip</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${dayActivities.map(activity => `
                                <tr>
                                    <td>${activity.time}</td>
                                    <td><strong>${activity.orderNo}</strong></td>
                                    <td>${activity.product}</td>
                                    <td><span class="badge primary">${activity.department}</span></td>
                                    <td><strong>${activity.timeSpent.toFixed(1)} saat</strong></td>
                                    <td><span class="badge ${activity.type === 'Onay' ? 'success' : 'info'}">${activity.type}</span></td>
                                </tr>
                            `).join('')}
                        </tbody>
                        <tfoot>
                            <tr style="background: var(--gray-50); font-weight: bold;">
                                <td colspan="4">TOPLAM</td>
                                <td>${totalHours.toFixed(1)} saat</td>
                                <td></td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-outline" onclick="closeModal('workDetailsModal')">Kapat</button>
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHTML);
}


// Mobile menu toggle - script.js dosyanızın sonuna ekleyin
function toggleMobileMenu() {
    const sidebar = document.querySelector('.sidebar');
    const overlay = document.querySelector('.sidebar-overlay');
    
    sidebar.classList.toggle('mobile-active');
    overlay.classList.toggle('active');
}

// Overlay'e tıklandığında menüyü kapat
document.addEventListener('DOMContentLoaded', function() {
    // Overlay elementi oluştur
    const overlay = document.createElement('div');
    overlay.className = 'sidebar-overlay';
    overlay.onclick = toggleMobileMenu;
    document.body.appendChild(overlay);
    
    // Mobile menu button ekle
    const menuBtn = document.createElement('button');
    menuBtn.className = 'mobile-menu-toggle';
    menuBtn.innerHTML = '<i class="fas fa-bars"></i>';
    menuBtn.onclick = toggleMobileMenu;
    document.querySelector('.navbar').prepend(menuBtn);
});


// Edit butonları için genel fonksiyon
function createEditButton(type, id, isMobile = false) {
    const buttonClass = isMobile ? 'btn btn-sm btn-primary' : 'action-btn edit';
    const iconOnly = !isMobile;
    
    return `
        <button class="${buttonClass}" onclick="edit${type}('${id}')" title="Düzenle">
            <i class="fas fa-edit"></i>
            ${!iconOnly ? ' Düzenle' : ''}
        </button>
    `;
}

// Mobil kontrolü
function isMobileDevice() {
    return window.innerWidth <= 768;
}


function optimizeMobileDisplay() {
    if (window.innerWidth <= 768) {
        document.querySelectorAll('.action-buttons, .action-btn, .btn, .preview-btn, .edit-btn').forEach(element => {
            element.style.display = 'inline-flex';
            element.style.visibility = 'visible';
            element.style.opacity = '1';
            element.style.width = 'auto';
            element.style.margin = '4px';
            element.style.padding = '6px 10px';
            element.style.fontSize = '12px';
        });

        document.querySelectorAll('.table td:last-child').forEach(cell => {
            cell.style.display = 'table-cell';
        });

        document.querySelectorAll('.modal-content').forEach(modal => {
            modal.style.width = '96vw';
            modal.style.maxHeight = '92vh';
        });
    }
}

function applyMobileOptimizations(pageId) {
    optimizeMobileDisplay();

    if (pageId === 'uretimListesi') {
        document.querySelectorAll('#productionListTable .action-buttons').forEach(btnGroup => {
            btnGroup.style.display = 'flex';
            btnGroup.style.flexDirection = 'row';
            btnGroup.style.gap = '4px';
            btnGroup.style.justifyContent = 'center';
        });
    }

    if (pageId === 'sevkiyatEdilen' || pageId === 'sevkiyatBekleyen') {
        const table = document.getElementById(`${pageId}Table`);
        const message = document.getElementById(`${pageId}Message`);
        if (table && message) {
            table.style.display = 'table';
            message.style.display = 'none';
        }
    }

    if (pageId === 'isEmriVer') {
        document.querySelectorAll('#recipePreview, #stockStatus, #latestOrders').forEach(el => {
            el.style.display = 'block';
            el.style.margin = '8px 0';
            el.style.padding = '8px';
            el.style.border = '1px solid #e5e7eb';
            el.style.borderRadius = '6px';
        });
    }

    if (pageId === 'teklifHazirla') {
        document.querySelectorAll('#offerProductsTable select, #offerProductsTable input').forEach(input => {
            input.style.fontSize = '12px';
            input.style.padding = '6px';
        });
    }

    if (pageId === 'notifications') {
        document.querySelectorAll('.notification-item').forEach(item => {
            item.style.padding = '6px';
            item.style.fontSize = '11px';
        });
    }

    if (pageId === 'insanKaynaklari') {
        document.querySelectorAll('.leave-type-card').forEach(card => {
            card.style.padding = '6px';
            card.style.fontSize = '10px';
        });
    }
}

// Sidebar görünümünü güncelle - Manager sadece izin verilen bölümleri görür
function updateSidebarPermissions() {
    if (!currentUser) return;
    
    // Tüm bölümleri gizle
    const allSections = ['salesSection', 'productSection', 'productionSection', 'operationSection', 'adminSection'];
    allSections.forEach(section => {
        const element = document.getElementById(section);
        if (element) element.style.display = 'none';
    });
    
    // Admin ise hepsini göster
    if (currentUser.role === 'admin') {
        allSections.forEach(section => {
            const element = document.getElementById(section);
            if (element) element.style.display = 'block';
        });
        return;
    }
    
    // Manager dahil diğer roller için sadece yetkili oldukları bölümler
    if (hasPermission('sales')) {
        const element = document.getElementById('salesSection');
        if (element) element.style.display = 'block';
    }
    
    if (hasPermission('products')) {
        const element = document.getElementById('productSection');
        if (element) element.style.display = 'block';
    }
    
    if (hasPermission('production')) {
        const element = document.getElementById('productionSection');
        if (element) element.style.display = 'block';
    }
    
    if (hasPermission('warehouse') || hasPermission('logistics')) {
        const element = document.getElementById('operationSection');
        if (element) element.style.display = 'block';
    }
    
    // Admin bölümü sadece admin görebilir, manager göremez
    if (hasPermission('admin')) {
        const element = document.getElementById('adminSection');
        if (element) element.style.display = 'block';
    }
}
function updateRawMaterialQuantity(productionId, rmId, newQuantity) {
    // Geçici olarak değeri sakla
    // saveProductionRawMaterials çağrıldığında kaydedilecek
    const input = event.target;
    input.setAttribute('data-changed', 'true');
    console.log(`Hammadde ${rmId} için yeni miktar: ${newQuantity}`);
}

// ========================================
// GLOBAL EXPORTS - EN SONDA OLMALI
// ========================================

// Tüm fonksiyonları global alana aktar
window.addEventListener('resize', () => {
    optimizeMobileDisplay();
    applyMobileOptimizations(currentPage);});
window.optimizeMobileDisplay = optimizeMobileDisplay;
window.applyMobileOptimizations = applyMobileOptimizations;
window.updateRawMaterials = updateRawMaterials;
window.updatePriceFromProduct = updatePriceFromProduct;
window.calculateRequiredMaterials = calculateRequiredMaterials;
window.showWorkDetails = showWorkDetails;
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
window.hasPermission = hasPermission;
window.canAccessPage = canAccessPage;
window.updateSidebarPermissions = updateSidebarPermissions;
window.openProductionRawMaterialModal = openProductionRawMaterialModal;
window.addRawMaterialToProduction = addRawMaterialToProduction;
window.removeRawMaterialFromProductionModal = removeRawMaterialFromProductionModal;
window.saveProductionRawMaterials = saveProductionRawMaterials;
window.updateRawMaterialQuantity = updateRawMaterialQuantity;
window.openCompanyModal = openCompanyModal;
window.switchCompanyTab = switchCompanyTab;
window.saveCompany = saveCompany;
window.saveCompanyToFirebase = saveCompanyToFirebase;
window.showCompanyDetails = showCompanyDetails;
window.deleteCompany = deleteCompany;
window.addProduct = addProduct;
window.editProduct = editProduct;
window.saveProduct = saveProduct;
window.showProductDetails = showProductDetails;
window.removeRawMaterialFromProduction = removeRawMaterialFromProduction;
window.switchCompanyTab = switchCompanyTab;
window.openCompanyModal = openCompanyModal;
window.saveCompany = saveCompany;
window.saveCompanyToFirebase = saveCompanyToFirebase;
window.showCompanyDetails = showCompanyDetails;
window.deleteCompany = deleteCompany;
window.closeModal = closeModal;
window.editOfferModal = editOfferModal;
window.calculateEditOfferTotal = calculateEditOfferTotal;
window.updateOffer = updateOffer;
window.addProductToEditOffer = addProductToEditOffer;
window.convertToProduction = convertToProduction;
window.previewSavedOffer = previewSavedOffer;
window.addProductionItem = addProductionItem;
window.updateProductFromRecipe = updateProductFromRecipe;
window.createMultipleJobOrders = createMultipleJobOrders;
window.filterOffers = filterOffers;
window.clearOfferFilters = clearOfferFilters;
window.renderOffersTable = renderOffersTable;
window.showAllOffers = showAllOffers;
window.createProductRow = createProductRow;
window.addProductToJobOrder = addProductToJobOrder;
window.createSingleJobOrder = createSingleJobOrder;
window.updateRecipeDetails = updateRecipeDetails;
window.addNewUser = addNewUser;
window.createJobOrderProductRow = createJobOrderProductRow;
window.showRecipeDetailModal = showRecipeDetailModal;
window.addProduct = addProduct;
window.addRecipe = addRecipe;
window.addStock = addStock;
window.saveSimpleRecipe = saveSimpleRecipe;
window.updateProductFromRecipeAndDetails = updateProductFromRecipeAndDetails;
window.filterRawMaterialCheckboxes = filterRawMaterialCheckboxes;
window.updateSelectedRawMaterialCount = updateSelectedRawMaterialCount;
window.clearRawMaterialSelection = clearRawMaterialSelection;
window.saveRecipeWithCheckboxes = saveRecipeWithCheckboxes;
window.showRecipeDetails = showRecipeDetails;
window.editProduct = editProduct;
window.editRecipe = editRecipe;
window.toggleTempRawMaterial = toggleTempRawMaterial;
window.removeFromTempRawMaterials = removeFromTempRawMaterials;
window.clearTempRawMaterials = clearTempRawMaterials;
window.selectAllRawMaterials = selectAllRawMaterials;
window.selectCriticalRawMaterials = selectCriticalRawMaterials;
window.filterEditRawMaterialCheckboxes = filterEditRawMaterialCheckboxes;
window.updateEditRecipeDisplay = updateEditRecipeDisplay;
window.saveEditedRecipe = saveEditedRecipe;

console.log('✅ Tüm fonksiyonlar global alana aktarıldı');