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