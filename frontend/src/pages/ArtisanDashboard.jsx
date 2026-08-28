import React, { useState, useRef, useEffect } from "react";
import client from "../api/client";
import { useAuth } from "../context/AuthContext";
import "../components/VoicePanel.css";
import { Link } from "react-router-dom";

const ArtisanDashboard = () => {
  const { user, logout } = useAuth();

  // ---------- PRODUCT PHOTO ----------
  const [photoDataUrl, setPhotoDataUrl] = useState(null);
  const [photoMediaType, setPhotoMediaType] = useState(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [catalogResult, setCatalogResult] = useState(null);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [catalogError, setCatalogError] = useState(null);
  const [catalogSaveState, setCatalogSaveState] = useState("idle"); // idle | saving | saved | error

  const fileInputRef = useRef(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);

  const resetPhotoState = () => {
    setPhotoDataUrl(null);
    setPhotoMediaType(null);
    setCatalogResult(null);
    setCatalogError(null);
  };

  const handleChoosePhoto = () => fileInputRef.current?.click();

  const handleFileSelected = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    resetPhotoState();

    const reader = new FileReader();
    reader.onload = () => {
      setPhotoDataUrl(reader.result);
      setPhotoMediaType(file.type || "image/jpeg");
    };
    reader.readAsDataURL(file);
  };

  const startCamera = async () => {
    resetPhotoState();
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      streamRef.current = stream;
      setCameraActive(true);
      setTimeout(() => {
        if (videoRef.current) videoRef.current.srcObject = stream;
      }, 0);
    } catch (err) {
      console.error("Camera error:", err);
      setCatalogError("Camera access denied or unavailable.");
    }
  };

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setCameraActive(false);
  };

  const capturePhoto = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d").drawImage(video, 0, 0);

    const dataUrl = canvas.toDataURL("image/jpeg", 0.92);
    setPhotoDataUrl(dataUrl);
    setPhotoMediaType("image/jpeg");
    stopCamera();
  };

  const handleGenerateListing = async () => {
    if (!photoDataUrl) return;
    setCatalogLoading(true);
    setCatalogError(null);
    setCatalogResult(null);

    try {
      const base64 = photoDataUrl.split(",")[1];
      const { data } = await client.post("/catalog/", {
        imageBase64: base64,
        mediaType: photoMediaType,
      });
      setCatalogResult(data);
    } catch (err) {
      console.error("Catalog error:", err?.response?.data || err.message);
      setCatalogError(
        err?.response?.data?.error || "Could not generate a listing. Please try again."
      );
    } finally {
      setCatalogLoading(false);
    }
  };

  const parsePriceRange = (rangeText) => {
    if (!rangeText) return { min: null, max: null };
    const numbers = rangeText.match(/\d[\d,]*/g);
    if (!numbers) return { min: null, max: null };
    const parsed = numbers.map((n) => parseInt(n.replace(/,/g, ""), 10));
    return { min: parsed[0] ?? null, max: parsed[1] ?? parsed[0] ?? null };
  };

  const handleSaveCatalogListing = async () => {
    if (!catalogResult) return;
    setCatalogSaveState("saving");

    const { min, max } = parsePriceRange(catalogResult.suggested_price_range_inr);

    try {
      await client.post("/products/", {
        title: catalogResult.title,
        description: catalogResult.description,
        tags: catalogResult.tags || [],
        category: catalogResult.category || "",
        craft_technique: catalogResult.craft_technique_guess || "",
        price_min_inr: min,
        price_max_inr: max,
        image_data_url: photoDataUrl || "",
        source: "photo",
        status: "published",
      });
      setCatalogSaveState("saved");
    } catch (err) {
      console.error("Save listing error:", err?.response?.data || err.message);
      setCatalogSaveState("error");
    }
  };

  // ---------- VOICE CATALOGING ----------
  const [isRecording, setIsRecording] = useState(false);
  const [audioDataUrl, setAudioDataUrl] = useState(null);
  const [audioMediaType, setAudioMediaType] = useState(null);
  const [voiceResult, setVoiceResult] = useState(null);
  const [voiceLoading, setVoiceLoading] = useState(false);
  const [voiceError, setVoiceError] = useState(null);
  const [voicePrice, setVoicePrice] = useState({ min: "", max: "" });
  const [voiceSaveState, setVoiceSaveState] = useState("idle"); // idle | saving | saved | error

  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const audioStreamRef = useRef(null);

  const resetVoiceState = () => {
    setAudioDataUrl(null);
    setAudioMediaType(null);
    setVoiceResult(null);
    setVoiceError(null);
  };

  const startRecording = async () => {
    resetVoiceState();
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioStreamRef.current = stream;

      const preferredType = "audio/webm";
      const mimeType =
        typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(preferredType)
          ? preferredType
          : "";

      const recorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream);

      audioChunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        const blobType = recorder.mimeType || "audio/webm";
        const blob = new Blob(audioChunksRef.current, { type: blobType });
        const reader = new FileReader();
        reader.onload = () => {
          setAudioDataUrl(reader.result);
          setAudioMediaType(blobType);
        };
        reader.readAsDataURL(blob);

        stream.getTracks().forEach((t) => t.stop());
        audioStreamRef.current = null;
      };

      mediaRecorderRef.current = recorder;
      recorder.start();
      setIsRecording(true);
    } catch (err) {
      console.error("Microphone error:", err);
      setVoiceError("Microphone access denied or unavailable.");
    }
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    setIsRecording(false);
  };

  const handleGenerateVoiceListing = async () => {
    if (!audioDataUrl) return;
    setVoiceLoading(true);
    setVoiceError(null);
    setVoiceResult(null);

    try {
      const base64 = audioDataUrl.split(",")[1];
      const { data } = await client.post("/voice/", {
        audioBase64: base64,
        mediaType: audioMediaType,
      });
      setVoiceResult(data);
    } catch (err) {
      console.error("Voice catalog error:", err?.response?.data || err.message);
      setVoiceError(
        err?.response?.data?.error || "Could not generate a listing. Please try again."
      );
    } finally {
      setVoiceLoading(false);
    }
  };

  const handleSaveVoiceListing = async () => {
    if (!voiceResult) return;
    setVoiceSaveState("saving");

    try {
      await client.post("/products/", {
        title: voiceResult.english?.title || "",
        description: voiceResult.english?.description || "",
        tags: voiceResult.english?.tags || [],
        title_hi: voiceResult.hindi?.title || "",
        description_hi: voiceResult.hindi?.description || "",
        tags_hi: voiceResult.hindi?.tags || [],
        price_min_inr: voicePrice.min ? Number(voicePrice.min) : null,
        price_max_inr: voicePrice.max ? Number(voicePrice.max) : null,
        source: "voice",
        status: "published",
      });
      setVoiceSaveState("saved");
    } catch (err) {
      console.error("Save voice listing error:", err?.response?.data || err.message);
      setVoiceSaveState("error");
    }
  };

  // ---------- ORDERS RECEIVED ----------
  const [orders, setOrders] = useState([]);
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [ordersError, setOrdersError] = useState(null);
  const [updatingOrderId, setUpdatingOrderId] = useState(null);

  const STATUS_FLOW = ["placed", "in_production", "shipped", "delivered"];
  const STATUS_LABELS = {
    placed: "Placed",
    in_production: "In Production",
    shipped: "Shipped",
    delivered: "Delivered",
    cancelled: "Cancelled",
  };

  const loadOrders = async () => {
    setOrdersLoading(true);
    setOrdersError(null);
    try {
      const { data } = await client.get("/orders/received/");
      setOrders(data.results ?? data);
    } catch (err) {
      console.error("Orders load error:", err?.response?.data || err.message);
      setOrdersError("Could not load orders. Please try again.");
    } finally {
      setOrdersLoading(false);
    }
  };

  useEffect(() => {
    loadOrders();
  }, []);

  const advanceOrder = async (order) => {
    const currentIndex = STATUS_FLOW.indexOf(order.status);
    const nextStatus = STATUS_FLOW[currentIndex + 1];
    if (!nextStatus) return;

    setUpdatingOrderId(order.id);
    try {
      await client.patch(`/orders/${order.id}/status/`, { status: nextStatus });
      setOrders((prev) =>
        prev.map((o) => (o.id === order.id ? { ...o, status: nextStatus } : o))
      );
    } catch (err) {
      console.error("Order update error:", err?.response?.data || err.message);
      setOrdersError("Could not update that order. Please try again.");
    } finally {
      setUpdatingOrderId(null);
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
              <p>Cluster fulfillment and AI-drafted catalog listings, built for independent artisans.</p>
            </div>
          </div>
          <div className="app-header-actions">
            <Link to="/gallery" style={{ marginRight: 12, fontWeight: 600 }}>Gallery</Link>
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
          {/* ============ PRODUCT PHOTO ============ */}
          <div className="workspace-card">
            <div className="card-top">
              <div className="step-number">1</div>
              <div>
                <h3>Product Photo</h3>
                <p>Photograph the piece as it is. The listing — title, price, tags — is drafted for you.</p>
              </div>
            </div>

            {!photoDataUrl && !cameraActive && (
              <div className="photo-empty">
                <div className="camera-large-icon">📷</div>
                <h4>No photo yet</h4>
                <p>Choose a file or use your camera</p>
                <div className="photo-actions">
                  <button type="button" className="camera-button" onClick={startCamera}>
                    Use camera
                  </button>
                  <button type="button" className="upload-button" onClick={handleChoosePhoto}>
                    Choose photo
                  </button>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileSelected}
                  style={{ display: "none" }}
                />
              </div>
            )}

            {cameraActive && (
              <div className="camera-view">
                <video ref={videoRef} autoPlay playsInline className="camera-video" />
                <div className="camera-overlay">
                  <div className="corner top-left" />
                  <div className="corner top-right" />
                  <div className="corner bottom-left" />
                  <div className="corner bottom-right" />
                </div>
                <div className="camera-controls">
                  <button type="button" className="camera-cancel" onClick={stopCamera}>
                    Cancel
                  </button>
                  <button type="button" className="shutter-button" onClick={capturePhoto}>
                    <span />
                  </button>
                  <div className="camera-control-spacer" />
                </div>
              </div>
            )}

            {photoDataUrl && !cameraActive && (
              <div className="photo-preview">
                <img src={photoDataUrl} alt="Product" />
                <div className="photo-preview-overlay">
                  <span>Ready</span>
                  <button type="button" onClick={resetPhotoState}>
                    Retake
                  </button>
                </div>
              </div>
            )}

            <canvas ref={canvasRef} className="hidden-canvas" />

            {photoDataUrl && !cameraActive && (
              <button
                type="button"
                className="create-listing-button"
                style={{ marginTop: 16 }}
                onClick={handleGenerateListing}
                disabled={catalogLoading}
              >
                {catalogLoading ? <span className="button-spinner" /> : <span className="sparkle">✦</span>}
                {catalogLoading ? "Generating listing..." : "Generate listing"}
              </button>
            )}

            {catalogError && (
              <div className="error-box" style={{ marginTop: 16 }}>
                <div className="error-icon">!</div>
                <div>
                  <strong>Error</strong>
                  <p>{catalogError}</p>
                </div>
              </div>
            )}

            {catalogResult && (
              <div style={{ marginTop: 18 }}>
                <p className="result-label" style={{ marginBottom: 4 }}>
                  {catalogResult.category?.toUpperCase()}
                </p>
                <h3 style={{ margin: "0 0 10px", fontSize: 20 }}>{catalogResult.title}</h3>
                <p style={{ fontSize: 13, color: "#6f665f", lineHeight: 1.7, marginBottom: 10 }}>
                  {catalogResult.description}
                </p>
                {catalogResult.craft_technique_guess && (
                  <p style={{ fontSize: 12, color: "#8b8279", marginBottom: 12 }}>
                    <strong>Technique:</strong> {catalogResult.craft_technique_guess}
                  </p>
                )}
                {catalogResult.tags?.length > 0 && (
                  <div className="listing-tags" style={{ marginTop: 0, marginBottom: 20 }}>
                    {catalogResult.tags.map((t, i) => (
                      <span key={i}>{t}</span>
                    ))}
                  </div>
                )}

                {catalogResult.suggested_price_range_inr && (
                  <>
                    <p className="result-label" style={{ marginBottom: 8 }}>
                      DYNAMIC PRICING ASSISTANT
                    </p>
                    <div className="price-highlight">
                      <strong>
                        {catalogResult.suggested_price_range_inr}
                      </strong>
                      {catalogResult.price_reasoning && (
                        <p style={{ margin: "8px 0 0", fontSize: 12, color: "#6f665f" }}>
                          {catalogResult.price_reasoning}
                        </p>
                      )}
                    </div>
                  </>
                )}

                <button
                  type="button"
                  className="create-listing-button"
                  style={{ marginTop: 18 }}
                  onClick={handleSaveCatalogListing}
                  disabled={catalogSaveState === "saving" || catalogSaveState === "saved"}
                >
                  {catalogSaveState === "saving" && <span className="button-spinner" />}
                  {catalogSaveState === "idle" && <span className="sparkle">⇧</span>}
                  {catalogSaveState === "saving" && "Saving..."}
                  {catalogSaveState === "idle" && "Save & publish to marketplace"}
                  {catalogSaveState === "saved" && "✓ Published"}
                  {catalogSaveState === "error" && "Could not save — tap to retry"}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* ============ VOICE CATALOGING ============ */}
        <div className="workspace-card" style={{ marginTop: 20 }}>
          <div className="card-top">
            <div className="step-number">2</div>
            <div>
              <h3>Voice Cataloging</h3>
              <p>Describe the piece out loud, in Hindi or English. We'll transcribe it and draft a bilingual listing.</p>
            </div>
          </div>

          {!audioDataUrl && (
            <div className="record-area">
              <button
                type="button"
                className="record-button"
                onClick={isRecording ? stopRecording : startRecording}
                style={
                  isRecording
                    ? { borderColor: "#c0392b", background: "#fdecea" }
                    : undefined
                }
              >
                <div className="record-button-inner">
                  <span className="mic-icon">{isRecording ? "⏹" : "🎙"}</span>
                </div>
              </button>
              <div className="record-status">
                <strong>{isRecording ? "Recording... tap to stop" : "Tap to start recording"}</strong>
                <span>
                  {isRecording
                    ? "Speak clearly about the piece — material, technique, price idea."
                    : "Describe the piece out loud, in Hindi or English."}
                </span>
              </div>
            </div>
          )}

          {audioDataUrl && (
            <div style={{ marginTop: 4 }}>
              <audio controls src={audioDataUrl} className="audio-player" style={{ width: "100%" }} />
              <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
                <button
                  type="button"
                  className="create-listing-button"
                  style={{ flex: 1 }}
                  onClick={handleGenerateVoiceListing}
                  disabled={voiceLoading}
                >
                  {voiceLoading ? <span className="button-spinner" /> : <span className="sparkle">✦</span>}
                  {voiceLoading ? "Generating listing..." : "Generate listing"}
                </button>
                <button
                  type="button"
                  className="upload-button"
                  onClick={resetVoiceState}
                  disabled={voiceLoading}
                >
                  Re-record
                </button>
              </div>
            </div>
          )}

          {voiceError && (
            <div className="error-box" style={{ marginTop: 16 }}>
              <div className="error-icon">!</div>
              <div>
                <strong>Error</strong>
                <p>{voiceError}</p>
              </div>
            </div>
          )}

          {voiceResult && (
            <div style={{ marginTop: 18 }}>
              {voiceResult.transcript && (
                <>
                  <p className="result-label" style={{ marginBottom: 8 }}>
                    TRANSCRIPT
                  </p>
                  <div className="transcript-box" style={{ marginBottom: 20 }}>
                    <p>{voiceResult.transcript}</p>
                  </div>
                </>
              )}

              <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
                {voiceResult.english && (
                  <div style={{ flex: "1 1 260px" }}>
                    <p className="result-label" style={{ marginBottom: 8 }}>
                      ENGLISH
                    </p>
                    <h3 style={{ margin: "0 0 10px", fontSize: 18 }}>{voiceResult.english.title}</h3>
                    <p style={{ fontSize: 13, color: "#6f665f", lineHeight: 1.7, marginBottom: 10 }}>
                      {voiceResult.english.description}
                    </p>
                    {voiceResult.english.tags?.length > 0 && (
                      <div className="listing-tags">
                        {voiceResult.english.tags.map((t, i) => (
                          <span key={i}>{t}</span>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {voiceResult.hindi && (
                  <div style={{ flex: "1 1 260px" }}>
                    <p className="result-label" style={{ marginBottom: 8 }}>
                      हिन्दी
                    </p>
                    <h3 style={{ margin: "0 0 10px", fontSize: 18 }}>{voiceResult.hindi.title}</h3>
                    <p style={{ fontSize: 13, color: "#6f665f", lineHeight: 1.7, marginBottom: 10 }}>
                      {voiceResult.hindi.description}
                    </p>
                    {voiceResult.hindi.tags?.length > 0 && (
                      <div className="listing-tags">
                        {voiceResult.hindi.tags.map((t, i) => (
                          <span key={i}>{t}</span>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div style={{ display: "flex", gap: 12, marginTop: 20 }}>
                <div style={{ flex: 1 }}>
                  <strong style={{ fontSize: 12, display: "block", marginBottom: 6 }}>Min price (₹)</strong>
                  <input
                    type="number"
                    min="0"
                    value={voicePrice.min}
                    onChange={(e) => setVoicePrice((p) => ({ ...p, min: e.target.value }))}
                    style={{ width: "100%", padding: "10px 12px", borderRadius: 10, border: "1px solid #e3d7cb" }}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <strong style={{ fontSize: 12, display: "block", marginBottom: 6 }}>Max price (₹)</strong>
                  <input
                    type="number"
                    min="0"
                    value={voicePrice.max}
                    onChange={(e) => setVoicePrice((p) => ({ ...p, max: e.target.value }))}
                    style={{ width: "100%", padding: "10px 12px", borderRadius: 10, border: "1px solid #e3d7cb" }}
                  />
                </div>
              </div>

              <button
                type="button"
                className="create-listing-button"
                style={{ marginTop: 14 }}
                onClick={handleSaveVoiceListing}
                disabled={voiceSaveState === "saving" || voiceSaveState === "saved"}
              >
                {voiceSaveState === "saving" && <span className="button-spinner" />}
                {voiceSaveState === "idle" && <span className="sparkle">⇧</span>}
                {voiceSaveState === "saving" && "Saving..."}
                {voiceSaveState === "idle" && "Save & publish to marketplace"}
                {voiceSaveState === "saved" && "✓ Published"}
                {voiceSaveState === "error" && "Could not save — tap to retry"}
              </button>
            </div>
          )}
        </div>

        {/* ============ ORDERS RECEIVED ============ */}
        <div className="workspace-card" style={{ marginTop: 20 }}>
          <div className="card-top">
            <div className="step-number">3</div>
            <div>
              <h3>Orders Received</h3>
              <p>Orders buyers have placed on your published listings.</p>
            </div>
          </div>

          {ordersLoading && <p>Loading orders...</p>}

          {ordersError && (
            <div className="error-box" style={{ marginTop: 12 }}>
              <div className="error-icon">!</div>
              <div>
                <strong>Error</strong>
                <p>{ordersError}</p>
              </div>
            </div>
          )}

          {!ordersLoading && !ordersError && orders.length === 0 && (
            <p className="empty-state">No orders yet. Once a buyer orders one of your listings, it'll show up here.</p>
          )}

          {orders.map((o) => (
            <div key={o.id} className="list-item">
              {o.product_image && (
                <img src={o.product_image} alt={o.product_title} className="list-item-thumb" />
              )}
              <div className="list-item-info">
                <strong>
                  {o.product_title} × {o.quantity}
                </strong>
                <span>
                  {o.buyer_username}
                  {o.total_price_inr ? ` · ₹${o.total_price_inr.toLocaleString("en-IN")}` : ""}
                </span>
              </div>
              <span className={`status-pill ${o.status === "cancelled" ? "cancelled" : ""}`}>
                {STATUS_LABELS[o.status] || o.status}
              </span>
              {STATUS_FLOW.indexOf(o.status) >= 0 && STATUS_FLOW.indexOf(o.status) < STATUS_FLOW.length - 1 && (
                <button
                  type="button"
                  className="upload-button"
                  onClick={() => advanceOrder(o)}
                  disabled={updatingOrderId === o.id}
                >
                  {updatingOrderId === o.id
                    ? "Updating..."
                    : `Mark ${STATUS_LABELS[STATUS_FLOW[STATUS_FLOW.indexOf(o.status) + 1]]}`}
                </button>
              )}
            </div>
          ))}
        </div>

        <div className="voice-footer">Kaarigar · Built for SIH26090</div>
      </div>
    </div>
  );
};

export default ArtisanDashboard;