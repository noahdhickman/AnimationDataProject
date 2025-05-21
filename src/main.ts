import { AnimationData } from './animation-data/AnimationData';
import { NodeFileReader } from './animation-data/loaders/node-file-reader';
import * as path from 'path';

async function runTest() {
  console.log('--- Running AnimationData Test ---');

  const studyPath = path.resolve(__dirname, '..', 'sample_study_data', 'my_simple_study');
  console.log(`Using study path: ${studyPath}`);

  try {
    const reader = new NodeFileReader(studyPath);
    const animData = new AnimationData(reader);

    const manifestPath = 'replications/rep_001/animation_manifest_rep_001.json';
    const manifest = await reader.readFileAsText(manifestPath);
    if (!manifest) throw new Error(`Failed to load manifest from ${manifestPath}`);

    const manifestData = JSON.parse(manifest);
    const replicationId = manifestData.metadata.replication ?? 1;

    const replicationData = {
      metadata: {
        name: manifestData.metadata.name ?? 'Unnamed Replication',
        ...manifestData.metadata
      },
      entityPathDataFiles: manifestData.entityPathDataFiles ?? [],
      statisticsDataFiles: manifestData.statisticsDataFiles ?? []
    };

    animData.availableReplications.set(replicationId, replicationData);
    await animData.setActiveReplication(replicationId);

    // ✅ Log entity paths
    console.log('\n📦 Entity Paths:');
    const entityIds = animData.getLoadedEntityIds();
    if (entityIds.length === 0) {
      console.warn('No entity paths loaded.');
    } else {
      for (const id of entityIds) {
        const path = animData.getEntityPath(id);
        console.log(`- ID: ${id}`, path);
      }
    }

    // ✅ Log statistics
    console.log('\n📈 Statistics Values:');
    const activeManifest = animData.availableReplications.get(replicationId);
    if (!activeManifest || !activeManifest.statisticsDataFiles || activeManifest.statisticsDataFiles.length === 0) {
      console.warn('No statistics files listed in the manifest.');
    } else {
      for (const file of activeManifest.statisticsDataFiles) {
        if (!file.type || !file.componentId || !file.metricName) {
          console.warn(`- Skipping file due to missing metadata: ${file.filePath}`);
          continue;
        }

        const stat = animData.getStatistic(file.type, file.componentId, file.metricName);
        if (!stat) {
          console.warn(`- No stats found for ${file.filePath}`);
          continue;
        }

        console.log(`- ${file.filePath}`);
        console.log('  Summary:', stat.summary);
        console.log('  First 3 Time Points:', stat.timeSeries.slice(0, 3));
      }
    }

    console.log('\n✅ Test completed successfully!');
  } catch (err) {
    console.error('❌ Error during test run:', err);
  }

  console.log('\n--- Test Complete ---');
}

runTest();
