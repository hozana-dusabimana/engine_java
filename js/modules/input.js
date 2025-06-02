document.addEventListener('keydown', (e) => {
            keys[e.code] = true;
            
            if (e.code === 'Escape') {
                if (gameState === 'playing') {
                    gameState = 'paused';
                    sounds.beep();
                } else if (gameState === 'paused') {
                    gameState = 'playing';
                    sounds.beep();
                }
            }
            
            if (e.code === 'KeyR') {
                musicEnabled = !musicEnabled;
                sounds.beep();
                if (musicEnabled && gameState === 'playing') {
                    playBackgroundMusic();
                }
            }
            
            if (e.code === 'KeyM') {
                showMiniMap = !showMiniMap;
                sounds.beep();
            }
            
            if (e.code === 'KeyF') {
                freeRideMode = !freeRideMode;
                sounds.beep();
            }
            
            if (e.code === 'Space' || e.code === 'Enter') {
                e.preventDefault();
                if (gameState === 'menu') {
                    startGame();
                } else if (gameState === 'gameover' || gameState === 'victory') {
                    gameState = 'menu';
                    sounds.beep();
                }
            }
        });

        document.addEventListener('keyup', (e) => {
            keys[e.code] = false;
        });

        
        canvas.addEventListener('click', (e) => {
            if (gameState === 'menu') {
                startGame();
            } else if (gameState === 'gameover' || gameState === 'victory') {
                gameState = 'menu';
                sounds.beep();
            }
        });

        
        function startGame() {
            gameState = 'playing';
            resetGame();
            initSignposts();
            initMusic();
            if (musicEnabled) {
                playBackgroundMusic();
            }
            sounds.levelUp();
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
            roadOffset = 0;
            aiCars = [];
            obstacles = [];
            particles = [];
        }