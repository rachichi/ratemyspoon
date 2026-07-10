export default function Navbar() {
  return (
    <nav className="flex items-center justify-between px-4 py-3 border-b border-warm-black/20 text-xs tracking-widest font-bold uppercase shrink-0">
      <a href="https://rachelliu.netlify.app" target="_blank" rel="noopener noreferrer" className="hover:opacity-50 transition-opacity">RACHEL 静如 LIU</a>
      <span>&lt; RATE MY SPOON &gt;</span>
      <span className="flex gap-6">
        <a href="https://rachelliu.netlify.app/#/projects" target="_blank" rel="noopener noreferrer" className="hover:opacity-50 transition-opacity">PROJECTS</a>
        <a href="https://rachelliu.netlify.app/#/resume" target="_blank" rel="noopener noreferrer" className="hover:opacity-50 transition-opacity">RESUMÉ</a>
      </span>
    </nav>
  );
}
