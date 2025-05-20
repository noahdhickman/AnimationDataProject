/**
 * Information about a statistics data file, as referenced in the manifest
 */
export interface StatisticsDataFileInfo {
  /** Type of statistic (e.g., "activity_metric", "resource_metric") */
  type: string;

  /** ID of the component this statistic is for (for component-specific metrics) */
  componentId?: string;

  /** Name of the metric (e.g., "queueLength", "utilization") */
  metricName: string;

  /** Path to the statistics file */
  filePath: string;

  /** Start time of the data in the file */
  timeStart?: number;

  /** End time of the data in the file */
  timeEnd?: number;
}

/**
 * Statistics metadata
 */
export interface StatisticsMetadata {
  /** Type of statistic */
  type: string;

  /** ID of the component this statistic is for */
  componentId?: string;

  /** Name of the metric */
  metricName: string;

  /** Simulation ID */
  simulationId: string;

  /** Replication number */
  replication: number;

  /** Start time of the data */
  timeStart: number;

  /** End time of the data */
  timeEnd: number;

  /** Time unit used in the simulation */
  timeUnit: string;
}

/**
 * Summary statistics for a time series
 */
export interface StatisticsSummary {
  min: number;
  max: number;
  mean: number;
  median: number;
  stdDev: number;
  count: number;
}

/**
 * A single time-series point in a statistics file
 */
export interface StatisticsTimeSeriesPoint {
  time: number;
  value: number;
}

/**
 * Complete structure of a loaded statistics file
 */
export interface LoadedStatisticsFile {
  metadata: StatisticsMetadata;
  summary: StatisticsSummary;
  timeSeries: StatisticsTimeSeriesPoint[];
}

export interface TimeSeriesPoint {
  time: number;
  value: number;
}

export interface StatisticsSummary {
  min: number;
  max: number;
  mean: number;
  median: number;
  stdDev: number;
  count: number;
}

export interface StatisticsMetadata {
  type: string;
  componentId?: string;
  metricName: string;
  simulationId: string;
  replication: number;
  timeStart: number;
  timeEnd: number;
  timeUnit: string;
}

export interface StatisticsFile {
  metadata: StatisticsMetadata;
  summary: StatisticsSummary;
  timeSeries: TimeSeriesPoint[];
}

export interface StatisticsDataFileInfo {
  type: string;
  componentId?: string;
  metricName: string;
  filePath: string;
  timeStart?: number;
  timeEnd?: number;
}
