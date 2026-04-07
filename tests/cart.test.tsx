import { renderHook, act } from '@testing-library/react';
import { CartProvider, useCart } from '../src/context/CartContext';
import { describe, expect, it, beforeEach } from 'vitest';
import React from 'react';

// Wrap hook invocations in the provider
const wrapper = ({ children }: { children: React.ReactNode }) => (
  <CartProvider>{children}</CartProvider>
);

describe('Cart Context Management', () => {
  beforeEach(() => {
    // Clear local storage mocked state between iterations
    localStorage.clear();
  });

  it('should initialize with an empty cart', () => {
    const { result } = renderHook(() => useCart(), { wrapper });
    expect(result.current.items).toEqual([]);
    expect(result.current.total).toBe(0);
    expect(result.current.itemCount).toBe(0);
  });

  it('should add a new product to the cart', () => {
    const { result } = renderHook(() => useCart(), { wrapper });
    
    act(() => {
      result.current.addToCart({ id: '1', name: 'Seed X', price: 100, quantity: 2, type: 'SEED' });
    });

    expect(result.current.items).toHaveLength(1);
    expect(result.current.itemCount).toBe(2);
    expect(result.current.total).toBe(200);
  });

  it('should increment existing item quantities rather than duplicate', () => {
    const { result } = renderHook(() => useCart(), { wrapper });
    
    act(() => {
      result.current.addToCart({ id: '2', name: 'Fertilizer Y', price: 50, quantity: 1, type: 'FERTILIZER' });
      result.current.addToCart({ id: '2', name: 'Fertilizer Y', price: 50, quantity: 4, type: 'FERTILIZER' });
    });

    expect(result.current.items).toHaveLength(1);
    expect(result.current.items[0].quantity).toBe(5);
    expect(result.current.total).toBe(250);
  });

  it('should remove items correctly', () => {
    const { result } = renderHook(() => useCart(), { wrapper });
    
    act(() => {
      result.current.addToCart({ id: '1', name: 'Seed X', price: 100, quantity: 1, type: 'SEED' });
      result.current.removeFromCart('1');
    });

    expect(result.current.items).toHaveLength(0);
  });
});
