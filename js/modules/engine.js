// import drawRoad from './road.js';

function updateGame() {
    if (gameState !== 'playing') return;

    // Handle player input for moving to left
    if (keys['ArrowLeft'] || keys['KeyA']) {
        if (player.lane > 0) {
            player.x = Math.max(50, player.x - 4); //can't go beyond left edge
            if (player.x <= lanePositions[player.lane - 1] + 10) {
                player.lane--;
            }
        }
    }

    // Handle player input for moving to right
    if (keys['ArrowRight'] || keys['KeyD']) {
        if (player.lane < 2) {
            player.x = Math.min(canvas.width - 50, player.x + 4); //can't go beyond right edge
            if (player.x >= lanePositions[player.lane + 1] - 10) {
                player.lane++;
            }
        }
    }

    // Handle player input for moving up
    if (keys['ArrowUp'] || keys['KeyW']) {
        player.speed = Math.min(player.maxSpeed, player.speed + player.acceleration); //initial speed increase with acceleration
        if (soundEnabled && Math.random() < 0.1) sounds.engine(); //prevent too repetitive sounds (enable 10% of chance to give sound) because of sound that would be genrated at every frame
    }

    // Handle player input for braking and decelerating
    if (keys['ArrowDown'] || keys['KeyS'] || keys['Space']) {
        player.speed = Math.max(0, player.speed - player.acceleration * 1.5); //decelerate faster when braking
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
            gameState = 'gameover'; // Set game state to game over
            saveHighScore();
        }
    });

    // Check for collisions with obstacles
    obstacles.forEach((obs, index) => {
        if (Math.abs(player.x - obs.x) < 20 && Math.abs(player.y - obs.y) < 30) {
            sounds.collision();
            createParticles(obs.x, obs.y, '#8B4513', 10);
            player.speed *= 0.5;
            score = Math.max(0, score - 50);
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
    const roadTopY = canvas.height - segments * segmentHeight;
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


    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(mapX, mapY, mapSize, mapSize);
    ctx.strokeStyle = '#FFF';
    ctx.strokeRect(mapX, mapY, mapSize, mapSize);


    ctx.fillStyle = '#555';
    ctx.fillRect(mapX + 20, mapY, mapSize - 40, mapSize);


    ctx.fillStyle = '#0066CC';
    const playerMapX = mapX + 20 + ((player.x - 50) / (canvas.width - 100)) * (mapSize - 40);
    const playerMapY = mapY + mapSize - 20;
    ctx.fillRect(playerMapX - 2, playerMapY - 4, 4, 8);


    ctx.fillStyle = '#FF0000';
    aiCars.forEach(car => {
        const carMapX = mapX + 20 + ((car.x - 50) / (canvas.width - 100)) * (mapSize - 40);
        const carMapY = mapY + ((canvas.height - car.y) / canvas.height) * mapSize;
        if (carMapY >= mapY && carMapY <= mapY + mapSize) {
            ctx.fillRect(carMapX - 1, carMapY - 2, 2, 4);
        }
    });
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
            drawSignposts();
            drawObstacles();
            drawAICars();
            drawPlayer();
            drawParticles();
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
    }

    requestAnimationFrame(gameLoop);
}


function initGame() {
    initSignposts();


    for (let i = 0; i < 5; i++) {
        setTimeout(() => spawnAICar(), i * 1000);
    }


    gameLoop();
}


window.addEventListener('load', initGame);


window.addEventListener('focus', () => {
    if (musicContext && musicContext.state === 'suspended') {
        musicContext.resume();
    }
});