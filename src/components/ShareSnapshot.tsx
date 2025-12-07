import { useState } from 'react';
import { Camera, Download, Share2, X, Twitter, Facebook, Linkedin, Link as LinkIcon } from 'lucide-react';
import html2canvas from 'html2canvas';

interface ShareSnapshotProps {
  theme: 'dark' | 'light';
  canvasRef: React.RefObject<HTMLDivElement>;
  variant?: 'floating' | 'inline';
}

export default function ShareSnapshot({ theme, canvasRef, variant = 'floating' }: ShareSnapshotProps) {
  const [isCapturing, setIsCapturing] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [showShareMenu, setShowShareMenu] = useState(false);

  const captureSnapshot = async () => {
    if (!canvasRef.current) return;

    setIsCapturing(true);
    try {
      const containerElement = canvasRef.current;

      const snapshot = await html2canvas(containerElement, {
        backgroundColor: theme === 'dark' ? '#111827' : '#f9fafb',
        scale: 2,
        logging: false,
        useCORS: true,
      });

      const ctx = snapshot.getContext('2d');
      if (ctx) {
        const padding = 40;
        const watermarkText = 'googletrendingtopics.com';
        const fontSize = 24;

        ctx.font = `bold ${fontSize}px sans-serif`;
        ctx.fillStyle = theme === 'dark' ? 'rgba(255, 255, 255, 0.7)' : 'rgba(0, 0, 0, 0.7)';
        ctx.textAlign = 'right';
        ctx.textBaseline = 'bottom';
        ctx.fillText(watermarkText, snapshot.width - padding, snapshot.height - padding);

        const timeText = new Date().toLocaleString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
          hour: 'numeric',
          minute: '2-digit',
          hour12: true
        });
        ctx.font = `${fontSize - 4}px sans-serif`;
        ctx.fillStyle = theme === 'dark' ? 'rgba(255, 255, 255, 0.5)' : 'rgba(0, 0, 0, 0.5)';
        ctx.fillText(timeText, snapshot.width - padding, snapshot.height - padding - fontSize - 10);
      }

      const imageData = snapshot.toDataURL('image/png');
      setCapturedImage(imageData);
      setShowShareMenu(true);

      // Scroll to top when modal opens
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (error) {
      console.error('Error capturing snapshot:', error);
      alert('Failed to capture snapshot. Please try again.');
    } finally {
      setIsCapturing(false);
    }
  };

  const downloadImage = () => {
    if (!capturedImage) return;

    const link = document.createElement('a');
    const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
    link.download = `trending-topics-${timestamp}.png`;
    link.href = capturedImage;
    link.click();
    setShowShareMenu(false);
    setCapturedImage(null);
  };

  const copyToClipboard = async () => {
    try {
      const currentUrl = window.location.href;
      await navigator.clipboard.writeText(currentUrl);
      alert('Link copied to clipboard!');
    } catch (error) {
      console.error('Error copying to clipboard:', error);
    }
  };

  const shareToTwitter = () => {
    const text = 'Check out these trending topics! 🔥';
    const url = window.location.href;
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`, '_blank');
  };

  const shareToFacebook = () => {
    const url = window.location.href;
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`, '_blank');
  };

  const shareToLinkedIn = () => {
    const url = window.location.href;
    window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`, '_blank');
  };

  const buttonClasses = variant === 'inline'
    ? `flex items-center gap-2 px-3 md:px-4 py-1.5 text-xs md:text-sm font-medium transition-colors text-white whitespace-nowrap rounded ${
        isCapturing
          ? theme === 'dark'
            ? 'bg-gray-600 cursor-not-allowed'
            : 'bg-gray-300 cursor-not-allowed'
          : theme === 'dark'
          ? 'bg-blue-600 hover:bg-blue-700'
          : 'bg-blue-600 hover:bg-blue-700'
      }`
    : `fixed bottom-6 right-6 z-40 flex items-center gap-2 px-4 py-3 rounded-full shadow-lg transition-all ${
        isCapturing
          ? theme === 'dark'
            ? 'bg-gray-600 cursor-not-allowed'
            : 'bg-gray-300 cursor-not-allowed'
          : theme === 'dark'
          ? 'bg-blue-600 hover:bg-blue-700 hover:shadow-xl'
          : 'bg-blue-500 hover:bg-blue-600 hover:shadow-xl'
      } text-white font-medium`;

  return (
    <>
      <button
        onClick={captureSnapshot}
        disabled={isCapturing}
        className={buttonClasses}
        title="Capture & Share"
      >
        {isCapturing ? (
          <>
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            <span className="hidden md:inline">Capturing...</span>
          </>
        ) : (
          <>
            <Camera size={20} />
            <span className="hidden md:inline">Snapshot & Share</span>
          </>
        )}
      </button>

      {showShareMenu && capturedImage && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-start justify-center z-50 p-4 pt-8 md:pt-16 overflow-y-auto">
          <div className={`${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden`}>
            <div className={`${theme === 'dark' ? 'bg-gray-700 border-gray-600' : 'bg-gray-100 border-gray-200'} border-b px-6 py-4 flex justify-between items-center`}>
              <h2 className="text-xl font-bold flex items-center gap-2">
                <Share2 size={24} />
                Share Your Snapshot
              </h2>
              <button
                onClick={() => {
                  setShowShareMenu(false);
                  setCapturedImage(null);
                }}
                className={`${theme === 'dark' ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-gray-900'} transition-colors`}
              >
                <X size={24} />
              </button>
            </div>

            <div className="p-6 overflow-y-auto max-h-[calc(90vh-180px)]">
              <div className="mb-6">
                <img
                  src={capturedImage}
                  alt="Captured trending topics"
                  className="w-full rounded-lg border-2 border-gray-300"
                />
              </div>

              <div className="space-y-4">
                <div>
                  <h3 className={`text-lg font-semibold mb-3 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                    Download or Share
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <button
                      onClick={downloadImage}
                      className={`flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-medium transition-colors ${
                        theme === 'dark'
                          ? 'bg-green-600 hover:bg-green-700 text-white'
                          : 'bg-green-500 hover:bg-green-600 text-white'
                      }`}
                    >
                      <Download size={20} />
                      Download Image
                    </button>

                    <button
                      onClick={copyToClipboard}
                      className={`flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-medium transition-colors ${
                        theme === 'dark'
                          ? 'bg-gray-600 hover:bg-gray-700 text-white'
                          : 'bg-gray-300 hover:bg-gray-400 text-gray-900'
                      }`}
                    >
                      <LinkIcon size={20} />
                      Copy Link
                    </button>
                  </div>
                </div>

                <div>
                  <h3 className={`text-lg font-semibold mb-3 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                    Share on Social Media
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <button
                      onClick={shareToTwitter}
                      className="flex items-center justify-center gap-2 px-4 py-3 bg-[#1DA1F2] hover:bg-[#1a8cd8] text-white rounded-lg font-medium transition-colors"
                    >
                      <Twitter size={20} />
                      Twitter
                    </button>

                    <button
                      onClick={shareToFacebook}
                      className="flex items-center justify-center gap-2 px-4 py-3 bg-[#1877F2] hover:bg-[#166fe5] text-white rounded-lg font-medium transition-colors"
                    >
                      <Facebook size={20} />
                      Facebook
                    </button>

                    <button
                      onClick={shareToLinkedIn}
                      className="flex items-center justify-center gap-2 px-4 py-3 bg-[#0A66C2] hover:bg-[#094e93] text-white rounded-lg font-medium transition-colors"
                    >
                      <Linkedin size={20} />
                      LinkedIn
                    </button>
                  </div>
                </div>

                <div className={`mt-6 p-4 rounded-lg ${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-100'}`}>
                  <p className={`text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
                    💡 <strong>Tip:</strong> Download the image first, then share it directly on social media with your own caption for maximum engagement!
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
