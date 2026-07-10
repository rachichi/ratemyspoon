import { useState } from "react";

const LINKS = [
  { label: "RACHEL 静如 LIU", href: "https://rachelliu.netlify.app" },
  { label: "PROJECTS",        href: "https://rachelliu.netlify.app/#/projects" },
  { label: "RESUMÉ",          href: "https://rachelliu.netlify.app/#/resume" },
];

export default function Navbar() {
  const [open, setOpen] = useState(false);

  return (
    <nav className="relative border-b border-warm-black/20 text-xs tracking-widest font-bold uppercase shrink-0">

      {/* Desktop / tablet — full row */}
      <div className="hidden md:flex items-center justify-between px-4 py-3">
        <a href={LINKS[0]!.href} target="_blank" rel="noopener noreferrer" className="hover:opacity-50 transition-opacity">{LINKS[0]!.label}</a>
        <span>&lt; RATE MY SPOON &gt;</span>
        <span className="flex gap-6">
          {LINKS.slice(1).map(l => (
            <a key={l.href} href={l.href} target="_blank" rel="noopener noreferrer" className="hover:opacity-50 transition-opacity">{l.label}</a>
          ))}
        </span>
      </div>

      {/* Mobile — title + hamburger */}
      <div className="flex md:hidden items-center justify-between px-4 py-3">
        <span>&lt; RATE MY SPOON &gt;</span>
        <button
          onClick={() => setOpen(o => !o)}
          aria-label="Menu"
          aria-expanded={open}
          className="text-warm-black hover:opacity-50 transition-opacity -mr-1 p-1"
        >
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
            {open ? (
              <>
                <line x1="3.5" y1="3.5" x2="14.5" y2="14.5" />
                <line x1="14.5" y1="3.5" x2="3.5" y2="14.5" />
              </>
            ) : (
              <>
                <line x1="2" y1="5"  x2="16" y2="5"  />
                <line x1="2" y1="9"  x2="16" y2="9"  />
                <line x1="2" y1="13" x2="16" y2="13" />
              </>
            )}
          </svg>
        </button>
      </div>

      {/* Mobile dropdown panel */}
      {open && (
        <div className="md:hidden flex flex-col gap-4 px-4 pb-4 pt-3 border-t border-warm-black/10">
          {LINKS.map(l => (
            <a
              key={l.href}
              href={l.href}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setOpen(false)}
              className="hover:opacity-50 transition-opacity"
            >
              {l.label}
            </a>
          ))}
        </div>
      )}
    </nav>
  );
}
