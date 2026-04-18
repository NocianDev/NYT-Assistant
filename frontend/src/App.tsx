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
              Automatización conversacional para ventas y atención
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
          Selecciona un asistente y pruébalo en tiempo real:
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
              Demo interactiva
            </div>
            <div style={{ color: "rgba(255,255,255,0.62)", fontSize: "14px" }}>
              Conoce cómo responde, guía y atiende desde la primera interacción.
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
            Ver experiencia completa
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
            Asistente seleccionado
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
            <RedLabel>Solución inteligente para negocios</RedLabel>

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
              Automatiza tu atención y convierte más conversaciones en ventas.
            </h1>

            <p
              style={{
                ...mutedText,
                fontSize: "clamp(16px, 2vw, 21px)",
                maxWidth: "760px",
              }}
            >
              NYT Assistant ayuda a tu negocio a responder más rápido, atender
              mejor y aprovechar cada oportunidad desde el primer mensaje.
              Automatiza consultas, filtra prospectos y mantiene una experiencia
              profesional en cada conversación.
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
                Probar demo
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
                Conocer más
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
                Hola, quiero una solución para atender clientes sin depender de
                horarios ni respuestas manuales.
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
                Perfecto. NYT Assistant automatiza respuestas, identifica
                oportunidades reales y mantiene una atención constante para que
                tu negocio no pierda clientes.
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
                  ["Disponibilidad", "24/7"],
                  ["Aplicación", "Ventas y atención"],
                  ["Impacto", "Más prospectos útiles"],
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
            Lo que realmente aporta a tu negocio
          </h2>
          <p style={{ ...mutedText, maxWidth: "760px" }}>
            Una solución diseñada para responder mejor, atender más rápido y dar
            seguimiento a cada oportunidad sin saturar tu operación diaria.
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
            title="Atención inmediata"
            text="Responde mensajes en segundos para que tus clientes reciban información clara, útil y oportuna desde el primer contacto."
          />
          <BenefitCard
            title="Mejor calificación de prospectos"
            text="Detecta intención de compra, organiza conversaciones y ayuda a identificar qué contactos tienen mayor probabilidad de convertirse en venta."
          />
          <BenefitCard
            title="Operación más eficiente"
            text="Reduce carga operativa en atención, mantiene conversaciones activas y permite escalar sin depender de más personal para responder lo mismo."
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
            Pruébalo directamente desde esta página
          </h2>
          <p style={{ ...mutedText, maxWidth: "760px" }}>
            Aquí puedes ver cómo responde, cómo guía la conversación y cómo se
            adapta a distintos tipos de atención sin salir del sitio.
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
            Un proceso claro, rápido y fácil de implementar
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
            title="El cliente inicia la conversación"
            text="Escribe o habla desde la web para hacer una consulta, pedir información o iniciar un proceso de compra."
          />
          <StepCard
            step="2"
            title="El asistente interpreta la necesidad"
            text="Analiza el mensaje para entender si se trata de ventas, soporte, seguimiento o una solicitud específica."
          />
          <StepCard
            step="3"
            title="Responde y orienta"
            text="Entrega una respuesta útil, mantiene el contexto y lleva la conversación hacia el siguiente paso correcto."
          />
          <StepCard
            step="4"
            title="Tu negocio recibe oportunidades mejor organizadas"
            text="Cuando detecta interés real, la información queda lista para seguimiento y una atención comercial más efectiva."
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
          <RedLabel>Empieza hoy</RedLabel>
          <h2
            style={{
              fontSize: "clamp(30px, 4vw, 52px)",
              lineHeight: 0.98,
              letterSpacing: "-0.05em",
              margin: "16px 0 12px",
              fontWeight: 900,
            }}
          >
            Muestra una experiencia real desde el primer momento.
          </h2>

          <p
            style={{
              ...mutedText,
              maxWidth: "760px",
              margin: isMobile ? 0 : "0 auto",
            }}
          >
            La mejor forma de presentar una solución como esta es dejar que el
            cliente la vea funcionando, la pruebe y entienda su valor en pocos
            segundos.
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
              Probar la demo
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
              Ver experiencia completa
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