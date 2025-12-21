import html2canvas from 'html2canvas';

export async function captureScreenshot(
  element: HTMLElement,
  filename: string = 'screenshot.png',
  options?: {
    width?: number;
    height?: number;
    scale?: number;
  }
): Promise<Blob | null> {
  try {
    const canvas = await html2canvas(element, {
      width: options?.width || 1200,
      height: options?.height || 630,
      scale: options?.scale || 2,
      logging: false,
      useCORS: true
    });

    return new Promise((resolve) => {
      canvas.toBlob((blob) => {
        if (blob) {
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = filename;
          a.click();
          URL.revokeObjectURL(url);
        }
        resolve(blob);
      }, 'image/png', 0.95);
    });
  } catch (error) {
    console.error('Screenshot capture failed:', error);
    return null;
  }
}

export async function uploadScreenshotToSupabase(
  blob: Blob,
  filename: string,
  supabase: any
): Promise<string | null> {
  try {
    const { data, error } = await supabase.storage
      .from('screenshots')
      .upload(filename, blob, {
        contentType: 'image/png',
        upsert: true
      });

    if (error) throw error;

    const { data: publicUrl } = supabase.storage
      .from('screenshots')
      .getPublicUrl(filename);

    return publicUrl.publicUrl;
  } catch (error) {
    console.error('Upload failed:', error);
    return null;
  }
}
