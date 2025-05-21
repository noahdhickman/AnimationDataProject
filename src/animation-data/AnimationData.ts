// Import required interfaces and types
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

/**
 * AnimationData is the core class responsible for:
 * - Loading manifest, model layout, visual config
 * - Managing replications
 * - Handling entity path and statistics data
 */
export class AnimationData {
  [x: string]: any; // Allow dynamic access if needed

  // File reader (Node or Web)
  private reader: FileReader;

  // Map of available replications (replication ID → manifest)
  public availableReplications: Map<number, ReplicationManifestData>;

  // Optional shared data
  public modelLayout?: ModelLayout;
  public sharedVisualConfig?: SharedVisualConfig;

  // ID of the currently active replication
  private activeReplicationId?: number;

  // Entity path data loaded from batch files
  private loadedEntityPathBatches: Map<string, EntityPathBatch> = new Map();
  private entityPathsById: Map<string, EntityPath> = new Map();

  // Statistics file cache
  private loadedStatisticsFiles: Map<string, StatisticsFile> = new Map();

  // Constructor injects the file reader (e.g., NodeFileReader)
  constructor(reader: FileReader) {
    this.reader = reader;
    this.availableReplications = new Map();
  }

  /**
   * Utility: Read file with timeout protection
   */
  private async readFileWithTimeout<T>(path: string, timeoutMs: number = 5000): Promise<T | undefined> {
    const timeout = new Promise<undefined>((_, reject) => {
      setTimeout(() => reject(new Error(`Timeout reading ${path}`)), timeoutMs);
    });
    return Promise.race([
      this.fetchAndParseJSON<T>(path),
      timeout
    ]) as Promise<T | undefined>;
  }

  /**
   * Reads and parses a JSON file as type T.
   */
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

  /**
   * Discover available replications by scanning the `replications` folder.
   * Also loads shared files (model layout + visual config).
   */
  public async initializeOrDiscoverReplications(): Promise<void> {
    const replicationItems = await this.reader.listDirectoryContents('replications');
    if (!replicationItems) return;

    for (const item of replicationItems) {
      if (!item.isDirectory || !item.name.startsWith('rep_')) continue;

      const manifestPath = `replications/${item.name}/animation_manifest_${item.name}.json`;
      const manifest = await this.fetchAndParseJSON<ReplicationManifestData>(manifestPath);

      if (manifest) {
        this.availableReplications.set(manifest.metadata.replication, manifest);

        // Load shared files once (only for the first replication encountered)
        if (!this.modelLayout && manifest.metadata.modelLayoutPath) {
          this.modelLayout = await this.fetchAndParseJSON<ModelLayout>(manifest.metadata.modelLayoutPath);
        }

        if (!this.sharedVisualConfig && manifest.metadata.sharedVisualConfigPath) {
          this.sharedVisualConfig = await this.fetchAndParseJSON<SharedVisualConfig>(manifest.metadata.sharedVisualConfigPath);
        }
      }
    }
  }

  /**
   * Activates a replication (by ID), loads associated entity path and statistics files.
   */
  public async setActiveReplication(replicationId: number): Promise<boolean> {
    const manifest = this.availableReplications.get(replicationId);
    if (!manifest) return false;

    this.activeReplicationId = replicationId;

    // Clear previously loaded data
    this.loadedEntityPathBatches.clear();
    this.entityPathsById.clear();
    this.loadedStatisticsFiles.clear();

    // Load all entity path batches for this replication
    for (const file of manifest.entityPathDataFiles) {
      await this.loadEntityPathBatch(file);
    }

    // Load all statistics files in parallel
    await this.loadAllStatisticsFiles(manifest.statisticsDataFiles);

    return true;
  }

  /**
   * Loads a single entity path batch and stores each entity path by ID.
   */
  private async loadEntityPathBatch(fileInfo: EntityPathDataFileInfo): Promise<void> {
    if (this.loadedEntityPathBatches.has(fileInfo.filePath)) return;

    const batch = await this.fetchAndParseJSON<EntityPathBatch>(fileInfo.filePath);
    if (!batch) return;

    this.loadedEntityPathBatches.set(fileInfo.filePath, batch);

    for (const [id, path] of Object.entries(batch)) {
      this.entityPathsById.set(id, path);
    }
  }

  /** Returns metadata for the currently active replication */
  public getActiveReplicationMetadata(): ReplicationManifestMetadata | undefined {
    if (this.activeReplicationId === undefined) return undefined;
    return this.availableReplications.get(this.activeReplicationId)?.metadata;
  }

  /** Returns the active replication ID (if set) */
  public getActiveReplicationId(): number | undefined {
    return this.activeReplicationId;
  }

  /** Returns a specific entity's full path by ID, lazy-loading if needed */
  public async getEntityPath(entityId: string): Promise<EntityPath | undefined> {
    if (this.entityPathsById.has(entityId)) {
      return this.entityPathsById.get(entityId);
    }

    for (const [_, batch] of this.loadedEntityPathBatches) {
      if (batch[entityId]) {
        this.entityPathsById.set(entityId, batch[entityId]);
        return batch[entityId];
      }
    }

    return undefined;
  }

  /** Returns all currently loaded entity IDs */
  public getLoadedEntityIds(): string[] {
    return Array.from(this.entityPathsById.keys());
  }

  /** Filters and returns entities of a specific type (e.g., "Customer") */
  public getEntitiesByType(type: string): Map<string, EntityPath> {
    const result = new Map<string, EntityPath>();
    for (const [id, path] of this.entityPathsById.entries()) {
      if (path.type === type) result.set(id, path);
    }
    return result;
  }

  /**
   * Loads and caches a statistics file, if not already loaded.
   */
  private async loadStatisticsFile(fileInfo: StatisticsDataFileInfo): Promise<void> {
    if (this.loadedStatisticsFiles.has(fileInfo.filePath)) return;

    const statFile = await this.fetchAndParseJSON<StatisticsFile>(fileInfo.filePath);
    if (statFile) {
      this.loadedStatisticsFiles.set(fileInfo.filePath, statFile);
    }
  }

  /**
   * Loads all statistics files in parallel using Promise.all
   */
  private async loadAllStatisticsFiles(files: StatisticsDataFileInfo[]): Promise<void> {
    await Promise.all(files.map(file => this.loadStatisticsFile(file)));
  }

  /**
   * Returns a full StatisticsFile object by type, componentId, and metricName.
   */
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

  /**
   * Gets the interpolated value of a statistic at a specific time. taking the slope between two points. linear approximation.
   */
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

  /** Returns summary statistics (min, max, mean, etc.) for a metric */
  public getStatisticSummary(
    type: string,
    componentId: string,
    metricName: string
  ): StatisticsSummary | undefined {
    return this.getStatistic(type, componentId, metricName)?.summary;
  }

  /**
   * Gets all time series points within a time range for a specific metric.
   */
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
