// ===========================================
//urun.js - ÜRÜNLER YÖNETİMİ
// ============================================
function loadUrunAgaci() {
  if (!window.firebaseData || !window.firebaseData.products) {
    console.error("❌ Ürün verileri bulunamadı, yeniden yükleniyor...");
    loadFirebaseData().then(() => loadUrunAgaci());
    return;
  }

  const products = window.firebaseData.products || [];
  const recipes = window.firebaseData.recipes || [];

  console.log("📦 Ürünler listesi yükleniyor, toplam:", products.length);

  const categories = [
    { name: "piksel kontrollü doğrusal armatürler", icon: "fas fa-grip-lines", color: "#667eea" },
    { name: "piksel kontrollü noktasal armatürler", icon: "fas fa-dot-circle", color: "#764ba2" },
    { name: "Çizgisel armatürler", icon: "fas fa-minus", color: "#f093fb" },
    { name: "Wallwasher armatürler", icon: "fas fa-wave-square", color: "#f5576c" },
    { name: "Yere Gömme wallwasher armatürler", icon: "fas fa-level-down-alt", color: "#4facfe" },
    { name: "Spot Armatürler", icon: "fas fa-circle", color: "#43e97b" },
    { name: "Kontrol Sistemleri", icon: "fas fa-microchip", color: "#fa709a" }
  ];

  const content = `
    <div class="page-header">
      <h1 class="page-title"><i class="fas fa-boxes"></i> Ürünler</h1>
      <p class="page-subtitle">Kategorilere göre ürünleri yönetin (${products.length} ürün)</p>
    </div>
    
    <div class="card">
      <div class="card-header">
        <div class="flex justify-between items-center">
          <div>
            <h3 class="card-title">Ürün Kategorileri</h3>
            <p class="card-subtitle">Kategori seçerek ürünleri görüntüleyin</p>
          </div>
          <button class="btn btn-primary" onclick="addProduct()">
            <i class="fas fa-plus"></i> Yeni Ürün
          </button>
        </div>
      </div>
      <div class="card-body">
        <div class="category-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 20px; margin-bottom: 30px;">
          ${categories.map(category => {
            const categoryProducts = products.filter(p => p.category === category.name);
            return `
              <div class="category-card" onclick="showCategoryProducts('${category.name}')" 
                   style="background: linear-gradient(135deg, ${category.color}20, ${category.color}10); 
                          border: 2px solid ${category.color}30; border-radius: 15px; padding: 20px; 
                          cursor: pointer; transition: all 0.3s ease; position: relative; overflow: hidden;">
                <div style="position: absolute; top: -10px; right: -10px; width: 60px; height: 60px; 
                            background: ${category.color}15; border-radius: 50%; display: flex; align-items: center; justify-content: center;">
                  <i class="${category.icon}" style="font-size: 24px; color: ${category.color};"></i>
                </div>
                <h4 style="color: ${category.color}; margin: 0 0 10px 0; font-size: 16px; font-weight: 600;">${category.name}</h4>
                <div style="display: flex; justify-content: space-between; align-items: center;">
                  <span style="font-size: 24px; font-weight: bold; color: ${category.color};">${categoryProducts.length}</span>
                  <span style="font-size: 12px; color: #666;">ürün</span>
                </div>
                <div style="margin-top: 8px; font-size: 11px; color: #888;">
                  ${categoryProducts.length > 0 ? 'Ürünleri görüntülemek için tıklayın' : 'Bu kategoride henüz ürün yok'}
                </div>
              </div>
            `;
          }).join('')}
        </div>
        
        <div id="categoryProductsList" style="display: none;">
          <div class="category-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; padding: 15px; background: var(--gray-50); border-radius: 10px;">
            <div>
              <h4 id="selectedCategoryTitle" style="margin: 0; color: var(--gray-900);"></h4>
              <p id="selectedCategorySubtitle" style="margin: 5px 0 0 0; color: var(--gray-600); font-size: 14px;"></p>
            </div>
            <button class="btn btn-outline" onclick="showAllCategories()">
              <i class="fas fa-arrow-left"></i> Kategorilere Dön
            </button>
          </div>
          
          <div class="filter-bar" style="margin-bottom: 20px;">
            <div class="search-box">
              <i class="fas fa-search"></i>
              <input type="text" id="categoryProductSearch" placeholder="Bu kategoride ürün ara..." onkeyup="searchCategoryProducts(this.value)">
            </div>
          </div>
          
          <div class="table-container">
            <table class="table">
              <thead>
                <tr>
                  <th>Ürün Kodu</th>
                  <th>Ürün Adı</th>
                  <th>Teknik Özellikler</th>
                  <th>Hammaddeler</th>
                  <th>Reçete</th>
                  <th>Satış Fiyatı</th>
                  <th>İşlemler</th>
                </tr>
              </thead>
              <tbody id="categoryProductsTable">
              </tbody>
            </table>
          </div>
        </div>
        
      </div>
    </div>
  `;
  
  document.getElementById("pageContent").innerHTML = content;
  
  const style = document.createElement('style');
  style.textContent = `
    .category-card:hover {
      transform: translateY(-5px);
      box-shadow: 0 8px 25px rgba(0,0,0,0.1);
    }
    .category-grid .category-card:hover {
      border-color: var(--primary) !important;
    }
  `;
  document.head.appendChild(style);
}

function showCategoryProducts(categoryName) {
  document.querySelector('.category-grid').style.display = 'none';
  document.getElementById('categoryProductsList').style.display = 'block';
  
  document.getElementById('selectedCategoryTitle').textContent = categoryName;
  
  const products = window.firebaseData.products.filter(p => p.category === categoryName);
  document.getElementById('selectedCategorySubtitle').textContent = `${products.length} ürün bulundu`;
  
  renderCategoryProducts(products);
}

function showAllCategories() {
  document.querySelector('.category-grid').style.display = 'grid';
  document.getElementById('categoryProductsList').style.display = 'none';
  document.getElementById('categoryProductSearch').value = '';
}

function searchCategoryProducts(query) {
  const selectedCategory = document.getElementById('selectedCategoryTitle').textContent;
  const allProducts = window.firebaseData.products.filter(p => p.category === selectedCategory);
  
  const filtered = allProducts.filter(p => 
    p.name.toLowerCase().includes(query.toLowerCase()) ||
    p.code.toLowerCase().includes(query.toLowerCase()) ||
    (p.description && p.description.toLowerCase().includes(query.toLowerCase()))
  );
  
  renderCategoryProducts(filtered);
}

function renderCategoryProducts(products) {
  const tbody = document.getElementById('categoryProductsTable');
  const recipes = window.firebaseData.recipes || [];
  const stock = window.firebaseData.stock || [];

  if (products.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; padding: 40px; color: var(--gray-500);">Bu kategoride ürün bulunamadı</td></tr>';
    return;
  }

  tbody.innerHTML = products.map(product => {
    const recipe = recipes.find(r => r.productId === product.id);

    const rawMaterials = recipe ? recipe.rawMaterials.map(rmId => {
      const rm = stock.find(s => s.id === rmId);
      return rm ? rm.name : 'Bilinmeyen';
    }).slice(0, 3).join(', ') + (recipe.rawMaterials.length > 3 ? '...' : '') : 'Hammadde yok';

    const technicalSpecs = [];
    if (product.code) technicalSpecs.push(`Kod: ${product.code}`);
    if (product.barcode) technicalSpecs.push(`Barkod: ${product.barcode}`);
    if (product.description) technicalSpecs.push(product.description);
    const specs = technicalSpecs.join(' • ') || 'Belirtilmemiş';

    return `
      <tr>
        <td><strong>${product.code || '-'}</strong></td>
        <td>
          <div style="font-weight: 600; color: var(--gray-900);">${product.name}</div>
          ${product.barcode ? `<div style="font-size: 11px; color: var(--gray-500);">Barkod: ${product.barcode}</div>` : ''}
        </td>
        <td>
          <div style="font-size: 12px; color: var(--gray-600); max-width: 200px; overflow: hidden; text-overflow: ellipsis;" title="${specs}">
            ${specs}
          </div>
        </td>
        <td>
          <div style="font-size: 12px; color: var(--gray-600); max-width: 180px; overflow: hidden; text-overflow: ellipsis;" title="${rawMaterials}">
            ${rawMaterials}
          </div>
          ${recipe && recipe.rawMaterials.length > 0 ? 
            `<div style="font-size: 10px; color: var(--info);"><i class="fas fa-info-circle"></i> ${recipe.rawMaterials.length} hammadde</div>` : 
            '<div style="font-size: 10px; color: var(--warning);"><i class="fas fa-exclamation-triangle"></i> Reçete yok</div>'
          }
        </td>
        <td>
          ${recipe ? 
            `<span class="badge success" title="${recipe.name}">${recipe.name.length > 15 ? recipe.name.substring(0, 15) + '...' : recipe.name}</span>` : 
            '<span class="badge warning">Reçete Yok</span>'
          }
        </td>
        <td>
          <div style="font-size: 16px; font-weight: 600; color: var(--success);">${product.price || 0} $</div>
        </td>
        <td>
          <div class="action-buttons">
            <button class="action-btn view" onclick="showProductDetails('${product.id}')" title="Detayları Görüntüle">
              <i class="fas fa-eye"></i>
            </button>
            <button class="action-btn edit" onclick="editProduct('${product.id}')" title="Düzenle">
              <i class="fas fa-edit"></i>
            </button>
            <button class="action-btn delete" onclick="confirmDeleteProduct('${product.id}')" title="Sil">
              <i class="fas fa-trash"></i>
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

function showProductDetails(productId) {
  const product = window.firebaseData.products.find(p => p.id === productId);
  if (!product) {
    console.error('Ürün bulunamadı:', productId);
    return;
  }

  const recipes = window.firebaseData.recipes || [];
  const stock = window.firebaseData.stock || [];
  const recipe = recipes.find(r => r.productId === productId);

  let rawMaterialsHtml = 'Hammadde yok';
  if (recipe && recipe.rawMaterials) {
    rawMaterialsHtml = recipe.rawMaterials.map(rmId => {
      const rm = stock.find(s => s.id === rmId);
      return rm ? `
        <div style="display: flex; justify-content: space-between; align-items: center; padding: 8px 0; border-bottom: 1px solid var(--gray-200);">
          <span>${rm.name}</span>
          <span class="badge ${rm.quantity > rm.minStock ? 'success' : rm.quantity > 0 ? 'warning' : 'danger'}">
            ${rm.quantity} ${rm.unit}
          </span>
        </div>
      ` : '<div style="color: var(--danger);">Bilinmeyen hammadde</div>';
    }).join('');
  }

  const modalHTML = `
    <div id="productDetailModal" class="modal show">
      <div class="modal-content" style="max-width: 700px;">
        <div class="modal-header">
          <h3 class="modal-title">Ürün Detayları</h3>
          <button class="modal-close" onclick="closeModal('productDetailModal')">
            <i class="fas fa-times"></i>
          </button>
        </div>
        <div class="modal-body">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 15px; margin-bottom: 25px;">
            <div style="display: flex; justify-content: space-between; align-items: start;">
              <div>
                <h2 style="margin: 0 0 5px 0; color: white;">${product.name}</h2>
                <p style="margin: 0; opacity: 0.9;">Kod: ${product.code} ${product.barcode ? `• Barkod: ${product.barcode}` : ''}</p>
              </div>
              <div style="text-align: right;">
                <div style="font-size: 24px; font-weight: bold;">${product.price || 0} $</div>
                <div style="font-size: 12px; opacity: 0.8;">Satış Fiyatı</div>
              </div>
            </div>
          </div>
          
          <div class="form-grid">
            <div class="form-group">
              <label class="form-label">Kategori</label>
              <div style="padding: 10px; background: var(--gray-50); border-radius: 8px; border-left: 4px solid var(--primary);">
                <strong>${product.category || 'Belirtilmemiş'}</strong>
              </div>
            </div>
            
            <div class="form-group">
              <label class="form-label">Stok Durumu</label>
              <div style="padding: 10px; background: var(--gray-50); border-radius: 8px; border-left: 4px solid ${(product.stock || 0) > 0 ? 'var(--success)' : 'var(--danger)'};">
                <strong>${product.stock || 0} adet</strong>
              </div>
            </div>
          </div>
          
          ${product.description ? `
          <div class="form-group">
            <label class="form-label">Teknik Açıklama</label>
            <div style="padding: 15px; background: var(--gray-50); border-radius: 8px; line-height: 1.6;">
              ${product.description}
            </div>
          </div>
          ` : ''}
          
          <div class="form-group">
            <label class="form-label">Reçete Bilgisi</label>
            ${recipe ? `
              <div style="padding: 15px; background: var(--success-light, #f0f9ff); border-radius: 8px; border-left: 4px solid var(--success);">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                  <strong style="color: var(--success);">${recipe.name}</strong>
                  <span class="badge success">${recipe.rawMaterials?.length || 0} hammadde</span>
                </div>
              </div>
            ` : `
              <div style="padding: 15px; background: var(--warning-light, #fffbeb); border-radius: 8px; border-left: 4px solid var(--warning);">
                <span style="color: var(--warning);"><i class="fas fa-exclamation-triangle"></i> Bu ürün için reçete tanımlanmamış</span>
              </div>
            `}
          </div>
          
          <div class="form-group">
            <label class="form-label">Kullanılan Hammaddeler</label>
            <div style="max-height: 200px; overflow-y: auto; padding: 10px; background: var(--gray-50); border-radius: 8px;">
              ${rawMaterialsHtml}
            </div>
          </div>
          
          ${product.image ? `
          <div class="form-group">
            <label class="form-label">Ürün Görseli</label>
            <div style="text-align: center;">
              <img src="${product.image}" style="max-width: 100%; max-height: 300px; border-radius: 10px; box-shadow: 0 4px 15px rgba(0,0,0,0.1);">
            </div>
          </div>
          ` : ''}
        </div>
        <div class="modal-footer">
          <button class="btn btn-primary" onclick="editProduct('${productId}')">
            <i class="fas fa-edit"></i> Düzenle
          </button>
          <button class="btn btn-outline" onclick="closeModal('productDetailModal')">Kapat</button>
        </div>
      </div>
    </div>
  `;

  document.body.insertAdjacentHTML("beforeend", modalHTML);
}

function editProduct(productId) {
  const product = window.firebaseData.products.find(p => p.id === productId);
  if (!product) {
    console.error('Ürün bulunamadı:', productId);
    return;
  }

  // Modal varsa kaldır
  let existingModal = document.getElementById("productModal");
  if (existingModal) {
    existingModal.remove();
  }

  // Yeni modal oluştur (düzenleme modu)
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
                <input type="text" class="form-control" id="productFormCode" value="${product.code || ''}" required>
              </div>
              <div class="form-group">
                <label class="form-label">Barkod</label>
                <input type="text" class="form-control" id="productFormBarcode" value="${product.barcode || ''}" placeholder="Barkod numarası">
              </div>
              <div class="form-group">
                <label class="form-label">Ürün Adı</label>
                <input type="text" class="form-control" id="productFormName" value="${product.name || ''}" required>
              </div>
              <div class="form-group">
                <label class="form-label">Kategori</label>
                <select class="form-control" id="productFormCategory" required>
                  <option value="">Tüm Kategoriler</option>
                  <option ${product.category === 'piksel kontrollü doğrusal armatürler' ? 'selected' : ''}>piksel kontrollü doğrusal armatürler</option>
                  <option ${product.category === 'piksel kontrollü noktasal armatürler' ? 'selected' : ''}>piksel kontrollü noktasal armatürler</option>
                  <option ${product.category === 'Çizgisel armatürler' ? 'selected' : ''}>Çizgisel armatürler</option>
                  <option ${product.category === 'Wallwasher armatürler' ? 'selected' : ''}>Wallwasher armatürler</option>
                  <option ${product.category === 'Yere Gömme wallwasher armatürler' ? 'selected' : ''}>Yere Gömme wallwasher armatürler</option>
                  <option ${product.category === 'Spot Armatürler' ? 'selected' : ''}>Spot Armatürler</option>
                  <option ${product.category === 'Kontrol Sistemleri' ? 'selected' : ''}>Kontrol Sistemleri</option>
                </select>
              </div>
              <div class="form-group">
                <label class="form-label">Birim Fiyat</label>
                <input type="number" class="form-control" id="productFormPrice" value="${product.price || 0}" required>
              </div>
              
            </div>
            <div class="form-group">
              <label class="form-label">Açıklama</label>
              <textarea class="form-control" id="productFormDescription" rows="3">${product.description || ''}</textarea>
            </div>
            <div class="form-group">
              <label class="form-label">Ürün Görseli</label>
              <input type="file" id="productFormImage" accept="image/*">
              ${product.image ? `<img src="${product.image}" style="max-width: 100px; margin-top: 10px;">` : ''}
            </div>
          </form>
        </div>
        <div class="modal-footer">
          <button class="btn btn-success" onclick="saveProduct('${productId}')">
            <i class="fas fa-save"></i> Kaydet
          </button>
          <button class="btn btn-outline" onclick="closeModal('productModal')">İptal</button>
        </div>
      </div>
    </div>
  `;

  document.body.insertAdjacentHTML("beforeend", modalHTML);
}

async function saveProduct(productId = null) {
  // Input'ları almadan önce null check
  const codeInput = document.getElementById("productFormCode");
  const barcodeInput = document.getElementById("productFormBarcode");
  const nameInput = document.getElementById("productFormName");
  const categoryInput = document.getElementById("productFormCategory");
  const priceInput = document.getElementById("productFormPrice");
  const stockInput = document.getElementById("productFormStock");
  const descriptionInput = document.getElementById("productFormDescription");
  const imageInput = document.getElementById("productFormImage");

  // Input'ların varlığını kontrol et
  if (!codeInput || !nameInput || !categoryInput || !priceInput) {
    console.error("Gerekli form elemanları bulunamadı.");
    showNotification("Hata", "Form elemanları yüklenemedi. Lütfen tekrar deneyin.", "error");
    return;
  }

  const code = codeInput.value;
  const barcode = barcodeInput ? barcodeInput.value : "";
  const name = nameInput.value;
  const category = categoryInput.value;
  const price = parseFloat(priceInput.value || 0);
  const stock = parseInt(stockInput ? stockInput.value : 0);
  const description = descriptionInput ? descriptionInput.value : "";
  const imageFile = imageInput ? imageInput.files[0] : null;

  // Zorunlu alan kontrolü
  if (!code || !name || !category) {
    showNotification("Hata", "Ürün kodu, adı ve kategori zorunludur.", "error");
    return;
  }

  const productData = {
    code,
    barcode,
    name,
    category,
    price,
    stock,
    description
  };

  try {
    if (imageFile) {
      const reader = new FileReader();
      reader.onload = async function(e) {
        productData.image = e.target.result;
        await saveProductToFirebase(productId, productData);
      };
      reader.readAsDataURL(imageFile);
    } else {
      await saveProductToFirebase(productId, productData);
    }
  } catch (error) {
    console.error("Ürün kaydetme hatası:", error);
    showNotification("Hata", "Ürün kaydedilirken hata oluştu.", "error");
  }
}

async function saveProductToFirebase(productId, productData) {
  try {
    if (productId) {
      await window.firestoreService.updateProduct(productId, productData);
      showNotification("Başarılı", "Ürün başarıyla güncellendi.", "success");
    } else {
      const newId = await window.firestoreService.addProduct(productData);
      showNotification("Başarılı", "Yeni ürün eklendi.", "success");
    }
    closeModal("productModal");
    await loadFirebaseData();
    loadUrunAgaci();
  } catch (error) {
    console.error("Ürün kaydetme hatası:", error);
    showNotification("Hata", "Ürün kaydedilirken hata oluştu.", "error");
  }
}


function switchProductTab(button, tabId) {
  document.querySelectorAll('#productModal .tab').forEach(tab => tab.classList.remove('active'));
  document.querySelectorAll('#productModal .tab-content').forEach(content => content.style.display = 'none');
  
  button.classList.add('active');
  document.getElementById(tabId).style.display = 'block';
}

function confirmDeleteProduct(productId) {
  const product = firebaseData.products.find(p => p.id === productId);
  if (!product) return;
  
  const confirmText = `"${product.name}" ürününü silmek istediğinize emin misiniz?\n\nBu işlem geri alınamaz ve ürün tüm kayıtlardan silinecektir.`;
  
  if (confirm(confirmText)) {
    deleteProduct(productId);
  }
}

function duplicateProduct(productId) {
  const product = firebaseData.products.find(p => p.id === productId);
  if (!product) return;
  
  const newProductName = prompt(`Yeni ürün adını girin:`, `${product.name} - Kopya`);
  if (!newProductName) return;
  
  const newProductCode = prompt(`Yeni ürün kodunu girin:`, `${product.code}-COPY`);
  if (!newProductCode) return;
  
  const newProduct = {
    ...product,
    name: newProductName,
    code: newProductCode,
    barcode: '',
    createdAt: new Date().toISOString()
  };
  
  delete newProduct.id;
  
  window.firestoreService.addProduct(newProduct).then(() => {
    showNotification('Başarılı', 'Ürün başarıyla kopyalandı.', 'success');
    loadFirebaseData().then(() => {
      if (currentPage === 'urunAgaci') loadUrunAgaci();
    });
  }).catch(error => {
    console.error('Ürün kopyalama hatası:', error);
    showNotification('Hata', 'Ürün kopyalanırken hata oluştu.', 'error');
  });
}

window.loadUrunAgaci = loadUrunAgaci;
window.showCategoryProducts = showCategoryProducts;
window.showAllCategories = showAllCategories;
window.searchCategoryProducts = searchCategoryProducts;
window.renderCategoryProducts = renderCategoryProducts;
window.editProduct = editProduct;
window.switchProductTab = switchProductTab;
window.confirmDeleteProduct = confirmDeleteProduct;
window.duplicateProduct = duplicateProduct;
window.showProductDetails = showProductDetails;
window.saveProduct = saveProduct;