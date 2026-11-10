"use client";

import { useState } from "react";
import { Icon } from "@/components/ui/icons";

type Props = {
  qr: string;
  orgName: string;
  eventTitle: string;
  participant: string;
  when: string;
  location: string;
  registrationNumber: string;
};

/** Renders the ticket to a PNG in the browser so it can be saved and used offline. */
export function DownloadTicketButton(p: Props) {
  const [busy, setBusy] = useState(false);

  async function download() {
    setBusy(true);
    try {
      const img = new Image();
      img.src = p.qr;
      await img.decode();

      const W = 900;
      const H = 1400;
      const canvas = document.createElement("canvas");
      canvas.width = W;
      canvas.height = H;
      const c = canvas.getContext("2d")!;
      const brand = getComputedStyle(document.documentElement).getPropertyValue("--brand").trim() || "#1F5D45";

      c.fillStyle = "#ffffff";
      c.fillRect(0, 0, W, H);
      c.fillStyle = brand;
      c.fillRect(0, 0, W, 300);
      c.textAlign = "center";
      c.fillStyle = "rgba(255,255,255,.8)";
      c.font = "600 26px system-ui, sans-serif";
      c.fillText(p.orgName.toUpperCase(), W / 2, 84);
      c.fillStyle = "#fff";
      c.font = "600 54px Georgia, serif";
      wrap(c, p.eventTitle.toUpperCase(), W / 2, 170, W - 120, 64);

      c.fillStyle = "#24302a";
      c.font = "600 46px Georgia, serif";
      c.fillText(p.participant.toUpperCase(), W / 2, 400);
      c.font = "600 32px system-ui, sans-serif";
      c.fillText(p.when, W / 2, 458);
      c.fillStyle = "#55635a";
      c.font = "28px system-ui, sans-serif";
      c.fillText(p.location, W / 2, 504);

      c.drawImage(img, (W - 640) / 2, 560, 640, 640);
      c.fillStyle = "#55635a";
      c.font = "600 22px system-ui, sans-serif";
      c.fillText("REGISTRATION ID", W / 2, 1258);
      c.fillStyle = "#24302a";
      c.font = "600 44px ui-monospace, Menlo, monospace";
      c.fillText(p.registrationNumber, W / 2, 1316);

      const a = document.createElement("a");
      a.href = canvas.toDataURL("image/png");
      a.download = `ticket-${p.registrationNumber}.png`;
      a.click();
    } finally {
      setBusy(false);
    }
  }

  return (
    <button type="button" onClick={download} disabled={busy} className="btn-secondary w-full">
      <Icon name="download" />
      {busy ? "Preparing…" : "Download Ticket"}
    </button>
  );
}

function wrap(c: CanvasRenderingContext2D, text: string, x: number, y: number, maxWidth: number, lineHeight: number) {
  const words = text.split(" ");
  let line = "";
  for (const w of words) {
    const test = line ? `${line} ${w}` : w;
    if (c.measureText(test).width > maxWidth && line) {
      c.fillText(line, x, y);
      line = w;
      y += lineHeight;
    } else line = test;
  }
  c.fillText(line, x, y);
}
