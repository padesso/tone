uniform vec2 u_mouse;
uniform vec2 u_resolution;
varying vec2 vUv;

void main() {
    // Normalize fragment coordinates to [-1, 1]
    vec2 st = gl_FragCoord.xy / u_resolution * 2.0 - 1.0;

    // Correct for aspect ratio by scaling X-axis
    st.x *= u_resolution.x / u_resolution.y;

    // Calculate distance from the mouse position
    float dist = distance(st, u_mouse);

    // Create a radial gradient centered on the mouse
    float intensity = smoothstep(0.3, 0.0, dist);

    // Set color based on intensity
    vec3 color = vec3(intensity, 0.5 - intensity, 1.0 - intensity);

    gl_FragColor = vec4(color, 1.0);
}
