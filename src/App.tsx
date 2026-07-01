import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { ToastProvider } from "./context/ToastContext";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { StaffLayout } from "./components/layout/StaffLayout";

// Public
import { Landing } from "./pages/public/Landing";
import { OrderWizard } from "./pages/public/OrderWizard";
import { Track } from "./pages/public/Track";

// Staff
import { Login } from "./pages/staff/Login";
import { Dashboard } from "./pages/staff/Dashboard";
import { Orders } from "./pages/staff/Orders";
import { OrderDetail } from "./pages/staff/OrderDetail";
import { OrderPrint } from "./pages/staff/OrderPrint";
import { ManualEntry } from "./pages/staff/ManualEntry";
import { Customers } from "./pages/staff/Customers";
import { CustomerDetail } from "./pages/staff/CustomerDetail";
import { Reports } from "./pages/staff/Reports";
import { Settings } from "./pages/staff/Settings";
import { Testimonials } from "./pages/staff/Testimonials";

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <BrowserRouter>
          <Routes>
            {/* Public */}
            <Route path="/" element={<Landing />} />
            <Route path="/order" element={<OrderWizard />} />
            <Route path="/track" element={<Track />} />
            <Route path="/track/:order_code" element={<Track />} />

            {/* Staff auth */}
            <Route path="/staff/login" element={<Login />} />

            {/* Print view (protected, no layout chrome) */}
            <Route
              path="/staff/orders/:id/print"
              element={<ProtectedRoute><OrderPrint /></ProtectedRoute>}
            />

            {/* Staff app (protected, with layout) */}
            <Route
              path="/staff"
              element={<ProtectedRoute><StaffLayout /></ProtectedRoute>}
            >
              <Route index element={<Dashboard />} />
              <Route path="orders" element={<Orders />} />
              <Route path="orders/:id" element={<OrderDetail />} />
              <Route path="new" element={<ManualEntry />} />
              <Route path="customers" element={<Customers />} />
              <Route path="customers/:id" element={<CustomerDetail />} />
              <Route path="reports" element={<Reports />} />
              <Route path="testimonials" element={<Testimonials />} />
              <Route path="settings" element={<Settings />} />
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </ToastProvider>
    </AuthProvider>
  );
}
