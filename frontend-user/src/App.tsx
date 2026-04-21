import { Navigate, Route, Routes, Outlet, useLocation } from 'react-router-dom';
import UserLayout from '@/app/user/layout';
import HomePage from '@/app/page';
import ShopPage from '@/app/shop/page';
import CartPage from '@/app/cart/page';
import CheckoutPage from '@/app/checkout/page';
import CheckoutVerifyPage from '@/app/checkout/verify/page';
import OrdersPage from '@/app/orders/page';
import CreditPage from '@/app/credit/page';
import LoginPage from '@/app/login/page';
import RegisterPage from '@/app/register/page';
import VerifyPhonePage from '@/app/verify-phone/page';
import { useAuth } from '@/context/AuthContext';

const resolveSafeRedirectTarget = (rawRedirect: string | null) => {
  if (!rawRedirect) {
    return '/shop';
  }
  const candidate = rawRedirect.trim();
  return candidate.startsWith('/') ? candidate : '/shop';
};

const FullScreenLoader = () => (
  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>Loading...</div>
);

const buildVerifyPhonePath = (userId: string, phone?: string | null, redirect?: string) => {
  const params = new URLSearchParams({ userId });
  if (phone) {
    params.set('phone', phone);
  }
  if (redirect) {
    params.set('redirect', redirect);
  }
  return `/verify-phone?${params.toString()}`;
};

const ProtectedRoute = () => {
  const { user, loading, phoneVerified, verificationLoading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <FullScreenLoader />;
  }

  if (!user) {
    const redirectTarget = `${location.pathname}${location.search}${location.hash}`;
    return <Navigate to={`/login?redirect=${encodeURIComponent(redirectTarget)}`} replace />;
  }

  if (!phoneVerified) {
    if (verificationLoading) {
      return <FullScreenLoader />;
    }
    const metadataPhone = typeof user.user_metadata?.phone === 'string' ? user.user_metadata.phone : '';
    const redirectTarget = `${location.pathname}${location.search}${location.hash}`;
    return <Navigate to={buildVerifyPhonePath(user.id, metadataPhone, redirectTarget)} replace />;
  }

  return <Outlet />;
};

const GuestRoute = () => {
  const { user, loading, phoneVerified, verificationLoading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <FullScreenLoader />;
  }

  if (user) {
    if (!phoneVerified) {
      if (verificationLoading) {
        return <FullScreenLoader />;
      }
      const metadataPhone = typeof user.user_metadata?.phone === 'string' ? user.user_metadata.phone : '';
      return <Navigate to={buildVerifyPhonePath(user.id, metadataPhone)} replace />;
    }
    const searchParams = new URLSearchParams(location.search);
    const redirectTarget = resolveSafeRedirectTarget(searchParams.get('redirect'));
    return <Navigate to={redirectTarget} replace />;
  }

  return <Outlet />;
};

const VerifyPhoneRoute = () => {
  const { user, loading, phoneVerified } = useAuth();

  if (loading) {
    return <FullScreenLoader />;
  }

  if (user && phoneVerified) {
    return <Navigate to="/shop" replace />;
  }

  return <Outlet />;
};

export function App() {
  return (
    <Routes>
      <Route element={<UserLayout />}>
        {/* Guest Only Routes */}
        <Route element={<GuestRoute />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
        </Route>

        <Route element={<VerifyPhoneRoute />}>
          <Route path="/verify-phone" element={<VerifyPhonePage />} />
        </Route>

        {/* Protected Routes */}
        <Route element={<ProtectedRoute />}>
          <Route path="/shop" element={<ShopPage />} />
          <Route path="/cart" element={<CartPage />} />
          <Route path="/checkout" element={<CheckoutPage />} />
          <Route path="/checkout/verify" element={<CheckoutVerifyPage />} />
          <Route path="/orders" element={<OrdersPage />} />
          <Route path="/credit" element={<CreditPage />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
