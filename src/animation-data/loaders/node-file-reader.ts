import * as fs from 'fs';
import * as fsPromises from 'fs/promises';
import * as path from 'path';
import { FileReader, FileListItem } from './FileReader.interface';

/**
 * Implementation of FileReader using Node.js filesystem
 */
export class NodeFileReader implements FileReader {
  private studyRootAbsPath: string;

  constructor(studyRootAbsPath: string) {
    this.studyRootAbsPath = path.resolve(studyRootAbsPath);

    if (!fs.existsSync(this.studyRootAbsPath)) {
      throw new Error(`Study root path does not exist: ${this.studyRootAbsPath}`);
    }
  }

  resolveFullPath(relativePath: string): string {
    const cleanPath = relativePath.replace(/^\.\//, '');
    return path.join(this.studyRootAbsPath, cleanPath);
  }

  async readFileAsText(relativePath: string): Promise<string | undefined> {
    const fullPath = this.resolveFullPath(relativePath);
    try {
      return await fsPromises.readFile(fullPath, 'utf-8');
    } catch (err: any) {
      console.error(`Error reading file ${fullPath}: ${err.message}`);
      return undefined;
    }
  }

  async listDirectoryContents(relativePath: string): Promise<FileListItem[] | undefined> {
    const fullPath = this.resolveFullPath(relativePath);
    try {
      const items = await fsPromises.readdir(fullPath, { withFileTypes: true });
      return items.map((item) => ({
        name: item.name,
        path: path.join(relativePath, item.name),
        isDirectory: item.isDirectory(),
      }));
    } catch (err: any) {
      console.error(`Error listing directory ${fullPath}: ${err.message}`);
      return undefined;
    }
  }
}
