import React from 'react';
import { Copy } from 'lucide-react';
import { useToast } from './Toast';
import { renderIcon } from './renderIcon';
import './CopyButton.css';

const CopyButton = ({ label, value, onCopy }) => {
  const { success } = useToast();

  const handleCopy = async () => {
    const textToCopy = value !== undefined ? value : label;
    
    try {
      await navigator.clipboard.writeText(String(textToCopy));
      success(`Copied ${label}`);
      onCopy?.();
    } catch (err) {
      // Fail silently if clipboard unavailable
    }
  };

  return (
    <button
      className="copy-button"
      onClick={handleCopy}
      type="button"
      aria-label={`Copy ${label}`}
    >
      {renderIcon(Copy, { size: 14 })}
    </button>
  );
};

export default React.memo(CopyButton);
