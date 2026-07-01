"use client";

import { useState, useEffect } from "react";
import api from "@/lib/api";

interface PaymentSettings {
  codEnabled: boolean;
  maxCodAmount: number;
  bookingAmount: number;
  freeCodAbove: number;
  maxCodOrdersPerCustomer: number;
  blacklistHighRisk: boolean;
  allowCodOnSale: boolean;
  requirePhoneVerification: boolean;
  autoCancelHours: number;
}

const defaultSettings: PaymentSettings = {
  codEnabled: true,
  maxCodAmount: 10000,
  bookingAmount: 200,
  freeCodAbove: 5000,
  maxCodOrdersPerCustomer: 5,
  blacklistHighRisk: true,
  allowCodOnSale: false,
  requirePhoneVerification: true,
  autoCancelHours: 24,
};

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<PaymentSettings>(defaultSettings);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    api.get("/admin/settings/payments")
      .then((res: any) => {
        const data = res.data || res;
        setSettings({ ...defaultSettings, ...data });
      })
      .catch((err) => {
        console.error("Failed to load payment settings", err);
        setError("Failed to load payment settings from server.");
      })
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");

    try {
      await api.put("/admin/settings/payments", settings);
      setSuccess("Payment settings updated successfully.");
      setTimeout(() => setSuccess(""), 4000);
    } catch (err: any) {
      setError(err.message || "Failed to save payment settings.");
    } finally {
      setSaving(false);
    }
  };

  const updateSetting = <K extends keyof PaymentSettings>(key: K, value: PaymentSettings[K]) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  const labelStyle: React.CSSProperties = {
    display: "block",
    fontSize: "11px",
    fontWeight: 700,
    letterSpacing: "0.05em",
    textTransform: "uppercase",
    color: "var(--color-on-surface-variant)",
    marginBottom: "6px",
  };

  const sectionHeaderStyle: React.CSSProperties = {
    fontFamily: "var(--font-serif)",
    fontSize: "18px",
    fontWeight: 600,
    color: "var(--color-charcoal)",
    marginBottom: "20px",
    paddingBottom: "12px",
    borderBottom: "1px solid var(--color-outline-variant)",
  };

  const inputWrapperStyle: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    border: "1px solid var(--color-outline-variant)",
    backgroundColor: "var(--color-surface-container-lowest)",
  };

  const prefixSuffixStyle: React.CSSProperties = {
    padding: "10px 12px",
    fontSize: "14px",
    fontWeight: 600,
    color: "var(--color-on-surface-variant)",
    backgroundColor: "var(--color-cream)",
    borderRight: "1px solid var(--color-outline-variant)",
    whiteSpace: "nowrap",
  };

  const suffixStyle: React.CSSProperties = {
    ...prefixSuffixStyle,
    borderRight: "none",
    borderLeft: "1px solid var(--color-outline-variant)",
  };

  const toggleContainerStyle: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "16px 0",
  };

  if (loading) {
    return (
      <div style={{ padding: "40px 0", color: "var(--color-on-surface-variant)" }}>
        Loading payment settings...
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "32px" }}>
        <div>
          <h1 style={{ fontSize: "36px", fontWeight: 600, marginBottom: "8px" }}>Payment Settings</h1>
          <p style={{ color: "var(--color-on-surface-variant)", fontSize: "14px" }}>
            Configure Cash on Delivery and payment options
          </p>
        </div>
      </div>

      {error && (
        <div style={{
          backgroundColor: "var(--color-error-container)",
          border: "1px solid var(--color-error)",
          color: "var(--color-error)",
          padding: "12px 16px",
          marginBottom: "20px",
          fontSize: "14px",
        }}>
          {error}
        </div>
      )}

      {success && (
        <div style={{
          backgroundColor: "rgba(46, 125, 50, 0.08)",
          border: "1px solid var(--color-success)",
          color: "var(--color-success)",
          padding: "12px 16px",
          marginBottom: "20px",
          fontSize: "14px",
          fontWeight: 600,
        }}>
          {success}
        </div>
      )}

      <form onSubmit={handleSave} className="card-elevated" style={{ padding: "32px" }}>

        {/* ═══════ SECTION: COD General ═══════ */}
        <div style={{ marginBottom: "36px" }}>
          <h3 style={sectionHeaderStyle}>Cash on Delivery — General</h3>

          {/* Enable COD Toggle */}
          <div style={toggleContainerStyle}>
            <div>
              <span style={{ ...labelStyle, marginBottom: 0 }}>Enable COD</span>
              <p style={{ fontSize: "12px", color: "var(--color-on-surface-variant)", margin: "4px 0 0" }}>
                Allow customers to place Cash on Delivery orders
              </p>
            </div>
            <button
              type="button"
              onClick={() => updateSetting("codEnabled", !settings.codEnabled)}
              style={{
                width: "48px",
                height: "26px",
                borderRadius: "13px",
                border: "none",
                backgroundColor: settings.codEnabled ? "var(--color-ruby)" : "var(--color-outline-variant)",
                position: "relative",
                cursor: "pointer",
                transition: "background-color 0.2s",
              }}
            >
              <span style={{
                position: "absolute",
                top: "3px",
                left: settings.codEnabled ? "25px" : "3px",
                width: "20px",
                height: "20px",
                borderRadius: "50%",
                backgroundColor: "white",
                transition: "left 0.2s",
                boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
              }} />
            </button>
          </div>

          {/* Maximum COD Order */}
          <div style={{ marginBottom: "20px" }}>
            <label style={labelStyle}>Maximum COD Order</label>
            <div style={inputWrapperStyle}>
              <span style={prefixSuffixStyle}>₹</span>
              <input
                className="input"
                type="number"
                value={settings.maxCodAmount}
                onChange={(e) => updateSetting("maxCodAmount", Number(e.target.value))}
                min={0}
                style={{ border: "none", flex: 1 }}
              />
            </div>
          </div>

          {/* Booking Amount */}
          <div style={{ marginBottom: "20px" }}>
            <label style={labelStyle}>Booking Amount</label>
            <div style={inputWrapperStyle}>
              <span style={prefixSuffixStyle}>₹</span>
              <input
                className="input"
                type="number"
                value={settings.bookingAmount}
                onChange={(e) => updateSetting("bookingAmount", Number(e.target.value))}
                min={0}
                style={{ border: "none", flex: 1 }}
              />
            </div>
          </div>

          {/* Free COD Above */}
          <div style={{ marginBottom: "20px" }}>
            <label style={labelStyle}>Free COD Above</label>
            <div style={inputWrapperStyle}>
              <span style={prefixSuffixStyle}>₹</span>
              <input
                className="input"
                type="number"
                value={settings.freeCodAbove}
                onChange={(e) => updateSetting("freeCodAbove", Number(e.target.value))}
                min={0}
                style={{ border: "none", flex: 1 }}
              />
            </div>
            <p style={{ fontSize: "12px", color: "var(--color-on-surface-variant)", margin: "6px 0 0" }}>
              Set to 0 to always require booking amount
            </p>
          </div>

          {/* Max COD Orders per Customer */}
          <div style={{ marginBottom: "0" }}>
            <label style={labelStyle}>Max COD Orders per Customer</label>
            <input
              className="input"
              type="number"
              value={settings.maxCodOrdersPerCustomer}
              onChange={(e) => updateSetting("maxCodOrdersPerCustomer", Number(e.target.value))}
              min={1}
              style={{ maxWidth: "200px" }}
            />
          </div>
        </div>

        {/* ═══════ SECTION: Risk & Verification ═══════ */}
        <div style={{ marginBottom: "36px" }}>
          <h3 style={sectionHeaderStyle}>Risk &amp; Verification</h3>

          {/* Blacklist High-Risk Customers */}
          <div style={{ ...toggleContainerStyle, borderBottom: "1px solid var(--color-outline-variant)" }}>
            <div>
              <span style={{ ...labelStyle, marginBottom: 0 }}>Blacklist High-Risk Customers</span>
              <p style={{ fontSize: "12px", color: "var(--color-on-surface-variant)", margin: "4px 0 0" }}>
                Automatically block COD for customers with a history of returns or cancellations
              </p>
            </div>
            <button
              type="button"
              onClick={() => updateSetting("blacklistHighRisk", !settings.blacklistHighRisk)}
              style={{
                width: "48px",
                height: "26px",
                borderRadius: "13px",
                border: "none",
                backgroundColor: settings.blacklistHighRisk ? "var(--color-ruby)" : "var(--color-outline-variant)",
                position: "relative",
                cursor: "pointer",
                transition: "background-color 0.2s",
              }}
            >
              <span style={{
                position: "absolute",
                top: "3px",
                left: settings.blacklistHighRisk ? "25px" : "3px",
                width: "20px",
                height: "20px",
                borderRadius: "50%",
                backgroundColor: "white",
                transition: "left 0.2s",
                boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
              }} />
            </button>
          </div>

          {/* Allow COD on Sale Items */}
          <div style={{ ...toggleContainerStyle, borderBottom: "1px solid var(--color-outline-variant)" }}>
            <div>
              <span style={{ ...labelStyle, marginBottom: 0 }}>Allow COD on Sale Items</span>
              <p style={{ fontSize: "12px", color: "var(--color-on-surface-variant)", margin: "4px 0 0" }}>
                Permit Cash on Delivery for discounted or sale-priced products
              </p>
            </div>
            <button
              type="button"
              onClick={() => updateSetting("allowCodOnSale", !settings.allowCodOnSale)}
              style={{
                width: "48px",
                height: "26px",
                borderRadius: "13px",
                border: "none",
                backgroundColor: settings.allowCodOnSale ? "var(--color-ruby)" : "var(--color-outline-variant)",
                position: "relative",
                cursor: "pointer",
                transition: "background-color 0.2s",
              }}
            >
              <span style={{
                position: "absolute",
                top: "3px",
                left: settings.allowCodOnSale ? "25px" : "3px",
                width: "20px",
                height: "20px",
                borderRadius: "50%",
                backgroundColor: "white",
                transition: "left 0.2s",
                boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
              }} />
            </button>
          </div>

          {/* Require Phone Verification */}
          <div style={toggleContainerStyle}>
            <div>
              <span style={{ ...labelStyle, marginBottom: 0 }}>Require Phone Verification</span>
              <p style={{ fontSize: "12px", color: "var(--color-on-surface-variant)", margin: "4px 0 0" }}>
                Customers must verify their phone number before placing a COD order
              </p>
            </div>
            <button
              type="button"
              onClick={() => updateSetting("requirePhoneVerification", !settings.requirePhoneVerification)}
              style={{
                width: "48px",
                height: "26px",
                borderRadius: "13px",
                border: "none",
                backgroundColor: settings.requirePhoneVerification ? "var(--color-ruby)" : "var(--color-outline-variant)",
                position: "relative",
                cursor: "pointer",
                transition: "background-color 0.2s",
              }}
            >
              <span style={{
                position: "absolute",
                top: "3px",
                left: settings.requirePhoneVerification ? "25px" : "3px",
                width: "20px",
                height: "20px",
                borderRadius: "50%",
                backgroundColor: "white",
                transition: "left 0.2s",
                boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
              }} />
            </button>
          </div>
        </div>

        {/* ═══════ SECTION: Auto-Cancellation ═══════ */}
        <div style={{ marginBottom: "36px" }}>
          <h3 style={sectionHeaderStyle}>Auto-Cancellation</h3>

          <div>
            <label style={labelStyle}>Auto Cancel Unconfirmed COD</label>
            <div style={inputWrapperStyle}>
              <input
                className="input"
                type="number"
                value={settings.autoCancelHours}
                onChange={(e) => updateSetting("autoCancelHours", Number(e.target.value))}
                min={1}
                style={{ border: "none", flex: 1, maxWidth: "160px" }}
              />
              <span style={suffixStyle}>hours</span>
            </div>
            <p style={{ fontSize: "12px", color: "var(--color-on-surface-variant)", margin: "6px 0 0" }}>
              Unconfirmed COD orders will be automatically cancelled after this duration
            </p>
          </div>
        </div>

        {/* ═══════ SAVE ═══════ */}
        <div style={{ display: "flex", gap: "12px", borderTop: "1px solid var(--color-outline-variant)", paddingTop: "24px" }}>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? "Saving..." : "Save Payment Settings"}
          </button>
        </div>
      </form>
    </div>
  );
}
