import React, { useState } from "react";

const ab2b64 = (ab) => {
    const bytes = new Uint8Array(ab);
    let s = "";
    for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
    return btoa(s);
};

const toPem = (b64, label) =>
    `-----BEGIN ${label}-----\n${b64.match(/.{1,64}/g)?.join("\n")}\n-----END ${label}-----`;

const spkiToPem = (spki) => toPem(ab2b64(spki), "PUBLIC KEY");
const pkcs8ToPem = (pkcs8) => toPem(ab2b64(pkcs8), "PRIVATE KEY");

export const KeygenPlayground = () => {
    const [pub, setPub] = useState("");
    const [priv, setPriv] = useState("");
    const [busy, setBusy] = useState(false);
    const [err, setErr] = useState(null);

    const generate = async () => {
        setBusy(true);
        setErr(null);
        try {
            const kp = await crypto.subtle.generateKey(
                {
                    name: "RSASSA-PKCS1-v1_5",
                    modulusLength: 2048,
                    publicExponent: new Uint8Array([1, 0, 1]),
                    hash: "SHA-256",
                },
                true,
                ["sign", "verify"]
            );
            const spki = await crypto.subtle.exportKey("spki", kp.publicKey);
            const pkcs8 = await crypto.subtle.exportKey("pkcs8", kp.privateKey);
            setPub(spkiToPem(spki));
            setPriv(pkcs8ToPem(pkcs8));
        } catch (e) {
            setErr(e?.message || "Key generation failed");
        } finally {
            setBusy(false);
        }
    };

    return (
        <div className="not-prose my-4 rounded-lg border p-4">
            <div className="text-sm opacity-80 mb-2">
                Demo-only keys. For production, use OpenSSL or your KMS and store the private key securely.
            </div>
            <button
                onClick={generate}
                disabled={busy}
                className="rounded border px-3 py-2 text-sm hover:bg-neutral-50 disabled:opacity-50"
            >
                {busy ? "Generating…" : "Generate RSA 2048 Key Pair"}
            </button>
            {err && <div className="mt-3 text-sm text-red-600">{err}</div>}
            <div className="mt-4 grid gap-4 md:grid-cols-2">
                <div>
                    <div className="text-xs font-medium">Public Key (SPKI PEM)</div>
                    <textarea className="mt-1 h-48 w-full rounded border p-2 font-mono text-xs" readOnly value={pub} />
                </div>
                <div>
                    <div className="text-xs font-medium">Private Key (PKCS#8 PEM)</div>
                    <textarea className="mt-1 h-48 w-full rounded border p-2 font-mono text-xs" readOnly value={priv} />
                </div>
            </div>
        </div>
    );
};