// ===========================================
// STOCK-CARD.JS - STOK KART YÖNETİMİ
// ============================================
// Global değişkenler
window.mainCategories = [];
window.stockCards = [];
window.categoryModalFields = {};
window.selectedCategoryId = null;

// Başlangıçta kategorileri yükle
async function initializeStockCard() {
    await loadMainCategories();
    await loadCategoryModalFields();
    console.log('Stok kartı başlatıldı, kategoriler:', window.mainCategories);
}

async function loadMainCategories() {
    try {
        const categories = await window.firestoreService.getMainCategories();
        window.mainCategories = categories || [];
        console.log('Ana kategoriler yüklendi:', window.mainCategories);
        return categories;
    } catch (error) {
        console.error('Ana kategoriler yüklenemedi:', error);
        window.mainCategories = [];
        return [];
    }
}

async function loadCategoryModalFields() {
    try {
        const fields = await window.firestoreService.getCategoryModalFields();
        window.categoryModalFields = fields || {};
        console.log('Modal alanları yüklendi:', window.categoryModalFields);
        return fields;
    } catch (error) {
        console.error('Modal alanları yüklenemedi:', error);
        window.categoryModalFields = {};
        return {};
    }
}

// Ana stok kartları sayfası - Kategori görünümü
function loadStockCards() {
    if (!currentUser) {
        showNotification('Hata', 'Giriş yapmanız gerekiyor', 'error');
        return;
    }

    const content = `
        <div class="page-header">
            <h1 class="page-title"><i class="fas fa-layer-group"></i> Stok Kartları</h1>
            <p class="page-subtitle">Ürün ve hammadde stok kartlarını yönetin</p>
        </div>
        
        <!-- Kategori Görünümü -->
        <div id="categoryView">
            <div class="card">
                <div class="card-header">
                    <h3 class="card-title">Kategoriler</h3>
                    <div class="search-box" style="max-width: 300px;">
                        <input type="text" 
                               id="categorySearch" 
                               class="form-control"
                               placeholder="Kategori ara..." 
                               onkeyup="filterCategories()"
                               style="padding-left: 35px;">
                        <i class="fas fa-search" style="position: absolute; left: 12px; top: 50%; transform: translateY(-50%); color: var(--gray-400);"></i>
                    </div>
                </div>
                <div class="card-body">
                    <div id="categoriesGrid" class="category-grid">
                        <!-- Kategoriler buraya gelecek -->
                    </div>
                </div>
            </div>
        </div>
        
        <!-- Ürün Listesi Görünümü -->
        <div id="productListView" style="display: none;">
            <div class="card">
                <div class="card-header">
                    <div style="display: flex; align-items: center; gap: 15px;">
                    <h3 class="card-title" id="categoryTitle">
                            <i class="fas fa-folder"></i> Kategori Ürünleri
                        </h3>
                        <button class="btn btn-outline" onclick="backToCategories()">
                            <i class="fas fa-arrow-left"></i> Kategorilere Dön
                        </button>
                        
                        <button class="btn btn-primary" onclick="openStockCardModal()">
                        <i class="fas fa-plus"></i> Yeni Stok Kartı
                    </button>
                    </div>
                    
                </div>
                <div class="card-body">
                    <div class="filter-bar" style="background: var(--gray-50); padding: 20px; border-radius: 10px; margin-bottom: 20px;">
                        <div class="search-box" style="max-width: 400px;">
                            <input type="text" 
                                   id="stockSearch" 
                                   class="form-control"
                                   placeholder="Ürün adı, kod, marka veya model ara..." 
                                   onkeyup="filterStockCards()"
                                   style="padding-left: 35px;">
                            <i class="fas fa-search" style="position: absolute; left: 12px; top: 50%; transform: translateY(-50%); color: var(--gray-400);"></i>
                        </div>
                    </div>
                    
                    <div id="stockCardsContainer">
                        <div class="table-container">
                            <table class="table">
                                <thead>
                                    <tr>
                                        <th>Kod</th>
                                        <th>Ürün Adı</th>
                                        <th>Marka</th>
                                        <th>Model</th>
                                        <th>Birim</th>
                                        <th>Fiyat</th>
                                        <th>İşlemler</th>
                                    </tr>
                                </thead>
                                <tbody id="stockCardsTableBody"></tbody>
                            </table>
                        </div>
                    </div>
                    
                    <div id="emptyMessage" style="display: none; text-align: center; padding: 60px 20px;">
                        <i class="fas fa-inbox" style="font-size: 64px; color: var(--gray-400); margin-bottom: 20px;"></i>
                        <h3 style="color: var(--gray-600); margin-bottom: 10px;">Bu Kategoride Ürün Bulunamadı</h3>
                        <p style="color: var(--gray-500);">Yeni ürün eklemek için yukarıdaki butonu kullanabilirsiniz.</p>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    document.getElementById('pageContent').innerHTML = content;
    
    initializeStockCard().then(() => {
        displayCategories();
    });
}

// Kategorileri göster
function displayCategories() {
    const grid = document.getElementById('categoriesGrid');
    
    if (!window.mainCategories || window.mainCategories.length === 0) {
        grid.innerHTML = `
            <div style="grid-column: 1/-1; text-align: center; padding: 60px 20px;">
                <i class="fas fa-folder-plus" style="font-size: 64px; color: var(--gray-400); margin-bottom: 20px;"></i>
                <h3 style="color: var(--gray-600); margin-bottom: 10px;">Henüz Kategori Eklenmemiş</h3>
                <p style="color: var(--gray-500);">Lütfen admin panelinden kategori ekleyin.</p>
            </div>
        `;
        return;
    }
    
    grid.innerHTML = window.mainCategories.map(cat => {
    const color = getCategoryColor(cat.name);
    return `
        <div class="category-card" 
             onclick="selectCategory('${cat.id}')"
             style="background: linear-gradient(135deg, ${color}10 0%, ${color}05 100%); 
                    border: 2px solid ${color}20;">
            <div class="category-icon-wrapper" style="background: ${color}15;">
                <i class="fas ${cat.icon || 'fa-folder'}" style="color: ${color};"></i>
            </div>
            <div>
                <h4>${cat.name}</h4>
                <div class="category-stats">
                    <div>
                        <div class="category-count" style="color: ${color};">${cat.itemCount || 0}</div>
                        <div class="category-label">Ürün</div>
                    </div>
                </div>
                ${cat.description ? `<div class="category-description">${cat.description}</div>` : ''}
            </div>
        </div>
        `;
    }).join('');
}

// Kategori renk fonksiyonu
function getCategoryColor(categoryName) {
    const colors = {
        'Elektronik': '#3B82F6',
        'Mekanik': '#10B981', 
        'Kimyasal': '#F59E0B',
        'Tekstil': '#8B5CF6',
        'Gıda': '#EF4444',
        'İnşaat': '#6B7280',
        'Otomasyon': '#06B6D4',
        'Yazılım': '#EC4899'
    };
    return colors[categoryName] || '#6B7280';
}

// Kategorileri filtrele
function filterCategories() {
    const searchText = document.getElementById('categorySearch').value.toLowerCase();
    const categories = document.querySelectorAll('.category-card');
    
    categories.forEach(card => {
        const name = card.querySelector('h4').textContent.toLowerCase();
        if (name.includes(searchText)) {
            card.style.display = 'block';
        } else {
            card.style.display = 'none';
        }
    });
}

// Kategori seç
async function selectCategory(categoryId) {
    window.selectedCategoryId = categoryId;
    const category = window.mainCategories.find(c => c.id === categoryId);
    
    if (!category) return;
    
    // Görünümleri değiştir
    document.getElementById('categoryView').style.display = 'none';
    document.getElementById('productListView').style.display = 'block';
    
    // Başlığı güncelle
    document.getElementById('categoryTitle').innerHTML = `
        <i class="fas ${category.icon || 'fa-folder'}"></i> ${category.name}
    `;
    
    // Ürünleri yükle
    await loadCategoryProducts(categoryId);
}

// Kategoriye geri dön
function backToCategories() {
    window.selectedCategoryId = null;
    document.getElementById('categoryView').style.display = 'block';
    document.getElementById('productListView').style.display = 'none';
    document.getElementById('stockSearch').value = '';
}

// Kategori ürünlerini yükle
async function loadCategoryProducts(categoryId) {
    try {
        let stockCards = await window.firestoreService.getStockCards();
        stockCards = stockCards.filter(card => card.mainCategoryId === categoryId);
        window.stockCards = stockCards;
        displayStockCards(stockCards);
    } catch (error) {
        console.error('Ürünler yüklenirken hata:', error);
        showNotification('Hata', 'Ürünler yüklenemedi', 'error');
    }
}

// Stok kartlarını filtrele
async function filterStockCards() {
    const searchText = document.getElementById('stockSearch').value.toLowerCase().trim();
    
    let filteredCards = window.stockCards;
    
    if (searchText) {
        filteredCards = filteredCards.filter(card => 
            (card.name && card.name.toLowerCase().includes(searchText)) ||
            (card.code && card.code.toLowerCase().includes(searchText)) ||
            (card.brand && card.brand.toLowerCase().includes(searchText)) ||
            (card.model && card.model.toLowerCase().includes(searchText))
        );
    }
    
    displayStockCards(filteredCards);
}

// Stok kartlarını göster
function displayStockCards(stockCards) {
    const tbody = document.getElementById('stockCardsTableBody');
    const emptyMessage = document.getElementById('emptyMessage');
    const container = document.getElementById('stockCardsContainer');
    
    if (!stockCards || stockCards.length === 0) {
        container.style.display = 'none';
        emptyMessage.style.display = 'block';
        return;
    }
    
    container.style.display = 'block';
    emptyMessage.style.display = 'none';
    
    tbody.innerHTML = stockCards.map(card => {
        return `
            <tr>
                <td><strong>${card.code || '-'}</strong></td>
                <td>${card.name || '-'}</td>
                <td>${card.brand || '-'}</td>
                <td>${card.model || '-'}</td>
                <td>${card.unit || '-'}</td>
                <td>${card.price ? `${card.price} ₺` : '-'}</td>
                <td>
                    <div class="action-buttons">
                        <button class="action-btn view" onclick="viewStockCard('${card.id}')" title="Detay">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="action-btn edit" onclick="editStockCard('${card.id}')" title="Düzenle">
                            <i class="fas fa-edit"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}


// Stok kartı kaydet
async function saveStockCard(stockCardId = null) {
    const categoryId = document.getElementById('mainCategoryId').value;
    const category = window.mainCategories.find(c => c.id === categoryId);
    
    const formData = {
        mainCategoryId: categoryId,
        mainCategoryName: category.name,
        code: document.getElementById('code').value.trim(),
        name: document.getElementById('name').value.trim(),
        brand: document.getElementById('brand').value.trim(),
        model: document.getElementById('model').value.trim(),
        unit: document.getElementById('unit').value,
        price: parseFloat(document.getElementById('price').value) || 0,
        specifications: collectSpecifications(),
        description: document.getElementById('description').value.trim(),
        updatedAt: new Date().toISOString()
    };
    
    if (!formData.code || !formData.name || !formData.unit) {
        showNotification('Hata', 'Zorunlu alanları doldurun', 'error');
        return;
    }
    
    try {
        if (stockCardId) {
            await window.firestoreService.updateStockCard(stockCardId, formData);
            showNotification('Başarılı', 'Stok kartı güncellendi', 'success');
        } else {
            formData.createdAt = new Date().toISOString();
            formData.createdBy = window.currentUser.id;
            await window.firestoreService.addStockCard(formData);
            showNotification('Başarılı', 'Stok kartı eklendi', 'success');
        }
        
        closeStockCardModal();
        await loadCategoryProducts(categoryId);
    } catch (error) {
        console.error('Kayıt hatası:', error);
        showNotification('Hata', 'Kayıt başarısız', 'error');
    }
}
// viewStockCard fonksiyonunu güncelle
async function viewStockCard(stockCardId) {
    try {
        const card = await window.firestoreService.getStockCard(stockCardId);
        if (!card) {
            showNotification('Hata', 'Stok kartı bulunamadı', 'error');
            return;
        }
        
        const category = window.mainCategories.find(c => c.id === card.mainCategoryId);
        
        const specificationsHTML = card.specifications && card.specifications.length > 0 ? `
            <div class="form-section">
                <div class="form-section-title">Teknik Özellikler</div>
                <table class="specifications-table">
                    ${card.specifications.map(spec => `
                        <tr>
                            <td>${spec.name}</td>
                            <td>${spec.value}</td>
                        </tr>
                    `).join('')}
                </table>
            </div>
        ` : '';
        
        const modalHTML = `
            <div id="stockCardViewModal" class="modal show">
                <div class="modal-content" style="max-width: 800px;">
                    <div class="modal-header">
                        <h3 class="modal-title">Stok Kartı Detayı</h3>
                        <button class="modal-close" onclick="closeModal('stockCardViewModal')">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    <div class="modal-body">
                        <div class="stock-detail-header">
                            <h2>${card.name}</h2>
                            <div class="subtitle">
                                <i class="fas ${category?.icon || 'fa-box'}"></i> ${category?.name || 'Kategori'} | 
                                Kod: ${card.code}
                            </div>
                        </div>
                        
                        <div class="detail-info-grid">
                            <div class="detail-info-item">
                                <div class="detail-info-label">Ürün Kodu</div>
                                <div class="detail-info-value">${card.code || '-'}</div>
                            </div>
                            <div class="detail-info-item">
                                <div class="detail-info-label">Marka</div>
                                <div class="detail-info-value">${card.brand || '-'}</div>
                            </div>
                            <div class="detail-info-item">
                                <div class="detail-info-label">Model</div>
                                <div class="detail-info-value">${card.model || '-'}</div>
                            </div>
                            <div class="detail-info-item">
                                <div class="detail-info-label">Birim</div>
                                <div class="detail-info-value">${card.unit || '-'}</div>
                            </div>
                            <div class="detail-info-item">
                                <div class="detail-info-label">Fiyat</div>
                                <div class="detail-info-value" style="color: var(--success);">
                                    ${card.price ? card.price + ' ₺' : '-'}
                                </div>
                            </div>
                            <div class="detail-info-item">
                                <div class="detail-info-label">Kategori</div>
                                <div class="detail-info-value">${category?.name || '-'}</div>
                            </div>
                        </div>
                        
                        ${specificationsHTML}
                        
                        ${card.description ? `
                            <div class="description-section">
                                <h4>Ürün Açıklaması</h4>
                                <div class="description-text">${card.description}</div>
                            </div>
                        ` : ''}
                    </div>
                    <div class="modal-footer">
                        <button class="btn btn-primary" onclick="editStockCard('${stockCardId}')">
                            <i class="fas fa-edit"></i> Düzenle
                        </button>
                        <button class="btn btn-outline" onclick="closeModal('stockCardViewModal')">Kapat</button>
                    </div>
                </div>
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', modalHTML);
    } catch (error) {
        console.error('Görüntüleme hatası:', error);
        showNotification('Hata', 'Stok kartı yüklenemedi', 'error');
    }
}

function openStockCardModal() {
    if (!window.selectedCategoryId) {
        showNotification('Uyarı', 'Lütfen önce kategori seçin', 'warning');
        return;
    }
    
    const category = window.mainCategories.find(c => c.id === window.selectedCategoryId);
    
    const modalHTML = `
        <div id="stockCardFormModal" class="modal show">
            <div class="modal-content" style="max-width: 800px; max-height: 90vh; overflow-y: auto;">
                <div class="modal-header" style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white;">
                    <h3 class="modal-title">
                        <i class="fas fa-plus-circle"></i> Yeni Stok Kartı Ekle
                    </h3>
                    <button class="modal-close" onclick="closeStockCardModal()" style="color: white;">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                
                <div class="modal-body" style="padding: 20px;">
                    <!-- Kategori Bilgisi -->
                    <div style="background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%); padding: 15px; border-radius: 10px; margin-bottom: 20px; border-left: 4px solid #10b981;">
                        <div style="display: flex; align-items: center; gap: 10px;">
                            <i class="fas ${category?.icon || 'fa-folder'}" style="color: #10b981; font-size: 20px;"></i>
                            <div>
                                <strong style="color: #065f46;">Kategori:</strong> 
                                <span style="color: #047857; font-weight: 600;">${category?.name || 'Belirtilmemiş'}</span>
                            </div>
                        </div>
                    </div>
                    
                    <form id="stockCardForm" onsubmit="return false;">
                        <input type="hidden" id="mainCategoryId" value="${window.selectedCategoryId}">
                        
                        <!-- Temel Bilgiler -->
                        <div class="form-section" style="margin-bottom: 25px;">
                            <h4 style="color: #1f2937; margin-bottom: 15px; padding-bottom: 10px; border-bottom: 2px solid #e5e7eb; font-size: 16px;">
                                <i class="fas fa-info-circle" style="color: #6b7280;"></i> Temel Bilgiler
                            </h4>
                            <div class="form-grid" style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
                                <div class="form-group">
                                    <label class="form-label" style="font-weight: 600; color: #374151; margin-bottom: 5px; display: block;">
                                        Ürün Kodu <span style="color: #ef4444;">*</span>
                                    </label>
                                    <input type="text" 
                                           class="form-control" 
                                           id="code" 
                                           placeholder="Örn: PRD-001"
                                           required
                                           style="width: 100%; padding: 8px 12px; border: 1px solid #d1d5db; border-radius: 6px;">
                                </div>
                                
                                <div class="form-group">
                                    <label class="form-label" style="font-weight: 600; color: #374151; margin-bottom: 5px; display: block;">
                                        Ürün Adı <span style="color: #ef4444;">*</span>
                                    </label>
                                    <input type="text" 
                                           class="form-control" 
                                           id="name" 
                                           placeholder="Ürün adını girin"
                                           required
                                           style="width: 100%; padding: 8px 12px; border: 1px solid #d1d5db; border-radius: 6px;">
                                </div>
                                
                                <div class="form-group">
                                    <label class="form-label" style="font-weight: 600; color: #374151; margin-bottom: 5px; display: block;">
                                        Marka
                                    </label>
                                    <input type="text" 
                                           class="form-control" 
                                           id="brand" 
                                           placeholder="Marka adı"
                                           style="width: 100%; padding: 8px 12px; border: 1px solid #d1d5db; border-radius: 6px;">
                                </div>
                                
                                <div class="form-group">
                                    <label class="form-label" style="font-weight: 600; color: #374151; margin-bottom: 5px; display: block;">
                                        Model
                                    </label>
                                    <input type="text" 
                                           class="form-control" 
                                           id="model" 
                                           placeholder="Model numarası"
                                           style="width: 100%; padding: 8px 12px; border: 1px solid #d1d5db; border-radius: 6px;">
                                </div>
                                
                                <div class="form-group">
                                    <label class="form-label" style="font-weight: 600; color: #374151; margin-bottom: 5px; display: block;">
                                        Birim <span style="color: #ef4444;">*</span>
                                    </label>
                                    <select class="form-control" 
                                            id="unit" 
                                            required
                                            style="width: 100%; padding: 8px 12px; border: 1px solid #d1d5db; border-radius: 6px; background: white;">
                                        <option value="">Seçiniz...</option>
                                        <option value="adet">Adet</option>
                                        <option value="kg">Kilogram</option>
                                        <option value="litre">Litre</option>
                                        <option value="metre">Metre</option>
                                        <option value="paket">Paket</option>
                                        <option value="kutu">Kutu</option>
                                        <option value="koli">Koli</option>
                                        <option value="rulo">Rulo</option>
                                        <option value="ton">Ton</option>
                                        <option value="m2">Metrekare</option>
                                        <option value="m3">Metreküp</option>
                                    </select>
                                </div>
                                
                                <div class="form-group">
                                    <label class="form-label" style="font-weight: 600; color: #374151; margin-bottom: 5px; display: block;">
                                        Birim Fiyat (₺)
                                    </label>
                                    <input type="number" 
                                           class="form-control" 
                                           id="price" 
                                           placeholder="0.00"
                                           min="0" 
                                           step="0.01"
                                           style="width: 100%; padding: 8px 12px; border: 1px solid #d1d5db; border-radius: 6px;">
                                </div>
                            </div>
                        </div>
                        
                        <!-- Teknik Özellikler -->
                        <div class="form-section" style="margin-bottom: 25px;">
                            <h4 style="color: #1f2937; margin-bottom: 15px; padding-bottom: 10px; border-bottom: 2px solid #e5e7eb; font-size: 16px;">
                                <i class="fas fa-cogs" style="color: #6b7280;"></i> Teknik Özellikler
                            </h4>
                            <div style="margin-bottom: 10px;">
                                <button type="button" 
                                        class="btn btn-sm" 
                                        onclick="addSpecification()"
                                        style="background: #3b82f6; color: white; padding: 6px 12px; border-radius: 6px; border: none; cursor: pointer;">
                                    <i class="fas fa-plus"></i> Özellik Ekle
                                </button>
                                <span style="margin-left: 10px; color: #6b7280; font-size: 13px;">
                                    İsteğe bağlı - Ürünün teknik özelliklerini ekleyebilirsiniz
                                </span>
                            </div>
                            <div id="specifications_list" style="display: flex; flex-direction: column; gap: 10px;">
                                <!-- Varsayılan olarak bir boş özellik ekleyelim -->
                            </div>
                        </div>
                        
                        <!-- Açıklama -->
                        <div class="form-section">
                            <h4 style="color: #1f2937; margin-bottom: 15px; padding-bottom: 10px; border-bottom: 2px solid #e5e7eb; font-size: 16px;">
                                <i class="fas fa-align-left" style="color: #6b7280;"></i> Açıklama
                            </h4>
                            <textarea class="form-control" 
                                      id="description" 
                                      rows="4" 
                                      placeholder="Ürün hakkında detaylı bilgi girebilirsiniz..."
                                      style="width: 100%; padding: 10px; border: 1px solid #d1d5db; border-radius: 6px; resize: vertical;"></textarea>
                        </div>
                    </form>
                </div>
                
                <div class="modal-footer" style="padding: 20px; border-top: 1px solid #e5e7eb; display: flex; gap: 10px; justify-content: flex-end;">
                    <button class="btn btn-outline" 
                            onclick="closeStockCardModal()"
                            style="padding: 8px 20px; border: 1px solid #d1d5db; background: white; border-radius: 6px; cursor: pointer;">
                        <i class="fas fa-times"></i> İptal
                    </button>
                    <button class="btn btn-success" 
                            onclick="saveStockCard()"
                            style="padding: 8px 20px; background: #10b981; color: white; border: none; border-radius: 6px; cursor: pointer;">
                        <i class="fas fa-save"></i> Kaydet
                    </button>
                </div>
            </div>
        </div>
    `;
    
    // Önce eski modalı temizle
    const existingModal = document.getElementById('stockCardFormModal');
    if (existingModal) {
        existingModal.remove();
    }
    
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    
    // Varsayılan olarak bir özellik alanı ekle
    setTimeout(() => {
        addSpecification();
    }, 100);
}

function addSpecification() {
    const container = document.getElementById('specifications_list');
    if (!container) return;
    
    const specId = Date.now();
    
    const specHTML = `
        <div class="specification-item" id="spec_${specId}" style="display: flex; gap: 10px; align-items: center; padding: 10px; background: #f8f9fa; border-radius: 6px;">
            <input type="text" class="form-control spec-name" placeholder="Özellik adı" style="flex: 1;">
            <input type="text" class="form-control spec-value" placeholder="Değer" style="flex: 1;">
            <select class="form-control spec-type" style="width: 120px;">
                <option value="text">Metin</option>
                <option value="number">Sayı</option>
                <option value="boolean">Evet/Hayır</option>
            </select>
            <button type="button" class="btn btn-sm btn-danger" onclick="removeSpecification('spec_${specId}')" title="Kaldır">
                <i class="fas fa-times"></i>
            </button>
        </div>
    `;
    
    container.insertAdjacentHTML('beforeend', specHTML);
}

async function editStockCard(stockCardId) {
    try {
        const card = await window.firestoreService.getStockCard(stockCardId);
        if (!card) {
            showNotification('Hata', 'Stok kartı bulunamadı', 'error');
            return;
        }
        
        // Varsa görüntüleme modalını kapat
        const viewModal = document.getElementById('stockCardViewModal');
        if (viewModal) {
            viewModal.remove();
        }
        
        const category = window.mainCategories.find(c => c.id === card.mainCategoryId);
        
        const modalHTML = `
            <div id="stockCardFormModal" class="modal show">
                <div class="modal-content" style="max-width: 800px; max-height: 90vh; overflow-y: auto;">
                    <div class="modal-header" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white;">
                        <h3 class="modal-title">
                            <i class="fas fa-edit"></i> Stok Kartı Düzenle
                        </h3>
                        <button class="modal-close" onclick="closeStockCardModal()" style="color: white;">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    
                    <div class="modal-body" style="padding: 20px;">
                        <!-- Kategori Bilgisi -->
                        <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; margin-bottom: 20px; border-left: 4px solid var(--primary);">
                            <div style="display: flex; align-items: center; gap: 10px;">
                                <i class="fas ${category?.icon || 'fa-folder'}" style="color: var(--primary);"></i>
                                <strong>Kategori:</strong> ${category?.name || 'Belirtilmemiş'}
                            </div>
                        </div>
                        
                        <form id="stockCardForm">
                            <input type="hidden" id="mainCategoryId" value="${card.mainCategoryId}">
                            
                            <!-- Temel Bilgiler -->
                            <div class="form-section" style="margin-bottom: 25px;">
                                <h4 style="color: #333; margin-bottom: 15px; padding-bottom: 10px; border-bottom: 2px solid #e5e7eb;">
                                    <i class="fas fa-info-circle"></i> Temel Bilgiler
                                </h4>
                                <div class="form-grid" style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
                                    <div class="form-group">
                                        <label class="form-label">Ürün Kodu <span style="color: red;">*</span></label>
                                        <input type="text" class="form-control" id="code" value="${card.code || ''}" required>
                                    </div>
                                    <div class="form-group">
                                        <label class="form-label">Ürün Adı <span style="color: red;">*</span></label>
                                        <input type="text" class="form-control" id="name" value="${card.name || ''}" required>
                                    </div>
                                    <div class="form-group">
                                        <label class="form-label">Marka</label>
                                        <input type="text" class="form-control" id="brand" value="${card.brand || ''}">
                                    </div>
                                    <div class="form-group">
                                        <label class="form-label">Model</label>
                                        <input type="text" class="form-control" id="model" value="${card.model || ''}">
                                    </div>
                                    <div class="form-group">
                                        <label class="form-label">Birim <span style="color: red;">*</span></label>
                                        <select class="form-control" id="unit" required>
                                            <option value="">Seçiniz...</option>
                                            <option value="adet" ${card.unit === 'adet' ? 'selected' : ''}>Adet</option>
                                            <option value="kg" ${card.unit === 'kg' ? 'selected' : ''}>Kilogram</option>
                                            <option value="litre" ${card.unit === 'litre' ? 'selected' : ''}>Litre</option>
                                            <option value="metre" ${card.unit === 'metre' ? 'selected' : ''}>Metre</option>
                                            <option value="paket" ${card.unit === 'paket' ? 'selected' : ''}>Paket</option>
                                            <option value="kutu" ${card.unit === 'kutu' ? 'selected' : ''}>Kutu</option>
                                            <option value="rulo" ${card.unit === 'rulo' ? 'selected' : ''}>Rulo</option>
                                        </select>
                                    </div>
                                    <div class="form-group">
                                        <label class="form-label">Birim Fiyat (₺)</label>
                                        <input type="number" class="form-control" id="price" value="${card.price || ''}" min="0" step="0.01">
                                    </div>
                                </div>
                            </div>
                            
                            <!-- Teknik Özellikler -->
                            <div class="form-section" style="margin-bottom: 25px;">
                                <h4 style="color: #333; margin-bottom: 15px; padding-bottom: 10px; border-bottom: 2px solid #e5e7eb;">
                                    <i class="fas fa-cogs"></i> Teknik Özellikler
                                </h4>
                                <div style="margin-bottom: 10px;">
                                    <button type="button" class="btn btn-sm btn-primary" onclick="addSpecification()">
                                        <i class="fas fa-plus"></i> Özellik Ekle
                                    </button>
                                </div>
                                <div id="specifications_list" style="display: flex; flex-direction: column; gap: 10px;">
                                    <!-- Özellikler buraya yüklenecek -->
                                </div>
                            </div>
                            
                            <!-- Açıklama -->
                            <div class="form-section">
                                <h4 style="color: #333; margin-bottom: 15px; padding-bottom: 10px; border-bottom: 2px solid #e5e7eb;">
                                    <i class="fas fa-align-left"></i> Açıklama
                                </h4>
                                <textarea class="form-control" id="description" rows="4" 
                                          placeholder="Ürün hakkında detaylı bilgi...">${card.description || ''}</textarea>
                            </div>
                        </form>
                    </div>
                    
                    <div class="modal-footer" style="display: flex; gap: 10px; justify-content: space-between;">
                        <button class="btn btn-danger" onclick="deleteStockCardConfirm('${stockCardId}')">
                            <i class="fas fa-trash"></i> Sil
                        </button>
                        <div style="display: flex; gap: 10px;">
                            <button class="btn btn-outline" onclick="closeStockCardModal()">
                                <i class="fas fa-times"></i> İptal
                            </button>
                            <button class="btn btn-success" onclick="saveStockCard('${stockCardId}')">
                                <i class="fas fa-save"></i> Güncelle
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        // Önce eski modalı temizle
        const existingModal = document.getElementById('stockCardFormModal');
        if (existingModal) {
            existingModal.remove();
        }
        
        document.body.insertAdjacentHTML('beforeend', modalHTML);
        
        // Teknik özellikleri yükle
        setTimeout(() => {
            if (card.specifications && card.specifications.length > 0) {
                loadSpecifications(card.specifications);
            } else {
                // En az bir boş özellik alanı ekle
                addSpecification();
            }
        }, 100);
        
    } catch (error) {
        console.error('Düzenleme hatası:', error);
        showNotification('Hata', 'Stok kartı yüklenemedi', 'error');
    }
}

async function deleteStockCardFromModal(stockCardId) {
    if (!confirm('Bu stok kartını silmek istediğinize emin misiniz?\n\nBu işlem geri alınamaz!')) {
        return;
    }
    
    try {
        await window.firestoreService.deleteStockCard(stockCardId);
        showNotification('Başarılı', 'Stok kartı silindi', 'success');
        closeStockCardModal();
        
        // Listeyi yenile
        if (window.selectedCategoryId) {
            await loadCategoryProducts(window.selectedCategoryId);
        }
    } catch (error) {
        console.error('Silme hatası:', error);
        showNotification('Hata', 'Silme işlemi başarısız', 'error');
    }
}

// Stok kartı sil
async function deleteStockCard(stockCardId) {
    if (!confirm('Bu stok kartını silmek istediğinize emin misiniz?')) {
        return;
    }
    
    try {
        await window.firestoreService.deleteStockCard(stockCardId);
        showNotification('Başarılı', 'Stok kartı silindi', 'success');
        
        // Listeyi yenile
        if (window.selectedCategoryId) {
            await loadCategoryProducts(window.selectedCategoryId);
        }
    } catch (error) {
        console.error('Silme hatası:', error);
        showNotification('Hata', 'Silme işlemi başarısız', 'error');
    }
}



// Teknik özellik kaldır
function removeSpecification(specId) {
    const element = document.getElementById(specId);
    if (element) {
        element.remove();
    }
}

function collectSpecifications() {
    const specifications = [];
    document.querySelectorAll('.specification-item').forEach(item => {
        const name = item.querySelector('.spec-name')?.value?.trim();
        const value = item.querySelector('.spec-value')?.value?.trim();
        const type = item.querySelector('.spec-type')?.value || 'text';
        
        if (name && value) {
            specifications.push({ name, value, type });
        }
    });
    return specifications;
}

function loadSpecifications(specifications = []) {
    const container = document.getElementById('specifications_list');
    if (!container) return;
    
    container.innerHTML = '';
    
    specifications.forEach(spec => {
        const specId = Date.now() + Math.floor(Math.random() * 1000);
        const specHTML = `
            <div class="specification-item" id="spec_${specId}" style="display: flex; gap: 10px; align-items: center; padding: 10px; background: #f8f9fa; border-radius: 6px;">
                <input type="text" class="form-control spec-name" value="${spec.name || ''}" placeholder="Özellik adı" style="flex: 1;">
                <input type="text" class="form-control spec-value" value="${spec.value || ''}" placeholder="Değer" style="flex: 1;">
                <select class="form-control spec-type" style="width: 120px;">
                    <option value="text" ${spec.type === 'text' ? 'selected' : ''}>Metin</option>
                    <option value="number" ${spec.type === 'number' ? 'selected' : ''}>Sayı</option>
                    <option value="boolean" ${spec.type === 'boolean' ? 'selected' : ''}>Evet/Hayır</option>
                </select>
                <button type="button" class="btn btn-sm btn-danger" onclick="removeSpecification('spec_${specId}')" title="Kaldır">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `;
        container.insertAdjacentHTML('beforeend', specHTML);
    });
    
    // Eğer hiç özellik yoksa bir tane boş ekle
    if (specifications.length === 0) {
        addSpecification();
    }
}

// Modal kapat
function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.remove();
    }
}

function closeStockCardModal() {
    closeModal('stockCardFormModal');
}

function deleteStockCardConfirm(stockCardId) {
    if (!confirm('Bu stok kartını silmek istediğinize emin misiniz?\n\nBu işlem geri alınamaz!')) {
        return;
    }
    
    deleteStockCardFromModal(stockCardId);
}


// Global fonksiyonları export et
window.initializeStockCard = initializeStockCard;
window.loadMainCategories = loadMainCategories;
window.loadCategoryModalFields = loadCategoryModalFields;
window.loadStockCards = loadStockCards;
window.displayCategories = displayCategories;
window.getCategoryColor = getCategoryColor;
window.filterCategories = filterCategories;
window.selectCategory = selectCategory;
window.backToCategories = backToCategories;
window.loadCategoryProducts = loadCategoryProducts;
window.filterStockCards = filterStockCards;
window.displayStockCards = displayStockCards;
window.openStockCardModal = openStockCardModal;
window.saveStockCard = saveStockCard;
window.viewStockCard = viewStockCard;
window.editStockCard = editStockCard;
window.deleteStockCard = deleteStockCard;
window.addSpecification = addSpecification;
window.removeSpecification = removeSpecification;
window.collectSpecifications = collectSpecifications;
window.loadSpecifications = loadSpecifications;
window.closeModal = closeModal;
window.closeStockCardModal = closeStockCardModal;
window.deleteStockCardFromModal = deleteStockCardFromModal;
window.deleteStockCardConfirm = deleteStockCardConfirm;

console.log('✅ Stock Card modülü yüklendi');
       