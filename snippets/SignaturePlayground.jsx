import React, { useEffect, useMemo, useState } from "react";

const stripPem = (pem) => pem.replace(/-----[^-]+-----/g, "").replace(/\s+/g, "");
const pemToArrayBuffer = (pem) => {
    const binary = atob(stripPem(pem));
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return bytes.buffer;
};
const b64 = (ab) => {
    const arr = new Uint8Array(ab);
    let bin = "";
    for (let i = 0; i < arr.length; i++) bin += String.fromCharCode(arr[i]);
    return btoa(bin);
};

const importPrivateKeyPKCS8 = async (pem) =>
    crypto.subtle.importKey("pkcs8", pemToArrayBuffer(pem),
        { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["sign"]);

const importPublicKeySPKI = async (pem) =>
    crypto.subtle.importKey("spki", pemToArrayBuffer(pem),
        { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["verify"]);

export const SignaturePlayground = () => {
    const [reference, setReference] = useState("TXN213687756272200");
    const [amount, setAmount] = useState("1000");
    const [country, setCountry] = useState("KE");
    const [serviceCode, setServiceCode] = useState("MPESAB2C");
    const [privateKey, setPrivateKey] = useState("");
    const [publicKey, setPublicKey] = useState("");
    const [signature, setSignature] = useState("");
    const [verified, setVerified] = useState(null);
    const [err, setErr] = useState(null);
    const [busy, setBusy] = useState(false);

    const stringToSign = useMemo(
        () => `${reference.trim()}${amount.trim()}${country.trim()}${serviceCode.trim()}`,
        [reference, amount, country, serviceCode]
    );

    useEffect(() => setVerified(null), [stringToSign]);

    const sign = async () => {
        setErr(null);
        setVerified(null);
        setBusy(true);
        try {
            if (!privateKey.trim()) throw new Error("Paste a PKCS#8 private key PEM");
            const key = await importPrivateKeyPKCS8(privateKey);
            const data = new TextEncoder().encode(stringToSign);
            const sig = await crypto.subtle.sign({ name: "RSASSA-PKCS1-v1_5" }, key, data);
            setSignature(b64(sig));
        } catch (e) {
            setErr(e?.message || "Signing failed");
        } finally {
            setBusy(false);
        }
    };

    const verify = async () => {
        setErr(null);
        setBusy(true);
        try {
            if (!publicKey.trim()) throw new Error("Paste an SPKI public key PEM");
            if (!signature) throw new Error("Generate a signature first");
            const key = await importPublicKeySPKI(publicKey);
            const data = new TextEncoder().encode(stringToSign);
            const sigBytes = Uint8Array.from(atob(signature), c => c.charCodeAt(0));
            const ok = await crypto.subtle.verify({ name: "RSASSA-PKCS1-v1_5" }, key, sigBytes, data);
            setVerified(ok);
        } catch (e) {
            setErr(e?.message || "Verification failed");
            setVerified(false);
        } finally {
            setBusy(false);
        }
    };

    const header = signature ? `X-Custom-Signature: ${signature}` : "";
    const curl = signature
        ? `curl -X POST "$BASE_URL/payments-api-service/v1/payouts" \
  -H "Authorization: Bearer $PAYOUT_TOKEN" \
  -H "X-Custom-Signature: ${signature}" \
  -H "Content-Type: application/json" \
  --data @payout.json`
        : "";

    return (
        <div className="not-prose my-4 rounded-lg border p-4">
            <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                    <div className="text-xs font-medium">Payload fields (used in signature)</div>
                    <input className="w-full rounded border p-2 text-sm" placeholder="transaction.reference"
                           value={reference} onChange={e => setReference(e.target.value)} />
                    <input className="w-full rounded border p-2 text-sm" placeholder="transaction.amount"
                           value={amount} onChange={e => setAmount(e.target.value)} />
                    <input className="w-full rounded border p-2 text-sm" placeholder="originator.country"
                           value={country} onChange={e => setCountry(e.target.value)} />
                    <input className="w-full rounded border p-2 text-sm" placeholder="transaction.service_code"
                           value={serviceCode} onChange={e => setServiceCode(e.target.value)} />

                    <div className="text-xs mt-3 font-medium">String to sign</div>
                    <textarea className="w-full h-20 rounded border p-2 font-mono text-xs" readOnly value={stringToSign} />
                </div>

                <div className="space-y-2">
                    <div className="text-xs font-medium">Private Key (PKCS#8 PEM)</div>
                    <textarea className="w-full h-28 rounded border p-2 font-mono text-xs"
                              placeholder="-----BEGIN PRIVATE KEY-----"
                              value={privateKey} onChange={e => setPrivateKey(e.target.value)} />

                    <button onClick={sign} disabled={busy}
                            className="rounded border px-3 py-2 text-sm hover:bg-neutral-50 disabled:opacity-50">
                        {busy ? "Signing…" : "Generate signature"}
                    </button>

                    <div className="text-xs font-medium mt-2">X-Custom-Signature</div>
                    <textarea className="w-full h-20 rounded border p-2 font-mono text-xs" readOnly value={signature} />

                    <div className="text-xs font-medium mt-2">Public Key (SPKI PEM, optional verify)</div>
                    <textarea className="w-full h-28 rounded border p-2 font-mono text-xs"
                              placeholder="-----BEGIN PUBLIC KEY-----"
                              value={publicKey} onChange={e => setPublicKey(e.target.value)} />

                    <button onClick={verify} disabled={busy || !signature}
                            className="rounded border px-3 py-2 text-sm hover:bg-neutral-50 disabled:opacity-50">
                        {busy ? "Verifying…" : "Verify signature"}
                    </button>

                    {verified !== null && (
                        <div className={`text-sm ${verified ? "text-green-600" : "text-red-600"}`}>
                            {verified ? "Signature verified ✅" : "Signature invalid ❌"}
                        </div>
                    )}

                    {err && <div className="text-sm text-red-600">{err}</div>}

                    <div className="text-xs font-medium mt-3">Copy header</div>
                    <textarea className="w-full h-14 rounded border p-2 font-mono text-xs" readOnly value={header} />

                    <div className="text-xs font-medium mt-3">Optional cURL (paste into your terminal)</div>
                    <textarea className="w-full h-28 rounded border p-2 font-mono text-xs" readOnly value={curl} />
                </div>
            </div>

            <div className="mt-4 text-xs opacity-80">
                Uses Web Crypto (RSASSA-PKCS1-v1_5 + SHA-256). For production, sign server-side.
            </div>
        </div>
    );
};
