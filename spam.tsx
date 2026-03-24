// initialize the vad
// const vad = useMicVAD({
//   startOnLoad: false,
//   onSpeechStart: () => {
//     console.log("Speech has started!");
//   },
//   onFrameProcessed: ({ isSpeech, notSpeech }, audio) => {
//     if (
//       webSocketRef.current &&
//       webSocketRef.current.readyState === WebSocket.OPEN
//     ) {
//       webSocketRef.current.send(audio);
//     }
//   },
//   onSpeechEnd: () => {
//     "Speech has ended!";
//   },
//   // onnxWASMBasePath:
//   //   "https://cdn.jsdelivr.net/npm/onnxruntime-web@1.22.0/dist/",
//   // baseAssetPath:
//   //   "https://cdn.jsdelivr.net/npm/@ricky0123/vad-web@0.0.27/dist/",
//   baseAssetPath: "/vad/",
//   onnxWASMBasePath: "/vad/",
// });

// const vad = useEnergyVad({
//   onSpeechStart: () => {
//     console.log("🎤 Speech START (Energy)");
//   },
//   onSpeechEnd: () => {
//     console.log("🎤 Speech END (Energy)");
//   },
//   onFrameProcessed: ({ isSpeech, audioBuffer }) => {
//     if (
//       webSocketRef.current &&
//       webSocketRef.current.readyState === WebSocket.OPEN
//     ) {
//       webSocketRef.current.send(audioBuffer);
//     }
//   },
// });

// VADRef.current = vad;

// let audioContext;
// let processor;

// navigator.mediaDevices
//   .getUserMedia({ audio: { sampleRate: 16000 } })
//   .then(function (stream) {
//     audioContext = new AudioContext({ sampleRate: 16000 });
//     const source = audioContext.createMediaStreamSource(stream);

//     // Using ScriptProcessor (deprecated but simpler)
//     processor = audioContext.createScriptProcessor(4096, 1, 1);

//     processor.onaudioprocess = function (e) {
//       const inputData = e.inputBuffer.getChannelData(0);
//       const pcm16 = float32ToInt16(inputData);
//       console.log("PCM data:", pcm16);
//     };

//     source.connect(processor);
//     processor.connect(audioContext.destination);
//   })
//   .catch(function (err) {
//     console.error("Error accessing microphone:", err);
//   });

// logic for establishing websocket connection with python server for ASR.
//   useEffect(() => {
//     const websocket = new WebSocket("ws://localhost:9000/vad-ws");
//     webSocketRef.current = websocket;
//     webSocketRef.current.binaryType = "arraybuffer";
//     websocket.onopen = () => {
//       console.log("Websocket connected successfully!");
//     };
//     websocket.onmessage = (event) => {
//       const data = JSON.parse(event.data);
//       const type = data.type;
//       switch (type) {
//         case "vad-result":
//           const isSpeech = data.speech_detected;
//           if (isSpeech) {
//             // logic to send pcm chunk to speechmatics
//             const lastAudioFrame =
//               audioBufferRef.current[audioBufferRef.current.length - 1];
//             if (
//               lastAudioFrame &&
//               SpeechMaticsWs?.current?.readyState === WebSocket.OPEN
//             ) {
//               SpeechMaticsWs.current.send(lastAudioFrame.data);
//             }
//           }
//           break;
//         default:
//           break;
//       }
//     };

//     websocket.onerror = (error) => {
//       console.log("Some error occured while connecting to websocket", error);
//     };

//     websocket.onclose = () => {
//       console.log("Websocket disconnected!");
//     };

//     return () => {
//       webSocketRef.current?.close();
//     };
//   }, []);
