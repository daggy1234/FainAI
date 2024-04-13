/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable import/no-extraneous-dependencies */

"use client";

import axios from "axios";

async function chatComplete(question: string, chat_history: any) {
  const procChatHistory = chat_history.map((chat: any) => {
    return {
      role: chat.role,
      content: chat.content,
    };
  });

  const data = {
    question,
    history: procChatHistory,
  };

  const resp = await axios.post("https://back.dag.gay/query/", data, {
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
    },
  });

  const json = resp.data;
  if (Array.isArray(json.chat_history) && json.chat_history.length > 0) {
    json.chat_history[json.chat_history.length - 1].sources = json.sources;
  }
  return {
    answer: json.answer,
    chat_history: json.chat_history,
    sources: json.sources,
  };
}

export default chatComplete;
