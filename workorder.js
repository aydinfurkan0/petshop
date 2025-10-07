// ===========================================
// workorder.JS - Üretim YÖNETİMİ
// ============================================
let rawMaterialSelections = {};
function loadIsEmriVer() {
  const shipmentData = localStorage.getItem("shipmentToProduction");
  let fromShipment = null;

  if (shipmentData) {
    fromShipment = JSON.parse(shipmentData);
    localStorage.removeItem("shipmentToProduction");
  }

  const offerData = localStorage.getItem("offerToProduction");
  let fromOffer = null;

  if (offerData) {
    fromOffer = JSON.parse(offerData);
    localStorage.removeItem("offerToProduction");
  }

  const orderNo = `URT-${new Date().getFullYear()}-${String(
    firebaseData.production.length + 1
  ).padStart(3, "0")}`;

  const content = `
        <div class="page-header">
            <h1 class="page-title"><i class="fas fa-file-alt"></i> İş Emri Ver</h1>
            <p class="page-subtitle">Tek iş emri ile birden fazla ürün ekleyin ve reçete detaylarını kontrol edin</p>
        </div>
        
        ${
          fromShipment
            ? `
        <div class="alert alert-info" style="margin-bottom: 20px;">
            <i class="fas fa-info-circle"></i> 
            <strong>Sevkiyattan Aktarıldı:</strong> ${fromShipment.originalOrder} numaralı üretimden tekrar üretim talebi
        </div>
        `
            : ""
        }
        
        ${
          fromOffer
            ? `
        <div class="alert alert-info" style="margin-bottom: 20px;">
            <i class="fas fa-info-circle"></i> 
            <strong>Tekliften Aktarıldı:</strong> ${fromOffer.no} numaralı tekliften aktarıldı
        </div>
        `
            : ""
        }
        
               
        <div class="card">
            <div class="card-header" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white;">
                <h3 class="card-title"><i class="fas fa-edit"></i> İş Emri No: ${orderNo}</h3>
            </div>
            <div class="card-body">
                <div class="form-grid">
                    <div class="form-group">
                        <label class="form-label"><i class="fas fa-building"></i> Müşteri</label>
                        <select class="form-control" id="jobCompany">
                            <option value="">Müşteri seçiniz...</option>
                            ${firebaseData.companies
                              .map(
                                (c) => `
                                <option value="${c.id}" ${
                                  fromShipment?.companyId === c.id ||
                                  fromOffer?.companyId === c.id
                                    ? "selected"
                                    : ""
                                }>
                                    ${c.name}
                                </option>
                            `
                              )
                              .join("")}
                        </select>
                    </div>
                    
                    <div class="form-group">
                        <label class="form-label"><i class="fas fa-calendar-alt"></i> Başlangıç Tarihi</label>
                        <input type="date" class="form-control" id="jobStartDate" value="${
                          new Date().toISOString().split("T")[0]
                        }" required>
                    </div>
                    
                    <div class="form-group">
                        <label class="form-label"><i class="fas fa-calendar-check"></i> Termin Tarihi</label>
                        <input type="date" class="form-control" id="jobDeadline" value="${
                          fromShipment?.deadline || ""
                        }">
                    </div>
                    
                    <div class="form-group">
                        <label class="form-label"><i class="fas fa-flag"></i> Öncelik</label>
                        <select class="form-control" id="jobPriority">
                            <option value="normal" ${
                              fromShipment?.priority === "normal"
                                ? "selected"
                                : ""
                            }>Normal</option>
                            <option value="yuksek" ${
                              fromShipment?.priority === "yuksek"
                                ? "selected"
                                : ""
                            }>Yüksek</option>
                            <option value="acil" ${
                              fromShipment?.priority === "acil"
                                ? "selected"
                                : ""
                            }>Acil</option>
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
                                <th>Kategori</th>
                                <th>Ürün Seçimi</th>
                                <th>Ürün Adı</th>
                                <th>Miktar</th>
                                <th>Hammaddeler</th>
                                <th>Stok Durumu</th>
                                <th>İşlem</th>
                            </tr>
                        </thead>
                        
                        <tbody id="jobOrderProducts">
                            ${
                              fromShipment && fromShipment.recipeId
                                ? (() => {
                                    const recipe = firebaseData.recipes.find(
                                      (r) => r.id === fromShipment.recipeId
                                    );
                                    const product = firebaseData.products.find(
                                      (p) => p.id === fromShipment.productId
                                    );
                                    return product && recipe
                                      ? createJobOrderProductRow(
                                          product,
                                          recipe,
                                          fromShipment.quantity
                                        )
                                      : "";
                                  })()
                                : ""
                            }
                            ${
                              fromOffer
                                ? fromOffer.products
                                    .map((item) => {
                                      const product =
                                        firebaseData.products.find(
                                          (p) => p.id === item.productId
                                        );
                                      const recipe = firebaseData.recipes.find(
                                        (r) => r.productId === item.productId
                                      );
                                      return createJobOrderProductRow(
                                        product,
                                        recipe,
                                        item.quantity
                                      );
                                    })
                                    .join("")
                                : ""
                            }
                        </tbody>
                    </table>
                </div>
                
                <div id="recipeDetailsPreview" style="margin-top: 30px; display: none;">
                    <div class="card" style="border: 2px solid var(--primary);">
                        <div class="card-header" style="background: var(--primary); color: white;">
                            <h4 style="margin: 0;">
                                <i class="fas fa-flask"></i> Reçete Detayları ve Stok Kontrolü
                            </h4>
                        </div>
                        <div class="card-body" id="recipeDetailsContent" style="background: var(--gray-50);">
                        </div>
                    </div>
                </div>
                
                <div id="productionSummary" style="margin-top: 30px; display: none;">
                    <div class="card" style="border: 2px solid var(--success);">
                        <div class="card-header" style="background: var(--success); color: white;">
                            <h4 style="margin: 0;">
                                <i class="fas fa-chart-pie"></i> Üretim Özeti
                            </h4>
                        </div>
                        <div class="card-body" id="productionSummaryContent">
                        </div>
                    </div>
                </div>
                
                <div class="form-group" style="margin-top: 20px;">
                    <label class="form-label"><i class="fas fa-sticky-note"></i> Genel Notlar</label>
                    <textarea class="form-control" id="jobNotes" rows="3" placeholder="Üretim ile ilgili özel notlar...">${
                      fromShipment?.notes ||
                      (fromOffer
                        ? `${fromOffer.no} numaralı tekliften aktarıldı`
                        : "")
                    }</textarea>
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
                            ${firebaseData.production
                              .slice(-5)
                              .reverse()
                              .map((prod) => {
                                const company = firebaseData.companies.find(
                                  (c) => c.id === prod.companyId
                                );
                                const productCount = prod.products
                                  ? prod.products.length
                                  : 1;
                                return `
                                    <tr>
                                        <td><strong>${
                                          prod.orderNo
                                        }</strong></td>
                                        <td>${company?.name || "-"}</td>
                                        <td>${productCount} ürün</td>
                                        <td><span class="badge ${
                                          prod.status === "Tamamlandı"
                                            ? "success"
                                            : prod.status === "Üretimde"
                                            ? "warning"
                                            : "info"
                                        }">${prod.status}</span></td>
                                        <td>${prod.startDate}</td>
                                    </tr>
                                `;
                              })
                              .join("")}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    `;

  document.getElementById("pageContent").innerHTML = content;

  if (fromShipment || fromOffer) {
    updateRecipeDetails();
  }
}


// İş emri ürün satırı oluştur
function createJobOrderProductRow(product, recipe, quantity = 1) {
  if (!product) {
    console.error("Ürün bulunamadı");
    return "";
  }

  let stockStatus = "success";
  let stockMessage = "Yeterli";

  if (recipe?.rawMaterials) {
    for (const rmId of recipe.rawMaterials) {
      const rm = firebaseData.stock.find((s) => s.id === rmId);
      const needed = quantity * (recipe.quantityPerUnit || 1);
      if (!rm || rm.quantity < needed) {
        stockStatus = "danger";
        stockMessage = "Yetersiz";
        break;
      }
    }
  }

  const rawMaterials =
    recipe?.rawMaterials
      ?.map((rmId) => {
        const rm = firebaseData.stock.find((s) => s.id === rmId);
        return rm ? rm.name : "Bilinmeyen";
      })
      .slice(0, 3)
      .join(", ") + (recipe?.rawMaterials?.length > 3 ? "..." : "") ||
    "Hammadde yok";

  return `
        <tr data-product-id="${product.id}" data-recipe-id="${
    recipe?.id || ""
  }">
            <td>
                <select class="form-control recipe-select" onchange="updateProductFromRecipeAndDetails(this)">
                    <option value="">Reçete seçiniz...</option>
                    ${firebaseData.recipes
                      .map((r) => {
                        const p = firebaseData.products.find(
                          (p) => p.id === r.productId
                        );
                        return `<option value="${r.id}" data-product="${
                          r.productId
                        }" ${recipe?.id === r.id ? "selected" : ""}>
                            ${r.name} (${p?.name || "Bilinmeyen"})
                        </option>`;
                      })
                      .join("")}
                </select>
            </td>
            <td class="product-name">${product.name}</td>
            <td>
                <input type="number" class="form-control quantity-input" value="${quantity}" min="1" style="width: 80px;" onchange="updateRecipeDetails()">
            </td>
            <td class="raw-materials" style="font-size: 12px;" title="${
              recipe?.rawMaterials?.length || 0
            } hammadde">${rawMaterials}</td>
            <td>
                <span class="badge ${stockStatus}">${stockMessage}</span>
            </td>
            <td>
                <button class="btn btn-sm btn-info" onclick="showRecipeDetailModal('${
                  recipe?.id
                }', ${quantity})" title="Detay">
                    <i class="fas fa-eye"></i> Önizle
                </button>
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
  const rowId = `row_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  const categories = [...new Set(firebaseData.products.map(p => p.category))].filter(Boolean);
  
  newRow.setAttribute('data-row-id', rowId);
  newRow.innerHTML = `
    <td>
      <select class="form-control category-select" onchange="loadProductsByCategory(this, '${rowId}')">
        <option value="">Kategori seçiniz...</option>
        ${categories.map(cat => `<option value="${cat}">${cat}</option>`).join('')}
      </select>
    </td>
    <td>
      <select class="form-control product-select" disabled onchange="updateProductSelection(this, '${rowId}')">
        <option value="">Önce kategori seçin...</option>
      </select>
    </td>
    <td class="product-name">-</td>
    <td>
      <input type="number" class="form-control quantity-input" value="1" min="1" style="width: 80px;" onchange="updateRecipeDetails()">
    </td>
    <td class="raw-materials-cell">-</td>
    <td><span class="badge warning">Bekliyor</span></td>
    <td>
      <button class="btn btn-sm btn-danger" onclick="removeProductRow('${rowId}')">
        <i class="fas fa-trash"></i>
      </button>
    </td>
  `;
  
  tbody.appendChild(newRow);
}
// Reçete seçimine göre ürünü güncelle
function updateProductFromRecipeAndDetails(select) {
  const recipeId = select.value;
  const row = select.closest("tr");

  if (!recipeId) {
    row.querySelector(".product-name").textContent = "-";
    row.querySelector(".raw-materials").textContent = "-";
    row.querySelector("td:nth-child(5)").innerHTML =
      '<span class="badge warning">Bekliyor</span>';

    const previewCell = row.querySelector("td:last-child");
    const previewBtn = previewCell.querySelector(".btn-info");
    if (previewBtn) {
      previewBtn.style.display = "none";
    }

    updateRecipeDetails();
    return;
  }

  const recipe = firebaseData.recipes.find((r) => r.id === recipeId);
  const product = recipe
    ? firebaseData.products.find((p) => p.id === recipe.productId)
    : null;
  const quantity = parseInt(row.querySelector(".quantity-input").value) || 1;

  row.querySelector(".product-name").textContent =
    product?.name || "Bilinmeyen";

  const rawMaterials =
    recipe?.rawMaterials
      ?.map((rmId) => {
        const rm = firebaseData.stock.find((s) => s.id === rmId);
        return rm?.name || "Bilinmeyen";
      })
      .slice(0, 3)
      .join(", ") + (recipe?.rawMaterials?.length > 3 ? "..." : "") ||
    "Hammadde yok";
  row.querySelector(".raw-materials").textContent = rawMaterials;

  let stockStatus = "success";
  let stockMessage = "Yeterli";

  if (recipe?.rawMaterials) {
    for (const rmId of recipe.rawMaterials) {
      const rm = firebaseData.stock.find((s) => s.id === rmId);
      const needed = quantity * (recipe.quantityPerUnit || 1);
      if (!rm || rm.quantity < needed) {
        stockStatus = "danger";
        stockMessage = "Yetersiz";
        break;
      }
    }
  }

  row.querySelector(
    "td:nth-child(5)"
  ).innerHTML = `<span class="badge ${stockStatus}">${stockMessage}</span>`;

  const previewCell = row.querySelector("td:last-child");
  let previewBtn = previewCell.querySelector(".btn-info");

  if (recipe) {
    if (!previewBtn) {
      const deleteBtn = previewCell.querySelector(".btn-danger");
      previewBtn = document.createElement("button");
      previewBtn.className = "btn btn-sm btn-info";
      previewBtn.style.marginRight = "5px";
      previewBtn.title = "Detay";
      previewBtn.innerHTML = '<i class="fas fa-eye"></i> Önizle';
      previewCell.insertBefore(previewBtn, deleteBtn);
    }
    previewBtn.onclick = () => showRecipeDetailModal(recipeId, quantity);
    previewBtn.style.display = "inline-block";
  } else if (previewBtn) {
    previewBtn.style.display = "none";
  }

  updateRecipeDetails();
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
    const rowId = row.getAttribute('data-row-id');
    const productId = row.getAttribute('data-product-id');
    const quantity = parseInt(row.querySelector('.quantity-input').value) || 0;
    const productName = row.querySelector('.product-name').textContent;

    if (productId && quantity > 0 && rawMaterialSelections[rowId]) {
      const product = firebaseData.products.find(p => p.id === productId);
      const selection = rawMaterialSelections[rowId];
      const allMaterials = [...selection.mainMaterials, ...selection.subMaterials];

      productsList.push({
        name: productName,
        quantity: quantity,
        materialCount: allMaterials.length
      });

      allMaterials.forEach(mat => {
        const rm = firebaseData.stock.find(s => s.id === mat.id);
        if (rm) {
          const needed = quantity * mat.quantity;
          if (!totalRawMaterials[mat.id]) {
            totalRawMaterials[mat.id] = {
              name: rm.name,
              unit: rm.unit,
              required: 0,
              available: rm.quantity,
              type: rm.type || 'Ana Mamül'
            };
          }
          totalRawMaterials[mat.id].required += needed;
        }
      });
    }
  });

  Object.entries(totalRawMaterials).forEach(([rmId, rm]) => {
    if (rm.available < rm.required) {
      hasStockIssue = true;
      stockIssues.push(`${rm.name}: ${rm.required - rm.available} ${rm.unit} eksik`);
    }
  });

  if (Object.keys(totalRawMaterials).length > 0) {
    detailsDiv.style.display = 'block';
    contentDiv.innerHTML = `
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
        <div>
          <h5 style="margin-bottom: 15px; color: var(--primary); font-size: 1.1rem;">
            <i class="fas fa-cubes"></i> Toplam Hammadde İhtiyacı
          </h5>
          <table class="table" style="font-size: 0.9rem;">
            <thead>
              <tr style="background: white;">
                <th>Hammadde</th>
                <th>Tip</th>
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
                    <td><span class="badge ${rm.type === 'Yan Mamül' ? 'info' : 'primary'}" style="font-size: 0.8rem;">${rm.type}</span></td>
                    <td>${rm.required} ${rm.unit}</td>
                    <td>${rm.available} ${rm.unit}</td>
                    <td>
                      ${sufficient 
                        ? `<span class="badge success"><i class="fas fa-check"></i> Yeterli</span>`
                        : `<span class="badge danger"><i class="fas fa-times"></i> ${rm.required - rm.available} ${rm.unit} Eksik</span>`
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
          <h5 style="margin-bottom: 15px; color: var(--success); font-size: 1.1rem;">
            <i class="fas fa-clipboard-list"></i> Üretim Listesi
          </h5>
          <div style="background: white; padding: 15px; border-radius: 8px;">
            ${productsList.map(p => `
              <div style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;">
                <strong>${p.quantity} adet</strong> ${p.name}
                <br>
                <small style="color: #6b7280; font-size: 0.85rem;">${p.materialCount} hammadde</small>
              </div>
            `).join('')}
            <div style="margin-top: 15px; padding-top: 15px; border-top: 2px solid #e5e7eb;">
              <strong>Toplam: ${productsList.reduce((sum, p) => sum + p.quantity, 0)} ürün</strong>
            </div>
          </div>
        </div>
      </div>
    `;

    summaryDiv.style.display = 'block';
    summaryContent.innerHTML = `
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px;">
        <div style="text-align: center; padding: 15px; background: var(--gray-50); border-radius: 8px;">
          <div style="font-size: 1.5rem; font-weight: bold; color: var(--primary);">${productsList.length}</div>
          <div style="font-size: 0.85rem; color: var(--gray-600);">Farklı Ürün</div>
        </div>
        <div style="text-align: center; padding: 15px; background: var(--gray-50); border-radius: 8px;">
          <div style="font-size: 1.5rem; font-weight: bold; color: var(--success);">${productsList.reduce((sum, p) => sum + p.quantity, 0)}</div>
          <div style="font-size: 0.85rem; color: var(--gray-600);">Toplam Adet</div>
        </div>
        <div style="text-align: center; padding: 15px; background: var(--gray-50); border-radius: 8px;">
          <div style="font-size: 1.5rem; font-weight: bold; color: var(--warning);">${Object.keys(totalRawMaterials).length}</div>
          <div style="font-size: 0.85rem; color: var(--gray-600);">Hammadde Çeşidi</div>
        </div>
        <div style="text-align: center; padding: 15px; background: var(--gray-50); border-radius: 8px;">
          <div style="font-size: 1.5rem; font-weight: bold; color: ${hasStockIssue ? 'var(--danger)' : 'var(--success)'};">
            ${hasStockIssue ? '<i class="fas fa-exclamation-triangle"></i>' : '<i class="fas fa-check-circle"></i>'}
          </div>
          <div style="font-size: 0.85rem; color: var(--gray-600);">Stok Durumu</div>
        </div>
      </div>
    `;

    if (hasStockIssue) {
      warningDiv.style.display = 'block';
      warningContent.innerHTML = `
        <ul style="margin: 0; padding-left: 20px; font-size: 0.9rem;">
          ${stockIssues.map(issue => `<li>${issue}</li>`).join('')}
        </ul>
        <div style="margin-top: 10px; font-size: 0.9rem;">
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

  const products = [];
  let hasError = false;

  rows.forEach(row => {
    const rowId = row.getAttribute('data-row-id');
    const productId = row.getAttribute('data-product-id');
    const quantityInput = row.querySelector('.quantity-input');

    if (!productId || !rawMaterialSelections[rowId]) {
      showNotification('Hata', 'Tüm ürünler için kategori, ürün ve hammadde seçilmelidir.', 'error');
      hasError = true;
      return;
    }

    const quantity = parseInt(quantityInput.value) || 1;
    const product = firebaseData.products.find(p => p.id === productId);
    const selection = rawMaterialSelections[rowId];

    if (!product) {
      showNotification('Hata', 'Ürün bilgisi bulunamadı.', 'error');
      hasError = true;
      return;
    }

    products.push({
      productId: productId,
      productName: product.name,
      quantity: quantity,
      rawMaterials: [...selection.mainMaterials, ...selection.subMaterials],
      mainMaterials: selection.mainMaterials,
      subMaterials: selection.subMaterials
    });
  });

  if (hasError) return;

  const orderNo = `URT-${new Date().getFullYear()}-${String(firebaseData.production.length + 1).padStart(3, '0')}`;

  const jobOrder = {
    orderNo: orderNo,
    companyId: companyId,
    products: products,
    product: products[0].productName,
    productId: products[0].productId,
    quantity: products[0].quantity,
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
    rawMaterialSelections = {};
    showPage('uretimListesi');
  } catch (error) {
    console.error('İş emri oluşturma hatası:', error);
    showNotification('Hata', 'İş emri oluşturulurken hata oluştu.', 'error');
  }
}


// Reçete detay modalı göster
function showRecipeDetailModal(recipeId, quantity) {
  if (!recipeId) return;

  const recipe = firebaseData.recipes.find((r) => r.id === recipeId);
  if (!recipe) return;

  const product = firebaseData.products.find((p) => p.id === recipe.productId);

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
                        <div><strong>Ürün:</strong> ${
                          product?.name || "Bilinmeyen"
                        }</div>
                        <div><strong>Miktar:</strong> ${quantity} adet</div>
                        <div><strong>Birim Başına Hammadde:</strong> ${
                          recipe.quantityPerUnit || 1
                        }</div>
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
                            ${
                              recipe.rawMaterials
                                ?.map((rmId) => {
                                  const rm = firebaseData.stock.find(
                                    (s) => s.id === rmId
                                  );
                                  const unitNeed = recipe.quantityPerUnit || 1;
                                  const totalNeed = unitNeed * quantity;
                                  const sufficient =
                                    rm && rm.quantity >= totalNeed;
                                  return `
                                    <tr>
                                        <td>${rm?.name || "Bilinmeyen"}</td>
                                        <td>${unitNeed} ${rm?.unit || ""}</td>
                                        <td><strong>${totalNeed} ${
                                    rm?.unit || ""
                                  }</strong></td>
                                        <td>${rm?.quantity || 0} ${
                                    rm?.unit || ""
                                  }</td>
                                        <td>
                                            <span class="badge ${
                                              sufficient ? "success" : "danger"
                                            }">
                                                ${
                                                  sufficient
                                                    ? "Yeterli"
                                                    : "Yetersiz"
                                                }
                                            </span>
                                        </td>
                                    </tr>
                                `;
                                })
                                .join("") ||
                              '<tr><td colspan="5">Hammadde bilgisi yok</td></tr>'
                            }
                        </tbody>
                    </table>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-outline" onclick="closeModal('recipeDetailModal')">Kapat</button>
                </div>
            </div>
        </div>
    `;

  document.body.insertAdjacentHTML("beforeend", modalHTML);
}

// ========================================
// ÜRETİM TAKİP - PRODUCTION TRACKING
// ========================================

function loadUretimTakip() {
  const departments = ["Depo/Stok", "Dizgi", "İmalat/Montaj"];
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
                ${departments
                  .map(
                    (dep) => `
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
                                      .filter(
                                        (p) =>
                                          p.status !== "Tamamlandı" &&
                                          p.currentDepartment === dep
                                      )
                                      .map((prod) => {
                                        const recipe =
                                          firebaseData.recipes.find(
                                            (r) => r.id === prod.recipeId
                                          );
                                        const approvals = prod.approvals || [];
                                        return `
                                            <tr style="cursor: default;">
                                                <td><strong>${
                                                  prod.orderNo
                                                }</strong></td>
                                                <td>${prod.product}</td>
                                                <td>${
                                                  recipe
                                                    ? recipe.name
                                                    : "Bilinmeyen"
                                                }</td>
                                                <td>${prod.quantity}</td>
                                                <td>${prod.startDate}</td>
                                                <td>
                                                    <div style="display: flex; align-items: center; gap: 8px;">
                                                        <div style="width: 60px; height: 6px; background: var(--gray-200); border-radius: 3px; overflow: hidden;">
                                                            <div style="width: ${
                                                              prod.progress || 0
                                                            }%; height: 100%; background: var(--primary);"></div>
                                                        </div>
                                                        <span>${
                                                          prod.progress || 0
                                                        }%</span>
                                                    </div>
                                                </td>
                                            </tr>
                                        `;
                                      })
                                      .join("")}
                                </tbody>
                            </table>
                        </div>
                    </div>
                `
                  )
                  .join("")}
            </div>
        </div>
    `;
  document.getElementById("pageContent").innerHTML = content;
}

// ========================================
// ÜRETİM LİSTESİ - PRODUCTION LIST
// ========================================

function loadUretimListesi() {
  const departments = ["Depo/Stok", "Dizgi", "İmalat/Montaj"];
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
                              .filter((p) => p.status !== "Tamamlandı")
                              .map((prod) => {
                                const recipe = firebaseData.recipes.find(
                                  (r) => r.id === prod.recipeId
                                );
                                const approvals = prod.approvals || [];
                                const approvalStates = {
                                  "Depo/Stok": approvals.some(
                                    (a) => a.department === "Depo/Stok"
                                  ),
                                  Dizgi: approvals.some(
                                    (a) => a.department === "Dizgi"
                                  ),
                                  "İmalat/Montaj": approvals.some(
                                    (a) => a.department === "İmalat/Montaj"
                                  ),
                                };
                                return `
                                    <tr>
                                        <td><strong>${
                                          prod.orderNo
                                        }</strong></td>
                                        <td>${prod.product}</td>
                                        <td>${
                                          recipe ? recipe.name : "Bilinmeyen"
                                        }</td>
                                        <td>${prod.quantity}</td>
                                        <td>
                                            <span class="badge ${
                                              approvalStates["Depo/Stok"]
                                                ? "success"
                                                : "warning"
                                            }">
                                                <i class="fas ${
                                                  approvalStates["Depo/Stok"]
                                                    ? "fa-check-circle"
                                                    : "fa-clock"
                                                }"></i>
                                                ${
                                                  approvalStates["Depo/Stok"]
                                                    ? "Onaylandı"
                                                    : "Bekliyor"
                                                }
                                            </span>
                                        </td>
                                        <td>
                                            <span class="badge ${
                                              approvalStates.Dizgi
                                                ? "success"
                                                : "warning"
                                            }">
                                                <i class="fas ${
                                                  approvalStates.Dizgi
                                                    ? "fa-check-circle"
                                                    : "fa-clock"
                                                }"></i>
                                                ${
                                                  approvalStates.Dizgi
                                                    ? "Onaylandı"
                                                    : "Bekliyor"
                                                }
                                            </span>
                                        </td>
                                        <td>
                                            <span class="badge ${
                                              approvalStates["İmalat/Montaj"]
                                                ? "success"
                                                : "warning"
                                            }">
                                                <i class="fas ${
                                                  approvalStates[
                                                    "İmalat/Montaj"
                                                  ]
                                                    ? "fa-check-circle"
                                                    : "fa-clock"
                                                }"></i>
                                                ${
                                                  approvalStates[
                                                    "İmalat/Montaj"
                                                  ]
                                                    ? "Onaylandı"
                                                    : "Bekliyor"
                                                }
                                            </span>
                                        </td>
                                        <td>
                                            <div style="display: flex; align-items: center; gap: 8px;">
                                                <div style="width: 60px; height: 6px; background: var(--gray-200); border-radius: 3px; overflow: hidden;">
                                                    <div style="width: ${
                                                      prod.progress || 0
                                                    }%; height: 100%; background: var(--primary);"></div>
                                                </div>
                                                <span>${
                                                  prod.progress || 0
                                                }%</span>
                                            </div>
                                        </td>
                                        <td class="no-print">
                                            <button class="btn btn-sm btn-primary" onclick="showProductionDetail('${
                                              prod.id
                                            }')">
                                                <i class="fas fa-edit"></i> Düzenle
                                            </button>
                                            <button class="btn btn-sm btn-info" onclick="printProductionOrder('${
                                              prod.id
                                            }')">
                                                <i class="fas fa-print"></i>
                                            </button>
                                        </td>
                                    </tr>
                                `;
                              })
                              .join("")}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    `;
  document.getElementById("pageContent").innerHTML = content;

  if (isMobileDevice()) {
    // Butonları tam göster
    document.querySelectorAll(".action-buttons").forEach((btnGroup) => {
      btnGroup.style.display = "flex";
      btnGroup.style.flexDirection = "row";
      btnGroup.style.gap = "5px";
      btnGroup.querySelectorAll("button").forEach((btn) => {
        btn.style.display = "inline-flex";
      });
    });
  }
  applyMobileOptimizations("uretimListesi");
}

// ========================================
// ÜRETİM DETAYLARI - PRODUCTION DETAILS
// ========================================

function showProductionDetail(productionId) {
  const prod = firebaseData.production.find((p) => p.id === productionId);
  if (!prod) {
    showNotification("Hata", "Üretim kaydı bulunamadı.", "error");
    return;
  }

  // Manager ve Admin aynı yetkilere sahip
  const isManagerOrAdmin =
    currentUser.role === "admin" || currentUser.role === "manager";

  let modal = document.getElementById("productionDetailModal");
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
    document.body.insertAdjacentHTML("beforeend", modalHTML);
    modal = document.getElementById("productionDetailModal");
  }

  const approvals = prod.approvals || [];
  const progress = prod.progress || 0;
  const status = prod.status || "Beklemede";
  const currentDepartment = prod.currentDepartment || "Depo/Stok";
  const departments = ["Depo/Stok", "Dizgi", "İmalat/Montaj"];
  const recipe = firebaseData.recipes.find((r) => r.id === prod.recipeId);
  const product = firebaseData.products.find((p) => p.id === prod.productId);

  const isDepoApproved = approvals.some((a) => a.department === "Depo/Stok");
  const isDizgiApproved = approvals.some((a) => a.department === "Dizgi");

  // Düzenlenebilir Hammadde Listesi - Manager da düzenleyebilir
  let rawMaterialsEditHTML = "";
  if (recipe && recipe.rawMaterials) {
    rawMaterialsEditHTML = `
            <div style="background: var(--gray-50); padding: 15px; border-radius: 8px;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
                    <h5 style="margin: 0; color: var(--primary);">Kullanılacak Hammaddeler</h5>
                    ${
                      isManagerOrAdmin
                        ? `
                        <button class="btn btn-sm btn-primary" onclick="openProductionRawMaterialModal('${productionId}')">
                            <i class="fas fa-edit"></i> Hammaddeleri Düzenle
                        </button>
                    `
                        : ""
                    }
                </div>
                <table style="width: 100%; font-size: 13px;">
                    <thead>
                        <tr style="border-bottom: 2px solid var(--gray-300);">
                            <th style="text-align: left; padding: 5px;">Hammadde</th>
                            <th style="text-align: center; padding: 5px;">Gerekli</th>
                            <th style="text-align: center; padding: 5px;">Stok</th>
                            <th style="text-align: center; padding: 5px;">Durum</th>
                            ${
                              isManagerOrAdmin
                                ? '<th style="text-align: center; padding: 5px;">İşlem</th>'
                                : ""
                            }
                        </tr>
                    </thead>
                    <tbody id="productionRawMaterialsTable">
                        ${recipe.rawMaterials
                          .map((rmId) => {
                            const rm = firebaseData.stock.find(
                              (s) => s.id === rmId
                            );
                            const usedQuantity =
                              prod.quantity * (recipe.quantityPerUnit || 1);
                            const sufficient = rm
                              ? rm.quantity >= usedQuantity
                              : false;
                            return `
                                <tr style="border-bottom: 1px solid var(--gray-200);" data-rm-id="${rmId}">
                                    <td style="padding: 5px;"><strong>${
                                      rm ? rm.name : "Bilinmeyen"
                                    }</strong></td>
                                    <td style="text-align: center; padding: 5px;">
                                        <span class="required-qty">${usedQuantity}</span> ${
                              rm ? rm.unit : ""
                            }
                                    </td>
                                    <td style="text-align: center; padding: 5px;">${
                                      rm ? rm.quantity : 0
                                    } ${rm ? rm.unit : ""}</td>
                                    <td style="text-align: center; padding: 5px;">
                                        <span class="badge ${
                                          sufficient ? "success" : "danger"
                                        }" style="font-size: 11px;">
                                            ${
                                              sufficient
                                                ? "Yeterli"
                                                : "Yetersiz"
                                            }
                                        </span>
                                    </td>
                                    ${
                                      isManagerOrAdmin
                                        ? `
                                        <td style="text-align: center; padding: 5px;">
                                            <button class="btn btn-sm btn-danger" onclick="removeRawMaterialFromProduction('${productionId}', '${rmId}')">
                                                <i class="fas fa-times"></i>
                                            </button>
                                        </td>
                                    `
                                        : ""
                                    }
                                </tr>
                            `;
                          })
                          .join("")}
                    </tbody>
                </table>
            </div>
        `;
  } else {
    rawMaterialsEditHTML =
      '<div style="color: var(--gray-500);">Reçete bilgisi bulunamadı</div>';
  }

  // Bölüm onayları - Manager tüm bölümleri onaylayabilir
  let departmentApprovals = "";
  departments.forEach((dep) => {
    const idSafe = dep.replace("/", "_");
    const depApproval = approvals.find((a) => a.department === dep);

    // Manager her bölümü onaylayabilir
    const isDisabled =
      !isManagerOrAdmin &&
      ((dep === "Depo/Stok" && currentUser.role !== "warehouse") ||
        (dep !== "Depo/Stok" && currentUser.role !== "production") ||
        (dep === "Dizgi" && !isDepoApproved) ||
        (dep === "İmalat/Montaj" && (!isDepoApproved || !isDizgiApproved)));

    departmentApprovals += `
            <div style="border: 1px solid var(--gray-200); padding: 15px; border-radius: 8px; margin-bottom: 10px;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                    <h5 style="margin: 0; color: var(--gray-700);">${dep}</h5>
                    <label style="display: flex; align-items: center; gap: 8px;">
                        <input type="checkbox" 
                            id="dep_${idSafe}" 
                            ${depApproval ? "checked" : ""} 
                            ${isDisabled ? "disabled" : ""} 
                            onchange="updateProgressFromModal('${productionId}')"
                            style="width: 18px; height: 18px;">
                        <span>Onaylandı</span>
                    </label>
                </div>
                ${
                  !isDisabled
                    ? `
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                        <div>
                            <label style="font-size: 12px; color: var(--gray-600);">Tarih:</label>
                            <input type="date" 
                                id="date_${idSafe}" 
                                class="form-control" 
                                value="${
                                  depApproval
                                    ? depApproval.date
                                    : new Date().toISOString().split("T")[0]
                                }"
                                style="font-size: 13px;">
                        </div>
                        <div>
                            <label style="font-size: 12px; color: var(--gray-600);">Çalışma Süresi (saat):</label>
                            <input type="number" 
                                id="time_${idSafe}" 
                                class="form-control" 
                                value="${
                                  depApproval ? depApproval.timeSpent : ""
                                }"
                                min="0" 
                                step="0.5" 
                                placeholder="0.0"
                                style="font-size: 13px;">
                        </div>
                    </div>
                `
                    : `
                    <div style="font-size: 12px; color: var(--gray-500);">
                        ${
                          depApproval
                            ? `Onaylandı: ${depApproval.date} - ${
                                depApproval.timeSpent || 0
                              } saat`
                            : "Bu bölüme erişim yetkiniz yok"
                        }
                    </div>
                `
                }
            </div>
        `;
  });

  document.getElementById(
    "productionDetailTitle"
  ).textContent = `${prod.orderNo} Detayları`;
  document.getElementById("productionDetailBody").innerHTML = `
        <input type="hidden" name="productionId" value="${productionId}">
        <div class="production-detail-grid">
            <div class="form-grid">
                <div class="form-group">
                    <label class="form-label">Ürün</label>
                    <input type="text" class="form-control" value="${
                      product ? product.name : "Bilinmeyen"
                    }" readonly>
                </div>
                <div class="form-group">
                    <label class="form-label">Miktar</label>
                    ${
                      isManagerOrAdmin
                        ? `<input type="number" class="form-control" id="productionQuantity" value="${prod.quantity}" min="1">`
                        : `<input type="text" class="form-control" value="${prod.quantity}" readonly>`
                    }
                </div>
                <div class="form-group">
                    <label class="form-label">Mevcut Bölüm</label>
                    <input type="text" class="form-control" value="${currentDepartment}" readonly>
                </div>
                <div class="form-group">
                    <label class="form-label">Durum</label>
                    <input type="text" class="form-control" value="${status}" readonly style="font-weight: bold; color: ${
    status === "Tamamlandı"
      ? "var(--success)"
      : status === "Üretimde"
      ? "var(--warning)"
      : "var(--gray-500)"
  };">
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
                ${
                  status !== "Tamamlandı"
                    ? `
                    <button class="btn btn-success" onclick="completeProduction('${productionId}')">
                        <i class="fas fa-check-circle"></i> Üretimi Tamamla
                    </button>
                `
                    : ""
                }
                
                ${
                  isManagerOrAdmin
                    ? `
                    <button class="btn btn-danger" onclick="deleteProduction('${productionId}')" style="${
                        status !== "Tamamlandı" ? "margin-left: 10px;" : ""
                      }">
                        <i class="fas fa-trash"></i> Üretimden Sil
                    </button>
                `
                    : ""
                }
            </div>
        </div>
    `;

  openModal("productionDetailModal");
}

async function createJobOrder() {
  const recipeId = document.getElementById("jobRecipe").value;
  const quantity = document.getElementById("jobQuantity").value;
  const startDate = document.getElementById("jobStartDate").value;
  const department = document.getElementById("jobDepartment").value;

  if (!recipeId || !quantity) {
    showNotification(
      "Hata",
      "Lütfen reçete ve miktar bilgilerini girin.",
      "error"
    );
    return;
  }

  const recipe = firebaseData.recipes.find((r) => r.id === recipeId);
  const product = firebaseData.products.find((p) => p.id === recipe.productId);

  const departments = ["Depo/Stok", "Dizgi", "İmalat/Montaj"];

  const newOrder = {
    orderNo: `URT-2025-${String(firebaseData.production.length + 1).padStart(
      3,
      "0"
    )}`,
    recipeId: recipeId,
    product: product ? product.name : "Bilinmeyen Ürün",
    productId: recipe.productId,
    quantity: parseInt(quantity),
    status: "Beklemede",
    currentDepartment: department,
    departments: departments,
    progress: 0,
    startDate: startDate,
    completedDate: "",
    active: true,
    approvals: [],
    shipmentStatus: null,
  };

  try {
    await window.firestoreService.addProduction(newOrder);
    showNotification(
      "İş Emri Oluşturuldu",
      `İş emri ${newOrder.orderNo} oluşturuldu. İlk bölüm: ${department}.`,
      "success"
    );
    document.getElementById("jobRecipe").value = "";
    document.getElementById("jobQuantity").value = "";
    document.getElementById("recipePreview").style.display = "none";
    await loadFirebaseData();
    loadIsEmriVer();
  } catch (error) {
    console.error("İş emri oluşturma hatası:", error);
    showNotification("Hata", "İş emri oluşturulurken hata oluştu.", "error");
  }
}

async function createMultipleJobOrders() {
  const companyId = document.getElementById("jobCompany").value;
  const startDate = document.getElementById("jobStartDate").value;
  const deadline = document.getElementById("jobDeadline").value;
  const notes = document.getElementById("jobNotes").value;

  const tbody = document.getElementById("productionItemsTable");
  const rows = tbody.querySelectorAll("tr");

  if (rows.length === 0) {
    showNotification("Hata", "Lütfen en az bir ürün ekleyin.", "error");
    return;
  }

  const orders = [];
  let hasError = false;

  rows.forEach((row, index) => {
    const orderNo = row.querySelector("td").textContent.trim();
    const recipeId = row.querySelector(".recipe-select").value;
    const quantity = parseInt(row.querySelectorAll("input")[0].value);
    const priority = row.querySelectorAll("select")[1].value;
    const department = row.querySelectorAll("select")[2].value;

    if (!recipeId) {
      showNotification("Hata", `${orderNo} için reçete seçilmedi.`, "error");
      hasError = true;
      return;
    }

    const recipe = firebaseData.recipes.find((r) => r.id === recipeId);
    const product = firebaseData.products.find(
      (p) => p.id === recipe.productId
    );

    orders.push({
      orderNo: orderNo,
      recipeId: recipeId,
      product: product?.name || "Bilinmeyen",
      productId: recipe.productId,
      quantity: quantity,
      priority: priority,
      status: "Beklemede",
      currentDepartment: department,
      departments: ["Depo/Stok", "Dizgi", "İmalat/Montaj"],
      progress: 0,
      startDate: startDate,
      deadline: deadline,
      companyId: companyId,
      notes: notes,
      completedDate: "",
      active: true,
      approvals: [],
      workTimeRecords: [],
      shipmentStatus: null,
      createdAt: new Date().toISOString(),
    });
  });

  if (hasError) return;

  try {
    for (const order of orders) {
      await window.firestoreService.addProduction(order);
    }

    showNotification(
      "Başarılı",
      `${orders.length} adet iş emri oluşturuldu.`,
      "success"
    );

    await loadFirebaseData();
    showPage("uretimListesi");
  } catch (error) {
    console.error("İş emri oluşturma hatası:", error);
    showNotification(
      "Hata",
      "İş emirleri oluşturulurken hata oluştu.",
      "error"
    );
  }
}
window.saveProductionDetail = async function() {
    const saveBtn = event.currentTarget || event.target;
    
    await buttonManager.processButton(saveBtn, async () => {
        const productionId = document.querySelector('input[name="productionId"]')?.value;
        if (!productionId) {
            throw new Error('Üretim ID bulunamadı');
        }

        const prod = firebaseData.production.find(p => p.id === productionId);
        if (!prod) {
            throw new Error('Üretim kaydı bulunamadı');
        }

        // Form verilerini topla
        const approvals = [];
        const departments = ['Depo/Stok', 'Dizgi', 'İmalat/Montaj'];
        
        for (const dep of departments) {
            const idSafe = dep.replace('/', '_');
            const checkbox = document.getElementById(`dep_${idSafe}`);
            const dateInput = document.getElementById(`date_${idSafe}`);
            const timeInput = document.getElementById(`time_${idSafe}`);

            if (checkbox?.checked && dateInput && timeInput) {
                approvals.push({
                    userId: currentUser.id,
                    userName: currentUser.name,
                    department: dep,
                    date: dateInput.value,
                    timeSpent: parseFloat(timeInput.value) || 0,
                    approvedAt: new Date().toISOString()
                });
            }
        }

        // Progress hesapla
        const progress = Math.round((approvals.length / departments.length) * 100);
        
        // Status belirle
        let status = prod.status;
        if (progress === 100) {
            status = 'Tamamlandı';
        } else if (progress > 0) {
            status = 'Üretimde';
        }

        // Miktar kontrolü
        const quantityInput = document.getElementById('productionQuantity');
        const newQuantity = quantityInput ? parseInt(quantityInput.value) : prod.quantity;

        // Firebase güncelleme
        const updateData = {
            ...prod,
            approvals: approvals,
            progress: progress,
            status: status,
            quantity: newQuantity,
            updatedAt: new Date().toISOString()
        };

        if (status === 'Tamamlandı' && !prod.completedDate) {
            updateData.completedDate = new Date().toLocaleDateString('tr-TR');
            updateData.shipmentStatus = 'Sevk Bekliyor';
        }

        // Firebase'e kaydet
        await window.firestoreService.updateProduction(productionId, updateData);
        
        // Bildirim göster
        showNotification('Başarılı', 'Üretim detayları güncellendi', 'success');
        
        // Veriyi yenile
        await loadFirebaseData();
        
        // Modal'ı kapat
        setTimeout(() => {
            modalManager.closeModal('productionDetailModal');
        }, 500);
        
        // Sayfayı güncelle
        if (typeof loadUretimListesi === 'function') {
            loadUretimListesi();
        }
    }, 'Kaydediliyor...');
};

async function startProduction(orderId) {
  const order = firebaseData.production.find((p) => p.id === orderId);
  if (order) {
    try {
      await window.firestoreService.updateProduction(orderId, {
        ...order,
        status: "Üretimde",
        progress: 10,
      });
      showNotification(
        "Üretim Başlatıldı",
        `${order.orderNo} üretimi başlatıldı.`,
        "success"
      );
      await loadFirebaseData();
      loadUretimListesi();
    } catch (error) {
      console.error("Üretim başlatma hatası:", error);
      showNotification("Hata", "Üretim başlatılırken hata oluştu.", "error");
    }
  }
}

async function updateProgress(orderId) {
  const newProgress = prompt("Yeni ilerleme yüzdesi (%):", "50");
  if (
    newProgress &&
    !isNaN(newProgress) &&
    newProgress >= 0 &&
    newProgress <= 100
  ) {
    const order = firebaseData.production.find((p) => p.id === orderId);
    if (order) {
      const progress = parseInt(newProgress);
      const status = progress >= 100 ? "Tamamlandı" : "Üretimde";

      try {
        await window.firestoreService.updateProduction(orderId, {
          ...order,
          progress: progress,
          status: status,
          completedDate:
            progress >= 100
              ? new Date().toLocaleDateString("tr-TR")
              : order.completedDate,
        });
        showNotification(
          "İlerleme Güncellendi",
          `${order.orderNo} ilerlemesi %${newProgress} olarak güncellendi.`,
          "success"
        );
        await loadFirebaseData();
        loadUretimListesi();
      } catch (error) {
        console.error("İlerleme güncelleme hatası:", error);
        showNotification(
          "Hata",
          "İlerleme güncellenirken hata oluştu.",
          "error"
        );
      }
    }
  }
}

function updateProgressFromModal(productionId) {
  const departments = ["Depo/Stok", "Dizgi", "İmalat/Montaj"];
  let checkedCount = 0;

  departments.forEach((dep) => {
    const idSafe = dep.replace("/", "_");
    const cb = document.getElementById(`dep_${idSafe}`);
    if (cb && cb.checked) checkedCount++;
  });

  const progress = Math.round((checkedCount / departments.length) * 100);

  // Null kontrolü ekleyelim
  const progressEl = document.querySelector(".progress-fill");
  if (progressEl) {
    progressEl.style.width = progress + "%";
  }

  // Progress text güncelleme
  const progressText = document.querySelector(".progress-bar + span");
  if (progressText) {
    progressText.textContent = progress + "%";
  }
}

async function completeProduction(productionId) {
  const prod = firebaseData.production.find((p) => p.id === productionId);
  if (!prod) {
    showNotification("Hata", "Üretim bulunamadı.", "error");
    return;
  }

  if (prod.status === "Tamamlandı") {
    showNotification("Bilgi", "Bu üretim zaten tamamlanmış.", "info");
    return;
  }

  if (
    !confirm(
      `${prod.orderNo} numaralı üretimi tamamlamak istediğinize emin misiniz?\n\nBu işlem:\n• Üretimi tamamlanmış olarak işaretleyecek\n• Ürünü sevkiyat bekleyenlere ekleyecek\n• Ürün stoğunu artıracak`
    )
  ) {
    return;
  }

  try {
    // product field'ının varlığını kontrol et
    const productName = prod.product || "Ürün Belirtilmemiş";

    const updateData = {
      ...prod,
      product: productName, // product field'ını garantiye al
      progress: 100,
      status: "Tamamlandı",
      completedDate: new Date().toLocaleDateString("tr-TR"),
      shipmentStatus: "Sevk Bekliyor",
      shipmentReadyDate: new Date().toISOString(),
      currentDepartment: "Tamamlandı",
    };

    // Ürün stoğunu artır (eğer productId varsa)
    if (prod.productId) {
      const product = firebaseData.products.find(
        (p) => p.id === prod.productId
      );
      if (product) {
        await window.firestoreService.updateProduct(product.id, {
          ...product,
          stock: (product.stock || 0) + (prod.quantity || 0),
          lastUpdate: new Date().toLocaleDateString("tr-TR"),
        });
      }
    }

    // Üretimi güncelle
    await window.firestoreService.updateProduction(productionId, updateData);

    // Bildirim oluştur
    await createNotification({
      type: "production_completed",
      title: "Üretim Tamamlandı",
      message: `${prod.orderNo} numaralı ${
        prod.quantity || 0
      } adet ${productName} üretimi tamamlandı.`,
      from: currentUser.id,
      to: "all",
      productionId: productionId,
      date: new Date().toISOString(),
    });

    showNotification(
      "Başarılı",
      "Üretim tamamlandı ve sevk bekleyenlere eklendi.",
      "success"
    );
    closeModal("productionDetailModal");

    // Firebase'den güncel veriyi çek
    await loadFirebaseData();

    // Sayfaları güncelle
    if (currentPage === "uretimListesi") loadUretimListesi();
    if (currentPage === "uretimTakip") loadUretimTakip();
    if (currentPage === "sevkiyatBekleyen") loadSevkiyatBekleyen();
  } catch (error) {
    console.error("Üretim tamamlama hatası:", error);
    showNotification("Hata", "Üretim tamamlanırken hata oluştu.", "error");
  }
}

async function deleteProduction(productionId) {
  if (
    !currentUser ||
    (currentUser.role !== "admin" && currentUser.role !== "manager")
  ) {
    showNotification("Hata", "Bu işlem için yetkiniz yok.", "error");
    return;
  }

  if (
    confirm(
      "Bu üretimi silmek istediğinize emin misiniz? Bu işlem geri alınamaz."
    )
  ) {
    const prod = firebaseData.production.find((p) => p.id === productionId);
    if (prod) {
      try {
        await createNotification({
          type: "production_deleted",
          title: "Üretim Silindi",
          message: `${prod.orderNo} numaralı üretim ${currentUser.name} tarafından silindi.`,
          from: currentUser.id,
          to: "all",
          productionId: productionId,
          date: new Date().toISOString(),
        });

        await window.firestoreService.deleteProduction(productionId);
        showNotification("Silindi", "Üretim başarıyla silindi.", "success");
        closeModal("productionDetailModal");
        await loadFirebaseData();
        loadUretimListesi();
        loadUretimTakip();
      } catch (error) {
        console.error("Üretim silme hatası:", error);
        showNotification("Hata", "Üretim silinirken hata oluştu.", "error");
      }
    }
  }
}

async function completeDepartment(productionId, department) {
  if (!currentUser) {
    showNotification("Hata", "Giriş yapın.", "error");
    return;
  }

  const prod = firebaseData.production.find((p) => p.id === productionId);
  if (prod && prod.currentDepartment === department) {
    // Role kontrolü
    if (
      (department === "Depo" && currentUser.role !== "warehouse") ||
      (department !== "Depo" && currentUser.role !== "production")
    ) {
      showNotification(
        "Erişim Red",
        "Bu bölümü tamamlamaya yetkiniz yok.",
        "error"
      );
      return;
    }

    // Depo için hammadde kontrolü
    let stockOk = true;
    if (department === "Depo" && currentUser.role === "warehouse") {
      const recipe = firebaseData.recipes.find((r) => r.id === prod.recipeId);
      if (recipe) {
        recipe.rawMaterials.forEach((rmId) => {
          const rm = firebaseData.stock.find((s) => s.id === rmId);
          const needed = prod.quantity * (recipe.quantityPerUnit || 1);
          if (rm && rm.quantity < needed) {
            stockOk = false;
            showNotification(
              "Uyarı",
              `${rm.name} stok yetersiz: ${needed - rm.quantity} ${
                rm.unit
              } eksik. Tamamlanamaz.`,
              "warning"
            );
            document.getElementById(
              `complete_${productionId}_${department.replace("/", "_")}`
            ).checked = false;
          }
        });
        if (!stockOk) return;
      }
    }

    if (stockOk) {
      const departments = ["Depo", "İmalat/Montaj", "Dizgi"];
      const currentIndex = departments.indexOf(department);
      const approval = {
        userId: currentUser.id,
        userRole: currentUser.role,
        department: department,
        date: new Date().toLocaleDateString("tr-TR"),
      };

      let updateData = {
        ...prod,
        approvals: [...prod.approvals, approval],
        progress: Math.round(
          ((prod.approvals.length + 1) / departments.length) * 100
        ),
      };

      // Sonraki bölüm veya tamamlanma
      if (currentIndex < departments.length - 1) {
        updateData.currentDepartment = departments[currentIndex + 1];
        updateData.status = "Üretimde";
      } else {
        updateData.status = "Tamamlandı";
        updateData.completedDate = new Date().toLocaleDateString("tr-TR");
        updateData.shipmentStatus = "Sevk Bekliyor";
        // Ürün stokunu artır
        const product = firebaseData.products.find(
          (p) => p.id === prod.productId
        );
        if (product) {
          await window.firestoreService.updateProduct(product.id, {
            ...product,
            stock: (product.stock || 0) + prod.quantity,
          });
        }
      }

      try {
        await window.firestoreService.updateProduction(
          productionId,
          updateData
        );
        showNotification(
          "Tamamlandı",
          `${department} bölümü tamamlandı.`,
          "success"
        );
        await loadFirebaseData();
        loadUretimListesi();
        loadUretimTakip();
      } catch (error) {
        console.error("Bölüm tamamlama hatası:", error);
        showNotification("Hata", "Tamamlanırken hata oluştu.", "error");
      }
    }
  }
}

async function nextDepartment(productionId) {
  const prod = firebaseData.production.find((p) => p.id === productionId);
  if (prod && prod.departments) {
    const departments = ["Depo", "İmalat/Montaj", "Dizgi"];
    const currentIndex = departments.indexOf(prod.currentDepartment);
    if (currentIndex < departments.length - 1) {
      const nextDep = departments[currentIndex + 1];
      const updateData = {
        ...prod,
        currentDepartment: nextDep,
        progress: prod.progress + 100 / departments.length,
      };

      try {
        await window.firestoreService.updateProduction(
          productionId,
          updateData
        );
        showNotification(
          "Bölüm Değişti",
          `${nextDep} bölümüne geçildi.`,
          "success"
        );
        await loadFirebaseData();
        loadUretimTakip();
      } catch (error) {
        console.error("Bölüm değiştirme hatası:", error);
        showNotification("Hata", "Bölüm değiştirilirken hata oluştu.", "error");
      }
    } else {
      showNotification("Bilgi", "Tüm bölümler tamamlandı.", "info");
    }
  }
}


function openProductionRawMaterialModal(productionId) {
  const prod = firebaseData.production.find((p) => p.id === productionId);
  const recipe = firebaseData.recipes.find((r) => r.id === prod.recipeId);

  if (!prod || !recipe) {
    showNotification("Hata", "Üretim veya reçete bilgisi bulunamadı.", "error");
    return;
  }

  const modalHTML = `
        <div id="productionRawMaterialModal" class="modal show" style="z-index: 10002;">
            <div class="modal-content" style="max-width: 700px;">
                <div class="modal-header">
                    <h3 class="modal-title">Hammaddeleri Düzenle - ${
                      prod.orderNo
                    }</h3>
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
                                ${firebaseData.stock
                                  .filter(
                                    (s) => !recipe.rawMaterials.includes(s.id)
                                  )
                                  .map(
                                    (stock) =>
                                      `<option value="${stock.id}">${stock.name} - Stok: ${stock.quantity} ${stock.unit}</option>`
                                  )
                                  .join("")}
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
                                ${recipe.rawMaterials
                                  .map((rmId) => {
                                    const rm = firebaseData.stock.find(
                                      (s) => s.id === rmId
                                    );
                                    const needed =
                                      prod.quantity *
                                      (recipe.quantityPerUnit || 1);
                                    return `
                                        <tr id="edit_rm_${rmId}">
                                            <td>${
                                              rm ? rm.name : "Bilinmeyen"
                                            }</td>
                                            <td>
                                                <input type="number" 
                                                    class="form-control" 
                                                    value="${needed}" 
                                                    min="1" 
                                                    style="width: 100px;"
                                                    onchange="updateRawMaterialQuantity('${productionId}', '${rmId}', this.value)">
                                                ${rm ? rm.unit : ""}
                                            </td>
                                            <td>${rm ? rm.quantity : 0} ${
                                      rm ? rm.unit : ""
                                    }</td>
                                            <td>
                                                <button class="btn btn-sm btn-danger" 
                                                    onclick="removeRawMaterialFromProductionModal('${productionId}', '${rmId}')">
                                                    <i class="fas fa-trash"></i>
                                                </button>
                                            </td>
                                        </tr>
                                    `;
                                  })
                                  .join("")}
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

  document.body.insertAdjacentHTML("beforeend", modalHTML);
}


function addRawMaterialToProduction(productionId) {
  const select = document.getElementById("newRawMaterialSelect");
  const rmId = select.value;

  if (!rmId) {
    showNotification("Uyarı", "Lütfen hammadde seçin.", "warning");
    return;
  }

  const prod = firebaseData.production.find((p) => p.id === productionId);
  const recipe = firebaseData.recipes.find((r) => r.id === prod.recipeId);
  const rm = firebaseData.stock.find((s) => s.id === rmId);

  if (!recipe.rawMaterials.includes(rmId)) {
    recipe.rawMaterials.push(rmId);

    // Tabloyu güncelle
    const tbody = document.getElementById("editRawMaterialsList");
    const newRow = document.createElement("tr");
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
    select.value = "";

    showNotification("Eklendi", `${rm.name} hammaddesi eklendi.`, "success");
  }
}

function removeRawMaterialFromProductionModal(productionId, rmId) {
  if (!confirm("Bu hammaddeyi kaldırmak istediğinize emin misiniz?")) {
    return;
  }

  const prod = firebaseData.production.find((p) => p.id === productionId);
  const recipe = firebaseData.recipes.find((r) => r.id === prod.recipeId);
  const rm = firebaseData.stock.find((s) => s.id === rmId);

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
  const select = document.getElementById("newRawMaterialSelect");
  const option = document.createElement("option");
  option.value = rmId;
  option.textContent = `${rm.name} - Stok: ${rm.quantity} ${rm.unit}`;
  select.appendChild(option);

  showNotification("Kaldırıldı", `${rm.name} hammaddesi kaldırıldı.`, "info");
}
function removeRawMaterialFromProduction(productionId, rmId) {
  const prod = firebaseData.production.find((p) => p.id === productionId);
  const recipe = firebaseData.recipes.find((r) => r.id === prod.recipeId);
  const rm = firebaseData.stock.find((s) => s.id === rmId);

  if (
    !confirm(
      `${
        rm ? rm.name : "Bu hammadde"
      }'yi listeden kaldırmak istediğinize emin misiniz?`
    )
  ) {
    return;
  }

  const index = recipe.rawMaterials.indexOf(rmId);
  if (index > -1) {
    recipe.rawMaterials.splice(index, 1);

    const row = document.querySelector(`tr[data-rm-id="${rmId}"]`);
    if (row) {
      row.remove();
    }

    showNotification(
      "Kaldırıldı",
      `${rm ? rm.name : "Hammadde"} listeden kaldırıldı.`,
      "info"
    );
  }
}

async function saveProductionRawMaterials(productionId) {
  const prod = firebaseData.production.find((p) => p.id === productionId);
  const recipe = firebaseData.recipes.find((r) => r.id === prod.recipeId);

  if (!prod || !recipe) {
    showNotification("Hata", "Kayıt bulunamadı.", "error");
    return;
  }

  try {
    // Recipe'i güncelle
    await window.firestoreService.updateRecipe(recipe.id, {
      ...recipe,
      rawMaterials: recipe.rawMaterials,
      lastModified: new Date().toISOString(),
    });

    // Production kaydını da güncelle (miktar değişikliği varsa)
    const quantityInput = document.getElementById("productionQuantity");
    if (quantityInput) {
      const newQuantity = parseInt(quantityInput.value);
      if (newQuantity !== prod.quantity) {
        prod.quantity = newQuantity;
        await window.firestoreService.updateProduction(productionId, {
          ...prod,
          quantity: newQuantity,
        });
      }
    }

    showNotification("Başarılı", "Hammadde listesi güncellendi.", "success");

    // Modalı kapat ve ana modalı yenile
    closeModal("productionRawMaterialModal");

    // Firebase'den veriyi yenile
    await loadFirebaseData();

    // Production detail modalını yeniden yükle
    showProductionDetail(productionId);
  } catch (error) {
    console.error("Hammadde güncelleme hatası:", error);
    showNotification("Hata", "Güncelleme sırasında hata oluştu.", "error");
  }
}


async function updateRawMaterialQuantity(productionId, rmId, newQuantity) {
  const input = event.target;
  if (!input) return;

  const prod = firebaseData.production.find((p) => p.id === productionId);
  const recipe = firebaseData.recipes.find((r) => r.id === prod?.recipeId);

  if (!prod || !recipe) {
    console.error("Üretim veya reçete bulunamadı");
    return;
  }

  const parsedQuantity = parseFloat(newQuantity);
  if (isNaN(parsedQuantity) || parsedQuantity < 0) {
    showNotification("Hata", "Geçersiz miktar değeri", "error");
    input.value = prod.quantity * (recipe.quantityPerUnit || 1);
    return;
  }

  if (!recipe.rawMaterialQuantities) {
    recipe.rawMaterialQuantities = {};
  }

  recipe.rawMaterialQuantities[rmId] = parsedQuantity;

  input.setAttribute("data-changed", "true");
  input.style.background = "#fffbeb";

  const saveBtn = document.querySelector(
    '[onclick*="saveProductionRawMaterials"]'
  );
  if (saveBtn) {
    saveBtn.classList.add("btn-warning");
    saveBtn.innerHTML = '<i class="fas fa-save"></i> Değişiklikleri Kaydet *';
  }

  console.log(
    `Hammadde ${rmId} için yeni miktar belirlendi: ${parsedQuantity}`
  );
}


function convertToProduction(offerId) {
  const offer = firebaseData.offers.find((o) => o.id === offerId);
  if (!offer) {
    showNotification("Hata", "Teklif bulunamadı.", "error");
    return;
  }

  if (offer.status !== "Onaylandı") {
    showNotification(
      "Uyarı",
      "Sadece onaylanmış teklifler üretime aktarılabilir.",
      "warning"
    );
    return;
  }

  // Teklif verilerini localStorage'a kaydet
  localStorage.setItem("offerToProduction", JSON.stringify(offer));
  showNotification(
    "Yönlendiriliyor",
    "İş emri sayfasına yönlendiriliyorsunuz...",
    "info"
  );
  showPage("isEmriVer");
}

async function reProduceOrder(productionId) {
  const originalProd = firebaseData.production.find(
    (p) => p.id === productionId
  );
  if (!originalProd) {
    showNotification("Hata", "Üretim kaydı bulunamadı.", "error");
    return;
  }

  const productName =
    originalProd.product || originalProd.productName || "Belirtilmemiş Ürün";
  const quantity = originalProd.quantity || 1;

  if (
    confirm(
      `${originalProd.orderNo} numaralı ${quantity} adet ${productName} için iş emri sayfasına aktarılacak. Onaylıyor musunuz?`
    )
  ) {
    const transferData = {
      fromShipment: true,
      originalOrder: originalProd.orderNo,
      product: productName,
      productId: originalProd.productId || "",
      recipeId: originalProd.recipeId || "",
      quantity: quantity,
      companyId: originalProd.companyId || "",
      priority: originalProd.priority || "normal",
      deadline: originalProd.deadline || "",
      notes: `${originalProd.orderNo} numaralı sevk edilmiş üründen tekrar üretim talebi`,
    };

    localStorage.setItem("shipmentToProduction", JSON.stringify(transferData));
    showNotification(
      "Yönlendiriliyor",
      "İş emri sayfasına aktarılıyor. Lütfen gerekli bilgileri tamamlayın.",
      "info"
    );
    showPage("isEmriVer");
  }
}

function calculateRequiredMaterials() {
  const recipeId = document.getElementById("jobRecipe").value;
  const quantity = parseInt(document.getElementById("jobQuantity").value) || 0;

  if (!recipeId || !quantity) return;

  const recipe = firebaseData.recipes.find((r) => r.id === recipeId);
  if (!recipe) return;

  const stockDiv = document.getElementById("stockStatus");
  const stockBody = document.getElementById("stockStatusBody");

  let allSufficient = true;
  const stockDetails = recipe.rawMaterials
    .map((rmId) => {
      const rm = firebaseData.stock.find((s) => s.id === rmId);
      const needed = quantity * (recipe.quantityPerUnit || 1);
      const sufficient = rm && rm.quantity >= needed;
      if (!sufficient) allSufficient = false;

      return `
            <div style="padding: 10px; border: 1px solid ${
              sufficient ? "var(--success)" : "var(--danger)"
            }; border-radius: 8px; margin-bottom: 10px; background: ${
        sufficient ? "rgba(16, 185, 129, 0.1)" : "rgba(239, 68, 68, 0.1)"
      };">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <div>
                        <strong>${rm ? rm.name : "Bilinmeyen"}</strong>
                        <div style="font-size: 12px; color: var(--gray-600); margin-top: 5px;">
                            Gerekli: ${needed} ${rm ? rm.unit : ""} | Mevcut: ${
        rm ? rm.quantity : 0
      } ${rm ? rm.unit : ""}
                        </div>
                    </div>
                    <span class="badge ${sufficient ? "success" : "danger"}">
                        ${
                          sufficient
                            ? "Yeterli"
                            : `${rm ? needed - rm.quantity : needed} ${
                                rm ? rm.unit : ""
                              } Eksik`
                        }
                    </span>
                </div>
            </div>
        `;
    })
    .join("");

  stockBody.innerHTML = `
        ${
          allSufficient
            ? '<div class="alert alert-success"><i class="fas fa-check-circle"></i> Tüm hammaddeler yeterli!</div>'
            : '<div class="alert alert-danger"><i class="fas fa-exclamation-triangle"></i> Bazı hammaddeler yetersiz!</div>'
        }
        ${stockDetails}
    `;

  stockDiv.style.display = "block";
}

function loadRecipeDetails(recipeId) {
  const recipe = firebaseData.recipes.find((r) => r.id === recipeId);
  const previewBody = document.getElementById("recipePreviewBody");
  const previewDiv = document.getElementById("recipePreview");
  const stockDiv = document.getElementById("stockStatus");
  const stockBody = document.getElementById("stockStatusBody");

  if (recipe && previewBody) {
    const product = firebaseData.products.find(
      (p) => p.id === recipe.productId
    );

    // Reçete detayları
    const rawDetails = recipe.rawMaterials
      .map((rmId) => {
        const rm = firebaseData.stock.find((s) => s.id === rmId);
        return `
                <tr>
                    <td>${rm ? rm.name : "Bilinmeyen"}</td>
                    <td style="text-align: center;">${
                      recipe.quantityPerUnit
                    }</td>
                    <td style="text-align: center;">${rm ? rm.unit : ""}</td>
                </tr>
            `;
      })
      .join("");

    previewBody.innerHTML = `
            <div style="background: var(--gray-50); padding: 15px; border-radius: 10px; margin-bottom: 15px;">
                <p style="margin: 5px 0;"><strong>Ürün:</strong> ${
                  product ? product.name : "Bilinmeyen"
                }</p>
                <p style="margin: 5px 0;"><strong>Ürün Kodu:</strong> ${
                  product ? product.code : "-"
                }</p>
                <p style="margin: 5px 0;"><strong>Birim Miktar:</strong> ${
                  recipe.quantityPerUnit
                }</p>
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

    previewDiv.style.display = "block";

    // Miktar girilmişse stok kontrolü yap
    const quantity = document.getElementById("jobQuantity").value;
    if (quantity) {
      calculateRequiredMaterials();
    }
  } else {
    previewDiv.style.display = "none";
    stockDiv.style.display = "none";
  }
}


function updateProductFromRecipe(select) {
  const recipeId = select.value;
  const recipe = firebaseData.recipes.find((r) => r.id === recipeId);
  const product = recipe
    ? firebaseData.products.find((p) => p.id === recipe.productId)
    : null;

  const row = select.closest("tr");
  const productCell = row.querySelector(".product-name");

  if (product) {
    productCell.textContent = product.name;
  } else {
    productCell.textContent = "-";
  }
}

function printProductionOrder(productionId) {
  const prod = firebaseData.production.find((p) => p.id === productionId);
  if (!prod) return;

  const recipe = firebaseData.recipes.find((r) => r.id === prod.recipeId);
  const product = firebaseData.products.find((p) => p.id === prod.productId);

  // Hammadde listesi
  let rawMaterialsList = "";
  if (recipe && recipe.rawMaterials) {
    rawMaterialsList = recipe.rawMaterials
      .map((rmId) => {
        const rm = firebaseData.stock.find((s) => s.id === rmId);
        const needed = prod.quantity * (recipe.quantityPerUnit || 1);
        return rm ? `${rm.name} - ${needed} ${rm.unit}` : "Bilinmeyen";
      })
      .join("<br>");
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
                <p style="font-size: 18px; margin: 10px 0;">No: ${
                  prod.orderNo
                }</p>
                <p style="color: #666;">Tarih: ${new Date().toLocaleDateString(
                  "tr-TR"
                )}</p>
            </div>
            
            <div class="info-grid">
                <div class="info-item">
                    <div class="info-label">Ürün Adı:</div>
                    <div class="info-value">${
                      product ? product.name : "Bilinmeyen"
                    }</div>
                </div>
                <div class="info-item">
                    <div class="info-label">Ürün Kodu:</div>
                    <div class="info-value">${
                      product ? product.code : "-"
                    }</div>
                </div>
                <div class="info-item">
                    <div class="info-label">Üretim Miktarı:</div>
                    <div class="info-value">${prod.quantity} Adet</div>
                </div>
                <div class="info-item">
                    <div class="info-label">Reçete:</div>
                    <div class="info-value">${
                      recipe ? recipe.name : "Tanımsız"
                    }</div>
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
                    ${rawMaterialsList || "Hammadde bilgisi bulunamadı"}
                </div>
            </div>
            
            <div class="footer">
                <p>Furkatech Technology FZA-ERP Sistemi - ${new Date().toLocaleString(
                  "tr-TR"
                )}</p>
            </div>
        </body>
        </html>
    `;

  const printWindow = window.open("", "_blank");
  printWindow.document.write(printContent);
  printWindow.document.close();
  printWindow.print();
}

function printProductionList() {
  const tableContent = document.getElementById("productionListTable").innerHTML;
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
            <h2>Üretim Listesi - ${new Date().toLocaleDateString("tr-TR")}</h2>
            ${tableContent}
        </body>
        </html>
    `;

  const printWindow = window.open("", "_blank");
  printWindow.document.write(printContent);
  printWindow.document.close();
  printWindow.print();
}

function createProductRow(product, recipe, quantity = 1) {
  const rawMaterials =
    recipe?.rawMaterials
      ?.map((rmId) => {
        const rm = firebaseData.stock.find((s) => s.id === rmId);
        return rm ? rm.name : "Bilinmeyen";
      })
      .join(", ") || "Hammadde yok";

  return `
        <tr data-product-id="${product?.id}" data-recipe-id="${recipe?.id}">
            <td>
                <select class="form-control recipe-select" onchange="updateProductFromRecipe(this)">
                    <option value="">Reçete seçiniz...</option>
                    ${firebaseData.recipes
                      .map((r) => {
                        const p = firebaseData.products.find(
                          (p) => p.id === r.productId
                        );
                        return `<option value="${r.id}" data-product="${
                          r.productId
                        }" ${recipe?.id === r.id ? "selected" : ""}>
                            ${r.name} (${p?.name || "Bilinmeyen"})
                        </option>`;
                      })
                      .join("")}
                </select>
            </td>
            <td class="product-name">${product?.name || "-"}</td>
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

function updateRawMaterials(select) {
  const productId = select.value;
  const rawDiv = select.parentElement.nextElementSibling.querySelector(
    ".raw-materials-list"
  );
  if (!rawDiv) return;

  if (!productId) {
    rawDiv.innerHTML = '<span style="color: #999;">Ürün seçiniz</span>';
    return;
  }

  const product = firebaseData.products.find((p) => p.id === productId);
  if (!product) {
    rawDiv.innerHTML = '<span style="color: #f00;">Ürün bulunamadı</span>';
    return;
  }

  const recipe = firebaseData.recipes.find((r) => r.productId === productId);
  const rawMaterials = recipe?.rawMaterials || product.rawMaterials || [];

  if (rawMaterials.length === 0) {
    rawDiv.innerHTML =
      '<span style="color: #ff9800;">Hammadde tanımlı değil</span>';
    return;
  }

  const rawList = rawMaterials
    .map((rmId) => {
      const rm = firebaseData.stock.find((s) => s.id === rmId);
      if (!rm) return null;
      const stockStatus =
        rm.quantity > 0
          ? `<span style="color: green;">(Stok: ${rm.quantity} ${rm.unit})</span>`
          : `<span style="color: red;">(Stok YOK)</span>`;
      return `<div style="padding: 2px 0;">• ${rm.name} ${stockStatus}</div>`;
    })
    .filter((item) => item !== null)
    .join("");

  rawDiv.innerHTML =
    rawList || '<span style="color: #999;">Hammadde bilgisi yok</span>';
}

function addProductionItem() {
  const tbody = document.getElementById("productionItemsTable");
  const orderNo = `URT-2025-${String(
    firebaseData.production.length + tbody.children.length + 1
  ).padStart(3, "0")}`;

  const row = tbody.insertRow();
  row.innerHTML = `
        <td><strong>${orderNo}</strong></td>
        <td>
            <select class="form-control recipe-select" onchange="updateProductFromRecipe(this)">
                <option value="">Reçete seçiniz...</option>
                ${firebaseData.recipes
                  .map((r) => {
                    const product = firebaseData.products.find(
                      (p) => p.id === r.productId
                    );
                    return `<option value="${r.id}" data-product="${
                      r.productId
                    }">${r.name} (${product?.name || "Bilinmeyen"})</option>`;
                  })
                  .join("")}
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





function loadProductsByCategory(categorySelect, rowId) {
  const category = categorySelect.value;
  const row = document.querySelector(`tr[data-row-id="${rowId}"]`);
  const productSelect = row.querySelector('.product-select');
  const productNameCell = row.querySelector('.product-name');
  const rawMaterialCell = row.querySelector('.raw-materials-cell');
  
  if (!category) {
    productSelect.disabled = true;
    productSelect.innerHTML = '<option value="">Önce kategori seçin...</option>';
    productNameCell.textContent = '-';
    rawMaterialCell.innerHTML = '-';
    updateRecipeDetails();
    return;
  }
  
  const categoryProducts = firebaseData.products.filter(p => p.category === category);
  
  productSelect.disabled = false;
  productSelect.innerHTML = `
    <option value="">Ürün seçiniz...</option>
    ${categoryProducts.map(p => `
      <option value="${p.id}">${p.name} - ${p.code}</option>
    `).join('')}
  `;
  
  productNameCell.textContent = '-';
  rawMaterialCell.innerHTML = '-';
  updateRecipeDetails();
}

function updateProductSelection(productSelect, rowId) {
  const productId = productSelect.value;
  const row = document.querySelector(`tr[data-row-id="${rowId}"]`);
  const productNameCell = row.querySelector('.product-name');
  const rawMaterialCell = row.querySelector('.raw-materials-cell');
  
  if (!productId) {
    productNameCell.textContent = '-';
    rawMaterialCell.innerHTML = '-';
    row.setAttribute('data-product-id', '');
    delete rawMaterialSelections[rowId]; // Seçimleri temizle
    updateRecipeDetails();
    return;
  }
  
  const product = firebaseData.products.find(p => p.id === productId);
  
  if (!product) {
    showNotification('Hata', 'Ürün bulunamadı.', 'error');
    return;
  }
  
  row.setAttribute('data-product-id', productId);
  productNameCell.textContent = product.name;
  
  // rawMaterialSelections'ı başlat, şimdi array of objects: [{id: string, quantity: number}]
  rawMaterialSelections[rowId] = rawMaterialSelections[rowId] || {
    productId: productId,
    mainMaterials: [],
    subMaterials: []
  };
  
  const mainCount = rawMaterialSelections[rowId].mainMaterials.length;
  const subCount = rawMaterialSelections[rowId].subMaterials.length;
  const totalCount = mainCount + subCount;
  
  rawMaterialCell.innerHTML = `
    <button class="btn btn-sm btn-info" onclick="openRawMaterialModal('${rowId}', '${productId}')">
      <i class="fas fa-flask"></i> Hammadde Seç
    </button>
    <div class="selected-raw-materials" style="font-size: 11px; margin-top: 5px; color: #666;">
      ${totalCount} hammadde seçili (Ana: ${mainCount}, Yan: ${subCount})
    </div>
  `;
  
  updateRecipeDetails();
}

// Global searchMaterials fonksiyonu
function searchMaterials(type) {
  const container = document.getElementById(`${type}MaterialsContainer`);
  const searchInput = document.getElementById(`${type}MaterialSearch`);
  const query = searchInput.value.toLowerCase();
  const items = container.querySelectorAll('.material-item');
  
  items.forEach(item => {
    const name = item.dataset.name;
    const code = item.dataset.code;
    item.style.display = (query === '' || name.includes(query) || code.includes(query)) ? '' : 'none';
  });
}

function openRawMaterialModal(rowId, productId) {
  const product = firebaseData.products.find(p => p.id === productId);
  
  if (!product) {
    showNotification('Hata', 'Ürün bulunamadı.', 'error');
    return;
  }
  
  rawMaterialSelections[rowId] = rawMaterialSelections[rowId] || {
    productId: productId,
    mainMaterials: [],
    subMaterials: []
  };
  
  const currentSelection = rawMaterialSelections[rowId];
  
  const mainMaterials = firebaseData.stock.filter(s => s.type === 'ana_mamul' || !s.type);
  const subMaterials = firebaseData.stock.filter(s => s.type === 'yan_mamul');
  
  const getQuantity = (selections, id) => {
    const item = selections.find(sel => sel.id === id);
    return item ? item.quantity : 1;
  };
  
  const modalHTML = `
    <div id="rawMaterialModal" class="modal show" style="z-index: 10002;">
      <div class="modal-content" style="max-width: 1400px; max-height: 98vh; overflow-y: auto; font-size: 0.85rem; box-shadow: 0 6px 24px rgba(0,0,0,0.15); border: 1px solid #d1d5db; background: #ffffff;">
        <div class="modal-header" style="background: linear-gradient(135deg, #1e3a8a, #3b82f6); color: white; padding: 20px; border-bottom: 1px solid #e5e7eb;">
          <h3 class="modal-title" style="font-size: 1.25rem; margin: 0; font-weight: 600;">Hammadde Seçimi - ${product.name}</h3>
          <button class="modal-close" onclick="closeModal('rawMaterialModal')" style="color: white; background: none; border: none; font-size: 1.1rem;">
            <i class="fas fa-times"></i>
          </button>
        </div>
        <div class="modal-body" style="padding: 25px;">
          <input type="hidden" id="currentRowId" value="${rowId}">
          
          <div class="alert alert-info" style="margin-bottom: 20px; font-size: 0.8rem; background: #eff6ff; border-color: #bfdbfe; color: #1e40af;">
            <i class="fas fa-info-circle"></i> 
            Ana mamül ve yan mamül seçimlerini yapın. Her hammaddenin kullanım miktarını belirtin. Arama ile hızlıca bulun.
          </div>
          
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 30px;">
            <div>
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
                <h4 style="color: #1e40af; font-size: 1.05rem;">
                  <i class="fas fa-boxes"></i> Ana Mamül (Toplam: ${mainMaterials.length})
                </h4>
                <div class="search-box" style="display: flex; align-items: center; width: 300px;">
                  <input type="text" id="mainMaterialSearch" placeholder="Ana mamül ara (ad/kod)..." style="width: 100%; padding: 8px; font-size: 0.8rem; border: 1px solid #d1d5db; border-radius: 4px 0 0 4px;">
                  <button onclick="searchMaterials('main')" style="padding: 8px 12px; font-size: 0.8rem; background: #3b82f6; color: white; border: 1px solid #3b82f6; border-left: none; border-radius: 0 4px 4px 0;">
                    <i class="fas fa-search"></i>
                  </button>
                </div>
              </div>
              <div id="mainMaterialsContainer" style="max-height: 700px; overflow-y: auto; border: 1px solid #d1d5db; border-radius: 8px; padding: 15px; background: #f9fafb;">
                ${mainMaterials.length > 0 ? mainMaterials.map(rm => `
                  <label class="material-item" style="display: flex; align-items: center; padding: 10px; border-bottom: 1px solid #e5e7eb; font-size: 0.85rem;" data-name="${rm.name.toLowerCase()}" data-code="${(rm.code || '').toLowerCase()}">
                    <input type="checkbox" 
                      class="main-material-checkbox" 
                      value="${rm.id}" 
                      ${currentSelection.mainMaterials.some(sel => sel.id === rm.id) ? 'checked' : ''}
                      style="width: 16px; height: 16px; margin-right: 12px;">
                    <div style="flex: 1;">
                      <div style="font-weight: 500; color: #1f2937;">${rm.name}</div>
                      <div style="font-size: 0.75rem; color: #6b7280;">
                        Kod: ${rm.code || '-'} | Stok: ${rm.quantity} ${rm.unit}
                      </div>
                    </div>
                    <div style="display: flex; align-items: center; margin-left: 10px;">
                      <span style="margin-right: 8px; color: #6b7280; font-size: 0.75rem;">Miktar:</span>
                      <input type="number" 
                        class="material-quantity" 
                        value="${getQuantity(currentSelection.mainMaterials, rm.id)}" 
                        min="1" 
                        style="width: 60px; height: 28px; font-size: 0.8rem; border: 1px solid #d1d5db; border-radius: 4px; padding: 2px 6px;">
                    </div>
                  </label>
                `).join('') : '<div style="padding: 25px; text-align: center; color: #6b7280; font-size: 0.85rem;">Ana mamül bulunamadı</div>'}
              </div>
            </div>
            
            <div>
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
                <h4 style="color: #15803d; font-size: 1.05rem;">
                  <i class="fas fa-cube"></i> Yan Mamül (Toplam: ${subMaterials.length})
                </h4>
                <div class="search-box" style="display: flex; align-items: center; width: 300px;">
                  <input type="text" id="subMaterialSearch" placeholder="Yan mamül ara (ad/kod)..." style="width: 100%; padding: 8px; font-size: 0.8rem; border: 1px solid #d1d5db; border-radius: 4px 0 0 4px;">
                  <button onclick="searchMaterials('sub')" style="padding: 8px 12px; font-size: 0.8rem; background: #22c55e; color: white; border: 1px solid #22c55e; border-left: none; border-radius: 0 4px 4px 0;">
                    <i class="fas fa-search"></i>
                  </button>
                </div>
              </div>
              <div id="subMaterialsContainer" style="max-height: 700px; overflow-y: auto; border: 1px solid #d1d5db; border-radius: 8px; padding: 15px; background: #f9fafb;">
                ${subMaterials.length > 0 ? subMaterials.map(rm => `
                  <label class="material-item" style="display: flex; align-items: center; padding: 10px; border-bottom: 1px solid #e5e7eb; font-size: 0.85rem;" data-name="${rm.name.toLowerCase()}" data-code="${(rm.code || '').toLowerCase()}">
                    <input type="checkbox" 
                      class="sub-material-checkbox" 
                      value="${rm.id}" 
                      ${currentSelection.subMaterials.some(sel => sel.id === rm.id) ? 'checked' : ''}
                      style="width: 16px; height: 16px; margin-right: 12px;">
                    <div style="flex: 1;">
                      <div style="font-weight: 500; color: #1f2937;">${rm.name}</div>
                      <div style="font-size: 0.75rem; color: #6b7280;">
                        Kod: ${rm.code || '-'} | Stok: ${rm.quantity} ${rm.unit}
                      </div>
                    </div>
                    <div style="display: flex; align-items: center; margin-left: 10px;">
                      <span style="margin-right: 8px; color: #6b7280; font-size: 0.75rem;">Miktar:</span>
                      <input type="number" 
                        class="material-quantity" 
                        value="${getQuantity(currentSelection.subMaterials, rm.id)}" 
                        min="1" 
                        style="width: 60px; height: 28px; font-size: 0.8rem; border: 1px solid #d1d5db; border-radius: 4px; padding: 2px 6px;">
                    </div>
                  </label>
                `).join('') : '<div style="padding: 25px; text-align: center; color: #6b7280; font-size: 0.85rem;">Yan mamül bulunamadı</div>'}
              </div>
            </div>
          </div>
          
          <div style="margin-top: 25px; padding: 15px; background: #f9fafb; border-radius: 8px; border: 1px solid #d1d5db;">
            <div style="display: flex; justify-content: space-between; align-items: center; font-size: 0.8rem;">
              <div>
                <strong>Seçili Ana Mamül:</strong> <span id="mainCount">${currentSelection.mainMaterials.length}</span>
              </div>
              <div>
                <strong>Seçili Yan Mamül:</strong> <span id="subCount">${currentSelection.subMaterials.length}</span>
              </div>
            </div>
          </div>
        </div>
        <div class="modal-footer" style="padding: 15px; border-top: 1px solid #d1d5db; background: #ffffff;">
          <button class="btn btn-success" onclick="saveRawMaterialSelection()" style="padding: 8px 20px; font-size: 0.85rem; background: #1e40af; border-color: #1e40af;">
            <i class="fas fa-check"></i> Seçimi Kaydet
          </button>
          <button class="btn btn-outline" onclick="closeModal('rawMaterialModal')" style="padding: 8px 20px; font-size: 0.85rem; border-color: #6b7280; color: #6b7280;">İptal</button>
        </div>
      </div>
    </div>
  `;
  
  document.body.insertAdjacentHTML('beforeend', modalHTML);
  
  // Arama input ve buton olayları
  document.getElementById('mainMaterialSearch').addEventListener('input', () => searchMaterials('main'));
  document.getElementById('subMaterialSearch').addEventListener('input', () => searchMaterials('sub'));
  document.querySelectorAll('.main-material-checkbox, .sub-material-checkbox').forEach(checkbox => {
    checkbox.addEventListener('change', updateMaterialCounts);
  });
  document.querySelectorAll('.material-quantity').forEach(input => {
    input.addEventListener('change', updateMaterialCounts);
  });
}

function updateMaterialCounts() {
  const mainCheckboxes = document.querySelectorAll('.main-material-checkbox:checked');
  const subCheckboxes = document.querySelectorAll('.sub-material-checkbox:checked');
  
  const mainCountEl = document.getElementById('mainCount');
  const subCountEl = document.getElementById('subCount');
  
  if (mainCountEl) mainCountEl.textContent = mainCheckboxes.length;
  if (subCountEl) subCountEl.textContent = subCheckboxes.length;
}
function saveRawMaterialSelection() {
  const rowId = document.getElementById('currentRowId').value;
  
  // Ana mamül seçimleri
  const mainMaterials = [];
  document.querySelectorAll('.main-material-checkbox:checked').forEach(checkbox => {
    const quantityInput = checkbox.closest('label').querySelector('.material-quantity');
    const quantity = parseInt(quantityInput.value) || 1;
    mainMaterials.push({ id: checkbox.value, quantity });
  });
  
  // Yan mamül seçimleri
  const subMaterials = [];
  document.querySelectorAll('.sub-material-checkbox:checked').forEach(checkbox => {
    const quantityInput = checkbox.closest('label').querySelector('.material-quantity');
    const quantity = parseInt(quantityInput.value) || 1;
    subMaterials.push({ id: checkbox.value, quantity });
  });
  
  rawMaterialSelections[rowId] = {
    ...rawMaterialSelections[rowId],
    mainMaterials,
    subMaterials
  };
  
  const row = document.querySelector(`tr[data-row-id="${rowId}"]`);
  const selectedRawMaterialsDiv = row.querySelector('.selected-raw-materials');
  
  const mainCount = mainMaterials.length;
  const subCount = subMaterials.length;
  const totalCount = mainCount + subCount;
  
  if (selectedRawMaterialsDiv) {
    selectedRawMaterialsDiv.innerHTML = `${totalCount} hammadde seçili (Ana: ${mainCount}, Yan: ${subCount})`;
  }
  
  const stockBadge = row.querySelector('td:nth-child(6) .badge');
  if (stockBadge) {
    stockBadge.className = 'badge success';
    stockBadge.textContent = 'Hazır';
  }
  
  closeModal('rawMaterialModal');
  updateRecipeDetails();
  
  showNotification('Başarılı', `${totalCount} hammadde seçildi.`, 'success');
}

function removeProductRow(rowId) {
  const row = document.querySelector(`tr[data-row-id="${rowId}"]`);
  if (row) {
    row.remove();
    delete rawMaterialSelections[rowId];
    updateRecipeDetails();
  }
}



window.loadUretimListesi = loadUretimListesi;
window.loadUretimTakip = loadUretimTakip;
window.loadIsEmriVer = loadIsEmriVer;
window.createJobOrderProductRow = createJobOrderProductRow;
window.addProductToJobOrder = addProductToJobOrder;
window.updateProductFromRecipeAndDetails = updateProductFromRecipeAndDetails;
window.updateRecipeDetails = updateRecipeDetails;
window.createSingleJobOrder = createSingleJobOrder;
window.showRecipeDetailModal = showRecipeDetailModal;
window.showProductionDetail = showProductionDetail;
window.createJobOrder = createJobOrder;
window.createProductRow = createProductRow;
window.reProduceOrder = reProduceOrder;
window.printProductionOrder = printProductionOrder;
window.printProductionList = printProductionList;
window.updateProgressFromModal = updateProgressFromModal;
window.deleteProduction = deleteProduction;
window.completeProduction = completeProduction;
window.updateRawMaterials = updateRawMaterials;
window.removeRawMaterialFromProduction = removeRawMaterialFromProduction;
window.updateRawMaterialQuantity = updateRawMaterialQuantity;
window.saveProductionRawMaterials = saveProductionRawMaterials;
window.removeRawMaterialFromProductionModal = removeRawMaterialFromProductionModal;
window.addRawMaterialToProduction = addRawMaterialToProduction;
window.openProductionRawMaterialModal = openProductionRawMaterialModal;
window.createMultipleJobOrders = createMultipleJobOrders;
window.addProductionItem = addProductionItem;
window.updateProductFromRecipe = updateProductFromRecipe;
window.calculateRequiredMaterials = calculateRequiredMaterials;
window.loadRecipeDetails = loadRecipeDetails;
window.convertToProduction = convertToProduction;
window.updateProgress = updateProgress;
window.startProduction = startProduction;
window.loadProductsByCategory = loadProductsByCategory;
window.updateProductSelection = updateProductSelection;
window.openRawMaterialModal = openRawMaterialModal;
window.updateMaterialCounts = updateMaterialCounts;
window.saveRawMaterialSelection = saveRawMaterialSelection;
window.removeProductRow = removeProductRow;

