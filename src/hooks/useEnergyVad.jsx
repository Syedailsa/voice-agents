import { useState, useRef } from "react";

export default function useEnergyVad(options) {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const audioContextRef = useRef(null);
  const sourceRef = useRef(null);
  const processorRef = useRef(null);
  const streamRef = useRef(null);
  const silenceCounterRef = useRef(0);

  const VOLUME_THRESHOLD = 0.01;
  const SILENCE_FRAMES = 40;

  const { onSpeechStart, onSpeechEnd, onFrameProcessed } = options;

  const start = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      streamRef.current = stream;

      const AudioContext = window.AudioContext || window.webkitAudioContext;
      const ctx = new AudioContext();
      audioContextRef.current = ctx;

      if (ctx.state === "suspended") await ctx.resume();

      const source = ctx.createMediaStreamSource(stream);

      const processor = ctx.createScriptProcessor(8192, 1, 1);

      processor.onaudioprocess = (e) => {
        const inputData = e.inputBuffer.getChannelData(0);

        let sum = 0;
        for (let i = 0; i < inputData.length; i++) {
          sum += inputData[i] * inputData[i];
        }
        const rms = Math.sqrt(sum / inputData.length);

        if (rms > VOLUME_THRESHOLD) {
          silenceCounterRef.current = 0;
          if (!isSpeaking) {
            setIsSpeaking(true);
            if (onSpeechStart) onSpeechStart();
          }
        } else {
          if (isSpeaking) {
            silenceCounterRef.current++;
            if (silenceCounterRef.current > SILENCE_FRAMES) {
              setIsSpeaking(false);
              if (onSpeechEnd) onSpeechEnd();
            }
          }
        }

        const audioClone = new Float32Array(inputData);
        if (onFrameProcessed) {
          onFrameProcessed({
            isSpeech: isSpeaking || rms > VOLUME_THRESHOLD,
            audioBuffer: audioClone.buffer,
          });
        }
      };

      source.connect(processor);
      processor.connect(ctx.destination);

      sourceRef.current = source;
      processorRef.current = processor;

      console.log(`🎤 Recorder Started: Mono, ${ctx.sampleRate}Hz`);
      return ctx.sampleRate;
    } catch (error) {
      console.error("Error starting Recorder:", error);
      return null;
    }
  };

  const stop = () => {
    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current.onaudioprocess = null;
    }
    if (sourceRef.current) sourceRef.current.disconnect();
    if (streamRef.current)
      streamRef.current.getTracks().forEach((t) => t.stop());
    if (audioContextRef.current) audioContextRef.current.close();

    setIsSpeaking(false);
  };

  return { start, stop, isSpeaking };
}
