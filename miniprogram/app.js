// app.js
const config = require('./config');

App({
  onLaunch: function () {
    const backendMode = config.backendMode === 'cloud' ? 'cloud' : 'local';
    this.globalData = {
      backendMode,
      env: config.cloudEnv || '',
      cloudReady: false,
    };

    if (backendMode !== 'cloud') return;
    if (!wx.cloud) {
      console.error("请使用 2.2.3 或以上的基础库以使用云能力");
    } else if (this.globalData.env) {
      wx.cloud.init({
        env: this.globalData.env,
        traceUser: true,
      });
      this.globalData.cloudReady = true;
    }
  },
});
