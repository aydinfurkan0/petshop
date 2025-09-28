console.log(" Furkatech FZA-ERP sistemi başlatılıyor...");
let currentUser = null;
let currentPage = "dashboard";

window.currentUser = null;
// Firebase data cache
let firebaseData = {
  users: [],
  companies: [],
  products: [],
  stock: [],
  recipes: [],
  production: [],
  offers: [],
  shipments: [],
};

window.currentUser = null;
window.currentPage = "dashboard";
window.firebaseData = {
  users: [],
  companies: [],
  products: [],
  stock: [],
  recipes: [],
  production: [],
  offers: [],
  shipments: [],
};

async function loadFirebaseData() {
  try {
    console.log("🔄 Database veriler yükleniyor...");

    // Paralel yükleme için Promise.all kullan
    const [users, companies, products, stock, recipes, production, offers, shipments] = await Promise.all([
      window.firestoreService.getUsers().catch(err => {
        console.error("❌ Kullanıcılar yüklenemedi:", err);
        return [];
      }),
      window.firestoreService.getCompanies().catch(err => {
        console.error("❌ Firmalar yüklenemedi:", err);
        return [];
      }),
      window.firestoreService.getProducts().catch(err => {
        console.error("❌ Ürünler yüklenemedi:", err);
        return [];
      }),
      window.firestoreService.getStock().catch(err => {
        console.error("❌ Stok yüklenemedi:", err);
        return [];
      }),
      window.firestoreService.getRecipes().catch(err => {
        console.error("❌ Reçeteler yüklenemedi:", err);
        return [];
      }),
      window.firestoreService.getProduction().catch(err => {
        console.error("❌ Üretim yüklenemedi:", err);
        return [];
      }),
      window.firestoreService.getOffers().catch(err => {
        console.error("❌ Teklifler yüklenemedi:", err);
        return [];
      }),
      window.firestoreService.getShipments().catch(err => {
        console.error("❌ Sevkiyatlar yüklenemedi:", err);
        return [];
      })
    ]);

   
    window.firebaseData = {
      users: users || [],
      companies: companies || [],
      products: products || [],
      stock: stock || [],
      recipes: recipes || [],
      production: production || [],
      offers: offers || [],
      shipments: shipments || []
    };

   
    firebaseData = window.firebaseData;

    console.log("✅ Tüm Database verileri yüklendi:", {
      users: window.firebaseData.users.length,
      companies: window.firebaseData.companies.length,
      products: window.firebaseData.products.length,
      stock: window.firebaseData.stock.length,
      recipes: window.firebaseData.recipes.length,
      production: window.firebaseData.production.length,
      offers: window.firebaseData.offers.length,
      shipments: window.firebaseData.shipments.length
    });

    if (window.currentUser) {
      updateNotificationBadge();
    }

    return true;
  } catch (error) {
    console.error("❌ Database veri yükleme hatası:", error);

 
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
    
    firebaseData = window.firebaseData;

    return false;
  }
}
window.openModal = function(modalId) {
  const modal = document.getElementById(modalId);
  if (!modal) {
    console.warn(`Modal ID "${modalId}" bulunamadı.`);
    return;
  }

  document.querySelectorAll('.modal.show').forEach(m => {
    m.classList.remove('show');
  });

  modal.classList.add('show');
  document.body.classList.add('modal-open');
  openModals.push(modalId);  // Global openModals array'ine ekle (eğer tanımlıysa)

  const closeBtn = modal.querySelector('.modal-close');
  if (closeBtn) {
    closeBtn.onclick = function() {
      closeModal(modalId);
    };
  }
};

window.closeModal = function(modalId) {
  const modal = document.getElementById(modalId);
  if (!modal) {
    console.warn(`Modal ID "${modalId}" bulunamadı.`);
    return;
  }

  modal.classList.remove('show');
  openModals = openModals.filter(id => id !== modalId);  // Stack'ten kaldır

  if (openModals.length === 0) {
    document.body.classList.remove('modal-open');
  }
};

window.modalDebug = {
  status: () => {
    if (typeof openModals === 'undefined') {
      console.log('Modal stack tanımlı değil.');
      return;
    }
    console.log('Açık Modallar:', openModals);
    console.log('İşlemdeki Butonlar:', buttonManager.processingButtons.size);
  },
  reset: () => {
    document.querySelectorAll('.modal.show').forEach(m => {
      m.classList.remove('show');
    });
    document.body.classList.remove('modal-open');
    openModals = [];
    buttonManager.processingButtons.clear();
    buttonManager.originalContents.clear();
    console.log('Sistem sıfırlandı');
  }
};
function hasPermission(permission) {
  if (!currentUser) return false;

  if (currentUser.role === "admin") {
    return true;
  }
  if (currentUser.role === "manager") {
    if (permission === "admin") {
      return (
        currentUser.permissions && currentUser.permissions.includes("admin")
      );
    }
    return true;
  }

  if (!currentUser.permissions || !Array.isArray(currentUser.permissions)) {
    return false;
  }

  return currentUser.permissions.includes(permission);
}
function canAccessPage(pageName) {
  if (!currentUser) return false;

  // Admin her sayfaya erişebilir
  if (currentUser.role === "admin") return true;

  // Manager için özel kontrol
  if (currentUser.role === "manager") {
    // Sadece admin paneli kısıtlı
    if (pageName === "admin") {
      return currentUser.permissions?.includes("admin");
    }
    return true;
  }
  const pagePermissions = {
    teklifHazirla: ["sales"],
    teklifListesi: ["sales"],
    firmalar: ["sales"],
    urunAgaci: ["products"],
    urunReceteleri: ["products"],
    isEmriVer: ["production"],
    uretimTakip: ["production"],
    uretimListesi: ["production"],
    depo: ["warehouse"],
    sevkiyatBekleyen: ["warehouse", "logistics"],
    sevkiyatEdilen: ["warehouse", "logistics"],
    stockCards: ["stockCards"],
    kullaniciAktiviteleri: ["user_activities"],
    kullaniciRaporlari: ["user_activities"],
    admin: ["admin"],
    dashboard: true,
    profil: true,
    ayarlar: true,
    aktivite: true,
    bildirimler: true,
    raporlar: true,
    insanKaynaklari: true,
  };

  const requiredPermissions = pagePermissions[pageName];
  if (requiredPermissions === true) return true;
  if (Array.isArray(requiredPermissions)) {
    return requiredPermissions.some((perm) => hasPermission(perm));
  }
  return false;
}
function toggleUserProfile() {
  const panel = document.getElementById("userProfilePanel");
  const btn = document.getElementById("profileBtn");
  if (panel.style.display === "block") {
    panel.style.display = "none";
  } else {
    panel.style.display = "block";
  }
  const chevron = btn.querySelector(".fa-chevron-down");
  if (chevron) {
    chevron.style.transform =
      panel.style.display === "block" ? "rotate(180deg)" : "rotate(0deg)";
    chevron.style.transition = "transform 0.2s ease";
  }
}

document.addEventListener("click", function (e) {
  const panel = document.getElementById("userProfilePanel");
  const btn = document.getElementById("profileBtn");
  if (
    panel &&
    btn &&
    !e.target.closest("#profileBtn") &&
    !e.target.closest("#userProfilePanel") &&
    !e.target.closest(".modal")
  ) {
    panel.style.display = "none";
    const chevron = btn.querySelector(".fa-chevron-down");
    if (chevron) {
      chevron.style.transform = "rotate(0deg)";
    }
  }
});

document
  .getElementById("loginForm")
  .addEventListener("submit", async function (e) {
    e.preventDefault();

    const username = document.getElementById("username").value.trim();
    const password = document.getElementById("password").value;

    try {
      const user = await window.firestoreService.getUserByUsername(username);

      if (!user) {
        showNotification("Giriş hatası", "Kullanıcı bulunamadı.", "error");
        document.getElementById("password").value = "";
        return;
      }

      if (user.password !== password) {
        showNotification("Giriş hatası", "Şifre hatalı.", "error");
        document.getElementById("password").value = "";
        return;
      }

      if (!user.active) {
        showNotification(
          "Giriş hatası",
          "Kullanıcı hesabı aktif değil.",
          "error"
        );
        document.getElementById("password").value = "";
        return;
      }

      currentUser = user;
      window.currentUser = user;

      document.getElementById("userName").textContent = user.name;
      document.getElementById("avatarText").textContent = user.name
        .charAt(0)
        .toUpperCase();

      if (!user.permissions || user.permissions.length === 0) {
        const defaultPermissions = {
          admin: [
            "admin",
            "sales",
            "production",
            "warehouse",
            "logistics",
            "reports",
            "hr",
            "products",
            "user_activities",
          ],
          manager: [
            "sales",
            "production",
            "warehouse",
            "logistics",
            "reports",
            "hr",
            "products",
            "user_activities",
          ],
          production: ["production"],
          sales: ["sales"],
          warehouse: ["warehouse"],
          logistics: ["logistics"],
          quality: ["production"],
        };

        user.permissions = defaultPermissions[user.role] || [];
        currentUser.permissions = user.permissions;
        window.currentUser.permissions = user.permissions;

        await window.firestoreService.updateUser(user.id, {
          permissions: user.permissions,
        });
      }

      document.getElementById("loginContainer").style.display = "none";
      document.getElementById("appContainer").style.display = "block";

      await loadFirebaseData();
      updateSidebarPermissions();
      showPage("dashboard");

      const roleText = getRoleDisplayName(user.role);
      showNotification(
        "Giriş başarılı",
        `Hoş geldiniz ${user.name}! (${roleText})`,
        "success"
      );
      document.getElementById("password").value = "";
    } catch (error) {
      console.error("Login error:", error);
      showNotification(
        "Bağlantı Hatası",
        "Database bağlantısında sorun var.",
        "error"
      );
      document.getElementById("password").value = "";
    }
  });

async function deleteProduct(productId) {
  if (confirm("Bu ürünü silmek istediğinize emin misiniz?")) {
    try {
      await window.firestoreService.deleteProduct(productId);
      showNotification("Ürün Silindi", "Ürün başarıyla silindi.", "success");
      await loadFirebaseData();
      if (currentPage === "stok") loadStok();
    } catch (error) {
      console.error("Ürün silme hatası:", error);
      showNotification("Hata", "Ürün silinirken hata oluştu.", "error");
    }
  }
}

function toggleSubmenu(submenuId) {
  const submenu = document.getElementById(submenuId);
  if (!submenu) return;
  const menuItem = submenu.previousElementSibling;
  if (menuItem) {
    submenu.classList.toggle("show");
    menuItem.classList.toggle("expanded");
  }
}

function logout() {
  currentUser = null;
  document.getElementById("loginContainer").style.display = "flex";
  document.getElementById("appContainer").style.display = "none";
  document.getElementById("username").value = "";
  document.getElementById("password").value = "";
  document.getElementById("adminSection").style.display = "none";
  document.getElementById("userName").textContent = "Kullanıcı";
  document.getElementById("avatarText").textContent = "K";
  document
    .querySelectorAll(".menu-item")
    .forEach((item) => item.classList.remove("active"));
  document
    .querySelectorAll(".submenu-item")
    .forEach((item) => item.classList.remove("active"));

  firebaseData = {
    users: [],
    companies: [],
    products: [],
    stock: [],
    production: [],
    offers: [],
  };
}

function getRoleDisplayName(role) {
  const roleNames = {
    admin: "Admin",
    manager: "Yönetici",
    production: "Üretim Sorumlusu",
    sales: "Satış",
    warehouse: "Depo Sorumlusu",
    logistics: "Lojistik",
    quality: "Kalite Kontrol",
  };
  return roleNames[role] || role;
}

function loadRecentActivities() {
  const activities = [];
  (firebaseData.production || []).forEach((prod) => {
    (prod.approvals || []).forEach((approval) => {
      const user = (firebaseData.users || []).find(
        (u) => u.id === approval.userId
      );
      if (approval.date && prod.orderNo) {
        activities.push({
          user: user
            ? `${user.name} (${getRoleDisplayName(user.role)})`
            : "Bilinmeyen",
          department: approval.department || "Bilinmeyen",
          orderNo: prod.orderNo,
          date: approval.date,
          timeSpent: approval.timeSpent
            ? `${approval.timeSpent} saat`
            : "Girilmemiş",
        });
      }
    });
  });

  const sortedActivities = activities
    .sort((a, b) => {
      const dateA = a.date.split(".").reverse().join("-");
      const dateB = b.date.split(".").reverse().join("-");
      return new Date(dateB) - new Date(dateA);
    })
    .slice(0, 5);

  return `
        <ul class="activity-list">
            ${
              sortedActivities.length > 0
                ? sortedActivities
                    .map(
                      (activity) => `
                <li>
                    <strong>${activity.user}</strong>, <span class="badge primary">${activity.department}</span> için 
                    <strong>${activity.orderNo}</strong> iş emrini ${activity.date} tarihinde onayladı 
                    (${activity.timeSpent}).
                </li>
            `
                    )
                    .join("")
                : '<p class="text-gray-500">Henüz aktivite yok.</p>'
            }
        </ul>
    `;
}

function loadProductTimeSummary() {
  const summary = {};
  (firebaseData.production || []).forEach((prod) => {
    if (!prod || !prod.orderNo || !prod.product) return;
    const approvals = prod.approvals || [];
    const totalTime = approvals.reduce(
      (sum, a) => sum + (parseFloat(a.timeSpent) || 0),
      0
    );
    summary[prod.orderNo] = {
      product: prod.product,
      totalTime,
      dates: approvals
        .filter((a) => a.date)
        .map((a) => ({
          date: a.date,
          timeSpent: a.timeSpent ? `${a.timeSpent} saat` : "Girilmemiş",
        })),
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
                    ${
                      Object.keys(summary).length > 0
                        ? Object.entries(summary)
                            .map(
                              ([orderNo, data]) => `
                        <tr>
                            <td><strong>${orderNo}</strong></td>
                            <td>${data.product}</td>
                            <td class="time-spent">${
                              data.totalTime > 0
                                ? data.totalTime.toFixed(2)
                                : "Girilmemiş"
                            }</td>
                            <td>
                                ${
                                  data.dates.length > 0
                                    ? data.dates
                                        .map(
                                          (d) => `
                                    <div>${d.date}: ${d.timeSpent}</div>
                                `
                                        )
                                        .join("")
                                    : "Henüz tarih yok"
                                }
                            </td>
                        </tr>
                    `
                            )
                            .join("")
                        : '<tr><td colspan="4" class="text-gray-500">Henüz veri yok</td></tr>'
                    }
                </tbody>
            </table>
        </div>
    `;
}

function showPage(pageName) {
  // Önceki sayfa revizyon modundaysa temizle
  if (currentPage === 'teklifHazirla' && window.isRevisionMode) {
    window.isRevisionMode = false;
    if (window.originalOfferData) {
      delete window.originalOfferData;
    }
  }
  
  if (!canAccessPage(pageName)) {
    showNotification(
      "Erişim Reddedildi",
      "Bu sayfaya erişim yetkiniz bulunmamaktadır.",
      "error"
    );
    if (currentPage !== "dashboard") {
      showPage("dashboard");
    }
    return;
  }

  currentPage = pageName;
  document
    .querySelectorAll(".menu-item")
    .forEach((item) => item.classList.remove("active"));
  document
    .querySelectorAll(".submenu-item")
    .forEach((item) => item.classList.remove("active"));

  const pageContent = document.getElementById("pageContent");
  if (!pageContent) return;

  if (pageName === "insanKaynaklari") {
    loadInsanKaynaklariOptimized();
    const menuItem = document.querySelector(
      `[onclick="showPage('${pageName}')"]`
    );
    if (menuItem) menuItem.classList.add("active");
    return;
  }
  switch (pageName) {
    case "dashboard":
      loadDashboard();
      break;
    case "teklifHazirla":
      loadTeklifHazirla();
      break;
    case "teklifListesi":
      loadTeklifListesi();
      break;
    case "firmalar":
      loadFirmalar();
      break;
    case "urunAgaci":
      loadUrunAgaci();
      break;
    case "urunReceteleri":
      loadUrunReceteleri();
      break;
    case "isEmriVer":
      loadIsEmriVer();
      break;
    case "uretimTakip":
      loadUretimTakip();
      break;
    case "uretimListesi":
      loadUretimListesi();
      break;
    case "depo":
      loadDepo();
      break;
    case "sevkiyatBekleyen":
      loadSevkiyatBekleyen();
      break;
    case "sevkiyatEdilen":
      loadSevkiyatEdilen();
      break;
    case "raporlar":
      loadRaporlar();
      break;
    case "admin":
      loadAdmin();
      break;
    case "kullaniciAktiviteleri":
      loadKullaniciAktiviteleri();
      break;
    case "kullaniciRaporlari":
      loadKullaniciRaporlari();
      break;
    case "bildirimler":
      loadNotifications();
      break;
    case "profil":
      loadUserProfile();
      break;
    case "ayarlar":
      loadUserSettings();
      break;
    case "aktivite":
      loadUserActivity();
      break;
    default:
      loadDashboard();
  }

  const menuItem = document.querySelector(
    `[onclick="showPage('${pageName}')"]`
  );
  if (menuItem) menuItem.classList.add("active");
}
async function loadFirebaseDataIfNeeded() {
  if (!firebaseData.users || firebaseData.users.length === 0) {
    try {
      const users = await window.firestoreService.getUsers();
      firebaseData.users = users || [];
      console.log("Kullanıcılar yüklendi:", users.length);
    } catch (error) {
      console.error("Kullanıcılar yüklenemedi:", error);
    }
  }
}
async function loadInsanKaynaklariOptimized() {
  if (!currentUser) {
    showNotification("Hata", "Giriş yapmanız gerekiyor.", "error");
    return;
  }

  // Direkt loadInsanKaynaklari'yi çağır
  if (typeof window.loadInsanKaynaklari === "function") {
    await window.loadInsanKaynaklari();
  } else {
    console.error("loadInsanKaynaklari fonksiyonu bulunamadı!");
    showNotification("Hata", "İnsan Kaynakları modülü yüklenemedi.", "error");
  }
}

function loadDashboard() {
  const productionData = firebaseData.production || [];
  const users = firebaseData.users || [];

  // Son aktiviteler verisi
  const activities = [];
  productionData.forEach((prod) => {
    (prod.approvals || []).forEach((approval) => {
      const user = users.find((u) => u.id === approval.userId);
      activities.push({
        user: user
          ? `${user.name} (${getRoleDisplayName(user.role)})`
          : "Bilinmeyen",
        department: approval.department,
        orderNo: prod.orderNo,
        date: approval.date,
        timeSpent: approval.timeSpent
          ? `${approval.timeSpent} saat`
          : "Girilmemiş",
      });
    });
  });

  // Son 5 aktivite, tarihe göre sıralı
  const sortedActivities = activities
    .sort((a, b) => {
      const dateA = a.date.split(".").reverse().join("-");
      const dateB = b.date.split(".").reverse().join("-");
      return new Date(dateB) - new Date(dateA);
    })
    .slice(0, 5);

  // Ürün çalışma süreleri
  const summary = {};
  productionData.forEach((prod) => {
    const approvals = prod.approvals || [];
    const totalTime = approvals.reduce(
      (sum, a) => sum + (parseFloat(a.timeSpent) || 0),
      0
    );
    summary[prod.orderNo] = {
      product: prod.product,
      totalTime,
      dates: approvals
        .filter((a) => a.date)
        .map((a) => ({
          date: a.date,
          timeSpent: a.timeSpent ? `${a.timeSpent} saat` : "Girilmemiş",
        })),
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
                <div class="stat-value">${
                  (firebaseData.products || []).length
                }</div>
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
  document.getElementById("pageContent").innerHTML = content;
}

function loadFirmalar() {
  // Veri kontrolü
  if (!window.firebaseData || !window.firebaseData.companies) {
    console.error("❌ Firma verileri bulunamadı, yeniden yükleniyor...");
    loadFirebaseData().then(() => loadFirmalar());
    return;
  }

  const companies = window.firebaseData.companies || [];

  console.log("🏢 Firmalar listesi yükleniyor, toplam:", companies.length);

  const content = `
        <div class="page-header">
            <h1 class="page-title"><i class="fas fa-building"></i> Firmalar</h1>
            <p class="page-subtitle">Müşteri ve tedarikçi firmalarını yönetin (${
              companies.length
            } firma)</p>
        </div>
        <div class="card">
            <div class="card-header">
                <div class="flex justify-between items-center">
                    <div>
                        <h3 class="card-title">Firma Listesi</h3>
                        <p class="card-subtitle">Toplam ${
                          companies.length
                        } firma kayıtlı</p>
                    </div>
                    <button class="btn btn-primary" onclick="openCompanyModal()">
                        <i class="fas fa-plus"></i> Yeni Firma Ekle
                    </button>
                </div>
            </div>
            <div class="card-body">
                <div class="filter-bar" style="margin-bottom: 20px;">
                    <div class="search-box">
                        <i class="fas fa-search"></i>
                        <input type="text" placeholder="Firma ara..." onkeyup="filterCompanies(this.value)">
                    </div>
                </div>
                
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
                        <tbody id="companiesTableBody">
                            ${
                              companies.length > 0
                                ? companies
                                    .map(
                                      (company) => `
                                <tr>
                                    <td>
                                        <strong>${company.name}</strong> 
                                        ${
                                          company.isFavorite
                                            ? '<i class="fas fa-star" style="color: gold; margin-left: 5px;"></i>'
                                            : ""
                                        }
                                    </td>
                                    <td>${company.taxNo}</td>
                                    <td>${company.phone || "-"}</td>
                                    <td>${company.email || "-"}</td>
                                    <td>${company.address || "-"}</td>
                                    <td>
                                        <span class="badge ${
                                          company.customerType === "vip"
                                            ? "warning"
                                            : company.customerType ===
                                              "potansiyel"
                                            ? "info"
                                            : "success"
                                        }">
                                            ${company.customerType || "normal"}
                                        </span>
                                    </td>
                                    <td>
                                        <div class="action-buttons">
                                            <button class="action-btn view" onclick="showCompanyDetails('${
                                              company.id
                                            }')">
                                                <i class="fas fa-eye"></i>
                                            </button>
                                            <button class="action-btn edit" onclick="openCompanyModal('${
                                              company.id
                                            }')">
                                                <i class="fas fa-edit"></i>
                                            </button>
                                            <button class="action-btn delete" onclick="deleteCompany('${
                                              company.id
                                            }')">
                                                <i class="fas fa-trash"></i>
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            `
                                    )
                                    .join("")
                                : '<tr><td colspan="7" style="text-align: center; padding: 40px;">Henüz firma bulunmuyor. <button class="btn btn-primary" onclick="openCompanyModal()">İlk Firmayı Ekle</button></td></tr>'
                            }
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    `;
  document.getElementById("pageContent").innerHTML = content;
}

function loadTeklifHazirla() {
    const content = `
        <div class="page-header">
            <h1 class="page-title"><i class="fas fa-file-contract"></i> Teklif Hazırla</h1>
            <p class="page-subtitle">Yeni teklif oluşturun</p>
        </div>
        
        <div class="card">
            <div class="card-header">
                <h3 class="card-title">Firma ve Proje Bilgileri</h3>
            </div>
            <div class="card-body">
                <div class="form-grid" ">
                    <!-- Sol Kolon -->
                    <div class="form-group">
                        <label class="form-label">Firma <span style="color: red;">*</span></label>
                        <button type="button" 
                                class="btn btn-outline-primary form-control" 
                                onclick="openCompanySelectionModal()" 
                                id="companySelectionBtn" 
                                style="text-align: left; justify-content: flex-start; padding: 10px 15px; background: white; border: 1px solid #d1d5db;">
                            <i class="fas fa-building" style="margin-right: 8px; color: #6b7280;"></i>
                            <span style="color: #6b7280;">Firma seçiniz...</span>
                        </button>
                        <input type="hidden" id="offerCompany" value="">
                        <input type="hidden" id="offerCompanyId" value="">
                    </div>

                    <!-- Sağ Kolon -->
                    <div class="form-group">
                        <label class="form-label">Proje Adı <span style="color: red;">*</span></label>
                        <input type="text" 
                               class="form-control" 
                               id="offerProjectName" 
                               placeholder="Proje adını girin..." 
                               required
                               style="padding: 10px 15px;">
                    </div>

                    <!-- Sol Kolon -->
                    <div class="form-group">
                        <label class="form-label">Teklif Tarihi <span style="color: red;">*</span></label>
                        <input type="date" 
                               class="form-control" 
                               value="${new Date().toISOString().split("T")[0]}" 
                               id="offerDate"
                               style="padding: 10px 15px;">
                    </div>

                    <!-- Sağ Kolon -->
                    <div class="form-group">
                        <label class="form-label">Geçerlilik Süresi</label>
                        <select class="form-control" 
                                id="offerValidity"
                                style="padding: 10px 15px; background: white;">
                            <option value="15 gün">15 gün</option>
                            <option value="30 gün" selected>30 gün</option>
                            <option value="45 gün">45 gün</option>
                            <option value="60 gün">60 gün</option>
                            <option value="90 gün">90 gün</option>
                        </select>
                    </div>
                </div>

                <!-- Firma Yetkilisi - Tam genişlik -->
                <div class="form-group" id="companyContactGroup" style="display: none; margin-top: 20px;">
                    <label class="form-label">Firma Yetkilisi</label>
                    <select class="form-control" 
                            id="offerCompanyContact"
                            style="padding: 10px 15px; background: white;">
                        <option value="">Yetkili seçiniz...</option>
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
                <div class="filter-bar" style="display: flex; gap: 15px; align-items: center; margin-bottom: 20px;">
                    <div class="search-box" style="flex: 1; position: relative;">
                        <i class="fas fa-search" style="position: absolute; left: 12px; top: 50%; transform: translateY(-50%); color: #6b7280;"></i>
                        <input type="text" 
                               placeholder="Ürün ara..." 
                               onkeyup="searchOfferProducts(this.value)"
                               style="width: 100%; padding: 10px 10px 10px 40px; border: 1px solid #d1d5db; border-radius: 6px;">
                    </div>
                    <button class="btn btn-success" 
                            onclick="addOfferProduct()"
                            style="padding: 10px 20px; white-space: nowrap;">
                        <i class="fas fa-plus"></i> Ürün Ekle
                    </button>
                </div>
                
                <div class="table-container">
                    <table class="table">
                        <thead>
                            <tr>
                                <th style="width: 35%;">Ürün</th>
                                <th style="width: 25%;">Teknik Özellikler</th>
                                <th style="width: 10%;">Miktar</th>
                                <th style="width: 15%;">Birim Fiyat</th>
                                <th style="width: 15%;">Toplam</th>
                                <th style="width: 50px;"></th>
                            </tr>
                        </thead>
                        <tbody id="offerProductsTable">
                            <!-- Products will be added here -->
                        </tbody>
                    </table>
                </div>
                
                <div style="margin-top: 30px; display: flex; justify-content: space-between; align-items: end;">
                    <div style="flex: 1;">
                        <!-- Sol taraf - opsiyonel notlar veya bilgi için -->
                    </div>
                    
                    <div style="text-align: right;">
                        <div style="display: grid; grid-template-columns: 150px 120px; gap: 12px; margin-bottom: 20px;">
                            <div style="text-align: left; font-weight: 500; color: #6b7280;">Ara Toplam:</div>
                            <div id="offerSubtotal" style="font-weight: 600;">0 $</div>
                            
                            <div style="text-align: left; font-weight: 500; color: #6b7280;">KDV (%18):</div>
                            <div id="offerTax" style="font-weight: 600;">0 $</div>
                            
                            <div style="text-align: left; font-weight: 700; color: #1f2937; padding-top: 12px; border-top: 2px solid #e5e7eb;">Genel Toplam:</div>
                            <div id="offerTotal" style="font-weight: 700; font-size: 20px; color: #10b981; padding-top: 12px; border-top: 2px solid #e5e7eb;">0 $</div>
                        </div>
                        
                        <div style="display: flex; gap: 10px; justify-content: flex-end;">
                            <button class="btn btn-outline" onclick="previewOffer()">
                                <i class="fas fa-eye"></i> Önizleme
                            </button>
                            <button class="btn btn-primary" onclick="saveOfferWithRevisionCheck()">
                                <i class="fas fa-save"></i> Teklifi Kaydet
                            </button>
                            <button class="btn btn-success" onclick="sendOffer()">
                                <i class="fas fa-paper-plane"></i> Teklifi Gönder
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    document.getElementById("pageContent").innerHTML = content;
    document.getElementById("offerProductsTable").innerHTML = "";
    
    // Revizyon verilerini kontrol et ve yükle
    const revisionData = localStorage.getItem('revisionOfferData');
    if (revisionData) {
        try {
            const offerData = JSON.parse(revisionData);
            setTimeout(() => {
                fillOfferFormFromRevision(offerData);
            }, 100);
            localStorage.removeItem('revisionOfferData');
        } catch (error) {
            console.error('Revizyon verisi yüklenirken hata:', error);
            localStorage.removeItem('revisionOfferData');
        }
    }
}

function loadCompanyContacts(companyId) {
  const company = firebaseData.companies.find(c => c.id === companyId);
  const contactGroup = document.getElementById('companyContactGroup');
  const contactSelect = document.getElementById('offerCompanyContact');

  if (!company || !contactGroup || !contactSelect) return;

  // Firma yetkililerini topla
  const contacts = [];
  
  // Ana yetkili
  if (company.contactPerson) {
    contacts.push({
      name: company.contactPerson,
      phone: company.contactPhone || company.phone,
      email: company.contactEmail || company.email
    });
  }

  // Ek yetkililer (eğer firma verisinde varsa)
  if (company.additionalContacts && Array.isArray(company.additionalContacts)) {
    contacts.push(...company.additionalContacts);
  }

  if (contacts.length > 0) {
    contactSelect.innerHTML = '<option value="">Yetkili seçiniz...</option>';
    contacts.forEach((contact, index) => {
      const value = JSON.stringify(contact);
      const displayText = contact.phone ? 
        `${contact.name} (${contact.phone})` : 
        contact.name;
      contactSelect.innerHTML += `<option value='${value}'>${displayText}</option>`;
    });
    contactGroup.style.display = 'block';
  } else {
    contactGroup.style.display = 'none';
  }
}

function openCompanyModal(companyId = null) {
  const company = companyId
    ? firebaseData.companies.find((c) => c.id === companyId)
    : null;

  // Önce eski modalı temizle
  const existingModal = document.getElementById("companyModal");
  if (existingModal) {
    existingModal.remove();
  }

  const modalHTML = `
        <div id="companyModal" class="modal show">
            <div class="modal-content" style="max-width: 800px;">
                <div class="modal-header">
                    <h3 class="modal-title">${
                      company ? "Firma Düzenle" : "Yeni Firma Ekle"
                    }</h3>
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
                                    <input type="text" class="form-control" id="companyFormName" value="${
                                      company ? company.name : ""
                                    }" required>
                                </div>
                                <div class="form-group">
                                    <label class="form-label">Firma Kısa Adı</label>
                                    <input type="text" class="form-control" id="companyFormShortName" value="${
                                      company ? company.shortName || "" : ""
                                    }">
                                </div>
                                <div class="form-group">
                                    <label class="form-label">Firma Tipi</label>
                                    <select class="form-control" id="companyFormBusinessType">
                                        <option value="ltd" ${
                                          company &&
                                          company.businessType === "ltd"
                                            ? "selected"
                                            : ""
                                        }>Limited Şirketi</option>
                                        <option value="as" ${
                                          company &&
                                          company.businessType === "as"
                                            ? "selected"
                                            : ""
                                        }>Anonim Şirketi</option>
                                        <option value="sahis" ${
                                          company &&
                                          company.businessType === "sahis"
                                            ? "selected"
                                            : ""
                                        }>Şahıs Şirketi</option>
                                        <option value="kamu" ${
                                          company &&
                                          company.businessType === "kamu"
                                            ? "selected"
                                            : ""
                                        }>Kamu Kurumu</option>
                                        <option value="diger" ${
                                          company &&
                                          company.businessType === "diger"
                                            ? "selected"
                                            : ""
                                        }>Diğer</option>
                                    </select>
                                </div>
                                <div class="form-group">
                                    <label class="form-label">Müşteri Tipi</label>
                                    <select class="form-control" id="companyFormType">
                                        <option value="normal" ${
                                          company &&
                                          company.customerType === "normal"
                                            ? "selected"
                                            : ""
                                        }>Normal Müşteri</option>
                                        <option value="vip" ${
                                          company &&
                                          company.customerType === "vip"
                                            ? "selected"
                                            : ""
                                        }>VIP Müşteri</option>
                                        <option value="potansiyel" ${
                                          company &&
                                          company.customerType === "potansiyel"
                                            ? "selected"
                                            : ""
                                        }>Potansiyel Müşteri</option>
                                        <option value="tedarikci" ${
                                          company &&
                                          company.customerType === "tedarikci"
                                            ? "selected"
                                            : ""
                                        }>Tedarikçi</option>
                                        <option value="bayi" ${
                                          company &&
                                          company.customerType === "bayi"
                                            ? "selected"
                                            : ""
                                        }>Bayi</option>
                                    </select>
                                </div>
                                <div class="form-group">
                                    <label class="form-label">Sektör</label>
                                    <select class="form-control" id="companyFormSector">
                                        <option value="">Seçiniz</option>
                                        <option value="imalat" ${
                                          company && company.sector === "imalat"
                                            ? "selected"
                                            : ""
                                        }>İmalat</option>
                                        <option value="hizmet" ${
                                          company && company.sector === "hizmet"
                                            ? "selected"
                                            : ""
                                        }>Hizmet</option>
                                        <option value="ticaret" ${
                                          company &&
                                          company.sector === "ticaret"
                                            ? "selected"
                                            : ""
                                        }>Ticaret</option>
                                        <option value="insaat" ${
                                          company && company.sector === "insaat"
                                            ? "selected"
                                            : ""
                                        }>İnşaat</option>
                                        <option value="teknoloji" ${
                                          company &&
                                          company.sector === "teknoloji"
                                            ? "selected"
                                            : ""
                                        }>Teknoloji</option>
                                        <option value="saglik" ${
                                          company && company.sector === "saglik"
                                            ? "selected"
                                            : ""
                                        }>Sağlık</option>
                                        <option value="egitim" ${
                                          company && company.sector === "egitim"
                                            ? "selected"
                                            : ""
                                        }>Eğitim</option>
                                        <option value="diger" ${
                                          company && company.sector === "diger"
                                            ? "selected"
                                            : ""
                                        }>Diğer</option>
                                    </select>
                                </div>
                                <div class="form-group">
                                    <label class="form-label">Çalışan Sayısı</label>
                                    <select class="form-control" id="companyFormEmployeeCount">
                                        <option value="">Seçiniz</option>
                                        <option value="1-10" ${
                                          company &&
                                          company.employeeCount === "1-10"
                                            ? "selected"
                                            : ""
                                        }>1-10</option>
                                        <option value="11-50" ${
                                          company &&
                                          company.employeeCount === "11-50"
                                            ? "selected"
                                            : ""
                                        }>11-50</option>
                                        <option value="51-100" ${
                                          company &&
                                          company.employeeCount === "51-100"
                                            ? "selected"
                                            : ""
                                        }>51-100</option>
                                        <option value="101-500" ${
                                          company &&
                                          company.employeeCount === "101-500"
                                            ? "selected"
                                            : ""
                                        }>101-500</option>
                                        <option value="500+" ${
                                          company &&
                                          company.employeeCount === "500+"
                                            ? "selected"
                                            : ""
                                        }>500+</option>
                                    </select>
                                </div>
                            </div>
                        </div>
                        
                        <div id="contactInfo" class="tab-content" style="display: none; margin-top: 20px;">
                            <div class="form-grid">
                                <div class="form-group">
                                    <label class="form-label">Telefon 1</label>
                                    <input type="tel" class="form-control" id="companyFormPhone" value="${
                                      company ? company.phone || "" : ""
                                    }" placeholder="+90 XXX XXX XX XX">
                                </div>
                                <div class="form-group">
                                    <label class="form-label">Telefon 2</label>
                                    <input type="tel" class="form-control" id="companyFormPhone2" value="${
                                      company ? company.phone2 || "" : ""
                                    }" placeholder="+90 XXX XXX XX XX">
                                </div>
                                <div class="form-group">
                                    <label class="form-label">Faks</label>
                                    <input type="tel" class="form-control" id="companyFormFax" value="${
                                      company ? company.fax || "" : ""
                                    }">
                                </div>
                                <div class="form-group">
                                    <label class="form-label">E-posta</label>
                                    <input type="email" class="form-control" id="companyFormEmail" value="${
                                      company ? company.email || "" : ""
                                    }" placeholder="info@firma.com">
                                </div>
                                <div class="form-group">
                                    <label class="form-label">Web Sitesi</label>
                                    <input type="url" class="form-control" id="companyFormWebsite" value="${
                                      company ? company.website || "" : ""
                                    }" placeholder="https://www.firma.com">
                                </div>
                                <div class="form-group">
                                    <label class="form-label">Yetkili Kişi</label>
                                    <input type="text" class="form-control" id="companyFormContactPerson" value="${
                                      company ? company.contactPerson || "" : ""
                                    }">
                                </div>
                                <div class="form-group">
                                    <label class="form-label">Yetkili Telefon</label>
                                    <input type="tel" class="form-control" id="companyFormContactPhone" value="${
                                      company ? company.contactPhone || "" : ""
                                    }">
                                </div>
                                <div class="form-group">
                                    <label class="form-label">Yetkili E-posta</label>
                                    <input type="email" class="form-control" id="companyFormContactEmail" value="${
                                      company ? company.contactEmail || "" : ""
                                    }">
                                </div>
                            </div>
                            <div class="form-group">
                                <label class="form-label">Adres</label>
                                <textarea class="form-control" id="companyFormAddress" rows="3">${
                                  company ? company.address || "" : ""
                                }</textarea>
                            </div>
                            <div class="form-grid">
                                <div class="form-group">
                                    <label class="form-label">İl</label>
                                    <input type="text" class="form-control" id="companyFormCity" value="${
                                      company ? company.city || "" : ""
                                    }">
                                </div>
                                <div class="form-group">
                                    <label class="form-label">İlçe</label>
                                    <input type="text" class="form-control" id="companyFormDistrict" value="${
                                      company ? company.district || "" : ""
                                    }">
                                </div>
                                <div class="form-group">
                                    <label class="form-label">Posta Kodu</label>
                                    <input type="text" class="form-control" id="companyFormPostalCode" value="${
                                      company ? company.postalCode || "" : ""
                                    }">
                                </div>
                                <div class="form-group">
                                    <label class="form-label">Ülke</label>
                                    <input type="text" class="form-control" id="companyFormCountry" value="${
                                      company
                                        ? company.country || "Türkiye"
                                        : "Türkiye"
                                    }">
                                </div>
                            </div>
                        </div>
                        
                        <div id="financialInfo" class="tab-content" style="display: none; margin-top: 20px;">
                            <div class="form-grid">
                                <div class="form-group">
                                    <label class="form-label">Vergi No <span style="color: red;">*</span></label>
                                    <input type="text" class="form-control" id="companyFormTaxNo" value="${
                                      company ? company.taxNo : ""
                                    }" required>
                                </div>
                                <div class="form-group">
                                    <label class="form-label">Vergi Dairesi</label>
                                    <input type="text" class="form-control" id="companyFormTaxOffice" value="${
                                      company ? company.taxOffice || "" : ""
                                    }">
                                </div>
                                <div class="form-group">
                                    <label class="form-label">Ticaret Sicil No</label>
                                    <input type="text" class="form-control" id="companyFormTradeRegNo" value="${
                                      company ? company.tradeRegNo || "" : ""
                                    }">
                                </div>
                                <div class="form-group">
                                    <label class="form-label">Mersis No</label>
                                    <input type="text" class="form-control" id="companyFormMersisNo" value="${
                                      company ? company.mersisNo || "" : ""
                                    }">
                                </div>
                                <div class="form-group">
                                    <label class="form-label">Banka Adı</label>
                                    <input type="text" class="form-control" id="companyFormBankName" value="${
                                      company ? company.bankName || "" : ""
                                    }">
                                </div>
                                <div class="form-group">
                                    <label class="form-label">Şube</label>
                                    <input type="text" class="form-control" id="companyFormBankBranch" value="${
                                      company ? company.bankBranch || "" : ""
                                    }">
                                </div>
                                <div class="form-group">
                                    <label class="form-label">IBAN</label>
                                    <input type="text" class="form-control" id="companyFormIban" value="${
                                      company ? company.iban || "" : ""
                                    }" placeholder="TR00 0000 0000 0000 0000 0000 00">
                                </div>
                                <div class="form-group">
                                    <label class="form-label">Hesap No</label>
                                    <input type="text" class="form-control" id="companyFormAccountNo" value="${
                                      company ? company.accountNo || "" : ""
                                    }">
                                </div>
                                <div class="form-group">
                                    <label class="form-label">Kredi Limiti</label>
                                    <input type="number" class="form-control" id="companyFormCreditLimit" value="${
                                      company ? company.creditLimit || "" : ""
                                    }" placeholder="0.00">
                                </div>
                                <div class="form-group">
                                    <label class="form-label">Ödeme Vadesi (Gün)</label>
                                    <input type="number" class="form-control" id="companyFormPaymentTerm" value="${
                                      company
                                        ? company.paymentTerm || "30"
                                        : "30"
                                    }">
                                </div>
                            </div>
                        </div>
                        
                        <div id="additionalInfo" class="tab-content" style="display: none; margin-top: 20px;">
                            <div class="form-group">
                                <label class="form-label">Notlar</label>
                                <textarea class="form-control" id="companyFormNotes" rows="4">${
                                  company ? company.notes || "" : ""
                                }</textarea>
                            </div>
                            <div class="form-grid">
                                <div class="form-group">
                                    <label style="display: flex; align-items: center; gap: 8px;">
                                        <input type="checkbox" id="companyFormEmailAccept" ${
                                          company &&
                                          company.acceptsEmailNotifications
                                            ? "checked"
                                            : ""
                                        }>
                                        E-posta Bildirimleri Kabul Ediyor
                                    </label>
                                </div>
                                <div class="form-group">
                                    <label style="display: flex; align-items: center; gap: 8px;">
                                        <input type="checkbox" id="companyFormSmsAccept" ${
                                          company &&
                                          company.acceptsSmsNotifications
                                            ? "checked"
                                            : ""
                                        }>
                                        SMS Bildirimleri Kabul Ediyor
                                    </label>
                                </div>
                                <div class="form-group">
                                    <label style="display: flex; align-items: center; gap: 8px;">
                                        <input type="checkbox" id="companyFormFavorite" ${
                                          company && company.isFavorite
                                            ? "checked"
                                            : ""
                                        }>
                                        Sık Kullanılanlara Ekle
                                    </label>
                                </div>
                                <div class="form-group">
                                    <label style="display: flex; align-items: center; gap: 8px;">
                                        <input type="checkbox" id="companyFormActive" ${
                                          company
                                            ? company.active !== false
                                              ? "checked"
                                              : ""
                                            : "checked"
                                        }>
                                        Aktif Firma
                                    </label>
                                </div>
                            </div>
                            <div class="form-group">
                                <label class="form-label">Logo Yükle</label>
                                <input type="file" class="form-control" id="companyFormLogo" accept="image/*">
                                ${
                                  company && company.logo
                                    ? `<img src="${company.logo}" style="max-width: 200px; margin-top: 10px;">`
                                    : ""
                                }
                            </div>
                        </div>
                    </form>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-success" onclick="saveCompany('${
                      companyId || ""
                    }')">
                        <i class="fas fa-save"></i> Kaydet
                    </button>
                    <button type="button" class="btn btn-outline" onclick="closeModal('companyModal')">İptal</button>
                </div>
            </div>
        </div>
    `;

  document.body.insertAdjacentHTML("beforeend", modalHTML);
}

function switchCompanyTab(button, tabId) {
  document
    .querySelectorAll("#companyModal .tab")
    .forEach((tab) => tab.classList.remove("active"));
  document
    .querySelectorAll("#companyModal .tab-content")
    .forEach((content) => (content.style.display = "none"));
  button.classList.add("active");
  document.getElementById(tabId).style.display = "block";
}
// Yeni: Firma Kaydet ve Dropdown Güncelle
async function saveCompanyAndUpdateDropdown(companyId = null) {
  await saveCompany(companyId);
  // Dropdown güncelle
  const select = document.getElementById("offerCompany");
  if (select) {
    select.innerHTML =
      '<option value="">Firma seçiniz...</option>' +
      firebaseData.companies
        .map(
          (company) =>
            `<option value="${company.id}" ${
              company.isFavorite ? 'style="font-weight: bold;"' : ""
            }>${company.name} - ${company.taxNo} ${
              company.isFavorite ? "(Sık Kullanılan)" : ""
            }</option>`
        )
        .join("");
  }
}

function filterCompanies(searchTerm) {
  const companies = window.firebaseData?.companies || [];
  const tbody = document.getElementById("companiesTableBody");
  if (!tbody) return;

  const filtered = companies.filter(
    (company) =>
      company.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      company.taxNo.includes(searchTerm) ||
      (company.phone && company.phone.includes(searchTerm))
  );

  tbody.innerHTML =
    filtered.length > 0
      ? filtered
          .map(
            (company) => `
        <tr>
            <td>
                <strong>${company.name}</strong> 
                ${
                  company.isFavorite
                    ? '<i class="fas fa-star" style="color: gold; margin-left: 5px;"></i>'
                    : ""
                }
            </td>
            <td>${company.taxNo}</td>
            <td>${company.phone || "-"}</td>
            <td>${company.email || "-"}</td>
            <td>${company.address || "-"}</td>
            <td>
                <span class="badge ${
                  company.customerType === "vip"
                    ? "warning"
                    : company.customerType === "potansiyel"
                    ? "info"
                    : "success"
                }">
                    ${company.customerType || "normal"}
                </span>
            </td>
            <td>
                <div class="action-buttons">
                    <button class="action-btn view" onclick="showCompanyDetails('${
                      company.id
                    }')">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="action-btn edit" onclick="openCompanyModal('${
                      company.id
                    }')">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="action-btn delete" onclick="deleteCompany('${
                      company.id
                    }')">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </td>
        </tr>
    `
          )
          .join("")
      : '<tr><td colspan="7" style="text-align: center; padding: 20px;">Arama sonucu bulunamadı</td></tr>';
}

function previewOffer() {
  const companyId = document.getElementById("offerCompanyId")?.value || 
                   document.getElementById("offerCompany")?.value;
  const company = firebaseData.companies.find((c) => c.id === companyId);

  if (!company) {
    showNotification("Hata", "Lütfen firma seçin.", "error");
    return;
  }

  const items = [];
  const rows = document.querySelectorAll("#offerProductsTable tr");

  rows.forEach((row) => {
    const productSelect = row.querySelector("select");
    const qtyInput = row.querySelectorAll('input[type="number"]')[0];
    const priceInput = row.querySelectorAll('input[type="number"]')[1];

    if (productSelect && qtyInput) {
      const productId = productSelect.value;
      const qty = parseFloat(qtyInput.value) || 0;
      const price = parseFloat(priceInput?.value) || 
                   parseFloat(productSelect.selectedOptions[0]?.dataset.price) || 0;

      if (productId && qty > 0) {
        const product = firebaseData.products.find((p) => p.id === productId);
        
        // Teknik özellikler hazırla
        let technicalSpecs = [];
        if (product?.category) technicalSpecs.push(`Kategori: ${product.category}`);
        if (product?.code) technicalSpecs.push(`Kod: ${product.code}`);
        if (product?.description) technicalSpecs.push(`${product.description}`);
        
        items.push({
          name: product?.name || "Bilinmeyen Ürün",
          code: product?.code || "-",
          technicalSpecs: technicalSpecs.join(" • ") || "Teknik özellik belirtilmemiş",
          quantity: qty,
          unit: "Adet",
          price: price,
        });
      }
    }
  });

  if (items.length === 0) {
    showNotification("Hata", "Lütfen en az bir ürün ekleyin.", "error");
    return;
  }

  const date = document.getElementById("offerDate").value;
  const validity = document.getElementById("offerValidity").value;
  const projectName = document.getElementById("offerProjectName").value;
  const contactValue = document.getElementById("offerCompanyContact").value;
  
  let companyContact = "";
  if (contactValue) {
    try {
      const contact = JSON.parse(contactValue);
      companyContact = contact.name;
    } catch (e) {
      companyContact = contactValue;
    }
  }

  const subtotal = items.reduce((sum, item) => sum + item.quantity * item.price, 0);
  const tax = subtotal * 0.18; // KDV %18
  const total = subtotal + tax;

  // Şirket bilgileri
  const companyInfo = {
    name: "MOTTO ENGINEERING OF LIGHT",
    address: "Organize Sanayi Bölgesi 3. Cadde No:45",
    city: "İstanbul, Türkiye", 
    phone: "+90 212 555 00 00",
    email: "info@motto.com.tr",
    website: "www.motto.com.tr",
    taxNo: "123 456 789",
    logo: "img/logo/motto.png"
  };

  const offerNo = generateOfferNumber(companyId, projectName, false);

  const previewHtml = `
        <div style="max-width: 210mm; margin: 0 auto; background: white; font-family: 'Arial', sans-serif; color: #333; line-height: 1.4;">
            
            <!-- Letterhead -->
            <div style="border-bottom: 3px solid #2563eb; margin-bottom: 30px; padding-bottom: 20px;">
                <table style="width: 100%; border-collapse: collapse;">
                    <tr>
                        <td style="width: 40%; vertical-align: top;">
                            <img src="${companyInfo.logo}" alt="Motto Logo" style="height: 60px; margin-bottom: 15px;">
                            <h2 style="font-size: 18px; font-weight: bold; color: #1f2937; margin: 0 0 10px 0;">${companyInfo.name}</h2>
                            <div style="font-size: 11px; color: #666; line-height: 1.6;">
                                ${companyInfo.address}<br>
                                ${companyInfo.city}<br>
                                Tel: ${companyInfo.phone}<br>
                                E-mail: ${companyInfo.email}<br>
                                Web: ${companyInfo.website}<br>
                                Vergi No: ${companyInfo.taxNo}
                            </div>
                        </td>
                        <td style="width: 60%; text-align: right; vertical-align: top;">
                            <div style="background: #2563eb; color: white; padding: 20px; display: inline-block; border-radius: 8px;">
                                <h1 style="font-size: 24px; font-weight: bold; margin: 0 0 15px 0;">TEKLİF</h1>
                                <table style="color: white; font-size: 13px; line-height: 1.8;">
                                    <tr><td style="padding: 2px 0; width: 120px;">Teklif No:</td><td style="font-weight: bold;">${offerNo}</td></tr>
                                    <tr><td style="padding: 2px 0;">Teklif Tarihi:</td><td style="font-weight: bold;">${new Date(date).toLocaleDateString("tr-TR")}</td></tr>
                                    <tr><td style="padding: 2px 0;">Proje:</td><td style="font-weight: bold;">${projectName}</td></tr>
                                    <tr><td style="padding: 2px 0;">Geçerlilik:</td><td style="font-weight: bold;">${validity}</td></tr>
                                </table>
                            </div>
                        </td>
                    </tr>
                </table>
            </div>

            <!-- Client Information -->
            <div style="margin-bottom: 30px;">
                <h3 style="background: #f8f9fa; padding: 10px; margin: 0 0 15px 0; font-size: 14px; color: #2563eb; font-weight: bold; border-left: 4px solid #2563eb;">SAYIN MÜŞTERİMİZ</h3>
                <table style="width: 100%; font-size: 13px;">
                    <tr>
                        <td style="width: 25%; font-weight: bold; color: #555; padding: 5px 0;">Firma Adı:</td>
                        <td style="color: #333; padding: 5px 0;">${company.name}</td>
                    </tr>
                    ${companyContact ? `
                    <tr>
                        <td style="font-weight: bold; color: #555; padding: 5px 0;">Yetkili Kişi:</td>
                        <td style="color: #333; padding: 5px 0;">${companyContact}</td>
                    </tr>` : ''}
                    <tr>
                        <td style="font-weight: bold; color: #555; padding: 5px 0;">Vergi No:</td>
                        <td style="color: #333; padding: 5px 0;">${company.taxNo}</td>
                    </tr>
                    ${company.phone ? `
                    <tr>
                        <td style="font-weight: bold; color: #555; padding: 5px 0;">Telefon:</td>
                        <td style="color: #333; padding: 5px 0;">${company.phone}</td>
                    </tr>` : ''}
                    ${company.email ? `
                    <tr>
                        <td style="font-weight: bold; color: #555; padding: 5px 0;">E-posta:</td>
                        <td style="color: #333; padding: 5px 0;">${company.email}</td>
                    </tr>` : ''}
                    ${company.address ? `
                    <tr>
                        <td style="font-weight: bold; color: #555; padding: 5px 0; vertical-align: top;">Adres:</td>
                        <td style="color: #333; padding: 5px 0;">${company.address}</td>
                    </tr>` : ''}
                </table>
            </div>
            
            <!-- Products Table -->
            <div style="margin-bottom: 30px;">
                <h3 style="background: #f8f9fa; padding: 10px; margin: 0 0 15px 0; font-size: 14px; color: #2563eb; font-weight: bold; border-left: 4px solid #2563eb;">TEKLİF KALEMLERI</h3>
                
                <table style="width: 100%; border-collapse: collapse; border: 1px solid #ddd;">
                    <thead>
                        <tr style="background: #f8f9fa;">
                            <th style="border: 1px solid #ddd; padding: 12px 8px; text-align: center; font-size: 12px; font-weight: bold; color: #333;">S.NO</th>
                            <th style="border: 1px solid #ddd; padding: 12px 8px; text-align: left; font-size: 12px; font-weight: bold; color: #333;">ÜRÜN ADI</th>
                            <th style="border: 1px solid #ddd; padding: 12px 8px; text-align: left; font-size: 12px; font-weight: bold; color: #333;">TEKNİK ÖZELLİKLER</th>
                            <th style="border: 1px solid #ddd; padding: 12px 8px; text-align: center; font-size: 12px; font-weight: bold; color: #333;">MİKTAR</th>
                            <th style="border: 1px solid #ddd; padding: 12px 8px; text-align: center; font-size: 12px; font-weight: bold; color: #333;">BİRİM</th>
                            <th style="border: 1px solid #ddd; padding: 12px 8px; text-align: right; font-size: 12px; font-weight: bold; color: #333;">BİRİM FİYAT</th>
                            <th style="border: 1px solid #ddd; padding: 12px 8px; text-align: right; font-size: 12px; font-weight: bold; color: #333;">TOPLAM</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${items
                          .map(
                            (item, index) => `
                            <tr>
                                <td style="border: 1px solid #ddd; padding: 10px 8px; text-align: center; font-weight: bold; color: #2563eb;">
                                    ${index + 1}
                                </td>
                                <td style="border: 1px solid #ddd; padding: 10px 8px; font-size: 13px; font-weight: bold; color: #333;">
                                    ${item.name}
                                </td>
                                <td style="border: 1px solid #ddd; padding: 10px 8px; font-size: 11px; color: #666; line-height: 1.4;">
                                    ${item.technicalSpecs}
                                </td>
                                <td style="border: 1px solid #ddd; padding: 10px 8px; text-align: center; font-weight: bold; font-size: 13px;">
                                    ${item.quantity}
                                </td>
                                <td style="border: 1px solid #ddd; padding: 10px 8px; text-align: center; font-size: 12px; color: #666;">
                                    ${item.unit}
                                </td>
                                <td style="border: 1px solid #ddd; padding: 10px 8px; text-align: right; font-size: 13px; font-weight: bold;">
                                    ${item.price.toFixed(2)} $
                                </td>
                                <td style="border: 1px solid #ddd; padding: 10px 8px; text-align: right; font-size: 13px; font-weight: bold; background: #f8f9fa;">
                                    ${(item.quantity * item.price).toFixed(2)} $
                                </td>
                            </tr>
                        `
                          )
                          .join("")}
                    </tbody>
                </table>
            </div>
            
            <!-- Total Section -->
            <div style="margin-bottom: 30px;">
                <table style="width: 100%; border-collapse: collapse;">
                    <tr>
                        <td style="width: 60%;"></td>
                        <td style="width: 40%;">
                            <table style="width: 100%; border-collapse: collapse; border: 1px solid #ddd;">
                                <tr style="background: #f8f9fa;">
                                    <td style="border: 1px solid #ddd; padding: 10px; font-weight: bold; font-size: 13px;">ARA TOPLAM</td>
                                    <td style="border: 1px solid #ddd; padding: 10px; text-align: right; font-weight: bold; font-size: 13px;">${subtotal.toFixed(2)} $</td>
                                </tr>
                                <tr style="background: #f8f9fa;">
                                    <td style="border: 1px solid #ddd; padding: 10px; font-weight: bold; font-size: 13px;">KDV (%18)</td>
                                    <td style="border: 1px solid #ddd; padding: 10px; text-align: right; font-weight: bold; font-size: 13px;">${tax.toFixed(2)} $</td>
                                </tr>
                                <tr style="background: #2563eb; color: white;">
                                    <td style="border: 1px solid #2563eb; padding: 15px; font-weight: bold; font-size: 14px;">GENEL TOPLAM</td>
                                    <td style="border: 1px solid #2563eb; padding: 15px; text-align: right; font-weight: bold; font-size: 16px;">${total.toFixed(2)} $</td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                </table>
            </div>
            
            <!-- Terms and Conditions -->
            <div style="margin-bottom: 30px;">
                <h3 style="background: #f8f9fa; padding: 10px; margin: 0 0 15px 0; font-size: 14px; color: #2563eb; font-weight: bold; border-left: 4px solid #2563eb;">GENEL ŞARTLAR</h3>
                <div style="font-size: 11px; color: #555; line-height: 1.6;">
                    <p style="margin: 8px 0;">• Bu teklif <strong>${validity}</strong> süreyle geçerlidir.</p>
                    <p style="margin: 8px 0;">• Teklif kabul edildiği takdirde sipariş onayı gönderilecektir.</p>
                    <p style="margin: 8px 0;">• Fiyatlar KDV dahildir ve Dolar ($) cinsindendir.</p>
                    <p style="margin: 8px 0;">• Teslimat süresi sipariş onayından sonra belirlenecektir.</p>
                    <p style="margin: 8px 0;">• Ödeme şartları: Sipariş ile birlikte %50 peşin, teslimatta %50 kalan bakiye.</p>
                    <p style="margin: 8px 0;">• Force majeure durumlarında teslimat süreleri uzayabilir.</p>
                </div>
            </div>

            <!-- Footer -->
            <div style="text-align: center; padding-top: 20px; border-top: 1px solid #ddd;">
                <div style="font-size: 10px; color: #888; margin-bottom: 10px;">
                    Bu teklif ${new Date().toLocaleDateString('tr-TR')} tarihinde elektronik ortamda oluşturulmuştur.
                </div>
                <div style="font-size: 12px; font-weight: bold; color: #2563eb;">
                    ${companyInfo.name} - ${companyInfo.phone} - ${companyInfo.email}
                </div>
            </div>
        </div>
    `;

  // Modal oluştur
  let modal = document.getElementById("offerPreviewModal");
  if (!modal) {
    const modalHTML = `
      <div id="offerPreviewModal" class="modal">
        <div class="modal-content" style="max-width: 95vw; max-height: 95vh; overflow-y: auto;">
          <div class="modal-header" style="background: #2563eb; color: white;">
            <h3 class="modal-title"><i class="fas fa-file-alt"></i> Teklif Önizleme</h3>
            <button class="modal-close" onclick="closeModal('offerPreviewModal')" style="color: white;">
              <i class="fas fa-times"></i>
            </button>
          </div>
          <div class="modal-body" id="offerPreviewBody" style="padding: 20px; background: #f8f9fa;"></div>
          <div class="modal-footer">
            <button class="btn btn-primary" onclick="printOffer()">
              <i class="fas fa-print"></i> Yazdır
            </button>
            <button class="btn btn-outline" onclick="closeModal('offerPreviewModal')">Kapat</button>
          </div>
        </div>
      </div>
    `;
    document.body.insertAdjacentHTML("beforeend", modalHTML);
  }

  document.getElementById("offerPreviewBody").innerHTML = previewHtml;
  openModal("offerPreviewModal");
}

async function saveOfferWithRevisionCheck() {
    // Kaydet butonunu al ve devre dışı bırak
    const saveBtn = document.querySelector('.btn-success[onclick="saveOfferWithRevisionCheck()"]');
    let originalButtonContent = '';
    
    if (saveBtn) {
        originalButtonContent = saveBtn.innerHTML;
        saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Kontrol ediliyor...';
        saveBtn.disabled = true;
    }

    try {
        // Form verilerini topla
        const companyId = document.getElementById('offerCompanyId')?.value || 
                          document.getElementById('offerCompany')?.value || '';
        const projectName = document.getElementById('offerProjectName')?.value?.trim() || '';
        const offerDate = document.getElementById('offerDate')?.value || '';
        const offerValidity = document.getElementById('offerValidity')?.value || '15 gün';
        
        // Temel validasyonlar
        if (!companyId) {
            showNotification('Hata', 'Lütfen firma seçin.', 'error');
            return;
        }
        
        if (!projectName) {
            showNotification('Hata', 'Lütfen proje adı girin.', 'error');
            return;
        }

        if (!offerDate) {
            showNotification('Hata', 'Lütfen teklif tarihini seçin.', 'error');
            return;
        }

        // Firma yetkilisi bilgisini al
        let companyContact = '';
        const contactValue = document.getElementById('offerCompanyContact')?.value || '';
        if (contactValue) {
            try {
                const contact = JSON.parse(contactValue);
                companyContact = contact.name || '';
            } catch (e) {
                companyContact = contactValue;
            }
        }

        // Ürünleri topla
        const products = [];
        const rows = document.querySelectorAll('#offerProductsTable tr');
        let subTotal = 0;
        let hasError = false;

        rows.forEach((row, index) => {
            const productSelect = row.querySelector('select');
            const qtyInput = row.querySelectorAll('input[type="number"]')[0];
            const priceInput = row.querySelectorAll('input[type="number"]')[1];

            if (productSelect && qtyInput && priceInput) {
                const productId = productSelect.value;
                const quantity = parseFloat(qtyInput.value) || 0;
                const unitPrice = parseFloat(priceInput.value) || 0;

                if (!productId) {
                    showNotification('Hata', `${index + 1}. satırda ürün seçilmemiş.`, 'error');
                    hasError = true;
                    return;
                }

                if (quantity <= 0) {
                    showNotification('Hata', `${index + 1}. satırda miktar girilmemiş.`, 'error');
                    hasError = true;
                    return;
                }

                if (unitPrice <= 0) {
                    showNotification('Hata', `${index + 1}. satırda fiyat girilmemiş.`, 'error');
                    hasError = true;
                    return;
                }

                const product = firebaseData.products.find(p => p.id === productId);
                const total = quantity * unitPrice;
                
                products.push({
                    productId: productId,
                    productName: product?.name || 'Bilinmeyen',
                    productCode: product?.code || '',
                    quantity: quantity,
                    unitPrice: unitPrice,
                    total: total
                });
                
                subTotal += total;
            }
        });

        // Hata varsa çık
        if (hasError) {
            return;
        }

        if (products.length === 0) {
            showNotification('Hata', 'Lütfen en az bir ürün ekleyin.', 'error');
            return;
        }

        // Vergi ve toplam hesapla
        const tax = subTotal * 0.18;
        const grandTotal = subTotal + tax;

        // Teklif verisini hazırla
        const offerData = {
            companyId: companyId,
            projectName: projectName,
            companyContact: companyContact,
            date: offerDate,
            validity: offerValidity,
            products: products,
            subtotal: subTotal,
            tax: tax,
            total: grandTotal,
            status: 'Beklemede',
            createdAt: new Date().toISOString(),
            createdBy: currentUser?.id || 'system',
            createdByName: currentUser?.name || 'System',
            active: true,
            isRevision: false
        };

        // REVİZYON MODU KONTROLÜ
        if (window.isRevisionMode && window.originalOfferData) {
            // Revizyon modunda - direkt revizyon oluştur
            const revisionOfferNo = generateOfferNumber(companyId, projectName, true);
            
            offerData.offerNo = revisionOfferNo;
            offerData.no = revisionOfferNo;
            offerData.isRevision = true;
            offerData.originalOfferId = window.originalOfferData.id;
            offerData.originalOfferNo = window.originalOfferData.offerNo || window.originalOfferData.no;
            offerData.revisionNumber = getNextRevisionNumber(companyId, projectName);
            offerData.revisionDate = new Date().toISOString();
            offerData.revisionNote = `${window.originalOfferData.offerNo || window.originalOfferData.no} numaralı teklifin revizyonu`;

            // Firebase'e kaydet
            await window.firestoreService.addOffer(offerData);
            
            showNotification(
                'Revizyon Oluşturuldu', 
                `${revisionOfferNo} numaralı revizyon teklifi başarıyla oluşturuldu.`, 
                'success'
            );
            
            // Revizyon modunu temizle
            window.isRevisionMode = false;
            delete window.originalOfferData;
            
            // Formu temizle
            clearOfferForm();
            
            // Firebase verilerini yenile
            await loadFirebaseData();
            
            // Teklif listesine yönlendir
            setTimeout(() => {
                showPage('teklifListesi');
            }, 1000);
            
        } else {
            // NORMAL MOD - Mevcut teklif kontrolü yap
            const existingOffer = firebaseData.offers.find(
                o => o.companyId === companyId && 
                     o.projectName === projectName && 
                     o.status !== 'Reddedildi' &&
                     !o.isRevision
            );

            if (existingOffer) {
                // Mevcut teklif var - revizyon uyarısı göster
                showRevisionWarningModal(existingOffer, offerData);
                
            } else {
                // Yeni teklif oluştur
                const offerNo = generateOfferNumber(companyId, projectName, false);
                offerData.offerNo = offerNo;
                offerData.no = offerNo;
                
                // Firebase'e kaydet
                await window.firestoreService.addOffer(offerData);
                
                showNotification(
                    'Başarılı', 
                    `${offerNo} numaralı teklif başarıyla kaydedildi.`, 
                    'success'
                );
                
                // Formu temizle
                clearOfferForm();
                
                // Firebase verilerini yenile
                await loadFirebaseData();
                
                // Başarılı kayıt sonrası isteğe bağlı yönlendirme
                setTimeout(() => {
                    if (confirm('Teklif başarıyla kaydedildi. Teklif listesine gitmek ister misiniz?')) {
                        showPage('teklifListesi');
                    }
                }, 500);
            }
        }

    } catch (error) {
        console.error('Teklif kaydetme hatası:', error);
        showNotification(
            'Hata', 
            `Teklif kaydedilirken hata oluştu: ${error.message || 'Bilinmeyen hata'}`, 
            'error'
        );
        
    } finally {
        // Butonu her durumda eski haline getir
        if (saveBtn) {
            setTimeout(() => {
                saveBtn.innerHTML = originalButtonContent || '<i class="fas fa-save"></i> Teklifi Kaydet';
                saveBtn.disabled = false;
            }, 500);
        }
    }
}

// Yardımcı fonksiyon - Sonraki revizyon numarasını al
function getNextRevisionNumber(companyId, projectName) {
    const offers = firebaseData.offers || [];
    const projectRevisions = offers.filter(o => 
        o.companyId === companyId && 
        o.projectName === projectName && 
        o.isRevision === true
    );
    return projectRevisions.length + 1;
}


// Window objesine ekle
window.saveOfferWithRevisionCheck = saveOfferWithRevisionCheck;

function loadTeklifListesi() {
    if (!window.firebaseData || !window.firebaseData.offers) {
        console.error('Teklif verileri bulunamadı, yeniden yükleniyor...');
        loadFirebaseData().then(() => loadTeklifListesi());
        return;
    }
    
    const offers = window.firebaseData.offers || [];
    const companies = window.firebaseData.companies || [];
    
    console.log('Teklif listesi yükleniyor, toplam:', offers.length);
    
    const content = `
        <div class="page-header">
            <h1 class="page-title"><i class="fas fa-list"></i> Teklifler Listesi</h1>
            <p class="page-subtitle">Teklifleri filtreleyerek görüntüleyin (${offers.length} teklif)</p>
        </div>
        <div class="card">
            <div class="card-header">
                <div class="flex justify-between items-center">
                    <div>
                        <h3 class="card-title">Teklif Filtreleme</h3>
                        <p class="card-subtitle">Toplam ${offers.length} teklif mevcut</p>
                    </div>
                    <button class="btn btn-primary" onclick="showPage('teklifHazirla')">
                        <i class="fas fa-plus"></i> Yeni Teklif
                    </button>
                </div>
            </div>
            <div class="card-body">
                <div class="filter-bar" style="background: var(--gray-50); padding: 20px; border-radius: 10px; margin-bottom: 25px;">
                    <div class="filter-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 15px; align-items: end;">
                        <div>
                            <label style="font-size: 12px; font-weight: 600; margin-bottom: 5px; display: block;">
                                <i class="fas fa-search"></i> Genel Arama
                            </label>
                            <input type="text" 
                                id="offerSearch" 
                                class="form-control"
                                placeholder="Teklif no veya ürün ara..." 
                                onkeyup="filterOffersWithProject()">
                        </div>
                        
                        <div>
                            <label style="font-size: 12px; font-weight: 600; margin-bottom: 5px; display: block;">
                                <i class="fas fa-building"></i> Firma Adı
                            </label>
                            <input type="text" 
                                id="offerCompanyNameFilter" 
                                class="form-control"
                                placeholder="Firma adı ara..." 
                                onkeyup="filterOffersWithProject()">
                        </div>
                        
                        <div>
                            <label style="font-size: 12px; font-weight: 600; margin-bottom: 5px; display: block;">
                                <i class="fas fa-project-diagram"></i> Proje Adı
                            </label>
                            <input type="text" 
                                id="offerProjectFilter" 
                                class="form-control"
                                placeholder="Proje adı ara..." 
                                onkeyup="filterOffersWithProject()">
                        </div>
                        
                        <div>
                            <label style="font-size: 12px; font-weight: 600; margin-bottom: 5px; display: block;">
                                <i class="fas fa-user-tie"></i> Firma Yetkilisi
                            </label>
                            <input type="text" 
                                id="offerContactFilter" 
                                class="form-control"
                                placeholder="Yetkili kişi ara..." 
                                onkeyup="filterOffersWithProject()">
                        </div>
                        
                        <div>
                            <label style="font-size: 12px; font-weight: 600; margin-bottom: 5px; display: block;">
                                <i class="fas fa-flag"></i> Durum
                            </label>
                            <select id="offerStatusFilter" class="form-control" onchange="filterOffersWithProject()">
                                <option value="">Durum seçin...</option>
                                <option value="Beklemede">Beklemede</option>
                                <option value="Onaylandı">Onaylandı</option>
                                <option value="Reddedildi">Reddedildi</option>
                                <option value="Gönderildi">Gönderildi</option>
                            </select>
                        </div>
                        
                        <div style="display: flex; gap: 10px;">
                            <button class="btn btn-success" onclick="showAllOffersWithProject()">
                                <i class="fas fa-list"></i> Tümünü Göster
                            </button>
                            <button class="btn btn-info" onclick="clearAllOfferFilters()">
                                <i class="fas fa-times"></i> Temizle
                            </button>
                        </div>
                    </div>
                </div>
                
                <div id="offerListMessage" style="text-align: center; padding: 60px; background: white; border: 2px dashed var(--gray-300); border-radius: 10px;">
                    <i class="fas fa-filter" style="font-size: 48px; color: var(--gray-400); margin-bottom: 20px;"></i>
                    <h3 style="color: var(--gray-600); margin-bottom: 10px;">Filtre Seçin veya Tümünü Göster</h3>
                    <p style="color: var(--gray-500);">
                        Teklifleri görüntülemek için yukarıdaki filtrelerden birini kullanın veya "Tümünü Göster" butonuna tıklayın.
                    </p>
                </div>
                
                <div id="offerTableContainer" style="display: none;">
                    <div class="table-container">
                        <table class="table">
                            <thead>
                                <tr>
                                    <th>Teklif No</th>
                                    <th>Firma</th>
                                    <th>Proje Adı</th>
                                    <th>Firma Yetkilisi</th>
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

// YENİ FONKSİYON: showAllOffersWithProject
function showAllOffersWithProject() {
    const messageDiv = document.getElementById('offerListMessage');
    const tableDiv = document.getElementById('offerTableContainer');
    
    if (messageDiv) messageDiv.style.display = 'none';
    if (tableDiv) tableDiv.style.display = 'block';
    
    const tbody = document.getElementById('offersTableBody');
    if (!tbody) return;
    
    const offers = window.firebaseData?.offers || [];
    const companies = window.firebaseData?.companies || [];
    
    console.log('Tüm teklifler gösteriliyor:', offers.length);
    
   
    
    const sortedOffers = offers.sort((a, b) => new Date(b.date) - new Date(a.date));
    
    tbody.innerHTML = sortedOffers.map(offer => {
        const company = companies.find(c => c.id === offer.companyId);
        const productCount = offer.products ? offer.products.length : 0;
        
        return `
            <tr>
                <td><strong>${offer.offerNo || offer.no}</strong></td>
                <td>${company?.name || 'Bilinmeyen'}</td>
                <td><strong>${offer.projectName || 'Proje Adı Yok'}</strong></td>
                <td>${offer.companyContact || '-'}</td>
                <td>${new Date(offer.date).toLocaleDateString('tr-TR')}</td>
                <td><span class="badge info">${productCount} ürün</span></td>
                <td>${(offer.total || 0).toFixed(2)} $</td>
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
                        <button class="action-btn warning" onclick="prepareRevisionOffer('${offer.id}')" title="Tekrar Teklif Hazırla">
                            <i class="fas fa-redo"></i>
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

// YENİ FONKSİYON: clearAllOfferFilters
function clearAllOfferFilters() {
    document.getElementById('offerSearch').value = '';
    document.getElementById('offerCompanyNameFilter').value = '';
    document.getElementById('offerProjectFilter').value = '';
    document.getElementById('offerContactFilter').value = '';
    document.getElementById('offerStatusFilter').value = '';
    
    document.getElementById('offerListMessage').style.display = 'block';
    document.getElementById('offerTableContainer').style.display = 'none';
}

// TAMAMEN YENİ FONKSİYON: filterOffersWithProject
function filterOffersWithProject() {
    const search = (document.getElementById('offerSearch')?.value || '').toLowerCase().trim();
    const companyNameSearch = (document.getElementById('offerCompanyNameFilter')?.value || '').toLowerCase().trim();
    const projectSearch = (document.getElementById('offerProjectFilter')?.value || '').toLowerCase().trim();
    const contactSearch = (document.getElementById('offerContactFilter')?.value || '').toLowerCase().trim();
    const status = document.getElementById('offerStatusFilter')?.value || '';
    
    if (!search && !companyNameSearch && !projectSearch && !contactSearch && !status) {
        document.getElementById('offerListMessage').style.display = 'block';
        document.getElementById('offerTableContainer').style.display = 'none';
        return;
    }
    
    document.getElementById('offerListMessage').style.display = 'none';
    document.getElementById('offerTableContainer').style.display = 'block';
    
    let filtered = [...firebaseData.offers];
    
    if (search) {
        filtered = filtered.filter(offer => {
            const searchInOffer = (offer.offerNo || offer.no || '').toLowerCase().includes(search);
            const searchInProducts = offer.products && offer.products.some(p => 
                p.productName && p.productName.toLowerCase().includes(search)
            );
            return searchInOffer || searchInProducts;
        });
    }
    
    if (companyNameSearch) {
        filtered = filtered.filter(offer => {
            const company = firebaseData.companies.find(c => c.id === offer.companyId);
            return company && company.name.toLowerCase().includes(companyNameSearch);
        });
    }
    
    if (projectSearch) {
        filtered = filtered.filter(offer => 
            offer.projectName && offer.projectName.toLowerCase().includes(projectSearch)
        );
    }
    
    if (contactSearch) {
        filtered = filtered.filter(offer => 
            offer.companyContact && offer.companyContact.toLowerCase().includes(contactSearch)
        );
    }
    
    if (status) {
        filtered = filtered.filter(offer => offer.status === status);
    }
    
    renderFilteredOffersWithProject(filtered);
}

// TAMAMEN YENİ FONKSİYON: renderFilteredOffersWithProject
function renderFilteredOffersWithProject(offers) {
    const tbody = document.getElementById('offersTableBody');
    if (!tbody) return;
    
    if (offers.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="9" style="text-align: center; padding: 40px; color: var(--gray-500);">
                    <i class="fas fa-search" style="font-size: 32px; margin-bottom: 10px; display: block;"></i>
                    Filtrelere uygun teklif bulunamadı.
                </td>
            </tr>
        `;
        return;
    }
    
    offers.sort((a, b) => new Date(b.date) - new Date(a.date));
    
    tbody.innerHTML = offers.map(offer => {
        const company = firebaseData.companies.find(c => c.id === offer.companyId);
        const productCount = offer.products ? offer.products.length : 0;
        
        return `
            <tr>
                <td><strong>${offer.offerNo || offer.no}</strong></td>
                <td>${company?.name || 'Bilinmeyen'}</td>
                <td><strong>${offer.projectName || 'Proje Adı Yok'}</strong></td>
                <td>${offer.companyContact || '-'}</td>
                <td>${new Date(offer.date).toLocaleDateString('tr-TR')}</td>
                <td><span class="badge info">${productCount} ürün</span></td>
                <td>${(offer.total || 0).toFixed(2)} $</td>
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
                        <button class="action-btn warning" onclick="prepareRevisionOffer('${offer.id}')" title="Tekrar Teklif Hazırla">
                            <i class="fas fa-redo"></i>
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


function renderOffersTable(offers) {
  return offers
    .map((offer) => {
      const company = firebaseData.companies.find(
        (c) => c.id === offer.companyId
      );
      const productCount = offer.products ? offer.products.length : 0;

      return `
            <tr data-offer-id="${offer.id}">
                <td>
                    <input type="checkbox" class="offer-checkbox" value="${
                      offer.id
                    }" 
                           onchange="updateSelectedOffers()" 
                           ${offer.status !== "Onaylandı" ? "disabled" : ""}>
                </td>
                <td><strong>${offer.no}</strong></td>
                <td>${company?.name || "Bilinmeyen"}</td>
                <td>${offer.date}</td>
                <td><span class="badge info">${productCount} ürün</span></td>
                <td>${offer.total.toFixed(2)} $</td>
                <td>
                    <span class="badge ${
                      offer.status === "Onaylandı"
                        ? "success"
                        : offer.status === "Beklemede"
                        ? "warning"
                        : offer.status === "Gönderildi"
                        ? "info"
                        : "danger"
                    }">${offer.status}</span>
                </td>
                <td>
                    <div class="action-buttons">
                        <button class="action-btn view" onclick="previewSavedOffer('${
                          offer.id
                        }')" title="Önizle">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="action-btn edit" onclick="editOfferModal('${
                          offer.id
                        }')" title="Düzenle">
                            <i class="fas fa-edit"></i>
                        </button>
                        ${
                          offer.status === "Onaylandı"
                            ? `
                            <button class="action-btn success" onclick="convertToProductionWithEdit('${offer.id}')" title="Üretime Aktar">
                                <i class="fas fa-industry"></i>
                            </button>
                        `
                            : ""
                        }
                        <button class="action-btn delete" onclick="deleteOffer('${
                          offer.id
                        }')" title="Sil">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    })
    .join("");
}

// Teklif filtreleme fonksiyonu
function filterOffers() {
  const search = (document.getElementById("offerSearch")?.value || "")
    .toLowerCase()
    .trim();
  const companyId = document.getElementById("offerCompanyFilter")?.value || "";
  const dateFrom = document.getElementById("offerDateFrom")?.value || "";
  const dateTo = document.getElementById("offerDateTo")?.value || "";
  const status = document.getElementById("offerStatusFilter")?.value || "";

  // Hiç filtre yoksa mesajı göster
  if (!search && !companyId && !dateFrom && !dateTo && !status) {
    document.getElementById("offerListMessage").style.display = "block";
    document.getElementById("offerTableContainer").style.display = "none";
    return;
  }

  // Filtre varsa tabloyu göster
  document.getElementById("offerListMessage").style.display = "none";
  document.getElementById("offerTableContainer").style.display = "block";

  // Teklifleri filtrele
  let filtered = [...firebaseData.offers];

  // Arama filtresi
  if (search) {
    filtered = filtered.filter((offer) => {
      const searchInOffer = offer.no.toLowerCase().includes(search);
      const searchInProducts =
        offer.products &&
        offer.products.some(
          (p) => p.productName && p.productName.toLowerCase().includes(search)
        );
      return searchInOffer || searchInProducts;
    });
  }

  // Firma filtresi
  if (companyId) {
    filtered = filtered.filter((offer) => offer.companyId === companyId);
  }

  // Tarih başlangıç filtresi
  if (dateFrom) {
    filtered = filtered.filter((offer) => {
      const offerDate = new Date(offer.date);
      const filterDate = new Date(dateFrom);
      return offerDate >= filterDate;
    });
  }

  // Tarih bitiş filtresi
  if (dateTo) {
    filtered = filtered.filter((offer) => {
      const offerDate = new Date(offer.date);
      const filterDate = new Date(dateTo);
      return offerDate <= filterDate;
    });
  }

  // Durum filtresi
  if (status) {
    filtered = filtered.filter((offer) => offer.status === status);
  }

  // Sonuçları göster
  renderFilteredOffers(filtered);
}
// Filtrelenmiş teklifleri göster
function renderFilteredOffers(offers) {
  const tbody = document.getElementById("offersTableBody");
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

  tbody.innerHTML = offers
    .map((offer) => {
      const company = firebaseData.companies.find(
        (c) => c.id === offer.companyId
      );
      const productCount = offer.products ? offer.products.length : 0;

      return `
            <tr>
                <td><strong>${offer.no}</strong></td>
                <td>${company?.name || "Bilinmeyen"}</td>
                <td>${new Date(offer.date).toLocaleDateString("tr-TR")}</td>
                <td><span class="badge info">${productCount} ürün</span></td>
                <td>${offer.total ? offer.total.toFixed(2) : "0.00"} $</td>
                <td>
                    <span class="badge ${
                      offer.status === "Onaylandı"
                        ? "success"
                        : offer.status === "Beklemede"
                        ? "warning"
                        : offer.status === "Gönderildi"
                        ? "info"
                        : "danger"
                    }">${offer.status}</span>
                </td>
                <td>
                    <div class="action-buttons">
                        <button class="action-btn view" onclick="previewSavedOffer('${
                          offer.id
                        }')" title="Önizle">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="action-btn edit" onclick="editOfferModal('${
                          offer.id
                        }')" title="Düzenle">
                            <i class="fas fa-edit"></i>
                        </button>
                        ${
                          offer.status === "Onaylandı"
                            ? `
                            <button class="action-btn success" onclick="convertToProduction('${offer.id}')" title="Üretime Aktar">
                                <i class="fas fa-industry"></i>
                            </button>
                        `
                            : ""
                        }
                        <button class="action-btn delete" onclick="deleteOffer('${
                          offer.id
                        }')" title="Sil">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    })
    .join("");
}
// Tüm teklifleri göster
function showAllOffers() {
  const messageDiv = document.getElementById("offerListMessage");
  const tableDiv = document.getElementById("offerTableContainer");

  if (messageDiv) messageDiv.style.display = "none";
  if (tableDiv) tableDiv.style.display = "block";

  const tbody = document.getElementById("offersTableBody");
  if (!tbody) return;

  const offers = window.firebaseData?.offers || [];
  const companies = window.firebaseData?.companies || [];

  console.log("📋 Tüm teklifler gösteriliyor:", offers.length);

  if (offers.length === 0) {
    tbody.innerHTML =
      '<tr><td colspan="7" style="text-align: center; padding: 40px;">Henüz teklif bulunmuyor. <button class="btn btn-primary" onclick="showPage(\'teklifHazirla\')">Yeni Teklif Oluştur</button></td></tr>';
    return;
  }

  // Tarihe göre sırala (yeniden eskiye)
  const sortedOffers = offers.sort(
    (a, b) => new Date(b.date) - new Date(a.date)
  );

  tbody.innerHTML = sortedOffers
    .map((offer) => {
      const company = companies.find((c) => c.id === offer.companyId);
      const productCount = offer.products ? offer.products.length : 0;

      return `
            <tr>
                <td><strong>${offer.no}</strong></td>
                <td>${company?.name || "Bilinmeyen"}</td>
                <td>${new Date(offer.date).toLocaleDateString("tr-TR")}</td>
                <td><span class="badge info">${productCount} ürün</span></td>
                <td>${(offer.total || 0).toFixed(2)} $</td>
                <td>
                    <span class="badge ${
                      offer.status === "Onaylandı"
                        ? "success"
                        : offer.status === "Beklemede"
                        ? "warning"
                        : offer.status === "Gönderildi"
                        ? "info"
                        : "danger"
                    }">${offer.status}</span>
                </td>
                <td>
                    <div class="action-buttons">
                        <button class="action-btn view" onclick="previewSavedOffer('${
                          offer.id
                        }')" title="Önizle">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="action-btn edit" onclick="editOfferModal('${
                          offer.id
                        }')" title="Düzenle">
                            <i class="fas fa-edit"></i>
                        </button>
                        ${
                          offer.status === "Onaylandı"
                            ? `
                            <button class="action-btn success" onclick="convertToProduction('${offer.id}')" title="Üretime Aktar">
                                <i class="fas fa-industry"></i>
                            </button>
                        `
                            : ""
                        }
                        <button class="action-btn delete" onclick="deleteOffer('${
                          offer.id
                        }')" title="Sil">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    })
    .join("");
}
// Filtreleri temizle
function clearOfferFilters() {
  // Input'ları temizle
  document.getElementById("offerSearch").value = "";
  document.getElementById("offerCompanyFilter").value = "";
  document.getElementById("offerDateFrom").value = "";
  document.getElementById("offerDateTo").value = "";
  document.getElementById("offerStatusFilter").value = "";

  // Mesajı göster, tabloyu gizle
  document.getElementById("offerListMessage").style.display = "block";
  document.getElementById("offerTableContainer").style.display = "none";
}
function editOfferModal(offerId) {
  const offer = firebaseData.offers.find((o) => o.id === offerId);
  if (!offer) {
    showNotification("Hata", "Teklif bulunamadı.", "error");
    return;
  }

  const company = firebaseData.companies.find((c) => c.id === offer.companyId);

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
                                ${firebaseData.companies
                                  .map(
                                    (c) => `
                                    <option value="${c.id}" ${
                                      c.id === offer.companyId ? "selected" : ""
                                    }>
                                        ${c.name} - ${c.taxNo}
                                    </option>
                                `
                                  )
                                  .join("")}
                            </select>
                        </div>
                        <div class="form-group">
                            <label class="form-label">Tarih</label>
                            <input type="date" class="form-control" id="editOfferDate" value="${
                              offer.date
                            }">
                        </div>
                        <div class="form-group">
                            <label class="form-label">Geçerlilik</label>
                            <select class="form-control" id="editOfferValidity">
                                <option ${
                                  offer.validity === "15 gün" ? "selected" : ""
                                }>15 gün</option>
                                <option ${
                                  offer.validity === "30 gün" ? "selected" : ""
                                }>30 gün</option>
                                <option ${
                                  offer.validity === "45 gün" ? "selected" : ""
                                }>45 gün</option>
                                <option ${
                                  offer.validity === "60 gün" ? "selected" : ""
                                }>60 gün</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label class="form-label">Durum</label>
                            <select class="form-control" id="editOfferStatus">
                                <option value="Beklemede" ${
                                  offer.status === "Beklemede" ? "selected" : ""
                                }>Beklemede</option>
                                <option value="Onaylandı" ${
                                  offer.status === "Onaylandı" ? "selected" : ""
                                }>Onaylandı</option>
                                <option value="Reddedildi" ${
                                  offer.status === "Reddedildi"
                                    ? "selected"
                                    : ""
                                }>Reddedildi</option>
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
                                ${offer.products
                                  .map(
                                    (item, index) => `
                                    <tr>
                                        <td>
                                            <select class="form-control" data-index="${index}">
                                                ${firebaseData.products
                                                  .map(
                                                    (p) => `
                                                    <option value="${p.id}" ${
                                                      p.id === item.productId
                                                        ? "selected"
                                                        : ""
                                                    }>
                                                        ${p.name}
                                                    </option>
                                                `
                                                  )
                                                  .join("")}
                                            </select>
                                        </td>
                                        <td>
                                            <input type="number" class="form-control" value="${
                                              item.quantity
                                            }" 
                                                   min="1" style="width: 80px;" onchange="calculateEditOfferTotal()">
                                        </td>
                                        <td>
                                            <input type="number" class="form-control" value="${
                                              item.unitPrice
                                            }" 
                                                   min="0" step="0.01" style="width: 100px;" onchange="calculateEditOfferTotal()">
                                        </td>
                                        <td class="total-cell">${item.total.toFixed(
                                          2
                                        )} $</td>
                                        <td>
                                            <button class="btn btn-sm btn-danger" onclick="this.parentElement.parentElement.remove(); calculateEditOfferTotal()">
                                                <i class="fas fa-trash"></i>
                                            </button>
                                        </td>
                                    </tr>
                                `
                                  )
                                  .join("")}
                            </tbody>
                        </table>
                    </div>
                    
                    <div style="text-align: right; margin-top: 20px;">
                        <div style="font-size: 16px;">Ara Toplam: <span id="editOfferSubtotal">${offer.subtotal.toFixed(
                          2
                        )} $</span></div>
                        <div style="font-size: 14px;">KDV (%20): <span id="editOfferTax">${offer.tax.toFixed(
                          2
                        )} $</span></div>
                        <div style="font-size: 20px; font-weight: bold; color: var(--primary);">
                            Genel Toplam: <span id="editOfferTotal">${offer.total.toFixed(
                              2
                            )}$</span>
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

  document.body.insertAdjacentHTML("beforeend", modalHTML);
}

function calculateEditOfferTotal() {
  const tbody = document.getElementById("editOfferProducts");
  if (!tbody) return;

  let subtotal = 0;

  tbody.querySelectorAll("tr").forEach((row) => {
    const quantity = parseFloat(row.querySelectorAll("input")[0].value) || 0;
    const price = parseFloat(row.querySelectorAll("input")[1].value) || 0;
    const total = quantity * price;

    row.querySelector(".total-cell").textContent = `${total.toFixed(2)} $`;
    subtotal += total;
  });

  const tax = subtotal * 0.2;
  const total = subtotal + tax;

  document.getElementById(
    "editOfferSubtotal"
  ).textContent = `${subtotal.toFixed(2)} $`;
  document.getElementById("editOfferTax").textContent = `${tax.toFixed(2)} $`;
  document.getElementById("editOfferTotal").textContent = `${total.toFixed(
    2
  )} $`;
}
async function updateOffer(offerId) {
  const offer = firebaseData.offers.find((o) => o.id === offerId);
  if (!offer) return;

  const products = [];
  const tbody = document.getElementById("editOfferProducts");

  tbody.querySelectorAll("tr").forEach((row) => {
    const productId = row.querySelector("select").value;
    const product = firebaseData.products.find((p) => p.id === productId);
    const quantity = parseFloat(row.querySelectorAll("input")[0].value) || 0;
    const unitPrice = parseFloat(row.querySelectorAll("input")[1].value) || 0;
    const total = quantity * unitPrice;

    products.push({
      productId: productId,
      productName: product?.name || "Bilinmeyen",
      quantity: quantity,
      unitPrice: unitPrice,
      total: total,
    });
  });

  const subtotal = products.reduce((sum, p) => sum + p.total, 0);
  const tax = subtotal * 0.2;
  const total = subtotal + tax;

  const updatedOffer = {
    ...offer,
    companyId: document.getElementById("editOfferCompany").value,
    date: document.getElementById("editOfferDate").value,
    validity: document.getElementById("editOfferValidity").value,
    status: document.getElementById("editOfferStatus").value,
    products: products,
    subtotal: subtotal,
    tax: tax,
    total: total,
    updatedAt: new Date().toISOString(),
  };

  try {
    await window.firestoreService.updateOffer(offerId, updatedOffer);
    showNotification("Başarılı", "Teklif güncellendi.", "success");
    closeModal("editOfferModal");
    await loadFirebaseData();
    loadTeklifListesi();
  } catch (error) {
    console.error("Teklif güncelleme hatası:", error);
    showNotification("Hata", "Teklif güncellenirken hata oluştu.", "error");
  }
}

async function saveAllProductionChanges() {
  // Bu fonksiyon için production değişikliklerini topla (modal'dan açılan değişiklikler zaten kaydediliyor, bu admin için toplu onay)
  showNotification(
    "Bilgi",
    "Değişiklikler modal üzerinden kaydediliyor. Toplu kaydetme için modal kullanın.",
    "info"
  );
  // Eğer toplu kaydetme istersen, local değişiklikleri Firebase'e push et (şimdilik modal öncelikli)
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
  document.getElementById("pageContent").innerHTML = content;
}

function loadUserProfile() {
  if (!currentUser) {
    showPage("dashboard");
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
                        <input type="text" class="form-control" value="${
                          currentUser.name
                        }" readonly>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Kullanıcı Adı</label>
                        <input type="text" class="form-control" value="${
                          currentUser.username
                        }" readonly>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Departman</label>
                        <input type="text" class="form-control" value="${getRoleDisplayName(
                          currentUser.role
                        )}" readonly>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Durum</label>
                        <input type="text" class="form-control" value="${
                          currentUser.active ? "Aktif" : "Pasif"
                        }" readonly>
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
                    ${currentUser.permissions
                      .map(
                        (perm) => `
                        <span class="badge ${
                          perm === "admin" ? "danger" : "success"
                        }">
                            <i class="fas fa-check-circle"></i> ${perm.toUpperCase()}
                        </span>
                    `
                      )
                      .join("")}
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
  document.getElementById("pageContent").innerHTML = content;
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
  document.getElementById("pageContent").innerHTML = content;
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
  document.getElementById("pageContent").innerHTML = content;
}

// Tab switching function
function switchTab(button, tabId) {
  document
    .querySelectorAll(".tab")
    .forEach((tab) => tab.classList.remove("active"));
  document
    .querySelectorAll(".tab-content")
    .forEach((content) => content.classList.remove("active"));
  button.classList.add("active");
  document.getElementById(tabId).classList.add("active");
}

// Search products in offers
function searchOfferProducts(query) {
  const filtered = firebaseData.products.filter(
    (p) =>
      p.name.toLowerCase().includes(query.toLowerCase()) ||
      p.code.toLowerCase().includes(query.toLowerCase()) ||
      (p.barcode && p.barcode.includes(query))
  );
  const tableBody = document.getElementById("offerProductsTable");
  if (tableBody) {
    // Dinamik select güncelle - ama row eklerken yapılıyor
    console.log("Filtered products for offer:", filtered);
  }
}

function addOfferProduct() {
  const tableBody = document.getElementById("offerProductsTable");
  if (!tableBody) {
    console.error("offerProductsTable bulunamadı");
    return;
  }

  const row = tableBody.insertRow();
  const productOptions = firebaseData.products
    .map(p => {
      // Teknik özellikler hazırla
      let specs = [];
      if (p.category) specs.push(`Kategori: ${p.category}`);
      if (p.code) specs.push(`Kod: ${p.code}`);
      if (p.description) specs.push(`${p.description}`);
      const techSpecs = specs.join(" • ") || "Teknik özellik yok";
      
      return `<option value="${p.id}" data-price="${p.price}" data-specs="${techSpecs}">${p.name} - ${p.code} - ${p.price} $</option>`;
    })
    .join("");

  row.innerHTML = `
        <td>
            <select class="form-control" onchange="updateTechnicalSpecs(this); updatePriceFromProduct(this); calculateOfferTotal()">
                <option value="">Ürün seçiniz...</option>
                ${productOptions}
            </select>
        </td>
        <td>
            <div class="technical-specs-display" style="max-height: 60px; overflow-y: auto; font-size: 11px; color: #666; padding: 5px; background: #f8f9fa; border-radius: 4px;">
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

function updateTechnicalSpecs(select) {
  const specsDiv = select.parentElement.nextElementSibling.querySelector('.technical-specs-display');
  if (!specsDiv) return;

  const selectedOption = select.selectedOptions[0];
  if (!selectedOption || !selectedOption.value) {
    specsDiv.innerHTML = '<span style="color: #999;">Ürün seçiniz</span>';
    return;
  }

  const specs = selectedOption.dataset.specs || "Teknik özellik belirtilmemiş";
  specsDiv.innerHTML = specs;
}


function calculateOfferTotal() {
  const tableBody = document.getElementById("offerProductsTable");
  if (!tableBody) return;

  let subtotal = 0;

  Array.from(tableBody.rows).forEach((row) => {
    const select = row.querySelector("select");
    const quantityInput = row.querySelectorAll('input[type="number"]')[0];
    const priceInput = row.querySelectorAll('input[type="number"]')[1];
    const totalCell = row.querySelector(".total-cell");

    const quantity = parseFloat(quantityInput?.value) || 0;
    const price = parseFloat(priceInput?.value) || 0;
    const total = quantity * price;

    if (totalCell) {
      totalCell.textContent = `${total.toFixed(2)} $`;
    }
    subtotal += total;
  });

  const tax = subtotal * 0.18; // KDV %18
  const total = subtotal + tax;

  const subtotalEl = document.getElementById("offerSubtotal");
  const taxEl = document.getElementById("offerTax");
  const totalEl = document.getElementById("offerTotal");

  if (subtotalEl) subtotalEl.textContent = `${subtotal.toFixed(2)} $`;
  if (taxEl) taxEl.textContent = `${tax.toFixed(2)} $`;
  if (totalEl) totalEl.textContent = `${total.toFixed(2)} $`;
}

async function saveOffer() {
  // Firma kontrolü
  const companyId = document.getElementById("offerCompanyId")?.value || "";
  if (!companyId) {
    showNotification("Hata", "Lütfen firma seçin.", "error");
    return;
  }

  const offerDate = document.getElementById("offerDate").value;
  const offerValidity = document.getElementById("offerValidity").value;

  if (!offerDate) {
    showNotification("Hata", "Lütfen teklif tarihini seçin.", "error");
    return;
  }

  // Ürünleri topla
  const products = [];
  const rows = document.querySelectorAll("#offerProductsTable tr");
  let subTotal = 0;

  rows.forEach((row) => {
    const productSelect = row.querySelector("select");
    const qtyInput = row.querySelectorAll('input[type="number"]')[0];
    const priceInput = row.querySelectorAll('input[type="number"]')[1];

    if (productSelect && qtyInput && priceInput) {
      const productId = productSelect.value;
      const quantity = parseFloat(qtyInput.value) || 0;
      const unitPrice = parseFloat(priceInput.value) || 0;

      if (productId && quantity > 0 && unitPrice > 0) {
        const product = firebaseData.products.find((p) => p.id === productId);
        const total = quantity * unitPrice;
        products.push({
          productId: productId,
          productName: product?.name || "Bilinmeyen",
          quantity: quantity,
          unitPrice: unitPrice,
          total: total,
        });
        subTotal += total;
      }
    }
  });

  if (products.length === 0) {
    showNotification(
      "Hata",
      "Lütfen en az bir ürün ekleyin ve fiyat bilgilerini girin.",
      "error"
    );
    return;
  }

  // KDV ve toplam
  const tax = subTotal * 0.2;
  const grandTotal = subTotal + tax;
  const offerNo = `TKF-${new Date().getFullYear()}-${String(
    (firebaseData.offers?.length || 0) + 1
  ).padStart(4, "0")}`;

  const offerData = {
    no: offerNo,
    companyId: companyId,
    date: offerDate,
    validity: offerValidity,
    products: products,
    subtotal: subTotal,
    tax: tax,
    total: grandTotal,
    status: "Beklemede",
    createdAt: new Date().toISOString(),
    active: true,
  };

  try {
    await window.firestoreService.addOffer(offerData);
    showNotification(
      "Başarılı",
      `Teklif ${offerNo} başarıyla kaydedildi.`,
      "success"
    );

    // Formu temizle
    document.getElementById("offerProductsTable").innerHTML = "";
    document.getElementById("offerSubtotal").textContent = "0 $";
    document.getElementById("offerTax").textContent = "0 $";
    document.getElementById("offerTotal").textContent = "0 $";
    document.getElementById("companySelectionBtn").innerHTML =
      '<i class="fas fa-building" style="margin-right: 8px;"></i>Firma seçiniz...';
    document.getElementById("companySelectionBtn").classList.remove("selected");
    document.getElementById("offerCompanyId").value = "";
    document.getElementById("offerCompany").value = "";
    document.getElementById("offerDate").value = new Date()
      .toISOString()
      .split("T")[0];
    document.getElementById("offerValidity").value = "15 gün";

    await loadFirebaseData();
  } catch (error) {
    console.error("Teklif kaydetme hatası:", error);
    showNotification("Hata", "Teklif kaydedilirken hata oluştu.", "error");
  }
}

document.addEventListener("DOMContentLoaded", function () {
  if (!document.getElementById("company-selection-styles")) {
    const style = document.createElement("style");
    style.id = "company-selection-styles";
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
  const companyId = document.getElementById("offerCompanyId")?.value || "";
  const company = firebaseData.companies.find((c) => c.id === companyId);

  if (!company) {
    showNotification("Hata", "Lütfen firma seçin.", "error");
    return;
  }

  if (!company.acceptsEmailNotifications && !company.emailNotifications) {
    const confirmSend = confirm(
      "Seçilen firma e-posta bildirimlerini kabul etmiyor. Yine de göndermek istiyor musunuz?"
    );
    if (!confirmSend) {
      return;
    }
  }

  if (!company.email) {
    showNotification(
      "Hata",
      "Firma için e-posta adresi tanımlı değil.",
      "error"
    );
    return;
  }

  // Önce teklifi kaydet
  const products = [];
  const rows = document.querySelectorAll("#offerProductsTable tr");
  let subTotal = 0;

  rows.forEach((row) => {
    const productSelect = row.querySelector("select");
    const qtyInput = row.querySelectorAll('input[type="number"]')[0];
    const priceInput = row.querySelectorAll('input[type="number"]')[1];

    if (productSelect && qtyInput && priceInput) {
      const productId = productSelect.value;
      const quantity = parseFloat(qtyInput.value) || 0;
      const unitPrice = parseFloat(priceInput.value) || 0;

      if (productId && quantity > 0 && unitPrice > 0) {
        const product = firebaseData.products.find((p) => p.id === productId);
        const total = quantity * unitPrice;
        products.push({
          productId: productId,
          productName: product?.name || "Bilinmeyen",
          quantity: quantity,
          unitPrice: unitPrice,
          total: total,
        });
        subTotal += total;
      }
    }
  });

  if (products.length === 0) {
    showNotification("Hata", "Lütfen en az bir ürün ekleyin.", "error");
    return;
  }

  const senderEmail = prompt(
    "Teklifi göndermek için e-posta hesabınızı girin:"
  );
  if (!senderEmail) {
    showNotification("İptal", "Teklif gönderme iptal edildi.", "warning");
    return;
  }

  // Teklifi kaydet ve gönder
  const tax = subTotal * 0.2;
  const grandTotal = subTotal + tax;
  const offerNo = `TKF-${new Date().getFullYear()}-${String(
    (firebaseData.offers?.length || 0) + 1
  ).padStart(4, "0")}`;
  const offerDate = document.getElementById("offerDate").value;
  const offerValidity = document.getElementById("offerValidity").value;

  const offerData = {
    no: offerNo,
    companyId: companyId,
    date: offerDate,
    validity: offerValidity,
    products: products,
    subtotal: subTotal,
    tax: tax,
    total: grandTotal,
    status: "Gönderildi",
    sentDate: new Date().toISOString(),
    sentFrom: senderEmail,
    sentTo: company.email,
    createdAt: new Date().toISOString(),
    active: true,
  };

  try {
    await window.firestoreService.addOffer(offerData);

    // E-posta gönderimi simülasyonu
    console.log(
      `Sending offer ${offerNo} to ${company.email} from ${senderEmail}`
    );

    showNotification(
      "Teklif Gönderildi",
      `Teklif ${offerNo} numarası ile ${company.name} firmasına başarıyla gönderildi.`,
      "success"
    );

    // Formu temizle
    document.getElementById("offerProductsTable").innerHTML = "";
    document.getElementById("offerSubtotal").textContent = "0 $";
    document.getElementById("offerTax").textContent = "0 $";
    document.getElementById("offerTotal").textContent = "0 $";
    document.getElementById("companySelectionBtn").innerHTML =
      '<i class="fas fa-building" style="margin-right: 8px;"></i>Firma seçiniz...';
    document.getElementById("companySelectionBtn").classList.remove("selected");
    document.getElementById("offerCompanyId").value = "";
    document.getElementById("offerCompany").value = "";

    await loadFirebaseData();
  } catch (error) {
    console.error("Teklif gönderme hatası:", error);
    showNotification("Hata", "Teklif gönderilirken hata oluştu.", "error");
  }
}

// View offer - Firebase
function viewOffer(offerId) {
  const offer = firebaseData.offers.find((o) => o.id === offerId);
  if (offer) {
    const company = firebaseData.companies.find(
      (c) => c.id === offer.companyId
    );
    showNotification(
      "Teklif Görüntüleniyor",
      `Teklif ${offer.no} detayları yükleniyor.`,
      "info"
    );
  }
}

// Edit offer - Firebase
function editOffer(offerId) {
  showNotification("Düzenleme", `Teklif düzenleme moduna geçiliyor.`, "info");
  showPage("teklifHazirla");
}

// Delete offer - Firebase
async function deleteOffer(offerId) {
  if (confirm(`Bu teklifi silmek istediğinize emin misiniz?`)) {
    try {
      await window.firestoreService.deleteOffer(offerId);
      showNotification(
        "Teklif Silindi",
        `Teklif başarıyla silindi.`,
        "success"
      );
      await loadFirebaseData();
      if (currentPage === "teklifListesi") loadTeklifListesi();
    } catch (error) {
      console.error("Teklif silme hatası:", error);
      showNotification("Hata", "Teklif silinirken hata oluştu.", "error");
    }
  }
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
                                ${firebaseData.stock
                                  .map(
                                    (stock) => `
                                    <tr>
                                        <td>
                                            <input type="checkbox" 
                                                   id="rm_${stock.id}" 
                                                   value="${stock.id}"
                                                   onchange="toggleRawMaterial('${
                                                     stock.id
                                                   }')"
                                                   ${
                                                     isRawMaterialSelected(
                                                       stock.id
                                                     )
                                                       ? "checked"
                                                       : ""
                                                   }>
                                        </td>
                                        <td>${stock.code}</td>
                                        <td><strong>${stock.name}</strong></td>
                                        <td>
                                            <span class="badge ${
                                              stock.quantity > stock.minStock
                                                ? "success"
                                                : stock.quantity > 0
                                                ? "warning"
                                                : "danger"
                                            }">
                                                ${stock.quantity}
                                            </span>
                                        </td>
                                        <td>${stock.unit}</td>
                                    </tr>
                                `
                                  )
                                  .join("")}
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
  document.body.insertAdjacentHTML("beforeend", modalHTML);
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
  const container = document.getElementById("rawMaterialsContainer");
  const listDiv = document.getElementById("rawMaterialsList");
  const noItemsDiv = document.getElementById("noRawMaterials");
  const hiddenInput = document.getElementById("productFormRawMaterials");

  if (tempSelectedRawMaterials.length > 0) {
    container.innerHTML = tempSelectedRawMaterials
      .map((rmId) => {
        const rm = firebaseData.stock.find((s) => s.id === rmId);
        return `
                <div style="background: var(--white); border: 2px solid var(--primary); border-radius: 20px; padding: 8px 12px; display: flex; align-items: center; gap: 8px;">
                    <span style="font-weight: 500;">${rm.name}</span>
                    <button type="button" onclick="removeRawMaterial('${rmId}')" style="background: none; border: none; color: var(--danger); cursor: pointer;">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
            `;
      })
      .join("");

    listDiv.style.display = "block";
    noItemsDiv.style.display = "none";
    hiddenInput.value = tempSelectedRawMaterials.join(",");
  } else {
    listDiv.style.display = "none";
    noItemsDiv.style.display = "block";
    hiddenInput.value = "";
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
  const modal = document.getElementById("rawMaterialSelectModal");
  if (modal) {
    modal.remove();
  }
}

function filterRawMaterials(query) {
  const rows = document.querySelectorAll("#rawMaterialTableBody tr");
  rows.forEach((row) => {
    const text = row.textContent.toLowerCase();
    row.style.display = text.includes(query.toLowerCase()) ? "" : "none";
  });
}

// Add company - Firebase
async function addCompany() {
  const name = prompt("Firma adı:");
  const taxNo = prompt("Vergi No:");
  if (name && taxNo) {
    const newCompany = {
      name: name,
      taxNo: taxNo,
      phone: "000 000 0000",
      email: "",
      address: "Adres",
      website: "",
      customerType: "normal",
      acceptsEmailNotifications: false,
      isFavorite: false,
      image: "",
      active: true,
    };

    try {
      await window.firestoreService.addCompany(newCompany);
      showNotification(
        "Firma Eklendi",
        "Yeni firma başarıyla eklendi.",
        "success"
      );
      await loadFirebaseData();
      loadFirmalar();
    } catch (error) {
      console.error("Firma ekleme hatası:", error);
      showNotification("Hata", "Firma eklenirken hata oluştu.", "error");
    }
  }
}

// Edit company - Firebase
async function editCompany(companyId) {
  const company = firebaseData.companies.find((c) => c.id === companyId);
  if (company) {
    const newName = prompt("Yeni firma adı:", company.name);
    if (newName) {
      try {
        await window.firestoreService.updateCompany(companyId, {
          ...company,
          name: newName,
        });
        showNotification(
          "Firma Güncellendi",
          "Firma bilgileri güncellendi.",
          "success"
        );
        await loadFirebaseData();
        loadFirmalar();
      } catch (error) {
        console.error("Firma güncelleme hatası:", error);
        showNotification("Hata", "Firma güncellenirken hata oluştu.", "error");
      }
    }
  }
}

async function deleteCompany(companyId) {
  const company = firebaseData.companies.find((c) => c.id === companyId);
  if (!company) {
    showNotification("Hata", "Firma bulunamadı.", "error");
    return;
  }

  const relatedOffers = firebaseData.offers.filter(
    (o) => o.companyId === companyId
  );

  if (relatedOffers.length > 0) {
    const confirmDelete = confirm(
      `Bu firmaya ait ${relatedOffers.length} adet teklif bulunmaktadır.\n\nYine de firmayı silmek istiyor musunuz?`
    );
    if (!confirmDelete) return;
  }

  if (confirm(`${company.name} firmasını silmek istediğinize emin misiniz?`)) {
    try {
      await window.firestoreService.deleteCompany(companyId);
      showNotification("Firma Silindi", "Firma başarıyla silindi.", "success");
      await loadFirebaseData();
      loadFirmalar();
    } catch (error) {
      console.error("Firma silme hatası:", error);
      showNotification("Hata", "Firma silinirken hata oluştu.", "error");
    }
  }
}

// Change password
// changePassword fonksiyonunu güncelle
async function changePassword() {
  const currentPassword = document.getElementById("currentPassword").value;
  const newPassword = document.getElementById("newPassword").value;
  const confirmPassword = document.getElementById("confirmPassword").value;

  // Boş alan kontrolü
  if (!currentPassword || !newPassword || !confirmPassword) {
    showNotification("Hata", "Lütfen tüm alanları doldurun.", "error");
    return;
  }

  // Mevcut şifre kontrolü
  if (currentUser.password !== currentPassword) {
    showNotification("Hata", "Mevcut şifreniz yanlış.", "error");
    document.getElementById("currentPassword").value = "";
    return;
  }

  // Yeni şifre eşleşme kontrolü
  if (newPassword !== confirmPassword) {
    showNotification("Hata", "Yeni şifreler eşleşmiyor.", "error");
    document.getElementById("confirmPassword").value = "";
    return;
  }

  try {
    // Firebase'de güncelle
    const updatedUserData = {
      ...currentUser,
      password: newPassword,
    };

    await window.firestoreService.updateUser(currentUser.id, updatedUserData);

    // Local currentUser objesini güncelle
    currentUser.password = newPassword;

    // Firebase'den veriyi yeniden çek
    await loadFirebaseData();

    // Form alanlarını temizle
    document.getElementById("currentPassword").value = "";
    document.getElementById("newPassword").value = "";
    document.getElementById("confirmPassword").value = "";

    showNotification("Başarılı", "Şifreniz başarıyla değiştirildi.", "success");

    // Güvenlik için 3 saniye sonra otomatik çıkış yap
    setTimeout(() => {
      showNotification(
        "Bilgi",
        "Güvenlik nedeniyle çıkış yapılıyor. Lütfen yeni şifrenizle giriş yapın.",
        "info"
      );
      setTimeout(() => {
        logout();
      }, 2000);
    }, 3000);
  } catch (error) {
    console.error("Şifre değiştirme hatası:", error);
    showNotification(
      "Hata",
      "Şifre değiştirilirken bir hata oluştu. Lütfen tekrar deneyin.",
      "error"
    );
  }
}

// Show notification
function showNotification(title, message, type = "info") {
  const notification = document.getElementById("notification");
  notification.querySelector(".notification-title").textContent = title;
  notification.querySelector(".notification-message").textContent = message;
  notification.className = `notification ${type} show`;
  notification.querySelector(".notification-icon i").className =
    type === "success"
      ? "fas fa-check"
      : type === "error"
      ? "fas fa-times"
      : type === "warning"
      ? "fas fa-exclamation-triangle"
      : "fas fa-info-circle";

  setTimeout(() => {
    notification.classList.remove("show");
  }, 5000);
}

// Print offer function - preview'den yazdır
function printOffer() {
  window.print();
}

// Initialize app on load - Firebase integrated
document.addEventListener("DOMContentLoaded", function () {
  console.log("🚀 Furkatech FZA-ERP sistemi başlatılıyor...");

  document.getElementById("loginContainer").style.display = "flex";
  document.getElementById("appContainer").style.display = "none";

    const revisionData = localStorage.getItem('revisionOfferData');
    if (revisionData && currentPage === 'teklifHazirla') {
        const offerData = JSON.parse(revisionData);
        fillOfferFormFromRevision(offerData);
        localStorage.removeItem('revisionOfferData');
    }
  // Firebase bağlantısını test et
  console.log(" Database bağlantısı kontrol ediliyor...");
});


window.onclick = function (event) {
  const modals = document.querySelectorAll(".modal");
  modals.forEach((modal) => {
    // Modal'ın kendisine tıklanırsa kapat, modal-content'e tıklanırsa kapatma
    if (event.target === modal && !event.target.closest(".modal-content")) {
      modal.classList.remove("show");
    }
  });
};


function filterRawMaterialCheckboxes() {
  const search = document
    .getElementById("rawMaterialSearch")
    .value.toLowerCase();
  const items = document.querySelectorAll(".raw-material-checkbox-item");

  items.forEach((item) => {
    const text = item.textContent.toLowerCase();
    item.style.display = text.includes(search) ? "flex" : "none";
  });
}

async function saveRecipeWithCheckboxes(recipeId = null) {
  const name = document.getElementById("recipeName").value;
  const productId = document.getElementById("recipeProduct").value;
  const quantityPerUnit = parseFloat(
    document.getElementById("recipeQuantityPerUnit").value
  );

  // Seçili checkbox'ları topla
  const rawMaterials = [];
  document
    .querySelectorAll(".raw-material-checkbox:checked")
    .forEach((checkbox) => {
      rawMaterials.push(checkbox.value);
    });

  if (!name || !productId || rawMaterials.length === 0) {
    showNotification(
      "Hata",
      "Lütfen tüm alanları doldurun ve en az bir hammadde seçin.",
      "error"
    );
    return;
  }

  const recipeData = {
    name: name,
    productId: productId,
    rawMaterials: rawMaterials,
    quantityPerUnit: quantityPerUnit,
    active: true,
  };

  try {
    if (recipeId) {
      await window.firestoreService.updateRecipe(recipeId, recipeData);
      showNotification("Güncellendi", "Reçete güncellendi.", "success");
    } else {
      await window.firestoreService.addRecipe(recipeData);
      showNotification("Eklendi", "Yeni reçete eklendi.", "success");
    }

    closeModal("recipeModal");
    await loadFirebaseData();
    if (currentPage === "urunReceteleri") loadUrunReceteleri();
  } catch (error) {
    console.error("Reçete kaydetme hatası:", error);
    showNotification("Hata", "Reçete kaydedilemedi.", "error");
  }
}

function updateSelectedRawMaterialCount() {
  const checkboxes = document.querySelectorAll(
    ".raw-material-checkbox:checked"
  );
  document.getElementById(
    "selectedRawMaterialCount"
  ).textContent = `${checkboxes.length} hammadde seçili`;
}

function clearRawMaterialSelection() {
  document.querySelectorAll(".raw-material-checkbox").forEach((checkbox) => {
    checkbox.checked = false;
  });
  updateSelectedRawMaterialCount();
}

// Reçete için geçici seçili hammaddeler listesi
let tempRecipeRawMaterials = [];
async function saveSimpleRecipe(recipeId = null) {
  const name = document.getElementById("recipeName").value;
  const productId = document.getElementById("recipeProduct").value;
  const quantityPerUnit = parseFloat(
    document.getElementById("recipeQuantityPerUnit").value
  );
  const select = document.getElementById("recipeRawMaterials");

  const rawMaterials = [];
  for (let option of select.selectedOptions) {
    rawMaterials.push(option.value);
  }

  if (!name || !productId || rawMaterials.length === 0) {
    showNotification("Hata", "Lütfen tüm alanları doldurun.", "error");
    return;
  }

  const recipeData = {
    name: name,
    productId: productId,
    rawMaterials: rawMaterials,
    quantityPerUnit: quantityPerUnit,
    active: true,
  };

  try {
    if (recipeId) {
      await window.firestoreService.updateRecipe(recipeId, recipeData);
      showNotification("Güncellendi", "Reçete güncellendi.", "success");
    } else {
      await window.firestoreService.addRecipe(recipeData);
      showNotification("Eklendi", "Yeni reçete eklendi.", "success");
    }

    closeModal("recipeModal");
    await loadFirebaseData();
    if (currentPage === "urunReceteleri") loadUrunReceteleri();
  } catch (error) {
    console.error("Reçete kaydetme hatası:", error);
    showNotification("Hata", "Reçete kaydedilemedi.", "error");
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
                                ${firebaseData.stock
                                  .map((stock) => {
                                    const stockStatus =
                                      stock.quantity > stock.minStock
                                        ? "success"
                                        : stock.quantity > 0
                                        ? "warning"
                                        : "danger";
                                    const stockLabel =
                                      stock.quantity > stock.minStock
                                        ? "Yeterli"
                                        : stock.quantity > 0
                                        ? "Kritik"
                                        : "Tükendi";
                                    return `
                                    <tr>
                                        <td>
                                            <input type="checkbox" 
                                                   id="recipe_rm_${stock.id}" 
                                                   value="${stock.id}"
                                                   onchange="toggleRecipeRawMaterial('${
                                                     stock.id
                                                   }')"
                                                   ${
                                                     isRecipeRawMaterialSelected(
                                                       stock.id
                                                     )
                                                       ? "checked"
                                                       : ""
                                                   }>
                                        </td>
                                        <td><code>${stock.code}</code></td>
                                        <td>
                                            <strong>${stock.name}</strong>
                                            ${
                                              stock.barcode
                                                ? `<br><small style="color: var(--gray-500);">Barkod: ${stock.barcode}</small>`
                                                : ""
                                            }
                                        </td>
                                        <td style="text-align: center;">
                                            <span style="font-weight: 600;">${
                                              stock.quantity
                                            }</span>
                                        </td>
                                        <td style="text-align: center;">
                                            <span style="color: var(--gray-600);">${
                                              stock.minStock
                                            }</span>
                                        </td>
                                        <td>${stock.unit}</td>
                                        <td>
                                            <span class="badge ${stockStatus}">${stockLabel}</span>
                                        </td>
                                    </tr>
                                `;
                                  })
                                  .join("")}
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

  document.body.insertAdjacentHTML("beforeend", modalHTML);
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
    tempRecipeRawMaterials = firebaseData.stock.map((s) => s.id);
  } else {
    tempRecipeRawMaterials = [];
  }

  // Tüm checkbox'ları güncelle
  document
    .querySelectorAll('#recipeRawMaterialTableBody input[type="checkbox"]')
    .forEach((cb) => {
      cb.checked = checked;
    });

  updateRecipeSelectedCount();
}

function updateRecipeSelectedCount() {
  const countElement = document.getElementById("recipeSelectedCount");
  if (countElement) {
    countElement.textContent = tempRecipeRawMaterials.length;
  }
}

function confirmRecipeRawMaterialSelection() {
  updateRecipeSelectedRawMaterialsDisplay();
  closeRecipeRawMaterialModal();
}

function updateRecipeSelectedRawMaterialsDisplay() {
  const container = document.getElementById("recipeRawMaterialsContainer");
  const listDiv = document.getElementById("recipeRawMaterialsList");
  const noItemsDiv = document.getElementById("recipeNoRawMaterials");
  const hiddenInput = document.getElementById("recipeRawMaterials");

  if (tempRecipeRawMaterials.length > 0) {
    container.innerHTML = tempRecipeRawMaterials
      .map((rmId) => {
        const rm = firebaseData.stock.find((s) => s.id === rmId);
        const stockStatus =
          rm.quantity > rm.minStock
            ? "success"
            : rm.quantity > 0
            ? "warning"
            : "danger";
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
      })
      .join("");

    listDiv.style.display = "block";
    noItemsDiv.style.display = "none";
    hiddenInput.value = tempRecipeRawMaterials.join(",");
  } else {
    listDiv.style.display = "none";
    noItemsDiv.style.display = "block";
    hiddenInput.value = "";
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
  const modal = document.getElementById("recipeRawMaterialSelectModal");
  if (modal) {
    modal.remove();
  }
}

function filterRecipeRawMaterials(query) {
  const rows = document.querySelectorAll("#recipeRawMaterialTableBody tr");
  rows.forEach((row) => {
    const text = row.textContent.toLowerCase();
    row.style.display = text.includes(query.toLowerCase()) ? "" : "none";
  });
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
  tempRecipeRawMaterials = firebaseData.stock.map((s) => s.id);
  updateEditRecipeDisplay();
}

function selectCriticalRawMaterials() {
  tempRecipeRawMaterials = firebaseData.stock
    .filter((s) => s.quantity <= s.minStock)
    .map((s) => s.id);
  updateEditRecipeDisplay();
}

function filterEditRawMaterialCheckboxes() {
  const search = document
    .getElementById("rawMaterialSearch")
    .value.toLowerCase();
  const items = document.querySelectorAll(".raw-material-checkbox-item");

  items.forEach((item) => {
    const text = item.textContent.toLowerCase();
    item.style.display = text.includes(search) ? "flex" : "none";
  });
}

function updateEditRecipeDisplay() {
  // Seçili hammaddeleri güncelle
  const displayDiv = document.getElementById("selectedRawMaterialsDisplay");
  if (displayDiv) {
    displayDiv.innerHTML =
      tempRecipeRawMaterials.length > 0
        ? '<div style="display: flex; flex-wrap: wrap; gap: 8px;">' +
          tempRecipeRawMaterials
            .map((rmId) => {
              const rm = firebaseData.stock.find((s) => s.id === rmId);
              const stockStatus = rm
                ? rm.quantity > rm.minStock
                  ? "success"
                  : rm.quantity > 0
                  ? "warning"
                  : "danger"
                : "danger";
              return `
                    <div style="background: white; border: 2px solid var(--primary); border-radius: 20px; padding: 6px 12px; display: flex; align-items: center; gap: 8px;">
                        <span style="font-weight: 500; font-size: 13px;">${
                          rm?.name || "Bilinmeyen"
                        }</span>
                        <span class="badge ${stockStatus}" style="font-size: 10px;">
                            ${rm ? rm.quantity + " " + rm.unit : "Stok yok"}
                        </span>
                        <button type="button" onclick="removeFromTempRawMaterials('${rmId}')" 
                            style="background: var(--danger); border: none; color: white; cursor: pointer; width: 18px; height: 18px; border-radius: 50%; display: flex; align-items: center; justify-content: center; padding: 0;">
                            <i class="fas fa-times" style="font-size: 10px;"></i>
                        </button>
                    </div>
                `;
            })
            .join("") +
          "</div>"
        : '<div style="text-align: center; color: var(--gray-500); padding: 15px;">Henüz hammadde seçilmedi</div>';
  }

  // Checkbox'ları güncelle
  document.querySelectorAll(".raw-material-checkbox").forEach((checkbox) => {
    const isSelected = tempRecipeRawMaterials.includes(checkbox.value);
    checkbox.checked = isSelected;
    checkbox.closest(".raw-material-checkbox-item").style.background =
      isSelected ? "var(--primary-light, #f0f0ff)" : "white";
  });

  // Sayacı güncelle
  const countElement = document.getElementById("selectedRawMaterialCount");
  if (countElement) {
    countElement.textContent = `${tempRecipeRawMaterials.length} hammadde seçili`;
  }

  // Header'daki badge'i güncelle
  const badge = document.querySelector(".modal-body .form-label span");
  if (badge) {
    badge.textContent = `${tempRecipeRawMaterials.length} seçili`;
  }
}

async function saveEditedRecipe(recipeId) {
  const name = document.getElementById("recipeName").value;
  const productId = document.getElementById("recipeProduct").value;
  const quantityPerUnit = parseFloat(
    document.getElementById("recipeQuantityPerUnit").value
  );

  if (!name || !productId || tempRecipeRawMaterials.length === 0) {
    showNotification(
      "Hata",
      "Lütfen tüm alanları doldurun ve en az bir hammadde seçin.",
      "error"
    );
    return;
  }

  const recipeData = {
    name: name,
    productId: productId,
    rawMaterials: tempRecipeRawMaterials,
    quantityPerUnit: quantityPerUnit,
    active: true,
    updatedAt: new Date().toISOString(),
  };

  try {
    await window.firestoreService.updateRecipe(recipeId, recipeData);
    showNotification("Güncellendi", "Reçete başarıyla güncellendi.", "success");

    tempRecipeRawMaterials = [];
    closeModal("recipeModal");
    await loadFirebaseData();
    if (currentPage === "urunReceteleri") loadUrunReceteleri();
  } catch (error) {
    console.error("Reçete güncelleme hatası:", error);
    showNotification("Hata", "Reçete güncellenirken hata oluştu.", "error");
  }
}



function previewSavedOffer(offerId) {
  const offer = firebaseData.offers.find((o) => o.id === offerId);
  if (!offer) {
    showNotification("Hata", "Teklif bulunamadı.", "error");
    return;
  }

  const company = firebaseData.companies.find((c) => c.id === offer.companyId);
  if (!company) {
    showNotification("Hata", "Firma bilgisi bulunamadı.", "error");
    return;
  }

  // Ürünleri hazırla
  const items = offer.products || [];
  
  // Her ürün için teknik özellikler ekle
  const enrichedItems = items.map((item, index) => {
    const product = firebaseData.products.find((p) => p.id === item.productId);
    
    // Teknik özellikler hazırla
    let technicalSpecs = [];
    if (product?.category) technicalSpecs.push(`Kategori: ${product.category}`);
    if (product?.code) technicalSpecs.push(`Kod: ${product.code}`);
    if (product?.description) technicalSpecs.push(`${product.description}`);
    
    return {
      ...item,
      name: product?.name || item.productName || "Bilinmeyen Ürün",
      code: product?.code || "-",
      technicalSpecs: technicalSpecs.join(" • ") || "Teknik özellik belirtilmemiş",
      unit: "Adet"
    };
  });

  const subtotal = offer.subtotal || 0;
  const tax = offer.tax || 0;
  const total = offer.total || 0;

  // Şirket bilgileri
  const companyInfo = {
    name: "MOTTO ENGINEERING OF LIGHT",
    address: "Organize Sanayi Bölgesi 3. Cadde No:45",
    city: "İstanbul, Türkiye", 
    phone: "+90 212 555 00 00",
    email: "info@motto.com.tr",
    website: "www.motto.com.tr",
    taxNo: "123 456 789",
    logo: "img/logo/motto.png"
  };

  const previewHtml = `
        <div style="max-width: 210mm; margin: 0 auto; background: white; font-family: 'Arial', sans-serif; color: #333; line-height: 1.4;">
            
            <!-- Letterhead -->
            <div style="border-bottom: 3px solid #2563eb; margin-bottom: 30px; padding-bottom: 20px;">
                <table style="width: 100%; border-collapse: collapse;">
                    <tr>
                        <td style="width: 40%; vertical-align: top;">
                            <img src="${companyInfo.logo}" alt="Motto Logo" style="height: 60px; margin-bottom: 15px;">
                            <h2 style="font-size: 18px; font-weight: bold; color: #1f2937; margin: 0 0 10px 0;">${companyInfo.name}</h2>
                            <div style="font-size: 11px; color: #666; line-height: 1.6;">
                                ${companyInfo.address}<br>
                                ${companyInfo.city}<br>
                                Tel: ${companyInfo.phone}<br>
                                E-mail: ${companyInfo.email}<br>
                                Web: ${companyInfo.website}<br>
                                Vergi No: ${companyInfo.taxNo}
                            </div>
                        </td>
                        <td style="width: 60%; text-align: right; vertical-align: top;">
                            <div style="background: #2563eb; color: white; padding: 20px; display: inline-block; border-radius: 8px;">
                                <h1 style="font-size: 24px; font-weight: bold; margin: 0 0 15px 0;">TEKLİF</h1>
                                <table style="color: white; font-size: 13px; line-height: 1.8;">
                                    <tr><td style="padding: 2px 0; width: 120px;">Teklif No:</td><td style="font-weight: bold;">${offer.offerNo || offer.no}</td></tr>
                                    <tr><td style="padding: 2px 0;">Teklif Tarihi:</td><td style="font-weight: bold;">${new Date(offer.date).toLocaleDateString("tr-TR")}</td></tr>
                                    <tr><td style="padding: 2px 0;">Proje:</td><td style="font-weight: bold;">${offer.projectName || 'Belirtilmemiş'}</td></tr>
                                    <tr><td style="padding: 2px 0;">Geçerlilik:</td><td style="font-weight: bold;">${offer.validity}</td></tr>
                                    <tr><td style="padding: 2px 0;">Durum:</td><td style="font-weight: bold; color: ${offer.status === 'Onaylandı' ? '#4ade80' : offer.status === 'Beklemede' ? '#fbbf24' : '#f87171'};">${offer.status}</td></tr>
                                </table>
                            </div>
                        </td>
                    </tr>
                </table>
            </div>

            <!-- Client Information -->
            <div style="margin-bottom: 30px;">
                <h3 style="background: #f8f9fa; padding: 10px; margin: 0 0 15px 0; font-size: 14px; color: #2563eb; font-weight: bold; border-left: 4px solid #2563eb;">SAYIN MÜŞTERİMİZ</h3>
                <table style="width: 100%; font-size: 13px;">
                    <tr>
                        <td style="width: 25%; font-weight: bold; color: #555; padding: 5px 0;">Firma Adı:</td>
                        <td style="color: #333; padding: 5px 0;">${company.name}</td>
                    </tr>
                    ${offer.companyContact ? `
                    <tr>
                        <td style="font-weight: bold; color: #555; padding: 5px 0;">Yetkili Kişi:</td>
                        <td style="color: #333; padding: 5px 0;">${offer.companyContact}</td>
                    </tr>` : ''}
                    <tr>
                        <td style="font-weight: bold; color: #555; padding: 5px 0;">Vergi No:</td>
                        <td style="color: #333; padding: 5px 0;">${company.taxNo}</td>
                    </tr>
                    ${company.phone ? `
                    <tr>
                        <td style="font-weight: bold; color: #555; padding: 5px 0;">Telefon:</td>
                        <td style="color: #333; padding: 5px 0;">${company.phone}</td>
                    </tr>` : ''}
                    ${company.email ? `
                    <tr>
                        <td style="font-weight: bold; color: #555; padding: 5px 0;">E-posta:</td>
                        <td style="color: #333; padding: 5px 0;">${company.email}</td>
                    </tr>` : ''}
                    ${company.address ? `
                    <tr>
                        <td style="font-weight: bold; color: #555; padding: 5px 0; vertical-align: top;">Adres:</td>
                        <td style="color: #333; padding: 5px 0;">${company.address}</td>
                    </tr>` : ''}
                </table>
            </div>
            
            <!-- Products Table -->
            <div style="margin-bottom: 30px;">
                <h3 style="background: #f8f9fa; padding: 10px; margin: 0 0 15px 0; font-size: 14px; color: #2563eb; font-weight: bold; border-left: 4px solid #2563eb;">TEKLİF KALEMLERI</h3>
                
                <table style="width: 100%; border-collapse: collapse; border: 1px solid #ddd;">
                    <thead>
                        <tr style="background: #f8f9fa;">
                            <th style="border: 1px solid #ddd; padding: 12px 8px; text-align: center; font-size: 12px; font-weight: bold; color: #333;">S.NO</th>
                            <th style="border: 1px solid #ddd; padding: 12px 8px; text-align: left; font-size: 12px; font-weight: bold; color: #333;">ÜRÜN ADI</th>
                            <th style="border: 1px solid #ddd; padding: 12px 8px; text-align: left; font-size: 12px; font-weight: bold; color: #333;">TEKNİK ÖZELLİKLER</th>
                            <th style="border: 1px solid #ddd; padding: 12px 8px; text-align: center; font-size: 12px; font-weight: bold; color: #333;">MİKTAR</th>
                            <th style="border: 1px solid #ddd; padding: 12px 8px; text-align: center; font-size: 12px; font-weight: bold; color: #333;">BİRİM</th>
                            <th style="border: 1px solid #ddd; padding: 12px 8px; text-align: right; font-size: 12px; font-weight: bold; color: #333;">BİRİM FİYAT</th>
                            <th style="border: 1px solid #ddd; padding: 12px 8px; text-align: right; font-size: 12px; font-weight: bold; color: #333;">TOPLAM</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${enrichedItems
                          .map(
                            (item, index) => `
                            <tr>
                                <td style="border: 1px solid #ddd; padding: 10px 8px; text-align: center; font-weight: bold; color: #2563eb;">
                                    ${index + 1}
                                </td>
                                <td style="border: 1px solid #ddd; padding: 10px 8px; font-size: 13px; font-weight: bold; color: #333;">
                                    ${item.name}
                                </td>
                                <td style="border: 1px solid #ddd; padding: 10px 8px; font-size: 11px; color: #666; line-height: 1.4;">
                                    ${item.technicalSpecs}
                                </td>
                                <td style="border: 1px solid #ddd; padding: 10px 8px; text-align: center; font-weight: bold; font-size: 13px;">
                                    ${item.quantity}
                                </td>
                                <td style="border: 1px solid #ddd; padding: 10px 8px; text-align: center; font-size: 12px; color: #666;">
                                    ${item.unit}
                                </td>
                                <td style="border: 1px solid #ddd; padding: 10px 8px; text-align: right; font-size: 13px; font-weight: bold;">
                                    ${item.unitPrice.toFixed(2)} $
                                </td>
                                <td style="border: 1px solid #ddd; padding: 10px 8px; text-align: right; font-size: 13px; font-weight: bold; background: #f8f9fa;">
                                    ${item.total.toFixed(2)} $
                                </td>
                            </tr>
                        `
                          )
                          .join("")}
                    </tbody>
                </table>
            </div>
            
            <!-- Total Section -->
            <div style="margin-bottom: 30px;">
                <table style="width: 100%; border-collapse: collapse;">
                    <tr>
                        <td style="width: 60%;"></td>
                        <td style="width: 40%;">
                            <table style="width: 100%; border-collapse: collapse; border: 1px solid #ddd;">
                                <tr style="background: #f8f9fa;">
                                    <td style="border: 1px solid #ddd; padding: 10px; font-weight: bold; font-size: 13px;">ARA TOPLAM</td>
                                    <td style="border: 1px solid #ddd; padding: 10px; text-align: right; font-weight: bold; font-size: 13px;">${subtotal.toFixed(2)} $</td>
                                </tr>
                                <tr style="background: #f8f9fa;">
                                    <td style="border: 1px solid #ddd; padding: 10px; font-weight: bold; font-size: 13px;">KDV (%18)</td>
                                    <td style="border: 1px solid #ddd; padding: 10px; text-align: right; font-weight: bold; font-size: 13px;">${tax.toFixed(2)} $</td>
                                </tr>
                                <tr style="background: #2563eb; color: white;">
                                    <td style="border: 1px solid #2563eb; padding: 15px; font-weight: bold; font-size: 14px;">GENEL TOPLAM</td>
                                    <td style="border: 1px solid #2563eb; padding: 15px; text-align: right; font-weight: bold; font-size: 16px;">${total.toFixed(2)} $</td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                </table>
            </div>
            
            <!-- Terms and Conditions -->
            <div style="margin-bottom: 30px;">
                <h3 style="background: #f8f9fa; padding: 10px; margin: 0 0 15px 0; font-size: 14px; color: #2563eb; font-weight: bold; border-left: 4px solid #2563eb;">GENEL ŞARTLAR</h3>
                <div style="font-size: 11px; color: #555; line-height: 1.6;">
                    <p style="margin: 8px 0;">• Bu teklif <strong>${offer.validity}</strong> süreyle geçerlidir.</p>
                    <p style="margin: 8px 0;">• Teklif kabul edildiği takdirde sipariş onayı gönderilecektir.</p>
                    <p style="margin: 8px 0;">• Fiyatlar KDV dahildir ve Dolar ($) cinsindendir.</p>
                    <p style="margin: 8px 0;">• Teslimat süresi sipariş onayından sonra belirlenecektir.</p>
                    <p style="margin: 8px 0;">• Ödeme şartları: Sipariş ile birlikte %50 peşin, teslimatta %50 kalan bakiye.</p>
                    <p style="margin: 8px 0;">• Force majeure durumlarında teslimat süreleri uzayabilir.</p>
                </div>
            </div>

            <!-- Footer -->
            <div style="text-align: center; padding-top: 20px; border-top: 1px solid #ddd;">
                <div style="font-size: 10px; color: #888; margin-bottom: 10px;">
                    Bu teklif ${new Date(offer.createdAt).toLocaleDateString('tr-TR')} tarihinde elektronik ortamda oluşturulmuştur.
                </div>
                <div style="font-size: 12px; font-weight: bold; color: #2563eb;">
                    ${companyInfo.name} - ${companyInfo.phone} - ${companyInfo.email}
                </div>
            </div>
        </div>
    `;

  // Modal oluştur
  let modal = document.getElementById("offerPreviewModal");
  if (!modal) {
    const modalHTML = `
      <div id="offerPreviewModal" class="modal">
        <div class="modal-content" style="max-width: 95vw; max-height: 95vh; overflow-y: auto;">
          <div class="modal-header" style="background: #2563eb; color: white;">
            <h3 class="modal-title"><i class="fas fa-file-alt"></i> Teklif Önizleme - ${offer.offerNo || offer.no}</h3>
            <button class="modal-close" onclick="closeModal('offerPreviewModal')" style="color: white;">
              <i class="fas fa-times"></i>
            </button>
          </div>
          <div class="modal-body" id="offerPreviewBody" style="padding: 20px; background: #f8f9fa;"></div>
          <div class="modal-footer">
            <button class="btn btn-primary" onclick="printOffer()">
              <i class="fas fa-print"></i> Yazdır
            </button>
            <button class="btn btn-outline" onclick="closeModal('offerPreviewModal')">Kapat</button>
          </div>
        </div>
      </div>
    `;
    document.body.insertAdjacentHTML("beforeend", modalHTML);
  }

  document.getElementById("offerPreviewBody").innerHTML = previewHtml;
  openModal("offerPreviewModal");
}

function addProductToEditOffer() {
  const tbody = document.getElementById("editOfferProducts");
  const row = tbody.insertRow();

  row.innerHTML = `
        <td>
            <select class="form-control">
                <option value="">Ürün seçiniz...</option>
                ${firebaseData.products
                  .map(
                    (p) => `
                    <option value="${p.id}">${p.name}</option>
                `
                  )
                  .join("")}
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
        <td class="total-cell">0.00 $</td>
        <td>
            <button class="btn btn-sm btn-danger" onclick="this.parentElement.parentElement.remove(); calculateEditOfferTotal()">
                <i class="fas fa-trash"></i>
            </button>
        </td>
    `;
}


function loadRaporlar() {
  // user_activities yetkisini kontrol et
  const canSeeUserReports = hasPermission("user_activities");

  const content = `
        <div class="page-header">
            <h1 class="page-title"><i class="fas fa-chart-bar"></i> Raporlar</h1>
            <p class="page-subtitle">Detaylı analiz ve raporlar</p>
        </div>
        
        ${
          canSeeUserReports
            ? `
        <div class="card" style="margin-bottom: 20px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);">
            <div class="card-body" style="color: white;">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <div>
                        <h4 style="margin: 0; color: white;"><i class="fas fa-users"></i> Kullanıcı Raporları</h4>
                        <p style="margin: 5px 0 0 0; color: rgba(255,255,255,0.8); font-size: 14px;">
                            ${
                              window.firebaseData?.users?.length || 0
                            } kullanıcının detaylı üretim ve performans raporları
                        </p>
                    </div>
                    <button class="btn" style="background: white; color: #667eea; font-weight: 600;" onclick="showPage('kullaniciRaporlari')">
                        <i class="fas fa-chart-line"></i> Raporları Görüntüle
                    </button>
                </div>
            </div>
        </div>
        `
            : ""
        }
        
        <div class="card">
            <div class="card-header">
                <h3 class="card-title">Depo Raporu</h3>
            </div>
            <div class="card-body">
                <div class="table-container">
                    <table class="table">
                        <thead><tr><th>Ürün</th><th>Stok Miktarı</th><th>Son Güncelleme</th></tr></thead>
                        <tbody>
                            ${(window.firebaseData.products || [])
                              .map(
                                (p) => `
                                <tr>
                                    <td>${p.name}</td>
                                    <td>${p.stock || 0} adet</td>
                                    <td>${
                                      p.lastUpdate ||
                                      new Date().toLocaleDateString("tr-TR")
                                    }</td>
                                </tr>
                            `
                              )
                              .join("")}
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
                            ${(window.firebaseData.shipments || [])
                              .map(
                                (s) => `
                                <tr>
                                    <td><strong>${
                                      s.orderNo || "Bilinmeyen"
                                    }</strong></td>
                                    <td>${
                                      s.productName || s.product || "Bilinmeyen"
                                    }</td>
                                    <td>${s.quantity || 0}</td>
                                    <td>${s.date || "-"}</td>
                                </tr>
                            `
                              )
                              .join("")}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    `;
  document.getElementById("pageContent").innerHTML = content;
}

// 5. loadKullaniciAktiviteleri fonksiyonunu da düzelt
function loadKullaniciAktiviteleri() {
  if (!currentUser || !hasPermission("user_activities")) {
    showNotification(
      "Erişim reddedildi",
      "Bu sayfaya erişim yetkiniz bulunmamaktadır",
      "error"
    );
    showPage("dashboard");
    return;
  }

  // Kullanıcı verilerini kontrol et
  if (!window.firebaseData?.users || window.firebaseData.users.length === 0) {
    console.log("⚠️ Kullanıcı aktiviteleri için veri yükleniyor...");
    loadFirebaseData().then(() => {
      loadKullaniciAktiviteleri();
    });
    return;
  }

  const canSeeReports = hasPermission("user_activities");
  const users = window.firebaseData.users || [];

  const content = `
        <div class="page-header">
            <h1 class="page-title"><i class="fas fa-user-clock"></i> Kullanıcı Aktiviteleri</h1>
            <p class="page-subtitle">Kullanıcıların üretimde yaptığı işler ve harcanan süreler (${
              users.length
            } kullanıcı)</p>
        </div>
        
        ${
          canSeeReports
            ? `
        <div class="card" style="margin-bottom: 20px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);">
            <div class="card-body" style="display: flex; justify-content: space-between; align-items: center; color: white;">
                <div>
                    <h4 style="margin: 0; color: white;"><i class="fas fa-chart-line"></i> Detaylı Kullanıcı Raporları</h4>
                    <p style="margin: 5px 0 0 0; color: rgba(255,255,255,0.8); font-size: 14px;">
                        Tüm kullanıcıların detaylı üretim ve performans raporları
                    </p>
                </div>
                <button class="btn" style="background: white; color: #667eea; font-weight: 600;" onclick="showPage('kullaniciRaporlari')">
                    <i class="fas fa-chart-line"></i> Raporları Görüntüle
                </button>
            </div>
        </div>
        `
            : ""
        }
        
        <div class="card">
            <div class="card-header">
                <h3 class="card-title">Kullanıcı Bazlı İş Listesi</h3>
            </div>
            <div class="card-body">
                ${users
                  .map((user) => {
                    const userActivities = [];

                    (window.firebaseData.production || []).forEach((prod) => {
                      (prod.approvals || []).forEach((a) => {
                        if (a.userId === user.id) {
                          const recipe = (
                            window.firebaseData.recipes || []
                          ).find((r) => r.id === prod.recipeId);
                          userActivities.push({
                            orderNo: prod.orderNo,
                            product: prod.product,
                            recipe: recipe ? recipe.name : "Bilinmeyen",
                            department: a.department,
                            date: a.date,
                            timeSpent: a.timeSpent || 0,
                            status: "Onaylandı",
                            type: "approval",
                          });
                        }
                      });

                      (prod.workTimeRecords || []).forEach((record) => {
                        if (record.userId === user.id) {
                          const hasApproval = (prod.approvals || []).some(
                            (a) =>
                              a.userId === user.id &&
                              a.department === record.department
                          );

                          if (!hasApproval) {
                            const recipe = (
                              window.firebaseData.recipes || []
                            ).find((r) => r.id === prod.recipeId);
                            userActivities.push({
                              orderNo: prod.orderNo,
                              product: prod.product,
                              recipe: recipe ? recipe.name : "Bilinmeyen",
                              department: record.department,
                              date: record.date,
                              timeSpent: record.timeSpent || 0,
                              status: "Çalışma Kaydı",
                              type: "workTime",
                            });
                          }
                        }
                      });
                    });

                    userActivities.sort((a, b) => {
                      const dateA = a.date.split(".").reverse().join("-");
                      const dateB = b.date.split(".").reverse().join("-");
                      return new Date(dateB) - new Date(dateA);
                    });

                    const totalHours = userActivities.reduce(
                      (sum, activity) => sum + activity.timeSpent,
                      0
                    );

                    return `
                        <div class="section">
                            <h4 class="section-title">
                                <i class="fas fa-user"></i> ${user.name} (${
                      user.username
                    } - ${getRoleDisplayName(user.role)})
                                <span style="font-size: 14px; color: var(--gray-600); margin-left: 15px;">
                                    <i class="fas fa-clock"></i> Toplam: ${totalHours.toFixed(
                                      1
                                    )} saat
                                    <span style="margin-left: 10px;"><i class="fas fa-tasks"></i> ${
                                      userActivities.length
                                    } çalışma</span>
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
                                        ${
                                          userActivities.length > 0
                                            ? userActivities
                                                .slice(0, 10)
                                                .map(
                                                  (activity) => `
                                            <tr>
                                                <td><strong>${
                                                  activity.orderNo
                                                }</strong></td>
                                                <td>${activity.product}</td>
                                                <td>${activity.recipe}</td>
                                                <td><span class="badge primary">${
                                                  activity.department
                                                }</span></td>
                                                <td>${activity.date}</td>
                                                <td class="time-spent"><strong>${
                                                  activity.timeSpent > 0
                                                    ? activity.timeSpent +
                                                      " saat"
                                                    : "Girilmemiş"
                                                }</strong></td>
                                                <td>
                                                    <span class="badge ${
                                                      activity.type ===
                                                      "approval"
                                                        ? "success"
                                                        : "info"
                                                    }">
                                                        ${activity.status}
                                                    </span>
                                                </td>
                                            </tr>
                                        `
                                                )
                                                .join("")
                                            : '<tr><td colspan="7" class="text-gray-500">Henüz aktivite yok</td></tr>'
                                        }
                                        ${
                                          userActivities.length > 10
                                            ? `
                                        <tr>
                                            <td colspan="7" style="text-align: center; padding: 15px;">
                                                <button class="btn btn-outline btn-sm" onclick="showPage('kullaniciRaporlari')">
                                                    <i class="fas fa-plus"></i> ${
                                                      userActivities.length - 10
                                                    } çalışma daha var - Detayları Gör
                                                </button>
                                            </td>
                                        </tr>
                                        `
                                            : ""
                                        }
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    `;
                  })
                  .join("")}
            </div>
        </div>
    `;
  document.getElementById("pageContent").innerHTML = content;
}

// Next Department - Sabit bölümlere göre


async function shipProduct(productionId) {
  const prod = firebaseData.production.find((p) => p.id === productionId);

  if (!prod) {
    showNotification("Hata", "Üretim bulunamadı.", "error");
    return;
  }

  if (prod.status !== "Tamamlandı") {
    showNotification(
      "Uyarı",
      "Sadece tamamlanmış üretimler sevk edilebilir.",
      "warning"
    );
    return;
  }

  if (prod.shipmentStatus === "Sevk Edildi") {
    showNotification("Bilgi", "Bu ürün zaten sevk edilmiş.", "info");
    return;
  }

  if (
    !confirm(
      `${prod.orderNo} numaralı ${prod.quantity} adet ${prod.product} ürününü sevk etmek istediğinize emin misiniz?`
    )
  ) {
    return;
  }

  try {
    // Sevkiyat kaydı oluştur - productName yerine product kullan
    const shipment = {
      productionId: productionId,
      orderNo: prod.orderNo,
      product: prod.product || "Belirtilmemiş", // productName yerine product
      quantity: prod.quantity || 0,
      date: new Date().toLocaleDateString("tr-TR"),
      time: new Date().toLocaleTimeString("tr-TR"),
      status: "Sevk Edildi",
      destination: prod.companyId ? getCustomerName(prod.companyId) : "Depo",
      shippedBy: currentUser.name,
      shippedById: currentUser.id,
      active: true,
      createdAt: new Date().toISOString(),
    };

    // Üretim kaydını güncelle
    const updateData = {
      ...prod,
      shipmentStatus: "Sevk Edildi",
      shipmentDate: new Date().toLocaleDateString("tr-TR"),
      shippedBy: currentUser.id,
      shippedByName: currentUser.name,
      shipmentTime: new Date().toLocaleTimeString("tr-TR"),
    };

    // Önce production'ı güncelle
    await window.firestoreService.updateProduction(productionId, updateData);

    // Sonra shipment kaydını oluştur
    await window.firestoreService.addShipment(shipment);

    // Bildirim oluştur
    await createNotification({
      type: "shipment_completed",
      title: "Sevkiyat Tamamlandı",
      message: `${prod.orderNo} numaralı ${prod.quantity} adet ${prod.product} başarıyla sevk edildi.`,
      from: currentUser.id,
      to: "all",
      productionId: productionId,
      date: new Date().toISOString(),
    });

    showNotification(
      "Başarılı",
      `${prod.orderNo} başarıyla sevk edildi.`,
      "success"
    );

    // Firebase'den güncel veriyi çek
    await loadFirebaseData();

    // İlgili sayfaları güncelle
    if (currentPage === "sevkiyatBekleyen") loadSevkiyatBekleyen();
    if (currentPage === "sevkiyatEdilen") loadSevkiyatEdilen();
  } catch (error) {
    console.error("Sevk hatası detayı:", error);
    showNotification(
      "Hata",
      `Sevkiyat sırasında hata oluştu: ${error.message}`,
      "error"
    );
  }
}

// Yeni: Sevkiyat Bekleyen Sayfası
function loadSevkiyatBekleyen() {
  // Debug için log ekleyelim
  console.log("Tüm üretimler:", firebaseData.production);
  console.log(
    "Tamamlanmış üretimler:",
    firebaseData.production.filter((p) => p.status === "Tamamlandı")
  );

  // Sevk bekleyenleri filtrele
  const bekleyenUretimler = firebaseData.production.filter((p) => {
    return p.status === "Tamamlandı" && p.shipmentStatus === "Sevk Bekliyor";
  });

  console.log("Sevk bekleyen üretimler:", bekleyenUretimler);

  const content = `
        <div class="page-header">
            <h1 class="page-title"><i class="fas fa-truck"></i> Sevk Bekleyen</h1>
            <p class="page-subtitle">Sevk edilmeyi bekleyen ürünler</p>
        </div>
        <div class="card">
            <div class="card-header">
                <h3 class="card-title">Sevk Bekleyen Ürünler (${
                  bekleyenUretimler.length
                })</h3>
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
                            ${
                              bekleyenUretimler.length > 0
                                ? bekleyenUretimler
                                    .map(
                                      (prod) => `
                                <tr>
                                    <td><strong>${prod.orderNo}</strong></td>
                                    <td>${prod.product}</td>
                                    <td>${prod.quantity} adet</td>
                                    <td>${prod.completedDate || "-"}</td>
                                    <td>
                                        <button class="btn btn-sm btn-warning" onclick="shipProduct('${
                                          prod.id
                                        }')">
                                            <i class="fas fa-truck"></i> Sevk Et
                                        </button>
                                    </td>
                                </tr>
                            `
                                    )
                                    .join("")
                                : '<tr><td colspan="5" style="text-align: center; color: var(--gray-500);">Sevk bekleyen ürün bulunmuyor</td></tr>'
                            }
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    `;
  document.getElementById("pageContent").innerHTML = content;
  applyMobileOptimizations("sevkiyatBekleyen");
}

async function deleteShipment(productionId) {
  const prod = firebaseData.production.find((p) => p.id === productionId);

  if (!prod) {
    showNotification("Hata", "Üretim bulunamadı.", "error");
    return;
  }

  if (
    !confirm(
      `${prod.orderNo} numaralı sevkiyat kaydını tamamen silmek istediğinize emin misiniz?\n\nDİKKAT: Bu işlem geri alınamaz!`
    )
  ) {
    return;
  }

  try {
    // Üretim kaydından sevkiyat bilgilerini temizle
    const updateData = {
      ...prod,
      shipmentStatus: null,
      shipmentDate: null,
      shippedBy: null,
      shipmentReadyDate: null,
    };

    await window.firestoreService.updateProduction(productionId, updateData);

    // Bildirim oluştur
    await createNotification({
      type: "shipment_deleted",
      title: "Sevkiyat Silindi",
      message: `${prod.orderNo} numaralı ürünün sevkiyat kaydı silindi.`,
      from: currentUser.id,
      to: "all",
      productionId: productionId,
      date: new Date().toISOString(),
    });

    showNotification(
      "Başarılı",
      "Sevkiyat kaydı başarıyla silindi.",
      "success"
    );

    await loadFirebaseData();

    if (currentPage === "sevkiyatEdilen") loadSevkiyatEdilen();
  } catch (error) {
    console.error("Sevkiyat silme hatası:", error);
    showNotification("Hata", "Sevkiyat silinirken hata oluştu.", "error");
  }
}

function filterSevkiyatBekleyen() {
  const search = document
    .getElementById("shipmentBekleyenSearch")
    .value.toLowerCase();
  const dateFrom = document.getElementById("shipmentBekleyenDateFrom").value;
  const dateTo = document.getElementById("shipmentBekleyenDateTo").value;
  const customerId = document.getElementById("shipmentBekleyenCustomer").value;

  const filteredData = firebaseData.production
    .filter((p) => p.status === "Tamamlandı" && !p.shipmentStatus)
    .filter((p) => {
      // Ürün arama
      if (search && !p.product.toLowerCase().includes(search)) return false;
      // Müşteri arama (eğer companyId varsa)
      if (
        search &&
        !getCustomerName(p.companyId).toLowerCase().includes(search)
      )
        return false;
      // Tarih filtre (completedDate'i Date objesine çevir)
      if (dateFrom && new Date(p.completedDate) < new Date(dateFrom))
        return false;
      if (dateTo && new Date(p.completedDate) > new Date(dateTo)) return false;
      // Müşteri filtre
      if (customerId && p.companyId !== customerId) return false;
      return true;
    });

  const tbody = document.getElementById("sevkiyatBekleyenTableBody");
  if (tbody) {
    tbody.innerHTML = filteredData
      .map(
        (prod) => `
            <tr>
                <td><strong>${prod.orderNo}</strong></td>
                <td>${prod.product}</td>
                <td>${getCustomerName(prod.companyId)}</td>
                <td>${prod.quantity}</td>
                <td>${prod.completedDate}</td>
                <td>
                    <button class="btn btn-sm btn-warning" onclick="shipProduct('${
                      prod.id
                    }')">
                        <i class="fas fa-truck"></i> Sevk Et
                    </button>
                </td>
            </tr>
        `
      )
      .join("");
  }
}

// Yeni: Müşteri Adı Getir (companyId'den)
function getCustomerName(companyId) {
  if (!companyId) return "Bilinmeyen";
  const company = firebaseData.companies.find((c) => c.id === companyId);
  return company ? company.name : "Bilinmeyen Müşteri";
}

// Yeni: Filtre Temizle
function clearSevkiyatBekleyenFilter() {
  document.getElementById("shipmentBekleyenSearch").value = "";
  document.getElementById("shipmentBekleyenDateFrom").value = "";
  document.getElementById("shipmentBekleyenDateTo").value = "";
  document.getElementById("shipmentBekleyenCustomer").value = "";
  filterSevkiyatBekleyen();
}

function clearSevkiyatEdilenFilter() {
  const searchInput = document.getElementById("shipmentEdilenSearch");
  const dateFromInput = document.getElementById("shipmentEdilenDateFrom");
  const dateToInput = document.getElementById("shipmentEdilenDateTo");

  if (searchInput) searchInput.value = "";
  if (dateFromInput) dateFromInput.value = "";
  if (dateToInput) dateToInput.value = "";

  // Tabloyu gizle, mesajı göster
  const message = document.getElementById("sevkiyatEdilenMessage");
  const table = document.getElementById("sevkiyatEdilenTable");

  if (message) message.style.display = "block";
  if (table) table.style.display = "none";
}

// Yeni: Filtreli Veri Getir (Bekleyen için helper)
function filterSevkiyatBekleyenData() {
  // Yukarıdaki filtre mantığını buraya taşı (reuse için)
  const search =
    document.getElementById("shipmentBekleyenSearch")?.value.toLowerCase() ||
    "";
  const dateFrom =
    document.getElementById("shipmentBekleyenDateFrom")?.value || "";
  const dateTo = document.getElementById("shipmentBekleyenDateTo")?.value || "";
  const customerId =
    document.getElementById("shipmentBekleyenCustomer")?.value || "";

  return firebaseData.production
    .filter((p) => p.status === "Tamamlandı" && !p.shipmentStatus)
    .filter((p) => {
      if (search && !p.product.toLowerCase().includes(search)) return false;
      if (
        search &&
        !getCustomerName(p.companyId).toLowerCase().includes(search)
      )
        return false;
      if (dateFrom && new Date(p.completedDate) < new Date(dateFrom))
        return false;
      if (dateTo && new Date(p.completedDate) > new Date(dateTo)) return false;
      if (customerId && p.companyId !== customerId) return false;
      return true;
    });
}

// Yeni: Filtreli Veri Getir (Edilen için helper)
function filterSevkiyatEdilenData() {
  const search =
    document.getElementById("shipmentEdilenSearch")?.value.toLowerCase() || "";
  const dateFrom =
    document.getElementById("shipmentEdilenDateFrom")?.value || "";
  const dateTo = document.getElementById("shipmentEdilenDateTo")?.value || "";
  const customerId =
    document.getElementById("shipmentEdilenCustomer")?.value || "";

  return firebaseData.production
    .filter((p) => p.shipmentStatus === "Sevk Edildi")
    .filter((p) => {
      if (search && !p.product.toLowerCase().includes(search)) return false;
      if (
        search &&
        !getCustomerName(p.companyId).toLowerCase().includes(search)
      )
        return false;
      if (dateFrom && new Date(p.shipmentDate) < new Date(dateFrom))
        return false;
      if (dateTo && new Date(p.shipmentDate) > new Date(dateTo)) return false;
      if (customerId && p.companyId !== customerId) return false;
      return true;
    });
}

// script.js'de openCompanySelectionModal fonksiyonunu düzenleyin:

function openCompanySelectionModal() {
  // Veri kontrolü
  if (!window.firebaseData || !window.firebaseData.companies || window.firebaseData.companies.length === 0) {
    console.log("⚠️ Firma verileri yok, yükleniyor...");
    loadFirebaseData().then(() => {
      if (window.firebaseData.companies && window.firebaseData.companies.length > 0) {
        openCompanySelectionModal();
      } else {
        showNotification("Uyarı", "Henüz firma kaydı bulunmuyor. Lütfen önce firma ekleyin.", "warning");
      }
    });
    return;
  }

  // Mevcut modal kodu devam eder...
  const existingModal = document.getElementById("companySelectionModal");
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

  document.body.insertAdjacentHTML("beforeend", modalHTML);
  loadCompanyList();
}

function loadCompanyList() {
  const listContainer = document.getElementById("companySuggestionsList");
  if (!listContainer) return;

  // firebaseData kontrolü
  const companies = window.firebaseData?.companies || [];
  
  console.log("📋 Firma listesi yükleniyor:", companies.length);

  if (companies.length === 0) {
    listContainer.innerHTML = `
      <div style="text-align: center; padding: 20px; color: var(--gray-500);">
        Henüz firma kaydı bulunmuyor
        <br><br>
        <button class="btn btn-primary" onclick="openCompanyModal()">
          <i class="fas fa-plus"></i> İlk Firmayı Ekle
        </button>
      </div>`;
    return;
  }

  // Favorileri üste al
  const sortedCompanies = [...companies].sort((a, b) => {
    if (a.isFavorite && !b.isFavorite) return -1;
    if (!a.isFavorite && b.isFavorite) return 1;
    return (a.name || '').localeCompare(b.name || '');
  });

  listContainer.innerHTML = sortedCompanies
    .map(company => `
      <div onclick="selectCompanyFromModal('${company.id}')" 
           style="padding: 12px; border: 1px solid var(--gray-200); margin-bottom: 8px; border-radius: 8px; cursor: pointer; transition: all 0.2s;"
           onmouseover="this.style.background='var(--gray-50)'; this.style.borderColor='var(--primary)';"
           onmouseout="this.style.background='white'; this.style.borderColor='var(--gray-200)';">
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <div>
            <strong style="color: var(--gray-900);">${company.name}</strong>
            ${company.isFavorite ? '<i class="fas fa-star" style="color: gold; margin-left: 8px;"></i>' : ''}
            <div style="font-size: 12px; color: var(--gray-600); margin-top: 4px;">
              Vergi No: ${company.taxNo} ${company.phone ? "| Tel: " + company.phone : ""}
            </div>
          </div>
          <i class="fas fa-chevron-right" style="color: var(--gray-400);"></i>
        </div>
      </div>
    `).join("");
}
function filterCompanySuggestions() {
  const search = document
    .getElementById("companySelectionSearch")
    .value.toLowerCase();
  const listContainer = document.getElementById("companySuggestionsList");
  if (!listContainer) return;

  const companies = firebaseData.companies || [];

  const filtered = companies.filter(
    (company) =>
      company.name.toLowerCase().includes(search) ||
      company.taxNo.includes(search) ||
      (company.phone && company.phone.includes(search))
  );

  if (filtered.length === 0) {
    listContainer.innerHTML =
      '<div style="text-align: center; padding: 20px; color: var(--gray-500);">Arama sonucu bulunamadı</div>';
    return;
  }

  // Favorileri üste al
  const sortedFiltered = filtered.sort((a, b) => {
    if (a.isFavorite && !b.isFavorite) return -1;
    if (!a.isFavorite && b.isFavorite) return 1;
    return a.name.localeCompare(b.name);
  });

  listContainer.innerHTML = sortedFiltered
    .map(
      (company) => `
        <div onclick="selectCompanyFromModal('${company.id}')" 
             style="padding: 12px; border: 1px solid var(--gray-200); margin-bottom: 8px; border-radius: 8px; cursor: pointer; transition: all 0.2s;"
             onmouseover="this.style.background='var(--gray-50)'; this.style.borderColor='var(--primary)';"
             onmouseout="this.style.background='white'; this.style.borderColor='var(--gray-200)';">
            <div style="display: flex; justify-content: space-between; align-items: center;">
                <div>
                    <strong style="color: var(--gray-900);">${
                      company.name
                    }</strong>
                    ${
                      company.isFavorite
                        ? '<i class="fas fa-star" style="color: gold; margin-left: 8px;"></i>'
                        : ""
                    }
                    <div style="font-size: 12px; color: var(--gray-600); margin-top: 4px;">
                        Vergi No: ${company.taxNo} ${
        company.phone ? "| Tel: " + company.phone : ""
      }
                    </div>
                </div>
                <i class="fas fa-chevron-right" style="color: var(--gray-400);"></i>
            </div>
        </div>
    `
    )
    .join("");
}

function selectCompanyFromModal(companyId) {
  const company = firebaseData.companies.find((c) => c.id === companyId);
  if (!company) {
    showNotification("Hata", "Firma bulunamadı.", "error");
    return;
  }

  // Hidden input'ları güncelle veya oluştur
  let offerCompanyInput = document.getElementById("offerCompany");
  let offerCompanyIdInput = document.getElementById("offerCompanyId");

  if (!offerCompanyInput) {
    offerCompanyInput = document.createElement("input");
    offerCompanyInput.type = "hidden";
    offerCompanyInput.id = "offerCompany";
    document.querySelector(".card-body").appendChild(offerCompanyInput);
  }

  if (!offerCompanyIdInput) {
    offerCompanyIdInput = document.createElement("input");
    offerCompanyIdInput.type = "hidden";
    offerCompanyIdInput.id = "offerCompanyId";
    document.querySelector(".card-body").appendChild(offerCompanyIdInput);
  }

  // Değerleri set et
  offerCompanyInput.value = company.name;
  offerCompanyIdInput.value = company.id;

  // Butonu güncelle
  const companySelectionBtn = document.getElementById("companySelectionBtn");
  if (companySelectionBtn) {
    companySelectionBtn.innerHTML = `
            <i class="fas fa-building" style="margin-right: 8px; color: var(--primary);"></i>
            <strong>${company.name}</strong> - ${company.taxNo}
        `;
    companySelectionBtn.classList.add("selected");
    companySelectionBtn.style.borderColor = "var(--primary)";
    companySelectionBtn.style.background = "var(--primary-light, #f0f0ff)";
  }

  // YENİ: Firma yetkililerini yükle
  loadCompanyContacts(companyId);

  // Modalı kapat
  closeModal("companySelectionModal");

  showNotification(
    "Firma Seçildi",
    `${company.name} başarıyla seçildi.`,
    "success"
  );
}
// script.js:7184 civarı
async function saveCompany(companyId = null) {
  const name = document.getElementById("companyFormName").value.trim();
  const taxNo = document.getElementById("companyFormTaxNo").value.trim();

  if (!name || !taxNo) {
    showNotification("Hata", "Firma adı ve vergi no zorunludur.", "error");
    return;
  }

  const companyData = {
    name: name,
    shortName: document.getElementById("companyFormShortName").value,
    businessType: document.getElementById("companyFormBusinessType").value,
    customerType: document.getElementById("companyFormType").value,
    sector: document.getElementById("companyFormSector").value,
    employeeCount: document.getElementById("companyFormEmployeeCount").value,
    phone: document.getElementById("companyFormPhone").value,
    phone2: document.getElementById("companyFormPhone2").value,
    fax: document.getElementById("companyFormFax").value,
    email: document.getElementById("companyFormEmail").value,
    website: document.getElementById("companyFormWebsite").value,
    contactPerson: document.getElementById("companyFormContactPerson").value,
    contactPhone: document.getElementById("companyFormContactPhone").value,
    contactEmail: document.getElementById("companyFormContactEmail").value,
    address: document.getElementById("companyFormAddress").value,
    city: document.getElementById("companyFormCity").value,
    district: document.getElementById("companyFormDistrict").value,
    postalCode: document.getElementById("companyFormPostalCode").value,
    country: document.getElementById("companyFormCountry").value,
    taxNo: taxNo,
    taxOffice: document.getElementById("companyFormTaxOffice").value,
    tradeRegNo: document.getElementById("companyFormTradeRegNo").value,
    mersisNo: document.getElementById("companyFormMersisNo").value,
    bankName: document.getElementById("companyFormBankName").value,
    bankBranch: document.getElementById("companyFormBankBranch").value,
    iban: document.getElementById("companyFormIban").value,
    accountNo: document.getElementById("companyFormAccountNo").value,
    creditLimit:
      parseFloat(document.getElementById("companyFormCreditLimit").value) || 0,
    paymentTerm:
      parseInt(document.getElementById("companyFormPaymentTerm").value) || 30,
    notes: document.getElementById("companyFormNotes").value,
    acceptsEmailNotifications: document.getElementById("companyFormEmailAccept")
      .checked,
    acceptsSmsNotifications: document.getElementById("companyFormSmsAccept")
      .checked,
    isFavorite: document.getElementById("companyFormFavorite").checked,
    active: document.getElementById("companyFormActive").checked,
    updatedAt: new Date().toISOString(),
  };

  // Yeni firma eklenirken createdAt ekle
  if (!companyId) {
    companyData.createdAt = new Date().toISOString();
  }

  const logoFile = document.getElementById("companyFormLogo").files[0];
  if (logoFile) {
    const reader = new FileReader();
    reader.onload = async function (e) {
      companyData.logo = e.target.result;
      await saveCompanyToFirebase(companyData, companyId);
    };
    reader.readAsDataURL(logoFile);
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
      showNotification("Güncellendi", "Firma güncellendi.", "success");
    } else {
      id = await window.firestoreService.addCompany(companyData);
      showNotification("Eklendi", "Yeni firma eklendi.", "success");
    }
    await loadFirebaseData();
    closeModal("companyModal");
    loadFirmalar();
  } catch (error) {
    console.error("Firma kaydetme hatası:", error);
    showNotification("Hata", "Firma kaydedilemedi.", "error");
  }
}

function showCompanyDetails(companyId) {
  const company = firebaseData.companies.find((c) => c.id === companyId);
  if (!company) {
    showNotification("Hata", "Firma bulunamadı.", "error");
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
                        <p style="margin: 5px 0;">Tip: ${
                          company.customerType || "Normal"
                        }</p>
                    </div>
                    
                    <div class="form-grid">
                        <div class="form-group">
                            <label class="form-label">Telefon</label>
                            <input type="text" class="form-control" value="${
                              company.phone || "-"
                            }" readonly>
                        </div>
                        <div class="form-group">
                            <label class="form-label">E-posta</label>
                            <input type="text" class="form-control" value="${
                              company.email || "-"
                            }" readonly>
                        </div>
                        <div class="form-group">
                            <label class="form-label">Web Sitesi</label>
                            <input type="text" class="form-control" value="${
                              company.website || "-"
                            }" readonly>
                        </div>
                        <div class="form-group">
                            <label class="form-label">Yetkili</label>
                            <input type="text" class="form-control" value="${
                              company.contactPerson || "-"
                            }" readonly>
                        </div>
                        <div class="form-group">
                            <label class="form-label">Vergi Dairesi</label>
                            <input type="text" class="form-control" value="${
                              company.taxOffice || "-"
                            }" readonly>
                        </div>
                        <div class="form-group">
                            <label class="form-label">Kredi Limiti</label>
                            <input type="text" class="form-control" value="${
                              company.creditLimit
                                ? company.creditLimit + " $"
                                : "-"
                            }" readonly>
                        </div>
                    </div>
                    
                    <div class="form-group">
                        <label class="form-label">Adres</label>
                        <textarea class="form-control" readonly rows="3">${
                          company.address || "-"
                        }</textarea>
                    </div>
                    
                    ${
                      company.notes
                        ? `
                    <div class="form-group">
                        <label class="form-label">Notlar</label>
                        <textarea class="form-control" readonly rows="3">${company.notes}</textarea>
                    </div>
                    `
                        : ""
                    }
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

  document.body.insertAdjacentHTML("beforeend", modalHTML);
}

// Teklif Hazırla Sayfasında Firma Seçimi Butonu (Varsa Event Listener Ekle)
document.addEventListener("DOMContentLoaded", () => {
  const offerCompanyBtn = document.querySelector("#offerCompanyBtn"); // Varsa buton ID'si
  if (offerCompanyBtn) {
    offerCompanyBtn.onclick = openCompanySelectionModal;
  }
  if (isMobileDevice()) {
    // Tüm butonları görünür kıl
    document.querySelectorAll(".action-btn, .btn").forEach((btn) => {
      btn.style.display = "inline-block";
      btn.style.visibility = "visible";
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
    if (
      notificationData.to === "all" ||
      notificationData.to === currentUser.id
    ) {
      updateNotificationBadge();
    }
  } catch (error) {
    console.error("Bildirim oluşturma hatası:", error);
  }
}

// Bildirim sayısını güncelle
async function updateNotificationBadge() {
  try {
    const notifications = await window.firestoreService.getNotifications();
    const unreadCount = notifications.filter(
      (n) => (n.to === "all" || n.to === currentUser.id) && !n.read
    ).length;

    const badge = document.getElementById("notificationBadge");
    if (badge) {
      if (unreadCount > 0) {
        badge.style.display = "inline-block";
        badge.textContent = unreadCount > 9 ? "9+" : unreadCount;
      } else {
        badge.style.display = "none";
      }
    }
  } catch (error) {
    console.error("Bildirim badge güncelleme hatası:", error);
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
  document.getElementById("pageContent").innerHTML = content;
  loadNotificationsList();
  applyMobileOptimizations("notifications");
}

async function deleteAllNotifications() {
  if (
    !confirm(
      "Tüm bildirimleri silmek istediğinize emin misiniz? Bu işlem geri alınamaz."
    )
  ) {
    return;
  }

  try {
    const notifications = await window.firestoreService.getNotifications();
    const userNotifications = notifications.filter(
      (n) => n.to === "all" || n.to === currentUser.id
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
      showNotification(
        "Başarılı",
        `${deletedCount} bildirim silindi.`,
        "success"
      );
    } else {
      showNotification("Bilgi", "Silinecek bildirim bulunamadı.", "info");
    }
  } catch (error) {
    console.error("Bildirimleri silme hatası:", error);
    showNotification("Hata", "Bildirimler silinirken hata oluştu.", "error");
  }
}

// Kullanıcı Raporları Sayfası
function loadKullaniciRaporlari() {
  console.log("📊 Kullanıcı raporları yükleniyor...");
  console.log("Mevcut kullanıcı:", currentUser);
  console.log("Kullanıcı verileri:", window.firebaseData?.users?.length);

  // Yetki kontrolü
  if (!currentUser || !hasPermission("user_activities")) {
    console.log("❌ Yetki kontrolü başarısız");
    showNotification(
      "Erişim reddedildi",
      "Bu sayfaya erişim yetkiniz bulunmamaktadır",
      "error"
    );
    showPage("dashboard");
    return;
  }

  // Kullanıcı verilerini kontrol et
  if (
    !window.firebaseData ||
    !window.firebaseData.users ||
    window.firebaseData.users.length === 0
  ) {
    console.log("⚠️ Kullanıcı verileri yok, yeniden yükleniyor...");
    loadFirebaseData().then(() => {
      // Veri yüklendikten sonra sayfayı tekrar yükle
      if (window.firebaseData.users.length > 0) {
        loadKullaniciRaporlari();
      } else {
        showNotification("Uyarı", "Kullanıcı verileri yüklenemedi", "warning");
      }
    });
    return;
  }

  console.log(
    "✅ Kullanıcı raporları için veri hazır, kullanıcı sayısı:",
    window.firebaseData.users.length
  );

  const content = `
        <div class="page-header">
            <h1 class="page-title"><i class="fas fa-users"></i> Kullanıcı Raporları</h1>
            <p class="page-subtitle">Her kullanıcının detaylı üretim raporu (${
              window.firebaseData.users.length
            } kullanıcı)</p>
        </div>
        <div class="tabs">
            ${window.firebaseData.users
              .map(
                (user, index) => `
                <button class="tab ${
                  index === 0 ? "active" : ""
                }" onclick="switchUserReport(this, '${user.id}')">
                    ${user.name} (${user.username})
                </button>
            `
              )
              .join("")}
        </div>
        <div id="userReportContent">
            <div style="text-align: center; padding: 40px;">
                <i class="fas fa-user-clock" style="font-size: 48px; color: var(--gray-400); margin-bottom: 20px;"></i>
                <p style="color: var(--gray-500);">Bir kullanıcı seçin...</p>
            </div>
        </div>
    `;

  document.getElementById("pageContent").innerHTML = content;


  if (window.firebaseData.users.length > 0) {
    setTimeout(() => {
      const firstTab = document.querySelector(".tab");
      if (firstTab) {
        firstTab.click();
      }
    }, 100);
  }
}
function switchUserReport(button, userId) {
  console.log("📋 Kullanıcı raporu yükleniyor:", userId);

  // Aktif sekmeyi güncelle
  document
    .querySelectorAll(".tab")
    .forEach((tab) => tab.classList.remove("active"));
  button.classList.add("active");

  // Kullanıcıyı bul
  const user = window.firebaseData.users.find((u) => u.id === userId);
  if (!user) {
    console.error("❌ Kullanıcı bulunamadı:", userId);
    document.getElementById("userReportContent").innerHTML = `
            <div style="text-align: center; padding: 40px;">
                <i class="fas fa-exclamation-triangle" style="font-size: 48px; color: var(--danger); margin-bottom: 20px;"></i>
                <p style="color: var(--danger);">Kullanıcı bulunamadı!</p>
            </div>
        `;
    return;
  }

  console.log("✅ Kullanıcı bulundu:", user.name);

  const userProductions = [];

  (window.firebaseData.production || []).forEach((prod) => {
    // Onaylanan işler
    (prod.approvals || []).forEach((approval) => {
      if (approval.userId === userId && approval.timeSpent > 0) {
        const recipe = (window.firebaseData.recipes || []).find(
          (r) => r.id === prod.recipeId
        );
        userProductions.push({
          orderNo: prod.orderNo,
          product: prod.product,
          recipe: recipe ? recipe.name : "Bilinmeyen",
          department: approval.department,
          date: approval.date,
          timeSpent: parseFloat(approval.timeSpent),
          status: prod.status,
          type: "Onaylandı",
        });
      }
    });

    (prod.workTimeRecords || []).forEach((record) => {
      if (record.userId === userId && record.timeSpent > 0) {
        // Bu bölüm için onay var mı kontrol et
        const hasApproval = (prod.approvals || []).some(
          (a) =>
            a.userId === userId &&
            a.department === record.department &&
            a.timeSpent > 0
        );

        // Onay yoksa veya onayda saat 0 ise workTimeRecord'u ekle
        if (!hasApproval) {
          const recipe = (window.firebaseData.recipes || []).find(
            (r) => r.id === prod.recipeId
          );
          userProductions.push({
            orderNo: prod.orderNo,
            product: prod.product,
            recipe: recipe ? recipe.name : "Bilinmeyen",
            department: record.department,
            date: record.date,
            timeSpent: parseFloat(record.timeSpent),
            status: prod.status,
            type: "Çalışma Kaydı",
          });
        }
      }
    });
  });

  console.log("📊 Kullanıcı çalışma sayısı:", userProductions.length);

  userProductions.sort((a, b) => {
    const dateA = a.date.split(".").reverse().join("-");
    const dateB = b.date.split(".").reverse().join("-");
    return new Date(dateB) - new Date(dateA);
  });

  const totalHours = userProductions.reduce((sum, p) => sum + p.timeSpent, 0);

  // Bölüm istatistikleri
  const departmentStats = {};
  userProductions.forEach((p) => {
    if (!departmentStats[p.department]) {
      departmentStats[p.department] = {
        count: 0,
        hours: 0,
        approved: 0,
        workRecords: 0,
      };
    }
    departmentStats[p.department].count++;
    departmentStats[p.department].hours += p.timeSpent;
    if (p.type === "Onaylandı") {
      departmentStats[p.department].approved++;
    } else {
      departmentStats[p.department].workRecords++;
    }
  });

  // İş emri bazlı özet
  const orderSummary = {};
  userProductions.forEach((p) => {
    if (!orderSummary[p.orderNo]) {
      orderSummary[p.orderNo] = {
        product: p.product,
        departments: [],
        totalHours: 0,
      };
    }
    if (!orderSummary[p.orderNo].departments.includes(p.department)) {
      orderSummary[p.orderNo].departments.push(p.department);
    }
    orderSummary[p.orderNo].totalHours += p.timeSpent;
  });

  // Tarih bazlı gruplama
  const groupedByDate = {};
  userProductions.forEach((prod) => {
    if (!groupedByDate[prod.date]) {
      groupedByDate[prod.date] = [];
    }
    groupedByDate[prod.date].push(prod);
  });

  const reportHTML = `
        <div class="card">
            <div class="card-header">
                <h3 class="card-title">${user.name} - Üretim Raporu</h3>
                <p class="card-subtitle">Kullanıcı Adı: ${
                  user.username
                } | Departman: ${getRoleDisplayName(user.role)}</p>
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
                        <div class="stat-value">${
                          Object.keys(departmentStats).length
                        }</div>
                        <div class="stat-label">Çalışılan Bölüm</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-icon info"><i class="fas fa-clipboard-list"></i></div>
                        <div class="stat-value">${
                          Object.keys(orderSummary).length
                        }</div>
                        <div class="stat-label">İş Emri Sayısı</div>
                    </div>
                </div>
                
                ${
                  Object.keys(departmentStats).length > 0
                    ? `
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
                                ${Object.entries(departmentStats)
                                  .map(
                                    ([dep, stats]) => `
                                    <tr>
                                        <td><strong>${dep}</strong></td>
                                        <td>${stats.count}</td>
                                        <td><span class="badge success">${
                                          stats.approved
                                        }</span></td>
                                        <td><span class="badge info">${
                                          stats.workRecords
                                        }</span></td>
                                        <td><strong>${stats.hours.toFixed(
                                          1
                                        )} saat</strong></td>
                                        <td>${(
                                          stats.hours / stats.count
                                        ).toFixed(1)} saat</td>
                                    </tr>
                                `
                                  )
                                  .join("")}
                            </tbody>
                        </table>
                    </div>
                </div>
                `
                    : ""
                }
                
                ${
                  userProductions.length > 0
                    ? `
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
                                    <th>Durum</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${userProductions
                                  .map(
                                    (prod) => `
                                    <tr>
                                        <td>${prod.date}</td>
                                        <td><strong>${
                                          prod.orderNo
                                        }</strong></td>
                                        <td>${prod.product}</td>
                                        <td><span class="badge primary">${
                                          prod.department
                                        }</span></td>
                                        <td><strong>${prod.timeSpent.toFixed(
                                          1
                                        )} saat</strong></td>
                                        <td><span class="badge ${
                                          prod.type === "Onaylandı"
                                            ? "success"
                                            : "info"
                                        }">${prod.type}</span></td>
                                    </tr>
                                `
                                  )
                                  .join("")}
                            </tbody>
                            <tfoot>
                                <tr style="background: var(--gray-50); font-weight: bold;">
                                    <td colspan="4">GENEL TOPLAM</td>
                                    <td style="color: var(--primary);">${totalHours.toFixed(
                                      1
                                    )} saat</td>
                                    <td></td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                </div>
                `
                    : '<div style="text-align: center; padding: 40px;"><i class="fas fa-info-circle" style="font-size: 48px; color: var(--gray-400); margin-bottom: 20px;"></i><p style="color: var(--gray-500);">Bu kullanıcının henüz çalışma kaydı bulunmamaktadır.</p></div>'
                }
            </div>
        </div>
    `;

  document.getElementById("userReportContent").innerHTML = reportHTML;
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
  const modal = document.getElementById("notificationModal");
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
    document.body.insertAdjacentHTML("beforeend", modalHTML);
  }

  loadNotificationsList();
  openModal("notificationModal");
}

// Bildirim listesini yükle
async function loadNotificationsList(filter = "all") {
  try {
    const notifications = await window.firestoreService.getNotifications();
    let userNotifications = notifications
      .filter((n) => n.to === "all" || n.to === currentUser.id)
      .sort((a, b) => new Date(b.date) - new Date(a.date));

    // Filtreleme
    if (filter === "unread") {
      userNotifications = userNotifications.filter((n) => !n.read);
    } else if (filter === "production") {
      userNotifications = userNotifications.filter(
        (n) =>
          n.type === "production_approval" || n.type === "production_deleted"
      );
    }

    // Okunmamış sayısı
    const unreadCount = userNotifications.filter((n) => !n.read).length;
    document.getElementById("unreadCount").textContent =
      unreadCount > 0 ? unreadCount : "";

    // Liste HTML
    const listHTML =
      userNotifications.length > 0
        ? userNotifications
            .map(
              (notif) => `
            <div class="notification-item ${notif.read ? "" : "unread"}" 
                 onclick="markAsRead('${notif.id}')"
                 style="padding: 15px; border: 1px solid var(--gray-200); border-radius: 8px; margin-bottom: 10px; cursor: pointer; transition: all 0.2s; ${
                   notif.read
                     ? "background: var(--gray-50);"
                     : "background: var(--white); border-left: 4px solid var(--primary);"
                 }">
                <div style="display: flex; gap: 15px; align-items: start;">
                    <div class="notification-icon" style="width: 40px; height: 40px; background: ${getNotificationColor(
                      notif.type
                    )}; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white;">
                        <i class="fas ${getNotificationIcon(notif.type)}"></i>
                    </div>
                    <div style="flex: 1;">
                        <div style="display: flex; justify-content: space-between; align-items: start;">
                            <div>
                                <div style="font-weight: 600; color: var(--gray-900); margin-bottom: 5px;">
                                    ${notif.title}
                                    ${
                                      !notif.read
                                        ? '<span style="background: var(--danger); color: white; padding: 2px 6px; border-radius: 8px; font-size: 10px; margin-left: 8px;">YENİ</span>'
                                        : ""
                                    }
                                </div>
                                <div style="color: var(--gray-600); font-size: 14px; margin-bottom: 5px;">
                                    ${notif.message}
                                </div>
                                <div style="color: var(--gray-400); font-size: 12px;">
                                    <i class="fas fa-clock"></i> ${formatNotificationDate(
                                      notif.date
                                    )}
                                </div>
                            </div>
                            <button onclick="deleteNotification('${
                              notif.id
                            }'); event.stopPropagation();" 
                                    style="background: none; border: none; color: var(--gray-400); cursor: pointer; padding: 5px;">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `
            )
            .join("")
        : '<div style="text-align: center; padding: 40px; color: var(--gray-500);"><i class="fas fa-bell-slash" style="font-size: 48px; margin-bottom: 10px;"></i><p>Henüz bildirim yok</p></div>';

    document.getElementById("notificationsList").innerHTML = listHTML;

    // Badge güncelle
    updateNotificationBadge();
  } catch (error) {
    console.error("Bildirimler yüklenemedi:", error);
    document.getElementById("notificationsList").innerHTML =
      '<p style="color: var(--danger);">Bildirimler yüklenirken hata oluştu.</p>';
  }
}
async function markAsRead(notificationId) {
  try {
    await window.firestoreService.updateNotification(notificationId, {
      read: true,
    });
    await loadNotificationsList();
  } catch (error) {
    console.error("Bildirim güncellenemedi:", error);
  }
}
async function markAllAsRead() {
  try {
    const notifications = await window.firestoreService.getNotifications();
    const userNotifications = notifications.filter(
      (n) => (n.to === "all" || n.to === currentUser.id) && !n.read
    );

    for (const notif of userNotifications) {
      await window.firestoreService.updateNotification(notif.id, {
        read: true,
      });
    }

    await loadNotificationsList();
    showNotification(
      "Başarılı",
      "Tüm bildirimler okundu olarak işaretlendi.",
      "success"
    );
  } catch (error) {
    console.error("Bildirimler güncellenemedi:", error);
  }
}

// Bildirimi sil
async function deleteNotification(notificationId) {
  if (confirm("Bu bildirimi silmek istediğinize emin misiniz?")) {
    try {
      await window.firestoreService.deleteNotification(notificationId);
      await loadNotificationsList();
      showNotification("Silindi", "Bildirim başarıyla silindi.", "success");
    } catch (error) {
      console.error("Bildirim silinemedi:", error);
    }
  }
}

// Bildirimleri filtrele
function filterNotifications(filter) {
  // Butonları güncelle
  document.querySelectorAll(".notification-filters button").forEach((btn) => {
    btn.classList.remove("btn-primary");
    btn.classList.add("btn-outline");
  });
  event.target.classList.remove("btn-outline");
  event.target.classList.add("btn-primary");

  loadNotificationsList(filter);
}
function getNotificationIcon(type) {
  const icons = {
    production_approval: "fa-check-circle",
    production_deleted: "fa-trash",
    stock_alert: "fa-exclamation-triangle",
    shipment: "fa-truck",
    general: "fa-info-circle",
  };
  return icons[type] || "fa-bell";
}
function getNotificationColor(type) {
  const colors = {
    production_approval: "var(--success)",
    production_deleted: "var(--danger)",
    stock_alert: "var(--warning)",
    shipment: "var(--info)",
    general: "var(--primary)",
  };
  return colors[type] || "var(--gray-500)";
}
function formatNotificationDate(dateString) {
  const date = new Date(dateString);
  const now = new Date();
  const diff = now - date;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return "Az önce";
  if (minutes < 60) return `${minutes} dakika önce`;
  if (hours < 24) return `${hours} saat önce`;
  if (days < 7) return `${days} gün önce`;
  return date.toLocaleDateString("tr-TR");
}
function loadSevkiyatEdilen() {
  // Veri kontrolü
  if (!window.firebaseData || !window.firebaseData.production) {
    console.error("❌ Sevkiyat verileri bulunamadı, yeniden yükleniyor...");
    loadFirebaseData().then(() => loadSevkiyatEdilen());
    return;
  }

  const allProduction = window.firebaseData.production || [];
  const shippedItems = allProduction.filter(
    (p) => p.shipmentStatus === "Sevk Edildi"
  );
  console.log(
    "🚛 Sevk edilenler listesi yükleniyor, toplam:",
    shippedItems.length
  );
  const content = `
        <div class="page-header">
            <h1 class="page-title"><i class="fas fa-truck-loading"></i> Sevk Edilen</h1>
            <p class="page-subtitle">Sevk edilen ürünlerin kaydı - Toplam ${shippedItems.length} kayıt</p>
        </div>
        <div class="card">
            <div class="card-header">
                <div class="flex justify-between items-center">
                    <h3 class="card-title">Sevk Edilen Ürünler</h3>
                    <button class="btn btn-info" onclick="showPage('sevkiyatBekleyen')">
                        <i class="fas fa-clock"></i> Sevk Bekleyenler
                    </button>
                </div>
            </div>
            <div class="card-body">
                <div class="filter-bar" style="background: linear-gradient(135deg, #e3f2fd, #bbdefb); padding: 25px; border-radius: 15px; margin-bottom: 25px;">
                    <div class="filter-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; align-items: end;">
                        
                        <div class="search-box" style="position: relative;">
                            <label style="color: #1565c0; font-size: 12px; font-weight: 600; margin-bottom: 8px; display: block;">
                                <i class="fas fa-search"></i> Arama
                            </label>
                            <input type="text" 
                                id="shipmentEdilenSearch" 
                                placeholder="Ürün veya İş Emri ara..." 
                                onkeyup="filterSevkiyatEdilen()"
                                style="width: 100%; padding: 12px 15px; border: none; border-radius: 10px; background: rgba(255,255,255,0.9); font-size: 14px;">
                        </div>
                        
                        <div class="date-filter-group">
                            <label style="color: #1565c0; font-size: 12px; font-weight: 600; margin-bottom: 8px; display: block;">
                                <i class="fas fa-calendar-alt"></i> Başlangıç Tarihi
                            </label>
                            <input type="date" 
                                id="shipmentEdilenDateFrom" 
                                onchange="filterSevkiyatEdilen()"
                                style="width: 100%; padding: 12px 15px; border: none; border-radius: 10px; background: rgba(255,255,255,0.9); font-size: 14px;">
                        </div>
                        
                        <div class="date-filter-group">
                            <label style="color: #1565c0; font-size: 12px; font-weight: 600; margin-bottom: 8px; display: block;">
                                <i class="fas fa-calendar-check"></i> Bitiş Tarihi
                            </label>
                            <input type="date" 
                                id="shipmentEdilenDateTo" 
                                onchange="filterSevkiyatEdilen()"
                                style="width: 100%; padding: 12px 15px; border: none; border-radius: 10px; background: rgba(255,255,255,0.9); font-size: 14px;">
                        </div>
                        
                        <div style="display: flex; gap: 10px; align-items: end;">
                            <button class="btn" 
                                onclick="showAllShippedItems()"
                                style="background: white; color: #1565c0; padding: 12px 20px; border: none; border-radius: 10px; font-weight: 600;">
                                <i class="fas fa-list"></i> Tümünü Göster
                            </button>
                            
                            <button class="btn" 
                                onclick="clearSevkiyatEdilenFilter()"
                                style="background: #1565c0; color: white; padding: 12px 20px; border: 2px solid white; border-radius: 10px; font-weight: 600;">
                                <i class="fas fa-times"></i> Temizle
                            </button>
                        </div>
                    </div>
                </div>
                
                <div class="table-container">
                    <div id="sevkiyatEdilenMessage" style="text-align: center; padding: 60px; background: linear-gradient(135deg, #f3e5f5, #e1bee7); border-radius: 15px;">
                        <i class="fas fa-filter" style="font-size: 64px; margin-bottom: 20px; color: #7b1fa2;"></i>
                        <h3 style="color: #4a148c; margin-bottom: 10px;">Sevk Edilenler</h3>
                        <p style="color: #6a1b9a;">Sevk edilen ürünleri görüntülemek için "Tümünü Göster" butonuna tıklayın veya filtre kullanın.</p>
                        <button class="btn btn-primary" onclick="showAllShippedItems()" style="margin-top: 15px;">
                            <i class="fas fa-list"></i> ${shippedItems.length} Sevk Edileni Göster
                        </button>
                    </div>
                    <table class="table" id="sevkiyatEdilenTable" style="display: none;">
                        <thead>
                            <tr>
                                <th>İş Emri No</th>
                                <th>Ürün</th>
                                <th>Miktar</th>
                                <th>Sevk Tarihi</th>
                                <th>Sevk Eden</th>
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
  document.getElementById("pageContent").innerHTML = content;
}
function setQuickDateFilter(period) {
  const today = new Date();
  const fromInput = document.getElementById("shipmentEdilenDateFrom");
  const toInput = document.getElementById("shipmentEdilenDateTo");

  if (!fromInput || !toInput) {
    console.error("Tarih inputları bulunamadı");
    return;
  }

  switch (period) {
    case "today":
      fromInput.value = today.toISOString().split("T")[0];
      toInput.value = today.toISOString().split("T")[0];
      break;
    case "week":
      const weekStart = new Date(today);
      weekStart.setDate(today.getDate() - today.getDay());
      fromInput.value = weekStart.toISOString().split("T")[0];
      toInput.value = today.toISOString().split("T")[0];
      break;
    case "month":
      const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
      fromInput.value = monthStart.toISOString().split("T")[0];
      toInput.value = today.toISOString().split("T")[0];
      break;
  }

  filterSevkiyatEdilen();
}
function showAllShippedItems() {
  const message = document.getElementById("sevkiyatEdilenMessage");
  const table = document.getElementById("sevkiyatEdilenTable");

  if (message) message.style.display = "none";
  if (table) table.style.display = "table";

  const allProduction = window.firebaseData?.production || [];
  const shippedItems = allProduction.filter(
    (p) => p.shipmentStatus === "Sevk Edildi"
  );

  console.log("🚛 Tüm sevk edilenler gösteriliyor:", shippedItems.length);

  const tbody = document.getElementById("sevkiyatEdilenTableBody");
  if (!tbody) return;

  if (shippedItems.length === 0) {
    tbody.innerHTML =
      '<tr><td colspan="7" style="text-align: center; padding: 40px;">Henüz sevk edilen ürün bulunmuyor.</td></tr>';
    return;
  }
  const sortedShipped = shippedItems.sort((a, b) => {
    const dateA = new Date(a.shipmentDate || a.completedDate || "1970-01-01");
    const dateB = new Date(b.shipmentDate || b.completedDate || "1970-01-01");
    return dateB - dateA;
  });

  tbody.innerHTML = sortedShipped
    .map((prod) => {
      // Ürün adını garantiye al
      const productName = prod.product || prod.productName || "Belirtilmemiş";
      const quantity = prod.quantity || 0;
      const shipmentDate = prod.shipmentDate || prod.completedDate || "-";
      const shippedBy = prod.shippedByName || "Sistem";

      return `
            <tr>
                <td><strong>${prod.orderNo}</strong></td>
                <td>${productName}</td>
                <td>
                    <span class="badge info">${quantity} adet</span>
                </td>
                <td>${shipmentDate}</td>
                <td>${shippedBy}</td>
                <td><span class="badge success">Sevk Edildi</span></td>
                <td>
                    <div class="action-buttons">
                        <button class="action-btn primary" onclick="reProduceOrder('${prod.id}')" title="Tekrar Üret">
                            <i class="fas fa-redo"></i>
                        </button>
                        <button class="action-btn info" onclick="showShipmentDetails('${prod.id}')" title="Detaylar">
                            <i class="fas fa-info-circle"></i>
                        </button>
                        <button class="action-btn danger" onclick="deleteShipment('${prod.id}')" title="Sevkiyatı Sil">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    })
    .join("");
}
function showShipmentDetails(productionId) {
  const prod = window.firebaseData?.production?.find(
    (p) => p.id === productionId
  );
  if (!prod) {
    showNotification("Hata", "Sevkiyat kaydı bulunamadı.", "error");
    return;
  }
  const modalHTML = `
        <div id="shipmentDetailModal" class="modal show">
            <div class="modal-content" style="max-width: 600px;">
                <div class="modal-header">
                    <h3 class="modal-title">Sevkiyat Detayları - ${
                      prod.orderNo
                    }</h3>
                    <button class="modal-close" onclick="closeModal('shipmentDetailModal')">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="modal-body">
                    <div style="background: var(--success); color: white; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
                        <h4 style="margin: 0; color: white;"><i class="fas fa-check-circle"></i> Sevk Edildi</h4>
                        <p style="margin: 5px 0 0 0;">Bu ürün başarıyla sevk edilmiştir</p>
                    </div>
                    
                    <div class="form-grid">
                        <div class="form-group">
                            <label class="form-label">İş Emri No</label>
                            <input type="text" class="form-control" value="${
                              prod.orderNo
                            }" readonly>
                        </div>
                        <div class="form-group">
                            <label class="form-label">Ürün</label>
                            <input type="text" class="form-control" value="${
                              prod.product ||
                              prod.productName ||
                              "Belirtilmemiş"
                            }" readonly>
                        </div>
                        <div class="form-group">
                            <label class="form-label">Miktar</label>
                            <input type="text" class="form-control" value="${
                              prod.quantity || 0
                            } adet" readonly>
                        </div>
                        <div class="form-group">
                            <label class="form-label">Sevk Tarihi</label>
                            <input type="text" class="form-control" value="${
                              prod.shipmentDate || prod.completedDate || "-"
                            }" readonly>
                        </div>
                        <div class="form-group">
                            <label class="form-label">Sevk Eden</label>
                            <input type="text" class="form-control" value="${
                              prod.shippedByName || "Sistem"
                            }" readonly>
                        </div>
                        <div class="form-group">
                            <label class="form-label">Sevk Saati</label>
                            <input type="text" class="form-control" value="${
                              prod.shipmentTime || "-"
                            }" readonly>
                        </div>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-primary" onclick="reProduceOrder('${
                      prod.id
                    }')">
                        <i class="fas fa-redo"></i> Tekrar Üret
                    </button>
                    <button class="btn btn-outline" onclick="closeModal('shipmentDetailModal')">Kapat</button>
                </div>
            </div>
        </div>
    `;

  document.body.insertAdjacentHTML("beforeend", modalHTML);
}

function showAllShipments() {
  const message = document.getElementById("sevkiyatEdilenMessage");
  const table = document.getElementById("sevkiyatEdilenTable");

  if (message) message.style.display = "none";
  if (table) table.style.display = "table";

  const allShipped = firebaseData.production.filter(
    (p) => p.shipmentStatus === "Sevk Edildi"
  );

  const tbody = document.getElementById("sevkiyatEdilenTableBody");
  if (tbody) {
    tbody.innerHTML =
      allShipped
        .map(
          (prod) => `
            <tr>
                <td><strong>${prod.orderNo}</strong></td>
                <td>${prod.product}</td>
                <td>${getCustomerName(prod.companyId)}</td>
                <td>${prod.quantity}</td>
                <td>${prod.shipmentDate || "Belirtilmemiş"}</td>
                <td><span class="badge success">Sevk Edildi</span></td>
            </tr>
        `
        )
        .join("") ||
      '<tr><td colspan="6" class="text-gray-500">Sevk edilen ürün bulunmuyor</td></tr>';
  }
}
function filterSevkiyatEdilen() {
  const search =
    document.getElementById("shipmentEdilenSearch")?.value?.toLowerCase() || "";
  const dateFrom =
    document.getElementById("shipmentEdilenDateFrom")?.value || "";
  const dateTo = document.getElementById("shipmentEdilenDateTo")?.value || "";
  if (!search && !dateFrom && !dateTo) {
    const message = document.getElementById("sevkiyatEdilenMessage");
    const table = document.getElementById("sevkiyatEdilenTable");

    if (message) message.style.display = "block";
    if (table) table.style.display = "none";
    return;
  }
  const message = document.getElementById("sevkiyatEdilenMessage");
  const table = document.getElementById("sevkiyatEdilenTable");

  if (message) message.style.display = "none";
  if (table) table.style.display = "table";

  const allProduction = window.firebaseData?.production || [];
  const shippedItems = allProduction.filter(
    (p) => p.shipmentStatus === "Sevk Edildi"
  );

  const filteredData = shippedItems.filter((p) => {
    // Arama filtresi
    if (search) {
      const productName = (p.product || p.productName || "").toLowerCase();
      const orderNo = (p.orderNo || "").toLowerCase();
      if (!productName.includes(search) && !orderNo.includes(search)) {
        return false;
      }
    }
    const shipmentDate = p.shipmentDate || p.completedDate;
    if (dateFrom && shipmentDate) {
      const prodDate = new Date(shipmentDate);
      const filterFromDate = new Date(dateFrom);
      if (prodDate < filterFromDate) return false;
    }

    if (dateTo && shipmentDate) {
      const prodDate = new Date(shipmentDate);
      const filterToDate = new Date(dateTo);
      if (prodDate > filterToDate) return false;
    }

    return true;
  });

  const tbody = document.getElementById("sevkiyatEdilenTableBody");
  if (!tbody) return;

  console.log("🔍 Filtrelenmiş sevkiyat sayısı:", filteredData.length);

  if (filteredData.length === 0) {
    tbody.innerHTML =
      '<tr><td colspan="7" style="text-align: center; padding: 40px; color: var(--gray-500);">Filtrelemeye uygun kayıt bulunamadı.</td></tr>';
    return;
  }
  const sortedFiltered = filteredData.sort((a, b) => {
    const dateA = new Date(a.shipmentDate || a.completedDate || "1970-01-01");
    const dateB = new Date(b.shipmentDate || b.completedDate || "1970-01-01");
    return dateB - dateA;
  });

  tbody.innerHTML = sortedFiltered
    .map((prod) => {
      const productName = prod.product || prod.productName || "Belirtilmemiş";
      const quantity = prod.quantity || 0;
      const shipmentDate = prod.shipmentDate || prod.completedDate || "-";
      const shippedBy = prod.shippedByName || "Sistem";

      return `
            <tr>
                <td><strong>${prod.orderNo}</strong></td>
                <td>${productName}</td>
                <td><span class="badge info">${quantity} adet</span></td>
                <td>${shipmentDate}</td>
                <td>${shippedBy}</td>
                <td><span class="badge success">Sevk Edildi</span></td>
                <td>
                    <div class="action-buttons">
                        <button class="action-btn primary" onclick="reProduceOrder('${prod.id}')" title="Tekrar Üret">
                            <i class="fas fa-redo"></i>
                        </button>
                        <button class="action-btn info" onclick="showShipmentDetails('${prod.id}')" title="Detaylar">
                            <i class="fas fa-info-circle"></i>
                        </button>
                        <button class="action-btn danger" onclick="deleteShipment('${prod.id}')" title="Sevkiyatı Sil">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    })
    .join("");
}
function updatePriceFromProduct(select) {
  const tr = select.closest("tr");
  const priceInput = tr.querySelectorAll('input[type="number"]')[1];
  const selectedOption = select.selectedOptions[0];

  if (selectedOption && selectedOption.dataset.price) {
    priceInput.value = selectedOption.dataset.price;
  }
}

// Tüm veriyi ZIP olarak export et
async function exportAllData() {
  try {
    showNotification(
      "İşleniyor",
      "Veriler hazırlanıyor, lütfen bekleyin...",
      "info"
    );

    const zip = new JSZip();
    const date = new Date().toISOString().split("T")[0];
    const folderName = `erp_backup_${date}`;

    // Her veri tipini ayrı dosya olarak ekle
    const dataTypes = [
      { name: "users", data: firebaseData.users },
      { name: "products", data: firebaseData.products },
      { name: "stock", data: firebaseData.stock },
      { name: "companies", data: firebaseData.companies },
      { name: "recipes", data: firebaseData.recipes },
      { name: "production", data: firebaseData.production },
      { name: "offers", data: firebaseData.offers },
      { name: "shipments", data: firebaseData.shipments },
    ];

    // Metadata dosyası
    const metadata = {
      exportDate: new Date().toISOString(),
      exportedBy: currentUser.name,
      version: "1.0",
      stats: {
        users: firebaseData.users.length,
        products: firebaseData.products.length,
        stock: firebaseData.stock.length,
        companies: firebaseData.companies.length,
        recipes: firebaseData.recipes.length,
        production: firebaseData.production.length,
        offers: firebaseData.offers.length,
        shipments: firebaseData.shipments.length,
      },
    };

    zip.file(`${folderName}/metadata.json`, JSON.stringify(metadata, null, 2));

   
    dataTypes.forEach((type) => {
      const fileName = `${folderName}/${type.name}.json`;
      const fileContent = JSON.stringify(type.data, null, 2);
      zip.file(fileName, fileContent);
    });

    const content = await zip.generateAsync({ type: "blob" });
    const url = URL.createObjectURL(content);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${folderName}.zip`;
    link.click();
    URL.revokeObjectURL(url);

    showNotification(
      "Başarılı",
      `Tüm veriler ${folderName}.zip dosyasına aktarıldı.`,
      "success"
    );
  } catch (error) {
    console.error("Export hatası:", error);
    showNotification("Hata", "Veri aktarımı sırasında hata oluştu.", "error");
  }
}

async function exportYearData() {
  const year = document.getElementById("exportYear").value;

  try {
    showNotification(
      "İşleniyor",
      `${year} yılı verileri hazırlanıyor...`,
      "info"
    );

    const zip = new JSZip();
    const date = new Date().toISOString().split("T")[0];
    const folderName = `erp_${year}_backup_${date}`;

    // Yıla göre filtrele
    const filteredProduction = firebaseData.production.filter((p) => {
      const date = p.startDate || p.completedDate || "";
      return date.includes(year);
    });

    const filteredOffers = firebaseData.offers.filter((o) => {
      const date = o.date || "";
      return date.includes(year);
    });

    const filteredShipments = firebaseData.shipments.filter((s) => {
      const date = s.date || "";
      return date.includes(year);
    });

    // Metadata
    const metadata = {
      exportDate: new Date().toISOString(),
      exportedBy: currentUser.name,
      year: year,
      version: "1.0",
      stats: {
        production: filteredProduction.length,
        offers: filteredOffers.length,
        shipments: filteredShipments.length,
      },
    };

    // Dosyaları ZIP'e ekle
    zip.file(`${folderName}/metadata.json`, JSON.stringify(metadata, null, 2));
    zip.file(
      `${folderName}/production_${year}.json`,
      JSON.stringify(filteredProduction, null, 2)
    );
    zip.file(
      `${folderName}/offers_${year}.json`,
      JSON.stringify(filteredOffers, null, 2)
    );
    zip.file(
      `${folderName}/shipments_${year}.json`,
      JSON.stringify(filteredShipments, null, 2)
    );

    // Master data'ları da referans için ekle
    zip.file(
      `${folderName}/reference/products.json`,
      JSON.stringify(firebaseData.products, null, 2)
    );
    zip.file(
      `${folderName}/reference/companies.json`,
      JSON.stringify(firebaseData.companies, null, 2)
    );
    zip.file(
      `${folderName}/reference/recipes.json`,
      JSON.stringify(firebaseData.recipes, null, 2)
    );

    // ZIP'i indir
    const content = await zip.generateAsync({ type: "blob" });
    const url = URL.createObjectURL(content);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${folderName}.zip`;
    link.click();
    URL.revokeObjectURL(url);

    showNotification(
      "Başarılı",
      `${year} yılı verileri ${folderName}.zip dosyasına aktarıldı.`,
      "success"
    );
  } catch (error) {
    console.error("Export hatası:", error);
    showNotification(
      "Hata",
      "Yıllık veri aktarımı sırasında hata oluştu.",
      "error"
    );
  }
}
async function exportSelectedData() {
  const selectedTypes = [];
  document.querySelectorAll('input[name="dataType"]:checked').forEach((cb) => {
    selectedTypes.push(cb.value);
  });
  if (selectedTypes.length === 0) {
    showNotification("Uyarı", "Lütfen en az bir veri tipi seçin.", "warning");
    return;
  }
  try {
    showNotification("İşleniyor", "Seçili veriler hazırlanıyor...", "info");
    const zip = new JSZip();
    const date = new Date().toISOString().split("T")[0];
    const folderName = `erp_selected_${date}`;

    // Metadata
    const metadata = {
      exportDate: new Date().toISOString(),
      exportedBy: currentUser.name,
      selectedTypes: selectedTypes,
      version: "1.0",
    };

    zip.file(`${folderName}/metadata.json`, JSON.stringify(metadata, null, 2));

    // Seçili veri tiplerini ekle
    selectedTypes.forEach((type) => {
      if (firebaseData[type]) {
        zip.file(
          `${folderName}/${type}.json`,
          JSON.stringify(firebaseData[type], null, 2)
        );
      }
    });
    const content = await zip.generateAsync({ type: "blob" });
    const url = URL.createObjectURL(content);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${folderName}.zip`;
    link.click();
    URL.revokeObjectURL(url);

    showNotification(
      "Başarılı",
      `Seçili veriler ${folderName}.zip dosyasına aktarıldı.`,
      "success"
    );
  } catch (error) {
    console.error("Export hatası:", error);
    showNotification("Hata", "Veri aktarımı sırasında hata oluştu.", "error");
  }
}
async function cleanOldData() {
  const year = document.getElementById("cleanYear").value;
  if (!year) {
    showNotification("Uyarı", "Lütfen temizlenecek yılı seçin.", "warning");
    return;
  }
  const confirmMsg = `DİKKAT! ${year} ve öncesine ait tüm veriler silinecek.\n\nDevam etmeden önce:\n1. Veriyi yedeklediniz mi?\n2. Bu işlem geri alınamaz!\n\nDevam etmek istiyor musunuz?`;

  if (!confirm(confirmMsg)) {
    return;
  }
  if (!confirm("Son kez onaylayın: Veriler SİLİNECEK!")) {
    return;
  }

  try {
    showNotification(
      "İşleniyor",
      "Veriler temizleniyor, lütfen bekleyin...",
      "info"
    );
    let deletedCount = 0;
    for (const prod of firebaseData.production) {
      const date = prod.startDate || prod.completedDate || "";
      const prodYear = parseInt(date.split(".")[2] || date.split("-")[0]);

      if (prodYear <= parseInt(year)) {
        await window.firestoreService.deleteProduction(prod.id);
        deletedCount++;
      }
    }
    for (const offer of firebaseData.offers) {
      const date = offer.date || "";
      const offerYear = parseInt(date.split("-")[0]);

      if (offerYear <= parseInt(year)) {
        await window.firestoreService.deleteOffer(offer.id);
        deletedCount++;
      }
    }
    for (const shipment of firebaseData.shipments) {
      const date = shipment.date || "";
      const shipYear = parseInt(date.split(".")[2] || date.split("-")[0]);

      if (shipYear <= parseInt(year)) {
        await window.firestoreService.deleteShipment(shipment.id);
        deletedCount++;
      }
    }
    await loadFirebaseData();

    showNotification(
      "Başarılı",
      `${deletedCount} kayıt başarıyla silindi.`,
      "success"
    );
    loadAdmin(); // Sayfayı yenile
  } catch (error) {
    console.error("Temizleme hatası:", error);
    showNotification("Hata", "Veri temizleme sırasında hata oluştu.", "error");
  }
}
async function importData(event) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = async function (e) {
    try {
      const importedData = JSON.parse(e.target.result);
      if (
        !confirm(`${importedData.exportDate} tarihli yedek yüklenecek. Devam?`)
      ) {
        return;
      }
      showNotification(
        "Başarılı",
        "Veriler başarıyla içe aktarıldı.",
        "success"
      );
    } catch (error) {
      console.error("Import hatası:", error);
      showNotification("Hata", "Dosya okunamadı.", "error");
    }
  };
  reader.readAsText(file);
}
function debugApplication() {
  console.group("🔍 Uygulama Durumu Kontrolü");

  // Firebase bağlantı kontrolü
  console.log(
    "Database Bağlantısı:",
    window.firestoreService ? "✅ Aktif" : "❌ Bağlı Değil"
  );

  console.log(
    "Aktif Kullanıcı:",
    currentUser
      ? `✅ ${currentUser.name} (${currentUser.role})`
      : "❌ Giriş Yapılmamış"
  );

  console.log("Yüklü Veri Setleri:");
  console.log("  - Kullanıcılar:", firebaseData.users?.length || 0);
  console.log("  - Ürünler:", firebaseData.products?.length || 0);
  console.log("  - Stok:", firebaseData.stock?.length || 0);
  console.log("  - Firmalar:", firebaseData.companies?.length || 0);
  console.log("  - Reçeteler:", firebaseData.recipes?.length || 0);
  console.log("  - Üretim:", firebaseData.production?.length || 0);
  console.log("  - Teklifler:", firebaseData.offers?.length || 0);
  console.log("  - Sevkiyatlar:", firebaseData.shipments?.length || 0);
  console.log("Aktif Sayfa:", currentPage);

  if (window.performance) {
    const perfData = window.performance.getEntriesByType("navigation")[0];
    console.log(
      "Sayfa Yükleme Süresi:",
      perfData
        ? `${perfData.loadEventEnd - perfData.fetchStart}ms`
        : "Ölçülemedi"
    );
  }
  console.groupEnd();
  return {
    firebase: !!window.firestoreService,
    user: !!currentUser,
    dataLoaded: Object.keys(firebaseData).every((key) =>
      Array.isArray(firebaseData[key])
    ),
    currentPage: currentPage,
  };
}
window.debugApp = debugApplication;
function getPendingLeaveCount() {
  return leaveRequests.filter((l) => l.status === "pending").length;
}
function getUpcomingHolidaysCount() {
  const today = new Date();
  const year = today.getFullYear();
  return officialHolidays[year].filter((h) => {
    const holidayDate = new Date(h.date);
    return (
      holidayDate > today &&
      holidayDate < new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000)
    );
  }).length;
}
function renderLeaveTable(leaves) {
  const ITEMS_PER_PAGE = 20;
  const visibleLeaves = leaves.slice(0, ITEMS_PER_PAGE);
  // Sadece görünen kayıtları render et
}
function showWorkDetails(userId, date) {
  const user = firebaseData.users.find((u) => u.id === userId);
  const dayActivities = [];

  firebaseData.production.forEach((prod) => {
    (prod.approvals || []).forEach((approval) => {
      if (approval.userId === userId && approval.date === date) {
        dayActivities.push({
          time: approval.approvedAt
            ? new Date(approval.approvedAt).toLocaleTimeString("tr-TR")
            : "-",
          orderNo: prod.orderNo,
          product: prod.product,
          department: approval.department,
          timeSpent: parseFloat(approval.timeSpent) || 0,
          type: "Onay",
        });
      }
    });

    (prod.workTimeRecords || []).forEach((record) => {
      if (record.userId === userId && record.date === date) {
        dayActivities.push({
          time: record.createdAt
            ? new Date(record.createdAt).toLocaleTimeString("tr-TR")
            : "-",
          orderNo: record.orderNo || prod.orderNo,
          product: prod.product,
          department: record.department,
          timeSpent: parseFloat(record.timeSpent) || 0,
          type: "Çalışma",
        });
      }
    });
  });

  const totalHours = dayActivities.reduce((sum, a) => sum + a.timeSpent, 0);
  const modalHTML = `
        <div id="workDetailsModal" class="modal show" style="z-index: 10001;">
            <div class="modal-content" style="max-width: 700px;">
                <div class="modal-header">
                    <h3 class="modal-title">${
                      user.name
                    } - ${date} Tarihli Çalışma Detayları</h3>
                    <button class="modal-close" onclick="closeModal('workDetailsModal')">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="modal-body">
                    <div style="background: var(--primary); color: white; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
                        <div style="font-size: 24px; font-weight: bold;">${totalHours.toFixed(
                          1
                        )} saat</div>
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
                            ${dayActivities
                              .map(
                                (activity) => `
                                <tr>
                                    <td>${activity.time}</td>
                                    <td><strong>${
                                      activity.orderNo
                                    }</strong></td>
                                    <td>${activity.product}</td>
                                    <td><span class="badge primary">${
                                      activity.department
                                    }</span></td>
                                    <td><strong>${activity.timeSpent.toFixed(
                                      1
                                    )} saat</strong></td>
                                    <td><span class="badge ${
                                      activity.type === "Onay"
                                        ? "success"
                                        : "info"
                                    }">${activity.type}</span></td>
                                </tr>
                            `
                              )
                              .join("")}
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

  document.body.insertAdjacentHTML("beforeend", modalHTML);
}
function toggleMobileMenu(event) {
    if (event) {
        event.preventDefault();
        event.stopPropagation();
    }
    
    const sidebar = document.querySelector(".sidebar");
    const overlay = document.querySelector(".sidebar-overlay");
    
    if (!sidebar || !overlay) {
        console.error("Sidebar veya overlay bulunamadı!");
        return;
    }
    
    const isActive = sidebar.classList.toggle("mobile-active");
    overlay.classList.toggle("active");
    document.body.classList.toggle("menu-open", isActive);
    
    console.log("Menü:", isActive ? "Açık" : "Kapalı");
}

function createEditButton(type, id, isMobile = false) {
  const buttonClass = isMobile ? "btn btn-sm btn-primary" : "action-btn edit";
  const iconOnly = !isMobile;

  return `
        <button class="${buttonClass}" onclick="edit${type}('${id}')" title="Düzenle">
            <i class="fas fa-edit"></i>
            ${!iconOnly ? " Düzenle" : ""}
        </button>
    `;
}
function isMobileDevice() {
    const isMobile = window.innerWidth <= 768;
    console.log("📱 Cihaz durumu:", isMobile ? "Mobil" : "Masaüstü");
    return isMobile;
}
function optimizeMobileDisplay() {
    console.log("📱 Ekran optimizasyonu yapılıyor, genişlik:", window.innerWidth);
    if (isMobileDevice()) {
        document.querySelectorAll(".action-btn, .btn, .preview-btn, .edit-btn").forEach(element => {
            element.style.display = "inline-flex";
            element.style.visibility = "visible";
            element.style.opacity = "1";
            element.style.margin = "4px";
            element.style.padding = "6px 10px";
            element.style.fontSize = "12px";
            element.style.whiteSpace = "nowrap";
        });
        document.querySelectorAll("table .action-buttons").forEach(cell => {
            cell.style.display = "flex";
            cell.style.flexDirection = "row";
            cell.style.gap = "5px";
            cell.style.justifyContent = "center";
            cell.style.alignItems = "center";
        });
        document.querySelectorAll(".modal-content").forEach(modal => {
            modal.style.width = "96vw";
            modal.style.maxWidth = "96vw";
            modal.style.maxHeight = "92vh";
        });
    } else {
        document.querySelectorAll(".action-btn, .btn").forEach(element => {
            element.style.display = "";
            element.style.visibility = "";
            element.style.opacity = "";
            element.style.margin = "";
            element.style.padding = "";
            element.style.fontSize = "";
            element.style.whiteSpace = "";
        });
        document.querySelectorAll("table .action-buttons").forEach(cell => {
            cell.style.display = "";
            cell.style.flexDirection = "";
            cell.style.gap = "";
            cell.style.justifyContent = "";
            cell.style.alignItems = "";
        });
        document.querySelectorAll(".modal-content").forEach(modal => {
            modal.style.width = "";
            modal.style.maxWidth = "";
            modal.style.maxHeight = "";
        });
    }
}

function applyMobileOptimizations(pageId) {
  optimizeMobileDisplay();

  if (pageId === "uretimListesi") {
    document
      .querySelectorAll("#productionListTable .action-buttons")
      .forEach((btnGroup) => {
        btnGroup.style.display = "flex";
        btnGroup.style.flexDirection = "row";
        btnGroup.style.gap = "4px";
        btnGroup.style.justifyContent = "center";
      });
  }

  if (pageId === "sevkiyatEdilen" || pageId === "sevkiyatBekleyen") {
    const table = document.getElementById(`${pageId}Table`);
    const message = document.getElementById(`${pageId}Message`);
    if (table && message) {
      table.style.display = "table";
      message.style.display = "none";
    }
  }

  if (pageId === "isEmriVer") {
    document
      .querySelectorAll("#recipePreview, #stockStatus, #latestOrders")
      .forEach((el) => {
        el.style.display = "block";
        el.style.margin = "8px 0";
        el.style.padding = "8px";
        el.style.border = "1px solid #e5e7eb";
        el.style.borderRadius = "6px";
      });
  }

  if (pageId === "teklifHazirla") {
    document
      .querySelectorAll("#offerProductsTable select, #offerProductsTable input")
      .forEach((input) => {
        input.style.fontSize = "12px";
        input.style.padding = "6px";
      });
  }

  if (pageId === "notifications") {
    document.querySelectorAll(".notification-item").forEach((item) => {
      item.style.padding = "6px";
      item.style.fontSize = "11px";
    });
  }

  if (pageId === "insanKaynaklari") {
    document.querySelectorAll(".leave-type-card").forEach((card) => {
      card.style.padding = "6px";
      card.style.fontSize = "10px";
    });
  }
}

function updateSidebarPermissions() {
  if (!currentUser) return;

  // Tüm bölümleri gizle
  const allSections = [
    "salesSection",
    "productSection",
    "productionSection",
    "operationSection",
    "stockCardsSection",
    "adminSection",
    "kullaniciSection",
    "HRSection",
  ];
  allSections.forEach((section) => {
    const element = document.getElementById(section);
    if (element) element.style.display = "none";
  });

  // Admin ise hepsini göster
  if (currentUser.role === "admin") {
    allSections.forEach((section) => {
      const element = document.getElementById(section);
      if (element) element.style.display = "block";
    });
    return;
  }

  // Manager ise admin hariç hepsini göster
  if (currentUser.role === "manager") {
    allSections.forEach((section) => {
      const element = document.getElementById(section);
      if (element) {
        if (section === "adminSection") {
          element.style.display = currentUser.permissions?.includes("admin")
            ? "block"
            : "none";
        } else {
          element.style.display = "block";
        }
      }
    });
    return;
  }

  // Normal kullanıcılar için yetki kontrolü
  if (hasPermission("sales")) {
    const element = document.getElementById("salesSection");
    if (element) element.style.display = "block";
  }

  if (hasPermission("products")) {
    const element = document.getElementById("productSection");
    if (element) element.style.display = "block";
  }

  if (hasPermission("production")) {
    const element = document.getElementById("productionSection");
    if (element) element.style.display = "block";
  }

  if (hasPermission("warehouse") || hasPermission("logistics")) {
    const element = document.getElementById("operationSection");
    if (element) element.style.display = "block";
  }

  // Stok Kartları yetkisi kontrolü - YENİ!
  if (hasPermission("stockCards")) {
    const element = document.getElementById("stockCardsSection");
    if (element) element.style.display = "block";
  }

  if (hasPermission("user_activities")) {
    const element = document.getElementById("kullaniciSection");
    if (element) element.style.display = "block";
  }

  if (hasPermission("hr")) {
    const element = document.getElementById("HRSection");
    if (element) element.style.display = "block";
  }

  if (hasPermission("admin")) {
    const element = document.getElementById("adminSection");
    if (element) element.style.display = "block";
  }
}

async function confirmRejectLeave(leaveId) {
  const reason = document.getElementById("rejectReason").value;
  const altStartDate = document.getElementById("altStartDate").value;
  const altEndDate = document.getElementById("altEndDate").value;
  const additionalNote = document.getElementById("additionalNote").value;

  if (!reason.trim()) {
    showNotification("Hata", "Red sebebi yazmalısınız.", "error");
    return;
  }

  try {
    const allLeaves = await window.firestoreService.getLeaveRequests();
    const leave = allLeaves.find((l) => l.id === leaveId);

    if (!leave) {
      showNotification("Hata", "İzin talebi bulunamadı.", "error");
      return;
    }

    const updateData = {
      status: "rejected",
      rejectReason: reason,
      rejectedBy: currentUser.id,
      rejectedByName: currentUser.name,
      rejectedDate: new Date().toISOString(),
      managerNote: additionalNote || null,
    };

    if (altStartDate && altEndDate) {
      updateData.alternativeDates = {
        start: altStartDate,
        end: altEndDate,
      };
    }

    await window.firestoreService.updateLeaveRequest(leaveId, updateData);

    let notificationMessage = `İzin talebiniz ${currentUser.name} tarafından reddedildi. Sebep: ${reason}`;

    if (updateData.alternativeDates) {
      notificationMessage += `\nAlternatif tarih önerisi: ${formatDate(
        altStartDate
      )} - ${formatDate(altEndDate)}`;
    }

    if (additionalNote) {
      notificationMessage += `\nYönetici notu: ${additionalNote}`;
    }

    await createNotification({
      type: "leave_rejected",
      title: "İzin Talebi Reddedildi",
      message: notificationMessage,
      from: currentUser.id,
      to: leave.employeeId,
      date: new Date().toISOString(),
    });

    showNotification(
      "İzin Reddedildi",
      "İzin talebi reddedildi ve personele bildirim gönderildi.",
      "info"
    );

    closeModal("rejectLeaveModal");
    await loadFirebaseData();
    loadInsanKaynaklari();
  } catch (error) {
    console.error("İzin reddetme hatası:", error);
    showNotification("Hata", "İzin reddedilemedi.", "error");
  }
}
// Helper fonksiyonlar
function openModal(modalId) {
  const modal = document.getElementById(modalId);
  if (!modal) return;

  modal.classList.add("show");

  // Modal dışına tıklamayı engelle
  modal.onclick = function (event) {
    event.stopPropagation();
  };

  // Modal içeriğine tıklama olayını durdur
  const modalContent = modal.querySelector(".modal-content");
  if (modalContent) {
    modalContent.onclick = function (event) {
      event.stopPropagation();
    };
  }

  // Sadece kapatma butonları çalışsın
  const closeBtn = modal.querySelector(".modal-close");
  if (closeBtn) {
    closeBtn.onclick = function () {
      closeModal(modalId);
    };
  }

  // İptal butonları
  const cancelBtns = modal.querySelectorAll(
    '[data-dismiss="modal"], .btn-cancel'
  );
  cancelBtns.forEach((btn) => {
    btn.onclick = function () {
      closeModal(modalId);
    };
  });
}

function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.remove("show");
    modal.onclick = null; // Event'i temizle
  }
}

// DOMContentLoaded'da backdrop tıklama eventlerini iptal et
document.addEventListener("DOMContentLoaded", function () {
  // Modal backdrop tıklama engellemesi - DÜZELTİLMİŞ
  document.addEventListener(
    "click",
    function (e) {
      // Eğer tıklanan element modal ise
      if (e.target.classList.contains("modal")) {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        return false;
      }
    },
    true
  ); // true = capture phase'de yakala

  // Her modal için ayrı ayrı engelleme
  document.querySelectorAll(".modal").forEach((modal) => {
    // Modal'ın kendisine (backdrop) tıklamayı engelle
    modal.addEventListener(
      "mousedown",
      function (e) {
        if (e.target === this) {
          e.preventDefault();
          e.stopPropagation();
          e.stopImmediatePropagation();
          return false;
        }
      },
      true
    );

    modal.addEventListener(
      "click",
      function (e) {
        if (e.target === this) {
          e.preventDefault();
          e.stopPropagation();
          e.stopImmediatePropagation();
          return false;
        }
      },
      true
    );
  });
});

// Modal açma fonksiyonunu override et
window.openModal = function (modalId) {
  const modal = document.getElementById(modalId);
  if (!modal) return;

  modal.classList.add("show");

  // Bu modal için özel engelleme
  modal.onclick = null; // Eski onclick'i temizle
  modal.addEventListener("click", function (e) {
    if (e.target === this) {
      e.stopPropagation();
      e.stopImmediatePropagation();
      return false;
    }
  });
};

// TÜM MODAL EVENT'LERİNİ OVERRIDE ET
Object.defineProperty(HTMLElement.prototype, "onclick", {
  set: function (fn) {
    if (this.classList && this.classList.contains("modal")) {
      // Modal için onclick engelle
      return;
    }
    this._onclick = fn;
  },
  get: function () {
    return this._onclick;
  },
});

window.closeModal = function (modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.remove("show");
  }
};

function closeAllModals() {
  modalManager.closeAllModals();
}

// Debug fonksiyonları (sorun olursa kullanmak için)
window.modalDebug = {
  status: () => {
    console.log("Açık Modallar:", Array.from(modalManager.activeModals));
    console.log("Modal Stack:", modalManager.modalStack);
  },
  closeAll: () => {
    modalManager.closeAllModals();
    console.log("Tüm modallar kapatıldı");
  },
  reset: () => {
    // Acil durum - her şeyi sıfırla
    document.querySelectorAll(".modal").forEach((modal) => {
      modal.classList.remove("show", "stacked");
      modal.style.zIndex = "";
    });
    document.body.classList.remove("modal-open");
    modalManager.modalStack = [];
    modalManager.activeModals.clear();
    console.log("Modal sistem sıfırlandı");
  },
};
function generateOfferNumber(companyId, projectName, isRevision = false) {
  const year = new Date().getFullYear();
  const offers = firebaseData.offers || [];

  if (isRevision) {
    // Bu proje için tüm revizyonları bul
    const projectRevisions = offers.filter(o => 
      o.companyId === companyId && 
      o.projectName === projectName && 
      o.isRevision === true
    );

    const revisionNumber = String(projectRevisions.length + 1).padStart(3, "0");
    return `TKF-${year}-R${revisionNumber}`;
  } else {
    // Normal teklif numarası
    const normalOffers = offers.filter(o => 
      o.offerNo && 
      !o.isRevision
    );
    const offerNumber = String(normalOffers.length + 1).padStart(4, "0");
    return `TKF-${year}-${offerNumber}`;
  }
}

// 2. Revizyon kontrol fonksiyonu
function checkForExistingProject(companyId, projectName) {
  const offers = firebaseData.offers || [];
  const existingOffer = offers.find(
    (o) =>
      o.companyId === companyId &&
      o.projectName === projectName &&
      o.status !== "Reddedildi"
  );

  return existingOffer;
}
function showRevisionWarningModal(existingOffer, newOfferData) {
  const company = firebaseData.companies.find(
    (c) => c.id === existingOffer.companyId
  );

  const modalHTML = `
        <div id="revisionWarningModal" class="modal show">
            <div class="modal-content" style="max-width: 600px;">
                <div class="modal-header" style="background: #ff9800; color: white;">
                    <h3 class="modal-title">
                        <i class="fas fa-exclamation-triangle"></i> Revizyon Uyarısı
                    </h3>
                    <button class="modal-close" onclick="closeModal('revisionWarningModal')">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="modal-body">
                    <div style="background: #fff3cd; padding: 15px; border-radius: 8px; margin-bottom: 20px; border-left: 4px solid #ff9800;">
                        <h4 style="color: #856404; margin: 0 0 10px 0;">
                            <i class="fas fa-info-circle"></i> Mevcut Proje Bulundu
                        </h4>
                        <p style="color: #856404; margin: 0;">
                            <strong>${company.name}</strong> firması için 
                            <strong>"${
                              existingOffer.projectName
                            }"</strong> projesi ile daha önce teklif hazırlanmış.
                        </p>
                    </div>
                    
                    <div class="form-grid">
                        <div class="form-group">
                            <label class="form-label">Mevcut Teklif No:</label>
                            <input type="text" class="form-control" value="${
                              existingOffer.offerNo
                            }" readonly>
                        </div>
                        <div class="form-group">
                            <label class="form-label">Teklif Tarihi:</label>
                            <input type="text" class="form-control" value="${
                              existingOffer.date
                            }" readonly>
                        </div>
                        <div class="form-group">
                            <label class="form-label">Mevcut Durum:</label>
                            <input type="text" class="form-control" value="${
                              existingOffer.status
                            }" readonly>
                        </div>
                        <div class="form-group">
                            <label class="form-label">Firma Yetkilisi:</label>
                            <input type="text" class="form-control" value="${
                              existingOffer.companyContact || "-"
                            }" readonly>
                        </div>
                    </div>
                    
                    <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; margin: 20px 0;">
                        <h5 style="color: #495057; margin: 0 0 10px 0;">Ne yapmak istiyorsunuz?</h5>
                        <div style="display: flex; flex-direction: column; gap: 10px;">
                            <label style="display: flex; align-items: center; gap: 8px;">
                                <input type="radio" name="revisionAction" value="revision" checked>
                                <strong>Revizyon oluştur</strong> - Yeni revizyon numarası ile kaydet
                            </label>
                            <label style="display: flex; align-items: center; gap: 8px;">
                                <input type="radio" name="revisionAction" value="new">
                                <strong>Yeni teklif</strong> - Farklı proje adı ile yeni teklif oluştur
                            </label>
                            <label style="display: flex; align-items: center; gap: 8px;">
                                <input type="radio" name="revisionAction" value="cancel">
                                <strong>İptal et</strong> - Teklif hazırlamayı iptal et
                            </label>
                        </div>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-warning" onclick="processRevisionDecision('${
                      existingOffer.id
                    }')">
                        <i class="fas fa-check"></i> Devam Et
                    </button>
                    <button class="btn btn-outline" onclick="closeModal('revisionWarningModal')">İptal</button>
                </div>
            </div>
        </div>
    `;

  document.body.insertAdjacentHTML("beforeend", modalHTML);

  window.pendingOfferData = newOfferData;
}

async function processRevisionDecision(existingOfferId) {
  const selectedAction = document.querySelector(
    'input[name="revisionAction"]:checked'
  ).value;
  const pendingData = window.pendingOfferData;

  if (selectedAction === "cancel") {
    closeModal("revisionWarningModal");
    showNotification("İptal Edildi", "Teklif hazırlama iptal edildi.", "info");
    return;
  }

  if (selectedAction === "new") {
    closeModal("revisionWarningModal");
    showNotification("Uyarı", "Lütfen farklı bir proje adı girin.", "warning");
    document.getElementById("offerProjectName").focus();
    return;
  }

  if (selectedAction === "revision") {
    // Loading başlat
    const processBtn = document.querySelector('#revisionWarningModal .btn-warning');
    const originalText = processBtn.innerHTML;
    processBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> İşleniyor...';
    processBtn.disabled = true;

    try {
      // Revizyon numarası oluştur
      const revisionOfferNo = generateOfferNumber(
        pendingData.companyId, 
        pendingData.projectName, 
        true
      );
      
      // Revizyon verilerini hazırla
      const revisionData = {
          ...pendingData,
          offerNo: revisionOfferNo,
          no: revisionOfferNo,
          isRevision: true,
          originalOfferId: existingOfferId,
          revisionDate: new Date().toISOString(),
          revisionNumber: getNextRevisionNumber(pendingData.companyId, pendingData.projectName)
      };

      await window.firestoreService.addOffer(revisionData);
      
      showNotification(
          'Revizyon Oluşturuldu',
          `${revisionOfferNo} numaralı revizyon teklifi oluşturuldu.`,
          'success'
      );
      
      closeModal('revisionWarningModal');
      clearOfferForm();
      
      // Firebase verilerini yenile
      await loadFirebaseData();
      
      // Teklif listesine yönlendir
      setTimeout(() => {
          showPage('teklifListesi');
      }, 500);
        
    } catch (error) {
        console.error('Revizyon kaydetme hatası:', error);
        showNotification('Hata', 'Revizyon kaydedilirken hata oluştu.', 'error');
    } finally {
        // Loading durdur
        processBtn.innerHTML = originalText;
        processBtn.disabled = false;
    }
  }
}

function clearOfferForm() {
  // Form alanlarını temizle
  document.getElementById("offerProductsTable").innerHTML = "";
  document.getElementById("offerSubtotal").textContent = "0 $";
  document.getElementById("offerTax").textContent = "0 $";
  document.getElementById("offerTotal").textContent = "0 $";
  
  // Firma seçimini temizle
  const companyBtn = document.getElementById("companySelectionBtn");
  companyBtn.innerHTML = '<i class="fas fa-building" style="margin-right: 8px;"></i>Firma seçiniz...';
  companyBtn.classList.remove("selected");
  companyBtn.style.borderColor = "";
  companyBtn.style.background = "";
  
  document.getElementById("offerCompanyId").value = "";
  document.getElementById("offerCompany").value = "";
  document.getElementById("offerProjectName").value = "";
  document.getElementById("offerDate").value = new Date().toISOString().split("T")[0];
  document.getElementById("offerValidity").value = "15 gün";
  
  // Yetkili dropdown'ını gizle ve temizle
  const contactGroup = document.getElementById("companyContactGroup");
  const contactSelect = document.getElementById("offerCompanyContact");
  if (contactGroup) contactGroup.style.display = "none";
  if (contactSelect) contactSelect.innerHTML = '<option value="">Yetkili seçiniz...</option>';
  
  // Revizyon butonunu kaldır (varsa)
  const revisionBtn = document.getElementById('revisionBtn');
  if (revisionBtn) revisionBtn.remove();
  
  // LocalStorage'dan revizyon verisini temizle
  localStorage.removeItem('revisionOfferData');
  
  // Pending data'yı temizle
  if (window.pendingOfferData) {
    delete window.pendingOfferData;
  }

  // REVİZYON MODUNU TEMİZLE
  window.isRevisionMode = false;
  if (window.originalOfferData) {
    delete window.originalOfferData;
  }

  // Sayfa başlığını normale döndür
  const pageTitle = document.querySelector('.page-title');
  if (pageTitle) {
    pageTitle.innerHTML = '<i class="fas fa-file-contract"></i> Teklif Hazırla';
  }
}

function prepareRevisionOffer(offerId) {
  const offer = firebaseData.offers.find((o) => o.id === offerId);
  if (!offer) {
    showNotification("Hata", "Teklif bulunamadı.", "error");
    return;
  }

  // Teklif verilerini localStorage'a kaydet
  localStorage.setItem("revisionOfferData", JSON.stringify(offer));
  showNotification(
    "Yönlendiriliyor",
    "Teklif hazırlama sayfasına yönlendiriliyorsunuz...",
    "info"
  );
  showPage("teklifHazirla");
}

function addRevisionButton() {
  const buttonContainer = document.querySelector('.card-body div[style*="text-align: right"]:last-child');
  if (buttonContainer && !document.getElementById('revisionBtn')) {
    const revisionBtn = document.createElement('button');
    revisionBtn.id = 'revisionBtn';
    revisionBtn.className = 'btn btn-warning';
    revisionBtn.innerHTML = '<i class="fas fa-edit"></i> Revizyon Oluştur';
    revisionBtn.onclick = () => createRevision();
    revisionBtn.style.marginRight = '10px';
    
    buttonContainer.insertBefore(revisionBtn, buttonContainer.firstChild);
  }
}
function fillOfferFormFromRevision(offerData) {
  // Revizyon modunu işaretle
  window.isRevisionMode = true;
  window.originalOfferData = offerData;

  // Firma bilgilerini doldur
  document.getElementById("offerCompanyId").value = offerData.companyId;
  document.getElementById("offerCompany").value = offerData.companyId;

  const company = firebaseData.companies.find(c => c.id === offerData.companyId);
  if (company) {
    const companyBtn = document.getElementById("companySelectionBtn");
    companyBtn.innerHTML = `<i class="fas fa-building" style="margin-right: 8px;"></i><strong>${company.name}</strong>`;
    companyBtn.classList.add("selected");
    companyBtn.style.borderColor = "#ff9800";
    companyBtn.style.background = "#fff3e0";
    
    // Firma yetkililerini yükle
    loadCompanyContacts(offerData.companyId);
    
    // Yetkiliyi seç
    setTimeout(() => {
      if (offerData.companyContact) {
        const contactSelect = document.getElementById("offerCompanyContact");
        if (contactSelect) {
          contactSelect.value = offerData.companyContact;
        }
      }
    }, 500);
  }

  // Proje bilgilerini doldur
  document.getElementById("offerProjectName").value = offerData.projectName || "";
  document.getElementById("offerDate").value = new Date().toISOString().split("T")[0];
  document.getElementById("offerValidity").value = offerData.validity || "15 gün";

  // Ürünleri doldur
  const tableBody = document.getElementById("offerProductsTable");
  tableBody.innerHTML = "";

  if (offerData.products && offerData.products.length > 0) {
    offerData.products.forEach((productData) => {
      addOfferProduct();
      const lastRow = tableBody.lastElementChild;

      const productSelect = lastRow.querySelector("select");
      productSelect.value = productData.productId;

      const qtyInput = lastRow.querySelectorAll('input[type="number"]')[0];
      const priceInput = lastRow.querySelectorAll('input[type="number"]')[1];

      qtyInput.value = productData.quantity;
      priceInput.value = productData.unitPrice;

      updateTechnicalSpecs(productSelect);
    });

    calculateOfferTotal();
  }

  // Revizyon uyarısı göster
  showNotification(
    'Revizyon Modu',
    'Teklif verileri yüklendi. Değişiklik yapıp "Teklifi Kaydet" dediğinizde revizyon oluşturulacak.',
    'warning'
  );

  // Sayfa başlığını güncelle
  const pageTitle = document.querySelector('.page-title');
  if (pageTitle) {
    pageTitle.innerHTML = '<i class="fas fa-file-contract"></i> Teklif Hazırla <span style="background: #ff9800; color: white; padding: 4px 8px; border-radius: 12px; font-size: 12px; margin-left: 10px;">REVIZYON MODU</span>';
  }
}

async function createRevision() {
  const companyId = document.getElementById("offerCompanyId")?.value || "";
  const projectName = document.getElementById("offerProjectName")?.value?.trim() || "";
  
  if (!companyId || !projectName) {
    showNotification('Hata', 'Firma ve proje adı gereklidir.', 'error');
    return;
  }

  // Mevcut form verilerini topla
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

  const tax = subTotal * 0.20;
  const grandTotal = subTotal + tax;

  // Revizyon numarası oluştur - Firma ve proje bazlı
  const revisionOfferNo = generateOfferNumber(companyId, projectName, true);

  // Yetkili bilgisini al
  let companyContact = '';
  const contactValue = document.getElementById('offerCompanyContact').value;
  if (contactValue) {
    try {
      const contact = JSON.parse(contactValue);
      companyContact = contact.name;
    } catch (e) {
      companyContact = contactValue;
    }
  }

  const offerData = {
    offerNo: revisionOfferNo,
    no: revisionOfferNo,
    companyId: companyId,
    projectName: projectName,
    companyContact: companyContact,
    date: document.getElementById('offerDate').value,
    validity: document.getElementById('offerValidity').value,
    montage: document.getElementById('offerMontage').value,
    products: products,
    subtotal: subTotal,
    tax: tax,
    total: grandTotal,
    status: 'Beklemede',
    isRevision: true,
    createdAt: new Date().toISOString(),
    active: true
  };

  try {
    await window.firestoreService.addOffer(offerData);
    showNotification(
      'Revizyon Oluşturuldu',
      `${revisionOfferNo} numaralı revizyon teklifi oluşturuldu.`,
      'success'
    );
    
    clearOfferForm();
    await loadFirebaseData();
    showPage('teklifListesi');
  } catch (error) {
    console.error('Revizyon kaydetme hatası:', error);
    showNotification('Hata', 'Revizyon kaydedilirken hata oluştu.', 'error');
  }
}

function cleanupModals() {
    // Eski modalları temizle
    const oldModals = ['revisionWarningModal', 'offerPreviewModal', 'companySelectionModal'];
    oldModals.forEach(modalId => {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.remove();
        }
    });
    
    // Global değişkenleri temizle
    if (window.pendingOfferData) {
        delete window.pendingOfferData;
    }
}
// Debounce fonksiyonu ekle
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

// Hesaplama fonksiyonlarını debounce ile kullan
const debouncedCalculateOfferTotal = debounce(calculateOfferTotal, 300);


class ImprovedModalManager {
    constructor() {
        this.activeModals = new Map(); // Set yerine Map kullanıyoruz
        this.modalStack = [];
        this.eventHandlers = new WeakMap(); // Memory leak önlemek için
        this.isProcessing = false; // İşlem kilidi
        this.init();
    }

    init() {
        // ESC tuşu ile kapatma
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.modalStack.length > 0 && !this.isProcessing) {
                const topModal = this.modalStack[this.modalStack.length - 1];
                this.closeModal(topModal);
            }
        });

        // Sayfa yüklendiğinde mevcut modalları temizle
        this.cleanupAllModals();
    }

    openModal(modalId) {
        // İşlem kilidi kontrolü
        if (this.isProcessing) {
            console.warn('Modal işlemi devam ediyor, lütfen bekleyin...');
            return;
        }

        const modal = document.getElementById(modalId);
        if (!modal) {
            console.error(`Modal bulunamadı: ${modalId}`);
            return;
        }

        // Önce eski event listener'ları temizle
        this.removeEventListeners(modal);

        // Modal'ı aç
        modal.classList.add('show');
        document.body.classList.add('modal-open');

        // Z-index yönetimi
        const zIndex = 1050 + (this.modalStack.length * 10);
        modal.style.zIndex = zIndex;

        // Stack'e ekle
        if (!this.modalStack.includes(modalId)) {
            this.modalStack.push(modalId);
        }
        this.activeModals.set(modalId, { zIndex, opened: Date.now() });

        // Event listener'ları ekle
        this.addEventListeners(modal, modalId);

        console.log(`Modal açıldı: ${modalId}, Z-Index: ${zIndex}`);
    }

    closeModal(modalId) {
        // İşlem kilidi kontrolü
        if (this.isProcessing) {
            console.warn('Modal işlemi devam ediyor, lütfen bekleyin...');
            return;
        }

        const modal = document.getElementById(modalId);
        if (!modal) return;

        // Animasyon ile kapat
        modal.classList.remove('show');
        
        // Event listener'ları temizle
        this.removeEventListeners(modal);

        // Stack'ten kaldır
        this.modalStack = this.modalStack.filter(m => m !== modalId);
        this.activeModals.delete(modalId);

        // Z-index sıfırla
        setTimeout(() => {
            modal.style.zIndex = '';
        }, 300);

        // Body class kontrolü
        if (this.modalStack.length === 0) {
            document.body.classList.remove('modal-open');
        }

        console.log(`Modal kapatıldı: ${modalId}`);
    }

    addEventListeners(modal, modalId) {
        // Kapatma butonu
        const closeBtn = modal.querySelector('.modal-close');
        if (closeBtn) {
            const handler = (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.closeModal(modalId);
            };
            
            closeBtn.addEventListener('click', handler);
            this.eventHandlers.set(closeBtn, handler);
        }

        const cancelBtns = modal.querySelectorAll('[data-dismiss="modal"], .btn-cancel, .btn-outline');
        cancelBtns.forEach(btn => {
            const handler = (e) => {
                if (btn.textContent.includes('İptal') || btn.textContent.includes('Kapat')) {
                    e.preventDefault();
                    e.stopPropagation();
                    this.closeModal(modalId);
                }
            };
            
            btn.addEventListener('click', handler);
            this.eventHandlers.set(btn, handler);
        });

        // Modal dışına tıklama engellemesi
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                e.stopPropagation();
            }
        });
    }

    removeEventListeners(modal) {
        // Kapatma butonu
        const closeBtn = modal.querySelector('.modal-close');
        if (closeBtn) {
            const handler = this.eventHandlers.get(closeBtn);
            if (handler) {
                closeBtn.removeEventListener('click', handler);
                this.eventHandlers.delete(closeBtn);
            }
        }
        const cancelBtns = modal.querySelectorAll('[data-dismiss="modal"], .btn-cancel, .btn-outline');
        cancelBtns.forEach(btn => {
            const handler = this.eventHandlers.get(btn);
            if (handler) {
                btn.removeEventListener('click', handler);
                this.eventHandlers.delete(btn);
            }
        });
    }

    cleanupAllModals() {
        // Tüm açık modalları temizle
        document.querySelectorAll('.modal.show').forEach(modal => {
            modal.classList.remove('show');
            modal.style.zIndex = '';
            this.removeEventListeners(modal);
        });

        // Body class'ını temizle
        document.body.classList.remove('modal-open');

        // Stack'leri sıfırla
        this.modalStack = [];
        this.activeModals.clear();
    }

    setProcessing(state) {
        this.isProcessing = state;
    }
}

const modalManager = new ImprovedModalManager();
window.openModal = function(modalId) {
    modalManager.openModal(modalId);
};

window.closeModal = function(modalId) {
    modalManager.closeModal(modalId);
};

class ButtonManager {
    constructor() {
        this.processingButtons = new Set();
        this.originalContents = new Map();
    }

    async processButton(button, callback, loadingText = 'İşleniyor...') {
        // Zaten işlemde mi kontrol et
        if (this.processingButtons.has(button)) {
            console.warn('Bu buton zaten işlemde');
            return;
        }

        // Butonu işleme al
        this.processingButtons.add(button);
        const originalContent = button.innerHTML;
        this.originalContents.set(button, originalContent);

        // Loading durumu
        button.disabled = true;
        button.innerHTML = `<i class="fas fa-spinner fa-spin"></i> ${loadingText}`;

        try {
            // Callback'i çalıştır
            await callback();
        } catch (error) {
            console.error('Buton işlemi hatası:', error);
            showNotification('Hata', 'İşlem sırasında hata oluştu', 'error');
        } finally {
            // Butonu eski haline getir
            button.disabled = false;
            button.innerHTML = originalContent;
            this.processingButtons.delete(button);
            this.originalContents.delete(button);
        }
    }

    isProcessing(button) {
        return this.processingButtons.has(button);
    }
}

const buttonManager = new ButtonManager();

window.updateOffer = async function(offerId) {
    const updateBtn = event.currentTarget || event.target;
    
    await buttonManager.processButton(updateBtn, async () => {
        const offer = firebaseData.offers.find(o => o.id === offerId);
        if (!offer) {
            throw new Error('Teklif bulunamadı');
        }

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
        const tax = subtotal * 0.18;
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

        // Firebase'e kaydet
        await window.firestoreService.updateOffer(offerId, updatedOffer);
        
        showNotification('Başarılı', 'Teklif güncellendi', 'success');
        
        // Veriyi yenile
        await loadFirebaseData();
        
        // Modal'ı kapat
        modalManager.closeModal('editOfferModal');
        
        // Sayfayı güncelle
        if (typeof loadTeklifListesi === 'function') {
            loadTeklifListesi();
        }
    }, 'Güncelleniyor...');
};

// 8. CLEANUP - SAYFA YÜKLENDİĞİNDE
document.addEventListener('DOMContentLoaded', function() {
    // Eski event listener'ları temizle
    const allButtons = document.querySelectorAll('button');
    allButtons.forEach(btn => {
        const newBtn = btn.cloneNode(true);
        btn.parentNode.replaceChild(newBtn, btn);
    });
    
    // Modal manager'ı başlat
    modalManager.cleanupAllModals();
    
    console.log('✅ Modal ve Event yönetimi düzeltildi');
});

// 9. DEBUG HELPER
window.modalDebug = {
    status: () => {
        console.log('Açık Modallar:', Array.from(modalManager.activeModals.keys()));
        console.log('Modal Stack:', modalManager.modalStack);
        console.log('İşlemdeki Butonlar:', buttonManager.processingButtons.size);
    },
    reset: () => {
        modalManager.cleanupAllModals();
        buttonManager.processingButtons.clear();
        buttonManager.originalContents.clear();
        console.log('Sistem sıfırlandı');
    }
};

// MODAL YÖNETİMİ - ÇALIŞAN VERSİYON
(function() {
    'use strict';
    
    let openModals = [];
    
    // Modal aç
    window.openModal = function(modalId) {
        const modal = document.getElementById(modalId);
        if (!modal) return;
        
        // Önce tüm modalları kapat
        document.querySelectorAll('.modal.show').forEach(m => {
            m.classList.remove('show');
        });
        
        // Yeni modalı aç
        modal.classList.add('show');
        document.body.classList.add('modal-open');
        openModals.push(modalId);
        
        // Kapatma butonunu bağla
        const closeBtn = modal.querySelector('.modal-close');
        if (closeBtn) {
            closeBtn.onclick = function() {
                closeModal(modalId);
            };
        }
    };
    
    // Modal kapat
    window.closeModal = function(modalId) {
        const modal = document.getElementById(modalId);
        if (!modal) return;
        
        modal.classList.remove('show');
        openModals = openModals.filter(id => id !== modalId);
        
        if (openModals.length === 0) {
            document.body.classList.remove('modal-open');
        }
    };
    
    // ESC tuşu
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && openModals.length > 0) {
            closeModal(openModals[openModals.length - 1]);
        }
    });
})();

// BUTON GÜVENLİĞİ
window.safeProcess = async function(btn, callback) {
    if (btn.disabled) return;
    
    const text = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = 'İşleniyor...';
    
    try {
        await callback();
    } catch(e) {
        console.error(e);
    }
    
    btn.disabled = false;
    btn.innerHTML = text;
};


window.saveProduct = window.saveProduct || function() {
  console.warn("saveProduct urun.js'den çağrılmalı.");
};

// urun.js
function addProduct() {
  // Modal varsa kaldır
  let existingModal = document.getElementById("productModal");
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
                <input type="text" class="form-control" id="productFormCode" value="PRD-${String(window.firebaseData.products.length + 1).padStart(4, '0')}" required>
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
                  <option value="">Tüm Kategoriler</option>
                  <option>piksel kontrollü doğrusal armatürler</option>
                  <option>piksel kontrollü noktasal armatürler</option>
                  <option>Çizgisel armatürler</option>
                  <option>Wallwasher armatürler</option>
                  <option>Yere Gömme wallwasher armatürler</option>
                  <option>Spot Armatürler</option>
                  <option>Kontrol Sistemleri</option>
                </select>
              </div>
              <div class="form-group">
                <label class="form-label">Birim Fiyat</label>
                <input type="number" class="form-control" id="productFormPrice" required>
              </div>
              
            </div>
            <div class="form-group">
              <label class="form-label">Açıklama</label>
              <textarea class="form-control" id="productFormDescription" rows="3"></textarea>
            </div>
            <div class="form-group">
              <label class="form-label">Ürün Görseli</label>
              <input type="file" id="productFormImage" accept="image/*">
            </div>
          </form>
        </div>
        <div class="modal-footer">
          <button class="btn btn-success" onclick="window.saveProduct()">
            <i class="fas fa-save"></i> Kaydet
          </button>
          <button class="btn btn-outline" onclick="closeModal('productModal')">İptal</button>
        </div>
      </div>
    </div>
  `;

  document.body.insertAdjacentHTML("beforeend", modalHTML);
  console.log("productModal yüklendi.");
}

// Global scope'a bağla
window.addProduct = addProduct;
// PRODUCTION KAYDET
window.saveProductionDetail = async function() {
    await safeProcess(event.target, async () => {
        const id = document.querySelector('[name="productionId"]').value;
        
        // Veri topla ve kaydet
        await window.firestoreService.updateProduction(id, {
            // güncelleme verileri
        });
        
        closeModal('productionDetailModal');
        await loadFirebaseData();
    });
};


// script.js'in en sonuna ekleyin:
document.addEventListener("DOMContentLoaded", async function() {
  console.log("🚀 Furkatech FZA-ERP sistemi başlatılıyor...");
  
  // Firebase bağlantısını kontrol et ve verileri yükle
  if (window.firestoreService) {
    console.log("📡 Firebase bağlantısı mevcut, veriler yükleniyor...");
    await loadFirebaseData();
  }
  
  document.getElementById("loginContainer").style.display = "flex";
  document.getElementById("appContainer").style.display = "none";
});


// ========================================
// GLOBAL EXPORTS - EN SONDA OLMALI
// ========================================

// Tüm fonksiyonları global alana aktar
window.addRevisionButton = addRevisionButton;
window.createRevision = createRevision;
window.loadTeklifHazirla = loadTeklifHazirla;
window.loadCompanyContacts = loadCompanyContacts;
window.fillOfferFormFromRevision = fillOfferFormFromRevision;
window.addEventListener("resize", () => {
  optimizeMobileDisplay();
  applyMobileOptimizations(currentPage);
});
window.optimizeMobileDisplay = optimizeMobileDisplay;
window.applyMobileOptimizations = applyMobileOptimizations;
window.updatePriceFromProduct = updatePriceFromProduct;
window.showWorkDetails = showWorkDetails;
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
window.deleteProduct = deleteProduct;
window.saveProduct = saveProduct;
window.addProduct = addProduct;
window.addCompany = addCompany;
window.editCompany = editCompany;
window.deleteCompany = deleteCompany;
window.saveCompany = saveCompany;
window.searchOfferProducts = searchOfferProducts;
window.addOfferProduct = addOfferProduct;
window.updateTechnicalSpecs = updateTechnicalSpecs;
window.calculateOfferTotal = calculateOfferTotal;
window.saveOffer = saveOffer;
window.sendOffer = sendOffer;
window.viewOffer = viewOffer;
window.editOffer = editOffer;
window.deleteOffer = deleteOffer;
window.previewOffer = previewOffer;
window.printOffer = printOffer;
window.shipProduct = shipProduct;
window.switchTab = switchTab;
window.changePassword = changePassword;
window.showNotification = showNotification;
window.loadFirebaseData = loadFirebaseData;
window.loadFirebaseData = loadFirebaseData;
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
window.createNotification = createNotification;
window.showAllShipments = showAllShipments;
window.loadKullaniciAktiviteleri = loadKullaniciAktiviteleri;
window.loadRaporlar = loadRaporlar;
window.deleteAllNotifications = deleteAllNotifications;
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
window.updateRecipeSelectedRawMaterialsDisplay =updateRecipeSelectedRawMaterialsDisplay;
window.updateRecipeSelectedCount = updateRecipeSelectedCount;
window.hasPermission = hasPermission;
window.canAccessPage = canAccessPage;
window.updateSidebarPermissions = updateSidebarPermissions;
window.openCompanyModal = openCompanyModal;
window.switchCompanyTab = switchCompanyTab;
window.saveCompany = saveCompany;
window.saveCompanyToFirebase = saveCompanyToFirebase;
window.showCompanyDetails = showCompanyDetails;
window.deleteCompany = deleteCompany;
window.switchCompanyTab = switchCompanyTab;
window.openCompanyModal = openCompanyModal;
window.saveCompany = saveCompany;
window.showCompanyDetails = showCompanyDetails;
window.deleteCompany = deleteCompany;
window.closeModal = closeModal;
window.editOfferModal = editOfferModal;
window.calculateEditOfferTotal = calculateEditOfferTotal;
window.updateOffer = updateOffer;
window.addProductToEditOffer = addProductToEditOffer;
window.previewSavedOffer = previewSavedOffer;
window.filterOffers = filterOffers;
window.clearOfferFilters = clearOfferFilters;
window.renderOffersTable = renderOffersTable;
window.showAllOffers = showAllOffers;
window.addProduct = addProduct;
window.saveSimpleRecipe = saveSimpleRecipe;
window.filterRawMaterialCheckboxes = filterRawMaterialCheckboxes;
window.updateSelectedRawMaterialCount = updateSelectedRawMaterialCount;
window.clearRawMaterialSelection = clearRawMaterialSelection;
window.saveRecipeWithCheckboxes = saveRecipeWithCheckboxes;
window.saveProduct = saveProduct;
window.toggleTempRawMaterial = toggleTempRawMaterial;
window.removeFromTempRawMaterials = removeFromTempRawMaterials;
window.clearTempRawMaterials = clearTempRawMaterials;
window.selectAllRawMaterials = selectAllRawMaterials;
window.selectCriticalRawMaterials = selectCriticalRawMaterials;
window.filterEditRawMaterialCheckboxes = filterEditRawMaterialCheckboxes;
window.updateEditRecipeDisplay = updateEditRecipeDisplay;
window.saveEditedRecipe = saveEditedRecipe;
window.confirmRejectLeave = confirmRejectLeave;
window.getRoleDisplayName = getRoleDisplayName;
window.showShipmentDetails = showShipmentDetails;
window.generateOfferNumber = generateOfferNumber;
window.checkForExistingProject = checkForExistingProject;
window.showRevisionWarningModal = showRevisionWarningModal;
window.processRevisionDecision = processRevisionDecision;
window.saveOfferWithRevisionCheck = saveOfferWithRevisionCheck;
window.clearOfferForm = clearOfferForm;
window.prepareRevisionOffer = prepareRevisionOffer;
window.filterOffersWithProject = filterOffersWithProject;
window.renderFilteredOffersWithProject = renderFilteredOffersWithProject;
window.loadTeklifListesi = loadTeklifListesi;
window.showAllOffersWithProject = showAllOffersWithProject;
window.clearAllOfferFilters = clearAllOfferFilters;
window.filterOffersWithProject = filterOffersWithProject;
window.renderFilteredOffersWithProject = renderFilteredOffersWithProject;
window.getNextRevisionNumber = getNextRevisionNumber;
window.cleanupModals = cleanupModals;
window.isMobileDevice = isMobileDevice;
window.optimizeMobileDisplay = optimizeMobileDisplay;
window.applyMobileOptimizations = applyMobileOptimizations;
window.toggleMobileMenu = toggleMobileMenu;
console.log("✅ Tüm fonksiyonlar global alana aktarıldı");
modalDebug.reset()
modalDebug.status()