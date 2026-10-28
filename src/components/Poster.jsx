'use client';

import Image from 'next/image';
import { useState } from 'react';
import { Film } from 'lucide-react';

export default function Poster({ src, alt, className = '', priority = false, sizes = '(max-width: 600px) 45vw, (max-width: 1000px) 28vw, 16vw' }) {
  const [failedSource, setFailedSource] = useState(null);
  return (
    <div className={`poster-image ${className}`}>
      {src && failedSource !== src ? <Image src={src.replace('type=medium', 'type=large')} alt={alt} fill sizes={sizes} priority={priority} className="object-cover" onError={() => setFailedSource(src)} /> : (
        <div className="poster-fallback"><Film size={30} aria-hidden="true" /><span>{alt}</span></div>
      )}
    </div>
  );
}
