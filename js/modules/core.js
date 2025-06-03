const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');



function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}
resizeCanvas();
window.addEventListener('resize', resizeCanvas);

const zzfx = (...t) => {
    try {
        let e = new AudioContext();
        let n = e.createBuffer(1, 44100 * (t[1] || .5), 44100);
        let s = n.getChannelData(0);
        for (let i = 0; i < s.length; i++) {
            let a = i / 44100;
            s[i] = Math.sin(2 * Math.PI * (t[0] || 440) * a) * Math.exp(-a * (t[2] || 1)) * (t[3] || 0.3);
        }
        let o = e.createBufferSource();
        o.buffer = n;
        o.connect(e.destination);
        o.start();
    } catch (error) {
        console.warn('Audio playback failed:', error);
        // Silently fail - don't break the game if audio fails
    }
};


const sounds = {
    engine: () => zzfx(80, 0.3, 0.5, 0.1),
    brake: () => zzfx(150, 0.2, 2, 0.2),
    collision: () => zzfx(200, 0.5, 5, 0.3),
    levelUp: () => zzfx(523, 0.3, 0.1, 0.2),
    victory: () => zzfx(659, 1, 0.1, 0.3),
    beep: () => zzfx(800, 0.1, 1, 0.1)
};


let gameState = 'menu';
let showMiniMap = false;
let freeRideMode = false;
let musicEnabled = true;
let soundEnabled = true;


let player = {
    x: canvas.width / 2,
    y: canvas.height - 100,
    width: 30,
    height: 60,
    speed: 0,
    maxSpeed: 8,
    acceleration: 0.3,
    friction: 0.95,
    lane: 1,
    plateNumber: "RWA-2025"
};


let level = 1;
let distance = 0;
let score = 0;
let gameTime = 0;
let hillOffset = 0;
let roadOffset = 0;
let aiCars = [];
let obstacles = [];
let signposts = [];
let particles = [];
let keys = {};
let menuAnimation = 0;


const lanePositions = [canvas.width / 2 - 160, canvas.width / 2, canvas.width / 2 + 160];


function initSignposts() {
    const messages = [
        "Visit Rwanda", "Innovation Hub", "Rwandan Coffee Energy!",
        "Digital Horizon Ahead!", "Rulindo District Ahead!",
        "Future Skills Drive!", "Innovation Hub - Powered by Youth",
        "Kigali Tech City", "Land of a Thousand Hills"
    ];

    signposts = [];
    const roadWidth = 320;
    const baseX = canvas.width / 2;
    const roadLeft = baseX - roadWidth / 2;
    const roadRight = baseX + roadWidth / 2;
    const margin = 50; // Margin from road edge

    for (let i = 0; i < 10; i++) {
        const side = Math.random() > 0.5 ? 'left' : 'right';
        let x;

        if (side === 'left') {
            // Place on left side of road
            x = roadLeft - margin - Math.random() * 100;
        } else {
            // Place on right side of road
            x = roadRight + margin + Math.random() * 100;
        }

        signposts.push({
            x: x,
            y: i * canvas.height / 3,
            message: messages[Math.floor(Math.random() * messages.length)],
            side: side,
            animation: Math.random() * Math.PI * 2
        });
    }
}


let musicContext;
let musicGain;
let musicOscillator;

function initMusic() {
    if (!musicContext) {
        musicContext = new AudioContext();
        musicGain = musicContext.createGain();
        musicGain.gain.value = 0.1;
        musicGain.connect(musicContext.destination);
    }
}

function playBackgroundMusic() {
    if (musicOscillator) musicOscillator.stop();
    musicOscillator = musicContext.createOscillator();
    musicOscillator.frequency.setValueAtTime(220, musicContext.currentTime);
    musicOscillator.type = 'sine';
    musicOscillator.connect(musicGain);
    musicOscillator.start();
}


function createParticles(x, y, color = '#FFD700', count = 10) {
    for (let i = 0; i < count; i++) {
        particles.push({
            x: x + (Math.random() - 0.5) * 20,
            y: y + (Math.random() - 0.5) * 20,
            vx: (Math.random() - 0.5) * 8,
            vy: (Math.random() - 0.5) * 8,
            life: 30,
            maxLife: 30,
            color: color,
            size: Math.random() * 4 + 2
        });
    }
}

function updateParticles() {
    particles = particles.filter(p => {
        p.x += p.vx;
        p.y += p.vy;
        p.life--;
        p.vx *= 0.98;
        p.vy *= 0.98;
        return p.life > 0;
    });
}

function drawParticles() {
    particles.forEach(p => {
        const alpha = p.life / p.maxLife;
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * alpha, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    });
}