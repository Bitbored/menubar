var path = require('path')
var events = require('events')
var fs = require('fs')

var app = require('app')
var Tray = require('tray')
var BrowserWindow = require('browser-window')

var extend = require('extend')

module.exports = function create (opts) {
  if (typeof opts === 'undefined') opts = {dir: process.resourcesPath}
  if (typeof opts === 'string') opts = {dir: opts}
  if (!opts.dir) opts.dir = process.resourcesPath
  if (!(path.isAbsolute(opts.dir))) opts.dir = path.resolve(opts.dir)
  if (!opts.index) opts.index = 'file://' + path.join(opts.dir, 'index.html')

  app.on('ready', appReady)

  var menubar = new events.EventEmitter()
  menubar.app = app

  return menubar

  function appReady () {
    if (app.dock) app.dock.hide()

    var iconPath = opts.icon || path.join(opts.dir, 'IconTemplate.png')
    if (!fs.existsSync(iconPath)) iconPath = path.join(__dirname, 'example', 'IconTemplate.png') // default cat icon

    var electronScreen = require('screen')
    var workAreaSize = electronScreen.getPrimaryDisplay().workAreaSize

    menubar.tray = opts.tray || new Tray(iconPath)

    menubar.tray.on('clicked', function clicked (e, bounds) {
      if (menubar.window && menubar.window.isVisible()) return hideWindow()
      // bounds is only populated on os x
      if (bounds.x === 0 && bounds.y === 0) {
        bounds.x = workAreaSize.width // default to top right
      }
      showWindow(bounds)
    })

    menubar.emit('ready')

    if (opts.preloadWindow) {
      createWindow(false)
    }

    function createWindow (show, x, y) {
      menubar.emit('create-window')
      var defaults = {
        width: 400,
        height: 400,
        show: show,
        frame: false
      }

      var winOpts = extend(defaults, opts)
      menubar.window = new BrowserWindow(winOpts)

      if (show) {
        menubar.window.setPosition(x, y)
      }

      menubar.window.on('blur', hideWindow)
      menubar.window.loadUrl(opts.index)
      menubar.emit('after-create-window')
    }

    function showWindow (trayPos) {

      var windowBounds = menubar.window.getBounds()
      var height = windowBounds.height || opts.height || 400
      var width = windowBounds.width || opts.width || 400

      var x = opts.x 
        ? opts.x 
        : trayPos.x - ((width / 2) || 200) + (trayPos.width)

      var y = opts.y 
        ? opts.y 
        : (trayPos.y + trayPos.height > workAreaSize.height) 
          ? trayPos.y - height
          : trayPos.y + trayPos.height

      if (!menubar.window) {
        createWindow(true, x, y)
      }

      if (menubar.window) {
        menubar.emit('show')
        menubar.window.show()
        menubar.window.setPosition(x, y)
        menubar.emit('after-show')
        return
      }
    }

    function hideWindow () {
      if (!menubar.window) return
      menubar.emit('hide')
      menubar.window.hide()
      menubar.emit('after-hide')
    }
  }
}
