const API_BASE = window.location.hostname === 'nine-security.com' || window.location.hostname === 'zen9ya0.github.io' ? 'https://api.nine-security.com' : '';
let currentUser = null;
let egressCidrs = [];

// Initial Load
document.addEventListener('DOMContentLoaded', () => {
    checkAuth();
    setupSidebar();

    // Auto-refresh analytics every 30s
    setInterval(() => {
        if (currentUser && document.getElementById('overview').classList.contains('active')) {
            refreshAnalytics();
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
        allowlist: 'DOMAIN ALLOWLIST',
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
        case 'event':
            refreshAnalytics();
            break;
        case 'audit':
            refreshAuditLogs();
            break;
        case 'allowlist':
            refreshAllowlist();
            break;
        case 'users':
            refreshUsers();
            break;
        case 'setting':
            refreshSettings();
            break;
    }
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

// Overview & Events
async function refreshAnalytics() {
    const data = await apiFetch('/api/user/dns-analytics');
    if (data.ok) {
        // Stats
        document.getElementById('stat-total').textContent = data.stats.total_queries || 0;
        document.getElementById('stat-clients').textContent = data.stats.unique_clients || 0;

        // Quadrants
        const q = data.quadrants;
        document.getElementById('quad-dga').textContent = q.dga;
        document.getElementById('quad-c2').textContent = q.c2;
        document.getElementById('quad-tunnel').textContent = q.tunneling;
        document.getElementById('quad-policy').textContent = q.policy;
        document.getElementById('stat-threats').textContent = q.dga + q.c2 + q.tunneling;

        // Table
        const body = document.getElementById('log-table-body');
        body.innerHTML = data.logs.map(log => `
            <tr>
                <td style="font-size: 12px; color: var(--text-dim);">${new Date(log.timestamp).toLocaleString()}</td>
                <td>${log.client_ip}</td>
                <td style="font-weight:600;">${log.query_domain}</td>
                <td><span class="badge" style="background: rgba(255,255,255,0.05)">${log.query_type}</span></td>
                <td><span style="color: ${getRiskColor(log.risk_score)}">${Math.round(log.risk_score)}%</span></td>
                <td><span class="badge ${log.response_code === 'NXDOMAIN' ? 'badge-danger' : 'badge-success'}">${log.response_code || 'NOERROR'}</span></td>
            </tr>
        `).join('');
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
    if (!confirm("Are you sure?")) return;
    const data = await apiFetch(`/api/user/allowlist/${id}`, 'DELETE');
    if (data.ok) refreshAllowlist();
}

// Users
async function refreshUsers() {
    const data = await apiFetch('/api/user/users');
    if (data.ok) {
        const body = document.getElementById('users-table-body');
        body.innerHTML = data.data.map(u => `
            <tr>
                <td>${u.email}</td>
                <td><span class="badge ${u.role === 'admin' ? 'badge-warning' : 'badge-success'}">${u.role}</span></td>
                <td style="font-size: 12px; color: var(--text-dim);">${new Date(u.created_at).toLocaleDateString()}</td>
            </tr>
        `).join('');
    }
}

// Settings (CIDRs)
async function refreshSettings() {
    // 1. Get provisioned IP
    const ipData = await apiFetch('/api/user/dns-ips');
    if (ipData.ok && ipData.data.length > 0) {
        const info = ipData.data[0];
        document.getElementById('resolver-ip').textContent = info.public_ip;
        egressCidrs = info.allowed_cidrs ? info.allowed_cidrs.split(',').map(s => s.trim()).filter(s => s) : [];
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
        alert("Domain Egress Settings updated successfully!");
    } else {
        alert("Update failed: " + data.error);
    }
    btn.disabled = false;
    btn.textContent = 'Update Infrastructure Config';
};

// Modals
function showAddAllowlist() { document.getElementById('allowlist-modal').style.display = 'flex'; }
function hideAddAllowlist() { document.getElementById('allowlist-modal').style.display = 'none'; }

// Colors
function getRiskColor(score) {
    if (score > 75) return '#ef4444';
    if (score > 40) return '#f59e0b';
    return '#10b981';
}
