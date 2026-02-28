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
            break;
        case 'event':
            refreshAnalytics();
            break;
        case 'audit':
            refreshAuditLogs();
            break;
        case 'policy':
            refreshAllowlist();
            refreshBlocklist();
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
    const [data, aiData] = await Promise.all([
        apiFetch('/api/user/dns-analytics'),
        apiFetch('/api/user/dns-ai-verdicts')
    ]);

    if (data.ok) {
        // AI Verdict Mapping
        if (aiData && aiData.ok) {
            window.aiVerdicts = window.aiVerdicts || {};
            aiData.verdicts.forEach(v => {
                window.aiVerdicts[v.domain] = v;
            });
        }

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

        // Table - Flicker reduction
        const body = document.getElementById('log-table-body');
        const latestLogId = data.logs.length > 0 ? data.logs[0].id : null;
        if (window.lastProcessedLogId === latestLogId && data.logs.length > 0) return;
        window.lastProcessedLogId = latestLogId;

        if (data.logs.length === 0) {
            body.innerHTML = '<tr><td colspan="7" style="text-align:center; padding: 40px; color: var(--text-dim);">No traffic detected yet. Ensure your devices are using the Resolver IP.</td></tr>';
        } else {
            let filteredLogs = data.logs;
            if (logFilterMode === 'malicious') {
                filteredLogs = data.logs.filter(l => l.risk_score > 0);
            } else if (logFilterMode === 'dga') {
                filteredLogs = data.logs.filter(l => l.risk_score > 70 && l.risk_score <= 85);
            } else if (logFilterMode === 'c2') {
                filteredLogs = data.logs.filter(l => l.risk_score > 85);
            } else if (logFilterMode === 'tunnel') {
                filteredLogs = data.logs.filter(l => l.query_domain.length > 50 || l.query_type === 'TXT_TUNNEL');
            } else if (logFilterMode === 'policy') {
                filteredLogs = data.logs.filter(l =>
                    (l.response_code === 'NXDOMAIN' && l.risk_score > 40) ||
                    l.query_type === 'DOH_BYPASS' ||
                    l.query_type === 'DOT_ENCRYPTED'
                );
            }

            body.innerHTML = filteredLogs.map(log => {
                const ai = (window.aiVerdicts || {})[log.query_domain];
                const aiHtml = ai ? `<span class="badge" title="${ai.reasoning}" style="background: rgba(168, 85, 247, 0.1); color: #a855f7; border: 1px solid rgba(168, 85, 247, 0.2); font-size: 10px; cursor: help; padding: 2px 6px;"><i class="fa-solid fa-robot" style="margin-right:4px;"></i>${ai.verdict}</span>` : '-';

                return `
                    <tr>
                        <td style="font-size: 11px; color: var(--text-dim);">${new Date(log.timestamp).toLocaleString()}</td>
                        <td>
                            <div style="font-weight:600; color: var(--accent); font-size: 13px;">${log.client_hostname || 'External Gateway'}</div>
                            <div style="font-size: 10px; opacity: 0.7;">${log.internal_ip || log.client_ip}</div>
                        </td>
                        <td style="font-weight:600; font-size: 13px;">${log.query_domain}</td>
                        <td><span class="badge" style="background: rgba(255,255,255,0.05); font-size: 10px;">${log.query_type}</span></td>
                        <td><span style="color: ${getRiskColor(log.risk_score)}; font-weight: 700;">${Math.round(log.risk_score)}%</span></td>
                        <td><span class="badge ${log.response_code === 'NXDOMAIN' ? 'badge-danger' : 'badge-success'}" style="font-size: 10px;">${log.response_code || 'NOERROR'}</span></td>
                        <td>${aiHtml}</td>
                    </tr>
                `;
            }).join('');
        }
        console.log(`[Dashboard] Sync complete: ${data.logs.length} logs found.`);
    } else {
        console.error("[Dashboard] Failed to fetch analytics:", data.error);
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
        alert("Domain Egress Settings updated successfully!");
    } else {
        alert("Update failed: " + data.error);
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
        alert("Advanced DNA Security settings saved!");
    } else {
        alert("Save failed: " + data.error);
    }
    btn.disabled = false;
    btn.textContent = 'Save Advanced Settings';
};

async function testOpenAIKey() {
    const key = document.getElementById('openai-key').value;
    if (!key) return alert("Please enter an API Key first.");

    document.body.style.cursor = 'wait';
    const data = await apiFetch('/api/user/test-openai-key', 'POST', { key });
    document.body.style.cursor = 'default';

    if (data.ok) alert("✅ OpenAI Connection Successful!");
    else alert("❌ Connection Failed: " + data.error);
}

async function testGSVKey() {
    const key = document.getElementById('gsv-key').value;
    if (!key) return alert("Please enter an API Key first.");

    document.body.style.cursor = 'wait';
    const data = await apiFetch('/api/user/test-safebrowsing-key', 'POST', { key });
    document.body.style.cursor = 'default';

    if (data.ok) alert("✅ Google Safe Browsing Connection Successful!");
    else alert("❌ Connection Failed: " + data.error);
}

// Modals
function showAddAllowlist() { document.getElementById('allowlist-modal').style.display = 'flex'; }
function hideAddAllowlist() { document.getElementById('allowlist-modal').style.display = 'none'; }

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

// Blacklist Management
async function refreshBlocklist() {
    const data = await apiFetch('/api/user/dns-blacklist');
    if (data.ok) {
        const body = document.getElementById('blacklist-table-body');
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

async function deleteBlacklist(id) {
    if (!confirm("Are you sure you want to remove this block rule?")) return;
    const data = await apiFetch(`/api/user/dns-blacklist/${id}`, { method: 'DELETE' });
    if (data.ok) refreshBlocklist();
}

function showAddBlocklist() {
    const pattern = prompt("Enter domain pattern to block (e.g. malwaredomain.com):");
    if (pattern) {
        apiFetch('/api/user/dns-blacklist', {
            method: 'POST',
            body: { pattern, category: 'manual_block' }
        }).then(data => {
            if (data.ok) refreshBlocklist();
        });
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
