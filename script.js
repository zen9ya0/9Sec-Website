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
