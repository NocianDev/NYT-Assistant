import { useMemo, useState } from "react";
import axios from "axios";

type Lead = {
  _id: string;
  tenantId: string;
  conversationId: string;
  name: string | null;
  phone: string | null;
  interested: boolean;
  requestedDemo?: boolean;
  selectedAgent?: string;
  summary?: string;
  messages: string[];
  createdAt: string;
  updatedAt: string;
};

const API_URL =
  import.meta.env.VITE_API_URL?.replace(/\/+$/, "") || "http://localhost:3000";

const TENANT_ID = import.meta.env.VITE_TENANT_ID;

function formatAgentName(agent?: string) {
  switch (agent) {
    case "sales":
      return "Sales Agent";
    case "support":
      return "Support Agent";
    case "scheduling":
      return "Scheduling Agent";
    case "general":
      return "General Agent";
    default:
      return "No definido";
  }
}

function StatCard({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div
      style={{
        background: "#ffffff",
        border: "1px solid rgba(15, 23, 42, 0.08)",
        borderRadius: "18px",
        padding: "18px",
        boxShadow: "0 14px 32px rgba(15, 23, 42, 0.06)",
      }}
    >
      <div
        style={{
          fontSize: "13px",
          color: "#64748b",
          fontWeight: 700,
          marginBottom: "8px",
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: "26px",
          fontWeight: 900,
          color: "#0f172a",
        }}
      >
        {value}
      </div>
    </div>
  );
}

export default function LeadsPanel() {
  const [password, setPassword] = useState("");
  const [authorized, setAuthorized] = useState(false);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [agentFilter, setAgentFilter] = useState("all");
  const [search, setSearch] = useState("");

  async function loadLeads() {
    setLoading(true);
    setError("");

    try {
      const res = await axios.get(`${API_URL}/leads`, {
        headers: {
          "x-admin-password": password,
          "x-tenant-id": TENANT_ID,
        },
      });

      setLeads(res.data);
      setAuthorized(true);
    } catch (err: any) {
      console.error(err?.response?.data || err.message);
      setError(
        err?.response?.data?.error ||
          "Contraseña incorrecta o no se pudieron cargar los leads."
      );
      setAuthorized(false);
    } finally {
      setLoading(false);
    }
  }

  async function deleteLead(id: string) {
    try {
      await axios.delete(`${API_URL}/leads/${id}`, {
        headers: {
          "x-admin-password": password,
          "x-tenant-id": TENANT_ID,
        },
      });

      setLeads((prev) => prev.filter((lead) => lead._id !== id));
    } catch (err: any) {
      console.error(err?.response?.data || err.message);
      alert(err?.response?.data?.error || "Error al eliminar lead");
    }
  }

  const filteredLeads = useMemo(() => {
    return leads.filter((lead) => {
      const matchesAgent =
        agentFilter === "all" || (lead.selectedAgent || "general") === agentFilter;

      const text =
        `${lead.name || ""} ${lead.phone || ""} ${lead.conversationId || ""} ${
          lead.summary || ""
        } ${lead.messages.join(" ")}`.toLowerCase();

      const matchesSearch = text.includes(search.trim().toLowerCase());

      return matchesAgent && matchesSearch;
    });
  }, [leads, agentFilter, search]);

  const stats = useMemo(() => {
    const total = leads.length;
    const interested = leads.filter((lead) => lead.interested).length;
    const demo = leads.filter((lead) => lead.requestedDemo).length;
    const withPhone = leads.filter((lead) => Boolean(lead.phone)).length;

    return { total, interested, demo, withPhone };
  }, [leads]);

  if (!authorized) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background:
            "linear-gradient(180deg, #fffdf7 0%, #fffaf2 50%, #fff8ef 100%)",
          color: "#0f172a",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "Arial, sans-serif",
          padding: "20px",
        }}
      >
        <div
          style={{
            width: "100%",
            maxWidth: "430px",
            background: "#ffffff",
            borderRadius: "24px",
            padding: "32px",
            border: "1px solid rgba(15, 23, 42, 0.08)",
            boxShadow: "0 20px 60px rgba(15, 23, 42, 0.1)",
          }}
        >
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              background: "rgba(220, 38, 38, 0.14)",
              color: "#ffffff",
              border: "1px solid rgba(220, 38, 38, 0.35)",
              borderRadius: "999px",
              padding: "8px 14px",
              fontSize: "13px",
              fontWeight: 800,
              marginBottom: "18px",
            }}
          >
            Acceso administrador
          </div>

          <h2
            style={{
              marginBottom: "10px",
              fontSize: "30px",
              color: "#0f172a",
            }}
          >
            Panel de Leads
          </h2>

          <p style={{ color: "#64748b", lineHeight: 1.7 }}>
            Ingresa la contraseña de administrador para ver y gestionar los
            leads de este tenant.
          </p>

          <input
            type="password"
            placeholder="Contraseña"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") loadLeads();
            }}
            style={{
              width: "100%",
              padding: "14px 16px",
              borderRadius: "14px",
              marginTop: "18px",
              border: "1px solid rgba(15, 23, 42, 0.08)",
              background: "#f8fafc",
              color: "#0f172a",
              outline: "none",
              boxSizing: "border-box",
            }}
          />

          <button
            onClick={loadLeads}
            disabled={loading}
            style={{
              width: "100%",
              marginTop: "14px",
              padding: "14px",
              borderRadius: "14px",
              background: "linear-gradient(135deg, #dc2626, #991b1b)",
              border: "none",
              fontWeight: 800,
              color: "#111827",
              cursor: "pointer",
              boxShadow: "0 14px 30px rgba(245, 158, 11, 0.2)",
            }}
          >
            {loading ? "Entrando..." : "Entrar"}
          </button>

          {error && (
            <p style={{ color: "#dc2626", marginTop: "12px" }}>{error}</p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background:
          "linear-gradient(180deg, #fffdf7 0%, #fffaf2 50%, #fff8ef 100%)",
        color: "#0f172a",
        fontFamily: "Arial, sans-serif",
        padding: "30px 20px",
      }}
    >
      <div style={{ maxWidth: "1180px", margin: "0 auto" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginBottom: "22px",
            flexWrap: "wrap",
            gap: "12px",
            alignItems: "center",
          }}
        >
          <div>
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                background: "rgba(220, 38, 38, 0.14)",
                color: "#ffffff",
                border: "1px solid rgba(220, 38, 38, 0.35)",
                borderRadius: "999px",
                padding: "7px 12px",
                fontSize: "13px",
                fontWeight: 800,
                marginBottom: "12px",
              }}
            >
              Administración
            </div>

            <h1
              style={{
                margin: 0,
                fontSize: "40px",
                color: "#0f172a",
              }}
            >
              Leads capturados
            </h1>

            <p style={{ color: "#64748b", marginTop: "8px" }}>
              Total visibles: {filteredLeads.length}
            </p>
          </div>

          <button
            onClick={loadLeads}
            style={{
              padding: "12px 18px",
              borderRadius: "12px",
              background: "linear-gradient(135deg, #dc2626, #991b1b)",
              border: "none",
              cursor: "pointer",
              fontWeight: 800,
              color: "#111827",
              boxShadow: "0 14px 30px rgba(245, 158, 11, 0.18)",
            }}
          >
            Actualizar
          </button>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: "16px",
            marginBottom: "22px",
          }}
        >
          <StatCard label="Leads totales" value={stats.total} />
          <StatCard label="Interesados" value={stats.interested} />
          <StatCard label="Solicitudes de demo" value={stats.demo} />
          <StatCard label="Con teléfono" value={stats.withPhone} />
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 220px",
            gap: "14px",
            marginBottom: "20px",
          }}
        >
          <input
            type="text"
            placeholder="Buscar por nombre, teléfono, resumen, conversación o mensaje..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              width: "100%",
              padding: "14px 16px",
              borderRadius: "14px",
              border: "1px solid rgba(15, 23, 42, 0.08)",
              background: "#ffffff",
              color: "#0f172a",
              outline: "none",
              boxSizing: "border-box",
            }}
          />

          <select
            value={agentFilter}
            onChange={(e) => setAgentFilter(e.target.value)}
            style={{
              width: "100%",
              padding: "14px 16px",
              borderRadius: "14px",
              border: "1px solid rgba(15, 23, 42, 0.08)",
              background: "#ffffff",
              color: "#0f172a",
              outline: "none",
              boxSizing: "border-box",
            }}
          >
            <option value="all">Todos los agentes</option>
            <option value="general">General Agent</option>
            <option value="sales">Sales Agent</option>
            <option value="support">Support Agent</option>
            <option value="scheduling">Scheduling Agent</option>
          </select>
        </div>

        <div style={{ display: "grid", gap: "16px" }}>
          {filteredLeads.length === 0 ? (
            <div
              style={{
                background: "#ffffff",
                border: "1px solid rgba(15, 23, 42, 0.08)",
                borderRadius: "18px",
                padding: "24px",
                color: "#64748b",
                boxShadow: "0 14px 32px rgba(15, 23, 42, 0.06)",
              }}
            >
              No hay leads que coincidan con los filtros.
            </div>
          ) : (
            filteredLeads.map((lead) => (
              <div
                key={lead._id}
                style={{
                  background: "#ffffff",
                  borderRadius: "20px",
                  padding: "22px",
                  border: "1px solid rgba(15, 23, 42, 0.08)",
                  boxShadow: "0 14px 32px rgba(15, 23, 42, 0.06)",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: "14px",
                    flexWrap: "wrap",
                    marginBottom: "16px",
                    alignItems: "center",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      gap: "10px",
                      flexWrap: "wrap",
                    }}
                  >
                    <span
                      style={{
                        background: "rgba(220, 38, 38, 0.14)",
                        color: "#92400e",
                        border: "1px solid rgba(250, 204, 21, 0.28)",
                        borderRadius: "999px",
                        padding: "7px 12px",
                        fontSize: "12px",
                        fontWeight: 800,
                      }}
                    >
                      {formatAgentName(lead.selectedAgent)}
                    </span>

                    <span
                      style={{
                        background: lead.interested
                          ? "rgba(22, 163, 74, 0.12)"
                          : "rgba(148, 163, 184, 0.14)",
                        color: lead.interested ? "#166534" : "#475569",
                        border: "1px solid rgba(15, 23, 42, 0.08)",
                        borderRadius: "999px",
                        padding: "7px 12px",
                        fontSize: "12px",
                        fontWeight: 800,
                      }}
                    >
                      {lead.interested ? "Interesado" : "Sin interés claro"}
                    </span>

                    <span
                      style={{
                        background: lead.requestedDemo
                          ? "rgba(59, 130, 246, 0.12)"
                          : "rgba(148, 163, 184, 0.14)",
                        color: lead.requestedDemo ? "#1d4ed8" : "#475569",
                        border: "1px solid rgba(15, 23, 42, 0.08)",
                        borderRadius: "999px",
                        padding: "7px 12px",
                        fontSize: "12px",
                        fontWeight: 800,
                      }}
                    >
                      {lead.requestedDemo ? "Solicitó demo" : "Sin demo"}
                    </span>
                  </div>

                  <button
                    onClick={() => deleteLead(lead._id)}
                    style={{
                      padding: "11px 14px",
                      borderRadius: "12px",
                      border: "none",
                      background: "#ef4444",
                      color: "white",
                      cursor: "pointer",
                      fontWeight: 700,
                    }}
                  >
                    Eliminar lead
                  </button>
                </div>

                <div
                  style={{
                    marginBottom: "16px",
                    background: "#fff7cc",
                    padding: "12px 14px",
                    borderRadius: "14px",
                    border: "1px solid rgba(250, 204, 21, 0.3)",
                  }}
                >
                  <div
                    style={{
                      fontSize: "13px",
                      fontWeight: 800,
                      color: "#92400e",
                      marginBottom: "6px",
                    }}
                  >
                    Resumen del lead
                  </div>
                  <div
                    style={{
                      color: "#334155",
                      lineHeight: 1.6,
                    }}
                  >
                    {lead.summary || "Sin resumen"}
                  </div>
                </div>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                    gap: "12px",
                    marginBottom: "16px",
                  }}
                >
                  <div>
                    <strong>Nombre:</strong> {lead.name || "Sin nombre"}
                  </div>

                  <div>
                    <strong>Teléfono:</strong> {lead.phone || "Sin teléfono"}
                  </div>

                  <div>
                    <strong>Conversation ID:</strong> {lead.conversationId}
                  </div>

                  <div>
                    <strong>Creado:</strong>{" "}
                    {new Date(lead.createdAt).toLocaleString()}
                  </div>

                  <div>
                    <strong>Actualizado:</strong>{" "}
                    {new Date(lead.updatedAt).toLocaleString()}
                  </div>
                </div>

                <div>
                  <strong>Mensajes:</strong>
                  <div style={{ marginTop: "10px", display: "grid", gap: "8px" }}>
                    {lead.messages?.length ? (
                      lead.messages.map((msg, i) => (
                        <div
                          key={i}
                          style={{
                            background: "#f8fafc",
                            border: "1px solid rgba(15, 23, 42, 0.06)",
                            padding: "10px 12px",
                            borderRadius: "12px",
                            color: "#334155",
                            whiteSpace: "pre-wrap",
                          }}
                        >
                          {msg}
                        </div>
                      ))
                    ) : (
                      <div
                        style={{
                          background: "#f8fafc",
                          border: "1px solid rgba(15, 23, 42, 0.06)",
                          padding: "10px 12px",
                          borderRadius: "12px",
                          color: "#64748b",
                        }}
                      >
                        No hay mensajes guardados.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}