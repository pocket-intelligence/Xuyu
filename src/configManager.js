"use strict";
exports.__esModule = true;
exports.saveConfig = exports.readConfig = exports.getConfigPath = void 0;
var fs = require("fs");
var path = require("path");
var electron_1 = require("electron");
// 获取配置文件路径
function getConfigPath() {
    var userDataPath = electron_1.app.getPath('userData');
    return path.join(userDataPath, 'config.json');
}
exports.getConfigPath = getConfigPath;
// 读取配置
function readConfig() {
    try {
        var configPath = getConfigPath();
        if (fs.existsSync(configPath)) {
            var data = fs.readFileSync(configPath, 'utf8');
            return JSON.parse(data);
        }
        return {};
    }
    catch (error) {
        console.error('读取配置文件失败:', error);
        return {};
    }
}
exports.readConfig = readConfig;
// 保存配置
function saveConfig(config) {
    try {
        var configPath = getConfigPath();
        fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
        return true;
    }
    catch (error) {
        console.error('保存配置文件失败:', error);
        return false;
    }
}
exports.saveConfig = saveConfig;
