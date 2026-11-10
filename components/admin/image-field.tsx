"use client";

import { useId, useRef, useState } from "react";
import { CoverImage } from "@/components/ui/client";
import { Icon } from "@/components/ui/icons";

/** Shrinks big phone/camera photos in the browser before upload (keeps PNG transparency for logos). */
async function downscale(file: File, maxEdge: number): Promise<Blob> {
  if (file.type === "image/gif") return file; // animated GIFs are sent as they are
  const bitmap = await createImageBitmap(file).catch(() => null);
  if (!bitmap) return file;
  const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height));
  if (scale === 1 && file.size < 900_000) return file;
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  const keepAlpha = file.type === "image/png";
  return await new Promise<Blob>((resolve) => canvas.toBlob((b) => resolve(b ?? file), keepAlpha ? "image/png" : "image/jpeg", 0.86));
}

/**
 * Image input: paste a URL or upload from your computer. Uploaded files are stored by the app itself
 * and the field then holds the resulting /api/uploads/… address, so it submits with the form like any text field.
 */
export function ImageField({
  name,
  label,
  defaultValue = "",
  hint,
  maxEdge = 1800,
  shape = "wide",
}: {
  name: string;
  label: string;
  defaultValue?: string;
  hint?: string;
  maxEdge?: number;
  shape?: "wide" | "square";
}) {
  const id = useId();
  const [value, setValue] = useState(defaultValue);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function pick(file: File | undefined) {
    if (!file) return;
    setError(null);
    if (!/^image\/(jpeg|png|webp|gif)$/.test(file.type)) return setError("Use a JPG, PNG, WebP or GIF image.");
    setBusy(true);
    try {
      const blob = await downscale(file, maxEdge);
      const fd = new FormData();
      fd.append("file", blob, file.name);
      const res = await fetch("/api/uploads", { method: "POST", body: fd });
      const data = (await res.json().catch(() => ({}))) as { url?: string; error?: string };
      if (!res.ok || !data.url) throw new Error(data.error ?? "Upload failed. Please try again.");
      setValue(data.url);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed. Please try again.");
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  return (
    <div>
      <label htmlFor={id} className="label">{label}</label>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
        {value ? (
          <CoverImage src={value} alt={`${label} preview`} className={`shrink-0 rounded-xl bg-paper ${shape === "square" ? "size-24" : "h-24 w-40"}`} />
        ) : (
          <div className={`grid shrink-0 place-items-center rounded-xl border border-dashed border-line-strong bg-paper text-muted ${shape === "square" ? "size-24" : "h-24 w-40"}`} aria-hidden="true">
            <Icon name="leaf" className="size-6" />
          </div>
        )}
        <div className="min-w-0 flex-1 space-y-2">
          <input id={id} name={name} value={value} onChange={(e) => setValue(e.target.value)} placeholder="Paste an image address, or upload a file" className="input" aria-describedby={`${id}-hint`} />
          <div className="flex flex-wrap items-center gap-2">
            <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="sr-only" id={`${id}-file`} onChange={(e) => pick(e.target.files?.[0])} />
            <label htmlFor={`${id}-file`} className={`btn-secondary btn-sm cursor-pointer ${busy ? "pointer-events-none opacity-60" : ""}`}>
              <Icon name="download" className="size-4 rotate-180" /> {busy ? "Uploading…" : "Upload image"}
            </label>
            {value && (
              <button type="button" className="btn-ghost btn-sm !text-danger" onClick={() => setValue("")}>Remove</button>
            )}
          </div>
          <p id={`${id}-hint`} className="hint !mt-0">{hint ?? "JPG, PNG, WebP or GIF, up to 3 MB. Large photos are shrunk automatically."}</p>
          {error && <p role="alert" className="field-error">{error}</p>}
        </div>
      </div>
    </div>
  );
}
