import { useCallback, useEffect } from 'react';
import {
  japaneseSpeechSupported,
  speakJapanese,
  warmJapaneseVoices,
} from '../../utils/japaneseSpeech';

export default function SpeakJaButton({ text, label = 'Nghe phát âm', className = '' }) {
  useEffect(() => {
    warmJapaneseVoices();
  }, []);

  const onClick = useCallback(
    (e) => {
      e.preventDefault();
      e.stopPropagation();
      speakJapanese(text);
    },
    [text]
  );

  if (!japaneseSpeechSupported()) {
    return null;
  }

  return (
    <button
      type="button"
      className={`learn-speak-btn ${className}`.trim()}
      onClick={onClick}
      aria-label={label}
      title={label}
    >
      <svg className="learn-speak-btn__svg" viewBox="0 0 24 24" width="18" height="18" aria-hidden>
        <path
          fill="currentColor"
          d="M3 10v4h4l5 5V5L7 10H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"
        />
      </svg>
    </button>
  );
}
