export interface PathPoint {
  clock: number;
  x: number;
  y: number;
  event?: string;
  state: string;
  componentId?: string;
  attributes?: Record<string, string | number | boolean>;
}

export interface EntityPath {
  type: string;
  path: PathPoint[];
}

export interface EntityPathBatch {
  [entityId: string]: EntityPath;
}
