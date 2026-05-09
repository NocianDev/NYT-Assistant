import "./NeonCubeBackground.css";

const CUBES = [
  { x: "8%", y: "78%", s: 88, z: -80, r: 6, d: "0s" },
  { x: "18%", y: "58%", s: 58, z: -40, r: -8, d: ".4s" },
  { x: "26%", y: "82%", s: 132, z: 10, r: 4, d: ".7s" },
  { x: "38%", y: "62%", s: 76, z: -20, r: 14, d: "1.1s" },
  { x: "48%", y: "35%", s: 52, z: -120, r: -10, d: "1.4s" },
  { x: "56%", y: "72%", s: 154, z: 40, r: 7, d: ".2s" },
  { x: "68%", y: "50%", s: 92, z: -70, r: -12, d: "1.7s" },
  { x: "78%", y: "78%", s: 118, z: 20, r: 8, d: ".9s" },
  { x: "90%", y: "55%", s: 66, z: -30, r: 16, d: "1.2s" },
  { x: "14%", y: "24%", s: 50, z: -160, r: -16, d: "1.9s" },
  { x: "32%", y: "22%", s: 74, z: -130, r: 12, d: ".6s" },
  { x: "72%", y: "20%", s: 82, z: -150, r: -6, d: "1.5s" },
  { x: "86%", y: "26%", s: 48, z: -110, r: 18, d: ".3s" },
];

const verticals = Array.from({ length: 22 }, (_, i) => ({
  left: `${3 + i * 4.7}%`,
  delay: `${(i % 7) * 0.33}s`,
  height: `${18 + (i % 5) * 12}%`,
}));

export default function NeonCubeBackground() {
  return (
    <div className="nyt-neon-scene" aria-hidden="true">
      <div className="nyt-neon-grid" />
      <div className="nyt-neon-ceiling" />
      <div className="nyt-neon-depth" />

      {verticals.map((line, index) => (
        <span
          key={index}
          className="nyt-neon-line"
          style={{
            left: line.left,
            height: line.height,
            animationDelay: line.delay,
          }}
        />
      ))}

      <div className="nyt-cube-layer">
        {CUBES.map((cube, index) => (
          <span
            key={index}
            className="nyt-neon-cube"
            style={
              {
                "--x": cube.x,
                "--y": cube.y,
                "--s": `${cube.s}px`,
                "--z": `${cube.z}px`,
                "--r": `${cube.r}deg`,
                "--d": cube.d,
              } as React.CSSProperties
            }
          />
        ))}
      </div>

      <div className="nyt-neon-haze" />
      <div className="nyt-neon-scan" />
      <div className="nyt-neon-vignette" />
    </div>
  );
}
