import React, { useState } from "react";
import { useLanguage } from "../context/LanguageContext";

const COMMON_LANGUAGES = [
  "English", "Hindi", "Odia", "Bengali", "Tamil", "Telugu",
  "Marathi", "Gujarati", "Punjabi", "Kannada", "Malayalam",
  "Santali", "Bhili", "Gondi", "Assamese", "Urdu",
  "Spanish", "French", "Arabic", "Chinese",
];

const LanguageSwitcher = () => {
  const { language, setLanguage, loading } = useLanguage();
  const [customLang, setCustomLang] = useState("");
  const [showCustom, setShowCustom] = useState(false);

  const handleSelect = (e) => {
    const val = e.target.value;
    if (val === "__other__") {
      setShowCustom(true);
      return;
    }
    setShowCustom(false);
    setLanguage(val);
  };

  const handleCustomSubmit = (e) => {
    e.preventDefault();
    if (customLang.trim()) {
      setLanguage(customLang.trim());
      setShowCustom(false);
    }
  };

  return (
    <div style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
      <select
        value={COMMON_LANGUAGES.includes(language) ? language : "__other__"}
        onChange={handleSelect}
        style={{ padding: "4px 8px", borderRadius: 6 }}
      >
        {COMMON_LANGUAGES.map((lang) => (
          <option key={lang} value={lang}>{lang}</option>
        ))}
        <option value="__other__">Other (type your language)</option>
      </select>

      {showCustom && (
        <form onSubmit={handleCustomSubmit} style={{ display: "inline-flex", gap: 4 }}>
          <input
            placeholder="Type your language"
            value={customLang}
            onChange={(e) => setCustomLang(e.target.value)}
            style={{ padding: "4px 8px", borderRadius: 6 }}
          />
          <button type="submit">Go</button>
        </form>
      )}

      {loading && <span style={{ fontSize: 12, color: "#999" }}>Translating...</span>}
    </div>
  );
};

export default LanguageSwitcher;