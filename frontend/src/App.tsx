import { BrowserRouter, Routes, Route } from "react-router-dom";
import { useEffect, useState } from "react";
import AssistantWidget from "./components/AssistantWidget";
import LeadsPanel from "./components/LeadsPanel";
import VoiceAssistant from "./components/VoiceAssistant";
import VoiceWidget from "./components/VoiceWidget";


const API_URL =
  import.meta.env.VITE_API_URL?.replace(/\/+$/, "") || "http://localhost:3000";

const sectionTitleStyle: React.CSSProperties = {
  fontSize: "clamp(28px, 4vw, 42px)",
  lineHeight: 1.08,
  margin: 0,
  color: "#0f172a",
  fontWeight: 900,
  letterSpacing: "-0.03em",
};

const sectionTextStyle: React.CSSProperties = {
  color: "#475569",
  fontSize: "17px",
  lineHeight: 1.8,
  margin: 0,
};

const cardStyle: React.CSSProperties = {
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

function HeroMetric({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div
      style={{
        background: "#ffffff",
        border: "1px solid rgba(15, 23, 42, 0.08)",
        borderRadius: "18px",
        padding: "16px 18px",
        boxShadow: "0 14px 28px rgba(15, 23, 42, 0.06)",
      }}
    >
      <div
        style={{
          fontSize: "12px",
          color: "#64748b",
          marginBottom: "6px",
          fontWeight: 700,
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: "18px",
          fontWeight: 900,
          color: "#0f172a",
        }}
      >
        {value}
      </div>
    </div>
  );
}

function MockupPanel({ isMobile }: { isMobile: boolean }) {
  return (
    <div
      style={{
        background: "#ffffff",
        border: "1px solid rgba(15, 23, 42, 0.08)",
        borderRadius: "28px",
        padding: isMobile ? "20px" : "24px",
        boxShadow: "0 30px 60px rgba(15, 23, 42, 0.12)",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "16px",
        }}
      >
        <div>
          <div
            style={{
              color: "#0f172a",
              fontWeight: 900,
              fontSize: "18px",
            }}
          >
            HoyMismo Assistant
          </div>
          <div
            style={{
              color: "#64748b",
              fontSize: "13px",
              marginTop: "4px",
            }}
          >
            Multiagente · Leads · Voz · Automatización
          </div>
        </div>

        <div
          style={{
            background: "rgba(250, 204, 21, 0.16)",
            color: "#92400e",
            border: "1px solid rgba(250, 204, 21, 0.25)",
            borderRadius: "999px",
            padding: "8px 12px",
            fontSize: "12px",
            fontWeight: 800,
          }}
        >
          En línea
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gap: "14px",
        }}
      >
        <div
          style={{
            background: "#f8fafc",
            border: "1px solid rgba(15, 23, 42, 0.06)",
            borderRadius: "18px",
            padding: "16px",
          }}
        >
          <div
            style={{
              color: "#0f172a",
              fontWeight: 800,
              marginBottom: "10px",
            }}
          >
            Conversación activa
          </div>

          <div
            style={{
              display: "grid",
              gap: "10px",
            }}
          >
            <div
              style={{
                alignSelf: "flex-start",
                background: "#ffffff",
                color: "#334155",
                padding: "10px 12px",
                borderRadius: "14px",
                maxWidth: "80%",
                fontSize: "14px",
                lineHeight: 1.5,
                border: "1px solid rgba(15, 23, 42, 0.06)",
              }}
            >
              Hola, quiero automatizar WhatsApp para mi negocio.
            </div>

            <div
              style={{
                marginLeft: "auto",
                background: "linear-gradient(135deg, #facc15, #f59e0b)",
                color: "#111827",
                padding: "10px 12px",
                borderRadius: "14px",
                maxWidth: "84%",
                fontSize: "14px",
                lineHeight: 1.5,
                fontWeight: 700,
              }}
            >
              Perfecto. Podemos ayudarte a responder clientes 24/7, captar
              leads y convertir más conversaciones en ventas. ¿Qué tipo de
              negocio tienes?
            </div>
          </div>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr",
            gap: "14px",
          }}
        >
          <div
            style={{
              background: "#f8fafc",
              border: "1px solid rgba(15, 23, 42, 0.06)",
              borderRadius: "18px",
              padding: "16px",
            }}
          >
            <div
              style={{
                color: "#64748b",
                fontSize: "12px",
                fontWeight: 700,
                marginBottom: "8px",
              }}
            >
              Agente activo
            </div>
            <div
              style={{
                color: "#0f172a",
                fontSize: "18px",
                fontWeight: 900,
              }}
            >
              Sales Agent
            </div>
          </div>

          <div
            style={{
              background: "#f8fafc",
              border: "1px solid rgba(15, 23, 42, 0.06)",
              borderRadius: "18px",
              padding: "16px",
            }}
          >
            <div
              style={{
                color: "#64748b",
                fontSize: "12px",
                fontWeight: 700,
                marginBottom: "8px",
              }}
            >
              Acción detectada
            </div>
            <div
              style={{
                color: "#0f172a",
                fontSize: "18px",
                fontWeight: 900,
              }}
            >
              Lead calificado
            </div>
          </div>
        </div>
      </div>
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
          "linear-gradient(180deg, #fffdf7 0%, #fffaf2 50%, #fff8ef 100%)",
        color: "#0f172a",
        fontFamily: "Arial, sans-serif",
      }}
    >
      <div
        style={{
          maxWidth: "1180px",
          margin: "0 auto",
          padding: isMobile ? "22px 16px 90px" : "28px 20px 120px",
        }}
      >
        {/* NAV */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: isMobile ? "flex-start" : "center",
            gap: "16px",
            flexWrap: "wrap",
            flexDirection: isMobile ? "column" : "row",
            marginBottom: isMobile ? "28px" : "34px",
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
            {[
              ["#producto", "Producto"],
              ["#como-funciona", "Cómo funciona"],
              ["#agentes", "Agentes"],
              ["#sectores", "Sectores"],
              ["#panel", "Panel"],
            ].map(([href, label]) => (
              <a
                key={href}
                href={href}
                style={{
                  textDecoration: "none",
                  color: "#334155",
                  fontWeight: 700,
                  padding: isMobile ? "8px 0" : "10px 14px",
                }}
              >
                {label}
              </a>
            ))}
          </div>
        </div>

        {/* HERO */}
        <section
          style={{
            display: "grid",
            gridTemplateColumns: isMobile ? "1fr" : "1.06fr 0.94fr",
            gap: "28px",
            alignItems: "center",
            marginBottom: isMobile ? "56px" : "76px",
          }}
        >
          <div>
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                background: "rgba(250, 204, 21, 0.16)",
                color: "#a16207",
                border: "1px solid rgba(250, 204, 21, 0.28)",
                borderRadius: "999px",
                padding: "8px 14px",
                fontSize: "13px",
                fontWeight: 800,
                marginBottom: "18px",
              }}
            >
              IA multiagente para atención, ventas y operación
            </div>

            <h1
              style={{
                fontSize: "clamp(40px, 7vw, 78px)",
                lineHeight: 0.96,
                margin: "0 0 18px",
                fontWeight: 900,
                letterSpacing: "-0.05em",
                color: "#0f172a",
                maxWidth: "900px",
              }}
            >
              Automatiza conversaciones, captura oportunidades y prepara tu
              negocio para voz.
            </h1>

            <p
              style={{
                fontSize: "clamp(17px, 2.2vw, 22px)",
                lineHeight: 1.8,
                color: "#475569",
                maxWidth: "760px",
                marginBottom: "26px",
              }}
            >
              HoyMismo Assistant es una solución pensada para empresas,
              clínicas, hospitales y negocios que necesitan responder más
              rápido, calificar leads, organizar conversaciones y evolucionar
              hacia asistentes por voz en tiempo real.
            </p>

            <div
              style={{
                display: "flex",
                gap: "14px",
                flexWrap: "wrap",
                marginBottom: "28px",
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
                  boxShadow: "0 16px 34px rgba(245, 158, 11, 0.24)",
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
                Ver panel admin
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
              <HeroMetric label="Atención" value="Disponible 24/7" />
              <HeroMetric label="Arquitectura" value="Multiagente" />
              <HeroMetric label="Evolución" value="Lista para voz" />
            </div>
          </div>

          <MockupPanel isMobile={isMobile} />
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
                HoyMismo Assistant combina conversación inteligente, memoria
                contextual, captación de datos, administración de leads y una
                arquitectura multiagente para resolver diferentes tipos de
                interacción desde un mismo sistema.
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
              text="Responde en segundos a preguntas frecuentes, solicitudes de información y consultas iniciales con una experiencia clara y profesional."
            />
            <FeatureCard
              title="Captura de oportunidades"
              text="Cuando detecta intención comercial, solicita datos clave y los guarda para seguimiento posterior desde el panel."
            />
            <FeatureCard
              title="Memoria contextual"
              text="Mantiene el contexto reciente de la conversación para responder de forma más coherente y útil."
            />
            <FeatureCard
              title="Preparado para voz"
              text="La lógica del backend queda lista para evolucionar de chat a una experiencia de llamada o asistente hablado."
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
                Un flujo pensado para conversar, clasificar y actuar
              </h2>
            </div>
            <div>
              <p style={sectionTextStyle}>
                El visitante entra al sitio, inicia conversación, el sistema
                identifica la intención, envía el caso al agente adecuado y,
                cuando existe oportunidad, registra el lead para seguimiento.
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
              title="El usuario inicia conversación"
              text="Puede preguntar, pedir información o mostrar interés desde cualquier dispositivo."
            />
            <StepCard
              number="2"
              title="El router detecta intención"
              text="La arquitectura multiagente clasifica si la conversación requiere enfoque comercial, soporte o agendamiento."
            />
            <StepCard
              number="3"
              title="El agente responde"
              text="Cada agente atiende con un enfoque distinto, manteniendo tono profesional y utilidad real."
            />
            <StepCard
              number="4"
              title="Se ejecuta una acción"
              text="Si hay oportunidad, el sistema guarda datos, marca solicitudes relevantes y las deja listas para operación."
            />
          </div>
        </section>

        {/* AGENTES */}
        <section id="agentes" style={{ marginBottom: isMobile ? "54px" : "74px" }}>
          <SectionLabel text="Arquitectura multiagente" />
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
                Agentes especializados que trabajan dentro del mismo sistema
              </h2>
            </div>
            <div>
              <p style={sectionTextStyle}>
                En lugar de depender de un solo bot genérico, la solución puede
                distribuir la conversación entre agentes especializados según el
                tipo de necesidad detectada.
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
            <FeatureCard
              title="Router Agent"
              text="Clasifica el tipo de interacción y decide qué agente debe tomar la conversación."
            />
            <FeatureCard
              title="Sales Agent"
              text="Detecta intención comercial, explica valor, califica oportunidades y lleva a contacto o demo."
            />
            <FeatureCard
              title="Support Agent"
              text="Resuelve dudas frecuentes, orienta usuarios y da respuestas claras sin presionar comercialmente."
            />
            <FeatureCard
              title="Scheduling Agent"
              text="Identifica solicitudes de demo, llamada o reunión y las encamina como acción operativa."
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
                Esta solución no solo mejora la experiencia del visitante. También
                ayuda a aprovechar mejor cada oportunidad de contacto que llega al
                sitio web.
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
              text="El usuario obtiene respuesta rápida sin depender de formularios largos o atención manual."
            />
            <FeatureCard
              title="Mejor calificación"
              text="Desde la primera interacción puedes detectar intención, necesidad y oportunidad real."
            />
            <FeatureCard
              title="Escalabilidad"
              text="La solución puede crecer desde chat web hasta una experiencia de voz y automatización operativa."
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
                El producto puede utilizarse en ventas, información, orientación,
                captación y soporte inicial para distintos tipos de organización.
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
              text="Ideal para captar clientes, responder preguntas frecuentes, cotizar servicios y acompañar al visitante hacia una propuesta."
            />
            <UseCaseCard
              title="Clínicas y hospitales"
              text="Puede ayudar a orientar usuarios, atender dudas comunes y reducir carga en atención inicial."
            />
            <UseCaseCard
              title="Servicios profesionales"
              text="Útil para despachos, consultorías y equipos que necesitan filtrar solicitudes y organizar mejor sus contactos."
            />
            <UseCaseCard
              title="Operación interna"
              text="También puede usarse como asistente informativo o de apoyo para procesos internos y recepción."
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
                puedes revisar conversaciones, datos capturados e intención
                detectada.
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
                text="El panel está diseñado para revisar y administrar leads sin depender de herramientas complejas."
              />
              <FeatureCard
                title="Visibilidad operativa"
                text="Permite entender qué preguntas llegan, qué necesidades se repiten y qué contactos merecen seguimiento."
              />
            </div>
          </div>
        </section>


        {/* VOZ / LLAMADA */}
<section style={{ marginBottom: isMobile ? "54px" : "74px" }}>
  <SectionLabel text="Siguiente evolución" />
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
        El siguiente salto es convertir el asistente en una experiencia de voz
      </h2>
    </div>
    <div>
      <p style={sectionTextStyle}>
        Esta interfaz representa la transición natural de un chat web hacia una
        experiencia de llamada, donde el usuario habla, el sistema procesa y el
        asistente responde con voz y presencia visual más avanzada.
      </p>
    </div>
  </div>

  <VoiceAssistant
    assistantName="HoyMismo Assistant"
    subtitle="Demo visual preparada para voz en tiempo real"
  />
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
              Una base sólida para vender, implementar y evolucionar a voz
            </h2>
            <p
              style={{
                ...sectionTextStyle,
                maxWidth: "820px",
                marginBottom: "24px",
              }}
            >
              HoyMismo Assistant ya integra atención automática, clasificación
              por agentes, captura de leads y panel administrativo dentro de una
              misma propuesta. Es una base seria para seguir creciendo hacia una
              experiencia de llamada y automatización más avanzada.
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

      <VoiceWidget assistantName="HoyMismo Voice" />
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