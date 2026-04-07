import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, beforeEach } from 'vitest';
import React from 'react';
import { CartProvider, useCart } from '@/context/CartContext';

const TestComponent = () => {
  const { items, addToCart, removeFromCart, itemCount } = useCart();
  return (
    <div>
      <div data-testid="count">{itemCount}</div>
      {items.map(item => (
        <div key={item.id} data-testid={`cart-item-${item.id}`}>
          {item.name} - Qty: {item.quantity}
          <button onClick={() => removeFromCart(item.id)} data-testid={`remove-${item.id}`}>Remove</button>
        </div>
      ))}
      <button onClick={() => addToCart({ id: 'test-1', name: 'Premium Seed', price: 50, type: 'SEED', stock: 100, quantity: 2 } as any)} data-testid="add-btn">
        Add Item
      </button>
      <button onClick={() => addToCart({ id: 'test-1', name: 'Premium Seed', price: 50, type: 'SEED', stock: 100, quantity: 1 } as any)} data-testid="add-qty-btn">
        Add More Qty
      </button>
    </div>
  );
};

describe('Cart UI State Framework', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('correctly adds items to the cart and aggregates quantitative capacities natively', () => {
    render(<CartProvider><TestComponent /></CartProvider>);
    
    expect(screen.getByTestId('count').textContent).toBe('0');
    
    // Add Item
    fireEvent.click(screen.getByTestId('add-btn'));
    expect(screen.getByTestId('count').textContent).toBe('2');
    expect(screen.getByTestId('cart-item-test-1').textContent).toContain('Qty: 2');
    
    // Add More Quantity natively increasing identical unit keys
    fireEvent.click(screen.getByTestId('add-qty-btn'));
    expect(screen.getByTestId('count').textContent).toBe('3');
    expect(screen.getByTestId('cart-item-test-1').textContent).toContain('Qty: 3');
  });

  it('correctly removes items destructively completely clearing specific node instances', () => {
    render(<CartProvider><TestComponent /></CartProvider>);
    
    fireEvent.click(screen.getByTestId('add-btn'));
    expect(screen.getByTestId('count').textContent).toBe('2');
    
    fireEvent.click(screen.getByTestId('remove-test-1'));
    expect(screen.getByTestId('count').textContent).toBe('0');
    expect(screen.queryByTestId('cart-item-test-1')).toBeNull();
  });
});
