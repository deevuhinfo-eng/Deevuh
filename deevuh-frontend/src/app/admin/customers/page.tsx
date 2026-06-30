"use client";

import { useState, useEffect } from "react";
import api from "@/lib/api";

interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  memberSince: string;
  sizing: {
    chest: string;
    waist: string;
    shoulder: string;
    height: string;
    fit: string;
  };
}

export default function AdminCustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCustomer, setActiveCustomer] = useState<Customer | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api.get("/admin/customers")
      .then((res: any) => {
        setCustomers(res.data || []);
      })
      .catch((err: any) => {
        console.error(err);
        setError("Failed to load customer directory.");
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div style={{ padding: "40px 0", color: "var(--color-on-surface-variant)" }}>
        Loading member directory...
      </div>
    );
  }

  return (
    <div className="animate-fade-in" style={{ display: "grid", gridTemplateColumns: activeCustomer ? "1.5fr 1fr" : "1fr", gap: "24px", alignItems: "start" }}>
      
      {/* LEFT: CUSTOMERS TABLE */}
      <div>
        <div style={{ marginBottom: "32px" }}>
          <h1 style={{ fontSize: "36px", fontWeight: 600, marginBottom: "8px" }}>Customers</h1>
          <p style={{ color: "var(--color-on-surface-variant)", fontSize: "14px" }}>
            View registered capsule wardrobe guild members and review tailor measurements
          </p>
        </div>

        {error && (
          <div style={{
            backgroundColor: "var(--color-error-container)",
            border: "1px solid var(--color-error)",
            color: "var(--color-error)",
            padding: "12px 16px",
            marginBottom: "20px",
            fontSize: "14px"
          }}>
            {error}
          </div>
        )}

        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Member Name</th>
                <th>Contact Details</th>
                <th>Sizing Slate Status</th>
                <th>Address</th>
                <th>Joined</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {customers.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: "center", padding: "24px", color: "var(--color-on-surface-variant)" }}>
                    No members registered yet.
                  </td>
                </tr>
              ) : (
                customers.map((cust) => (
                  <tr key={cust.id} style={{ cursor: "pointer" }} onClick={() => setActiveCustomer(cust)}>
                    <td style={{ fontWeight: 600 }}>
                    {cust.name}
                  </td>
                  <td>
                    <div>{cust.email}</div>
                    <div style={{ fontSize: "12px", color: "var(--color-on-surface-variant)" }}>{cust.phone}</div>
                  </td>
                  <td>
                    <span className="badge badge-success" style={{ backgroundColor: "rgba(152, 17, 30, 0.1)", color: "var(--color-ruby)" }}>
                      ✓ CALIBRATED ({cust.sizing.fit})
                    </span>
                  </td>
                  <td style={{ fontSize: "13px", maxWidth: "200px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {cust.address}
                  </td>
                  <td style={{ fontSize: "13px", color: "var(--color-on-surface-variant)" }}>
                    {cust.memberSince}
                  </td>
                  <td onClick={(e) => e.stopPropagation()}>
                    <button className="btn btn-ghost btn-sm" onClick={() => setActiveCustomer(cust)}>
                      View Specs
                    </button>
                  </td>
                </tr>
              ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* RIGHT: DETAILED SIZING PROFILE SPEC */}
      {activeCustomer && (
        <div className="card-elevated animate-fade-in" style={{ padding: "24px", border: "1px solid var(--color-outline-variant)", position: "sticky", top: "120px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px", paddingBottom: "12px", borderBottom: "1px solid var(--color-outline-variant)" }}>
            <h3 style={{ fontFamily: "var(--font-serif)", fontSize: "18px", fontWeight: 600 }}>
              Tailoring Card: {activeCustomer.name}
            </h3>
            <button
              onClick={() => setActiveCustomer(null)}
              style={{ background: "none", border: "none", fontSize: "20px", cursor: "pointer", color: "var(--color-on-surface-variant)" }}
            >
              ×
            </button>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
            {/* Quick Sizing Grid */}
            <div>
              <span style={{ fontSize: "11px", fontWeight: 700, color: "var(--color-on-surface-variant)", textTransform: "uppercase" }}>
                CALIBRATED TAILOR MEASUREMENTS
              </span>
              
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginTop: "12px" }}>
                {[
                  { label: "Chest", val: activeCustomer.sizing.chest },
                  { label: "Waist", val: activeCustomer.sizing.waist },
                  { label: "Shoulder", val: activeCustomer.sizing.shoulder },
                  { label: "Height", val: activeCustomer.sizing.height },
                ].map((item) => (
                  <div key={item.label} style={{ border: "1px solid var(--color-outline-variant)", padding: "12px" }}>
                    <span style={{ fontSize: "10px", color: "var(--color-on-surface-variant)", textTransform: "uppercase", display: "block" }}>
                      {item.label}
                    </span>
                    <span style={{ fontSize: "16px", fontWeight: 700, color: "var(--color-charcoal)", marginTop: "4px", display: "block" }}>
                      {item.val}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ border: "1px solid var(--color-outline-variant)", padding: "16px", backgroundColor: "var(--color-cream)" }}>
              <span style={{ fontSize: "10px", color: "var(--color-ruby)", fontWeight: 700, display: "block", textTransform: "uppercase", marginBottom: "4px" }}>
                CALIBRATED CUT
              </span>
              <span style={{ fontSize: "18px", fontWeight: 700, color: "var(--color-charcoal)" }}>
                {activeCustomer.sizing.fit}
              </span>
            </div>

            <div>
              <span style={{ fontSize: "11px", fontWeight: 700, color: "var(--color-on-surface-variant)", textTransform: "uppercase" }}>
                STUDIO CONTACT
              </span>
              <div style={{ marginTop: "6px", fontSize: "14px" }}>
                <div>Email: <strong>{activeCustomer.email}</strong></div>
                <div>Phone: <strong>{activeCustomer.phone}</strong></div>
                <div style={{ marginTop: "8px", color: "var(--color-on-surface-variant)", lineHeight: 1.4 }}>
                  Address: {activeCustomer.address}
                </div>
              </div>
            </div>

            <div style={{ display: "flex", gap: "10px", borderTop: "1px solid var(--color-outline-variant)", paddingTop: "20px" }}>
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => alert(`Opening measurements adapter draft for ${activeCustomer.name}...`)}
                style={{ flex: 1 }}
              >
                Modify Pattern
              </button>
              <a
                href={`mailto:${activeCustomer.email}?subject=DEEVUH Studio - Sizing Consultation`}
                className="btn btn-primary btn-sm"
                style={{ flex: 1, backgroundColor: "var(--color-charcoal)", color: "var(--color-cream)", textDecoration: "none", textAlign: "center", display: "flex", alignItems: "center", justifyContent: "center" }}
              >
                Email Member
              </a>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
