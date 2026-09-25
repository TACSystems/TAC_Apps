const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("taclog", {
  chooseFolder: () => ipcRenderer.invoke("taclog:choose-folder"),
  updateState: () => ipcRenderer.invoke("taclog:update-state"),
  updateAction: (action) => ipcRenderer.invoke("taclog:update-action", action),
  updatePrefs: (patch) => ipcRenderer.invoke("taclog:update-prefs", patch),
});
