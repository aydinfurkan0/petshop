// storage-updated.js - ANA MAMÜL & YAN MAMÜL Yönetimi Modülü
// ========================================
// ANA MAMÜL & YAN MAMÜL YÖNETİMİ FONKSİYONLARI
// ========================================

// storage-updated.js - loadDepo fonksiyonunu güncelle (satır 10 civarı)
function loadDepo() {
    const content = `
        <div class="page-header">
            <h1 class="page-title"><i class="fas fa-warehouse"></i> Mamül Yönetimi</h1>
            <p class="page-subtitle">Ana Mamül ve Yan Mamül stoklarını yönetin</p>
        </div>
        
        <div class="stats-grid">
            <div class="stat-card">
                <div class="stat-icon primary"><i class="fas fa-cube"></i></div>
                <div class="stat-value">${firebaseData.products.filter(p => p.type === 'ana_mamul').length}</div>
                <div class="stat-label">Ana Mamül</div>
            </div>
            <div class="stat-card">
                <div class="stat-icon success"><i class="fas fa-cubes"></i></div>
                <div class="stat-value">${firebaseData.products.filter(p => p.type === 'yan_mamul').length}</div>
                <div class="stat-label">Yan Mamül</div>
            </div>
            <div class="stat-card">
                <div class="stat-icon info"><i class="fas fa-box"></i></div>
                <div class="stat-value">${firebaseData.stock?.length || 0}</div>
                <div class="stat-label">Toplam Hammadde</div>
            </div>
            <div class="stat-card">
                <div class="stat-icon danger"><i class="fas fa-exclamation-triangle"></i></div>
                <div class="stat-value">${firebaseData.stock?.filter(s => s.quantity <= s.minStock).length || 0}</div>
                <div class="stat-label">Kritik Hammadde</div>
            </div>
        </div>

        <div class="card">
            <div class="card-header">
                <div class="flex justify-between items-center">
                    <div>
                        <h3 class="card-title">Mamül Listesi</h3>
                        <p class="card-subtitle">Ana Mamül ve Yan Mamül stokları</p>
                    </div>
                    <button class="btn btn-primary" onclick="addMamul()">
                        <i class="fas fa-plus"></i> Mamül Ekle
                    </button>
                </div>
            </div>
            <div class="card-body">
                <!-- Mamül Türü Sekmeleri -->
                <div class="tabs" style="margin-bottom: 20px;">
                    <button class="tab active" onclick="filterMamulByType('all', this)">
                        <i class="fas fa-th-list"></i> Tümü
                    </button>
                    <button class="tab" onclick="filterMamulByType('ana_mamul', this)">
                        <i class="fas fa-cube"></i> Ana Mamül
                    </button>
                    <button class="tab" onclick="filterMamulByType('yan_mamul', this)">
                        <i class="fas fa-cubes"></i> Yan Mamül
                    </button>
                </div>

                <div class="filter-bar" style="margin-bottom: 20px;">
                    <div class="search-box">
                        <i class="fas fa-search"></i>
                        <input type="text" placeholder="Mamül ara..." onkeyup="searchMamul(this.value)">
                    </div>
                </div>

                <div class="table-container">
                    <table class="table">
                        <thead>
                            <tr>
                                <th>Mamül Kodu</th>
                                <th>Mamül Adı</th>
                                <th>Tip</th>
                                <th>Miktar</th>
                                <th>Birim</th>
                                <th>Min. Stok</th>
                                <th>Durum</th>
                                <th>İşlemler</th>
                            </tr>
                        </thead>
                        <tbody id="mamulTableBody">
                            ${generateMamulTableRows()}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    `;
    document.getElementById('pageContent').innerHTML = content;
}

// addMamul fonksiyonunu güncelle - KATEGORİ KALDIRILIYOR
function addMamul() {
    let modal = document.getElementById('mamulAddModal');
    if (modal) modal.remove();
    
    const modalHTML = `
        <div id="mamulAddModal" class="modal show">
            <div class="modal-content">
                <div class="modal-header">
                    <h3 class="modal-title">Yeni Mamül Ekle</h3>
                    <button class="modal-close" onclick="closeModal('mamulAddModal')">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="modal-body">
                    <form id="mamulAddForm">
                        <!-- Mamül Tipi Seçimi -->
                        <div class="form-group">
                            <label class="form-label">Mamül Tipi <span style="color: red;">*</span></label>
                            <div class="radio-group">
                                <label class="radio-option">
                                    <input type="radio" name="mamulType" value="ana_mamul" checked>
                                    <span class="radio-custom"></span>
                                    <i class="fas fa-cube"></i> Ana Mamül
                                </label>
                                <label class="radio-option">
                                    <input type="radio" name="mamulType" value="yan_mamul">
                                    <span class="radio-custom"></span>
                                    <i class="fas fa-cubes"></i> Yan Mamül (Hammadde)
                                </label>
                            </div>
                        </div>

                        <div class="form-grid">
                            <div class="form-group">
                                <label class="form-label">Mamül Kodu</label>
                                <input type="text" class="form-control" id="newMamulCode" 
                                       value="MAM-${String(firebaseData.products.length + 1).padStart(4, '0')}" required>
                            </div>
                            <div class="form-group">
                                <label class="form-label">Barkod</label>
                                <input type="text" class="form-control" id="newMamulBarcode" placeholder="Barkod numarası">
                            </div>
                            <div class="form-group">
                                <label class="form-label">Mamül Adı <span style="color: red;">*</span></label>
                                <input type="text" class="form-control" id="newMamulName" required>
                            </div>
                            <div class="form-group">
                                <label class="form-label">Miktar</label>
                                <input type="number" class="form-control" id="newMamulQuantity" value="0" min="0">
                            </div>
                            <div class="form-group">
                                <label class="form-label">Birim</label>
                                <select class="form-control" id="newMamulUnit" required>
                                    <option value="adet">Adet</option>
                                    <option value="kg">Kilogram</option>
                                    <option value="metre">Metre</option>
                                    <option value="litre">Litre</option>
                                </select>
                            </div>
                            <div class="form-group">
                                <label class="form-label">Minimum Stok</label>
                                <input type="number" class="form-control" id="newMamulMinStock" value="10" min="0">
                            </div>
                            <div class="form-group">
                                <label class="form-label">Birim Fiyat ($)</label>
                                <input type="number" class="form-control" id="newMamulPrice" value="0" min="0" step="0.01">
                            </div>
                        </div>
                        
                        <div class="form-group">
                            <label class="form-label">Açıklama</label>
                            <textarea class="form-control" id="newMamulDescription" rows="3"></textarea>
                        </div>
                    </form>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-success" onclick="saveMamul()">
                        <i class="fas fa-save"></i> Kaydet
                    </button>
                    <button class="btn btn-outline" onclick="closeModal('mamulAddModal')">İptal</button>
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHTML);
}

// saveMamul fonksiyonunu güncelle
async function saveMamul(mamulId = null) {
    const isEdit = !!mamulId;
    const prefix = isEdit ? 'edit' : 'new';
    
    const type = document.querySelector('input[name="mamulType"]:checked')?.value || 'ana_mamul';
    const code = document.getElementById(`${prefix}MamulCode`).value;
    const barcode = document.getElementById(`${prefix}MamulBarcode`).value;
    const name = document.getElementById(`${prefix}MamulName`).value;
    const quantity = parseInt(document.getElementById(`${prefix}MamulQuantity`).value) || 0;
    const unit = document.getElementById(`${prefix}MamulUnit`).value;
    const minStock = parseInt(document.getElementById(`${prefix}MamulMinStock`).value) || 0;
    const price = parseFloat(document.getElementById(`${prefix}MamulPrice`).value) || 0;
    const description = document.getElementById(`${prefix}MamulDescription`)?.value || '';
    
    if (!code || !name || !unit) {
        showNotification('Hata', 'Lütfen gerekli alanları doldurun.', 'error');
        return;
    }
    
    const mamulData = {
        code,
        barcode,
        name,
        type,
        quantity,
        unit,
        minStock,
        price,
        description,
        lastUpdate: new Date().toLocaleDateString('tr-TR'),
        active: true
    };
    
    try {
        if (isEdit) {
            await window.firestoreService.updateProduct(mamulId, mamulData);
            showNotification('Güncellendi', 'Mamül güncellendi.', 'success');
        } else {
            // Yan mamül ise hem products'a hem stock'a ekle
            if (type === 'yan_mamul') {
                // Stock'a da ekle (hammadde olarak)
                await window.firestoreService.addStock({
                    ...mamulData,
                    category: 'Hammadde'
                });
            }
            await window.firestoreService.addProduct(mamulData);
            showNotification('Eklendi', 'Yeni mamül eklendi.', 'success');
        }
        
        closeModal(isEdit ? 'mamulEditModal' : 'mamulAddModal');
        await loadFirebaseData();
        loadDepo();
        
    } catch (error) {
        console.error('Mamül kaydetme hatası:', error);
        showNotification('Hata', 'Mamül kaydedilemedi.', 'error');
    }
}

// Mamül tablosu satırlarını oluştur
function generateMamulTableRows() {
    const allProducts = firebaseData.products || [];
    return allProducts.map(item => `
        <tr data-mamul-id="${item.id}" data-type="${item.type || 'ana_mamul'}">
            <td>${item.code || '-'}</td>
            <td>${item.barcode || '-'}</td>
            <td><strong>${item.name}</strong></td>
            <td>
                <span class="badge ${item.type === 'yan_mamul' ? 'info' : 'primary'}">
                    <i class="fas ${item.type === 'yan_mamul' ? 'fa-cubes' : 'fa-cube'}"></i>
                    ${item.type === 'yan_mamul' ? 'Yan Mamül' : 'Ana Mamül'}
                </span>
            </td>
            <td>
                <span class="badge secondary">${item.category || 'Kategori Yok'}</span>
            </td>
            <td>${item.quantity || 0}</td>
            <td>${item.unit || 'Adet'}</td>
            <td>${item.minStock || 0}</td>
            <td>
                ${(item.quantity || 0) > (item.minStock || 0)
                    ? '<span class="badge success">Yeterli</span>'
                    : (item.quantity || 0) > 0
                        ? '<span class="badge warning">Kritik</span>'
                        : '<span class="badge danger">Tükendi</span>'
                }
            </td>
            <td>${item.lastUpdate || new Date().toLocaleDateString('tr-TR')}</td>
            <td>
                <div class="action-buttons">
                    <button class="action-btn view" onclick="showMamulDetails('${item.id}')">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="action-btn edit" onclick="editMamul('${item.id}')">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="action-btn delete" onclick="deleteMamul('${item.id}')">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </td>
        </tr>
    `).join('');
}

// Mamül tipine göre filtrele
function filterMamulByType(type, button) {
    // Aktif tab'ı güncelle
    document.querySelectorAll('.tab').forEach(tab => tab.classList.remove('active'));
    button.classList.add('active');

    const rows = document.querySelectorAll('#mamulTableBody tr');
    rows.forEach(row => {
        const rowType = row.dataset.type || 'ana_mamul';
        if (type === 'all' || rowType === type) {
            row.style.display = '';
        } else {
            row.style.display = 'none';
        }
    });

    // Görünür satır sayısını güncelle
    updateVisibleRowCount();
}

// Kategori ile filtrele
function filterMamulByCategory(category) {
    const rows = document.querySelectorAll('#mamulTableBody tr');
    rows.forEach(row => {
        const mamulId = row.dataset.mamulId;
        const mamul = firebaseData.products.find(p => p.id === mamulId);
        
        if (!category || (mamul && mamul.category === category)) {
            row.style.display = '';
        } else {
            row.style.display = 'none';
        }
    });
    
    updateVisibleRowCount();
}

// Mamül arama fonksiyonu
function searchMamul(query) {
    const rows = document.querySelectorAll('#mamulTableBody tr');
    rows.forEach(row => {
        const mamulId = row.dataset.mamulId;
        const mamul = firebaseData.products.find(p => p.id === mamulId);
        
        if (!mamul) return;
        
        const searchText = `${mamul.name} ${mamul.code} ${mamul.barcode || ''}`.toLowerCase();
        if (searchText.includes(query.toLowerCase())) {
            row.style.display = '';
        } else {
            row.style.display = 'none';
        }
    });
    
    updateVisibleRowCount();
}

// Görünür satır sayısını güncelle
function updateVisibleRowCount() {
    const visibleRows = document.querySelectorAll('#mamulTableBody tr[style=""], #mamulTableBody tr:not([style])');
    const totalRows = document.querySelectorAll('#mamulTableBody tr').length;
    
    console.log(`Gösterilen: ${visibleRows.length} / ${totalRows} mamül`);
}



// Mamül tipi değiştiğinde alanları güncelle
function updateMamulTypeFields() {
    const selectedType = document.querySelector('input[name="mamulType"]:checked').value;
    const codeField = document.getElementById('newMamulCode');
    const currentNumber = firebaseData.products.length + 1;
    
    if (selectedType === 'ana_mamul') {
        codeField.value = `ANA-${String(currentNumber).padStart(4, '0')}`;
    } else {
        codeField.value = `YAN-${String(currentNumber).padStart(4, '0')}`;
    }
}

// Kategori değiştiğinde özel alanları güncelle
function updateCategoryFields() {
    const category = document.getElementById('newMamulCategory').value;
    const fieldsContainer = document.getElementById('categorySpecificFields');
    
    // Kategori bazlı özel alanlar
    let specificFields = '';
    
    switch(category) {
        case 'Kontrol Sistemleri':
            specificFields = `
                <h5>Kontrol Sistemi Özellikleri</h5>
                <div class="form-grid">
                    <div class="form-group">
                        <label class="form-label">Giriş Voltajı (V)</label>
                        <input type="text" class="form-control" id="inputVoltage" placeholder="12V, 24V, 220V">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Çıkış Gücü (W)</label>
                        <input type="number" class="form-control" id="outputPower" placeholder="10">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Kanal Sayısı</label>
                        <input type="number" class="form-control" id="channelCount" placeholder="4">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Protokol</label>
                        <select class="form-control" id="protocol">
                            <option value="">Seçiniz...</option>
                            <option value="DMX">DMX</option>
                            <option value="SPI">SPI</option>
                            <option value="DALI">DALI</option>
                            <option value="Artnet">Artnet</option>
                        </select>
                    </div>
                </div>
            `;
            break;
            
        case 'Spot Armatürler':
        case 'Wallwasher armatürler':
        case 'Çizgisel armatürler':
            specificFields = `
                <h5>Armatür Özellikleri</h5>
                <div class="form-grid">
                    <div class="form-group">
                        <label class="form-label">LED Gücü (W)</label>
                        <input type="number" class="form-control" id="ledPower" placeholder="10">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Renk Sıcaklığı (K)</label>
                        <input type="text" class="form-control" id="colorTemp" placeholder="3000K, 4000K, 6000K">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Işık Akısı (lm)</label>
                        <input type="number" class="form-control" id="lumens" placeholder="1000">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Işın Açısı (°)</label>
                        <input type="text" class="form-control" id="beamAngle" placeholder="15°, 30°, 60°">
                    </div>
                    <div class="form-group">
                        <label class="form-label">IP Koruma Sınıfı</label>
                        <select class="form-control" id="ipRating">
                            <option value="">Seçiniz...</option>
                            <option value="IP20">IP20</option>
                            <option value="IP44">IP44</option>
                            <option value="IP65">IP65</option>
                            <option value="IP67">IP67</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Boyut (mm)</label>
                        <input type="text" class="form-control" id="dimensions" placeholder="100x50x30">
                    </div>
                </div>
            `;
            break;
            
        case 'piksel kontrollü doğrusal armatürler':
        case 'piksel kontrollü noktasal armatürler':
            specificFields = `
                <h5>Piksel Kontrollü Özellikler</h5>
                <div class="form-grid">
                    <div class="form-group">
                        <label class="form-label">Piksel Sayısı</label>
                        <input type="number" class="form-control" id="pixelCount" placeholder="60">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Piksel Tipi</label>
                        <select class="form-control" id="pixelType">
                            <option value="">Seçiniz...</option>
                            <option value="WS2812B">WS2812B</option>
                            <option value="WS2815">WS2815</option>
                            <option value="SK6812">SK6812</option>
                            <option value="APA102">APA102</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Veri Hızı (Hz)</label>
                        <input type="number" class="form-control" id="dataRate" placeholder="800">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Renk Formatı</label>
                        <select class="form-control" id="colorFormat">
                            <option value="">Seçiniz...</option>
                            <option value="RGB">RGB</option>
                            <option value="RGBW">RGBW</option>
                            <option value="RGBA">RGBA</option>
                        </select>
                    </div>
                </div>
            `;
            break;
            
        default:
            specificFields = '';
    }
    
    fieldsContainer.innerHTML = specificFields;
}

// Mamül şablonu uygula
function applyMamulTemplate(template) {
    const templates = {
        control: {
            unit: 'adet',
            minStock: 10,
            category: 'Kontrol Sistemleri',
            description: 'LED kontrol sistemi'
        },
        lighting: {
            unit: 'adet',
            minStock: 25,
            category: 'Spot Armatürler',
            description: 'LED aydınlatma armatürü'
        },
        accessory: {
            unit: 'adet',
            minStock: 50,
            description: 'Aksesuar parça'
        }
    };
    
    const selectedTemplate = templates[template];
    if (selectedTemplate) {
        document.getElementById('newMamulUnit').value = selectedTemplate.unit;
        document.getElementById('newMamulMinStock').value = selectedTemplate.minStock;
        document.getElementById('newMamulDescription').value = selectedTemplate.description;
        
        if (selectedTemplate.category) {
            document.getElementById('newMamulCategory').value = selectedTemplate.category;
            updateCategoryFields();
        }
    }
}



// Mamül detaylarını göster
function showMamulDetails(mamulId) {
    const mamul = firebaseData.products.find(p => p.id === mamulId);
    if (!mamul) {
        showNotification('Hata', 'Mamül bulunamadı.', 'error');
        return;
    }
    
    let modal = document.getElementById('mamulDetailModal');
    if (!modal) {
        const modalHTML = `
            <div id="mamulDetailModal" class="modal">
                <div class="modal-content">
                    <div class="modal-header">
                        <h3 class="modal-title">Mamül Detayları</h3>
                        <button class="modal-close" onclick="closeModal('mamulDetailModal')">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    <div class="modal-body" id="mamulDetailBody"></div>
                    <div class="modal-footer">
                        <button class="btn btn-primary" onclick="editMamul('${mamulId}')">
                            <i class="fas fa-edit"></i> Düzenle
                        </button>
                        <button class="btn btn-outline" onclick="closeModal('mamulDetailModal')">Kapat</button>
                    </div>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', modalHTML);
    }
    
    let specialFieldsHTML = '';
    if (mamul.specialFields && Object.keys(mamul.specialFields).length > 0) {
        specialFieldsHTML = `
            <div class="section">
                <h5>Teknik Özellikler</h5>
                <div class="form-grid">
                    ${Object.entries(mamul.specialFields).map(([key, value]) => `
                        <div class="form-group">
                            <label class="form-label">${getFieldLabel(key)}</label>
                            <input type="text" class="form-control" value="${value}" readonly>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }
    
    document.getElementById('mamulDetailBody').innerHTML = `
        <div class="mamul-detail-grid">
            <div class="mamul-info-card">
                <h4>${mamul.name}</h4>
                <div class="mamul-status ${(mamul.quantity || 0) > (mamul.minStock || 0) ? 'sufficient' : (mamul.quantity || 0) > 0 ? 'critical' : 'empty'}">
                    <span class="status-indicator"></span>
                    ${(mamul.quantity || 0) > (mamul.minStock || 0) ? 'Yeterli Stok' : (mamul.quantity || 0) > 0 ? 'Kritik Seviye' : 'Stok Tükendi'}
                </div>
                <div class="mamul-type-badge">
                    <span class="badge ${mamul.type === 'yan_mamul' ? 'info' : 'primary'}">
                        <i class="fas ${mamul.type === 'yan_mamul' ? 'fa-cubes' : 'fa-cube'}"></i>
                        ${mamul.type === 'yan_mamul' ? 'Yan Mamül' : 'Ana Mamül'}
                    </span>
                </div>
            </div>
            
            <div class="form-grid">
                <div class="form-group">
                    <label class="form-label">Mamül Kodu</label>
                    <input type="text" class="form-control" value="${mamul.code}" readonly>
                </div>
                <div class="form-group">
                    <label class="form-label">Barkod</label>
                    <input type="text" class="form-control" value="${mamul.barcode || ''}" readonly>
                </div>
                <div class="form-group">
                    <label class="form-label">Kategori</label>
                    <input type="text" class="form-control" value="${mamul.category}" readonly>
                </div>
                <div class="form-group">
                    <label class="form-label">Miktar</label>
                    <input type="text" class="form-control" value="${mamul.quantity || 0} ${mamul.unit}" readonly>
                </div>
                <div class="form-group">
                    <label class="form-label">Min. Stok</label>
                    <input type="text" class="form-control" value="${mamul.minStock || 0} ${mamul.unit}" readonly>
                </div>
                <div class="form-group">
                    <label class="form-label">Birim Fiyat</label>
                    <input type="text" class="form-control" value="${mamul.price || 0} $" readonly>
                </div>
                <div class="form-group">
                    <label class="form-label">Son Güncelleme</label>
                    <input type="text" class="form-control" value="${mamul.lastUpdate}" readonly>
                </div>
            </div>
            
            ${mamul.description ? `
                <div class="form-group">
                    <label class="form-label">Açıklama</label>
                    <textarea class="form-control" readonly rows="3">${mamul.description}</textarea>
                </div>
            ` : ''}
            
            ${specialFieldsHTML}
            
            <div class="section">
                <h5>Stok Hareketleri</h5>
                <div class="movement-list">
                    ${generateMamulMovements(mamulId)}
                </div>
            </div>
        </div>
    `;
    
    openModal('mamulDetailModal');
}

// Alan etiketlerini çevir
function getFieldLabel(fieldId) {
    const labels = {
        inputVoltage: 'Giriş Voltajı',
        outputPower: 'Çıkış Gücü',
        channelCount: 'Kanal Sayısı',
        protocol: 'Protokol',
        ledPower: 'LED Gücü',
        colorTemp: 'Renk Sıcaklığı',
        lumens: 'Işık Akısı',
        beamAngle: 'Işın Açısı',
        ipRating: 'IP Koruma',
        dimensions: 'Boyut',
        pixelCount: 'Piksel Sayısı',
        pixelType: 'Piksel Tipi',
        dataRate: 'Veri Hızı',
        colorFormat: 'Renk Formatı'
    };
    return labels[fieldId] || fieldId;
}

// Mamül hareketlerini oluştur
function generateMamulMovements(mamulId) {
    const movements = [];
    
    // Üretimde kullanılan miktarları hesapla
    firebaseData.production.forEach(prod => {
        if (prod.productId === mamulId) {
            movements.push({
                type: 'out',
                amount: prod.quantity,
                date: prod.startDate || 'Belirtilmemiş',
                reason: `${prod.orderNo} üretimi`,
                status: prod.status
            });
        }
    });
    
    if (movements.length === 0) {
        return '<p class="text-gray-500">Henüz hareket kaydı bulunmuyor.</p>';
    }
    
    return movements.map(movement => `
        <div class="movement-item ${movement.type}">
            <div class="movement-info">
                <span class="movement-type ${movement.type === 'in' ? 'text-success' : 'text-danger'}">
                    <i class="fas ${movement.type === 'in' ? 'fa-arrow-up' : 'fa-arrow-down'}"></i>
                    ${movement.type === 'in' ? 'Giriş' : 'Çıkış'}
                </span>
                <span class="movement-amount">${movement.amount}</span>
                <span class="movement-date">${movement.date}</span>
            </div>
            <div class="movement-reason">${movement.reason}</div>
        </div>
    `).join('');
}

// Mamül düzenleme modalı
function editMamul(mamulId) {
    const mamul = firebaseData.products.find(p => p.id === mamulId);
    if (!mamul) {
        showNotification('Hata', 'Mamül bulunamadı.', 'error');
        return;
    }
    
    let modal = document.getElementById('mamulEditModal');
    if (modal) {
        modal.remove();
    }
    
    const modalHTML = `
        <div id="mamulEditModal" class="modal show">
            <div class="modal-content">
                <div class="modal-header">
                    <h3 class="modal-title">Mamül Düzenle: ${mamul.name}</h3>
                    <button class="modal-close" onclick="closeModal('mamulEditModal')">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="modal-body">
                    <form id="mamulEditForm">
                        <!-- Mamül Tipi Seçimi -->
                        <div class="form-group">
                            <label class="form-label">Mamül Tipi</label>
                            <div class="radio-group">
                                <label class="radio-option">
                                    <input type="radio" name="mamulType" value="ana_mamul" ${mamul.type === 'ana_mamul' ? 'checked' : ''}>
                                    <span class="radio-custom"></span>
                                    <i class="fas fa-cube"></i> Ana Mamül
                                </label>
                                <label class="radio-option">
                                    <input type="radio" name="mamulType" value="yan_mamul" ${mamul.type === 'yan_mamul' ? 'checked' : ''}>
                                    <span class="radio-custom"></span>
                                    <i class="fas fa-cubes"></i> Yan Mamül
                                </label>
                            </div>
                        </div>

                        <div class="form-grid">
                            <div class="form-group">
                                <label class="form-label">Mamül Kodu</label>
                                <input type="text" class="form-control" id="editMamulCode" value="${mamul.code}" required>
                            </div>
                            <div class="form-group">
                                <label class="form-label">Barkod</label>
                                <input type="text" class="form-control" id="editMamulBarcode" value="${mamul.barcode || ''}">
                            </div>
                            <div class="form-group">
                                <label class="form-label">Mamül Adı</label>
                                <input type="text" class="form-control" id="editMamulName" value="${mamul.name}" required>
                            </div>
                            <div class="form-group">
                                <label class="form-label">Kategori</label>
                                <select class="form-control" id="editMamulCategory" required onchange="updateCategoryFields()">
                                    <option value="">Kategori seçiniz...</option>
                                    <option value="Kontrol Sistemleri" ${mamul.category === 'Kontrol Sistemleri' ? 'selected' : ''}>Kontrol Sistemleri</option>
                                    <option value="Spot Armatürler" ${mamul.category === 'Spot Armatürler' ? 'selected' : ''}>Spot Armatürler</option>
                                    <option value="Yere Gömme wallwasher armatürler" ${mamul.category === 'Yere Gömme wallwasher armatürler' ? 'selected' : ''}>Yere Gömme wallwasher armatürler</option>
                                    <option value="Wallwasher armatürler" ${mamul.category === 'Wallwasher armatürler' ? 'selected' : ''}>Wallwasher armatürler</option>
                                    <option value="Çizgisel armatürler" ${mamul.category === 'Çizgisel armatürler' ? 'selected' : ''}>Çizgisel armatürler</option>
                                    <option value="piksel kontrollü doğrusal armatürler" ${mamul.category === 'piksel kontrollü doğrusal armatürler' ? 'selected' : ''}>piksel kontrollü doğrusal armatürler</option>
                                    <option value="piksel kontrollü noktasal armatürler" ${mamul.category === 'piksel kontrollü noktasal armatürler' ? 'selected' : ''}>piksel kontrollü noktasal armatürler</option>
                                </select>
                            </div>
                            <div class="form-group">
                                <label class="form-label">Miktar</label>
                                <input type="number" class="form-control" id="editMamulQuantity" value="${mamul.quantity || 0}" required min="0">
                            </div>
                            <div class="form-group">
                                <label class="form-label">Birim</label>
                                <select class="form-control" id="editMamulUnit" required>
                                    <option value="adet" ${mamul.unit === 'adet' ? 'selected' : ''}>Adet</option>
                                    <option value="kg" ${mamul.unit === 'kg' ? 'selected' : ''}>Kilogram (kg)</option>
                                    <option value="metre" ${mamul.unit === 'metre' ? 'selected' : ''}>Metre</option>
                                    <option value="litre" ${mamul.unit === 'litre' ? 'selected' : ''}>Litre</option>
                                    <option value="paket" ${mamul.unit === 'paket' ? 'selected' : ''}>Paket</option>
                                    <option value="ton" ${mamul.unit === 'ton' ? 'selected' : ''}>Ton</option>
                                    <option value="set" ${mamul.unit === 'set' ? 'selected' : ''}>Set</option>
                                </select>
                            </div>
                            <div class="form-group">
                                <label class="form-label">Minimum Stok</label>
                                <input type="number" class="form-control" id="editMamulMinStock" value="${mamul.minStock || 0}" required min="0">
                            </div>
                            <div class="form-group">
                                <label class="form-label">Birim Fiyat ($)</label>
                                <input type="number" class="form-control" id="editMamulPrice" value="${mamul.price || 0}" min="0" step="0.01">
                            </div>
                        </div>

                        <!-- Kategori Özel Alanları -->
                        <div id="categorySpecificFields" style="margin-top: 20px;">
                            ${generateCategoryFields(mamul.category, mamul.specialFields)}
                        </div>

                        <div class="form-group">
                            <label class="form-label">Açıklama</label>
                            <textarea class="form-control" id="editMamulDescription" rows="3">${mamul.description || ''}</textarea>
                        </div>
                        
                        <div class="mamul-history">
                            <h5>Mamül Hareketleri</h5>
                            <div class="movement-list">
                                ${generateMamulMovements(mamulId)}
                            </div>
                        </div>
                    </form>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-success" onclick="saveMamul('${mamulId}')">
                        <i class="fas fa-save"></i> Güncelle
                    </button>
                    <button class="btn btn-outline" onclick="closeModal('mamulEditModal')">İptal</button>
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHTML);
}

// Kategori alanlarını oluştur
function generateCategoryFields(category, existingFields = {}) {
    if (!category) return '';
    
    switch(category) {
        case 'Kontrol Sistemleri':
            return `
                <h5>Kontrol Sistemi Özellikleri</h5>
                <div class="form-grid">
                    <div class="form-group">
                        <label class="form-label">Giriş Voltajı (V)</label>
                        <input type="text" class="form-control" id="inputVoltage" value="${existingFields.inputVoltage || ''}" placeholder="12V, 24V, 220V">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Çıkış Gücü (W)</label>
                        <input type="number" class="form-control" id="outputPower" value="${existingFields.outputPower || ''}" placeholder="10">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Kanal Sayısı</label>
                        <input type="number" class="form-control" id="channelCount" value="${existingFields.channelCount || ''}" placeholder="4">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Protokol</label>
                        <select class="form-control" id="protocol">
                            <option value="">Seçiniz...</option>
                            <option value="DMX" ${existingFields.protocol === 'DMX' ? 'selected' : ''}>DMX</option>
                            <option value="SPI" ${existingFields.protocol === 'SPI' ? 'selected' : ''}>SPI</option>
                            <option value="DALI" ${existingFields.protocol === 'DALI' ? 'selected' : ''}>DALI</option>
                            <option value="Artnet" ${existingFields.protocol === 'Artnet' ? 'selected' : ''}>Artnet</option>
                        </select>
                    </div>
                </div>
            `;
            
        case 'Spot Armatürler':
        case 'Wallwasher armatürler':
        case 'Çizgisel armatürler':
            return `
                <h5>Armatür Özellikleri</h5>
                <div class="form-grid">
                    <div class="form-group">
                        <label class="form-label">LED Gücü (W)</label>
                        <input type="number" class="form-control" id="ledPower" value="${existingFields.ledPower || ''}" placeholder="10">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Renk Sıcaklığı (K)</label>
                        <input type="text" class="form-control" id="colorTemp" value="${existingFields.colorTemp || ''}" placeholder="3000K, 4000K, 6000K">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Işık Akısı (lm)</label>
                        <input type="number" class="form-control" id="lumens" value="${existingFields.lumens || ''}" placeholder="1000">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Işın Açısı (°)</label>
                        <input type="text" class="form-control" id="beamAngle" value="${existingFields.beamAngle || ''}" placeholder="15°, 30°, 60°">
                    </div>
                    <div class="form-group">
                        <label class="form-label">IP Koruma Sınıfı</label>
                        <select class="form-control" id="ipRating">
                            <option value="">Seçiniz...</option>
                            <option value="IP20" ${existingFields.ipRating === 'IP20' ? 'selected' : ''}>IP20</option>
                            <option value="IP44" ${existingFields.ipRating === 'IP44' ? 'selected' : ''}>IP44</option>
                            <option value="IP65" ${existingFields.ipRating === 'IP65' ? 'selected' : ''}>IP65</option>
                            <option value="IP67" ${existingFields.ipRating === 'IP67' ? 'selected' : ''}>IP67</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Boyut (mm)</label>
                        <input type="text" class="form-control" id="dimensions" value="${existingFields.dimensions || ''}" placeholder="100x50x30">
                    </div>
                </div>
            `;
            
        default:
            return '';
    }
}

// Mamül silme fonksiyonu
async function deleteMamul(mamulId) {
    const mamul = firebaseData.products.find(p => p.id === mamulId);
    if (!mamul) {
        showNotification('Hata', 'Mamül bulunamadı.', 'error');
        return;
    }
    
    // Üretimde kullanılıyor mu kontrol et
    const usedInProduction = firebaseData.production.filter(prod => 
        prod.productId === mamulId
    );
    
    if (usedInProduction.length > 0) {
        const productionList = usedInProduction.map(p => p.orderNo).join(', ');
        const confirmDelete = confirm(`Bu mamül şu üretimlerde kullanılıyor: ${productionList}\
\
Yine de silmek istiyor musunuz?`);
        if (!confirmDelete) return;
    }
    
    if (confirm(`${mamul.name} mamülünü silmek istediğinize emin misiniz?`)) {
        try {
            await window.firestoreService.deleteProduct(mamulId);
            showNotification('Silindi', `${mamul.name} başarıyla silindi.`, 'success');
            await loadFirebaseData();
            if (currentPage === 'depo') loadDepo();
        } catch (error) {
            console.error('Mamül silme hatası:', error);
            showNotification('Hata', 'Mamül silinirken hata oluştu.', 'error');
        }
    }
}

// Kritik stok bildirimi gönder - Mamül için güncellenmiş
async function sendCriticalStockNotification(mamulName, currentQty, minStock, unit, type) {
    // Bildirimi alacak kullanıcıları belirle
    const notifyUsers = firebaseData.users.filter(u => 
        u.role === 'admin' || 
        u.role === 'manager' || 
        u.role === 'warehouse' || 
        u.role === 'production' ||
        u.permissions?.includes('warehouse') ||
        u.permissions?.includes('admin')
    );
    
    let title, message, notificationType;
    
    switch(type) {
        case 'kritik':
            title = 'Kritik Mamül Uyarısı';
            message = `${mamulName} mamülü kritik seviyede! Mevcut: ${currentQty} ${unit}, Minimum: ${minStock} ${unit}`;
            notificationType = 'mamul_critical';
            break;
        case 'tükendi':
            title = 'Mamül Tükendi';
            message = `${mamulName} mamülü tükendi! Acil üretim yapılması gerekiyor.`;
            notificationType = 'mamul_empty';
            break;
        case 'normale_döndü':
            title = 'Mamül Stoku Normale Döndü';
            message = `${mamulName} mamülü normale döndü. Mevcut: ${currentQty} ${unit}`;
            notificationType = 'mamul_normal';
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
                mamulName: mamulName,
                currentQuantity: currentQty,
                minStock: minStock,
                date: new Date().toISOString()
            });
        }
        
        // Genel bildirim de oluştur
        await createNotification({
            type: notificationType,
            title: title,
            message: message,
            from: 'system',
            to: 'all',
            mamulName: mamulName,
            currentQuantity: currentQty,
            minStock: minStock,
            date: new Date().toISOString()
        });
        
        console.log(`Mamül bildirimi gönderildi: ${mamulName} - ${type}`);
        
    } catch (error) {
        console.error('Mamül bildirimi gönderme hatası:', error);
    }
}

// Mamül raporu oluştur
function generateMamulReport() {
    const anaMamulCount = firebaseData.products.filter(p => p.type === 'ana_mamul').length;
    const yanMamulCount = firebaseData.products.filter(p => p.type === 'yan_mamul').length;
    
    const report = {
        totalItems: firebaseData.products.length,
        anaMamulItems: anaMamulCount,
        yanMamulItems: yanMamulCount,
        criticalItems: firebaseData.products.filter(p => (p.quantity || 0) <= (p.minStock || 0) && (p.quantity || 0) > 0).length,
        emptyItems: firebaseData.products.filter(p => (p.quantity || 0) === 0).length,
        sufficientItems: firebaseData.products.filter(p => (p.quantity || 0) > (p.minStock || 0)).length,
        totalValue: firebaseData.products.reduce((sum, p) => sum + ((p.quantity || 0) * (p.price || 0)), 0),
        lastUpdated: new Date().toLocaleDateString('tr-TR')
    };
    
    return report;
}

// Mamül dışa aktarma
function exportMamulData() {
    const mamulData = firebaseData.products.map(mamul => ({
        'Mamül Kodu': mamul.code,
        'Barkod': mamul.barcode || '',
        'Mamül Adı': mamul.name,
        'Tip': mamul.type === 'yan_mamul' ? 'Yan Mamül' : 'Ana Mamül',
        'Kategori': mamul.category,
        'Miktar': mamul.quantity || 0,
        'Birim': mamul.unit,
        'Min. Stok': mamul.minStock || 0,
        'Birim Fiyat': mamul.price || 0,
        'Durum': (mamul.quantity || 0) > (mamul.minStock || 0) ? 'Yeterli' : (mamul.quantity || 0) > 0 ? 'Kritik' : 'Tükendi',
        'Son Güncelleme': mamul.lastUpdate,
        'Açıklama': mamul.description || ''
    }));
    
    const csv = convertToCSV(mamulData);
    downloadCSV(csv, `mamul_raporu_${new Date().toLocaleDateString('tr-TR').replace(/\./g, '_')}.csv`);
}

// ========================================
// GLOBAL EXPORTS
// ========================================

// Tüm fonksiyonları global scope'a export et
window.loadDepo = loadDepo;
window.generateMamulTableRows = generateMamulTableRows;
window.filterMamulByType = filterMamulByType;
window.filterMamulByCategory = filterMamulByCategory;
window.searchMamul = searchMamul;
window.updateVisibleRowCount = updateVisibleRowCount;
window.addMamul = addMamul;
window.updateMamulTypeFields = updateMamulTypeFields;
window.updateCategoryFields = updateCategoryFields;
window.applyMamulTemplate = applyMamulTemplate;
window.saveMamul = saveMamul;
window.showMamulDetails = showMamulDetails;
window.getFieldLabel = getFieldLabel;
window.generateMamulMovements = generateMamulMovements;
window.editMamul = editMamul;
window.generateCategoryFields = generateCategoryFields;
window.deleteMamul = deleteMamul;
window.sendCriticalStockNotification = sendCriticalStockNotification;
window.generateMamulReport = generateMamulReport;
window.exportMamulData = exportMamulData;

console.log('📦 Mamül Yönetimi modülü yüklendi - ANA MAMÜL & YAN MAMÜL sistemi hazır');