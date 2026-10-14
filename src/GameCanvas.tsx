import { useRef } from 'react';

export function GameCanvas() {
  const containerRef = useRef<HTMLDivElement>(null);

  return <div ref={containerRef} />;
}