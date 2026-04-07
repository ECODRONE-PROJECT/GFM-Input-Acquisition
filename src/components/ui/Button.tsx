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
        borderRadius: '0.375rem',
        border: isPrimary ? 'none' : '1px solid var(--primary)',
        backgroundColor: isPrimary ? 'var(--primary)' : 'transparent',
        color: isPrimary ? '#fff' : 'var(--primary)',
        fontWeight: 600,
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
