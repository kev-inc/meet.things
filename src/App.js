import React, { useEffect, useState } from "react";
import Quill from "quill";
import QuillCursors from "quill-cursors";
import socketIOClient from "socket.io-client";
import "./styles.css";

const ENDPOINT = "https://meetthingsserver.kevinchan4.repl.co";
const socket = socketIOClient(ENDPOINT);

function textChangeHandler(quill) {
  return function (delta, oldContents, source) {
    var content = quill.getContents();
    if (source === "user") {
      socket.emit("sendText", { delta, content });
      // quill.updateContents(delta)
    }
  };
}
function selectionChangeHandler(cursors) {
  const debouncedUpdate = debounce(updateCursor, 500);

  return function (range, oldRange, source) {
    if (source === "user") {
      // If the user has manually updated their selection, send this change
      // immediately, because a user update is important, and should be
      // sent as soon as possible for a smooth experience.
      updateCursor(range);
    } else {
      // Otherwise, it's a text change update or similar. These changes will
      // automatically get transformed by the receiving client without latency.
      // If we try to keep sending updates, then this will undo the low-latency
      // transformation already performed, which we don't want to do. Instead,
      // add a debounce so that we only send the update once the user has stopped
      // typing, which ensures we send the most up-to-date position (which should
      // hopefully match what the receiving client already thinks is the cursor
      // position anyway).
      debouncedUpdate(range);
    }
  };

  function updateCursor(range) {
    socket.emit("sendCursor", range);
    // cursors.moveCursor("cursor", range);
  }
  function debounce(func, wait) {
    let timeout;
    return function (...args) {
      const context = this;
      const later = function () {
        timeout = null;
        func.apply(context, args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }
}

export default function App() {
  const [socketId, setSocketId] = useState("");
  useEffect(() => {
    console.log("firing");
    socket.emit("enterRoom");
    socket.on("receiveText", (data) => {
      quillOne.updateContents(data);
    });
    socket.on("receiveCursor", (data) => {
      cursorsOne.moveCursor("cursor", data);
    });
    socket.on("room", (data) => {
      setSocketId(data.me);
      data.room.forEach((id) => {
        cursorsOne.createCursor("cursor", id, "blue");
      });
      quillOne.setContents(data.content);
    });
    socket.on("newUser", (data) => {
      cursorsOne.createCursor("cursor", data, "blue");
    });
    Quill.register("modules/cursors", QuillCursors);
    const quillOne = new Quill("#editor-one", {
      theme: "snow",
      modules: {
        cursors: {
          transformOnTextChange: true
        }
      }
    });
    // const quillTwo = new Quill("#editor-two", {
    //   theme: "snow",
    //   modules: {
    //     cursors: {
    //       transformOnTextChange: true
    //     }
    //   }
    // });

    const cursorsOne = quillOne.getModule("cursors");
    // const cursorsTwo = quillTwo.getModule("cursors");
    // cursorsOne.createCursor("cursor", "User 2", "blue");
    // cursorsTwo.createCursor("cursor", "User 1", "red");
    quillOne.on("text-change", textChangeHandler(quillOne));
    // quillTwo.on("text-change", textChangeHandler(quillOne));
    quillOne.on("selection-change", selectionChangeHandler(cursorsOne));
    // quillTwo.on("selection-change", selectionChangeHandler(cursorsOne));
  }, []);

  return (
    <div className="App">
      <h1>Notes</h1>
      <div class="container">
        <div class="editor">
          <h2>{socketId}</h2>
          <div id="editor-one"></div>
        </div>
      </div>
    </div>
  );
}
