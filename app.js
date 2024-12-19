import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import * as Tone from 'tone';

// ---- 1. AUDIO SETUP ----
const analyser = new Tone.Analyser('fft', 256);
const synth = new Tone.PolySynth(Tone.Synth).toDestination();
synth.connect(analyser); // Connect the synth to the analyser

const keys = [
    { note: 'C', isBlack: false },
    { note: 'C#', isBlack: true },
    { note: 'D', isBlack: false },
    { note: 'D#', isBlack: true },
    { note: 'E', isBlack: false },
    { note: 'F', isBlack: false },
    { note: 'F#', isBlack: true },
    { note: 'G', isBlack: false },
    { note: 'G#', isBlack: true },
    { note: 'A', isBlack: false },
    { note: 'A#', isBlack: true },
    { note: 'B', isBlack: false },
];

let octave = 4; // Default octave
const noteDuration = "8n"; // Set default note duration

// ---- 2. CREATE KEYBOARD ----
function createKeyboard() {
    const keyboardDiv = document.getElementById('keyboard');
    keyboardDiv.innerHTML = ''; // Clear existing keys

    keys.forEach(({ note, isBlack }) => {
        const key = document.createElement('div');
        key.className = `key ${isBlack ? 'black' : ''}`;
        key.innerText = note;
        key.addEventListener('mousedown', () => playNote(note));
        keyboardDiv.appendChild(key);
    });
}

function playNote(note) {
    const fullNote = `${note}${octave}`;
    synth.triggerAttackRelease(fullNote, noteDuration); // Play note with a release
    console.log(`Playing: ${fullNote}`);
}

// ---- 3. OCTAVE SHIFTING ----
document.getElementById('octave-up').addEventListener('click', () => {
    if (octave < 8) octave++;
    console.log(`Octave: ${octave}`);
});

document.getElementById('octave-down').addEventListener('click', () => {
    if (octave > 1) octave--;
    console.log(`Octave: ${octave}`);
});

// Initialize the keyboard
createKeyboard();

// ---- 4. THREE.JS SETUP ----
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.z = 3;

const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// Orbit Controls
const controls = new OrbitControls(camera, renderer.domElement);

// ---- 5. SHADER SETUP ----
const uniforms = {
    u_time: { value: 0.0 },
    u_audioData: { value: new Float32Array(256) },
};

async function loadShader(url) {
    const response = await fetch(url);
    return response.text();
}

async function init() {
    const vertexShader = await loadShader('./shaders/vertex.glsl');
    const fragmentShader = await loadShader('./shaders/fragment.glsl');

    const material = new THREE.ShaderMaterial({
        uniforms: uniforms,
        vertexShader: vertexShader,
        fragmentShader: fragmentShader,
        transparent: true,
    });

    const geometry = new THREE.PlaneGeometry(2, 2);
    const plane = new THREE.Mesh(geometry, material);
    scene.add(plane);

    function animate() {
        requestAnimationFrame(animate);

        // Update audio data
        const audioData = analyser.getValue(); // Fetch FFT data
        uniforms.u_audioData.value = audioData;

        // Update time
        uniforms.u_time.value += 0.01;

        controls.update();
        renderer.render(scene, camera);
    }

    animate();

    window.addEventListener('resize', () => {
        renderer.setSize(window.innerWidth, window.innerHeight);
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
    });
}

init();
