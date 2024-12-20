import * as THREE from 'three';
import * as Tone from 'tone';

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

// ---- 2. SHADER CODE ----
const vertexShader = `
    varying vec2 vUv;
    void main() {
        vUv = uv;
        gl_Position = vec4(position, 1.0);
    }
`;

const fragmentShader = `
    uniform vec2 u_mouse;
    uniform vec2 u_resolution;
    uniform float u_time;
    uniform bool u_mouseDown;
    uniform sampler2D u_prevFrame;

    varying vec2 vUv;

    void main() {
        // Normalize fragment coordinates to [0, 1]
        vec2 st = vUv;

        // Calculate distance from normalized mouse position
        vec2 mouseNorm = u_mouse / u_resolution;
        float dist = distance(st, mouseNorm);

        // Create a radial gradient centered on the mouse
        float intensity = smoothstep(0.4, 0.0, dist); // Adjusted for smoother transition

        // Oscillate colors when mouse is down
        vec3 color;
        if (u_mouseDown) {
            float oscillation = sin(u_time * 5.0) * 0.5 + 0.5;
            color = mix(vec3(0.0), vec3(oscillation, 0.5 - oscillation, 1.0 - oscillation), intensity);
        } else {
            color = mix(vec3(0.0), vec3(intensity, 0.5 - intensity, 1.0 - intensity), intensity);
        }

        // Get the previous frame color
        vec4 prevColor = texture2D(u_prevFrame, vUv);

        // Blend the current color with the previous frame color
        gl_FragColor = mix(prevColor, vec4(color, 1.0), 0.1);
    }
`;

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

    // Update effect parameters based on mouse position
    if (effect1) {
        effect1.set({ wet: mouseX });
    }
    if (effect2) {
        effect2.set({ wet: mouseY });
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
// Create a polysynth and connect it to the master output (speakers)
const synth = new Tone.PolySynth().toDestination();

// Map keyboard keys to musical notes
const keyToNote = {
    'a': 'C4',
    'w': 'C#4',
    's': 'D4',
    'e': 'D#4',
    'd': 'E4',
    'f': 'F4',
    't': 'F#4',
    'g': 'G4',
    'y': 'G#4',
    'h': 'A4',
    'u': 'A#4',
    'j': 'B4',
    'k': 'C5',
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
    'AutoFilter', 'AutoPanner', 'AutoWah', 'BitCrusher', 'Chorus', 'Distortion', 'FeedbackDelay', 'Freeverb', 'JCReverb', 'Phaser', 'PingPongDelay', 'PitchShift', 'Reverb', 'StereoWidener', 'Tremolo', 'Vibrato'
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

// Add event listeners to update effects based on dropdown selection
effect1Dropdown.addEventListener('change', () => {
    if (effect1) {
        effect1.dispose();
    }
    const selectedEffect = effect1Dropdown.value;
    effect1 = new Tone[selectedEffect]().toDestination();
    synth.connect(effect1);
});

effect2Dropdown.addEventListener('change', () => {
    if (effect2) {
        effect2.dispose();
    }
    const selectedEffect = effect2Dropdown.value;
    effect2 = new Tone[selectedEffect]().toDestination();
    synth.connect(effect2);
});
