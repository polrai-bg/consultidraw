export interface Client {
  id: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
  drawingCount: number;
}

export interface Folder {
  id: string;
  name: string;
  parentId: string | null; // null = root level under client
  createdAt: Date;
  updatedAt: Date;
}

export interface Drawing {
  id: string;
  name: string;
  folderId: string | null; // null = root level under client
  createdAt: Date;
  updatedAt: Date;
}
