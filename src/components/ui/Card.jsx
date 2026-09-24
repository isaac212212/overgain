import './Card.css';

export default function Card({
  children,
  variant = 'default', // default, elevated, bordered, interactive
  padding = 'md',
  className = '',
  onClick,
  ...props
}) {
  return (
    <div
      className={`card card-${variant} card-p-${padding} ${onClick ? 'card-clickable' : ''} ${className}`}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      {...props}
    >
      {children}
    </div>
  );
}
