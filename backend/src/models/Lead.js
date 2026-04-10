import mongoose from "mongoose";

const leadSchema = new mongoose.Schema({
  tenantId: { type: String, required: true },
  conversationId: { type: String, required: true },

  name: { type: String, default: null },
  phone: { type: String, default: null },
  interested: { type: Boolean, default: false },

  selectedAgent: { type: String, default: "general" },
  requestedDemo: { type: Boolean, default: false },
  summary: { type: String, default: "" },

  messages: { type: [String], default: [] },

  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

export default mongoose.model("Lead", leadSchema);