uniform float u_time;
uniform float u_audioData[256];
varying vec2 vUv;

void main() {
    float amplitude = u_audioData[int(gl_FragCoord.x) % 256] * 0.01;
    vec3 color = vec3(vUv.x + amplitude, vUv.y - amplitude, sin(u_time));
    gl_FragColor = vec4(color, 1.0);
}
