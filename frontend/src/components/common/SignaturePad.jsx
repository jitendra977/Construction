import React, { useRef } from 'react';
import SignatureCanvas from 'react-signature-canvas';

const SignaturePad = ({ onSave, onClear, label = "Signature", initialValue = null }) => {
  const hasLoadedInitial = useRef(false);
  const sigCanvas = useRef(null);

  React.useEffect(() => {
    if (initialValue && sigCanvas.current && !hasLoadedInitial.current) {
      try {
        sigCanvas.current.fromDataURL(initialValue);
        hasLoadedInitial.current = true;
      } catch (err) {
        console.error("Failed to load initial signature:", err);
      }
    } else if (!initialValue) {
      hasLoadedInitial.current = false;
    }
  }, [initialValue]);

  const clear = () => {
    if (sigCanvas.current) {
      sigCanvas.current.clear();
    }
    if (onClear) onClear();
  };

  const save = () => {
    if (!sigCanvas.current || sigCanvas.current.isEmpty()) return;
    try {
      const dataUrl = sigCanvas.current.getTrimmedCanvas().toDataURL('image/png');
      onSave(dataUrl);
    } catch (err) {
      console.warn("getTrimmedCanvas failed, falling back to getCanvas", err);
      const dataUrl = sigCanvas.current.getCanvas().toDataURL('image/png');
      onSave(dataUrl);
    }
  };

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-slate-700">{label}</label>
      <div className="border border-slate-200 rounded-lg overflow-hidden bg-white relative">
        <SignatureCanvas
          ref={sigCanvas}
          penColor="black"
          canvasProps={{
            className: "signature-canvas w-full h-40 cursor-crosshair",
          }}
        />
        <button
          type="button"
          onClick={save}
          style={{ position: 'absolute', bottom: 10, right: 10, padding: '4px 12px', borderRadius: 6, background: '#6366f1', color: '#fff', fontSize: 11, fontWeight: 700, border: 'none', cursor: 'pointer', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}
        >
          Confirm Signature
        </button>
      </div>
      <div className="flex justify-end space-x-2">
        <button
          type="button"
          onClick={clear}
          className="text-xs text-slate-500 hover:text-slate-800 transition-colors"
        >
          Clear Signature
        </button>
      </div>
    </div>
  );
};

export default SignaturePad;
