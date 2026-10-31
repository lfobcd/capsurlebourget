import { useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Music2, Pause, Play, X } from "lucide-react";
import { MUSIC } from "@/config/event";

/** Lecteur flottant « L'Autoradio populaire » basé sur l'iframe YouTube. */
export function MusicPlayer() {
  const [open, setOpen] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [playing, setPlaying] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const command = (func: "playVideo" | "pauseVideo") => {
    iframeRef.current?.contentWindow?.postMessage(JSON.stringify({ event: "command", func, args: [] }), "*");
  };

  const toggle = () => {
    if (!loaded) {
      setLoaded(true);
      setPlaying(true);
      return;
    }
    command(playing ? "pauseVideo" : "playVideo");
    setPlaying(!playing);
  };

  return (
    <div className="fixed bottom-24 left-3 z-30 md:bottom-5 md:left-5">
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 12, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.96 }}
            className="glass-card mb-3 w-[min(320px,calc(100vw-1.5rem))] overflow-hidden p-3"
          >
            <div className="mb-2 flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="label-mono text-primary-glow">{MUSIC.label}</p>
                <p className="truncate text-sm font-semibold">{MUSIC.track}</p>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="rounded-lg p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"
                aria-label="Réduire le lecteur"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="aspect-video overflow-hidden rounded-xl border border-hairline bg-background">
              {loaded ? (
                <iframe
                  ref={iframeRef}
                  className="h-full w-full"
                  src={`https://www.youtube-nocookie.com/embed/${MUSIC.youtubeId}?enablejsapi=1&autoplay=1&rel=0&modestbranding=1`}
                  title={MUSIC.track}
                  allow="autoplay; encrypted-media; picture-in-picture"
                />
              ) : (
                <button onClick={toggle} className="grid h-full w-full place-items-center text-muted-foreground hover:text-foreground">
                  <span className="flex items-center gap-2 text-sm">
                    <Play className="h-5 w-5" /> Lancer la musique
                  </span>
                </button>
              )}
            </div>
            <button
              onClick={toggle}
              className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-crimson py-2 text-xs font-bold uppercase text-primary-foreground"
            >
              {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
              {playing ? "Pause" : "Lecture"}
            </button>
          </motion.div>
        )}
      </AnimatePresence>
      <motion.button
        whileHover={{ scale: 1.03 }}
        whileTap={{ scale: 0.96 }}
        onClick={() => setOpen((o) => !o)}
        className="flex max-w-[240px] items-center gap-2 rounded-full border border-hairline-strong bg-card/90 py-1.5 pl-1.5 pr-4 shadow-glow backdrop-blur-xl"
        aria-expanded={open}
        aria-label={`${MUSIC.label} : ${MUSIC.track}`}
      >
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-crimson text-primary-foreground">
          {playing ? <Music2 className="h-4 w-4 animate-pulse" /> : <Music2 className="h-4 w-4" />}
        </span>
        <span className="min-w-0 text-left">
          <span className="block truncate font-mono text-[9px] uppercase tracking-widest text-muted-foreground">{MUSIC.label}</span>
          <span className="block truncate text-xs font-semibold">{MUSIC.track}</span>
        </span>
      </motion.button>
    </div>
  );
}
