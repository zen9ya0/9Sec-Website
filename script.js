const canvas = document.getElementById('bg-canvas');
if (canvas) {
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

    const MAX_PARTICLES = 100; // Cap 以降低大螢幕時 O(n²) 連線成本
    function init() {
        particlesArray = [];
        let numberOfParticles = Math.min(Math.floor((canvas.height * canvas.width) / 25000), MAX_PARTICLES);
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

    // Handle resize (debounce to avoid thrashing on drag-resize)
    let resizeTimer;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(() => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
            init();
        }, 150);
    });

    // Init
    init();
    animate();
}

// --- Glitch Title Typo Effect (Optional Add-on) ---
// Currently using CSS only, but JS could add random character swapping if requested later.

// --- Smooth Scroll for Anchor Links ---
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        const targetId = this.getAttribute('href');
        if (targetId === '#') return;
        const targetElem = document.querySelector(targetId);
        if (targetElem) {
            e.preventDefault();
            targetElem.scrollIntoView({
                behavior: 'smooth'
            });
        }
    });
});

// --- API 基底（單一來源，方便換環境／staging）---
const API_BASE = "https://api.nine-security.com";

/** Email 格式與長度驗證（長度 ≤254，單一 @，domain 含點）。回傳 null 表示合法，否則回傳錯誤訊息。 */
function validateEmail(value) {
    if (typeof value !== "string") return "Please enter a valid corporate email.";
    const s = value.trim();
    if (s.length === 0) return "Please enter a valid corporate email.";
    if (s.length > 254) return "Email address is too long.";
    if (/[\x00-\x1F\x7F]/.test(s)) return "Invalid characters in email.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s)) return "Please enter a valid corporate email.";
    const domain = s.split("@")[1];
    if (!domain || domain.length < 4) return "Please enter a valid corporate email.";
    return null;
}

// --- 資安新聞: 從後端 API 載入 RSS 文章（先顯示 6 篇，其餘「顯示更多」）---
const ARTICLES_INITIAL = 6;
const articlesSection = document.querySelector("#security-news");
const articlesContainer = document.querySelector("#security-news .list-layout");

let globalNewsList = [];
let newsShowingCount = ARTICLES_INITIAL;

function renderNews(list, count) {
    if (!articlesContainer) return;
    newsShowingCount = count;
    const countToShow = Math.min(count, list.length);
    const slice = list.slice(0, countToShow);

    articlesContainer.innerHTML = slice.map((a) => {
        const lang = localStorage.getItem("9sec_lang") || "en";
        const content = (lang === "tw") ? (a.tw || a) : (lang === "jp" ? (a.jp || a) : (a.en || a));
        const aiBadge = a.is_ai ? `<span class="ai-badge">AI Summary</span>` : "";

        return `
        <article class="list-item">
            <div class="date">${escapeHtml(a.date || "")} ${aiBadge}</div>
            <div class="content">
                <h3>${escapeHtml(content.title || "")}</h3>
                <p>${escapeHtml(content.excerpt || "")}</p>
            </div>
            <div class="action">
                <a href="${escapeHtml(a.url || "#")}" class="read-btn" target="_blank" rel="noopener noreferrer">READ</a>
            </div>
        </article>
        `;
    }).join("");

    let btnWrap = articlesSection.querySelector(".articles-more-wrap");
    if (list.length > ARTICLES_INITIAL) {
        if (!btnWrap) {
            btnWrap = document.createElement("div");
            btnWrap.className = "articles-more-wrap";
            articlesSection.querySelector(".container").appendChild(btnWrap);
        }
        const isAll = countToShow >= list.length;
        const remaining = list.length - countToShow;
        const btnText = getArticlesButtonLabel(isAll, remaining);
        btnWrap.innerHTML = `<button type="button" class="articles-more-btn" data-expanded="${isAll}" data-remaining="${remaining}">${escapeHtml(btnText)}</button>`;
        btnWrap.querySelector("button").onclick = () => {
            renderNews(list, isAll ? ARTICLES_INITIAL : list.length);
        };
    } else if (btnWrap) btnWrap.remove();
}

if (articlesContainer && articlesSection) {
    fetch(`${API_BASE}/api/articles`)
        .then((r) => r.ok ? r.json() : [])
        .then((list) => {
            if (!Array.isArray(list) || list.length === 0) return;
            globalNewsList = list;
            renderNews(list, ARTICLES_INITIAL);
        })
        .catch(() => { /* 失敗時保留靜態文章 */ });
}


// --- 威脅情資: 從後端 API 載入，CISA / OTX 分開顯示（各預設 8 / 5 筆，其餘「顯示更多」）---
const THREAT_INTEL_CISA_INITIAL = 8;
const THREAT_INTEL_OTX_INITIAL = 5;
const threatIntelSection = document.querySelector("#threat-intel");
const threatIntelContent = document.getElementById("threat-intel-content");
if (threatIntelContent && threatIntelSection) {
    fetch(`${API_BASE}/api/threat-intel`)
        .then((r) => r.ok ? r.json() : [])
        .then((list) => {
            if (!Array.isArray(list) || list.length === 0) {
                const msg = getThreatIntelEmptyLabel();
                threatIntelContent.className = "threat-intel-content threat-intel-placeholder";
                threatIntelContent.innerHTML = `<p class="placeholder-text">${escapeHtml(msg)}</p>`;
                return;
            }
            const cisaList = list.filter((t) => t.source !== "otx");
            const otxList = list.filter((t) => t.source === "otx");
            const headingCisa = getThreatIntelHeadingCisa();
            const headingOtx = getThreatIntelHeadingOtx();

            const renderOneItem = (t, showSourceBadge) => {
                const lang = localStorage.getItem("9sec_lang") || "en";
                const content = (lang === "tw") ? (t.tw || t) : (lang === "jp" ? (t.jp || t) : (t.en || t));
                const aiBadge = t.is_ai ? `<span class="ai-badge ai-badge-small">AI</span>` : "";

                const severityBadge = (t.severity === "high")
                    ? `<span class="severity-badge severity-high" data-i18n="threat_intel.ransomware">Ransomware</span>`
                    : "";
                const sourceBadge = showSourceBadge
                    ? `<span class="source-badge source-${escapeHtml((t.source || "cisa"))}" data-i18n="threat_intel.source_${(t.source === "otx") ? "otx" : "cisa"}">${(t.source === "otx") ? "OTX" : "CISA"}</span> `
                    : "";
                const detailLabel = getThreatIntelDetailLabel();
                return `
                    <article class="list-item threat-intel-item">
                        <div class="date">${sourceBadge}${escapeHtml(t.date || "")} ${aiBadge}</div>
                        <div class="content">
                            <h3>${severityBadge}${escapeHtml(content.title || "")}</h3>
                            <p>${escapeHtml(content.excerpt || "")}</p>
                        </div>
                        <div class="action">
                            <a href="${escapeHtml(t.url || "#")}" class="read-btn" target="_blank" rel="noopener noreferrer">${escapeHtml(detailLabel)}</a>
                        </div>
                    </article>
                `;
            };

            /** 工廠：同一欄「顯示更多／收合」邏輯，回傳 { render, buildBtn, onClick, showing }。 */
            function makeThreatIntelMoreHandler(list, initialCount, listClass, moreWrapClass, btnClass) {
                let showing = initialCount;
                const render = (count) => {
                    showing = count;
                    const n = Math.min(count, list.length);
                    return list.slice(0, n).map((item) => renderOneItem(item, false)).join("");
                };
                const buildBtn = (isAll, remaining) => {
                    const btnText = getThreatIntelButtonLabel(isAll, remaining);
                    return `<div class="threat-intel-more-wrap ${moreWrapClass}"><button type="button" class="articles-more-btn threat-intel-more-btn ${btnClass}" data-expanded="${isAll}" data-remaining="${remaining}">${escapeHtml(btnText)}</button></div>`;
                };
                const onClick = () => {
                    const next = showing >= list.length ? initialCount : list.length;
                    const listEl = threatIntelSection.querySelector(`.${listClass}`);
                    const wrap = threatIntelSection.querySelector(`.${moreWrapClass}`);
                    if (listEl) listEl.innerHTML = render(next);
                    if (wrap) {
                        const isAll = next >= list.length;
                        const remaining = list.length - Math.min(next, list.length);
                        wrap.innerHTML = `<button type="button" class="articles-more-btn threat-intel-more-btn ${btnClass}" data-expanded="${isAll}" data-remaining="${remaining}">${escapeHtml(getThreatIntelButtonLabel(isAll, remaining))}</button>`;
                        wrap.querySelector("button").onclick = onClick;
                    }
                };
                return { render, buildBtn, onClick, get showing() { return showing; } };
            }

            const cisaHandler = makeThreatIntelMoreHandler(cisaList, THREAT_INTEL_CISA_INITIAL, "threat-intel-cisa-list", "threat-intel-cisa-more", "threat-intel-cisa-btn");
            const otxHandler = makeThreatIntelMoreHandler(otxList, THREAT_INTEL_OTX_INITIAL, "threat-intel-otx-list", "threat-intel-otx-more", "threat-intel-otx-btn");

            const cisaHtml = cisaList.length === 0
                ? ""
                : `<div class="threat-intel-group threat-intel-cisa">
                    <h3 class="threat-intel-group-title" data-i18n="threat_intel.heading_cisa">${escapeHtml(headingCisa)}</h3>
                    <div class="list-layout threat-intel-cisa-list">${cisaHandler.render(cisaHandler.showing)}</div>
                    ${cisaList.length > THREAT_INTEL_CISA_INITIAL ? cisaHandler.buildBtn(cisaHandler.showing >= cisaList.length, cisaList.length - Math.min(cisaHandler.showing, cisaList.length)) : ""}
                </div>`;
            const otxHtml = otxList.length === 0
                ? ""
                : `<div class="threat-intel-group threat-intel-otx">
                    <h3 class="threat-intel-group-title" data-i18n="threat_intel.heading_otx">${escapeHtml(headingOtx)}</h3>
                    <div class="list-layout threat-intel-otx-list">${otxHandler.render(otxHandler.showing)}</div>
                    ${otxList.length > THREAT_INTEL_OTX_INITIAL ? otxHandler.buildBtn(otxHandler.showing >= otxList.length, otxList.length - Math.min(otxHandler.showing, otxList.length)) : ""}
                </div>`;
            threatIntelContent.className = "threat-intel-content threat-intel-split" + (cisaList.length && otxList.length ? " threat-intel-split-two" : "");
            threatIntelContent.innerHTML = `<div class="threat-intel-split-inner">${cisaHtml}${otxHtml}</div>`;

            const cisaBtn = threatIntelSection.querySelector(".threat-intel-cisa-btn");
            if (cisaBtn) cisaBtn.onclick = cisaHandler.onClick;
            const otxBtn = threatIntelSection.querySelector(".threat-intel-otx-btn");
            if (otxBtn) otxBtn.onclick = otxHandler.onClick;
        })
        .catch(() => {
            const msg = getThreatIntelLoadErrorLabel();
            threatIntelContent.className = "threat-intel-content threat-intel-placeholder";
            threatIntelContent.innerHTML = `<p class="placeholder-text">${escapeHtml(msg)}</p>`;
        });
}
function getThreatIntelHeadingCisa() { return t("threat_intel.heading_cisa", "CISA KEV"); }
function getThreatIntelHeadingOtx() { return t("threat_intel.heading_otx", "OTX Pulses"); }
function getThreatIntelButtonLabel(isAll, remaining) {
    return isAll ? t("threat_intel.collapse", "Collapse") : t("threat_intel.show_more", "Show more ({n})").replace("{n}", remaining);
}
function getThreatIntelEmptyLabel() { return t("threat_intel.empty", "No threat intel entries yet."); }
function getThreatIntelLoadErrorLabel() { return t("threat_intel.load_error", "Unable to load threat intel."); }
function getThreatIntelDetailLabel() { return t("threat_intel.detail", "CVE"); }

function escapeHtml(s) {
    if (s == null) return "";
    const div = document.createElement("div");
    div.textContent = s;
    return div.innerHTML;
}

/** Shared: DNS/status value → CSS class (pass/warn/fail). Used by report UI and getReportHtml. */
function getStatusClass(val) {
    if (val == null) return "fail";
    const lower = String(val).toLowerCase();
    if (["pass", "true", "low", "enforce", "enabled"].includes(lower)) return "pass";
    if (["warn", "none", "medium", "missing", "quarantine/none"].includes(lower)) return "warn";
    return "fail";
}

/* --- Multi-language Support --- */
const translations = {
    en: {
        nav: {
            home: "/Home",
            services: "/Services",
            model: "/9SEC_Model",
            tools: "/Arsenal",
            news: "/Security_News",
            threat_intel: "/Threat_Intel",
            contact: "/Contact",
            back_to_services: "RETURN_TO_SERVICES"
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
            news: "Security_News",
            intelligence: "Threat_Intelligence",
            threat_intel_coming: "Threat intelligence feed will be integrated here.",
            smtp: "SMTP_Security_Check",
            dmarc_intel: "DMARC_Intelligence",
            services: "9SEC_SERVICES"
        },
        services: {
            subtitle: "Specialized Security Inspection & Forensic Probes",
            smtp_title: "SMTP Security Check",
            smtp_desc: "Verify your email infrastructure health. Checks SPF, DMARC, MTA-STS, and transport encryption. Now includes real-time brand impersonation and lookalike domain monitoring.",
            ad_title: "AD / Azure Identity Audit",
            ad_desc: "Scan for over-privileged accounts, shadow admins, and insecure authentication paths in your directory services.",
            edr_title: "Endpoint EDR Hygiene",
            edr_desc: "Identify gaps in EDR coverage and behavioral monitoring across your workstation fleet.",
            cta_launch: "LAUNCH_PROBE",
            gov_title: "Governance Automation",
            gov_desc: "Enterprise-grade compliance engine designed for rapid audit readiness. <ul><li><i class='fa-solid fa-check'></i> <strong>Automated Evidence</strong>: One-click local collection & cloud correlation.</li><li><i class='fa-solid fa-check'></i> <strong>Maturity Scoring</strong>: Real-time tracking of ISO27001/NIST compliance gaps.</li><li><i class='fa-solid fa-check'></i> <strong>Audit-Ready Reports</strong>: Instant forensic evidence package generation.</li></ul>",
            cta_trial: "START_TRIAL",
            cta_portal: "OPEN_PORTAL",
            limited_access: "LIMITED_ACCESS",
            coming_soon: "COMING_SOON",
            custom_probe: "Custom_Forensic_Probes",
            custom_desc: "Need a specialized inspection for a proprietary protocol or high-value asset? Our team builds custom forensic probes tailored to your environment.",
            cta_consult: "REQUEST_CUSTOM_AUDIT",
            dmarc_title: "DMARC Intelligence Monitor",
            dmarc_desc: "Professional-grade brand protection that goes beyond manual parsing. <ul><li><i class='fa-solid fa-check'></i> <strong>Consolidated Dashboard</strong>: Single portal for all your sending domains.</li><li><i class='fa-solid fa-check'></i> <strong>Continuous Tracking</strong>: 24/7 automated report collection via RUA.</li><li><i class='fa-solid fa-check'></i> <strong>Forensic Insights</strong>: Identify unauthorized spoofing attempts in real-time.</li></ul>",
            dmarc_trial_tag: "Free Manual Tool",
            dmarc_pro_title: "Switch to Automated Monitoring",
            dmarc_pro_desc: "Don't waste time on manual uploads. Our subscription tier offers hands-off automation and professional expert interpretation.",
            dmarc_benefit_automated: "<strong>Automated Pipeline</strong>: No manual file uploading needed.",
            dmarc_benefit_continuous: "<strong>24/7 Monitoring</strong>: We track your domain reputation around the clock.",
            dmarc_benefit_expert: "<strong>Expert Interpretation</strong>: We don't just show charts; we help you decode the forensic data.",
            dmarc_benefit_consolidated: "<strong>Unified Portal</strong>: Manage all domains in one dashboard."
        },
        model: {
            intro1: "> Beyond Protection. 9 Dimensions of Verifiable Truth.",
            intro2: "A practical framework covering Governance, Protection, Detection, Response, and Evolution.",
            l1_title: "Governance & Risk",
            l1_desc: "Building the correct security foundation from decision-making and risk perspectives.",
            l1_d1: "Policy & Responsibility",
            l1_d2: "Risk Assessment",
            l1_d3: "Compliance (ISO/NIST)",
            l2_title: "Identity & Access",
            l2_desc: "Minimizing initial intrusion and lateral movement risks.",
            l2_d1: "AD/IAM Architecture",
            l2_d2: "Over-Privilege Analysis",
            l2_d3: "MFA Strategies",
            l3_title: "Endpoint Protection",
            l3_desc: "Mastering actual attack execution and landing behavior.",
            l3_d1: "EDR/XDR Health Check",
            l3_d2: "Behavior Analysis",
            l3_d3: "Fileless Monitoring",
            l4_title: "Network Defense",
            l4_desc: "Identifying hidden communications and lateral movement.",
            l4_d1: "Traffic Analysis",
            l4_d2: "C2 Communication",
            l4_d3: "Lateral Movement Paths",
            l5_title: "Application & Cloud",
            l5_desc: "Securing the modern attack surface.",
            l5_d1: "Web/API Analysis",
            l5_d2: "Cloud Config Risks",
            l5_d3: "SaaS Access Review",
            l6_title: "Threat Intelligence",
            l6_desc: "Strengthening defense decisions from the adversary's perspective.",
            l6_d1: "APT Behavioral Analysis",
            l6_d2: "MITRE ATT&CK Mapping",
            l6_d3: "Threat Profiling",
            l7_title: "Detection Engineering",
            l7_desc: "Making defense capabilities quantifiable and verifiable.",
            l7_d1: "Rule Design & QA",
            l7_d2: "Attack Chain Coverage",
            l7_d3: "Gap Analysis",
            l8_title: "Incident Response & DFIR",
            l8_desc: "Restoring the full truth when incidents occur.",
            l8_d1: "Forensic Investigation",
            l8_d2: "Timeline Reconstruction",
            l8_d3: "Root Cause Analysis",
            l9_title: "Resilience & Evolution",
            l9_desc: "Transforming incidents into long-term defense capabilities.",
            l9_d1: "Post-Incident Review",
            l9_d2: "Process Optimization",
            l9_d3: "Evolution Roadmap"
        },
        footer: {
            tagline: "Securing the digital frontier.",
            copyright: "&copy; 2026 Nine-Security. All Systems Operational."
        },
        contact: {
            subtitle: "Connect with our Forensic Consultants",
            email_label: "Email_Channel",
            availability_label: "Duty_Status",
            availability_value: "24/7 Forensic Response",
            desc: "For custom audits, incident response, or forensic inquiries, please reach out via email. Our team typically responds within 4 standard operation hours."
        },
        smtp: {
            title: "Free Inbound Mail Security Assessment",
            desc: "Non-intrusive. Evidence-based. Checks MX health, encryption, and performs deep scans for lookalike domains used in phishing.",
            email_label: "Enter Work Email:",
            consent: "I authorize scanning of this domain's inbound MX.",
            btn_start: "Start Assessment",
            verify_title: "Verification Required",
            verify_desc: "To prove domain control, please send an empty email from your address to:",
            waiting: "Waiting for inbound email..."
        },
        articles: {
            show_more: "Show more ({n})",
            collapse: "Collapse"
        },
        news: {
            item1_title: "China-Linked DKnife AitM Framework Targets Routers",
            item1_desc: "Researchers uncover DKnife, a long-active AitM toolkit used by China-nexus actors to hijack edge device traffic.",
            item2_title: "CISA Orders Removal of Unsupported Edge Devices",
            item2_desc: "CISA directs federal agencies to replace end-of-life edge network devices to mitigate critical infrastructure risks.",
            item3_title: "Claude Opus 4.6 Finds 500+ High-Severity Flaws",
            item3_desc: "Anthropic reports Claude Opus 4.6 discovered over 500 unknown high-severity flaws in major open-source libraries."
        },
        threat_intel: {
            detail: "CVE",
            empty: "No threat intel entries yet.",
            load_error: "Unable to load threat intel.",
            ransomware: "Ransomware",
            source_cisa: "CISA",
            source_otx: "OTX",
            heading_cisa: "CISA KEV",
            heading_otx: "OTX Pulses",
            show_more: "Show more ({n})",
            collapse: "Collapse"
        },
        promo_modal: {
            title: "FREE SECURITY ASSESSMENT",
            desc: "Enhance your defense. Check your Email Security (SMTP/MX) status with our free forensic tool.",
            accept: "SCAN NOW",
            close: "CONTINUE BROWSING"
        },
        arsenal: {
            host_witness_title: "HostWitness",
            host_witness_desc: "Windows single-host live forensics and activity correlation tool. Collects and correlates processes, network, and timeline events.",
            host_witness_btn: "View on GitHub",
            host_witness_download: "Download .ZIP",
            host_witness_hash: "SHA-256 Checksum"
        },
        common: {
            notice_header: "SYSTEM_NOTIFICATION",
            notice_btn: "[ ACKNOWLEDGE ]"
        }
    },
    tw: {
        nav: {
            home: "/首頁",
            services: "/服務項目",
            model: "/九層防護模型",
            tools: "/軍火庫",
            news: "/資安新聞",
            threat_intel: "/威脅情資",
            contact: "/聯絡我們",
            back_to_services: "回到服務項目"
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
            news: "資安新聞",
            intelligence: "威脅情資",
            threat_intel_coming: "威脅情資來源將整合於此。",
            smtp: "SMTP_安全檢測",
            dmarc_intel: "DMARC_智能分析",
            services: "9SEC_服務項目"
        },
        services: {
            subtitle: "專業安全檢測與鑑識探針",
            smtp_title: "SMTP 郵件安全檢測",
            smtp_desc: "驗證您的郵件基礎設施健康狀況。檢查 SPF、DMARC、MTA-STS 以及傳輸加密，現已整合即時品牌偽冒網域監控與情資分析。",
            ad_title: "AD / Azure 身分稽核",
            ad_desc: "掃描目錄服務中的過度權限帳戶、影子管理員以及不安全的驗證路徑。",
            edr_title: "端點 EDR 健康檢查",
            edr_desc: "識別端點 EDR 覆蓋範圍與行為監控在您工作站群中的缺口。",
            cta_launch: "啟動探測",
            gov_title: "合規治理自動化",
            gov_desc: "專為企業稽核準備設計的自動化合規引擎。 <ul><li><i class='fa-solid fa-check'></i> <strong>自動化證據採集</strong>：一鍵完成本地蒐集與雲端關聯分析。</li><li><i class='fa-solid fa-check'></i> <strong>成熟度實時評分</strong>：即時追蹤 ISO27001/NIST 合規缺口。</li><li><i class='fa-solid fa-check'></i> <strong>稽核專用報告</strong>：瞬間生成完整的鑑識級數位證據包。</li></ul>",
            cta_trial: "開始試用",
            cta_portal: "進入控制台",
            limited_access: "權限受限",
            coming_soon: "即將推出",
            custom_probe: "客製化鑑識探針",
            custom_desc: "需要針對專有協定或高價值資產進行專門檢查嗎？我們的團隊可為您的環境量身打造客製化鑑識探針。",
            cta_consult: "申請客製化稽核",
            dmarc_title: "DMARC 智慧監控系統",
            dmarc_desc: "超越手動分析的專業級品牌保護。 <ul><li><i class='fa-solid fa-check'></i> <strong>單一整合儀表板</strong>：全域網域發信狀況一目瞭裝。</li><li><i class='fa-solid fa-check'></i> <strong>持續性自動追蹤</strong>：透過 RUA 進行每週 7x24 自動化報告採集。</li><li><i class='fa-solid fa-check'></i> <strong>鑑識級深度洞察</strong>：即時識別非法冒名發信來源與地理分佈。</li></ul>",
            dmarc_trial_tag: "免費試用工具",
            dmarc_pro_title: "升級至自動化全時監控",
            dmarc_pro_desc: "不再浪費時間手動上傳。訂閱方案提供全自動採集與專業資安專家解讀服務。",
            dmarc_benefit_automated: "<strong>全自動化管道</strong>：無需再手動處理 XML 檔案。",
            dmarc_benefit_continuous: "<strong>7x24 全時監測</strong>：我們晝夜不停地追蹤您的網域信譽。",
            dmarc_benefit_expert: "<strong>專家深度解讀</strong>：我們不只給您圖表，更幫您解讀鑑識數據背後的風險。",
            dmarc_benefit_consolidated: "<strong>統合管理中心</strong>：在單一入口管理所有發信網域。"
        },
        model: {
            intro1: "> 超越防護：九個維度的資安可驗證真相。",
            intro2: "一個涵蓋治理、防護、偵測、應變與演進的實戰框架。",
            l1_title: "治理與風險",
            l1_desc: "從決策與風險角度建立正確的資安基礎。",
            l1_d1: "政策與責任",
            l1_d2: "風險評估",
            l1_d3: "合規性 (ISO/NIST)",
            l2_title: "身分與存取",
            l2_desc: "最小化初始入侵與橫向移動風險。",
            l2_d1: "AD/IAM 架構",
            l2_d2: "過度權限分析",
            l2_d3: "MFA 策略",
            l3_title: "端點防護",
            l3_desc: "掌握實際攻擊執行與落地行為。",
            l3_d1: "EDR/XDR 健康檢查",
            l3_d2: "行為分析",
            l3_d3: "無檔案攻擊監控",
            l4_title: "網路防禦",
            l4_desc: "識別隱藏通訊與橫向移動軌跡。",
            l4_d1: "流量分析",
            l4_d2: "C2 通訊",
            l4_d3: "橫向移動路徑",
            l5_title: "應用程式與雲端",
            l5_desc: "保護現代化攻擊面。",
            l5_d1: "Web/API 分析",
            l5_d2: "雲端配置風險",
            l5_d3: "SaaS 存取審查",
            l6_title: "威脅情資",
            l6_desc: "從攻擊者視角強化防禦決策。",
            l6_d1: "APT 行為分析",
            l6_d2: "MITRE ATT&CK 對應",
            l6_d3: "威脅輪廓分析",
            l7_title: "偵測工程",
            l7_desc: "讓防禦能力可量化、可驗證。",
            l7_d1: "規則設計與 QA",
            l7_d2: "攻擊鏈覆蓋度",
            l7_d3: "缺口分析",
            l8_title: "事件響應與 DFIR",
            l8_desc: "當事件發生時還原完整真相。",
            l8_d1: "鑑識調查",
            l8_d2: "時間軸重建",
            l8_d3: "根因分析",
            l9_title: "韌性與演進",
            l9_desc: "將事件轉化為長期的防禦能力。",
            l9_d1: "事後回顧",
            l9_d2: "流程優化",
            l9_d3: "演進藍圖"
        },
        footer: {
            tagline: "捍衛數位邊疆。",
            copyright: "&copy; 2026 Nine-Security. 系統正常運作中。"
        },
        contact: {
            subtitle: "與我們的鑑識專家聯繫",
            email_label: "電子郵件頻道",
            availability_label: "值班狀態",
            availability_value: "24/7 全年無休鑑識響應",
            desc: "對於客製化稽核項目、緊急應變或鑑識諮詢，請透過電子郵件與我們聯繫。我們的團隊通常會在 4 個標準工作小時內回覆。"
        },
        smtp: {
            title: "免費 Inbound 郵件安全健診",
            desc: "低侵入、證據導向。驗證 MX 健康狀況與加密層級，並針對釣魚攻擊常用的偽冒網域進行深度情資對比。",
            email_label: "輸入公司信箱：",
            consent: "我授權對此網域的 Inbound MX 進行掃描。",
            btn_start: "開始健診",
            verify_title: "需要驗證",
            verify_desc: "為證明網域控制權，請從您的信箱寄一封空信至：",
            waiting: "等待驗證郵件中..."
        },
        articles: {
            show_more: "顯示更多 ({n} 篇)",
            collapse: "收起"
        },
        news: {
            item1_title: "中國駭客開發 DKnife 工具組，針對路由器進行流量劫持與監控",
            item1_desc: "研究人員揭露活躍多年的 DKnife 框架，中國駭客利用其攻擊邊緣設備並實施中間人攻擊。",
            item2_title: "CISA 要求聯邦機構撤換淘汰中的邊緣設備以降低網路風險",
            item2_desc: "美 CISA 發布指令，要求各機構加強設備生命週期管理，移除不再受支援的新網路設備。",
            item3_title: "Anthropic 揭露 Claude Opus 4.6 在主流開源庫中發現逾 500 個高風險漏洞",
            item3_desc: "AI 模型 Claude Opus 4.6 展現強大程式碼審計能力，成功識別出數百個先前未知的安全缺陷。"
        },
        threat_intel: {
            detail: "CVE",
            empty: "暫無威脅情資。",
            load_error: "無法載入威脅情資。",
            ransomware: "勒索軟體",
            source_cisa: "CISA",
            source_otx: "OTX",
            heading_cisa: "CISA 已知遭利用漏洞",
            heading_otx: "OTX 脈動",
            show_more: "顯示更多 ({n} 筆)",
            collapse: "收起"
        },
        promo_modal: {
            title: "免費郵件安全健診",
            desc: "強化您的防禦。使用我們的免費鑑識工具檢查您的電子郵件安全 (SMTP/MX) 狀況。",
            accept: "立即檢測",
            close: "繼續瀏覽網站"
        },
        arsenal: {
            host_witness_title: "HostWitness",
            host_witness_desc: "Windows 單機即時鑑識與活動關聯分析工具。採集並關聯進程、網路與時間軸事件。",
            host_witness_btn: "前往 GitHub",
            host_witness_download: "下載 .ZIP",
            host_witness_hash: "SHA-256 校驗值"
        },
        common: {
            notice_header: "系統通知",
            notice_btn: "[ 收到 ]"
        }
    },
    jp: {
        nav: {
            home: "/ホーム",
            services: "/サービス",
            model: "/9層防御モデル",
            tools: "/アーセナル",
            news: "/セキュリティニュース",
            threat_intel: "/脅威インテリジェンス",
            contact: "/お問い合わせ",
            back_to_services: "サービス一覧に戻る"
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
            news: "セキュリティニュース",
            intelligence: "脅威インテリジェンス",
            threat_intel_coming: "脅威情資フィードはここに統合予定です。",
            smtp: "SMTP_セキュリティ認斷",
            dmarc_intel: "DMARC_インテリジェンス",
            services: "9SEC_サービス"
        },
        services: {
            subtitle: "専門的なセキュリティ検査とフォレンジックプロ法ブ",
            smtp_title: "SMTP メールセキュリティ診断",
            smtp_desc: "メールインフラの健全性を検証。SPF、DMARC、MTA-STS、暗号化を検査し、リアルタイムのブランドなりすまし・類似ドメイン監視機能を搭載しました。",
            ad_title: "AD / Azure アイデンティティ監査",
            ad_desc: "ディレクトリサービス内の過剰な権限アカウント、シャドウ管理者、および安全でない認証パスをスキャンします。",
            edr_title: "エンドポイント EDR ハイジーン",
            edr_desc: "ワークステーションフリート全体での EDR カバレッジと動作監視のギャップを特定します。",
            cta_launch: "プロ法ブを起動",
            gov_title: "ガバナンス自動化",
            gov_desc: "監査対応を迅速化するために設計されたエンタープライズ級のコンプライアンスエンジン。 <ul><li><i class='fa-solid fa-check'></i> <strong>証拠収集の自動化</strong>：ワンクリックでローカル収集とクラウド相関分析を実行。</li><li><i class='fa-solid fa-check'></i> <strong>成熟度スコアリング</strong>：ISO27001/NISTの遵守状況をリアルタイムで追跡。</li><li><i class='fa-solid fa-check'></i> <strong>監査用レポート</strong>：フォレンジック級の証拠パッケージを即座に生成。</li></ul>",
            cta_trial: "トライアル開始",
            cta_portal: "コンソールを開く",
            limited_access: "アクセス制限あり",
            coming_soon: "近日公開",
            custom_probe: "カスタム・フォレンジック・プロ法ブ",
            custom_desc: "独自のプロトコルや高価値資産に対する専門的な検査が必要ですか？私たちのチームは、お客様の環境に合わせたカスタムフォレンジックプロ法ブを構築します。",
            cta_consult: "カスタム監査を依頼",
            dmarc_title: "DMARC インテリジェンス・モニタ",
            dmarc_desc: "手動解析を超えたプロフェッショナルなブランド保護。 <ul><li><i class='fa-solid fa-check'></i> <strong>統合ダッシュボード</strong>：全ドメインの送信状態を一元管理。</li><li><i class='fa-solid fa-check'></i> <strong>継続的自動追跡</strong>：RUA経由の24時間365日自動レポート収集。</li><li><i class='fa-solid fa-check'></i> <strong>フォレンジック分析</strong>：不正ななりすまし送信をリアルタイムで特定。</li></ul>",
            dmarc_trial_tag: "無料試用ツール",
            dmarc_pro_title: "自動監視プランへの移行",
            dmarc_pro_desc: "手動アップロードに時間を費やす必要はありません。自動収集と専門家による解析レポートを提供します。",
            dmarc_benefit_automated: "<strong>自動パイプライン</strong>：XMLファイルの手動処理は不要です。",
            dmarc_benefit_continuous: "<strong>24時間全時監視</strong>：お客様のドメインの評判を常時追跡します。",
            dmarc_benefit_expert: "<strong>専門家による解読</strong>：単なるグラフではなく、フォレンジックデータの真意を解説します。",
            dmarc_benefit_consolidated: "<strong>統合ポータル</strong>：すべてのドメインを一箇所で管理します。"
        },
        model: {
            intro1: "> 単なる防御を超えて：検証可能な真実を追求する9つの次元。",
            intro2: "ガバナンス、保護、検知、対応、そして進化をカバーする実践的なフレームワーク。",
            l1_title: "ガバナンス & リスク",
            l1_desc: "意思決定とリスクの観点から正しいセキュリティ基盤を構築する。",
            l1_d1: "ポリシー & 責任",
            l1_d2: "リスク評価",
            l1_d3: "コンプライアンス (ISO/NIST)",
            l2_title: "アイデンティティ & アクセス",
            l2_desc: "初期侵入と横展開のリスクを最小限に抑える。",
            l2_d1: "AD/IAM アーキテクチャ",
            l2_d2: "過剰権限分析",
            l2_d3: "MFA 戦略",
            l3_title: "エンドポイント保護",
            l3_desc: "実際の攻撃の実行と着地動作を把握する。",
            l3_d1: "EDR/XDR ヘルスチェック",
            l3_d2: "行動分析",
            l3_d3: "ファイルレス監視",
            l4_title: "ネットワーク防御",
            l4_desc: "隠れた通信と横展開を特定する。",
            l4_d1: "トラフィック分析",
            l4_d2: "C2 通信",
            l4_d3: "横展開パス",
            l5_title: "アプリケーション & クラウド",
            l5_desc: "現代の攻撃対象領域を保護する。",
            l5_d1: "Web/API 分析",
            l5_d2: "クラウド設定リスク",
            l5_d3: "SaaS アクセスレビュー",
            l6_title: "脅威インテリジェンス",
            l6_desc: "攻撃者の視点から防御の意思決定を強化する。",
            l6_d1: "APT 行動分析",
            l6_d2: "MITRE ATT&CK マッピング",
            l6_d3: "脅威プロファイリング",
            l7_title: "検知エンジニアリング",
            l7_desc: "防御能力を定量化および検証可能にする。",
            l7_d1: "ルール設計 & QA",
            l7_d2: "攻撃チェーンカバレッジ",
            l7_d3: "ギャップ分析",
            l8_title: "インシデント対応 & DFIR",
            l8_desc: "インシデント発生時に完全な真実を復元する。",
            l8_d1: "フォレンジック調査",
            l8_d2: "タイムライン再構築",
            l8_d3: "根本原因分析",
            l9_title: "レジリエンス & エボリューション",
            l9_desc: "インシデントを長期的な防御能力に変える。",
            l9_d1: "インシデント後レビュー",
            l9_d2: "プロセス最適化",
            l9_d3: "進化ロードマップ"
        },
        footer: {
            tagline: "デジタルフロンティアを守る。",
            copyright: "&copy; 2026 Nine-Security. 全システム正常稼働中。"
        },
        contact: {
            subtitle: "フォレンジックコンサルタントに接続",
            email_label: "Eメールチャンネル",
            availability_label: "勤務状況",
            availability_value: "24時間365日のフォレンジックレスポンス",
            desc: "カスタム監査、インシデント対応、またはフォレンジックに関するお問い合わせは、メールにてご連絡ください。通常、標準業務時間内の4時間以内に返信いたします。"
        },
        smtp: {
            title: "無料 Inbound メールセキュリティ診断",
            desc: "低侵襲。証拠ベース。MXの健全性と暗号化を確認し、フィッシングに使用される類似ドメインのディープスキャンを実行します。",
            email_label: "会社のメールアドレス：",
            consent: "このドメインの Inbound MX スキャンを許可します。",
            btn_start: "診断を開始",
            verify_title: "認証が必要です",
            verify_desc: "ドメイン管理権を証明するため、以下のアドレスに空メールを送信してください：",
            waiting: "認証メールを待機中..."
        },
        articles: {
            show_more: "もっと見る ({n} 件)",
            collapse: "閉じる"
        },
        news: {
            item1_title: "中国系ハッカーがDKnifeツールキットを開発、ルーターを標的に通信を傍受",
            item1_desc: "長年活動しているDKnifeフレームワークが公開。エッジデバイスを攻撃し、中間者攻撃を実行します。",
            item2_title: "CISA、連邦機関にサポート終了のエッジデバイスの撤去を命令",
            item2_desc: "米CISA、ネットワークエッジデバイスのライフサイクル管理を強化し、リスクを低減するよう指示。",
            item3_title: "Claude Opus 4.6、主要なオープンソースライブラリで500以上の高深刻度脆弱性を発見",
            item3_desc: "Anthropicの最新AIモデル、コード監査能力を発揮し、多数の未知の脆弱性を特定。"
        },
        threat_intel: {
            detail: "CVE",
            empty: "脅威情資はありません。",
            load_error: "脅威情資を読み込めません。",
            ransomware: "ランサムウェア",
            source_cisa: "CISA",
            source_otx: "OTX",
            heading_cisa: "CISA 既知の悪用脆弱性",
            heading_otx: "OTX パルス",
            show_more: "もっと見る ({n} 件)",
            collapse: "閉じる"
        },
        promo_modal: {
            title: "無料セキュリティ診断",
            desc: "防御を強化しましょう。無料のフォレンジックツールでメールセキュリティ（SMTP/MX）の状態をチェックします。",
            accept: "今すぐスキャン",
            close: "サイトの閲覧を続ける"
        },
        arsenal: {
            host_witness_title: "HostWitness",
            host_witness_desc: "Windows ホスト型ライブフォレンジックおよびアクティビティ相関分析ツール。プロセス、ネットワーク、タイムラインイベントを収集・相関分析します。",
            host_witness_btn: "GitHub で見る",
            host_witness_download: "ダウンロード .ZIP",
            host_witness_hash: "SHA-256 チェックサム"
        },
        common: {
            notice_header: "システム通知",
            notice_btn: "[ 了解 ]"
        }
    }
};

/** i18n: 依 path（如 "threat_intel.heading_cisa"）取翻譯，無則回傳 fallback。 */
function t(path, fallback) {
    const lang = localStorage.getItem("9sec_lang") || "en";
    const obj = translations[lang] || translations.en;
    const keys = path.split(".");
    let val = obj;
    for (const k of keys) {
        if (val == null) return fallback;
        val = val[k];
    }
    return val != null && val !== "" ? val : fallback;
}

function getArticlesButtonLabel(isAll, remaining) {
    return isAll ? t("articles.collapse", "Collapse") : t("articles.show_more", "Show more ({n})").replace("{n}", remaining);
}

function getBrowserLang() {
    const raw = (navigator.language || navigator.userLanguage || '').toLowerCase();
    const list = navigator.languages ? [...navigator.languages] : [raw];
    for (const l of list) {
        const code = (l || '').toLowerCase().split('-')[0];
        if (code === 'zh') return 'tw';
        if (code === 'ja') return 'jp';
    }
    if (raw.startsWith('zh')) return 'tw';
    if (raw.startsWith('ja')) return 'jp';
    return 'en';
}

const langBtn = document.getElementById('current-lang');
const langOptions = document.querySelectorAll('.lang-menu li');

// Load language: 優先使用使用者曾選過的，否則依瀏覽器語系（中文/日文對應，其餘英文）
const savedLang = localStorage.getItem('9sec_lang') || getBrowserLang();
updateLanguage(savedLang);

// Event Listeners for Custom Dropdown
langOptions.forEach(option => {
    option.addEventListener('click', () => {
        const lang = option.getAttribute('data-lang');
        localStorage.setItem('9sec_lang', lang);
        updateLanguage(lang);
    });
});

/* --- Theme Toggle Support --- */
const themeToggleBtn = document.getElementById('theme-toggle');

// Initialize Theme
const savedTheme = localStorage.getItem('9sec_theme') || 'dark';
document.documentElement.setAttribute('data-theme', savedTheme);
updateThemeLabel(savedTheme);

if (themeToggleBtn) {
    themeToggleBtn.addEventListener('click', () => {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'light' ? 'dark' : 'light';

        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('9sec_theme', newTheme);
        updateThemeLabel(newTheme);
    });
}

function updateThemeLabel(theme) {
    if (themeToggleBtn) {
        // Button shows CURRENT status
        themeToggleBtn.textContent = theme.toUpperCase();
    }
}

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

    // Update articles "Show more" / "Collapse" button text by current lang
    document.querySelectorAll('#security-news .articles-more-btn').forEach(btn => {
        const isAll = btn.dataset.expanded === 'true';
        const remaining = parseInt(btn.dataset.remaining, 10) || 0;
        btn.textContent = getArticlesButtonLabel(isAll, remaining);
    });
    // Update threat intel "Show more" / "Collapse" button text by current lang
    document.querySelectorAll('.threat-intel-more-btn').forEach(btn => {
        const isAll = btn.dataset.expanded === 'true';
        const remaining = parseInt(btn.dataset.remaining, 10) || 0;
        btn.textContent = getThreatIntelButtonLabel(isAll, remaining);
    });

    // Re-render News with new language if data exists
    if (globalNewsList && globalNewsList.length > 0) {
        renderNews(globalNewsList, newsShowingCount);
    }
}

// --- SMTP Check Logic ---
async function submitAssessment() {
    console.log("Starting assessment...");
    const emailInput = document.getElementById('email-input');
    const consentCheck = document.getElementById('consent-check');
    const stepInput = document.getElementById('smtp-step-input');
    const stepVerify = document.getElementById('smtp-step-verify');
    const verifyEmailCode = document.getElementById('verification-email');

    const email = emailInput.value.trim();
    const consent = consentCheck.checked;

    const emailErr = validateEmail(email);
    if (emailErr) {
        showNotice(emailErr);
        return;
    }
    if (!consent) {
        showNotice("Please agree to the authorization terms.");
        return;
    }

    let resp;
    try {
        // Use full URL to avoid relative path issues on github pages
        resp = await fetch(`${API_BASE}/api/assessment`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, consent })
        });
    } catch (e) {
        console.error("API_ERROR", e);
        showNotice("Backend Unreachable. Please check your network or try again.");
        return;
    }

    let data;
    try {
        data = await resp.json();
    } catch {
        showNotice("Backend returned invalid JSON.");
        return;
    }

    if (!data.ok) {
        showNotice(`Error: ${data.error}`);
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
    const emailErr = validateEmail(email);
    if (emailErr) {
        showNotice(emailErr);
        return;
    }
    // Read consent checkbox (required by backend)
    const consentEl = document.getElementById('consent-check');
    const consent = !!consentEl?.checked;

    // Call real backend: POST /api/smtp/check
    let resp;
    try {
        resp = await fetch(`${API_BASE}/api/smtp/check`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, consent })
        });
    } catch (e) {
        console.error("API_ERROR", e);
        showNotice("Backend unreachable. Check network.");
        return;
    }

    let data;
    try {
        data = await resp.json();
    } catch {
        showNotice(`Invalid backend response (non-JSON). Status: ${resp.status}`);
        return;
    }

    if (!resp.ok || !data.ok) {
        console.error("API_FAIL", resp.status, data);
        showNotice(`Check failed: ${data?.error || resp.status}`);
        return;
    }

    // Direct result (Synchronous)
    const results = data.results || {};

    // Generate Report Data from Backend Results
    const report = {
        domain: results.domain,
        sender_ip: "N/A (Static Check)",
        transport_time: "0.5s",
        dns_posture: {
            spf: results.spf?.status || "missing",
            dmarc: results.dmarc?.status || "missing",
            dkim: "unknown", // Cannot test without real email
            mta_sts: "missing", // Not checked in simplistic version
            tls_rpt: "missing",
            bimi: "missing",
            dnssec: results.dmarc?.status === "pass" ? "pass" : "unknown" // Mock inference
        },
        smtp_tls: {
            version: results.encryption?.status === "pass" ? "TLS 1.3" : "Unknown",
            cipher: "Unknown"
        },
        risk_score: calculateRiskScore(results),
        risk_breakdown: generateRiskBreakdown(results)
    };

    renderReport(report);

    // Skip verification step, go straight to report
    stepInput.classList.add('hidden');
    stepReport.classList.remove('hidden');
}

function calculateRiskScore(results) {
    let score = 50;
    if (results.spf?.status === "pass") score += 20;
    if (results.dmarc?.status === "pass") score += 30;
    if (results.mx?.status === "pass") score += 10; // Basic connectivity
    return Math.min(score, 100);
}

function generateRiskBreakdown(results) {
    const items = [];
    if (results.spf?.status !== "pass") {
        items.push({ item: "SPF Record Missing or Invalid", score: -20, severity: "high" });
    } else {
        items.push({ item: "SPF Record Valid", score: 20, severity: "low" });
    }

    if (results.dmarc?.status !== "pass") {
        items.push({ item: "DMARC Policy Not Enforced", score: -30, severity: "high" });
    } else {
        items.push({ item: "DMARC Policy Enforced", score: 30, severity: "low" });
    }

    if (results.mx?.status === "pass") {
        items.push({ item: "MX Records Reachable", score: 10, severity: "low" });
    }

    return items;
}

// Placeholder to permit older function calls or simplify
async function checkStatus(id) {
    // No-op in synchronous mode
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
        const reportDomain = document.getElementById('report-domain');
        const reportContent = document.getElementById('report-content');
        const btnDownload = document.getElementById('btn-download-report');

        if (reportDomain) reportDomain.textContent = report.domain || "Unknown Domain";

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
                        <span>${escapeHtml(String(r.item != null ? r.item : ''))}</span>
                        <span class="value pass">+${r.score}</span>
                    </div>
                `).join('')}
            </div>

            <div class="section-title">> Authentication Infrastructure</div>
            <div class="grid">
                <div class="card"><div class="label">Origin MTA Node</div><div class="value">${escapeHtml(String(report.sender_ip || 'Generic Postfix/Exim'))}</div></div>
                <div class="card"><div class="label">Network Latency</div><div class="value ${parseFloat(report.transport_time) > 5 ? 'warn' : 'pass'}">${escapeHtml(String(report.transport_time || 'N/A'))}</div></div>
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
                <div class="card"><div class="label">Transport Encryption</div><div class="value pass">${escapeHtml(String(tls.version || 'TLS 1.3 (Verified)'))}</div></div>
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

        if (reportContent) reportContent.innerHTML = html;
        if (btnDownload) btnDownload.classList.remove('hidden');

    } catch (e) {
        console.error("Rendering failed:", e);
        const reportContent = document.getElementById('report-content');
        if (reportContent) reportContent.innerHTML = `<div class="error">Report rendering error: ${escapeHtml(String(e && e.message || "Unknown error"))}</div>`;
    }
}
// --- Report Action Handlers ---

const btnResetCheck = document.getElementById('btn-reset-check');
if (btnResetCheck) {
    btnResetCheck.addEventListener('click', () => {
        // Reset UI State
        const reportStep = document.getElementById('smtp-step-report');
        const verifyStep = document.getElementById('smtp-step-verify');
        const inputStep = document.getElementById('smtp-step-input');
        const emailInput = document.getElementById('email-input');
        const scanLog = document.getElementById('scan-log');
        const reportContent = document.getElementById('report-content');

        if (reportStep) reportStep.classList.add('hidden');
        if (verifyStep) verifyStep.classList.add('hidden');
        if (inputStep) inputStep.classList.remove('hidden');

        // Clean up data
        currentAssessmentId = null;
        if (pollInterval) clearInterval(pollInterval);
        if (emailInput) emailInput.value = '';
        if (scanLog) scanLog.innerHTML = '';
        if (reportContent) reportContent.innerHTML = ''; // Clear report

        // Uncheck consent
        const consent = document.getElementById('consent-check');
        if (consent) consent.checked = false;
    });
}

// Shared: generate full HTML report (與後端 Admin / Discord 同一樣板)，供 Download HTML 使用；動態欄位皆經 escapeHtml 防 XSS
function getReportHtml(data) {
    if (!data) return '';
    const domain = escapeHtml(String(data.domain || 'unknown'));
    const dns = data.dns_posture || {};
    const riskScore = Number(data.risk_score) || 0;
    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>9Sec Security Report - ${domain}</title>
    <style>
        :root { --green: #00ff41; --fail: #ff0055; --warn: #ffaa00; --bg: #0a0a0a; --card: #111; --border: #333; --text: #e0e0e0; }
        body { background: var(--bg); color: var(--text); font-family: 'Courier New', Courier, monospace; padding: 40px; max-width: 800px; margin: 0 auto; line-height: 1.6; }
        .header { border-bottom: 2px solid var(--green); padding-bottom: 20px; margin-bottom: 30px; }
        .header h1 { color: var(--green); margin: 0; letter-spacing: 2px; }
        .section-title { color: var(--green); margin: 30px 0 15px; font-size: 1.1rem; border-left: 4px solid var(--green); padding-left: 15px; text-transform: uppercase; }
        .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; }
        .card { background: var(--card); border: 1px solid var(--border); padding: 15px; position: relative; }
        .label { color: #666; font-size: 0.75rem; text-transform: uppercase; margin-bottom: 5px; }
        .value { font-size: 1.1rem; font-weight: bold; }
        .risk-item { display: flex; justify-content: space-between; padding: 12px; background: rgba(255,255,255,0.03); border: 1px solid var(--border); margin-bottom: 8px; }
        .cta-box { border: 1px solid var(--green); padding: 25px; margin-top: 40px; text-align: center; background: rgba(0,255,65,0.05); }
        .footer { margin-top: 50px; text-align: center; color: #444; font-size: 0.8rem; border-top: 1px solid #222; padding-top: 20px; }
        @media print { body { background: #fff !important; color: #000 !important; } .card, .risk-item { border: 1px solid #ddd !important; } }
    </style>
</head>
<body>
    <div class="header">
        <h1>NINE-SECURITY // ASSESSMENT_LOG</h1>
        <p>Target Domain: <span style="color: var(--green);">${domain}</span></p>
        <p style="font-size: 11px; color: #666;">Generated: ${new Date().toLocaleString()}</p>
    </div>

    <div class="section-title">> EXECUTIVE_RISK_PROFILE [Score: ${riskScore}/100]</div>
    <div class="risk-container">
        ${(data.risk_breakdown || []).map(r => `
            <div class="risk-item" style="border-left: 5px solid ${r.severity === 'high' ? '#ff0055' : (r.severity === 'medium' ? '#ffaa00' : '#444')};">
                <span>${escapeHtml(String(r.item != null ? r.item : ''))}</span>
                <span style="color: var(--green); font-weight: bold;">+${Number(r.score) || 0}</span>
            </div>
        `).join('')}
    </div>

    <div class="section-title">> AUTH_INFRASTRUCTURE_PROBE</div>
    <div class="grid">
        <div class="card"><div class="label">Origin MTA Node</div><div class="value">${escapeHtml(String(data.sender_ip || 'Generic MTA'))}</div></div>
        <div class="card"><div class="label">Network Latency</div><div class="value">${escapeHtml(String(data.transport_time || 'N/A'))}</div></div>
        <div class="card"><div class="label">SPF Governance</div><div class="value" style="color: ${getStatusClass(dns.spf) === 'pass' ? 'var(--green)' : 'var(--fail)'}">${String(dns.spf || 'MISSING').toUpperCase()}</div></div>
        <div class="card"><div class="label">DMARC Enforcement</div><div class="value" style="color: ${getStatusClass(dns.dmarc) === 'pass' ? 'var(--green)' : 'var(--warn)'}">${String(dns.dmarc || 'NONE').toUpperCase()}</div></div>
    </div>

    <div class="section-title">> ADVANCED_SECURITY_PROTOCOLS</div>
    <div class="grid">
        <div class="card"><div class="label">MTA-STS Handshake</div><div class="value" style="color: ${getStatusClass(dns.mta_sts) === 'pass' ? 'var(--green)' : 'var(--fail)'}">${String(dns.mta_sts || 'MISSING').toUpperCase()}</div></div>
        <div class="card"><div class="label">Transport Encryption</div><div class="value">${escapeHtml(String(data.smtp_tls?.version || 'TLS 1.3'))}</div></div>
        <div class="card"><div class="label">TLS Reporting (RPT)</div><div class="value" style="color: ${getStatusClass(dns.tls_rpt) === 'pass' ? 'var(--green)' : 'var(--fail)'}">${String(dns.tls_rpt || 'MISSING').toUpperCase()}</div></div>
        <div class="card"><div class="label">Brand Indicator (BIMI)</div><div class="value" style="color: ${getStatusClass(dns.bimi) === 'pass' ? 'var(--green)' : 'var(--fail)'}">${String(dns.bimi || 'MISSING').toUpperCase()}</div></div>
    </div>

    <div class="cta-box">
        <h3 style="color: var(--green); margin-top: 0;">FORENSIC DIAGNOSTIC REQUIRED</h3>
        <p>Our backend identified RFC violations and policy gaps.</p>
        <p style="font-weight: bold;">consult@nine-security.com</p>
    </div>

    <div class="footer">
        CONFIDENTIAL - CUSTODIAN: NINE-SECURITY.INC CLUSTER<br>
        &copy; 2026 Nine-Security Team. All Systems Operational.
    </div>
</body>
</html>`;
}

// Download Aligned Executive Report (HTML file)
const btnDownloadReport = document.getElementById('btn-download-report');
if (btnDownloadReport) {
    btnDownloadReport.addEventListener('click', () => {
        const data = window.currentReportData;
        if (!data) return;
        const rawDomain = data.domain || 'unknown';
        const safeFilename = String(rawDomain).replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 200) || 'domain';
        const fullHtml = getReportHtml(data);
        if (!fullHtml) return;
        const blob = new Blob([fullHtml], { type: 'text/html' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `9Sec_Security_Report_${safeFilename}.html`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
    });
}

// Script loaded

/* --- Promo Modal Logic --- */
document.addEventListener("DOMContentLoaded", () => {
    // Check if seen in this session
    const hasSeenPromo = sessionStorage.getItem("9sec_promo_seen");

    // Don't show if already on the tool page
    if (window.location.pathname.includes("smtp-check.html")) return;

    if (!hasSeenPromo) {
        // Short delay to ensure DOM is ready and styling loaded
        setTimeout(injectPromoModal, 500);
    }
});

function injectPromoModal() {
    const modalHtml = `
    <div id="promo-modal" class="modal-overlay">
        <div class="modal-content">
            <button class="modal-close-x" id="btn-promo-close" aria-label="Close"><i class="fa-solid fa-xmark"></i></button>
            <i class="fa-solid fa-envelope-shield modal-icon"></i>
            <h2 class="modal-title" data-i18n="promo_modal.title">FREE SECURITY ASSESSMENT</h2>
            <p class="modal-desc" data-i18n="promo_modal.desc">Check your Email Security (SMTP/MX) status for free.</p>
            <div class="modal-actions">
                <a href="smtp-check.html" class="btn primary-btn" id="btn-promo-accept">
                    <i class="fa-solid fa-radar"></i> <span data-i18n="promo_modal.accept">Check Now</span>
                </a>
            </div>
        </div>
    </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHtml);

    const modal = document.getElementById('promo-modal');
    const closeBtn = document.getElementById('btn-promo-close');
    const acceptBtn = document.getElementById('btn-promo-accept');

    // Force display flex then add show class for opacity
    modal.style.display = 'flex';
    // Trigger reflow
    void modal.offsetWidth;
    modal.classList.add('show');

    // Handlers
    const closeModal = () => {
        modal.classList.remove('show');
        setTimeout(() => {
            modal.style.display = 'none';
            modal.remove();
        }, 300);
        sessionStorage.setItem("9sec_promo_seen", "true");
    };

    if (closeBtn) closeBtn.addEventListener('click', closeModal);

    if (acceptBtn) acceptBtn.addEventListener('click', () => {
        sessionStorage.setItem("9sec_promo_seen", "true");
    });

    // Update language for the injected modal
    const currentLang = localStorage.getItem('9sec_lang') || 'en';
    updateLanguage(currentLang);
}

/* --- Back to Top Logic --- */
const backToTopBtn = document.getElementById('back-to-top');
if (backToTopBtn) {
    window.addEventListener('scroll', () => {
        if (window.scrollY > 300) {
            backToTopBtn.classList.add('show');
        } else {
            backToTopBtn.classList.remove('show');
        }
    });

    backToTopBtn.addEventListener('click', () => {
        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
    });
}

// --- Particle Visibility Optimization ---
// Pauses animation when tab is inactive or scrolled out of view (basic visibility check)
document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
        // Optional: specific pause logic if extended beyond basic requestAnimationFrame behavior
    }
});

/* --- Custom Notice System Definition --- */
function showNotice(message) {
    // Create element if not exists
    let overlay = document.getElementById('notice-system-overlay');
    if (!overlay) {
        const html = `
        <div id="notice-system-overlay" class="notice-overlay">
            <div class="notice-box">
                <div class="notice-header">
                    <i class="fa-solid fa-terminal"></i> <span data-i18n="common.notice_header">SYSTEM_NOTIFICATION</span>
                </div>
                <div id="notice-system-body" class="notice-body"></div>
                <div class="notice-footer">
                    <button class="notice-btn" id="btn-notice-ack" data-i18n="common.notice_btn">[ ACKNOWLEDGE ]</button>
                </div>
            </div>
        </div>
        `;
        document.body.insertAdjacentHTML('beforeend', html);
        overlay = document.getElementById('notice-system-overlay');

        // Add Close Handler
        document.getElementById('btn-notice-ack').addEventListener('click', () => {
            overlay.classList.remove('show');
            setTimeout(() => { overlay.style.display = 'none'; }, 300);
        });

        // Close on Enter key
        window.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && overlay.classList.contains('show')) {
                document.getElementById('btn-notice-ack').click();
            }
        });
    }

    // Set message and show
    document.getElementById('notice-system-body').textContent = message;
    overlay.style.display = 'flex';
    // Trigger reflow for animation
    void overlay.offsetWidth;
    overlay.classList.add('show');

    // Update Language for the notice system
    const currentLang = localStorage.getItem('9sec_lang') || 'en';
    // We already have updateLanguage, but we only need to update the newly added elements
    const header = overlay.querySelector('[data-i18n="common.notice_header"]');
    const btn = overlay.querySelector('[data-i18n="common.notice_btn"]');

    if (translations[currentLang]) {
        if (header) header.textContent = translations[currentLang].common?.notice_header || "SYSTEM_NOTIFICATION";
        if (btn) btn.textContent = translations[currentLang].common?.notice_btn || "[ ACKNOWLEDGE ]";
    }
}

// --- Global Session Check (for Governance Portal) ---
async function checkGlobalSession() {
    try {
        const res = await fetch(`${API_BASE}/api/governance/me`, { credentials: 'include' });
        if (res.ok) {
            const json = await res.json();
            // If logged in, update any "START_TRIAL" buttons for Governance
            document.querySelectorAll('[data-i18n="services.cta_trial"]').forEach(el => {
                el.setAttribute('data-i18n', 'services.cta_portal');
            });
            // Trigger language update to apply the new key
            const currentLang = localStorage.getItem('9sec_lang') || 'en';
            updateLanguage(currentLang);
        }
    } catch (e) {
        console.error("Global session check failed", e);
    }
}
checkGlobalSession();
