import React, { useState, useEffect } from "react";
import client from "../api/client";
import { useAuth } from "../context/AuthContext";

const Gallery = () => {
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [caption, setCaption] = useState("");
  const [craftType, setCraftType] = useState("");
  const [mediaType, setMediaType] = useState("photo");
  const [fileDataUrl, setFileDataUrl] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState(null);

  const loadGallery = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await client.get("/gallery/");
      setItems(data);
    } catch (err) {
      setError("Could not load the gallery. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadGallery();
  }, []);

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setMediaType(file.type.startsWith("video") ? "video" : "photo");
    const reader = new FileReader();
    reader.onload = () => setFileDataUrl(reader.result);
    reader.readAsDataURL(file);
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    setUploadError(null);

    if (!fileDataUrl) {
      setUploadError("Please choose a photo or video first.");
      return;
    }

    setUploading(true);
    try {
      await client.post("/gallery/", {
        media_type: mediaType,
        media_data_url: fileDataUrl,
        caption,
        craft_type: craftType,
      });
      setCaption("");
      setCraftType("");
      setFileDataUrl(null);
      loadGallery();
    } catch (err) {
      setUploadError("Upload failed. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: "1.5rem" }}>
      <h2>Craft Gallery</h2>
      <p style={{ color: "#666" }}>
        Photos and videos of tribal artisans at work — the stories behind every piece.
      </p>

      {user?.role === "artisan" && (
        <form
          onSubmit={handleUpload}
          style={{
            border: "1px solid #ddd",
            borderRadius: 8,
            padding: "1rem",
            margin: "1rem 0",
          }}
        >
          <h3>Share your craft</h3>
          <input type="file" accept="image/*,video/*" onChange={handleFileChange} />
          <br />
          <br />
          <input
            placeholder="Craft type (e.g. Terracotta, Handloom)"
            value={craftType}
            onChange={(e) => setCraftType(e.target.value)}
            style={{ width: "100%", marginBottom: "0.5rem" }}
          />
          <textarea
            placeholder="Caption / short story about this photo or video"
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            style={{ width: "100%", marginBottom: "0.5rem" }}
          />
          {uploadError && <p style={{ color: "red" }}>{uploadError}</p>}
          <button type="submit" disabled={uploading}>
            {uploading ? "Uploading..." : "Upload"}
          </button>
        </form>
      )}

      {loading && <p>Loading gallery...</p>}
      {error && <p style={{ color: "red" }}>{error}</p>}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
          gap: "1rem",
          marginTop: "1rem",
        }}
      >
        {items.map((item) => (
          <div
            key={item.id}
            style={{ border: "1px solid #eee", borderRadius: 8, overflow: "hidden" }}
          >
            {item.media_type === "video" ? (
              <video src={item.media_data_url} controls style={{ width: "100%" }} />
            ) : (
              <img
                src={item.media_data_url}
                alt={item.caption}
                style={{ width: "100%", display: "block" }}
              />
            )}
            <div style={{ padding: "0.5rem" }}>
              <strong>{item.craft_type}</strong>
              <p style={{ fontSize: "0.9rem", color: "#555" }}>{item.caption}</p>
              <span style={{ fontSize: "0.8rem", color: "#999" }}>by {item.artisan_username}</span>
            </div>
          </div>
        ))}
      </div>

      {!loading && items.length === 0 && <p>No gallery items yet — be the first to share!</p>}
    </div>
  );
};

export default Gallery;