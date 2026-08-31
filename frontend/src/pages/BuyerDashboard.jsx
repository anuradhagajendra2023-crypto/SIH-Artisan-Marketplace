import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import client from "../api/client";
import { useAuth } from "../context/AuthContext";
import "../components/VoicePanel.css";
import { Link } from "react-router-dom";
import LanguageSwitcher from "../components/LanguageSwitcher";
import OrderStatusStepper from "../components/OrderStatusStepper";

const PRODUCT_TYPES = ["Terracotta Pots", "Handloom Sarees", "Wood Carvings"];

const ZeroCommissionBadge = ({ style }) => (
  <div
    style={{
      display: "inline-flex",
      alignItems: "center",
      gap: 6,
      fontSize: 11,
      fontWeight: 600,
      color: "#2f6f4f",
      background: "#e3f0e6",
      borderRadius: 10,
      padding: "3px 9px",
      ...style,
    }}
    title="Kaarigar takes zero commission — the full amount you pay goes to the artisan."
  >
    💯 100% goes to the artisan
  </div>
);

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

  // ---------- PRODUCT DETAIL MODAL ----------
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState(null);
  const [modalLang, setModalLang] = useState("en");

  // ---------- ASK THE ARTISAN (AI Q&A) ----------
  const [askQuestion, setAskQuestion] = useState("");
  const [askAnswer, setAskAnswer] = useState(null);
  const [askLoading, setAskLoading] = useState(false);
  const [askError, setAskError] = useState(null);

  const resetAskState = () => {
    setAskQuestion("");
    setAskAnswer(null);
    setAskError(null);
  };

  const handleAskQuestion = async (e) => {
    e.preventDefault();
    if (!askQuestion.trim() || !selectedProduct) return;

    setAskLoading(true);
    setAskError(null);
    setAskAnswer(null);

    try {
      const { data } = await client.post(`/products/${selectedProduct.id}/ask/`, {
        question: askQuestion.trim(),
      });
      setAskAnswer(data.answer);
    } catch (err) {
      console.error("Ask the artisan error:", err?.response?.data || err.message);
      setAskError(
        err?.response?.data?.error || "Could not get an answer right now. Please try again."
      );
    } finally {
      setAskLoading(false);
    }
  };

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

  const openProductDetail = async (product) => {
    setSelectedProduct(product); // instantly show what we already have
    setModalLang("en");
    setDetailError(null);
    setDetailLoading(true);
    resetAskState();
    try {
      const { data } = await client.get(`/products/${product.id}/`);
      setSelectedProduct(data);
    } catch (err) {
      console.error("Product detail load error:", err?.response?.data || err.message);
      setDetailError("Could not refresh full details.");
    } finally {
      setDetailLoading(false);
    }
  };

  const closeProductDetail = () => {
    setSelectedProduct(null);
    resetAskState();
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
          <div className="app-header-actions">
            <Link to="/gallery" style={{ marginRight: 12, fontWeight: 600 }}>Gallery</Link>
            <LanguageSwitcher />
            <span className="user-badge">
              <span className="user-badge-avatar">{user?.username?.[0]}</span>
              {user?.username}
            </span>
            <button type="button" className="upload-button logout-btn" onClick={logout}>
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
              <div className="field-block">
                <label className="field-block-label" htmlFor="product-type">Product type</label>
                <select
                  id="product-type"
                  value={productType}
                  onChange={(e) => setProductType(e.target.value)}
                  className="select-input"
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

              <div className="field-row-2">
                <div className="field-block">
                  <label className="field-block-label" htmlFor="qty-needed">Quantity needed</label>
                  <input
                    id="qty-needed"
                    type="number"
                    min="1"
                    value={quantityNeeded}
                    onChange={(e) => setQuantityNeeded(e.target.value)}
                    className="text-input"
                  />
                </div>
                <div className="field-block">
                  <label className="field-block-label" htmlFor="unit-price">Unit price (₹)</label>
                  <input
                    id="unit-price"
                    type="number"
                    min="0"
                    value={unitPriceInr}
                    onChange={(e) => setUnitPriceInr(e.target.value)}
                    className="text-input"
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
                <div className={`transcript-box cluster-summary-box ${clusterResult.success ? "" : "failed"}`}>
                  <p>
                    {clusterResult.success
                      ? `Fulfilled — ${clusterResult.clusterSize} artisans covering ${clusterResult.totalUnitsAllocated} units${
                          clusterResult.totalRevenueInr ? ` for ₹${clusterResult.totalRevenueInr.toLocaleString("en-IN")}` : ""
                        }`
                      : clusterResult.reason}
                  </p>
                </div>

                {clusterResult.allocation?.map((a) => (
                  <div key={a.artisanId} className="list-item">
                    <div className="match-badge">{a.matchScore}%</div>
                    <div className="list-item-info">
                      <strong>{a.name}</strong>
                      <span>
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

            <form onSubmit={handleSearch} className="search-row">
              <input
                type="text"
                placeholder="Search by name, material, category..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="text-input"
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
              <p className="empty-state">No listings yet — check back soon.</p>
            )}

            <div className="product-grid">
              {products.map((p) => (
                <div key={p.id} className="product-card" onClick={() => openProductDetail(p)}>
                  {p.image_data_url && (
                    <img src={p.image_data_url} alt={p.title} className="product-card-img" />
                  )}
                  <h4>
                    {p.title}
                    {p.artisan_is_verified && (
                      <span
                        title="Verified artisan"
                        style={{
                          marginLeft: 6,
                          fontSize: 11,
                          fontWeight: 600,
                          color: "#2f6f4f",
                          background: "#e3f0e6",
                          borderRadius: 10,
                          padding: "2px 8px",
                          verticalAlign: "middle",
                        }}
                      >
                        ✓ Verified
                      </span>
                    )}
                  </h4>
                  <p className="product-card-desc">
                    {p.description?.slice(0, 90)}
                    {p.description?.length > 90 ? "..." : ""}
                  </p>
                  <strong className="product-card-price">
                    {p.price_min_inr
                      ? `₹${p.price_min_inr}${p.price_max_inr && p.price_max_inr !== p.price_min_inr ? ` - ₹${p.price_max_inr}` : ""}`
                      : "Price on request"}
                  </strong>
                  <div style={{ margin: "6px 0 0" }}>
                    <ZeroCommissionBadge />
                  </div>
                  {p.units_sold > 0 && (
                    <p style={{ margin: "4px 0 0", fontSize: 11, color: "#8b8279" }}>
                      {p.units_sold} sold on Kaarigar
                    </p>
                  )}

                  {placedProductIds.includes(p.id) ? (
                    <span className="order-placed-tag">✓ Order placed</span>
                  ) : (
                    <div className="product-card-order">
                      <input
                        type="number"
                        min="1"
                        value={orderQuantities[p.id] || 1}
                        onClick={(e) => e.stopPropagation()}
                        onChange={(e) => {
                          e.stopPropagation();
                          setOrderQuantities((prev) => ({ ...prev, [p.id]: e.target.value }));
                        }}
                        className="qty-input"
                      />
                      <button
                        type="button"
                        className="create-listing-button"
                        style={{ flex: 1, padding: "8px 12px", fontSize: 12 }}
                        onClick={(e) => {
                          e.stopPropagation();
                          handlePlaceOrder(p);
                        }}
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
              <p className="empty-state">You haven't placed any orders yet.</p>
            )}

            {myOrders.map((o) => (
              <div key={o.id} className="list-item">
                {o.product_image && (
                  <img src={o.product_image} alt={o.product_title} className="list-item-thumb" />
                )}
                <div className="list-item-info">
                  <strong>
                    {o.product_title} × {o.quantity}
                  </strong>
                  <span>
                    by {o.artisan_username}
                    {o.total_price_inr ? ` · ₹${o.total_price_inr.toLocaleString("en-IN")}` : ""}
                  </span>
                </div>
                {o.status === "placed" && (
                  <button type="button" className="upload-button" onClick={() => handleCancelOrder(o.id)}>
                    Cancel
                  </button>
                )}
                <OrderStatusStepper status={o.status} />
              </div>
            ))}
          </div>
        </div>

        <div className="voice-footer">Kaarigar · Built for SIH26090</div>

        {selectedProduct && createPortal(
          <div className="modal-overlay" onClick={closeProductDetail}>
            <div className="modal-card" onClick={(e) => e.stopPropagation()}>
              <button type="button" className="modal-close" onClick={closeProductDetail}>
                ×
              </button>

              {selectedProduct.image_data_url && (
                <img src={selectedProduct.image_data_url} alt={selectedProduct.title} className="modal-image" />
              )}

              <div className="lang-tabs">
                <button
                  type="button"
                  className={`lang-tab ${modalLang === "en" ? "active" : ""}`}
                  onClick={() => setModalLang("en")}
                >
                  English
                </button>
                {selectedProduct.title_hi && (
                  <button
                    type="button"
                    className={`lang-tab ${modalLang === "hi" ? "active" : ""}`}
                    onClick={() => setModalLang("hi")}
                  >
                    हिंदी
                  </button>
                )}
              </div>

              <h2 className="modal-title">
                {modalLang === "hi" && selectedProduct.title_hi ? selectedProduct.title_hi : selectedProduct.title}
              </h2>

              {(selectedProduct.artisan_is_verified || selectedProduct.units_sold > 0) && (
                <p style={{ margin: "0 0 10px", fontSize: 12, color: "#6f665f" }}>
                  {selectedProduct.artisan_is_verified && (
                    <span style={{ color: "#2f6f4f", fontWeight: 600, marginRight: 10 }}>
                      ✓ Verified artisan
                    </span>
                  )}
                  {selectedProduct.units_sold > 0 && <span>{selectedProduct.units_sold} sold on Kaarigar</span>}
                </p>
              )}

              <p className="modal-desc">
                {modalLang === "hi" && selectedProduct.description_hi
                  ? selectedProduct.description_hi
                  : selectedProduct.description}
              </p>

              {(modalLang === "hi" ? selectedProduct.tags_hi : selectedProduct.tags)?.length > 0 && (
                <div className="modal-tags">
                  {(modalLang === "hi" ? selectedProduct.tags_hi : selectedProduct.tags).map((t, i) => (
                    <span key={i}>{t}</span>
                  ))}
                </div>
              )}

              {selectedProduct.craft_technique && (
                <p className="modal-meta">
                  <strong>Technique:</strong> {selectedProduct.craft_technique}
                </p>
              )}

              <p className="modal-meta">
                By <strong>{selectedProduct.artisan_username}</strong>
              </p>

              <div style={{ margin: "8px 0" }}>
                <ZeroCommissionBadge />
              </div>

              <strong className="modal-price">
                {selectedProduct.price_min_inr
                  ? `₹${selectedProduct.price_min_inr}${
                      selectedProduct.price_max_inr && selectedProduct.price_max_inr !== selectedProduct.price_min_inr
                        ? ` - ₹${selectedProduct.price_max_inr}`
                        : ""
                    }`
                  : "Price on request"}
              </strong>

              {detailError && <p style={{ fontSize: 12, color: "#8d3d36", marginBottom: 10 }}>{detailError}</p>}

              {/* ============ ASK THE ARTISAN (AI Q&A) ============ */}
              <div style={{ marginTop: 18, paddingTop: 16, borderTop: "1px solid #eee5d8" }}>
                <p className="result-label" style={{ marginBottom: 8 }}>
                  ASK THE ARTISAN
                </p>
                <form onSubmit={handleAskQuestion} style={{ display: "flex", gap: 8 }}>
                  <input
                    type="text"
                    placeholder="e.g. How long does this take to make?"
                    value={askQuestion}
                    onChange={(e) => setAskQuestion(e.target.value)}
                    className="text-input"
                    style={{ flex: 1 }}
                  />
                  <button
                    type="submit"
                    className="upload-button"
                    disabled={askLoading || !askQuestion.trim()}
                  >
                    {askLoading ? "Asking..." : "Ask"}
                  </button>
                </form>

                {askError && (
                  <p style={{ marginTop: 8, fontSize: 12, color: "#b3432b" }}>{askError}</p>
                )}

                {askAnswer && (
                  <div className="transcript-box" style={{ marginTop: 10 }}>
                    <p>{askAnswer}</p>
                  </div>
                )}
              </div>

              {placedProductIds.includes(selectedProduct.id) ? (
                <span className="order-placed-tag" style={{ marginTop: 16, display: "inline-block" }}>
                  ✓ Order placed
                </span>
              ) : (
                <div className="modal-order-row" style={{ marginTop: 16 }}>
                  <input
                    type="number"
                    min="1"
                    value={orderQuantities[selectedProduct.id] || 1}
                    onChange={(e) =>
                      setOrderQuantities((prev) => ({ ...prev, [selectedProduct.id]: e.target.value }))
                    }
                    className="qty-input"
                    style={{ width: 70 }}
                  />
                  <button
                    type="button"
                    className="create-listing-button"
                    style={{ padding: "10px 14px" }}
                    onClick={() => handlePlaceOrder(selectedProduct)}
                    disabled={placingOrderFor === selectedProduct.id}
                  >
                    {placingOrderFor === selectedProduct.id ? "Placing..." : "Place order"}
                  </button>
                </div>
              )}
            </div>
          </div>,
          document.body
        )}
      </div>
    </div>
  );
};

export default BuyerDashboard;
