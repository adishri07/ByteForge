// Shows an uploaded image with the text found in it and its alt text.
// Owner: Member 4
/* eslint-disable @next/next/no-img-element */
export default function ImagePreview({ url, text, altText }: { url: string | null; text: string; altText: string | null }) {
  return (
    <div className="space-y-3">
      {url ? (
        <img src={url} alt={altText || "Uploaded image being checked"} className="max-h-96 w-full rounded-lg border border-slate-200 object-contain" />
      ) : (
        <p className="rounded-lg bg-slate-100 p-4 text-sm text-slate-600">Image preview unavailable.</p>
      )}
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Text found in the image</p>
        <p className="whitespace-pre-wrap text-slate-900">{text}</p>
      </div>
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Alt text</p>
        <p className="text-slate-900">{altText || <span className="italic text-slate-500">None provided</span>}</p>
      </div>
    </div>
  );
}
