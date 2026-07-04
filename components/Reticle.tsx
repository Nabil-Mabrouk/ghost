// Tactical scanning reticle overlaid on the camera viewport.
export default function Reticle() {
  const corner = "absolute w-6 h-6 border-accent";
  return (
    <div className="absolute inset-0 pointer-events-none" aria-hidden>
      <div className={`${corner} top-2 left-2 border-t-2 border-l-2`} />
      <div className={`${corner} top-2 right-2 border-t-2 border-r-2`} />
      <div className={`${corner} bottom-2 left-2 border-b-2 border-l-2`} />
      <div className={`${corner} bottom-2 right-2 border-b-2 border-r-2`} />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 border border-accent/50 rounded-full" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-px h-4 bg-accent/70" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-px bg-accent/70" />
      <span className="absolute bottom-3 left-1/2 -translate-x-1/2 text-[9px] tracking-[0.3em] text-accent/80">
        SAFETY SCAN
      </span>
    </div>
  );
}
