const cloud = require("wx-server-sdk");
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

exports.main = async event => {
  if (!event || event.type !== "userAuth") {
    return {
      success: false,
      code: "UNKNOWN_ACTION",
      message: "不支持的账号操作",
    };
  }

  try {
    return await require("./user-profile")(cloud, event);
  } catch (error) {
    console.error("[quickstartFunctions] userAuth failed", error && (error.errCode || error.code));
    return {
      success: false,
      code: "CLOUD_UNAVAILABLE",
      message: "云端资料暂不可用，请稍后重试",
    };
  }
};
