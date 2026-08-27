import React, { useState, useEffect } from "react";
import client from "../api/client";
import { useAuth } from "../context/AuthContext";
import "../components/VoicePanel.css";

const PRODUCT_TYPES = ["Terracotta Pots", "Handloom Sarees", "Wood Carvings"];

const BuyerDashboard = () => {
  const { user, logout } = useAuth();

  const [productType, setProductType] = useState("");
  const [quantityNeeded, setQuantityNeeded] = useState("");
  const [unitPriceInr, setUnitPriceInr] = useState("");
  const [clusterResult, setClusterResult] = useState(null);
  const [clusterLoading, setClusterLoading] = useState(false);
  const [clusterError, setClusterError] = useState(null);

  const handleFormCluster = async (e) => {
    e.preventDefault();
    setClusterError(null);
    setClusterResult(null);

    if (!productType.trim() || !quantityNeeded) {
      setClusterError("Product type and quantity needed are required.");
      return;
    }

    setClusterLoading(true);
    try {
      const { data } = await client.post("/cluster/", {
        order: {
          productType: productType.trim(),
          quantityNeeded: Number(quantityNeeded),
          unitPriceInr: unitPriceInr ? Number(unitPriceInr) : 0,
        },
      });
      setClusterResult(data);
    } catch (err) {
      console.error("Cluster error:", err?.response?.data || err.message);
      setClusterError(
        err?.response?.data?.error || "Could not form a cluster. Please try again."
      );
    } finally {
      setClusterLoading(false);
    }
  };

  // ---------- MARKETPLACE BROWSING ----------
  const [products, setProducts] = useState([]);
  const [productsLoading, setProductsLoading] = useState(true);
  const [productsError, setProductsError] = useState(null);
  const [search, setSearch] = useState("");
  const [orderQuantities, setOrderQuantities] = useState({});
  const [placingOrderFor, setPlacingOrderFor] = useState(null);
  const [placedProductIds, setPlacedProductIds] = useState([]);

  const loadProducts = async (query = "") => {
    setProductsLoading(true);
    setProductsError(null);
    try {
      const { data } = await client.get("/products/", {
        params: query ? { search: query } : {},
      });
      setProducts(data.results ?? data);
    } catch (err) {
      console.error("Marketplace load error:", err?.response?.data || err.message);
      setProductsError("Could not load listings. Please try again.");
    } finally {
      setProductsLoading(false);
    }
  };

  useEffect(() => {
    loadProducts();
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    loadProducts(search.trim());
  };

  const handlePlaceOrder = async (product) => {
    setPlacingOrderFor(product.id);
    const quantity = Number(orderQuantities[product.id] || 1);

    try {
      await client.post("/orders/", {
        product: product.id,
        quantity,
      });
      setPlacedProductIds((prev) => [...prev, product.id]);
      loadMyOrders();
    } catch (err) {
      console.error("Place order error:", err?.response?.data || err.message);
      setProductsError("Could not place that order. Please try again.");
    } finally {
      setPlacingOrderFor(null);
    }
  };

  // ---------- MY ORDERS ----------
  const [myOrders, setMyOrders] = useState([]);
  const [myOrdersLoading, setMyOrdersLoading] = useState(true);
  const [myOrdersError, setMyOrdersError] = useState(null);

  const STATUS_LABELS = {
    placed: "Placed",
    in_production: "In Production",
    shipped: "Shipped",
    delivered: "Delivered",
    cancelled: "Cancelled",
  };

  const loadMyOrders = async () => {
    setMyOrdersLoading(true);
    setMyOrdersError(null);
    try {
      const { data } = await client.get("/orders/mine/");
      setMyOrders(data.results ?? data);
    } catch (err) {
      console.error("My orders load error:", err?.response?.data || err.message);
      setMyOrdersError("Could not load your orders. Please try again.");
    } finally {
      setMyOrdersLoading(false);
    }
  };

  useEffect(() => {
    loadMyOrders();
  }, []);

  const handleCancelOrder = async (orderId) => {
    try {
      await client.patch(`/orders/${orderId}/status/`, { status: "cancelled" });
      setMyOrders((prev) =>
        prev.map((o) => (o.id === orderId ? { ...o, status: "cancelled" } : o))
      );
    } catch (err) {
      console.error("Cancel order error:", err?.response?.data || err.message);
      setMyOrdersError("Could not cancel that order. Please try again.");
    }
  };

  return (
    <div className="voice-panel-page">
      <div className="voice-panel-container">
        <div className="voice-header">
          <div className="brand-area">
            <div className="brand-icon">K</div>
            <div>
              <h1>Kaarigar</h1>
              <p>Bulk order fulfillment through artisan clusters, built for buyers.</p>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <span
              style={{
                fontSize: 14,
                fontWeight: 700,
                color: "#a3702f",
                background: "#fbf3e7",
                padding: "6px 14px",
                borderRadius: 999,
                letterSpacing: 0.2,
              }}
            >
              {user?.username}
            </span>
            <button
              type="button"
              className="upload-button"
              onClick={logout}
              style={{ padding: "6px 14px" }}
            >
              Logout
            </button>
          </div>
        </div>

        <div className="workspace">
          <div className="workspace-card">
            <div className="card-top">
              <div className="step-number">1</div>
              <div>
                <h3>Bulk Order</h3>
                <p>Enter what a buyer needs. We'll pool the right artisans together until the order is covered.</p>
              </div>
            </div>

            <form onSubmit={handleFormCluster}>
              <div style={{ marginBottom: 14 }}>
                <label className="record-status" style={{ alignItems: "flex-start", marginTop: 0 }}>
                  <strong style={{ marginBottom: 6 }}>Product type</strong>
                </label>
                <select
                  value={productType}
                  onChange={(e) => setProductType(e.target.value)}
                  className="audio-player"
                  style={{ width: "100%", padding: "10px 12px", borderRadius: 10, border: "1px solid #e3d7cb", height: "auto" }}
                >
                  <option value="" disabled>
                    Select product type
                  </option>
                  {PRODUCT_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ display: "flex", gap: 12, marginBottom: 14 }}>
                <div style={{ flex: 1 }}>
                  <strong style={{ fontSize: 12, display: "block", marginBottom: 6 }}>Quantity needed</strong>
                  <input
                    type="number"
                    min="1"
                    value={quantityNeeded}
                    onChange={(e) => setQuantityNeeded(e.target.value)}
                    style={{ width: "100%", padding: "10px 12px", borderRadius: 10, border: "1px solid #e3d7cb" }}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <strong style={{ fontSize: 12, display: "block", marginBottom: 6 }}>Unit price (₹)</strong>
                  <input
                    type="number"
                    min="0"
                    value={unitPriceInr}
                    onChange={(e) => setUnitPriceInr(e.target.value)}
                    style={{ width: "100%", padding: "10px 12px", borderRadius: 10, border: "1px solid #e3d7cb" }}
                  />
                </div>
              </div>

              <button type="submit" className="create-listing-button" disabled={clusterLoading}>
                {clusterLoading ? <span className="button-spinner" /> : <span className="sparkle">⬢</span>}
                {clusterLoading ? "Forming cluster..." : "Form cluster"}
              </button>
            </form>

            {clusterError && (
              <div className="error-box" style={{ marginTop: 16 }}>
                <div className="error-icon">!</div>
                <div>
                  <strong>Error</strong>
                  <p>{clusterError}</p>
                </div>
              </div>
            )}

            {clusterResult && (
              <div style={{ marginTop: 18 }}>
                <div
                  className="transcript-box"
                  style={{
                    background: clusterResult.success ? "#eef6ec" : "#fff5f4",
                  }}
                >
                  <p style={{ color: clusterResult.success ? "#3d6b3d" : "#8d3d36" }}>
                    {clusterResult.success
                      ? `Fulfilled — ${clusterResult.clusterSize} artisans covering ${clusterResult.totalUnitsAllocated} units${
                          clusterResult.totalRevenueInr ? ` for ₹${clusterResult.totalRevenueInr.toLocaleString("en-IN")}` : ""
                        }`
                      : clusterResult.reason}
                  </p>
                </div>

                {clusterResult.allocation?.map((a) => (
                  <div
                    key={a.artisanId}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 14,
                      padding: "14px 16px",
                      marginTop: 10,
                      borderRadius: 14,
                      background: "#faf7f3",
                      border: "1px solid #e9e0d6",
                    }}
                  >
                    <div
                      style={{
                        width: 44,
                        height: 44,
                        flex: "0 0 44px",
                        borderRadius: "50%",
                        border: "2px dashed #c98f6a",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 11,
                        fontWeight: 800,
                        color: "#9a5d3e",
                      }}
                    >
                      {a.matchScore}%
                    </div>
                    <div>
                      <strong style={{ display: "block", fontSize: 14, color: "#2c2824" }}>{a.name}</strong>
                      <span style={{ fontSize: 12, color: "#8b8279" }}>
                        {a.unitsAllocated} units
                        {a.revenueShareInr != null ? ` · ₹${a.revenueShareInr.toLocaleString("en-IN")}` : ""}
                        {a.distanceKm != null ? ` · ${a.distanceKm} km` : ""}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ============ MARKETPLACE BROWSING ============ */}
          <div className="workspace-card" style={{ marginTop: 20 }}>
            <div className="card-top">
              <div className="step-number">2</div>
              <div>
                <h3>Browse Products</h3>
                <p>Individual pieces published by artisans — order one directly.</p>
              </div>
            </div>

            <form onSubmit={handleSearch} style={{ display: "flex", gap: 10, marginBottom: 16 }}>
              <input
                type="text"
                placeholder="Search by name, material, category..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{ flex: 1, padding: "10px 12px", borderRadius: 10, border: "1px solid #e3d7cb" }}
              />
              <button type="submit" className="upload-button">
                Search
              </button>
            </form>

            {productsLoading && <p>Loading listings...</p>}

            {productsError && (
              <div className="error-box" style={{ marginTop: 12 }}>
                <div className="error-icon">!</div>
                <div>
                  <strong>Error</strong>
                  <p>{productsError}</p>
                </div>
              </div>
            )}

            {!productsLoading && !productsError && products.length === 0 && (
              <p style={{ color: "#8b8279" }}>No listings yet — check back soon.</p>
            )}

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 16 }}>
              {products.map((p) => (
                <div
                  key={p.id}
                  style={{
                    padding: 14,
                    borderRadius: 14,
                    background: "#faf7f3",
                    border: "1px solid #e9e0d6",
                  }}
                >
                  {p.image_data_url && (
                    <img
                      src={p.image_data_url}
                      alt={p.title}
                      style={{ width: "100%", height: 130, objectFit: "cover", borderRadius: 10, marginBottom: 10 }}
                    />
                  )}
                  <h4 style={{ margin: "0 0 6px", fontSize: 15 }}>{p.title}</h4>
                  <p style={{ fontSize: 12, color: "#6f665f", lineHeight: 1.5, marginBottom: 8 }}>
                    {p.description?.slice(0, 90)}
                    {p.description?.length > 90 ? "..." : ""}
                  </p>
                  <strong style={{ display: "block", color: "#a3702f", marginBottom: 10 }}>
                    {p.price_min_inr
                      ? `₹${p.price_min_inr}${p.price_max_inr && p.price_max_inr !== p.price_min_inr ? ` - ₹${p.price_max_inr}` : ""}`
                      : "Price on request"}
                  </strong>

                  {placedProductIds.includes(p.id) ? (
                    <span style={{ fontSize: 12, fontWeight: 700, color: "#3d6b3d" }}>✓ Order placed</span>
                  ) : (
                    <div style={{ display: "flex", gap: 8 }}>
                      <input
                        type="number"
                        min="1"
                        value={orderQuantities[p.id] || 1}
                        onChange={(e) =>
                          setOrderQuantities((prev) => ({ ...prev, [p.id]: e.target.value }))
                        }
                        style={{ width: 56, padding: "8px 10px", borderRadius: 8, border: "1px solid #e3d7cb" }}
                      />
                      <button
                        type="button"
                        className="create-listing-button"
                        style={{ flex: 1, padding: "8px 12px", fontSize: 12 }}
                        onClick={() => handlePlaceOrder(p)}
                        disabled={placingOrderFor === p.id}
                      >
                        {placingOrderFor === p.id ? "Placing..." : "Place order"}
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* ============ MY ORDERS ============ */}
          <div className="workspace-card" style={{ marginTop: 20 }}>
            <div className="card-top">
              <div className="step-number">3</div>
              <div>
                <h3>My Orders</h3>
                <p>Track every order you've placed, from placed to delivered.</p>
              </div>
            </div>

            {myOrdersLoading && <p>Loading your orders...</p>}

            {myOrdersError && (
              <div className="error-box" style={{ marginTop: 12 }}>
                <div className="error-icon">!</div>
                <div>
                  <strong>Error</strong>
                  <p>{myOrdersError}</p>
                </div>
              </div>
            )}

            {!myOrdersLoading && !myOrdersError && myOrders.length === 0 && (
              <p style={{ color: "#8b8279" }}>You haven't placed any orders yet.</p>
            )}

            {myOrders.map((o) => (
              <div
                key={o.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 14,
                  padding: "14px 16px",
                  marginTop: 10,
                  borderRadius: 14,
                  background: "#faf7f3",
                  border: "1px solid #e9e0d6",
                }}
              >
                {o.product_image && (
                  <img
                    src={o.product_image}
                    alt={o.product_title}
                    style={{ width: 56, height: 56, objectFit: "cover", borderRadius: 10, flexShrink: 0 }}
                  />
                )}
                <div style={{ flex: 1 }}>
                  <strong style={{ display: "block", fontSize: 14, color: "#2c2824" }}>
                    {o.product_title} × {o.quantity}
                  </strong>
                  <span style={{ fontSize: 12, color: "#8b8279" }}>
                    by {o.artisan_username}
                    {o.total_price_inr ? ` · ₹${o.total_price_inr.toLocaleString("en-IN")}` : ""}
                  </span>
                </div>
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    padding: "5px 12px",
                    borderRadius: 999,
                    background: o.status === "cancelled" ? "#fdecea" : "#fbf3e7",
                    color: o.status === "cancelled" ? "#8d3d36" : "#a3702f",
                  }}
                >
                  {STATUS_LABELS[o.status] || o.status}
                </span>
                {o.status === "placed" && (
                  <button type="button" className="upload-button" onClick={() => handleCancelOrder(o.id)}>
                    Cancel
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="voice-footer">Kaarigar · Built for SIH26090</div>
      </div>
    </div>
  );
};

export default BuyerDashboard;