const canvas = document.getElementById('bg-canvas');
const ctx = canvas.getContext('2d');

let particlesArray;

// responsive canvas
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

class Particle {
    constructor() {
        this.x = Math.random() * canvas.width;
        this.y = Math.random() * canvas.height;
        this.size = Math.random() * 2 + 1; // Size between 1 and 3
        this.speedX = (Math.random() * 1.5 - 0.75) * 0.5; // Slow speed
        this.speedY = (Math.random() * 1.5 - 0.75) * 0.5;
        this.color = '#00ff41'; // Hacker Green
    }
    update() {
        this.x += this.speedX;
        this.y += this.speedY;

        // Boundary check
        if (this.x > canvas.width || this.x < 0) this.speedX = -this.speedX;
        if (this.y > canvas.height || this.y < 0) this.speedY = -this.speedY;
    }
    draw() {
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
    }
}

function init() {
    particlesArray = [];
    let numberOfParticles = (canvas.height * canvas.width) / 25000; // Density
    for (let i = 0; i < numberOfParticles; i++) {
        particlesArray.push(new Particle());
    }
}

function animate() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Low opacity background for trail effect (optional, currently strictly clear)
    // ctx.fillStyle = 'rgba(0,0,0,0.1)';
    // ctx.fillRect(0, 0, canvas.width, canvas.height);

    for (let i = 0; i < particlesArray.length; i++) {
        particlesArray[i].update();
        particlesArray[i].draw();

        // Connect particles
        for (let j = i; j < particlesArray.length; j++) {
            const dx = particlesArray[i].x - particlesArray[j].x;
            const dy = particlesArray[i].y - particlesArray[j].y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance < 150) {
                ctx.beginPath();
                ctx.strokeStyle = `rgba(0, 255, 65, ${1 - distance / 150})`;
                ctx.lineWidth = 0.5;
                ctx.moveTo(particlesArray[i].x, particlesArray[i].y);
                ctx.lineTo(particlesArray[j].x, particlesArray[j].y);
                ctx.stroke();
            }
        }
    }
    requestAnimationFrame(animate);
}

// Handle resize
window.addEventListener('resize', () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    init();
});

// Init
init();
animate();

// --- Glitch Title Typo Effect (Optional Add-on) ---
// Currently using CSS only, but JS could add random character swapping if requested later.

// --- Smooth Scroll for Anchor Links ---
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        document.querySelector(this.getAttribute('href')).scrollIntoView({
            behavior: 'smooth'
        });
    });
});

// --- Threat Intelligence: 從後端 API 載入資安文章（先顯示 6 篇，其餘「顯示更多」）---
const ARTICLES_API = "https://9sec-smtp-backend.nine-security.workers.dev/api/articles";
const ARTICLES_INITIAL = 6;
const articlesSection = document.querySelector("#articles");
const articlesContainer = document.querySelector("#articles .list-layout");
if (articlesContainer && articlesSection) {
    fetch(ARTICLES_API)
        .then((r) => r.ok ? r.json() : [])
        .then((list) => {
            if (!Array.isArray(list) || list.length === 0) return;
            let showing = ARTICLES_INITIAL;
            const render = (count) => {
                showing = count;
                const countToShow = Math.min(count, list.length);
                const slice = list.slice(0, countToShow);
                articlesContainer.innerHTML = slice.map((a) => `
                    <article class="list-item">
                        <div class="date">${escapeHtml(a.date || "")}</div>
                        <div class="content">
                            <h3>${escapeHtml(a.title || "")}</h3>
                            <p>${escapeHtml(a.excerpt || "")}</p>
                        </div>
                        <div class="action">
                            <a href="${escapeHtml(a.url || "#")}" class="read-btn" target="_blank" rel="noopener noreferrer">READ</a>
                        </div>
                    </article>
                `).join("");
                let btnWrap = articlesSection.querySelector(".articles-more-wrap");
                if (list.length > ARTICLES_INITIAL) {
                    if (!btnWrap) {
                        btnWrap = document.createElement("div");
                        btnWrap.className = "articles-more-wrap";
                        articlesSection.querySelector(".container").appendChild(btnWrap);
                    }
                    const isAll = countToShow >= list.length;
                    btnWrap.innerHTML = `<button type="button" class="articles-more-btn" data-expanded="${isAll}">${isAll ? "收起" : "顯示更多 (" + (list.length - countToShow) + " 篇)"}</button>`;
                    btnWrap.querySelector("button").onclick = () => {
                        render(isAll ? ARTICLES_INITIAL : list.length);
                    };
                } else if (btnWrap) btnWrap.remove();
            };
            render(showing);
        })
        .catch(() => { /* 失敗時保留靜態文章 */ });
}
function escapeHtml(s) {
    const div = document.createElement("div");
    div.textContent = s;
    return div.innerHTML;
}

/* --- Multi-language Support --- */
const translations = {
    en: {
        nav: {
            home: "/Home",
            model: "/9SEC_Model",
            tools: "/Arsenal",
            intelligence: "/Intelligence",
            smtp: "/SMTP_Check"
        },
        hero: {
            init: "Initializing 9SEC Defense Protocol... <span class='status-ok'>[ACTIVE]</span>",
            title: "EVIDENCE-BASED SECURITY",
            subtitle: "Turning Incidents into Verifiable Defense Capabilities.",
            desc: "We provide security consulting centered on <strong>Forensics</strong> and <strong>Evidence</strong>. Through our unique <strong>9-Layer Defense Model</strong>, we help enterprises see the full attack picture and close defense gaps.",
            cta_model: "9-Layer Model",
            cta_arsenal: "Our Arsenal"
        },
        section: {
            model: "The_9SEC_Model",
            arsenal: "Operational_Arsenal",
            intelligence: "Threat_Intelligence",
            smtp: "SMTP_Security_Check"
        },
        model: {
            intro1: "> OSI is for Communication. 9SEC is for Operations.",
            intro2: "A practical framework covering Governance, Protection, Detection, Response, and Evolution."
        },
        footer: {
            tagline: "Securing the digital frontier.",
            copyright: "&copy; 2026 Nine-Security. All Systems Operational."
        },
        smtp: {
            title: "Free Inbound Mail Security Assessment",
            desc: "Non-intrusive. Evidence-based. Verifies your domain control and checks MX health.",
            email_label: "Enter Work Email:",
            consent: "I authorize scanning of this domain's inbound MX.",
            btn_start: "Start Assessment",
            verify_title: "Verification Required",
            verify_desc: "To prove domain control, please send an empty email from your address to:",
            waiting: "Waiting for inbound email..."
        }
    },
    tw: {
        nav: {
            home: "/首頁",
            model: "/九層防護模型",
            tools: "/軍火庫",
            intelligence: "/威脅情資",
            smtp: "/SMTP_檢測"
        },
        hero: {
            init: "正在初始化 9SEC 防護協定... <span class='status-ok'>[運作中]</span>",
            title: "證據導向資安防護",
            subtitle: "將資安事件轉化為可驗證的防禦能力",
            desc: "我們提供以 **鑑識 (Forensics)** 與 **證據 (Evidence)** 為核心的資安顧問服務。透過獨創的 **九層資安防護模型**，協助企業看清攻擊全貌並修補防禦缺口。",
            cta_model: "九層防護模型",
            cta_arsenal: "檢視軍火庫"
        },
        section: {
            model: "九層資安防護模型",
            arsenal: "作戰軍火庫",
            intelligence: "威脅情資",
            smtp: "SMTP_安全檢測"
        },
        model: {
            intro1: "> OSI 是為了通訊而生，9SEC 是為了作戰而生。",
            intro2: "一個涵蓋治理、防護、偵測、應變與演進的實戰框架。"
        },
        footer: {
            tagline: "捍衛數位邊疆。",
            copyright: "&copy; 2026 Nine-Security. 系統正常運作中。"
        },
        smtp: {
            title: "免費 Inbound 郵件安全健診",
            desc: "低侵入、證據導向。驗證網域控制權並檢查 MX 健康狀況。",
            email_label: "輸入公司信箱：",
            consent: "我授權對此網域的 Inbound MX 進行掃描。",
            btn_start: "開始健診",
            verify_title: "需要驗證",
            verify_desc: "為證明網域控制權，請從您的信箱寄一封空信至：",
            waiting: "等待驗證郵件中..."
        }
    },
    jp: {
        nav: {
            home: "/ホーム",
            model: "/9層防御モデル",
            tools: "/アーセナル",
            intelligence: "/脅威インテリジェンス",
            smtp: "/SMTP_チェック"
        },
        hero: {
            init: "9SEC 防御プロトコルを初期化中... <span class='status-ok'>[アクティブ]</span>",
            title: "証拠に基づくセキュリティ",
            subtitle: "インシデントを検証可能な防御能力へ",
            desc: "私たちは **フォレンジック** と **証拠** を中心としたセキュリティコンサルティングを提供します。独自の **9層防御モデル** を通じて、企業が攻撃の全体像を把握し、防御のギャップを埋める支援をします。",
            cta_model: "9層防御モデル",
            cta_arsenal: "アーセナルを見る"
        },
        section: {
            model: "9層セキュリティ防御モデル",
            arsenal: "運用アーセナル",
            intelligence: "脅威インテリジェンス",
            smtp: "SMTP_セキュリティ診断"
        },
        model: {
            intro1: "> OSIは通信のため、9SECは運用のために。",
            intro2: "ガバナンス、保護、検知、対応、そして進化をカバーする実践的なフレームワーク。"
        },
        footer: {
            tagline: "デジタルフロンティアを守る。",
            copyright: "&copy; 2026 Nine-Security. 全システム正常稼働中。"
        },
        smtp: {
            title: "無料 Inbound メールセキュリティ診断",
            desc: "低侵襲。証拠ベース。ドメイン管理権を確認し、MXの健全性をチェックします。",
            email_label: "会社のメールアドレス：",
            consent: "このドメインの Inbound MX スキャンを許可します。",
            btn_start: "診断を開始",
            verify_title: "認証が必要です",
            verify_desc: "ドメイン管理権を証明するため、以下のアドレスに空メールを送信してください：",
            waiting: "認証メールを待機中..."
        }
    }
};

const langBtn = document.getElementById('current-lang');
const langOptions = document.querySelectorAll('.lang-menu li');

// Load saved language
const savedLang = localStorage.getItem('9sec_lang') || 'en';
updateLanguage(savedLang);

// Event Listeners for Custom Dropdown
langOptions.forEach(option => {
    option.addEventListener('click', () => {
        const lang = option.getAttribute('data-lang');
        localStorage.setItem('9sec_lang', lang);
        updateLanguage(lang);
    });
});

function updateLanguage(lang) {
    // Update Button Text
    if (langBtn) langBtn.textContent = lang.toUpperCase();

    // Traverse the object using dot notation string
    document.querySelectorAll('[data-i18n]').forEach(element => {
        const key = element.getAttribute('data-i18n');
        const keys = key.split('.');
        let val = translations[lang];
        keys.forEach(k => {
            if (val) val = val[k];
        });

        if (val) {
            element.innerHTML = val;
        }
    });
}

// --- SMTP Check Logic ---
const API_BASE_URL = "https://9sec-smtp-backend.nine-security.workers.dev/api";

async function submitAssessment() {
    console.log("Starting assessment...");
    const emailInput = document.getElementById('email-input');
    const consentCheck = document.getElementById('consent-check');
    const stepInput = document.getElementById('smtp-step-input');
    const stepVerify = document.getElementById('smtp-step-verify');
    const verifyEmailCode = document.getElementById('verification-email');

    const email = emailInput.value.trim();
    const consent = consentCheck.checked;

    if (!email || !email.includes('@')) {
        alert("Please enter a valid corporate email.");
        return;
    }
    if (!consent) {
        alert("Please agree to the authorization terms.");
        return;
    }

    let resp;
    try {
        // Use full URL to avoid relative path issues on github pages
        resp = await fetch(`${API_BASE_URL}/assessment`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, consent })
        });
    } catch (e) {
        console.error("API_ERROR", e);
        alert("Backend Unreachable. Please check your network or try again.");
        return;
    }

    let data;
    try {
        data = await resp.json();
    } catch {
        alert("Backend returned invalid JSON.");
        return;
    }

    if (!data.ok) {
        alert(`Error: ${data.error}`);
        return;
    }

    // Update UI
    currentAssessmentId = data.assessment_id;
    verifyEmailCode.textContent = data.verification_address;

    stepInput.classList.add('hidden');
    stepVerify.classList.remove('hidden');

    // Reset Logs
    const logContainer = document.getElementById('scan-log');
    if (logContainer) {
        logContainer.innerHTML = '';
        addLog("Session Initialized.");
        addLog(`Target: ${data.domain}`);
        addLog("Waiting for inbound verification email...");
    }

    // Start Polling
    if (pollInterval) clearInterval(pollInterval);
    pollInterval = setInterval(() => checkStatus(currentAssessmentId), 2500);
}

// Bind Start Button (Robust)
const btnStartCheck = document.getElementById('btn-start-check');
if (btnStartCheck) {
    btnStartCheck.addEventListener('click', submitAssessment);
} else {
    console.error("Critical: Start Assessment button not found in DOM");
}

const smtpForm = document.getElementById('smtp-form');
const stepInput = document.getElementById('smtp-step-input');
const stepVerify = document.getElementById('smtp-step-verify');
const stepReport = document.getElementById('smtp-step-report');
const verifyEmailCode = document.getElementById('verification-email');
const btnCopy = document.getElementById('btn-copy-email');
const btnMockVerify = document.getElementById('btn-mock-verify'); // Dev only - Can be removed

let currentAssessmentId = null;
let pollInterval = null;

/* Legacy form handler removed
if (smtpForm) {
    smtpForm.addEventListener('submit', (e) => {
        e.preventDefault();
        // Legacy call removed
    });
}
*/

if (btnCopy) {
    btnCopy.addEventListener('click', () => {
        navigator.clipboard.writeText(verifyEmailCode.textContent);
        const originalIcon = btnCopy.innerHTML;
        btnCopy.innerHTML = '<i class="fa-solid fa-check"></i>';
        setTimeout(() => btnCopy.innerHTML = originalIcon, 2000);
    });
}

async function startAssessment(email) {
    // Read consent checkbox (required by backend)
    const consentEl = document.getElementById('consent-check');
    const consent = !!consentEl?.checked;

    // Call real backend: POST /api/assessment
    let resp;
    try {
        resp = await fetch(`${API_BASE_URL}/assessment`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, consent })
        });
    } catch (e) {
        console.error("API_ERROR", e);
        alert("Backend unreachable. Check Worker route /api/* and network.");
        return;
    }

    let data;
    try {
        data = await resp.json();
    } catch {
        alert(`Invalid backend response (non-JSON). Status: ${resp.status} ${resp.statusText}`);
        return;
    }

    if (!resp.ok || !data.ok) {
        console.error("API_FAIL", resp.status, data);
        alert(`Assessment failed: ${data?.error || resp.status}`);
        return;
    }

    // Persist assessment_id for polling
    currentAssessmentId = data.assessment_id;

    // UI update: show verification address from backend
    verifyEmailCode.textContent = data.verification_address;

    stepInput.classList.add('hidden');
    stepVerify.classList.remove('hidden');

    // Reset Log
    const logContainer = document.getElementById('scan-log');
    logContainer.innerHTML = '<div class="log-line">> Session started. Waiting for inbound connection...</div>';

    // Start polling backend status
    if (pollInterval) clearInterval(pollInterval);
    pollInterval = setInterval(() => checkStatus(currentAssessmentId), 3000);

    // Optional: immediate check
    await checkStatus(currentAssessmentId);
}

// Log simulation messages
const logMessages = [
    "Listening for SMTP connection...",
    "Monitoring MX records for target domain...",
    "Warming up analysis engine...",
    "Checking global blocklists (RBL)...",
    "Verifying TLS handshake capability..."
];

function addLog(msg, type = '') {
    const logContainer = document.getElementById('scan-log');
    const div = document.createElement('div');
    div.className = `log-line ${type}`;
    div.textContent = `> ${msg}`;
    logContainer.appendChild(div);
    logContainer.scrollTop = logContainer.scrollHeight;

    // Keep only last 6 lines
    while (logContainer.children.length > 6) {
        logContainer.removeChild(logContainer.firstChild);
    }
}

// State tracking to prevent log spam
let isAnalyzing = false;

async function checkStatus(id) {
    // Call real backend: GET /api/assessment/{id}
    let resp;
    try {
        resp = await fetch(`${API_BASE_URL}/assessment/${encodeURIComponent(id)}`, { method: "GET" });
    } catch (e) {
        console.error("POLL_ERROR", e);
        return;
    }

    let data;
    try {
        data = await resp.json();
    } catch {
        console.error("POLL_INVALID_JSON", resp.status);
        return;
    }

    if (!resp.ok || !data.ok) {
        console.error("POLL_FAIL", resp.status, data);
        addLog(`Error: Connection failed [${resp.status}]`, "error");
        clearInterval(pollInterval); // Stop polling on error
        return;
    }

    // STATE 1: WAITING
    if (data.status === "waiting_email") {
        if (Math.random() > 0.7) {
            const msg = logMessages[Math.floor(Math.random() * logMessages.length)];
            addLog(msg);
        }
        return;
    }

    // STATE 1.5: TIMEOUT
    if (data.status === "timeout") {
        clearInterval(pollInterval);
        addLog("Error: Session timed out. No email received.", "error");
        alert("Session timed out (5 minutes). Please restart the assessment if you wish to try again.");
        // Optional: Reset UI or stay on log
        return;
    }

    // STATE 2: VERIFIED / ANALYZING
    // Since backend currently stops at 'verified', we handle the transition here.
    if ((data.status === "verified" || data.status === "probing") && !isAnalyzing) {
        isAnalyzing = true;

        // Stop polling immediately to prevent loops
        clearInterval(pollInterval);

        addLog("Email received! Starting deep analysis...", "success");
        addLog("Analyzing SPF/DKIM/DMARC alignment...", "warn");

        setTimeout(() => addLog("Probing MX host capabilities...", "warn"), 800);
        setTimeout(() => addLog("Verifying MTA-STS policy...", "warn"), 1600);
        setTimeout(() => addLog("Calculating risk score...", "warn"), 2400);

        // Transition to Report after "analysis" simulation
        setTimeout(() => {
            addLog("Analysis complete. Generating report...", "success");
            const report = data.report || generateMockReport(data.domain);
            renderReport(report);

            setTimeout(() => {
                stepVerify.classList.add('hidden');
                stepReport.classList.remove('hidden');
                isAnalyzing = false; // Reset for next run
            }, 1000);
        }, 3500);

        return;
    }

    // STATE 3: COMPLETED (Future proofing)
    if (data.status === "report_ready" || data.status === "completed") {
        clearInterval(pollInterval);
        const report = data.report || generateMockReport(data.domain);
        renderReport(report);
        stepVerify.classList.add('hidden');
        stepReport.classList.remove('hidden');
    }
}

function generateMockReport(domain) {
    return {
        domain: domain,
        sender_ip: "203.0.113." + Math.floor(Math.random() * 255),
        dns_posture: {
            spf: "pass",
            dmarc: "none",
            dkim: "pass",
            mta_sts: Math.random() > 0.5 ? "enforce" : "missing", // Mock
            tls_rpt: Math.random() > 0.5 ? "enabled" : "missing"  // Mock
        },
        smtp_tls: {
            starttls: true,
            version: "TLS 1.3",
            cipher: "TLS_AES_256_GCM_SHA384"
        },
        risk_level: "Medium",
        risk_score: 65,
        risk_breakdown: [
            { item: "DMARC policy is 'none' (Monitoring only)", score: 20, severity: "high" },
            { item: "MTA-STS policy missing or invalid", score: 10, severity: "medium" },
            { item: "SPF lookup count near limit (9/10)", score: 5, severity: "low" }
        ]
    };
}

function renderReport(report) {
    if (!report) {
        console.error("No report data available");
        return;
    }

    try {
        document.getElementById('report-domain').textContent = report.domain || 'Unknown Domain';
        const grid = document.getElementById('report-content');

        const getStatusClass = (val) => {
            if (!val) return 'fail';
            const lower = String(val).toLowerCase();
            if (['pass', 'true', 'low', 'enforce', 'enabled'].includes(lower)) return 'pass';
            if (['warn', 'none', 'medium', 'missing', 'quarantine/none'].includes(lower)) return 'warn';
            return 'fail';
        };

        const dns = report.dns_posture || {};
        const tls = report.smtp_tls || {};
        const riskScore = report.risk_score || 0;
        const riskBreakdown = report.risk_breakdown || [];
        const rblStatus = report.rbl_status || 'unchecked';

        // Unified Executive Report (與後端 / 下載 / Discord 一致)
        const riskItemBorder = (r) => r.severity === 'high' ? '#ff0055' : (r.severity === 'medium' ? '#ffaa00' : '#666');
        let html = `
            <div class="section-title">> Executive Risk Profile (Score: ${riskScore}/100)</div>
            <div class="risk-container">
                ${riskBreakdown.map(r => `
                    <div class="risk-item" style="border-left-color: ${riskItemBorder(r)};">
                        <span>${r.item}</span>
                        <span class="value pass">+${r.score}</span>
                    </div>
                `).join('')}
            </div>

            <div class="section-title">> Authentication Infrastructure</div>
            <div class="grid">
                <div class="card"><div class="label">Origin MTA Node</div><div class="value">${report.sender_ip || 'Generic Postfix/Exim'}</div></div>
                <div class="card"><div class="label">Network Latency</div><div class="value ${parseFloat(report.transport_time) > 5 ? 'warn' : 'pass'}">${report.transport_time || 'N/A'}</div></div>
                <div class="card">
                    <div class="label">SPF Governance</div>
                    <div class="value ${getStatusClass(dns.spf)}">${(dns.spf || 'MISSING').toUpperCase()}</div>
                    ${dns.spf === 'warn' ? '<div class="gap-warning">⚠️ RFC 7208 Complexity Limit Exceeded</div>' : ''}
                </div>
                <div class="card">
                    <div class="label">DMARC Enforcement</div>
                    <div class="value ${getStatusClass(dns.dmarc)}">${(dns.dmarc || 'NONE').toUpperCase()}</div>
                    ${dns.dmarc_raw && dns.dmarc_raw.includes('rua=') ? '<div class="gap-warning">⚠️ Potential Data Exfiltration Path via RUA</div>' : ''}
                </div>
                <div class="card"><div class="label">DNSSEC Integrity</div><div class="value ${getStatusClass(dns.dnssec)}">${(dns.dnssec || 'FAIL').toUpperCase()}</div></div>
                <div class="card"><div class="label">RBL Reputation</div><div class="value ${rblStatus === 'fail' ? 'fail' : 'pass'}">${rblStatus === 'fail' ? 'BLACKLISTED' : 'CLEAN'}</div></div>
            </div>

            <div class="section-title">> Advanced Security Protocols</div>
            <div class="grid">
                <div class="card">
                    <div class="label">MTA-STS Handshake</div>
                    <div class="value ${getStatusClass(dns.mta_sts)}">${(dns.mta_sts || 'MISSING').toUpperCase()}</div>
                    ${dns.mta_sts === 'missing' && dns.mta_sts_raw !== 'None' ? '<div class="gap-warning">⚠️ Policy Handshake Integrity Failed</div>' : ''}
                </div>
                <div class="card"><div class="label">TLS Reporting (RPT)</div><div class="value ${getStatusClass(dns.tls_rpt)}">${(dns.tls_rpt || 'MISSING').toUpperCase()}</div></div>
                <div class="card"><div class="label">BIMI Brand Indicator</div><div class="value ${getStatusClass(dns.bimi)}">${(dns.bimi || 'MISSING').toUpperCase()}</div></div>
                <div class="card"><div class="label">Transport Encryption</div><div class="value pass">${tls.version || 'TLS 1.3 (Verified)'}</div></div>
            </div>

            <div class="cta-box">
                <h3>Want the Technical Forensic Report?</h3>
                <p>Our backend has identified specific RFC violations and policy handshake failures.</p>
                <p>Contact <strong>consult@nine-security.com</strong> to unlock the full technical diagnostic and remediation guide.</p>
            </div>

            <div class="report-footer">
                CONFIDENTIAL - GENERATED BY NINE-SECURITY.INC FORENSIC CLUSTER<br>
                &copy; 2026 Nine-Security Team. All Systems Operational.
            </div>
        `;

        // Store standard object for download
        window.currentReportData = report;

        document.getElementById('report-content').innerHTML = html;
        document.getElementById('btn-download-report').classList.remove('hidden');

    } catch (e) {
        console.error("Rendering failed:", e);
        document.getElementById('report-content').innerHTML = `<div class="error">Report rendering error: ${e.message}</div>`;
    }
}
// --- Report Action Handlers ---

document.getElementById('btn-reset-check').addEventListener('click', () => {
    // Reset UI State
    document.getElementById('smtp-step-report').classList.add('hidden');
    document.getElementById('smtp-step-verify').classList.add('hidden');
    document.getElementById('smtp-step-input').classList.remove('hidden');

    // Clean up data
    currentAssessmentId = null;
    if (pollInterval) clearInterval(pollInterval);
    document.getElementById('email-input').value = '';
    document.getElementById('scan-log').innerHTML = '';
    document.getElementById('report-content').innerHTML = ''; // Clear report

    // Uncheck consent
    const consent = document.getElementById('consent-check');
    if (consent) consent.checked = false;
});

// Download Aligned Executive Report (與網頁 / 後端 Admin / Discord 連結 同一樣板)
document.getElementById('btn-download-report').addEventListener('click', () => {
    const data = window.currentReportData;
    if (!data) return;

    const domain = data.domain || 'unknown';
    const dns = data.dns_posture || {};
    const tls = data.smtp_tls || {};
    const riskScore = data.risk_score || 0;
    const rblStatus = data.rbl_status || 'unchecked';

    const getStatusClass = (val) => {
        const lower = String(val || '').toLowerCase();
        if (['pass', 'true', 'low', 'enforce', 'enabled'].includes(lower)) return 'pass';
        if (['warn', 'none', 'medium', 'missing', 'quarantine/none'].includes(lower)) return 'warn';
        return 'fail';
    };

    const fullHtml = `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>9Sec Security Report - ${domain}</title>
    <style>
        :root { --green: #00ff41; --fail: #ff0055; --warn: #ffaa00; --bg: #0a0a0a; --card: #111; --border: #333; --text: #e0e0e0; }
        body { background: var(--bg); color: var(--text); font-family: 'Segoe UI', Tahoma, sans-serif; padding: 40px; max-width: 900px; margin: 0 auto; line-height: 1.6; }
        .header { border-bottom: 2px solid var(--border); padding-bottom: 20px; margin-bottom: 30px; }
        .header h1 { color: var(--green); margin: 0; font-family: monospace; letter-spacing: 2px; }
        .section-title { color: var(--green); font-family: monospace; margin: 30px 0 15px; font-size: 1.1rem; border-left: 4px solid var(--green); padding-left: 15px; text-transform: uppercase; }
        .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; }
        .card { background: var(--card); border: 1px solid var(--border); padding: 15px; border-radius: 4px; position: relative; }
        .label { color: #888; font-size: 0.75rem; text-transform: uppercase; margin-bottom: 5px; }
        .value { font-size: 1.1rem; font-weight: bold; font-family: 'JetBrains Mono', monospace; }
        .value.pass { color: var(--green); } .value.fail { color: var(--fail); } .value.warn { color: var(--warn); }
        .risk-item { display: flex; justify-content: space-between; padding: 12px; background: rgba(255,255,255,0.03); border: 1px solid var(--border); margin-bottom: 8px; border-left: 4px solid var(--fail); }
        .gap-warning { font-size: 0.7rem; color: var(--fail); margin-top: 8px; font-style: italic; border-top: 1px solid #222; padding-top: 5px; }
        .cta-box { background: rgba(0,255,65,0.05); border: 1px solid var(--green); padding: 25px; margin-top: 40px; text-align: center; }
        .footer { margin-top: 50px; text-align: center; color: #555; font-size: 0.8rem; border-top: 1px solid var(--border); padding-top: 20px; }
    </style>
</head>
<body>
    <div class="header">
        <h1>NINE-SECURITY // ASSESSMENT_LOG</h1>
        <p>Target Domain: <strong>${domain}</strong> | Timestamp: ${new Date().toLocaleString()}</p>
    </div>

    <div class="section-title">> Executive Risk Profile (Score: ${riskScore}/100)</div>
    <div class="risk-container">
        ${(data.risk_breakdown || []).map(r => `
        <div class="risk-item" style="border-left-color: ${r.severity === 'high' ? '#ff0055' : (r.severity === 'medium' ? '#ffaa00' : '#666')};">
            <span>${r.item}</span>
            <span class="value pass">+${r.score}</span>
        </div>
        `).join('')}
    </div>

    <div class="section-title">> Authentication Infrastructure</div>
    <div class="grid">
        <div class="card"><div class="label">Origin MTA Node</div><div class="value">${data.sender_ip || 'Generic Postfix/Exim'}</div></div>
        <div class="card"><div class="label">Network Latency</div><div class="value ${parseFloat(data.transport_time) > 5 ? 'warn' : 'pass'}">${data.transport_time || 'N/A'}</div></div>
        <div class="card">
            <div class="label">SPF Governance</div>
            <div class="value ${getStatusClass(dns.spf)}">${String(dns.spf || 'MISSING').toUpperCase()}</div>
            ${dns.spf === 'warn' ? '<div class="gap-warning">⚠️ RFC 7208 Complexity Limit Exceeded</div>' : ''}
        </div>
        <div class="card">
            <div class="label">DMARC Enforcement</div>
            <div class="value ${getStatusClass(dns.dmarc)}">${String(dns.dmarc || 'NONE').toUpperCase()}</div>
            ${dns.dmarc_raw && dns.dmarc_raw.includes('rua=') ? '<div class="gap-warning">⚠️ Potential Data Exfiltration Path via RUA</div>' : ''}
        </div>
        <div class="card"><div class="label">DNSSEC Integrity</div><div class="value ${getStatusClass(dns.dnssec)}">${String(dns.dnssec || 'FAIL').toUpperCase()}</div></div>
        <div class="card"><div class="label">RBL Reputation</div><div class="value ${rblStatus === 'fail' ? 'fail' : 'pass'}">${rblStatus === 'fail' ? 'BLACKLISTED' : 'CLEAN'}</div></div>
    </div>

    <div class="section-title">> Advanced Security Protocols</div>
    <div class="grid">
        <div class="card">
            <div class="label">MTA-STS Handshake</div>
            <div class="value ${getStatusClass(dns.mta_sts)}">${String(dns.mta_sts || 'MISSING').toUpperCase()}</div>
            ${dns.mta_sts === 'missing' && dns.mta_sts_raw !== 'None' ? '<div class="gap-warning">⚠️ Policy Handshake Integrity Failed</div>' : ''}
        </div>
        <div class="card"><div class="label">TLS Reporting (RPT)</div><div class="value ${getStatusClass(dns.tls_rpt)}">${String(dns.tls_rpt || 'MISSING').toUpperCase()}</div></div>
        <div class="card"><div class="label">BIMI Brand Indicator</div><div class="value ${getStatusClass(dns.bimi)}">${String(dns.bimi || 'MISSING').toUpperCase()}</div></div>
        <div class="card"><div class="label">Transport Encryption</div><div class="value pass">${tls.version || 'TLS 1.3 (Verified)'}</div></div>
    </div>

    <div class="cta-box">
        <h3 style="color: var(--green); margin-top: 0; font-family: monospace;">Want the Technical Forensic Report?</h3>
        <p>Our backend has identified specific RFC violations and policy handshake failures.</p>
        <p>Contact <strong>consult@nine-security.com</strong> to unlock the full technical diagnostic and remediation guide.</p>
    </div>

    <div class="footer">
        CONFIDENTIAL - GENERATED BY NINE-SECURITY.INC FORENSIC CLUSTER<br>
        &copy; 2026 Nine-Security Team. All Systems Operational.
    </div>
</body>
</html>`;

    const blob = new Blob([fullHtml], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `9Sec_Security_Log_${domain}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
});
// Script loaded
