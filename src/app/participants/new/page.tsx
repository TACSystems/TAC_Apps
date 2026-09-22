import ParticipantForm from "@/components/ParticipantForm";
import { createParticipant } from "../actions";

export const dynamic = "force-dynamic";

export default function NewParticipantPage() {
  return (
    <div className="max-w-xl">
      <h1 className="mb-4 text-xl font-semibold">Add Participant</h1>
      <ParticipantForm action={createParticipant} submitLabel="Add Participant" />
    </div>
  );
}
