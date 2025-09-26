'use client';
import { useEffect } from 'react';

export default function DevOverlayKiller() {
  useEffect(() => {
    const killers = [
      '#nextjs-devtools',
      '#nextjs-portal',
      '#nextjs-toast',
      '[data-nextjs-overlay]',
      '[data-nextjs-toast]',
      '[data-nextjs-devtools]',
    ];
    const nuke = () => killers.forEach(sel=>{
      document.querySelectorAll<HTMLElement>(sel).forEach(el=>{
        el.style.pointerEvents = 'none';
        el.style.zIndex = '0';
        el.style.display = 'none';
        el.removeAttribute('data-nextjs-overlay');
        el.removeAttribute('data-nextjs-toast');
      });
    });
    nuke();
    const mo = new MutationObserver(nuke);
    mo.observe(document.body, {childList:true,subtree:true,attributes:true});
    return () => mo.disconnect();
  }, []);
  return null;
}