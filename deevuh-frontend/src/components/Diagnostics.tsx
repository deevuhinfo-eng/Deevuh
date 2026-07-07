"use client";

import React, { useEffect, useState, useRef } from "react";

interface FetchLog {
  id: string;
  url: string;
  method: string;
  credentials?: string;
  mode?: string;
  cache?: string;
  timestamp: string;
  requestHeaders?: Record<string, string>;
  status?: number;
  responseHeaders?: Record<string, string>;
  responseBody?: any;
  error?: any;
}

interface JSException {
  message: string;
  url?: string;
  line?: number;
  col?: number;
  stack?: string;
  timestamp: string;
}

export default function Diagnostics() {
  const [isOpen, setIsOpen] = useState(false);
  const [fetchLogs, setFetchLogs] = useState<FetchLog[]>([]);
  const [exceptions, setExceptions] = useState<JSException[]>([]);
  const [systemInfo, setSystemInfo] = useState<any>(null);
  const [isSending, setIsSending] = useState(false);
  const [sendStatus, setSendStatus] = useState<string | null>(null);

  const fetchLogsRef = useRef<FetchLog[]>([]);
  const exceptionsRef = useRef<JSException[]>([]);

  // Update refs to read latest values inside closures (like fetch overrides)
  useEffect(() => {
    fetchLogsRef.current = fetchLogs;
  }, [fetchLogs]);

  useEffect(() => {
    exceptionsRef.current = exceptions;
  }, [exceptions]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // 1. Gather Initial Browser Storage/API Audits
    const auditSystem = async () => {
      const info: any = {
        userAgent: navigator.userAgent,
        cookieEnabled: navigator.cookieEnabled,
        localStorageKeys: Object.keys(localStorage),
        sessionStorageKeys: Object.keys(sessionStorage),
        indexedDBSupported: typeof indexedDB !== "undefined",
        serviceWorkerSupported: "serviceWorker" in navigator,
        cacheStorageSupported: typeof caches !== "undefined",
      };

      // Query Cache API names
      if (info.cacheStorageSupported) {
        try {
          info.cachesList = await caches.keys();
        } catch (e: any) {
          info.cachesError = e.message;
        }
      }

      // Check cookies
      info.cookiesRaw = document.cookie;

      setSystemInfo(info);
    };

    auditSystem();

    // 2. Add Global Listeners for Uncaught Errors & Rejections
    const handleError = (
      message: string | Event,
      source?: string,
      lineno?: number,
      colno?: number,
      error?: Error
    ) => {
      const exc: JSException = {
        message: typeof message === "string" ? message : (message as any).message || "Unknown error",
        url: source,
        line: lineno,
        col: colno,
        stack: error?.stack,
        timestamp: new Date().toISOString(),
      };
      setExceptions((prev) => [exc, ...prev]);
      
      // Auto-open panel on fatal exception to notify test user
      setIsOpen(true);
    };

    const handleRejection = (event: PromiseRejectionEvent) => {
      const reason = event.reason;
      const exc: JSException = {
        message: reason?.message || String(reason) || "Unhandled Promise Rejection",
        stack: reason?.stack,
        timestamp: new Date().toISOString(),
      };
      setExceptions((prev) => [exc, ...prev]);
      setIsOpen(true);
    };

    window.onerror = handleError;
    window.addEventListener("unhandledrejection", handleRejection);

    // 3. Override window.fetch to Log All Outgoing/Incoming HTTP Calls
    const originalFetch = window.fetch;

    window.fetch = async function (input: RequestInfo | URL, init?: RequestInit) {
      const id = Math.random().toString(36).substring(7);
      const url = typeof input === "string" ? input : (input as any).url || String(input);
      const method = init?.method || "GET";
      const timestamp = new Date().toISOString();

      // Collect headers
      const requestHeaders: Record<string, string> = {};
      if (init?.headers) {
        if (init.headers instanceof Headers) {
          init.headers.forEach((val, key) => {
            requestHeaders[key] = val;
          });
        } else if (Array.isArray(init.headers)) {
          init.headers.forEach(([key, val]) => {
            requestHeaders[key] = val;
          });
        } else {
          Object.assign(requestHeaders, init.headers);
        }
      }

      const log: FetchLog = {
        id,
        url,
        method,
        credentials: init?.credentials ? String(init.credentials) : undefined,
        mode: init?.mode ? String(init.mode) : undefined,
        cache: init?.cache ? String(init.cache) : undefined,
        timestamp,
        requestHeaders,
      };

      // Add to logs before execution
      setFetchLogs((prev) => [log, ...prev]);

      try {
        const response = await originalFetch.apply(this, [input, init]);
        const clonedResponse = response.clone();

        // Collect response headers
        const responseHeaders: Record<string, string> = {};
        clonedResponse.headers.forEach((val, key) => {
          responseHeaders[key] = val;
        });

        // Try to parse body
        let responseBody: any = null;
        try {
          responseBody = await clonedResponse.json();
        } catch {
          try {
            responseBody = await clonedResponse.text();
          } catch {
            responseBody = "[Unreadable body]";
          }
        }

        // Update log with success metrics
        setFetchLogs((prev) =>
          prev.map((l) =>
            l.id === id
              ? {
                  ...l,
                  status: response.status,
                  responseHeaders,
                  responseBody,
                }
              : l
          )
        );

        return response;
      } catch (err: any) {
        // Update log with failure metrics
        const errObj = {
          message: err?.message || String(err),
          stack: err?.stack,
        };

        setFetchLogs((prev) =>
          prev.map((l) =>
            l.id === id
              ? {
                  ...l,
                  error: errObj,
                }
              : l
          )
        );

        throw err;
      }
    };

    // 4. Double tap listener to toggle overlay easily
    let lastTap = 0;
    const handleDoubleTap = () => {
      const now = new Date().getTime();
      const timespan = now - lastTap;
      if (timespan < 300 && timespan > 0) {
        setIsOpen((prev) => !prev);
      }
      lastTap = now;
    };

    window.addEventListener("click", handleDoubleTap);

    return () => {
      window.fetch = originalFetch;
      window.removeEventListener("click", handleDoubleTap);
      window.removeEventListener("unhandledrejection", handleRejection);
      if (window.onerror === handleError) {
        window.onerror = null;
      }
    };
  }, []);

  // Send collected data to backend debug/logs endpoint
  const sendLogsToServer = async () => {
    setIsSending(true);
    setSendStatus("Sending...");
    try {
      const res = await window.fetch("/api/debug/logs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          logs: fetchLogs,
          systemInfo,
          errors: exceptions,
        }),
      });

      if (res.ok) {
        setSendStatus("Sent successfully!");
      } else {
        setSendStatus(`Failed: ${res.status}`);
      }
    } catch (err: any) {
      setSendStatus(`Error: ${err.message}`);
    } finally {
      setIsSending(false);
    }
  };

  const copyLogsToClipboard = () => {
    const payload = JSON.stringify({
      logs: fetchLogs,
      systemInfo,
      errors: exceptions,
    }, null, 2);

    navigator.clipboard.writeText(payload)
      .then(() => alert("Diagnostics copied to clipboard!"))
      .catch((e) => alert(`Failed to copy: ${e.message}`));
  };

  const triggerTestFetch = async () => {
    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || "/api";
      await window.fetch(`${baseUrl}/products`);
    } catch (e) {
      // Caught inside fetch interceptor anyway
    }
  };

  const clearDiagnosticLogs = () => {
    setFetchLogs([]);
    setExceptions([]);
    setSendStatus(null);
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        style={{
          position: "fixed",
          bottom: "20px",
          right: "20px",
          zIndex: 99999,
          width: "44px",
          height: "44px",
          borderRadius: "50%",
          backgroundColor: "#98111E",
          color: "#FCF9F8",
          border: "none",
          boxShadow: "0 4px 16px rgba(152, 17, 30, 0.4)",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: "20px",
          transition: "transform 0.2s",
        }}
        onMouseEnter={(e) => (e.currentTarget.style.transform = "scale(1.1)")}
        onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
      >
        ⚙️
      </button>
    );
  }

  return (
    <div
      style={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        height: "60vh",
        backgroundColor: "rgba(44, 44, 44, 0.95)",
        backdropFilter: "blur(12px)",
        borderTop: "2px solid #98111E",
        color: "#FCF9F8",
        zIndex: 99999,
        display: "flex",
        flexDirection: "column",
        fontFamily: "monospace",
        fontSize: "12px",
        boxShadow: "0 -8px 32px rgba(0, 0, 0, 0.3)",
      }}
    >
      {/* Header bar */}
      <div
        style={{
          padding: "12px 20px",
          borderBottom: "1px solid rgba(253, 240, 213, 0.15)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          backgroundColor: "rgba(152, 17, 30, 0.15)",
        }}
      >
        <span style={{ fontWeight: "bold", fontSize: "13px", color: "#FCF9F8" }}>
          ⚠️ DEEVUH SAFARI & COMPATIBILITY DIAGNOSTICS PANEL (Double-tap page to close)
        </span>
        <div style={{ display: "flex", gap: "10px" }}>
          <button
            onClick={triggerTestFetch}
            style={{
              padding: "4px 10px",
              backgroundColor: "rgba(253, 240, 213, 0.1)",
              border: "1px solid #FDF0D5",
              color: "#FDF0D5",
              cursor: "pointer",
            }}
          >
            Test Fetch /products
          </button>
          <button
            onClick={copyLogsToClipboard}
            style={{
              padding: "4px 10px",
              backgroundColor: "rgba(253, 240, 213, 0.1)",
              border: "1px solid #FDF0D5",
              color: "#FDF0D5",
              cursor: "pointer",
            }}
          >
            Copy Logs
          </button>
          <button
            onClick={sendLogsToServer}
            disabled={isSending}
            style={{
              padding: "4px 10px",
              backgroundColor: "#98111E",
              border: "1px solid #98111E",
              color: "#FCF9F8",
              cursor: "pointer",
              opacity: isSending ? 0.6 : 1,
            }}
          >
            {sendStatus || "Send to Server"}
          </button>
          <button
            onClick={clearDiagnosticLogs}
            style={{
              padding: "4px 10px",
              backgroundColor: "transparent",
              border: "1px solid rgba(253, 240, 213, 0.4)",
              color: "#FCF9F8",
              cursor: "pointer",
            }}
          >
            Clear
          </button>
          <button
            onClick={() => setIsOpen(false)}
            style={{
              padding: "4px 10px",
              backgroundColor: "transparent",
              border: "none",
              color: "#FCF9F8",
              cursor: "pointer",
              fontSize: "14px",
              fontWeight: "bold",
            }}
          >
            ✕
          </button>
        </div>
      </div>

      {/* Main body split container */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
        
        {/* Left Side: System Info & Exceptions */}
        <div
          style={{
            flex: 1,
            borderRight: "1px solid rgba(253, 240, 213, 0.15)",
            padding: "20px",
            overflowY: "auto",
            display: "flex",
            flexDirection: "column",
            gap: "20px",
          }}
        >
          {/* Uncaught exceptions section */}
          <div>
            <h3 style={{ color: "#98111E", margin: "0 0 10px 0", borderBottom: "1px solid #98111E", paddingBottom: "4px" }}>
              🚨 Uncaught JS Exceptions ({exceptions.length})
            </h3>
            {exceptions.length === 0 ? (
              <p style={{ color: "#888", margin: 0 }}>No uncaught javascript exceptions recorded.</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                {exceptions.map((exc, idx) => (
                  <div
                    key={idx}
                    style={{
                      padding: "10px",
                      backgroundColor: "rgba(152, 17, 30, 0.1)",
                      borderLeft: "3px solid #98111E",
                    }}
                  >
                    <div style={{ fontWeight: "bold", color: "#FF7B72" }}>{exc.message}</div>
                    <div style={{ fontSize: "10px", color: "#888", marginTop: "4px" }}>
                      Time: {exc.timestamp} {exc.url ? `| File: ${exc.url}` : ""} {exc.line ? `| Line: ${exc.line}` : ""}
                    </div>
                    {exc.stack && (
                      <pre style={{ margin: "6px 0 0 0", fontSize: "10px", whiteSpace: "pre-wrap", overflowX: "auto", color: "#FF7B72", opacity: 0.8 }}>
                        {exc.stack}
                      </pre>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Browser System Info */}
          <div>
            <h3 style={{ color: "#FDF0D5", margin: "0 0 10px 0", borderBottom: "1px solid rgba(253, 240, 213, 0.2)", paddingBottom: "4px" }}>
              📱 Device Browser State Audit
            </h3>
            {systemInfo ? (
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <tbody>
                  <tr>
                    <td style={{ padding: "4px 0", color: "#888", width: "160px" }}>User Agent:</td>
                    <td style={{ padding: "4px 0", wordBreak: "break-all" }}>{systemInfo.userAgent}</td>
                  </tr>
                  <tr>
                    <td style={{ padding: "4px 0", color: "#888" }}>Cookies Enabled:</td>
                    <td style={{ padding: "4px 0" }}>{String(systemInfo.cookieEnabled)}</td>
                  </tr>
                  <tr>
                    <td style={{ padding: "4px 0", color: "#888" }}>Active Cookies:</td>
                    <td style={{ padding: "4px 0", wordBreak: "break-all" }}>{systemInfo.cookiesRaw || "None"}</td>
                  </tr>
                  <tr>
                    <td style={{ padding: "4px 0", color: "#888" }}>localStorage Keys:</td>
                    <td style={{ padding: "4px 0" }}>{systemInfo.localStorageKeys.join(", ") || "Empty"}</td>
                  </tr>
                  <tr>
                    <td style={{ padding: "4px 0", color: "#888" }}>sessionStorage Keys:</td>
                    <td style={{ padding: "4px 0" }}>{systemInfo.sessionStorageKeys.join(", ") || "Empty"}</td>
                  </tr>
                  <tr>
                    <td style={{ padding: "4px 0", color: "#888" }}>IndexedDB Support:</td>
                    <td style={{ padding: "4px 0" }}>{String(systemInfo.indexedDBSupported)}</td>
                  </tr>
                  <tr>
                    <td style={{ padding: "4px 0", color: "#888" }}>Service Workers:</td>
                    <td style={{ padding: "4px 0" }}>{String(systemInfo.serviceWorkerSupported)}</td>
                  </tr>
                  <tr>
                    <td style={{ padding: "4px 0", color: "#888" }}>Cache Storage:</td>
                    <td style={{ padding: "4px 0" }}>{String(systemInfo.cacheStorageSupported)} {systemInfo.cachesList ? `(${systemInfo.cachesList.join(", ")})` : ""}</td>
                  </tr>
                </tbody>
              </table>
            ) : (
              <p>Auditing system APIs...</p>
            )}
          </div>
        </div>

        {/* Right Side: Network Fetch Logs */}
        <div style={{ flex: 1.2, padding: "20px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "10px" }}>
          <h3 style={{ color: "#FDF0D5", margin: "0 0 10px 0", borderBottom: "1px solid rgba(253, 240, 213, 0.2)", paddingBottom: "4px" }}>
            🌐 Network Fetch History ({fetchLogs.length})
          </h3>
          {fetchLogs.length === 0 ? (
            <p style={{ color: "#888" }}>No fetches recorded. Try navigating or clicking "Test Fetch".</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {fetchLogs.map((log) => (
                <div
                  key={log.id}
                  style={{
                    padding: "10px",
                    backgroundColor: "rgba(255, 255, 255, 0.03)",
                    border: "1px solid rgba(253, 240, 213, 0.1)",
                    borderRadius: "2px",
                  }}
                >
                  {/* Fetch info header */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span
                      style={{
                        padding: "2px 6px",
                        backgroundColor: log.error ? "#98111E" : log.status && log.status >= 400 ? "#D97706" : "#059669",
                        fontWeight: "bold",
                        borderRadius: "2px",
                      }}
                    >
                      {log.method} {log.status || (log.error ? "FAIL" : "PENDING")}
                    </span>
                    <span style={{ fontSize: "10px", color: "#888" }}>{log.timestamp}</span>
                  </div>
                  
                  {/* URL */}
                  <div style={{ fontWeight: "bold", marginTop: "6px", wordBreak: "break-all", color: "#FDF0D5" }}>
                    {log.url}
                  </div>

                  {/* Options */}
                  <div style={{ fontSize: "10px", color: "#888", marginTop: "4px" }}>
                    credentials: {log.credentials || "N/A"} | mode: {log.mode || "N/A"} | cache: {log.cache || "N/A"}
                  </div>

                  {/* Request Headers */}
                  {Object.keys(log.requestHeaders || {}).length > 0 && (
                    <div style={{ marginTop: "6px" }}>
                      <span style={{ color: "#888", fontSize: "10px" }}>Request Headers:</span>
                      <pre style={{ margin: "2px 0 0 0", padding: "4px", backgroundColor: "rgba(0,0,0,0.2)", fontSize: "10px", overflowX: "auto" }}>
                        {JSON.stringify(log.requestHeaders, null, 2)}
                      </pre>
                    </div>
                  )}

                  {/* Response / Exception details */}
                  {log.error ? (
                    <div style={{ marginTop: "6px", color: "#FF7B72" }}>
                      <strong>Fetch Exception:</strong> {log.error.message || log.error}
                      {log.error.stack && (
                        <pre style={{ margin: "4px 0 0 0", fontSize: "10px", whiteSpace: "pre-wrap", color: "#FF7B72", opacity: 0.8 }}>
                          {log.error.stack}
                        </pre>
                      )}
                    </div>
                  ) : log.status ? (
                    <div style={{ marginTop: "6px" }}>
                      <span style={{ color: "#888", fontSize: "10px" }}>Response Body Preview:</span>
                      <pre style={{ margin: "2px 0 0 0", padding: "6px", backgroundColor: "rgba(0,0,0,0.3)", fontSize: "10px", overflowX: "auto", maxHeight: "150px", overflowY: "auto" }}>
                        {typeof log.responseBody === "object"
                          ? JSON.stringify(log.responseBody, null, 2)
                          : String(log.responseBody)}
                      </pre>
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
