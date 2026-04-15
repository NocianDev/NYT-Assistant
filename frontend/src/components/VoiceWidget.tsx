import { useNavigate } from "react-router-dom";

export default function VoiceWidget() {
  const navigate = useNavigate();

  function openAssistantsPage() {
    navigate("/assistants");
  }

  return (
    <button
      onClick={openAssistantsPage}
      style={{
        position: "fixed",
        right: "92px",
        bottom: "20px",
        width: "64px",
        height: "64px",
        borderRadius: "50%",
        background: "linear-gradient(135deg, #22c55e, #16a34a)",
        border: "none",
        fontSize: "24px",
        cursor: "pointer",
        boxShadow: "0 18px 40px rgba(34, 197, 94, 0.35)",
        zIndex: 10000,
        color: "#ffffff",
      }}
      aria-label="Abrir asistentes"
      title="Abrir asistentes"
    >
      🎙️
    </button>
  );
}