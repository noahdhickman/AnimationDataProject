import * as fsPromises from 'fs/promises';
import * as nodePath from 'path';
import { FileReader, FileListItem } from './FileReader.interface';

export class NodeFileReader implements FileReader {
  private basePath: string;

  constructor(basePath: string) {
    this.basePath = basePath;
  }

  resolveFullPath(relativePath: string): string {
    return nodePath.resolve(this.basePath, relativePath.replace(/\\/g, '/'));
  }

  async readFileAsText(relativePath: string): Promise<string | undefined> {
    const fullPath = this.resolveFullPath(relativePath);
    try {
      const fileContent = await fsPromises.readFile(fullPath, 'utf-8');
      return fileContent;
    } catch (error: any) {
      console.error(`Error reading file ${fullPath}: ${error.message}`);
      return undefined;
    }
  }

  async listDirectoryContents(relativePath: string): Promise<FileListItem[] | undefined> {
    const fullPath = this.resolveFullPath(relativePath);
    try {
      const items = await fsPromises.readdir(fullPath, { withFileTypes: true });
      return items.map((item) => ({
        name: item.name,
        path: nodePath.join(relativePath, item.name),
        isDirectory: item.isDirectory(),
      }));
    } catch (error: any) {
      console.error(`Error listing directory ${fullPath}: ${error.message}`);
      return undefined;
    }
  }
}
