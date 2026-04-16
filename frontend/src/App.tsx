import { BrowserRouter, Routes, Route } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import AssistantWidget from "./components/AssistantWidget";
import LeadsPanel from "./components/LeadsPanel";
import VoiceWidget from "./components/VoiceWidget";
import AssistantsHub from "./pages/AssistantsHub";
import VoiceWidgetPanel from "./components/VoiceWidgetPanel";
import { ASSISTANTS } from "./data/assistants";

const API_URL =
  import.meta.env.VITE_API_URL?.replace(/\/+$/, "") || "http://localhost:3000";

function HomePage() {
  const [isMobile, setIsMobile] = useState(
    typeof window !== "undefined" ? window.innerWidth < 960 : false
  );
  const [selectedDemoId, setSelectedDemoId] = useState("isis");

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 960);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const selectedDemoAssistant = useMemo(
    () => ASSISTANTS.find((a) => a.id === selectedDemoId) || ASSISTANTS[0],
    [selectedDemoId]
  );

  const sectionWrap: React.CSSProperties = {
    maxWidth: "1200px",
    margin: "0 auto",
    padding: isMobile ? "0 16px" : "0 24px",
  };

  const panelStyle: React.CSSProperties = {
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: isMobile ? "22px" : "28px",
    backdropFilter: "blur(14px)",
    WebkitBackdropFilter: "blur(14px)",
    boxShadow: "0 24px 80px rgba(0,0,0,0.38)",
  };

  const mutedText: React.CSSProperties = {
    color: "rgba(255,255,255,0.72)",
    lineHeight: 1.75,
    fontSize: isMobile ? "15px" : "16px",
    margin: 0,
  };

  function TopNav() {
    return (
      <div
        style={{
          ...sectionWrap,
          paddingTop: isMobile ? "18px" : "24px",
          paddingBottom: isMobile ? "18px" : "24px",
          display: "flex",
          flexDirection: isMobile ? "column" : "row",
          alignItems: isMobile ? "flex-start" : "center",
          justifyContent: "space-between",
          gap: "16px",
          position: "relative",
          zIndex: 3,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div
            style={{
              width: "42px",
              height: "42px",
              borderRadius: "14px",
              background: "linear-gradient(135deg, #ff2a2a, #7a0000)",
              display: "grid",
              placeItems: "center",
              color: "#fff",
              fontWeight: 900,
              fontSize: "16px",
              boxShadow: "0 10px 30px rgba(255, 42, 42, 0.35)",
            }}
          >
            NYT
          </div>
          <div>
            <div
              style={{
                color: "#fff",
                fontWeight: 900,
                fontSize: "18px",
                letterSpacing: "-0.03em",
              }}
            >
              NYT Assistant
            </div>
            <div style={{ color: "rgba(255,255,255,0.52)", fontSize: "12px" }}>
              Atención inteligente · ventas · voz
            </div>
          </div>
        </div>

        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "10px",
            width: isMobile ? "100%" : "auto",
          }}
        >
          {[
            ["#benefits", "Beneficios"],
            ["#demo", "Demo"],
            ["#flow", "Cómo funciona"],
          ].map(([href, label]) => (
            <a
              key={href}
              href={href}
              style={{
                textDecoration: "none",
                color: "rgba(255,255,255,0.78)",
                padding: "10px 14px",
                borderRadius: "999px",
                border: "1px solid rgba(255,255,255,0.08)",
                background: "rgba(255,255,255,0.03)",
                fontWeight: 700,
                fontSize: "14px",
              }}
            >
              {label}
            </a>
          ))}
        </div>
      </div>
    );
  }

  function RedLabel({ children }: { children: React.ReactNode }) {
    return (
      <div
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "10px",
          borderRadius: "999px",
          padding: "8px 14px",
          background: "rgba(255, 42, 42, 0.12)",
          border: "1px solid rgba(255, 42, 42, 0.3)",
          color: "#ffd6d6",
          fontWeight: 800,
          fontSize: "12px",
          textTransform: "uppercase",
          letterSpacing: "0.08em",
        }}
      >
        {children}
      </div>
    );
  }

  function BenefitCard({
    title,
    text,
  }: {
    title: string;
    text: string;
  }) {
    return (
      <div
        style={{
          ...panelStyle,
          padding: isMobile ? "18px" : "22px",
        }}
      >
        <h3
          style={{
            margin: "0 0 10px",
            color: "#fff",
            fontSize: isMobile ? "20px" : "22px",
            fontWeight: 900,
            letterSpacing: "-0.03em",
          }}
        >
          {title}
        </h3>
        <p style={mutedText}>{text}</p>
      </div>
    );
  }

  function StepCard({
    step,
    title,
    text,
  }: {
    step: string;
    title: string;
    text: string;
  }) {
    return (
      <div
        style={{
          ...panelStyle,
          padding: isMobile ? "18px" : "22px",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            width: "42px",
            height: "42px",
            borderRadius: "14px",
            background: "linear-gradient(135deg, #ff2a2a, #740000)",
            display: "grid",
            placeItems: "center",
            color: "#fff",
            fontWeight: 900,
            marginBottom: "14px",
            boxShadow: "0 14px 32px rgba(255, 42, 42, 0.3)",
          }}
        >
          {step}
        </div>

        <h3
          style={{
            margin: "0 0 10px",
            color: "#fff",
            fontSize: isMobile ? "19px" : "20px",
            fontWeight: 900,
          }}
        >
          {title}
        </h3>
        <p style={mutedText}>{text}</p>
      </div>
    );
  }

  function DemoSelector() {
    return (
      <div
        style={{
          display: "grid",
          gap: "12px",
          marginBottom: "18px",
        }}
      >
        <div
          style={{
            color: "rgba(255,255,255,0.68)",
            fontSize: "14px",
            fontWeight: 700,
          }}
        >
          Elige un asistente para probar:
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: isMobile ? "1fr" : "repeat(3, 1fr)",
            gap: "12px",
          }}
        >
          {ASSISTANTS.map((assistant) => {
            const active = assistant.id === selectedDemoId;

            return (
              <button
                key={assistant.id}
                onClick={() => setSelectedDemoId(assistant.id)}
                style={{
                  textAlign: "left",
                  border: active
                    ? `1px solid ${assistant.color}`
                    : "1px solid rgba(255,255,255,0.08)",
                  background: active
                    ? "rgba(255,255,255,0.12)"
                    : "rgba(255,255,255,0.05)",
                  borderRadius: "18px",
                  padding: "14px",
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
                    gap: "10px",
                  }}
                >
                  <div
                    style={{
                      width: "12px",
                      height: "12px",
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
                        fontSize: "15px",
                        wordBreak: "break-word",
                      }}
                    >
                      {assistant.name}
                    </div>
                    <div
                      style={{
                        fontSize: "12px",
                        color: "rgba(255,255,255,0.7)",
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
      </div>
    );
  }

  function EmbeddedDemo() {
    return (
      <div
        style={{
          ...panelStyle,
          padding: isMobile ? "18px" : "24px",
          background:
            "radial-gradient(circle at top right, rgba(255,42,42,0.18), transparent 28%), rgba(255,255,255,0.04)",
        }}
      >
        <div
          style={{
            marginBottom: "16px",
            display: "flex",
            flexDirection: isMobile ? "column" : "row",
            alignItems: isMobile ? "flex-start" : "center",
            justifyContent: "space-between",
            gap: "12px",
          }}
        >
          <div>
            <div
              style={{
                color: "#fff",
                fontWeight: 900,
                fontSize: isMobile ? "24px" : "30px",
                letterSpacing: "-0.03em",
              }}
            >
              Pruébalo aquí mismo
            </div>
            <div style={{ color: "rgba(255,255,255,0.62)", fontSize: "14px" }}>
              Sin cambiar de página. Sin pasos extra.
            </div>
          </div>

          <a
            href="/assistants"
            style={{
              textDecoration: "none",
              background: "rgba(255,255,255,0.05)",
              border: "1px solid rgba(255,255,255,0.08)",
              color: "#fff",
              padding: "12px 16px",
              borderRadius: "14px",
              fontWeight: 800,
              textAlign: "center",
              width: isMobile ? "100%" : "auto",
            }}
          >
            Ver demo completa
          </a>
        </div>

        <DemoSelector />

        <div
          style={{
            marginBottom: "16px",
            padding: "14px 16px",
            borderRadius: "18px",
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.08)",
          }}
        >
          <div
            style={{
              color: selectedDemoAssistant.color,
              fontWeight: 800,
              fontSize: "12px",
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              marginBottom: "6px",
            }}
          >
            Demo activa
          </div>
          <div
            style={{
              color: "#fff",
              fontWeight: 900,
              fontSize: isMobile ? "22px" : "28px",
              lineHeight: 1.05,
              marginBottom: "6px",
            }}
          >
            {selectedDemoAssistant.name}
          </div>
          <div
            style={{
              color: "rgba(255,255,255,0.68)",
              fontSize: "14px",
              lineHeight: 1.6,
            }}
          >
            {selectedDemoAssistant.role}
          </div>
        </div>

        <VoiceWidgetPanel
          assistantName={selectedDemoAssistant.name}
          assistantId={selectedDemoAssistant.id}
          assistantColor={selectedDemoAssistant.color}
        />
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background:
          "radial-gradient(circle at top left, rgba(255,42,42,0.16), transparent 22%), radial-gradient(circle at top right, rgba(120,0,0,0.22), transparent 26%), linear-gradient(180deg, #050505 0%, #0a0a0a 35%, #111111 100%)",
        color: "#fff",
        fontFamily:
          'Inter, Arial, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      }}
    >
      <TopNav />

      <section style={{ ...sectionWrap, paddingTop: isMobile ? "10px" : "26px" }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: isMobile ? "1fr" : "1.02fr 0.98fr",
            gap: "24px",
            alignItems: "center",
            minHeight: isMobile ? "auto" : "64vh",
          }}
        >
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              gap: "20px",
            }}
          >
            <RedLabel>Atención inteligente para negocios</RedLabel>

            <h1
              style={{
                margin: 0,
                fontSize: "clamp(42px, 7vw, 88px)",
                lineHeight: 0.95,
                letterSpacing: "-0.06em",
                fontWeight: 900,
                maxWidth: "800px",
              }}
            >
              Atiende mejor, responde más rápido y convierte más clientes.
            </h1>

            <p
              style={{
                ...mutedText,
                fontSize: "clamp(16px, 2vw, 21px)",
                maxWidth: "760px",
              }}
            >
              NYT Assistant responde conversaciones en segundos, detecta
              intención de compra, guía al usuario y deja cada oportunidad lista
              para seguimiento.
            </p>

            <div
              style={{
                display: "flex",
                gap: "14px",
                flexWrap: "wrap",
                flexDirection: isMobile ? "column" : "row",
              }}
            >
              <a
                href="#demo"
                style={{
                  textDecoration: "none",
                  background: "linear-gradient(135deg, #ff2a2a, #7a0000)",
                  color: "#fff",
                  padding: "15px 20px",
                  borderRadius: "16px",
                  fontWeight: 900,
                  boxShadow: "0 18px 50px rgba(255, 42, 42, 0.28)",
                  textAlign: "center",
                }}
              >
                Probar ahora
              </a>

              <a
                href="#benefits"
                style={{
                  textDecoration: "none",
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  color: "#fff",
                  padding: "15px 20px",
                  borderRadius: "16px",
                  fontWeight: 800,
                  textAlign: "center",
                }}
              >
                Ver beneficios
              </a>
            </div>
          </div>

          <div
            style={{
              ...panelStyle,
              padding: isMobile ? "18px" : "24px",
              background:
                "radial-gradient(circle at top right, rgba(255,42,42,0.18), transparent 28%), rgba(255,255,255,0.04)",
            }}
          >
            <div
              style={{
                display: "grid",
                gap: "12px",
              }}
            >
              <div
                style={{
                  maxWidth: "82%",
                  background: "rgba(255,255,255,0.06)",
                  border: "1px solid rgba(255,255,255,0.06)",
                  color: "rgba(255,255,255,0.82)",
                  padding: "12px 14px",
                  borderRadius: "16px 16px 16px 4px",
                  lineHeight: 1.6,
                  fontSize: "14px",
                }}
              >
                Hola, quiero que mi negocio responda clientes sin perder ventas.
              </div>

              <div
                style={{
                  marginLeft: "auto",
                  maxWidth: "86%",
                  background: "linear-gradient(135deg, #ff2a2a, #7a0000)",
                  color: "#fff",
                  padding: "12px 14px",
                  borderRadius: "16px 16px 4px 16px",
                  lineHeight: 1.6,
                  fontSize: "14px",
                  fontWeight: 700,
                  boxShadow: "0 18px 40px rgba(255, 42, 42, 0.22)",
                }}
              >
                Perfecto. NYT Assistant responde consultas, detecta intención de
                compra y deja cada oportunidad lista para seguimiento.
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: isMobile ? "1fr" : "repeat(3, 1fr)",
                  gap: "12px",
                  marginTop: "8px",
                }}
              >
                {[
                  ["Disponible", "24/7"],
                  ["Enfoque", "Ventas + atención"],
                  ["Resultado", "Más leads útiles"],
                ].map(([label, value]) => (
                  <div
                    key={label}
                    style={{
                      background: "rgba(0,0,0,0.34)",
                      border: "1px solid rgba(255,255,255,0.08)",
                      borderRadius: "18px",
                      padding: "14px",
                    }}
                  >
                    <div
                      style={{
                        color: "rgba(255,255,255,0.5)",
                        fontSize: "11px",
                        textTransform: "uppercase",
                        letterSpacing: "0.08em",
                        marginBottom: "8px",
                        fontWeight: 800,
                      }}
                    >
                      {label}
                    </div>
                    <div
                      style={{
                        color: "#fff",
                        fontWeight: 900,
                        fontSize: "18px",
                      }}
                    >
                      {value}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="benefits" style={{ ...sectionWrap, paddingTop: "70px" }}>
        <div style={{ marginBottom: "20px" }}>
          <RedLabel>Beneficios</RedLabel>
          <h2
            style={{
              fontSize: "clamp(30px, 4vw, 54px)",
              lineHeight: 0.98,
              letterSpacing: "-0.05em",
              margin: "16px 0 10px",
              fontWeight: 900,
              maxWidth: "760px",
            }}
          >
            Qué hace por tu negocio, explicado sin rodeos
          </h2>
          <p style={{ ...mutedText, maxWidth: "760px" }}>
            Lo importante es que el cliente lo entienda rápido y vea el valor
            antes de saturarse con demasiada información.
          </p>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: isMobile ? "1fr" : "repeat(3, 1fr)",
            gap: "18px",
          }}
        >
          <BenefitCard
            title="Responde al instante"
            text="Atiende consultas en tiempo real para que tu negocio no dependa de horarios ni de respuestas tardías."
          />
          <BenefitCard
            title="Detecta oportunidades"
            text="Identifica intención de compra y guía la conversación hacia cotización, contacto o seguimiento."
          />
          <BenefitCard
            title="Escala la atención"
            text="Puede operar por chat y evolucionar a voz para una experiencia más cercana y más fuerte para tu marca."
          />
        </div>
      </section>

      <section
        id="demo"
        style={{ ...sectionWrap, paddingTop: "84px", paddingBottom: "8px" }}
      >
        <div style={{ marginBottom: "20px" }}>
          <RedLabel>Demo principal</RedLabel>
          <h2
            style={{
              fontSize: "clamp(30px, 4vw, 54px)",
              lineHeight: 0.98,
              letterSpacing: "-0.05em",
              margin: "16px 0 10px",
              fontWeight: 900,
              maxWidth: "760px",
            }}
          >
            Aquí mismo debe aparecer la IA
          </h2>
          <p style={{ ...mutedText, maxWidth: "760px" }}>
            Así el cliente la ve desde la página principal, entiende que es real
            y puede probarla sin tener que descubrir otra ruta primero.
          </p>
        </div>

        <EmbeddedDemo />
      </section>

      <section id="flow" style={{ ...sectionWrap, paddingTop: "84px" }}>
        <div style={{ marginBottom: "20px" }}>
          <RedLabel>Cómo funciona</RedLabel>
          <h2
            style={{
              fontSize: "clamp(30px, 4vw, 54px)",
              lineHeight: 0.98,
              letterSpacing: "-0.05em",
              margin: "16px 0 10px",
              fontWeight: 900,
              maxWidth: "760px",
            }}
          >
            Un flujo simple que el cliente entiende rápido
          </h2>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: isMobile ? "1fr" : "repeat(4, 1fr)",
            gap: "18px",
          }}
        >
          <StepCard
            step="1"
            title="El usuario pregunta"
            text="Hace una consulta, pide información o inicia conversación desde cualquier dispositivo."
          />
          <StepCard
            step="2"
            title="El sistema detecta intención"
            text="Reconoce si la conversación es atención, ventas, soporte o seguimiento."
          />
          <StepCard
            step="3"
            title="Responde y guía"
            text="Da una respuesta útil y lleva la conversación al siguiente paso correcto."
          />
          <StepCard
            step="4"
            title="Guarda la oportunidad"
            text="Cuando hay interés real, la información queda lista para seguimiento."
          />
        </div>
      </section>

      <section
        style={{ ...sectionWrap, paddingTop: "84px", paddingBottom: "100px" }}
      >
        <div
          style={{
            ...panelStyle,
            padding: isMobile ? "22px" : "30px",
            background:
              "radial-gradient(circle at top right, rgba(255,42,42,0.18), transparent 22%), rgba(255,255,255,0.04)",
            textAlign: isMobile ? "left" : "center",
          }}
        >
          <RedLabel>CTA</RedLabel>
          <h2
            style={{
              fontSize: "clamp(30px, 4vw, 52px)",
              lineHeight: 0.98,
              letterSpacing: "-0.05em",
              margin: "16px 0 12px",
              fontWeight: 900,
            }}
          >
            Enséñalo simple. Haz que lo prueben. Y deja que la demo haga el resto.
          </h2>

          <p
            style={{
              ...mutedText,
              maxWidth: "760px",
              margin: isMobile ? 0 : "0 auto",
            }}
          >
            Esa es la mejor forma de interesar al cliente sin que se pierda ni
            se sature.
          </p>

          <div
            style={{
              marginTop: "22px",
              display: "flex",
              justifyContent: isMobile ? "stretch" : "center",
              gap: "12px",
              flexDirection: isMobile ? "column" : "row",
            }}
          >
            <a
              href="#demo"
              style={{
                textDecoration: "none",
                background: "linear-gradient(135deg, #ff2a2a, #7a0000)",
                color: "#fff",
                padding: "16px 22px",
                borderRadius: "16px",
                fontWeight: 900,
                boxShadow: "0 18px 50px rgba(255, 42, 42, 0.28)",
                minWidth: isMobile ? "100%" : "auto",
                textAlign: "center",
              }}
            >
              Probar la demo aquí
            </a>

            <a
              href="/assistants"
              style={{
                textDecoration: "none",
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.08)",
                color: "#fff",
                padding: "16px 22px",
                borderRadius: "16px",
                fontWeight: 800,
                minWidth: isMobile ? "100%" : "auto",
                textAlign: "center",
              }}
            >
              Abrir versión completa
            </a>
          </div>
        </div>
      </section>

      <AssistantWidget
        title="NYT Assistant"
        welcomeMessage="Hola 👋 Soy NYT Assistant. ¿En qué puedo ayudarte hoy?"
        primaryColor="#dc2626"
        apiUrl={`${API_URL}/chat`}
      />

      <VoiceWidget />
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/admin" element={<LeadsPanel />} />
        <Route path="/assistants" element={<AssistantsHub />} />
      </Routes>
    </BrowserRouter>
  );
}