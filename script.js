const STORAGE_KEY = 'rentora_verified_data_v5';
const AUTH_SESSION_KEY = 'rentora_auth_session';
let speechTimer = null;
let activeFilter = 'all';
let usePhpBackend = false;

function round2(value) {
  const num = Number(value);
  if (isNaN(num) || !isFinite(num)) return 0;
  return Number(Math.round(num + 'e2') + 'e-2');
}

let appData = {
  config: { mainBill: 7850.00, mainKwh: 550.00, waterFee: 150.00, ratePerKwh: 14.27 },
  users: { elena: 'admin123', admin: 'admin123' },
  tenants: [],
  invoices: []
};

async function init() {
  try {
    const res = await fetch('api/rentora.php?action=load');
    if (res.ok) {
      const data = await res.json();
      if (data && data.success) {
        usePhpBackend = true;
        appData.config = data.config;
        appData.tenants = data.tenants;
        appData.invoices = data.invoices;
        document.getElementById('dbModeBadge').innerText = 'PHP + MySQL Active';
      }
    }
  } catch (err) {
    usePhpBackend = false;
  }

  if (!usePhpBackend) {
    document.getElementById('dbModeBadge').innerText = 'LocalStorage Active';
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        appData = JSON.parse(stored);
      } catch (e) {
        loadDefaultSampleData();
      }
    } else {
      loadDefaultSampleData();
    }
  }

  checkLoginSession();
  updateRateDisplay();
  renderAll();
  setupMemojiTracker();
}

async function syncToBackend(action, payloadObj) {
  if (usePhpBackend) {
    try {
      const formData = new FormData();
      formData.append('action', action);
      Object.keys(payloadObj).forEach(k => formData.append(k, payloadObj[k]));
      const res = await fetch('api/rentora.php', { method: 'POST', body: formData });
      const data = await res.json();
      if (!data.success) {
        alert(data.message || 'Database error');
        return false;
      }
      const reloadRes = await fetch('api/rentora.php?action=load');
      const fresh = await reloadRes.json();
      if (fresh.success) {
        appData.config = fresh.config;
        appData.tenants = fresh.tenants;
        appData.invoices = fresh.invoices;
      }
    } catch (e) {
      console.error('Sync failed:', e);
    }
  }
  saveState();
  return true;
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(appData));
  renderAll();
}

function loadDefaultSampleData() {
  appData = {
    config: { mainBill: 7850.00, mainKwh: 550.00, waterFee: 150.00, ratePerKwh: 14.27 },
    users: { elena: 'admin123', admin: 'admin123' },
    tenants: [
      { id: '1', room: 'Room 101', name: 'Marco Ramos', phone: '0917-555-0101', rent: 2600.00, currentMeter: 1240.00 },
      { id: '2', room: 'Room 102', name: 'Chloe Anne Santos', phone: '0918-555-0102', rent: 2800.00, currentMeter: 890.00 }
    ],
    invoices: [
      {
        id: 'INV-2026-001', tenantId: '1', room: 'Room 101', tenantName: 'Marco Ramos',
        period: '2026-08', prevReading: 1180.00, currReading: 1240.00, kwhUsed: 60.00,
        ratePerKwh: 14.27, powerAmount: 856.20, waterAmount: 150.00, rentAmount: 2600.00,
        totalAmount: 3606.20, amountPaid: 3606.20, status: 'Paid', paidAt: '2026-09-02',
        payMethod: 'GCash (Ref # 88201)', createdAt: '2026-09-01'
      },
      {
        id: 'INV-2026-002', tenantId: '2', room: 'Room 102', tenantName: 'Chloe Anne Santos',
        period: '2026-09', prevReading: 820.00, currReading: 890.00, kwhUsed: 70.00,
        ratePerKwh: 14.27, powerAmount: 998.90, waterAmount: 150.00, rentAmount: 2800.00,
        totalAmount: 3948.90, amountPaid: 0.00, status: 'Unpaid', paidAt: null,
        payMethod: null, createdAt: '2026-09-25'
      }
    ]
  };
  saveState();
}

function resetToSampleData() {
  if (confirm('Reset all records to default sample data?')) {
    loadDefaultSampleData();
    updateRateDisplay();
    showGuideSpeech('Sample data restored!', 3000);
  }
}

function togglePasswordVisibility(inputId, iconId) {
  const input = document.getElementById(inputId);
  if (!input) return;
  input.type = input.type === 'password' ? 'text' : 'password';
}

function handleSignUpSubmit(e) {
  e.preventDefault();
  const room = document.getElementById('regRoom').value.trim();
  const username = document.getElementById('regUsername').value.trim().toLowerCase();
  const name = document.getElementById('regName').value.trim();
  const phone = document.getElementById('regPhone').value.trim();
  const meter = round2(document.getElementById('regMeter').value);
  const pass = document.getElementById('regPassword').value.trim();

  appData.users[username] = pass;
  appData.tenants.push({ id: 't_' + Date.now(), room, name, phone, rent: 2600.00, currentMeter: meter });
  saveState();
  closeModal('signUpModal');
  document.getElementById('loginUsername').value = username;
  document.getElementById('loginPassword').value = pass;
}

function handleResetPasswordSubmit(e) {
  e.preventDefault();
  const username = document.getElementById('resetUsername').value.trim().toLowerCase();
  const newPass = document.getElementById('resetNewPassword').value.trim();
  appData.users[username] = newPass;
  saveState();
  closeModal('resetPasswordModal');
}

function checkLoginSession() {
  const isLogged = localStorage.getItem(AUTH_SESSION_KEY) || sessionStorage.getItem(AUTH_SESSION_KEY);
  if (isLogged) {
    document.getElementById('loginScreen').classList.add('hidden');
    document.getElementById('mainDashboardView').classList.remove('hidden');
  } else {
    document.getElementById('mainDashboardView').classList.add('hidden');
    document.getElementById('loginScreen').classList.remove('hidden');
  }
}

function handleLoginSubmit(e) {
  e.preventDefault();
  const user = document.getElementById('loginUsername').value.trim().toLowerCase();
  const pass = document.getElementById('loginPassword').value.trim();
  const storedPass = appData.users && appData.users[user];
  if ((storedPass && storedPass === pass) || ((user === 'elena' || user === 'admin') && pass === 'admin123')) {
    localStorage.setItem(AUTH_SESSION_KEY, 'Landlord: Ate Elena');
    checkLoginSession();
  } else {
    const errorBox = document.getElementById('loginErrorAlert');
    errorBox.innerText = 'Invalid credentials. Use elena / admin123';
    errorBox.classList.remove('hidden');
  }
}

function handleLogout() {
  localStorage.removeItem(AUTH_SESSION_KEY);
  sessionStorage.removeItem(AUTH_SESSION_KEY);
  checkLoginSession();
}

function toggleRatePanel() {
  document.getElementById('ratePanel').classList.toggle('hidden');
}

async function saveUtilityRates() {
  const rawBill = parseFloat(document.getElementById('cfgMainBill').value);
  const rawKwh = parseFloat(document.getElementById('cfgMainKwh').value);
  const rawWater = parseFloat(document.getElementById('cfgWaterFee').value);

  if (isNaN(rawBill) || rawBill < 0 || isNaN(rawKwh) || rawKwh <= 0 || isNaN(rawWater) || rawWater < 0) {
    alert('Please enter valid utility numbers. Total kWh must be greater than zero.');
    return;
  }

  const bill = round2(rawBill);
  const kwh = round2(rawKwh);
  const water = round2(rawWater);
  const rate = round2(bill / kwh);

  appData.config = { mainBill: bill, mainKwh: kwh, waterFee: water, ratePerKwh: rate };
  await syncToBackend('update_rates', { main_bill: bill, main_kwh: kwh, water_fee: water, rate_per_kwh: rate });
  updateRateDisplay();
  showGuideSpeech(`Utility rate updated to ₱${rate.toFixed(2)} per kWh.`, 3000);
}

function updateRateDisplay() {
  document.getElementById('cfgMainBill').value = round2(appData.config.mainBill).toFixed(2);
  document.getElementById('cfgMainKwh').value = round2(appData.config.mainKwh).toFixed(2);
  document.getElementById('cfgWaterFee').value = round2(appData.config.waterFee).toFixed(2);
  document.getElementById('statPowerRate').innerText = `₱${round2(appData.config.ratePerKwh).toFixed(2)} / kWh`;
}

function switchTab(tab) {
  const tenantsView = document.getElementById('viewTenants');
  const billingView = document.getElementById('viewBilling');
  const tBtn = document.getElementById('tabBtnTenants');
  const bBtn = document.getElementById('tabBtnBilling');

  if (tab === 'tenants') {
    tenantsView.classList.remove('hidden');
    billingView.classList.add('hidden');
    tBtn.className = 'guide-hover pb-2.5 border-b-2 border-emerald-600 text-emerald-700 font-semibold cursor-pointer';
    bBtn.className = 'guide-hover pb-2.5 border-b-2 border-transparent text-slate-500 hover:text-slate-800 font-semibold cursor-pointer';
  } else {
    billingView.classList.remove('hidden');
    tenantsView.classList.add('hidden');
    bBtn.className = 'guide-hover pb-2.5 border-b-2 border-emerald-600 text-emerald-700 font-semibold cursor-pointer';
    tBtn.className = 'guide-hover pb-2.5 border-b-2 border-transparent text-slate-500 hover:text-slate-800 font-semibold cursor-pointer';
  }
}

async function handleSaveTenant(e) {
  e.preventDefault();
  const room = document.getElementById('tRoom').value.trim();
  const name = document.getElementById('tName').value.trim();
  const phone = document.getElementById('tPhone').value.trim();
  const rent = round2(document.getElementById('tRent').value);
  const meter = round2(document.getElementById('tMeter').value);

  appData.tenants.push({ id: 't_' + Date.now(), room, name, phone, rent, currentMeter: meter });
  await syncToBackend('add_room', { room_no: room, tenant_name: name, phone, base_rent: rent, current_meter: meter });
  closeModal('addTenantModal');
  document.getElementById('tenantForm').reset();
  showGuideSpeech(`Added ${name} to ${room}.`, 3000);
}

async function deleteTenant(id) {
  if (confirm('Delete this tenant record?')) {
    appData.tenants = appData.tenants.filter(t => String(t.id) !== String(id));
    await syncToBackend('delete_room', { room_id: id });
  }
}

function renderTenants() {
  const grid = document.getElementById('tenantsGrid');
  const search = (document.getElementById('tenantSearch').value || '').toLowerCase();
  grid.innerHTML = '';

  const filtered = appData.tenants.filter(t =>
    t.room.toLowerCase().includes(search) || t.name.toLowerCase().includes(search)
  );

  filtered.forEach(t => {
    const card = document.createElement('div');
    card.className = 'bg-white rounded-2xl border border-slate-200 shadow-sm p-4 flex flex-col justify-between';
    card.innerHTML = `
      <div>
        <div class="flex justify-between items-start">
          <span class="text-xs font-bold bg-slate-100 text-slate-700 px-2 py-0.5 rounded">${t.room} / MONTHLY</span>
          <button type="button" onclick="deleteTenant('${t.id}')" class="text-xs text-rose-500 hover:text-rose-700 font-medium cursor-pointer">Remove</button>
        </div>
        <h3 class="font-bold text-slate-800 text-base mt-2">${t.name}</h3>
        <p class="text-xs text-slate-500">${t.phone}</p>
        <div class="mt-4 pt-3 border-t border-slate-100 space-y-1 text-xs">
          <div class="flex justify-between text-slate-600"><span>Base Rent:</span><span class="font-semibold text-slate-800">₱${round2(t.rent).toFixed(2)}</span></div>
          <div class="flex justify-between text-slate-600"><span>Water Share:</span><span class="font-semibold text-slate-800">₱${round2(appData.config.waterFee).toFixed(2)}</span></div>
          <div class="flex justify-between text-slate-600"><span>Last Meter Reading:</span><span class="font-semibold text-slate-800">${round2(t.currentMeter).toFixed(2)} kWh</span></div>
        </div>
      </div>
      <button type="button" onclick="prepareBillForTenant('${t.id}')" data-tip="Generate monthly bill for ${t.name}." class="guide-hover mt-4 w-full bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-medium text-xs py-2.5 rounded-xl transition border border-emerald-200 cursor-pointer">
        Generate Room Bill
      </button>
    `;
    grid.appendChild(card);
  });
}

function prepareBillForTenant(tenantId) {
  switchTab('billing');
  openCreateInvoiceModal();
  document.getElementById('invTenantSelect').value = tenantId;
  onTenantSelectedForBill();
}

function openCreateInvoiceModal() {
  const select = document.getElementById('invTenantSelect');
  select.innerHTML = '<option value="">Select Tenant</option>';
  appData.tenants.forEach(t => {
    const opt = document.createElement('option');
    opt.value = t.id;
    opt.innerText = `${t.room} - ${t.name}`;
    select.appendChild(opt);
  });
  document.getElementById('invPeriod').value = new Date().toISOString().substring(0, 7);
  document.getElementById('invPrevReading').value = '';
  document.getElementById('invCurrReading').value = '';
  document.getElementById('meterValidationAlert').classList.add('hidden');
  calculateLivePreview();
  openModal('createInvoiceModal');
}

function onTenantSelectedForBill() {
  const tenantId = document.getElementById('invTenantSelect').value;
  const tenant = appData.tenants.find(t => String(t.id) === String(tenantId));
  document.getElementById('invPrevReading').value = tenant ? round2(tenant.currentMeter).toFixed(2) : '';
  calculateLivePreview();
}

function simulateOcrMeterScan() {
  const prev = round2(document.getElementById('invPrevReading').value || 800);
  const scanned = round2(prev + Math.floor(Math.random() * 45) + 25);
  document.getElementById('invCurrReading').value = scanned.toFixed(2);
  calculateLivePreview();
}

function calculateLivePreview() {
  const tenantId = document.getElementById('invTenantSelect').value;
  const tenant = appData.tenants.find(t => String(t.id) === String(tenantId));
  const prev = round2(document.getElementById('invPrevReading').value);
  const currStr = document.getElementById('invCurrReading').value.trim();
  const currParsed = parseFloat(currStr);
  const alertBox = document.getElementById('meterValidationAlert');

  let kwhUsed = 0;
  if (currStr !== '' && !isNaN(currParsed)) {
    if (round2(currParsed) < prev) {
      alertBox.classList.remove('hidden');
    } else {
      alertBox.classList.add('hidden');
      kwhUsed = round2(round2(currParsed) - prev);
    }
  } else {
    alertBox.classList.add('hidden');
  }

  const rate = round2(appData.config.ratePerKwh);
  const powerCost = round2(kwhUsed * rate);
  const waterCost = round2(appData.config.waterFee);
  const rentCost = tenant ? round2(tenant.rent) : 0;
  const grandTotal = round2(powerCost + waterCost + rentCost);

  document.getElementById('prevKwhUsed').innerText = kwhUsed.toFixed(2);
  document.getElementById('prevRate').innerText = rate.toFixed(2);
  document.getElementById('prevPowerCost').innerText = powerCost.toFixed(2);
  document.getElementById('prevWaterCost').innerText = waterCost.toFixed(2);
  document.getElementById('prevRentCost').innerText = rentCost.toFixed(2);
  document.getElementById('prevGrandTotal').innerText = grandTotal.toFixed(2);
}

async function handleCreateInvoice(e) {
  e.preventDefault();
  const tenantId = document.getElementById('invTenantSelect').value;
  const tenant = appData.tenants.find(t => String(t.id) === String(tenantId));
  if (!tenant) return;

  const period = document.getElementById('invPeriod').value;
  const prev = round2(document.getElementById('invPrevReading').value);
  const curr = round2(document.getElementById('invCurrReading').value);

  if (curr < prev) {
    alert('Current meter reading cannot be lower than the previous reading.');
    return;
  }

  const kwhUsed = round2(curr - prev);
  const rate = round2(appData.config.ratePerKwh);
  const powerCost = round2(kwhUsed * rate);
  const waterCost = round2(appData.config.waterFee);
  const rentCost = round2(tenant.rent);
  const grandTotal = round2(powerCost + waterCost + rentCost);
  const invCode = 'INV-' + Date.now().toString().slice(-6);
  const createdAt = new Date().toISOString().substring(0, 10);

  appData.invoices.unshift({
    id: invCode, tenantId: tenant.id, room: tenant.room, tenantName: tenant.name,
    period, prevReading: prev, currReading: curr, kwhUsed, ratePerKwh: rate,
    powerAmount: powerCost, waterAmount: waterCost, rentAmount: rentCost,
    totalAmount: grandTotal, amountPaid: 0.00, status: 'Unpaid', paidAt: null, payMethod: null, createdAt
  });
  tenant.currentMeter = curr;

  await syncToBackend('create_bill', {
    invoice_code: invCode, room_id: tenant.id, room_no: tenant.room, tenant_name: tenant.name,
    billing_period: period, prev_reading: prev, curr_reading: curr, kwh_used: kwhUsed,
    rate_per_kwh: rate, electricity: powerCost, water: waterCost, base_rent: rentCost,
    total: grandTotal, created_at: createdAt
  });

  closeModal('createInvoiceModal');
  showGuideSpeech(`Created bill for ${tenant.room}. Total: ₱${grandTotal.toFixed(2)}.`, 3000);
}

function filterInvoices(filter) {
  activeFilter = filter;
  renderInvoices();
}

function promptPayment(invoiceId) {
  const inv = appData.invoices.find(i => i.id === invoiceId);
  if (!inv) return;
  const remaining = round2(inv.totalAmount - (inv.amountPaid || 0));
  document.getElementById('payInvoiceId').value = inv.id;
  document.getElementById('payInvoiceDisplay').innerText = `${inv.id} (${inv.room})`;
  document.getElementById('payAmountDisplay').innerText = `₱${remaining.toFixed(2)}`;
  document.getElementById('payAmountInput').value = remaining.toFixed(2);
  document.getElementById('payRef').value = '';
  openModal('paymentModal');
}

async function handleRecordPayment(e) {
  e.preventDefault();
  const id = document.getElementById('payInvoiceId').value;
  const paidNow = round2(document.getElementById('payAmountInput').value);
  const method = document.getElementById('payChannel').value;
  const ref = document.getElementById('payRef').value.trim() || 'Verified';

  const inv = appData.invoices.find(i => i.id === id);
  if (!inv) return;

  inv.amountPaid = round2((inv.amountPaid || 0) + paidNow);
  inv.paidAt = new Date().toISOString().substring(0, 10);
  const entry = `${method} (${ref})`;
  inv.payMethod = inv.payMethod ? `${inv.payMethod}; ${entry}` : entry;
  inv.status = inv.amountPaid >= inv.totalAmount ? 'Paid' : 'Partial';

  await syncToBackend('record_payment', {
    invoice_code: inv.id, amount_paid: inv.amountPaid, status: inv.status,
    pay_method: inv.payMethod, paid_at: inv.paidAt
  });

  closeModal('paymentModal');
  showGuideSpeech(`Recorded ₱${paidNow.toFixed(2)} for ${inv.room}.`, 3000);
}

function openSmsReminder(invoiceId) {
  const inv = appData.invoices.find(i => i.id === invoiceId);
  if (!inv) return;
  const remaining = round2(inv.totalAmount - (inv.amountPaid || 0));
  document.getElementById('smsRecipient').innerText = inv.tenantName;
  document.getElementById('smsMessageBox').value =
    `Hello ${inv.tenantName}! Rentora bill for ${inv.room} (${inv.period}):\n` +
    `- Electricity (${round2(inv.kwhUsed).toFixed(2)} kWh): ₱${round2(inv.powerAmount).toFixed(2)}\n` +
    `- Water: ₱${round2(inv.waterAmount).toFixed(2)}\n- Rent: ₱${round2(inv.rentAmount).toFixed(2)}\n` +
    `BALANCE DUE: ₱${remaining.toFixed(2)}. Thank you! - Ate Elena`;
  openModal('smsModal');
}

function copySmsText() {
  const box = document.getElementById('smsMessageBox');
  box.select();
  navigator.clipboard.writeText(box.value);
  closeModal('smsModal');
}

function showReceipt(invoiceId) {
  const inv = appData.invoices.find(i => i.id === invoiceId);
  if (!inv) return;
  const paid = round2(inv.amountPaid || 0);
  const balance = round2(inv.totalAmount - paid);

  document.getElementById('receiptContent').innerHTML = `
    <div class="flex justify-between py-1 border-b border-dashed"><span>Invoice:</span><span class="font-mono font-bold">${inv.id}</span></div>
    <div class="flex justify-between py-1 border-b border-dashed"><span>Room &amp; Tenant:</span><span class="font-bold">${inv.room} (${inv.tenantName})</span></div>
    <div class="flex justify-between py-1 border-b border-dashed"><span>Period:</span><span>${inv.period}</span></div>
    <div class="pt-2 space-y-1 bg-slate-50 p-2.5 rounded-xl border mt-2">
      <div class="flex justify-between"><span>Meter Range:</span><span>${round2(inv.prevReading).toFixed(2)} to ${round2(inv.currReading).toFixed(2)} kWh</span></div>
      <div class="flex justify-between"><span>Electricity (${round2(inv.kwhUsed).toFixed(2)} kWh):</span><span>₱${round2(inv.powerAmount).toFixed(2)}</span></div>
      <div class="flex justify-between"><span>Water Fee:</span><span>₱${round2(inv.waterAmount).toFixed(2)}</span></div>
      <div class="flex justify-between"><span>Base Rent:</span><span>₱${round2(inv.rentAmount).toFixed(2)}</span></div>
    </div>
    <div class="pt-2 flex justify-between font-bold text-sm"><span>TOTAL BILL:</span><span class="text-emerald-700">₱${round2(inv.totalAmount).toFixed(2)}</span></div>
    <div class="flex justify-between text-xs"><span>Remaining Balance:</span><span>₱${balance.toFixed(2)}</span></div>
  `;
  openModal('receiptModal');
}

function renderInvoices() {
  const tbody = document.getElementById('invoicesTableBody');
  tbody.innerHTML = '';
  let list = appData.invoices;
  if (activeFilter === 'paid') list = list.filter(i => i.status === 'Paid');
  if (activeFilter === 'unpaid') list = list.filter(i => i.status !== 'Paid');

  list.forEach(inv => {
    const tr = document.createElement('tr');
    const badgeColor = inv.status === 'Paid' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700';
    tr.innerHTML = `
      <td class="p-3.5 font-mono text-xs font-semibold">${inv.id}</td>
      <td class="p-3.5 font-medium">${inv.room} <span class="text-xs text-slate-400">(${inv.tenantName})</span></td>
      <td class="p-3.5">${inv.period}</td>
      <td class="p-3.5">${round2(inv.kwhUsed).toFixed(2)} kWh</td>
      <td class="p-3.5 font-bold">₱${round2(inv.totalAmount).toFixed(2)}</td>
      <td class="p-3.5"><span class="text-xs px-2.5 py-0.5 rounded-full font-semibold ${badgeColor}">${inv.status}</span></td>
      <td class="p-3.5 text-right whitespace-nowrap">
        <div class="inline-flex items-center justify-end gap-1.5">
          <button type="button" onclick="showReceipt('${inv.id}')" data-tip="View and print statement for ${inv.room}." class="guide-hover cursor-pointer text-xs bg-white hover:bg-emerald-50 text-slate-700 hover:text-emerald-700 border border-slate-300 font-semibold px-3 py-1.5 rounded-lg">Receipt</button>
          ${inv.status !== 'Paid' ? `
            <button type="button" onclick="openSmsReminder('${inv.id}')" data-tip="Generate SMS reminder." class="guide-hover cursor-pointer text-xs bg-amber-100 text-amber-800 border border-amber-300 font-semibold px-3 py-1.5 rounded-lg">SMS</button>
            <button type="button" onclick="promptPayment('${inv.id}')" data-tip="Record payment." class="guide-hover cursor-pointer text-xs bg-emerald-600 text-white font-semibold px-3 py-1.5 rounded-lg">Pay</button>
          ` : `<span class="text-[11px] text-slate-400 font-medium px-2 py-1">Settled</span>`}
        </div>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

function renderAll() {
  document.getElementById('statTotalRooms').innerText = appData.tenants.length;
  document.getElementById('countTenantsBadge').innerText = appData.tenants.length;
  document.getElementById('countInvoicesBadge').innerText = appData.invoices.length;

  let unpaid = 0, paid = 0;
  appData.invoices.forEach(inv => {
    const amtPaid = round2(inv.amountPaid !== undefined ? inv.amountPaid : (inv.status === 'Paid' ? inv.totalAmount : 0));
    paid = round2(paid + amtPaid);
    unpaid = round2(unpaid + round2(inv.totalAmount - amtPaid));
  });

  document.getElementById('statUnpaidTotal').innerText = `₱${unpaid.toFixed(2)}`;
  document.getElementById('statPaidTotal').innerText = `₱${paid.toFixed(2)}`;
  renderTenants();
  renderInvoices();
}

function openModal(id) {
  hideGuideSpeech();
  const el = document.getElementById(id);
  if (el) { el.classList.remove('hidden'); el.classList.add('flex'); }
}

function closeModal(id) {
  hideGuideSpeech();
  const el = document.getElementById(id);
  if (el) { el.classList.remove('flex'); el.classList.add('hidden'); }
}

function handleBackdropClick(e, id) {
  if (e.target.id === id) closeModal(id);
}

function showGuideSpeech(text, autoHideMs = 0) {
  if (speechTimer) clearTimeout(speechTimer);
  const bubble = document.getElementById('guideSpeechBubble');
  const speech = document.getElementById('guideSpeechText');
  if (speech && text) speech.innerText = text;
  if (bubble) {
    bubble.classList.remove('opacity-0', 'translate-y-2', 'invisible');
    bubble.classList.add('opacity-100', 'translate-y-0', 'visible');
  }
  if (autoHideMs > 0) speechTimer = setTimeout(hideGuideSpeech, autoHideMs);
}

function hideGuideSpeech() {
  if (speechTimer) clearTimeout(speechTimer);
  const bubble = document.getElementById('guideSpeechBubble');
  if (bubble) {
    bubble.classList.remove('opacity-100', 'translate-y-0', 'visible');
    bubble.classList.add('opacity-0', 'translate-y-2', 'invisible');
  }
}

function setupMemojiTracker() {
  const headWrapper = document.getElementById('memojiHeadWrapper');
  window.addEventListener('mousemove', (e) => {
    if (!headWrapper) return;
    const rect = headWrapper.getBoundingClientRect();
    const tiltY = Math.max(-18, Math.min(18, (e.clientX - (rect.left + rect.width / 2)) / 45));
    const tiltX = Math.max(-14, Math.min(14, -(e.clientY - (rect.top + rect.height / 2)) / 55));
    headWrapper.style.transform = `rotateX(${tiltX}deg) rotateY(${tiltY}deg)`;
  });

  document.addEventListener('mouseover', (e) => {
    const target = e.target.closest('.guide-hover');
    if (target && target.getAttribute('data-tip')) showGuideSpeech(target.getAttribute('data-tip'));
  });
  document.addEventListener('mouseout', (e) => {
    const target = e.target.closest('.guide-hover');
    if (target && !target.contains(e.relatedTarget)) hideGuideSpeech();
  });
}

function triggerMemojiWink() {
  showGuideSpeech('Accurate records without math errors!', 2500);
}

window.onload = init;