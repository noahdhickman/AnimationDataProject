export interface FileListItem {
  name: string;
  path: string;
  isDirectory: boolean;
}

export interface FileReader {
  readFileAsText(relativePath: string): Promise<string | undefined>;
  listDirectoryContents(relativePath: string): Promise<FileListItem[] | undefined>;
  resolveFullPath(relativePath: string): string;
}
