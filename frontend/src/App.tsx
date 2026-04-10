import { BrowserRouter, Routes, Route } from "react-router-dom";
import { useEffect, useState } from "react";
import AssistantWidget from "./components/AssistantWidget";
import LeadsPanel from "./components/LeadsPanel";

const API_URL =
  import.meta.env.VITE_API_URL?.replace(/\/+$/, "") || "http://localhost:3000";

const sectionTitleStyle = {
  fontSize: "clamp(28px, 4vw, 42px)",
  lineHeight: 1.1,
  margin: 0,
  color: "#0f172a",
  fontWeight: 900,
  letterSpacing: "-0.03em",
};

const sectionTextStyle = {
  color: "#64748b",
  fontSize: "17px",
  lineHeight: 1.8,
  margin: 0,
};

const cardStyle = {
  background: "#ffffff",
  border: "1px solid rgba(15, 23, 42, 0.08)",
  borderRadius: "24px",
  padding: "24px",
  boxShadow: "0 20px 40px rgba(15, 23, 42, 0.06)",
};

function SectionLabel({ text }: { text: string }) {
  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "8px",
        background: "rgba(250, 204, 21, 0.16)",
        color: "#a16207",
        border: "1px solid rgba(250, 204, 21, 0.35)",
        borderRadius: "999px",
        padding: "8px 14px",
        fontSize: "13px",
        fontWeight: 800,
        marginBottom: "18px",
      }}
    >
      {text}
    </div>
  );
}

function FeatureCard({
  title,
  text,
}: {
  title: string;
  text: string;
}) {
  return (
    <div style={cardStyle}>
      <h3
        style={{
          margin: "0 0 10px",
          fontSize: "21px",
          color: "#0f172a",
        }}
      >
        {title}
      </h3>
      <p style={sectionTextStyle}>{text}</p>
    </div>
  );
}

function StepCard({
  number,
  title,
  text,
}: {
  number: string;
  title: string;
  text: string;
}) {
  return (
    <div style={cardStyle}>
      <div
        style={{
          width: "42px",
          height: "42px",
          borderRadius: "999px",
          background: "linear-gradient(135deg, #facc15, #f59e0b)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontWeight: 900,
          color: "#111827",
          marginBottom: "16px",
          boxShadow: "0 12px 24px rgba(245, 158, 11, 0.22)",
        }}
      >
        {number}
      </div>
      <h3
        style={{
          margin: "0 0 10px",
          fontSize: "20px",
          color: "#0f172a",
        }}
      >
        {title}
      </h3>
      <p style={sectionTextStyle}>{text}</p>
    </div>
  );
}

function UseCaseCard({
  title,
  text,
}: {
  title: string;
  text: string;
}) {
  return (
    <div
      style={{
        ...cardStyle,
        padding: "22px",
      }}
    >
      <h3
        style={{
          margin: "0 0 10px",
          fontSize: "20px",
          color: "#0f172a",
        }}
      >
        {title}
      </h3>
      <p style={sectionTextStyle}>{text}</p>
    </div>
  );
}

function HomePage() {
  const [isMobile, setIsMobile] = useState(
    typeof window !== "undefined" ? window.innerWidth < 900 : false
  );

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 900);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  return (
    <div
      style={{
        minHeight: "100vh",
        background:
          "linear-gradient(180deg, #fffdf5 0%, #fff9e6 28%, #ffffff 58%, #fffdf7 100%)",
        color: "#0f172a",
        fontFamily: "Arial, sans-serif",
      }}
    >
      <div
        style={{
          maxWidth: "1180px",
          margin: "0 auto",
          padding: isMobile ? "24px 16px 90px" : "32px 20px 120px",
        }}
      >
        {/* NAV / TOP */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: isMobile ? "flex-start" : "center",
            gap: "16px",
            flexWrap: "wrap",
            flexDirection: isMobile ? "column" : "row",
            marginBottom: isMobile ? "24px" : "34px",
          }}
        >
          <div
            style={{
              fontSize: isMobile ? "18px" : "20px",
              fontWeight: 900,
              color: "#0f172a",
              letterSpacing: "-0.02em",
            }}
          >
            HoyMismo Assistant
          </div>

          <div
            style={{
              display: "flex",
              gap: "10px",
              flexWrap: "wrap",
              width: isMobile ? "100%" : "auto",
            }}
          >
            <a
              href="#producto"
              style={{
                textDecoration: "none",
                color: "#475569",
                fontWeight: 700,
                padding: isMobile ? "8px 0" : "10px 14px",
              }}
            >
              Producto
            </a>
            <a
              href="#como-funciona"
              style={{
                textDecoration: "none",
                color: "#475569",
                fontWeight: 700,
                padding: isMobile ? "8px 0" : "10px 14px",
              }}
            >
              Cómo funciona
            </a>
            <a
              href="#sectores"
              style={{
                textDecoration: "none",
                color: "#475569",
                fontWeight: 700,
                padding: isMobile ? "8px 0" : "10px 14px",
              }}
            >
              Sectores
            </a>
            <a
              href="#panel"
              style={{
                textDecoration: "none",
                color: "#475569",
                fontWeight: 700,
                padding: isMobile ? "8px 0" : "10px 14px",
              }}
            >
              Panel
            </a>
          </div>
        </div>

        {/* HERO */}
        <section
          style={{
            display: "grid",
            gridTemplateColumns: isMobile ? "1fr" : "1.25fr 0.95fr",
            gap: "26px",
            alignItems: "stretch",
            marginBottom: isMobile ? "54px" : "72px",
          }}
        >
          <div
            style={{
              ...cardStyle,
              padding: isMobile ? "24px" : "34px",
              background:
                "linear-gradient(180deg, rgba(255,255,255,0.96) 0%, rgba(255,252,240,0.96) 100%)",
            }}
          >
            <SectionLabel text="Asistente virtual 24/7" />

            <h1
              style={{
                fontSize: "clamp(38px, 7vw, 78px)",
                lineHeight: 0.97,
                margin: "0 0 18px",
                fontWeight: 900,
                letterSpacing: "-0.05em",
                background: "linear-gradient(90deg, #facc15, #f59e0b, #111827)",
                WebkitBackgroundClip: "text",
                color: "transparent",
                maxWidth: "920px",
              }}
            >
              Atención automática, captura de leads y presencia profesional en un solo producto
            </h1>

            <p
              style={{
                fontSize: "clamp(17px, 2.2vw, 22px)",
                lineHeight: 1.85,
                color: "#475569",
                maxWidth: "770px",
                marginBottom: "26px",
              }}
            >
              HoyMismo Assistant es una solución pensada para empresas,
              negocios, clínicas, hospitales y servicios que quieren responder
              más rápido, automatizar conversaciones y transformar visitas en
              oportunidades reales de contacto.
            </p>

            <div
              style={{
                display: "flex",
                gap: "14px",
                flexWrap: "wrap",
                marginBottom: "26px",
                flexDirection: isMobile ? "column" : "row",
              }}
            >
              <a
                href="#producto"
                style={{
                  textDecoration: "none",
                  background: "linear-gradient(135deg, #facc15, #f59e0b)",
                  color: "#111827",
                  padding: "14px 18px",
                  borderRadius: "14px",
                  fontWeight: 900,
                  boxShadow: "0 14px 30px rgba(245, 158, 11, 0.22)",
                  textAlign: "center",
                }}
              >
                Conocer el producto
              </a>

              <a
                href="#como-funciona"
                style={{
                  textDecoration: "none",
                  background: "#ffffff",
                  color: "#0f172a",
                  padding: "14px 18px",
                  borderRadius: "14px",
                  fontWeight: 800,
                  border: "1px solid rgba(15, 23, 42, 0.08)",
                  textAlign: "center",
                }}
              >
                Ver cómo funciona
              </a>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: isMobile
                  ? "1fr"
                  : "repeat(auto-fit, minmax(180px, 1fr))",
                gap: "14px",
              }}
            >
              <div
                style={{
                  background: "#ffffff",
                  border: "1px solid rgba(15, 23, 42, 0.08)",
                  borderRadius: "18px",
                  padding: "16px 18px",
                }}
              >
                <div
                  style={{
                    fontSize: "13px",
                    color: "#64748b",
                    marginBottom: "6px",
                    fontWeight: 700,
                  }}
                >
                  Atención
                </div>
                <div
                  style={{ fontSize: "18px", fontWeight: 900, color: "#0f172a" }}
                >
                  Disponible 24/7
                </div>
              </div>

              <div
                style={{
                  background: "#ffffff",
                  border: "1px solid rgba(15, 23, 42, 0.08)",
                  borderRadius: "18px",
                  padding: "16px 18px",
                }}
              >
                <div
                  style={{
                    fontSize: "13px",
                    color: "#64748b",
                    marginBottom: "6px",
                    fontWeight: 700,
                  }}
                >
                  Captura
                </div>
                <div
                  style={{ fontSize: "18px", fontWeight: 900, color: "#0f172a" }}
                >
                  Leads automáticos
                </div>
              </div>

              <div
                style={{
                  background: "#ffffff",
                  border: "1px solid rgba(15, 23, 42, 0.08)",
                  borderRadius: "18px",
                  padding: "16px 18px",
                }}
              >
                <div
                  style={{
                    fontSize: "13px",
                    color: "#64748b",
                    marginBottom: "6px",
                    fontWeight: 700,
                  }}
                >
                  Experiencia
                </div>
                <div
                  style={{ fontSize: "18px", fontWeight: 900, color: "#0f172a" }}
                >
                  Chat y voz
                </div>
              </div>
            </div>
          </div>

          <div
            style={{
              ...cardStyle,
              padding: isMobile ? "24px" : "30px",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              background:
                "linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(255,248,220,0.98) 100%)",
            }}
          >
            <div>
              <SectionLabel text="Propuesta de valor" />
              <h2 style={{ ...sectionTitleStyle, marginBottom: "14px" }}>
                Un producto pensado para atención, información y conversión
              </h2>
              <p style={{ ...sectionTextStyle, marginBottom: "18px" }}>
                No se trata solo de un chatbot. Es una experiencia diseñada para
                responder dudas, orientar usuarios, generar confianza y captar
                oportunidades sin que tu equipo tenga que estar disponible todo
                el tiempo.
              </p>

              <div
                style={{
                  display: "grid",
                  gap: "12px",
                }}
              >
                {[
                  "Responde consultas frecuentes de forma inmediata.",
                  "Se adapta a negocios, clínicas, hospitales y servicios.",
                  "Identifica interés y guarda leads automáticamente.",
                  "Centraliza la información en un panel administrable.",
                ].map((item) => (
                  <div
                    key={item}
                    style={{
                      display: "flex",
                      gap: "10px",
                      alignItems: "flex-start",
                      color: "#334155",
                      lineHeight: 1.7,
                    }}
                  >
                    <span style={{ color: "#f59e0b", fontWeight: 900 }}>●</span>
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>

            <div
              style={{
                marginTop: "26px",
                background: "#ffffff",
                border: "1px solid rgba(15, 23, 42, 0.08)",
                borderRadius: "20px",
                padding: "20px",
              }}
            >
              <div
                style={{
                  fontSize: "14px",
                  color: "#64748b",
                  fontWeight: 700,
                  marginBottom: "8px",
                }}
              >
                Ideal para
              </div>
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: "10px",
                }}
              >
                {[
                  "Empresas",
                  "Negocios locales",
                  "Clínicas",
                  "Hospitales",
                  "Servicios profesionales",
                  "Atención interna",
                ].map((tag) => (
                  <span
                    key={tag}
                    style={{
                      background: "rgba(250, 204, 21, 0.16)",
                      color: "#92400e",
                      border: "1px solid rgba(250, 204, 21, 0.3)",
                      borderRadius: "999px",
                      padding: "8px 12px",
                      fontSize: "13px",
                      fontWeight: 800,
                    }}
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* PRODUCTO */}
        <section id="producto" style={{ marginBottom: isMobile ? "54px" : "74px" }}>
          <SectionLabel text="Qué es HoyMismo Assistant" />
          <div
            style={{
              display: "grid",
              gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr",
              gap: "22px",
              alignItems: "start",
              marginBottom: "24px",
            }}
          >
            <div>
              <h2 style={{ ...sectionTitleStyle, marginBottom: "14px" }}>
                Una solución completa para automatizar atención sin perder cercanía
              </h2>
            </div>
            <div>
              <p style={sectionTextStyle}>
                HoyMismo Assistant combina conversación inteligente, captación
                de datos, atención continua y administración de leads en una
                misma herramienta. El objetivo es que cualquier visitante reciba
                orientación rápida, útil y profesional desde el primer contacto.
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
            <FeatureCard
              title="Atención inmediata"
              text="Responde en segundos a preguntas frecuentes, solicitudes de información y consultas iniciales para reducir tiempos de espera."
            />
            <FeatureCard
              title="Captura de oportunidades"
              text="Cuando detecta interés real, solicita los datos clave y los organiza automáticamente para seguimiento posterior."
            />
            <FeatureCard
              title="Experiencia flexible"
              text="Puede atender por texto y voz, adaptándose a diferentes tipos de usuarios y contextos de servicio."
            />
            <FeatureCard
              title="Presencia profesional"
              text="Ayuda a que tu sitio web no se vea como una página estática, sino como una solución moderna, activa y orientada a resultados."
            />
          </div>
        </section>

        {/* COMO FUNCIONA */}
        <section
          id="como-funciona"
          style={{ marginBottom: isMobile ? "54px" : "74px" }}
        >
          <SectionLabel text="Cómo funciona" />
          <div
            style={{
              display: "grid",
              gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr",
              gap: "22px",
              alignItems: "start",
              marginBottom: "24px",
            }}
          >
            <div>
              <h2 style={{ ...sectionTitleStyle, marginBottom: "14px" }}>
                Un flujo simple, claro y pensado para resultados reales
              </h2>
            </div>
            <div>
              <p style={sectionTextStyle}>
                El visitante entra al sitio, interactúa con el asistente,
                resuelve dudas, recibe orientación y, cuando existe oportunidad,
                el sistema guarda el lead para que el equipo pueda dar
                seguimiento desde el panel administrativo.
              </p>
            </div>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))",
              gap: "18px",
            }}
          >
            <StepCard
              number="1"
              title="El visitante inicia conversación"
              text="El usuario entra al sitio y abre el asistente desde cualquier dispositivo para preguntar o pedir información."
            />
            <StepCard
              number="2"
              title="La IA orienta y responde"
              text="El sistema responde con tono profesional, se adapta al contexto y guía la conversación según el tipo de usuario."
            />
            <StepCard
              number="3"
              title="Se detecta intención"
              text="Si hay interés comercial o necesidad concreta, el sistema solicita datos como nombre o teléfono de manera natural."
            />
            <StepCard
              number="4"
              title="El lead queda disponible"
              text="La información se guarda automáticamente y se muestra en el panel para consulta, seguimiento o administración."
            />
          </div>
        </section>

        {/* BENEFICIOS */}
        <section style={{ marginBottom: isMobile ? "54px" : "74px" }}>
          <SectionLabel text="Beneficios principales" />
          <div
            style={{
              display: "grid",
              gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr",
              gap: "22px",
              alignItems: "start",
              marginBottom: "24px",
            }}
          >
            <div>
              <h2 style={{ ...sectionTitleStyle, marginBottom: "14px" }}>
                Más velocidad, mejor atención y mejor aprovechamiento del tráfico
              </h2>
            </div>
            <div>
              <p style={sectionTextStyle}>
                Esta solución está pensada para mejorar la experiencia de quien
                visita tu sitio, pero también para ayudarte a aprovechar mejor
                cada oportunidad de contacto que llega a tu página.
              </p>
            </div>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
              gap: "18px",
            }}
          >
            <FeatureCard
              title="Disponibilidad continua"
              text="Atiende fuera de horario, en fines de semana o cuando tu equipo no puede responder de inmediato."
            />
            <FeatureCard
              title="Menos fricción"
              text="El usuario obtiene respuesta sin tener que buscar teléfonos, formularios o esperar atención manual."
            />
            <FeatureCard
              title="Mejor calificación de leads"
              text="Desde la primera interacción puedes detectar intención, tipo de necesidad y oportunidad real."
            />
            <FeatureCard
              title="Escalabilidad"
              text="Puede adaptarse a distintos tipos de empresa, procesos y sectores sin rehacer toda la solución desde cero."
            />
          </div>
        </section>

        {/* SECTORES */}
        <section id="sectores" style={{ marginBottom: isMobile ? "54px" : "74px" }}>
          <SectionLabel text="Sectores y escenarios de uso" />
          <div
            style={{
              display: "grid",
              gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr",
              gap: "22px",
              alignItems: "start",
              marginBottom: "24px",
            }}
          >
            <div>
              <h2 style={{ ...sectionTitleStyle, marginBottom: "14px" }}>
                Adaptable a diferentes industrias y necesidades de atención
              </h2>
            </div>
            <div>
              <p style={sectionTextStyle}>
                El producto no está limitado a ventas. También puede utilizarse
                como una herramienta de orientación, información y apoyo
                operativo para distintos tipos de organización.
              </p>
            </div>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
              gap: "18px",
            }}
          >
            <UseCaseCard
              title="Negocios y empresas"
              text="Ideal para captar clientes, responder preguntas frecuentes, cotizar servicios y acompañar al visitante hacia una propuesta o contacto."
            />
            <UseCaseCard
              title="Clínicas y hospitales"
              text="Puede ayudar a orientar usuarios, atender preguntas comunes, facilitar información y reducir carga en atención inicial."
            />
            <UseCaseCard
              title="Servicios profesionales"
              text="Útil para despachos, consultorías y equipos que necesitan filtrar solicitudes y organizar mejor los contactos entrantes."
            />
            <UseCaseCard
              title="Operación interna"
              text="También puede usarse como asistente informativo o de apoyo para procesos internos, recepción o comunicación inicial."
            />
          </div>
        </section>

        {/* PANEL */}
        <section id="panel" style={{ marginBottom: isMobile ? "54px" : "74px" }}>
          <SectionLabel text="Panel administrativo" />
          <div
            style={{
              display: "grid",
              gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr",
              gap: "22px",
              alignItems: "start",
              marginBottom: "24px",
            }}
          >
            <div>
              <h2 style={{ ...sectionTitleStyle, marginBottom: "14px" }}>
                Control y visibilidad sobre los leads capturados
              </h2>
            </div>
            <div>
              <p style={sectionTextStyle}>
                Además del asistente, el sistema incluye un panel desde el que
                es posible revisar conversaciones, ver datos capturados y dar
                seguimiento a las oportunidades detectadas.
              </p>
            </div>
          </div>

          <div
            style={{
              ...cardStyle,
              padding: isMobile ? "22px" : "28px",
            }}
          >
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                gap: "18px",
              }}
            >
              <FeatureCard
                title="Leads organizados"
                text="Consulta nombre, teléfono, historial de mensajes e interés detectado desde un solo lugar."
              />
              <FeatureCard
                title="Gestión simple"
                text="El panel está diseñado para actualizar, revisar y administrar leads sin depender de herramientas complicadas."
              />
              <FeatureCard
                title="Visibilidad operativa"
                text="Permite entender qué preguntas llegan, qué necesidades se repiten y cuáles contactos merecen seguimiento inmediato."
              />
            </div>
          </div>
        </section>

        {/* CTA FINAL */}
        <section>
          <div
            style={{
              ...cardStyle,
              padding: isMobile ? "24px" : "34px",
              background:
                "linear-gradient(135deg, rgba(250,204,21,0.16), rgba(255,255,255,1))",
            }}
          >
            <SectionLabel text="Siguiente paso" />
            <h2 style={{ ...sectionTitleStyle, marginBottom: "16px" }}>
              Una solución lista para mostrar, implementar y escalar
            </h2>
            <p
              style={{
                ...sectionTextStyle,
                maxWidth: "820px",
                marginBottom: "24px",
              }}
            >
              HoyMismo Assistant ya integra atención automática, captura de
              leads y panel de administración en una propuesta clara y
              profesional. Es una base sólida para implementar en clientes,
              vender como producto o seguir evolucionando hacia un sistema más
              avanzado.
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
                href="#producto"
                style={{
                  textDecoration: "none",
                  background: "linear-gradient(135deg, #facc15, #f59e0b)",
                  color: "#111827",
                  padding: "14px 18px",
                  borderRadius: "14px",
                  fontWeight: 900,
                  boxShadow: "0 14px 30px rgba(245, 158, 11, 0.22)",
                  textAlign: "center",
                }}
              >
                Explorar solución
              </a>

              <a
                href="/admin"
                style={{
                  textDecoration: "none",
                  background: "#ffffff",
                  color: "#0f172a",
                  padding: "14px 18px",
                  borderRadius: "14px",
                  fontWeight: 800,
                  border: "1px solid rgba(15, 23, 42, 0.08)",
                  textAlign: "center",
                }}
              >
                Ir al panel admin
              </a>
            </div>
          </div>
        </section>
      </div>

      <AssistantWidget
        title="HoyMismo Assistant"
        welcomeMessage="Hola 👋 Bienvenido a Tecnología Hoy Mismo. ¿En qué puedo ayudarte hoy?"
        primaryColor="#facc15"
        apiUrl={`${API_URL}/chat`}
      />
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