import React from 'react';
import './Button.css';

export default function Button({
  children,
  variant = 'primary', // primary, secondary, ghost, danger, success
  size = 'md', // sm, md, lg, xl
  fullWidth = false,
  icon: Icon,
  iconRight: IconRight,
  loading = false,
  disabled = false,
  className = '',
  ...props
}) {
  return (
    <button
      className={`btn btn-${variant} btn-${size} ${fullWidth ? 'btn-full' : ''} ${loading ? 'btn-loading' : ''} ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading && <span className="btn-spinner" />}
      {!loading && Icon && <Icon size={size === 'sm' ? 16 : size === 'lg' ? 22 : 18} />}
      {children && <span className="btn-label">{children}</span>}
      {!loading && IconRight && <IconRight size={size === 'sm' ? 16 : 18} />}
    </button>
  );
}
