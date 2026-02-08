import { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import * as Dialog from '@radix-ui/react-dialog';
import { Copy, Check, Loader2, X } from 'lucide-react';

interface ShareDialogProps {
  open: boolean;
  onClose: () => void;
  onShare: (makePrivate: boolean) => Promise<string>;
  shareUrl?: string;
  isSharing?: boolean;
  isPrivate?: boolean;
  // ENS props
  onSaveToENS?: (ensName: string, cid: string, encryptionKey?: string) => Promise<string>;
  isSavingENS?: boolean;
  ensSaveError?: string | null;
  ensSaveSuccess?: boolean;
  ensTxHash?: string | null;
  onLoadFromENS?: (ensName: string) => Promise<void>;
  isLoadingENS?: boolean;
  ensLoadError?: string | null;
  onResetENS?: () => void;
  // We need the raw CID + encryptionKey to pass to ENS save
  lastCid?: string;
  lastEncryptionKey?: string;
}

export function ShareDialog({
  open,
  onClose,
  onShare,
  shareUrl,
  isSharing = false,
  isPrivate = false,
  onSaveToENS,
  isSavingENS = false,
  ensSaveError,
  ensSaveSuccess = false,
  ensTxHash,
  onLoadFromENS,
  isLoadingENS = false,
  ensLoadError,
  onResetENS,
  lastCid,
  lastEncryptionKey,
}: ShareDialogProps) {
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ensNameSave, setEnsNameSave] = useState('');
  const [ensNameLoad, setEnsNameLoad] = useState('');

  const handleShare = async () => {
    try {
      setError(null);
      await onShare(true); // Always encrypted
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to share flow');
    }
  };

  const copyToClipboard = async () => {
    if (!shareUrl) return;

    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy to clipboard:', err);
    }
  };

  const handleClose = () => {
    setCopied(false);
    setError(null);
    setEnsNameSave('');
    setEnsNameLoad('');
    onResetENS?.();
    onClose();
  };

  const handleENSSave = async () => {
    if (!onSaveToENS || !ensNameSave.trim() || !lastCid) return;
    try {
      await onSaveToENS(ensNameSave.trim(), lastCid, lastEncryptionKey);
    } catch {
      // Error state is managed by the hook
    }
  };

  const handleENSLoad = async () => {
    if (!onLoadFromENS || !ensNameLoad.trim()) return;
    try {
      await onLoadFromENS(ensNameLoad.trim());
    } catch {
      // Error state is managed by the hook
    }
  };

  // If we don't have a share URL yet, show the create share screen
  if (!shareUrl) {
    return (
      <Dialog.Root open={open} onOpenChange={(o) => !o && handleClose()}>
        <Dialog.Portal>
          <Dialog.Overlay
            className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0"
          />
          <Dialog.Content
            className="fixed left-[50%] top-[50%] z-[101] w-[95vw] max-w-md translate-x-[-50%] translate-y-[-50%] rounded-2xl border shadow-2xl border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900 flex flex-col overflow-hidden max-h-[90vh] data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95"
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <Dialog.Title className="text-lg font-semibold text-gray-900 dark:text-white">
                Share Suiquence
              </Dialog.Title>
              <Dialog.Close asChild>
                <button
                  type="button"
                  className="rounded p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white transition-colors"
                  aria-label="Close"
                  disabled={isSharing || isLoadingENS}
                >
                  <X className="h-5 w-5" />
                </button>
              </Dialog.Close>
            </div>

            <div className="flex flex-col overflow-y-auto">
              <div className="px-6 py-4 space-y-4">
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  Your flow will be encrypted and uploaded to IPFS. Only people
                  with the generated link can decrypt and load your flow.
                </p>

                {error && (
                  <div className="rounded-lg bg-red-50 border border-red-200 dark:bg-red-900/30 dark:border-red-700 p-3">
                    <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
                  </div>
                )}

                <div className="flex justify-end gap-2 pt-4">
                  <button
                    onClick={handleClose}
                    disabled={isSharing}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 dark:text-gray-300 dark:bg-gray-800 dark:hover:bg-gray-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleShare}
                    disabled={isSharing}
                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {isSharing ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Uploading to IPFS...
                      </>
                    ) : (
                      'Create Share Link'
                    )}
                  </button>
                </div>

                {/* Load from ENS / SuiNS */}
                {onLoadFromENS && (
                  <>
                    <div className="flex items-center gap-3 pt-2">
                      <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
                      <span className="text-xs text-gray-400 dark:text-gray-500">or load from ENS / SuiNS</span>
                      <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
                    </div>

                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={ensNameLoad}
                        onChange={(e) => setEnsNameLoad(e.target.value)}
                        placeholder="alice.eth / bob.sui"
                        disabled={isLoadingENS}
                        className="flex-1 h-9 px-3 py-2 text-sm bg-gray-50 border border-gray-300 rounded-lg text-gray-900 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                        onKeyDown={(e) => e.key === 'Enter' && handleENSLoad()}
                      />
                      <button
                        onClick={handleENSLoad}
                        disabled={isLoadingENS || !ensNameLoad.trim()}
                        className="px-4 h-9 text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                      >
                        {isLoadingENS ? (
                          <>
                            <Loader2 className="h-3 w-3 animate-spin" />
                            Loading...
                          </>
                        ) : (
                          'Load'
                        )}
                      </button>
                    </div>

                    {ensLoadError && (
                      <div className="rounded-lg bg-red-50 border border-red-200 dark:bg-red-900/30 dark:border-red-700 p-3">
                        <p className="text-sm text-red-600 dark:text-red-400">{ensLoadError}</p>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    );
  }

  // Show the share URL and QR code
  return (
    <Dialog.Root open={open} onOpenChange={(o) => !o && handleClose()}>
      <Dialog.Portal>
        <Dialog.Overlay
          className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0"
        />
        <Dialog.Content
          className="fixed left-[50%] top-[50%] z-[101] w-[95vw] max-w-md translate-x-[-50%] translate-y-[-50%] rounded-2xl border shadow-2xl border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900 flex flex-col overflow-hidden max-h-[90vh] data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95"
        >
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <Dialog.Title className="text-lg font-semibold text-gray-900 dark:text-white">
              Share Suiquence
            </Dialog.Title>
            <Dialog.Close asChild>
              <button
                type="button"
                className="rounded p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white transition-colors"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </Dialog.Close>
          </div>

          <div className="flex flex-col overflow-y-auto">
            <div className="px-6 py-4 space-y-6">
              <p className="text-sm text-gray-600 dark:text-gray-300">
                Your encrypted flow has been uploaded to IPFS. Share this link or scan the
                QR code to open it on another device.
              </p>

              {/* QR Code */}
              <div className="flex justify-center p-4 bg-white rounded-lg">
                <QRCodeSVG value={shareUrl} size={200} level="M" />
              </div>

              {/* Share URL */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Share Link
                </label>
                <div className="flex gap-2">
                  <input
                    value={shareUrl}
                    readOnly
                    onClick={(e) => e.currentTarget.select()}
                    className="flex-1 h-9 px-3 py-2 text-sm bg-gray-50 border border-gray-300 rounded-lg text-gray-900 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-200 font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    onClick={copyToClipboard}
                    className="px-3 h-9 bg-gray-100 hover:bg-gray-200 border border-gray-300 dark:bg-gray-800 dark:hover:bg-gray-700 dark:border-gray-600 rounded-lg transition-colors flex items-center justify-center"
                  >
                    {copied ? (
                      <Check className="h-4 w-4 text-green-600 dark:text-green-500" />
                    ) : (
                      <Copy className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                    )}
                  </button>
                </div>
              </div>

              {/* IPFS Info */}
              <div className={`rounded-lg border p-3 ${
                isPrivate
                  ? 'bg-purple-50 border-purple-200 dark:bg-purple-900/30 dark:border-purple-700/50'
                  : 'bg-teal-50 border-teal-200 dark:bg-teal-900/30 dark:border-teal-700/50'
              }`}>
                <p className={`text-xs ${
                  isPrivate
                    ? 'text-purple-700 dark:text-purple-400'
                    : 'text-teal-700 dark:text-teal-400'
                }`}>
                  {isPrivate ? (
                    <>
                      <strong>Private Flow:</strong> Your flow is encrypted and stored on IPFS via Pinata.
                      The encrypted data is publicly accessible, but only readable with the encryption key
                      included in the link. Don't lose the link - the key cannot be recovered!
                    </>
                  ) : (
                    <>
                      This flow is stored on IPFS via Pinata, a decentralized storage
                      network. The link will work permanently and can't be modified.
                    </>
                  )}
                </p>
              </div>

              {/* Save to ENS */}
              {onSaveToENS && lastCid && (
                <>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
                    <span className="text-xs text-gray-400 dark:text-gray-500">or save to ENS / SuiNS</span>
                    <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
                  </div>

                  {ensSaveSuccess ? (
                    <div className="rounded-lg bg-green-50 border border-green-200 dark:bg-green-900/30 dark:border-green-700 p-3 space-y-1">
                      <p className="text-sm font-medium text-green-700 dark:text-green-400">
                        Saved to {ensNameSave}
                      </p>
                      {ensTxHash && (
                        <p className="text-xs text-green-600 dark:text-green-500 break-all">
                          Tx: <a
                            href={`https://etherscan.io/tx/${ensTxHash}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="underline hover:no-underline"
                          >{ensTxHash.slice(0, 10)}...{ensTxHash.slice(-8)}</a>
                        </p>
                      )}
                    </div>
                  ) : (
                    <>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={ensNameSave}
                          onChange={(e) => setEnsNameSave(e.target.value)}
                          placeholder="alice.eth / bob.sui"
                          disabled={isSavingENS}
                          className="flex-1 h-9 px-3 py-2 text-sm bg-gray-50 border border-gray-300 rounded-lg text-gray-900 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-50"
                          onKeyDown={(e) => e.key === 'Enter' && handleENSSave()}
                        />
                        <button
                          onClick={handleENSSave}
                          disabled={isSavingENS || !ensNameSave.trim()}
                          className="px-4 h-9 text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                        >
                          {isSavingENS ? (
                            <>
                              <Loader2 className="h-3 w-3 animate-spin" />
                              Saving...
                            </>
                          ) : (
                            'Save'
                          )}
                        </button>
                      </div>
                    </>
                  )}

                  {ensSaveError && (
                    <div className="rounded-lg bg-red-50 border border-red-200 dark:bg-red-900/30 dark:border-red-700 p-3">
                      <p className="text-sm text-red-600 dark:text-red-400">{ensSaveError}</p>
                    </div>
                  )}
                </>
              )}

            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
