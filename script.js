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
            intelligence: "/Intelligence"
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
            intelligence: "Threat_Intelligence"
        },
        model: {
            intro1: "> OSI is for Communication. 9SEC is for Operations.",
            intro2: "A practical framework covering Governance, Protection, Detection, Response, and Evolution."
        },
        footer: {
            tagline: "Securing the digital frontier.",
            copyright: "&copy; 2026 Nine-Security. All Systems Operational."
        }
    },
    tw: {
        nav: {
            home: "/首頁",
            model: "/九層防護模型",
            tools: "/軍火庫",
            intelligence: "/威脅情資"
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
            intelligence: "威脅情資"
        },
        model: {
            intro1: "> OSI 是為了通訊而生，9SEC 是為了作戰而生。",
            intro2: "一個涵蓋治理、防護、偵測、應變與演進的實戰框架。"
        },
        footer: {
            tagline: "捍衛數位邊疆。",
            copyright: "&copy; 2026 Nine-Security. 系統正常運作中。"
        }
    },
    jp: {
        nav: {
            home: "/ホーム",
            model: "/9層防御モデル",
            tools: "/アーセナル",
            intelligence: "/脅威インテリジェンス"
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
            intelligence: "脅威インテリジェンス"
        },
        model: {
            intro1: "> OSIは通信のため、9SECは運用のために。",
            intro2: "ガバナンス、保護、検知、対応、そして進化をカバーする実践的なフレームワーク。"
        },
        footer: {
            tagline: "デジタルフロンティアを守る。",
            copyright: "&copy; 2026 Nine-Security. 全システム正常稼働中。"
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
