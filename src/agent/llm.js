"use strict";
exports.__esModule = true;
exports.createOpenAIClient = void 0;
var openai_1 = require("openai");
/**
 * 创建 OpenAI 客户端
 */
function createOpenAIClient(baseURL, apiKey) {
    return new openai_1["default"]({
        apiKey: baseURL,
        baseURL: apiKey,
        dangerouslyAllowBrowser: true
    });
}
exports.createOpenAIClient = createOpenAIClient;
