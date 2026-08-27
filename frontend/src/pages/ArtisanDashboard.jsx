import React, { useState, useRef } from "react";
import client from "../api/client";
import { useAuth } from "../context/AuthContext";
import "../components/VoicePanel.css";

const ArtisanDashboard = () => {
  const { user, logout } = useAuth();

  // ---------- PRODUCT PHOTO ----------
  const [photoDataUrl, setPhotoDataUrl] = useState(null);
  const [photoMediaType, setPhotoMediaType] = useState(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [catalogResult, setCatalogResult] = useState(null);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [catalogError, setCatalogError] = useState(null);

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

  // ---------- VOICE CATALOGING ----------
  const [isRecording, setIsRecording] = useState(false);
  const [audioDataUrl, setAudioDataUrl] = useState(null);
  const [audioMediaType, setAudioMediaType] = useState(null);
  const [voiceResult, setVoiceResult] = useState(null);
  const [voiceLoading, setVoiceLoading] = useState(false);
  const [voiceError, setVoiceError] = useState(null);

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
                    <div
                      style={{
                        padding: "16px 18px",
                        borderRadius: 14,
                        background: "#fbf3e7",
                        borderLeft: "4px solid #c98f4a",
                      }}
                    >
                      <strong style={{ fontSize: 20, color: "#a3702f" }}>
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
            </div>
          )}
        </div>

        <div className="voice-footer">Kaarigar · Built for SIH26090</div>
      </div>
    </div>
  );
};

export default ArtisanDashboard;