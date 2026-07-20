/**
 * Extract plain text from an uploaded resume (PDF / DOCX / TXT).
 *
 * Runs in a page context (onboarding), not the service worker, because both
 * pdf.js and mammoth expect a full DOM/worker environment. The extracted text
 * is then sent to the background worker for LLM parsing.
 */
export async function extractResumeText(file: File): Promise<string> {
  const name = file.name.toLowerCase();
  if (name.endsWith('.pdf') || file.type === 'application/pdf') {
    return extractPdf(file);
  }
  if (name.endsWith('.docx') || file.type.includes('word')) {
    return extractDocx(file);
  }
  // Plain text / markdown / rtf fallback.
  return file.text();
}

async function extractPdf(file: File): Promise<string> {
  const pdfjs = await import('pdfjs-dist');
  // The worker file is copied to the extension root by the build; resolve it as
  // a packaged resource. This works from any extension page (e.g. onboarding).
  pdfjs.GlobalWorkerOptions.workerSrc = chrome.runtime.getURL('pdf.worker.min.mjs');

  const buffer = await file.arrayBuffer();
  const doc = await pdfjs.getDocument({ data: buffer }).promise;
  const pages: string[] = [];
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    pages.push(
      content.items
        .map((item) => ('str' in item ? item.str : ''))
        .join(' '),
    );
  }
  return pages.join('\n\n');
}

async function extractDocx(file: File): Promise<string> {
  const mammoth = await import('mammoth');
  const buffer = await file.arrayBuffer();
  const { value } = await mammoth.extractRawText({ arrayBuffer: buffer });
  return value;
}
