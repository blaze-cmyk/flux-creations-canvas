export default function Home() {
  return (
    <div className="relative min-h-[calc(100vh-3.5rem)] bg-background overflow-hidden flex items-center justify-center">
      <video
        src="/videos/bg.mp4"
        autoPlay
        muted
        loop
        playsInline
        className="absolute inset-0 w-full h-full object-cover scale-75 origin-center pointer-events-none"
        aria-hidden="true"
      />
      <div className="absolute inset-0 bg-background/40 pointer-events-none" />
      <div className="relative text-center">
        <h1 className="text-4xl font-extrabold tracking-tight text-foreground">KORSOLA</h1>
        <p className="mt-3 text-sm text-muted-foreground">Home — coming soon.</p>
      </div>
    </div>
  );
}
