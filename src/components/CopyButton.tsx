import { useState } from "react";
import { Clipboard, ClipboardCheck } from "lucide-react";

const CopyButton = ({ text }: { text: string }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 5000); // Reset after 2 seconds
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

    return (
      <div className="flex justify-end items-end">
        <button
          onClick={handleCopy}
          className="p-2 rounded-full bg-gray-800 hover:bg-gray-600 transition block"
          aria-label="Copy to clipboard"
        >
          {copied ? (
            <ClipboardCheck className="text-green-600 w-4 h-4" />
          ) : (
            <Clipboard className="w-4 h-4" />
          )}
        </button>
      </div>
    );
};

export default CopyButton;
