const API_BASE = window.location.hostname === 'nine-security.com' || window.location.hostname === 'zen9ya0.github.io' ? 'https://api.nine-security.com' : '';
let currentUser = null;
let egressCidrs = [];

let trendsChart = null;
let logFilterMode = 'all'; // 'all' or 'malicious'

// Initial Load
document.addEventListener('DOMContentLoaded', () => {
    checkAuth();
    setupSidebar();
    initTrendsChart();

    // Auto-refresh analytics every 30s
    setInterval(() => {
        if (currentUser && document.getElementById('overview').classList.contains('active')) {
            refreshAnalytics();
            refreshTrends();
        }
    }, 30000);
});

function setupSidebar() {
    const toggle = document.getElementById('sidebar-toggle');
    const sidebar = document.getElementById('sidebar');

    toggle.onclick = () => {
        sidebar.classList.toggle('collapsed');
        const icon = toggle.querySelector('i');
        if (sidebar.classList.contains('collapsed')) {
            icon.className = 'fa-solid fa-chevron-right';
        } else {
            icon.className = 'fa-solid fa-chevron-left';
        }
    };
}

function switchSection(sectionId, element) {
    logFilterMode = 'all';
    // Nav items update
    document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
    element.classList.add('active');

    // Sections update
    document.querySelectorAll('.section').forEach(el => el.classList.remove('active'));
    document.getElementById(sectionId).classList.add('active');

    // Title update
    const titles = {
        overview: 'DASHBOARD OVERVIEW',
        event: 'SECURITY EVENT LOGS',
        audit: 'SYSTEM AUDIT TRAIL',
        policy: 'SECURITY POLICY (ACL)',
        users: 'USERS & ROLES',
        setting: 'NETWORK SETTINGS'
    };
    document.getElementById('page-title').textContent = titles[sectionId];

    // Data fetch
    loadSectionData(sectionId);
}

async function loadSectionData(id) {
    if (!currentUser) return;

    switch (id) {
        case 'overview':
            refreshAnalytics();
            refreshTrends();
            refreshBehaviorAlerts();
            break;
        case 'event':
            fetchEventLogs(1);
            break;
        case 'audit':
            refreshAuditLogs();
            break;
        case 'policy':
            refreshAllowlist();
            refreshBlocklist();
            refreshHelixMode();
            refreshGlobalIntelStats();
            break;
        case 'users':
            refreshUsers();
            break;
        case 'setting':
            refreshSettings();
            break;
    }
}

// Custom Alert System
let alertResolver = null;
function showAlert(message, title = 'Notification', icon = 'fa-circle-check', color = 'var(--accent)') {
    const modal = document.getElementById('alert-modal');
    document.getElementById('alert-title').textContent = title;
    document.getElementById('alert-message').textContent = message;
    document.getElementById('alert-icon').innerHTML = `<i class="fa-solid ${icon}" style="color: ${color};"></i>`;
    modal.style.display = 'flex';
    return new Promise(resolve => { alertResolver = resolve; });
}

function closeAlert() {
    document.getElementById('alert-modal').style.display = 'none';
    if (alertResolver) alertResolver(true);
}

let confirmResolver = null;
function showConfirm(message, title = 'Confirm action', icon = 'fa-circle-question', color = 'var(--warning)') {
    const modal = document.getElementById('confirm-modal');
    document.getElementById('confirm-title').textContent = title;
    document.getElementById('confirm-message').textContent = message;
    document.getElementById('confirm-icon').innerHTML = `<i class="fa-solid ${icon}" style="color: ${color};"></i>`;
    document.getElementById('confirm-action-btn').style.background = color === 'var(--danger)' ? 'var(--danger)' : 'var(--primary)';
    modal.style.display = 'flex';
    return new Promise(resolve => { confirmResolver = resolve; });
}

function resolveConfirm(result) {
    document.getElementById('confirm-modal').style.display = 'none';
    if (confirmResolver) confirmResolver(result);
}

// Auth Logic
function checkAuth() {
    const saved = localStorage.getItem('9sec_user');
    const token = localStorage.getItem('9sec_token');

    if (saved && token) {
        currentUser = JSON.parse(saved);
        document.getElementById('login-overlay').style.display = 'none';
        document.getElementById('user-display').textContent = currentUser.email;
        document.getElementById('org-badge').textContent = currentUser.organization_id;
        loadSectionData('overview');
        refreshSettings(); // Get IP info
        refresh2FAStatus(); // Get 2FA info
    } else {
        document.getElementById('login-overlay').style.display = 'flex';
    }
}

async function login() {
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-pass').value;
    const errorDiv = document.getElementById('login-error');

    try {
        const resp = await fetch(`${API_BASE}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        const data = await resp.json();

        if (data.ok) {
            if (data.requires_2fa) {
                window.tempToken2FA = data.temp_token;
                document.getElementById('2fa-login-modal').style.display = 'flex';
                document.getElementById('login-overlay').style.display = 'none';
                return;
            }
            localStorage.setItem('9sec_user', JSON.stringify(data.user));
            localStorage.setItem('9sec_token', data.token);
            checkAuth();
        } else {
            errorDiv.textContent = data.error || "Login Failed";
            errorDiv.style.display = 'block';
        }
    } catch (e) {
        errorDiv.textContent = "Cannot connect to server";
        errorDiv.style.display = 'block';
    }
}

async function submit2FALogin() {
    const code = document.getElementById('2fa-login-code').value;
    if (!code) return;

    try {
        const resp = await fetch(`${API_BASE}/api/auth/verify-2fa`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ temp_token: window.tempToken2FA, code })
        });
        const data = await resp.json();
        if (data.ok) {
            document.getElementById('2fa-login-modal').style.display = 'none';
            localStorage.setItem('9sec_user', JSON.stringify(data.user));
            localStorage.setItem('9sec_token', data.token);
            checkAuth();
        } else {
            showAlert(data.error || "Invalid 2FA code", "Auth Error", "fa-triangle-exclamation", "var(--danger)");
        }
    } catch (e) {
        showAlert("Connection error during 2FA", "Error");
    }
}

function logout() {
    localStorage.removeItem('9sec_user');
    localStorage.removeItem('9sec_token');
    location.reload();
}

// Data Handling Helpers
async function apiFetch(endpoint, method = 'GET', body = null) {
    const token = localStorage.getItem('9sec_token');
    const options = {
        method,
        headers: {
            'Authorization': `Bearer ${token}`
        }
    };
    if (body) {
        options.headers['Content-Type'] = 'application/json';
        options.body = JSON.stringify(body);
    }
    const resp = await fetch(`${API_BASE}${endpoint}`, options);
    return await resp.json();
}

// ── Event Log state ──────────────────────────────────────────────
window.logCurrentPage = 1;
window.logTotalPages = 1;
window.logFilterType = 'all';
window.logAllRows = [];

// Overview tab — just refresh stats & quadrant cards
async function refreshAnalytics() {
    // Reuse fetchEventLogs which always updates stats/quadrant regardless of tab
    await fetchEventLogs(1);
}

// Fix 5: Date validation helpers
function onDateFromChange() {
    const from = document.getElementById('log-from').value;
    const toEl = document.getElementById('log-to');
    if (from) toEl.min = from;
    // If current 'to' is before new 'from', clear it
    if (toEl.value && toEl.value < from) toEl.value = from;
}
function onDateToChange() {
    const to = document.getElementById('log-to').value;
    const fromEl = document.getElementById('log-from');
    const today = new Date().toISOString().slice(0, 10);
    if (to > today) { document.getElementById('log-to').value = today; return; }
    if (to) fromEl.max = to;
    if (fromEl.value && fromEl.value > to) fromEl.value = to;
}

// Fix 3/6: single entry point used by Apply, page-size change, date change
function applyEventLogs() {
    // Validate date range (Fix 5 double-check)
    const from = document.getElementById('log-from').value;
    const to = document.getElementById('log-to').value;
    if (from && to && from > to) {
        showAlert('結束日期不得早於開始日期', '日期錯誤', 'fa-triangle-exclamation', 'var(--danger)');
        return;
    }
    fetchEventLogs(1);
}

async function fetchEventLogs(page = 1) {
    const limitEl = document.getElementById('log-page-size');
    const limit = limitEl ? parseInt(limitEl.value) || 25 : 25;
    const from = (document.getElementById('log-from')?.value || '').trim();
    const to = (document.getElementById('log-to')?.value || '').trim();
    const filter = window.logFilterType || 'all';

    const params = new URLSearchParams();
    params.set('limit', String(limit));
    params.set('page', String(page));
    params.set('filter_type', filter);
    if (from) params.set('from', from);
    if (to) params.set('to', to);

    const [data, aiData] = await Promise.all([
        apiFetch('/api/user/dns-analytics?' + params.toString()),
        apiFetch('/api/user/dns-ai-verdicts')
    ]);

    if (!data.ok) return;

    if (aiData?.ok) {
        window.aiVerdicts = window.aiVerdicts || {};
        aiData.verdicts.forEach(v => { window.aiVerdicts[v.domain] = v; });
    }

    // Update stats cards
    if (data.stats) {
        document.getElementById('stat-total').textContent = data.stats.total_queries || 0;
        document.getElementById('stat-clients').textContent = data.stats.unique_clients || 0;
    }
    if (data.quadrants) {
        const q = data.quadrants;
        document.getElementById('quad-dga').textContent = q.dga;
        document.getElementById('quad-c2').textContent = q.c2;
        document.getElementById('quad-tunnel').textContent = q.tunneling;
        document.getElementById('quad-policy').textContent = q.policy;
        document.getElementById('stat-threats').textContent = q.dga + q.c2 + q.tunneling;
    }

    // Fix 3/4: track state with actual returned values
    const pg = data.pagination || { page: 1, limit, total: 0, totalPages: 1 };
    window.logCurrentPage = pg.page;
    window.logTotalPages = pg.totalPages;
    window.logAllRows = data.logs;

    renderLogTable(data.logs, filter);
    updatePaginationFooter(pg);
}

// Fix 2: empty message includes current filter name
const filterLabels = {
    all: '全部', dga: 'DGA Detection', c2: 'C2 Communication',
    tunnel: 'Exfiltration/Tunnel', policy: 'Policy Violations'
};

function renderLogTable(logs, filter) {
    const body = document.getElementById('log-table-body');
    const keyword = (document.getElementById('log-filter')?.value || '').toLowerCase().trim();
    const filtered = keyword
        ? logs.filter(l => l.query_domain.toLowerCase().includes(keyword) ||
            (l.client_hostname || '').toLowerCase().includes(keyword) ||
            (l.client_ip || '').includes(keyword))
        : logs;

    if (filtered.length === 0) {
        const label = filterLabels[filter || window.logFilterType] || filter;
        body.innerHTML = `<tr><td colspan="7" style="text-align:center; padding:40px; color:var(--text-dim);">
            <i class="fa-solid fa-filter-circle-xmark" style="font-size:1.4rem; display:block; margin-bottom:10px; opacity:0.4;"></i>
            <strong>${label}</strong>：查無符合條件的 Log 記錄（共 0 筆）
        </td></tr>`;
        return;
    }

    body.innerHTML = filtered.map(log => {
        const ai = (window.aiVerdicts || {})[log.query_domain];
        const aiHtml = ai ? `
            <div style="display:flex; align-items:center; gap:8px;">
                <span class="badge" title="${ai.reasoning}" style="background:rgba(168,85,247,0.1); color:#a855f7; border:1px solid rgba(168,85,247,0.2); font-size:10px; cursor:help; padding:2px 6px;"><i class="fa-solid fa-robot" style="margin-right:4px;"></i>${ai.verdict}</span>
                <button class="btn" onclick="deepDive('${log.query_domain}')" style="padding:2px 6px; font-size:10px; background:rgba(59,130,246,0.1); color:#60a5fa; border:1px solid rgba(59,130,246,0.2);"><i class="fa-solid fa-magnifying-glass-chart"></i> Deep Dive</button>
            </div>` : '-';

        return `
            <tr>
                <td style="font-size:11px; color:var(--text-dim);">${new Date(log.timestamp).toLocaleString()}</td>
                <td>
                    <div style="font-weight:600; color:var(--accent); font-size:13px;">${log.client_hostname || 'External Gateway'}</div>
                    <div style="font-size:10px; opacity:0.7;">${log.internal_ip || log.client_ip}</div>
                </td>
                <td style="font-weight:600; font-size:13px;">${log.query_domain}</td>
                <td><span class="badge" style="background:rgba(255,255,255,0.05); font-size:10px;">${log.query_type}</span></td>
                <td><span style="color:${getRiskColor(log.risk_score)}; font-weight:700;">${Math.round(log.risk_score)}%</span></td>
                <td><span class="badge ${log.response_code === 'NXDOMAIN' ? 'badge-danger' : 'badge-success'}" style="font-size:10px;">${log.response_code || 'NOERROR'}</span></td>
                <td>${aiHtml}</td>
            </tr>`;
    }).join('');
}

// Fix 4: update all pagination UI elements
function updatePaginationFooter(pg) {
    const start = pg.total === 0 ? 0 : (pg.page - 1) * pg.limit + 1;
    const end = Math.min(pg.page * pg.limit, pg.total);
    const infoEl = document.getElementById('log-page-info');
    const pageNumEl = document.getElementById('log-page-num');
    const prevBtn = document.getElementById('log-prev');
    const nextBtn = document.getElementById('log-next');

    if (infoEl) infoEl.textContent = pg.total ? `共 ${pg.total.toLocaleString()} 筆，顯示 ${start}–${end}` : '查無資料';
    if (pageNumEl) pageNumEl.textContent = pg.totalPages >= 1 ? `第 ${pg.page} / ${pg.totalPages} 頁` : '';

    if (prevBtn) {
        prevBtn.disabled = pg.page <= 1;
        prevBtn.style.opacity = pg.page <= 1 ? '0.35' : '1';
        prevBtn.style.cursor = pg.page <= 1 ? 'not-allowed' : 'pointer';
    }
    if (nextBtn) {
        nextBtn.disabled = pg.page >= pg.totalPages;
        nextBtn.style.opacity = pg.page >= pg.totalPages ? '0.35' : '1';
        nextBtn.style.cursor = pg.page >= pg.totalPages ? 'not-allowed' : 'pointer';
    }
}

// Fix 4: safe named navigation functions (no inline window.logCurrentPage arithmetic)
function prevPage() {
    if (window.logCurrentPage > 1) fetchEventLogs(window.logCurrentPage - 1);
}
function nextPage() {
    if (window.logCurrentPage < window.logTotalPages) fetchEventLogs(window.logCurrentPage + 1);
}

// Fix 6: keyword filter — triggers fresh fetch if no rows loaded yet
function logClientFilter() {
    if (window.logAllRows && window.logAllRows.length >= 0) {
        renderLogTable(window.logAllRows, window.logFilterType);
    } else {
        applyEventLogs();
    }
}

// Fix 1: Quick Filter active state with clear visual distinction
function setEventFilter(type) {
    window.logFilterType = type;

    // Active colours map
    const activeStyles = {
        all: { border: '2px solid var(--primary)', background: 'var(--primary)', color: '#fff' },
        dga: { border: '2px solid #ef4444', background: 'rgba(239,68,68,0.25)', color: '#fca5a5' },
        c2: { border: '2px solid #a855f7', background: 'rgba(168,85,247,0.25)', color: '#d8b4fe' },
        tunnel: { border: '2px solid #f59e0b', background: 'rgba(251,191,36,0.25)', color: '#fde68a' },
        policy: { border: '2px solid #3b82f6', background: 'rgba(59,130,246,0.25)', color: '#93c5fd' }
    };
    const idleStyles = {
        all: { border: '1px solid var(--border)', background: 'transparent', color: '#9ca3af' },
        dga: { border: '1px solid rgba(239,68,68,0.35)', background: 'rgba(239,68,68,0.08)', color: '#fca5a5' },
        c2: { border: '1px solid rgba(168,85,247,0.35)', background: 'rgba(168,85,247,0.08)', color: '#d8b4fe' },
        tunnel: { border: '1px solid rgba(251,191,36,0.35)', background: 'rgba(251,191,36,0.08)', color: '#fde68a' },
        policy: { border: '1px solid rgba(59,130,246,0.35)', background: 'rgba(59,130,246,0.08)', color: '#93c5fd' }
    };

    ['all', 'dga', 'c2', 'tunnel', 'policy'].forEach(t => {
        const btn = document.getElementById('qf-' + t);
        if (!btn) return;
        const s = t === type ? activeStyles[t] : idleStyles[t];
        btn.style.border = s.border;
        btn.style.background = s.background;
        btn.style.color = s.color;
        btn.style.fontWeight = t === type ? '700' : '400';
        btn.style.boxShadow = t === type ? '0 0 8px rgba(255,255,255,0.15)' : 'none';
    });

    fetchEventLogs(1);
}

function resetEventFilters() {
    document.getElementById('log-from').value = '';
    document.getElementById('log-to').value = '';
    document.getElementById('log-filter').value = '';
    const pageSizeEl = document.getElementById('log-page-size');
    if (pageSizeEl) pageSizeEl.value = '25';
    // Remove min/max constraints
    document.getElementById('log-from').removeAttribute('max');
    document.getElementById('log-to').removeAttribute('min');
    setEventFilter('all'); // resets active state & triggers fetch
}

async function deepDive(domain) {
    const modal = document.getElementById('report-modal');
    const content = document.getElementById('report-content');
    const title = document.getElementById('report-title');

    title.textContent = "AI Analysis: " + domain;
    content.textContent = "Synthesizing deep traffic insights and campaign context. This may take 10-15 seconds...";
    modal.style.display = 'flex';

    try {
        const data = await apiFetch('/api/user/dns-deep-dive', 'POST', { domain });
        if (data.ok) {
            content.textContent = data.explanation;
        } else {
            content.innerHTML = `<div style="color: var(--danger);"><i class="fa-solid fa-triangle-exclamation"></i> Analysis failed: ${data.error}</div>`;
        }
    } catch (e) {
        content.textContent = "Connection error while reaching the AI dispatcher.";
    }
}

// Audit Logs
async function refreshAuditLogs() {
    const data = await apiFetch('/api/user/audit-logs');
    if (data.ok) {
        const body = document.getElementById('audit-table-body');
        body.innerHTML = data.data.map(log => `
            <tr>
                <td style="font-size: 12px; color: var(--text-dim);">${new Date(log.timestamp).toLocaleString()}</td>
                <td style="font-weight:600; color: var(--primary);">${log.action}</td>
                <td style="font-size: 13px;">${log.details}</td>
            </tr>
        `).join('');
    }
}

// Allowlist
async function refreshAllowlist() {
    const data = await apiFetch('/api/user/allowlist');
    if (data.ok) {
        const body = document.getElementById('allowlist-table-body');
        body.innerHTML = data.data.map(item => `
            <tr>
                <td style="font-family: monospace;">${item.pattern}</td>
                <td>${item.reason || '-'}</td>
                <td style="font-size: 12px; color: var(--text-dim);">${new Date(item.created_at).toLocaleDateString()}</td>
                <td>
                    ${item.organization_id ? `<button class="btn btn-danger" style="padding: 4px 8px; font-size: 10px;" onclick="deleteAllowlist(${item.id})"><i class="fa-solid fa-trash"></i></button>` : `<span class="badge badge-warning">Global</span>`}
                </td>
            </tr>
        `).join('');
    }
}

async function submitAllowlist() {
    const pattern = document.getElementById('new-pattern').value;
    const reason = document.getElementById('new-reason').value;
    if (!pattern) return;

    const data = await apiFetch('/api/user/allowlist', 'POST', { pattern, reason });
    if (data.ok) {
        hideAddAllowlist();
        refreshAllowlist();
    }
}

async function deleteAllowlist(id) {
    if (!confirm("Are you sure you want to remove this trusted domain?")) return;
    const data = await apiFetch(`/api/user/allowlist/${id}`, 'DELETE');
    if (data.ok) {
        refreshAllowlist();
        showAlert("Domain removed from trusted list.", "Success");
    }
}

// Users
async function refreshUsers() {
    const data = await apiFetch('/api/user/users');
    if (data.ok) {
        const body = document.getElementById('users-table-body');
        const selfEmail = JSON.parse(localStorage.getItem('9sec_user')).email;
        body.innerHTML = data.data.map(u => {
            const isSelf = u.email === selfEmail;
            const statusCell = isSelf ? `
                <div style="display: flex; align-items: center; justify-content: center; gap: 12px;">
                    <span id="2fa-status-text" style="font-size: 11px; font-weight: 600; color: ${u.two_factor_enabled ? 'var(--accent)' : 'var(--text-dim)'}">${u.two_factor_enabled ? 'Protected' : 'No 2FA'}</span>
                    <label class="switch" style="transform: scale(0.8);">
                        <input type="checkbox" id="2fa-toggle-input" ${u.two_factor_enabled ? 'checked' : ''} onchange="handle2FAToggle(this)">
                        <span class="slider round"></span>
                    </label>
                </div>
            ` : `
                <div style="display: flex; align-items: center; justify-content: center; gap: 8px;">
                    <i class="fa-solid ${u.two_factor_enabled ? 'fa-circle-check text-accent' : 'fa-circle-xmark'}" style="color: ${u.two_factor_enabled ? 'var(--accent)' : 'var(--text-dim)'};"></i>
                    <span style="font-size: 13px;">${u.two_factor_enabled ? 'Protected' : 'No 2FA'}</span>
                </div>
            `;

            return `
                <tr>
                    <td>${u.email}</td>
                    <td><span class="badge ${u.role === 'admin' ? 'badge-warning' : 'badge-success'}">${u.role}</span></td>
                    <td>${statusCell}</td>
                    <td style="font-size: 12px; color: var(--text-dim); text-align: center;">${new Date(u.created_at).toLocaleDateString()}</td>
                    <td>
                        <div style="display: flex; gap: 8px; justify-content: center;">
                            ${u.two_factor_enabled ? `<button class="btn" style="padding: 4px 8px; font-size: 10px; background: rgba(255,150,0,0.1); color: #ff9f43;" title="Reset 2FA" onclick="resetUser2FA('${u.id}', '${u.email}')"><i class="fa-solid fa-shield-slash"></i></button>` : ''}
                            ${!isSelf ? `<button class="btn btn-danger" style="padding: 4px 8px; font-size: 10px;" onclick="deleteUser('${u.id}', '${u.email}')"><i class="fa-solid fa-user-minus"></i></button>` : `<span class="badge" style="background: rgba(255,255,255,0.05); color: var(--text-dim);">You</span>`}
                        </div>
                    </td>
                </tr>
            `;
        }).join('');
    }
}

async function deleteUser(id, email) {
    showConfirm(`Are you sure you want to delete user ${email}?`, "Confirm Delete", "fa-user-minus", "var(--danger)")
        .then(async confirmed => {
            if (confirmed) {
                const data = await apiFetch(`/api/user/users/${id}`, 'DELETE');
                if (data.ok) {
                    refreshUsers();
                    showAlert(`User ${email} has been removed.`, "Success");
                } else {
                    showAlert(data.error, "Error", "fa-triangle-exclamation", "var(--danger)");
                }
            }
        });
}

async function resetUser2FA(id, email) {
    showConfirm(`Reset 2FA for user ${email}? Use this only if they lost access to their device.`, "Confirm Reset", "fa-shield-slash", "var(--warning)")
        .then(async confirmed => {
            if (confirmed) {
                const data = await apiFetch(`/api/user/users/${id}/reset-2fa`, 'POST');
                if (data.ok) {
                    refreshUsers();
                    showAlert(`2FA for ${email} has been reset.`, "Reset Successful");
                }
            }
        });
}

async function submitAddUser() {
    const email = document.getElementById('new-user-email').value.trim();
    const password = document.getElementById('new-user-pass').value;
    const role = document.getElementById('new-user-role').value;

    if (!email || !password) return showAlert("Email and password are required.", "Error", "fa-triangle-exclamation", "var(--danger)");

    const data = await apiFetch('/api/user/users', 'POST', { email, password, role });
    if (data.ok) {
        hideAddUser();
        refreshUsers();
        showAlert(`User ${email} has been successfully invited.`, "User Invited");
        document.getElementById('new-user-email').value = '';
        document.getElementById('new-user-pass').value = '';
    } else {
        showAlert("Failed to invite user: " + data.error, "Error", "fa-triangle-exclamation", "var(--danger)");
    }
}

// Settings (CIDRs & Advanced)
async function refreshSettings() {
    // 1. Get provisioned IP & CIDRs
    const ipData = await apiFetch('/api/user/dns-ips');
    if (ipData.ok && ipData.data.length > 0) {
        const info = ipData.data[0];
        document.getElementById('resolver-ip').textContent = info.public_ip;
        egressCidrs = info.allowed_cidrs ? info.allowed_cidrs.split(',').map(s => s.trim()).filter(s => s) : [];

        // Populate Advanced Settings
        document.getElementById('ai-toggle').checked = !!info.ai_dispatcher_enabled;
        document.getElementById('openai-key').value = info.openai_api_key || '';
        document.getElementById('gsv-toggle').checked = !!info.safe_browsing_enabled;
        document.getElementById('gsv-key').value = info.safe_browsing_api_key || '';

        renderSettings();
    }
}

function renderSettings() {
    const list = document.getElementById('cidr-list');
    list.innerHTML = egressCidrs.map((c, i) => `
        <div style="display:flex; justify-content: space-between; align-items: center; padding: 12px; background: rgba(255,255,255,0.03); border-radius: 8px; margin-bottom: 8px; border: 1px solid var(--border);">
            <div style="font-family: monospace;">${c}</div>
            <button class="btn" style="color: var(--danger); background: transparent;" onclick="removeCidr(${i})"><i class="fa-solid fa-xmark"></i></button>
        </div>
    `).join('');
}

function removeCidr(i) {
    egressCidrs.splice(i, 1);
    renderSettings();
}

document.getElementById('add-cidr-btn').onclick = () => {
    const val = document.getElementById('cidr-input').value.trim();
    if (val && !egressCidrs.includes(val)) {
        egressCidrs.push(val);
        renderSettings();
        document.getElementById('cidr-input').value = '';
    }
};

document.getElementById('save-settings-btn').onclick = async () => {
    const btn = document.getElementById('save-settings-btn');
    btn.disabled = true;
    btn.textContent = 'Updating...';

    const data = await apiFetch('/api/user/dns-settings', 'PATCH', { allowed_cidrs: egressCidrs.join(', ') });
    if (data.ok) {
        showAlert("Domain Egress Settings updated successfully!", "Infrastructure Sync");
    } else {
        showAlert("Update failed: " + data.error, "Error", "fa-triangle-exclamation", "var(--danger)");
    }
    btn.disabled = false;
    btn.textContent = 'Update Infrastructure Config';
};

document.getElementById('save-advanced-btn').onclick = async () => {
    const btn = document.getElementById('save-advanced-btn');
    btn.disabled = true;
    btn.textContent = 'Saving...';

    const payload = {
        ai_dispatcher_enabled: document.getElementById('ai-toggle').checked,
        openai_api_key: document.getElementById('openai-key').value,
        safe_browsing_enabled: document.getElementById('gsv-toggle').checked,
        safe_browsing_api_key: document.getElementById('gsv-key').value
    };

    const data = await apiFetch('/api/user/dns-settings', 'PATCH', payload);
    if (data.ok) {
        showAlert("Advanced DNA Security settings saved!", "Settings Saved");
    } else {
        showAlert("Save failed: " + data.error, "Error", "fa-triangle-exclamation", "var(--danger)");
    }
    btn.disabled = false;
    btn.textContent = 'Save Advanced Settings';
};

async function testOpenAIKey() {
    const key = document.getElementById('openai-key').value;
    if (!key) return showAlert("Please enter an API Key first.", "Verification", "fa-key", "var(--warning)");

    document.body.style.cursor = 'wait';
    const data = await apiFetch('/api/user/test-openai-key', 'POST', { key });
    document.body.style.cursor = 'default';

    if (data.ok) showAlert("✅ OpenAI Connection Successful!", "Connection Verified");
    else showAlert("❌ Connection Failed: " + data.error, "Connection Error", "fa-triangle-exclamation", "var(--danger)");
}

async function testGSVKey() {
    const key = document.getElementById('gsv-key').value;
    if (!key) return showAlert("Please enter an API Key first.", "Verification", "fa-key", "var(--warning)");

    document.body.style.cursor = 'wait';
    const data = await apiFetch('/api/user/test-safebrowsing-key', 'POST', { key });
    document.body.style.cursor = 'default';

    if (data.ok) showAlert("✅ Google Safe Browsing Connection Successful!", "Connection Verified");
    else showAlert("❌ Connection Failed: " + data.error, "Connection Error", "fa-triangle-exclamation", "var(--danger)");
}

// Modals
function showAddUser() { document.getElementById('user-modal').style.display = 'flex'; }
function hideAddUser() { document.getElementById('user-modal').style.display = 'none'; }
function showAddAllowlist() { document.getElementById('allowlist-modal').style.display = 'flex'; }
function hideAddAllowlist() { document.getElementById('allowlist-modal').style.display = 'none'; }
function showAddBlocklist() { document.getElementById('blocklist-modal').style.display = 'flex'; }
function hideAddBlocklist() { document.getElementById('blocklist-modal').style.display = 'none'; }

// 2FA Functions
async function setup2FA() {
    const data = await apiFetch('/api/user/2fa/setup');
    if (data.ok) {
        window.current2FASecret = data.secret;
        document.getElementById('2fa-qr-img').src = data.qr_code;
        document.getElementById('2fa-setup-modal').style.display = 'flex';
    }
}

function hide2FA() {
    document.getElementById('2fa-setup-modal').style.display = 'none';
}

async function verifyEnable2FA() {
    const code = document.getElementById('2fa-verify-code').value;
    if (!code) return;

    const data = await apiFetch('/api/user/2fa/enable', 'POST', { secret: window.current2FASecret, code });
    if (data.ok) {
        hide2FA();
        refresh2FAStatus();
        showAlert("Two-Factor Authentication has been enabled successfully!", "Security Shield Active");
    } else {
        showAlert(data.error, "Verification Failed", "fa-triangle-exclamation", "var(--danger)");
    }
}

async function disable2FA() {
    showConfirm("Are you sure you want to disable 2FA? This will make your account less secure.", "Disable Security", "fa-triangle-exclamation", "var(--warning)")
        .then(async confirmed => {
            if (confirmed) {
                const data = await apiFetch('/api/user/2fa/disable', 'POST');
                if (data.ok) {
                    refresh2FAStatus();
                    showAlert("2FA has been disabled.", "Security Alert", "fa-shield", "var(--warning)");
                }
            } else {
                refresh2FAStatus(); // Reset switch state
            }
        });
}

function handle2FAToggle(el) {
    const isChecked = el.checked;
    el.checked = !isChecked; // Don't let it change automatically
    if (isChecked) {
        setup2FA();
    } else {
        disable2FA();
    }
}

async function refresh2FAStatus() {
    // Optimization: This is now largely handled by refreshUsers()
    // but kept as a fall-back or for global state if needed in future.
    const data = await apiFetch('/api/user/me');
    if (data.ok && data.user) {
        const isEnabled = data.user.two_factor_enabled;
        updateUser2FAUI(isEnabled);
    }
}

function updateUser2FAUI(isEnabled) {
    const statusText = document.getElementById('2fa-status-text');
    const toggleInput = document.getElementById('2fa-toggle-input');
    const iconDiv = document.getElementById('2fa-icon-shield');

    if (isEnabled) {
        if (statusText) {
            statusText.textContent = "Protected";
            statusText.style.color = "var(--accent)";
        }
        if (toggleInput) toggleInput.checked = true;
        if (iconDiv) iconDiv.innerHTML = '<i class="fa-solid fa-shield-check" style="color: var(--accent);"></i>';
    } else {
        if (statusText) {
            statusText.textContent = "No 2FA";
            statusText.style.color = "var(--text-dim)";
        }
        if (toggleInput) toggleInput.checked = false;
        if (iconDiv) iconDiv.innerHTML = '<i class="fa-solid fa-shield" style="color: var(--text-dim);"></i>';
    }
}

// Colors
function getRiskColor(score) {
    if (score > 75) return '#ef4444';
    if (score > 40) return '#f59e0b';
    return '#10b981';
}

// Trends
async function refreshTrends() {
    const data = await apiFetch('/api/user/dns-trends');
    if (data.ok && trendsChart) {
        // Prepare 24 hourly buckets
        const hours = [];
        const now = new Date();
        for (let i = 23; i >= 0; i--) {
            const d = new Date(now.getTime() - i * 3600000);
            d.setMinutes(0, 0, 0);
            hours.push(d.toISOString().substring(0, 14) + "00:00Z");
        }

        const labels = hours.map(h => new Date(h).getHours() + ":00");
        const totals = hours.map(h => {
            const match = data.data.find(d => d.hour === h);
            return match ? match.total : 0;
        });
        const threats = hours.map(h => {
            const match = data.data.find(d => d.hour === h);
            return match ? match.threats : 0;
        });

        trendsChart.data.labels = labels;
        trendsChart.data.datasets[0].data = totals;
        trendsChart.data.datasets[1].data = threats;
        trendsChart.update();
    }
}

async function refreshBehaviorAlerts() {
    const data = await apiFetch('/api/user/dns-behavior-alerts');
    if (data.ok) {
        const body = document.getElementById('behavior-table-body');
        if (data.data.length === 0) {
            body.innerHTML = `<tr><td colspan="4" style="text-align: center; color: var(--text-dim); padding: 40px;">No behavioral anomalies detected in the last hour.</td></tr>`;
            return;
        }

        body.innerHTML = data.data.map(a => {
            const risk = a.query_count > 100 ? 'High' : (a.query_count > 50 ? 'Medium' : 'Low');
            const badgeClass = risk === 'High' ? 'badge-danger' : (risk === 'Medium' ? 'badge-warning' : 'badge-success');

            return `
                <tr>
                    <td><code style="color: var(--primary);">${a.client_ip}</code></td>
                    <td style="font-weight: 600;">${a.base_domain}</td>
                    <td style="text-align: center;">${a.query_count}</td>
                    <td style="text-align: center;"><span class="badge ${badgeClass}">${risk}</span></td>
                </tr>
            `;
        }).join('');
    }
}

async function refreshGlobalIntelStats() {
    const data = await apiFetch('/api/user/dns-blacklist-stats');
    if (data.ok) {
        document.getElementById('global-intel-count').textContent = data.total.toLocaleString();

        // Show per-source breakdown if element exists
        const breakdown = document.getElementById('global-intel-breakdown');
        if (breakdown && data.sources && data.sources.length > 0) {
            const sourceIcons = { openphish: '🎣', urlhaus: '🦠', phishtank: '🐟', manual: '✏️' };
            breakdown.innerHTML = data.sources.map(s => {
                const icon = sourceIcons[s.source] || '📋';
                return `<span style="display:inline-flex; align-items:center; gap:4px; background:rgba(239,68,68,0.12); border:1px solid rgba(239,68,68,0.25); border-radius:20px; padding:2px 10px; font-size:0.72rem; color:#fca5a5; margin:2px;">${icon} ${s.source} <strong>${s.count.toLocaleString()}</strong></span>`;
            }).join('');
        }
    }
}

function initTrendsChart() {
    const ctx = document.getElementById('trendsChart');
    if (!ctx) return;

    trendsChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: [],
            datasets: [
                {
                    label: 'Total Queries',
                    data: [],
                    borderColor: '#3b82f6',
                    backgroundColor: 'rgba(59, 130, 246, 0.1)',
                    fill: true,
                    tension: 0.4,
                    pointRadius: 2
                },
                {
                    label: 'Threats Detected',
                    data: [],
                    borderColor: '#ef4444',
                    backgroundColor: 'rgba(239, 68, 68, 0.1)',
                    fill: true,
                    tension: 0.4,
                    pointRadius: 2
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    grid: { color: 'rgba(255,255,255,0.05)' },
                    ticks: { color: '#9ca3af', font: { size: 10 } }
                },
                x: {
                    grid: { display: false },
                    ticks: { color: '#9ca3af', font: { size: 10 } }
                }
            },
            plugins: {
                legend: {
                    display: true,
                    position: 'top',
                    labels: { color: '#e5e7eb', font: { family: 'Inter', size: 11 }, usePointStyle: true }
                },
                tooltip: {
                    mode: 'index',
                    intersect: false,
                    backgroundColor: 'rgba(17, 24, 39, 0.9)',
                    titleFont: { family: 'Outfit' },
                    bodyFont: { family: 'Inter' }
                }
            }
        }
    });
}

// PDF Reporting
async function generateReport() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF('p', 'mm', 'a4');
    const img = new Image();
    img.src = 'https://nine-security.com/9sec-logo-white.png'; // Fallback path

    // Title Section
    doc.setFillColor(17, 24, 39);
    doc.rect(0, 0, 210, 40, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22);
    doc.text('HelixDNS Security Report', 15, 20);
    doc.setFontSize(10);
    doc.text(`Organization: ${currentUser.organization_id} | Date: ${new Date().toLocaleDateString()}`, 15, 30);

    // Summary Analytics
    const total = document.getElementById('stat-total').textContent;
    const threats = document.getElementById('stat-threats').textContent;
    const clients = document.getElementById('stat-clients').textContent;

    doc.setTextColor(0, 0, 0);
    doc.setFontSize(14);
    doc.text('Executive Summary (Last 24h)', 15, 55);

    doc.autoTable({
        startY: 60,
        head: [['Metric', 'Value', 'Status']],
        body: [
            ['Total DNS Queries', total, 'Normal'],
            ['Security Threats Blocked', threats, threats > 0 ? 'Action Required' : 'Clean'],
            ['Active Client Nodes', clients, 'Operational']
        ],
        theme: 'striped'
    });

    // Threat Quadrants
    const qDga = document.getElementById('quad-dga').textContent;
    const qC2 = document.getElementById('quad-c2').textContent;
    const qTun = document.getElementById('quad-tunnel').textContent;

    doc.text('Threat Distribution', 15, doc.lastAutoTable.finalY + 15);
    doc.autoTable({
        startY: doc.lastAutoTable.finalY + 20,
        head: [['Quadrant', 'Detections', 'Severity']],
        body: [
            ['DGA Algorithm', qDga, 'High'],
            ['C2 Communication', qC2, 'Critical'],
            ['DNS Tunneling', qTun, 'Medium']
        ],
        theme: 'grid'
    });

    // Recent Logs
    const data = await apiFetch('/api/user/dns-analytics');
    if (data.ok && data.logs.length > 0) {
        doc.text('Recent Security Incidents', 15, doc.lastAutoTable.finalY + 15);
        const logBody = data.logs.slice(0, 15).map(l => [
            new Date(l.timestamp).toLocaleTimeString(),
            l.query_domain,
            l.risk_score + '%',
            l.response_code
        ]);
        doc.autoTable({
            startY: doc.lastAutoTable.finalY + 20,
            head: [['Time', 'Domain', 'Risk', 'Result']],
            body: logBody,
            headStyles: { fillColor: [239, 68, 68] }
        });
    }

    doc.save(`9Sec_HelixDNS_${currentUser.organization_id}_${Date.now()}.pdf`);
}

// Blacklist Management — UI shows manual rules only; auto threat-intel is in DB for detection
async function refreshBlocklist() {
    const data = await apiFetch('/api/user/dns-blacklist');
    if (data.ok) {
        const body = document.getElementById('blacklist-table-body');
        if (data.data.length === 0) {
            body.innerHTML = `<tr><td colspan="3" style="text-align:center; color:var(--text-dim); padding:28px 0;">
                <i class="fa-solid fa-shield-halved" style="font-size:1.5rem; margin-bottom:8px; display:block; opacity:0.4;"></i>
                No manual block rules. Auto threat-intel is active in the background.
            </td></tr>`;
            return;
        }
        body.innerHTML = data.data.map(row => `
            <tr>
                <td style="font-weight:700; color: var(--danger);">${row.pattern}</td>
                <td><span class="badge badge-danger">${row.category}</span></td>
                <td>
                    <button class="btn" style="color:var(--danger);" onclick="deleteBlacklist('${row.id}')"><i class="fa-solid fa-trash"></i></button>
                </td>
            </tr>
        `).join('');
    }
}

async function refreshHelixMode() {
    const data = await apiFetch('/api/user/dns-ips');
    if (data.ok && data.data.length > 0) {
        const mode = data.data[0].helix_dns_mode || 'Active';
        updateModeUI(mode);
    }
}

function updateModeUI(mode) {
    document.querySelectorAll('.mode-card').forEach(c => c.classList.remove('active'));
    if (mode === 'Active') {
        document.getElementById('mode-active').classList.add('active');
    } else {
        document.getElementById('mode-passive').classList.add('active');
    }
}

async function setHelixMode(mode) {
    const activeCard = document.getElementById('mode-active');
    const passiveCard = document.getElementById('mode-passive');

    // UI Feedback
    updateModeUI(mode);
    [activeCard, passiveCard].forEach(c => c.style.opacity = '0.7');

    const data = await apiFetch('/api/user/dns-settings', 'PATCH', { helix_dns_mode: mode });
    [activeCard, passiveCard].forEach(c => c.style.opacity = '1');

    if (data.ok) {
        showAlert(`HelixDNS mode switched to ${mode}. The edge resolvers will sync within 10 seconds.`, "Policy Synchronized");
    } else {
        showAlert("Failed to update mode: " + data.error, "Error", "fa-triangle-exclamation", "var(--danger)");
        refreshHelixMode(); // Revert on failure
    }
}

async function deleteBlacklist(id) {
    if (!confirm("Are you sure you want to remove this block rule?")) return;
    const data = await apiFetch(`/api/user/dns-blacklist/${id}`, 'DELETE');
    if (data.ok) {
        refreshBlocklist();
        showAlert("Domain removed from blacklist.", "Policy Updated");
    }
}

async function submitBlocklist() {
    const pattern = document.getElementById('block-pattern').value;
    const category = document.getElementById('block-category').value;
    if (!pattern) return;

    const data = await apiFetch('/api/user/dns-blacklist', 'POST', { pattern, category });
    if (data.ok) {
        hideAddBlocklist();
        refreshBlocklist();
        showAlert(`Domain ${pattern} blocked successfully.`, "Policy Enforced");
    } else {
        showAlert("Failed to block domain: " + data.error, "Enforcement Error", "fa-triangle-exclamation", "var(--danger)");
    }
}

function viewThreatDetails() {
    logFilterMode = 'malicious';
    const eventNavItem = Array.from(document.querySelectorAll('.nav-item')).find(el => el.textContent.includes('Security Event'));
    switchSection('event', eventNavItem || document.querySelectorAll('.nav-item')[1]);
}

function viewQuadrantDetails(type) {
    logFilterMode = type;
    const eventNavItem = Array.from(document.querySelectorAll('.nav-item')).find(el => el.textContent.includes('Security Event'));
    switchSection('event', eventNavItem || document.querySelectorAll('.nav-item')[1]);
}

// ── Explicit global exports (ensures onclick= attributes always resolve) ──
window.fetchEventLogs = fetchEventLogs;
window.applyEventLogs = applyEventLogs;
window.resetEventFilters = resetEventFilters;
window.setEventFilter = setEventFilter;
window.logClientFilter = logClientFilter;
window.prevPage = prevPage;
window.nextPage = nextPage;
window.onDateFromChange = onDateFromChange;
window.onDateToChange = onDateToChange;
window.updatePaginationFooter = updatePaginationFooter;
window.renderLogTable = renderLogTable;
window.deepDive = deepDive;
window.switchSection = switchSection;
window.login = login;
window.logout = logout;
window.submit2FALogin = submit2FALogin;
window.closeAlert = closeAlert;
window.resolveConfirm = resolveConfirm;
window.removeCidr = removeCidr;
window.showAddUser = showAddUser;
window.hideAddUser = hideAddUser;
window.showAddAllowlist = showAddAllowlist;
window.hideAddAllowlist = hideAddAllowlist;
window.showAddBlocklist = showAddBlocklist;
window.hideAddBlocklist = hideAddBlocklist;
window.submitAllowlist = submitAllowlist;
window.deleteAllowlist = deleteAllowlist;
window.submitAddUser = submitAddUser;
window.deleteUser = deleteUser;
window.resetUser2FA = resetUser2FA;
window.setup2FA = setup2FA;
window.hide2FA = hide2FA;
window.verifyEnable2FA = verifyEnable2FA;
window.disable2FA = disable2FA;
window.handle2FAToggle = handle2FAToggle;
window.testOpenAIKey = testOpenAIKey;
window.testGSVKey = testGSVKey;
window.viewQuadrantDetails = viewQuadrantDetails;
