import React from 'react';
import './Avatar.css';

// Instagram-style head & shoulders silhouette (bust only)
export function DefaultSilhouette({ size = 24 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      {/* Head */}
      <circle cx="12" cy="8" r="4" />
      {/* Shoulders / Bust — rounded arc clipped at bottom */}
      <path d="M12 13c-4.4 0-8 2.2-8 5v2h16v-2c0-2.8-3.6-5-8-5z" />
    </svg>
  );
}

export default function Avatar({ src, name, size = 'md', className = '' }) {
  const sizeMap = { sm: 32, md: 44, lg: 64, xl: 96 };
  const px = sizeMap[size] || 44;

  return (
    <div className={`avatar avatar-${size} ${className}`} style={{ width: px, height: px }}>
      {src && !src.includes('unsplash') ? (
        // Custom user-uploaded photo
        <img src={src} alt={name || 'Avatar'} className="avatar-img" />
      ) : (
        <DefaultSilhouette size={px * 0.55} />
      )}
    </div>
  );
}
