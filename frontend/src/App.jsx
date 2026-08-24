import { useState } from "react";
import { Routes, Route, Link, Navigate } from "react-router-dom";
import "./App.css";
import { useAuth } from "./context/AuthContext.jsx";
import Login from "./pages/Login.jsx";
import Register from "./pages/Register.jsx";
import ProtectedRoute from "./components/ProtectedRoute.jsx";

const API_BASE = "http://127.0.0.1:8000/api";

function Stamp({ value }) {
  return (
    <div className="stamp">
      <span>{value}</span>
      <em>%</em>
    </div>
  );
}

function ClusterForm() {
  const [productType, setProductType] = useState("Terracotta Pots");
  const [quantity, setQuantity] = useState(80);
  const [unitPrice, setUnitPrice] = useState(150);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch(`${API_BASE}/cluster/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          order: {
            productType,
            quantityNeeded: Number(quantity),
            unitPriceInr: Number(unitPrice),
          },
        }),
      });
      const data = await res.json();
      setResult(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="card">
      <div className="card-head">
        <span className="icon-tile">🪢</span>
        <div>
          <p className="eyebrow">Bulk order</p>
          <h2>Form an artisan cluster</h2>
        </div>
      </div>
      <p className="card-intro">
        Enter what a buyer needs. We'll pool the right artisans together until the order is covered.
      </p>

      <form onSubmit={handleSubmit}>
        <div className="field">
          <label htmlFor="productType">Product type</label>
          <select id="productType" value={productType} onChange={(e) => setProductType(e.target.value)}>
            <option>Terracotta Pots</option>
            <option>Handloom Sarees</option>
            <option>Wood Carvings</option>
          </select>
        </div>

        <div className="field-row">
          <div className="field">
            <label htmlFor="quantity">Quantity needed</label>
            <input
              id="quantity"
              type="number"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
            />
          </div>
          <div className="field">
            <label htmlFor="unitPrice">Unit price (₹)</label>
            <input
              id="unitPrice"
              type="number"
              value={unitPrice}
              onChange={(e) => setUnitPrice(e.target.value)}
            />
          </div>
        </div>

        <button type="submit" className="btn btn-madder" disabled={loading}>
          {loading ? "Forming cluster…" : "Form cluster"}
        </button>
      </form>

      {error && <p className="notice notice-error">Something went wrong: {error}</p>}

      {result && (
        <div className="result">
          <div className="thread-divider" />
          {result.success ? (
            <>
              <p className="ticket ticket-ok">
                Fulfilled — {result.clusterSize} artisan{result.clusterSize === 1 ? "" : "s"} covering{" "}
                {result.totalUnitsAllocated} units for ₹{result.totalRevenueInr?.toLocaleString("en-IN")}
              </p>
              <ul className="allocation-list">
                {result.allocation.map((a) => (
                  <li key={a.artisanId}>
                    <Stamp value={a.matchScore} />
                    <div className="allocation-details">
                      <strong>{a.name}</strong>
                      <span>
                        {a.unitsAllocated} units · ₹{a.revenueShareInr?.toLocaleString("en-IN")}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <p className="ticket ticket-warn">{result.reason}</p>
          )}
        </div>
      )}
    </section>
  );
}

function CatalogForm() {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleFileChange = (e) => {
    const f = e.target.files[0];
    if (!f) return;
    setFile(f);
    setPreview(URL.createObjectURL(f));
    setResult(null);
    setError(null);
  };

  const handleGenerate = async () => {
    if (!file) return;
    setLoading(true);
    setError(null);
    setResult(null);

    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = reader.result.split(",")[1];
      try {
        const res = await fetch(`${API_BASE}/catalog/`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ imageBase64: base64, mediaType: file.type }),
        });
        const data = await res.json();
        if (data.error) {
          setError(data.error + (data.details ? `: ${data.details}` : ""));
        } else {
          setResult(data);
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    reader.readAsDataURL(file);
  };

  return (
    <section className="card">
      <div className="card-head">
        <span className="icon-tile icon-tile-indigo">🖼️</span>
        <div>
          <p className="eyebrow">Product photo</p>
          <h2>Generate a catalog listing</h2>
        </div>
      </div>
      <p className="card-intro">
        Photograph the piece as it is. The listing — title, price range, tags — is drafted for you.
      </p>

      <label className="file-picker">
        <input type="file" accept="image/*" onChange={handleFileChange} hidden />
        <span className="file-picker-btn">Choose photo</span>
        <span className="file-picker-name">{file ? file.name : "No photo selected"}</span>
      </label>

      {preview && <img src={preview} alt="Selected product" className="preview" />}

      <button className="btn btn-indigo" onClick={handleGenerate} disabled={!file || loading}>
        {loading ? "Reading the photo…" : "Generate listing"}
      </button>

      {error && <p className="notice notice-error">Couldn't generate a listing: {error}</p>}

      {result && (
        <div className="result">
          <div className="thread-divider" />
          <p className="eyebrow">{result.category}</p>
          <h3 className="listing-title">{result.title}</h3>
          <p>{result.description}</p>
          <div className="price-block">
            <span className="price-value">{result.suggested_price_range_inr}</span>
            <span className="price-reason">{result.price_reasoning}</span>
          </div>
          <p className="technique">
            <strong>Technique:</strong> {result.craft_technique_guess}
          </p>
          <div className="swatches">
            {result.tags?.map((t) => (
              <span key={t} className="swatch">
                {t}
              </span>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

function TopBar() {
  const { user, logout } = useAuth();
  return (
    <nav className="topbar">
      {user ? (
        <>
          <span className="topbar-user">
            {user.username} · {user.role}
          </span>
          <button className="btn-link" onClick={logout}>
            Logout
          </button>
        </>
      ) : (
        <>
          <Link to="/login">Login</Link>
          <Link to="/register">Register</Link>
        </>
      )}
    </nav>
  );
}

function Home() {
  return (
    <div className="app">
      <header>
        <p className="eyebrow eyebrow-center">Handcrafted · India</p>
        <h1 className="wordmark">Kaarigar</h1>
        <p className="tagline">
          Cluster fulfillment and AI-drafted catalog listings, built for independent artisans.
        </p>
      </header>
      <main>
        <ClusterForm />
        <CatalogForm />
      </main>
      <footer>
        <div className="thread-divider" />
        <p>Every order, woven from many hands.</p>
      </footer>
    </div>
  );
}

function App() {
  return (
    <>
      <TopBar />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute role="artisan">
              <div className="app"><p>Artisan dashboard coming soon.</p></div>
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}

export default App;