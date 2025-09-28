// ============================================
// İNSAN KAYNAKLARI MODÜLÜ - hr-module.js
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

let leaveRequests = [];

// Cache mekanizması
let cachedLeaveRequests = null;
let cacheTimestamp = null;
const CACHE_DURATION = 60000; // 1 dakika

async function getCachedLeaveRequests() {
    const now = Date.now();
    if (!cachedLeaveRequests || !cacheTimestamp || (now - cacheTimestamp) > CACHE_DURATION) {
        cachedLeaveRequests = await window.firestoreService.getLeaveRequests();
        cacheTimestamp = now;
    }
    return cachedLeaveRequests;
}


function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

function isValidTcNo(tcNo) {
    if (tcNo.length !== 11) return false;
    if (!/^\d+$/.test(tcNo)) return false;
    if (tcNo[0] === '0') return false;
    
    // TC kimlik numarası algoritması
    let sum = 0;
    for (let i = 0; i < 10; i++) {
        sum += parseInt(tcNo[i]);
    }
    
    const checksum = sum % 10;
    return checksum === parseInt(tcNo[10]);
}

function isValidPhone(phone) {
   
    const phoneRegex = /^(\+90|0)?[5][0-9]{9}$/;
    const cleanPhone = phone.replace(/\s+/g, '').replace(/[-()]/g, '');
    return phoneRegex.test(cleanPhone);
}

async function loadInsanKaynaklari() {
    if (!currentUser) {
        showNotification('Hata', 'Giriş yapmanız gerekiyor.', 'error');
        return;
    }
    
    currentPage = 'insanKaynaklari';
    
    document.querySelectorAll('.menu-item').forEach(item => item.classList.remove('active'));
    document.querySelectorAll('.submenu-item').forEach(item => item.classList.remove('active'));
    
    const menuItem = document.querySelector('[onclick="loadInsanKaynaklari()"]');
    if (menuItem) menuItem.classList.add('active');
    
    if (!firebaseData.users || firebaseData.users.length === 0) {
        try {
            const users = await window.firestoreService.getUsers();
            firebaseData.users = users || [];
        } catch (error) {
            console.error('Firebase verileri yüklenemedi:', error);
        }
    }

    const isManagerOrAdmin = currentUser.role === 'admin' || currentUser.role === 'manager';

    const content = `
        <div class="page-header">
            <h1 class="page-title"><i class="fas fa-users"></i> İnsan Kaynakları</h1>
            <p class="page-subtitle">İzin yönetimi ve personel işlemleri</p>
        </div>

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
                <div class="stat-value" id="pendingLeaveCount">-</div>
                <div class="stat-label">Bekleyen Talep</div>
            </div>
            <div class="stat-card">
                <div class="stat-icon info"><i class="fas fa-umbrella-beach"></i></div>
                <div class="stat-value">${getUpcomingHolidaysCount()}</div>
                <div class="stat-label">Yaklaşan Tatil</div>
            </div>
        </div>

        <div class="tabs">
            <button class="tab active" onclick="switchHRTab(this, 'leaveRequest')">İzin Talebi</button>
            <button class="tab" onclick="switchHRTab(this, 'myLeaves')">İzinlerim</button>
            ${isManagerOrAdmin ? '<button class="tab" onclick="switchHRTab(this, \'leaveApprovals\')">İzin Onayları</button>' : ''}
            ${isManagerOrAdmin ? '<button class="tab" onclick="switchHRTab(this, \'employeeList\')">Personel Listesi</button>' : ''}
            <button class="tab" onclick="switchHRTab(this, 'holidays')">Resmi Tatiller</button>
            <button class="tab" onclick="switchHRTab(this, 'hrSettings')">Ayarlar</button>
            <button class="tab" onclick="switchHRTab(this, 'leaveCalendar')">İzin Takvimi</button>
        </div>

        <div id="leaveRequest" class="tab-content active">
            ${renderLeaveRequestForm()}
        </div>
        <div id="myLeaves" class="tab-content">
            <div id="myLeavesContent">
                <div class="card">
                    <div class="card-body">
                        <div style="text-align: center; padding: 20px;">
                            <i class="fas fa-spinner fa-spin"></i> Yükleniyor...
                        </div>
                    </div>
                </div>
            </div>
        </div>
        ${isManagerOrAdmin ? `
        <div id="leaveApprovals" class="tab-content">
            <div id="leaveApprovalsContent">
                <div class="card">
                    <div class="card-body">
                        <div style="text-align: center; padding: 20px;">
                            <i class="fas fa-spinner fa-spin"></i> Yükleniyor...
                        </div>
                    </div>
                </div>
            </div>
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
        <div id="leaveCalendar" class="tab-content">
            ${renderLeaveCalendar()}
        </div>
    `;
    
    document.getElementById('pageContent').innerHTML = content;
    
    setTimeout(async () => {
        await updatePendingLeaveCount();
    }, 0);
}
async function refreshEmployeeList() {
    try {
        const users = await window.firestoreService.getUsers();
        firebaseData.users = users;
        
        const employeeListDiv = document.getElementById('employeeListContent');
        if (employeeListDiv) {
            employeeListDiv.innerHTML = renderEmployeeList();
        }
    } catch (error) {
        console.error('Personel listesi yenilenemedi:', error);
        const employeeListDiv = document.getElementById('employeeListContent');
        if (employeeListDiv) {
            employeeListDiv.innerHTML = `
                <div class="card">
                    <div class="card-body">
                        <div style="text-align: center; padding: 20px; color: red;">
                            <i class="fas fa-exclamation-triangle"></i> Personel listesi yüklenemedi.
                            <button class="btn btn-primary" onclick="refreshEmployeeList()" style="margin-top: 10px;">
                                <i class="fas fa-sync"></i> Tekrar Dene
                            </button>
                        </div>
                    </div>
                </div>
            `;
        }
    }
}

function getUpcomingHolidaysCount() {
    const today = new Date();
    const year = today.getFullYear();
    return officialHolidays[year].filter(h => {
        const holidayDate = new Date(h.date);
        return holidayDate > today && holidayDate < new Date(today.getTime() + 30*24*60*60*1000);
    }).length;
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

// İzin türü seçimi
function selectLeaveType(type) {

    document.querySelectorAll('[data-type]').forEach(card => {
        card.style.background = 'white';
        card.style.borderColor = 'var(--gray-200)';
        card.style.color = 'inherit';
        card.classList.remove('selected');
    });
    
    const selected = document.querySelector(`[data-type="${type}"]`);
    if (selected) {
        selected.style.background = 'var(--primary)';
        selected.style.borderColor = 'var(--primary)';
        selected.style.color = 'white';
        selected.classList.add('selected');
    }
}

// İzin günlerini hesapla
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

// İzin talebi gönder
async function submitLeaveRequest() {
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
        employeeId: currentUser.id,
        employeeName: currentUser.name,
        employeeRole: currentUser.role,
        type: selectedType,
        startDate: startDate,
        endDate: endDate,
        totalDays: document.getElementById('totalLeaveDays').value,
        description: document.getElementById('leaveDescription').value,
        deputy: document.getElementById('leaveDeputy').value,
        requestDate: new Date().toISOString(),
        status: 'pending',
        createdAt: new Date().toISOString()
    };

    try {
        const leaveId = await window.firestoreService.addLeaveRequest(leaveRequest);
        
        const users = await window.firestoreService.getUsers();
        const managersAndAdmins = users.filter(u => 
            u.role === 'admin' || u.role === 'manager'
        );

        for (const manager of managersAndAdmins) {
            await createNotification({
                type: 'leave_request',
                title: 'Yeni İzin Talebi',
                message: `${currentUser.name} (${getRoleDisplayName(currentUser.role)}) yeni bir ${leaveTypes[selectedType]?.name} talebi oluşturdu. Tarih: ${formatDate(startDate)} - ${formatDate(endDate)}`,
                from: currentUser.id,
                to: manager.id,
                leaveRequestId: leaveId,
                date: new Date().toISOString()
            });
        }
        
        showNotification('Başarılı', 'İzin talebiniz gönderildi ve yöneticilere bildirim yapıldı.', 'success');
        clearLeaveForm();
        
        await loadFirebaseData();
        loadInsanKaynaklari();
        
    } catch (error) {
        console.error('İzin talebi gönderme hatası:', error);
        showNotification('Hata', 'İzin talebi gönderilemedi.', 'error');
    }
}

// İzin onaylama
async function approveLeave(leaveId) {
    if (currentUser.role !== 'admin' && currentUser.role !== 'manager') {
        showNotification('Yetki Hatası', 'İzin onaylama yetkiniz bulunmuyor.', 'error');
        return;
    }
    
    try {
        const leaveRequests = await window.firestoreService.getLeaveRequests();
        const leave = leaveRequests.find(l => l.id === leaveId);
        
        if (!leave) {
            showNotification('Hata', 'İzin talebi bulunamadı.', 'error');
            return;
        }
        
        await window.firestoreService.updateLeaveRequest(leaveId, {
            status: 'approved',
            approvedBy: currentUser.id,
            approverName: currentUser.name,
            approvedDate: new Date().toISOString()
        });
        
        const employee = firebaseData.users.find(u => u.id === leave.employeeId);
        if (employee) {
            const leaveDaysText = leave.totalDays;
            const leaveDays = parseInt(leaveDaysText.match(/\d+/)[0]) || 0;
            const currentUsedLeave = employee.usedLeave || 0;
            const newUsedLeave = currentUsedLeave + leaveDays;
            
            await window.firestoreService.updateUser(leave.employeeId, {
                usedLeave: newUsedLeave
            });
            
            const userIndex = firebaseData.users.findIndex(u => u.id === leave.employeeId);
            if (userIndex !== -1) {
                firebaseData.users[userIndex].usedLeave = newUsedLeave;
            }
        }
        
        await createNotification({
            type: 'leave_approved',
            title: 'İzin Talebiniz Onaylandı',
            message: `${formatDate(leave.startDate)} - ${formatDate(leave.endDate)} tarihleri arasındaki ${leaveTypes[leave.type]?.name} talebiniz ${currentUser.name} tarafından onaylandı.`,
            from: currentUser.id,
            to: leave.employeeId,
            date: new Date().toISOString()
        });
        
        showNotification('Onaylandı', 'İzin talebi onaylandı ve personele bildirim gönderildi.', 'success');
        
        await loadFirebaseData();
        loadInsanKaynaklari();
        
    } catch (error) {
        console.error('İzin onaylama hatası:', error);
        showNotification('Hata', 'İzin onaylanırken hata oluştu.', 'error');
    }
}

// İzin reddetme
function rejectLeave(leaveId) {
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
    
    document.body.insertAdjacentHTML('beforeend', modalHTML);
}

// İzin reddi onaylama

async function exportEmployeeReport() {
    try {
        showNotification('İşleniyor', 'Personel raporu hazırlanıyor...', 'info');
        
        const reportData = [];
        const allLeaves = await window.firestoreService.getLeaveRequests();
        
        firebaseData.users.forEach(user => {
            const userLeaves = allLeaves.filter(l => l.employeeId === user.id);
            const approvedLeaves = userLeaves.filter(l => l.status === 'approved');
            const totalLeaveDays = approvedLeaves.reduce((sum, l) => {
                const days = parseInt(l.totalDays) || 0;
                return sum + days;
            }, 0);
            
            reportData.push({
                'Ad Soyad': user.name,
                'Kullanıcı Adı': user.username,
                'Departman': getRoleDisplayName(user.role),
                'İşe Giriş': user.hireDate || '2024-01-01',
                'Telefon': user.phone || '-',
                'E-posta': user.email || '-',
                'Yıllık İzin Hakkı': user.annualLeaveBalance || 14,
                'Kullanılan İzin': user.usedLeave || 0,
                'Kalan İzin': (user.annualLeaveBalance || 14) - (user.usedLeave || 0),
                'Toplam Onaylı İzin': totalLeaveDays,
                'Durum': user.active !== false ? 'Aktif' : 'Pasif'
            });
        });
        
        // CSV formatına dönüştür
        const headers = Object.keys(reportData[0]);
        const csvContent = [
            headers.join(','),
            ...reportData.map(row => 
                headers.map(header => {
                    const value = row[header];
                    // Virgül içeren değerleri tırnak içine al
                    return typeof value === 'string' && value.includes(',') 
                        ? `"${value}"` 
                        : value;
                }).join(',')
            )
        ].join('\n');
        
        // UTF-8 BOM ekle (Excel'de Türkçe karakterler için)
        const BOM = '\uFEFF';
        const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        const date = new Date().toISOString().split('T')[0];
        
        link.href = url;
        link.download = `personel_raporu_${date}.csv`;
        link.click();
        
        URL.revokeObjectURL(url);
        
        showNotification('Başarılı', 'Personel raporu indirildi.', 'success');
        
    } catch (error) {
        console.error('Rapor export hatası:', error);
        showNotification('Hata', 'Rapor oluşturulamadı.', 'error');
    }
}
// Personel listesini render et
function renderEmployeeList() {
    console.log('renderEmployeeList başladı');
    console.log('firebaseData:', firebaseData);
    console.log('firebaseData.users:', firebaseData.users);
    
    if (!firebaseData.users || firebaseData.users.length === 0) {
        console.warn('Kullanıcı verisi bulunamadı!');
        return `
            <div class="card">
                <div class="card-body">
                    <div style="text-align: center; padding: 20px;">
                        <i class="fas fa-spinner fa-spin"></i> Personel listesi yükleniyor...
                        <button class="btn btn-primary" onclick="loadEmployeeListOptimized()" style="margin-top: 10px;">
                            <i class="fas fa-sync"></i> Yenile
                        </button>
                    </div>
                </div>
            </div>
        `;
    }
    
    const isManagerOrAdmin = currentUser.role === 'admin' || currentUser.role === 'manager';
    
    return `
        <div class="card">
            <div class="card-header">
                <div class="flex justify-between items-center">
                    <div>
                        <h3 class="card-title">Personel Listesi</h3>
                        <p class="card-subtitle">Tüm personel bilgileri ve izin durumları</p>
                    </div>
                    ${isManagerOrAdmin ? `
                        <button class="btn btn-primary" onclick="exportEmployeeReport()">
                            <i class="fas fa-file-excel"></i> Rapor İndir
                        </button>
                    ` : ''}
                </div>
            </div>
            <div class="card-body">
                <div class="table-container">
                    <table class="table">
                        <thead>
                            <tr>
                                <th>Personel</th>
                                <th>Departman</th>
                                <th>İşe Giriş</th>
                                <th>Yıllık İzin Hakkı</th>
                                <th>Kullanılan</th>
                                <th>Kalan</th>
                                <th>Durum</th>
                                <th>İşlemler</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${firebaseData.users.map(user => {
                                const annualLeave = user.annualLeaveBalance || 14;
                                const usedLeave = user.usedLeave || 0;
                                const remainingLeave = annualLeave - usedLeave;
                                const hireDate = user.hireDate || '2024-01-01';
                                const isActive = user.active !== false;
                                
                                return `
                                <tr style="${!isActive ? 'opacity: 0.6;' : ''}">
                                    <td>
                                        <div style="display: flex; align-items: center; gap: 10px;">
                                            <div style="width: 36px; height: 36px; background: ${isActive ? 'var(--primary)' : 'var(--gray-400)'}; 
                                                        color: white; border-radius: 50%; display: flex; align-items: center; 
                                                        justify-content: center; font-weight: bold;">
                                                ${user.name ? user.name.charAt(0).toUpperCase() : 'U'}
                                            </div>
                                            <div>
                                                <strong>${user.name}</strong>
                                                <div style="font-size: 12px; color: var(--gray-500);">
                                                    ${user.email || 'E-posta yok'}
                                                </div>
                                            </div>
                                        </div>
                                    </td>
                                    <td>
                                        <span class="badge ${user.role === 'admin' ? 'danger' : user.role === 'manager' ? 'warning' : 'info'}">
                                            ${getRoleDisplayName(user.role)}
                                        </span>
                                    </td>
                                    <td style="font-size: 13px;">
                                        ${formatDate(hireDate)}
                                    </td>
                                    <td>
                                        <strong>${annualLeave}</strong> gün
                                    </td>
                                    <td>
                                        <span style="color: var(--warning);">${usedLeave}</span> gün
                                    </td>
                                    <td>
                                        <strong style="color: ${remainingLeave > 5 ? 'var(--success)' : remainingLeave > 0 ? 'var(--warning)' : 'var(--danger)'};">
                                            ${remainingLeave} gün
                                        </strong>
                                    </td>
                                    <td>
                                        <span class="badge ${isActive ? 'success' : 'danger'}">
                                            ${isActive ? 'Aktif' : 'Pasif'}
                                        </span>
                                    </td>
                                    <td>
                                        <div class="action-buttons" style="display: flex; gap: 5px;">
                                            <button class="btn btn-sm btn-info" onclick="showEmployeeDetails('${user.id}')" title="Detaylar">
                                                <i class="fas fa-eye"></i>
                                            </button>
                                            ${isManagerOrAdmin ? `
                                                <button class="btn btn-sm btn-warning" onclick="editEmployeeLeave('${user.id}')" title="İzin Düzenle">
                                                    <i class="fas fa-calendar-edit"></i>
                                                </button>
                                                <button class="btn btn-sm btn-primary" onclick="editEmployeeInfo('${user.id}')" title="Bilgileri Düzenle">
                                                    <i class="fas fa-user-edit"></i>
                                                </button>
                                            ` : ''}
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
}

async function renderMyLeaves() {
    let myLeaves = [];
    
    try {
        const allLeaves = await window.firestoreService.getLeaveRequests();
        myLeaves = allLeaves.filter(l => l.employeeId === currentUser.id);
    } catch (error) {
        console.error('İzinler yüklenemedi:', error);
        myLeaves = []; // Hata durumunda boş array
    }
    
    return `
        <div class="card">
            <div class="card-header">
                <h3 class="card-title">İzin Geçmişim (${myLeaves.length})</h3>
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
                                <th>Onaylayan</th>
                                <th>İşlemler</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${myLeaves.length > 0 ? myLeaves.map(leave => `
                                <tr>
                                    <td><strong>#${leave.id ? leave.id.substring(0, 8) : 'N/A'}</strong></td>
                                    <td>
                                        <i class="fas ${leaveTypes[leave.type]?.icon || 'fa-calendar'}" 
                                           style="color: ${leaveTypes[leave.type]?.color || '#666'}; margin-right: 5px;"></i>
                                        ${leaveTypes[leave.type]?.name || leave.type}
                                    </td>
                                    <td>${formatDate(leave.startDate)}</td>
                                    <td>${formatDate(leave.endDate)}</td>
                                    <td><strong>${leave.totalDays}</strong></td>
                                    <td>${getLeaveStatusBadge(leave.status)}</td>
                                    <td>${leave.approverName || '-'}</td>
                                    <td>
                                        ${leave.status === 'pending' ? 
                                            `<button class="btn btn-sm btn-danger" onclick="cancelLeaveRequest('${leave.id}')">
                                                <i class="fas fa-times"></i> İptal
                                            </button>` : 
                                            leave.status === 'rejected' ? 
                                            `<button class="btn btn-sm btn-info" onclick="showRejectDetails('${leave.id}')">
                                                <i class="fas fa-eye"></i> Detay
                                            </button>` : '-'
                                        }
                                    </td>
                                </tr>
                            `).join('') : `
                                <tr>
                                    <td colspan="8" style="text-align: center; padding: 40px; color: var(--gray-500);">
                                        <i class="fas fa-calendar-times" style="font-size: 32px; margin-bottom: 10px; display: block;"></i>
                                        Henüz izin talebiniz bulunmuyor.
                                        <br>
                                        <button class="btn btn-primary" onclick="switchHRTab(document.querySelector('[onclick*=leaveRequest]'), 'leaveRequest')" style="margin-top: 10px;">
                                            <i class="fas fa-plus"></i> Yeni İzin Talebi Oluştur
                                        </button>
                                    </td>
                                </tr>
                            `}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    `;
}

async function renderLeaveApprovals() {
    let pendingLeaves = [];
    
    try {
        const allLeaves = await window.firestoreService.getLeaveRequests();
        pendingLeaves = allLeaves.filter(l => l.status === 'pending');
    } catch (error) {
        console.error('İzin talepleri yüklenemedi:', error);
        pendingLeaves = []; // Hata durumunda boş array
    }
    
    return `
        <div class="card">
            <div class="card-header">
                <div class="flex justify-between items-center">
                    <div>
                        <h3 class="card-title">Bekleyen İzin Talepleri</h3>
                        <p class="card-subtitle">${pendingLeaves.length} talep onay bekliyor</p>
                    </div>
                    ${pendingLeaves.length > 0 ? `
                        <button class="btn btn-success" onclick="approveAllLeaves()">
                            <i class="fas fa-check-double"></i> Tümünü Onayla
                        </button>
                    ` : ''}
                </div>
            </div>
            <div class="card-body">
                <div class="table-container">
                    <table class="table">
                        <thead>
                            <tr>
                                <th>Personel</th>
                                <th>Departman</th>
                                <th>İzin Türü</th>
                                <th>Tarih Aralığı</th>
                                <th>Gün</th>
                                <th>Açıklama</th>
                                <th>Talep Tarihi</th>
                                <th>İşlemler</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${pendingLeaves.length > 0 ? pendingLeaves.map(leave => `
                                <tr>
                                    <td>
                                        <div style="display: flex; align-items: center; gap: 8px;">
                                            <div style="width: 32px; height: 32px; background: var(--primary); color: white; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 14px;">
                                                ${leave.employeeName ? leave.employeeName.charAt(0).toUpperCase() : 'U'}
                                            </div>
                                            <div>
                                                <strong>${leave.employeeName || 'Bilinmeyen'}</strong>
                                                <div style="font-size: 12px; color: var(--gray-500);">${leave.employeeId ? '#' + leave.employeeId.substring(0, 8) : ''}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td><span class="badge info">${getRoleDisplayName(leave.employeeRole || 'user')}</span></td>
                                    <td>
                                        <div style="display: flex; align-items: center; gap: 6px;">
                                            <i class="fas ${leaveTypes[leave.type]?.icon || 'fa-calendar'}" 
                                               style="color: ${leaveTypes[leave.type]?.color || '#666'};"></i>
                                            <span>${leaveTypes[leave.type]?.name || leave.type}</span>
                                        </div>
                                    </td>
                                    <td>
                                        <div style="font-size: 13px;">
                                            <div><strong>${formatDate(leave.startDate)}</strong></div>
                                            <div style="color: var(--gray-500);">↓</div>
                                            <div><strong>${formatDate(leave.endDate)}</strong></div>
                                        </div>
                                    </td>
                                    <td><strong style="color: var(--primary);">${leave.totalDays}</strong></td>
                                    <td style="max-width: 200px;">
                                        ${leave.description ? 
                                            `<div title="${leave.description}" style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${leave.description}</div>` : 
                                            '<span style="color: var(--gray-400);">Açıklama yok</span>'
                                        }
                                    </td>
                                    <td style="font-size: 12px; color: var(--gray-500);">
                                        ${formatDate(leave.requestDate)}
                                    </td>
                                    <td>
                                        <div class="action-buttons" style="display: flex; gap: 5px;">
                                            <button class="btn btn-sm btn-success" onclick="approveLeave('${leave.id}')" title="Onayla">
                                                <i class="fas fa-check"></i>
                                            </button>
                                            <button class="btn btn-sm btn-danger" onclick="rejectLeave('${leave.id}')" title="Reddet">
                                                <i class="fas fa-times"></i>
                                            </button>
                                            <button class="btn btn-sm btn-info" onclick="showLeaveDetails('${leave.id}')" title="Detaylar">
                                                <i class="fas fa-eye"></i>
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            `).join('') : `
                                <tr>
                                    <td colspan="8" style="text-align: center; padding: 40px; color: var(--gray-500);">
                                        <i class="fas fa-check-circle" style="font-size: 48px; margin-bottom: 15px; display: block; color: var(--success);"></i>
                                        <h4>Tebrikler!</h4>
                                        <p>Bekleyen izin talebi bulunmuyor.</p>
                                    </td>
                                </tr>
                            `}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    `;
}


function editEmployeeLeave(userId) {
    const user = firebaseData.users.find(u => u.id === userId);
    if (!user) {
        showNotification('Hata', 'Personel bulunamadı.', 'error');
        return;
    }
    
    if (currentUser.role !== 'admin' && currentUser.role !== 'manager') {
        showNotification('Yetki Hatası', 'İzin düzenleme yetkiniz bulunmuyor.', 'error');
        return;
    }
    
    const modalHTML = `
        <div id="editLeaveModal" class="modal show">
            <div class="modal-content" style="max-width: 500px;">
                <div class="modal-header">
                    <h3 class="modal-title">İzin Düzenleme - ${user.name}</h3>
                    <button class="modal-close" onclick="closeModal('editLeaveModal')">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="modal-body">
                    <div class="alert alert-info">
                        <i class="fas fa-info-circle"></i>
                        Personelin yıllık izin haklarını düzenleyebilirsiniz.
                    </div>
                    
                    <div class="form-group">
                        <label class="form-label">Yıllık İzin Hakkı (Gün)</label>
                        <input type="number" 
                               id="editAnnualLeave" 
                               class="form-control" 
                               value="${user.annualLeaveBalance || 14}" 
                               min="0" 
                               max="365">
                        <small style="color: var(--gray-600);">Yasal minimum: 14 gün</small>
                    </div>
                    
                    <div class="form-group">
                        <label class="form-label">Kullanılan İzin (Gün)</label>
                        <input type="number" 
                               id="editUsedLeave" 
                               class="form-control" 
                               value="${user.usedLeave || 0}" 
                               min="0" 
                               max="365">
                    </div>
                    
                    <div class="form-group">
                        <label class="form-label">İzin Düzenleme Notu</label>
                        <textarea id="editLeaveNote" 
                                  class="form-control" 
                                  rows="3" 
                                  placeholder="Düzenleme sebebi veya not..."></textarea>
                    </div>
                    
                    <div style="background: var(--gray-50); padding: 15px; border-radius: 8px; margin-top: 20px;">
                        <h5 style="margin-bottom: 10px;">Özet</h5>
                        <div id="leaveSummary"></div>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-success" onclick="saveEmployeeLeave('${user.id}')">
                        <i class="fas fa-save"></i> Kaydet
                    </button>
                    <button class="btn btn-outline" onclick="closeModal('editLeaveModal')">İptal</button>
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    updateLeaveSummary();
    
    document.getElementById('editAnnualLeave').addEventListener('input', updateLeaveSummary);
    document.getElementById('editUsedLeave').addEventListener('input', updateLeaveSummary);
}

async function saveEmployeeLeave(userId) {
    const annualLeave = parseInt(document.getElementById('editAnnualLeave').value) || 0;
    const usedLeave = parseInt(document.getElementById('editUsedLeave').value) || 0;
    const note = document.getElementById('editLeaveNote').value;
    
    if (usedLeave > annualLeave) {
        showNotification('Hata', 'Kullanılan izin, toplam haktan fazla olamaz!', 'error');
        return;
    }
    
    if (annualLeave < 14) {
        if (!confirm('Yasal minimum 14 gündür. Daha az izin vermek istediğinize emin misiniz?')) {
            return;
        }
    }
    
    try {
        // Firebase'de güncelle
        await window.firestoreService.updateUser(userId, {
            annualLeaveBalance: annualLeave,
            usedLeave: usedLeave,
            leaveLastUpdated: new Date().toISOString(),
            leaveUpdatedBy: currentUser.id,
            leaveUpdateNote: note
        });
        
        // İzin değişiklik logu oluştur
        await window.firestoreService.addLeaveLog({
            userId: userId,
            changedBy: currentUser.id,
            changedByName: currentUser.name,
            previousAnnual: firebaseData.users.find(u => u.id === userId).annualLeaveBalance || 14,
            previousUsed: firebaseData.users.find(u => u.id === userId).usedLeave || 0,
            newAnnual: annualLeave,
            newUsed: usedLeave,
            note: note,
            changedAt: new Date().toISOString()
        });
        
        // Local veriyi güncelle
        const userIndex = firebaseData.users.findIndex(u => u.id === userId);
        if (userIndex !== -1) {
            firebaseData.users[userIndex].annualLeaveBalance = annualLeave;
            firebaseData.users[userIndex].usedLeave = usedLeave;
        }
        
        showNotification('Başarılı', 'İzin bilgileri güncellendi.', 'success');
        closeModal('editLeaveModal');
        closeModal('employeeDetailsModal');
        
        // Sayfayı yenile
        loadInsanKaynaklari();
        
    } catch (error) {
        console.error('İzin güncelleme hatası:', error);
        showNotification('Hata', 'İzin bilgileri güncellenirken hata oluştu.', 'error');
    }
}

function updateLeaveSummary() {
    const annualLeave = parseInt(document.getElementById('editAnnualLeave').value) || 0;
    const usedLeave = parseInt(document.getElementById('editUsedLeave').value) || 0;
    const remainingLeave = annualLeave - usedLeave;
    
    const summaryDiv = document.getElementById('leaveSummary');
    if (summaryDiv) {
        summaryDiv.innerHTML = `
            <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px;">
                <div>
                    <div style="font-size: 12px; color: var(--gray-600);">Toplam Hak</div>
                    <div style="font-size: 18px; font-weight: bold; color: var(--primary);">${annualLeave} gün</div>
                </div>
                <div>
                    <div style="font-size: 12px; color: var(--gray-600);">Kullanılan</div>
                    <div style="font-size: 18px; font-weight: bold; color: var(--warning);">${usedLeave} gün</div>
                </div>
                <div>
                    <div style="font-size: 12px; color: var(--gray-600);">Kalan</div>
                    <div style="font-size: 18px; font-weight: bold; color: ${remainingLeave >= 0 ? 'var(--success)' : 'var(--danger)'};">
                        ${remainingLeave} gün
                    </div>
                </div>
            </div>
            ${remainingLeave < 0 ? `
                <div class="alert alert-danger" style="margin-top: 10px;">
                    <i class="fas fa-exclamation-triangle"></i>
                    Kullanılan izin, toplam haktan fazla olamaz!
                </div>
            ` : ''}
        `;
    }
}


async function showEmployeeDetails(userId) {
    const user = firebaseData.users.find(u => u.id === userId);
    if (!user) {
        showNotification('Hata', 'Personel bulunamadı.', 'error');
        return;
    }
    
    let userLeaveHistory = [];
    try {
        const allLeaves = await window.firestoreService.getLeaveRequests();
        userLeaveHistory = allLeaves.filter(l => l.employeeId === userId);
    } catch (error) {
        console.error('İzin geçmişi alınamadı:', error);
    }
    
    const annualLeave = user.annualLeaveBalance || 14;
    const usedLeave = user.usedLeave || 0;
    const remainingLeave = annualLeave - usedLeave;
    const hireDate = user.hireDate || '2024-01-01';
    const workDays = calculateWorkDays(hireDate);
    const isActive = user.active !== false;
    const isManagerOrAdmin = currentUser.role === 'admin' || currentUser.role === 'manager';
    
    const modalHTML = `
        <div id="employeeDetailsModal" class="modal show">
            <div class="modal-content" style="max-width: 800px;">
                <div class="modal-header">
                    <h3 class="modal-title">Personel Detayları</h3>
                    <button class="modal-close" onclick="closeModal('employeeDetailsModal')">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="modal-body">
                    <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                                color: white; padding: 25px; border-radius: 12px; margin-bottom: 25px;">
                        <div style="display: flex; align-items: center; gap: 20px;">
                            <div style="width: 80px; height: 80px; background: rgba(255,255,255,0.2); 
                                        border-radius: 50%; display: flex; align-items: center; 
                                        justify-content: center; font-size: 32px; font-weight: bold;">
                                ${user.name ? user.name.charAt(0).toUpperCase() : 'U'}
                            </div>
                            <div style="flex: 1;">
                                <h2 style="margin: 0 0 10px 0;">${user.name}</h2>
                                <div style="display: flex; gap: 15px; flex-wrap: wrap;">
                                    <span><i class="fas fa-id-badge"></i> ${getRoleDisplayName(user.role)}</span>
                                    <span><i class="fas fa-user-tag"></i> @${user.username}</span>
                                    <span class="badge ${isActive ? 'success' : 'danger'}" 
                                          style="background: rgba(255,255,255,0.2); padding: 4px 10px;">
                                        ${isActive ? 'Aktif' : 'Pasif'}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 25px;">
                        <div style="background: var(--gray-50); padding: 20px; border-radius: 10px;">
                            <h5 style="margin-bottom: 15px; color: var(--primary);">
                                <i class="fas fa-user"></i> Kişisel Bilgiler
                            </h5>
                            <div style="display: grid; gap: 12px;">
                                <div>
                                    <label style="font-size: 12px; color: var(--gray-600);">Telefon</label>
                                    <div style="font-weight: 500;">${user.phone || 'Belirtilmemiş'}</div>
                                </div>
                                <div>
                                    <label style="font-size: 12px; color: var(--gray-600);">E-posta</label>
                                    <div style="font-weight: 500;">${user.email || 'Belirtilmemiş'}</div>
                                </div>
                                <div>
                                    <label style="font-size: 12px; color: var(--gray-600);">Adres</label>
                                    <div style="font-weight: 500;">${user.address || 'Belirtilmemiş'}</div>
                                </div>
                                <div>
                                    <label style="font-size: 12px; color: var(--gray-600);">Doğum Tarihi</label>
                                    <div style="font-weight: 500;">${user.birthDate ? formatDate(user.birthDate) : 'Belirtilmemiş'}</div>
                                </div>
                            </div>
                        </div>
                        
                        <div style="background: var(--gray-50); padding: 20px; border-radius: 10px;">
                            <h5 style="margin-bottom: 15px; color: var(--primary);">
                                <i class="fas fa-briefcase"></i> İş Bilgileri
                            </h5>
                            <div style="display: grid; gap: 12px;">
                                <div>
                                    <label style="font-size: 12px; color: var(--gray-600);">İşe Giriş Tarihi</label>
                                    <div style="font-weight: 500;">${formatDate(hireDate)}</div>
                                </div>
                                <div>
                                    <label style="font-size: 12px; color: var(--gray-600);">Çalışma Süresi</label>
                                    <div style="font-weight: 500;">${workDays} gün</div>
                                </div>
                                <div>
                                    <label style="font-size: 12px; color: var(--gray-600);">Sicil No</label>
                                    <div style="font-weight: 500;">${user.employeeId || user.id.substring(0, 8).toUpperCase()}</div>
                                </div>
                                <div>
                                    <label style="font-size: 12px; color: var(--gray-600);">Yetkiler</label>
                                    <div style="display: flex; flex-wrap: wrap; gap: 5px; margin-top: 5px;">
                                        ${(user.permissions || []).map(perm => 
                                            `<span class="badge ${perm === 'admin' ? 'danger' : 'success'}" style="font-size: 11px;">${perm}</span>`
                                        ).join('') || '<span style="color: var(--gray-500);">Yetki yok</span>'}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <div style="background: linear-gradient(135deg, #f5f5f5, #e0e0e0); padding: 20px; border-radius: 10px; margin-bottom: 25px;">
                        <h5 style="margin-bottom: 15px; color: var(--primary);">
                            <i class="fas fa-calendar-alt"></i> İzin Durumu
                        </h5>
                        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px;">
                            <div style="background: white; padding: 15px; border-radius: 8px; text-align: center;">
                                <div style="font-size: 24px; font-weight: bold; color: var(--primary);">${annualLeave}</div>
                                <div style="font-size: 12px; color: var(--gray-600); margin-top: 5px;">Yıllık İzin Hakkı</div>
                            </div>
                            <div style="background: white; padding: 15px; border-radius: 8px; text-align: center;">
                                <div style="font-size: 24px; font-weight: bold; color: var(--warning);">${usedLeave}</div>
                                <div style="font-size: 12px; color: var(--gray-600); margin-top: 5px;">Kullanılan İzin</div>
                            </div>
                            <div style="background: white; padding: 15px; border-radius: 8px; text-align: center;">
                                <div style="font-size: 24px; font-weight: bold; color: ${remainingLeave > 5 ? 'var(--success)' : 'var(--danger)'};">
                                    ${remainingLeave}
                                </div>
                                <div style="font-size: 12px; color: var(--gray-600); margin-top: 5px;">Kalan İzin</div>
                            </div>
                        </div>
                    </div>
                    
                    ${userLeaveHistory.length > 0 ? `
                    <div style="margin-top: 25px;">
                        <h5 style="margin-bottom: 15px; color: var(--primary);">
                            <i class="fas fa-history"></i> Son İzin Talepleri
                        </h5>
                        <div style="max-height: 200px; overflow-y: auto;">
                            ${userLeaveHistory.slice(0, 5).map(leave => `
                                <div style="padding: 10px; background: var(--gray-50); border-radius: 8px; margin-bottom: 10px;">
                                    <div style="display: flex; justify-content: space-between; align-items: center;">
                                        <div>
                                            <strong>${leaveTypes[leave.type]?.name || leave.type}</strong>
                                            <div style="font-size: 12px; color: var(--gray-600); margin-top: 3px;">
                                                ${formatDate(leave.startDate)} - ${formatDate(leave.endDate)} (${leave.totalDays})
                                            </div>
                                        </div>
                                        ${getLeaveStatusBadge(leave.status)}
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                    ` : ''}
                </div>
                <div class="modal-footer">
                    ${isManagerOrAdmin ? `
                        <button class="btn btn-warning" onclick="editEmployeeLeave('${user.id}')">
                            <i class="fas fa-calendar-edit"></i> İzin Düzenle
                        </button>
                        <button class="btn btn-primary" onclick="editEmployeeInfo('${user.id}')">
                            <i class="fas fa-user-edit"></i> Bilgileri Düzenle
                        </button>
                    ` : ''}
                    <button class="btn btn-outline" onclick="closeModal('employeeDetailsModal')">Kapat</button>
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHTML);
}
// Resmi tatilleri render et
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



async function cancelLeaveRequest(leaveId) {
    if (!confirm('İzin talebini iptal etmek istediğinize emin misiniz?')) {
        return;
    }
    
    try {
        // Firebase'den sil
        await window.firestoreService.deleteLeaveRequest(leaveId);
        
        showNotification('İptal Edildi', 'İzin talebi iptal edildi.', 'warning');
        
        // Sayfayı yenile
        await loadFirebaseData();
        loadInsanKaynaklari();
        
    } catch (error) {
        console.error('İzin iptal hatası:', error);
        showNotification('Hata', 'İzin talebi iptal edilemedi.', 'error');
    }
}

function renderLeaveCalendar() {
    return `
        <div class="card">
            <div class="card-header">
                <h3 class="card-title">Personel İzin Takvimi</h3>
                <p class="card-subtitle">Tüm personelin geçmiş ve gelecek izinleri</p>
            </div>
            <div class="card-body">
                <div id="leaveCalendarContent">
                    <div style="text-align: center; padding: 20px;">
                        <i class="fas fa-spinner fa-spin"></i> Yükleniyor...
                    </div>
                </div>
            </div>
        </div>
    `;
}

async function loadLeaveCalendarData() {
    const contentDiv = document.getElementById('leaveCalendarContent');
    if (!contentDiv) return;
    
    try {
        const allLeaves = await window.firestoreService.getLeaveRequests();
        const today = new Date();
        
        // İzinleri kategorize et
        const activeLeaves = [];
        const upcomingLeaves = [];
        const pastLeaves = [];
        
        allLeaves.forEach(leave => {
            if (leave.status !== 'approved') return;
            
            const startDate = new Date(leave.startDate);
            const endDate = new Date(leave.endDate);
            
            if (endDate < today) {
                pastLeaves.push(leave);
            } else if (startDate > today) {
                upcomingLeaves.push(leave);
            } else {
                activeLeaves.push(leave);
            }
        });
        
        // Tarihe göre sırala
        const sortByDate = (a, b) => new Date(a.startDate) - new Date(b.startDate);
        activeLeaves.sort(sortByDate);
        upcomingLeaves.sort(sortByDate);
        pastLeaves.sort((a, b) => new Date(b.startDate) - new Date(a.startDate));
        
        contentDiv.innerHTML = `
            <!-- Aktif İzinler -->
            ${activeLeaves.length > 0 ? `
            <div class="section">
                <h4 class="section-title" style="color: var(--success);">
                    <i class="fas fa-plane-departure"></i> Şu An İzinde Olanlar (${activeLeaves.length})
                </h4>
                <div class="table-container">
                    <table class="table">
                        <thead>
                            <tr>
                                <th>Personel</th>
                                <th>Departman</th>
                                <th>İzin Türü</th>
                                <th>Başlangıç</th>
                                <th>Bitiş</th>
                                <th>Kalan Gün</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${activeLeaves.map(leave => {
                                const endDate = new Date(leave.endDate);
                                const daysLeft = Math.ceil((endDate - today) / (1000 * 60 * 60 * 24));
                                return `
                                <tr style="background: rgba(16, 185, 129, 0.1);">
                                    <td><strong>${leave.employeeName}</strong></td>
                                    <td>${getRoleDisplayName(leave.employeeRole)}</td>
                                    <td>
                                        <i class="fas ${leaveTypes[leave.type]?.icon}" 
                                           style="color: ${leaveTypes[leave.type]?.color};"></i>
                                        ${leaveTypes[leave.type]?.name}
                                    </td>
                                    <td>${formatDate(leave.startDate)}</td>
                                    <td>${formatDate(leave.endDate)}</td>
                                    <td><strong>${daysLeft} gün</strong></td>
                                </tr>
                                `;
                            }).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
            ` : ''}
            
            <!-- Gelecek İzinler -->
            ${upcomingLeaves.length > 0 ? `
            <div class="section">
                <h4 class="section-title" style="color: var(--primary);">
                    <i class="fas fa-calendar-alt"></i> Yaklaşan İzinler (${upcomingLeaves.length})
                </h4>
                <div class="table-container">
                    <table class="table">
                        <thead>
                            <tr>
                                <th>Personel</th>
                                <th>Departman</th>
                                <th>İzin Türü</th>
                                <th>Başlangıç</th>
                                <th>Bitiş</th>
                                <th>Gün Sayısı</th>
                                <th>Kalan Gün</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${upcomingLeaves.map(leave => {
                                const startDate = new Date(leave.startDate);
                                const daysUntil = Math.ceil((startDate - today) / (1000 * 60 * 60 * 24));
                                return `
                                <tr>
                                    <td><strong>${leave.employeeName}</strong></td>
                                    <td>${getRoleDisplayName(leave.employeeRole)}</td>
                                    <td>
                                        <i class="fas ${leaveTypes[leave.type]?.icon}" 
                                           style="color: ${leaveTypes[leave.type]?.color};"></i>
                                        ${leaveTypes[leave.type]?.name}
                                    </td>
                                    <td>${formatDate(leave.startDate)}</td>
                                    <td>${formatDate(leave.endDate)}</td>
                                    <td>${leave.totalDays}</td>
                                    <td><span class="badge info">${daysUntil} gün sonra</span></td>
                                </tr>
                                `;
                            }).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
            ` : ''}
            
            <!-- Geçmiş İzinler -->
            <div class="section">
                <h4 class="section-title" style="color: var(--gray-600);">
                    <i class="fas fa-history"></i> Geçmiş İzinler (Son 20)
                </h4>
                <div class="table-container">
                    <table class="table">
                        <thead>
                            <tr>
                                <th>Personel</th>
                                <th>Departman</th>
                                <th>İzin Türü</th>
                                <th>Başlangıç</th>
                                <th>Bitiş</th>
                                <th>Gün Sayısı</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${pastLeaves.slice(0, 20).map(leave => `
                                <tr style="opacity: 0.7;">
                                    <td>${leave.employeeName}</td>
                                    <td>${getRoleDisplayName(leave.employeeRole)}</td>
                                    <td>
                                        <i class="fas ${leaveTypes[leave.type]?.icon}" 
                                           style="color: ${leaveTypes[leave.type]?.color};"></i>
                                        ${leaveTypes[leave.type]?.name}
                                    </td>
                                    <td>${formatDate(leave.startDate)}</td>
                                    <td>${formatDate(leave.endDate)}</td>
                                    <td>${leave.totalDays}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
        
    } catch (error) {
        console.error('İzin takvimi yüklenemedi:', error);
        contentDiv.innerHTML = '<div style="color: red; text-align: center;">Veriler yüklenirken hata oluştu.</div>';
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

async function loadEmployeeListOptimized() {
    const contentDiv = document.getElementById('employeeListContent');
    if (!contentDiv) return;
    
    contentDiv.innerHTML = `
        <div class="card">
            <div class="card-body" style="text-align: center; padding: 40px;">
                <i class="fas fa-spinner fa-spin" style="font-size: 32px; color: var(--primary);"></i>
                <p style="margin-top: 10px;">Personel listesi yükleniyor...</p>
            </div>
        </div>
    `;
    
    if (!firebaseData.users || firebaseData.users.length === 0) {
        try {
            const users = await window.firestoreService.getUsers();
            firebaseData.users = users || [];
        } catch (error) {
            console.error('Personel listesi yüklenemedi:', error);
            contentDiv.innerHTML = `
                <div class="card">
                    <div class="card-body" style="text-align: center; padding: 40px;">
                        <i class="fas fa-exclamation-triangle" style="font-size: 32px; color: var(--danger);"></i>
                        <p style="margin-top: 10px;">Personel listesi yüklenemedi.</p>
                        <button class="btn btn-primary" onclick="loadEmployeeListOptimized()" style="margin-top: 10px;">
                            <i class="fas fa-sync"></i> Tekrar Dene
                        </button>
                    </div>
                </div>
            `;
            return;
        }
    }
    
    setTimeout(() => {
        contentDiv.innerHTML = renderEmployeeList();
    }, 100);
}
function switchHRTab(button, tabId) {
    document.querySelectorAll('.tab').forEach(tab => tab.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
    button.classList.add('active');
    const tabContent = document.getElementById(tabId);
    if (tabContent) {
        tabContent.classList.add('active');
    }

    switch(tabId) {
        case 'employeeList':
            loadEmployeeListOptimized();
            break;
        case 'myLeaves':
            if (!document.getElementById('myLeavesContent').dataset.loaded) {
                loadMyLeavesData();
                document.getElementById('myLeavesContent').dataset.loaded = 'true';
            }
            break;
        case 'leaveApprovals':
            const approvalsContent = document.getElementById('leaveApprovalsContent');
            if (approvalsContent && !approvalsContent.dataset.loaded) {
                loadLeaveApprovalsData();
                approvalsContent.dataset.loaded = 'true';
            }
            break;
        case 'leaveCalendar':
            loadLeaveCalendarData();
            break;
    }
}


function editEmployeeInfo(userId) {
    const user = firebaseData.users.find(u => u.id === userId);
    if (!user) {
        showNotification('Hata', 'Personel bulunamadı.', 'error');
        return;
    }
    
    if (currentUser.role !== 'admin' && currentUser.role !== 'manager') {
        showNotification('Yetki Hatası', 'Personel düzenleme yetkiniz bulunmuyor.', 'error');
        return;
    }
    
    const modalHTML = `
        <div id="editEmployeeInfoModal" class="modal show" style="z-index: 10000;">
            <div class="modal-content" style="max-width: 600px; z-index: 10001;">
                <div class="modal-header">
                    <h3 class="modal-title">Personel Bilgileri Düzenleme - ${user.name}</h3>
                    <button class="modal-close" onclick="closeModal('editEmployeeInfoModal')">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="modal-body">
                    <div class="tabs">
                        <button class="tab active" onclick="switchEmployeeTab(this, 'personalInfo')">Kişisel Bilgiler</button>
                        <button class="tab" onclick="switchEmployeeTab(this, 'workInfo')">İş Bilgileri</button>
                        <button class="tab" onclick="switchEmployeeTab(this, 'emergencyInfo')">Acil Durum</button>
                    </div>
                    
                    <div id="personalInfo" class="tab-content active" style="margin-top: 20px;">
                        <div class="form-grid">
                            <div class="form-group">
                                <label class="form-label">Telefon</label>
                                <input type="tel" id="editPhone" class="form-control" value="${user.phone || ''}" placeholder="+90 5XX XXX XX XX">
                            </div>
                            <div class="form-group">
                                <label class="form-label">E-posta</label>
                                <input type="email" id="editEmail" class="form-control" value="${user.email || ''}" placeholder="ornek@sirket.com">
                            </div>
                            <div class="form-group">
                                <label class="form-label">Doğum Tarihi</label>
                                <input type="date" id="editBirthDate" class="form-control" value="${user.birthDate || ''}">
                            </div>
                            <div class="form-group">
                                <label class="form-label">TC Kimlik No</label>
                                <input type="text" id="editTcNo" class="form-control" value="${user.tcNo || ''}" maxlength="11" placeholder="XXXXXXXXXXX">
                            </div>
                        </div>
                        <div class="form-group">
                            <label class="form-label">Adres</label>
                            <textarea id="editAddress" class="form-control" rows="3">${user.address || ''}</textarea>
                        </div>
                    </div>
                    
                    <div id="workInfo" class="tab-content" style="display: none; margin-top: 20px;">
                        <div class="form-grid">
                            <div class="form-group">
                                <label class="form-label">İşe Giriş Tarihi</label>
                                <input type="date" id="editHireDate" class="form-control" value="${user.hireDate || '2024-01-01'}">
                            </div>
                            <div class="form-group">
                                <label class="form-label">Sicil No</label>
                                <input type="text" id="editEmployeeId" class="form-control" value="${user.employeeId || ''}" placeholder="Otomatik">
                            </div>
                            <div class="form-group">
                                <label class="form-label">SGK No</label>
                                <input type="text" id="editSgkNo" class="form-control" value="${user.sgkNo || ''}" placeholder="SGK numarası">
                            </div>
                            <div class="form-group">
                                <label class="form-label">Çalışma Durumu</label>
                                <select id="editActiveStatus" class="form-control">
                                    <option value="true" ${user.active !== false ? 'selected' : ''}>Aktif</option>
                                    <option value="false" ${user.active === false ? 'selected' : ''}>Pasif</option>
                                </select>
                            </div>
                        </div>
                        ${user.active === false ? `
                        <div class="termination-fields">
                            <div class="form-group">
                                <label class="form-label">İşten Çıkış Tarihi</label>
                                <input type="date" id="editTerminationDate" class="form-control" value="${user.terminationDate || ''}">
                            </div>
                            <div class="form-group">
                                <label class="form-label">Çıkış Nedeni</label>
                                <textarea id="editTerminationReason" class="form-control" rows="2" placeholder="İşten çıkış nedeni...">${user.terminationReason || ''}</textarea>
                            </div>
                        </div>
                        ` : ''}
                    </div>
                    
                    <div id="emergencyInfo" class="tab-content" style="display: none; margin-top: 20px;">
                        <div class="form-grid">
                            <div class="form-group">
                                <label class="form-label">Acil Durum İletişim Kişisi</label>
                                <input type="text" id="editEmergencyContact" class="form-control" value="${user.emergencyContact || ''}" placeholder="Ad Soyad">
                            </div>
                            <div class="form-group">
                                <label class="form-label">Acil Durum Telefonu</label>
                                <input type="tel" id="editEmergencyPhone" class="form-control" value="${user.emergencyPhone || ''}" placeholder="+90 5XX XXX XX XX">
                            </div>
                            <div class="form-group">
                                <label class="form-label">Yakınlık Derecesi</label>
                                <select id="editEmergencyRelation" class="form-control">
                                    <option value="">Seçiniz...</option>
                                    <option value="eş" ${user.emergencyRelation === 'eş' ? 'selected' : ''}>Eş</option>
                                    <option value="anne" ${user.emergencyRelation === 'anne' ? 'selected' : ''}>Anne</option>
                                    <option value="baba" ${user.emergencyRelation === 'baba' ? 'selected' : ''}>Baba</option>
                                    <option value="kardeş" ${user.emergencyRelation === 'kardeş' ? 'selected' : ''}>Kardeş</option>
                                    <option value="çocuk" ${user.emergencyRelation === 'çocuk' ? 'selected' : ''}>Çocuk</option>
                                    <option value="diğer" ${user.emergencyRelation === 'diğer' ? 'selected' : ''}>Diğer</option>
                                </select>
                            </div>
                        </div>
                        <div class="form-group">
                            <label class="form-label">Kan Grubu</label>
                            <select id="editBloodType" class="form-control">
                                <option value="">Seçiniz...</option>
                                <option value="A+" ${user.bloodType === 'A+' ? 'selected' : ''}>A+</option>
                                <option value="A-" ${user.bloodType === 'A-' ? 'selected' : ''}>A-</option>
                                <option value="B+" ${user.bloodType === 'B+' ? 'selected' : ''}>B+</option>
                                <option value="B-" ${user.bloodType === 'B-' ? 'selected' : ''}>B-</option>
                                <option value="AB+" ${user.bloodType === 'AB+' ? 'selected' : ''}>AB+</option>
                                <option value="AB-" ${user.bloodType === 'AB-' ? 'selected' : ''}>AB-</option>
                                <option value="O+" ${user.bloodType === 'O+' ? 'selected' : ''}>O+</option>
                                <option value="O-" ${user.bloodType === 'O-' ? 'selected' : ''}>O-</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label class="form-label">Kronik Hastalıklar / Alerjiler</label>
                            <textarea id="editMedicalInfo" class="form-control" rows="3" placeholder="Bilinen kronik hastalıklar, alerjiler veya özel durumlar...">${user.medicalInfo || ''}</textarea>
                        </div>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-secondary" onclick="closeModal('editEmployeeInfoModal')">İptal</button>
                    <button class="btn btn-primary" onclick="saveEmployeeInfo('${userId}')">
                        <i class="fas fa-save"></i> Kaydet
                    </button>
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    
    document.getElementById('editActiveStatus').addEventListener('change', function() {
        const workInfoDiv = document.getElementById('workInfo');
        const isActive = this.value === 'true';
        
        const existingTerminationFields = workInfoDiv.querySelector('.termination-fields');
        if (existingTerminationFields) {
            existingTerminationFields.remove();
        }
        
        if (!isActive) {
            const terminationHTML = `
                <div class="termination-fields">
                    <div class="form-group">
                        <label class="form-label">İşten Çıkış Tarihi</label>
                        <input type="date" id="editTerminationDate" class="form-control" value="${user.terminationDate || ''}">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Çıkış Nedeni</label>
                        <textarea id="editTerminationReason" class="form-control" rows="2" placeholder="İşten çıkış nedeni...">${user.terminationReason || ''}</textarea>
                    </div>
                </div>
            `;
            workInfoDiv.insertAdjacentHTML('beforeend', terminationHTML);
        }
    });
}


// Tab değiştirme fonksiyonu
function switchEmployeeTab(button, tabId) {
    const modal = document.getElementById('editEmployeeInfoModal');
    if (!modal) return;
    
    modal.querySelectorAll('.tab').forEach(tab => tab.classList.remove('active'));
    button.classList.add('active');
    
    modal.querySelectorAll('.tab-content').forEach(content => {
        content.style.display = 'none';
        content.classList.remove('active');
    });
    
    const selectedTab = modal.querySelector(`#${tabId}`);
    if (selectedTab) {
        selectedTab.style.display = 'block';
        selectedTab.classList.add('active');
    }
}
// Personel bilgilerini kaydetme fonksiyonu
async function saveEmployeeInfo(userId) {
    const user = firebaseData.users.find(u => u.id === userId);
    if (!user) {
        showNotification('Hata', 'Personel bulunamadı.', 'error');
        return;
    }
    
    const formData = {
        phone: document.getElementById('editPhone')?.value || '',
        email: document.getElementById('editEmail')?.value || '',
        birthDate: document.getElementById('editBirthDate')?.value || '',
        tcNo: document.getElementById('editTcNo')?.value || '',
        address: document.getElementById('editAddress')?.value || '',
        hireDate: document.getElementById('editHireDate')?.value || user.hireDate || '2024-01-01',
        employeeId: document.getElementById('editEmployeeId')?.value || user.employeeId || '',
        sgkNo: document.getElementById('editSgkNo')?.value || '',
        active: document.getElementById('editActiveStatus')?.value === 'true',
        emergencyContact: document.getElementById('editEmergencyContact')?.value || '',
        emergencyPhone: document.getElementById('editEmergencyPhone')?.value || '',
        emergencyRelation: document.getElementById('editEmergencyRelation')?.value || '',
        bloodType: document.getElementById('editBloodType')?.value || '',
        medicalInfo: document.getElementById('editMedicalInfo')?.value || ''
    };
    
    if (!formData.active) {
        formData.terminationDate = document.getElementById('editTerminationDate')?.value || '';
        formData.terminationReason = document.getElementById('editTerminationReason')?.value || '';
    } else {
        formData.terminationDate = '';
        formData.terminationReason = '';
    }
    
    if (formData.email && !isValidEmail(formData.email)) {
        showNotification('Hata', 'Geçersiz e-posta adresi.', 'error');
        return;
    }
    
    if (formData.tcNo && !isValidTcNo(formData.tcNo)) {
        showNotification('Hata', 'Geçersiz TC Kimlik numarası.', 'error');
        return;
    }
    
    if (formData.phone && !isValidPhone(formData.phone)) {
        showNotification('Hata', 'Geçersiz telefon numarası.', 'error');
        return;
    }
    
    try {
        await window.firestoreService.updateUser(userId, {
            ...formData,
            updatedAt: new Date().toISOString(),
            updatedBy: currentUser.id
        });
        
        const userIndex = firebaseData.users.findIndex(u => u.id === userId);
        if (userIndex !== -1) {
            firebaseData.users[userIndex] = { ...firebaseData.users[userIndex], ...formData };
        }
        
        showNotification('Başarılı', 'Personel bilgileri güncellendi.', 'success');
        closeModal('editEmployeeInfoModal');
        
        if (document.getElementById('employeeDetailsModal')) {
            closeModal('employeeDetailsModal');
        }
        
        const employeeListContent = document.getElementById('employeeList');
        if (employeeListContent && employeeListContent.classList.contains('active')) {
            employeeListContent.innerHTML = renderEmployeeList();
        }
        
    } catch (error) {
        console.error('Kaydetme hatası:', error);
        showNotification('Hata', 'Bilgiler kaydedilemedi.', 'error');
    }
}

async function approveAllLeaves() {
    // Sadece manager ve admin onaylayabilir
    if (currentUser.role !== 'admin' && currentUser.role !== 'manager') {
        showNotification('Yetki Hatası', 'Toplu onaylama yetkiniz bulunmuyor.', 'error');
        return;
    }
    
    if (!confirm('Tüm bekleyen izin taleplerini onaylamak istediğinize emin misiniz?')) {
        return;
    }
    
    try {
        showNotification('İşleniyor', 'İzin talepleri onaylanıyor...', 'info');
        
        const allLeaves = await window.firestoreService.getLeaveRequests();
        const pendingLeaves = allLeaves.filter(l => l.status === 'pending');
        
        if (pendingLeaves.length === 0) {
            showNotification('Bilgi', 'Onaylanacak bekleyen talep bulunmuyor.', 'info');
            return;
        }
        
        let approvedCount = 0;
        let errorCount = 0;
        
        for (const leave of pendingLeaves) {
            try {
                // İzin durumunu güncelle
                await window.firestoreService.updateLeaveRequest(leave.id, {
                    status: 'approved',
                    approvedBy: currentUser.id,
                    approverName: currentUser.name,
                    approvedDate: new Date().toISOString()
                });
                
                // Kullanıcının kullanılan izin miktarını güncelle
                const employee = firebaseData.users.find(u => u.id === leave.employeeId);
                if (employee) {
                    const leaveDays = parseInt(leave.totalDays) || 0;
                    const currentUsedLeave = employee.usedLeave || 0;
                    
                    await window.firestoreService.updateUser(employee.id, {
                        usedLeave: currentUsedLeave + leaveDays
                    });
                }
                
                // Kullanıcıya bildirim gönder
                await createNotification({
                    type: 'leave_approved',
                    title: 'İzin Talebiniz Onaylandı',
                    message: `${formatDate(leave.startDate)} - ${formatDate(leave.endDate)} tarihleri arasındaki ${leaveTypes[leave.type]?.name || leave.type} talebiniz ${currentUser.name} tarafından toplu olarak onaylandı.`,
                    from: currentUser.id,
                    to: leave.employeeId,
                    date: new Date().toISOString()
                });
                
                approvedCount++;
                
            } catch (error) {
                console.error(`İzin onaylama hatası (ID: ${leave.id}):`, error);
                errorCount++;
            }
        }
        
        // Firebase'den güncel veriyi çek
        await loadFirebaseData();
        
        // Başarı mesajı
        let message = `${approvedCount} izin talebi onaylandı.`;
        if (errorCount > 0) {
            message += ` ${errorCount} talep onaylanırken hata oluştu.`;
        }
        
        showNotification('Başarılı', message, 'success');
        
        // Sayfayı yenile
        loadInsanKaynaklari();
        
    } catch (error) {
        console.error('Toplu onaylama hatası:', error);
        showNotification('Hata', 'İzin talepleri onaylanırken hata oluştu.', 'error');
    }
}

async function loadMyLeavesData() {
    const contentDiv = document.getElementById('myLeavesContent');
    if (!contentDiv) return;
    
    contentDiv.innerHTML = '<div style="text-align: center; padding: 20px;"><i class="fas fa-spinner fa-spin"></i> Yükleniyor...</div>';
    
    let myLeaves = [];
    
    try {
        const allLeaves = await window.firestoreService.getLeaveRequests();
        myLeaves = allLeaves.filter(l => l.employeeId === currentUser.id);
    } catch (error) {
        console.error('İzinler yüklenemedi:', error);
        contentDiv.innerHTML = '<div style="color: red; text-align: center; padding: 20px;">Veriler yüklenirken hata oluştu.</div>';
        return;
    }
    
    contentDiv.innerHTML = `
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
                        <th>Onaylayan</th>
                        <th>İşlemler</th>
                    </tr>
                </thead>
                <tbody>
                    ${myLeaves.length > 0 ? myLeaves.map(leave => `
                        <tr>
                            <td><strong>#${leave.id ? leave.id.substring(0, 8) : 'N/A'}</strong></td>
                            <td>
                                <i class="fas ${leaveTypes[leave.type]?.icon || 'fa-calendar'}" 
                                   style="color: ${leaveTypes[leave.type]?.color || '#666'}; margin-right: 5px;"></i>
                                ${leaveTypes[leave.type]?.name || leave.type}
                            </td>
                            <td>${formatDate(leave.startDate)}</td>
                            <td>${formatDate(leave.endDate)}</td>
                            <td><strong>${leave.totalDays}</strong></td>
                            <td>${getLeaveStatusBadge(leave.status)}</td>
                            <td>${leave.approverName || '-'}</td>
                            <td>
                                ${leave.status === 'pending' ? 
                                    `<button class="btn btn-sm btn-danger" onclick="cancelLeaveRequest('${leave.id}')">
                                        <i class="fas fa-times"></i> İptal
                                    </button>` : 
                                    leave.status === 'rejected' ? 
                                    `<button class="btn btn-sm btn-info" onclick="showRejectDetails('${leave.id}')">
                                        <i class="fas fa-eye"></i> Detay
                                    </button>` : '-'
                                }
                            </td>
                        </tr>
                    `).join('') : `
                        <tr>
                            <td colspan="8" style="text-align: center; padding: 40px; color: var(--gray-500);">
                                <i class="fas fa-calendar-times" style="font-size: 32px; margin-bottom: 10px; display: block;"></i>
                                Henüz izin talebiniz bulunmuyor.
                                <br>
                                <button class="btn btn-primary" onclick="switchHRTab(document.querySelector('[onclick*=leaveRequest]'), 'leaveRequest')" style="margin-top: 10px;">
                                    <i class="fas fa-plus"></i> Yeni İzin Talebi Oluştur
                                </button>
                            </td>
                        </tr>
                    `}
                </tbody>
            </table>
        </div>
    `;
}

async function loadLeaveApprovalsData() {
    const contentDiv = document.getElementById('leaveApprovalsContent');
    if (!contentDiv) return;
    
    contentDiv.innerHTML = '<div style="text-align: center; padding: 20px;"><i class="fas fa-spinner fa-spin"></i> Yükleniyor...</div>';
    
    let pendingLeaves = [];
    
    try {
        const allLeaves = await window.firestoreService.getLeaveRequests();
        pendingLeaves = allLeaves.filter(l => l.status === 'pending');
    } catch (error) {
        console.error('İzin talepleri yüklenemedi:', error);
        contentDiv.innerHTML = '<div style="color: red; text-align: center; padding: 20px;">Veriler yüklenirken hata oluştu.</div>';
        return;
    }
    
    contentDiv.innerHTML = `
        <div class="table-container">
            <table class="table">
                <thead>
                    <tr>
                        <th>Personel</th>
                        <th>Departman</th>
                        <th>İzin Türü</th>
                        <th>Tarih Aralığı</th>
                        <th>Gün</th>
                        <th>Açıklama</th>
                        <th>Talep Tarihi</th>
                        <th>İşlemler</th>
                    </tr>
                </thead>
                <tbody>
                    ${pendingLeaves.length > 0 ? pendingLeaves.map(leave => `
                        <tr>
                            <td>
                                <div style="display: flex; align-items: center; gap: 8px;">
                                    <div style="width: 32px; height: 32px; background: var(--primary); color: white; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 14px;">
                                        ${leave.employeeName ? leave.employeeName.charAt(0).toUpperCase() : 'U'}
                                    </div>
                                    <div>
                                        <strong>${leave.employeeName || 'Bilinmeyen'}</strong>
                                        <div style="font-size: 12px; color: var(--gray-500);">${leave.employeeId ? '#' + leave.employeeId.substring(0, 8) : ''}</div>
                                    </div>
                                </div>
                            </td>
                            <td><span class="badge info">${getRoleDisplayName(leave.employeeRole || 'user')}</span></td>
                            <td>
                                <div style="display: flex; align-items: center; gap: 6px;">
                                    <i class="fas ${leaveTypes[leave.type]?.icon || 'fa-calendar'}" 
                                       style="color: ${leaveTypes[leave.type]?.color || '#666'};"></i>
                                    <span>${leaveTypes[leave.type]?.name || leave.type}</span>
                                </div>
                            </td>
                            <td>
                                <div style="font-size: 13px;">
                                    <div><strong>${formatDate(leave.startDate)}</strong></div>
                                    <div style="color: var(--gray-500);">↓</div>
                                    <div><strong>${formatDate(leave.endDate)}</strong></div>
                                </div>
                            </td>
                            <td><strong style="color: var(--primary);">${leave.totalDays}</strong></td>
                            <td style="max-width: 200px;">
                                ${leave.description ? 
                                    `<div title="${leave.description}" style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${leave.description}</div>` : 
                                    '<span style="color: var(--gray-400);">Açıklama yok</span>'
                                }
                            </td>
                            <td style="font-size: 12px; color: var(--gray-500);">
                                ${formatDate(leave.requestDate)}
                            </td>
                            <td>
                                <div class="action-buttons" style="display: flex; gap: 5px;">
                                    <button class="btn btn-sm btn-success" onclick="approveLeave('${leave.id}')" title="Onayla">
                                        <i class="fas fa-check"></i>
                                    </button>
                                    <button class="btn btn-sm btn-danger" onclick="rejectLeave('${leave.id}')" title="Reddet">
                                        <i class="fas fa-times"></i>
                                    </button>
                                    <button class="btn btn-sm btn-info" onclick="showLeaveDetails('${leave.id}')" title="Detaylar">
                                        <i class="fas fa-eye"></i>
                                    </button>
                                </div>
                            </td>
                        </tr>
                    `).join('') : `
                        <tr>
                            <td colspan="8" style="text-align: center; padding: 40px; color: var(--gray-500);">
                                <i class="fas fa-check-circle" style="font-size: 48px; margin-bottom: 15px; display: block; color: var(--success);"></i>
                                <h4>Tebrikler!</h4>
                                <p>Bekleyen izin talebi bulunmuyor.</p>
                            </td>
                        </tr>
                    `}
                </tbody>
            </table>
        </div>
    `;
}

async function updatePendingLeaveCount() {
    try {
        const allLeaves = await window.firestoreService.getLeaveRequests();
        const pendingCount = allLeaves.filter(l => l.status === 'pending').length;
        const countElement = document.getElementById('pendingLeaveCount');
        if (countElement) {
            countElement.textContent = pendingCount;
        }
    } catch (error) {
        console.error('Bekleyen talep sayısı güncellenemedi:', error);
    }
}

async function showRejectDetails(leaveId) {
    try {
        const allLeaves = await window.firestoreService.getLeaveRequests();
        const leave = allLeaves.find(l => l.id === leaveId);
        
        if (!leave) {
            showNotification('Hata', 'İzin talebi bulunamadı.', 'error');
            return;
        }
        
        const modalHTML = `
            <div id="rejectDetailsModal" class="modal show">
                <div class="modal-content" style="max-width: 600px;">
                    <div class="modal-header">
                        <h3 class="modal-title">İzin Red Detayları</h3>
                        <button class="modal-close" onclick="closeModal('rejectDetailsModal')">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    <div class="modal-body">
                        <div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 15px; margin-bottom: 20px;">
                            <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 10px;">
                                <i class="fas fa-times-circle" style="color: #ef4444; font-size: 20px;"></i>
                                <strong style="color: #991b1b;">İzin Talebi Reddedildi</strong>
                            </div>
                            <div style="font-size: 14px; color: #7f1d1d;">
                                Red Tarihi: ${formatDate(leave.rejectedDate)}
                            </div>
                        </div>
                        
                        <div class="form-group">
                            <label class="form-label">Red Sebebi</label>
                            <div style="background: var(--gray-50); padding: 12px; border-radius: 6px; border: 1px solid var(--gray-200);">
                                ${leave.rejectReason || 'Sebep belirtilmemiş'}
                            </div>
                        </div>
                        
                        ${leave.alternativeDates ? `
                        <div class="form-group">
                            <label class="form-label">Önerilen Alternatif Tarihler</label>
                            <div style="background: #f0f9ff; padding: 12px; border-radius: 6px; border: 1px solid #0ea5e9;">
                                <strong>${formatDate(leave.alternativeDates.start)} - ${formatDate(leave.alternativeDates.end)}</strong>
                            </div>
                        </div>
                        ` : ''}
                        
                        ${leave.managerNote ? `
                        <div class="form-group">
                            <label class="form-label">Yönetici Notu</label>
                            <div style="background: var(--gray-50); padding: 12px; border-radius: 6px; border: 1px solid var(--gray-200);">
                                ${leave.managerNote}
                            </div>
                        </div>
                        ` : ''}
                    </div>
                    <div class="modal-footer">
                        <button class="btn btn-outline" onclick="closeModal('rejectDetailsModal')">Kapat</button>
                    </div>
                </div>
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', modalHTML);
    } catch (error) {
        console.error('İzin detayları yüklenemedi:', error);
        showNotification('Hata', 'İzin detayları yüklenemedi.', 'error');
    }
}

async function showLeaveDetails(leaveId) {
    try {
        const allLeaves = await window.firestoreService.getLeaveRequests();
        const leave = allLeaves.find(l => l.id === leaveId);
        
        if (!leave) {
            showNotification('Hata', 'İzin talebi bulunamadı.', 'error');
            return;
        }
        
        const employee = firebaseData.users.find(u => u.id === leave.employeeId);
        
        const modalHTML = `
            <div id="leaveDetailsModal" class="modal show">
                <div class="modal-content" style="max-width: 600px;">
                    <div class="modal-header">
                        <h3 class="modal-title">İzin Talebi Detayları</h3>
                        <button class="modal-close" onclick="closeModal('leaveDetailsModal')">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    <div class="modal-body">
                        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 10px; margin-bottom: 20px;">
                            <h4>${employee?.name || 'Bilinmeyen Personel'}</h4>
                            <p style="margin: 5px 0;">${getRoleDisplayName(leave.employeeRole || 'user')}</p>
                            <p style="margin: 5px 0;">Talep No: #${leave.id.substring(0, 8)}</p>
                        </div>
                        
                        <div class="form-grid">
                            <div class="form-group">
                                <label class="form-label">İzin Türü</label>
                                <div style="display: flex; align-items: center; gap: 8px;">
                                    <i class="fas ${leaveTypes[leave.type]?.icon}" style="color: ${leaveTypes[leave.type]?.color}; font-size: 20px;"></i>
                                    <strong>${leaveTypes[leave.type]?.name || leave.type}</strong>
                                </div>
                            </div>
                            <div class="form-group">
                                <label class="form-label">Tarih Aralığı</label>
                                <div>${formatDate(leave.startDate)} - ${formatDate(leave.endDate)}</div>
                            </div>
                            <div class="form-group">
                                <label class="form-label">Toplam Gün</label>
                                <strong>${leave.totalDays}</strong>
                            </div>
                            <div class="form-group">
                                <label class="form-label">Durum</label>
                                ${getLeaveStatusBadge(leave.status)}
                            </div>
                        </div>
                        
                        ${leave.description ? `
                        <div class="form-group">
                            <label class="form-label">Açıklama</label>
                            <div style="background: var(--gray-50); padding: 12px; border-radius: 6px;">
                                ${leave.description}
                            </div>
                        </div>
                        ` : ''}
                        
                        ${leave.deputy ? `
                        <div class="form-group">
                            <label class="form-label">Vekil Personel</label>
                            <div>${firebaseData.users.find(u => u.id === leave.deputy)?.name || 'Belirtilmemiş'}</div>
                        </div>
                        ` : ''}
                        
                        <div class="form-group">
                            <label class="form-label">Talep Tarihi</label>
                            <div>${new Date(leave.requestDate).toLocaleString('tr-TR')}</div>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button class="btn btn-outline" onclick="closeModal('leaveDetailsModal')">Kapat</button>
                    </div>
                </div>
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', modalHTML);
    } catch (error) {
        console.error('İzin detayları yüklenemedi:', error);
        showNotification('Hata', 'İzin detayları yüklenemedi.', 'error');
    }
}


function calculateWorkDays(startDateStr) {
    if (!startDateStr) return 0;
    
    const startDate = new Date(startDateStr);
    const today = new Date();
    
    if (startDate > today) return 0;
    
    let workDays = 0;
    const currentDate = new Date(startDate);
    
    while (currentDate <= today) {
        const dayOfWeek = currentDate.getDay();
        // Cumartesi (6) ve Pazar (0) hariç günleri say
        if (dayOfWeek !== 0 && dayOfWeek !== 6) {
            workDays++;
        }
        currentDate.setDate(currentDate.getDate() + 1);
    }
    
    return workDays;
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
// İNSAN KAYNAKLARI GLOBAL EXPORTS

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
window.renderLeaveCalendar = renderLeaveCalendar;
window.loadLeaveCalendarData = loadLeaveCalendarData;
window.editEmployeeInfo = editEmployeeInfo;
window.saveEmployeeInfo = saveEmployeeInfo;
window.editEmployeeLeave = editEmployeeLeave;
window.saveEmployeeLeave = saveEmployeeLeave;
window.updateLeaveSummary = updateLeaveSummary;
window.switchEmployeeTab = switchEmployeeTab;
window.exportEmployeeReport = exportEmployeeReport;
window.approveAllLeaves = approveAllLeaves;
window.showEmployeeDetails = showEmployeeDetails;
window.loadMyLeavesData = loadMyLeavesData;
window.loadLeaveApprovalsData = loadLeaveApprovalsData;
window.updatePendingLeaveCount = updatePendingLeaveCount;
window.showRejectDetails = showRejectDetails;
window.showLeaveDetails = showLeaveDetails;
window.calculateWorkDays = calculateWorkDays;
window.formatDate = formatDate;
window.getLeaveStatusBadge = getLeaveStatusBadge;
window.leaveTypes = leaveTypes;
window.officialHolidays = officialHolidays;
window.renderEmployeeList = renderEmployeeList;
window.refreshEmployeeList = refreshEmployeeList;
window.loadEmployeeListOptimized = loadEmployeeListOptimized;