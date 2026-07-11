import { apiClient } from "@/lib/api";

export interface UploadResult {
  url: string;
  filename: string;
  mimeType: string;
  size: number;
}

/** Upload an image or video file (used for story media). */
export async function uploadFile(file: File): Promise<UploadResult> {
  const formData = new FormData();
  formData.append("file", file);
  const response = await apiClient.post("/api/uploads/", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return {
    url: response.data.url,
    filename: response.data.filename,
    mimeType: response.data.mime_type,
    size: response.data.size,
  };
}
