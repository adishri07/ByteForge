// Turns an uploaded guideline file (PDF, DOCX or TXT) into plain text.
// Owner: Member 2

export const MAX_GUIDELINE_BYTES = 4 * 1024 * 1024; // 4 MB (Vercel's request limit is 4.5 MB)

export class UserFacingError extends Error {}

export async function parseDocument(bytes: Buffer, filename: string): Promise<string> {
  const name = filename.toLowerCase();
  if (bytes.length === 0) throw new UserFacingError("The file is empty.");
  if (bytes.length > MAX_GUIDELINE_BYTES) throw new UserFacingError("The file is larger than 4 MB. Please upload a smaller file.");

  let text = "";
  try {
    if (name.endsWith(".pdf")) {
      const { extractText, getDocumentProxy } = await import("unpdf");
      const pdf = await getDocumentProxy(new Uint8Array(bytes));
      const result = await extractText(pdf, { mergePages: true });
      text = Array.isArray(result.text) ? result.text.join("\n") : result.text;
    } else if (name.endsWith(".docx")) {
      const mammoth = await import("mammoth");
      const result = await mammoth.extractRawText({ buffer: bytes });
      text = result.value;
    } else if (name.endsWith(".txt") || name.endsWith(".md")) {
      text = bytes.toString("utf8");
    } else {
      throw new UserFacingError("Please upload a PDF, DOCX or TXT file.");
    }
  } catch (err) {
    if (err instanceof UserFacingError) throw err;
    console.error("parseDocument failed:", err);
    throw new UserFacingError("We couldn't read this file. It may be damaged or password-protected. Try saving it again as PDF or DOCX.");
  }

  text = text.replace(/\u0000/g, "").replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
  if (text.length < 50) {
    throw new UserFacingError("We couldn't find enough text in this file. If it's a scanned PDF (a picture of text), please upload a text-based PDF or DOCX.");
  }
  return text;
}
