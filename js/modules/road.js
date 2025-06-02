let carDistance = 0;
let curveOffset = 0;
let curveDirection = 0;
hillOffset = 0;
let hillDirection = 0;

/**
 * Updates and draws the procedural road layout.
 * Curves and hills appear after 200m distance.
 * 
 * @param {CanvasRenderingContext2D} ctx - The drawing context
 * @param {HTMLCanvasElement} canvas - The canvas element
 * @param {number} speed - Car speed in meters/frame (e.g., 5)
 */
function drawRoad(ctx, canvas, speed = 5) {
    if (!ctx || !canvas) {
        console.error('drawRoad: ctx or canvas is undefined', { ctx, canvas });
        return;
    }

    // Move horizon line calculation after segments and segmentHeight are defined
    const roadHeight = 200;
    const segments = 100;
    const segmentHeight = canvas.height / segments;
    const roadWidth = 320;

    const baseX = canvas.width / 2;

    // Calculate dynamic horizon position based on roadTopY
    const roadTopY = canvas.height - segments * segmentHeight;
    const horizonY = Math.max(0, roadTopY - 30); // 30px above the top of the road

    // Calculate horizon perspective based on road movement
    const horizonXOffset = curveOffset * 0.01 * segments;
    const horizonYOffset = hillOffset * 0.01 * segments;

    // Limit horizon Y position to not go above canvas.height/3
    const maxHorizonY = canvas.height / 3;
    const horizonYPos = Math.min(maxHorizonY, horizonY + horizonYOffset);

    // Draw clouds first (they should always be visible)
    function drawCloud(x, y, scale = 1) {
        ctx.save();
        ctx.globalAlpha = 0.7;
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.ellipse(x, y, 30 * scale, 18 * scale, 0, 0, Math.PI * 2);
        ctx.ellipse(x + 25 * scale, y + 5 * scale, 22 * scale, 14 * scale, 0, 0, Math.PI * 2);
        ctx.ellipse(x - 20 * scale, y + 8 * scale, 18 * scale, 12 * scale, 0, 0, Math.PI * 2);
        ctx.closePath();
        ctx.fill();
        ctx.globalAlpha = 1;
        ctx.restore();
    }

    // Place a few clouds at random positions (static for now)
    drawCloud(canvas.width * 0.2, 50, 1);
    drawCloud(canvas.width * 0.6, 80, 0.8);
    drawCloud(canvas.width * 0.8, 40, 1.2);

    // Draw a dynamic horizon line that follows the road's perspective
    ctx.strokeStyle = '#4682B4'; // Steel blue for horizon
    ctx.lineWidth = 5; // Make the line thicker

    // Create a gradient for the horizon line
    const horizonGradient = ctx.createLinearGradient(0, horizonYPos - 2, 0, horizonYPos + 2);
    horizonGradient.addColorStop(0, 'rgba(70, 130, 180, 0.5)'); // Semi-transparent steel blue
    horizonGradient.addColorStop(0.5, 'rgba(70, 130, 180, 1)'); // Solid steel blue
    horizonGradient.addColorStop(1, 'rgba(70, 130, 180, 0.5)'); // Semi-transparent steel blue
    ctx.strokeStyle = horizonGradient;

    // Draw the horizon line with perspective
    ctx.beginPath();
    const horizonLeftX = 0;
    const horizonRightX = canvas.width;

    ctx.moveTo(horizonLeftX, horizonYPos);
    ctx.lineTo(horizonRightX, horizonYPos);
    ctx.stroke();

    // Add a subtle glow to the horizon
    ctx.shadowColor = 'rgba(70, 130, 180, 0.3)';
    ctx.shadowBlur = 10;
    ctx.stroke();
    ctx.shadowBlur = 0; // Reset shadow

    // Create a fade effect above the horizon
    const fadeHeight = 50; // Height of the fade effect
    const fadeGradient = ctx.createLinearGradient(0, horizonYPos - fadeHeight, 0, horizonYPos);
    fadeGradient.addColorStop(0, 'rgba(135, 206, 235, 0)'); // Transparent sky blue
    fadeGradient.addColorStop(1, 'rgba(135, 206, 235, 1)'); // Solid sky blue
    ctx.fillStyle = fadeGradient;
    ctx.fillRect(0, horizonYPos - fadeHeight, canvas.width, fadeHeight);

    // Save the current context state
    ctx.save();

    // Draw road segments from bottom up (endless effect, always visible)
    for (let i = 0; i < segments; i++) {
        const y1 = canvas.height - i * segmentHeight;
        const y2 = canvas.height - (i + 1) * segmentHeight;

        // Calculate offsets for this segment (not cumulative)
        let xOffset = curveOffset * 0.01 * i;
        let yOffset = hillOffset * 0.01 * i;

        // Clamp xOffset so road never goes beyond half its width from center
        const maxOffset = (canvas.width - roadWidth) / 2;
        xOffset = Math.max(-maxOffset, Math.min(maxOffset, xOffset));

        // Clamp yOffset so road never goes higher than canvas.height/3
        const maxYOffset = canvas.height / 3;
        yOffset = Math.max(-maxYOffset, Math.min(maxYOffset, yOffset));

        const left = baseX - roadWidth / 2 + xOffset;
        const right = baseX + roadWidth / 2 + xOffset;

        // Road base
        ctx.fillStyle = '#555';
        ctx.beginPath();
        ctx.moveTo(left, y1 + yOffset);
        ctx.lineTo(right, y1 + yOffset);
        ctx.lineTo(right, y2 + yOffset);
        ctx.lineTo(left, y2 + yOffset);
        ctx.closePath();
        ctx.fill();

        // Dashed lane lines (for 3 lanes, 2 lines)
        ctx.strokeStyle = '#FFF';
        ctx.setLineDash([10, 15]);
        ctx.lineWidth = 2;
        for (let lane = 1; lane < 3; lane++) {
            const laneX = left + (lane * (right - left) / 3);
            ctx.beginPath();
            ctx.moveTo(laneX, y1 + yOffset);
            ctx.lineTo(laneX, y2 + yOffset);
            ctx.stroke();
        }
        ctx.setLineDash([]);

        // Dashed center line (for visual effect, optional)
        ctx.strokeStyle = '#FFD700';
        ctx.setLineDash([10, 10]);
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo((left + right) / 2, y1 + yOffset);
        ctx.lineTo((left + right) / 2, y2 + yOffset);
        ctx.stroke();
        ctx.setLineDash([]);

        // Solid side lines
        ctx.strokeStyle = '#FFF';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(left, y1 + yOffset);
        ctx.lineTo(left, y2 + yOffset);
        ctx.moveTo(right, y1 + yOffset);
        ctx.lineTo(right, y2 + yOffset);
        ctx.stroke();
    }

    // Restore the context to remove clipping
    ctx.restore();

    // Update car distance
    carDistance += speed;

    // Enable procedural terrain after 200m
    if (carDistance >= 200) {
        if (Math.random() < 0.05) {
            curveDirection = (Math.random() - 0.5) * 1.5; // -0.75 to +0.75
            hillDirection = (Math.random() - 0.5) * 2.5;  // -1.25 to +1.25
        }
        curveOffset += curveDirection;
        hillOffset += hillDirection;
    }
}

// Utility: Get lane boundaries for 3 lanes (call this from your vehicle/obstacle logic)
function getLaneBounds(laneIndex, canvas, roadWidth, baseX, xOffset) {
    // laneIndex: 0 (left), 1 (center), 2 (right)
    const left = baseX - roadWidth / 2 + xOffset;
    const right = baseX + roadWidth / 2 + xOffset;
    const laneWidth = (right - left) / 3;
    const laneLeft = left + laneIndex * laneWidth;
    const laneRight = laneLeft + laneWidth;
    return { laneLeft, laneRight };
}

// To ensure obstacles/vehicles stay on the road, clamp their x-position:
// Example usage (in your vehicle/obstacle logic):
// const { laneLeft, laneRight } = getLaneBounds(laneIndex, canvas, roadWidth, baseX, xOffset);
// vehicle.x = Math.max(laneLeft, Math.min(laneRight, vehicle.x));

// export default drawRoad;

