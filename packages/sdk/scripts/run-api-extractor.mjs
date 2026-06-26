import { Extractor, ExtractorConfig } from '@microsoft/api-extractor';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const sdkRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const entries = ['index', 'contracts', 'builder', 'client', 'artifacts'];

for (const e of entries) {
  const cfg = ExtractorConfig.loadFileAndPrepare(join(sdkRoot, `api-extractor.${e}.json`));
  const res = Extractor.invoke(cfg, { localBuild: true, showVerboseMessages: false });
  if (!res.succeeded) {
    console.error(`api-extractor failed for ${e}: ${res.errorCount} errors`);
    process.exit(1);
  }
}
console.log('api-extractor: rolled up 5 entrypoints');
