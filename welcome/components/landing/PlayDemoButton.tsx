"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Play, X } from "lucide-react";

type PlayDemoButtonProps = {
  className?: string;
  onBeforeOpen?: () => void;
};

export function PlayDemoButton({ className, onBeforeOpen }: PlayDemoButtonProps) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (open) {
      const previous = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = previous;
      };
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open]);

  return (
    <>
      <Button
        type="button"
        variant="outline"
        className={className}
        onClick={() => {
          onBeforeOpen?.();
          setOpen(true);
        }}
      >
        <Play className="h-4 w-4" />
        Play Demo
      </Button>

      {open ? (
        <div
          className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/70 backdrop-blur-[2px] px-4"
          onClick={() => setOpen(false)}
          role="presentation"
        >
          <div
            className="relative w-full max-w-5xl bg-white shadow-2xl border border-black/10"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <div className="flex items-center justify-between border-b border-black/10 px-6 py-4">
              <div>
                <p className="text-sm text-stone-500 uppercase tracking-wider">Demo Preview</p>
                <h3 className="text-lg md:text-xl font-semibold text-[#111]">Suiquencer in Action</h3>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="h-9 w-9 border border-stone-200 hover:border-stone-400 flex items-center justify-center text-stone-500 hover:text-[#111] transition-colors"
                aria-label="Close demo"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-6">
              <div className="aspect-video w-full border border-stone-200 bg-black">
                <iframe
                  src="https://player.vimeo.com/video/1163031556"
                  className="h-full w-full"
                  allow="autoplay; fullscreen; picture-in-picture"
                  allowFullScreen
                  title="Suiquencer demo video"
                />
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
