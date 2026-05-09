import VoiceWidgetPanel from "./VoiceWidgetPanel";

type Props = {
  assistantName?: string;
  assistantId?: string;
  assistantColor?: string;
};

export default function VoiceAssistant({
  assistantName = "Isis",
  assistantId = "isis",
  assistantColor = "#facc15",
}: Props) {
  return (
    <VoiceWidgetPanel
      assistantName={assistantName}
      assistantId={assistantId}
      assistantColor={assistantColor}
    />
  );
}
