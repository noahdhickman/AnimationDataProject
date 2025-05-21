export interface FileReader {
  readFileAsText(relativePath: string): Promise<string | undefined>;
  listDirectoryContents(relativePath: string): Promise<FileListItem[] | undefined>;

  // ✅ Add this to match NodeFileReader
  resolveFullPath(relativePath: string): string;
}

export interface FileListItem {
  name: string;
  path: string;
  isDirectory: boolean;
}
