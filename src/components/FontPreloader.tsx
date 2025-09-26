'use client';

import React from 'react';

// Este componente se encarga únicamente de la lógica de precarga de fuentes,
// que necesita ejecutarse en el cliente debido al evento onLoad.
export function FontPreloader() {
  return (
    <>
      <link
        rel="preload"
        href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap"
        as="style"
        onLoad={(e) => {
          const target = e.target as HTMLLinkElement;
          target.onload = null;
          target.rel = 'stylesheet';
        }}
      />
      <noscript>
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap"
        />
      </noscript>
    </>
  );
}