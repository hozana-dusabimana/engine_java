// import drawRoad from './road.js';

let isAccelerating = false;
let isBraking = false;
let isMovingLeft = false;
let isMovingRight = false;

let countdown = 3;
let countdownInterval = null;

let advertisementBanners = [];
const advertisementMessages = [
    "Future Skills Ahead!", "Drive Safely!", "Enjoy the View!",
    "RTB Competition!", "Visit Rwanda!"
];

// Advertisement banner dimensions (accessible by both update and draw functions)
const advertisementBannerHeight = 20;
const advertisementBannerWidth = 320; // Make banner wider than road width

function handleInput(event) {
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX !== undefined ? event.clientX - rect.left : event.touches[0].clientX - rect.left;
    const y = event.clientY !== undefined ? event.clientY - rect.top + 200 : event.touches[0].clientY - rect.top + 200;

    if (gameState === 'menu') {
        // Start countdown on any click/touch in the menu state
        if (countdownInterval === null) {
            gameState = 'countdown';
            countdown = 3;
            countdownInterval = setInterval(() => {
                countdown--;
                if (countdown < 0) {
                    clearInterval(countdownInterval);
                    countdownInterval = null;
                    startGame(); // Transition to playing after countdown
                }
            }, 1000);
        }
        return; // Prevent other actions while in menu
    }

    if (gameState === 'gameover' || gameState === 'victory') {
        // Transition to menu on any click/touch in gameover or victory state
        gameState = 'menu';
        resetGame();
        return; // Prevent other actions after transitioning
    }

    // Only process driving input if in playing state
    if (gameState === 'playing') {
        isMovingLeft = x < canvas.width / 2;
        isMovingRight = x >= canvas.width / 2;
        isAccelerating = y < canvas.height / 2;
        isBraking = y >= canvas.height / 2;
    }
}

function resetInput() {
    isAccelerating = false;
    isBraking = false;
    isMovingLeft = false;
    isMovingRight = false;
}

function startGame() {
    gameState = 'playing';
    resetGame(); // Reset game state when starting
}

function resetGame() {
    player.x = canvas.width / 2;
    player.y = canvas.height - 100;
    player.speed = 0;
    player.lane = 1;
    level = 1;
    distance = 0;
    score = 0;
    gameTime = 0;
    hillOffset = 0;
    curveOffset = 0; // Reset curve offset as well
    curveDirection = 0;
    hillDirection = 0;
    aiCars = [];
    obstacles = [];
    particles = [];
    advertisementBanners = []; // Clear advertisement banners
    lastBannerDistance = -1; // Reset lastBannerDistance to ensure first banner spawns correctly
    // Signposts are re-initialized in initGame, so no need to clear here
}

function drawCountdown() {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = '#FFF';
    ctx.font = 'bold 100px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Draw animating circle
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const radius = 80; // Radius of the circle
    const lineWidth = 10; // Thickness of the circle line
    const animationSpeed = 0.1; // Speed of the animation

    ctx.save(); // Save context state before animation

    // Animate scale based on countdown value
    const scale = 1 + (3 - countdown) * 0.1; // Scale up as countdown decreases
    ctx.translate(centerX, centerY);
    ctx.scale(scale, scale);
    ctx.translate(-centerX, -centerY);

    // Draw the circle
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)'; // White with some transparency
    ctx.lineWidth = lineWidth;
    ctx.beginPath();
    // Animate the circle arc (optional, but adds more animation)
    const endAngle = (countdown % 1) * Math.PI * 2; // Animate based on fractional part of countdown
    ctx.arc(centerX, centerY, radius, 0, Math.PI * 2); // Full circle for now
    ctx.stroke();

    ctx.restore(); // Restore context state

    if (countdown > 0) {
        ctx.fillText(countdown, canvas.width / 2, canvas.height / 2);
    } else {
        ctx.fillText('GO!', canvas.width / 2, canvas.height / 2);
    }
}

function drawAdvertisementBanners() {
    const roadWidth = 320;
    const baseX = canvas.width / 2;
    const segments = 100;
    const segmentHeight = canvas.height / segments;
    const poleTopWidth = 10;
    const poleBottomWidth = 80;

    // Save context state for banner drawing
    ctx.save();

    // Set global composite operation to ensure banners are drawn on top
    ctx.globalCompositeOperation = 'source-over';

    advertisementBanners.forEach(banner => {
        // Calculate perspective scaling factor
        const scaleFactor = (banner.y + 100) / (canvas.height + 100);
        const effectiveScaleFactor = Math.max(0.4, scaleFactor);

        // Calculate road center and edges at banner's y position
        const i = (canvas.height - banner.y) / segmentHeight;
        const roadXOffsetAtBannerY = curveOffset * 0.01 * i;
        const roadCenterAtBannerY = baseX + roadXOffsetAtBannerY * effectiveScaleFactor;
        const roadLeftAtBannerY = roadCenterAtBannerY - (roadWidth / 2) * effectiveScaleFactor;
        const roadRightAtBannerY = roadCenterAtBannerY + (roadWidth / 2) * effectiveScaleFactor;

        // Calculate banner perspective width using constant width
        const bannerPerspectiveWidth = advertisementBannerWidth;
        const bannerPerspectiveHeight = advertisementBannerHeight;

        // Position banner centered on the road with perspective
        const bannerPerspectiveX = roadCenterAtBannerY - bannerPerspectiveWidth / 2;

        const bannerBottomY = banner.y + bannerPerspectiveHeight;

        // Draw banner rectangle with slight transparency
        ctx.fillStyle = 'rgba(255, 255, 0, 0.95)';
        ctx.fillRect(bannerPerspectiveX, banner.y, bannerPerspectiveWidth, bannerPerspectiveHeight);
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 3 * effectiveScaleFactor;
        ctx.strokeRect(bannerPerspectiveX, banner.y, bannerPerspectiveWidth, bannerPerspectiveHeight);

        // Draw advertisement text
        ctx.fillStyle = '#000';
        ctx.font = `bold ${20 * effectiveScaleFactor}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(banner.message, roadCenterAtBannerY, banner.y + bannerPerspectiveHeight / 2);

        // Draw yellow pivots above the banner
        ctx.fillStyle = '#FFFF00';
        const pivotWidth = 90;
        const pivotHeight = 45;

        // Left pivot above banner
        const leftUpperPivotX = bannerPerspectiveX + bannerPerspectiveWidth * 0.25 - pivotWidth / 2;
        const leftUpperPivotY = banner.y - pivotHeight;
        ctx.fillRect(leftUpperPivotX, leftUpperPivotY, pivotWidth, pivotHeight);

        // Right pivot above banner
        const rightUpperPivotX = bannerPerspectiveX + bannerPerspectiveWidth * 0.75 - pivotWidth / 2;
        const rightUpperPivotY = banner.y - pivotHeight;
        ctx.fillRect(rightUpperPivotX, rightUpperPivotY, pivotWidth, pivotHeight);
    });

    // Restore context
    ctx.restore();
}

let lastBannerDistance = -1; // To track when to spawn the next banner - initialized to -1

function updateGame() {
    if (gameState !== 'playing') return;

    // Handle player input for moving to left
    if (keys['ArrowLeft'] || keys['KeyA'] || isMovingLeft) {
        if (player.lane > 0) {
            const targetX = lanePositions[player.lane - 1];
            player.x = Math.max(lanePositions[0] + player.width / 2, player.x - 4);
            if (player.x <= targetX + 10) {
                player.lane--;
            }
        }
    }

    // Handle player input for moving to right
    if (keys['ArrowRight'] || keys['KeyD'] || isMovingRight) {
        if (player.lane < 2) {
            const targetX = lanePositions[player.lane + 1];
            player.x = Math.min(lanePositions[2] - player.width / 2, player.x + 4);
            if (player.x >= targetX - 10) {
                player.lane++;
            }
        }
    }

    // Handle player input for moving up
    if (keys['ArrowUp'] || keys['KeyW'] || isAccelerating) {
        player.speed = Math.min(player.maxSpeed, player.speed + player.acceleration);
        if (soundEnabled && Math.random() < 0.1) sounds.engine();
    }

    // Handle player input for braking and decelerating
    if (keys['ArrowDown'] || keys['KeyS'] || keys['Space'] || isBraking) {
        player.speed = Math.max(0, player.speed - player.acceleration * 1.5);
        if (soundEnabled && Math.random() < 0.05) sounds.brake();
    }

    // Apply friction
    player.speed *= player.friction;

    // Update distance and score according to speed
    distance += player.speed * 0.5;
    score += Math.floor(player.speed * 0.2);

    //increase score based on speed

    if (player.speed > 6) {
        score += 2;
    }
    //increase score based on distance

    if (Math.floor(distance) % 50 === 0 && Math.floor(distance) > 0) {
        score += 25;
    }

    if (Math.floor(distance) % 100 === 0 && Math.floor(distance) > 0) {
        score += 50;
    }

    //victory condition            
    if (distance >= 1500 && !freeRideMode) {
        gameState = 'victory';
        sounds.victory();
        saveHighScore();
        return;
    }

    // Update and filter advertisement banners
    advertisementBanners = advertisementBanners.filter(banner => {
        banner.y += player.speed; // Move banner down based on player speed

        // Remove banner if it goes off-screen
        return banner.y < canvas.height + 50; // Keep banner until it's well off the bottom
    });

    //obstacles and  AI cars spawning logic
    if (Math.random() < 0.02 + level * 0.01) {
        spawnAICar();
    }


    if (Math.random() < 0.005 + level * 0.002) {
        spawnObstacle();
    }


    updateAICars();


    updateObstacles();


    updateSignposts();

    // Check for collisions with AI cars
    aiCars.forEach((car, index) => {
        if (Math.abs(player.x - car.x) < 25 && Math.abs(player.y - car.y) < 50) {
            sounds.collision();
            createParticles(player.x, player.y, '#FF4500', 15); //color hex from google color picker
            if (!freeRideMode) {
                gameState = 'gameover'; // Set game state to game over
                saveHighScore();
            }
        }
    });

    // Check for collisions with obstacles
    obstacles.forEach((obs, index) => {
        if (Math.abs(player.x - obs.x) < 20 && Math.abs(player.y - obs.y) < 30) {
            sounds.collision();
            createParticles(obs.x, obs.y, '#8B4513', 10);
            if (!freeRideMode) {
                player.speed *= 0.5; // Reduce speed only if not in free ride mode
                score = Math.max(0, score - 50); // Reduce score only if not in free ride mode
            }
            obstacles.splice(index, 1);
        }
    });

    updateParticles();
    gameTime++;
}


function spawnAICar() {
    const roadWidth = 320;
    const baseX = canvas.width / 2;
    const laneWidth = roadWidth / 3;
    const lanes = [0, 1, 2];
    const lane = lanes[Math.floor(Math.random() * lanes.length)];
    const colors = ['#FF0000', '#0000FF', '#00FF00', '#FFFF00', '#FF00FF', '#00FFFF'];

    // Calculate the horizon position
    const segments = 100;
    const segmentHeight = canvas.height / segments;
    // const roadTopY = canvas.height - segments * segmentHeight;
    const roadTopY = canvas.height / 3;
    const horizonY = Math.max(0, roadTopY - 30);
    const maxHorizonY = canvas.height / 3;
    const horizonYPos = Math.min(maxHorizonY, horizonY);

    // Calculate lane boundaries
    const laneLeft = baseX - roadWidth / 2 + (lane * laneWidth);
    const laneCenter = laneLeft + (laneWidth / 2);

    // Spawn car in the center of its lane just below the horizon and store initialX
    aiCars.push({
        x: laneCenter,
        initialX: laneCenter, // Store initial X relative to a straight road
        y: horizonYPos + 10,
        width: 30,
        height: 60,
        speed: 2 + Math.random() * 3,
        color: colors[Math.floor(Math.random() * colors.length)],
        plateNumber: `AI-${Math.floor(Math.random() * 900) + 100}`,
        lane: lane
    });
}

function spawnObstacle() {
    const roadWidth = 320;
    const baseX = canvas.width / 2;
    const laneWidth = roadWidth / 3;
    const types = ['cone', 'pothole', 'barrier'];
    const type = types[Math.floor(Math.random() * types.length)];
    const lane = Math.floor(Math.random() * 3);

    // Calculate the horizon position
    const segments = 100;
    const segmentHeight = canvas.height / segments;
    const roadTopY = canvas.height - segments * segmentHeight;
    const horizonY = Math.max(0, roadTopY - 30);
    const maxHorizonY = canvas.height / 3;
    const horizonYPos = Math.min(maxHorizonY, horizonY);

    // Calculate lane boundaries
    const laneLeft = baseX - roadWidth / 2 + (lane * laneWidth);
    const laneCenter = laneLeft + (laneWidth / 2);

    // Spawn obstacle in the center of its lane just below the horizon and store initialX
    obstacles.push({
        x: laneCenter,
        initialX: laneCenter, // Store initial X relative to a straight road
        y: horizonYPos + 5,
        type: type,
        width: type === 'barrier' ? 60 : 20,
        height: type === 'pothole' ? 10 : 20,
        lane: lane
    });
}

function updateAICars() {
    const roadWidth = 320;
    const baseX = canvas.width / 2;
    const segments = 100;
    const segmentHeight = canvas.height / segments;
    const roadTopY = canvas.height - segments * segmentHeight;
    const horizonY = Math.max(0, roadTopY - 30);
    const maxHorizonY = canvas.height / 3;
    const horizonYPos = Math.min(maxHorizonY, horizonY);

    aiCars = aiCars.filter(car => {
        // Update position based on road perspective
        car.y += car.speed + player.speed;

        // Calculate road's horizontal offset at car's y position
        const i = (canvas.height - car.y) / segmentHeight; // Approximate segment index
        const roadXOffset = curveOffset * 0.01 * i;

        // Calculate lane boundaries at car's y position with perspective and road curve
        const laneWidth = roadWidth / 3;
        const roadLeftAtY = baseX - roadWidth / 2 + roadXOffset;
        const roadRightAtY = baseX + roadWidth / 2 + roadXOffset;
        const laneLeftAtY = roadLeftAtY + (car.lane * laneWidth);
        const laneRightAtY = laneLeftAtY + laneWidth;
        const laneCenterAtY = laneLeftAtY + (laneWidth / 2);

        // Adjust x position to follow the curved lane center with perspective
        const perspectiveFactor = 1 - (car.y / canvas.height);
        car.x = laneCenterAtY + (car.initialX - (baseX - roadWidth / 2 + (car.lane * laneWidth) + laneWidth / 2)) * perspectiveFactor; // Use initialX relative to straight road center

        // Clamp x position to stay within lane boundaries at this y position
        car.x = Math.max(laneLeftAtY + 10, Math.min(laneRightAtY - 10, car.x));

        // Only keep cars that are below the horizon and within road boundaries
        return car.y < canvas.height + 50 &&
            car.y > horizonYPos &&
            car.x >= roadLeftAtY &&
            car.x <= roadRightAtY;
    });
}

function updateObstacles() {
    const roadWidth = 320;
    const baseX = canvas.width / 2;
    const segments = 100;
    const segmentHeight = canvas.height / segments;
    const roadTopY = canvas.height - segments * segmentHeight;
    const horizonY = Math.max(0, roadTopY - 30);
    const maxHorizonY = canvas.height / 3;
    const horizonYPos = Math.min(maxHorizonY, horizonY);

    obstacles = obstacles.filter(obs => {
        // Update position based on road perspective
        obs.y += player.speed;

        // Calculate road's horizontal offset at obstacle's y position
        const i = (canvas.height - obs.y) / segmentHeight; // Approximate segment index
        const roadXOffset = curveOffset * 0.01 * i;

        // Calculate lane boundaries at obstacle's y position with perspective and road curve
        const laneWidth = roadWidth / 3;
        const roadLeftAtY = baseX - roadWidth / 2 + roadXOffset;
        const roadRightAtY = baseX + roadWidth / 2 + roadXOffset;
        const laneLeftAtY = roadLeftAtY + (obs.lane * laneWidth);
        const laneRightAtY = laneLeftAtY + laneWidth;
        const laneCenterAtY = laneLeftAtY + (laneWidth / 2);

        // Adjust x position to follow the curved lane center with perspective
        const perspectiveFactor = 1 - (obs.y / canvas.height);
        obs.x = laneCenterAtY + (obs.initialX - (baseX - roadWidth / 2 + (obs.lane * laneWidth) + laneWidth / 2)) * perspectiveFactor; // Use initialX relative to straight road center

        // Clamp x position to stay within lane boundaries at this y position
        obs.x = Math.max(laneLeftAtY + 10, Math.min(laneRightAtY - 10, obs.x));

        // Only keep obstacles that are below the horizon and within road boundaries
        return obs.y < canvas.height + 50 &&
            obs.y > horizonYPos &&
            obs.x >= roadLeftAtY &&
            obs.x <= roadRightAtY;
    });
}

function updateSignposts() { // Update signposts' positions and reset them when they go off-screen
    const roadWidth = 320;
    const baseX = canvas.width / 2;
    const roadLeft = baseX - roadWidth / 2;
    const roadRight = baseX + roadWidth / 2;
    const margin = 50; // Margin from road edge

    signposts.forEach(sign => {
        sign.y += player.speed * 0.8; // Move signposts down the screen
        sign.y = (sign.y < canvas.height / 3) ? canvas.height / 3 : sign.y;
        sign.animation += 0.02;

        if (sign.y > canvas.height + 100) { // Reset signpost position
            sign.y = -200; // Reset to top
            const side = Math.random() > 0.5 ? 'left' : 'right';
            let x;

            if (side === 'left') {
                // Place on left side of road
                x = roadLeft - margin - Math.random() * 100;
            } else {
                // Place on right side of road
                x = roadRight + margin + Math.random() * 100;
            }

            sign.x = x;
            sign.side = side;
        }
    });
}


function drawEnvironment() {
    // Calculate the horizon position
    const segments = 100;
    const segmentHeight = canvas.height / segments;
    let roadTopY = canvas.height - segments * segmentHeight;
    roadTopY += player.speed * 10; // Adjust road top position based on player speed
    const horizonY = Math.max(0, roadTopY - 30);
    const maxHorizonY = canvas.height / 3;
    const horizonYPos = Math.min(maxHorizonY, horizonY);

    // Draw sky gradient
    let skyColor1, skyColor2;
    if (level >= 4) {
        skyColor1 = '#FF69B4';
        skyColor2 = '#9370DB';
    } else if (level >= 3) {
        skyColor1 = '#FF6B35';
        skyColor2 = '#F7931E';
    } else if (level >= 2) {
        skyColor1 = '#4A90E2';
        skyColor2 = '#87CEEB';
    } else {
        skyColor1 = '#87CEEB';
        skyColor2 = '#98FB98';
    }

    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0, skyColor1);
    gradient.addColorStop(1, skyColor2);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Save context state for perspective transformations
    ctx.save();

    // Calculate road boundaries for environment placement
    const roadWidth = 320;
    const baseX = canvas.width / 2;
    const roadLeft = baseX - roadWidth / 2;
    const roadRight = baseX + roadWidth / 2;

    // Draw base landscape with perspective
    ctx.fillStyle = level >= 4 ? '#90EE90' : '#90EE90';
    ctx.beginPath();
    ctx.moveTo(0, horizonYPos);

    // Calculate perspective factors
    const perspectiveFactor = 1 - (horizonYPos / canvas.height);

    for (let x = 0; x <= canvas.width; x += 10) {
        // Apply perspective to x position
        const perspectiveX = baseX + (x - baseX) * perspectiveFactor;
        let hillHeight = horizonYPos + Math.sin((x + hillOffset) * 0.01) * 30 + Math.sin((x + hillOffset) * 0.005) * 50;
        ctx.lineTo(perspectiveX, hillHeight);
    }
    ctx.lineTo(canvas.width, canvas.height);
    ctx.lineTo(0, canvas.height);
    ctx.fill();

    // Draw buildings with perspective
    function drawBuilding(x, y, width, height, color, type) {
        // Calculate perspective position and movement
        const perspectiveX = baseX + (x - baseX) * (1 - (y / canvas.height));
        const perspectiveWidth = width * (1 - (y / canvas.height));
        const perspectiveHeight = height * (1 - (y / canvas.height));
        const moveY = y + player.speed * 2; // Add downward movement

        // Base building
        ctx.fillStyle = color;
        ctx.fillRect(perspectiveX, moveY, perspectiveWidth, perspectiveHeight);

        // Windows
        ctx.fillStyle = '#FFD700';
        const windowSize = 8 * (1 - (y / canvas.height));
        const windowSpacing = 15 * (1 - (y / canvas.height));
        for (let wx = perspectiveX + 10; wx < perspectiveX + perspectiveWidth - 10; wx += windowSpacing) {
            for (let wy = moveY + 10; wy < moveY + perspectiveHeight - 10; wy += windowSpacing) {
                ctx.fillRect(wx, wy, windowSize, windowSize);
            }
        }

        // Roof or dome based on type
        if (type === 'hotel') {
            ctx.fillStyle = '#8B4513';
            ctx.beginPath();
            ctx.moveTo(perspectiveX - 10, moveY);
            ctx.lineTo(perspectiveX + perspectiveWidth / 2, moveY - 20);
            ctx.lineTo(perspectiveX + perspectiveWidth + 10, moveY);
            ctx.fill();
        } else if (type === 'school') {
            ctx.fillStyle = '#8B4513';
            ctx.fillRect(perspectiveX + perspectiveWidth - 5, moveY - 20, 5, 20);
            ctx.fillStyle = '#FF0000';
            ctx.beginPath();
            ctx.moveTo(perspectiveX + perspectiveWidth, moveY - 20);
            ctx.lineTo(perspectiveX + perspectiveWidth + 15, moveY - 15);
            ctx.lineTo(perspectiveX + perspectiveWidth, moveY - 10);
            ctx.fill();
        } else if (type === 'convention') {
            ctx.fillStyle = '#4682B4';
            ctx.beginPath();
            ctx.arc(perspectiveX + perspectiveWidth / 2, moveY, perspectiveWidth / 2, Math.PI, 0);
            ctx.fill();
        }
    }

    // Draw trees with perspective
    function drawTree(x, y, size) {
        const perspectiveX = baseX + (x - baseX) * (1 - (y / canvas.height));
        const perspectiveSize = size * (1 - (y / canvas.height));
        const moveY = y + player.speed * 2; // Add downward movement

        ctx.fillStyle = '#8B4513';
        ctx.fillRect(perspectiveX - 2, moveY, 4, perspectiveSize);
        ctx.fillStyle = level >= 4 ? '#FF69B4' : '#228B22';
        ctx.beginPath();
        ctx.arc(perspectiveX, moveY - perspectiveSize / 2, perspectiveSize, 0, Math.PI * 2);
        ctx.fill();
    }

    // Draw buildings based on level with perspective
    if (level >= 4) {
        // Place buildings on both sides of the road
        drawBuilding(roadLeft - 100, horizonYPos + 50, 80, 120, '#FF69B4', 'hotel');
        drawBuilding(roadRight + 50, horizonYPos + 30, 100, 150, '#9370DB', 'convention');
        drawBuilding(roadLeft - 200, horizonYPos + 70, 90, 130, '#00CED1', 'school');
    } else {
        drawBuilding(roadLeft - 150, horizonYPos + 50, 70, 100, '#4682B4', 'hotel');
        drawBuilding(roadRight + 100, horizonYPos + 30, 80, 120, '#8B4513', 'school');
        drawBuilding(roadLeft - 250, horizonYPos + 70, 90, 140, '#556B2F', 'convention');
    }

    // Draw trees with perspective
    for (let i = 0; i < 20; i++) {
        // Alternate between left and right side of the road
        const side = i % 2 === 0 ? -1 : 1;
        const distanceFromRoad = 100 + Math.random() * 150;
        let treeX = (side === -1 ? roadLeft : roadRight) + (side * distanceFromRoad);
        let treeY = horizonYPos + 50 + Math.sin(i * 0.5) * 20;
        drawTree(treeX, treeY, 15);
    }

    // Draw Magic Garden decorations with perspective
    if (level >= 4) {
        for (let i = 0; i < 10; i++) {
            const side = i % 2 === 0 ? -1 : 1;
            const distanceFromRoad = 80 + Math.random() * 100;
            let x = (side === -1 ? roadLeft : roadRight) + (side * distanceFromRoad);
            let y = horizonYPos + 30 + Math.sin(i * 0.7) * 30;
            const perspectiveX = baseX + (x - baseX) * (1 - (y / canvas.height));
            const perspectiveSize = 5 * (1 - (y / canvas.height));
            const moveY = y + player.speed * 2; // Add downward movement

            ctx.fillStyle = ['#FF69B4', '#9370DB', '#00CED1', '#FFD700'][i % 4];
            ctx.beginPath();
            ctx.arc(perspectiveX, moveY, perspectiveSize, 0, Math.PI * 2);
            ctx.fill();

            for (let j = 0; j < 5; j++) {
                let angle = (j * Math.PI * 2) / 5;
                let petalX = perspectiveX + Math.cos(angle) * (8 * (1 - (y / canvas.height)));
                let petalY = moveY + Math.sin(angle) * (8 * (1 - (y / canvas.height)));
                ctx.beginPath();
                ctx.arc(petalX, petalY, perspectiveSize * 0.8, 0, Math.PI * 2);
                ctx.fill();
            }
        }
    }

    // Restore context
    ctx.restore();

    // Update hill offset based on player speed
    hillOffset += player.speed * 0.5;
}


function drawPlayer() {

    ctx.fillStyle = '#0066CC';
    ctx.fillRect(player.x - player.width / 2, player.y - player.height / 2, player.width, player.height);


    ctx.fillStyle = '#87CEEB';
    ctx.fillRect(player.x - player.width / 2 + 5, player.y - player.height / 2 + 10, player.width - 10, 15);


    ctx.fillStyle = '#000';
    ctx.fillRect(player.x - player.width / 2 - 3, player.y - player.height / 2 + 5, 6, 10);
    ctx.fillRect(player.x + player.width / 2 - 3, player.y - player.height / 2 + 5, 6, 10);
    ctx.fillRect(player.x - player.width / 2 - 3, player.y + player.height / 2 - 15, 6, 10);
    ctx.fillRect(player.x + player.width / 2 - 3, player.y + player.height / 2 - 15, 6, 10);


    ctx.fillStyle = '#FFF';
    ctx.fillRect(player.x - 20, player.y + player.height / 2 - 8, 40, 12);
    ctx.fillStyle = '#000';
    ctx.font = '10px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(player.plateNumber, player.x, player.y + player.height / 2 - 1);
}

function drawAICars() {
    // Calculate the horizon position
    const segments = 100;
    const segmentHeight = canvas.height / segments;
    const roadTopY = canvas.height - segments * segmentHeight;
    const horizonY = Math.max(0, roadTopY - 30);
    const maxHorizonY = canvas.height / 3;
    const horizonYPos = Math.min(maxHorizonY, horizonY);

    // Save context state
    ctx.save();

    // Create clipping region for everything below the horizon
    ctx.beginPath();
    ctx.rect(0, horizonYPos, canvas.width, canvas.height - horizonYPos);
    ctx.clip();

    aiCars.forEach(car => {
        ctx.fillStyle = car.color;
        ctx.fillRect(car.x - car.width / 2, car.y - car.height / 2, car.width, car.height);

        ctx.fillStyle = '#FFF';
        ctx.fillRect(car.x - car.width / 2 + 3, car.y - car.height / 2 + 8, car.width - 6, 12);

        ctx.fillStyle = '#000';
        ctx.fillRect(car.x - car.width / 2 - 2, car.y - car.height / 2 + 3, 4, 8);
        ctx.fillRect(car.x + car.width / 2 - 2, car.y - car.height / 2 + 3, 4, 8);
        ctx.fillRect(car.x - car.width / 2 - 2, car.y + car.height / 2 - 11, 4, 8);
        ctx.fillRect(car.x + car.width / 2 - 2, car.y + car.height / 2 - 11, 4, 8);

        ctx.fillStyle = '#FFF';
        ctx.fillRect(car.x - 15, car.y + car.height / 2 - 6, 30, 8);
        ctx.fillStyle = '#000';
        ctx.font = '8px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(car.plateNumber, car.x, car.y + car.height / 2 - 1);
    });

    // Restore context to remove clipping
    ctx.restore();
}

function drawObstacles() {
    // Calculate the horizon position
    const segments = 100;
    const segmentHeight = canvas.height / segments;
    const roadTopY = canvas.height - segments * segmentHeight;
    const horizonY = Math.max(0, roadTopY - 30);
    const maxHorizonY = canvas.height / 3;
    const horizonYPos = Math.min(maxHorizonY, horizonY);

    // Save context state
    ctx.save();

    // Create clipping region for everything below the horizon
    ctx.beginPath();
    ctx.rect(0, horizonYPos, canvas.width, canvas.height - horizonYPos);
    ctx.clip();

    obstacles.forEach(obs => {
        ctx.fillStyle = obs.type === 'cone' ? '#FF6600' : obs.type === 'pothole' ? '#333' : '#8B4513';

        if (obs.type === 'cone') {
            ctx.beginPath();
            ctx.moveTo(obs.x, obs.y + obs.height);
            ctx.lineTo(obs.x - obs.width / 2, obs.y);
            ctx.lineTo(obs.x + obs.width / 2, obs.y);
            ctx.fill();

            ctx.fillStyle = '#FFF';
            ctx.fillRect(obs.x - obs.width / 3, obs.y + obs.height / 2, obs.width * 2 / 3, 3);
        } else if (obs.type === 'pothole') {
            ctx.beginPath();
            ctx.ellipse(obs.x, obs.y, obs.width / 2, obs.height / 2, 0, 0, Math.PI * 2);
            ctx.fill();
        } else {
            ctx.fillRect(obs.x - obs.width / 2, obs.y, obs.width, obs.height);
            ctx.fillStyle = '#FFF';
            for (let i = 0; i < 3; i++) {
                ctx.fillRect(obs.x - obs.width / 2 + i * 20, obs.y + 5, 15, 3);
            }
        }
    });

    // Restore context to remove clipping
    ctx.restore();
}

function drawSignposts() {
    signposts.forEach(sign => {

        sign.animation += 0.02;
        let animOffset = Math.sin(sign.animation) * 2;


        ctx.fillStyle = '#8B4513';
        ctx.fillRect(sign.x - 2, sign.y + animOffset, 4, 40);


        ctx.fillStyle = '#228B22';
        ctx.fillRect(sign.x - 50, sign.y - 15 + animOffset, 100, 25);


        ctx.strokeStyle = '#FFF';
        ctx.lineWidth = 2;
        ctx.strokeRect(sign.x - 50, sign.y - 15 + animOffset, 100, 25);


        ctx.fillStyle = '#FFF';
        ctx.font = '12px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(sign.message, sign.x, sign.y + 2 + animOffset);
    });
}

function drawHUD() {

    const hudPulse = Math.sin(gameTime * 0.1) * 0.1 + 1;


    ctx.save();
    ctx.scale(hudPulse, hudPulse);
    ctx.fillStyle = '#FFF';
    ctx.font = 'bold 24px Arial';
    ctx.textAlign = 'left';
    ctx.fillText(`Speed: ${Math.round(player.speed * 20)} km/h`, 20 / hudPulse, 40 / hudPulse);
    ctx.restore();


    ctx.fillStyle = '#FFD700';
    ctx.font = 'bold 18px Arial';
    ctx.fillText(`Distance: ${Math.round(distance)}m`, 20, 70);
    ctx.fillText(`Score: ${score}`, 20, 95);
    ctx.fillText(`Level: ${level}${level === 4 ? ' - MAGIC GARDEN!' : ''}`, 20, 120);


    if (level < 4 && !freeRideMode) {
        const nextLevelDistance = level * 500;
        const progress = (distance % 500) / 500;
        ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.fillRect(20, 130, 200, 10);
        ctx.fillStyle = level >= 4 ? '#FF69B4' : '#00FF00';
        ctx.fillRect(20, 130, progress * 200, 10);
        ctx.strokeStyle = '#FFF';
        ctx.strokeRect(20, 130, 200, 10);
    }


    if (freeRideMode) {
        ctx.fillStyle = '#FF69B4';
        ctx.font = 'bold 16px Arial';
        ctx.fillText('FREE RIDE MODE', canvas.width - 200, 30);
    }

    if (showMiniMap) {
        drawMiniMap();
    }


    ctx.fillStyle = musicEnabled ? '#00FF00' : '#FF0000';
    ctx.font = '12px Arial';
    ctx.textAlign = 'right';
    ctx.fillText(`Music: ${musicEnabled ? 'ON' : 'OFF'}`, canvas.width - 10, canvas.height - 20);
}

function drawMiniMap() {
    const mapSize = 120;
    const mapX = canvas.width - mapSize - 20;
    const mapY = 50;
    const roadWidth = 320;
    const baseX = canvas.width / 2;
    const roadSegments = 100;
    const segmentHeight = canvas.height / roadSegments;

    // Draw map background
    ctx.fillStyle = 'rgba(0, 0, 0, 0.9)';
    ctx.fillRect(mapX, mapY, mapSize, mapSize);
    ctx.strokeStyle = '#FFF';
    ctx.lineWidth = 2;
    ctx.strokeRect(mapX, mapY, mapSize, mapSize);

    // Calculate road dimensions for mini-map
    const mapRoadWidth = mapSize - 40;
    const mapRoadHeight = mapSize - 20;
    const mapRoadX = mapX + 20;
    const mapRoadY = mapY + 10;

    // Draw road base
    ctx.fillStyle = '#555';
    ctx.beginPath();
    ctx.moveTo(mapRoadX, mapRoadY + mapRoadHeight);

    // Draw road based on actual curve and hill
    const curveFactor = curveOffset * 0.5;
    const hillFactor = hillOffset * 0.3;
    const mapSegments = 20;

    // Draw road path
    for (let i = 0; i <= mapSegments; i++) {
        const t = i / mapSegments;
        const x = mapRoadX + (mapRoadWidth * t);
        const y = mapRoadY + mapRoadHeight * (1 - t) +
            Math.sin(t * Math.PI * 2 + curveFactor) * 10 +
            Math.sin(t * Math.PI + hillFactor) * 5;
        ctx.lineTo(x, y);
    }
    ctx.lineTo(mapRoadX + mapRoadWidth, mapRoadY + mapRoadHeight);
    ctx.closePath();
    ctx.fill();

    // Draw road edges
    ctx.strokeStyle = '#FFF';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(mapRoadX, mapRoadY + mapRoadHeight);

    for (let i = 0; i <= mapSegments; i++) {
        const t = i / mapSegments;
        const x = mapRoadX + (mapRoadWidth * t);
        const y = mapRoadY + mapRoadHeight * (1 - t) +
            Math.sin(t * Math.PI * 2 + curveFactor) * 10 +
            Math.sin(t * Math.PI + hillFactor) * 5;
        ctx.lineTo(x, y);
    }
    ctx.stroke();

    // Draw player position
    const playerMapX = mapRoadX + (player.x - (baseX - roadWidth / 2)) / roadWidth * mapRoadWidth;
    const playerMapY = mapRoadY + mapRoadHeight * (1 - (player.y / canvas.height));
    ctx.fillStyle = '#0066CC';
    ctx.beginPath();
    ctx.arc(playerMapX, playerMapY, 3, 0, Math.PI * 2);
    ctx.fill();

    // Draw AI cars
    ctx.fillStyle = '#FF0000';
    aiCars.forEach(car => {
        if (car.y > 0 && car.y < canvas.height) {
            const carMapX = mapRoadX + (car.x - (baseX - roadWidth / 2)) / roadWidth * mapRoadWidth;
            const carMapY = mapRoadY + mapRoadHeight * (1 - (car.y / canvas.height));
            ctx.beginPath();
            ctx.arc(carMapX, carMapY, 2, 0, Math.PI * 2);
            ctx.fill();
        }
    });

    // Draw obstacles
    ctx.fillStyle = '#FFA500';
    obstacles.forEach(obs => {
        if (obs.y > 0 && obs.y < canvas.height) {
            const obsMapX = mapRoadX + (obs.x - (baseX - roadWidth / 2)) / roadWidth * mapRoadWidth;
            const obsMapY = mapRoadY + mapRoadHeight * (1 - (obs.y / canvas.height));
            ctx.beginPath();
            ctx.arc(obsMapX, obsMapY, 1.5, 0, Math.PI * 2);
            ctx.fill();
        }
    });

    // Draw distance markers
    ctx.fillStyle = '#FFF';
    ctx.font = '8px Arial';
    ctx.textAlign = 'center';
    for (let i = 0; i <= 3; i++) {
        const t = i / 3;
        const x = mapRoadX + (mapRoadWidth * t);
        const y = mapRoadY + mapRoadHeight * (1 - t) +
            Math.sin(t * Math.PI * 2 + curveFactor) * 10 +
            Math.sin(t * Math.PI + hillFactor) * 5;
        ctx.fillText(`${i * 500}m`, x, y - 5);
    }

    // Draw current distance
    ctx.fillStyle = '#00FF00';
    ctx.font = 'bold 10px Arial';
    ctx.textAlign = 'left';
    ctx.fillText(`${Math.round(distance)}m`, mapX + 5, mapY + 15);
}

function drawMenuScreen() {

    drawEnvironment();
    drawRoad(ctx, canvas);


    if (!aiCars.length) {
        for (let i = 0; i < 3; i++) {
            spawnAICar();
        }
    }
    updateAICars();
    drawAICars();

    menuAnimation += 0.02;


    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);


    const titlePulse = Math.sin(menuAnimation * 2) * 0.2 + 1;
    ctx.save();
    ctx.scale(titlePulse, titlePulse);


    ctx.fillStyle = '#FFD700';
    ctx.font = 'bold 48px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('FUTURESKILLSDRIVE', canvas.width / (2 * titlePulse), 150 / titlePulse);


    ctx.fillStyle = '#FFF';
    ctx.font = 'bold 24px Arial';
    ctx.fillText('RFSF Racing Championship', canvas.width / (2 * titlePulse), 190 / titlePulse);
    ctx.restore();


    ctx.fillStyle = '#FF6B35';
    ctx.fillRect(0, 220, canvas.width, 40);
    ctx.fillStyle = '#FFF';
    ctx.font = 'bold 18px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('RTB COMPETITION FUTURE SKILLS', canvas.width / 2, 245);


    const optionPulse = Math.sin(menuAnimation * 3) * 0.1 + 1;
    ctx.save();
    ctx.scale(optionPulse, optionPulse);

    ctx.fillStyle = '#00FF00';
    ctx.font = 'bold 32px Arial';
    ctx.fillText('CLICK TO START RACING!', canvas.width / (2 * optionPulse), 320 / optionPulse);

    ctx.fillStyle = '#87CEEB';
    ctx.font = '16px Arial';
    ctx.fillText('Race through 3 levels to reach the Magic Garden', canvas.width / (2 * optionPulse), 360 / optionPulse);
    ctx.restore();


    ctx.fillStyle = '#FFF';
    ctx.font = '14px Arial';
    ctx.textAlign = 'left';
    const instructions = [
        'Controls:',
        '↑↓←→ or WASD - Drive',
        'SPACE - Brake',
        'ESC - Pause',
        'R - Toggle Music',
        'M - Toggle Mini-map',
        'F - Free Ride Mode'
    ];

    instructions.forEach((text, i) => {
        ctx.fillText(text, 50, 420 + i * 20);
    });


    const highScore = localStorage.getItem('futureSkillsHighScore') || 0;
    const bestDistance = localStorage.getItem('futureSkillsBestDistance') || 0;

    ctx.textAlign = 'right';
    ctx.fillStyle = '#FFD700';
    ctx.font = 'bold 16px Arial';
    ctx.fillText(`High Score: ${highScore}`, canvas.width - 50, 420);
    ctx.fillText(`Best Distance: ${bestDistance}m`, canvas.width - 50, 445);


    ctx.fillStyle = '#228B22';
    ctx.font = 'italic 14px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('🇷🇼 Land of a Thousand Hills - Drive Safe! 🇷🇼', canvas.width / 2, canvas.height - 30);

    // Draw START banner
    const roadWidth = 320;
    const baseX = canvas.width / 2;
    const segments = 100;
    const segmentHeight = canvas.height / segments;
    const roadTopY = canvas.height / 3; // Using user's value for road top
    // const horizonY = Math.max(0, roadTopY - 30); // Not needed for banner position
    // const maxHorizonY = canvas.height / 3; // Not needed for banner position
    // const horizonYPos = Math.min(maxHorizonY, horizonY); // Not needed for banner position

    const bannerHeight = 80; // Revert banner height for better visibility, can adjust later - keeping user's last change
    const bannerY = canvas.height / 1.5; // Position banner centered on horizonYPos - keeping user's last change
    const bannerWidth = roadWidth * 1.1; // Make banner significantly wider than the road - keeping user's last change
    const bannerX = baseX - bannerWidth / 2; // Center the banner
    const bannerBottomY = bannerY + bannerHeight; // Calculate banner bottom Y

    // Calculate road edges at banner's y position for pole connection
    const i = (canvas.height - bannerBottomY) / segmentHeight; // Approximate segment index for banner bottom
    const roadXOffsetAtBannerBottom = curveOffset * 0.01 * i;
    const roadLeftAtBannerBottom = baseX - roadWidth / 2 + roadXOffsetAtBannerBottom; // Road left edge at banner bottom Y
    const roadRightAtBannerBottom = baseX + roadWidth / 2 + roadXOffsetAtBannerBottom; // Road right edge at banner bottom Y

    // Draw banner supports (poles) with perspective - Reverting to simpler poles
    const poleWidth = 20; // Base width of the simpler poles
    ctx.fillStyle = '#8B4513'; // Brown color for poles

    // Left pole
    ctx.fillRect(roadLeftAtBannerBottom - poleWidth / 2, bannerBottomY, poleWidth, canvas.height - bannerBottomY); // Draw rectangle from banner bottom to canvas bottom

    // Right pole
    ctx.fillRect(roadRightAtBannerBottom - poleWidth / 2, bannerBottomY, poleWidth, canvas.height - bannerBottomY); // Draw rectangle from banner bottom to canvas bottom

    // Draw banner rectangle
    ctx.fillStyle = '#FFF';
    ctx.fillRect(bannerX, bannerY, bannerWidth, bannerHeight);
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 4;
    ctx.strokeRect(bannerX, bannerY, bannerWidth, bannerHeight);

    // Draw START text
    ctx.fillStyle = '#FF0000';
    ctx.font = 'bold 60px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('START', baseX, bannerY + bannerHeight / 2);
}

function drawPauseScreen() {

    ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 48px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('PAUSED', canvas.width / 2, canvas.height / 2 - 50);

    ctx.font = '24px Arial';
    ctx.fillText('Press ESC to Resume', canvas.width / 2, canvas.height / 2 + 20);


    ctx.font = '18px Arial';
    ctx.fillStyle = '#FFD700';
    ctx.fillText(`Distance: ${Math.round(distance)}m`, canvas.width / 2, canvas.height / 2 + 70);
    ctx.fillText(`Score: ${score}`, canvas.width / 2, canvas.height / 2 + 95);
    ctx.fillText(`Level: ${level}`, canvas.width / 2, canvas.height / 2 + 120);
}

function drawGameOverScreen() {

    const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
    gradient.addColorStop(0, '#8B0000');
    gradient.addColorStop(1, '#FF4500');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);


    ctx.fillStyle = '#FFF';
    ctx.font = 'bold 56px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('GAME OVER!', canvas.width / 2, canvas.height / 2 - 80);


    ctx.font = 'bold 24px Arial';
    ctx.fillStyle = '#FFD700';
    ctx.fillText(`Final Distance: ${Math.round(distance)}m`, canvas.width / 2, canvas.height / 2 - 20);
    ctx.fillText(`Final Score: ${score}`, canvas.width / 2, canvas.height / 2 + 10);
    ctx.fillText(`Level Reached: ${level}`, canvas.width / 2, canvas.height / 2 + 40);


    ctx.fillStyle = '#FFF';
    ctx.font = '20px Arial';
    ctx.fillText('Click or Press SPACE to Return to Menu', canvas.width / 2, canvas.height / 2 + 100);


    const currentHigh = localStorage.getItem('futureSkillsHighScore') || 0;
    if (score > currentHigh) {
        ctx.fillStyle = '#00FF00';
        ctx.font = 'bold 28px Arial';
        ctx.fillText('🎉 NEW HIGH SCORE! 🎉', canvas.width / 2, canvas.height / 2 + 140);
    }
}

function drawVictoryScreen() {

    const gradient = ctx.createRadialGradient(canvas.width / 2, canvas.height / 2, 0, canvas.width / 2, canvas.height / 2, canvas.width);
    gradient.addColorStop(0, '#FF69B4');
    gradient.addColorStop(0.5, '#9370DB');
    gradient.addColorStop(1, '#4B0082');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);


    createParticles(canvas.width / 2, canvas.height / 2, '#FFD700', 5);


    ctx.fillStyle = '#FFD700';
    ctx.font = 'bold 42px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('🎊 VICTORY! 🎊', canvas.width / 2, canvas.height / 2 - 120);

    ctx.fillStyle = '#FFF';
    ctx.font = 'bold 32px Arial';
    ctx.fillText('You\'ve Reached the', canvas.width / 2, canvas.height / 2 - 80);
    ctx.fillText('MAGIC GARDEN!', canvas.width / 2, canvas.height / 2 - 45);


    ctx.font = 'bold 20px Arial';
    ctx.fillStyle = '#FFD700';
    ctx.fillText(`🏆 Distance Completed: ${Math.round(distance)}m`, canvas.width / 2, canvas.height / 2 + 20);
    ctx.fillText(`🏆 Final Score: ${score}`, canvas.width / 2, canvas.height / 2 + 50);
    ctx.fillText(`🏆 Time: ${Math.round(gameTime / 60)} seconds`, canvas.width / 2, canvas.height / 2 + 80);


    ctx.fillStyle = '#FF69B4';
    ctx.font = 'bold 24px Arial';
    ctx.fillText('🌟 MAGIC GARDEN CHAMPION 🌟', canvas.width / 2, canvas.height / 2 + 120);


    ctx.fillStyle = '#FFF';
    ctx.font = '18px Arial';
    ctx.fillText('Click or Press SPACE to Return to Menu', canvas.width / 2, canvas.height / 2 + 160);
}

function saveHighScore() {
    const currentHigh = localStorage.getItem('futureSkillsHighScore') || 0;
    const currentBestDistance = localStorage.getItem('futureSkillsBestDistance') || 0;
    const currentBestTime = localStorage.getItem('futureSkillsBestTime') || 999999;

    if (score > currentHigh) {
        localStorage.setItem('futureSkillsHighScore', score);
    }

    if (distance > currentBestDistance) {
        localStorage.setItem('futureSkillsBestDistance', Math.round(distance));
    }

    if (gameTime < currentBestTime && gameState === 'victory') {
        localStorage.setItem('futureSkillsBestTime', gameTime);
    }
}


function gameLoop() {
    // Clear the entire canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    switch (gameState) {
        case 'menu':
            drawEnvironment();
            drawRoad(ctx, canvas);
            if (!aiCars.length) {
                for (let i = 0; i < 3; i++) {
                    spawnAICar();
                }
            }
            updateAICars();
            drawAICars();
            drawMenuScreen();
            break;

        case 'playing':
            updateGame();
            drawEnvironment();
            drawRoad(ctx, canvas, player.speed);

            // Save context state before drawing objects
            ctx.save();

            // Calculate horizon position (needed for clipping)
            const segments = 100;
            const segmentHeight = canvas.height / segments;
            const roadTopY = canvas.height / 3;
            const horizonY = Math.max(0, roadTopY - 30);
            const maxHorizonY = canvas.height / 3;
            const horizonYPos = Math.min(maxHorizonY, horizonY);

            // Create a clipping path that is the inverse of the banner shapes
            ctx.beginPath();
            // Add a large rectangle covering the entire canvas to the path (below the horizon line)
            // This ensures we only clip within the game world area where objects are drawn
            ctx.rect(0, horizonYPos, canvas.width, canvas.height - horizonYPos);

            // For each active banner, add its rectangle to the same path
            advertisementBanners.forEach(banner => {
                const roadWidth = 320;
                const baseX = canvas.width / 2;
                // Calculate the perspective properties of the banner at its current y position
                const i = (canvas.height - banner.y) / segmentHeight; // Approximate segment index

                // Use the same perspective scaling logic as used in drawAdvertisementBanners
                const scaleFactor = (banner.y + 100) / (canvas.height + 100);
                const effectiveScaleFactor = Math.max(0.4, scaleFactor);

                // Calculate road center at banner's y position (road curve offset without perspective scaling)
                const roadXOffsetAtBannerY = curveOffset * 0.01 * i;
                const roadCenterAtBannerY = baseX + roadXOffsetAtBannerY;

                // Calculate banner dimensions and position with perspective scaling
                const bannerPerspectiveWidth = advertisementBannerWidth * effectiveScaleFactor;
                const bannerPerspectiveHeight = advertisementBannerHeight * effectiveScaleFactor;
                const bannerPerspectiveX = roadCenterAtBannerY - bannerPerspectiveWidth / 2; // Center on road center line (unscaled for perspective)

                // Add banner rectangle to the clipping path.
                ctx.rect(
                    bannerPerspectiveX,
                    banner.y,
                    bannerPerspectiveWidth,
                    bannerPerspectiveHeight
                );
            });

            // Apply clipping using the even-odd fill rule
            // This will clip to the area outside the banner rectangles but inside the initial large rectangle
            ctx.clip('evenodd');

            // Draw objects that should be hidden behind banners (drawn *after* clipping)
            // These will only appear in the areas not covered by the clipping path (i.e., not behind banners)
            drawSignposts();
            drawObstacles();
            drawAICars();
            drawPlayer();
            drawParticles();

            // Restore context to remove clipping
            ctx.restore();

            // Draw banners last so they appear on top (drawn *after* restoring context)
            drawAdvertisementBanners();
            drawHUD();
            break;

        case 'paused':
            drawEnvironment();
            drawRoad(ctx, canvas);
            drawSignposts();
            drawObstacles();
            drawAICars();
            drawPlayer();
            drawParticles();
            drawHUD();
            drawPauseScreen();
            break;

        case 'gameover':
            drawGameOverScreen();
            break;

        case 'victory':
            drawVictoryScreen();
            drawParticles();
            break;

        case 'countdown':
            drawEnvironment();
            drawRoad(ctx, canvas);
            drawSignposts();
            drawObstacles();
            drawAICars();
            drawPlayer();
            drawCountdown();
            break;
    }

    requestAnimationFrame(gameLoop);
}


function initGame() {
    initSignposts();

    // Add mouse and touch event listeners
    canvas.addEventListener('mousedown', handleInput);
    canvas.addEventListener('mouseup', resetInput);
    canvas.addEventListener('mousemove', (event) => {
        if (event.buttons === 1) { // Check if left mouse button is pressed
            handleInput(event);
        }
    });

    canvas.addEventListener('touchstart', (event) => {
        event.preventDefault(); // Prevent scrolling on touch
        handleInput(event);
    });
    canvas.addEventListener('touchend', resetInput);
    canvas.addEventListener('touchmove', (event) => {
        event.preventDefault(); // Prevent scrolling on touch
        handleInput(event);
    });

    for (let i = 0; i < 5; i++) {
        setTimeout(() => spawnAICar(), i * 1000);
    }

    gameLoop();
}
function readTextAloud(text) {
    const utterance = new SpeechSynthesisUtterance(text);
    speechSynthesis.speak(utterance);
}


window.addEventListener('load', initGame);


window.addEventListener('focus', () => {
    if (musicContext && musicContext.state === 'suspended') {
        musicContext.resume();
    }
});

function initMusic() {
    try {
        if (!musicContext) {
            musicContext = new AudioContext();
            musicGain = musicContext.createGain();
            musicGain.gain.value = 0.1;
            musicGain.connect(musicContext.destination);
        }
    } catch (error) {
        console.warn('Music initialization failed:', error);
        musicEnabled = false; // Disable music if initialization fails
    }
}

function playBackgroundMusic() {
    try {
        if (!musicContext || !musicEnabled) return;

        if (musicOscillator) {
            musicOscillator.stop();
        }

        musicOscillator = musicContext.createOscillator();
        musicOscillator.frequency.setValueAtTime(220, musicContext.currentTime);
        musicOscillator.type = 'sine';
        musicOscillator.connect(musicGain);
        musicOscillator.start();
    } catch (error) {
        console.warn('Background music playback failed:', error);
        musicEnabled = false; // Disable music if playback fails
    }
}