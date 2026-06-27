import { describe, expect, it } from 'vitest';
import { produceEvidence } from '../scripts/produce-evidence.mjs';
import { verifySignedEvidenceLocal } from '../src/evidence/signing.js';

describe('produceEvidence harness (real long_oi fixture, in-process engine)', () => {
  it('produces a locally-verifiable signed artifact with a verdict from real metrics', async () => {
    const out = await produceEvidence({}); // uses generated dev key + default fixture
    expect(out.body?.bundleHash ?? out.artifact.body.bundleHash).toMatch(/^sha256:[0-9a-f]{64}$/);
    expect(['passed', 'failed']).toContain(out.verdict);
    expect(out.artifactRef).toMatch(/^sha256:[0-9a-f]{64}$/);
    expect(verifySignedEvidenceLocal(out.artifact, { [out.keyId]: out.publicKeyPem }).ok).toBe(true);
  });
});
