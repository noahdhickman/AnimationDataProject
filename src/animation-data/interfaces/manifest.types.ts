import { StatisticsDataFileInfo } from './statistics.types';



export interface ReplicationManifestMetadata {
  statisticsDataFiles: any;
  formatVersion: string;
  simulationId: string;
  replication: number;
  name?: string;
  duration: number;
  timeUnit: string;
  modelLayoutPath: string;
  sharedVisualConfigPath: string;
  backgroundSvgPath: string;
}

export interface EntityPathDataFileInfo {
  filePath: string;
  entryTimeStart: number;
  entryTimeEnd: number;
  entityCount?: number;
}


export interface ReplicationManifestData {
  metadata: ReplicationManifestMetadata;
  entityPathDataFiles: EntityPathDataFileInfo[];
  statisticsDataFiles: StatisticsDataFileInfo[];
}
