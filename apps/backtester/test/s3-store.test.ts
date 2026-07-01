import { describe, expect, it } from 'vitest';
import { createFakeS3Client } from './support/fake-s3';

describe('S3ObjectClient fake contract', () => {
  it('put→get round-trips, head reflects presence, absent get is undefined', async () => {
    const client = createFakeS3Client();
    expect(await client.head('k')).toBe(false);
    expect(await client.get('k')).toBeUndefined();
    await client.put('k', 'value');
    expect(await client.head('k')).toBe(true);
    expect(await client.get('k')).toBe('value');
  });
});
