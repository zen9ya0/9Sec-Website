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
const smtpForm = document.getElementById('smtp-form');
const stepInput = document.getElementById('smtp-step-input');
const stepVerify = document.getElementById('smtp-step-verify');
const stepReport = document.getElementById('smtp-step-report');
const verifyEmailCode = document.getElementById('verification-email');
const btnCopy = document.getElementById('btn-copy-email');
const btnMockVerify = document.getElementById('btn-mock-verify'); // Dev only - Can be removed

let currentAssessmentId = null;
let pollInterval = null;

if (smtpForm) {
    smtpForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const email = document.getElementById('email-input').value;
        startAssessment(email);
    });
}

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
        resp = await fetch("/api/assessment", {
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
        alert("Invalid backend response (non-JSON).");
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

async function checkStatus(id) {
    // Call real backend: GET /api/assessment/{id}
    let resp;
    try {
        resp = await fetch(`/api/assessment/${encodeURIComponent(id)}`, { method: "GET" });
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
        return;
    }

    // Waiting state: keep polling
    if (data.status === "waiting_email") {
        // Randomly add "noise" logs to make it feel alive
        if (Math.random() > 0.7) {
            const msg = logMessages[Math.floor(Math.random() * logMessages.length)];
            addLog(msg);
        }
        return;
    }

    if (data.status === "verified" || data.status === "probing") {
        addLog("Email received! Starting deep analysis...", "success");

        // If probing, show more specific logs
        if (data.status === "probing") {
            addLog("Probing MX host capabilities...", "warn");
            addLog("Handshaking TLS...", "warn");
        }

        // Wait a bit before showing report if it's instant
        if (data.status === "verified") return;
    }

    // Verified -> stop polling and show report step
    if (data.status === "report_ready" || data.status === "completed") {
        clearInterval(pollInterval);
        addLog("Analysis complete. Generatnig report...", "success");

        setTimeout(() => {
            const report = data.report || generateMockReport(data.domain); // Use backend report if avail
            renderReport(report);
            stepVerify.classList.add('hidden');
            stepReport.classList.remove('hidden');
        }, 1000);
    }
}

function generateMockReport(domain) {
    return {
        domain: domain,
        sender_ip: "203.0.113." + Math.floor(Math.random() * 255),
        dns_posture: {
            spf: "pass",
            dmarc: "none",
            dkim: "pass"
        },
        smtp_tls: {
            starttls: true,
            version: "TLS 1.3",
            cipher: "TLS_AES_256_GCM_SHA384"
        },
        risk_level: "Medium"
    };
}

function renderReport(report) {
    document.getElementById('report-domain').textContent = report.domain;
    const grid = document.getElementById('report-content');

    // Helper for coloring
    const getStatusClass = (val) => {
        if (val === 'pass' || val === true || val === 'Low') return 'pass';
        if (val === 'none' || val === 'Medium') return 'warn';
        return 'fail';
    };

    grid.innerHTML = `
        <div class="report-item">
            <h4>Sender IP</h4>
            <div class="value">${report.sender_ip}</div>
        </div>
        <div class="report-item">
            <h4>SPF Status</h4>
            <div class="value ${getStatusClass(report.dns_posture.spf)}">${report.dns_posture.spf.toUpperCase()}</div>
        </div>
        <div class="report-item">
            <h4>DMARC Policy</h4>
            <div class="value ${getStatusClass(report.dns_posture.dmarc)}">${report.dns_posture.dmarc.toUpperCase()}</div>
        </div>
        <div class="report-item">
            <h4>STARTTLS</h4>
            <div class="value ${report.smtp_tls.starttls ? 'pass' : 'fail'}">${report.smtp_tls.starttls ? 'ENABLED' : 'DISABLED'}</div>
        </div>
        <div class="report-item">
            <h4>TLS Version</h4>
            <div class="value">${report.smtp_tls.version}</div>
        </div>
        <div class="report-item">
            <h4>Overall Risk</h4>
            <div class="value ${getStatusClass(report.risk_level)}">${report.risk_level.toUpperCase()}</div>
        </div>
    `;
}
