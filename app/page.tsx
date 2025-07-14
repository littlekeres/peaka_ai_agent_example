"use client";

import { useState } from "react"; // for constantly rendering values
import { useEffect } from "react"; // for automatically signing in with saved api-key through localStorage

import { v4 as uuidv4 } from "uuid"; // for generating unique thread id
import "./Components/Spinner/Spinner.css"; // ./ means whatever folder page.tsx in : Means app folder app/Components/Spinner/Spinner.css gives spinner class and we can use it...
import ReactMarkdown from "react-markdown";

type apiKeyProporties = {
  key: string;
  valid: boolean;
  projectsInfo: apiKeyInfo;
};

type apiKeyInfo = {
  projectId: string;
  projectName: string;
  userId: string;
  email: string;
};

type Thread = {
  threadId: string;
  displayName: string;
  projectId: string;
};

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
  threadId: string;
};

type RawMessage = {
  id: string[];
  kwargs: {
    content: string;
  };
};
type ApiResponse = {
  result?: {
    messages?: RawMessage[];
  };
};

export default function Home() {
  const [apiKey, setApiKey] = useState<apiKeyProporties>({
    key: "",
    valid: false,
    projectsInfo: {
      projectId: "",
      projectName: "",
      userId: "",
      email: "",
    },
  });
  const [hasLoaded, setHasLoaded] = useState(false); // if apikey is correct ,for only once, it will be correct then it will be false.
  const [TH, setTH] = useState<Thread[]>([]); // TH holds the values for all conversation threads
  const [messages, setMessages] = useState<ChatMessage[]>([]); //messages = message array
  const [messagesLoaded, setmessagesLoaded] = useState(false); //UPLOAD messages from peaka agent
  const [inputMessage, setInputMessage] = useState(""); //input message holds whatever written in textbox
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null); //Which conversation we are in currently...
  const [IsInputLoaded, setInputLoaded] = useState(false); // when button submit is clicked , it will be true for a period of time then become false

  //-----------Function for Api Key-----------------------------------------------------------------------------------------------------------------

  async function handleApiKey(key: string): Promise<boolean> {
    const Url: string = "https://partner.peaka.studio/api/v1/info";
    let isValid: boolean = false;
    const options = {
      method: "GET",
      headers: {
        Authorization: `Bearer ${key}`,
      },
    };

    const response = await fetch(Url, options);
    if (!response.ok) {
      return isValid;
    } else {
      isValid = true;
      localStorage.setItem("peaka_api_key", key); // we set our apikey in localstorage so next time we reload the page it will automatically enter the apikey in useEffect (one time function).
    }

    const data = await response.json();
    setApiKey((prev) => ({
      ...prev,
      key: key,
      valid: isValid,
      projectsInfo: {
        projectId: data.projectId,
        projectName: data.projectName,
        userId: data.userId,
        email: data.email,
      },
    }));
    return isValid;
  }
  //-------Function For Threads---------------------------------------------------------------------------------------------------------------------
  async function handleTH() {
    const key = apiKey.key;
    const projectId = apiKey.projectsInfo.projectId;

    const URL: string = `https://partner.peaka.studio/api/v1/ai-agent/${projectId}/threads`;

    const options = {
      method: "GET",
      headers: {
        Authorization: `Bearer ${key}`,
      },
    };

    try {
      const response = await fetch(URL, options);

      if (!response.ok) {
        console.error("Thread fetch failed:", response.statusText);
        return;
      }

      const data = await response.json();

      const threads: Thread[] = data.threads.map((t: Thread) => ({
        threadId: t.threadId,
        displayName: t.displayName,
        projectId: t.projectId,
      }));

      setTH(threads);
      console.log("Threads found.");
    } catch (error) {
      console.error("Fetch error:", error);
    }
  }
  //------Function for Handling Messages----------------------------------------------------------------------------------------------------------------------

  async function handleMessages(threadId: string) {
    const projectId: string = apiKey.projectsInfo.projectId;

    const URL = `https://partner.peaka.studio/api/v1/ai-agent/${projectId}/threads/${threadId}`;

    const options = {
      method: "GET",
      headers: {
        Authorization: `Bearer ${apiKey.key}`,
      },
    };

    try {
      const response = await fetch(URL, options);
      if (!response.ok) {
        console.error("Messages fetch failed:", response.statusText);
        return;
      }

      const data = await response.json();
      const rawMessages = data.result.values.messages;

      const newChatMessages: ChatMessage[] = rawMessages.map(
        (msg: RawMessage) => {
          const lastElementOfIdArray = msg.id[msg.id.length - 1];
          const role: "user" | "assistant" =
            lastElementOfIdArray === "HumanMessage" ? "user" : "assistant";

          let content = msg.kwargs.content;

          if (
            typeof content === "string" &&
            content.trim().startsWith("{") &&
            content.trim().endsWith("}")
          ) {
            try {
              const parsed = JSON.parse(content);
              if (typeof parsed === "object") {
                // check whether given Json is object
                content =
                  parsed.summary ??
                  JSON.stringify(parsed.data ?? parsed, null, 2);
              }
            } catch (error) {
              console.error("Content parsing error:", error);
            }
          }

          return {
            role,
            content,
            threadId: threadId,
          };
        }
      );

      setMessages(newChatMessages);
      setmessagesLoaded(true);
    } catch (error) {
      console.error("Fetch error:", error);
    }
  }
  useEffect(() => {
    // when the page opens it will check whether there is an apikey in localstorage if so it will handle api key.
    const storedKey = localStorage.getItem("peaka_api_key");
    if (storedKey) {
      setApiKey((prev) => ({
        ...prev,
        key: storedKey,
      }));
      handleApiKey(storedKey);
    }
  }, []);

  //----------Return-----------------------------------------------------------------------------------------------------------------------------
  return (
    <div>
      {/* 🔼 (HEADER) */}
      <div
        style={{
          position: "fixed",
          top: 0,
          left: "250px",
          width: "calc(100% - 250px)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "10px 20px",
          backgroundColor: "#f8f8f8",
          boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
          zIndex: 1000,
        }}
      >
        <header style={{ fontWeight: "bold", fontSize: "18px" }}>
          Peaka-Bot
        </header>

        <div
          style={{
            display: "flex",
            flexDirection: "row",
            alignItems: "center",
            gap: "10px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <input
              placeholder="API Key"
              value={apiKey.key}
              onChange={(e) => {
                const key = e.target.value;
                setApiKey((prev) => ({
                  ...prev,
                  key: key,
                  valid: false,
                }));
                if (key.length >= 39) {
                  handleApiKey(key);
                }
              }}
              style={{
                padding: "8px 12px",
                borderRadius: "6px",
                border: "1px solid #ccc",
                outline: "none",
              }}
            />

            {apiKey.valid === true && <div>✅</div>}

            {apiKey.valid && (
              <>
                <button
                  onClick={() => {
                    localStorage.removeItem("peaka_api_key");
                    setApiKey({
                      key: "",
                      valid: false,
                      projectsInfo: {
                        projectId: "",
                        projectName: "",
                        userId: "",
                        email: "",
                      },
                    });
                    setMessages([]);
                    setTH([]);
                    setActiveThreadId(null);
                    setmessagesLoaded(false);
                    setInputMessage("");
                    setInputLoaded(false);
                    setHasLoaded(false);
                  }}
                  style={{
                    marginLeft: "5px",
                    padding: "6px 10px",
                    borderRadius: "6px",
                    border: "none",
                    backgroundColor: "#ef4444",
                    color: "white",
                    cursor: "pointer",
                  }}
                >
                  Clear
                </button>
              </>
            )}
          </div>
        </div>
      </div>
      {/*------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- */}
      {/* 🔽 LOWER POINT (TEXTAREA + BUTTON) */}
      <div
        style={{
          position: "fixed",
          display: "flex",
          flexDirection: "row",
          alignItems: "center",
          bottom: "20px",
          left: "50%",
          transform: "translateX(-50%)",
        }}
      >
        <textarea
          placeholder="Ask me Anything..."
          value={inputMessage}
          disabled={IsInputLoaded}
          onChange={(e) => setInputMessage(e.target.value)}
          style={{
            padding: "8px",
            width: "500px",
            minHeight: "50px",
            borderRadius: "6px",
            border: "1px solid #ccc",
            outline: "none",
          }}
        />
        <button
          style={{
            marginLeft: "5px",
            padding: "8px 12px",
            borderRadius: "6px",
            border: "none",
            backgroundColor: "#3b82f6",
            color: "white",
            height: "50px",
            width: "100px",

            cursor: "pointer",
          }}
          disabled={IsInputLoaded}
          onClick={async () => {
            if (!apiKey.valid || inputMessage.trim() === "") return;

            const URL = `https://partner.peaka.studio/api/v1/ai-agent/${apiKey.projectsInfo.projectId}/chat`;

            const prepareAssistantMessage = (
              data: ApiResponse,
              threadId: string
            ): ChatMessage => {
              const allMessages = data.result?.messages || [];

              const assistantRaw = [...allMessages]
                .reverse()
                .find(
                  (msg) =>
                    msg.id.includes("FunctionMessage") ||
                    msg.id.includes("AIMessage")
                );

              let contentText = "No response.";
              const rawContent = assistantRaw?.kwargs?.content;

              if (rawContent) {
                try {
                  const parsed = JSON.parse(rawContent);
                  contentText =
                    parsed.summary || JSON.stringify(parsed.data, null, 2);
                } catch {
                  contentText = rawContent;
                }
              }

              return {
                role: "assistant",
                content: contentText,
                threadId,
              };
            };

            setInputMessage("");
            setInputLoaded(true);
            //When it is first message then we will do below operations
            if (!messagesLoaded) {
              const newThreadId = uuidv4();

              const newThread: Thread = {
                threadId: newThreadId,
                displayName: inputMessage,
                projectId: apiKey.projectsInfo.projectId,
              };
              setActiveThreadId(newThreadId);
              setTH((prev) => [...prev, newThread]);
              setmessagesLoaded(true);

              const userMessage: ChatMessage = {
                role: "user",
                content: inputMessage,
                threadId: newThreadId,
              };
              setMessages((prev) => [...prev, userMessage]);

              const body = {
                message: inputMessage,
                threadId: newThreadId,
              };

              const options = {
                method: "POST",
                headers: {
                  Authorization: `Bearer ${apiKey.key}`,
                  "Content-Type": "application/json",
                },
                body: JSON.stringify(body),
              };

              try {
                const response = await fetch(URL, options);
                const data = await response.json();

                const assistantMessage = prepareAssistantMessage(
                  data,
                  newThreadId
                );
                setMessages((prev) => [...prev, assistantMessage]);
                setInputLoaded(false);
              } catch (err) {
                setInputLoaded(false);
                console.error("Peaka mesaj gönderme hatası:", err);
              }

              return;
            }

            //If thread already exists:::
            if (!activeThreadId) return;

            const threadIdToUse = activeThreadId;

            const userMessage: ChatMessage = {
              role: "user",
              content: inputMessage,
              threadId: threadIdToUse,
            };

            setMessages((prev) => [...prev, userMessage]);

            const body = {
              message: inputMessage,
              threadId: threadIdToUse,
            };

            const options = {
              method: "POST",
              headers: {
                Authorization: `Bearer ${apiKey.key}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify(body),
            };

            try {
              const response = await fetch(URL, options);
              const data = await response.json();

              const assistantMessage = prepareAssistantMessage(
                data,
                threadIdToUse
              );
              setMessages((prev) => [...prev, assistantMessage]);
              setInputLoaded(false);
            } catch (err) {
              setInputLoaded(false);
              console.error("Peaka mesaj gönderme hatası:", err);
            }
          }}
        >
          Submit
        </button>

        {IsInputLoaded && <div className="spinner" />}
      </div>

      {/*------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- */}

      {/*   Menu bar*/}
      <div
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          width: "249px",
          height: "100vh",
          backgroundColor: "#fff",
          boxShadow: "2px 0 5px rgba(0,0,0,0.1)",
          padding: "20px",
          display: "flex",
          flexDirection: "column",
          overflowY: "auto",
        }}
      >
        {/* New conversation button */}
        <button
          style={{
            padding: "10px",
            borderRadius: "6px",
            border: "none",
            backgroundColor: "#3b82f6",
            color: "white",
            cursor: "pointer",
            marginBottom: "20px",
            fontWeight: "bold",
            boxShadow: "2px 0 5px rgba(0,0,0,0.1)",
            fontSize: "16px",
          }}
          onClick={() => {
            if (apiKey.valid && !hasLoaded) {
              setHasLoaded(true);
              handleTH();
            } else if (apiKey.valid) {
              setActiveThreadId(null);
              setmessagesLoaded(false);
              setInputMessage("");
              setMessages([]);
            } else alert("Please enter Peaka Api Key!!!!");
          }}
        >
          {apiKey.valid && !hasLoaded
            ? "Load Conversations..."
            : "New Conversation"}
        </button>

        <div style={{ flexGrow: 1, overflowY: "auto" }}>
          {TH.map((thread: Thread) => (
            <button
              key={thread.threadId}
              style={{
                padding: "10px",
                marginBottom: "10px",
                width: "100%",
                borderRadius: "6px",
                border: "1px solid #ccc",
                backgroundColor:
                  thread.threadId === activeThreadId ? "gray" : "#f0f0f0",
                color: thread.threadId === activeThreadId ? "white" : "black",
                cursor: "pointer",
                textAlign: "left",
              }}
              onClick={() => {
                console.log(`Thread seçildi: ${thread.threadId}`);

                setActiveThreadId(thread.threadId);
                handleMessages(thread.threadId);
              }}
            >
              {thread.displayName}
            </button>
          ))}
        </div>
      </div>
      {/*------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- */}

      {/* Chat Kısmı */}
      <div
        style={{
          position: "fixed",
          top: "62px",
          left: "250px",
          bottom: "100px",
          width: "calc(100% - 250px)",
          height: "calc(100% -66px)",
          backgroundColor: "#fff",
          boxShadow: "2px 0 5px rgba(0,0,0,0.1)",
          padding: "10px",
          display: "flex",
          flexDirection: "column",
          overflowY: "auto",
        }}
      >
        {messagesLoaded &&
          messages.map((msg, i) => (
            <div
              key={i}
              style={{
                display: "flex",
                flexDirection: "column",
                padding: "8px",
                marginBottom: "6px",
                borderRadius: "6px",
                backgroundColor: msg.role === "user" ? "#d0f0fd" : "#f0f0f0",
                maxWidth: "80%",
              }}
            >
              <div style={{ fontWeight: "bold", marginBottom: "4px" }}>
                {msg.role === "user" ? "You:" : "Peaka AI Assistant:"}
              </div>
              <div className="text-lg prose">
                <ReactMarkdown>{msg.content}</ReactMarkdown>
              </div>
            </div>
          ))}
      </div>

      {/*------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- */}
    </div>
  );
}
