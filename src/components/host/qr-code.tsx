"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";

export function QrCode({ value, size = 240 }: { value: string; size?: number }) {
  const [dataUrl, setDataUrl] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    QRCode.toDataURL(value, {
      width: size,
      margin: 1,
      color: { dark: "#06060a", light: "#f4f5fb" },
    })
      .then((url) => active && setDataUrl(url))
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [value, size]);

  if (!dataUrl) {
    return <div className="animate-pulse rounded-xl bg-white/10" style={{ width: size, height: size }} />;
  }

  // eslint-disable-next-line @next/next/no-img-element
  return <img src={dataUrl} alt="QR code to join the game" width={size} height={size} className="rounded-xl bg-white p-2" />;
}
