// admin.js - Admin Panel Fonksiyonları

// Admin Panel Ana Yükleme Fonksiyonu
// admin.js - loadAdmin güncelleniyor
async function loadAdmin() {
    if (!window.currentUser || (window.currentUser.role !== 'admin' && !hasPermission('admin'))) {
        showNotification('Erişim reddedildi', 'Bu sayfaya erişim yetkiniz bulunmamaktadır', 'error');
        showPage('dashboard');
        return;
    }
    
    // Firebase'den güncel veriyi çek
    await loadFirebaseData();
    await loadMainCategories();
    
    // firebaseData kontrolü
    if (!window.firebaseData.anaKategoriler) window.firebaseData.anaKategoriler = [];
    if (!window.firebaseData.altKategoriler) window.firebaseData.altKategoriler = [];
    
    const content = `
        <div class="page-header">
            <h1 class="page-title"><i class="fas fa-shield-alt"></i> Admin Panel</h1>
            <p class="page-subtitle">Sistem ve kullanıcı ayarlarını yönetin</p>
        </div>
        
        <!-- Kategori Yönetimi Bölümü -->
        <div class="card" id="adminPanel">
            <div class="card-header">
                <h3 class="card-title"><i class="fas fa-layer-group"></i> Stok Kartı Kategori Yönetimi</h3>
                <p class="card-subtitle">Ana kategoriler ve modal ayarları</p>
            </div>
            <div class="card-body">
                <div class="tabs">
                    <button class="tab active" onclick="switchAdminTab(this, 'mainCategories')">
                        <i class="fas fa-folder"></i> Ana Kategoriler
                    </button>
                    <button class="tab" onclick="switchAdminTab(this, 'modalFields')">
                        <i class="fas fa-form"></i> Modal Alanları
                    </button>
                </div>
                
                <div id="mainCategories" class="tab-content active">
                    <button class="btn btn-primary" onclick="addMainCategory()" style="margin-bottom: 20px;">
                        <i class="fas fa-plus"></i> Yeni Kategori Ekle
                    </button>
                    <div id="categoriesListContainer"></div>
                </div>
                
                <div id="modalFields" class="tab-content" style="display: none;">
                    <div id="modalFieldsContainer">
                        <p style="text-align: center; color: var(--gray-500); padding: 40px;">
                            Önce kategoriler sekmesinden bir kategori seçin ve 
                            <i class="fas fa-cog"></i> butonuna tıklayın
                        </p>
                    </div>
                </div>
            </div>
        </div>


        <!-- Boyut ve Fiyat Yönetimi Bölümü -->
<div class="card">
    <div class="card-header">
        <h3 class="card-title"><i class="fas fa-ruler-combined"></i> Ürün Boyut ve Fiyat Yönetimi</h3>
        <p class="card-subtitle">Ürün boyutları ve fiyatlandırma ayarları</p>
    </div>
    <div class="card-body">
        <div class="tabs">
            <button class="tab active" onclick="switchSizeTab(this, 'sizeManagement')">
                <i class="fas fa-ruler"></i> Boyut Tanımları
            </button>
            <button class="tab" onclick="switchSizeTab(this, 'sizePricing')">
                <i class="fas fa-dollar-sign"></i> Boyut Fiyatlandırma
            </button>
            <button class="tab" onclick="switchSizeTab(this, 'priceIncrease')">
                <i class="fas fa-chart-line"></i> Toplu Zam Yap
            </button>
        </div>
        
        <!-- Boyut Tanımları Sekmesi -->
        <div id="sizeManagement" class="tab-content active">
            <button class="btn btn-primary" onclick="addNewSize()" style="margin-bottom: 20px;">
                <i class="fas fa-plus"></i> Yeni Boyut Ekle
            </button>
            <div class="table-container">
                <table class="table">
                    <thead>
                        <tr>
                            <th>Boyut Adı</th>
                            <th>Varsayılan Fiyat ($)</th>
                            <th>Açıklama</th>
                            <th>Durum</th>
                            <th>İşlemler</th>
                        </tr>
                    </thead>
                    <tbody id="sizesTableBody">
                        <!-- Boyutlar buraya yüklenecek -->
                    </tbody>
                </table>
            </div>
        </div>
        
        <!-- Boyut Fiyatlandırma Sekmesi -->
        <div id="sizePricing" class="tab-content" style="display: none;">
            <div class="alert alert-info" style="margin-bottom: 20px;">
                <i class="fas fa-info-circle"></i> 
                Her boyut için kategori bazlı özel fiyatlar tanımlayabilirsiniz.
            </div>
            <div id="categoryPricingContainer">
                <!-- Kategori bazlı fiyatlandırma buraya yüklenecek -->
            </div>
        </div>
        
        <!-- Toplu Zam Sekmesi -->
        <div id="priceIncrease" class="tab-content" style="display: none;">
            <div class="alert alert-warning" style="margin-bottom: 20px;">
                <i class="fas fa-exclamation-triangle"></i>
                <strong>Dikkat:</strong> Bu işlem tüm boyut fiyatlarını kalıcı olarak değiştirir!
            </div>
            <div class="form-grid">
                <div class="form-group">
                    <label class="form-label">Zam Oranı (%)</label>
                    <input type="number" class="form-control" id="priceIncreaseRate" placeholder="Örn: 10" min="0" max="100" step="0.1">
                    <small class="text-muted">Pozitif değer zam, negatif değer indirim yapar</small>
                </div>
                <div class="form-group">
                    <label class="form-label">Önizleme</label>
                    <div id="priceIncreasePreview" style="padding: 15px; background: var(--gray-50); border-radius: 8px; min-height: 60px;">
                        <span style="color: var(--gray-500);">Zam oranı girin ve hesapla butonuna tıklayın</span>
                    </div>
                </div>
            </div>
            <div style="display: flex; gap: 10px; margin-top: 20px;">
                <button class="btn btn-info" onclick="calculatePriceIncrease()">
                    <i class="fas fa-calculator"></i> Hesapla ve Önizle
                </button>
                <button class="btn btn-success" onclick="applyPriceIncrease()" style="display: none;" id="applyIncreaseBtn">
                    <i class="fas fa-check"></i> Zamı Uygula
                </button>
            </div>
        </div>
    </div>
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
                        <div class="stat-value">${window.firebaseData.production.length + window.firebaseData.offers.length + window.firebaseData.shipments.length}</div>
                        <div class="stat-label">Toplam İşlem Kaydı</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-icon success"><i class="fas fa-calendar"></i></div>
                        <div class="stat-value">2025</div>
                        <div class="stat-label">Aktif Yıl</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-icon warning"><i class="fas fa-database"></i></div>
                        <div class="stat-value">${(window.firebaseData.users.length + window.firebaseData.products.length + window.firebaseData.stock.length + window.firebaseData.companies.length + window.firebaseData.recipes.length + window.firebaseData.production.length + window.firebaseData.offers.length + window.firebaseData.shipments.length + window.firebaseData.anaKategoriler.length + window.firebaseData.altKategoriler.length)}</div>
                        <div class="stat-label">Toplam Kayıt</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-icon info"><i class="fas fa-hdd"></i></div>
                        <div class="stat-value">${Math.round(JSON.stringify(window.firebaseData).length / 1024)} KB</div>
                        <div class="stat-label">Veri Boyutu</div>
                    </div>
                </div>
                <div style="margin-top: 20px; display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 20px;">
                    <div style="border: 2px solid var(--primary); border-radius: 10px; padding: 20px;">
                        <h4 style="margin-bottom: 10px;"><i class="fas fa-database"></i> Tam Yedekleme</h4>
                        <p style="color: var(--gray-600); font-size: 14px; margin-bottom: 15px;">Tüm sistem verilerini ZIP formatında indirin</p>
                        <button class="btn btn-primary" onclick="exportAllData()">
                            <i class="fas fa-file-archive"></i> ZIP Olarak İndir
                        </button>
                    </div>
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
                            <label style="cursor: pointer;"><input type="checkbox" name="dataType" value="anaKategoriler" style="margin-right: 5px;"> Ana Kategoriler</label>
                            <label style="cursor: pointer;"><input type="checkbox" name="dataType" value="altKategoriler" style="margin-right: 5px;"> Alt Kategoriler</label>
                        </div>
                        <button class="btn btn-success" onclick="exportSelectedData()">
                            <i class="fas fa-file-archive"></i> Seçili Verileri İndir
                        </button>
                    </div>
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
                        <input type="text" class="form-control" value="FZA-ERP" readonly>
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
                        <p class="card-subtitle">Toplam ${window.firebaseData.users.length} kullanıcı</p>
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
                                <th>Ad Soyad</th>
                                <th>Kullanıcı Adı</th>
                                <th>Departman</th>
                                <th>Yetkiler</th>
                                <th>Durum</th>
                                <th>İşlemler</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${window.firebaseData.users.map(user => `
                                <tr>
                                    <td><strong>${user.name}</strong></td>
                                    <td>${user.username}</td>
                                    <td><span class="badge ${user.role === 'admin' ? 'danger' : user.role === 'manager' ? 'warning' : 'info'}">${getRoleDisplayName(user.role)}</span></td>
                                    <td>
                                        <div style="display: flex; flex-wrap: wrap; gap: 4px;">
                                            ${(user.permissions || []).slice(0, 3).map(perm => 
                                                `<span class="badge ${perm === 'admin' ? 'danger' : 'success'}">${perm}</span>`
                                            ).join('')}
                                            ${user.permissions && user.permissions.length > 3 ? 
                                                `<span class="badge warning">+${user.permissions.length - 3}</span>` : ''
                                            }
                                        </div>
                                    </td>
                                    <td>
                                        <span class="badge ${user.active !== false ? 'success' : 'danger'}">
                                            ${user.active !== false ? 'Aktif' : 'Pasif'}
                                        </span>
                                    </td>
                                    <td>
                                        <div class="action-buttons">
                                            <button class="action-btn edit" onclick="editUser('${user.id}')">
                                                <i class="fas fa-edit"></i>
                                            </button>
                                            <button class="action-btn delete" onclick="deleteUser('${user.id}')" 
                                                ${user.username === 'furkan' ? 'disabled style="opacity: 0.5; cursor: not-allowed;"' : ''}>
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
    
    // Kategorileri listele
    loadCategoriesList();
}

// Admin tab değiştirme
function switchAdminTab(button, tabId) {
    document.querySelectorAll('#adminPanel .tab').forEach(tab => tab.classList.remove('active'));
    document.querySelectorAll('#adminPanel .tab-content').forEach(content => content.style.display = 'none');
    
    button.classList.add('active');
    const tabContent = document.getElementById(tabId);
    if (tabContent) {
        tabContent.style.display = 'block';
        
        if (tabId === 'modalFields') {
            loadModalFieldsManager();
        }
    }
}

// Ana kategori ekle
function addMainCategory() {
    // Önce mevcut modalları temizle
    const existingModal = document.getElementById('categoryModal');
    if (existingModal) {
        existingModal.remove();
    }
    
    const modalHTML = `
        <div id="categoryModal" class="modal show">
            <div class="modal-content" style="max-width: 500px;">
                <div class="modal-header">
                    <h3 class="modal-title">Yeni Ana Kategori</h3>
                    <button class="modal-close" onclick="closeCategoryModal()">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="modal-body">
                    <form id="categoryForm" onsubmit="event.preventDefault();">
                        <div class="form-group">
                            <label class="form-label">Kategori Adı</label>
                            <input type="text" class="form-control" id="categoryName" required>
                        </div>
                        <div class="form-group">
                            <label class="form-label">İkon (Font Awesome)</label>
                            <input type="text" class="form-control" id="categoryIcon" placeholder="fa-folder" value="fa-folder">
                        </div>
                        <div class="form-group">
                            <label class="form-label">Açıklama</label>
                            <textarea class="form-control" id="categoryDescription" rows="3"></textarea>
                        </div>
                    </form>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-success" onclick="saveMainCategory()">
                        <i class="fas fa-save"></i> Kaydet
                    </button>
                    <button class="btn btn-outline" onclick="closeCategoryModal()">İptal</button>
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    
    // Input'a focus ver
    setTimeout(() => {
        document.getElementById('categoryName')?.focus();
    }, 100);
}

// Kategori kaydet

// admin.js - Güncellenen: saveMainCategory()
async function saveMainCategory(categoryId = null) {
    const nameInput = document.getElementById('categoryName');
    const iconInput = document.getElementById('categoryIcon');
    const descInput = document.getElementById('categoryDescription');
    
    // Input değerlerini kontrol et
    if (!nameInput || !iconInput || !descInput) {
        console.error('Form elementleri bulunamadı');
        return;
    }
    
    const name = nameInput.value.trim();
    const icon = iconInput.value.trim() || 'fa-folder';
    const description = descInput.value.trim();
    
    if (!name) {
        showNotification('Hata', 'Kategori adı zorunludur', 'error');
        return;
    }
    
    // Modal'ı hemen kapat
    const modal = document.getElementById('categoryModal');
    if (modal) {
        modal.remove();
    }
    
    try {
        const categoryData = {
            name: name,
            icon: icon,
            description: description || null,
            updatedAt: new Date().toISOString()
        };
        
        let newCategoryId;
        if (categoryId) {
            // Güncelleme
            const stockCards = await window.firestoreService.getStockCards();
            categoryData.itemCount = stockCards.filter(c => c.mainCategoryId === categoryId).length;
            
            await window.firestoreService.updateMainCategory(categoryId, categoryData);
            newCategoryId = categoryId;
            showNotification('Başarılı', 'Kategori güncellendi', 'success');
        } else {
            // Yeni ekleme
            categoryData.itemCount = 0;
            categoryData.createdAt = new Date().toISOString();
            newCategoryId = await window.firestoreService.addMainCategory(categoryData);
            showNotification('Başarılı', 'Kategori eklendi', 'success');
        }
        
        // Kategorileri yeniden yükle (await ile bekle)
        await loadMainCategories();
        
        // Liste güncellemesini bekle
        await loadCategoriesList();
        
        // Stok kartı sayfası açıksa güncelle
        if (window.currentPage === 'stockCards') {
            loadStockCards();
        }
        
    } catch (error) {
        console.error('Kategori kaydetme hatası:', error);
        showNotification('Hata', 'Kategori kaydedilemedi: ' + error.message, 'error');
    }
}
// Kategorileri listele
async function loadCategoriesList() {
    try {
        const categories = await window.firestoreService.getMainCategories();
        const container = document.getElementById('categoriesListContainer');
        
        if (!container) {
            console.error('Kategori listesi container bulunamadı');
            return;
        }
        
        if (!categories || categories.length === 0) {
            container.innerHTML = '<p style="text-align: center; color: var(--gray-500);">Henüz kategori eklenmemiş</p>';
            return;
        }
        
        // Stok kartlarını bir kere çek
        const stockCards = await window.firestoreService.getStockCards();
        
        container.innerHTML = `
            <div class="table-container">
                <table class="table">
                    <thead>
                        <tr>
                            <th>İkon</th>
                            <th>Kategori Adı</th>
                            <th>Açıklama</th>
                            <th>Kayıt Sayısı</th>
                            <th>İşlemler</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${categories.map(cat => {
                            const itemCount = stockCards.filter(card => card.mainCategoryId === cat.id).length;
                            return `
                                <tr>
                                    <td><i class="fas ${cat.icon || 'fa-folder'}" style="font-size: 20px; color: var(--primary);"></i></td>
                                    <td><strong>${cat.name}</strong></td>
                                    <td>${cat.description || '-'}</td>
                                    <td><span class="badge info">${itemCount}</span></td>
                                    <td>
                                        <div class="action-buttons">
                                            <button class="action-btn edit" onclick="editMainCategory('${cat.id}')">
                                                <i class="fas fa-edit"></i>
                                            </button>
                                            <button class="action-btn primary" onclick="configureModalFields('${cat.id}')">
                                                <i class="fas fa-cog"></i>
                                            </button>
                                            <button class="action-btn delete" onclick="deleteMainCategory('${cat.id}')">
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
        `;
    } catch (error) {
        console.error('Kategoriler yüklenemedi:', error);
        const container = document.getElementById('categoriesListContainer');
        if (container) {
            container.innerHTML = '<p style="color: var(--danger);">Kategoriler yüklenirken hata oluştu</p>';
        }
    }
}

// Modal alanlarını yapılandır
async function configureModalFields(categoryId) {
    console.log('Modal alanları yapılandırılıyor:', categoryId);
    
    // Modal alanları sekmesine geç
    document.querySelectorAll('#adminPanel .tab').forEach(tab => tab.classList.remove('active'));
    document.querySelectorAll('#adminPanel .tab-content').forEach(content => content.style.display = 'none');
    
    // Sekmeyi aktif et
    const modalFieldsTab = document.querySelector('[onclick*="modalFields"]');
    if (modalFieldsTab) {
        modalFieldsTab.classList.add('active');
    }
    
    const modalFieldsContent = document.getElementById('modalFields');
    if (modalFieldsContent) {
        modalFieldsContent.style.display = 'block';
    }
    
    // Modal alanlarını yükle
    await loadModalFieldsForCategory(categoryId);
}

// Kategori için modal alanlarını yükle
async function loadModalFieldsForCategory(categoryId) {
    console.log('Modal alanları yükleniyor:', categoryId);
    
    try {
        const category = window.mainCategories?.find(c => c.id === categoryId);
        if (!category) {
            console.error('Kategori bulunamadı:', categoryId);
            return;
        }
        
        const container = document.getElementById('modalFieldsContainer');
        if (!container) {
            console.error('Modal fields container bulunamadı');
            return;
        }
        
        // Mevcut modal alanlarını al
        let categoryFields = [];
        try {
            const result = await window.firestoreService.getCategoryModalFields(categoryId);
            console.log('Firebase\'den gelen veri:', result); // Debug için
            
            if (Array.isArray(result)) {
                categoryFields = result;
            } else if (result && typeof result === 'object') {
                categoryFields = Object.values(result);
            } else {
                categoryFields = [];
            }
        } catch (error) {
            console.log('Kategori modal alanları bulunamadı, yeni liste oluşturuluyor:', error);
            categoryFields = [];
        }
        
        container.innerHTML = `
            <div class="category-modal-manager">
                <div class="manager-header">
                    <h4>
                        <i class="fas ${category.icon || 'fa-folder'}"></i>
                        ${category.name} - Modal Alanları
                    </h4>
                    <p class="text-muted">Bu kategoriye özel form alanları tanımlayın</p>
                </div>
                
                <div class="manager-actions" style="margin: 20px 0;">
                    <button class="btn btn-primary" onclick="addModalFieldToCategory('${categoryId}')">
                        <i class="fas fa-plus"></i> Yeni Alan Ekle
                    </button>
                </div>
                
                <div class="modal-fields-list" id="categoryFieldsList_${categoryId}">
                    <!-- Modal alanları burada listelenecek -->
                </div>
            </div>
        `;
        
        // Modal alanlarını listele
        displayCategoryModalFields(categoryId, categoryFields);
        
    } catch (error) {
        console.error('Modal alanları yükleme hatası:', error);
        const container = document.getElementById('modalFieldsContainer');
        if (container) {
            container.innerHTML = `
                <div class="alert alert-danger">
                    <i class="fas fa-exclamation-triangle"></i>
                    Modal alanları yüklenirken hata oluştu: ${error.message}
                </div>
            `;
        }
    }
}
function displayCategoryModalFields(categoryId, fields) {
    console.log('Modal alanları görüntüleniyor:', categoryId, fields);
    
    const container = document.getElementById(`categoryFieldsList_${categoryId}`);
    if (!container) {
        console.error('Kategori alanları listesi bulunamadı:', categoryId);
        return;
    }
    
    // fields'ın array olduğundan emin ol ve her field'ın gerekli alanları olsun
    let fieldsArray = [];
    if (Array.isArray(fields)) {
        fieldsArray = fields.filter(field => field && field.id && field.label);
    } else if (fields && typeof fields === 'object') {
        fieldsArray = Object.values(fields).filter(field => field && field.id && field.label);
    }
    
    console.log('Filtrelenmiş alanlar:', fieldsArray);
    
    if (fieldsArray.length === 0) {
        container.innerHTML = `
            <div class="empty-state" style="text-align: center; padding: 40px; color: var(--gray-500);">
                <i class="fas fa-inbox" style="font-size: 48px; margin-bottom: 20px;"></i>
                <h5>Henüz alan tanımlanmamış</h5>
                <p>Bu kategori için özel form alanları eklemek için "Yeni Alan Ekle" butonunu kullanın.</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = `
        <div class="table-container">
            <table class="table">
                <thead>
                    <tr>
                        <th>Alan ID</th>
                        <th>Etiket</th>
                        <th>Tip</th>
                        <th>Zorunlu</th>
                        <th>İşlemler</th>
                    </tr>
                </thead>
                <tbody>
                    ${fieldsArray.map((field, index) => `
                        <tr>
                            <td><code>${field.id}</code></td>
                            <td><strong>${field.label}</strong></td>
                            <td>
                                <span class="badge ${getFieldTypeBadgeClass(field.type || 'text')}">
                                    ${getFieldTypeDisplayName(field.type || 'text')}
                                </span>
                            </td>
                            <td>
                                <span class="badge ${field.required ? 'success' : 'secondary'}">
                                    ${field.required ? 'Evet' : 'Hayır'}
                                </span>
                            </td>
                            <td>
                                <div class="action-buttons">
                                    <button class="action-btn edit" onclick="editCategoryModalField('${categoryId}', ${index})" title="Düzenle">
                                        <i class="fas fa-edit"></i>
                                    </button>
                                    <button class="action-btn delete" onclick="deleteCategoryModalField('${categoryId}', ${index})" title="Sil">
                                        <i class="fas fa-trash"></i>
                                    </button>
                                </div>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `;
}

function addModalFieldToCategory(categoryId) {
    console.log('Yeni modal alan ekleniyor:', categoryId);
    
    // Mevcut modalları temizle
    const existingModal = document.getElementById('fieldModal');
    if (existingModal) {
        existingModal.remove();
    }
    
    const modalHTML = `
        <div id="fieldModal" class="modal show">
            <div class="modal-content" style="max-width: 500px;">
                <div class="modal-header">
                    <h3 class="modal-title">
                        <i class="fas fa-plus"></i> Yeni Modal Alanı
                    </h3>
                    <button class="modal-close" onclick="closeModal('fieldModal')">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="modal-body">
                    <form id="fieldForm" onsubmit="event.preventDefault();">
                        <div class="form-group">
                            <label class="form-label">Alan ID</label>
                            <input type="text" class="form-control" id="fieldId" placeholder="ornek_alan" required>
                            <small class="text-muted">Sadece küçük harf ve alt çizgi (_) kullanın</small>
                        </div>
                        <div class="form-group">
                            <label class="form-label">Alan Etiketi</label>
                            <input type="text" class="form-control" id="fieldLabel" placeholder="Örnek Alan" required>
                        </div>
                        <div class="form-group">
                            <label class="form-label">Alan Tipi</label>
                            <select class="form-control" id="fieldType" onchange="handleFieldTypeChange()" required>
                                <option value="">Seçiniz...</option>
                                <option value="text">Metin</option>
                                <option value="number">Sayı</option>
                                <option value="email">E-posta</option>
                                <option value="textarea">Uzun Metin</option>
                                <option value="select">Seçim Listesi</option>
                                <option value="date">Tarih</option>
                                <option value="file">Dosya</option>
                            </select>
                        </div>
                        <div class="form-group" id="fieldOptionsGroup" style="display: none;">
                            <label class="form-label">Seçenekler (virgülle ayırın)</label>
                            <textarea class="form-control" id="fieldOptions" placeholder="Seçenek 1, Seçenek 2, Seçenek 3"></textarea>
                        </div>
                        <div class="form-group">
                            <label>
                                <input type="checkbox" id="fieldRequired"> Zorunlu Alan
                            </label>
                        </div>
                    </form>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-success" onclick="saveCategoryModalField('${categoryId}')">
                        <i class="fas fa-save"></i> Kaydet
                    </button>
                    <button class="btn btn-outline" onclick="closeModal('fieldModal')">İptal</button>
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    
    setTimeout(() => {
        document.getElementById('fieldId')?.focus();
    }, 100);
}

function handleFieldTypeChange() {
    const fieldType = document.getElementById('fieldType')?.value;
    const optionsGroup = document.getElementById('fieldOptionsGroup');
    
    if (optionsGroup) {
        optionsGroup.style.display = (fieldType === 'select') ? 'block' : 'none';
    }
}
// Modal alan ekle
function addModalField(categoryId) {
    const modalHTML = `
        <div id="fieldModal" class="modal show">
            <div class="modal-content" style="max-width: 500px;">
                <div class="modal-header">
                    <h3 class="modal-title">Yeni Modal Alanı</h3>
                    <button class="modal-close" onclick="closeModal('fieldModal')">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="modal-body">
                    <form id="fieldForm">
                        <div class="form-group">
                            <label class="form-label">Alan ID</label>
                            <input type="text" class="form-control" id="fieldId" placeholder="ornek_alan" required>
                        </div>
                        <div class="form-group">
                            <label class="form-label">Alan Etiketi</label>
                            <input type="text" class="form-control" id="fieldLabel" placeholder="Örnek Alan" required>
                        </div>
                        <div class="form-group">
                            <label class="form-label">Alan Tipi</label>
                            <select class="form-control" id="fieldType" onchange="toggleFieldOptions()">
                                <option value="text">Metin</option>
                                <option value="number">Sayı</option>
                                <option value="select">Seçim Listesi</option>
                                <option value="textarea">Uzun Metin</option>
                                <option value="date">Tarih</option>
                            </select>
                        </div>
                        <div class="form-group" id="fieldOptionsGroup" style="display: none;">
                            <label class="form-label">Seçenekler (virgülle ayırın)</label>
                            <input type="text" class="form-control" id="fieldOptions" placeholder="Seçenek 1, Seçenek 2, Seçenek 3">
                        </div>
                        <div class="form-group">
                            <label>
                                <input type="checkbox" id="fieldRequired"> Zorunlu Alan
                            </label>
                        </div>
                    </form>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-success" onclick="saveModalField('${categoryId}')">
                        <i class="fas fa-save"></i> Kaydet
                    </button>
                    <button class="btn btn-outline" onclick="closeModal('fieldModal')">İptal</button>
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHTML);
}
async function saveCategoryModalField(categoryId, fieldIndex = null) {
    console.log('Modal alanı kaydediliyor:', categoryId, fieldIndex);
    
    const fieldId = document.getElementById('fieldId')?.value?.trim();
    const fieldLabel = document.getElementById('fieldLabel')?.value?.trim();
    const fieldType = document.getElementById('fieldType')?.value;
    const fieldRequired = document.getElementById('fieldRequired')?.checked || false;
    const fieldOptions = document.getElementById('fieldOptions')?.value?.trim();
    
    if (!fieldId || !fieldLabel || !fieldType) {
        showNotification('Hata', 'Alan ID, etiket ve tip zorunludur', 'error');
        return;
    }
    
    if (!/^[a-z_]+$/.test(fieldId)) {
        showNotification('Hata', 'Alan ID sadece küçük harf ve alt çizgi içerebilir', 'error');
        return;
    }
    
    try {
        const result = await window.firestoreService.getCategoryModalFields(categoryId);
        let fields = [];
        
        // Mevcut fields'ı array formatına çevir
        if (Array.isArray(result)) {
            fields = result;
        } else if (result && typeof result === 'object') {
            fields = Object.values(result);
        }
        
        // Aynı ID'de başka alan var mı kontrol et
        if (fieldIndex === null && fields.some(f => f.id === fieldId)) {
            showNotification('Hata', 'Bu alan ID zaten kullanılıyor', 'error');
            return;
        }
        
        const field = {
            id: fieldId,
            label: fieldLabel,
            type: fieldType,
            required: fieldRequired
        };
        
        if (fieldType === 'select' && fieldOptions) {
            field.options = fieldOptions.split(',').map(opt => ({
                value: opt.trim().toLowerCase().replace(/\s+/g, '_'),
                label: opt.trim()
            }));
        }
        
        if (fieldIndex !== null) {
            fields[fieldIndex] = field;
        } else {
            fields.push(field);
        }
        
        // Array olarak kaydet
        await window.firestoreService.updateCategoryModalFields(categoryId, fields);
        
        if (!window.categoryModalFields) window.categoryModalFields = {};
        window.categoryModalFields[categoryId] = fields;
        
        showNotification('Başarılı', fieldIndex !== null ? 'Alan güncellendi' : 'Alan eklendi', 'success');
        closeModal('fieldModal');
        
        displayCategoryModalFields(categoryId, fields);
        
    } catch (error) {
        console.error('Modal alanı kaydetme hatası:', error);
        showNotification('Hata', 'Alan kaydedilemedi: ' + error.message, 'error');
    }
}
function getFieldTypeBadgeClass(type) {
    const classes = {
        text: 'primary',
        number: 'info',
        select: 'success',
        textarea: 'warning',
        date: 'info',
        file: 'dark',
        email: 'primary'
    };
    return classes[type] || 'secondary';
}

function getFieldTypeDisplayName(type) {
    const names = {
        text: 'Metin',
        number: 'Sayı',
        select: 'Seçim',
        textarea: 'Uzun Metin',
        date: 'Tarih',
        file: 'Dosya',
        email: 'E-posta'
    };
    return names[type] || type;
}

async function editCategoryModalField(categoryId, fieldIndex) {
    try {
        const fields = await window.firestoreService.getCategoryModalFields(categoryId) || [];
        const field = fields[fieldIndex];
        
        if (!field) {
            showNotification('Hata', 'Alan bulunamadı', 'error');
            return;
        }
        
        addModalFieldToCategory(categoryId);
        
        setTimeout(() => {
            document.getElementById('fieldId').value = field.id;
            document.getElementById('fieldId').readOnly = true;
            document.getElementById('fieldLabel').value = field.label || '';
            document.getElementById('fieldType').value = field.type || '';
            document.getElementById('fieldRequired').checked = field.required || false;
            
            if (field.type === 'select' && field.options) {
                document.getElementById('fieldOptions').value = field.options.map(opt => opt.label).join(', ');
            }
            
            handleFieldTypeChange();
            
            const saveButton = document.querySelector('#fieldModal .btn-success');
            if (saveButton) {
                saveButton.innerHTML = '<i class="fas fa-save"></i> Güncelle';
                saveButton.onclick = () => saveCategoryModalField(categoryId, fieldIndex);
            }
            
        }, 100);
        
    } catch (error) {
        console.error('Alan düzenleme hatası:', error);
        showNotification('Hata', 'Alan düzenlenemedi', 'error');
    }
}

async function deleteCategoryModalField(categoryId, fieldIndex) {
    if (!confirm('Bu alanı silmek istediğinize emin misiniz?')) {
        return;
    }
    
    try {
        let fields = await window.firestoreService.getCategoryModalFields(categoryId) || [];
        fields.splice(fieldIndex, 1);
        
        await window.firestoreService.updateCategoryModalFields(categoryId, fields);
        if (!window.categoryModalFields) window.categoryModalFields = {};
        window.categoryModalFields[categoryId] = fields;
        
        showNotification('Başarılı', 'Alan silindi', 'success');
        displayCategoryModalFields(categoryId, fields);
    } catch (error) {
        console.error('Alan silme hatası:', error);
        showNotification('Hata', 'Alan silinemedi', 'error');
    }
}
// Admin panel geri kalan içerik
function getAdminRestContent(users) {
    return `
        <!-- Kullanıcı Yönetimi -->
        <div class="card">
            <div class="card-header">
                <div class="flex justify-between items-center">
                    <div>
                        <h3 class="card-title">Kullanıcı Yönetimi</h3>
                        <p class="card-subtitle">Toplam ${users.length} kullanıcı</p>
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
                                <th>Ad Soyad</th>
                                <th>Kullanıcı Adı</th>
                                <th>Departman</th>
                                <th>Yetkiler</th>
                                <th>Durum</th>
                                <th>İşlemler</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${users.map(user => `
                                <tr>
                                    <td><strong>${user.name}</strong></td>
                                    <td>${user.username}</td>
                                    <td><span class="badge ${user.role === 'admin' ? 'danger' : 'info'}">${getRoleDisplayName(user.role)}</span></td>
                                    <td>
                                        ${(user.permissions || []).slice(0, 3).map(perm => 
                                            `<span class="badge success">${perm}</span>`
                                        ).join(' ')}
                                        ${user.permissions && user.permissions.length > 3 ? 
                                            `<span class="badge warning">+${user.permissions.length - 3}</span>` : ''
                                        }
                                    </td>
                                    <td>
                                        <span class="badge ${user.active !== false ? 'success' : 'danger'}">
                                            ${user.active !== false ? 'Aktif' : 'Pasif'}
                                        </span>
                                    </td>
                                    <td>
                                        <div class="action-buttons">
                                            <button class="action-btn edit" onclick="editUser('${user.id}')">
                                                <i class="fas fa-edit"></i>
                                            </button>
                                            <button class="action-btn delete" onclick="deleteUser('${user.id}')" 
                                                ${user.username === 'furkan' ? 'disabled style="opacity: 0.5;"' : ''}>
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
}
// Alan tipi değiştiğinde
function toggleFieldOptions() {
    const fieldType = document.getElementById('fieldType').value;
    const optionsGroup = document.getElementById('fieldOptionsGroup');
    optionsGroup.style.display = fieldType === 'select' ? 'block' : 'none';
}
// Save Admin Settings
function saveAdminSettings() {
    showNotification('Ayarlar Kaydedildi', 'Sistem ayarları güncellendi.', 'success');
}
// Modal alan kaydet
async function saveModalField(categoryId) {
    const fieldId = document.getElementById('fieldId').value;
    const fieldLabel = document.getElementById('fieldLabel').value;
    const fieldType = document.getElementById('fieldType').value;
    const fieldRequired = document.getElementById('fieldRequired').checked;
    const fieldOptions = document.getElementById('fieldOptions').value;
    
    if (!fieldId || !fieldLabel) {
        showNotification('Hata', 'Alan ID ve etiket zorunludur', 'error');
        return;
    }
    
    const field = {
        id: fieldId,
        label: fieldLabel,
        type: fieldType,
        required: fieldRequired
    };
    
    if (fieldType === 'select' && fieldOptions) {
        field.options = fieldOptions.split(',').map(opt => ({
            value: opt.trim().toLowerCase().replace(/\s+/g, '_'),
            label: opt.trim()
        }));
    }
    
    try {
        // Mevcut alanları al
        let fields = window.categoryModalFields[categoryId] || [];
        
        // Yeni alanı ekle
        fields.push(field);
        
        // Firebase'e kaydet
        await window.firestoreService.updateCategoryModalFields(categoryId, fields);
        
        // Global değişkeni güncelle
        window.categoryModalFields[categoryId] = fields;
        
        showNotification('Başarılı', 'Modal alanı eklendi', 'success');
        closeModal('fieldModal');
        loadModalFieldsForCategory(categoryId);
    } catch (error) {
        console.error('Modal alan kaydetme hatası:', error);
        showNotification('Hata', 'Alan kaydedilemedi', 'error');
    }
}

// Ana kategori sil
async function deleteMainCategory(categoryId) {
    if (!confirm('Bu kategoriyi silmek istediğinize emin misiniz?')) {
        return;
    }
    
    try {
        // Önce bu kategoriye ait stok kartları var mı kontrol et
        const stockCards = await window.firestoreService.getStockCards();
        const hasItems = stockCards.some(card => card.mainCategoryId === categoryId);
        
        if (hasItems) {
            showNotification('Uyarı', 'Bu kategoriye ait stok kartları bulunmaktadır. Önce stok kartlarını silin.', 'warning');
            return;
        }
        
        // Kategoriyi sil
        await window.firestoreService.deleteMainCategory(categoryId);
        
        // Modal alanlarını da sil (varsa)
        if (window.categoryModalFields) {
            delete window.categoryModalFields[categoryId];
        }
        
        showNotification('Başarılı', 'Kategori silindi', 'success');
        
        // Listeleri güncelle
        await loadMainCategories();
        await loadCategoriesList();
        
    } catch (error) {
        console.error('Kategori silme hatası:', error);
        showNotification('Hata', 'Kategori silinemedi: ' + error.message, 'error');
    }
}


// Ana kategori düzenle
function closeCategoryModal() {
    const modal = document.getElementById('categoryModal');
    if (modal) {
        modal.remove();
    }
}

// Ana kategori düzenle - düzeltilmiş
async function editMainCategory(categoryId) {
    // Mevcut modalları temizle
    const existingModal = document.getElementById('categoryModal');
    if (existingModal) {
        existingModal.remove();
    }
    
    try {
        const category = await window.firestoreService.getMainCategory(categoryId);
        if (!category) {
            showNotification('Hata', 'Kategori bulunamadı', 'error');
            return;
        }
        
        const modalHTML = `
            <div id="categoryModal" class="modal show">
                <div class="modal-content" style="max-width: 500px;">
                    <div class="modal-header">
                        <h3 class="modal-title">Kategori Düzenle</h3>
                        <button class="modal-close" onclick="closeCategoryModal()">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    <div class="modal-body">
                        <form id="categoryForm" onsubmit="event.preventDefault();">
                            <div class="form-group">
                                <label class="form-label">Kategori Adı</label>
                                <input type="text" class="form-control" id="categoryName" value="${category.name}" required>
                            </div>
                            <div class="form-group">
                                <label class="form-label">İkon (Font Awesome)</label>
                                <input type="text" class="form-control" id="categoryIcon" value="${category.icon || 'fa-folder'}" placeholder="fa-folder">
                            </div>
                            <div class="form-group">
                                <label class="form-label">Açıklama</label>
                                <textarea class="form-control" id="categoryDescription" rows="3">${category.description || ''}</textarea>
                            </div>
                        </form>
                    </div>
                    <div class="modal-footer">
                        <button class="btn btn-success" onclick="saveMainCategory('${categoryId}')">
                            <i class="fas fa-save"></i> Güncelle
                        </button>
                        <button class="btn btn-outline" onclick="closeCategoryModal()">İptal</button>
                    </div>
                </div>
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', modalHTML);
        
    } catch (error) {
        console.error('Kategori düzenleme hatası:', error);
        showNotification('Hata', 'Kategori yüklenemedi', 'error');
    }
}

// loadModalFieldsManager fonksiyonu eksik, ekleyelim
function loadModalFieldsManager() {
    const container = document.getElementById('modalFieldsContainer');
    container.innerHTML = `
        <div style="padding: 20px;">
            <h4>Modal Alan Yönetimi</h4>
            <p style="color: var(--gray-600); margin-bottom: 20px;">
                Kategoriler için özel form alanları tanımlayın
            </p>
            <div class="alert alert-info">
                <i class="fas fa-info-circle"></i> 
                Bir kategori seçmek için "Ana Kategoriler" sekmesine gidin ve 
                <i class="fas fa-cog"></i> ayarlar butonuna tıklayın.
            </div>
        </div>
    `;
}

// displayModalFields fonksiyonu eksik
// admin.js - Güncellenen: displayModalFields()
function displayModalFields(fields, categoryId) {
    const container = document.getElementById('modalFieldsList');
    if (!container) return;
    
    if (!fields || fields.length === 0) {
        container.innerHTML = '<p style="color: var(--gray-500);">Henüz alan tanımlanmamış</p>';
        return;
    }
    
    container.innerHTML = `
        <div class="table-container">
            <table class="table">
                <thead>
                    <tr>
                        <th>Alan ID</th>
                        <th>Etiket</th>
                        <th>Tip</th>
                        <th>Zorunlu</th>
                        <th>İşlemler</th>
                    </tr>
                </thead>
                <tbody>
                    ${fields.map((field, index) => `
                        <tr>
                            <td><code>${field.id}</code></td>
                            <td>${field.label}</td>
                            <td><span class="badge info">${field.type}</span></td>
                            <td>
                                <span class="badge ${field.required ? 'success' : 'warning'}">
                                    ${field.required ? 'Evet' : 'Hayır'}
                                </span>
                            </td>
                            <td>
                                <button class="btn btn-sm btn-primary" onclick="editModalField('${categoryId}', ${index})">
                                    <i class="fas fa-edit"></i>
                                </button>
                                <button class="btn btn-sm btn-danger" onclick="removeModalField('${categoryId}', ${index})">
                                    <i class="fas fa-trash"></i>
                                </button>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `;
}

// removeModalField fonksiyonu
async function removeModalField(categoryId, fieldIndex) {
    if (!confirm('Bu alanı silmek istediğinize emin misiniz?')) {
        return;
    }
    
    try {
        let fields = window.categoryModalFields[categoryId] || [];
        fields.splice(fieldIndex, 1);
        
        await window.firestoreService.updateCategoryModalFields(categoryId, fields);
        window.categoryModalFields[categoryId] = fields;
        
        showNotification('Başarılı', 'Alan silindi', 'success');
        loadModalFieldsForCategory(categoryId); // Güncellenen: UI yeniden yükle
    } catch (error) {
        console.error('Alan silme hatası:', error);
        showNotification('Hata', 'Alan silinemedi', 'error');
    }
}
// admin.js - Eksik fonksiyonlar
async function exportAllData() {
    try {
        const data = {
            users: window.firebaseData.users,
            companies: window.firebaseData.companies,
            products: window.firebaseData.products,
            stock: window.firebaseData.stock,
            recipes: window.firebaseData.recipes,
            production: window.firebaseData.production,
            offers: window.firebaseData.offers,
            shipments: window.firebaseData.shipments,
            anaKategoriler: window.firebaseData.anaKategoriler,
            altKategoriler: window.firebaseData.altKategoriler
        };
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `fza-erp-backup-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
        showNotification('Başarılı', 'Tüm veriler indirildi.', 'success');
    } catch (error) {
        console.error('Veri indirme hatası:', error);
        showNotification('Hata', 'Veriler indirilemedi.', 'error');
    }
}

async function exportYearData() {
    const year = document.getElementById('exportYear').value;
    if (!year) {
        showNotification('Hata', 'Lütfen bir yıl seçin.', 'error');
        return;
    }
    try {
        const data = {
            production: window.firebaseData.production.filter(p => p.startDate && p.startDate.includes(year)),
            offers: window.firebaseData.offers.filter(o => o.date && o.date.includes(year)),
            shipments: window.firebaseData.shipments.filter(s => s.date && s.date.includes(year))
        };
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `fza-erp-${year}-backup.json`;
        a.click();
        URL.revokeObjectURL(url);
        showNotification('Başarılı', `${year} verileri indirildi.`, 'success');
    } catch (error) {
        console.error('Yıl verisi indirme hatası:', error);
        showNotification('Hata', 'Veriler indirilemedi.', 'error');
    }
}

async function exportSelectedData() {
    const checkboxes = document.querySelectorAll('input[name="dataType"]:checked');
    if (checkboxes.length === 0) {
        showNotification('Hata', 'Lütfen en az bir veri tipi seçin.', 'error');
        return;
    }
    try {
        const data = {};
        checkboxes.forEach(cb => {
            data[cb.value] = window.firebaseData[cb.value];
        });
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `fza-erp-selected-backup-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
        showNotification('Başarılı', 'Seçili veriler indirildi.', 'success');
    } catch (error) {
        console.error('Seçili veri indirme hatası:', error);
        showNotification('Hata', 'Veriler indirilemedi.', 'error');
    }
}

async function cleanOldData() {
    const year = document.getElementById('cleanYear').value;
    if (!year) {
        showNotification('Hata', 'Lütfen bir yıl seçin.', 'error');
        return;
    }
    if (!confirm(`${year} ve öncesi veriler silinecek. Bu işlem geri alınamaz. Devam etmek istiyor musiniz?`)) {
        return;
    }
    try {
        const productionToDelete = window.firebaseData.production.filter(p => p.startDate && p.startDate.includes(year));
        const offersToDelete = window.firebaseData.offers.filter(o => o.date && o.date.includes(year));
        const shipmentsToDelete = window.firebaseData.shipments.filter(s => s.date && s.date.includes(year));
        
        for (const prod of productionToDelete) {
            await window.firestoreService.deleteProduction(prod.id);
        }
        for (const offer of offersToDelete) {
            await window.firestoreService.deleteOffer(offer.id);
        }
        for (const shipment of shipmentsToDelete) {
            await window.firestoreService.deleteShipment(shipment.id);
        }
        
        await loadFirebaseData();
        showNotification('Başarılı', `${year} ve öncesi veriler temizlendi.`, 'success');
    } catch (error) {
        console.error('Veri temizleme hatası:', error);
        showNotification('Hata', 'Veriler temizlenemedi.', 'error');
    }
}

async function importData(event) {
    const file = event.target.files[0];
    if (!file) {
        showNotification('Hata', 'Lütfen bir dosya seçin.', 'error');
        return;
    }
    try {
        const reader = new FileReader();
        reader.onload = async function(e) {
            const data = JSON.parse(e.target.result);
            for (const [collection, items] of Object.entries(data)) {
                for (const item of items) {
                    if (item.id) {
                        await window.firestoreService[`add${collection.charAt(0).toUpperCase() + collection.slice(1)}`](item);
                    }
                }
            }
            await loadFirebaseData();
            showNotification('Başarılı', 'Veriler geri yüklendi.', 'success');
        };
        reader.readAsText(file);
    } catch (error) {
        console.error('Veri yükleme hatası:', error);
        showNotification('Hata', 'Veriler yüklenemedi.', 'error');
    }
}

// admin.js - Yeni Eklenen: saveEditedModalField() (editModalField ile birlikte çalışır)
async function saveEditedModalField(categoryId, fieldIndex) {
    const fieldLabel = document.getElementById('fieldLabel').value;
    const fieldType = document.getElementById('fieldType').value;
    const fieldRequired = document.getElementById('fieldRequired').checked;
    const fieldOptions = document.getElementById('fieldOptions').value;
    
    if (!fieldLabel) {
        showNotification('Hata', 'Etiket zorunludur', 'error');
        return;
    }
    
    const field = {
        id: document.getElementById('fieldId').value,
        label: fieldLabel,
        type: fieldType,
        required: fieldRequired
    };
    
    if (fieldType === 'select' && fieldOptions) {
        field.options = fieldOptions.split(',').map(opt => ({
            value: opt.trim().toLowerCase().replace(/\s+/g, '_'),
            label: opt.trim()
        }));
    }
    
    try {
        let fields = window.categoryModalFields[categoryId] || [];
        fields[fieldIndex] = field;
        
        await window.firestoreService.updateCategoryModalFields(categoryId, fields);
        window.categoryModalFields[categoryId] = fields;
        
        showNotification('Başarılı', 'Modal alanı güncellendi', 'success');
        closeModal('fieldModal');
        loadModalFieldsForCategory(categoryId);
    } catch (error) {
        console.error('Modal alan güncelleme hatası:', error);
        showNotification('Hata', 'Alan güncellenemedi', 'error');
    }
}

// admin.js - Yeni Eklenen: editModalField()
async function editModalField(categoryId, fieldIndex) {
    const fields = window.categoryModalFields[categoryId] || [];
    const field = fields[fieldIndex];
    if (!field) {
        showNotification('Hata', 'Alan bulunamadı', 'error');
        return;
    }
    
    const modalHTML = `
        <div id="fieldModal" class="modal show">
            <div class="modal-content" style="max-width: 500px;">
                <div class="modal-header">
                    <h3 class="modal-title">Modal Alan Düzenle</h3>
                    <button class="modal-close" onclick="closeModal('fieldModal')">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="modal-body">
                    <form id="fieldForm">
                        <div class="form-group">
                            <label class="form-label">Alan ID (Değiştirilemez)</label>
                            <input type="text" class="form-control" id="fieldId" value="${field.id}" readonly>
                        </div>
                        <div class="form-group">
                            <label class="form-label">Etiket</label>
                            <input type="text" class="form-control" id="fieldLabel" value="${field.label}" required>
                        </div>
                        <div class="form-group">
                            <label class="form-label">Tip</label>
                            <select class="form-control" id="fieldType" onchange="toggleFieldOptions()">
                                <option value="text" ${field.type === 'text' ? 'selected' : ''}>Text</option>
                                <option value="select" ${field.type === 'select' ? 'selected' : ''}>Select</option>
                                <option value="number" ${field.type === 'number' ? 'selected' : ''}>Number</option>
                                <option value="textarea" ${field.type === 'textarea' ? 'selected' : ''}>Textarea</option>
                                <option value="date" ${field.type === 'date' ? 'selected' : ''}>Date</option>
                            </select>
                        </div>
                        <div class="form-group" id="fieldOptionsGroup" style="display: ${field.type === 'select' ? 'block' : 'none'};">
                            <label class="form-label">Seçenekler (virgülle ayırın)</label>
                            <textarea class="form-control" id="fieldOptions" rows="3">${field.options ? field.options.map(opt => opt.label).join(', ') : ''}</textarea>
                        </div>
                        <div class="form-group">
                            <label class="form-switch">
                                <input type="checkbox" id="fieldRequired" ${field.required ? 'checked' : ''}>
                                Zorunlu Alan
                            </label>
                        </div>
                    </form>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-success" onclick="saveEditedModalField('${categoryId}', ${fieldIndex})">
                        <i class="fas fa-save"></i> Güncelle
                    </button>
                    <button class="btn btn-outline" onclick="closeModal('fieldModal')">İptal</button>
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHTML);
}




function editUser(userId) {
    console.log('Kullanıcı düzenleniyor:', userId);
    
    const user = window.firebaseData.users.find(u => u.id === userId);
    if (!user) {
        console.error('❌ Kullanıcı bulunamadı:', userId);
        showNotification('Hata', 'Kullanıcı bulunamadı.', 'error');
        return;
    }
    
    console.log('✅ Kullanıcı bulundu:', user.name);
    
    const existingModal = document.getElementById('userModal');
    if (existingModal) {
        existingModal.remove();
        console.log('Eski modal kaldırıldı');
    }
    
    const modalHTML = `
        <div id=\"userModal\" class=\"modal show\">
            <div class=\"modal-content\" style=\"max-width: 600px;\">
                <div class=\"modal-header\">
                    <h3 class=\"modal-title\" id=\"userModalTitle\">Kullanıcı Düzenle: ${user.name}</h3>
                    <button class=\"modal-close\" onclick=\"closeModal('userModal')\">
                        <i class=\"fas fa-times\"></i>
                    </button>
                </div>
                <div class=\"modal-body\">
                    <form id=\"userForm\">
                        <input type=\"hidden\" id=\"editingUserId\" value=\"${userId}\">
                        <div class=\"form-group\">
                            <label class=\"form-label\">Ad Soyad</label>
                            <input type=\"text\" class=\"form-control\" id=\"userFormName\" value=\"${user.name || ''}\" required>
                        </div>
                        <div class=\"form-group\">
                            <label class=\"form-label\">Kullanıcı Adı</label>
                            <input type=\"text\" class=\"form-control\" id=\"userFormUsername\" value=\"${user.username || ''}\" required>
                        </div>
                        <div class=\"form-group\">
                            <label class=\"form-label\">Şifre</label>
                            <input type=\"password\" class=\"form-control\" id=\"userFormPassword\" value=\"${user.password || ''}\" required>
                        </div>
                        <div class=\"form-group\">
                            <label class=\"form-label\">Departman</label>
                            <select class=\"form-control\" id=\"userFormRole\" required>
                                <option value=\"\">Seçiniz...</option>
                                <option value=\"admin\" ${user.role === 'admin' ? 'selected' : ''}>Admin</option>
                                <option value=\"manager\" ${user.role === 'manager' ? 'selected' : ''}>Yönetici</option>
                                <option value=\"sales\" ${user.role === 'sales' ? 'selected' : ''}>Satış</option>
                                <option value=\"production\" ${user.role === 'production' ? 'selected' : ''}>Üretim</option>
                                <option value=\"warehouse\" ${user.role === 'warehouse' ? 'selected' : ''}>Depo</option>
                                <option value=\"logistics\" ${user.role === 'logistics' ? 'selected' : ''}>Lojistik</option>
                                <option value=\"quality\" ${user.role === 'quality' ? 'selected' : ''}>Kalite Kontrol</option>
                            </select>
                        </div>
                        <div class=\"form-group\">
                            <label class=\"form-label\">Yetkiler</label>
                            <div style=\"display: grid; gap: 12px; padding: 15px; background: var(--gray-50); border-radius: 8px;\">
                                <label style=\"display: flex; align-items: center; gap: 8px; cursor: pointer;\">
                                    <input type=\"checkbox\" id=\"perm_sales\" ${user.permissions?.includes('sales') ? 'checked' : ''}> 
                                    <span><i class=\"fas fa-handshake\" style=\"color: var(--primary); margin-right: 5px;\"></i> Satış Modülü</span>
                                </label>
                                <label style=\"display: flex; align-items: center; gap: 8px; cursor: pointer;\">
                                    <input type=\"checkbox\" id=\"perm_production\" ${user.permissions?.includes('production') ? 'checked' : ''}> 
                                    <span><i class=\"fas fa-cogs\" style=\"color: var(--success); margin-right: 5px;\"></i> Üretim Modülü</span>
                                </label>
                                <label style=\"display: flex; align-items: center; gap: 8px; cursor: pointer;\">
                                    <input type=\"checkbox\" id=\"perm_warehouse\" ${user.permissions?.includes('warehouse') ? 'checked' : ''}> 
                                    <span><i class=\"fas fa-warehouse\" style=\"color: var(--warning); margin-right: 5px;\"></i> Depo Modülü</span>
                                </label>
                                <label style=\"display: flex; align-items: center; gap: 8px; cursor: pointer;\">
                                    <input type=\"checkbox\" id=\"perm_reports\" ${user.permissions?.includes('reports') ? 'checked' : ''}> 
                                    <span><i class=\"fas fa-chart-bar\" style=\"color: var(--info); margin-right: 5px;\"></i> Raporlar</span>
                                </label>
                                <label style=\"display: flex; align-items: center; gap: 8px; cursor: pointer;\">
                                    <input type=\"checkbox\" id=\"perm_products\" ${user.permissions?.includes('products') ? 'checked' : ''}> 
                                    <span><i class=\"fas fa-boxes\" style=\"color: var(--primary); margin-right: 5px;\"></i> Ürün Yönetimi</span>
                                </label>
                                <label style=\"display: flex; align-items: center; gap: 8px; cursor: pointer;\">
                                    <input type=\"checkbox\" id=\"perm_stockCards\" ${user.permissions?.includes('stockCards') ? 'checked' : ''}> 
                                    <span><i class=\"fas fa-credit-card\" style=\"color: var(--secondary); margin-right: 5px;\"></i> Stok Kartları</span>
                                </label>
                                <label style=\"display: flex; align-items: center; gap: 8px; cursor: pointer;\">
                                    <input type=\"checkbox\" id=\"perm_hr\" ${user.permissions?.includes('hr') ? 'checked' : ''}> 
                                    <span><i class=\"fas fa-users\" style=\"color: var(--success); margin-right: 5px;\"></i> İnsan Kaynakları</span>
                                </label>
                                <label style=\"display: flex; align-items: center; gap: 8px; cursor: pointer;\">
                                    <input type=\"checkbox\" id=\"perm_user_activities\" ${user.permissions?.includes('user_activities') ? 'checked' : ''}> 
                                    <span><i class=\"fas fa-user-clock\" style=\"color: var(--warning); margin-right: 5px;\"></i> Kullanıcı Aktiviteleri</span>
                                </label>
                                <label style=\"display: flex; align-items: center; gap: 8px; cursor: pointer;\">
                                    <input type=\"checkbox\" id=\"perm_admin\" ${user.permissions?.includes('admin') ? 'checked' : ''}> 
                                    <span><i class=\"fas fa-shield-alt\" style=\"color: var(--danger); margin-right: 5px;\"></i> Admin Yetkileri</span>
                                </label>
                            </div>
                        </div>
                        <div class=\"form-group\">
                            <label class=\"form-label\">Durum</label>
                            <select class=\"form-control\" id=\"userFormActive\">
                                <option value=\"true\" ${user.active !== false ? 'selected' : ''}>Aktif</option>
                                <option value=\"false\" ${user.active === false ? 'selected' : ''}>Pasif</option>
                            </select>
                        </div>
                    </form>
                </div>
                <div class=\"modal-footer\">
                    <button class=\"btn btn-success\" onclick=\"saveEditedUser('${userId}')\">
                        <i class=\"fas fa-save\"></i> Güncelle
                    </button>
                    <button class=\"btn btn-outline\" onclick=\"closeModal('userModal')\">İptal</button>
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    console.log('✅ Kullanıcı düzenleme modalı oluşturuldu');
}

async function saveEditedUser(userId) {
    console.log('Kullanıcı kaydediliyor:', userId);
    
    const name = document.getElementById('userFormName')?.value?.trim();
    const username = document.getElementById('userFormUsername')?.value?.trim();
    const password = document.getElementById('userFormPassword')?.value;
    const role = document.getElementById('userFormRole')?.value;
    const activeValue = document.getElementById('userFormActive')?.value;
    
    if (!name || !username || !password || !role) {
        showNotification('Hata', 'Lütfen tüm zorunlu alanları doldurun.', 'error');
        return;
    }
    
    // Yetkiler - stok kartları yetkisi dahil
    const permissions = [];
    if (document.getElementById('perm_sales')?.checked) permissions.push('sales');
    if (document.getElementById('perm_production')?.checked) permissions.push('production');
    if (document.getElementById('perm_warehouse')?.checked) permissions.push('warehouse');
    if (document.getElementById('perm_reports')?.checked) permissions.push('reports');
    if (document.getElementById('perm_products')?.checked) permissions.push('products');
    if (document.getElementById('perm_stockCards')?.checked) permissions.push('stockCards');
    if (document.getElementById('perm_hr')?.checked) permissions.push('hr');
    if (document.getElementById('perm_user_activities')?.checked) permissions.push('user_activities');
    if (document.getElementById('perm_admin')?.checked) permissions.push('admin');
    
    const userData = {
        name: name,
        username: username,
        password: password,
        role: role,
        permissions: permissions,
        active: activeValue === 'true',
        updatedAt: new Date().toISOString()
    };

    try {
        await window.firestoreService.updateUser(userId, userData);
        console.log('✅ Kullanıcı güncellendi');
        
        showNotification('Kullanıcı Güncellendi', 'Kullanıcı başarıyla güncellendi.', 'success');
        
        closeModal('userModal');
        await loadFirebaseData();
        
        if (window.currentPage === 'admin') {
            loadAdmin();
        }
        
    } catch (error) {
        console.error('❌ Kullanıcı güncelleme hatası:', error);
        showNotification('Hata', 'Kullanıcı güncellenirken hata oluştu.', 'error');
    }
}

function addNewUser() {
    console.log('Yeni kullanıcı ekleme modalı açılıyor');
    
    const existingModal = document.getElementById('userModal');
    if (existingModal) {
        existingModal.remove();
        console.log('Eski modal kaldırıldı');
    }
    
    const modalHTML = `
        <div id=\"userModal\" class=\"modal show\">
            <div class=\"modal-content\" style=\"max-width: 600px;\">
                <div class=\"modal-header\">
                    <h3 class=\"modal-title\">Yeni Kullanıcı Ekle</h3>
                    <button class=\"modal-close\" onclick=\"closeModal('userModal')\">
                        <i class=\"fas fa-times\"></i>
                    </button>
                </div>
                <div class=\"modal-body\">
                    <form id=\"userForm\">
                        <div class=\"form-group\">
                            <label class=\"form-label\">Ad Soyad</label>
                            <input type=\"text\" class=\"form-control\" id=\"userFormName\" placeholder=\"Ad Soyad\" required>
                        </div>
                        <div class=\"form-group\">
                            <label class=\"form-label\">Kullanıcı Adı</label>
                            <input type=\"text\" class=\"form-control\" id=\"userFormUsername\" placeholder=\"kullanici_adi\" required>
                        </div>
                        <div class=\"form-group\">
                            <label class=\"form-label\">Şifre</label>
                            <input type=\"password\" class=\"form-control\" id=\"userFormPassword\" placeholder=\"Güçlü bir şifre\" required>
                        </div>
                        <div class=\"form-group\">
                            <label class=\"form-label\">Departman</label>
                            <select class=\"form-control\" id=\"userFormRole\" required>
                                <option value=\"\">Seçiniz...</option>
                                <option value=\"admin\">Admin</option>
                                <option value=\"manager\">Yönetici</option>
                                <option value=\"sales\">Satış</option>
                                <option value=\"production\">Üretim</option>
                                <option value=\"warehouse\">Depo</option>
                                <option value=\"logistics\">Lojistik</option>
                                <option value=\"quality\">Kalite Kontrol</option>
                            </select>
                        </div>
                        <div class=\"form-group\">
                            <label class=\"form-label\">Yetkiler</label>
                            <div style=\"display: grid; gap: 12px; padding: 15px; background: var(--gray-50); border-radius: 8px;\">
                                <label style=\"display: flex; align-items: center; gap: 8px; cursor: pointer;\">
                                    <input type=\"checkbox\" id=\"perm_sales\"> 
                                    <span><i class=\"fas fa-handshake\" style=\"color: var(--primary); margin-right: 5px;\"></i> Satış Modülü</span>
                                </label>
                                <label style=\"display: flex; align-items: center; gap: 8px; cursor: pointer;\">
                                    <input type=\"checkbox\" id=\"perm_production\"> 
                                    <span><i class=\"fas fa-cogs\" style=\"color: var(--success); margin-right: 5px;\"></i> Üretim Modülü</span>
                                </label>
                                <label style=\"display: flex; align-items: center; gap: 8px; cursor: pointer;\">
                                    <input type=\"checkbox\" id=\"perm_warehouse\"> 
                                    <span><i class=\"fas fa-warehouse\" style=\"color: var(--warning); margin-right: 5px;\"></i> Depo Modülü</span>
                                </label>
                                <label style=\"display: flex; align-items: center; gap: 8px; cursor: pointer;\">
                                    <input type=\"checkbox\" id=\"perm_reports\"> 
                                    <span><i class=\"fas fa-chart-bar\" style=\"color: var(--info); margin-right: 5px;\"></i> Raporlar</span>
                                </label>
                                <label style=\"display: flex; align-items: center; gap: 8px; cursor: pointer;\">
                                    <input type=\"checkbox\" id=\"perm_products\"> 
                                    <span><i class=\"fas fa-boxes\" style=\"color: var(--primary); margin-right: 5px;\"></i> Ürün Yönetimi</span>
                                </label>
                                <label style=\"display: flex; align-items: center; gap: 8px; cursor: pointer;\">
                                    <input type=\"checkbox\" id=\"perm_stockCards\"> 
                                    <span><i class=\"fas fa-credit-card\" style=\"color: var(--secondary); margin-right: 5px;\"></i> Stok Kartları</span>
                                </label>
                                <label style=\"display: flex; align-items: center; gap: 8px; cursor: pointer;\">
                                    <input type=\"checkbox\" id=\"perm_hr\"> 
                                    <span><i class=\"fas fa-users\" style=\"color: var(--success); margin-right: 5px;\"></i> İnsan Kaynakları</span>
                                </label>
                                <label style=\"display: flex; align-items: center; gap: 8px; cursor: pointer;\">
                                    <input type=\"checkbox\" id=\"perm_user_activities\"> 
                                    <span><i class=\"fas fa-user-clock\" style=\"color: var(--warning); margin-right: 5px;\"></i> Kullanıcı Aktiviteleri</span>
                                </label>
                                <label style=\"display: flex; align-items: center; gap: 8px; cursor: pointer;\">
                                    <input type=\"checkbox\" id=\"perm_admin\"> 
                                    <span><i class=\"fas fa-shield-alt\" style=\"color: var(--danger); margin-right: 5px;\"></i> Admin Yetkileri</span>
                                </label>
                            </div>
                        </div>
                        <div class=\"form-group\">
                            <label class=\"form-label\">Durum</label>
                            <select class=\"form-control\" id=\"userFormActive\">
                                <option value=\"true\" selected>Aktif</option>
                                <option value=\"false\">Pasif</option>
                            </select>
                        </div>
                    </form>
                </div>
                <div class=\"modal-footer\">
                    <button class=\"btn btn-success\" onclick=\"saveUser()\">
                        <i class=\"fas fa-save\"></i> Kaydet
                    </button>
                    <button class=\"btn btn-outline\" onclick=\"closeModal('userModal')\">İptal</button>
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    console.log('✅ Yeni kullanıcı modalı oluşturuldu');
}

async function saveUser(userId = null) {
    console.log('saveUser çağrıldı, userId:', userId);
    
    if (userId) {
        await saveEditedUser(userId);
        return;
    }
    
    const name = document.getElementById('userFormName')?.value?.trim();
    const username = document.getElementById('userFormUsername')?.value?.trim();
    const password = document.getElementById('userFormPassword')?.value;
    const role = document.getElementById('userFormRole')?.value;
    const activeValue = document.getElementById('userFormActive')?.value || 'true';
    
    if (!name || !username || !password || !role) {
        showNotification('Hata', 'Lütfen tüm zorunlu alanları doldurun.', 'error');
        return;
    }
    
    const existingUser = window.firebaseData.users.find(u => u.username === username);
    if (existingUser) {
        showNotification('Hata', 'Bu kullanıcı adı zaten kullanılıyor.', 'error');
        return;
    }
    
    // Yetkiler - stok kartları yetkisi dahil
    const permissions = [];
    if (document.getElementById('perm_sales')?.checked) permissions.push('sales');
    if (document.getElementById('perm_production')?.checked) permissions.push('production');
    if (document.getElementById('perm_warehouse')?.checked) permissions.push('warehouse');
    if (document.getElementById('perm_reports')?.checked) permissions.push('reports');
    if (document.getElementById('perm_products')?.checked) permissions.push('products');
    if (document.getElementById('perm_stockCards')?.checked) permissions.push('stockCards');
    if (document.getElementById('perm_hr')?.checked) permissions.push('hr');
    if (document.getElementById('perm_user_activities')?.checked) permissions.push('user_activities');
    if (document.getElementById('perm_admin')?.checked) permissions.push('admin');
    
    const userData = {
        name: name,
        username: username,
        password: password,
        role: role,
        permissions: permissions,
        active: activeValue === 'true',
        createdAt: new Date().toISOString()
    };

    try {
        await window.firestoreService.addUser(userData);
        console.log('✅ Yeni kullanıcı eklendi');
        
        showNotification('Kullanıcı Eklendi', 'Yeni kullanıcı başarıyla eklendi.', 'success');
        
        closeModal('userModal');
        await loadFirebaseData();
        
        if (window.currentPage === 'admin') {
            loadAdmin();
        }
        
    } catch (error) {
        console.error('❌ Kullanıcı ekleme hatası:', error);
        showNotification('Hata', 'Kullanıcı eklenirken hata oluştu.', 'error');
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

// Boyut yönetimi sekmelerini değiştir
function switchSizeTab(button, tabId) {
    document.querySelectorAll('.card .tabs .tab').forEach(tab => tab.classList.remove('active'));
    document.querySelectorAll('.card .tab-content').forEach(content => content.style.display = 'none');
    
    button.classList.add('active');
    const tabContent = document.getElementById(tabId);
    if (tabContent) {
        tabContent.style.display = 'block';
        
        if (tabId === 'sizeManagement') {
            loadProductSizes();
        } else if (tabId === 'sizePricing') {
            loadCategoryPricing();
        }
    }
}

// Ürün boyutlarını yükle
async function loadProductSizes() {
    try {
        const sizes = await window.firestoreService.getProductSizes() || [];
        const tbody = document.getElementById('sizesTableBody');
        
        if (!tbody) {
            console.error('Boyutlar tablosu bulunamadı');
            return;
        }
        
        if (sizes.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; padding: 40px; color: var(--gray-500);">Henüz boyut tanımlanmamış</td></tr>';
            return;
        }
        
        tbody.innerHTML = sizes.map(size => `
            <tr>
                <td><strong>${size.name}</strong></td>
                <td><span style="color: var(--success); font-weight: 600;">${size.defaultPrice} $</span></td>
                <td>${size.description || '-'}</td>
                <td>
                    <span class="badge ${size.active !== false ? 'success' : 'secondary'}">
                        ${size.active !== false ? 'Aktif' : 'Pasif'}
                    </span>
                </td>
                <td>
                    <div class="action-buttons">
                        <button class="action-btn edit" onclick="editSize('${size.id}')" title="Düzenle">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="action-btn delete" onclick="deleteSize('${size.id}')" title="Sil">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');
    } catch (error) {
        console.error('Boyutlar yüklenirken hata:', error);
    }
}

// Yeni boyut ekle modalı
function addNewSize() {
    const existingModal = document.getElementById('sizeModal');
    if (existingModal) existingModal.remove();
    
    const modalHTML = `
        <div id="sizeModal" class="modal show">
            <div class="modal-content" style="max-width: 500px;">
                <div class="modal-header">
                    <h3 class="modal-title">Yeni Boyut Ekle</h3>
                    <button class="modal-close" onclick="closeModal('sizeModal')">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="modal-body">
                    <form id="sizeForm" onsubmit="event.preventDefault();">
                        <div class="form-group">
                            <label class="form-label">Boyut Adı</label>
                            <input type="text" class="form-control" id="sizeName" placeholder="Örn: 1000mm, 500mm" required>
                        </div>
                        <div class="form-group">
                            <label class="form-label">Varsayılan Fiyat ($)</label>
                            <input type="number" class="form-control" id="sizeDefaultPrice" placeholder="0.00" step="0.01" min="0" required>
                        </div>
                        <div class="form-group">
                            <label class="form-label">Açıklama</label>
                            <textarea class="form-control" id="sizeDescription" rows="3" placeholder="Bu boyut hakkında açıklama..."></textarea>
                        </div>
                        <div class="form-group">
                            <label style="display: flex; align-items: center; gap: 8px; cursor: pointer;">
                                <input type="checkbox" id="sizeActive" checked>
                                <span>Aktif boyut</span>
                            </label>
                        </div>
                    </form>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-success" onclick="saveSize()">
                        <i class="fas fa-save"></i> Kaydet
                    </button>
                    <button class="btn btn-outline" onclick="closeModal('sizeModal')">İptal</button>
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    setTimeout(() => document.getElementById('sizeName')?.focus(), 100);
}

// Boyut kaydet
async function saveSize(sizeId = null) {
    const name = document.getElementById('sizeName')?.value?.trim();
    const defaultPrice = parseFloat(document.getElementById('sizeDefaultPrice')?.value || 0);
    const description = document.getElementById('sizeDescription')?.value?.trim();
    const active = document.getElementById('sizeActive')?.checked;
    
    if (!name || defaultPrice < 0) {
        showNotification('Hata', 'Boyut adı ve geçerli bir fiyat giriniz', 'error');
        return;
    }
    
    const sizeData = {
        name,
        defaultPrice,
        description,
        active,
        updatedAt: new Date().toISOString()
    };
    
    try {
        if (sizeId) {
            await window.firestoreService.updateProductSize(sizeId, sizeData);
            showNotification('Başarılı', 'Boyut güncellendi', 'success');
        } else {
            sizeData.createdAt = new Date().toISOString();
            await window.firestoreService.addProductSize(sizeData);
            showNotification('Başarılı', 'Boyut eklendi', 'success');
        }
        
        closeModal('sizeModal');
        loadProductSizes();
    } catch (error) {
        console.error('Boyut kaydetme hatası:', error);
        showNotification('Hata', 'Boyut kaydedilemedi', 'error');
    }
}

// Boyut düzenle
async function editSize(sizeId) {
    try {
        const size = await window.firestoreService.getProductSize(sizeId);
        if (!size) {
            showNotification('Hata', 'Boyut bulunamadı', 'error');
            return;
        }
        
        addNewSize();
        
        setTimeout(() => {
            document.getElementById('sizeName').value = size.name;
            document.getElementById('sizeDefaultPrice').value = size.defaultPrice;
            document.getElementById('sizeDescription').value = size.description || '';
            document.getElementById('sizeActive').checked = size.active !== false;
            
            const saveBtn = document.querySelector('#sizeModal .btn-success');
            if (saveBtn) {
                saveBtn.innerHTML = '<i class="fas fa-save"></i> Güncelle';
                saveBtn.onclick = () => saveSize(sizeId);
            }
        }, 100);
    } catch (error) {
        console.error('Boyut düzenleme hatası:', error);
        showNotification('Hata', 'Boyut yüklenemedi', 'error');
    }
}

// Boyut sil
async function deleteSize(sizeId) {
    if (!confirm('Bu boyutu silmek istediğinize emin misiniz?')) return;
    
    try {
        await window.firestoreService.deleteProductSize(sizeId);
        showNotification('Başarılı', 'Boyut silindi', 'success');
        loadProductSizes();
    } catch (error) {
        console.error('Boyut silme hatası:', error);
        showNotification('Hata', 'Boyut silinemedi', 'error');
    }
}

// Kategori bazlı fiyatlandırmayı yükle
async function loadCategoryPricing() {
    const container = document.getElementById('categoryPricingContainer');
    if (!container) return;
    
    try {
        const sizes = await window.firestoreService.getProductSizes() || [];
        const categories = [
            { name: "piksel kontrollü doğrusal armatürler", icon: "fas fa-grip-lines" },
            { name: "piksel kontrollü noktasal armatürler", icon: "fas fa-dot-circle" },
            { name: "Çizgisel armatürler", icon: "fas fa-minus" },
            { name: "Wallwasher armatürler", icon: "fas fa-wave-square" },
            { name: "Yere Gömme wallwasher armatürler", icon: "fas fa-level-down-alt" },
            { name: "Spot Armatürler", icon: "fas fa-circle" },
            { name: "Kontrol Sistemleri", icon: "fas fa-microchip" }
        ];
        
        if (sizes.length === 0) {
            container.innerHTML = '<p style="text-align: center; color: var(--gray-500); padding: 40px;">Önce boyut tanımlamalısınız</p>';
            return;
        }
        
        container.innerHTML = categories.map(category => `
            <div class="card" style="margin-bottom: 20px;">
                <div class="card-header" style="background: var(--gray-50);">
                    <h4 style="margin: 0;"><i class="${category.icon}"></i> ${category.name}</h4>
                </div>
                <div class="card-body">
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px;">
                        ${sizes.map(size => `
                            <div class="form-group">
                                <label class="form-label">${size.name}</label>
                                <input type="number" 
                                       class="form-control" 
                                       id="price_${category.name}_${size.id}" 
                                       placeholder="${size.defaultPrice} $" 
                                       value="${size.defaultPrice}"
                                       step="0.01" 
                                       min="0">
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>
        `).join('');
        
        container.innerHTML += `
            <button class="btn btn-success" onclick="saveCategoryPricing()">
                <i class="fas fa-save"></i> Tüm Fiyatları Kaydet
            </button>
        `;
    } catch (error) {
        console.error('Kategori fiyatlandırma yükleme hatası:', error);
    }
}

// Kategori fiyatlandırmayı kaydet
async function saveCategoryPricing() {
    try {
        const sizes = await window.firestoreService.getProductSizes() || [];
        const categories = [
            "piksel kontrollü doğrusal armatürler",
            "piksel kontrollü noktasal armatürler",
            "Çizgisel armatürler",
            "Wallwasher armatürler",
            "Yere Gömme wallwasher armatürler",
            "Spot Armatürler",
            "Kontrol Sistemleri"
        ];
        
        const pricingData = {};
        
        categories.forEach(category => {
            pricingData[category] = {};
            sizes.forEach(size => {
                const input = document.getElementById(`price_${category}_${size.id}`);
                if (input) {
                    pricingData[category][size.id] = parseFloat(input.value) || size.defaultPrice;
                }
            });
        });
        
        await window.firestoreService.saveCategoryPricing(pricingData);
        showNotification('Başarılı', 'Kategori fiyatlandırması kaydedildi', 'success');
    } catch (error) {
        console.error('Fiyatlandırma kaydetme hatası:', error);
        showNotification('Hata', 'Fiyatlandırma kaydedilemedi', 'error');
    }
}

// Zam hesapla ve önizle
async function calculatePriceIncrease() {
    const rate = parseFloat(document.getElementById('priceIncreaseRate')?.value || 0);
    
    if (rate === 0) {
        showNotification('Uyarı', 'Lütfen bir zam oranı girin', 'warning');
        return;
    }
    
    try {
        const sizes = await window.firestoreService.getProductSizes() || [];
        const preview = document.getElementById('priceIncreasePreview');
        
        let html = '<div style="max-height: 300px; overflow-y: auto;">';
        html += '<table class="table"><thead><tr><th>Boyut</th><th>Mevcut</th><th>Yeni</th><th>Fark</th></tr></thead><tbody>';
        
        sizes.forEach(size => {
            const oldPrice = size.defaultPrice;
            const newPrice = oldPrice * (1 + rate / 100);
            const diff = newPrice - oldPrice;
            
            html += `
                <tr>
                    <td><strong>${size.name}</strong></td>
                    <td>${oldPrice.toFixed(2)} $</td>
                    <td style="color: ${diff > 0 ? 'var(--success)' : 'var(--danger)'}; font-weight: 600;">${newPrice.toFixed(2)} $</td>
                    <td style="color: ${diff > 0 ? 'var(--success)' : 'var(--danger)'};">${diff > 0 ? '+' : ''}${diff.toFixed(2)} $</td>
                </tr>
            `;
        });
        
        html += '</tbody></table></div>';
        preview.innerHTML = html;
        
        document.getElementById('applyIncreaseBtn').style.display = 'inline-flex';
    } catch (error) {
        console.error('Zam hesaplama hatası:', error);
        showNotification('Hata', 'Zam hesaplanamadı', 'error');
    }
}

// Zamı uygula
async function applyPriceIncrease() {
    const rate = parseFloat(document.getElementById('priceIncreaseRate')?.value || 0);
    
    if (!confirm(`%${rate} oranında zam uygulanacak. Bu işlem geri alınamaz. Devam etmek istiyor musunuz?`)) {
        return;
    }
    
    try {
        const sizes = await window.firestoreService.getProductSizes() || [];
        
        for (const size of sizes) {
            const newPrice = size.defaultPrice * (1 + rate / 100);
            await window.firestoreService.updateProductSize(size.id, {
                defaultPrice: parseFloat(newPrice.toFixed(2)),
                lastPriceUpdate: new Date().toISOString(),
                lastPriceIncreaseRate: rate
            });
        }
        
        showNotification('Başarılı', `Tüm fiyatlara %${rate} zam uygulandı`, 'success');
        document.getElementById('priceIncreaseRate').value = '';
        document.getElementById('priceIncreasePreview').innerHTML = '<span style="color: var(--gray-500);">Zam oranı girin ve hesapla butonuna tıklayın</span>';
        document.getElementById('applyIncreaseBtn').style.display = 'none';
        
        loadProductSizes();
    } catch (error) {
        console.error('Zam uygulama hatası:', error);
        showNotification('Hata', 'Zam uygulanamadı', 'error');
    }
}


// Global olarak export et
window.editUser = editUser;
window.saveEditedUser = saveEditedUser;
window.addNewUser = addNewUser;
window.saveUser = saveUser;
window.deleteUser = deleteUser;
window.loadModalFieldsForCategory = loadModalFieldsForCategory;
window.addModalField = addModalField;
window.toggleFieldOptions = toggleFieldOptions;
window.saveModalField = saveModalField;
window.getAdminRestContent = getAdminRestContent;
window.loadModalFieldsManager = loadModalFieldsManager;
window.displayModalFields = displayModalFields;
window.removeModalField = removeModalField;
window.editModalField = editModalField;
window.saveEditedModalField = saveEditedModalField;
window.exportAllData = exportAllData;
window.exportYearData = exportYearData;
window.exportSelectedData = exportSelectedData;
window.cleanOldData = cleanOldData;
window.importData = importData;
window.loadAdmin = loadAdmin;
window.saveAdminSettings = saveAdminSettings;
window.switchAdminTab = switchAdminTab;
window.addMainCategory = addMainCategory;
window.saveMainCategory = saveMainCategory;
window.loadCategoriesList = loadCategoriesList;
window.editMainCategory = editMainCategory;
window.deleteMainCategory = deleteMainCategory;
window.configureModalFields = configureModalFields;
window.closeCategoryModal = closeCategoryModal;
window.addModalFieldToCategory = addModalFieldToCategory;
window.editCategoryModalField = editCategoryModalField;
window.deleteCategoryModalField = deleteCategoryModalField;
window.saveCategoryModalField = saveCategoryModalField;
window.handleFieldTypeChange = handleFieldTypeChange;
window.displayCategoryModalFields = displayCategoryModalFields;
window.getFieldTypeBadgeClass = getFieldTypeBadgeClass;
window.getFieldTypeDisplayName = getFieldTypeDisplayName;
window.switchSizeTab = switchSizeTab;
window.loadProductSizes = loadProductSizes;
window.addNewSize = addNewSize;
window.saveSize = saveSize;
window.editSize = editSize;
window.deleteSize = deleteSize;
window.loadCategoryPricing = loadCategoryPricing;
window.saveCategoryPricing = saveCategoryPricing;
window.calculatePriceIncrease = calculatePriceIncrease;
window.applyPriceIncrease = applyPriceIncrease;




console.log('window.firestoreService:', window.firestoreService);
console.log('getCategoryModalFields fonksiyonu:', window.firestoreService.getCategoryModalFields);
console.log('✅ Kullanıcı düzenleme fonksiyonları düzeltildi!');
console.log('✅ admin paneli modülü yüklendi');