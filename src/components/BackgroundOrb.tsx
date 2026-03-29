const BackgroundOrb = () => (
  <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
    <div className="absolute -top-40 -right-40 w-[500px] h-[500px] rounded-full opacity-[0.04]"
      style={{ background: "radial-gradient(circle, hsl(221 83% 53%), transparent 70%)" }}
    />
    <div className="absolute -bottom-40 -left-40 w-[400px] h-[400px] rounded-full opacity-[0.03]"
      style={{ background: "radial-gradient(circle, hsl(250 83% 63%), transparent 70%)" }}
    />
    <div className="absolute inset-0 bg-dot-pattern opacity-30" />
  </div>
);

export default BackgroundOrb;
