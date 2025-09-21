document.addEventListener('DOMContentLoaded', () => {
            const scene = document.getElementById('scene');
            const particleContainer = document.getElementById('particle-container');
            const soundToggle = document.getElementById('sound-toggle');
            const soundOnIcon = document.getElementById('sound-on-icon');
            const soundOffIcon = document.getElementById('sound-off-icon');
            const generateBtn = document.getElementById('generate-btn');
            const reshuffleBtn = document.getElementById('reshuffle-btn');
            const resetBtn = document.getElementById('reset-btn');
            const clearAllBtn = document.getElementById('clear-all-btn');
            const trashCan = document.getElementById('trash-can');
            const palette = document.querySelector('.palette');
            const titleText = document.getElementById('title-text');
            const backgroundBlur = document.getElementById('background-blur');
            const ground = document.getElementById('ground');
            const seasonButtons = document.querySelectorAll('.season-btn');

            let isMuted = false;
            let draggedItem = null;
            let offsetX, offsetY;
            let isUpdatePending = false;
            let currentSeason = 'winter';
            let particleInterval;

            // --- SVG and Season Data ---
            const svgAssets = {
                // Winter
                reindeer: `<svg viewBox="0 0 24 24" fill="saddlebrown"><path d="M19,8.5c0-2.21-1.79-4-4-4s-4,1.79-4,4c0,1.85,1.26,3.42,3,3.87V14H7v-2.73c1.74-0.45,3-2.02,3-3.87c0-2.21-1.79-4-4-4S2,3.79,2,6.5c0,1.85,1.26,3.42,3,3.87V17h14v-4.63c1.74-0.45,3-2.02,3-3.87ZM5,8.5c0-1.1,0.9-2,2-2s2,0.9,2,2-0.9,2-2,2S5,9.6,5,8.5Zm12,0c0-1.1,0.9-2,2-2s2,0.9,2,2-0.9,2-2,2S17,9.6,17,8.5Z"/></svg>`,
                gift: `<svg viewBox="0 0 24 24" fill="#d32f2f"><path d="M20 12v8H4v-8H2v8c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2v-8h-2zM12 2l4 4h-3v4h-2V6H8l4-4zM4 10h16v2H4v-2z"/></svg>`,
                star: `<svg viewBox="0 0 24 24" fill="gold"><path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/></svg>`,
                ornament: `<svg viewBox="0 0 24 24" fill="#1976d2"><path d="M12 2c-4.42 0-8 3.58-8 8s8 12 8 12 8-7.58 8-12-3.58-8-8-8zm0 2c1.1 0 2 .9 2 2s-.9 2-2 2-2-.9-2-2 .9-2 2-2z"/></svg>`,
                gingerbread: `<svg viewBox="0 0 24 24" fill="#af866b"><path d="M18.5 9.5c-1.93 0-3.5 1.57-3.5 3.5s1.57 3.5 3.5 3.5 3.5-1.57 3.5-3.5-1.57-3.5-3.5-3.5zm-13 0C3.57 9.5 2 11.07 2 13s1.57 3.5 3.5 3.5 3.5-1.57 3.5-3.5-1.57-3.5-3.5-3.5zm6.5-5C9.12 4.5 7 6.62 7 9.5h10c0-2.88-2.12-5-5-5zM5.5 18h13c0 2.21-1.79 4-4 4h-5c-2.21 0-4-1.79-4-4z"/></svg>`,
                'candy-cane': `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><path d="M60 5a20 20 0 0 1 0 40H40v50h20V45a20 20 0 0 1 0-40z" fill="white"/><path d="M40 5h10v90H40zM60 15h10v10H60zM60 35h10v10H60zM40 55h20v10H40zM40 75h20v10H40z" fill="#D32F2F"/></svg>`,
                holly: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><path d="M50 10 C 20 20, 20 80, 50 90 C 80 80, 80 20, 50 10 Z" fill="#1E8449"/><path d="M50 10 C 60 40, 90 40, 90 10" fill="#1E8449"/><circle cx="50" cy="50" r="10" fill="#C0392B"/><circle cx="65" cy="60" r="8" fill="#E74C3C"/><circle cx="35" cy="60" r="8" fill="#E74C3C"/></svg>`,
                'snowflake-sticker': `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" fill="none" stroke="white" stroke-width="5" stroke-linecap="round"><path d="M50 10 v 80 M10 50 h 80 M20 20 l 60 60 M20 80 l 60 -60"/><path d="M50 10 l 15 15 M50 10 l -15 15 M50 90 l 15 -15 M50 90 l -15 -15 M10 50 l 15 15 M10 50 l 15 -15 M90 50 l -15 15 M90 50 l -15 -15"/></svg>`,
                tree: `<svg viewBox="0 0 100 125" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M50 5L10 45h15l-10 20h20l-10 20h50l-10-20h20l-10-20h15L50 5z" fill="#2F855A"/><path d="M45 85h10v10H45z" fill="#795548"/></svg>`,
                snowman: `<svg viewBox="0 0 100 125" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="50" cy="30" r="15" fill="white"/><circle cx="50" cy="65" r="25" fill="white"/><path d="M48 28h4v4h-4zM52 28h4v4h-4z" fill="black"/><path d="M50 35l10 5-10 2z" fill="orange"/><path d="M48 55h4v4h-4zM48 65h4v4h-4zM48 75h4v4h-4z" fill="black"/></svg>`,
                mitten: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><path d="M30 90 C 10 70, 10 30, 40 10 L 60 10 C 90 30, 90 70, 70 90 Z" fill="#4682B4"/><path d="M60 40 C 70 30, 80 40, 70 50 Z" fill="#4682B4"/></svg>`,
                'hot-cocoa': `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><rect x="20" y="30" width="60" height="50" rx="10" fill="#8B4513"/><path d="M80 40 C 95 40, 95 70, 80 70" fill="none" stroke="#8B4513" stroke-width="10"/></svg>`,
                // Spring
                tulip: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><path d="M40 10 C 20 10, 20 50, 40 50 C 30 30, 50 10, 50 10 C 50 10, 70 30, 60 50 C 80 50, 80 10, 60 10 Z" fill="#E74C3C"/><path d="M50 50 V 90 H 45 V 50 Z" fill="#2ECC71"/></svg>`,
                daisy: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><circle cx="50" cy="50" r="15" fill="yellow"/><path d="M50 5 L 40 40 L 50 50 L 60 40 Z" fill="white" stroke="gray" stroke-width="1"/><path d="M95 50 L 60 60 L 50 50 L 60 40 Z" fill="white" stroke="gray" stroke-width="1"/><path d="M50 95 L 40 60 L 50 50 L 60 60 Z" fill="white" stroke="gray" stroke-width="1"/><path d="M5 50 L 40 40 L 50 50 L 40 60 Z" fill="white" stroke="gray" stroke-width="1"/><path d="M20 20 L 40 40 L 50 50 L 30 30 Z" transform="rotate(10 50 50)" fill="white" stroke="gray" stroke-width="1"/><path d="M80 20 L 60 40 L 50 50 L 70 30 Z" transform="rotate(-10 50 50)" fill="white" stroke="gray" stroke-width="1"/><path d="M20 80 L 40 60 L 50 50 L 30 70 Z" transform="rotate(-10 50 50)" fill="white" stroke="gray" stroke-width="1"/><path d="M80 80 L 60 60 L 50 50 L 70 70 Z" transform="rotate(10 50 50)" fill="white" stroke="gray" stroke-width="1"/></svg>`,
                butterfly: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><path d="M 20 20 C 50 10, 50 50, 50 50 C 50 50, 50 10, 80 20 C 90 50, 50 50, 50 50 Z" fill="#3498DB"/><path d="M 20 80 C 50 90, 50 50, 50 50 C 50 50, 50 90, 80 80 C 90 50, 50 50, 50 50 Z" fill="#8E44AD"/><path d="M50 30 L 55 50 L 50 70" fill="none" stroke="black" stroke-width="3"/></svg>`,
                rainbow: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><path d="M 10 90 A 40 40 0 0 1 90 90" stroke="#FF0000" stroke-width="8" fill="none"/><path d="M 20 90 A 30 30 0 0 1 80 90" stroke="#FFA500" stroke-width="8" fill="none"/><path d="M 30 90 A 20 20 0 0 1 70 90" stroke="#FFFF00" stroke-width="8" fill="none"/><path d="M 40 90 A 10 10 0 0 1 60 90" stroke="#008000" stroke-width="8" fill="none"/></svg>`,
                bird: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><path d="M20 50 C 40 20, 60 20, 80 50 C 60 80, 40 80, 20 50 Z" fill="#87CEEB"/><circle cx="70" cy="45" r="5" fill="black"/></svg>`,
                // Summer
                sun: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><circle cx="50" cy="50" r="30" fill="orange"/><line x1="50" y1="10" x2="50" y2="20" stroke="orange" stroke-width="5"/><line x1="50" y1="80" x2="50" y2="90" stroke="orange" stroke-width="5"/><line x1="10" y1="50" x2="20" y2="50" stroke="orange" stroke-width="5"/><line x1="80" y1="50" x2="90" y2="50" stroke="orange" stroke-width="5"/><line x1="22" y1="22" x2="29" y2="29" stroke="orange" stroke-width="5"/><line x1="71" y1="71" x2="78" y2="78" stroke="orange" stroke-width="5"/><line x1="22" y1="78" x2="29" y2="71" stroke="orange" stroke-width="5"/><line x1="71" y1="29" x2="78" y2="22" stroke="orange" stroke-width="5"/></svg>`,
                'ice-cream': `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><path d="M30 90 L 50 40 L 70 90 Z" fill="#D2B48C"/><circle cx="50" cy="30" r="25" fill="#FFC0CB"/></svg>`,
                'beach-ball': `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><circle cx="50" cy="50" r="45" fill="#F1C40F"/><path d="M50 5 A 45 45 0 0 1 95 50 L 50 50 Z" fill="#3498DB"/><path d="M5 50 A 45 45 0 0 1 50 95 L 50 50 Z" fill="#E74C3C"/></svg>`,
                sunglasses: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><path d="M10 40 C 10 20, 40 20, 40 40 L 40 60 C 40 80, 10 80, 10 60 Z" fill="black"/><path d="M60 40 C 60 20, 90 20, 90 40 L 90 60 C 90 80, 60 80, 60 60 Z" fill="black"/><line x1="40" y1="40" x2="60" y2="40" stroke="black" stroke-width="5"/></svg>`,
                watermelon: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><path d="M10 80 A 40 40 0 0 1 90 80 L 10 80 Z" fill="#2ECC71"/><path d="M20 80 A 30 30 0 0 1 80 80 L 20 80 Z" fill="#F08080"/><circle cx="40" cy="70" r="3" fill="black"/><circle cx="50" cy="60" r="3" fill="black"/><circle cx="60" cy="70" r="3" fill="black"/></svg>`,
                // Autumn
                'maple-leaf': `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><path d="M50 90 L 50 70 L 40 60 L 10 50 L 30 30 L 20 10 L 50 30 L 80 10 L 70 30 L 90 50 L 60 60 L 50 70 Z" fill="#E67E22"/></svg>`,
                pumpkin: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><ellipse cx="50" cy="60" rx="40" ry="30" fill="#F39C12"/><rect x="45" y="20" width="10" height="20" fill="#27AE60"/></svg>`,
                acorn: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><path d="M30 40 C 30 20, 70 20, 70 40 L 70 60 C 70 80, 30 80, 30 60 Z" fill="#A0522D"/><rect x="30" y="30" width="40" height="20" rx="10" fill="#8B4513"/><line x1="50" y1="30" x2="50" y2="10" stroke="#8B4513" stroke-width="5"/></svg>`,
                mushroom: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><path d="M20 50 C 20 20, 80 20, 80 50 Z" fill="#D2691E"/><rect x="40" y="50" width="20" height="40" fill="#F5DEB3"/></svg>`,
                scarf: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><path d="M10 20 L 90 20 L 80 40 L 20 40 Z" fill="#A52A2A"/><path d="M10 40 L 90 40 L 80 60 L 20 60 Z" fill="#FFFACD"/><path d="M10 60 L 90 60 L 80 80 L 20 80 Z" fill="#A52A2A"/></svg>`,
            };

            const seasons = {
                winter: {
                    title: "Happy Winter!",
                    background: 'linear-gradient(to bottom, #001a33, #003366, #336699)',
                    ground: '#f0f4f7',
                    palette: ['reindeer', 'gift', 'star', 'ornament', 'gingerbread', 'candy-cane', 'holly', 'snowflake-sticker', 'tree', 'snowman', 'mitten', 'hot-cocoa'],
                    defaultItems: [
                        { type: 'tree', style: 'left: 65%; top: 40%; width: 150px;' },
                        { type: 'snowman', style: 'left: 20%; top: 55%; width: 100px;' }
                    ],
                    particle: 'snowflake'
                },
                spring: {
                    title: "Happy Spring!",
                    background: 'linear-gradient(to bottom, #87CEEB, #B0E0E6, #98FB98)',
                    ground: '#3CB371',
                    palette: ['tulip', 'daisy', 'butterfly', 'tree', 'sun', 'rainbow', 'bird'],
                    defaultItems: [
                        { type: 'tree', style: 'left: 15%; top: 45%; width: 120px;' },
                        { type: 'tulip', style: 'left: 70%; top: 65%; width: 80px;' }
                    ],
                    particle: 'petal'
                },
                summer: {
                    title: "Hello Summer!",
                    background: 'linear-gradient(to bottom, #FFD700, #FFA500, #FF8C00)',
                    ground: '#F0E68C',
                    palette: ['sun', 'ice-cream', 'beach-ball', 'ornament', 'sunglasses', 'watermelon'],
                    defaultItems: [
                        { type: 'sun', style: 'left: 75%; top: 15%; width: 130px;' },
                        { type: 'beach-ball', style: 'left: 20%; top: 60%; width: 90px;' }
                    ],
                    particle: null
                },
                autumn: {
                    title: "Happy Autumn!",
                    background: 'linear-gradient(to bottom, #D2691E, #CD853F, #DEB887)',
                    ground: '#8B4513',
                    palette: ['maple-leaf', 'pumpkin', 'acorn', 'tree', 'mushroom', 'scarf'],
                    defaultItems: [
                        { type: 'tree', style: 'left: 70%; top: 40%; width: 140px;' },
                        { type: 'pumpkin', style: 'left: 25%; top: 60%; width: 100px;' }
                    ],
                    particle: 'leaf'
                }
            };
            
            // --- Sound Definitions ---
            const itemSounds = {
                reindeer: 'A4', gift: 'C5', star: 'G5', ornament: 'E5', gingerbread: 'D5', tree: 'C4', snowman: 'F4', 'candy-cane': 'B4', holly: 'F5', 'snowflake-sticker': 'A5', mitten: 'D4', 'hot-cocoa': 'E4',
                tulip: 'C#5', daisy: 'D#5', butterfly: 'F#5', rainbow: 'C6', bird: 'G5',
                sun: 'G5', 'ice-cream': 'A5', 'beach-ball': 'B5', sunglasses: 'E4', watermelon: 'F#4',
                'maple-leaf': 'A4', pumpkin: 'G4', acorn: 'F4', mushroom: 'A3', scarf: 'B3',
                delete: 'C3', default: 'C5'
            };

            const synth = new Tone.Synth({
                oscillator: { type: 'sine' },
                envelope: { attack: 0.005, decay: 0.1, sustain: 0.3, release: 1 },
            }).toDestination();

            function playSound(noteOrType = 'default') {
                const note = itemSounds[noteOrType] || noteOrType;
                if (!isMuted && Tone.context.state !== 'running') Tone.start();
                if (!isMuted) synth.triggerAttackRelease(note, '8n', Tone.now());
            }

            soundToggle.addEventListener('click', () => {
                isMuted = !isMuted;
                soundOnIcon.classList.toggle('hidden', isMuted);
                soundOffIcon.classList.toggle('hidden', !isMuted);
                if (!isMuted && Tone.context.state !== 'running') Tone.start();
            });

            // --- Particle Animation ---
            function createParticle(type) {
                if (!type) return;
                const particle = document.createElement('div');
                particle.classList.add('particle');
                
                if (type === 'snowflake') {
                    const size = Math.random() * 4 + 2;
                    particle.style.width = `${size}px`;
                    particle.style.height = `${size}px`;
                    particle.style.background = 'white';
                    particle.style.borderRadius = '50%';
                } else if (type === 'petal') {
                    const size = Math.random() * 6 + 4;
                    particle.style.width = `${size}px`;
                    particle.style.height = `${size}px`;
                    particle.style.background = ['#FFC0CB', '#FFB6C1', '#FF69B4'][Math.floor(Math.random() * 3)];
                    particle.style.borderRadius = '0 50% 0 50%';
                } else if (type === 'leaf') {
                    const size = Math.random() * 8 + 6;
                    particle.innerHTML = `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><path d="M50 90 L 50 70 L 40 60 L 10 50 L 30 30 L 20 10 L 50 30 L 80 10 L 70 30 L 90 50 L 60 60 L 50 70 Z" fill="${['#E67E22', '#D35400', '#C0392B'][Math.floor(Math.random() * 3)]}"/></svg>`;
                    particle.style.width = `${size}px`;
                    particle.style.height = `${size}px`;
                }

                particle.style.left = `${Math.random() * 100}vw`;
                const duration = Math.random() * 5 + 7;
                particle.style.animationDuration = `${duration}s`;
                particle.style.animationDelay = `${Math.random() * 7}s`;
                
                particleContainer.appendChild(particle);

                setTimeout(() => particle.remove(), (duration + 7) * 1000);
            }

            function startParticles(type) {
                clearInterval(particleInterval);
                particleContainer.innerHTML = '';
                if (type) {
                    for (let i = 0; i < 40; i++) createParticle(type);
                    particleInterval = setInterval(() => createParticle(type), 500);
                }
            }

            // --- Scene Rendering ---
            function renderSeason(seasonName) {
                currentSeason = seasonName;
                const seasonData = seasons[seasonName];
                
                backgroundBlur.style.background = seasonData.background;
                ground.style.background = seasonData.ground;
                ground.style.borderTopColor = seasonData.ground;
                titleText.textContent = seasonData.title;

                seasonButtons.forEach(btn => {
                    btn.classList.toggle('active', btn.dataset.season === seasonName);
                });

                clearAllItems();
                palette.innerHTML = '';

                seasonData.palette.forEach(type => {
                    const stickerDiv = document.createElement('div');
                    stickerDiv.className = "sticker w-10 h-10 flex-shrink-0 bg-white/20 rounded-full p-1";
                    stickerDiv.draggable = true;
                    stickerDiv.dataset.type = type;
                    stickerDiv.innerHTML = svgAssets[type];
                    palette.appendChild(stickerDiv);
                    stickerDiv.addEventListener('dragstart', (e) => {
                        e.dataTransfer.setData('text/plain', stickerDiv.dataset.type);
                        e.dataTransfer.effectAllowed = 'copy';
                    });
                });

                seasonData.defaultItems.forEach(itemData => {
                    const newItem = document.createElement('div');
                    newItem.className = 'scene-item sticker';
                    newItem.dataset.type = itemData.type;
                    newItem.style.cssText = itemData.style;
                    newItem.innerHTML = svgAssets[itemData.type];
                    scene.appendChild(newItem);
                    addSceneItemListeners(newItem);
                });

                startParticles(seasonData.particle);
            }

            seasonButtons.forEach(button => {
                button.addEventListener('click', () => renderSeason(button.dataset.season));
            });

            // --- Scene Control Functions ---
            function clearAllItems() {
                document.querySelectorAll('.scene-item').forEach(item => item.remove());
            }

            function resetCurrentScene() {
                renderSeason(currentSeason);
                playSound('G4');
            }

            function reshuffleScene() {
                const allItems = document.querySelectorAll('.scene-item');
                const sceneRect = scene.getBoundingClientRect();

                allItems.forEach(item => {
                    item.style.transition = 'left 0.5s ease-in-out, top 0.5s ease-in-out';
                    const newX = Math.random() * (sceneRect.width - item.offsetWidth);
                    const newY = Math.random() * (sceneRect.height - item.offsetHeight);
                    item.style.left = `${newX}px`;
                    item.style.top = `${newY}px`;
                    setTimeout(() => { item.style.transition = ''; }, 500);
                });
                playSound('E5');
            }

            function generateRandomScene() {
                const randomSeason = Object.keys(seasons)[Math.floor(Math.random() * 4)];
                renderSeason(randomSeason);
                setTimeout(() => {
                    clearAllItems();
                    const sceneRect = scene.getBoundingClientRect();
                    const itemCount = Math.floor(Math.random() * 8) + 7;
                    const currentPalette = seasons[randomSeason].palette;

                    for (let i = 0; i < itemCount; i++) {
                        const type = currentPalette[Math.floor(Math.random() * currentPalette.length)];
                        const originalSticker = document.querySelector(`.palette .sticker[data-type="${type}"]`);
                        if (!originalSticker) continue;
                        const newItem = originalSticker.cloneNode(true);
                        newItem.classList.remove('w-10', 'h-10', 'bg-white/20', 'rounded-full', 'p-1');
                        newItem.classList.add('scene-item');
                        const randomSize = Math.random() * 50 + 70;
                        newItem.style.width = `${randomSize}px`;
                        newItem.draggable = false;
                        const newX = Math.random() * (sceneRect.width - randomSize);
                        const newY = Math.random() * (sceneRect.height - randomSize);
                        newItem.style.left = `${newX}px`;
                        newItem.style.top = `${newY}px`;
                        scene.appendChild(newItem);
                        addSceneItemListeners(newItem);
                    }
                }, 100);
                playSound('C6');
            }

            resetBtn.addEventListener('click', resetCurrentScene);
            reshuffleBtn.addEventListener('click', reshuffleScene);
            generateBtn.addEventListener('click', generateRandomScene);
            clearAllBtn.addEventListener('click', () => {
                clearAllItems();
                playSound('delete');
            });

            // --- Drag and Drop Logic ---
            function startDrag(item, event) {
                event.preventDefault();
                draggedItem = item;
                const touch = event.touches ? event.touches[0] : event;
                const rect = draggedItem.getBoundingClientRect();
                offsetX = touch.clientX - rect.left;
                offsetY = touch.clientY - rect.top;
                draggedItem.classList.add('dragging');
            }

            scene.addEventListener('dragover', (e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'copy';
            });

            scene.addEventListener('drop', (e) => {
                e.preventDefault();
                const type = e.dataTransfer.getData('text/plain').trim();
                if (!type) return;

                const originalSticker = document.querySelector(`.palette .sticker[data-type="${type}"]`);
                if (!originalSticker) return;

                const newItem = originalSticker.cloneNode(true);
                newItem.classList.remove('w-10', 'h-10', 'bg-white/20', 'rounded-full', 'p-1');
                newItem.classList.add('scene-item');
                newItem.style.width = '80px';
                newItem.draggable = false;

                const sceneRect = scene.getBoundingClientRect();
                newItem.style.left = `${e.clientX - sceneRect.left - 40}px`;
                newItem.style.top = `${e.clientY - sceneRect.top - 40}px`;

                scene.appendChild(newItem);
                
                playSound(type);
                newItem.classList.add('shaking');
                setTimeout(() => newItem.classList.remove('shaking'), 500);

                addSceneItemListeners(newItem);
            });

            function addSceneItemListeners(item) {
                item.draggable = false;
                item.addEventListener('mousedown', (e) => startDrag(item, e));
                item.addEventListener('touchstart', (e) => startDrag(item, e));
                item.addEventListener('wheel', (e) => {
                    e.preventDefault();
                    const scaleAmount = 5;
                    const minWidth = 30;
                    const maxWidth = 300;
                    let currentWidth = item.offsetWidth;
                    if (e.deltaY < 0) currentWidth += scaleAmount;
                    else currentWidth -= scaleAmount;
                    item.style.width = `${Math.max(minWidth, Math.min(currentWidth, maxWidth))}px`;
                });
            }

            function handleMove(clientX, clientY) {
                if (!draggedItem || isUpdatePending) return;
                
                isUpdatePending = true;
                requestAnimationFrame(() => {
                    if (!draggedItem) {
                        isUpdatePending = false;
                        return;
                    }
                    const sceneRect = scene.getBoundingClientRect();
                    let x = clientX - sceneRect.left - offsetX;
                    let y = clientY - sceneRect.top - offsetY;
                    x = Math.max(0, Math.min(x, sceneRect.width - draggedItem.offsetWidth));
                    y = Math.max(0, Math.min(y, sceneRect.height - draggedItem.offsetHeight));
                    draggedItem.style.left = `${x}px`;
                    draggedItem.style.top = `${y}px`;
                    
                    const trashRect = trashCan.getBoundingClientRect();
                    const isOverTrash = (clientX > trashRect.left && clientX < trashRect.right && clientY > trashRect.top && clientY < trashRect.bottom);
                    trashCan.classList.toggle('trash-active', isOverTrash);
                    draggedItem.classList.toggle('over-trash', isOverTrash);
                    isUpdatePending = false;
                });
            }

            function shatterEffect(element) {
                const rect = element.getBoundingClientRect();
                const sceneRect = scene.getBoundingClientRect();
                const numberOfShards = 30;

                const container = document.createElement('div');
                container.style.position = 'absolute';
                container.style.left = `${rect.left - sceneRect.left}px`;
                container.style.top = `${rect.top - sceneRect.top}px`;
                container.style.width = `${rect.width}px`;
                container.style.height = `${rect.height}px`;
                container.style.pointerEvents = 'none';
                scene.appendChild(container);

                let colors = [];
                const fillElements = element.querySelectorAll('svg[fill]');
                const strokeElements = element.querySelectorAll('svg[stroke]');
                const pathElements = element.querySelectorAll('svg>*[fill]');
                colors = colors.concat(Array.from(fillElements).map(el => el.getAttribute('fill')));
                colors = colors.concat(Array.from(strokeElements).map(el => el.getAttribute('stroke')));
                colors = colors.concat(Array.from(pathElements).map(el => el.getAttribute('fill')));

                if (colors.length === 0) {
                    colors.push('white'); // Final fallback
                }

                for (let i = 0; i < numberOfShards; i++) {
                    const shard = document.createElement('div');
                    shard.style.position = 'absolute';
                    shard.style.left = `${Math.random() * 90}%`;
                    shard.style.top = `${Math.random() * 90}%`;
                    shard.style.width = `${Math.random() * 5 + 2}px`;
                    shard.style.height = shard.style.width;
                    shard.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
                    
                    const tx = (Math.random() - 0.5) * 250;
                    const ty = (Math.random() - 0.5) * 250;
                    const rot = (Math.random() - 0.5) * 720;
                    
                    shard.style.setProperty('--tx', `${tx}px`);
                    shard.style.setProperty('--ty', `${ty}px`);
                    shard.style.setProperty('--rot', `${rot}deg`);

                    shard.classList.add('shard');
                    container.appendChild(shard);
                }

                element.remove();
                setTimeout(() => container.remove(), 800);
            }

            function endDrag() {
                if (!draggedItem) return;
                const isOverTrash = trashCan.classList.contains('trash-active');
                if (isOverTrash) {
                    shatterEffect(draggedItem);
                    playSound('delete');
                } else {
                    const itemJustDropped = draggedItem;
                    itemJustDropped.classList.remove('dragging');
                    playSound(itemJustDropped.dataset.type);
                    itemJustDropped.classList.add('shaking');
                    setTimeout(() => itemJustDropped.classList.remove('shaking'), 500);
                }
                draggedItem = null;
                trashCan.classList.remove('trash-active');
            }

            window.addEventListener('mouseup', endDrag);
            window.addEventListener('touchend', endDrag);
            window.addEventListener('blur', endDrag);
            window.addEventListener('mousemove', (e) => { if (draggedItem) handleMove(e.clientX, e.clientY); });
            window.addEventListener('touchmove', (e) => { if (draggedItem) handleMove(e.touches[0].clientX, e.touches[0].clientY); }, { passive: false });
            
            // --- Drag to Scroll for Palette ---
            let isDown = false;
            let startX;
            let scrollLeft;

            palette.addEventListener('mousedown', (e) => {
                isDown = true;
                palette.classList.add('active');
                startX = e.pageX - palette.offsetLeft;
                scrollLeft = palette.scrollLeft;
            });
            palette.addEventListener('mouseleave', () => { isDown = false; palette.classList.remove('active'); });
            palette.addEventListener('mouseup', () => { isDown = false; palette.classList.remove('active'); });
            palette.addEventListener('mousemove', (e) => {
                if (!isDown) return;
                e.preventDefault();
                const x = e.pageX - palette.offsetLeft;
                const walk = (x - startX) * 2;
                palette.scrollLeft = scrollLeft - walk;
            });
            palette.addEventListener('wheel', (e) => { e.preventDefault(); palette.scrollLeft += e.deltaY; });
            
            // Initial render
            renderSeason('winter');
        });