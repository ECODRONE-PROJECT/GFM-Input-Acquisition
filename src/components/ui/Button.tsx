import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'outline';
  isLoading?: boolean;
}

export const Button = ({ children, variant = 'primary', isLoading, ...props }: ButtonProps) => {
  const isPrimary = variant === 'primary';
  return (
    <button
      style={{
        padding: '0.75rem 1.5rem',
        borderRadius: '9999px',
        border: isPrimary ? 'none' : '1px solid #c3d928',
        backgroundColor: isPrimary ? '#c3d928' : 'transparent',
        color: isPrimary ? '#0C2D1C' : '#c3d928',
        fontWeight: 800,
        cursor: props.disabled || isLoading ? 'not-allowed' : 'pointer',
        opacity: props.disabled || isLoading ? 0.7 : 1,
        transition: 'all 0.2s',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        width: '100%',
      }}
      disabled={isLoading || props.disabled}
      {...props}
    >
      {isLoading ? 'Processing...' : children}
    </button>
  );
};
