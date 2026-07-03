"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import * as Icon from "@phosphor-icons/react/dist/ssr";
import TopNavOne from "@/components/Header/TopNav/TopNavOne";
import MenuCosmeticThree from "@/components/Header/Menu/MenuCosmeticThree";
import Footer from "@/components/Footer/Footer";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { useAuth } from "@/context/AuthContext";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  fetchCustomerOrder,
  fetchCustomerOrders,
  fetchOrderStats,
} from "@/store/slices/customerSlice";
import OrderDetailModal from "@/components/Account/OrderDetailModal";
import AddressTab from "@/components/Account/AddressTab";
import SettingsTab from "@/components/Account/SettingsTab";
import LogoutModal from "@/components/Account/LogoutModal";

type AccountTab = "dashboard" | "orders" | "address" | "settings";

type AccountOrderRow = {
  id: number;
  orderNumber?: string;
  createdAt?: string;
  items?: Array<{ product?: { name?: string } }>;
  status?: string;
  totalAmount?: number | string;
};

interface OrdersListProps {
  rows: AccountOrderRow[];
  loading: boolean;
  onOpenOrder: (orderId: number) => void;
  getStatusBadgeClass: (status: string) => string;
}

const OrdersList: React.FC<OrdersListProps> = ({
  rows,
  loading,
  onOpenOrder,
  getStatusBadgeClass,
}) => {
  if (loading) {
    return (
      <div className="py-10 text-center">
        <div className="inline-block h-8 w-8 animate-spin rounded-full border-b-2 border-primary" />
      </div>
    );
  }

  if (!rows.length) {
    return (
      <div className="rounded-2xl border border-dashed border-line bg-white/70 p-8 text-center">
        <Icon.ShoppingBag size={36} className="mx-auto text-secondary/50" />
        <p className="mt-3 text-sm text-secondary">No orders found yet.</p>
        <Link
          href="/product"
          className="mt-4 inline-flex rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-secondary"
        >
          Start shopping
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {rows.map((order) => (
        <button
          key={order.id}
          onClick={() => onOpenOrder(order.id)}
          className="w-full rounded-2xl border border-line bg-white p-4 text-left transition-colors hover:bg-surface"
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-bold text-black">{order.orderNumber}</p>
              <p className="mt-1 text-xs text-secondary">
                {new Date(order.createdAt || Date.now()).toLocaleDateString()} •{" "}
                <span className="numeric-contrast">{order.items?.length || 0}</span>{" "}
                item
                {(order.items?.length || 0) !== 1 ? "s" : ""}
              </p>
            </div>
            <span
              className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${getStatusBadgeClass(order.status || "pending")}`}
            >
              {order.status || "Pending"}
            </span>
          </div>
          <div className="mt-3 flex items-end justify-between gap-3">
            <p className="line-clamp-1 text-sm text-secondary">
              {order.items?.[0]?.product?.name || "Product"}
            </p>
            <p className="text-base font-bold text-primary numeric-contrast">
              ₹{order.totalAmount || "0.00"}
            </p>
          </div>
        </button>
      ))}
    </div>
  );
};

const MyAccount = () => {
  const [activeTab, setActiveTab] = useState<AccountTab>("dashboard");
  const [openDetail, setOpenDetail] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  const { user, logout } = useAuth();
  const router = useRouter();
  const dispatch = useAppDispatch();

  const { orders, currentOrder, orderStats, loading } = useAppSelector(
    (state) => state.customer,
  );

  useEffect(() => {
    if (activeTab === "dashboard" && !orderStats) {
      dispatch(fetchOrderStats());
    }
  }, [activeTab, orderStats, dispatch]);

  useEffect(() => {
    if (activeTab === "dashboard") {
      dispatch(fetchCustomerOrders({ page: 1, limit: 5 }));
    }
    if (activeTab === "orders") {
      dispatch(fetchCustomerOrders({ page: 1, limit: 50 }));
    }
  }, [activeTab, dispatch]);

  useEffect(() => {
    if (selectedOrderId) {
      dispatch(fetchCustomerOrder(selectedOrderId));
    }
  }, [selectedOrderId, dispatch]);

  const stats = orderStats || {
    totalOrders: 0,
    awaitingPickup: 0,
    cancelledOrders: 0,
    deliveredOrders: 0,
  };

  const getUserInitials = () => {
    if (!user) return "U";
    const first = user.firstName?.charAt(0) || "";
    const last = user.lastName?.charAt(0) || "";
    return `${first}${last}`.toUpperCase() || user.email?.charAt(0).toUpperCase() || "U";
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status?.toLowerCase()) {
      case "pending":
        return "border-yellow/30 bg-yellow/10 text-yellow";
      case "processing":
        return "border-primary/30 bg-primary/10 text-primary";
      case "shipped":
        return "border-accent/30 bg-accent/10 text-accent";
      case "delivered":
        return "border-success/30 bg-success/10 text-success";
      case "cancelled":
        return "border-red/30 bg-red/10 text-red";
      default:
        return "border-secondary/20 bg-secondary/10 text-secondary";
    }
  };

  const tabs: Array<{
    key: AccountTab;
    label: string;
    icon: React.ReactNode;
  }> = [
    { key: "dashboard", label: "Dashboard", icon: <Icon.SquaresFour size={18} /> },
    { key: "orders", label: "Orders", icon: <Icon.ShoppingBag size={18} /> },
    { key: "address", label: "Address", icon: <Icon.MapPin size={18} /> },
    { key: "settings", label: "Settings", icon: <Icon.Gear size={18} /> },
  ];

  const onOpenOrder = (orderId: number) => {
    setSelectedOrderId(orderId);
    setOpenDetail(true);
  };

  const onLogoutConfirm = () => {
    logout();
    setShowLogoutModal(false);
    router.push("/");
  };

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-surface">
        <TopNavOne
          props="style-one bg-primary"
          slogan="Welcome to Naveenam Naturals Store"
        />
        <div id="header" className="relative w-full">
          <MenuCosmeticThree />
        </div>

        <section className="border-b border-line bg-white">
          <div className="container py-6">
            <p className="text-xs uppercase tracking-wide text-secondary">My Account</p>
            <h1 className="mt-1 text-2xl font-bold text-primary sm:text-3xl">
              Hello, {user?.firstName || "Shopper"}
            </h1>
            <p className="mt-2 text-sm text-secondary">
              Manage orders, addresses, and profile preferences.
            </p>
          </div>
        </section>

        <div className="container py-6 sm:py-8">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 lg:items-start">
            <aside className="lg:col-span-4 lg:sticky lg:top-6 lg:self-start lg:h-fit xl:col-span-3">
              <div className="rounded-3xl border border-line bg-white p-5">
                <div className="mb-5 flex items-center gap-3 border-b border-line pb-5">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-lg font-bold text-primary">
                    {getUserInitials()}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-black">
                      {user?.firstName || "User"} {user?.lastName || ""}
                    </p>
                    <p className="truncate text-xs text-secondary">{user?.email}</p>
                  </div>
                </div>

                <nav className="hidden space-y-2 lg:block">
                  {tabs.map((tab) => (
                    <button
                      key={tab.key}
                      onClick={() => setActiveTab(tab.key)}
                      className={`flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
                        activeTab === tab.key
                          ? "bg-primary text-white"
                          : "text-secondary hover:bg-surface"
                      }`}
                    >
                      {tab.icon}
                      {tab.label}
                    </button>
                  ))}
                  <button
                    onClick={() => setShowLogoutModal(true)}
                    className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium text-red hover:bg-red/10"
                  >
                    <Icon.SignOut size={18} />
                    Logout
                  </button>
                </nav>

                <div className="scrollbar-hide -mx-1 flex gap-2 overflow-x-auto px-1 pb-1 lg:hidden">
                  {tabs.map((tab) => (
                    <button
                      key={tab.key}
                      onClick={() => setActiveTab(tab.key)}
                      className={`shrink-0 rounded-full px-4 py-2 text-xs font-semibold ${
                        activeTab === tab.key
                          ? "bg-primary text-white"
                          : "border border-line bg-white text-secondary"
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                  <button
                    onClick={() => setShowLogoutModal(true)}
                    className="shrink-0 rounded-full border border-red/20 bg-red/5 px-4 py-2 text-xs font-semibold text-red"
                  >
                    Logout
                  </button>
                </div>
              </div>
            </aside>

            <main className="lg:col-span-8 xl:col-span-9">
              {activeTab === "dashboard" && (
                <div className="space-y-6">
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    <div className="rounded-2xl border border-line bg-white p-4">
                      <p className="text-xs uppercase text-secondary">Total</p>
                      <p className="mt-1 text-2xl font-bold text-primary numeric-contrast">{stats.totalOrders || 0}</p>
                    </div>
                    <div className="rounded-2xl border border-line bg-white p-4">
                      <p className="text-xs uppercase text-secondary">Awaiting</p>
                      <p className="mt-1 text-2xl font-bold text-primary numeric-contrast">{stats.awaitingPickup || 0}</p>
                    </div>
                    <div className="rounded-2xl border border-line bg-white p-4">
                      <p className="text-xs uppercase text-secondary">Delivered</p>
                      <p className="mt-1 text-2xl font-bold text-primary numeric-contrast">{stats.deliveredOrders || 0}</p>
                    </div>
                    <div className="rounded-2xl border border-line bg-white p-4">
                      <p className="text-xs uppercase text-secondary">Cancelled</p>
                      <p className="mt-1 text-2xl font-bold text-primary numeric-contrast">{stats.cancelledOrders || 0}</p>
                    </div>
                  </div>

                  <section className="rounded-3xl border border-line bg-cream p-4 sm:p-6">
                    <div className="mb-4 flex items-center justify-between">
                      <h2 className="text-lg font-bold text-primary sm:text-xl">Recent orders</h2>
                      <button
                        type="button"
                        onClick={() => setActiveTab("orders")}
                        className="text-sm font-semibold text-primary hover:underline"
                      >
                        View all
                      </button>
                    </div>
                    <OrdersList
                      rows={orders.slice(0, 5)}
                      loading={loading}
                      onOpenOrder={onOpenOrder}
                      getStatusBadgeClass={getStatusBadgeClass}
                    />
                  </section>
                </div>
              )}

              {activeTab === "orders" && (
                <section className="rounded-3xl border border-line bg-cream p-4 sm:p-6">
                  <h2 className="mb-4 text-lg font-bold text-primary sm:text-xl">All orders</h2>
                  <OrdersList
                    rows={orders}
                    loading={loading}
                    onOpenOrder={onOpenOrder}
                    getStatusBadgeClass={getStatusBadgeClass}
                  />
                </section>
              )}

              {activeTab === "address" && (
                <section className="rounded-3xl border border-line bg-white p-4 sm:p-6">
                  <AddressTab />
                </section>
              )}

              {activeTab === "settings" && (
                <section className="rounded-3xl border border-line bg-white p-4 sm:p-6">
                  <SettingsTab />
                </section>
              )}
            </main>
          </div>
        </div>

        <Footer />
        <OrderDetailModal
          order={currentOrder || null}
          isOpen={openDetail}
          onClose={() => {
            setOpenDetail(false);
            setSelectedOrderId(null);
          }}
        />
        <LogoutModal
          isOpen={showLogoutModal}
          onClose={() => setShowLogoutModal(false)}
          onConfirm={onLogoutConfirm}
        />
      </div>
    </ProtectedRoute>
  );
};

export default MyAccount;
