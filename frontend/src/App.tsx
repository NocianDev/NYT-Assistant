import { BrowserRouter, Routes, Route } from "react-router-dom";
import { useEffect, useState } from "react";
import AssistantWidget from "./components/AssistantWidget";
import LeadsPanel from "./components/LeadsPanel";
import VoiceAssistant from "./components/VoiceAssistant";
import VoiceWidget from "./components/VoiceWidget";

const API_URL =
  import.meta.env.VITE_API_URL?.replace(/\/+$/, "") || "http://localhost:3000";

function HomePage() {
  const [isMobile, setIsMobile] = useState(
    typeof window !== "undefined" ? window.innerWidth < 960 : false
  );

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 960);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const sectionWrap: React.CSSProperties = {
    maxWidth: "1240px",
    margin: "0 auto",
    padding: isMobile ? "0 16px" : "0 24px",
  };

  const panelStyle: React.CSSProperties = {
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: "28px",
    backdropFilter: "blur(14px)",
    WebkitBackdropFilter: "blur(14px)",
    boxShadow: "0 24px 80px rgba(0,0,0,0.38)",
  };

  const mutedText: React.CSSProperties = {
    color: "rgba(255,255,255,0.72)",
    lineHeight: 1.8,
    fontSize: "16px",
    margin: 0,
  };

  const cardBase: React.CSSProperties = {
    ...panelStyle,
    padding: isMobile ? "20px" : "24px",
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
              Atención inteligente · ventas · leads · voz
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
            ["#overview", "Solución"],
            ["#system", "Cómo funciona"],
            ["#industries", "Sectores"],
            ["#voice", "Voz"],
            ["#panel", "Panel"],
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

  function StatBlock({
    title,
    value,
  }: {
    title: string;
    value: string;
  }) {
    return (
      <div
        style={{
          ...panelStyle,
          padding: "18px 18px",
          minHeight: "96px",
        }}
      >
        <div
          style={{
            color: "rgba(255,255,255,0.55)",
            fontSize: "12px",
            fontWeight: 700,
            marginBottom: "8px",
            textTransform: "uppercase",
            letterSpacing: "0.08em",
          }}
        >
          {title}
        </div>
        <div
          style={{
            color: "#fff",
            fontSize: "20px",
            fontWeight: 900,
            letterSpacing: "-0.03em",
          }}
        >
          {value}
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

  function InfoCard({
    title,
    text,
  }: {
    title: string;
    text: string;
  }) {
    return (
      <div style={cardBase}>
        <h3
          style={{
            margin: "0 0 12px",
            color: "#fff",
            fontSize: "22px",
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

  function SystemFlowCard({
    index,
    title,
    text,
  }: {
    index: string;
    title: string;
    text: string;
  }) {
    return (
      <div
        style={{
          ...cardBase,
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: "-18px",
            right: "-10px",
            fontSize: "86px",
            fontWeight: 900,
            color: "rgba(255,255,255,0.04)",
            lineHeight: 1,
          }}
        >
          {index}
        </div>

        <div
          style={{
            width: "46px",
            height: "46px",
            borderRadius: "14px",
            background: "linear-gradient(135deg, #ff2a2a, #740000)",
            display: "grid",
            placeItems: "center",
            color: "#fff",
            fontWeight: 900,
            marginBottom: "16px",
            boxShadow: "0 14px 32px rgba(255, 42, 42, 0.3)",
          }}
        >
          {index}
        </div>

        <h3
          style={{
            margin: "0 0 12px",
            color: "#fff",
            fontSize: "20px",
            fontWeight: 900,
          }}
        >
          {title}
        </h3>
        <p style={mutedText}>{text}</p>
      </div>
    );
  }

  function HeroInterface() {
    return (
      <div
        style={{
          ...panelStyle,
          padding: isMobile ? "20px" : "24px",
          minHeight: isMobile ? "auto" : "560px",
          display: "grid",
          gap: "16px",
          alignContent: "start",
          background:
            "radial-gradient(circle at top right, rgba(255,42,42,0.18), transparent 28%), rgba(255,255,255,0.04)",
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: isMobile ? "1fr" : "1.15fr 0.85fr",
            gap: "16px",
          }}
        >
          <div
            style={{
              background: "rgba(0,0,0,0.34)",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: "24px",
              padding: "18px",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "16px",
                gap: "12px",
              }}
            >
              <div>
                <div style={{ color: "#fff", fontWeight: 900, fontSize: "17px" }}>
                  Conversación activa
                </div>
                <div style={{ color: "rgba(255,255,255,0.5)", fontSize: "13px" }}>
                  Atención en tiempo real con NYT Assistant
                </div>
              </div>
              <div
                style={{
                  padding: "8px 10px",
                  borderRadius: "999px",
                  background: "rgba(255, 42, 42, 0.14)",
                  border: "1px solid rgba(255, 42, 42, 0.3)",
                  color: "#ffd4d4",
                  fontWeight: 800,
                  fontSize: "12px",
                }}
              >
                EN LÍNEA
              </div>
            </div>

            <div style={{ display: "grid", gap: "12px" }}>
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
                Hola, quiero que mi negocio atienda clientes todo el día sin
                perder oportunidades.
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
                Perfecto. NYT Assistant responde consultas, detecta intención
                de compra, captura datos clave y deja cada oportunidad lista
                para seguimiento.
              </div>

              <div
                style={{
                  maxWidth: "70%",
                  background: "rgba(255,255,255,0.06)",
                  border: "1px solid rgba(255,255,255,0.06)",
                  color: "rgba(255,255,255,0.82)",
                  padding: "12px 14px",
                  borderRadius: "16px 16px 16px 4px",
                  lineHeight: 1.6,
                  fontSize: "14px",
                }}
              >
                Me interesa para ventas y para responder por WhatsApp.
              </div>
            </div>
          </div>

          <div style={{ display: "grid", gap: "16px" }}>
            <div
              style={{
                background: "rgba(0,0,0,0.34)",
                border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: "24px",
                padding: "18px",
              }}
            >
              <div
                style={{
                  color: "rgba(255,255,255,0.5)",
                  fontSize: "12px",
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                  marginBottom: "8px",
                  fontWeight: 800,
                }}
              >
                Ruta asignada
              </div>
              <div style={{ color: "#fff", fontWeight: 900, fontSize: "20px" }}>
                Agente comercial
              </div>
            </div>

            <div
              style={{
                background: "rgba(0,0,0,0.34)",
                border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: "24px",
                padding: "18px",
              }}
            >
              <div
                style={{
                  color: "rgba(255,255,255,0.5)",
                  fontSize: "12px",
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                  marginBottom: "8px",
                  fontWeight: 800,
                }}
              >
                Estado del lead
              </div>
              <div style={{ color: "#fff", fontWeight: 900, fontSize: "20px" }}>
                Oportunidad detectada
              </div>
            </div>

            <div
              style={{
                background: "rgba(0,0,0,0.34)",
                border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: "24px",
                padding: "18px",
              }}
            >
              <div
                style={{
                  color: "rgba(255,255,255,0.5)",
                  fontSize: "12px",
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                  marginBottom: "8px",
                  fontWeight: 800,
                }}
              >
                Preparado para
              </div>
              <div style={{ color: "#fff", fontWeight: 900, fontSize: "20px" }}>
                Web + voz
              </div>
            </div>
          </div>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: isMobile ? "1fr" : "repeat(3, 1fr)",
            gap: "14px",
          }}
        >
          <StatBlock title="Atención" value="Disponible 24/7" />
          <StatBlock title="Arquitectura" value="Lógica multiagente" />
          <StatBlock title="Objetivo" value="Convertir más contactos" />
        </div>
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
            gridTemplateColumns: isMobile ? "1fr" : "1.04fr 0.96fr",
            gap: "26px",
            alignItems: "stretch",
            minHeight: isMobile ? "auto" : "78vh",
          }}
        >
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              gap: "22px",
            }}
          >
            <RedLabel>IA para atención, ventas y evolución a voz</RedLabel>

            <h1
              style={{
                margin: 0,
                fontSize: "clamp(44px, 7vw, 92px)",
                lineHeight: 0.94,
                letterSpacing: "-0.06em",
                fontWeight: 900,
                maxWidth: "820px",
              }}
            >
              Convierte cada conversación en una oportunidad real de venta.
            </h1>

            <p
              style={{
                ...mutedText,
                fontSize: "clamp(16px, 2vw, 21px)",
                maxWidth: "760px",
              }}
            >
              NYT Assistant responde clientes en segundos, detecta intención de
              compra, captura datos clave y deja cada lead listo para
              seguimiento. Sin esperas, sin formularios largos y sin perder
              oportunidades por falta de atención.
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
                href="#overview"
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
                Conocer la solución
              </a>

              <a
                href="/admin"
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
                Ver panel administrativo
              </a>
            </div>
          </div>

          <HeroInterface />
        </div>
      </section>

      <section id="overview" style={{ ...sectionWrap, paddingTop: "84px" }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: isMobile ? "1fr" : "0.9fr 1.1fr",
            gap: "22px",
            marginBottom: "22px",
            alignItems: "start",
          }}
        >
          <div>
            <RedLabel>Solución</RedLabel>
            <h2
              style={{
                fontSize: "clamp(32px, 4.2vw, 58px)",
                lineHeight: 0.98,
                letterSpacing: "-0.05em",
                margin: "18px 0 0",
                fontWeight: 900,
              }}
            >
              Un sistema diseñado para vender, no solo para responder
            </h2>
          </div>
          <div style={cardBase}>
            <p style={mutedText}>
              NYT Assistant no es un chatbot decorativo. Es una herramienta
              pensada para atender mejor, filtrar oportunidades reales y
              convertir conversaciones en acciones concretas para tu negocio.
            </p>
          </div>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
            gap: "18px",
          }}
        >
          <InfoCard
            title="Respuestas inmediatas"
            text="Atiende clientes en tiempo real, sin importar la hora, con una comunicación clara, profesional y enfocada en avanzar la conversación."
          />
          <InfoCard
            title="Captura automática de leads"
            text="Cuando detecta interés, solicita datos clave y los registra para que tu equipo pueda dar seguimiento sin perder el contacto."
          />
          <InfoCard
            title="Conversaciones que convierten"
            text="No se limita a responder preguntas. Guía al usuario hacia acciones como contacto, cotización, agendamiento o seguimiento comercial."
          />
        </div>
      </section>

      <section id="system" style={{ ...sectionWrap, paddingTop: "84px" }}>
        <div style={{ marginBottom: "24px" }}>
          <RedLabel>Cómo funciona</RedLabel>
          <h2
            style={{
              fontSize: "clamp(32px, 4vw, 56px)",
              lineHeight: 0.98,
              letterSpacing: "-0.05em",
              margin: "18px 0 14px",
              fontWeight: 900,
              maxWidth: "780px",
            }}
          >
            Cada interacción sigue un flujo pensado para generar resultados
          </h2>
          <p style={{ ...mutedText, maxWidth: "860px" }}>
            Desde el primer mensaje hasta la captura del lead, el sistema
            organiza la conversación para entender al usuario, responder con
            precisión y convertir el interés en una oportunidad real.
          </p>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
            gap: "18px",
          }}
        >
          <SystemFlowCard
            index="1"
            title="El cliente inicia contacto"
            text="Pregunta, solicita información o muestra interés desde cualquier dispositivo y en cualquier momento."
          />
          <SystemFlowCard
            index="2"
            title="Se detecta la intención"
            text="El sistema identifica si la conversación requiere enfoque comercial, información general, soporte o agendamiento."
          />
          <SystemFlowCard
            index="3"
            title="Respuesta estratégica"
            text="El asistente responde con el tono y el enfoque adecuados para mantener el interés y llevar la conversación al siguiente paso."
          />
          <SystemFlowCard
            index="4"
            title="Lead registrado"
            text="Cuando existe oportunidad, los datos se capturan y quedan listos para seguimiento desde el panel administrativo."
          />
        </div>
      </section>

      <section id="industries" style={{ ...sectionWrap, paddingTop: "84px" }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr",
            gap: "18px",
            marginBottom: "18px",
          }}
        >
          <div style={cardBase}>
            <RedLabel>Sectores</RedLabel>
            <h3
              style={{
                margin: "18px 0 12px",
                fontSize: "30px",
                fontWeight: 900,
                letterSpacing: "-0.04em",
              }}
            >
              Diseñado para negocios que dependen de clientes
            </h3>
            <p style={mutedText}>
              Funciona en empresas, servicios, clínicas y operaciones donde una
              conversación bien atendida puede convertirse en una venta, una
              cita o una oportunidad de seguimiento.
            </p>
          </div>

          <div
            style={{
              display: "grid",
              gap: "18px",
            }}
          >
            <InfoCard
              title="Ventas y atención comercial"
              text="Ideal para responder consultas, presentar servicios, calificar oportunidades y avanzar al usuario hacia una cotización o contacto directo."
            />
            <InfoCard
              title="Clínicas, servicios y equipos de atención"
              text="Ayuda a orientar usuarios, resolver dudas frecuentes y ordenar mejor la atención inicial sin saturar al equipo humano."
            />
          </div>
        </div>
      </section>

      <section id="panel" style={{ ...sectionWrap, paddingTop: "84px" }}>
        <div
          style={{
            ...panelStyle,
            padding: isMobile ? "24px" : "30px",
            background:
              "radial-gradient(circle at top right, rgba(255,42,42,0.18), transparent 22%), rgba(255,255,255,0.04)",
          }}
        >
          <RedLabel>Panel administrativo</RedLabel>
          <h2
            style={{
              fontSize: "clamp(32px, 4vw, 56px)",
              lineHeight: 0.98,
              letterSpacing: "-0.05em",
              margin: "18px 0 14px",
              fontWeight: 900,
              maxWidth: "760px",
            }}
          >
            Control total sobre tus oportunidades
          </h2>
          <p style={{ ...mutedText, maxWidth: "840px", marginBottom: "24px" }}>
            Visualiza leads, revisa conversaciones y detecta oportunidades
            reales desde un solo panel, con una vista clara para dar
            seguimiento sin depender de herramientas externas.
          </p>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: "18px",
            }}
          >
            <InfoCard
              title="Leads organizados"
              text="Consulta nombre, teléfono, historial de mensajes y nivel de interés desde una misma interfaz."
            />
            <InfoCard
              title="Visibilidad operativa"
              text="Detecta qué preguntas se repiten, qué contactos muestran intención real y dónde conviene enfocar seguimiento."
            />
            <InfoCard
              title="Base para escalar"
              text="La solución queda lista para crecer hacia nuevas automatizaciones, más canales y una experiencia de voz más avanzada."
            />
          </div>
        </div>
      </section>

      <section
        id="voice"
        style={{ ...sectionWrap, paddingTop: "84px", paddingBottom: "90px" }}
      >
        <div style={{ marginBottom: "22px" }}>
          <RedLabel>Voz</RedLabel>
          <h2
            style={{
              fontSize: "clamp(32px, 4vw, 56px)",
              lineHeight: 0.98,
              letterSpacing: "-0.05em",
              margin: "18px 0 14px",
              fontWeight: 900,
              maxWidth: "760px",
            }}
          >
            El siguiente paso es hablar con tus clientes
          </h2>
          <p style={{ ...mutedText, maxWidth: "820px" }}>
            NYT Assistant está preparado para evolucionar de chat a voz,
            permitiendo conversaciones más naturales, una experiencia más
            cercana y una presencia mucho más fuerte para tu marca.
          </p>
        </div>

        <VoiceAssistant
          assistantName="NYT Assistant"
          subtitle="Interfaz preparada para evolucionar hacia voz en tiempo real"
        />
      </section>

      <AssistantWidget
        title="NYT Assistant"
        welcomeMessage="Hola 👋 Soy NYT Assistant. ¿En qué puedo ayudarte hoy?"
        primaryColor="#dc2626"
        apiUrl={`${API_URL}/chat`}
      />

      <VoiceWidget assistantName="NYT Voice" />
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/admin" element={<LeadsPanel />} />
      </Routes>
    </BrowserRouter>
  );
}