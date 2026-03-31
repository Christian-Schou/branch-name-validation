import * as core from '@actions/core';

export interface ActionOutputs {
  isValid: boolean;
  wasSkipped: boolean;
  captureGroups: Record<string, string>;
}

export default function setOutputs(outputs: ActionOutputs): void {
  core.setOutput('is_valid', String(outputs.isValid));
  core.setOutput('was_skipped', String(outputs.wasSkipped));
  core.setOutput('branch_type', outputs.captureGroups.type ?? '');
  core.setOutput('ticket_id', outputs.captureGroups.ticket ?? '');
}
