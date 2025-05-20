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

    await animData.initializeOrDiscoverReplications();

    console.log('\n✅ Available Replications:');
    for (const [id, manifest] of animData.availableReplications) {
      console.log(`- ID ${id}: ${manifest.metadata.name}`);
    }

    if (animData.modelLayout) {
      console.log(`\n✅ Model Layout loaded for simulation ID: ${animData.modelLayout.simulationId}`);
    } else {
      console.warn('\n⚠️ Model Layout not loaded.');
    }

    if (animData.sharedVisualConfig) {
      console.log(`✅ Shared Config: backgroundMode = ${animData.sharedVisualConfig.visualization.backgroundMode}`);
    } else {
      console.warn('⚠️ Shared Visual Config not loaded.');
    }

    const firstId = [...animData.availableReplications.keys()][0];
    await animData.setActiveReplication(firstId);

    const meta = animData.getActiveReplicationMetadata();
    if (meta) {
      console.log(`\n🎯 Active Replication Metadata:`);
      console.log(JSON.stringify(meta, null, 2));
    }

    // Entity Path Files
    const entityFiles = animData.availableReplications.get(firstId)?.entityPathDataFiles ?? [];

    if (entityFiles.length > 0) {
      console.log(`\n📦 Entity Path Files (${entityFiles.length}):`);
      entityFiles.forEach((f: { filePath: any; entryTimeStart: any; entryTimeEnd: any; }, i: number) => {
        console.log(`  ${i + 1}. ${f.filePath} [${f.entryTimeStart} - ${f.entryTimeEnd}]`);
      });
    } else {
      console.log(`\nℹ️ No entity path files found for active replication.`);
    }

    // Statistics Summary
    const statSummary = animData.getStatisticSummary("activity_metric", "act1", "queueLength");
    if (statSummary) {
      console.log(`\n📊 Queue Length Summary:`);
      console.log(statSummary);
    } else {
      console.warn(`\n⚠️ No statistics summary found for act1 queueLength.`);
    }

    // Statistics Value at a Specific Time
    const valAt10 = animData.getStatisticValueAtTime("activity_metric", "act1", "queueLength", 10);
    console.log(`\n⏱ Value at t=10.0: ${valAt10 ?? 'Not available'}`);

    // Time Series Range
    const timeSeriesRange = animData.getStatisticTimeSeriesForRange("activity_metric", "act1", "queueLength", 0, 30);
    if (timeSeriesRange.length > 0) {
      console.log(`\n📈 Time series (0 to 30):`);
      timeSeriesRange.forEach(p => console.log(`  t=${p.time}, value=${p.value}`));
    } else {
      console.log('\nℹ️ No time series points found for that range.');
    }

    // Debug Summary
    console.log('\n🔧 Debug Info Summary:');
    console.log(`- Total Replications: ${animData.availableReplications.size}`);
    console.log(`- Active Replication ID: ${animData.getActiveReplicationId() ?? 'None'}`);
    console.log(`- Shared Config Loaded: ${animData.sharedVisualConfig ? 'Yes' : 'No'}`);
    console.log(`- Model Layout Loaded: ${animData.modelLayout ? 'Yes' : 'No'}`);

  } catch (err) {
    console.error('❌ Error during test run:', err);
  }

  console.log('\n--- Test Complete ---');
}

runTest();
