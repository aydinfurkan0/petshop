// ===========================================
// RECIPES.JS - ÜRÜN REÇETELERİ YÖNETİMİ
// ============================================

// Global değişkenler
let selectedRawMaterials = [];
let selectedProduct = null;
let selectedCategory = null;
let currentRecipeCategory = null;

// Kategori renkleri
const categoryColors = {
    'Çizgisel armatürler': '#3b82f6',
    'Wallwasher armatürler': '#10b981', 
    'Yere Gömme wallwasher armatürler': '#f59e0b',
    'Spot Armatürler': '#ef4444',
    'piksel kontrollü doğrusal armatürler': '#8b5cf6',
    'piksel kontrollü noktasal armatürler': '#06b6d4',
    'Kontrol Sistemleri': '#84cc16'
};

// Ana ürün reçeteleri sayfası
function loadUrunReceteleri() {
    console.log('🔧 Ürün Reçeteleri sayfası yükleniyor...');
    
    const recipes = window.firebaseData?.recipes || [];
    const products = window.firebaseData?.products || [];
    
    // Kategorilere göre gruplama
    const productsByCategory = {};
    products.forEach(product => {
        const category = product.category || 'Diğer';
        if (!productsByCategory[category]) {
            productsByCategory[category] = [];
        }
        productsByCategory[category].push(product);
    });

    // Kategori istatistikleri
    const categoryStats = {};
    Object.keys(productsByCategory).forEach(category => {
        const categoryProducts = productsByCategory[category];
        const recipesForCategory = categoryProducts.filter(product => 
            recipes.some(recipe => recipe.productId === product.id)
        ).length;
        
        categoryStats[category] = {
            totalProducts: categoryProducts.length,
            withRecipes: recipesForCategory,
            withoutRecipes: categoryProducts.length - recipesForCategory
        };
    });

    const content = `
        <div class=\"page-header\">
            <h1 class=\"page-title\">
                <i class=\"fas fa-sitemap\"></i> Ürün Reçeteleri
                <span style=\"background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 4px 12px; border-radius: 20px; font-size: 14px; margin-left: 15px;\">
                    ${recipes.length} Reçete
                </span>
            </h1>
            <p class=\"page-subtitle\">Ürün kategorilerine göre reçete yönetimi</p>
        </div>


        <!-- Kategori Klasörleri -->
        <div class=\"card\">
            <div class=\"card-header\">
                <div class=\"flex justify-between items-center\">
                    <div>
                        <h3 class=\"card-title\">Ürün Kategorileri</h3>
                        <p class=\"card-subtitle\">Kategori seçerek reçeteleri yönetin</p>
                    </div>
                    <button class=\"btn btn-primary\" onclick=\"openNewRecipeModal()\">
                        <i class=\"fas fa-plus\"></i> Yeni Reçete
                    </button>
                </div>
            </div>
            <div class=\"card-body\">
                <div class=\"category-folders-grid\">
                    ${Object.keys(productsByCategory).map(category => {
                        const stats = categoryStats[category];
                        const color = categoryColors[category] || '#6b7280';
                        
                        return `
                            <div class=\"category-folder\" onclick=\"loadCategoryRecipePage('${category}')\"
                                 style=\"border-color: ${color};\" data-category=\"${category}\">
                                <div class=\"folder-icon\" style=\"background: ${color};\">
                                    <i class=\"fas fa-folder\"></i>
                                </div>
                                <div class=\"folder-title\">${category}</div>
                                <div class=\"folder-stats\">
                                    <div class=\"stat-item\">
                                        <span class=\"stat-number\" style=\"color: ${color};\">${stats.withRecipes}</span>
                                        <span class=\"stat-label\">Reçete</span>
                                    </div>
                                    <div class=\"stat-item\">
                                        <span class=\"stat-number\" style=\"color: #f59e0b;\">${stats.withoutRecipes}</span>
                                        <span class=\"stat-label\">Reçetesiz</span>
                                    </div>
                                </div>
                                <div class=\"folder-total\">${stats.totalProducts} Ürün</div>
                            </div>
                        `;
                    }).join('')}
                </div>
            </div>
        </div>
    `;

    document.getElementById('pageContent').innerHTML = content;
    
    // CSS'i ekle
    currentRecipeCategory = null;
    
}

function loadCategoryRecipePage(category) {
    console.log('📂 Kategori reçete sayfası yükleniyor:', category);
    
    currentRecipeCategory = category;
    const products = window.firebaseData?.products?.filter(p => p.category === category) || [];
    const recipes = window.firebaseData?.recipes || [];
    
    const content = `
        <div class="page-header">
            <div style="display: flex; align-items: center; gap: 15px; margin-bottom: 10px;">
                <button class="btn btn-outline" onclick="loadUrunReceteleri()">
                    <i class="fas fa-arrow-left"></i> Geri
                </button>
                <h1 class="page-title" style="margin: 0;">
                    <i class="fas fa-folder-open" style="color: ${categoryColors[category] || '#6b7280'};"></i> 
                    ${category} - Reçeteler
                </h1>
            </div>
            <p class="page-subtitle">Bu kategorideki ürünlerin reçetelerini yönetin</p>
        </div>
        <div class="recipe-main-stats">
            <div class="recipe-stat-card">
                <div class="recipe-stat-icon"><i class="fas fa-boxes"></i></div>
                <div class="recipe-stat-number">${products.length}</div>
                <div class="recipe-stat-label">Toplam Ürün</div>
            </div>
            <div class="recipe-stat-card">
                <div class="recipe-stat-icon"><i class="fas fa-check-circle"></i></div>
                <div class="recipe-stat-number">${products.filter(p => recipes.some(r => r.productId === p.id)).length}</div>
                <div class="recipe-stat-label">Reçeteli</div>
            </div>
            <div class="recipe-stat-card">
                <div class="recipe-stat-icon"><i class="fas fa-exclamation-triangle"></i></div>
                <div class="recipe-stat-number">${products.filter(p => !recipes.some(r => r.productId === p.id)).length}</div>
                <div class="recipe-stat-label">Reçetesiz</div>
            </div>
        </div>
        <div class="card">
            <div class="card-header">
                <div class="flex justify-between items-center">
                    <div>
                        <h3 class="card-title">${category} Ürünleri</h3>
                        <p class="card-subtitle">${products.length} ürün listeleniyor</p>
                    </div>
                    <button class="btn btn-success" onclick="openNewRecipeModal('${category}')">
                        <i class="fas fa-plus"></i> Bu Kategoriye Reçete Ekle
                    </button>
                </div>
            </div>
            <div class="card-body">
                <div class="products-recipe-grid">
                    ${products.map(product => {
                        const recipe = recipes.find(r => r.productId === product.id && r.category === category);
                        const hasRecipe = !!recipe;
                        
                        return `
                            <div class="product-recipe-card ${hasRecipe ? 'has-recipe' : 'no-recipe'}">
                                <div class="product-info">
                                    <div class="product-name">${product.name}</div>
                                    <div class="product-code">${product.code}</div>
                                    <div class="product-price">${product.price} $</div>
                                </div>
                                <div class="recipe-status">
                                    ${hasRecipe ? `
                                        <div class="recipe-badge success">
                                            <i class="fas fa-check-circle"></i>
                                            Reçete Var
                                        </div>
                                        <div class="recipe-info">
                                            <div class="recipe-name">${recipe.name}</div>
                                            <div class="raw-material-count">${recipe.rawMaterials?.length || 0} Hammadde</div>
                                        </div>
                                    ` : `
                                        <div class="recipe-badge warning">
                                            <i class="fas fa-exclamation-triangle"></i>
                                            Reçete Yok
                                        </div>
                                    `}
                                </div>
                                <div class="recipe-actions">
                                    ${hasRecipe ? `
                                        <button class="btn-icon view" onclick="viewRecipeDetails('${recipe.id}')" title="Görüntüle">
                                            <i class="fas fa-eye"></i>
                                        </button>
                                        <button class="btn-icon edit" onclick="editRecipeModal('${recipe.id}')" title="Düzenle">
                                            <i class="fas fa-edit"></i>
                                        </button>
                                        <button class="btn-icon delete" onclick="deleteRecipeConfirm('${recipe.id}')" title="Sil">
                                            <i class="fas fa-trash"></i>
                                        </button>
                                    ` : `
                                        <button class="btn-icon add" onclick="openNewRecipeModal('${category}', '${product.id}')" title="Reçete Ekle">
                                            <i class="fas fa-plus"></i>
                                        </button>
                                    `}
                                </div>
                            </div>
                        `;
                    }).join('')}
                </div>
            </div>
        </div>
    `;
    
    document.getElementById('pageContent').innerHTML = content;
    console.log('✅ Kategori sayfası yüklendi:', category);
}
// Kategori reçetelerini aç
function openCategoryRecipes(category) {
    console.log('📂 Kategori reçeteleri açılıyor:', category);
    
    const products = window.firebaseData?.products?.filter(p => p.category === category) || [];
    const recipes = window.firebaseData?.recipes || [];
    
    const modalHTML = `
        <div id=\"categoryRecipesModal\" class=\"modal show\">
            <div class=\"modal-content\" style=\"max-width: 1000px; max-height: 90vh;\">
                <div class=\"modal-header\" style=\"background: ${categoryColors[category] || '#6b7280'}; color: white;\">
                    <h3 class=\"modal-title\">
                        <i class=\"fas fa-folder-open\"></i> ${category} - Reçeteler
                    </h3>
                    <button class=\"modal-close\" onclick=\"closeModal('categoryRecipesModal')\" style=\"color: white;\">
                        <i class=\"fas fa-times\"></i>
                    </button>
                </div>
                <div class=\"modal-body\">
                    <div class=\"category-recipe-header\">
                        <div class=\"category-stats-row\">
                            <div class=\"stat-box\">
                                <div class=\"stat-number\">${products.length}</div>
                                <div class=\"stat-label\">Toplam Ürün</div>
                            </div>
                            <div class=\"stat-box\">
                                <div class=\"stat-number\">${products.filter(p => recipes.some(r => r.productId === p.id)).length}</div>
                                <div class=\"stat-label\">Reçeteli</div>
                            </div>
                            <div class=\"stat-box\">
                                <div class=\"stat-number\">${products.filter(p => !recipes.some(r => r.productId === p.id)).length}</div>
                                <div class=\"stat-label\">Reçetesiz</div>
                            </div>
                        </div>
                        <button class=\"btn btn-success\" onclick=\"openNewRecipeModal('${category}')\">
                            <i class=\"fas fa-plus\"></i> Bu Kategoriye Reçete Ekle
                        </button>
                    </div>

                    <div class=\"products-recipe-grid\">
                        ${products.map(product => {
                            const recipe = recipes.find(r => r.productId === product.id);
                            const hasRecipe = !!recipe;
                            
                            return `
                                <div class=\"product-recipe-card ${hasRecipe ? 'has-recipe' : 'no-recipe'}\">
                                    <div class=\"product-info\">
                                        <div class=\"product-name\">${product.name}</div>
                                        <div class=\"product-code\">${product.code}</div>
                                        <div class=\"product-price\">${product.price} $</div>
                                    </div>
                                    <div class=\"recipe-status\">
                                        ${hasRecipe ? `
                                            <div class=\"recipe-badge success\">
                                                <i class=\"fas fa-check-circle\"></i>
                                                Reçete Var
                                            </div>
                                            <div class=\"recipe-info\">
                                                <div class=\"recipe-name\">${recipe.name}</div>
                                                <div class=\"raw-material-count\">${recipe.rawMaterials?.length || 0} Hammadde</div>
                                            </div>
                                        ` : `
                                            <div class=\"recipe-badge warning\">
                                                <i class=\"fas fa-exclamation-triangle\"></i>
                                                Reçete Yok
                                            </div>
                                        `}
                                    </div>
                                    <div class=\"recipe-actions\">
                                        ${hasRecipe ? `
                                            <button class=\"btn-icon view\" onclick=\"viewRecipeDetails('${recipe.id}')\" title=\"Görüntüle\">
                                                <i class=\"fas fa-eye\"></i>
                                            </button>
                                            <button class=\"btn-icon edit\" onclick=\"editRecipe('${recipe.id}')\" title=\"Düzenle\">
                                                <i class=\"fas fa-edit\"></i>
                                            </button>
                                            <button class=\"btn-icon delete\" onclick=\"deleteRecipe('${recipe.id}')\" title=\"Sil\">
                                                <i class=\"fas fa-trash\"></i>
                                            </button>
                                        ` : `
                                            <button class=\"btn-icon add\" onclick=\"openNewRecipeModal('${category}', '${product.id}')\" title=\"Reçete Ekle\">
                                                <i class=\"fas fa-plus\"></i>
                                            </button>
                                        `}
                                    </div>
                                </div>
                            `;
                        }).join('')}
                    </div>
                </div>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHTML);
}

async function saveNewRecipe() {
    console.log('=== REÇETE KAYDETME BAŞLADI ===');
    
    // Form elemanlarını kontrol et
    const productSelect = document.getElementById('recipeProduct');
    const categorySelect = document.getElementById('recipeCategory');
    
    // Değerleri al
    const productId = productSelect?.value || '';
    const categoryValue = categorySelect?.value || '';
    
    // Seçilen ürünün bilgilerini al
    const selectedProduct = window.firebaseData?.products?.find(p => p.id === productId);
    const recipeName = selectedProduct ? `${selectedProduct.name} Reçetesi` : '';
    
    console.log('Form değerleri:', {
        recipeName,
        productId,
        categoryValue,
        selectedRawMaterials: selectedRawMaterials.length
    });
    
    // Validasyonlar
    if (!categoryValue) {
        alert('Lütfen kategori seçin!');
        return;
    }
    
    if (!productId) {
        alert('Lütfen ürün seçin!');
        return;
    }
    
    if (!selectedRawMaterials || selectedRawMaterials.length === 0) {
        alert('Lütfen en az bir hammadde seçin!');
        return;
    }
    
    // Mevcut reçete kontrolü
    const existingRecipe = window.firebaseData?.recipes?.find(
        r => r.productId === productId && r.category === categoryValue
    );
    
    if (existingRecipe) {
        if (!confirm('Bu ürün için zaten reçete var. Güncellemek istiyor musunuz?')) {
            return;
        }
    }
    
    const saveBtn = document.querySelector('#newRecipeModal .btn-success');
    if (saveBtn) {
        const originalText = saveBtn.innerHTML;
        saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Kaydediliyor...';
        saveBtn.disabled = true;
    }
    
    try {
        const recipeData = {
            name: recipeName, // Otomatik oluşturuluyor
            productId: productId,
            productName: selectedProduct?.name || '',
            rawMaterials: selectedRawMaterials.map(rm => rm.id),
            rawMaterialDetails: selectedRawMaterials,
            category: categoryValue,
            active: true,
            createdAt: new Date().toISOString(),
            createdBy: window.currentUser?.id || 'system'
        };
        
        console.log('Kaydedilecek veri:', recipeData);
        
        if (existingRecipe) {
            // Güncelle
            await window.firestoreService.updateRecipe(existingRecipe.id, recipeData);
            alert('Reçete güncellendi!');
        } else {
            // Yeni ekle
            await window.firestoreService.addRecipe(recipeData);
            alert('Reçete başarıyla oluşturuldu!');
        }
        
        closeNewRecipeModal();
        
        if (window.loadFirebaseData) {
            await window.loadFirebaseData();
        }
        
        if (currentRecipeCategory) {
            loadCategoryRecipePage(currentRecipeCategory);
        } else {
            loadUrunReceteleri();
        }
        
    } catch (error) {
        console.error('Kaydetme hatası:', error);
        alert('Reçete kaydedilirken hata: ' + error.message);
    } finally {
        if (saveBtn) {
            saveBtn.innerHTML = '<i class="fas fa-save"></i> Reçete Kaydet';
            saveBtn.disabled = false;
        }
    }
}

// DÜZELTME: onCategoryChange fonksiyonu - daha güvenli
function onCategoryChange() {
    console.log('📋 Kategori değişimi...');
    
    const categorySelect = document.getElementById('recipeCategory');
    const productSelect = document.getElementById('recipeProduct');
    
    if (!categorySelect || !productSelect) {
        console.error('Select elemanları bulunamadı');
        return;
    }
    
    const selectedCategoryValue = categorySelect.value;
    console.log('Seçilen kategori:', selectedCategoryValue);
    
    selectedCategory = selectedCategoryValue || null;
    selectedProduct = null;
    
    // Ürün dropdown'ını temizle
    productSelect.value = '';
    productSelect.style.borderColor = ''; // Border rengini sıfırla
    
    if (!selectedCategoryValue) {
        productSelect.innerHTML = '<option value="">Önce kategori seçin...</option>';
        return;
    }
    
    const products = window.firebaseData?.products || [];
    const filteredProducts = products.filter(p => p.category === selectedCategoryValue);
    
    productSelect.innerHTML = `
        <option value="">Ürün seçiniz...</option>
        ${filteredProducts.map(product => `
            <option value="${product.id}" data-category="${product.category}">
                ${product.name} - ${product.code} (${product.price}$)
            </option>
        `).join('')}
    `;
    
    console.log('Kategori için ürün sayısı:', filteredProducts.length);
}

function onProductSelect() {
    console.log('📦 Ürün seçimi...');
    
    const productSelect = document.getElementById('recipeProduct');
    if (!productSelect) {
        console.error('Ürün select bulunamadı');
        return;
    }
    
    const productId = productSelect.value;
    console.log('Seçilen ürün ID:', productId);
    
    selectedProduct = productId || null;
    productSelect.style.borderColor = ''; // Border rengini sıfırla
    
    console.log('Global selectedProduct güncellendi:', selectedProduct);
}

function debugRecipeForm() {
    const modal = document.getElementById('newRecipeModal');
    const recipeInput = document.getElementById('recipeName');
    const categorySelect = document.getElementById('recipeCategory');
    const productSelect = document.getElementById('recipeProduct');
    
    console.log('=== FORM DEBUG ===');
    console.log('Modal var mı:', !!modal);
    console.log('Recipe input var mı:', !!recipeInput);
    console.log('Recipe input değeri:', recipeInput ? `"${recipeInput.value}"` : 'YOK');
    console.log('Recipe input uzunluk:', recipeInput ? recipeInput.value.length : 'YOK');
    console.log('Category select var mı:', !!categorySelect);
    console.log('Category değeri:', categorySelect ? categorySelect.value : 'YOK');
    console.log('Product select var mı:', !!productSelect);
    console.log('Product değeri:', productSelect ? productSelect.value : 'YOK');
    console.log('Global selectedRawMaterials:', selectedRawMaterials.length);
    console.log('==================');
}

function openNewRecipeModal(category = null, productId = null) {
    console.log('📝 Yeni reçete modalı açılıyor:', { category, productId });
    
    // Mevcut modalları temizle
    const allModals = document.querySelectorAll('#newRecipeModal, #stockCategoryModal');
    allModals.forEach(modal => modal.remove());
    
    // Global değişkenleri sıfırla
    selectedRawMaterials = [];
    selectedProduct = productId || null;
    selectedCategory = category || null;
    
    const products = window.firebaseData?.products || [];
    const filteredProducts = category ? products.filter(p => p.category === category) : products;
    const allCategories = [...new Set(products.map(p => p.category).filter(c => c))];
    
    const modalHTML = `
        <div id="newRecipeModal" class="modal show">
            <div class="modal-content" style="max-width: 1200px; max-height: 95vh;">
                <div class="modal-header" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white;">
                    <h3 class="modal-title">
                        <i class="fas fa-magic"></i> Ürüne Reçete Ekle
                        ${category ? `<span style="opacity: 0.8; font-size: 14px; margin-left: 10px;">(${category})</span>` : ''}
                    </h3>
                    <button class="modal-close" onclick="closeNewRecipeModal()" style="color: white;">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="modal-body" style="padding: 20px; max-height: 70vh; overflow-y: auto;">
                    <div class="recipe-form-section">
                        <h4 class="section-title">
                            <i class="fas fa-box"></i> Ürün Seçimi
                        </h4>
                        <div class="form-grid">
                            <!-- REÇETE ADI ALANI KALDIRILDI -->
                            <div class="form-group">
                                <label class="form-label">Kategori <span style="color: red;">*</span></label>
                                <select class="form-control" id="recipeCategory" onchange="onCategoryChange()">
                                    <option value="">Kategori seçiniz...</option>
                                    ${allCategories.map(cat => 
                                        `<option value="${cat}" ${category === cat ? 'selected' : ''}>${cat}</option>`
                                    ).join('')}
                                </select>
                            </div>
                            <div class="form-group">
                                <label class="form-label">Ürün Seçimi <span style="color: red;">*</span></label>
                                <select class="form-control" id="recipeProduct" onchange="onProductSelect()">
                                    <option value="">Ürün seçiniz...</option>
                                    ${filteredProducts.map(product => 
                                        `<option value="${product.id}" ${productId === product.id ? 'selected' : ''} data-category="${product.category}">
                                            ${product.name} - ${product.code} (${product.price}$)
                                        </option>`
                                    ).join('')}
                                </select>
                            </div>
                        </div>
                    </div>
                    <div class="recipe-form-section">
                        <h4 class="section-title">
                            <i class="fas fa-cubes"></i> Hammadde Seçimi
                            <span id="selectedRawMaterialsCount" style="background: #10b981; color: white; padding: 2px 8px; border-radius: 12px; font-size: 12px; margin-left: 10px;">
                                0 seçili
                            </span>
                        </h4>
                        <div id="selectedRawMaterialsPreview" class="selected-materials-preview" style="border: 2px dashed #ddd; border-radius: 8px; padding: 15px; margin-bottom: 20px; min-height: 60px;">
                            <div class="no-selection-message" style="text-align: center; color: #999;">
                                <i class="fas fa-info-circle"></i>
                                Henüz hammadde seçilmedi. Aşağıdaki kategorilerden seçim yapın.
                            </div>
                        </div>
                        <div class="stock-categories-grid" style="display: flex; flex-wrap: wrap; gap: 10px;">
                            ${getStockCategoriesHTML()}
                        </div>
                    </div>
                </div>
                <div class="modal-footer" style="padding: 20px; border-top: 2px solid #e5e7eb;">
                    <button class="btn btn-outline" onclick="closeNewRecipeModal()">
                        <i class="fas fa-times"></i> İptal
                    </button>
                    <button class="btn btn-success" onclick="saveNewRecipe()">
                        <i class="fas fa-save"></i> Reçeteyi Kaydet
                    </button>
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    
    // DOM'a eklendikten sonra değerleri ayarla
    setTimeout(() => {
        initializeRecipeForm(category, productId);
    }, 100);
}


function initializeRecipeForm(category, productId) {
    console.log('🔧 Reçete formu başlatılıyor:', { category, productId });
    
    const recipeInput = document.getElementById('recipeName');
    const productSelect = document.getElementById('recipeProduct');
    const categorySelect = document.getElementById('recipeCategory');
    
    console.log('Form elemanları bulundu:', {
        recipeInput: !!recipeInput,
        productSelect: !!productSelect,
        categorySelect: !!categorySelect
    });
    
    if (recipeInput) {
        recipeInput.focus();
        recipeInput.style.borderColor = ''; // Border rengini sıfırla
    }
    
    if (categorySelect && category) {
        categorySelect.value = category;
        selectedCategory = category;
        console.log('Kategori ayarlandı:', category);
        
        // Kategori değişimini tetikle
        onCategoryChange();
    }
    
    if (productSelect && productId && category) {
        // Kategori yüklendikten sonra ürünü seç
        setTimeout(() => {
            if (productSelect.querySelector(`option[value="${productId}"]`)) {
                productSelect.value = productId;
                selectedProduct = productId;
                console.log('Ürün ayarlandı:', productId);
                onProductSelect();
            }
        }, 50);
    }
}

// Stok kategorileri HTML'i oluştur
function getStockCategoriesHTML() {
    const stock = window.firebaseData?.stock || [];
    
    // Stokları kategorilere göre grupla
    const stockByCategory = {};
    stock.forEach(item => {
        const category = item.category || 'Diğer';
        if (!stockByCategory[category]) {
            stockByCategory[category] = [];
        }
        stockByCategory[category].push(item);
    });

    return Object.keys(stockByCategory).map(category => {
        const items = stockByCategory[category];
        const categoryIcon = getCategoryIcon(category);
        
        return `
            <div class=\"stock-category-folder\" onclick=\"openStockCategoryModal('${category}')\">
                <div class=\"folder-visual\">
                    <div class=\"folder-icon\">
                        <i class=\"fas ${categoryIcon}\"></i>
                    </div>
                    <div class=\"folder-label\">${category}</div>
                </div>
                <div class=\"folder-count\">${items.length} Öğe</div>
                <div class=\"folder-selected\" id=\"categorySelected_${category.replace(/\s+/g, '_')}\" style=\"display: none;\">
                    <i class=\"fas fa-check-circle\"></i>
                    <span>0 Seçili</span>
                </div>
            </div>
        `;
    }).join('');
}

// Kategori ikonu getir
function getCategoryIcon(category) {
    const icons = {
        'Ana Mamül': 'fa-industry',
        'Yan Mamül': 'fa-cogs',
        'Hammadde': 'fa-cube',
        'Elektronik': 'fa-microchip',
        'Mekanik': 'fa-wrench',
        'Optik': 'fa-lightbulb',
        'Kablo': 'fa-plug',
        'Vida': 'fa-screwdriver',
        'Diğer': 'fa-box'
    };
    return icons[category] || 'fa-folder';
}

function openStockCategoryModal(category) {
    console.log('📦 Stok kategori modalı açılıyor:', category);
    
    const stock = window.firebaseData?.stock?.filter(item => 
        (item.category || 'Diğer') === category
    ) || [];
    
    const modalHTML = `
        <div id="stockCategoryModal" class="modal show" style="z-index: 10001;">
            <div class="modal-content" style="max-width: 800px; max-height: 85vh;">
                <div class="modal-header">
                    <h3 class="modal-title">
                        <i class="fas ${getCategoryIcon(category)}"></i> ${category} - Hammadde Seçimi
                    </h3>
                    <button class="modal-close" onclick="closeModal('stockCategoryModal')">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="modal-body" style="max-height: 60vh; overflow-y: auto;">
                    
                    <!-- Hızlı İşlemler -->
                    <div class="quick-actions">
                        <button class="btn btn-sm btn-info" onclick="selectAllInCategory('${category}')">
                            <i class="fas fa-check-square"></i> Tümünü Seç
                        </button>
                        <button class="btn btn-sm btn-outline" onclick="clearCategorySelection('${category}')">
                            <i class="fas fa-times"></i> Temizle
                        </button>
                        <span class="selection-count">0 / ${stock.length} seçili</span>
                    </div>

                    <!-- Hammadde Listesi -->
                    <div class="raw-materials-grid">
                        ${stock.map(item => {
                            const isSelected = selectedRawMaterials.some(rm => rm.id === item.id);
                            const selectedMaterial = selectedRawMaterials.find(rm => rm.id === item.id);
                            const stockStatus = item.quantity > item.minStock ? 'success' : 
                                              item.quantity > 0 ? 'warning' : 'danger';
                            const stockLabel = item.quantity > item.minStock ? 'Yeterli' : 
                                             item.quantity > 0 ? 'Kritik' : 'Tükendi';
                            
                            return `
                                <div class="raw-material-item ${isSelected ? 'selected' : ''}" 
                                     data-material-id="${item.id}">
                                     
                                    <div class="material-checkbox" onclick="toggleRawMaterial('${item.id}', '${category}')">
                                        <input type="checkbox" ${isSelected ? 'checked' : ''} readonly>
                                    </div>
                                    
                                    <div class="material-info" onclick="toggleRawMaterial('${item.id}', '${category}')">
                                        <div class="material-name">${item.name}</div>
                                        <div class="material-code">${item.code}</div>
                                        <div class="material-details">
                                            <span class="stock-info">
                                                <span class="badge ${stockStatus}">${stockLabel}</span>
                                                ${item.quantity} ${item.unit}
                                            </span>
                                        </div>
                                    </div>
                                    
                                    <!-- Miktar Seçimi -->
                                    <div class="quantity-selector" ${isSelected ? '' : 'style="display: none;"'}>
                                        <label>Miktar:</label>
                                        <input type="number" 
                                               class="quantity-input" 
                                               id="quantity_${item.id}"
                                               value="${selectedMaterial?.quantity || 1}" 
                                               min="0.1" 
                                               step="0.1" 
                                               max="1000"
                                               oninput="updateRawMaterialQuantity('${item.id}', this.value)"
                                               onclick="event.stopPropagation()">
                                        <span class="unit-label">${item.unit}</span>
                                    </div>
                                </div>
                            `;
                        }).join('')}
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-success" onclick="closeModal('stockCategoryModal')">
                        <i class="fas fa-check"></i> Seçimi Onayla
                    </button>
                    <button class="btn btn-outline" onclick="closeModal('stockCategoryModal')">
                        <i class="fas fa-times"></i> İptal
                    </button>
                </div>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHTML);
    updateCategorySelectionCount(category);
}

function toggleRawMaterial(materialId, category) {
    const stock = window.firebaseData?.stock || [];
    const material = stock.find(item => item.id === materialId);
    
    if (!material) return;
    
    const existingIndex = selectedRawMaterials.findIndex(rm => rm.id === materialId);
    const materialElement = document.querySelector(`[data-material-id="${materialId}"]`);
    const quantitySelector = materialElement?.querySelector('.quantity-selector');
    const quantityInput = materialElement?.querySelector('.quantity-input');
    
    if (existingIndex > -1) {
        // Kaldır
        selectedRawMaterials.splice(existingIndex, 1);
        
        if (materialElement) {
            materialElement.classList.remove('selected');
            const checkbox = materialElement.querySelector('input[type="checkbox"]');
            if (checkbox) checkbox.checked = false;
            if (quantitySelector) quantitySelector.style.display = 'none';
        }
    } else {
        // Ekle
        const quantity = quantityInput ? parseFloat(quantityInput.value) || 1 : 1;
        
        selectedRawMaterials.push({
            id: material.id,
            name: material.name,
            code: material.code,
            category: material.category || 'Diğer',
            unit: material.unit,
            quantity: quantity,
            stockQuantity: material.quantity
        });
        
        if (materialElement) {
            materialElement.classList.add('selected');
            const checkbox = materialElement.querySelector('input[type="checkbox"]');
            if (checkbox) checkbox.checked = true;
            if (quantitySelector) quantitySelector.style.display = 'block';
        }
    }
    
    // UI güncelle
    updateCategorySelectionCount(category);
    updateSelectedRawMaterialsPreview();
}
function updateRawMaterialQuantity(materialId, quantity) {
    const material = selectedRawMaterials.find(rm => rm.id === materialId);
    if (material) {
        material.quantity = parseFloat(quantity) || 1;
        console.log(`Miktar güncellendi: ${materialId} -> ${material.quantity}`);
        updateSelectedRawMaterialsPreview();
    }
}

// Seçilen hammaddelerin önizlemesini güncelle
function updateSelectedRawMaterialsPreview() {
    const previewDiv = document.getElementById('selectedRawMaterialsPreview');
    const countSpan = document.getElementById('selectedRawMaterialsCount');
    
    if (!previewDiv || !countSpan) return;
    
    countSpan.textContent = `${selectedRawMaterials.length} seçili`;
    
    if (selectedRawMaterials.length === 0) {
        previewDiv.innerHTML = `
            <div class=\"no-selection-message\">
                <i class=\"fas fa-info-circle\"></i>
                Henüz hammadde seçilmedi. Aşağıdaki kategorilerden seçim yapın.
            </div>
        `;
        return;
    }
    
    // Kategorilere göre grupla
    const materialsByCategory = {};
    selectedRawMaterials.forEach(material => {
        const category = material.category || 'Diğer';
        if (!materialsByCategory[category]) {
            materialsByCategory[category] = [];
        }
        materialsByCategory[category].push(material);
    });
    
    previewDiv.innerHTML = `
        <div class=\"selected-materials-list\">
            ${Object.keys(materialsByCategory).map(category => `
                <div class=\"category-group\">
                    <div class=\"category-header\">
                        <i class=\"fas ${getCategoryIcon(category)}\"></i>
                        <span>${category}</span>
                        <span class=\"count\">(${materialsByCategory[category].length})</span>
                    </div>
                    <div class=\"materials-in-category\">
                        ${materialsByCategory[category].map(material => `
                            <div class=\"selected-material-tag\">
                                <span class=\"material-name\">${material.name}</span>
                                <span class=\"material-quantity\">${material.quantity} ${material.unit}</span>
                                <button class=\"remove-material\" onclick=\"removeMaterialFromSelection('${material.id}')\" title=\"Kaldır\">
                                    <i class=\"fas fa-times\"></i>
                                </button>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `).join('')}
        </div>
    `;
}

// Hammaddeyi seçimden kaldır
function removeMaterialFromSelection(materialId) {
    selectedRawMaterials = selectedRawMaterials.filter(rm => rm.id !== materialId);
    updateSelectedRawMaterialsPreview();
    updateRawMaterialSelection();
    
    // Eğer stok kategori modalı açıksa, oradaki seçimi de güncelle
    const categoryModal = document.getElementById('stockCategoryModal');
    if (categoryModal) {
        const materialElement = categoryModal.querySelector(`[data-material-id=\"${materialId}\"]`);
        if (materialElement) {
            materialElement.classList.remove('selected');
            const checkbox = materialElement.querySelector('input[type=\"checkbox\"]');
            if (checkbox) checkbox.checked = false;
            const quantitySelector = materialElement.querySelector('.quantity-selector');
            if (quantitySelector) quantitySelector.style.display = 'none';
        }
    }
}



function closeNewRecipeModal() {
    const modal = document.getElementById('newRecipeModal');
    if (modal) {
        modal.remove();
    }
    
    // Eğer başka bir modal açıksa (stockCategoryModal gibi) onu da kapat
    const stockModal = document.getElementById('stockCategoryModal');
    if (stockModal) {
        stockModal.remove();
    }
    
    // Global değişkenleri temizle
    selectedRawMaterials = [];
    selectedProduct = null;
    selectedCategory = null;
}


function showNotification(title, message, type) {
    alert(`${title}: ${message}`);
    console.log(`[${type.toUpperCase()}] ${title}: ${message}`);
}
// Yardımcı fonksiyonlar
function updateRawMaterialSelection() {
    // Mevcut modalda seçimleri güncelle
    selectedRawMaterials.forEach(material => {
        const element = document.querySelector(`[data-material-id=\"${material.id}\"]`);
        if (element) {
            element.classList.add('selected');
            const checkbox = element.querySelector('input[type=\"checkbox\"]');
            if (checkbox) checkbox.checked = true;
            const quantitySelector = element.querySelector('.quantity-selector');
            if (quantitySelector) quantitySelector.style.display = 'block';
        }
    });
}

function updateCategorySelectionCount(category) {
    const categoryKey = category.replace(/\s+/g, '_');
    const countElement = document.getElementById(`categorySelected_${categoryKey}`);
    
    if (countElement) {
        const categoryMaterials = selectedRawMaterials.filter(rm => 
            (rm.category || 'Diğer') === category
        );
        
        if (categoryMaterials.length > 0) {
            countElement.style.display = 'block';
            countElement.querySelector('span').textContent = `${categoryMaterials.length} Seçili`;
        } else {
            countElement.style.display = 'none';
        }
    }
}

function selectAllInCategory(category) {
    const stock = window.firebaseData?.stock?.filter(item => 
        (item.category || 'Diğer') === category
    ) || [];
    
    stock.forEach(item => {
        if (!selectedRawMaterials.some(rm => rm.id === item.id)) {
            selectedRawMaterials.push({
                id: item.id,
                name: item.name,
                code: item.code,
                category: item.category || 'Diğer',
                unit: item.unit,
                quantity: 1,
                stockQuantity: item.quantity
            });
        }
    });
    
    updateRawMaterialSelection();
    updateCategorySelectionCount(category);
    updateSelectedRawMaterialsPreview();
}

function clearCategorySelection(category) {
    selectedRawMaterials = selectedRawMaterials.filter(rm => 
        (rm.category || 'Diğer') !== category
    );
    
    updateRawMaterialSelection();
    updateCategorySelectionCount(category);
    updateSelectedRawMaterialsPreview();
}

// Reçete detaylarını görüntüle
function viewRecipeDetails(recipeId) {
    console.log('📋 Reçete detayları görüntüleniyor:', recipeId);
    
    const recipe = window.firebaseData?.recipes?.find(r => r.id === recipeId);
    const product = window.firebaseData?.products?.find(p => p.id === recipe?.productId);
    
    if (!recipe) {
        showNotification('Hata', 'Reçete bulunamadı.', 'error');
        return;
    }
    
    const modalHTML = `
        <div id="recipeDetailsModal" class="modal show">
            <div class="modal-content" style="max-width: 800px;">
                <div class="modal-header">
                    <h3 class="modal-title">
                        <i class="fas fa-clipboard-list"></i> Reçete Detayları
                    </h3>
                    <button class="modal-close" onclick="closeModal('recipeDetailsModal')">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="modal-body">
                    <div class="recipe-detail-section">
                        <h4><i class="fas fa-info-circle"></i> Temel Bilgiler</h4>
                        <div class="detail-grid">
                            <div class="detail-item">
                                <label>Reçete Adı:</label>
                                <span>${recipe.name}</span>
                            </div>
                            <div class="detail-item">
                                <label>Ürün:</label>
                                <span>${product?.name || 'Belirtilmemiş'} (${product?.code || '-'})</span>
                            </div>
                            <div class="detail-item">
                                <label>Kategori:</label>
                                <span>${recipe.category || product?.category || 'Belirtilmemiş'}</span>
                            </div>
                            <div class="detail-item">
                                <label>Durum:</label>
                                <span class="badge ${recipe.active ? 'success' : 'danger'}">${recipe.active ? 'Aktif' : 'Pasif'}</span>
                            </div>
                        </div>
                    </div>
                    
                    <div class="recipe-detail-section">
                        <h4><i class="fas fa-cubes"></i> Hammaddeler (${recipe.rawMaterialDetails?.length || 0})</h4>
                        <div class="materials-list">
                            ${(recipe.rawMaterialDetails || []).map(material => `
                                <div class="material-detail-card">
                                    <div class="material-name">${material.name}</div>
                                    <div class="material-info">
                                        <span class="material-code">${material.code}</span>
                                        <span class="material-quantity">${material.quantity} ${material.unit}</span>
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-outline" onclick="closeModal('recipeDetailsModal')">
                        <i class="fas fa-times"></i> Kapat
                    </button>
                    <button class="btn btn-primary" onclick="editRecipeModal('${recipeId}')">
                        <i class="fas fa-edit"></i> Düzenle
                    </button>
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHTML);
}

// Reçete düzenleme modalı
function editRecipeModal(recipeId) {
    console.log('✏️ Reçete düzenleme modalı açılıyor:', recipeId);
    
    const recipe = window.firebaseData?.recipes?.find(r => r.id === recipeId);
    if (!recipe) {
        showNotification('Hata', 'Reçete bulunamadı.', 'error');
        return;
    }
    
    // Düzenleme için mevcut seçimleri yükle
    selectedRawMaterials = recipe.rawMaterialDetails || [];
    selectedProduct = recipe.productId;
    selectedCategory = recipe.category;
    
    // Yeni reçete modalını düzenleme modunda aç
    openNewRecipeModal(recipe.category, recipe.productId);
    
    // Modal açıldıktan sonra değerleri doldur
    setTimeout(() => {
        const recipeNameInput = document.getElementById('recipeName');
        if (recipeNameInput) {
            recipeNameInput.value = recipe.name;
        }
        document.getElementById('recipeProduct').value = recipe.productId;
        
        // Kaydet butonunu güncelle
        const saveBtn = document.querySelector('#newRecipeModal .btn-success');
        saveBtn.innerHTML = '<i class="fas fa-save"></i> Güncelle';
        saveBtn.onclick = () => updateRecipe(recipeId);
        
        // Modal başlığını güncelle
        document.querySelector('#newRecipeModal .modal-title').innerHTML = 
            '<i class="fas fa-edit"></i> Reçete Düzenle';
        
        updateSelectedRawMaterialsPreview();
    }, 100);
}

// Reçete güncelleme
async function updateRecipe(recipeId) {
    const recipeNameInput = document.getElementById('recipeName');
    const productSelect = document.getElementById('recipeProduct');
    const categorySelect = document.getElementById('recipeCategory');
    
    const recipeName = recipeNameInput?.value?.trim();
    const productId = productSelect?.value;
    const categoryValue = categorySelect?.value;
    
    if (!recipeName || !productId || !categoryValue || selectedRawMaterials.length === 0) {
        showNotification('Hata', 'Lütfen tüm alanları doldurun.', 'error');
        return;
    }
    
    try {
        const recipeData = {
            name: recipeName,
            productId: productId,
            rawMaterials: selectedRawMaterials.map(rm => rm.id),
            rawMaterialDetails: selectedRawMaterials,
            category: selectedCategory || categoryValue,
            updatedAt: new Date().toISOString()
        };
        
        await window.firestoreService.updateRecipe(recipeId, recipeData);
        
        showNotification('Başarılı', 'Reçete güncellendi.', 'success');
        closeNewRecipeModal();
        await loadFirebaseData();
        
        if (currentRecipeCategory) {
            loadCategoryRecipePage(currentRecipeCategory);
        } else {
            loadUrunReceteleri();
        }
        
    } catch (error) {
        console.error('Reçete güncelleme hatası:', error);
        showNotification('Hata', 'Reçete güncellenirken hata oluştu.', 'error');
    }
}

// Reçete silme onayı
function deleteRecipeConfirm(recipeId) {
    if (confirm('Bu reçeteyi silmek istediğinizden emin misiniz?')) {
        deleteRecipe(recipeId);
    }
}

// Reçete silme
async function deleteRecipe(recipeId) {
    try {
        await window.firestoreService.deleteRecipe(recipeId);
        showNotification('Başarılı', 'Reçete silindi.', 'success');
        
        await loadFirebaseData();
        
        if (currentRecipeCategory) {
            loadCategoryRecipePage(currentRecipeCategory);
        } else {
            loadUrunReceteleri();
        }
        
    } catch (error) {
        console.error('Reçete silme hatası:', error);
        showNotification('Hata', 'Reçete silinirken hata oluştu.', 'error');
    }
}

// Window'a fonksiyonları ekle
window.viewRecipeDetails = viewRecipeDetails;
window.editRecipeModal = editRecipeModal;
window.updateRecipe = updateRecipe;
window.deleteRecipeConfirm = deleteRecipeConfirm;
window.deleteRecipe = deleteRecipe;
window.loadUrunReceteleri = loadUrunReceteleri;
window.openCategoryRecipes = openCategoryRecipes;
window.openNewRecipeModal = openNewRecipeModal;
window.openStockCategoryModal = openStockCategoryModal;
window.toggleRawMaterial = toggleRawMaterial;
window.updateRawMaterialQuantity = updateRawMaterialQuantity;
window.removeMaterialFromSelection = removeMaterialFromSelection;
window.onProductSelect = onProductSelect;
window.saveNewRecipe = saveNewRecipe;
window.closeNewRecipeModal = closeNewRecipeModal;
window.selectAllInCategory = selectAllInCategory;
window.clearCategorySelection = clearCategorySelection;
window.loadCategoryRecipePage = loadCategoryRecipePage;
window.onCategoryChange = onCategoryChange;



console.log('✅ recipes.js yüklendi');