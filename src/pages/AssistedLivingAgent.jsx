import { motion } from "motion/react";
import { getJWT } from "../utils/auth.jsx";
import { useEffect, useRef, useState } from "react";
import useAudioQueue from "../hooks/useAudioQueue.jsx";
import EndConversation from "../tools/EndConversation.jsx";
import VoiceAssistantModel from "../components/VoiceAssistantModel.jsx";
import insertRow from "../tools/InsertRow.js";

function AssistedLivingAgent() {
  const webSocketRef = useRef(null);
  const [promptResponse, setPromptResponse] = useState([]);
  const { playChunk } = useAudioQueue();
  const messagesEndRef = useRef(null);
  const [schema, setSchema] = useState(null);
  const promptRef = useRef(null);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({
        behavior: "smooth",
      });
    }
  }, [promptResponse]);

  useEffect(() => {
    if (!promptRef.current) return;
    promptRef.current.scrollTo({
      top: promptRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [promptResponse]);

  const connectToSpeechmatics = async () => {
    try {
      const jwt = await getJWT();
      const webSocket = new WebSocket(
        `wss://flow.api.speechmatics.com/v1/flow?jwt=${jwt}`,
      );
      webSocketRef.current = webSocket;
      webSocket.binaryType = "arraybuffer";

      webSocket.onopen = () => {
        console.log("Connected to speechmatic websocket!");
        navigator.mediaDevices
          .getUserMedia({ audio: { sampleRate: 16000 } })
          .then(async function (stream) {
            const audioContext = new AudioContext({ sampleRate: 16000 });

            // Load the AudioWorklet processor
            await audioContext.audioWorklet.addModule("/pcm-processor.js");

            const source = audioContext.createMediaStreamSource(stream);
            const processor = new AudioWorkletNode(
              audioContext,
              "pcm-processor",
            );

            // Receive PCM data
            processor.port.onmessage = (event) => {
              const float32Data = new Float32Array(event.data.float32Data);

              if (webSocketRef?.current?.readyState === WebSocket.OPEN) {
                webSocketRef.current.send(float32Data.buffer);
              }
            };

            source.connect(processor);
            processor.connect(audioContext.destination);
          })
          .catch(function (err) {
            console.error("Error accessing microphone:", err);
          });
        const data = {
          message: "StartConversation",
          audio_format: {
            type: "raw",
            encoding: "pcm_f32le",
          },
          conversation_config: {
            template_id: "11fadd6b-c630-4193-8b3c-9a92aeeb6837:latest",
            template_variables: {
              db_schema: schema,
            },
          },
          tools: [
            {
              type: "function",
              function: {
                name: "insertRow",
                description: `Inserts senior care inquiry data into Google Sheets database.

    IMPORTANT: Only call this function AFTER collecting ALL required information from the user through the conversation flow.
    
    Required information to collect:
    - Senior's full name, age, gender
    - Location where care is needed
    - Primary contact name, phone, email
    - Primary medical condition/diagnosis
    - Mobility level (walker/cane/bedridden/independent)
    - Cognitive status (dementia/Alzheimer's/intact/mild impairment)
    - Type of care needed (personal care/medication management/meal prep/nursing/live-in)
    - Hours of care needed per day
    - Monthly budget range
    - Preferred start date
    - Any additional notes (falls, allergies, home hazards, pets, etc.)

    Map all conversation answers to the corresponding parameters below.`,
                parameters: {
                  type: "object",
                  properties: {
                    seniorName: {
                      type: "string",
                      description: "Full name of the senior needing care",
                    },
                    age: {
                      type: "number",
                      description: "Age of the senior",
                    },
                    gender: {
                      type: "string",
                      description: "Gender of the senior (Male/Female/Other)",
                    },
                    location: {
                      type: "string",
                      description: "City/area where care is needed",
                    },
                    primaryCondition: {
                      type: "string",
                      description: "Main diagnosis or medical condition",
                    },
                    mobilityLevel: {
                      type: "string",
                      description:
                        "Mobility status (walker/cane/bedridden/independent)",
                    },
                    cognitiveStatus: {
                      type: "string",
                      description:
                        "Cognitive condition (dementia/Alzheimer's/intact/mild impairment)",
                    },
                    careTypeNeeded: {
                      type: "string",
                      description:
                        "Type of care required (personal care/medication management/meal prep/nursing/live-in)",
                    },
                    hoursPerDay: {
                      type: "number",
                      description: "Number of care hours needed per day",
                    },
                    budgetRange: {
                      type: "string",
                      description: "Monthly budget range for care services",
                    },
                    preferredStartDate: {
                      type: "string",
                      description: "When care should start (YYYY-MM-DD format)",
                    },
                    contactName: {
                      type: "string",
                      description: "Primary family contact name",
                    },
                    contactPhone: {
                      type: "string",
                      description: "Primary contact phone number",
                    },
                    contactEmail: {
                      type: "string",
                      description: "Primary contact email address",
                    },
                    notes: {
                      type: "string",
                      description:
                        "Additional important details (falls history, allergies, home hazards, pets, transportation needs, etc.)",
                    },
                  },
                  required: [
                    "seniorName",
                    "age",
                    "gender",
                    "location",
                    "primaryCondition",
                    "mobilityLevel",
                    "cognitiveStatus",
                    "careTypeNeeded",
                    "hoursPerDay",
                    "budgetRange",
                    "preferredStartDate",
                    "contactName",
                    "contactPhone",
                    "contactEmail",
                  ],
                },
              },
            },
            {
              type: "function",
              function: {
                name: "EndConversation",
                description:
                  "End Conversation when user says some words or phrases which indicate end of conversation.",
              },
            },
          ],
        };
        webSocket.send(JSON.stringify(data));
      };
      webSocket.onmessage = async (event) => {
        const data = event.data;

        if (data instanceof ArrayBuffer) {
          playChunk(data);
          return;
        }

        const parsed_data = JSON.parse(event.data);
        const message = parsed_data["message"];

        switch (message) {
          case "AddTranscript": {
            const transcript = parsed_data.metadata.transcript;
            // console.log("Final Transcript", transcript);
            break;
          }

          case "ResponseCompleted": {
            const response = parsed_data.content;
            // console.log("Final response", response);
            break;
          }

          case "prompt": {
            const prompt = parsed_data.prompt;
            const prompt_id = prompt.id;
            const prompt_text = prompt.prompt;
            const response_text = prompt.response;

            const plain_response = response_text.replace(/<[^>]*>/g, "").trim();

            let updated_prompt = { ...prompt, response: plain_response };

            const hasResultXML =
              /<(RESULT|APPLICATION_INPUT)(\s+[^>]*)?>.*?<\/\1>/is.test(
                prompt_text,
              );

            if (hasResultXML) {
              updated_prompt = { ...prompt, prompt: "" };
            }

            setPromptResponse((prev) => {
              const index = prev?.findIndex((obj) => obj.id === prompt_id);
              if (index === -1) return [...prev, updated_prompt];

              const updated = [...prev];
              updated[index] = updated_prompt;
              return updated;
            });
            break;
          }

          case "ToolInvoke": {
            console.log("Invoke tool", parsed_data);

            const tool_id = parsed_data.id;

            const function_name = parsed_data.function.name;

            switch (function_name) {
              case "insertRow": {
                const tool_arguments = parsed_data.function.arguments;
                console.log("Tool arguments", tool_arguments);
                const result = await functionMap[function_name](tool_arguments);
                const insertResult = result.insertResult;
                console.log("Insert record result", insertResult);
                if (
                  webSocketRef.current &&
                  webSocketRef.current.readyState === WebSocket.OPEN
                ) {
                  if (insertResult && insertResult.success) {
                    webSocketRef.current.send(
                      JSON.stringify({
                        message: "ToolResult",
                        id: tool_id,
                        status: "ok",
                        content: insertResult.message,
                      }),
                    );
                  } else {
                    webSocketRef.current.send(
                      JSON.stringify({
                        message: "AddInput",
                        input:
                          "The tool call failed. Notify the user politely.",
                        interrupt_response: true,
                        immediate: true,
                      }),
                    );
                  }
                }
                break;
              }
              case "EndConversation": {
                functionMap[function_name](webSocketRef, setPromptResponse);
                break;
              }

              default:
                break;
            }
            break;
          }
          default:
            break;
        }
      };

      webSocket.onerror = (error) => console.error("Error:", error);
    } catch (e) {
      console.error("Connection failed:", e);
    }
  };

  return (
    <div
      ref={promptRef}
      className="flex flex-col gap-y-8 bg-black h-screen scrollbar overflow-y-auto"
    >
      <div className="title-box pt-4">
        <p className="text-center tracking-tighter switzer-500 text-5xl text-white">
          Info Senior Care
        </p>
      </div>
      <div className="flex gap-x-4 justify-center">
        {webSocketRef?.current?.readyState !== WebSocket.OPEN ? (
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            // disabled={schema ? false : true}
            onClick={connectToSpeechmatics}
            className="inter-300 tracking-wider absolute px-4 py-3 text-sm text-white rounded-xl animated-gradient-border animate-border-spin hover:bg-violet-200/10 transition-all ease-in-out duration-300 hover:inter-400 cursor-pointer"
          >
            Start Conversation
          </motion.button>
        ) : (
          <button
            onClick={() => {
              webSocketRef?.current?.close();
              setPromptResponse([]);
            }}
            className="absolute inter-300 tracking-wider px-3 py-2 text-sm text-red-400 hover:scale-105 rounded-xl transition-all ease-in-out duration-300 border border-red-300/40 cursor-pointer"
          >
            Stop Conversation
          </button>
        )}
      </div>
      <div
        className={`${
          webSocketRef?.current?.readyState === WebSocket.OPEN
            ? "opacity-100"
            : "opacity-0"
        } w-full flex justify-center bg-black transition-all ease-in-out duration-300`}
      >
        <VoiceAssistantModel />
      </div>
      {promptResponse?.length > 0 ? (
        <div className="flex flex-col w-full items-center">
          <p className="roboto-400 text-white text-xl font-semibold">
            Conversation
          </p>
        </div>
      ) : null}
      <div className="flex flex-col items-center gap-y-6 w-full px-4">
        {promptResponse?.map((pair, index) => {
          const speaker_number = pair["prompt"] && pair["prompt"][2];

          const color = getColor(speaker_number);

          return (
            <div
              key={index}
              className="flex flex-col gap-y-2 w-full md:w-3/4 lg:w-1/2"
            >
              {pair["prompt"] && (
                <div
                  className={`w-1/2 ml-auto rounded-2xl border ${
                    color === "white"
                      ? "border-white/20 text-white"
                      : color === "purple-200"
                        ? "border-purple-200/20 text-purple-200"
                        : color === "violet-200"
                          ? "border-violet-200/20 text-violet-200"
                          : color === "red-200"
                            ? "border-red-200/20 text-red-200"
                            : color === "orange-200"
                              ? "border-orange-200/20 text-orange-200"
                              : color === "lime-200"
                                ? "border-lime-200/20 text-lime-200"
                                : color === "emerald-200"
                                  ? "border-emerald-200/20 text-emerald-200"
                                  : color === "sky-200"
                                    ? "border-sky-200/20 text-sky-200"
                                    : color === "fuchsia-200"
                                      ? "border-fuchsia-200/20 text-fuchsia-200"
                                      : ""
                  } px-3 py-2 shadow-lg`}
                >
                  <strong className={`text-${color} roboto-600`}>
                    Speaker {pair["prompt"][2]}
                  </strong>
                  <p className="inter-400 text-white">
                    {pair["prompt"].slice(4, -5)}
                  </p>
                </div>
              )}
              {pair["response"] ? (
                <div className="w-1/2 rounded-xl p-2 border border-white/20 shadow-lg">
                  <strong className="roboto-600 text-white">Agent</strong>
                  <p className="inter-400 text-white">{pair["response"]}</p>
                </div>
              ) : null}
              <div ref={messagesEndRef}></div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default AssistedLivingAgent;

const getColor = (speakerNumber) => {
  switch (speakerNumber) {
    case "1":
      return "white";

    case "2":
      return "purple-200";

    case "3":
      return "violet-200";

    case "4":
      return "red-200";

    case "5":
      return "orange-200";

    case "6":
      return "lime-200";

    case "7":
      return "emerald-200";

    case "8":
      return "sky-200";

    case "9":
      return "fuchsia-200";

    default:
      return;
  }
};

const functionMap = {
  insertRow: insertRow,
  EndConversation: EndConversation,
};
