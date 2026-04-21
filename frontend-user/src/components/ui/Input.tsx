import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
}

export const Input = ({ label, id, ...props }: InputProps) => {
  return (
    <div style={{ marginBottom: '1rem', display: 'flex', flexDirection: 'column' }}>
      <label htmlFor={id} style={{ marginBottom: '0.5rem', fontWeight: 500, fontSize: '0.875rem' }}>
        {label}
      </label>
      <input
        id={id}
        style={{
          padding: '0.75rem',
          borderRadius: '0.375rem',
          border: '1px solid var(--border)',
          backgroundColor: 'var(--surface)',
          color: 'var(--foreground)',
          outline: 'none',
          fontSize: '1rem',
          transition: 'border-color 0.2s',
        }}
        {...props}
      />
    </div>
  );
};
