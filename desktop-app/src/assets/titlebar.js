const path = require('path'),
  url = require('url'),
  customTitlebar = require('custom-electron-titlebar'),
  Menu = require('electron').remote.Menu;

window.addEventListener('DOMContentLoaded', () => {
  const titlebar = new customTitlebar.Titlebar({
    backgroundColor: customTitlebar.Color.fromHex('#101010'),
    menu: new Menu()
  });


  const replaceText = (selector, text) => {
    const element = document.getElementById(selector)
    if (element) element.innerText = text
  }

  for (const type of ['chrome', 'node', 'electron']) {
    replaceText(`${type}-version`, process.versions[type])
  }
  
  if (window.onTitlebarReady) {
	window.onTitlebarReady(titlebar);
  }
})
