import * as THREE from 'three';
import * as Tone from 'tone';

// Function to load shader files
async function loadShaderFile(url) {
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`Failed to load shader file: ${url}`);
    }
    return await response.text();
}

// Load shaders and initialize the scene
async function init() {
    try {
        const vertexShader = await loadShaderFile('vertexShader.glsl');
        const fragmentShader = await loadShaderFile('fragmentShader.glsl');

        // ---- 1. SETUP SCENE, CAMERA, AND RENDERER ----
        const scene = new THREE.Scene();
        scene.background = new THREE.Color(0x000000); // Black background

        const renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.setClearColor(0x000000, 1); // Ensure the renderer background is black
        document.body.appendChild(renderer.domElement);

        const canvas = renderer.domElement;
        const SQUARE_SIZE = Math.min(window.innerWidth, window.innerHeight) * 0.8;
        renderer.setSize(SQUARE_SIZE, SQUARE_SIZE);
        renderer.setPixelRatio(window.devicePixelRatio || 1);

        const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 10);
        camera.position.z = 1;

        const uniforms = {
            u_mouse: { value: new THREE.Vector2(0, 0) },
            u_resolution: { value: new THREE.Vector2(SQUARE_SIZE * renderer.getPixelRatio(), SQUARE_SIZE * renderer.getPixelRatio()) },
            u_time: { value: 0.0 },
            u_mouseDown: { value: false },
            u_prevFrame: { value: null },
        };

        // Create two framebuffers for double buffering
        const prevFrameBuffer1 = new THREE.WebGLRenderTarget(SQUARE_SIZE, SQUARE_SIZE, {
            minFilter: THREE.LinearFilter,
            magFilter: THREE.LinearFilter,
            format: THREE.RGBAFormat,
        });
        const prevFrameBuffer2 = new THREE.WebGLRenderTarget(SQUARE_SIZE, SQUARE_SIZE, {
            minFilter: THREE.LinearFilter,
            magFilter: THREE.LinearFilter,
            format: THREE.RGBAFormat,
        });

        let currentBuffer = prevFrameBuffer1;
        let nextBuffer = prevFrameBuffer2;

        const material = new THREE.ShaderMaterial({
            uniforms: uniforms,
            vertexShader: vertexShader,
            fragmentShader: fragmentShader,
            transparent: false, // Ensure no transparency
        });

        const geometry = new THREE.PlaneGeometry(2, 2);
        const plane = new THREE.Mesh(geometry, material);
        scene.add(plane);

        // ---- 3. MOUSE INTERACTION ----
        function updateMousePosition(event) {
            const rect = canvas.getBoundingClientRect();
            const mouseX = (event.clientX - rect.left) / rect.width;
            const mouseY = 1.0 - (event.clientY - rect.top) / rect.height;

            uniforms.u_mouse.value.set(mouseX * uniforms.u_resolution.value.x, mouseY * uniforms.u_resolution.value.y);

            // Clamp the wet parameter to the range [0, 1]
            const clampedMouseX = Math.max(0, Math.min(1, mouseX));
            const clampedMouseY = Math.max(0, Math.min(1, mouseY));

            // Update effect parameters based on mouse position only if mouse is down
            if (uniforms.u_mouseDown.value) {
                if (effect1) {
                    effect1.set({ wet: clampedMouseX });
                    document.querySelector('#effect1-parameters input[data-param="wet"]').value = clampedMouseX;
                }
                if (effect2) {
                    effect2.set({ wet: clampedMouseY });
                    document.querySelector('#effect2-parameters input[data-param="wet"]').value = clampedMouseY;
                }
            }
        }

        window.addEventListener('mousemove', updateMousePosition);

        // Add event listeners to update the mouse state
        window.addEventListener('mousedown', () => {
            uniforms.u_mouseDown.value = true;
        });

        window.addEventListener('mouseup', () => {
            uniforms.u_mouseDown.value = false;
        });

        // ---- 4. HANDLE RESIZE ----
        window.addEventListener('resize', () => {
            const SQUARE_SIZE = Math.min(window.innerWidth, window.innerHeight) * 0.8;
            renderer.setSize(SQUARE_SIZE, SQUARE_SIZE);
            uniforms.u_resolution.value.set(SQUARE_SIZE * renderer.getPixelRatio(), SQUARE_SIZE * renderer.getPixelRatio());
        });

        // ---- 5. RENDER LOOP ----
        // Update the time uniform in the render loop
        function animate() {
            uniforms.u_time.value += 0.05;

            // Render the scene to the current framebuffer
            renderer.setRenderTarget(currentBuffer);
            renderer.render(scene, camera);
            renderer.setRenderTarget(null);

            // Update the previous frame uniform
            uniforms.u_prevFrame.value = currentBuffer.texture;

            // Swap the framebuffers
            [currentBuffer, nextBuffer] = [nextBuffer, currentBuffer];

            // Render the scene to the screen
            renderer.render(scene, camera);

            requestAnimationFrame(animate);
        }

        animate();

        // ---- 6. TONE.JS INTEGRATION ----
        // Create a limiter to prevent clipping
        const limiter = new Tone.Limiter(-12).toDestination();

        // Initialize the synth and envelope
        const synth = new Tone.PolySynth(Tone.Synth).toDestination();

        // Function to update the synth's envelope
        function updateEnvelope() {
            const attack = parseFloat(document.getElementById('attack').value);
            const decay = parseFloat(document.getElementById('decay').value);
            const sustain = parseFloat(document.getElementById('sustain').value);
            const release = parseFloat(document.getElementById('release').value);

            synth.set({
                envelope: {
                    attack: attack,
                    decay: decay,
                    sustain: sustain,
                    release: release
                }
            });
        }

        // Function to update the synth's wave type
        function updateWaveType() {
            const waveType = document.getElementById('waveType').value;
            synth.set({
                oscillator: {
                    type: waveType
                }
            });
        }

        // Add event listeners to the envelope controls
        document.getElementById('attack').addEventListener('input', updateEnvelope);
        document.getElementById('decay').addEventListener('input', updateEnvelope);
        document.getElementById('sustain').addEventListener('input', updateEnvelope);
        document.getElementById('release').addEventListener('input', updateEnvelope);

        // Add event listener to the wave type control
        document.getElementById('waveType').addEventListener('change', updateWaveType);

        // Initialize the envelope and wave type with default values
        updateEnvelope();
        updateWaveType();

        // Map keyboard keys to musical notes
        const keyToNote = {
            'q': 'C4',
            '2': 'C#4',
            'w': 'D4',
            '3': 'D#4',
            'e': 'E4',
            'r': 'F4',
            '5': 'F#4',
            't': 'G4',
            '6': 'G#4',
            'y': 'A4',
            '7': 'A#4',
            'u': 'B4',
            'i': 'C5',
            '9': 'C#5',
            'o': 'D5',
            '0': 'D#5',
            'p': 'E5',
        };

        // Track currently playing notes
        const activeNotes = {};

        // Add event listener for keyboard events
        window.addEventListener('keydown', (event) => {
            const note = keyToNote[event.key];
            if (note && !activeNotes[event.key]) {
                synth.triggerAttack(note);
                activeNotes[event.key] = note;
            }
        });

        window.addEventListener('keyup', (event) => {
            const note = activeNotes[event.key];
            if (note) {
                synth.triggerRelease(note);
                delete activeNotes[event.key];
            }
        });

        // ---- 7. POPULATE DROPDOWN BOXES WITH TONE.JS EFFECTS ----
        const effects = [
            'None', 'AutoFilter', 'AutoPanner', 'AutoWah', 'BitCrusher', 'Chorus', 'Distortion', 'FeedbackDelay', 'Freeverb', 'JCReverb', 'Phaser', 'PingPongDelay', 'PitchShift', 'Reverb', 'StereoWidener', 'Tremolo', 'Vibrato'
        ];

        const effect1Dropdown = document.getElementById('effect1');
        const effect2Dropdown = document.getElementById('effect2');

        effects.forEach(effect => {
            const option1 = document.createElement('option');
            option1.value = effect;
            option1.text = effect;
            effect1Dropdown.appendChild(option1);

            const option2 = document.createElement('option');
            option2.value = effect;
            option2.text = effect;
            effect2Dropdown.appendChild(option2);
        });

        let effect1 = null;
        let effect2 = null;

        // Function to create parameter controls
        function createParameterControls(effect, container) {
            container.innerHTML = ''; // Clear previous controls
            if (effect === 'None') return; // No parameters for 'None'
            Object.keys(effect).forEach(param => {
                if (typeof effect[param] === 'object' && effect[param].value !== undefined) {
                    const control = document.createElement('div');
                    control.innerHTML = `
                        <label>${param}: <input type="range" min="0" max="1" step="0.01" value="${effect[param].value}" data-param="${param}"></label>
                    `;
                    control.querySelector('input').addEventListener('input', (e) => {
                        effect[param].value = parseFloat(e.target.value);
                    });
                    container.appendChild(control);
                }
            });
        }

        // Add event listeners to update effects based on dropdown selection
        effect1Dropdown.addEventListener('change', () => {
            if (effect1) {
                synth.disconnect(effect1);
                effect1.dispose();
            }
            const selectedEffect = effect1Dropdown.value;
            if (selectedEffect === 'None') {
                effect1 = null;
                document.getElementById('effect1-parameters').innerHTML = '';
            } else {
                effect1 = new Tone[selectedEffect]().toDestination();
                synth.connect(effect1);
                createParameterControls(effect1, document.getElementById('effect1-parameters'));
            }
        });

        effect2Dropdown.addEventListener('change', () => {
            if (effect2) {
                synth.disconnect(effect2);
                effect2.dispose();
            }
            const selectedEffect = effect2Dropdown.value;
            if (selectedEffect === 'None') {
                effect2 = null;
                document.getElementById('effect2-parameters').innerHTML = '';
            } else {
                effect2 = new Tone[selectedEffect]().toDestination();
                synth.connect(effect2);
                createParameterControls(effect2, document.getElementById('effect2-parameters'));
            }
        });

        // Trigger change events to initialize parameter panels for default selections
        effect1Dropdown.dispatchEvent(new Event('change'));
        effect2Dropdown.dispatchEvent(new Event('change'));
    } catch (error) {
        console.error('Error initializing the scene:', error);
    }
}

init();
