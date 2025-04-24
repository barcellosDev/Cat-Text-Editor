module.exports = {
  presets: [
    '@vue/cli-plugin-babel/preset',
    '@babel/preset-env'
  ],
  plugins: [
    ['module-resolver', {
      "alias": {
        "@": "./src"
      }
    }]
  ]
}
