/**
 * End-to-end encryption for Beacon, built entirely on the browser's native
 * WebCrypto API (no third-party crypto libraries).
 *
 * Design (simplified compared to the full Signal protocol — no per-message
 * ratcheting or forward secrecy across sessions, but genuinely real crypto):
 *
 * 1. Each browser generates its own ECDH (P-256) keypair the first time a
 *    user signs in there. The private key never leaves the browser
 *    (stored in localStorage); the public key is uploaded to the server.
 * 2. To send a message, the sender generates a fresh random AES-256-GCM
 *    key and encrypts the plaintext with it.
 * 3. That AES key is then "wrapped" (encrypted) once per conversation
 *    member, using an ECDH shared secret between the sender's private key
 *    and that member's public key. The server stores only ciphertext and
 *    wrapped keys — it never sees plaintext or the raw AES key.
 *
 * Limitation: because keys are per-browser (not synced across devices),
 * signing in on a new browser starts a new identity — old messages sent
 * to the previous keypair can't be decrypted there. This mirrors the
 * real tradeoff of "linked device" key distribution, simplified.
 *
 * This file has three sections, each built on the one before:
 *   - Primitives:   raw WebCrypto key generation / wrap / encrypt / decrypt
 *   - Identity:     generating and persisting this browser's keypair
 *   - Messages:     encrypt-for-conversation / decrypt-incoming orchestration
 */

import { apiPut } from "@/lib/api";
import { useAuthStore } from "@/store/authStore";
import type { ConversationMember } from "@/types/conversation";
import type { Message } from "@/types/message";

// ---------------------------------------------------------------------------
// Primitives
// ---------------------------------------------------------------------------

const EC_PARAMS: EcKeyGenParams = { name: "ECDH", namedCurve: "P-256" };

function bufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

function base64ToBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}

export interface EncryptedPayload {
  ciphertext: string;
  iv: string;
}

/** Generate a fresh ECDH P-256 keypair and export the public half as base64 SPKI. */
async function generateKeyPair(): Promise<{
  privateKey: CryptoKey;
  publicKey: CryptoKey;
  publicKeyBase64: string;
}> {
  const keyPair = await crypto.subtle.generateKey(EC_PARAMS, true, ["deriveKey", "deriveBits"]);
  const spki = await crypto.subtle.exportKey("spki", keyPair.publicKey);
  return {
    privateKey: keyPair.privateKey,
    publicKey: keyPair.publicKey,
    publicKeyBase64: bufferToBase64(spki),
  };
}

/** Export a private key as base64 PKCS8, for storage in localStorage. */
async function exportPrivateKey(privateKey: CryptoKey): Promise<string> {
  const pkcs8 = await crypto.subtle.exportKey("pkcs8", privateKey);
  return bufferToBase64(pkcs8);
}

/** Re-import a private key previously exported with {@link exportPrivateKey}. */
async function importPrivateKey(base64: string): Promise<CryptoKey> {
  return crypto.subtle.importKey("pkcs8", base64ToBuffer(base64), EC_PARAMS, true, [
    "deriveKey",
    "deriveBits",
  ]);
}

/** Import a peer's base64 SPKI-encoded public key. */
async function importPublicKey(base64: string): Promise<CryptoKey> {
  return crypto.subtle.importKey("spki", base64ToBuffer(base64), EC_PARAMS, true, []);
}

/** Derive a symmetric AES-GCM "wrapping" key shared between two ECDH keypairs. */
async function deriveSharedKey(privateKey: CryptoKey, peerPublicKey: CryptoKey): Promise<CryptoKey> {
  return crypto.subtle.deriveKey(
    { name: "ECDH", public: peerPublicKey },
    privateKey,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

/** Generate a fresh, extractable random AES-256-GCM content key for one message. */
async function generateContentKey(): Promise<CryptoKey> {
  return crypto.subtle.generateKey({ name: "AES-GCM", length: 256 }, true, ["encrypt", "decrypt"]);
}

/** Encrypt plaintext with a content key, returning base64 ciphertext + nonce. */
async function encryptWithKey(key: CryptoKey, plaintext: string): Promise<EncryptedPayload> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encoded = new TextEncoder().encode(plaintext);
  const ciphertext = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, encoded);
  return { ciphertext: bufferToBase64(ciphertext), iv: bufferToBase64(iv.buffer) };
}

/** Decrypt a base64 ciphertext + nonce pair with a content key. */
async function decryptWithKey(key: CryptoKey, ciphertext: string, iv: string): Promise<string> {
  const plainBuffer = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: base64ToBuffer(iv) },
    key,
    base64ToBuffer(ciphertext)
  );
  return new TextDecoder().decode(plainBuffer);
}

/**
 * Wrap (encrypt) a message's raw content key for one recipient, using the
 * ECDH shared secret between the sender's private key and the recipient's
 * public key.
 */
async function wrapContentKey(
  senderPrivateKey: CryptoKey,
  recipientPublicKeyBase64: string,
  contentKey: CryptoKey
): Promise<EncryptedPayload> {
  const recipientPublicKey = await importPublicKey(recipientPublicKeyBase64);
  const wrappingKey = await deriveSharedKey(senderPrivateKey, recipientPublicKey);
  const rawKey = await crypto.subtle.exportKey("raw", contentKey);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const wrapped = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, wrappingKey, rawKey);
  return { ciphertext: bufferToBase64(wrapped), iv: bufferToBase64(iv.buffer) };
}

/**
 * Unwrap a recipient's own wrapped content key using the ECDH shared
 * secret between their private key and the sender's public key.
 */
async function unwrapContentKey(
  recipientPrivateKey: CryptoKey,
  senderPublicKeyBase64: string,
  wrappedKey: string,
  wrapIv: string
): Promise<CryptoKey> {
  const senderPublicKey = await importPublicKey(senderPublicKeyBase64);
  const wrappingKey = await deriveSharedKey(recipientPrivateKey, senderPublicKey);
  const rawKey = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: base64ToBuffer(wrapIv) },
    wrappingKey,
    base64ToBuffer(wrappedKey)
  );
  return crypto.subtle.importKey("raw", rawKey, { name: "AES-GCM" }, false, ["encrypt", "decrypt"]);
}

// ---------------------------------------------------------------------------
// Identity — generating and persisting this browser's keypair
// ---------------------------------------------------------------------------

const PRIVATE_KEY_PREFIX = "beacon_e2e_private_key_";
const PUBLIC_KEY_PREFIX = "beacon_e2e_public_key_";

let cachedPrivateKey: CryptoKey | null = null;
let cachedForUserId: string | null = null;

function privateKeyStorageKey(userId: string): string {
  return `${PRIVATE_KEY_PREFIX}${userId}`;
}

function publicKeyStorageKey(userId: string): string {
  return `${PUBLIC_KEY_PREFIX}${userId}`;
}

/**
 * Return this browser's private key for the given user, generating and
 * persisting a new keypair on first use. Registers the public key with
 * the server if it isn't already up to date.
 */
export async function ensureKeyPair(
  userId: string,
  serverPublicKey: string | null
): Promise<CryptoKey> {
  if (cachedPrivateKey && cachedForUserId === userId) return cachedPrivateKey;

  const storedPrivate = localStorage.getItem(privateKeyStorageKey(userId));
  const storedPublic = localStorage.getItem(publicKeyStorageKey(userId));

  if (storedPrivate && storedPublic) {
    cachedPrivateKey = await importPrivateKey(storedPrivate);
    cachedForUserId = userId;
    if (serverPublicKey !== storedPublic) {
      await apiPut("/api/users/me/public-key", { public_key: storedPublic });
    }
    return cachedPrivateKey;
  }

  const { privateKey, publicKeyBase64 } = await generateKeyPair();
  const exportedPrivate = await exportPrivateKey(privateKey);
  localStorage.setItem(privateKeyStorageKey(userId), exportedPrivate);
  localStorage.setItem(publicKeyStorageKey(userId), publicKeyBase64);
  await apiPut("/api/users/me/public-key", { public_key: publicKeyBase64 });

  cachedPrivateKey = privateKey;
  cachedForUserId = userId;
  return privateKey;
}

/** Clear the cached in-memory key (called on logout). Stored keys remain on disk. */
export function clearKeyCache(): void {
  cachedPrivateKey = null;
  cachedForUserId = null;
}

// ---------------------------------------------------------------------------
// Messages — encrypt-for-conversation / decrypt-incoming orchestration
// ---------------------------------------------------------------------------

export interface EncryptedOutgoing {
  content: string;
  iv: string;
  isEncrypted: true;
  recipientKeys: { userId: string; wrappedKey: string; wrapIv: string }[];
}

/**
 * Encrypt outgoing plaintext for every conversation member, if (and only
 * if) every member has registered an E2EE public key. Members who have
 * never signed in from a browser (e.g. seeded demo accounts) have no key
 * yet, in which case the caller should fall back to sending plaintext —
 * that's a deliberate degrade-gracefully choice for the demo dataset,
 * not a silent security compromise for real accounts.
 */
export async function tryEncryptForMembers(
  members: ConversationMember[],
  plaintext: string
): Promise<EncryptedOutgoing | null> {
  const user = useAuthStore.getState().user;
  if (!user || members.length === 0 || members.some((m) => !m.user.publicKey)) {
    return null;
  }

  const privateKey = await ensureKeyPair(user.id, user.publicKey);
  const contentKey = await generateContentKey();
  const { ciphertext, iv } = await encryptWithKey(contentKey, plaintext);

  const recipientKeys = await Promise.all(
    members.map(async (member) => {
      const wrapped = await wrapContentKey(privateKey, member.user.publicKey as string, contentKey);
      return { userId: member.userId, wrappedKey: wrapped.ciphertext, wrapIv: wrapped.iv };
    })
  );

  return { content: ciphertext, iv, isEncrypted: true, recipientKeys };
}

const UNDECRYPTABLE_PLACEHOLDER = "[Unable to decrypt this message]";

interface DecryptParams {
  content: string;
  iv: string | null;
  senderPublicKey: string | null;
  recipientKey: { wrappedKey: string; wrapIv: string } | null;
}

/**
 * Core decrypt primitive shared by full messages and conversation-list
 * previews: unwrap this user's copy of the content key using the sender's
 * public key, then decrypt the ciphertext. Returns a placeholder string
 * (never throws) if any piece needed to decrypt is missing.
 */
async function decryptCiphertext({
  content,
  iv,
  senderPublicKey,
  recipientKey,
}: DecryptParams): Promise<string> {
  const user = useAuthStore.getState().user;
  if (!user || !recipientKey || !senderPublicKey || !iv) {
    return UNDECRYPTABLE_PLACEHOLDER;
  }

  try {
    const privateKey = await ensureKeyPair(user.id, user.publicKey);
    const contentKey = await unwrapContentKey(
      privateKey,
      senderPublicKey,
      recipientKey.wrappedKey,
      recipientKey.wrapIv
    );
    return await decryptWithKey(contentKey, content, iv);
  } catch {
    return UNDECRYPTABLE_PLACEHOLDER;
  }
}

/**
 * Decrypt an incoming message in place, if it's encrypted and this user
 * has a wrapped copy of its content key. Plaintext (unencrypted) messages
 * pass through unchanged.
 */
export async function decryptIncoming(message: Message): Promise<Message> {
  if (!message.isEncrypted) return message;
  const content = await decryptCiphertext({
    content: message.content,
    iv: message.iv,
    senderPublicKey: message.sender.publicKey,
    recipientKey: message.recipientKey,
  });
  return { ...message, content };
}

export interface EncryptedPreviewInput {
  content: string;
  isEncrypted: boolean;
  iv: string | null;
  senderPublicKey: string | null;
  recipientKey: { wrappedKey: string; wrapIv: string } | null;
}

/**
 * Decrypt a conversation summary's last-message preview for the sidebar.
 * The server can't build this preview itself (it never sees plaintext),
 * so the client decrypts using the same per-recipient wrapped key scheme
 * as the full message list.
 */
export async function decryptPreview(input: EncryptedPreviewInput): Promise<string> {
  if (!input.isEncrypted) return input.content;
  return decryptCiphertext({
    content: input.content,
    iv: input.iv,
    senderPublicKey: input.senderPublicKey,
    recipientKey: input.recipientKey,
  });
}
