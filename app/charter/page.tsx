'use client';

import { useCharter } from '@/hooks/useCharter';

export default function CharterPanel() {
  const { charter, enforceAction } = useCharter();

  const handleAgentAction = async (action: unknown) => {
    const compliant = await enforceAction(action);
    if (!compliant) {
      alert('Violation Charter: Action was rejected.');
      return;
    }
    // proceed
  };

  void handleAgentAction;

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold">Constitutional Panel</h1>
      <pre>{JSON.stringify(charter, null, 2)}</pre>
    </div>
  );
}
