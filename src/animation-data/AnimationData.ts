import { FileReader } from './loaders/FileReader.interface';
import {
  ReplicationManifestData,
  ReplicationManifestMetadata,
  ModelLayout,
  SharedVisualConfig,
  EntityPathBatch,
  EntityPath,
  EntityPathDataFileInfo,
  StatisticsDataFileInfo,
  StatisticsFile,
  StatisticsSummary,
  StatisticsTimeSeriesPoint
} from './interfaces';

export class AnimationData {
  [x: string]: any;
  private reader: FileReader;
  public availableReplications: Map<number, ReplicationManifestData>;
  public modelLayout?: ModelLayout;
  public sharedVisualConfig?: SharedVisualConfig;
  private activeReplicationId?: number;

  private loadedEntityPathBatches: Map<string, EntityPathBatch> = new Map();
  private entityPathsById: Map<string, EntityPath> = new Map();

  private loadedStatisticsFiles: Map<string, StatisticsFile> = new Map();

  constructor(reader: FileReader) {
    this.reader = reader;
    this.availableReplications = new Map();
  }

  private async fetchAndParseJSON<T>(relativePath: string): Promise<T | undefined> {
    const content = await this.reader.readFileAsText(relativePath);
    if (content) {
      try {
        return JSON.parse(content) as T;
      } catch (e) {
        console.error(`AnimationData: Error parsing JSON from ${relativePath}:`, e);
      }
    }
    return undefined;
  }

  public async initializeOrDiscoverReplications(): Promise<void> {
    const replicationItems = await this.reader.listDirectoryContents('replications');
    if (!replicationItems) return;

    for (const item of replicationItems) {
      if (!item.isDirectory || !item.name.startsWith('rep_')) continue;

      const manifestPath = `replications/${item.name}/animation_manifest_${item.name}.json`;
      const manifest = await this.fetchAndParseJSON<ReplicationManifestData>(manifestPath);

      if (manifest) {
        this.availableReplications.set(manifest.metadata.replication, manifest);

        if (!this.modelLayout && manifest.metadata.modelLayoutPath) {
          this.modelLayout = await this.fetchAndParseJSON<ModelLayout>(manifest.metadata.modelLayoutPath);
        }

        if (!this.sharedVisualConfig && manifest.metadata.sharedVisualConfigPath) {
          this.sharedVisualConfig = await this.fetchAndParseJSON<SharedVisualConfig>(manifest.metadata.sharedVisualConfigPath);
        }
      }
    }
  }

  public async setActiveReplication(replicationId: number): Promise<boolean> {
    const manifest = this.availableReplications.get(replicationId);
    if (!manifest) return false;

    this.activeReplicationId = replicationId;
    this.loadedEntityPathBatches.clear();
    this.entityPathsById.clear();

    for (const file of manifest.entityPathDataFiles) {
      await this.loadEntityPathBatch(file);
    }

    for (const file of manifest.statisticsDataFiles) {
      await this.loadStatisticsFile(file);
    }

    return true;
  }

  private async loadEntityPathBatch(fileInfo: EntityPathDataFileInfo): Promise<void> {
    if (this.loadedEntityPathBatches.has(fileInfo.filePath)) return;

    const batch = await this.fetchAndParseJSON<EntityPathBatch>(fileInfo.filePath);
    if (!batch) return;

    this.loadedEntityPathBatches.set(fileInfo.filePath, batch);
    for (const [id, path] of Object.entries(batch)) {
      this.entityPathsById.set(id, path);
    }
  }

  public getActiveReplicationMetadata(): ReplicationManifestMetadata | undefined {
    if (this.activeReplicationId === undefined) return undefined;
    return this.availableReplications.get(this.activeReplicationId)?.metadata;
  }

  public getActiveReplicationId(): number | undefined {
    return this.activeReplicationId;
  }

  public getEntityPath(entityId: string): EntityPath | undefined {
    return this.entityPathsById.get(entityId);
  }

  public getLoadedEntityIds(): string[] {
    return Array.from(this.entityPathsById.keys());
  }

  public getEntitiesByType(type: string): Map<string, EntityPath> {
    const result = new Map<string, EntityPath>();
    for (const [id, path] of this.entityPathsById.entries()) {
      if (path.type === type) result.set(id, path);
    }
    return result;
  }

  private async loadStatisticsFile(fileInfo: StatisticsDataFileInfo): Promise<void> {
    if (this.loadedStatisticsFiles.has(fileInfo.filePath)) return;

    const statFile = await this.fetchAndParseJSON<StatisticsFile>(fileInfo.filePath);
    if (statFile) {
      this.loadedStatisticsFiles.set(fileInfo.filePath, statFile);
    }
  }

  public getStatistic(
    type: string,
    componentId: string,
    metricName: string
  ): StatisticsFile | undefined {
    for (const file of this.loadedStatisticsFiles.values()) {
      if (
        file.metadata.type === type &&
        file.metadata.metricName === metricName &&
        file.metadata.componentId === componentId
      ) {
        return file;
      }
    }
    return undefined;
  }

  public getStatisticValueAtTime(
    type: string,
    componentId: string,
    metricName: string,
    time: number
  ): number | undefined {
    const stat = this.getStatistic(type, componentId, metricName);
    if (!stat) return undefined;

    const points = stat.timeSeries;
    for (let i = 0; i < points.length - 1; i++) {
      if (points[i].time <= time && points[i + 1].time >= time) {
        const ratio = (time - points[i].time) / (points[i + 1].time - points[i].time);
        return points[i].value + ratio * (points[i + 1].value - points[i].value);
      }
    }

    return undefined;
  }

  public getStatisticSummary(
    type: string,
    componentId: string,
    metricName: string
  ): StatisticsSummary | undefined {
    return this.getStatistic(type, componentId, metricName)?.summary;
  }

  public getStatisticTimeSeriesForRange(
    type: string,
    componentId: string,
    metricName: string,
    start: number,
    end: number
  ): StatisticsTimeSeriesPoint[] {
    const stat = this.getStatistic(type, componentId, metricName);
    if (!stat) return [];

    return stat.timeSeries.filter((point: StatisticsTimeSeriesPoint) => point.time >= start && point.time <= end);
  }
}
