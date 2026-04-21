import { Outlet } from 'react-router-dom';
import { CartProvider } from '@/context/CartContext';
import { AuthProvider } from '@/context/AuthContext';
import { Footer } from '@/components/Footer';

export default function UserLayout() {
  return (
    <AuthProvider>
      <CartProvider>
        <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', width: '100%' }}>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
            <Outlet />
          </div>
          <Footer />
        </div>
      </CartProvider>
    </AuthProvider>
  );
}
