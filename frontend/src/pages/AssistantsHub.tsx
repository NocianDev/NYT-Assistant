import { useEffect, useMemo, useState } from "react";
import { ASSISTANTS } from "../data/assistants";
import VoiceWidgetPanel from "../components/VoiceWidgetPanel";

export default function AssistantsHub() {
  const [selectedId, setSelectedId] = useState("isis");
  const [isMobile, setIsMobile] = useState(
    typeof window !== "undefined" ? window.innerWidth < 900 : false
  );

  useEffect(() => {
    function handleResize() {
      setIsMobile(window.innerWidth < 900);
    }

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const selectedAssistant = useMemo(
    () => ASSISTANTS.find((a) => a.id === selectedId) || ASSISTANTS[0],
    [selectedId]
  );

  return (
    <main
      style={{
        minHeight: "100vh",
        background:
          "radial-gradient(circle at top, #18204a 0%, #0a0f2c 45%, #050816 100%)",
        color: "#fff",
        padding: isMobile ? "14px" : "24px",
        overflowX: "hidden",
      }}
    >
      <div
        style={{
          maxWidth: "1400px",
          margin: "0 auto",
          display: "grid",
          gridTemplateColumns: isMobile ? "1fr" : "320px 1fr",
          gap: isMobile ? "14px" : "24px",
          alignItems: "start",
        }}
      >
        <section
          style={{
            order: isMobile ? 1 : 2,
            minWidth: 0,
          }}
        >
          <div
            style={{
              background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: isMobile ? "24px" : "32px",
              padding: isMobile ? "16px" : "24px",
              backdropFilter: "blur(18px)",
              minWidth: 0,
              overflow: "hidden",
            }}
          >
            <div style={{ marginBottom: isMobile ? "14px" : "18px" }}>
              <div
                style={{
                  fontSize: isMobile ? "12px" : "13px",
                  color: selectedAssistant.color,
                  fontWeight: 800,
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                }}
              >
                
              </div>

              <h2
                style={{
                  margin: "8px 0 6px",
                  fontSize: isMobile ? "28px" : "38px",
                  lineHeight: 1.05,
                  fontWeight: 900,
                  wordBreak: "break-word",
                }}
              >
                {selectedAssistant.name}
              </h2>

              <p
                style={{
                  margin: 0,
                  color: "rgba(255,255,255,0.72)",
                  fontSize: isMobile ? "14px" : "16px",
                  lineHeight: 1.6,
                }}
              >
                {selectedAssistant.role}
              </p>
            </div>

            <VoiceWidgetPanel
              assistantName={selectedAssistant.name}
              assistantId={selectedAssistant.id}
              assistantColor={selectedAssistant.color}
            />
          </div>
        </section>

        <aside
          style={{
            order: isMobile ? 2 : 1,
            background: "rgba(255,255,255,0.06)",
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: isMobile ? "24px" : "28px",
            padding: isMobile ? "16px" : "20px",
            backdropFilter: "blur(16px)",
            height: "fit-content",
            position: isMobile ? "relative" : "sticky",
            top: isMobile ? "auto" : "24px",
            minWidth: 0,
            overflow: "hidden",
          }}
        >
          <div style={{ marginBottom: isMobile ? "14px" : "18px" }}>
            <div
              style={{
                fontSize: "12px",
                fontWeight: 800,
                color: "#facc15",
                letterSpacing: "0.12em",
                textTransform: "uppercase",
              }}
            >
              Asistentes
            </div>
            <h1
              style={{
                margin: "10px 0 0",
                fontSize: isMobile ? "24px" : "28px",
                lineHeight: 1.1,
                fontWeight: 900,
              }}
            >
              Panel de voces
            </h1>
          </div>

          <div
            style={{
              display: "grid",
              gap: "12px",
            }}
          >
            {ASSISTANTS.map((assistant) => {
              const active = assistant.id === selectedId;

              return (
                <button
                  key={assistant.id}
                  onClick={() => setSelectedId(assistant.id)}
                  style={{
                    width: "100%",
                    textAlign: "left",
                    border: active
                      ? `1px solid ${assistant.color}`
                      : "1px solid rgba(255,255,255,0.08)",
                    background: active
                      ? "rgba(255,255,255,0.12)"
                      : "rgba(255,255,255,0.05)",
                    borderRadius: "20px",
                    padding: isMobile ? "12px" : "14px",
                    cursor: "pointer",
                    color: "#fff",
                    transition: "0.2s ease",
                    minWidth: 0,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "12px",
                      minWidth: 0,
                    }}
                  >
                    <div
                      style={{
                        width: "14px",
                        height: "14px",
                        borderRadius: "999px",
                        background: assistant.color,
                        boxShadow: `0 0 18px ${assistant.color}`,
                        flexShrink: 0,
                      }}
                    />
                    <div style={{ minWidth: 0 }}>
                      <div
                        style={{
                          fontWeight: 900,
                          fontSize: isMobile ? "15px" : "16px",
                          wordBreak: "break-word",
                        }}
                      >
                        {assistant.name}
                      </div>
                      <div
                        style={{
                          fontSize: isMobile ? "12px" : "13px",
                          color: "rgba(255,255,255,0.72)",
                          marginTop: "2px",
                          lineHeight: 1.45,
                          wordBreak: "break-word",
                        }}
                      >
                        {assistant.role}
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </aside>
      </div>
    </main>
  );
}