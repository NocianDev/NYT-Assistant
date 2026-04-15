import { useMemo, useState } from "react";
import { ASSISTANTS } from "../data/assistants";
import VoiceWidgetPanel from "../components/VoiceWidgetPanel";

export default function AssistantsHub() {
  const [selectedId, setSelectedId] = useState("isis");

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
        padding: "24px",
      }}
    >
      <div
        style={{
          maxWidth: "1400px",
          margin: "0 auto",
          display: "grid",
          gridTemplateColumns: "320px 1fr",
          gap: "24px",
        }}
      >
        <aside
          style={{
            background: "rgba(255,255,255,0.06)",
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: "28px",
            padding: "20px",
            backdropFilter: "blur(16px)",
            height: "fit-content",
            position: "sticky",
            top: "24px",
          }}
        >
          <div style={{ marginBottom: "18px" }}>
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
                fontSize: "28px",
                lineHeight: 1.1,
                fontWeight: 900,
              }}
            >
              Panel de voces
            </h1>
          </div>

          <div style={{ display: "grid", gap: "12px" }}>
            {ASSISTANTS.map((assistant) => {
              const active = assistant.id === selectedId;

              return (
                <button
                  key={assistant.id}
                  onClick={() => setSelectedId(assistant.id)}
                  style={{
                    textAlign: "left",
                    border: active
                      ? `1px solid ${assistant.color}`
                      : "1px solid rgba(255,255,255,0.08)",
                    background: active
                      ? "rgba(255,255,255,0.12)"
                      : "rgba(255,255,255,0.05)",
                    borderRadius: "20px",
                    padding: "14px",
                    cursor: "pointer",
                    color: "#fff",
                    transition: "0.2s ease",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "12px",
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
                    <div>
                      <div style={{ fontWeight: 900, fontSize: "16px" }}>
                        {assistant.name}
                      </div>
                      <div
                        style={{
                          fontSize: "13px",
                          color: "rgba(255,255,255,0.72)",
                          marginTop: "2px",
                        }}
                      >
                        {assistant.myth} · {assistant.role}
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </aside>

        <section>
          <div
            style={{
              background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: "32px",
              padding: "24px",
              backdropFilter: "blur(18px)",
            }}
          >
            <div style={{ marginBottom: "18px" }}>
              <div
                style={{
                  fontSize: "13px",
                  color: selectedAssistant.color,
                  fontWeight: 800,
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                }}
              >
                {selectedAssistant.myth}
              </div>

              <h2
                style={{
                  margin: "8px 0 6px",
                  fontSize: "38px",
                  lineHeight: 1.05,
                  fontWeight: 900,
                }}
              >
                {selectedAssistant.name}
              </h2>

              <p
                style={{
                  margin: 0,
                  color: "rgba(255,255,255,0.72)",
                  fontSize: "16px",
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
      </div>
    </main>
  );
}