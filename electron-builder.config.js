/**
 * electron-builder configuration for FileRestorer Pro
 * 
 * Produces a real Windows NSIS installer with:
 * - Admin elevation at install time
 * - Native .node addon bundled in extraResources
 * - File associations for .frp recovery project files
 */
module.exports = {
  appId: 'com.nulllogic.filerestorer-pro',
  productName: 'FileRestorer Pro',
  copyright: 'Copyright © 2026 NULL_LOGIC Recovery Systems',

  directories: {
    output: 'dist-installer',
    buildResources: 'build',
  },

  files: [
    'dist/**/*',
    'node_modules/**/*',
    'package.json',
  ],

  extraResources: [
    {
      from: 'native/filerestorer.win32-x64-msvc.node',
      to: 'filerestorer.node',
    },
    {
      from: 'native/c_src/',
      to: 'native/c_src/',
    },
  ],

  win: {
    target: [
      { target: 'nsis', arch: ['x64'] },
      { target: 'portable', arch: ['x64'] },
    ],
    icon: 'build/icon.ico',
    requestedExecutionLevel: 'requireAdministrator',
    signAndEditExecutable: false,
  },

  nsis: {
    oneClick: false,
    allowToChangeInstallationDirectory: true,
    createDesktopShortcut: true,
    createStartMenuShortcut: true,
    shortcutName: 'FileRestorer Pro',
    installerIcon: 'build/icon.ico',
    uninstallerIcon: 'build/icon.ico',
    installerHeaderIcon: 'build/icon.ico',
    license: 'LICENSE',
    perMachine: true,
    allowElevation: true,
  },

  fileAssociations: [
    {
      ext: 'frp',
      name: 'FileRestorer Recovery Project',
      description: 'FileRestorer Pro Recovery Project File',
      role: 'Editor',
    },
  ],

  publish: null, // No auto-update server configured
};
