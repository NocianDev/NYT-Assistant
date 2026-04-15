export type AssistantItem = {
  id: string;
  name: string;
  myth: "Egipcia" | "Nórdica" | "Griega";
  gender: "F" | "M";
  role: string;
  backendAgent: "reception" | "sales" | "support";
  color: string;
};

export const ASSISTANTS: AssistantItem[] = [
  {
    id: "isis",
    name: "Isis",
    myth: "Egipcia",
    gender: "F",
    role: "Recepción y bienvenida",
    backendAgent: "reception",
    color: "#facc15",
  },
  {
    id: "freyja",
    name: "Freyja",
    myth: "Nórdica",
    gender: "F",
    role: "Ventas y seguimiento",
    backendAgent: "sales",
    color: "#a855f7",
  },
  {
    id: "atenea",
    name: "Atenea",
    myth: "Griega",
    gender: "F",
    role: "Soporte y orientación",
    backendAgent: "support",
    color: "#3b82f6",
  },
  {
    id: "osiris",
    name: "Osiris",
    myth: "Egipcia",
    gender: "M",
    role: "Recepción ejecutiva",
    backendAgent: "reception",
    color: "#10b981",
  },
  {
    id: "thor",
    name: "Thor",
    myth: "Nórdica",
    gender: "M",
    role: "Cierre comercial",
    backendAgent: "sales",
    color: "#ef4444",
  },
  {
    id: "artemisa",
    name: "Artemisa",
    myth: "Griega",
    gender: "F",
    role: "Asistencia personalizada",
    backendAgent: "support",
    color: "#f97316",
  },
];