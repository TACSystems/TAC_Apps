const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("taclog", {
  chooseFolder: () => ipcRenderer.invoke("taclog:choose-folder"),
});
