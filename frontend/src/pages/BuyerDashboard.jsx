import React, { useState } from "react";
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
        </div>

        <div className="voice-footer">Kaarigar · Built for SIH26090</div>
      </div>
    </div>
  );
};

export default BuyerDashboard;