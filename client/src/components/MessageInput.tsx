import { useRef, useState, type FormEvent, type ChangeEvent } from 'react';

interface Props {
  onSend: (text: string, mediaUrl?: string | null, mediaType?: 'image' | 'video' | null) => void;
  onTyping: (isTyping: boolean) => void;
  disabled?: boolean;
}

export function MessageInput({ onSend, onTyping, disabled }: Props) {
  const [text, setText] = useState('');
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const typingTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleTyping = () => {
    onTyping(true);
    if (typingTimeout.current) clearTimeout(typingTimeout.current);
    typingTimeout.current = setTimeout(() => onTyping(false), 1500);
  };

  const uploadFile = async (file: File) => {
    setUploading(true);
    const form = new FormData();
    form.append('file', file);

    try {
      const res = await fetch('/api/upload', { method: 'POST', body: form });
      if (!res.ok) throw new Error('Upload failed');
      const data = await res.json();
      onSend('', data.url, data.type);
    } catch {
      alert('Failed to upload file. Use images or videos under 50MB.');
    } finally {
      setUploading(false);
    }
  };

  const handleFile = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) uploadFile(file);
    e.target.value = '';
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed) return;
    onSend(trimmed);
    setText('');
    onTyping(false);
  };

  return (
    <form className="message-input" onSubmit={handleSubmit}>
      <input
        ref={fileRef}
        type="file"
        accept="image/*,video/*"
        hidden
        onChange={handleFile}
      />
      <button
        type="button"
        className="btn-icon"
        onClick={() => fileRef.current?.click()}
        disabled={disabled || uploading}
        title="Send photo or video"
      >
        {uploading ? '…' : '📎'}
      </button>
      <input
        type="text"
        placeholder="Type a message…"
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          handleTyping();
        }}
        disabled={disabled || uploading}
      />
      <button type="submit" className="btn-send" disabled={disabled || !text.trim() || uploading}>
        Send
      </button>
    </form>
  );
}
