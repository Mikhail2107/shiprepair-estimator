import { app } from 'electron';
import path from 'path';
import fs from 'fs';

class FileStorageService {
  private static instance: FileStorageService;
  private basePath: string;

  private constructor() {
    // Определяем путь для хранения изображений
    this.basePath = path.join(app.getPath('userData'), 'images');
    if (!fs.existsSync(this.basePath)) {
      fs.mkdirSync(this.basePath, { recursive: true });
    }
  }

  static getInstance(): FileStorageService {
    if (!FileStorageService.instance) {
      FileStorageService.instance = new FileStorageService();
    }
    return FileStorageService.instance;
  }

  // Сохранить изображение
  async saveImage(base64Data: string, fileName: string): Promise<string> {
    const matches = base64Data.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
    if (!matches || matches.length !== 3) {
      throw new Error('Invalid base64 string');
    }

    const imageBuffer = Buffer.from(matches[2], 'base64');
    const filePath = path.join(this.basePath, `${Date.now()}_${fileName}`);
    
    await fs.promises.writeFile(filePath, imageBuffer);
    return filePath; // Возвращаем путь к файлу
  }

  // Получить изображение
  async getImage(filePath: string): Promise<Buffer> {
    return await fs.promises.readFile(filePath);
  }

  // Удалить изображение
  async deleteImage(filePath: string): Promise<void> {
    if (fs.existsSync(filePath)) {
      await fs.promises.unlink(filePath);
    }
  }
}